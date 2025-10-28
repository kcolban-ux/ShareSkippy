# 3-Day Follow-up Email System

This document describes the automated 3-day follow-up email system for ShareSkippy, designed to encourage new users to share their availability and start connecting with neighbors.

## 📧 Email Overview

### Purpose

The 3-day follow-up email is sent to users 3 days after they join ShareSkippy to encourage them to:

- Share their availability for dog activities
- Connect with neighbors and their dogs
- Get started with the platform's core features

### Email Content

- **Subject**: "Ready to connect with your neighbors? 🐕"
- **Template**: `email-templates/follow-up-3days.html`
- **Key Message**: Encourages users to share availability and start connecting
- **Call-to-Action**: "Share My Availability" button linking to `/share-availability`

## 🏗️ System Architecture

### Components

1. **Email Template** (`email-templates/follow-up-3days.html`)
   - HTML email template with inline CSS
   - Responsive design for all email clients
   - Uses the provided design with ShareSkippy branding

2. **Email Function** (`libs/emailTemplates.js`)
   - `sendFollowUp3DaysEmail()` function
   - Handles template processing and email sending
   - Includes both HTML and plain text versions

3. **Cron Job** (`app/api/cron/send-3day-follow-up-emails/route.js`)
   - Automated daily execution at 11 AM UTC
   - Finds users who signed up exactly 3 days ago
   - Respects user email notification preferences
   - Prevents duplicate emails

4. **Database Tracking** (Migration: `20240101000018_add_3day_followup_tracking.sql`)
   - Adds `follow_up_3day_sent` and `follow_up_3day_sent_at` fields
   - Prevents duplicate email sends
   - Enables tracking and analytics

## ⚙️ Setup Instructions

### 1. Database Migration

Run the migration to add tracking fields:

```bash
# Apply the migration
supabase db push
```

### 2. Vercel Cron Configuration

The system is already configured in `vercel.json`:

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

Ensure these are set:

```bash
RESEND_API_KEY=your_resend_api_key_here
NEXT_PUBLIC_APP_URL=https://shareskippy.com
```

## 🧪 Testing

### Manual Testing

Test the email system manually:

```bash
# Test endpoint
curl -X GET https://your-domain.com/api/test-3day-followup
```

### Production Testing

The cron job runs daily at 11 AM UTC. Monitor logs to ensure:

- Users are correctly identified (signed up 3 days ago)
- Emails are sent successfully
- No duplicate emails are sent
- User preferences are respected

## 📊 Monitoring

### Key Metrics to Track

1. **Email Delivery Rate**
   - Successful sends vs. failures
   - Bounce rates and spam complaints

2. **User Engagement**
   - Click-through rates on "Share My Availability" button
   - Users who actually share availability after receiving email

3. **System Health**
   - Cron job execution success
   - Database query performance
   - Email service reliability

### Logs to Monitor

```bash
# Check cron job execution
GET /api/cron/send-3day-follow-up-emails

# Response includes:
# - emailsSent: Number of emails sent
# - usersProcessed: Number of users found
# - errors: Any errors encountered
```

## 🔧 Configuration

### Email Template Variables

The template supports these variables:

- `{{userName}}` - User's first name
- `{{appUrl}}` - Application URL

### Cron Schedule

Current schedule: Daily at 11 AM UTC (`0 11 * * *`)

To change the schedule, update `vercel.json`:

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

1. **Emails Not Sending**
   - Check RESEND_API_KEY is valid
   - Verify cron job is running (check Vercel logs)
   - Ensure database migration was applied

2. **Duplicate Emails**
   - Check `follow_up_3day_sent` tracking is working
   - Verify user_settings table has the new fields

3. **Wrong Users Receiving Emails**
   - Check date calculation logic in cron job
   - Verify user signup dates in database

### Debug Commands

```bash
# Check if migration was applied
SELECT column_name FROM information_schema.columns
WHERE table_name = 'user_settings'
AND column_name LIKE '%3day%';

# Check recent user signups
SELECT id, email, first_name, created_at
FROM profiles
WHERE created_at >= NOW() - INTERVAL '4 days'
ORDER BY created_at DESC;

# Check email tracking
SELECT user_id, follow_up_3day_sent, follow_up_3day_sent_at
FROM user_settings
WHERE follow_up_3day_sent = true;
```

## 📈 Analytics & Optimization

### A/B Testing Opportunities

1. **Email Timing**
   - Test different send times (2 days vs 3 days vs 4 days)
   - Compare engagement rates

2. **Email Content**
   - Test different subject lines
   - Test different call-to-action buttons
   - Test different messaging approaches

3. **User Segmentation**
   - Different emails for users with/without dogs
   - Location-based messaging
   - Activity-based targeting

### Success Metrics

- **Primary**: Users who share availability after receiving email
- **Secondary**: Click-through rate on CTA button
- **Tertiary**: Overall user engagement increase

## 🔄 Maintenance

### Regular Tasks

1. **Weekly**: Review email delivery rates and bounce handling
2. **Monthly**: Analyze engagement metrics and optimize content
3. **Quarterly**: Review and update email template design

### Updates

When updating the email template:

1. Test with the test endpoint first
2. Update the HTML template file
3. Verify all variables are properly replaced
4. Test with different user data scenarios

## 📝 Related Files

- `email-templates/follow-up-3days.html` - Email template
- `libs/emailTemplates.js` - Email sending functions
- `app/api/cron/send-3day-follow-up-emails/route.js` - Cron job
- `app/api/test-3day-followup/route.js` - Test endpoint
- `supabase/migrations/20240101000018_add_3day_followup_tracking.sql` - Database migration
- `vercel.json` - Cron configuration
