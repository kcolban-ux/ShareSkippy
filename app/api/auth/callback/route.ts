import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { type Session, type User, type UserMetadata } from '@supabase/supabase-js';

// Prevent this server function from being cached.
export const dynamic = 'force-dynamic';

// Profile shape for server-side logic. Replace with generated DB types if available.
interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string | null;
  bio: string | null;
  role: string | null;
  phone_number: string | null;
  display_lat: number | null;
  display_lng: number | null;
}

/**
 * Determine where to send the user after authentication.
 *
 * @param finalRedirectBaseUrl - Origin used to build absolute redirect URLs
 * @param profile - User's profile row
 * @param isNewUser - True when a profile row did not previously exist
 * @returns Absolute URL string for redirect
 */
function determineRedirectPath(
  finalRedirectBaseUrl: string,
  profile: Profile,
  isNewUser: boolean
): string {
  const cacheBust = `_t=${Date.now()}`;

  if (isNewUser) {
    console.info('Redirect: /profile/edit (new user)');
    return `${finalRedirectBaseUrl}/profile/edit?${cacheBust}`;
  }

  const hasRole = !!profile.role && profile.role.trim().length > 0;
  const hasPhone = !!profile.phone_number && profile.phone_number.trim().length > 0;
  const hasLocation = profile.display_lat !== null && profile.display_lng !== null;

  // Diagnostic: booleans only
  console.debug('Profile completeness', { hasRole, hasPhone, hasLocation });

  if (hasRole && hasPhone && hasLocation) {
    console.info('Redirect: /community (profile complete)');
    return `${finalRedirectBaseUrl}/community?${cacheBust}`;
  }

  console.info('Redirect: /profile/edit (profile incomplete)');
  return `${finalRedirectBaseUrl}/profile/edit?${cacheBust}`;
}

/**
 * Exchange the OAuth code for a Supabase session, ensure the user's profile
 * row exists or is updated, optionally queue a welcome email, and return a
 * redirect response for the client.
 *
 * @param requestUrl - The incoming request URL (used to build absolute redirects)
 * @param code - OAuth authorization code received from the provider
 * @returns A `NextResponse` that redirects the client
 */
async function processCodeExchangeAndProfileUpdate(
  requestUrl: URL,
  code: string
): Promise<NextResponse> {
  // Use createClient() which is configured to default to the secure Anon Key and handles cookies.
  const supabase = await createClient();

  // 1. Exchange Code
  const { data, error: exchangeError } = (await supabase.auth.exchangeCodeForSession(code)) as {
    data: { session: Session | null; user: User | null };
    error: unknown;
  };

  if (exchangeError) {
    console.error('Session exchange error during auth code exchange.');
    if (exchangeError instanceof Error) {
      console.error('  message:', exchangeError.message);
    }
    return NextResponse.redirect(
      new URL('/signin?error=session_exchange_failed', requestUrl.origin)
    );
  }

  if (!data.session || !data.user) {
    console.error('No session or user created after code exchange');
    return NextResponse.redirect(new URL('/signin?error=no_session', requestUrl.origin));
  }

  const user: User = data.user;
  const finalRedirectBaseUrl: string = requestUrl.origin;

  // 3. Profile Fetch and Data Merge
  const userMetadata: UserMetadata = user.user_metadata || {};
  const googleGivenName: string | undefined = userMetadata.given_name || userMetadata.first_name;
  const googleFamilyName: string | undefined = userMetadata.family_name || userMetadata.last_name;
  const googlePicture: string | undefined = userMetadata.picture || userMetadata.avatar_url;

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select<string, Profile>('*')
    .eq('id', user.id)
    .single();

  // 2. New User Check: based on whether a profile row already existed
  const isNewUser: boolean = !existingProfile;
  // Informational: high-level event for production logs
  console.info(isNewUser ? 'New user detected' : 'Existing user');

  // Build the upsert payload. Include `id` to allow insert-if-missing
  const upsertData: Partial<Profile> & { id: string } = {
    id: user.id,
    first_name: googleGivenName || existingProfile?.first_name || null,
    last_name: googleFamilyName || existingProfile?.last_name || null,
    profile_photo_url: googlePicture || existingProfile?.profile_photo_url || null,
  };

  // 4. Profile Upsert (insert if missing, update if exists)
  const { data: updatedProfile, error: profileError } = await supabase
    .from('profiles')
    .upsert(upsertData, { onConflict: 'id' })
    .select()
    .single<Profile>();

  if (profileError) {
    console.error('Profile upsert error (details omitted for privacy).');
    if (profileError instanceof Error) {
      console.error('  message:', profileError.message);
    }
  } else {
    console.debug('Profile upserted with Google data');
  }

  if (!updatedProfile) {
    console.error('Profile upsert failed to return data.');
    return NextResponse.redirect(new URL('/signin?error=profile_update_failed', requestUrl.origin));
  }

  // 5. Welcome Email
  if (isNewUser) {
    try {
      await fetch(`${requestUrl.origin}/api/emails/send-welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      console.debug('Welcome email queued');
    } catch (emailError) {
      console.error('Error sending welcome email (details omitted).');
      if (emailError instanceof Error) console.error('  message:', emailError.message);
    }
  }

  // 6. Routing
  const redirectPath = determineRedirectPath(finalRedirectBaseUrl, updatedProfile, isNewUser);

  // Use NextResponse.redirect() which sets the status and Location header.
  return NextResponse.redirect(redirectPath);
}
// #endregion HELPER_FUNCTIONS

/**
 * @description Sanitize user-controlled strings before logging to avoid log injection.
 *
 * Strips control characters (including newlines) and normalizes whitespace so that
 * user-provided values cannot break log formatting or inject additional entries.
 */
function sanitizeForLog(value: string | null): string {
  if (value == null) return '';

  /** @type {RegExp} - Matches Unicode Control characters (C0 and C1 sets) */
  const controlCharsRegex: RegExp = /\p{Cc}/gu;

  /** @type {RegExp} - Matches one or more whitespace characters */
  const whitespaceNormalizationRegex: RegExp = /\s+/g;

  return value.replace(controlCharsRegex, ' ').replace(whitespaceNormalizationRegex, ' ').trim();
}

// #region HANDLER
/**
 * Handle OAuth callback requests: validate params, perform session exchange,
 * and redirect the user.
 *
 * @param req - Incoming Next.js request
 * @returns A `NextResponse` redirecting the client
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(req.url);
  const code: string | null = requestUrl.searchParams.get('code');
  const error: string | null = requestUrl.searchParams.get('error');
  const errorDescription: string | null = requestUrl.searchParams.get('error_description');

  // 1. Handle OAuth Errors (Guard Clause)
  if (error) {
    const safeError = sanitizeForLog(error);
    const safeErrorDescription = sanitizeForLog(errorDescription);

    console.error('OAuth error:', safeError, safeErrorDescription);
    return NextResponse.redirect(
      new URL('/signin?error=' + encodeURIComponent(safeError), requestUrl.origin)
    );
  }

  // 2. Process Authentication Code
  if (code) {
    try {
      return await processCodeExchangeAndProfileUpdate(requestUrl, code);
    } catch (error) {
      // Catch unexpected errors
      if (error instanceof Error) {
        console.error('Unexpected error during session exchange:', error.message);
      } else {
        console.error('Unexpected error during session exchange.');
      }
      return NextResponse.redirect(new URL('/signin?error=unexpected_error', requestUrl.origin));
    }
  }

  // 3. Fallback: No code present — redirect to signin
  console.debug('No code present - redirecting to signin');
  return NextResponse.redirect(new URL('/signin', requestUrl.origin));
}
