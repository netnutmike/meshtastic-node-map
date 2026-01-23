# Utility Scripts

This directory contains utility scripts for managing, deploying, and troubleshooting the Meshtastic Node Mapper application.

## Quick Reference

| Script | Purpose | Use Case |
|--------|---------|----------|
| `quick-install.sh` | One-command installation | First-time setup with pre-built images |
| `quick-start.sh` | Quick development start | Start development environment |
| `setup.sh` | Initial setup | Development environment setup |
| `deploy-production.sh` | Production deployment | Deploy to production server |
| `build-and-push.sh` | Build & publish images | Maintainers: publish to Docker Hub |
| `debug-lockup.sh` | Debug service lockups | Capture diagnostics when services freeze |
| `monitor-health.sh` | Continuous monitoring | Monitor service health in real-time |

## Installation & Setup Scripts

### `quick-install.sh`
One-command installation using pre-built Docker images from Docker Hub.

**Usage:**
```bash
./scripts/quick-install.sh
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
- Production setup without building
- No build tools available

---

### `quick-start.sh`
Quick start for development environment.

**Usage:**
```bash
./scripts/quick-start.sh
```

**What it does:**
- Checks prerequisites
- Starts Docker containers
- Initializes database if needed
- Shows service status

**When to use:**
- Starting development work
- Quick testing
- After pulling code updates

---

### `setup.sh`
Comprehensive initial setup script for development.

**Usage:**
```bash
./scripts/setup.sh
```

**What it does:**
- Creates necessary directories
- Sets up configuration files
- Initializes environment variables
- Prepares database
- Configures MQTT broker
- Sets up nginx

**When to use:**
- First-time development setup
- After cloning repository
- Resetting development environment

---

## Deployment Scripts

### `deploy-production.sh`
Deploy or update production environment.

**Usage:**
```bash
./scripts/deploy-production.sh
```

**What it does:**
- Checks prerequisites
- Creates/updates .env file
- Builds production images
- Starts services with production config
- Runs health checks
- Shows access information

**When to use:**
- Production deployments
- Building from source
- Custom configurations
- Server updates

---

### `build-and-push.sh`
Build and publish Docker images to Docker Hub (maintainers only).

**Usage:**
```bash
./scripts/build-and-push.sh [version]
```

**Arguments:**
- `version` - Version tag (e.g., 1.0.0, latest)

**What it does:**
- Builds backend and frontend images
- Tags images with version and latest
- Pushes to Docker Hub registry
- Verifies successful push

**When to use:**
- Publishing new releases
- Creating Docker Hub images
- Maintainer deployments only

**Requirements:**
- Docker Hub account
- Push permissions to repository

---

### `rebuild-frontend-for-domain.sh`
Rebuild frontend with custom domain configuration.

**Usage:**
```bash
./scripts/rebuild-frontend-for-domain.sh
```

**What it does:**
- Rebuilds frontend with domain-specific settings
- Updates API URLs
- Restarts frontend container

**When to use:**
- Changing domain name
- Updating API endpoints
- Custom deployment URLs

---

## Monitoring & Debugging Scripts

### `debug-lockup.sh`
Capture comprehensive diagnostics when services freeze or lock up.

**Usage:**
```bash
./scripts/debug-lockup.sh
```

**What it captures:**
- Container status and resource usage
- Service logs (last 500 lines)
- Database connection pool status
- Active database queries
- MQTT connection status
- Memory and CPU usage
- Network connections
- Process information

**Output:**
- Creates timestamped file: `lockup-debug-YYYYMMDD-HHMMSS.txt`

**When to use:**
- Services not responding
- High CPU/memory usage
- Database connection issues
- MQTT connection problems
- Performance degradation

---

### `monitor-health.sh`
Continuous real-time monitoring of service health.

**Usage:**
```bash
./scripts/monitor-health.sh
```

**What it monitors:**
- Container status
- CPU and memory usage
- Database connections
- MQTT connection status
- HTTP endpoint health
- Updates every 5 seconds

**When to use:**
- Monitoring production systems
- Debugging intermittent issues
- Performance testing
- Capacity planning

**Stop monitoring:** Press Ctrl+C

---

### `quick-diagnostic.sh`
Quick health check of all services.

**Usage:**
```bash
./scripts/quick-diagnostic.sh
```

**What it checks:**
- Container status
- Service connectivity
- Basic health endpoints

**When to use:**
- Quick status check
- Before detailed diagnostics
- Automated health checks

---

## Database Scripts

### `init-database.sh`
Initialize development database.

**Usage:**
```bash
./scripts/init-database.sh
```

**What it does:**
- Creates database schema
- Runs Prisma migrations
- Seeds initial data
- Sets up TimescaleDB extensions

**When to use:**
- First-time setup
- After database reset
- Schema updates

---

### `init-database-prod.sh`
Initialize production database with security hardening.

**Usage:**
```bash
./scripts/init-database-prod.sh
```

**What it does:**
- Creates production database
- Runs migrations
- Sets up TimescaleDB
- Configures production security settings

**When to use:**
- Production database setup
- Production migrations
- Secure deployments

---

### `clear-nodes.sh`
Clear all nodes and associated data from database.

**Usage:**
```bash
./scripts/clear-nodes.sh
```

**What it does:**
- Deletes all nodes
- Deletes position history
- Deletes telemetry readings
- Deletes messages
- Deletes neighbor relationships

**Safety features:**
- Shows current statistics
- Requires three confirmations
- Uses database transactions

**When to use:**
- Testing with fresh data
- Clearing test data
- Starting fresh after config changes

**Note:** Irreversible! Nodes repopulate from MQTT.

---

### `emergency-db-fix.sh`
Emergency database repair and recovery.

**Usage:**
```bash
./scripts/emergency-db-fix.sh
```

**What it does:**
- Attempts to repair database issues
- Fixes schema problems
- Recovers from corruption
- Rebuilds indexes

**When to use:**
- Database corruption
- Schema mismatch errors
- Migration failures
- Emergency recovery

---

### `force-schema-creation.sh`
Force database schema creation/recreation.

**Usage:**
```bash
./scripts/force-schema-creation.sh
```

**What it does:**
- Drops existing schema
- Recreates from scratch
- Runs all migrations

**When to use:**
- Schema completely broken
- Clean slate needed
- Development reset

**Warning:** Destroys all data!

---

## Diagnostic Scripts

### `diagnose-frontend.sh`
Comprehensive frontend diagnostics.

**Usage:**
```bash
./scripts/diagnose-frontend.sh
```

**What it checks:**
- Container status and logs
- Running processes
- Port 8080 listening
- Network configuration
- HTTP connectivity
- Build directory
- Nginx configuration

**When to use:**
- Frontend not accessible
- 502 errors
- Build issues
- Deployment problems

---

### `diagnose-backend-build.sh`
Diagnose backend build issues.

**Usage:**
```bash
./scripts/diagnose-backend-build.sh
```

**What it checks:**
- Build process
- Dependencies
- TypeScript compilation
- Prisma client generation

**When to use:**
- Backend won't build
- Dependency errors
- TypeScript errors

---

### `diagnose-502.sh` / `diagnose-502-error.sh` / `diagnose-502-issue.sh`
Diagnose 502 Bad Gateway errors (multiple versions for different scenarios).

**Usage:**
```bash
./scripts/diagnose-502.sh
```

**What it checks:**
- Nginx configuration
- Backend connectivity
- Frontend connectivity
- Container health
- Network issues

**When to use:**
- Getting 502 errors
- Gateway problems
- Proxy issues

---

### `diagnose-connection-leak.sh`
Diagnose database connection leaks.

**Usage:**
```bash
./scripts/diagnose-connection-leak.sh
```

**What it checks:**
- Active database connections
- Connection pool status
- Long-running queries
- Connection leaks

**When to use:**
- "Too many connections" errors
- Database performance issues
- Connection pool exhausted

---

### `diagnose-migrations.sh` / `diagnose-prisma-migrations.sh`
Diagnose database migration issues.

**Usage:**
```bash
./scripts/diagnose-migrations.sh
```

**What it checks:**
- Migration status
- Schema state
- Prisma client status
- Migration history

**When to use:**
- Migration failures
- Schema mismatch
- Prisma errors

---

### `diagnose-production-mqtt.sh`
Diagnose MQTT connection issues in production.

**Usage:**
```bash
./scripts/diagnose-production-mqtt.sh
```

**What it checks:**
- MQTT broker connectivity
- Authentication
- Topic subscriptions
- Message flow

**When to use:**
- No data coming in
- MQTT connection errors
- Production MQTT issues

---

## Fix Scripts

### `fix-frontend-502.sh`
Fix 502 Bad Gateway errors for frontend.

**Usage:**
```bash
./scripts/fix-frontend-502.sh
```

**What it does:**
- Stops frontend container
- Removes old images
- Rebuilds with production Dockerfile
- Restarts services
- Verifies connectivity

**When to use:**
- 502 errors on frontend
- Frontend not responding
- After frontend updates

---

### `fix-frontend-urls.sh`
Fix frontend API URL configuration.

**Usage:**
```bash
./scripts/fix-frontend-urls.sh
```

**What it does:**
- Updates API URLs in frontend
- Rebuilds frontend
- Restarts container

**When to use:**
- API URL errors
- Wrong backend endpoint
- Domain changes

---

### `fix-backend-openssl.sh`
Fix OpenSSL compatibility issues in backend.

**Usage:**
```bash
./scripts/fix-backend-openssl.sh
```

**What it does:**
- Updates OpenSSL configuration
- Fixes legacy provider issues
- Rebuilds backend

**When to use:**
- OpenSSL errors
- Crypto errors
- Node.js compatibility issues

---

### `fix-connection-pool.sh`
Fix database connection pool issues.

**Usage:**
```bash
./scripts/fix-connection-pool.sh
```

**What it does:**
- Resets connection pool
- Kills stuck connections
- Restarts services

**When to use:**
- Connection pool exhausted
- Stuck connections
- Database performance issues

---

### `fix-database-schema.sh`
Fix database schema issues.

**Usage:**
```bash
./scripts/fix-database-schema.sh
```

**What it does:**
- Repairs schema problems
- Runs migrations
- Fixes inconsistencies

**When to use:**
- Schema errors
- Migration issues
- Database structure problems

---

### `fix-docker-permissions.sh`
Fix Docker file permission issues.

**Usage:**
```bash
./scripts/fix-docker-permissions.sh
```

**What it does:**
- Fixes file ownership
- Sets correct permissions
- Resolves permission errors

**When to use:**
- Permission denied errors
- File ownership issues
- Docker volume problems

---

### `fix-mqtt-connection.sh` / `fix-production-mqtt-connection.sh`
Fix MQTT connection issues.

**Usage:**
```bash
./scripts/fix-mqtt-connection.sh
```

**What it does:**
- Restarts MQTT broker
- Resets connections
- Verifies connectivity

**When to use:**
- MQTT not connecting
- No messages received
- Broker issues

---

### `fix-position-validation.sh`
Fix position data validation issues.

**Usage:**
```bash
./scripts/fix-position-validation.sh
```

**What it does:**
- Fixes position validation logic
- Cleans invalid position data
- Updates validation rules

**When to use:**
- Position validation errors
- Invalid coordinates
- GPS data issues

---

### `fix-topology-navigation.sh`
Fix network topology navigation issues.

**Usage:**
```bash
./scripts/fix-topology-navigation.sh
```

**What it does:**
- Fixes topology graph rendering
- Repairs navigation issues
- Updates graph data

**When to use:**
- Topology graph not working
- Navigation errors
- Graph display issues

---

### `fix-websocket-connection.sh`
Fix WebSocket connection issues.

**Usage:**
```bash
./scripts/fix-websocket-connection.sh
```

**What it does:**
- Restarts WebSocket server
- Resets connections
- Verifies connectivity

**When to use:**
- Real-time updates not working
- WebSocket errors
- Connection drops

---

### `deploy-mqtt-race-condition-fix.sh`
Deploy fix for MQTT race condition issues.

**Usage:**
```bash
./scripts/deploy-mqtt-race-condition-fix.sh
```

**What it does:**
- Applies race condition fixes
- Updates MQTT handling
- Restarts services

**When to use:**
- Duplicate messages
- Race condition errors
- MQTT timing issues

---

## Maintenance Scripts

### `check-disk-space.sh`
Check disk space and Docker resource usage.

**Usage:**
```bash
./scripts/check-disk-space.sh
```

**What it shows:**
- Disk space usage
- Docker disk usage
- Large files/directories
- Cleanup suggestions

**When to use:**
- "No space left" errors
- Before major updates
- Regular maintenance
- Performance issues

---

### `cleanup-disk-space.sh`
Clean up disk space used by Docker.

**Usage:**
```bash
./scripts/cleanup-disk-space.sh
```

**What it does:**
- Removes unused containers
- Removes unused images
- Removes unused volumes
- Prunes build cache

**When to use:**
- Low disk space
- After multiple builds
- Regular maintenance

**Warning:** May remove data!

---

### `restart-nginx.sh`
Restart nginx proxy server.

**Usage:**
```bash
./scripts/restart-nginx.sh
```

**What it does:**
- Restarts nginx container
- Reloads configuration
- Clears cached errors

**When to use:**
- After nginx config changes
- Clearing cached 502 errors
- Proxy issues

---

### `apply-typescript-fix.sh`
Apply TypeScript compatibility fixes.

**Usage:**
```bash
./scripts/apply-typescript-fix.sh
```

**What it does:**
- Applies TypeScript patches
- Fixes type errors
- Updates dependencies

**When to use:**
- TypeScript errors
- Type compatibility issues
- After dependency updates

---

### `test-encryption-key.sh`
Test encryption key configuration.

**Usage:**
```bash
./scripts/test-encryption-key.sh
```

**What it does:**
- Tests encryption keys
- Verifies decryption
- Validates key format

**When to use:**
- Setting up encryption
- Debugging decryption issues
- Key validation

---

## Common Workflows

### First-Time Setup
```bash
# Quick installation with pre-built images
./scripts/quick-install.sh

# OR build from source
./scripts/setup.sh
./scripts/quick-start.sh
```

### Production Deployment
```bash
# Deploy to production
./scripts/deploy-production.sh

# Monitor health
./scripts/monitor-health.sh
```

### Troubleshooting 502 Errors
```bash
# Diagnose the issue
./scripts/diagnose-502.sh

# Fix frontend
./scripts/fix-frontend-502.sh

# Restart nginx
./scripts/restart-nginx.sh
```

### Debugging Service Lockups
```bash
# Capture diagnostics
./scripts/debug-lockup.sh

# Monitor in real-time
./scripts/monitor-health.sh

# Check database connections
./scripts/diagnose-connection-leak.sh
```

### Database Maintenance
```bash
# Check disk space
./scripts/check-disk-space.sh

# Clear old data
./scripts/clear-nodes.sh

# Fix schema issues
./scripts/fix-database-schema.sh
```

### MQTT Issues
```bash
# Diagnose MQTT
./scripts/diagnose-production-mqtt.sh

# Fix connection
./scripts/fix-mqtt-connection.sh
```

## Creating Backups

Before running destructive operations, create backups:

```bash
# Backup entire database
docker-compose exec -T postgres pg_dump -U meshtastic meshtastic_mapper > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper < backup_20260123_120000.sql
```

## Viewing Database Statistics

Check database contents without modifications:

```bash
# Node count
docker-compose exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM nodes;"

# Recent nodes
docker-compose exec postgres psql -U meshtastic -d meshtastic_mapper -c \
  'SELECT "nodeId", "shortName", "longName", "lastSeen" FROM nodes ORDER BY "lastSeen" DESC LIMIT 10;'

# Position count
docker-compose exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM positions;"

# Telemetry count
docker-compose exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM telemetry_readings;"

# Message count by type
docker-compose exec postgres psql -U meshtastic -d meshtastic_mapper -c \
  "SELECT type, COUNT(*) FROM messages GROUP BY type ORDER BY COUNT(*) DESC;"
```

## Troubleshooting

### Script Won't Run
```bash
# Make script executable
chmod +x scripts/script-name.sh

# Run with bash explicitly
bash scripts/script-name.sh
```

### Permission Denied
```bash
# Fix permissions
chmod +x scripts/*.sh

# Or run with sudo (not recommended)
sudo ./scripts/script-name.sh
```

### Container Not Running
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Docker Issues
```bash
# Restart Docker daemon
sudo systemctl restart docker

# Clean up Docker
./scripts/cleanup-disk-space.sh

# Check Docker status
docker info
```

## Getting Help

For more information:
- Check the main [README.md](../README.md)
- View [documentation](../docs/)
- Check [troubleshooting guide](../docs/troubleshooting.md)
- Review [deployment options](../docs/deployment-options.md)
