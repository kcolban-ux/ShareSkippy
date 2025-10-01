# ShareSkippy Email System Setup Guide

This guide covers the complete email system setup for ShareSkippy, including all email templates and their integration with Resend.

## 📧 Email Types

### 1. Welcome Email
- **Trigger**: When a new user signs up
- **Template**: `email-templates/welcome-email.html`
- **API Endpoint**: `POST /api/emails/welcome`

### 2. New Message Notification
- **Trigger**: When a user receives a new message
- **Template**: `email-templates/new-message-notification.html`
- **API Endpoint**: `POST /api/emails/new-message`

### 3. Meeting Scheduled Confirmation
- **Trigger**: When a meeting is successfully scheduled
- **Template**: `email-templates/meeting-scheduled-confirmation.html`
- **API Endpoint**: `POST /api/emails/meeting-scheduled`

### 4. Meeting Reminder (1 Day Before)
- **Trigger**: 24 hours before a scheduled meeting
- **Template**: `email-templates/meeting-reminder-1day.html`
- **API Endpoint**: `POST /api/emails/meeting-reminder`
- **Cron Job**: `GET /api/cron/send-email-reminders`

### 5. Follow-up Email (1 Week After Signup)
- **Trigger**: 7 days after user signup
- **Template**: `email-templates/follow-up-1week.html`
- **API Endpoint**: `POST /api/emails/follow-up`
- **Cron Job**: `GET /api/cron/send-follow-up-emails`

## 🚀 Setup Instructions

### 1. Environment Variables

Make sure you have these environment variables set:

```bash
# Required for Resend
RESEND_API_KEY=your_resend_api_key_here

# App URL for email links
NEXT_PUBLIC_APP_URL=https://shareskippy.com
```

### 2. Resend Configuration

Your Resend configuration is already set up in `config.js`:

```javascript
resend: {
  fromNoReply: `ShareSkippy <noreply@kaia.dev>`,
  fromAdmin: `ShareSkippy <admin@kaia.dev>`,
  supportEmail: "kaia@shareskippy.com",
}
```

### 3. Database Schema Requirements

Make sure your database has these tables:

```sql
-- User settings for email preferences
CREATE TABLE user_settings (
  user_id UUID REFERENCES profiles(id) PRIMARY KEY,
  email_notifications BOOLEAN DEFAULT true,
  follow_up_email_sent BOOLEAN DEFAULT false,
  follow_up_email_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Profile views tracking (for follow-up email stats)
CREATE TABLE profile_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  viewer_id UUID REFERENCES profiles(id),
  viewed_user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add reminder_sent column to meetings table
ALTER TABLE meetings ADD COLUMN reminder_sent BOOLEAN DEFAULT false;
```

## 📝 Usage Examples

### Sending Welcome Email

```javascript
// In your signup flow
import { sendWelcomeEmail } from '@/libs/emailTemplates';

await sendWelcomeEmail({
  to: 'user@example.com',
  userName: 'John',
  appUrl: 'shareskippy.com'
});
```

### Sending New Message Notification

```javascript
// When a new message is created
import { sendNewMessageNotification } from '@/libs/emailTemplates';

await sendNewMessageNotification({
  to: 'recipient@example.com',
  recipientName: 'Jane',
  senderName: 'John Doe',
  senderInitial: 'J',
  messagePreview: 'Hey! Would you like to schedule a playdate?',
  messageTime: '2:30 PM',
  messageUrl: 'https://shareskippy.com/messages/123',
});
```

### Sending Meeting Confirmation

```javascript
// When a meeting is scheduled
import { sendMeetingScheduledConfirmation } from '@/libs/emailTemplates';

await sendMeetingScheduledConfirmation({
  to: 'user@example.com',
  userName: 'John',
  userDogName: 'Buddy',
  otherUserName: 'Jane Smith',
  otherUserDogName: 'Luna',
  meetingDate: 'March 15, 2024',
  meetingTime: '2:00 PM',
  meetingLocation: 'Central Park',
  meetingNotes: 'Bring water and treats!',
  meetingUrl: 'https://shareskippy.com/meetings/456',
  messageUrl: 'https://shareskippy.com/messages',
});
```

## ⏰ Cron Jobs Setup

### 1. Meeting Reminders (Daily at 9 AM)

Set up a cron job to call the meeting reminders endpoint:

```bash
# Add to your crontab
0 9 * * * curl -X GET https://shareskippy.com/api/cron/send-email-reminders
```

### 2. Follow-up Emails (Daily at 10 AM)

Set up a cron job to call the follow-up emails endpoint:

```bash
# Add to your crontab
0 10 * * * curl -X GET https://shareskippy.com/api/cron/send-follow-up-emails
```

### 3. Using Vercel Cron (Recommended)

Add to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/send-email-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/send-follow-up-emails", 
      "schedule": "0 10 * * *"
    }
  ]
}
```

## 🎨 Customizing Email Templates

All email templates are located in the `email-templates/` directory. Each template uses:

- **HTML**: For rich formatting and styling
- **CSS**: Inline styles for email compatibility
- **Variables**: `{{variableName}}` syntax for dynamic content

### Template Variables

Each template accepts specific variables:

#### Welcome Email
- `{{userName}}` - User's first name
- `{{appUrl}}` - App URL

#### New Message Notification
- `{{recipientName}}` - Recipient's name
- `{{senderName}}` - Sender's full name
- `{{senderInitial}}` - Sender's initial for avatar
- `{{messagePreview}}` - First 100 characters of message
- `{{messageTime}}` - When message was sent
- `{{messageUrl}}` - Link to view message

#### Meeting Scheduled/Reminder
- `{{userName}}` - User's name
- `{{userDogName}}` - User's dog name
- `{{otherUserName}}` - Other participant's name
- `{{otherUserDogName}}` - Other participant's dog name
- `{{meetingDate}}` - Meeting date
- `{{meetingTime}}` - Meeting time
- `{{meetingLocation}}` - Meeting location
- `{{meetingNotes}}` - Optional meeting notes
- `{{meetingUrl}}` - Link to meeting details
- `{{messageUrl}}` - Link to messages

#### Follow-up Email
- `{{userName}}` - User's name
- `{{userDogName}}` - User's dog name
- `{{profileViews}}` - Number of profile views
- `{{messagesReceived}}` - Number of messages received
- `{{meetingsScheduled}}` - Number of meetings scheduled
- `{{connectionsMade}}` - Number of unique connections

## 🔧 Integration Points

### 1. User Signup
Add welcome email to your signup flow:

```javascript
// After successful user creation
await fetch('/api/emails/welcome', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: newUser.id })
});
```

### 2. Message Creation
Add notification to your message creation:

```javascript
// After creating a message
await fetch('/api/emails/new-message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    recipientId: message.recipient_id,
    senderId: message.sender_id,
    messagePreview: message.content,
    messageId: message.id
  })
});
```

### 3. Meeting Scheduling
Add confirmation to your meeting creation:

```javascript
// After scheduling a meeting
await fetch('/api/emails/meeting-scheduled', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    meetingId: meeting.id,
    userId: meeting.requester_id
  })
});

// Also send to recipient
await fetch('/api/emails/meeting-scheduled', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    meetingId: meeting.id,
    userId: meeting.recipient_id
  })
});
```

## 🛡️ Email Preferences

Users can control their email preferences through the `user_settings` table:

```javascript
// Disable email notifications
await supabase
  .from('user_settings')
  .upsert({
    user_id: userId,
    email_notifications: false
  });
```

## 📊 Monitoring & Analytics

Track email performance by monitoring:

1. **Delivery rates** in Resend dashboard
2. **Open rates** and **click rates** in Resend analytics
3. **Error logs** in your application logs
4. **User engagement** after receiving emails

## 🚨 Error Handling

All email functions include comprehensive error handling:

- **Template loading errors**: Logged and thrown
- **Resend API errors**: Logged and thrown
- **Database errors**: Logged and returned as API responses
- **Missing data**: Graceful fallbacks with default values

## 🔍 Testing

Test your email system:

1. **Development**: Use Resend's test mode
2. **Staging**: Send to test email addresses
3. **Production**: Monitor delivery and engagement metrics

## 📱 Mobile Optimization

All email templates are:
- **Responsive**: Work on mobile and desktop
- **Email client compatible**: Tested across major email clients
- **Accessible**: Proper contrast and readable fonts
- **Fast loading**: Optimized images and minimal external resources

## 🎯 Best Practices

1. **Personalization**: Use user names and dog names
2. **Clear CTAs**: Prominent call-to-action buttons
3. **Unsubscribe**: Respect user preferences
4. **Timing**: Send emails at appropriate times
5. **Frequency**: Don't overwhelm users with emails
6. **Content**: Keep emails relevant and valuable

## 🆘 Troubleshooting

### Common Issues

1. **Emails not sending**: Check RESEND_API_KEY
2. **Templates not loading**: Verify file paths
3. **Variables not replacing**: Check variable names match
4. **Cron jobs not running**: Verify cron setup
5. **Database errors**: Check table schemas

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG_EMAILS=true
```

This will log all email operations to the console.

## 📞 Support

For issues with the email system:

1. Check the application logs
2. Verify Resend dashboard for delivery status
3. Test with a simple email first
4. Check database connectivity
5. Verify environment variables

---

**Happy emailing! 🐕📧**

