#!/bin/bash

# AutoPost Development Environment Setup Script

set -e

echo "🚀 Setting up AutoPost development environment..."

# Check for required tools
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "⚠️  PostgreSQL is recommended but not found. Install it or use a cloud database." >&2; }

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Copy environment file if not exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from template..."
    cp .env.example .env.local
    echo "⚠️  Please edit .env.local with your configuration before running the app."
fi

# Generate Prisma client (if using Prisma)
# npx prisma generate

# Push database schema (if DATABASE_URL is set)
if [ -n "$DATABASE_URL" ]; then
    echo "🗄️  Pushing database schema..."
    npm run db:generate
    npm run db:push
else
    echo "⚠️  DATABASE_URL not set. Skipping database setup."
    echo "   Set DATABASE_URL in .env.local and run 'npm run db:push' manually."
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the development server:"
echo "  npm run dev"
echo ""
echo "To run tests:"
echo "  npm test"
echo ""
echo "To build for production:"
echo "  npm run build"
