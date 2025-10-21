import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';

export const dynamic = 'force-dynamic';

// This route is called after a successful login. It exchanges the code for a session and redirects to the callback URL (see config.js).
export async function GET(req) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL('/signin?error=' + encodeURIComponent(error), requestUrl.origin)
    );
  }

  if (code) {
    const supabase = createClient();

    try {
      // Exchange the code for a session and wait for it to complete
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('Session exchange error:', exchangeError);
        return NextResponse.redirect(
          new URL('/signin?error=session_exchange_failed', requestUrl.origin)
        );
      }

      // Verify the session was created successfully
      if (!data.session) {
        console.error('No session created after code exchange');
        return NextResponse.redirect(new URL('/signin?error=no_session', requestUrl.origin));
      }

      console.log('Session created successfully for user:', data.user?.id);
      console.log('User created at:', data.user?.created_at);

      // ==================================================================
      // CHECK IF THIS IS A NEW USER
      // Note: Database trigger auto-creates profile, so we check user creation time
      // ==================================================================
      const userCreatedAt = new Date(data.user.created_at);
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      const isNewUser = userCreatedAt > thirtySecondsAgo;

      console.log(
        isNewUser ? '🆕 NEW USER DETECTED (created within last 30 seconds)' : '👤 EXISTING USER'
      );

      // Extract Google user metadata for name pre-filling
      const userMetadata = data.user?.user_metadata || {};
      const googleGivenName = userMetadata?.given_name || userMetadata?.first_name;
      const googleFamilyName = userMetadata?.family_name || userMetadata?.last_name;
      const googlePicture = userMetadata?.picture || userMetadata?.avatar_url;

      // Get existing profile (created by database trigger)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // Update profile with Google data
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

      // Send welcome email for new users
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

      // ==================================================================
      // ROUTING LOGIC - Determine where to redirect after sign in
      // ==================================================================

      const origin = requestUrl.origin;

      // NEW USERS → Always go to profile edit (they need to fill out bio, role, phone)
      if (isNewUser) {
        console.log('🆕 NEW USER → Redirecting to /profile/edit');
        return NextResponse.redirect(origin + '/profile/edit');
      }

      // EXISTING USERS → Check if profile is complete
      // Required: bio, role, phone_number must all be filled out
      const hasCompleteBio = updatedProfile?.bio && updatedProfile.bio.trim().length > 0;
      const hasRole = updatedProfile?.role && updatedProfile.role.trim().length > 0;
      const hasPhone =
        updatedProfile?.phone_number && updatedProfile.phone_number.trim().length > 0;

      console.log('📊 Profile completeness check:');
      console.log('   ✓ Bio:', hasCompleteBio ? '✅ Complete' : '❌ Missing');
      console.log('   ✓ Role:', hasRole ? '✅ Complete' : '❌ Missing');
      console.log('   ✓ Phone:', hasPhone ? '✅ Complete' : '❌ Missing');

      if (hasCompleteBio && hasRole && hasPhone) {
        // User has complete profile → Go to community
        console.log('✅ PROFILE COMPLETE → Redirecting to /community');
        return NextResponse.redirect(origin + '/community');
      } else {
        // User has incomplete profile → Go to profile edit
        console.log('📝 PROFILE INCOMPLETE → Redirecting to /profile/edit');
        return NextResponse.redirect(origin + '/profile/edit');
      }
    } catch (error) {
      console.error('Unexpected error during session exchange:', error);
      return NextResponse.redirect(new URL('/signin?error=unexpected_error', requestUrl.origin));
    }
  }

  // Fallback redirect if no code present
  console.log('⚠️ No code present - Redirecting to signin');
  return NextResponse.redirect(new URL('/signin', requestUrl.origin));
}
