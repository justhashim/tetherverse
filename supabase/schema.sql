-- =============================================================================
-- Tetherverse (summit-jack) — `tetherverse` Postgres schema
-- =============================================================================
-- Run this once in the Supabase SQL editor. Additive: the existing `public.User`
-- table is left untouched, and nothing is created in `public`.
--
-- Sign-in is handled by Excel Play, not Supabase Auth, so this schema stores game
-- data only. A player's identity is their Excel Play email, which is what ties a
-- row to a person across standalone play and launcher-embedded play.
--
--   players        identity and profile. Never read in bulk.
--   player_points  leaderboard row: points plus the name/avatar to render them.
--   record_run()   the only write path, one atomic statement.
--
-- WHY THE SPLIT: the leaderboard must not read profile data. Keeping points in
-- their own table with a covering index means the whole leaderboard is answered by
-- an index-only scan of `player_points`, with no join and no reads against
-- `players` at all. Profile columns are copied onto the points row purely so the
-- leaderboard can render a name without touching `players`; `record_run` keeps the
-- copy in step inside the same transaction.
--
-- -----------------------------------------------------------------------------
-- REQUIRED STEP AFTER RUNNING THIS
-- -----------------------------------------------------------------------------
-- Supabase exposes only the `public` schema to PostgREST by default. Objects in
-- `tetherverse` will return `PGRST205 Could not find the table ... in the schema
-- cache` until the schema is exposed.
--
--   Dashboard -> Settings -> API Keys -> "Exposed schemas"
--   Add `tetherverse` alongside `public`, then save.
--
-- This has no SQL equivalent; it must be done in the dashboard.
--
-- Timing note: per the Supabase changelog entry "Tables not exposed to Data and
-- GraphQL API automatically" (2026-04-28), new tables stopped being exposed
-- automatically, and this becomes enforced on all projects on 2026-10-30. The
-- explicit GRANTs below already satisfy that part.
-- -----------------------------------------------------------------------------

create schema if not exists tetherverse;

-- =============================================================================
-- Tables
-- =============================================================================

-- Identity and profile. Deliberately free of game data, so new stats never need a
-- column here and the leaderboard never reads this table.
create table if not exists tetherverse.players (
  id            bigint generated always as identity primary key,
  -- Excel Play user id, kept for traceability. Not the join key: email is.
  excel_user_id text        not null,
  -- Lower-cased on write so the same person cannot end up with two rows from a
  -- capitalisation difference. Excel Play is the authority on who owns it.
  email         text        not null,
  name          text        not null,
  image         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint players_email_key unique (email),
  constraint players_email_format check (email = lower(email) and length(email) > 3)
);

-- =============================================================================
-- Leaderboard table
-- =============================================================================
-- One row per player. `player_id` is both the primary key and the foreign key, so
-- the link back to `players` is an index lookup rather than a scan.
--
-- `display_name` / `display_image` are a deliberate denormalisation: they exist so
-- the leaderboard can be answered without reading `players`. They are maintained
-- by `record_run` in the same transaction as the points, so they cannot drift.
-- =============================================================================

create table if not exists tetherverse.player_points (
  player_id     bigint      primary key
                  references tetherverse.players (id) on delete cascade,
  display_name  text        not null,
  display_image text,
  max_altitude  integer     not null default 0,
  updated_at    timestamptz not null default now(),

  constraint player_points_altitude_non_negative check (max_altitude >= 0)
);

-- The leaderboard query: WHERE max_altitude > 0 ORDER BY max_altitude DESC LIMIT 10.
--
-- INCLUDE puts the two display columns in the index itself, so Postgres answers
-- the whole query from the index without visiting the table heap. This is what
-- makes "the leaderboard never touches players" true rather than merely likely.
create index if not exists player_points_rank_idx
  on tetherverse.player_points (max_altitude desc)
  include (display_name, display_image);

-- =============================================================================
-- The only write path
-- =============================================================================
-- Records a completed run. Creating the player, creating their points row, and
-- raising the best all happen in ONE statement, so the whole thing is a single
-- transaction: it cannot leave a player with a profile but no leaderboard row, and
-- it cannot race.
--
-- This replaces a SELECT-then-INSERT in application code, which races the first
-- time two requests arrive for the same new player: both find nothing, both
-- insert, and one fails on the unique constraint.
--
-- SECURITY INVOKER on purpose. SECURITY DEFINER would run with the creator's
-- rights and strip the access control the grants below exist to enforce.
-- =============================================================================

create or replace function tetherverse.record_run(
  p_excel_user_id text,
  p_email         text,
  p_name          text,
  p_image         text,
  p_altitude      integer
)
returns table (
  player_id    bigint,
  email        text,
  name         text,
  image        text,
  max_altitude integer,
  is_new_best  boolean
)
language sql
security invoker
set search_path = tetherverse, pg_temp
as $$
  with upserted as (
    insert into tetherverse.players as p (excel_user_id, email, name, image)
    values (p_excel_user_id, lower(p_email), p_name, p_image)
    on conflict (email) do update
      set name       = coalesce(excluded.name, p.name),
          image      = coalesce(excluded.image, p.image),
          updated_at = now()
    returning p.id, p.email, p.name, p.image
  ),
  prior as (
    -- Every CTE in one statement sees the same snapshot, so this reads the value
    -- as it was before this run, which is what makes is_new_best honest.
    select pp.player_id, pp.max_altitude as old_max
    from tetherverse.player_points pp
    join upserted u on u.id = pp.player_id
  ),
  bumped as (
    insert into tetherverse.player_points as pp
      (player_id, display_name, display_image, max_altitude)
    select u.id, u.name, u.image, greatest(coalesce(p_altitude, 0), 0)
    from upserted u
    on conflict (player_id) do update
      set -- GREATEST keeps this a high-water mark: a worse replay cannot lower it.
          max_altitude  = greatest(pp.max_altitude, excluded.max_altitude),
          -- Keep the leaderboard copy in step with the profile, in this transaction.
          display_name  = excluded.display_name,
          display_image = excluded.display_image,
          updated_at    = now()
    returning pp.player_id, pp.max_altitude
  )
  select u.id,
         u.email,
         u.name,
         u.image,
         b.max_altitude,
         b.max_altitude > coalesce(pr.old_max, 0) as is_new_best
  from upserted u
  join bumped b on b.player_id = u.id
  left join prior pr on pr.player_id = u.id;
$$;

-- =============================================================================
-- Access control
-- =============================================================================
-- The publishable key maps to the `anon` role, and PostgREST will happily accept
-- a write from anything holding that key. Without the grants below, anyone could
-- POST an arbitrary score straight to the REST API and take the top of the
-- leaderboard, bypassing the Excel Play token check our server performs.
--
-- So: anon gets read-only, and cannot call the write function at all. Writes go
-- through the server using the secret key, which resolves to the `service_role`
-- role (BYPASSRLS) and never reaches a browser.
--
-- Grants are evaluated BEFORE RLS, and a missing grant is a permission error even
-- for `service_role`. That matters here: a brand-new schema carries no privileges
-- for anyone, so `service_role` needs its own grants rather than inheriting the
-- defaults that cover `public`.
-- =============================================================================

alter table tetherverse.players       enable row level security;
alter table tetherverse.player_points enable row level security;

-- Without USAGE on the schema, nothing inside it resolves, for any role.
grant usage on schema tetherverse to anon, authenticated, service_role;

-- Public: read-only. No INSERT/UPDATE/DELETE policies are created on purpose.
-- With RLS enabled and no policy for those operations, anon cannot write at all;
-- the grants make the read-only intent explicit rather than relying on defaults.
revoke all on table tetherverse.players       from anon, authenticated;
revoke all on table tetherverse.player_points from anon, authenticated;
grant select on table tetherverse.players       to anon, authenticated;
grant select on table tetherverse.player_points to anon, authenticated;

-- Server writes: score saves and first-time player creation.
grant all on table tetherverse.players       to service_role;
grant all on table tetherverse.player_points to service_role;

-- Identity sequence, because inserts do not specify id.
grant usage, select on sequence tetherverse.players_id_seq to service_role;

-- The write function is the crown jewel: Postgres grants EXECUTE on functions to
-- PUBLIC by default, so without this revocation anyone holding the publishable key
-- could call it over RPC and post a score of their choosing.
revoke execute on function tetherverse.record_run(text, text, text, text, integer) from public;
revoke execute on function tetherverse.record_run(text, text, text, text, integer) from anon, authenticated;
grant  execute on function tetherverse.record_run(text, text, text, text, integer) to service_role;

-- =============================================================================
-- Verify after running
-- =============================================================================
-- After exposing the schema in the dashboard, expect:
--
--   -- 0 rows before anyone plays
--   select count(*) from tetherverse.player_points;
--
--   -- must FAIL: anon cannot write
--   insert into tetherverse.player_points (player_id, display_name)
--     values (1, 'probe');
--
--   -- must FAIL: anon cannot call the write function
--   select tetherverse.record_run('p','probe@example.invalid','Probe',null,9999);
--
--   -- must SUCCEED: leaderboard reads, and touches no players column
--   select display_name, max_altitude from tetherverse.player_points
--     where max_altitude > 0 order by max_altitude desc limit 10;
-- =============================================================================