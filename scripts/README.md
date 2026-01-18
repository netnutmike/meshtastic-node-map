# Utility Scripts

This directory contains utility scripts for managing the Meshtastic Node Mapper application.

## Available Scripts

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

Initial setup script for the application (existing script).

**Usage:**
```bash
./scripts/setup.sh
```

**What it does:**
- Creates necessary directories
- Sets up configuration files
- Initializes the database
- Prepares the application for first run

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
