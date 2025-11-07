import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { getCookieOptions } from '@/libs/cookieOptions';

export async function proxy(request) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: getCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Set cookies on the request (for Server Components)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Re-create response to apply request cookies
          response = NextResponse.next({
            request,
          });
          // Set cookies on the response (to send back to browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
