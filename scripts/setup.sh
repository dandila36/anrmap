#!/bin/bash

echo "🎵 Setting up Similar Artists Mapper..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d. -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install && cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Copy environment file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating environment file..."
    cp backend/config.env.example backend/.env
    echo "⚠️  Please edit backend/.env with your Last.fm API credentials"
fi

# Check if Redis is available
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis is running and available"
    else
        echo "⚠️  Redis is installed but not running. Start it with: redis-server"
    fi
else
    echo "⚠️  Redis is not installed. The app will use in-memory cache."
    echo "   Install Redis for better performance: https://redis.io/download"
fi

echo ""
echo "🚀 Setup complete! To start the development servers:"
echo "   npm run dev"
echo ""
echo "🐳 Or use Docker:"
echo "   docker-compose up -d"
echo ""
echo "📖 Visit http://localhost:5173 to use the application"
echo "🔧 API will be available at http://localhost:3001"
echo ""
echo "⚠️  Don't forget to configure your Last.fm API credentials in backend/.env" 