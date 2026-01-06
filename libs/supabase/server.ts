import { CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getCookieOptions } from '@/libs/cookieOptions';

type SupabaseKeyType = 'anon' | 'service_role';

/**
 * Represents a cookie to be set in the cookie store.
 */
interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

/**
 * @async
 * @function createClient
 * @description Creates a server-side Supabase client with cookie handling.
 * @param {SupabaseKeyType} type - Specifies which key to use: 'anon' (default) for client operations, or 'service_role' for backend administrative tasks.
 */
export async function createClient(type: SupabaseKeyType = 'anon') {
  const cookieStore = await cookies();

  // Determine which key to use based on the 'type' argument
  const supabaseKey =
    type === 'service_role'
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseKey, {
    cookieOptions: getCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        for (const { name, value, options } of cookiesToSet) {
          try {
            cookieStore.set({ name, value, ...(options ?? {}) });
          } catch (err) {
            console.error('Failed to set cookie in server createClient:', err);
          }
        }
      },
    },
  });
}
