#!/usr/bin/env node

/**
 * Comprehensive email system diagnostic
 * This will help identify exactly why emails aren't working
 */

const diagnosticEmailSystem = async () => {
  console.log('🔍 COMPREHENSIVE EMAIL SYSTEM DIAGNOSTIC\n');

  const baseUrl = 'https://www.shareskippy.com';

  console.log('=== 1. TESTING EMAIL ENDPOINTS ===');

  // Test email endpoint
  try {
    const response = await fetch(`${baseUrl}/api/emails/send-new-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: 'test-recipient',
        senderId: 'test-sender',
        messagePreview: 'Test message',
      }),
    });

    const result = await response.json();
    console.log('✅ Email endpoint responding:', response.status);
    console.log('   Response:', result);
  } catch (error) {
    console.log('❌ Email endpoint error:', error.message);
  }

  console.log('\n=== 2. TESTING MESSAGE API ===');

  // Test message API (should return 401 - unauthorized, which is expected)
  try {
    const response = await fetch(`${baseUrl}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_id: 'test',
        availability_id: 'test',
        content: 'test',
      }),
    });

    console.log('✅ Message API responding:', response.status);
    if (response.status === 401) {
      console.log('   ✅ Expected: Unauthorized (authentication required)');
    }
  } catch (error) {
    console.log('❌ Message API error:', error.message);
  }

  console.log('\n=== 3. TESTING EMAIL TEMPLATES ===');

  // Test if email templates are accessible
  try {
    const response = await fetch(`${baseUrl}/email-templates/new-message-notification.html`);
    console.log('✅ Email template accessible:', response.status);
  } catch (error) {
    console.log('❌ Email template error:', error.message);
  }

  console.log('\n=== 4. POTENTIAL ISSUES ===');
  console.log('1. ❓ RESEND_API_KEY not set in production environment');
  console.log('2. ❓ email_events table missing in database');
  console.log('3. ❓ Frontend still using old message sending method');
  console.log('4. ❓ Email templates not deployed');
  console.log('5. ❓ Database migration not applied');

  console.log('\n=== 5. DEBUGGING STEPS ===');
  console.log('1. Check Vercel environment variables:');
  console.log('   - RESEND_API_KEY');
  console.log('   - NEXT_PUBLIC_APP_URL');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY');
  console.log('');
  console.log('2. Check database tables exist:');
  console.log('   - email_events');
  console.log('   - email_catalog');
  console.log('   - scheduled_emails');
  console.log('');
  console.log('3. Check server logs in Vercel dashboard');
  console.log('4. Test with real user accounts');
  console.log('5. Check if frontend is using /api/messages route');

  console.log('\n=== 6. QUICK FIXES TO TRY ===');
  console.log('1. Verify environment variables in Vercel dashboard');
  console.log('2. Run database migration: supabase db push');
  console.log('3. Check if email templates exist in production');
  console.log('4. Test email sending with a simple curl command');
  console.log('5. Check browser console for JavaScript errors');

  console.log('\n🎯 DIAGNOSTIC COMPLETE');
  console.log('Check the items above to identify the root cause.');
};

// Run the diagnostic
diagnosticEmailSystem().catch(console.error);
