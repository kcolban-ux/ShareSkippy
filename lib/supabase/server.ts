import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Create a per-request Supabase server client.
 *
 * This function binds cookie access to the current request/response by
 * reading from the Next.js `cookies()` store and forwarding cookie updates
 * back to that store. Use this from Server Components, server actions, or
 * route handlers where cookies are available per-request.
 *
 * The returned client is lightweight and should be recreated for each request
 * to ensure cookie scoping is correct.
 *
 * @returns A Supabase server client configured to use the current request cookies.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // `cookieStore.set` can throw when called from contexts that don't
            // permit setting cookies (e.g. certain Server Components). It's
            // safe to ignore here if another layer (middleware/proxy) is
            // responsible for persisting refreshed session cookies.
          }
        },
      },
    }
  );
}
