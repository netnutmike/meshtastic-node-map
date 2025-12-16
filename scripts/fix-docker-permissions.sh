#!/bin/bash

# Docker Permission Fix Script
# This script helps resolve common Docker permission issues on Linux systems

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

check_docker_installed() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    log_success "Docker is installed"
}

check_docker_running() {
    if ! systemctl is-active --quiet docker 2>/dev/null; then
        log_warning "Docker service is not running. Attempting to start..."
        if sudo systemctl start docker; then
            log_success "Docker service started"
        else
            log_error "Failed to start Docker service"
            exit 1
        fi
    else
        log_success "Docker service is running"
    fi
}

check_user_in_docker_group() {
    if groups "$USER" | grep -q docker; then
        log_success "User $USER is already in the docker group"
        return 0
    else
        log_warning "User $USER is not in the docker group"
        return 1
    fi
}

add_user_to_docker_group() {
    log_info "Adding user $USER to the docker group..."
    
    if sudo usermod -aG docker "$USER"; then
        log_success "User $USER added to docker group"
        return 0
    else
        log_error "Failed to add user to docker group"
        return 1
    fi
}

test_docker_access() {
    log_info "Testing Docker access..."
    
    if docker ps &> /dev/null; then
        log_success "Docker access test passed"
        return 0
    else
        log_warning "Docker access test failed"
        return 1
    fi
}

main() {
    echo "🔧 Docker Permission Fix Script"
    echo "==============================="
    echo

    # Check if Docker is installed
    check_docker_installed

    # Check if Docker service is running
    check_docker_running

    # Check if user is in docker group
    if ! check_user_in_docker_group; then
        # Add user to docker group
        if add_user_to_docker_group; then
            log_warning "Group membership updated. You need to:"
            echo "  1. Log out and back in, OR"
            echo "  2. Run: newgrp docker"
            echo "  3. Then test with: docker ps"
            echo
            log_info "Attempting to apply group changes with newgrp..."
            
            # Try to apply group changes immediately
            if newgrp docker <<< "docker ps" &> /dev/null; then
                log_success "Group changes applied successfully!"
            else
                log_warning "Could not apply group changes automatically."
                log_info "Please log out and back in, then run: docker ps"
            fi
        else
            exit 1
        fi
    fi

    # Test Docker access
    if test_docker_access; then
        echo
        log_success "✅ Docker permissions are working correctly!"
        echo
        echo "You can now run:"
        echo "  ./scripts/setup.sh"
        echo
    else
        echo
        log_warning "⚠️  Docker permissions still need attention."
        echo
        echo "Please try:"
        echo "  1. Log out and back in"
        echo "  2. Or run: newgrp docker"
        echo "  3. Then test: docker ps"
        echo
        echo "If problems persist, check the troubleshooting guide:"
        echo "  docs/troubleshooting.md"
    fi
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    log_warning "Running as root. This script should be run as a regular user."
    log_info "The script will use sudo when needed."
fi

main "$@"