# Email System Migration Guide

## 🚀 Quick Start

### 1. Apply Database Migration

```bash
supabase db push
```

### 2. Update Vercel Configuration

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-scheduled-emails",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/process-reengage-emails",
      "schedule": "0 10 * * *"
    }
  ]
}
```

### 3. Deploy

```bash
git add .
git commit -m "feat: refactor email system with centralized sending and idempotency"
git push
```

## 📋 What Changed

### New Files Created

- `libs/email/` - Centralized email system
- `app/api/emails/send-welcome/` - New welcome email endpoint
- `app/api/emails/send-new-message/` - New message notification endpoint
- `app/api/emails/schedule-meeting-reminder/` - Meeting reminder scheduling
- `app/api/cron/process-scheduled-emails/` - Scheduled email processor
- `app/api/cron/process-reengage-emails/` - Re-engagement processor
- `app/api/admin/email-events/` - Admin email monitoring
- `supabase/migrations/20240101000021_create_email_system_tables.sql` - Database migration

### Files Removed

- `libs/emailTemplates.js` - Replaced by centralized system
- `app/api/emails/welcome/route.js` - Replaced by new endpoint
- `app/api/emails/new-message/route.js` - Replaced by new endpoint
- `app/api/cron/send-3day-follow-up-emails/route.js` - Replaced by scheduled processing
- `app/api/admin/re-engage-inactive-users/route.js` - Replaced by re-engagement processor
- Various test files using old system

### Files Modified

- `app/api/messages/route.js` - Updated to use new message notification
- `app/api/auth/callback/route.js` - Updated to use new welcome email
- `app/api/meetings/route.js` - Updated to schedule meeting reminders

## 🔧 Environment Variables

Ensure these are set (no changes needed):

- `RESEND_API_KEY` - Resend API key
- `NEXT_PUBLIC_APP_URL` - App URL for email links

## 📊 Database Changes

### New Tables

- `email_catalog` - Email type definitions
- `email_events` - All email sending events
- `scheduled_emails` - Queue for delayed emails
- `user_activity` - User action tracking

### Migration Features

- Proper indexes for performance
- RLS policies for security
- Unique constraints for idempotency
- Comments for documentation

## 🧪 Testing

### Test the New System

```bash
# Test welcome email
curl -X POST https://shareskippy.com/api/emails/send-welcome \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-id"}'

# Test new message notification
curl -X POST https://shareskippy.com/api/emails/send-new-message \
  -H "Content-Type: application/json" \
  -d '{"recipientId": "recipient-id", "senderId": "sender-id", "messagePreview": "Test message"}'

# Test scheduled email processing
curl -X GET https://shareskippy.com/api/cron/process-scheduled-emails

# Test re-engagement processing
curl -X GET https://shareskippy.com/api/cron/process-reengage-emails
```

### Monitor Email Events

```bash
# View recent email events
curl "https://shareskippy.com/api/admin/email-events?page=1&limit=50"

# Filter by email type
curl "https://shareskippy.com/api/admin/email-events?emailType=welcome"

# Filter by status
curl "https://shareskippy.com/api/admin/email-events?status=sent"
```

## 🔍 Verification

### 1. Check Database Tables

```sql
-- Verify tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('email_catalog', 'email_events', 'scheduled_emails', 'user_activity');

-- Check email catalog
SELECT * FROM email_catalog;

-- Check recent email events
SELECT * FROM email_events ORDER BY created_at DESC LIMIT 10;
```

### 2. Test Email Sending

1. Create a test user account
2. Sign in to trigger welcome email
3. Check `email_events` table for the welcome email record
4. Verify the email was sent via Resend

### 3. Test Scheduled Emails

1. Create a meeting for tomorrow
2. Check `scheduled_emails` table for meeting reminder
3. Run the scheduled email processor
4. Verify reminder was sent

## 🚨 Rollback Plan

If issues occur, you can rollback by:

### 1. Revert Code Changes

```bash
git revert <commit-hash>
```

### 2. Remove New Tables (if needed)

```sql
DROP TABLE IF EXISTS email_events CASCADE;
DROP TABLE IF EXISTS scheduled_emails CASCADE;
DROP TABLE IF EXISTS user_activity CASCADE;
DROP TABLE IF EXISTS email_catalog CASCADE;
```

### 3. Restore Old Files

The old email system files were deleted, so you'd need to restore them from git history if rollback is needed.

## 📈 Benefits

### Immediate Benefits

- **No Duplicate Emails**: Idempotency prevents duplicate welcome/nurture emails
- **Better Logging**: All email events are tracked in database
- **Scheduled Processing**: Meeting reminders are automatically scheduled
- **Admin Monitoring**: Easy to view and debug email issues

### Long-term Benefits

- **Scalability**: Queue-based system handles high volume
- **Maintainability**: Single source of truth for email logic
- **Observability**: Complete audit trail of all email events
- **Flexibility**: Easy to add new email types

## 🎯 Success Metrics

After deployment, monitor these metrics:

1. **Email Delivery Rate**: Check `email_events` table for failed emails
2. **Duplicate Prevention**: Verify no duplicate welcome/nurture emails
3. **Scheduled Processing**: Ensure meeting reminders are sent on time
4. **Re-engagement**: Monitor inactive user re-engagement emails
5. **Performance**: Check processing times for scheduled emails

## 📞 Support

If you encounter issues:

1. **Check Logs**: Review application logs for error details
2. **Database Queries**: Use the admin endpoints to check email events
3. **Manual Testing**: Use the test endpoints to verify functionality
4. **Rollback**: Use the rollback plan if necessary

## ✅ Post-Deployment Checklist

- [ ] Database migration applied successfully
- [ ] Vercel cron jobs configured
- [ ] Welcome emails working for new users
- [ ] Message notifications working
- [ ] Meeting reminders being scheduled
- [ ] Scheduled email processor running
- [ ] Re-engagement processor running
- [ ] Admin email events endpoint accessible
- [ ] No duplicate emails being sent
- [ ] All email templates loading correctly

The email system refactor is complete and ready for production! 🎉
