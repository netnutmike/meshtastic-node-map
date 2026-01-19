# Quick Reference Guide

Fast answers to common questions and quick links to documentation.

## I Want To...

### Install and Use

**Install the application**
→ [Installation Guide](installation.md)

**Learn how to use features**
→ [User Guide](user-guide.md)

**Deploy to production**
→ [Production Deployment](production-deployment.md)

**Fix a problem**
→ [Troubleshooting](troubleshooting.md)

### Integrate and Extend

**Use the API**
→ [API Guide](api-guide.md)

**Contribute code**
→ [Developer Documentation](developer/)

**Understand the architecture**
→ [Architecture Overview](developer/architecture.md)

**Report a bug**
→ [GitHub Issues](https://github.com/your-org/meshtastic-node-mapper/issues)

## Common Commands

### Installation
```bash
# Quick start
git clone https://github.com/your-org/meshtastic-node-mapper.git
cd meshtastic-node-mapper
./scripts/setup.sh
```

### Starting/Stopping
```bash
# Start (development)
docker compose up -d

# Start (production)
docker compose -f docker-compose.prod.yml up -d

# Stop
docker compose down

# View logs
docker compose logs -f
```

### Updating
```bash
# Get latest code
git pull

# Restart with updates
docker compose down
docker compose up -d --build
```

### Troubleshooting
```bash
# Fix Docker permissions
./scripts/fix-docker-permissions.sh

# Check service status
docker compose ps

# View specific service logs
docker compose logs backend
docker compose logs frontend

# Restart a service
docker compose restart backend
```

## Quick Links

### Documentation
- [Main Documentation Hub](index.md)
- [User Guide](user-guide.md)
- [Installation Guide](installation.md)
- [API Reference](api-guide.md)
- [Troubleshooting](troubleshooting.md)

### Developer Resources
- [Developer Hub](developer/)
- [Architecture](developer/architecture.md)
- [Contributing](developer/contributing.md)
- [Development Setup](developer/development-setup.md)

### External Resources
- [Meshtastic Documentation](https://meshtastic.org/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [GitHub Repository](https://github.com/your-org/meshtastic-node-mapper)

## Default URLs

After installation, access the application at:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/v1/docs
- **Health Check**: http://localhost:3001/health

## Configuration Files

### Main Configuration
- `.env` - Environment variables
- `config/app.yml` - Application settings
- `config/mqtt.yml` - MQTT configuration
- `docker-compose.yml` - Docker services

### MQTT Connection
Default topic pattern: `msh/US/2/json/LongFast/!#`

Replace `US` with your region:
- `US` - United States (915 MHz)
- `EU_868` - Europe (868 MHz)
- `EU_433` - Europe (433 MHz)
- `CN` - China (470 MHz)
- `JP` - Japan (920 MHz)
- `ANZ` - Australia/New Zealand (915 MHz)
- `KR` - Korea (920 MHz)
- `TW` - Taiwan (920 MHz)
- `RU` - Russia (868 MHz)
- `IN` - India (865 MHz)
- `NZ_865` - New Zealand (865 MHz)
- `TH` - Thailand (920 MHz)
- `UA_868` - Ukraine (868 MHz)

## System Requirements

### Minimum
- Docker 20.10+
- Docker Compose 2.0+
- 4 GB RAM
- 20 GB storage

### Recommended
- Docker 24.0+
- Docker Compose 2.20+
- 8 GB RAM
- 50 GB SSD storage

## Support

### Getting Help
1. Check [Troubleshooting Guide](troubleshooting.md)
2. Search [GitHub Issues](https://github.com/your-org/meshtastic-node-mapper/issues)
3. Ask in [GitHub Discussions](https://github.com/your-org/meshtastic-node-mapper/discussions)
4. Join the Meshtastic community

### Reporting Issues
Include:
- Operating system and version
- Docker and Docker Compose versions
- Error messages and logs
- Steps to reproduce

## Keyboard Shortcuts

### Navigation
- `M` - Map view
- `N` - Nodes page
- `I` - Network Insights
- `S` - Settings

### Map Controls
- `+` - Zoom in
- `-` - Zoom out
- `H` - Reset view
- `F` - Fullscreen

### General
- `/` - Search
- `Esc` - Close dialogs
- `?` - Show help

## Feature Highlights

### Map View
- Real-time node visualization
- Color-coded status indicators
- Interactive popups
- Neighbor connections
- Coverage areas

### Network Insights
- Statistics dashboard
- Coverage analysis
- Utilization monitoring
- Top talkers
- Message analytics

### Multi-Network
- Manage multiple networks
- Switch between networks
- Cross-network analytics
- Network comparison

### Data Export
- CSV, JSON, KML formats
- Automated exports
- Backup and restore
- Scheduled exports

### Mobile Features
- Responsive design
- Offline mode
- GPS integration
- Touch-optimized

## Version Information

- **Current Version**: 1.0.0
- **Release Date**: December 2024
- **Meshtastic Compatibility**: 2.0+
- **Node.js Required**: 18.0+
- **Docker Required**: 20.10+

---

**Need more details?** See the [complete documentation](index.md).
