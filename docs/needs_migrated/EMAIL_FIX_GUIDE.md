# 🚨 EMAIL SYSTEM FIX GUIDE

## Current Status

The email system is **partially working** but has critical issues that need to be resolved:

### ✅ What's Working

- Email endpoints are responding
- Email templates are bundled with application
- Frontend is using correct API routes

### ❌ What's Not Working

- Emails are not being sent in production
- Likely missing environment variables or database migration

## 🔧 CRITICAL FIXES NEEDED

### 1. **Environment Variables in Vercel** 🚨

Go to your Vercel dashboard and ensure these environment variables are set:

```bash
RESEND_API_KEY=your_resend_api_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=https://www.shareskippy.com
```

**To check/set these:**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your ShareSkippy project
3. Go to Settings → Environment Variables
4. Add/verify the variables above
5. Redeploy the application

### 2. **Database Migration** 🚨

The email system requires these database tables that may not exist:

**Required Tables:**

- `email_events` - Tracks email sending
- `email_catalog` - Email type definitions
- `scheduled_emails` - Queue for delayed emails
- `user_activity` - User action tracking

**To apply the migration:**

1. **Option A: Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Go to SQL Editor
   - Run the migration from `supabase/migrations/20240101000021_create_email_system_tables.sql`

2. **Option B: Supabase CLI**
   ```bash
   supabase link --project-ref your-project-ref
   supabase db push
   ```

### 3. **Verify Email System** 🧪

After applying the fixes above, test the email system:

1. **Send a message** between two real user accounts
2. **Check if the recipient receives an email**
3. **Check Vercel function logs** for any errors

## 🔍 DEBUGGING STEPS

### Check Environment Variables

```bash
# Test if environment variables are accessible
curl -X POST https://www.shareskippy.com/api/emails/send-new-message \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"test","senderId":"test","messagePreview":"test"}'
```

### Check Database Tables

In your Supabase dashboard, run:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('email_events', 'email_catalog', 'scheduled_emails');
```

### Check Vercel Logs

1. Go to Vercel dashboard
2. Select your project
3. Go to Functions tab
4. Check logs for email-related errors

## 🎯 EXPECTED BEHAVIOR

After applying the fixes:

1. **Message sending** should trigger email notifications
2. **Email events** should be logged in the `email_events` table
3. **Recipients** should receive email notifications
4. **No errors** should appear in Vercel function logs

## 🚀 QUICK FIX SUMMARY

1. **Set environment variables in Vercel**
2. **Apply database migration**
3. **Redeploy application**
4. **Test with real user accounts**

The email system should work properly after these fixes are applied!
