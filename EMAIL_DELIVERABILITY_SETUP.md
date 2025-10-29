# Email Deliverability Setup Guide

## Current Status:

### ✅ COMPLETED:

✅ **Resend domain verified** - `send.shareskippy.com` ready to send
✅ **Email templates optimized** - All spam triggers removed, CAN-SPAM compliant
✅ **Config.js updated** - Correct email addresses configured
✅ **DNS records for send.shareskippy.com** - SPF, DKIM, DMARC verified in Resend

### 🔄 STILL NEEDED:

🔄 **Email forwarding setup** - `admin@send.shareskippy.com` → your Gmail
🔄 **DNS for shareskippy.com** - SPF record for your manual Gmail emails
🔄 **Supabase verification** - Confirm magic link sender address

## Critical DNS Records to Add:

### For shareskippy.com (Google/manual emails + admin emails expecting replies):

#### 1. SPF Record for shareskippy.com

```txt
Name: @ (or shareskippy.com)
Type: TXT
Value: v=spf1 include:_spf.google.com include:amazonses.com ~all
```

_Note: Includes both Google (for manual emails) and Amazon SES (used by Resend for transactional emails)_

#### 2. DMARC Record for shareskippy.com

```txt
Name: _dmarc
Type: TXT
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@shareskippy.com; ruf=mailto:dmarc@shareskippy.com; sp=quarantine; adkim=r; aspf=r;
```

### For send.shareskippy.com (Resend - Already Configured ✅):

#### 3. SPF Record for send.shareskippy.com ✅ VERIFIED

```txt
Name: send.send
Type: TXT
Value: v=spf1 include:amazons... (as shown in your Resend dashboard)
```

#### 4. DKIM Record for send.shareskippy.com ✅ VERIFIED

```txt
Name: resend._domainkey.send
Type: TXT
Value: p=MIGfMA0GCSqGSIb3DQEB... (as shown in your Resend dashboard)
```

#### 5. DMARC Record for send.shareskippy.com ✅ VERIFIED

```txt
Name: _dmarc
Type: TXT
Value: v=DMARC1; p=none; (as shown in your Resend dashboard)
```

## Supabase Auth Email Configuration:

### Recommended Supabase Settings:

- **Magic link sender**: `ShareSkippy <admin@shareskippy.com>` (CHANGE FROM send.shareskippy.com)
- **SMTP Provider**: Supabase's built-in email service

### In your Supabase Dashboard:

1. Go to Authentication > Settings > SMTP Settings
2. Change the sender email to: `ShareSkippy <admin@shareskippy.com>`
3. Go to Authentication > Email Templates
4. Update the magic link template to:
   - Use a clear, non-spammy subject like "Sign in to ShareSkippy"
   - Include your company information
   - Add an unsubscribe link (optional for auth emails)
   - Use professional styling

### Example Magic Link Template:

```html
<h2>Welcome to ShareSkippy!</h2>
<p>Click the link below to sign in to your account:</p>
<p>
  <a
    href="{{ .ConfirmationURL }}"
    style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;"
    >Sign In to ShareSkippy</a
  >
</p>
<p>If you didn't request this email, you can safely ignore it.</p>
<hr />
<p style="color: #666; font-size: 12px;">
  ShareSkippy - Connecting dog lovers with dog owners<br />
  If you no longer wish to receive these emails,
  <a href="mailto:support@shareskippy.com?subject=Unsubscribe">unsubscribe here</a>
</p>
```

## Email Strategy & Forwarding Setup:

### Recommended Configuration (Simplified Strategy):

- **Magic links (Supabase)**: `admin@shareskippy.com` (direct to Gmail)
- **Automated emails (no replies expected)**: `noreply@send.shareskippy.com`
- **Admin emails (expecting replies)**: `admin@send.shareskippy.com` (forwarded to Gmail)
- **Support emails**: `support@shareskippy.com` (forwarded to Gmail)

### Required Email Forwarding in Namecheap:

Set up email forwarding in Namecheap control panel:

```txt
admin@shareskippy.com → admin@shareskippy.com (your Gmail)
admin@send.shareskippy.com → admin@shareskippy.com (for Resend transactional emails)
support@shareskippy.com → admin@shareskippy.com (for support requests)
```

### Email Flow:

1. **Magic links (Supabase)** → `admin@send.shareskippy.com` (Supabase direct, forwarded to Gmail)
2. **App notifications, reminders** → `noreply@send.shareskippy.com` (Resend)
3. **Admin communications** → `admin@send.shareskippy.com` (Resend, forwarded to Gmail)
4. **Support requests** → `support@shareskippy.com` (forwarded to Gmail)
5. **Manual emails from you** → Direct from Gmail using `shareskippy.com`

## Resend Dashboard Configuration:

### 1. Domain Verification (Single Domain - Free Plan): ✅ COMPLETE

**Primary Domain**: `send.shareskippy.com` - **VERIFIED**

- ✅ Domain verified in Resend dashboard (as shown in screenshot)
- ✅ All DNS records verified (SPF, DKIM, DMARC)
- ✅ Ready to send emails
- Used for: `noreply@send.shareskippy.com` AND `admin@send.shareskippy.com`
- All replies to `admin@send.shareskippy.com` forwarded to Gmail

### 2. Email Monitoring:

- Monitor bounce rates (keep < 5%)
- Monitor complaint rates (keep < 0.1%)
- Check delivery rates regularly

## Email Template Improvements Implemented:

### CAN-SPAM Compliance:

✅ Added physical address (ShareSkippy LLC, San Francisco, CA) to all email footers
✅ Added unsubscribe links to every email template
✅ Added legal compliance text explaining why users received each email
✅ Included clear sender identification

### Content Optimization:

✅ Removed spam trigger words and excessive punctuation
✅ Improved subject lines to be more professional
✅ Enhanced email headers to be less promotional
✅ Better text-to-HTML ratio with substantial text content
✅ Created plain text version for key emails

### Personalization & Engagement:

✅ Enhanced use of recipient names
✅ Added context-specific messaging
✅ Maintained friendly but professional tone
✅ Preserved all existing styling and brand colors

## Best Practices Implemented:

✅ Content validation for spam triggers  
✅ Plain text version created for welcome email
✅ Proper email headers with professional messaging
✅ List-Unsubscribe header functionality
✅ Unique message IDs for tracking

## Testing Email Deliverability:

1. **Test with mail-tester.com:**

   ```bash
   # Send a test email to the address provided by mail-tester.com
   ```

2. **Check Gmail Spam Folder:**
   - Send test emails to Gmail accounts
   - Check if they land in inbox vs spam

3. **Monitor Resend Analytics:**
   - Watch delivery rates
   - Monitor spam complaints
   - Track bounces

## Additional Improvements:

### 1. Warm up your sending domain:

- Start with low volume
- Gradually increase email frequency
- Maintain consistent sending patterns

### 2. Segment your audience:

- Only send relevant emails
- Remove inactive subscribers
- Use double opt-in for new subscribers

### 3. Monitor sender reputation:

- Use Google Postmaster Tools
- Check your domain reputation regularly
- Respond quickly to any issues

## Troubleshooting:

If emails still go to spam after implementing these changes:

1. **Check DNS propagation** (may take 24-48 hours)
2. **Verify all records** in your domain provider
3. **Test email content** with different subjects/content
4. **Contact Resend support** if delivery rates don't improve
5. **Consider using a dedicated IP** for high volume sending

## Monitoring Commands:

```bash
# Check SPF records
dig TXT shareskippy.com
dig TXT send.send.shareskippy.com

# Check DKIM record (Resend) - Already verified ✅
dig TXT resend._domainkey.send.shareskippy.com

# Check DMARC records
dig TXT _dmarc.shareskippy.com
dig TXT _dmarc.send.shareskippy.com
```
