import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client for server-side writes.
 *
 * Uses the project's secret key (`sb_secret_...`), which resolves to the
 * `service_role` Postgres role. That role carries BYPASSRLS, so it skips the
 * policies on `tetherverse.players` entirely; the grants in
 * `supabase/schema.sql` are still required, because Postgres evaluates grants
 * before RLS and a missing grant is a permission error even for `service_role`.
 *
 * The publishable key is deliberately not used for writes. It resolves to `anon`,
 * which the schema restricts to SELECT, so a score write through it would fail.
 *
 * If the secret key is absent the app still serves reads, but every score write
 * fails loudly rather than silently degrading to an unauthenticated write.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }

  if (!secretKey) {
    throw new Error(
      'SUPABASE_SECRET_KEY is not set. Score writes need it because the publishable key is read-only.',
    );
  }

  return createClient(url, secretKey, {
    // Keep writes pointed at the same schema the reads use.
    db: { schema: 'tetherverse' },
    auth: {
      // Excel Play is the identity provider, so there is no session to keep.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}