#!/bin/bash

# Database Setup Script for FlixCam.rent

set -e

echo "🚀 FlixCam.rent Database Setup"
echo "================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ .env file not found. Please create it from .env.example"
  exit 1
fi

# Check if DATABASE_URL is set
if ! grep -q "DATABASE_URL=" .env; then
  echo "❌ DATABASE_URL not found in .env"
  exit 1
fi

echo "📦 Step 1: Generating Prisma Client..."
npx prisma generate

echo ""
echo "🗄️  Step 2: Running database migrations..."
npx prisma migrate dev --name init

echo ""
echo "🌱 Step 3: Seeding database..."
npm run db:seed

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Default admin credentials:"
echo "  Email: admin@flixcam.rent"
echo "  Password: admin123"
echo ""
echo "You can now:"
echo "  - Start the dev server: npm run dev"
echo "  - Open Prisma Studio: npm run db:studio"
