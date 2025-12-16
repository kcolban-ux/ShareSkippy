import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { getCookieOptions } from '@/libs/cookieOptions';
import type { NextRequest } from 'next/server';
import type { NextResponse as NextResponseType } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SerializeOptions } from 'cookie';

/**
 * Represents a cookie to be set, including its name, value, and options.
 */
interface CookieToSet {
  name: string;
  value: string;
  options?: SerializeOptions;
}

/**
 * Proxies the request, initializing Supabase server client and handling cookies.
 *
 * @param request - The incoming Next.js request.
 * @returns The Next.js response.
 */
export async function proxy(request: NextRequest): Promise<NextResponseType> {
  let response: NextResponseType = NextResponse.next({
    request,
  });

  const supabase: SupabaseClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getCookieOptions(),
      cookies: {
        getAll(): { name: string; value: string }[] {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]): void {
          // Set cookies on the request (for Server Components)
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          // Re-create response to apply request cookies
          response = NextResponse.next({
            request,
          });
          // Set cookies on the response (to send back to browser)
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  await supabase.auth.getSession();

  return response;
}

export const config = {
  unstable_allowDynamic: [
    './node_modules/@supabase/supabase-js/dist/module/index.js',
    './node_modules/@supabase/realtime-js/dist/module/index.js',
    './node_modules/@supabase/realtime-js/**',
    './node_modules/@supabase/supabase-js/**',
  ],
  matcher: [`/((?!_next/static|_next/image|favicon.ico|.*.(?:svg|png|jpg|jpeg|gif|webp)$).*)`],
};
