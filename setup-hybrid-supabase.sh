#!/bin/bash

echo "🚀 Setting up Hybrid Supabase with Resend Integration"
echo "=================================================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    echo "   or visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

echo "✅ Supabase CLI found"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local from template..."
    cp env.example .env.local
    echo "✅ .env.local created successfully!"
    echo "⚠️  Please edit .env.local with your actual API keys and configuration."
else
    echo "✅ .env.local already exists"
fi

# Start local Supabase
echo "🔄 Starting local Supabase instance..."
supabase start

if [ $? -eq 0 ]; then
    echo "✅ Local Supabase started successfully!"
    echo ""
    echo "📋 Local Supabase URLs:"
    echo "   API: http://127.0.0.1:54321"
    echo "   Studio: http://127.0.0.1:54323"
    echo "   Database: postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    echo ""
    echo "📧 Email testing server: http://127.0.0.1:54324"
    echo ""
    echo "🔑 Next steps:"
    echo "1. Copy the local anon key from the output above"
    echo "2. Update your .env.local file with the local keys"
    echo "3. Restart your Next.js development server"
    echo ""
    echo "🌐 To switch to remote Supabase:"
    echo "   - Set NODE_ENV=production in .env.local"
    echo "   - Or remove the LOCAL environment variables"
else
    echo "❌ Failed to start local Supabase"
    exit 1
fi
