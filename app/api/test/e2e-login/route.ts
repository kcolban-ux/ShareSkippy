import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';

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
  const providedSecret = url.searchParams.get('secret');
  const redirectParam = url.searchParams.get('redirect') ?? '/';

  // Validate redirect to prevent open redirect vulnerability
  const isValidRedirect = redirectParam.startsWith('/') && !redirectParam.startsWith('//');
  if (!isValidRedirect) {
    return NextResponse.json({ error: 'Invalid redirect parameter' }, { status: 400 });
  }

  if (!AUTH_SECRET || !providedSecret || providedSecret !== AUTH_SECRET) {
    return NextResponse.json({ error: 'Missing or invalid secret' }, { status: 401 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  });

  if (error) {
    console.error('E2E login failed:', error);
    return NextResponse.redirect(new URL('/signin?error=login_failed', url.origin));
  }

  return NextResponse.redirect(new URL(redirectParam, url.origin));
}
