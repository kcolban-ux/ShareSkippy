# Supabase Setup Guide

## Issue
The share-availability page is stuck on "Loading..." because Supabase environment variables are not configured.

## Solution

### 1. Create a `.env.local` file
Create a `.env.local` file in the root directory of your project with the following content:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Get your Supabase credentials
1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project or select an existing one
3. Go to Settings → API
4. Copy the "Project URL" and paste it as the value for `NEXT_PUBLIC_SUPABASE_URL`
5. Copy the "anon public" key and paste it as the value for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Restart your development server
After creating the `.env.local` file, restart your Next.js development server:

```bash
npm run dev
```

### 4. Verify the setup
- Open the browser console (F12)
- Navigate to the share-availability page
- You should see console logs showing the authentication process
- The page should load properly instead of showing "Loading..."

## Example `.env.local` file
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdG5wdmJqY2JqY2JqY2JqY2JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MjQ0NjQ0NDQsImV4cCI6MTk0MDA0MDQ0NH0.your_actual_key_here
```

## Troubleshooting
- Make sure the `.env.local` file is in the root directory (same level as `package.json`)
- Make sure there are no spaces around the `=` sign in the environment variables
- Make sure you've restarted the development server after adding the environment variables
- Check the browser console for any error messages

