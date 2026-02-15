# Deployment Guide for New Features

## Overview

This guide covers deploying the latest Meshtastic Node Mapper features including RF link visualization, theme support, mobile responsiveness, dashboard analytics, and advanced packet analysis. Follow these steps to update your existing installation or deploy a fresh instance with all new features.

## Prerequisites

Before deploying, ensure you have:

- Docker 20.10+ and Docker Compose 2.0+
- Existing installation (for upgrades) or clean system (for new installs)
- Backup of current data (for upgrades)
- Access to server/system with sudo privileges
- Stable internet connection

## Quick Upgrade (Existing Installations)

### Step 1: Backup Current Installation

```bash
# Navigate to installation directory
cd /path/to/meshtastic-node-mapper

# Stop services
docker-compose down

# Backup database
docker-compose exec postgres pg_dump -U meshtastic meshtastic_mapper > backup_$(date +%Y%m%d).sql

# Backup configuration
tar -czf config_backup_$(date +%Y%m%d).tar.gz config/ .env

# Backup logs (optional)
tar -czf logs_backup_$(date +%Y%m%d).tar.gz logs/
```

### Step 2: Pull Latest Code

```bash
# Fetch latest changes
git fetch origin

# Check current version
git describe --tags

# Pull latest release
git pull origin main

# Or checkout specific version
git checkout v1.1.0
```

### Step 3: Update Dependencies

```bash
# Pull latest Docker images
docker-compose pull

# Rebuild containers
docker-compose build --no-cache
```

### Step 4: Run Database Migrations

```bash
# Start database only
docker-compose up -d postgres

# Wait for database to be ready
sleep 10

# Run migrations
docker-compose run --rm backend npm run prisma:migrate deploy

# Create new indexes for RF links
docker-compose exec postgres psql -U meshtastic -d meshtastic_mapper -f backend/prisma/migrations/add_rf_link_indexes.sql
```

### Step 5: Update Configuration

```bash
# Copy new configuration examples
cp config/app.yml.example config/app.yml.new

# Merge your settings with new options
# Edit config/app.yml to add new feature settings
```

**New Configuration Options:**

```yaml
# Add to config/app.yml

# RF Link Visualization
rfLinks:
  enabled: true
  defaultTimeRange: 24  # hours
  maxTimeRange: 336     # 14 days
  cacheTimeout: 300     # 5 minutes
  traceroute:
    enabled: true
  packet:
    enabled: true

# Theme Support
theme:
  enabled: true
  defaultTheme: "auto"  # light, dark, or auto
  allowUserOverride: true

# Mobile Optimization
mobile:
  enabled: true
  offlineMode: true
  locationServices: true
  pwaEnabled: true

# Dashboard Analytics
dashboard:
  enabled: true
  cacheTimeout: 60      # seconds
  autoRefresh: true
  refreshInterval: 60   # seconds

# Packet Analysis
packets:
  groupingEnabled: true
  advancedFilters: true
  textDecoding: true
  maxResults: 1000
```

### Step 6: Start Services

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 7: Verify Deployment

```bash
# Check health endpoint
curl http://localhost:3001/health

# Check RF links endpoint
curl http://localhost:3001/api/map/links?hours=24

# Check dashboard endpoint
curl http://localhost:3001/api/analytics/dashboard

# Access frontend
curl http://localhost:3000
```

### Step 8: Test New Features

1. **RF Link Visualization:**
   - Open Map page
   - Enable RF Links in Map Options
   - Verify links appear between nodes

2. **Theme Support:**
   - Click theme toggle in navigation
   - Verify theme changes (light/dark/auto)
   - Check map tiles switch
   - Verify charts update colors

3. **Mobile Responsiveness:**
   - Open on mobile device or resize browser
   - Verify responsive layout
   - Test touch gestures on map
   - Check bottom navigation on mobile

4. **Dashboard Analytics:**
   - Navigate to Network Insights
   - Verify metric cards display
   - Check all charts render
   - Test data refresh

5. **Packet Analysis:**
   - Go to Packets page
   - Enable packet grouping
   - Test advanced filters
   - Verify text message decoding

## Fresh Installation

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/meshtastic-node-mapper.git
cd meshtastic-node-mapper

# Checkout latest stable release
git checkout v1.1.0
```

### Step 2: Run Setup Script

```bash
# Make setup script executable
chmod +x scripts/setup.sh

# Run automated setup
./scripts/setup.sh
```

The setup script will:
- Create necessary directories
- Generate configuration files
- Set secure default passwords
- Initialize database
- Start all services

### Step 3: Configure Application

Edit `.env` file with your settings:

```bash
# Database
POSTGRES_PASSWORD=your_secure_password

# Redis
REDIS_PASSWORD=your_redis_password

# MQTT
MQTT_USERNAME=meshtastic
MQTT_PASSWORD=your_mqtt_password

# Application
JWT_SECRET=your_jwt_secret
API_PORT=3001
FRONTEND_PORT=3000
```

Edit `config/app.yml` with your network details:

```yaml
app:
  name: "Your Network Name"
  logo: "/assets/your-logo.png"

mqtt:
  brokers:
    - name: "Primary Broker"
      url: "mqtt://mqtt.meshtastic.org"
      port: 1883
      username: ""
      password: ""
      topics:
        - "msh/US/2/json/LongFast/!#"

# Include all new feature configurations from Step 5 above
```

### Step 4: Verify Installation

```bash
# Check all services running
docker-compose ps

# Should show:
# - postgres (healthy)
# - redis (healthy)
# - mosquitto (healthy)
# - backend (healthy)
# - frontend (healthy)

# Test endpoints
curl http://localhost:3001/health
curl http://localhost:3000
```

## Production Deployment

### Additional Steps for Production

#### 1. SSL/TLS Configuration

```bash
# Install certbot
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d your-domain.com

# Update nginx configuration
cp config/nginx/nginx.prod.conf config/nginx/nginx.conf

# Edit nginx.conf with your domain and certificate paths
```

#### 2. Environment-Specific Settings

```bash
# Use production environment file
cp .env.prod.example .env.prod

# Edit .env.prod with production settings
nano .env.prod

# Use production docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

#### 3. Security Hardening

```bash
# Set restrictive file permissions
chmod 600 .env .env.prod
chmod 600 config/app.yml
chmod 700 scripts/*.sh

# Enable firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Disable unnecessary services
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d postgres redis mosquitto backend frontend nginx
```

#### 4. Monitoring Setup

```bash
# Enable health monitoring
./scripts/monitor-health.sh &

# Set up log rotation
sudo cp config/logrotate/meshtastic /etc/logrotate.d/

# Configure alerts
cp config/alerts.yml.example config/alerts.yml
# Edit alert settings
```

#### 5. Backup Automation

```bash
# Set up automated backups
crontab -e

# Add backup jobs
0 2 * * * /path/to/meshtastic-node-mapper/scripts/backup.sh
0 3 * * 0 /path/to/meshtastic-node-mapper/scripts/backup-full.sh
```

## Feature-Specific Configuration

### RF Link Visualization

**Database Indexes:**
```sql
-- Already included in migrations, but verify:
CREATE INDEX IF NOT EXISTS idx_traceroute_links_nodes 
  ON traceroute_links(from_node_id, to_node_id);
CREATE INDEX IF NOT EXISTS idx_traceroute_links_last_seen 
  ON traceroute_links(last_seen);
CREATE INDEX IF NOT EXISTS idx_packet_links_nodes 
  ON packet_links(from_node_id, to_node_id);
```

**Performance Tuning:**
```yaml
# In config/app.yml
rfLinks:
  cacheTimeout: 300  # Increase for large networks
  maxTimeRange: 168  # Reduce for better performance
```

### Theme Support

**Custom Themes:**
```css
/* Add to frontend/src/styles/theme.css */
[data-bs-theme="custom"] {
  --bs-body-bg: #your-color;
  --bs-body-color: #your-text-color;
  /* Add more custom properties */
}
```

**Default Theme:**
```yaml
# In config/app.yml
theme:
  defaultTheme: "dark"  # Set default for all users
```

### Mobile Optimization

**PWA Configuration:**
```json
// Edit frontend/public/manifest.json
{
  "name": "Your Network Name",
  "short_name": "Network",
  "theme_color": "#0d6efd",
  "background_color": "#ffffff",
  "display": "standalone",
  "scope": "/",
  "start_url": "/"
}
```

**Service Worker:**
```javascript
// Edit frontend/public/sw.js for custom caching
const CACHE_NAME = 'meshtastic-v1.1.0';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js'
];
```

### Dashboard Analytics

**Cache Configuration:**
```yaml
# In config/app.yml
dashboard:
  cacheTimeout: 60  # Adjust based on network size
  maxDataPoints: 100  # Reduce for better performance
```

**Redis Configuration:**
```yaml
# In config/redis.yml
maxmemory: 256mb
maxmemory-policy: allkeys-lru
```

## Performance Optimization

### For Large Networks (1000+ nodes)

```yaml
# In config/app.yml
performance:
  maxNodesPerRequest: 500
  cacheTimeout: 300
  enableDataSampling: true
  sampleRate: 0.1

# In docker-compose.yml
services:
  postgres:
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G
  
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

### Database Optimization

```sql
-- Run these optimizations
VACUUM ANALYZE;
REINDEX DATABASE meshtastic_mapper;

-- Enable TimescaleDB for time-series data
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert telemetry table to hypertable
SELECT create_hypertable('telemetry_readings', 'timestamp', 
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);
```

## Monitoring and Maintenance

### Health Checks

```bash
# Automated health monitoring
./scripts/monitor-health.sh

# Manual health check
curl http://localhost:3001/health

# Check specific services
docker-compose ps
docker-compose logs backend | tail -50
```

### Log Management

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Export logs
docker-compose logs backend > backend_logs_$(date +%Y%m%d).log

# Rotate logs
docker-compose logs --tail=1000 backend > backend_recent.log
```

### Database Maintenance

```bash
# Weekly maintenance
docker-compose exec postgres psql -U meshtastic -d meshtastic_mapper -c "VACUUM ANALYZE;"

# Check database size
docker-compose exec postgres psql -U meshtastic -d meshtastic_mapper -c "
  SELECT pg_size_pretty(pg_database_size('meshtastic_mapper'));"

# Clean old data (if retention enabled)
docker-compose exec backend npm run cleanup:data
```

## Troubleshooting Deployment

### Services Won't Start

```bash
# Check Docker daemon
sudo systemctl status docker

# Check port conflicts
sudo netstat -tulpn | grep -E ':(3000|3001|5432|6379|1883)'

# Check logs for errors
docker-compose logs

# Restart services
docker-compose restart
```

### Database Migration Fails

```bash
# Check database connection
docker-compose exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT 1;"

# Reset migrations (CAUTION: Development only)
docker-compose exec backend npm run prisma:migrate reset

# Manual migration
docker-compose exec backend npm run prisma:migrate deploy
```

### Frontend Build Fails

```bash
# Clear npm cache
docker-compose exec frontend npm cache clean --force

# Rebuild frontend
docker-compose build --no-cache frontend

# Check for errors
docker-compose logs frontend
```

### RF Links Not Appearing

```bash
# Check if data exists
docker-compose exec postgres psql -U meshtastic -d meshtastic_mapper -c "
  SELECT COUNT(*) FROM traceroute_links;
  SELECT COUNT(*) FROM packet_links;"

# Check backend logs
docker-compose logs backend | grep "RF link"

# Verify MQTT messages
docker-compose logs mosquitto | tail -50
```

## Rollback Procedure

If deployment fails, rollback to previous version:

```bash
# Stop services
docker-compose down

# Restore database backup
docker-compose up -d postgres
sleep 10
docker-compose exec -T postgres psql -U meshtastic meshtastic_mapper < backup_YYYYMMDD.sql

# Restore configuration
tar -xzf config_backup_YYYYMMDD.tar.gz

# Checkout previous version
git checkout v1.0.0

# Rebuild and start
docker-compose build
docker-compose up -d

# Verify rollback
curl http://localhost:3001/health
```

## Post-Deployment Checklist

- [ ] All services running (docker-compose ps)
- [ ] Health endpoint responding
- [ ] Frontend accessible
- [ ] Database migrations applied
- [ ] RF links visible on map
- [ ] Theme toggle working
- [ ] Mobile layout responsive
- [ ] Dashboard loading
- [ ] Packet filters working
- [ ] MQTT connection active
- [ ] Logs clean (no errors)
- [ ] Backups configured
- [ ] Monitoring enabled
- [ ] SSL/TLS configured (production)
- [ ] Firewall rules set (production)

## Support and Resources

### Documentation

- [User Guide](user-guide.md) - Feature documentation
- [API Guide](api-guide.md) - API reference
- [Troubleshooting](troubleshooting.md) - Common issues

### Community

- GitHub Issues: Report bugs
- GitHub Discussions: Ask questions
- Meshtastic Forums: Community support

### Professional Support

For enterprise deployments or custom features:
- Email: support@your-domain.com
- Consulting: Available for large deployments
- Training: Available for teams

---

**Deployment Complete!** Your Meshtastic Node Mapper is now running with all the latest features. Check the [User Guide](user-guide.md) to learn about new capabilities.
