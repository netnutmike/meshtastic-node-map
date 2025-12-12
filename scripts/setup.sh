#!/bin/bash

# Meshtastic Node Mapper Setup Script

set -e

echo "🚀 Setting up Meshtastic Node Mapper..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please review and update the configuration."
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs/backend
mkdir -p logs/frontend
mkdir -p logs/nginx
mkdir -p logs/mosquitto
mkdir -p config/postgres

# Set proper permissions for log directories
chmod 755 logs
chmod 755 logs/*

# Create initial database setup script
cat > config/postgres/init.sql << 'EOF'
-- Initialize Meshtastic Node Mapper Database
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create initial tables will be handled by Prisma migrations
SELECT 'Database initialized successfully' as status;
EOF

echo "🐳 Building Docker containers..."
docker-compose build

echo "🔧 Installing dependencies..."
if [ -d "backend" ]; then
    cd backend
    npm install
    cd ..
fi

if [ -d "frontend" ]; then
    cd frontend
    npm install
    cd ..
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Review and update .env file with your configuration"
echo "2. Start the application: docker-compose up -d"
echo "3. Access the web interface at http://localhost:3000"
echo "4. Check API health at http://localhost:3001/health"
echo ""
echo "For development:"
echo "- Start dev servers: npm run dev"
echo "- Run tests: npm test"
echo "- View logs: docker-compose logs -f"