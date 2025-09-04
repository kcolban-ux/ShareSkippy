# Remote Supabase Setup

This guide will help you set up your project to use only remote Supabase (no local development setup).

## Prerequisites

1. A Supabase project at [supabase.com](https://supabase.com)
2. Your project's URL and API keys

## Setup Steps

### 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp env.example .env.local
```

Edit `.env.local` with your actual values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-remote-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-remote-service-role-key

# Resend API Key
RESEND_API_KEY=your-resend-api-key

# Environment
NODE_ENV=development

# Optional: Stripe (if you're using payments)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Optional: OpenAI (if you're using AI features)
OPENAI_API_KEY=your-openai-api-key
```

### 2. Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Start Development Server

```bash
npm run dev
```

Your app will now connect directly to your remote Supabase instance.

## Database Schema

Make sure your remote Supabase database has the required tables and policies. You can manage this through the Supabase dashboard or by running SQL commands in the SQL editor.

## Benefits of Remote-Only Setup

- ✅ No local database setup required
- ✅ Consistent environment across development and production
- ✅ Real-time data and authentication
- ✅ Built-in Row Level Security (RLS)
- ✅ Automatic backups and scaling
- ✅ Team collaboration on the same data

## Troubleshooting

If you encounter authentication issues:
1. Check that your environment variables are correct
2. Ensure your Supabase project is active
3. Verify that Row Level Security policies are properly configured
4. Check the browser console for any error messages

