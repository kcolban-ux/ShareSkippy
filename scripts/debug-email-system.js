#!/usr/bin/env node

/**
 * Comprehensive email system debugging
 */

const debugEmailSystem = async () => {
  console.log('🔍 COMPREHENSIVE EMAIL SYSTEM DEBUGGING\n');

  const baseUrl = 'https://www.shareskippy.com';

  console.log('=== TESTING EMAIL SYSTEM COMPONENTS ===');

  // Test 1: Check if email endpoint is accessible
  console.log('1. Testing email endpoint accessibility...');
  try {
    const response = await fetch(`${baseUrl}/api/emails/send-new-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: 'test-recipient',
        senderId: 'test-sender',
        messagePreview: 'Debug test',
        messageId: 'debug-test',
        threadId: 'debug-thread',
      }),
    });

    const result = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(result)}`);

    if (response.status === 404 && result.error === 'Recipient not found') {
      console.log('   ✅ Email endpoint is working correctly');
    } else if (response.status === 500) {
      console.log('   ❌ Server error - check environment variables');
    }
  } catch (error) {
    console.log(`   ❌ Network error: ${error.message}`);
  }

  // Test 2: Check if message API is working
  console.log('\n2. Testing message API...');
  try {
    const response = await fetch(`${baseUrl}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_id: 'test-recipient',
        availability_id: 'test-availability',
        subject: 'Test Subject',
        content: 'Test Content',
      }),
    });

    console.log(`   Status: ${response.status}`);
    if (response.status === 401) {
      console.log('   ✅ Message API requires authentication (expected)');
    } else {
      console.log('   ❓ Unexpected response from message API');
    }
  } catch (error) {
    console.log(`   ❌ Network error: ${error.message}`);
  }

  // Test 3: Check if email templates are accessible
  console.log('\n3. Testing email template accessibility...');
  try {
    const response = await fetch(`${baseUrl}/email-templates/new-message-notification.html`);
    console.log(`   Status: ${response.status}`);
    if (response.status === 404) {
      console.log('   ❌ Email templates not accessible - this could be the issue');
    } else if (response.status === 200) {
      console.log('   ✅ Email templates are accessible');
    }
  } catch (error) {
    console.log(`   ❌ Error accessing templates: ${error.message}`);
  }

  console.log('\n=== POTENTIAL ISSUES ===');
  console.log('1. ❓ RESEND_API_KEY is set but invalid/expired');
  console.log('2. ❓ Resend domain not verified');
  console.log('3. ❓ Rate limiting from Resend API');
  console.log('4. ❓ Email templates not bundled correctly');
  console.log('5. ❓ Database migration not fully applied');
  console.log('6. ❓ Frontend still using old message sending method');

  console.log('\n=== DEBUGGING STEPS ===');
  console.log('1. Check Vercel function logs:');
  console.log('   - Go to Vercel dashboard → Functions tab');
  console.log('   - Look for email-related errors');
  console.log('   - Check for Resend API errors');
  console.log('');
  console.log('2. Test with real user accounts:');
  console.log('   - Send a message between two real users');
  console.log('   - Check browser console for errors');
  console.log('   - Check if message appears in database');
  console.log('');
  console.log('3. Verify Resend configuration:');
  console.log('   - Check if Resend API key is valid');
  console.log('   - Verify domain is verified in Resend');
  console.log('   - Check Resend dashboard for delivery status');

  console.log('\n=== QUICK FIXES TO TRY ===');
  console.log('1. Redeploy the application to ensure all changes are applied');
  console.log('2. Check if frontend is using the correct API route');
  console.log('3. Verify all environment variables are set correctly');
  console.log('4. Test with a simple curl command to the email endpoint');

  console.log('\n🎯 The email system was working on Sep 30, 9:38 AM');
  console.log('   After cleanup, database migration was removed');
  console.log('   You applied the migration, but there might be other issues');
};

// Run the debug
debugEmailSystem().catch(console.error);
