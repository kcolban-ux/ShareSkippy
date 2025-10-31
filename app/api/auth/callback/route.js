import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Determines the final redirect origin URL after successful authentication.
 * Overrides the request origin with VERCEL_URL in production environments
 * to ensure the final redirect goes to the public domain, not a preview URL.
 */
function getFinalRedirectOrigin(requestUrl) {
  const vercelUrl = process.env.VERCEL_URL;

  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return requestUrl.origin;
}

export async function GET(req) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  const finalRedirectOrigin = getFinalRedirectOrigin(requestUrl);

  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL('/signin?error=' + encodeURIComponent(error), requestUrl.origin)
    );
  }

  if (code) {
    const supabase = createClient();

    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('Session exchange error:', exchangeError);
        return NextResponse.redirect(
          new URL('/signin?error=session_exchange_failed', requestUrl.origin)
        );
      }

      if (!data.session) {
        console.error('No session created after code exchange');
        return NextResponse.redirect(new URL('/signin?error=no_session', requestUrl.origin));
      }

      console.log('Session created successfully for user:', data.user?.id);
      console.log('User created at:', data.user?.created_at);

      // Check if the user is new. Uses a 30-second window to detect the first successful sign-up.
      const userCreatedAt = new Date(data.user.created_at);
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      const isNewUser = userCreatedAt > thirtySecondsAgo;

      console.log(isNewUser ? '🆕 NEW USER DETECTED' : '👤 EXISTING USER');

      const userMetadata = data.user?.user_metadata || {};
      const googleGivenName = userMetadata?.given_name || userMetadata?.first_name;
      const googleFamilyName = userMetadata?.family_name || userMetadata?.last_name;
      const googlePicture = userMetadata?.picture || userMetadata?.avatar_url;

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // Merge data: prefer fresh Google metadata, but fall back to existing profile data.
      const updateData = {
        first_name: googleGivenName || existingProfile?.first_name || '',
        last_name: googleFamilyName || existingProfile?.last_name || '',
        profile_photo_url: googlePicture || existingProfile?.profile_photo_url || null,
      };

      const { data: updatedProfile } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', data.user.id)
        .select()
        .single();

      console.log('✅ Profile updated with Google data');

      if (isNewUser) {
        try {
          await fetch(`${requestUrl.origin}/api/emails/send-welcome`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id }),
          });
          console.log('✅ Welcome email queued');
        } catch (emailError) {
          console.error('❌ Error sending welcome email:', emailError);
        }
      }

      // Check for minimum profile completeness required for community access.
      const hasCompleteBio = updatedProfile?.bio && updatedProfile.bio.trim().length > 0;
      const hasRole = updatedProfile?.role && updatedProfile.role.trim().length > 0;
      const hasPhone =
        updatedProfile?.phone_number && updatedProfile.phone_number.trim().length > 0;

      console.log('📊 Profile completeness check:');
      console.log('   ✓ Bio:', hasCompleteBio ? '✅ Complete' : '❌ Missing');
      console.log('   ✓ Role:', hasRole ? '✅ Complete' : '❌ Missing');
      console.log('   ✓ Phone:', hasPhone ? '✅ Complete' : '❌ Missing');

      if (isNewUser) {
        console.log('🆕 NEW USER → Redirecting to /profile/edit');
        return NextResponse.redirect(finalRedirectOrigin + '/profile/edit');
      }

      if (hasCompleteBio && hasRole && hasPhone) {
        console.log('✅ PROFILE COMPLETE → Redirecting to /community');
        return NextResponse.redirect(finalRedirectOrigin + '/community');
      } else {
        console.log('📝 PROFILE INCOMPLETE → Redirecting to /profile/edit');
        return NextResponse.redirect(finalRedirectOrigin + '/profile/edit');
      }
    } catch (error) {
      console.error('Unexpected error during session exchange:', error);
      return NextResponse.redirect(new URL('/signin?error=unexpected_error', requestUrl.origin));
    }
  }

  console.log('⚠️ No code present - Redirecting to signin');
  return NextResponse.redirect(new URL('/signin', requestUrl.origin));
}
