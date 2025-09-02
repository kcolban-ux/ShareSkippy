# Hybrid Supabase Setup with Resend Integration

This guide will help you set up a hybrid Supabase configuration that can switch between local development and remote production instances, with Resend email integration.

## 🚀 Quick Start

1. **Run the setup script:**
   ```bash
   ./setup-hybrid-supabase.sh
   ```

2. **Edit your `.env.local` file** with the actual keys from the output above

3. **Restart your Next.js development server**

## 📋 What This Setup Provides

### ✅ Hybrid Supabase Configuration
- **Local Development**: Uses local Supabase instance on ports 54321-54329
- **Production**: Automatically switches to remote Supabase when needed
- **Seamless Switching**: Based on environment variables and NODE_ENV

### ✅ Resend Email Integration
- **API Key**: Already configured with your provided key
- **Email Templates**: Configured for ShareSkippy branding
- **Local Testing**: Email testing server available at http://127.0.0.1:54324

### ✅ Environment Management
- **Automatic Detection**: Chooses local vs remote based on available keys
- **Fallback Logic**: Gracefully handles missing configurations
- **Development vs Production**: Clear separation of concerns

## 🔧 Configuration Details

### Environment Variables

Your `.env.local` should contain:

```bash
# Remote Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-remote-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-remote-service-role-key

# Local Supabase (Development)
NEXT_PUBLIC_SUPABASE_URL_LOCAL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY_LOCAL=your-local-service-role-key

# Resend API Key
RESEND_API_KEY=re_AuQVihWo_Cikh9YuJ31VkrHxTnfemwVgd

# Environment
NODE_ENV=development
```

### How It Works

1. **Development Mode** (`NODE_ENV=development`):
   - If local Supabase keys are available → Uses local instance
   - If only remote keys are available → Uses remote instance
   - Logs which instance is being used

2. **Production Mode** (`NODE_ENV=production`):
   - Always uses remote Supabase instance
   - Ignores local configuration

## 🛠️ Manual Setup (Alternative)

If you prefer to set up manually:

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Start Local Supabase
```bash
supabase start
```

### 3. Copy Local Keys
From the output, copy:
- `anon key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL`
- `service_role key` → `SUPABASE_SERVICE_ROLE_KEY_LOCAL`

### 4. Create Environment File
```bash
cp env.example .env.local
# Edit with your actual keys
```

## 🔄 Switching Between Instances

### To Use Local Supabase:
```bash
# Ensure these are set in .env.local:
NODE_ENV=development
NEXT_PUBLIC_SUPABASE_URL_LOCAL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL=your-local-key
```

### To Use Remote Supabase:
```bash
# Either:
NODE_ENV=production
# OR remove the LOCAL environment variables
```

## 📧 Resend Email Testing

### Local Development
- Emails are captured by the local email testing server
- View them at: http://127.0.0.1:54324
- No actual emails are sent during development

### Production
- Emails are sent via Resend's actual service
- Uses your configured API key: `re_AuQVihWo_Cikh9YuJ31VkrHxTnfemwVgd`

## 🚨 Troubleshooting

### Common Issues

1. **"Supabase configuration is missing"**
   - Check your `.env.local` file exists
   - Ensure at least one set of Supabase keys is configured

2. **Local Supabase won't start**
   - Check if ports 54321-54329 are available
   - Try `supabase stop` then `supabase start`

3. **Resend emails not working**
   - Verify `RESEND_API_KEY` is set correctly
   - Check Resend dashboard for any errors

### Useful Commands

```bash
# Stop local Supabase
supabase stop

# Reset local database
supabase db reset

# View local Supabase status
supabase status

# View logs
supabase logs
```

## 🔗 Useful Links

- **Local Supabase Studio**: http://127.0.0.1:54323
- **Local API**: http://127.0.0.1:54321
- **Local Database**: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- **Email Testing**: http://127.0.0.1:54324

## 📝 Next Steps

1. **Test the setup** by creating a test user
2. **Verify email functionality** by testing the signup flow
3. **Check database connectivity** in both local and remote modes
4. **Deploy with confidence** knowing your production setup is separate

---

**Need help?** Check the console logs to see which Supabase instance is being used, and ensure your environment variables are correctly configured.
