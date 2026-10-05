import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Tetherverse player records in Supabase Postgres, schema `tetherverse`.
 *
 * Profile and points live in separate tables on purpose:
 *
 *   players        identity and profile, never read in bulk
 *   player_points  the leaderboard row
 *
 * `fetchLeaderboard` reads `player_points` and nothing else, so showing the
 * leaderboard never loads player profile data. The name and avatar on that row are
 * maintained by `record_run` in the same transaction as the points.
 *
 * Every write goes through the `record_run` SQL function, so a score save is one
 * atomic statement rather than a read-then-write sequence.
 *
 * A player is identified by their Excel Play email, which is what keeps standalone
 * play and launcher-embedded play resolving to the same row. The tables start
 * empty: this is a fresh leaderboard, not a copy of any previous data.
 *
 * Reads use the publishable key (read-only, matching `supabase/schema.sql`);
 * writes use the secret key, which resolves to `service_role`.
 */

const SCHEMA = 'tetherverse';
const POINTS_TABLE = 'player_points';
const PLAYERS_TABLE = 'players';
const RECORD_RUN = 'record_run';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export interface LeaderboardEntry {
    name: string;
    image: string | null;
    maxAltitude: number;
}

/** A player's own record, resolved by their Excel Play email. */
export interface PlayerRecord {
    email: string;
    name: string;
    maxAltitude: number;
}

interface PointsRow {
    player_id: number | string;
    display_name: string;
    display_image: string | null;
    max_altitude: number;
}

function readClient() {
    if (!supabaseUrl || !publishableKey) {
        throw new Error('Supabase environment variables are not set');
    }

    return createClient(supabaseUrl, publishableKey, {
        // PostgREST only exposes schemas listed in the dashboard, so this must be
        // `tetherverse` there too. See supabase/schema.sql.
        db: { schema: SCHEMA },
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

/**
 * Public leaderboard: top climbers by personal best.
 *
 * Reads `player_points` only. Served by the `player_points_rank_idx` covering
 * index, so this is an index-only scan: no join, and no read against `players`.
 */
export async function fetchLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
    const { data, error } = await readClient()
        .from(POINTS_TABLE)
        .select('display_name, display_image, max_altitude')
        .gt('max_altitude', 0)
        .order('max_altitude', { ascending: false })
        .limit(limit);

    if (error) {
        throw new Error(`Supabase leaderboard read failed: ${error.message}`);
    }

    return ((data ?? []) as PointsRow[]).map((row) => ({
        name: row.display_name,
        image: row.display_image,
        maxAltitude: row.max_altitude,
    }));
}

/**
 * Reads one player's own best, by Excel Play email.
 *
 * This is the one place that touches `players`, and it is a single indexed lookup
 * rather than a scan.
 */
export async function getPlayerRecordByEmail(email: string): Promise<PlayerRecord | null> {
    const normalised = email.toLowerCase();

    const { data, error } = await readClient()
        .from(PLAYERS_TABLE)
        .select('email, name, player_points(max_altitude)')
        .eq('email', normalised)
        .maybeSingle();

    if (error) {
        throw new Error(`Supabase read failed: ${error.message}`);
    }

    if (!data) return null;

    // PostgREST returns the embedded one-to-one row as an object or a one-item
    // array depending on how it resolved the relationship.
    const row = data as unknown as {
        email: string;
        name: string;
        player_points?: { max_altitude: number } | { max_altitude: number }[] | null;
    };

    const embedded = Array.isArray(row.player_points)
        ? row.player_points[0]
        : row.player_points;

    return {
        email: row.email,
        name: row.name,
        maxAltitude: embedded?.max_altitude ?? 0,
    };
}

export interface RecordRunResult {
    email: string;
    name: string;
    image: string | null;
    maxAltitude: number;
    /** True only when this run actually raised the stored best. */
    isNewBest: boolean;
}

/**
 * Records a completed run for a verified Excel Play identity.
 *
 * Delegates to `record_run`, which creates the player, creates their points row,
 * and raises the personal best in a single atomic statement. Doing this in
 * application code instead would be a read-then-write, which races the first time
 * two requests arrive for the same new player.
 */
export async function recordRun(
    profile: {
        excelUserId: string;
        email: string;
        name: string;
        image: string | null;
    },
    altitudeMetres: number,
): Promise<RecordRunResult> {
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc(RECORD_RUN, {
        p_excel_user_id: profile.excelUserId,
        p_email: profile.email,
        p_name: profile.name,
        p_image: profile.image,
        p_altitude: Math.max(0, Math.floor(altitudeMetres)),
    });

    if (error) {
        throw new Error(`record_run failed: ${error.message}`);
    }

    const rows = (data ?? []) as Array<{
        player_id: number | string;
        email: string;
        name: string;
        image: string | null;
        max_altitude: number;
        is_new_best: boolean;
    }>;

    const row = rows[0];
    if (!row) {
        throw new Error('record_run returned no row');
    }

    return {
        email: row.email,
        name: row.name,
        image: row.image,
        maxAltitude: row.max_altitude ?? 0,
        isNewBest: row.is_new_best === true,
    };
}