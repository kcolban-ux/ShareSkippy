#!/usr/bin/env node
/* eslint-disable */

/**
 * Simple test script to verify email system is working
 * Run with: node test-email.js
 */

const testEmailSystem = async () => {
  console.log('🧪 Testing ShareSkippy Email System...\n');

  // Test 1: Check if required environment variables are set
  console.log('1. Checking environment variables...');

  const requiredEnvVars = ['RESEND_API_KEY', 'NEXT_PUBLIC_APP_URL'];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.log('❌ Missing required environment variables:');
    missingVars.forEach((varName) => console.log(`   - ${varName}`));
    console.log('\nPlease set these in your .env.local file or environment.');
    return;
  }

  console.log('✅ All required environment variables are set');

  // Test 2: Check if email template files exist
  console.log('\n2. Checking email template files...');

  const fs = require('fs');
  const path = require('path');

  const templateFiles = [
    'email-templates/new-message-notification.html',
    'email-templates/new-message-notification.txt',
  ];

  const missingTemplates = templateFiles.filter((file) => {
    const fullPath = path.join(process.cwd(), file);
    return !fs.existsSync(fullPath);
  });

  if (missingTemplates.length > 0) {
    console.log('❌ Missing template files:');
    missingTemplates.forEach((file) => console.log(`   - ${file}`));
    return;
  }

  console.log('✅ All email template files exist');

  // Test 3: Check if API endpoints exist
  console.log('\n3. Checking API endpoints...');

  const apiEndpoints = ['app/api/emails/send-new-message/route.js'];

  const missingEndpoints = apiEndpoints.filter((endpoint) => {
    const fullPath = path.join(process.cwd(), endpoint);
    return !fs.existsSync(fullPath);
  });

  if (missingEndpoints.length > 0) {
    console.log('❌ Missing API endpoints:');
    missingEndpoints.forEach((endpoint) => console.log(`   - ${endpoint}`));
    return;
  }

  console.log('✅ All required API endpoints exist');

  // Test 4: Test email template loading
  console.log('\n4. Testing email template loading...');

  try {
    const { loadEmailTemplate } = require('./libs/email/templates/index.ts');

    const template = await loadEmailTemplate('new_message', {
      recipientName: 'Test User',
      senderName: 'John Doe',
      senderInitial: 'J',
      messagePreview: 'This is a test message',
      messageTime: new Date().toLocaleString(),
      messageUrl: 'https://shareskippy.com/messages/test',
      threadId: 'test-thread',
    });

    if (template.subject && template.html && template.text) {
      console.log('✅ Email template loaded successfully');
      console.log(`   Subject: ${template.subject}`);
      console.log(`   HTML length: ${template.html.length} characters`);
      console.log(`   Text length: ${template.text.length} characters`);
    } else {
      console.log('❌ Email template missing required fields');
    }
  } catch (error) {
    console.log('❌ Error loading email template:', error.message);
  }

  console.log('\n🎉 Email system test completed!');
  console.log('\nTo test actual email sending, try sending a message in the app.');
  console.log('Check the browser console and server logs for any errors.');
};

// Run the test
testEmailSystem().catch(console.error);
