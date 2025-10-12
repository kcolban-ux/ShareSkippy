import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import config from "@/config";

export const dynamic = "force-dynamic";

// This route is called after a successful login. It exchanges the code for a session and redirects to the callback URL (see config.js).
export async function GET(req) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Handle OAuth errors
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return NextResponse.redirect(new URL("/signin?error=" + encodeURIComponent(error), requestUrl.origin));
  }

  if (code) {
    const supabase = createClient();
    
    try {
      // Exchange the code for a session and wait for it to complete
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error("Session exchange error:", exchangeError);
        return NextResponse.redirect(new URL("/signin?error=session_exchange_failed", requestUrl.origin));
      }

      // Verify the session was created successfully
      if (!data.session) {
        console.error("No session created after code exchange");
        return NextResponse.redirect(new URL("/signin?error=no_session", requestUrl.origin));
      }

      console.log("Session created successfully for user:", data.user?.id);
      
      // Extract Google user metadata for name pre-filling
      const userMetadata = data.user?.user_metadata || {};
      const googleGivenName = userMetadata?.given_name || userMetadata?.first_name;
      const googleFamilyName = userMetadata?.family_name || userMetadata?.last_name;
      const googlePicture = userMetadata?.picture || userMetadata?.avatar_url;
      
      // Track if this is a new user
      let isNewUser = false;
      
      // Check if profile exists
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      // If profile doesn't exist, create it with Google data
      if (profileError && profileError.code === 'PGRST116') {
        console.log('📝 NEW USER - Creating profile with Google data...');
        isNewUser = true;
        
        const profileData = {
          id: data.user.id,
          email: data.user.email,
          first_name: googleGivenName || '',
          last_name: googleFamilyName || '',
          profile_photo_url: googlePicture || null,
          bio: null,
          role: null,
          phone_number: null
        };
        
        await supabase
          .from('profiles')
          .insert(profileData);
          
        console.log('✅ New profile created - will need to complete profile');
      } else if (existingProfile) {
        console.log('🔍 EXISTING USER - Checking profile completeness...');
        console.log('   Bio:', existingProfile.bio ? 'Has bio' : 'NO BIO');
        console.log('   Role:', existingProfile.role ? existingProfile.role : 'NO ROLE');
        console.log('   Phone:', existingProfile.phone_number ? 'Has phone' : 'NO PHONE');
        
        // Update existing profile with Google data if name fields are empty
        const updateData = {};
        
        if (!existingProfile.first_name && googleGivenName) {
          updateData.first_name = googleGivenName;
        }
        
        if (!existingProfile.last_name && googleFamilyName) {
          updateData.last_name = googleFamilyName;
        }
        
        if (!existingProfile.profile_photo_url && googlePicture) {
          updateData.profile_photo_url = googlePicture;
        }
        
        if (Object.keys(updateData).length > 0) {
          await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', data.user.id);
        }
      }
      
      // Send welcome email for new users (created within last 5 minutes)
      const userCreatedAt = new Date(data.user.created_at);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      if (userCreatedAt > fiveMinutesAgo) {
        try {
          await fetch(`${requestUrl.origin}/api/emails/send-welcome`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id })
          });
        } catch (emailError) {
          console.error('❌ Error sending welcome email:', emailError);
        }
      }
      
      // ==================================================================
      // ROUTING LOGIC - Determine where to redirect after sign in
      // ==================================================================
      
      const origin = requestUrl.origin;
      
      // If this is a brand new user, always send to profile edit
      if (isNewUser) {
        console.log("🆕 NEW USER DETECTED → Redirecting to /profile/edit");
        return NextResponse.redirect(origin + "/profile/edit");
      }
      
      // For existing users, check if profile is complete
      // Required: bio, role, phone_number must all be filled out
      const hasCompleteBio = existingProfile?.bio && existingProfile.bio.trim().length > 0;
      const hasRole = existingProfile?.role && existingProfile.role.trim().length > 0;
      const hasPhone = existingProfile?.phone_number && existingProfile.phone_number.trim().length > 0;
      
      console.log('📊 Profile completeness check:');
      console.log('   ✓ Bio:', hasCompleteBio ? '✅ Complete' : '❌ Missing');
      console.log('   ✓ Role:', hasRole ? '✅ Complete' : '❌ Missing');
      console.log('   ✓ Phone:', hasPhone ? '✅ Complete' : '❌ Missing');
      
      if (hasCompleteBio && hasRole && hasPhone) {
        // User has complete profile → Go to community
        console.log("✅ PROFILE COMPLETE → Redirecting to /community");
        return NextResponse.redirect(origin + "/community");
      } else {
        // User has incomplete profile → Go to profile edit
        console.log("📝 PROFILE INCOMPLETE → Redirecting to /profile/edit");
        return NextResponse.redirect(origin + "/profile/edit");
      }
    } catch (error) {
      console.error("Unexpected error during session exchange:", error);
      return NextResponse.redirect(new URL("/signin?error=unexpected_error", requestUrl.origin));
    }
  }

  // Fallback redirect if no code present
  console.log("⚠️ No code present - Redirecting to signin");
  return NextResponse.redirect(new URL("/signin", requestUrl.origin));
}
