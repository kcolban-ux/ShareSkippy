import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getCookieOptions } from '@/libs/cookieOptions';

// #region TYPES
type SupabaseKeyType = 'anon' | 'service_role';
/**
 * Represents the options for setting a cookie.
 * This interface matches the expected shape for cookie options in Next.js and Supabase.
 */
interface CookieOptions {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'strict' | 'lax' | 'none';
  secure?: boolean;
}
// #endregion TYPES

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

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      } catch {
        // Safe to ignore in Server Components/Middleware if session refresh is handled.
      }
    },
  };

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseKey, {
    cookieOptions: getCookieOptions(),
    cookies: cookieMethods,
  });
}
