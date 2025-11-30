#!/usr/bin/env node

/**
 * Test email system in production with detailed error reporting
 */

const testProductionEmail = async () => {
  console.log('🧪 TESTING PRODUCTION EMAIL SYSTEM\n');

  const baseUrl = 'https://www.shareskippy.com';

  console.log('=== TESTING EMAIL ENDPOINT WITH REAL DATA ===');

  // Test with more realistic data
  const testData = {
    recipientId: '00000000-0000-0000-0000-000000000001', // Valid UUID format
    senderId: '00000000-0000-0000-0000-000000000002', // Valid UUID format
    messagePreview: 'This is a test message to verify email notifications are working properly.',
    messageId: 'test-message-123',
    threadId: 'test-thread-456',
  };

  try {
    console.log('Sending test email with data:', JSON.stringify(testData, null, 2));

    const response = await fetch(`${baseUrl}/api/emails/send-new-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(result, null, 2));

    if (response.status === 404 && result.error === 'Recipient not found') {
      console.log('✅ Email endpoint is working, but recipient not found (expected for test data)');
    } else if (response.status === 500) {
      console.log('❌ Server error - likely missing environment variables or database issues');
      console.log('   Check: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY');
    } else if (response.status === 200) {
      console.log('✅ Email sent successfully!');
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }

  console.log('\n=== CHECKING ENVIRONMENT VARIABLES ===');
  console.log('The following environment variables must be set in Vercel:');
  console.log('1. RESEND_API_KEY - Required for sending emails');
  console.log('2. SUPABASE_SERVICE_ROLE_KEY - Required for database access');
  console.log('3. NEXT_PUBLIC_APP_URL - Required for email links');
  console.log('');
  console.log('To check these in Vercel:');
  console.log('1. Go to Vercel dashboard');
  console.log('2. Select your project');
  console.log('3. Go to Settings > Environment Variables');
  console.log('4. Verify all required variables are set');

  console.log('\n=== CHECKING DATABASE MIGRATION ===');
  console.log('The following database tables must exist:');
  console.log('1. email_events - Tracks email sending');
  console.log('2. email_catalog - Email type definitions');
  console.log('3. scheduled_emails - Queue for delayed emails');
  console.log('');
  console.log('To apply the migration:');
  console.log('1. Run: supabase db push');
  console.log('2. Or apply migration manually in Supabase dashboard');

  console.log('\n=== NEXT STEPS ===');
  console.log('1. Check Vercel environment variables');
  console.log('2. Apply database migration');
  console.log('3. Test with real user accounts');
  console.log('4. Check Vercel function logs for errors');
};

// Run the test
testProductionEmail().catch(console.error);
