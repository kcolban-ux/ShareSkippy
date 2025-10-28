# Testing Re-engagement System

This document provides comprehensive testing instructions for the re-engagement email system.

## 🧪 Test Overview

The re-engagement system can be tested in several ways to verify that it correctly identifies and processes inactive users.

## 🚀 Quick Test (Recommended)

### 1. Start Development Server

```bash
npm run dev
```

### 2. Test API Endpoint

```bash
# Test re-engagement endpoint
curl -X POST http://localhost:3000/api/admin/re-engage-inactive-users

# Test 3-day follow-up endpoint
curl -X GET http://localhost:3000/api/cron/send-3day-follow-up-emails
```

### 3. Run Automated Test Script

```bash
# Simple test script
node test-reengagement-simple.js

# Or use the curl test script
./test-curl-commands.sh
```

## 🔍 Detailed Testing

### Test 1: API Endpoint Testing

**Purpose**: Verify the API can fetch and process inactive users

**Steps**:

1. Start the development server: `npm run dev`
2. Run the test: `node test-reengagement-simple.js`
3. Check the response for:
   - `usersProcessed`: Number of users found
   - `emailsSent`: Number of emails sent
   - `skippedUsers`: Users skipped with reasons
   - `errors`: Any errors encountered

**Expected Results**:

- ✅ `usersProcessed > 0`: System found potentially inactive users
- ✅ `emailsSent >= 0`: Emails were sent (or all users were skipped)
- ✅ `errors.length = 0`: No errors occurred

### Test 2: Database Query Testing

**Purpose**: Verify database queries work correctly

**Steps**:

1. Set environment variables:
   ```bash
   export NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
   export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
   ```
2. Run the test: `node test-database-queries.js`

**Expected Results**:

- ✅ Profiles table accessible
- ✅ User settings table accessible
- ✅ Fallback query successful (finds users with old `updated_at`)
- ⚠️ Auth.users access may fail (expected - uses fallback)

### Test 3: Manual API Testing

**Purpose**: Test the API directly with curl

**Steps**:

1. Start development server: `npm run dev`
2. Run: `./test-curl-commands.sh`
3. Analyze the JSON response

**Expected Response Format**:

```json
{
  "success": true,
  "message": "Re-engagement emails processed",
  "emailsSent": 5,
  "usersProcessed": 10,
  "skippedUsers": [
    {
      "userId": "uuid",
      "email": "user@example.com",
      "reason": "Re-engagement email already sent",
      "sentAt": "2024-01-01T00:00:00Z"
    }
  ],
  "errors": [],
  "summary": {
    "totalUsers": 10,
    "emailsSent": 5,
    "skipped": 3,
    "errors": 0
  }
}
```

## 🔍 Understanding Test Results

### Successful Test Indicators

1. **API Returns 200 OK**: Endpoint is working
2. **`usersProcessed > 0`**: System found inactive users
3. **`emailsSent > 0`**: Emails were sent successfully
4. **`errors.length = 0`**: No errors occurred

### Common Issues & Solutions

#### Issue: `usersProcessed = 0`

**Possible Causes**:

- No inactive users in database
- All users are active (signed in recently)
- Database query issues

**Solutions**:

- Check if you have test users in the database
- Verify the date logic (7 days ago)
- Check database connection

#### Issue: `emailsSent = 0` but `usersProcessed > 0`

**Possible Causes**:

- All users already received emails recently
- Email sending issues
- Template loading problems

**Solutions**:

- Check `skippedUsers` array for reasons
- Verify email service configuration
- Check template files exist

#### Issue: `errors.length > 0`

**Possible Causes**:

- Database connection issues
- Missing environment variables
- Template loading errors

**Solutions**:

- Check environment variables
- Verify database migrations applied
- Check template files exist

### Expected Behavior

#### First Run (Clean Database)

- `usersProcessed`: Number of users with old `updated_at`
- `emailsSent`: Same as `usersProcessed` (no previous emails)
- `skippedUsers`: Empty array
- `errors`: Empty array

#### Subsequent Runs (Within 30 Days)

- `usersProcessed`: Same as first run
- `emailsSent`: 0 (all users skipped)
- `skippedUsers`: Array with reasons like "Re-engagement email already sent"
- `errors`: Empty array

## 🛠️ Troubleshooting

### Environment Variables

```bash
# Required variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_APP_URL=https://shareskippy.com
```

### Database Migrations

```bash
# Check if migrations were applied
supabase db push

# Or manually check
SELECT column_name FROM information_schema.columns
WHERE table_name = 'user_settings'
AND column_name LIKE '%engagement%';
```

### Common Error Messages

#### "Failed to fetch inactive users"

- Check Supabase service role key
- Verify database connection
- Check if migrations were applied

#### "Template loading error"

- Check if `email-templates/re-engagement.html` exists
- Verify file permissions
- Check template syntax

#### "Settings update error"

- Check `user_settings` table exists
- Verify user_id is valid UUID
- Check database permissions

## 📊 Performance Testing

### Load Testing

```bash
# Test with multiple requests
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/admin/re-engage-inactive-users &
done
wait
```

### Database Performance

```bash
# Check query performance
EXPLAIN ANALYZE SELECT id, email, first_name, last_name, created_at, updated_at
FROM profiles
WHERE updated_at < NOW() - INTERVAL '7 days'
AND email IS NOT NULL AND email != '';
```

## 🎯 Success Criteria

A successful test should show:

1. ✅ **API Endpoint Working**: Returns 200 OK
2. ✅ **Database Queries Working**: Finds users correctly
3. ✅ **Email System Working**: Sends emails or skips appropriately
4. ✅ **Tracking Working**: Updates user_settings correctly
5. ✅ **Error Handling Working**: Graceful handling of issues

## 📝 Test Reports

After running tests, document:

1. **Test Date**: When the test was run
2. **Environment**: Development/Production
3. **Results**: API response data
4. **Issues**: Any problems encountered
5. **Recommendations**: Improvements needed

## 🔄 Continuous Testing

### Automated Testing

- Set up monitoring for API endpoint health
- Track email delivery rates
- Monitor error rates
- Check database performance

### Manual Testing

- Weekly: Test API endpoint manually
- Monthly: Review email delivery rates
- Quarterly: Test with different user scenarios

## 📚 Related Files

- `test-reengagement-simple.js` - Simple API test
- `test-database-queries.js` - Database query test
- `test-curl-commands.sh` - Curl-based test
- `app/api/admin/re-engage-inactive-users/route.js` - API endpoint
- `RE_ENGAGEMENT_EMAIL_SYSTEM.md` - System documentation
