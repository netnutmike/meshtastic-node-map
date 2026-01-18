#!/bin/bash

# Disk Space Diagnostic Script
# Helps identify and resolve disk space issues

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

echo "🔍 Disk Space Diagnostic Tool"
echo "=============================="
echo

# Check overall disk space
log_info "Checking overall disk space..."
df -h | grep -E "Filesystem|/$|/home"
echo

# Check Docker disk usage
log_info "Checking Docker disk usage..."
if command -v docker &> /dev/null; then
    docker system df
    echo
    
    # Get detailed breakdown
    log_info "Docker disk usage breakdown:"
    echo "Images:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | head -10
    echo
    
    echo "Containers:"
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
    echo
    
    echo "Volumes:"
    docker volume ls
    echo
else
    log_error "Docker is not installed or not accessible"
fi

# Check available space
AVAILABLE=$(df / | tail -1 | awk '{print $4}')
AVAILABLE_GB=$((AVAILABLE / 1024 / 1024))

echo
if [ $AVAILABLE_GB -lt 5 ]; then
    log_error "Critical: Less than 5GB available ($AVAILABLE_GB GB)"
    echo
    echo "Recommended actions:"
    echo "  1. Clean Docker resources: docker system prune -a --volumes"
    echo "  2. Clean package cache: sudo apt clean (Ubuntu/Debian)"
    echo "  3. Remove old logs: sudo journalctl --vacuum-time=3d"
    echo "  4. Find large files: du -sh ~/* | sort -h | tail -20"
elif [ $AVAILABLE_GB -lt 10 ]; then
    log_warning "Warning: Less than 10GB available ($AVAILABLE_GB GB)"
    echo "Consider cleaning up Docker resources"
else
    log_success "Disk space looks good: ${AVAILABLE_GB}GB available"
fi

echo
log_info "Would you like to clean up Docker resources? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    log_info "Stopping all containers..."
    docker compose down 2>/dev/null || true
    
    log_info "Cleaning up Docker resources..."
    docker system prune -a --volumes -f
    
    log_success "Cleanup complete!"
    echo
    log_info "New disk usage:"
    df -h | grep -E "Filesystem|/$|/home"
    echo
    docker system df
fi

echo
log_info "Diagnostic complete!"