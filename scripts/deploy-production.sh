#!/bin/bash

# Production Deployment Script for Meshtastic Node Mapper
# This script helps deploy the application on port 80

set -e

echo "=========================================="
echo "Meshtastic Node Mapper - Production Deploy"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo ""
    echo "Please create .env file:"
    echo "  1. cp .env.prod.example .env"
    echo "  2. Edit .env and set required values"
    echo ""
    exit 1
fi

# Check if required variables are set
if grep -q "YOUR_SERVER_IP" .env; then
    echo "⚠️  Warning: .env still contains placeholder values!"
    echo ""
    echo "Please edit .env and replace:"
    echo "  - YOUR_SERVER_IP with your actual server IP or domain"
    echo "  - CHANGE_THIS_* with secure passwords"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

# Check if port 80 is available
if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Warning: Port 80 is already in use!"
    echo ""
    lsof -Pi :80 -sTCP:LISTEN
    echo ""
    read -p "Stop existing service and continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Tip: You can change HTTP_PORT in .env to use a different port"
        exit 1
    fi
fi

# Stop development containers if running
echo "🛑 Stopping development containers..."
docker compose down 2>/dev/null || true

# Create required directories
echo "📁 Creating required directories..."
mkdir -p logs/backend logs/nginx logs/mosquitto
mkdir -p config/nginx/ssl
mkdir -p backups

# Build and start production containers
echo "🚀 Building and starting production containers..."
docker compose -f docker-compose.prod.yml up -d --build

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check container status
echo ""
echo "📊 Container Status:"
docker compose -f docker-compose.prod.yml ps

# Check if nginx is healthy
echo ""
echo "🔍 Checking nginx health..."
if docker exec meshtastic-nginx-prod curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ Nginx is healthy!"
else
    echo "⚠️  Nginx health check failed"
    echo "Check logs: docker logs meshtastic-nginx-prod"
fi

# Check if backend is healthy
echo ""
echo "🔍 Checking backend health..."
if docker exec meshtastic-backend-prod curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy!"
else
    echo "⚠️  Backend health check failed"
    echo "Check logs: docker logs meshtastic-backend-prod"
fi

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Access your application at:"
echo "  🌐 http://$SERVER_IP"
echo "  🌐 http://localhost (if on same machine)"
echo ""
echo "Useful commands:"
echo "  View logs:    docker compose -f docker-compose.prod.yml logs -f"
echo "  Stop:         docker compose -f docker-compose.prod.yml down"
echo "  Restart:      docker compose -f docker-compose.prod.yml restart"
echo ""
echo "For troubleshooting, see: docs/production-deployment.md"
echo ""
