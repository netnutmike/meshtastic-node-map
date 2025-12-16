# Troubleshooting Guide

## Docker Permission Issues

### Problem: "permission denied while trying to connect to the Docker daemon socket"

This is a common issue on Linux systems where the current user doesn't have permission to access Docker.

### Solutions:

#### Option 1: Add user to docker group (Recommended)
```bash
# Add current user to docker group
sudo usermod -aG docker $USER

# Apply the group changes (choose one):
# Option A: Log out and back in
# Option B: Use newgrp command
newgrp docker

# Verify it works
docker ps
```

#### Option 2: Run with sudo (Not recommended for security)
```bash
sudo ./scripts/setup.sh
```

#### Option 3: Start Docker daemon if not running
```bash
# On systemd systems (Ubuntu, Debian, CentOS 7+)
sudo systemctl start docker
sudo systemctl enable docker

# On older systems
sudo service docker start
```

## Docker Compose Version Issues

### Problem: "version is obsolete" warning

This warning appears with newer versions of Docker Compose. It's safe to ignore, but you can fix it by:

1. The setup script automatically removes the version field
2. Or manually edit `docker-compose.yml` and remove the `version: '3.8'` line

### Problem: Docker Compose not found

#### Install Docker Compose Plugin (Recommended)
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker-compose-plugin

# CentOS/RHEL
sudo yum install docker-compose-plugin
```

#### Install Docker Compose Standalone
```bash
# Download latest version
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

## Build Issues

### Problem: Backend build fails with "npm run build" exit code 127

This happens when TypeScript is not available during the Docker build process.

#### Solution:
The issue has been fixed in the updated Dockerfile. If you're still seeing this:

```bash
# Clean rebuild
docker-compose down --rmi all
docker-compose up --build -d

# Or use the quick start script
./scripts/quick-start.sh
```

### Problem: Frontend build issues

```bash
# Clear npm cache and rebuild
docker-compose down
docker system prune -f
./scripts/quick-start.sh
```

## Service Startup Issues

### Problem: Services fail to start

#### Check service logs
```bash
# View all service logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs postgres
docker-compose logs mosquitto
```

#### Common fixes
```bash
# Restart all services
docker-compose restart

# Rebuild and restart
docker-compose down
docker-compose up --build -d

# Clean restart (removes volumes - BE CAREFUL)
docker-compose down -v
docker-compose up -d
```

### Problem: Port conflicts

If you get "port already in use" errors:

```bash
# Check what's using the port
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :3001
sudo netstat -tulpn | grep :5432

# Stop conflicting services or change ports in docker-compose.yml
```

## Database Issues

### Problem: Database connection failed

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Connect to database manually
docker-compose exec postgres psql -U meshtastic -d meshtastic_mapper
```

### Problem: Database migrations fail

```bash
# Run migrations manually
docker-compose exec backend npm run prisma:deploy

# Reset database (BE CAREFUL - loses all data)
docker-compose exec backend npm run prisma:reset
```

## Network Issues

### Problem: Services can't communicate

```bash
# Check Docker networks
docker network ls

# Inspect the application network
docker network inspect meshtastic-node-map_meshtastic-network

# Restart networking
docker-compose down
docker-compose up -d
```

## Performance Issues

### Problem: High memory usage

```bash
# Check resource usage
docker stats

# Limit memory usage in docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
```

### Problem: Slow startup

```bash
# Check if all dependencies are ready
docker-compose ps

# Increase health check timeouts in docker-compose.yml
healthcheck:
  interval: 30s
  timeout: 10s
  retries: 10
```

## Getting Help

### Collect system information
```bash
# System info
uname -a
docker --version
docker-compose --version

# Service status
docker-compose ps
docker-compose logs --tail=50

# Resource usage
docker stats --no-stream
df -h
free -h
```

### Common commands for debugging
```bash
# Enter a running container
docker-compose exec backend bash
docker-compose exec postgres bash

# Check container processes
docker-compose top

# View real-time logs
docker-compose logs -f backend

# Restart specific service
docker-compose restart backend
```

### Reset everything (nuclear option)
```bash
# Stop and remove everything
docker-compose down -v --remove-orphans

# Remove all images
docker-compose down --rmi all

# Clean Docker system
docker system prune -a

# Start fresh
./scripts/setup.sh
```

## Contact Support

If you're still having issues:

1. Check the [GitHub Issues](https://github.com/your-repo/meshtastic-node-mapper/issues)
2. Create a new issue with:
   - Your operating system and version
   - Docker and Docker Compose versions
   - Complete error messages
   - Output of `docker-compose logs`
   - Steps to reproduce the problem

## Useful Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Meshtastic Documentation](https://meshtastic.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MQTT Documentation](https://mqtt.org/)