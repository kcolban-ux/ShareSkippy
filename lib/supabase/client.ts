import { createBrowserClient } from '@supabase/ssr';

/**
 * Create or return the browser Supabase client.
 *
 * This wraps `createBrowserClient` from `@supabase/ssr`. The browser
 * implementation uses an internal singleton, so calling this helper multiple
 * times on the client will reuse the same underlying instance.
 *
 * Prefer importing a shared client at module scope or memoizing the client in
 * components (e.g. `useMemo(() => createClient(), [])`) instead of creating
 * it inside frequently-run effects.
 *
 * @returns A Supabase browser client configured with the public URL and key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
