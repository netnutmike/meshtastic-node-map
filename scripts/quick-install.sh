#!/bin/bash

# Quick installation script for Meshtastic Node Mapper
# This script downloads only the necessary files and starts the application

set -e

echo "🚀 Meshtastic Node Mapper - Quick Install"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p config/nginx
mkdir -p logs/{backend,nginx,mosquitto}
mkdir -p backups

# Download docker-compose.images.yml if not exists
if [ ! -f "docker-compose.images.yml" ]; then
    echo "📥 Downloading docker-compose.images.yml..."
    curl -fsSL https://raw.githubusercontent.com/your-org/meshtastic-node-mapper/main/docker-compose.images.yml -o docker-compose.images.yml
fi

# Download nginx config if not exists
if [ ! -f "config/nginx/nginx.prod.conf" ]; then
    echo "📥 Downloading nginx configuration..."
    curl -fsSL https://raw.githubusercontent.com/your-org/meshtastic-node-mapper/main/config/nginx/nginx.prod.conf -o config/nginx/nginx.prod.conf
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
# Meshtastic Node Mapper Configuration

# Server Configuration
# Replace YOUR_SERVER_IP with your actual server IP or domain
REACT_APP_API_URL=http://YOUR_SERVER_IP/api
REACT_APP_WS_URL=ws://YOUR_SERVER_IP
FRONTEND_URL=http://YOUR_SERVER_IP

# Security - CHANGE THESE!
# Generate with: openssl rand -base64 32
JWT_SECRET=CHANGE_ME_$(openssl rand -base64 32 2>/dev/null || echo "PLEASE_CHANGE_THIS")
SESSION_SECRET=CHANGE_ME_$(openssl rand -base64 32 2>/dev/null || echo "PLEASE_CHANGE_THIS")

# Database Configuration
POSTGRES_DB=meshtastic_mapper
POSTGRES_USER=meshtastic
POSTGRES_PASSWORD=CHANGE_ME_$(openssl rand -base64 16 2>/dev/null || echo "PLEASE_CHANGE_THIS")

# Redis Configuration
REDIS_PASSWORD=CHANGE_ME_$(openssl rand -base64 16 2>/dev/null || echo "PLEASE_CHANGE_THIS")

# Ports
HTTP_PORT=80
HTTPS_PORT=443
API_PORT=3001

# Docker Image Configuration
DOCKER_REGISTRY=meshtastic
VERSION=latest
EOF

    echo ""
    echo "⚠️  IMPORTANT: Edit the .env file and update:"
    echo "   1. YOUR_SERVER_IP with your actual server IP or domain"
    echo "   2. Review and update the generated passwords if needed"
    echo ""
    echo "   Run: nano .env"
    echo ""
    read -p "Press Enter after you've edited the .env file..."
fi

# Pull the latest images
echo ""
echo "📦 Pulling Docker images..."
docker compose -f docker-compose.images.yml pull

# Start the application
echo ""
echo "🚀 Starting Meshtastic Node Mapper..."
docker compose -f docker-compose.images.yml up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check status
echo ""
echo "📊 Service Status:"
docker compose -f docker-compose.images.yml ps

echo ""
echo "✅ Installation complete!"
echo ""
echo "🌐 Access your application at:"
echo "   http://YOUR_SERVER_IP"
echo ""
echo "📚 Next steps:"
echo "   1. Open the application in your browser"
echo "   2. Click Settings (⚙️) to configure your MQTT connection"
echo "   3. Enter your MQTT broker details"
echo ""
echo "📖 Documentation: https://github.com/your-org/meshtastic-node-mapper/tree/main/docs"
echo ""
echo "🔧 Useful commands:"
echo "   View logs:    docker compose -f docker-compose.images.yml logs -f"
echo "   Stop:         docker compose -f docker-compose.images.yml down"
echo "   Restart:      docker compose -f docker-compose.images.yml restart"
echo "   Update:       docker compose -f docker-compose.images.yml pull && docker compose -f docker-compose.images.yml up -d"
echo ""
