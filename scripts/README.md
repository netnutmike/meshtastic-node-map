# Utility Scripts

This directory contains utility scripts for managing the Meshtastic Node Mapper application.

## Available Scripts

### `fix-frontend-502.sh`

Fixes 502 Bad Gateway errors by rebuilding the frontend container with the production Dockerfile.

**Usage:**
```bash
./scripts/fix-frontend-502.sh
```

**What it does:**
- Stops and removes the frontend container
- Removes old frontend images
- Rebuilds frontend with Dockerfile.prod
- Starts the frontend container
- Verifies it's working correctly
- Restarts nginx to clear cached errors
- Tests connectivity from host

**When to use:**
- Getting 502 Bad Gateway errors
- Frontend container not responding
- After updating frontend code
- Frontend using wrong Dockerfile

**Output:**
- Step-by-step progress messages
- Success/failure indicators
- Diagnostic information if issues occur

---

### `diagnose-frontend.sh`

Comprehensive diagnostic tool for troubleshooting frontend container issues.

**Usage:**
```bash
./scripts/diagnose-frontend.sh
```

**What it checks:**
- Frontend container status
- Frontend container logs
- Processes running inside frontend
- Port 8080 listening status
- Network configuration
- HTTP connectivity tests
- Build directory contents
- Nginx configuration
- Nginx error logs

**When to use:**
- Before running fix-frontend-502.sh
- Investigating 502 errors
- Frontend not accessible
- Debugging deployment issues

**Output:**
- Detailed diagnostic information
- Suggested next steps
- Commands for manual fixes

---

### `quick-install.sh`

One-command installation using pre-built Docker images.

**Usage:**
```bash
./quick-install.sh
```

**What it does:**
- Downloads docker-compose.images.yml
- Creates .env file with generated passwords
- Pulls pre-built Docker images
- Starts all services
- Shows access instructions

**When to use:**
- First-time installation
- Quick deployment
- Production setup
- No build tools available

---

### `build-and-push.sh`

Builds and publishes Docker images to Docker Hub (for maintainers).

**Usage:**
```bash
./build-and-push.sh [version]
```

**What it does:**
- Builds backend and frontend images
- Tags images with version and latest
- Pushes to Docker Hub registry
- Verifies successful push

**When to use:**
- Publishing new releases
- Creating Docker Hub images
- Maintainer deployments only

---

### `deploy-production.sh`

Deploys or updates production environment.

**Usage:**
```bash
./deploy-production.sh
```

**What it does:**
- Checks prerequisites
- Creates/updates .env file
- Builds production images
- Starts services
- Runs health checks
- Shows access information

**When to use:**
- Production deployments
- Building from source
- Custom configurations

---

### `check-disk-space.sh`

Checks available disk space and Docker resource usage.

**Usage:**
```bash
./check-disk-space.sh
```

**What it does:**
- Shows disk space usage
- Shows Docker disk usage
- Identifies large files/directories
- Suggests cleanup commands

**When to use:**
- "No space left on device" errors
- Before major updates
- Regular maintenance
- Performance issues

---

### `clear-nodes.sh`

Clears all nodes and their associated data from the database.

**Usage:**
```bash
./scripts/clear-nodes.sh
```

**What it does:**
- Deletes all nodes from the database
- Deletes all position history
- Deletes all telemetry readings
- Deletes all messages
- Deletes all neighbor relationships

**Safety features:**
- Shows current database statistics before deletion
- Requires three confirmations:
  1. Initial yes/no confirmation
  2. Confirmation with exact node count
  3. Final confirmation by typing "DELETE ALL NODES"
- Checks if PostgreSQL container is running
- Uses database transactions for safe deletion

**When to use:**
- Testing protobuf decoder with fresh data
- Clearing test/seed data
- Starting fresh after configuration changes
- Troubleshooting database issues

**Note:** This action is irreversible. Nodes will be repopulated automatically as new MQTT messages arrive.

---

### `setup.sh`

Initial setup script for the application.

**Usage:**
```bash
./scripts/setup.sh
```

**What it does:**
- Creates necessary directories
- Sets up configuration files
- Initializes the database
- Prepares the application for first run

**When to use:**
- First-time setup
- Development environment
- Local testing

---

## Creating Backups Before Clearing

If you want to backup your data before clearing nodes:

```bash
# Backup the entire database
docker-compose exec -T postgres pg_dump -U meshtastic meshtastic_mapper > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper < backup_20260117_120000.sql
```

## Viewing Database Statistics

To check current database contents without clearing:

```bash
# Node count
docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM nodes;"

# Nodes with details
docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -c \
  'SELECT "nodeId", "shortName", "longName", "lastSeen" FROM nodes ORDER BY "lastSeen" DESC LIMIT 10;'

# Position count
docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM positions;"

# Telemetry count
docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM telemetry_readings;"

# Message count
docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM messages;"
```

## Troubleshooting

### Script won't run
```bash
# Make sure the script is executable
chmod +x scripts/clear-nodes.sh
```

### PostgreSQL container not running
```bash
# Start the application
docker-compose up -d

# Check container status
docker-compose ps
```

### Permission denied
```bash
# Run with sudo if needed (not recommended)
sudo ./scripts/clear-nodes.sh

# Or fix permissions
chmod +x scripts/clear-nodes.sh
```
