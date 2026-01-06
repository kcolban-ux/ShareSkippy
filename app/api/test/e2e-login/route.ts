import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import type { Session } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const AUTH_SECRET = process.env.E2E_AUTH_SECRET;
const TEST_USER_EMAIL = process.env.E2E_TEST_USER_EMAIL ?? 'playwright@shareskippy.local';
const TEST_USER_PASSWORD = process.env.E2E_TEST_USER_PASSWORD ?? 'Playwright123!';

/**
 * E2E test login endpoint for Playwright tests.
 *
 * This endpoint authenticates a test user and sets up the session cookie.
 * It is protected by:
 * - Environment check: disabled in production
 * - Secret authentication: requires E2E_AUTH_SECRET
 * - Redirect validation: prevents open redirect vulnerabilities
 *
 * @param request - The Next.js request object.
 * @returns A redirect response to the specified path on success, or an error JSON response.
 *
 * @remarks
 * Query parameters:
 * - `secret` (required): Must match E2E_AUTH_SECRET environment variable
 * - `redirect` (optional): Relative path to redirect after login (default: "/")
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'E2E endpoints are not available in production' },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  // Prefer Authorization header for passing secrets (safer than query string),
  // but fall back to the `secret` query param for compatibility.
  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  let providedSecret: string | null = null;
  if (authHeader) {
    // Accept both `Bearer <token>` and raw token values
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    providedSecret = bearerMatch ? bearerMatch[1] : authHeader;
  }

  const redirectParam = url.searchParams.get('redirect') ?? '/';
  if (!providedSecret) {
    providedSecret = url.searchParams.get('secret');
  }

  // Validate redirect to prevent open redirect vulnerability
  const isValidRedirect = redirectParam.startsWith('/') && !redirectParam.startsWith('//');
  if (!isValidRedirect) {
    return NextResponse.json({ error: 'Invalid redirect parameter' }, { status: 400 });
  }

  if (!AUTH_SECRET || !providedSecret || providedSecret !== AUTH_SECRET) {
    return NextResponse.json({ error: 'Missing or invalid secret' }, { status: 401 });
  }

  const supabase = await createClient();
  const signInResult = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  });

  if (signInResult.error) {
    console.error('E2E login failed:', signInResult.error);
    return NextResponse.redirect(new URL('/signin?error=login_failed', url.origin));
  }

  // Prefer the session returned by the sign-in call; fall back to getSession().
  let session: Session | null = (signInResult.data?.session as Session) ?? null;

  // Fetch the session and either return it as JSON (for programmatic clients)
  // or set cookies on a redirect response. Returning JSON is useful for
  // Playwright-based tests which can set cookies directly via the driver.
  try {
    if (!session) {
      const sessionRes = await supabase.auth.getSession();
      session = sessionRes.data.session;
    }

    // If the caller requests the session JSON (via header), return it.
    const wantJson = (request.headers.get('x-e2e-return-session') || '').toLowerCase() === '1';
    if (wantJson) {
      return NextResponse.json({ session });
    }

    const redirectResponse = NextResponse.redirect(new URL(redirectParam, url.origin));

    if (session && typeof session === 'object') {
      const accessToken = session.access_token;
      const refreshToken = session.refresh_token;

      if (typeof accessToken === 'string') {
        const secure = url.protocol === 'https:';
        redirectResponse.cookies.set({
          name: 'sb-access-token',
          value: accessToken,
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
          secure,
        });

        if (typeof refreshToken === 'string') {
          redirectResponse.cookies.set({
            name: 'sb-refresh-token',
            value: refreshToken,
            httpOnly: true,
            path: '/',
            sameSite: 'lax',
            secure,
          });
        }
      }
    }

    return redirectResponse;
  } catch (err) {
    console.error('Failed to fetch session in E2E login route:', err);
    return NextResponse.redirect(new URL(redirectParam, url.origin));
  }
}
