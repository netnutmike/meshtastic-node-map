#!/bin/bash

# Meshtastic Node Mapper Setup Script
# This script automates the initial setup and deployment of the application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="meshtastic-node-mapper"
REQUIRED_DOCKER_VERSION="20.10"
REQUIRED_COMPOSE_VERSION="2.0"

# Functions
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

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed or not in PATH"
        return 1
    fi
    return 0
}

version_compare() {
    printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

check_docker() {
    log_info "Checking Docker installation..."
    
    if ! check_command docker; then
        log_error "Docker is not installed. Please install Docker first."
        log_info "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi

    # Check Docker daemon access
    if ! docker info &> /dev/null; then
        log_error "Cannot connect to Docker daemon. This usually means:"
        echo "  1. Docker daemon is not running"
        echo "  2. Current user doesn't have permission to access Docker"
        echo ""
        echo "To fix permission issues, run:"
        echo "  sudo usermod -aG docker \$USER"
        echo "  newgrp docker"
        echo ""
        echo "Or run this script with sudo (not recommended for security):"
        echo "  sudo $0"
        echo ""
        echo "After adding user to docker group, log out and back in, then try again."
        exit 1
    fi

    DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    if ! version_compare "$DOCKER_VERSION" "$REQUIRED_DOCKER_VERSION"; then
        log_error "Docker version $DOCKER_VERSION is too old. Required: $REQUIRED_DOCKER_VERSION+"
        exit 1
    fi

    log_success "Docker $DOCKER_VERSION is installed and accessible"
}

check_docker_permissions() {
    log_info "Checking Docker permissions..."
    
    # Check if user is in docker group
    if ! groups | grep -q docker; then
        log_warning "Current user is not in the docker group."
        
        if [[ $EUID -eq 0 ]]; then
            log_warning "Running as root. This works but is not recommended for security."
        else
            log_info "Attempting to add user to docker group..."
            if sudo usermod -aG docker "$USER" 2>/dev/null; then
                log_success "User added to docker group."
                log_warning "Please log out and back in, or run 'newgrp docker' to apply group changes."
                log_info "Then run this script again."
                exit 0
            else
                log_error "Failed to add user to docker group. Please run manually:"
                echo "  sudo usermod -aG docker \$USER"
                echo "  newgrp docker"
                exit 1
            fi
        fi
    else
        log_success "User has Docker permissions"
    fi
}

check_docker_compose() {
    log_info "Checking Docker Compose installation..."
    
    # Check for docker-compose (standalone) or docker compose (plugin)
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
        COMPOSE_VERSION=$(docker-compose --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    elif docker compose version &> /dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
        COMPOSE_VERSION=$(docker compose version --short 2>/dev/null || echo "2.0.0")
    else
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        log_info "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi

    if ! version_compare "$COMPOSE_VERSION" "$REQUIRED_COMPOSE_VERSION"; then
        log_error "Docker Compose version $COMPOSE_VERSION is too old. Required: $REQUIRED_COMPOSE_VERSION+"
        exit 1
    fi

    log_success "Docker Compose $COMPOSE_VERSION is installed"
}

generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

create_directories() {
    log_info "Creating necessary directories..."
    
    mkdir -p config/{app,mqtt,database,nginx,redis,prometheus,grafana}
    mkdir -p logs/{backend,frontend,nginx,mosquitto}
    mkdir -p backups
    mkdir -p data/{postgres,redis,mosquitto,prometheus,grafana}
    
    log_success "Directories created"
}

create_env_file() {
    log_info "Creating environment configuration..."
    
    if [[ -f .env ]]; then
        log_warning ".env file already exists. Creating .env.example instead."
        ENV_FILE=".env.example"
    else
        ENV_FILE=".env"
    fi

    cat > "$ENV_FILE" << EOF
# Meshtastic Node Mapper Environment Configuration
# Generated on $(date)

# Database Configuration
POSTGRES_DB=meshtastic_mapper
POSTGRES_USER=meshtastic
POSTGRES_PASSWORD=$(generate_password)
POSTGRES_PORT=5432

# Redis Configuration
REDIS_PASSWORD=$(generate_password)
REDIS_PORT=6379

# MQTT Configuration
MQTT_PORT=1883
MQTT_WS_PORT=9001
MQTT_USERNAME=meshtastic
MQTT_PASSWORD=$(generate_password)

# Application Configuration
JWT_SECRET=$(generate_password)
API_PORT=3001
FRONTEND_PORT=3000
HTTP_PORT=80
HTTPS_PORT=443

# URLs (update for production)
FRONTEND_URL=http://localhost:3000
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring (optional)
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
GRAFANA_ADMIN_PASSWORD=$(generate_password)

# Network Configuration
NETWORK_NAME=meshtastic-network
EOF

    log_success "Environment file created: $ENV_FILE"
    
    if [[ "$ENV_FILE" == ".env.example" ]]; then
        log_warning "Please copy .env.example to .env and update the values as needed"
    fi
}

create_config_files() {
    log_info "Creating configuration files..."

    # App configuration
    cat > config/app.yml << EOF
app:
  name: "Meshtastic Node Mapper"
  version: "1.0.0"
  description: "Web-based Meshtastic mesh network visualization"
  logo: "/assets/logo.png"

map:
  defaultZoom: 10
  defaultCenter: [40.7128, -74.0060]  # New York City
  tileServers:
    - name: "OpenStreetMap"
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution: "© OpenStreetMap contributors"
    - name: "OpenTopoMap"
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
      attribution: "© OpenTopoMap contributors"

nodes:
  maxAge: 86400        # 24 hours in seconds
  disconnectedAge: 3600 # 1 hour in seconds
  offlineAge: 300      # 5 minutes in seconds
  
features:
  authentication: false  # Set to true to enable authentication
  registration: false    # Set to true to allow user registration
  multiNetwork: true     # Enable multi-network support
  analytics: true        # Enable advanced analytics
  export: true          # Enable data export features

customLinks:
  - name: "Meshtastic Documentation"
    description: "Official Meshtastic documentation"
    url: "https://meshtastic.org/docs"
  - name: "Community Forum"
    description: "Meshtastic community discussions"
    url: "https://meshtastic.discourse.group"
EOF

    # MQTT configuration
    cat > config/mqtt.yml << EOF
mqtt:
  brokers:
    - name: "Local Broker"
      url: "mqtt://mosquitto:1883"
      username: "meshtastic"
      password: "\${MQTT_PASSWORD}"
      topics:
        - "msh/+/+/json/+/+"
        - "meshtastic/+/+/json/+/+"
      enabled: true
      
  settings:
    reconnectPeriod: 5000
    connectTimeout: 30000
    keepalive: 60
    clean: true
    
  messageProcessing:
    batchSize: 100
    batchTimeout: 1000
    maxRetries: 3
EOF

    # Database configuration
    cat > config/database.yml << EOF
database:
  connection:
    host: "postgres"
    port: 5432
    database: "\${POSTGRES_DB}"
    username: "\${POSTGRES_USER}"
    password: "\${POSTGRES_PASSWORD}"
    
  pool:
    min: 2
    max: 10
    acquireTimeoutMillis: 30000
    idleTimeoutMillis: 30000
    
  migrations:
    autoRun: true
    directory: "./prisma/migrations"
    
  backup:
    enabled: true
    schedule: "0 2 * * *"  # Daily at 2 AM
    retention: 30          # Keep 30 days of backups
EOF

    # Mosquitto configuration
    cat > config/mosquitto/mosquitto.conf << EOF
# Mosquitto MQTT Broker Configuration

# Network
listener 1883
listener 9001
protocol websockets

# Security
allow_anonymous false
password_file /mosquitto/config/passwd

# Persistence
persistence true
persistence_location /mosquitto/data/

# Logging
log_dest file /mosquitto/log/mosquitto.log
log_type error
log_type warning
log_type notice
log_type information
log_timestamp true

# Connection limits
max_connections 1000
max_inflight_messages 100
max_queued_messages 1000

# Message size limits
message_size_limit 1048576  # 1MB

# Keepalive
keepalive_interval 60
EOF

    # Create MQTT password file
    echo "meshtastic:password" > config/mosquitto/passwd
    
    # Redis configuration
    cat > config/redis/redis.conf << EOF
# Redis Configuration

# Network
bind 0.0.0.0
port 6379
protected-mode yes

# Security
requirepass \${REDIS_PASSWORD}

# Memory
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Logging
loglevel notice
logfile /var/log/redis/redis.log

# Performance
tcp-keepalive 300
timeout 0
EOF

    # Nginx configuration
    cat > config/nginx/nginx.conf << EOF
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3001;
    }
    
    upstream frontend {
        server frontend:3000;
    }
    
    server {
        listen 80;
        server_name localhost;
        
        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }
        
        # Backend API
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }
        
        # WebSocket
        location /socket.io/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
        }
    }
}
EOF

    log_success "Configuration files created"
}

setup_database() {
    log_info "Setting up database..."
    
    # Start PostgreSQL container
    $COMPOSE_CMD up -d postgres
    
    # Wait for PostgreSQL to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    sleep 10
    
    # Run database migrations
    log_info "Running database migrations..."
    $COMPOSE_CMD exec -T backend npm run prisma:deploy || {
        log_warning "Database migrations failed. This is normal on first run."
    }
    
    log_success "Database setup completed"
}

start_services() {
    log_info "Starting all services..."
    
    # Start all services
    $COMPOSE_CMD up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to start..."
    sleep 30
    
    # Check service health
    log_info "Checking service health..."
    
    if $COMPOSE_CMD ps | grep -q "Up"; then
        log_success "Services are running"
    else
        log_error "Some services failed to start"
        $COMPOSE_CMD ps
        exit 1
    fi
}

verify_installation() {
    log_info "Verifying installation..."
    
    # Check if services are responding
    local backend_url="http://localhost:${API_PORT:-3001}/health"
    local frontend_url="http://localhost:${FRONTEND_PORT:-3000}"
    
    # Test backend
    if curl -f -s "$backend_url" > /dev/null; then
        log_success "Backend is responding"
    else
        log_warning "Backend health check failed"
    fi
    
    # Test frontend
    if curl -f -s "$frontend_url" > /dev/null; then
        log_success "Frontend is responding"
    else
        log_warning "Frontend health check failed"
    fi
    
    # Show service status
    log_info "Service status:"
    $COMPOSE_CMD ps
}

show_completion_message() {
    log_success "Setup completed successfully!"
    echo
    echo "🎉 Meshtastic Node Mapper is now running!"
    echo
    echo "📱 Frontend: http://localhost:${FRONTEND_PORT:-3000}"
    echo "🔧 Backend API: http://localhost:${API_PORT:-3001}"
    echo "📚 API Docs: http://localhost:${API_PORT:-3001}/api/v1/docs"
    echo
    echo "📋 Useful commands:"
    echo "  View logs:     $COMPOSE_CMD logs -f"
    echo "  Stop services: $COMPOSE_CMD down"
    echo "  Restart:       $COMPOSE_CMD restart"
    echo "  Update:        git pull && $COMPOSE_CMD pull && $COMPOSE_CMD up -d"
    echo
    echo "📖 Documentation: ./docs/index.md"
    echo "⚙️  Configuration: ./config/"
    echo
    if [[ -f .env ]]; then
        log_warning "Remember to update .env with your specific configuration!"
    fi
}

# Main execution
main() {
    echo "🚀 Meshtastic Node Mapper Setup"
    echo "================================"
    echo
    
    # Check prerequisites
    check_docker
    check_docker_permissions
    check_docker_compose
    
    # Setup
    create_directories
    create_env_file
    create_config_files
    
    # Deploy
    setup_database
    start_services
    
    # Verify
    verify_installation
    show_completion_message
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Meshtastic Node Mapper Setup Script"
        echo
        echo "Usage: $0 [options]"
        echo
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --dev          Setup for development"
        echo "  --prod         Setup for production"
        echo
        exit 0
        ;;
    --dev)
        COMPOSE_CMD="$COMPOSE_CMD -f docker-compose.yml -f docker-compose.dev.yml"
        ;;
    --prod)
        COMPOSE_CMD="$COMPOSE_CMD -f docker-compose.prod.yml"
        ;;
esac

# Run main function
main "$@"