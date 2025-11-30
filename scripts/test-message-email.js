#!/usr/bin/env node

/**
 * Test script to verify message email notifications are working
 * Run with: node test-message-email.js
 */

const testMessageEmail = async () => {
  console.log('🧪 Testing Message Email System...\n');

  const baseUrl = 'https://www.shareskippy.com';

  // Test data
  const testData = {
    recipientId: 'test-recipient-123',
    senderId: 'test-sender-456',
    messagePreview: 'This is a test message to verify email notifications are working properly.',
    messageId: 'test-message-789',
    threadId: 'test-thread-101',
  };

  console.log('1. Testing email endpoint directly...');

  try {
    const response = await fetch(`${baseUrl}/api/emails/send-new-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Email endpoint is responding');
      console.log('   Response:', result);
    } else {
      console.log('❌ Email endpoint error:', result);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }

  console.log('\n2. Testing message API endpoint...');

  try {
    const response = await fetch(`${baseUrl}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_id: 'test-recipient-123',
        availability_id: 'test-availability-456',
        subject: 'Test Message',
        content: 'This is a test message to verify the complete flow works.',
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Message API is responding');
      console.log('   Response:', result);
    } else {
      console.log('❌ Message API error:', result);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }

  console.log('\n🎉 Test completed!');
  console.log('\nTo test in the app:');
  console.log('1. Go to https://www.shareskippy.com');
  console.log('2. Sign in with two different accounts');
  console.log('3. Send a message between them');
  console.log('4. Check if the recipient receives an email notification');
};

// Run the test
testMessageEmail().catch(console.error);
