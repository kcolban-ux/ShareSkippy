# Bulk Email System Guide

This guide explains how to use the bulk email system to send emails to all users in your ShareSkippy database.

## Setup

### 1. Environment Variables

Make sure you have the following environment variables set:

```bash
# Required for Resend
RESEND_API_KEY=your_resend_api_key

# Required for Supabase service role access
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Resend Configuration

Ensure your Resend account is properly configured in `config.js` with the correct `fromAdmin` email address.

## Usage

### Option 1: Admin Interface (Recommended)

1. Navigate to `/admin/bulk-email` in your browser
2. Fill out the form:
   - **Subject**: Email subject line
   - **HTML Content**: HTML email content with personalization variables
   - **Text Content**: Plain text version (optional)
   - **Batch Size**: Number of emails per batch (1-100, default: 50)
   - **Delay**: Milliseconds between batches (default: 1000)

3. Click "Send Bulk Email"

### Option 2: API Endpoint

Send a POST request to `/api/admin/send-bulk-email`:

```javascript
const response = await fetch('/api/admin/send-bulk-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    subject: 'Your Email Subject',
    htmlContent: '<h1>Hello {{first_name}}!</h1><p>Your message here...</p>',
    textContent: 'Hello {{first_name}}! Your message here...',
    batchSize: 50,
    delayMs: 1000,
  }),
});
```

### Option 3: Test Email

Send a test email to a specific user:

```javascript
const response = await fetch('/api/admin/test-bulk-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    testEmail: 'test@example.com',
    subject: 'Test Email',
    htmlContent: '<h1>Hello {{first_name}}!</h1>',
    textContent: 'Hello {{first_name}}!',
  }),
});
```

## Personalization Variables

Use these variables in your email content for personalization:

- `{{first_name}}` - User's first name
- `{{last_name}}` - User's last name
- `{{email}}` - User's email address

Example:

```html
<h1>Hello {{first_name}}!</h1>
<p>We hope you and your furry friend are doing well, {{first_name}}!</p>
```

## Email Templates

### HTML Template Structure

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ShareSkippy Announcement</title>
    <style>
      /* Your CSS styles here */
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Hello {{first_name}}!</h1>
      <p>Your message content here...</p>
    </div>
  </body>
</html>
```

### Text Template

```txt
Hello {{first_name}}!

Your message content here...

Best regards,
The ShareSkippy Team
```

## Rate Limiting & Best Practices

### Rate Limits

- **API Rate Limit**: 10 requests per minute per IP
- **Batch Processing**: Emails are sent in batches to respect rate limits
- **Retry Logic**: Failed emails are retried up to 2 times

### Best Practices

1. **Test First**: Always send a test email before bulk sending
2. **Batch Size**: Use smaller batches (10-50) for better deliverability
3. **Delay**: Add delays between batches (1000-2000ms recommended)
4. **Content**: Keep content relevant and valuable to users
5. **Frequency**: Don't send bulk emails too frequently to avoid spam complaints

### Recommended Settings

```javascript
{
  batchSize: 25,        // Small batches for better deliverability
  delayMs: 2000,       // 2 second delay between batches
  subject: "Clear, descriptive subject line",
  htmlContent: "Well-formatted HTML with personalization",
  textContent: "Plain text fallback"
}
```

## Monitoring & Results

The system provides detailed results including:

- Total users processed
- Successful sends
- Failed sends
- Error details for failed emails

Example response:

```json
{
  "message": "Bulk email processing completed",
  "results": {
    "totalUsers": 150,
    "successful": 147,
    "failed": 3,
    "errors": [
      {
        "email": "invalid@example.com",
        "error": "Invalid email address"
      }
    ]
  }
}
```

## Troubleshooting

### Common Issues

1. **Rate Limiting**: If you hit rate limits, increase the delay between batches
2. **Invalid Emails**: Some users may have invalid email addresses
3. **Resend Limits**: Check your Resend account limits and usage
4. **Supabase Access**: Ensure service role key has proper permissions

### Error Handling

The system includes:

- Automatic retries for failed emails
- Detailed error logging
- Graceful handling of invalid email addresses
- Rate limit protection

### Logs

Check your application logs for detailed information about:

- Batch processing progress
- Individual email failures
- Rate limiting events
- Retry attempts

## Security Considerations

1. **Admin Access**: The bulk email endpoint should be protected with proper authentication
2. **Rate Limiting**: Prevents abuse of the bulk email system
3. **Input Validation**: All inputs are validated before processing
4. **Error Handling**: Sensitive information is not exposed in error messages

## Example Usage

### Sending a Welcome Email to New Users

```javascript
const welcomeEmail = {
  subject: 'Welcome to ShareSkippy!',
  htmlContent: `
    <h1>Welcome {{first_name}}!</h1>
    <p>Thank you for joining ShareSkippy. We're excited to help you connect with other dog lovers in your community.</p>
    <p>Get started by creating your first availability post!</p>
    <a href="https://shareskippy.com/share-availability">Share Your Availability</a>
  `,
  textContent: 'Welcome {{first_name}}! Thank you for joining ShareSkippy...',
  batchSize: 25,
  delayMs: 1500,
};
```

### Sending a Feature Announcement

```javascript
const announcementEmail = {
  subject: 'New Feature: Enhanced Messaging',
  htmlContent: `
    <h1>Hello {{first_name}}!</h1>
    <p>We're excited to announce our new enhanced messaging system with better notifications and improved user experience.</p>
    <p>Check it out and let us know what you think!</p>
  `,
  batchSize: 50,
  delayMs: 1000,
};
```

This bulk email system provides a robust, scalable solution for communicating with your ShareSkippy users while respecting rate limits and ensuring good deliverability.
