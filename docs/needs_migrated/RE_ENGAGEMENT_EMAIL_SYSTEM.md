# Re-engagement Email System

This document describes the comprehensive re-engagement email system for ShareSkippy, designed to re-engage inactive users and encourage them to return to the platform.

## 📧 System Overview

### Purpose

The re-engagement system identifies users who haven't signed in for over a week and sends them personalized emails to encourage them to:

- Share their availability for dog activities
- Reconnect with neighbors and their dogs
- Return to active platform usage

### Email Types

1. **3-Day Follow-up**: Sent to new users 3 days after signup
2. **Re-engagement**: Sent to inactive users (haven't signed in for 7+ days)

## 🏗️ System Architecture

### Components

1. **Re-engagement API** (`app/api/admin/re-engage-inactive-users/route.js`)
   - Identifies inactive users based on `last_sign_in_at` from `auth.users`
   - Falls back to `updated_at` if auth.users access fails
   - Sends personalized re-engagement emails
   - Tracks email sending to prevent duplicates

2. **3-Day Follow-up Cron** (`app/api/cron/send-3day-follow-up-emails/route.js`)
   - Automated daily execution at 11 AM UTC
   - Finds users who signed up exactly 3 days ago
   - Sends follow-up emails to encourage activity

3. **Email Templates**
   - `email-templates/re-engagement.html` - Re-engagement email template
   - `email-templates/re-engagement.txt` - Plain text version
   - `email-templates/follow-up-3days.html` - 3-day follow-up template

4. **Database Tracking** (Migrations: `20240101000018`, `20240101000019`, `20240101000020`)
   - Tracks email sending status and timestamps
   - Prevents duplicate email sends
   - Enables analytics and monitoring

## ⚙️ Setup Instructions

### 1. Database Migrations

Apply all required migrations:

```bash
# Apply email tracking migrations
supabase db push
```

Required migrations:

- `20240101000018_add_3day_followup_tracking.sql`
- `20240101000019_add_re_engagement_email_tracking.sql`
- `20240101000020_improve_email_tracking_indexes.sql`

### 2. Vercel Configuration

The system is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/send-3day-follow-up-emails",
      "schedule": "0 11 * * *"
    }
  ]
}
```

### 3. Environment Variables

Required environment variables:

```bash
# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email service
RESEND_API_KEY=your_resend_api_key

# Application URL
NEXT_PUBLIC_APP_URL=https://shareskippy.com
```

## 🔍 User Identification Logic

### Re-engagement Users (Inactive)

- **Primary**: Users with `last_sign_in_at` > 7 days ago (from `auth.users`)
- **Fallback**: Users with `updated_at` > 7 days ago (from `profiles`)
- **Exclusions**: Users who received re-engagement email within 30 days
- **Exclusions**: Users who received 3-day follow-up within 7 days

### 3-Day Follow-up Users

- Users who signed up exactly 3 days ago
- **Exclusions**: Users who already received 3-day follow-up
- **Exclusions**: Users who received re-engagement email within 7 days

## 🛡️ Safeguards & Prevention

### Duplicate Email Prevention

1. **Database Tracking**: All emails are tracked in `user_settings` table
2. **Time-based Cooldowns**:
   - Re-engagement: 30-day cooldown
   - 3-day follow-up: 7-day cooldown between systems
3. **Atomic Operations**: Database updates are atomic to prevent race conditions
4. **Comprehensive Logging**: All operations are logged for debugging

### Error Handling

- **Template Loading**: Graceful fallback if templates fail to load
- **Database Errors**: Comprehensive error tracking and reporting
- **Email Failures**: Individual user failures don't stop batch processing
- **Auth Access**: Fallback to `updated_at` if `auth.users` access fails

## 🧪 Testing

### Manual Testing

Test the re-engagement system:

```bash
# Test re-engagement endpoint
curl -X POST https://your-domain.com/api/admin/re-engage-inactive-users

# Test 3-day follow-up endpoint
curl -X GET https://your-domain.com/api/cron/send-3day-follow-up-emails
```

### Debug Script

Use the provided debug script:

```bash
node test-reengagement-debug.js
```

This script tests:

- Database connectivity
- Table structure validation
- Query logic verification
- User settings access

## 📊 Monitoring & Analytics

### Key Metrics

1. **Email Delivery**
   - Successful sends vs. failures
   - Bounce rates and spam complaints
   - Template loading success rate

2. **User Engagement**
   - Click-through rates on CTA buttons
   - Users who return after receiving emails
   - Time between email and user activity

3. **System Health**
   - Database query performance
   - Email service reliability
   - Error rates and types

### Logs to Monitor

```bash
# Check re-engagement execution
POST /api/admin/re-engage-inactive-users

# Response includes:
# - emailsSent: Number of emails sent
# - usersProcessed: Number of users found
# - skippedUsers: Users skipped with reasons
# - errors: Any errors encountered
# - summary: Comprehensive statistics
```

## 🔧 Configuration

### Email Templates

Templates support these variables:

- `{{userName}}` - User's first name
- `{{appUrl}}` - Application URL
- `{{userEmail}}` - User's email (for unsubscribe links)

### Cron Schedule

Current schedule: Daily at 11 AM UTC (`0 11 * * *`)

To modify, update `vercel.json`:

```json
{
  "path": "/api/cron/send-3day-follow-up-emails",
  "schedule": "0 9 * * *" // 9 AM UTC instead
}
```

### User Preferences

The system respects user email notification preferences:

- Checks `user_settings.email_notifications` field
- Skips users who have disabled email notifications
- Tracks sent emails to prevent duplicates

## 🚨 Troubleshooting

### Common Issues

1. **"Failed to fetch inactive users" Error**
   - Check Supabase service role key is valid
   - Verify database migrations were applied
   - Check if `auth.users` table is accessible
   - Review fallback logic to `updated_at`

2. **Duplicate Emails**
   - Check `user_settings` table has tracking fields
   - Verify atomic operations are working
   - Review cooldown logic

3. **Template Loading Errors**
   - Verify template files exist in `email-templates/`
   - Check file permissions
   - Ensure template variables are properly formatted

### Debug Commands

```bash
# Check if migrations were applied
SELECT column_name FROM information_schema.columns
WHERE table_name = 'user_settings'
AND column_name LIKE '%engagement%';

# Check recent inactive users
SELECT id, email, first_name, updated_at
FROM profiles
WHERE updated_at < NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC;

# Check email tracking
SELECT user_id, re_engagement_email_sent, re_engagement_email_sent_at
FROM user_settings
WHERE re_engagement_email_sent = true;
```

## 📈 Optimization Opportunities

### A/B Testing

1. **Email Timing**: Test different send times and intervals
2. **Content**: Test different subject lines and messaging
3. **User Segmentation**: Different approaches for different user types

### Performance Improvements

1. **Batch Processing**: Process users in batches for better performance
2. **Caching**: Cache user settings to reduce database queries
3. **Async Processing**: Use background jobs for large batches

### Analytics Enhancements

1. **Engagement Tracking**: Track email opens and clicks
2. **Conversion Tracking**: Measure return-to-platform rates
3. **User Journey**: Track user behavior after receiving emails

## 🔄 Maintenance

### Regular Tasks

1. **Weekly**: Review email delivery rates and bounce handling
2. **Monthly**: Analyze engagement metrics and optimize content
3. **Quarterly**: Review and update email templates

### Updates

When updating the system:

1. Test with debug script first
2. Update templates and test thoroughly
3. Monitor logs for any issues
4. Update documentation as needed

## 📝 Related Files

### API Endpoints

- `app/api/admin/re-engage-inactive-users/route.js` - Re-engagement API
- `app/api/cron/send-3day-follow-up-emails/route.js` - 3-day follow-up cron

### Email Templates

- `email-templates/re-engagement.html` - Re-engagement email template
- `email-templates/re-engagement.txt` - Plain text version
- `email-templates/follow-up-3days.html` - 3-day follow-up template

### Database Migrations

- `supabase/migrations/20240101000018_add_3day_followup_tracking.sql`
- `supabase/migrations/20240101000019_add_re_engagement_email_tracking.sql`
- `supabase/migrations/20240101000020_improve_email_tracking_indexes.sql`

### Configuration

- `vercel.json` - Cron configuration
- `test-reengagement-debug.js` - Debug script

### Documentation

- `3DAY_FOLLOWUP_EMAIL_SYSTEM.md` - 3-day follow-up documentation
- `RE_ENGAGEMENT_EMAIL_SYSTEM.md` - This file
