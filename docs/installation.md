# Installation Guide

This guide provides comprehensive instructions for installing and setting up the Meshtastic Node Mapper application.

## Prerequisites

Before installing the Meshtastic Node Mapper, ensure your system meets the following requirements:

### System Requirements
- **Operating System**: Linux (Ubuntu 20.04+, CentOS 8+), macOS 10.15+, or Windows 10+
- **CPU**: Minimum 2 cores, 2.0 GHz (Recommended: 4+ cores, 2.5+ GHz)
- **RAM**: Minimum 4 GB (Recommended: 8+ GB)
- **Storage**: Minimum 20 GB available space (Recommended: 50+ GB SSD)
- **Network**: Stable internet connection for initial setup and updates

### Required Software
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Git**: For cloning the repository

## Installation Methods

### Method 1: Docker Compose (Recommended)

This is the easiest and most reliable installation method.

#### Step 1: Install Docker and Docker Compose

**Ubuntu/Debian:**
```bash
# Update package index
sudo apt update

# Install Docker
sudo apt install -y docker.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, or run:
newgrp docker
```

**CentOS/RHEL:**
```bash
# Install Docker
sudo yum install -y docker docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
```

**macOS:**
```bash
# Install Docker Desktop from https://docker.com/products/docker-desktop
# Or using Homebrew:
brew install --cask docker
```

**Windows:**
- Download and install Docker Desktop from https://docker.com/products/docker-desktop
- Enable WSL2 integration if using Windows Subsystem for Linux

#### Step 2: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-org/meshtastic-node-mapper.git
cd meshtastic-node-mapper

# Make setup script executable (Linux/macOS)
chmod +x scripts/setup.sh
```

#### Step 3: Run the Setup Script

```bash
# Run the automated setup script
./scripts/setup.sh
```

The setup script will:
- Create necessary directories and configuration files
- Generate default configuration with secure passwords
- Initialize the database schema
- Start all services

#### Step 4: Verify Installation

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Test the application
curl http://localhost:3001/health
```

You should see all services running and the health check returning a successful response.

### Method 2: Manual Docker Compose Setup

If you prefer manual setup or need to customize the installation:

#### Step 1: Prepare Configuration

```bash
# Create configuration directories
mkdir -p config/{app,mqtt,database,nginx,redis}
mkdir -p logs/{backend,frontend,nginx,mosquitto}

# Copy example configuration files
cp .env.example .env
cp config/app.yml.example config/app.yml
cp config/mqtt.yml.example config/mqtt.yml
cp config/database.yml.example config/database.yml
```

#### Step 2: Configure Environment Variables

Edit the `.env` file with your specific settings:

```bash
# Database Configuration
POSTGRES_DB=meshtastic_mapper
POSTGRES_USER=meshtastic
POSTGRES_PASSWORD=your_secure_password_here

# Redis Configuration
REDIS_PASSWORD=your_redis_password_here

# MQTT Configuration
MQTT_USERNAME=meshtastic
MQTT_PASSWORD=your_mqtt_password_here

# Application Configuration
JWT_SECRET=your_jwt_secret_here
API_PORT=3001
FRONTEND_PORT=3000

# Network Configuration
NETWORK_NAME=meshtastic-network
```

#### Step 3: Start Services

```bash
# Start all services
docker-compose up -d

# Wait for services to initialize
sleep 30

# Check service health
docker-compose ps
```

#### Step 4: Initialize Database

```bash
# Run database migrations
docker-compose exec backend npm run prisma:deploy

# Seed initial data (optional)
docker-compose exec backend npm run prisma:seed
```

### Method 3: Development Installation

For development purposes, you can run the application without Docker:

#### Prerequisites
- Node.js 18.0 or higher
- PostgreSQL 15 or higher
- Redis 6.0 or higher
- Mosquitto MQTT broker

#### Step 1: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root directory
cd ..
```

#### Step 2: Configure Database

```bash
# Create PostgreSQL database
createdb meshtastic_mapper

# Set database URL
export DATABASE_URL="postgresql://username:password@localhost:5432/meshtastic_mapper"

# Run migrations
cd backend
npm run prisma:migrate
```

#### Step 3: Start Services

```bash
# Start backend (in one terminal)
cd backend
npm run dev

# Start frontend (in another terminal)
cd frontend
npm start

# Start MQTT broker (if not already running)
mosquitto -c config/mosquitto/mosquitto.conf
```

## Post-Installation Configuration

### Step 1: Access the Application

Open your web browser and navigate to:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/v1/docs

### Step 2: Configure MQTT Connection

1. Access the settings panel in the web interface
2. Configure your MQTT broker connection:
   - **Broker URL**: Your Meshtastic MQTT broker address
   - **Username/Password**: MQTT credentials (if required)
   - **Topics**: Meshtastic topic patterns (e.g., `msh/US/2/json/LongFast/!*`)

### Step 3: Set Up Networks

1. Navigate to the Networks section
2. Add your Meshtastic networks:
   - **Network Name**: Descriptive name for your network
   - **MQTT Broker**: Broker connection details
   - **Region**: LoRa region (US, EU_868, etc.)
   - **Channels**: Network channel configuration

### Step 4: Configure Application Settings

Customize the application through the configuration files:

**config/app.yml:**
```yaml
app:
  name: "Your Network Name"
  logo: "/assets/your-logo.png"
  description: "Your network description"

map:
  defaultZoom: 10
  defaultCenter: [40.7128, -74.0060]  # Your default coordinates
  
nodes:
  maxAge: 86400  # 24 hours
  disconnectedAge: 3600  # 1 hour
  offlineAge: 300  # 5 minutes
```

## Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check Docker daemon
sudo systemctl status docker

# Check port conflicts
sudo netstat -tulpn | grep -E ':(3000|3001|5432|6379|1883)'

# Check logs
docker-compose logs [service-name]
```

#### Database Connection Issues
```bash
# Check PostgreSQL container
docker-compose logs postgres

# Test database connection
docker-compose exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT 1;"
```

#### MQTT Connection Problems
```bash
# Check Mosquitto logs
docker-compose logs mosquitto

# Test MQTT connection
mosquitto_pub -h localhost -p 1883 -t test -m "hello"
mosquitto_sub -h localhost -p 1883 -t test
```

#### Frontend Build Issues
```bash
# Clear npm cache
npm cache clean --force

# Rebuild frontend
docker-compose exec frontend npm run build
```

### Performance Optimization

#### For Large Networks (1000+ nodes)
```yaml
# In docker-compose.yml, increase resources:
services:
  postgres:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
  
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

#### Database Optimization
```bash
# Enable TimescaleDB extensions
docker-compose exec postgres psql -U meshtastic -d meshtastic_mapper -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# Create hypertables for time-series data
docker-compose exec backend npm run setup:timescale
```

## Security Considerations

### Production Deployment
1. **Change Default Passwords**: Update all default passwords in `.env`
2. **Enable HTTPS**: Configure SSL certificates in nginx configuration
3. **Firewall Configuration**: Restrict access to necessary ports only
4. **Regular Updates**: Keep Docker images and dependencies updated

### Network Security
```bash
# Create isolated Docker network
docker network create --driver bridge meshtastic-secure

# Use in docker-compose.yml:
networks:
  default:
    external:
      name: meshtastic-secure
```

## Backup and Recovery

### Database Backup
```bash
# Create backup
docker-compose exec postgres pg_dump -U meshtastic meshtastic_mapper > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U meshtastic meshtastic_mapper < backup.sql
```

### Configuration Backup
```bash
# Backup configuration
tar -czf config-backup.tar.gz config/ .env

# Restore configuration
tar -xzf config-backup.tar.gz
```

## Next Steps

After successful installation:
1. Read the [User Guide](user-guide.md) to learn about application features
2. Review the [Configuration Guide](configuration.md) for advanced customization
3. Set up monitoring using the [Monitoring Guide](monitoring.md)
4. For development, see the [Developer Guide](developer-guide.md)

## Support

If you encounter issues during installation:
1. Check the [Troubleshooting](#troubleshooting) section above
2. Review the application logs: `docker-compose logs`
3. Consult the [FAQ](faq.md) for common questions
4. Report issues on the project GitHub repository