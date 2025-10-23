# ShareSkippy 🐕

A community-based dog sharing platform that connects dog lovers with dog owners for free, collaborative dog care experiences.

## About

ShareSkippy makes it easy for dog owners to find trusted community members who can help with dog walking, sitting, and care. Whether you need help when you're busy, traveling, or just want your dog to have more social time, ShareSkippy connects you with caring neighbors in your area.

## Features

- 🐾 **Community Matching** - Find dog lovers in your neighborhood
- 📍 **Location-Based** - Connect with people nearby
- 🔒 **Trust & Safety** - Verified profiles and community ratings
- 💚 **Free & Community-Driven** - No fees, just neighbors helping neighbors
- 📱 **Easy to Use** - Simple interface for finding and offering help

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Deployment**: Vercel
- **Styling**: DaisyUI, Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 20.x
- Git
- A code editor (we recommend VS Code)
- [Taskfile](https://taskfile.dev/docs/installation)
- Fork of the main repository

### Local Development Setup

1. **Clone the forked repository**

   `git clone https://github.com/YOUR_USERNAME/ShareSkippy.git`

   `cd ShareSkippy`

2. **Install dependencies**

   `task dev`

   Enter 'n' for Supabase's init questions when prompted

3. **Optional: Add Resend API Key**

   For integration testing with Resend, add your API key to your .env.local file from [resend.com](https://resend.com).

4. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

### Verify Setup

Run these commands to ensure everything is working:

```bash
npm run validate  # Runs all checks: formatting, linting, type checking, tests
```

## Development environment

- Node: 20.x (see `.nvmrc`)
- Package manager: npm (see `packageManager` in `package.json`)

## Environment Variables

Create a `.env.local` file with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Contributing

This is a community-driven project. We welcome contributions!

## License

MIT License
