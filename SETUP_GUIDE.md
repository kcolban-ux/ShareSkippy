# ShipFast Template Setup Guide

## 🚀 Quick Start

### 1. Environment Setup

1. **Copy the environment template:**

   ```bash
   cp env.example .env.local
   ```

2. **Fill in your environment variables in `.env.local`:**
   - **Supabase**: Get your URL and keys from [supabase.com](https://supabase.com)
   - **Stripe**: Get your keys from [stripe.com](https://stripe.com)
   - **Resend**: Get your API key from [resend.com](https://resend.com)
   - **OpenAI**: Optional - for AI features

### 2. Update Configuration

Edit `config.js` to customize your app:

- Change `appName` to your app name
- Update `appDescription`
- Change `domainName` to your domain
- Update email addresses in the `resend` section
- Customize your pricing plans in the `stripe` section

### 3. Start Development

```bash
npm run dev
```

Your app will be running at `http://localhost:3000`

## 🔧 Optional Services Setup

### Stripe (Payments)

1. Go to [stripe.com](https://stripe.com)
2. Create an account and get your API keys
3. Create products/prices for your plans
4. Update the `priceId` values in `config.js`
5. Set up webhooks for payment processing

### Resend (Email)

1. Go to [resend.com](https://resend.com)
2. Create an account and get your API key
3. Verify your domain for sending emails
4. Update email addresses in `config.js`

## 📁 Project Structure

- `app/` - Next.js app router pages
- `components/` - Reusable React components
- `libs/` - Utility libraries (Supabase, Stripe, etc.)
- `config.js` - Main configuration file
- `middleware.js` - Next.js middleware for auth

## 🎨 Customization

- **Styling**: Uses Tailwind CSS + DaisyUI
- **Themes**: Change theme in `config.js` colors section
- **Components**: All components are in the `components/` folder
- **Pages**: Add new pages in the `app/` directory

## 🚀 Deployment

1. **Vercel** (Recommended):
   - Connect your GitHub repo to Vercel
   - Add environment variables in Vercel dashboard
   - Deploy automatically on push

2. **Other platforms**:
   - Build with `npm run build`
   - Start with `npm start`

## 📞 Support

- Template documentation: [shipfa.st](https://shipfa.st)
- Email support: hello@shipfa.st
