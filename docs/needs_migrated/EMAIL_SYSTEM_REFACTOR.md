# Email System Refactor Documentation

## Overview

The email system has been completely refactored to provide centralized, idempotent, and well-logged email sending across the ShareSkippy application. This document describes the new architecture, usage patterns, and migration guide.

## Architecture

### Core Components

1. **Centralized Email Module** (`libs/email/`)
   - `sendEmail.ts` - Main email sending function with idempotency
   - `scheduler.ts` - Scheduled email processing
   - `reengage.ts` - Re-engagement email logic
   - `templates/index.ts` - Template loading and processing

2. **Database Tables**
   - `email_catalog` - Email type definitions
   - `email_events` - All email sending events with status tracking
   - `scheduled_emails` - Queue for delayed email sending
   - `user_activity` - User action tracking for re-engagement

3. **API Routes**
   - `/api/emails/send-welcome` - Welcome email sending
   - `/api/emails/send-new-message` - New message notifications
   - `/api/emails/schedule-meeting-reminder` - Meeting reminder scheduling
   - `/api/cron/process-scheduled-emails` - Process scheduled emails
   - `/api/cron/process-reengage-emails` - Process re-engagement emails
   - `/api/admin/email-events` - Admin email event viewing

## Email Types

The system supports 5 email types:

1. **welcome** - Sent once on first successful sign-in
2. **nurture_day3** - Sent 3 days after first sign-in
3. **meeting_reminder** - Sent 1 day before scheduled meeting
4. **reengage** - Sent to inactive users (7+ days since login)
5. **new_message** - Sent when user receives a new message

## Usage Examples

### Sending an Email

```javascript
import { sendEmail } from '@/libs/email';

await sendEmail({
  userId: 'user-id',
  to: 'user@example.com',
  emailType: 'welcome',
  payload: {
    userName: 'John Doe',
    appUrl: 'https://shareskippy.com',
  },
});
```

### Scheduling an Email

```javascript
import { scheduleEmail } from '@/libs/email';

await scheduleEmail({
  userId: 'user-id',
  emailType: 'nurture_day3',
  runAfter: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
  payload: { userName: 'John Doe' },
});
```

### Recording User Activity

```javascript
import { recordUserActivity } from '@/libs/email';

await recordUserActivity({
  userId: 'user-id',
  event: 'login',
  metadata: { source: 'web' },
});
```

## Idempotency

The system ensures idempotency for single-shot emails:

- **welcome** and **nurture_day3** emails can only be sent once per user
- Duplicate attempts are logged but not sent
- Status is tracked in the `email_events` table

## Scheduled Email Processing

### Daily Cron Jobs

Set up these cron jobs to run daily:

1. **Process Scheduled Emails**

   ```bash
   curl -X GET https://shareskippy.com/api/cron/process-scheduled-emails
   ```

2. **Process Re-engagement Emails**
   ```bash
   curl -X GET https://shareskippy.com/api/cron/process-reengage-emails
   ```

### Vercel Cron Configuration

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

## Database Migrations

Run the migration to create the new email system tables:

```bash
# Apply the migration
supabase db push
```

The migration creates:

- `email_catalog` table with email type definitions
- `email_events` table for tracking all email events
- `scheduled_emails` table for queuing delayed emails
- `user_activity` table for tracking user actions
- Proper indexes and RLS policies

## Template System

Email templates are located in `email-templates/` and are automatically loaded based on email type:

- `welcome-email.html` / `welcome-email.txt`
- `follow-up-3days.html` / `follow-up-3days.txt`
- `meeting-reminder-1day.html` / `meeting-reminder-1day.txt`
- `re-engagement.html` / `re-engagement.txt`
- `new-message-notification.html` / `new-message-notification.txt`

Templates support variable substitution using `{{variableName}}` syntax.

## Logging and Monitoring

### Email Events

All email sending is logged in the `email_events` table with:

- User ID and email type
- Status (queued, sent, failed, skipped)
- External message ID from Resend
- Error messages for failures
- Timestamps and payload data

### Admin Interface

View email events at `/api/admin/email-events` with pagination and filtering:

- Filter by email type, status, or user
- View recent email activity
- Debug email sending issues

## Testing

### Unit Tests

Run the email system tests:

```bash
npm test tests/email-system.test.js
```

### Manual Testing

Test individual email types:

```bash
# Test welcome email
curl -X POST https://shareskippy.com/api/emails/send-welcome \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-id"}'

# Test new message notification
curl -X POST https://shareskippy.com/api/emails/send-new-message \
  -H "Content-Type: application/json" \
  -d '{"recipientId": "recipient-id", "senderId": "sender-id", "messagePreview": "Test message"}'
```

## Migration from Old System

### Deprecated Files

The following files are now deprecated and should be removed:

- `libs/emailTemplates.js` (replaced by `libs/email/`)
- `app/api/emails/welcome/route.js` (replaced by `app/api/emails/send-welcome/route.js`)
- `app/api/emails/new-message/route.js` (replaced by `app/api/emails/send-new-message/route.js`)
- `app/api/cron/send-3day-follow-up-emails/route.js` (replaced by scheduled email processing)
- `app/api/admin/re-engage-inactive-users/route.js` (replaced by re-engagement processing)

### Environment Variables

Ensure these environment variables are set:

- `RESEND_API_KEY` - Resend API key
- `NEXT_PUBLIC_APP_URL` - App URL for email links
- `FROM_EMAIL` - From email address (configured in `config.js`)

## Error Handling

The system includes comprehensive error handling:

1. **Email Sending Failures** - Logged in `email_events` with error details
2. **Template Loading Errors** - Thrown with helpful error messages
3. **Database Errors** - Logged and re-thrown for debugging
4. **Rate Limiting** - Built into the Resend client

## Performance Considerations

1. **Batch Processing** - Scheduled emails are processed in batches of 100
2. **Database Indexes** - Optimized for common query patterns
3. **Rate Limiting** - Respects Resend's 2 requests/second limit
4. **Async Processing** - Email sending doesn't block main operations

## Security

1. **RLS Policies** - Users can only view their own email events
2. **Admin Access** - Only admins can view all email events
3. **Input Validation** - All email parameters are validated
4. **Rate Limiting** - Prevents email abuse

## Troubleshooting

### Common Issues

1. **Emails not sending** - Check `email_events` table for error details
2. **Duplicate emails** - Check idempotency constraints in `email_events`
3. **Scheduled emails not processing** - Verify cron job is running
4. **Template errors** - Check template files exist and have correct syntax

### Debug Commands

```bash
# Check email events for a user
curl "https://shareskippy.com/api/admin/email-events?userId=user-id"

# Check scheduled emails
curl "https://shareskippy.com/api/admin/scheduled-emails?userId=user-id"

# Process scheduled emails manually
curl -X GET https://shareskippy.com/api/cron/process-scheduled-emails
```

## Future Enhancements

1. **Email Analytics** - Track open rates and click-through rates
2. **A/B Testing** - Test different email templates
3. **Email Preferences** - Allow users to customize email settings
4. **Advanced Scheduling** - Support for recurring emails
5. **Email Templates** - Visual template editor

## Support

For issues with the email system:

1. Check the `email_events` table for error details
2. Review application logs for debugging information
3. Test individual email types using the API endpoints
4. Verify environment variables and database connectivity
