#!/bin/bash

# Quick Start Script for Meshtastic Node Mapper
# This script provides a fast way to get the application running in development mode

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🚀 Meshtastic Node Mapper - Quick Start"
echo "======================================"
echo

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker permissions
if ! docker ps &> /dev/null; then
    log_error "Cannot access Docker. Please run:"
    echo "  sudo usermod -aG docker \$USER"
    echo "  newgrp docker"
    echo ""
    echo "Or run the permission fix script:"
    echo "  ./scripts/fix-docker-permissions.sh"
    exit 1
fi

# Determine compose command
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    log_error "Docker Compose is not available"
    exit 1
fi

log_info "Using Docker Compose command: $COMPOSE_CMD"

# Stop any existing containers
log_info "Stopping any existing containers..."
$COMPOSE_CMD -f docker-compose.yml -f docker-compose.dev.yml down 2>/dev/null || true

# Start the services
log_info "Starting services in development mode..."
$COMPOSE_CMD -f docker-compose.yml -f docker-compose.dev.yml up -d

# Wait for services to be ready
log_info "Waiting for services to start..."
sleep 15

# Check service status
log_info "Checking service status..."
$COMPOSE_CMD -f docker-compose.yml -f docker-compose.dev.yml ps

echo
log_success "🎉 Meshtastic Node Mapper is starting up!"
echo
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:3001"
echo "📚 API Docs: http://localhost:3001/api/v1/docs"
echo "💾 Database: localhost:5432"
echo "📡 MQTT: localhost:1883"
echo
echo "📋 Useful commands:"
echo "  View logs:     $COMPOSE_CMD -f docker-compose.yml -f docker-compose.dev.yml logs -f"
echo "  Stop services: $COMPOSE_CMD -f docker-compose.yml -f docker-compose.dev.yml down"
echo "  Restart:       $COMPOSE_CMD -f docker-compose.yml -f docker-compose.dev.yml restart"
echo
echo "⏳ Services may take a few minutes to fully initialize..."
echo "   Check the logs if you encounter any issues."