#!/usr/bin/env node

/**
 * Check if required email system tables exist in production database
 */

const checkDatabaseTables = async () => {
  console.log('🔍 CHECKING PRODUCTION DATABASE TABLES\n');

  const baseUrl = 'https://www.shareskippy.com';

  console.log('=== TESTING DATABASE CONNECTIVITY ===');

  try {
    // Test if we can access the database through the API
    const response = await fetch(`${baseUrl}/api/emails/send-new-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: '00000000-0000-0000-0000-000000000001',
        senderId: '00000000-0000-0000-0000-000000000002',
        messagePreview: 'Database connectivity test',
        messageId: 'test-db-connectivity',
        threadId: 'test-thread',
      }),
    });

    const result = await response.json();

    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(result, null, 2));

    if (response.status === 404 && result.error === 'Recipient not found') {
      console.log('✅ Database is accessible - recipient not found is expected');
      console.log('✅ Email system can connect to database');
    } else if (response.status === 500) {
      console.log('❌ Database error - likely missing tables or environment variables');
      console.log('   Check: SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY');
    } else if (response.status === 200) {
      console.log('✅ Email sent successfully - database tables exist');
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }

  console.log('\n=== REQUIRED DATABASE TABLES ===');
  console.log('The following tables must exist for email system to work:');
  console.log('1. email_events - Tracks email sending');
  console.log('2. email_catalog - Email type definitions');
  console.log('3. scheduled_emails - Queue for delayed emails');
  console.log('4. user_activity - User action tracking');
  console.log('5. profiles - User profiles (should already exist)');

  console.log('\n=== HOW TO APPLY MIGRATION ===');
  console.log('1. Go to Supabase Dashboard');
  console.log('2. Go to SQL Editor');
  console.log(
    '3. Run the migration from: supabase/migrations/20240101000021_create_email_system_tables.sql'
  );
  console.log('4. Or use Supabase CLI: supabase db push');

  console.log('\n=== VERIFICATION STEPS ===');
  console.log('1. Check if tables exist in Supabase dashboard');
  console.log('2. Test email sending with real user accounts');
  console.log('3. Check Vercel function logs for errors');
  console.log('4. Verify environment variables are set');

  console.log('\n🎯 The email system was working on Sep 30, 9:38 AM');
  console.log('   The cleanup on Sep 30 removed the original email_system_migration.sql');
  console.log('   The new migration needs to be applied to production database');
};

// Run the check
checkDatabaseTables().catch(console.error);
