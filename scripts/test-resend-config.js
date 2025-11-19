#!/usr/bin/env node

/**
 * Test Resend configuration and email sending
 */

const testResendConfig = async () => {
  console.log('🧪 TESTING RESEND CONFIGURATION\n');

  const baseUrl = 'https://www.shareskippy.com';

  console.log('=== TESTING EMAIL ENDPOINT WITH RESEND ===');

  try {
    // Test with a more realistic scenario
    const testData = {
      recipientId: '00000000-0000-0000-0000-000000000001',
      senderId: '00000000-0000-0000-0000-000000000002',
      messagePreview:
        'Testing Resend email configuration - this should trigger an email if Resend is properly configured.',
      messageId: 'test-resend-config',
      threadId: 'test-thread-resend',
    };

    console.log('Sending test email to check Resend configuration...');

    const response = await fetch(`${baseUrl}/api/emails/send-new-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(result, null, 2));

    if (response.status === 404 && result.error === 'Recipient not found') {
      console.log('✅ Email endpoint is working - recipient not found is expected');
      console.log('✅ Database connection is working');
      console.log('✅ Email system can access database');
    } else if (response.status === 500) {
      console.log('❌ Server error - likely missing environment variables');
      console.log('   Check: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY');
    } else if (response.status === 200) {
      console.log('✅ Email sent successfully via Resend!');
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }

  console.log('\n=== RESEND CONFIGURATION CHECKLIST ===');
  console.log('1. ✅ RESEND_API_KEY must be set in Vercel environment variables');
  console.log('2. ✅ SUPABASE_SERVICE_ROLE_KEY must be set for database access');
  console.log('3. ✅ NEXT_PUBLIC_APP_URL must be set for email links');
  console.log('4. ✅ Database tables must exist (email_events, email_catalog, etc.)');

  console.log('\n=== VERIFICATION STEPS ===');
  console.log('1. Check Vercel environment variables:');
  console.log('   - Go to Vercel dashboard');
  console.log('   - Select your project');
  console.log('   - Go to Settings → Environment Variables');
  console.log('   - Verify RESEND_API_KEY is set');
  console.log('');
  console.log('2. Test with real user accounts:');
  console.log('   - Send a message between two real users');
  console.log('   - Check if recipient receives email');
  console.log('');
  console.log('3. Check Vercel function logs:');
  console.log('   - Go to Functions tab in Vercel dashboard');
  console.log('   - Look for email-related errors');
  console.log('   - Check for "RESEND_API_KEY is not set" errors');

  console.log('\n=== COMMON ISSUES ===');
  console.log('1. ❓ RESEND_API_KEY not set in Vercel');
  console.log('2. ❓ Resend API key is invalid or expired');
  console.log('3. ❓ Resend domain not verified');
  console.log('4. ❓ Rate limiting from Resend API');
  console.log('5. ❓ Database migration not applied');

  console.log('\n🎯 The email system was working on Sep 30, 9:38 AM');
  console.log('   After the cleanup, the database migration was removed');
  console.log('   You applied the migration, so now check environment variables');
};

// Run the test
testResendConfig().catch(console.error);
