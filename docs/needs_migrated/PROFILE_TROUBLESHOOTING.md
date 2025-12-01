# Profile Save Troubleshooting Guide

## Issue: "Failed to save profile"

This guide helps you debug and fix profile save issues in the ShareSkippy application.

## Quick Fixes to Try First

### 1. Check Environment Variables

Make sure your `.env.local` file has the correct Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### 2. Verify Database Schema

Run the updated database schema in your Supabase SQL editor:

```sql
-- Run the contents of database_schema.sql
-- This will create/update the profiles table and RLS policies
```

### 3. Check Browser Console

Open browser developer tools and look for error messages when trying to save the profile.

## Debugging Steps

### Step 1: Test Database Connection

1. Go to your profile edit page
2. Open browser console (F12)
3. Copy and paste the debug script from `debug-profile.js`
4. Press Enter to run it
5. Check the console output for any errors

### Step 2: Test Server-Side API

1. Make sure you're logged in
2. Visit `/api/profile/test` in your browser
3. Check the response for any errors

### Step 3: Check RLS Policies

In your Supabase dashboard:

1. Go to Authentication > Policies
2. Check if the profiles table has the correct policies:
   - "Users can view their own profile"
   - "Users can update their own profile"
   - "Users can insert their own profile"
   - "Users can upsert their own profile"

## Common Issues and Solutions

### Issue 1: RLS Policy Errors

**Symptoms**: Error code 42501 or "new row violates row-level security policy"
**Solution**:

1. Run the updated database schema
2. Make sure the user is properly authenticated
3. Check that the user ID matches the profile ID

### Issue 2: Authentication Issues

**Symptoms**: JWT errors or "not authenticated" messages
**Solution**:

1. Clear browser cookies and local storage
2. Log out and log back in
3. Check if the session is expired

### Issue 3: Data Type Mismatches

**Symptoms**: Database constraint errors
**Solution**:

1. The updated code now properly handles data types
2. Make sure all required fields are filled
3. Check that arrays (like support_preferences) are properly formatted

### Issue 4: Network Issues

**Symptoms**: Timeout errors or network failures
**Solution**:

1. Check your internet connection
2. Verify Supabase is accessible
3. Try refreshing the page

## Updated Code Features

The profile edit page now includes:

- ✅ Better error handling with specific error messages
- ✅ Data validation before saving
- ✅ Proper data type conversion
- ✅ Detailed console logging for debugging
- ✅ Improved RLS policies

## Testing the Fix

1. **Fill out the profile form** with all required fields:
   - First Name
   - Last Name
   - Phone Number
   - Role (select from dropdown)

2. **Try saving** and check the console for detailed logs

3. **If it still fails**, the console will show specific error details

## Getting Help

If you're still experiencing issues:

1. Check the browser console for specific error messages
2. Look at the network tab for failed requests
3. Check the Supabase logs in your dashboard
4. Share the specific error message for further assistance

## Database Schema Updates

The updated schema includes:

- Better RLS policies for upsert operations
- Proper data type definitions
- Improved error handling in triggers
