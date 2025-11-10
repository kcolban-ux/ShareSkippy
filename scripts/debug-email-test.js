#!/usr/bin/env node

/**
 * Debug script to test email system with real data
 * This will help identify why emails aren't being sent
 */

const testEmailSystem = async () => {
  console.log('🔍 Debugging Email System...\n');

  const baseUrl = 'https://www.shareskippy.com';

  console.log('1. Testing email endpoint with real user data...');

  // Test with real user IDs (you'll need to replace these with actual user IDs)
  const testData = {
    recipientId: 'real-recipient-id', // Replace with actual recipient ID
    senderId: 'real-sender-id', // Replace with actual sender ID
    messagePreview: 'This is a test message to verify email notifications are working properly.',
    messageId: 'test-message-123',
    threadId: 'test-thread-456',
  };

  try {
    const response = await fetch(`${baseUrl}/api/emails/send-new-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('✅ Email endpoint is working');
    } else {
      console.log('❌ Email endpoint error:', result);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }

  console.log('\n2. Checking if database tables exist...');

  // This would require authentication, but we can check if the endpoint responds
  try {
    const response = await fetch(`${baseUrl}/api/admin/email-events`);
    console.log('Admin endpoint status:', response.status);
  } catch (error) {
    console.log('Admin endpoint error:', error.message);
  }

  console.log('\n🎯 Next Steps:');
  console.log('1. Check if RESEND_API_KEY is set in production');
  console.log('2. Check if email_events table exists in database');
  console.log('3. Check if frontend is using the correct API route');
  console.log('4. Check server logs for email sending errors');
};

// Run the test
testEmailSystem().catch(console.error);
