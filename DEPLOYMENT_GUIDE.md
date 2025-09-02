# 🚀 Deployment Guide for shareskippy.com

## Quick Deploy to Vercel (Recommended)

### Step 1: Prepare Your Code
1. Make sure all your changes are committed to GitHub
2. Ensure your `.env.local` has production values (copy from `.env.example`)

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings
5. Add your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `STRIPE_SECRET_KEY` (if using payments)
   - `OPENAI_API_KEY` (if using AI features)
6. Click "Deploy"

### Step 3: Connect Custom Domain
1. In Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add `shareskippy.com`
4. Vercel will provide DNS records

### Step 4: Update Namecheap DNS
In your Namecheap domain management:
- **Type**: `A` | **Name**: `@` | **Value**: `76.76.19.76`
- **Type**: `CNAME` | **Name**: `www` | **Value**: `cname.vercel-dns.com`

## Alternative: Deploy to Netlify

### Step 1: Deploy
1. Go to [netlify.com](https://netlify.com)
2. Connect your GitHub repo
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
4. Add environment variables
5. Deploy

### Step 2: Custom Domain
1. Add custom domain in Netlify
2. Update Namecheap DNS with Netlify's records

## Environment Variables Setup

Create these in your hosting platform:

```bash
# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-remote-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-remote-service-role-key

# Email
RESEND_API_KEY=your-resend-api-key

# Payments (if using)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# AI (if using)
OPENAI_API_KEY=your-openai-api-key
```

## Post-Deployment Checklist

- [ ] Website loads at shareskippy.com
- [ ] All pages work correctly
- [ ] Forms submit properly
- [ ] Database connections work
- [ ] Email functionality works
- [ ] SSL certificate is active (https://)
- [ ] Test on mobile devices
- [ ] Check page load speeds

## Troubleshooting

### Common Issues:
1. **Environment Variables**: Make sure all required vars are set
2. **Build Errors**: Check build logs in Vercel/Netlify
3. **Domain Not Working**: Wait 24-48 hours for DNS propagation
4. **Database Issues**: Verify Supabase connection strings

### Support:
- Vercel: [vercel.com/support](https://vercel.com/support)
- Netlify: [netlify.com/support](https://netlify.com/support)
- Supabase: [supabase.com/support](https://supabase.com/support)

## Cost Estimates

- **Vercel**: Free tier available, Pro plan $20/month
- **Netlify**: Free tier available, Pro plan $19/month
- **Domain**: ~$10-15/year (already purchased)
- **Supabase**: Free tier available, Pro plan $25/month

## Next Steps After Deployment

1. Set up Google Analytics
2. Configure SEO meta tags
3. Set up monitoring (UptimeRobot, etc.)
4. Create backup strategy
5. Set up CI/CD pipeline
