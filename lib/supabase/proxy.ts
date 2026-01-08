import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refresh the Supabase auth session for an incoming Next.js request.
 *
 * This creates a per-request server Supabase client that reads and writes
 * cookies scoped to the current `request`/`response`. It ensures the client's
 * session is initialized (`getClaims`) and will redirect unauthenticated
 * requests to the sign-in page for protected routes.
 *
 * Notes:
 * - Always create a new server client per request so cookie access is bound to that request.
 * - Avoid running other code between client creation and `supabase.auth.getClaims()` to
 *   prevent session race conditions.
 *
 * @param request - The incoming Next.js `NextRequest`.
 * @returns A `NextResponse` that may include updated auth cookies or a redirect.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Mirror cookie updates to both the request cookies and the response
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Redirect unauthenticated requests (except public and auth routes) to sign-in
  if (
    !user &&
    request.nextUrl.pathname !== '/' &&
    !request.nextUrl.pathname.startsWith('/signin') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/signin';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
