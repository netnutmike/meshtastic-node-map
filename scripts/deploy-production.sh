#!/bin/bash
set -e

echo "=== Meshtastic Node Mapper - Production Deployment ==="
echo "Timestamp: $(date)"
echo ""

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="./backups/$(date +%Y%m%d-%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running in the correct directory
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}ERROR: $COMPOSE_FILE not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Check if .env.prod exists
if [ ! -f ".env.prod" ]; then
    echo -e "${YELLOW}WARNING: .env.prod not found${NC}"
    echo "Using .env.prod.example as template"
    if [ -f ".env.prod.example" ]; then
        cp .env.prod.example .env.prod
        echo -e "${YELLOW}Please edit .env.prod with your production values${NC}"
        read -p "Press Enter to continue after editing .env.prod..."
    else
        echo -e "${RED}ERROR: .env.prod.example not found${NC}"
        exit 1
    fi
fi

echo "Step 1: Checking current status..."
docker-compose -f $COMPOSE_FILE ps
echo ""

echo "Step 2: Creating backup directory..."
mkdir -p "$BACKUP_DIR"
echo "Backup location: $BACKUP_DIR"
echo ""

echo "Step 3: Backing up database..."
POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep postgres | head -1)
if [ -n "$POSTGRES_CONTAINER" ]; then
    echo "Backing up from container: $POSTGRES_CONTAINER"
    docker exec $POSTGRES_CONTAINER pg_dump -U meshtastic meshtastic_mapper > "$BACKUP_DIR/database.sql"
    echo -e "${GREEN}✓ Database backed up${NC}"
else
    echo -e "${YELLOW}⚠ No postgres container running, skipping database backup${NC}"
fi
echo ""

echo "Step 4: Pulling latest code from git..."
git fetch origin
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

# Show what will be updated
echo ""
echo "Changes to be pulled:"
git log HEAD..origin/$CURRENT_BRANCH --oneline | head -10
echo ""

read -p "Pull latest changes? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

git pull origin $CURRENT_BRANCH
echo -e "${GREEN}✓ Code updated${NC}"
echo ""

echo "Step 5: Stopping services..."
docker-compose -f $COMPOSE_FILE down
echo -e "${GREEN}✓ Services stopped${NC}"
echo ""

echo "Step 6: Rebuilding Docker images..."
echo "This may take several minutes..."
echo ""

# Build backend
echo "Building backend image..."
docker-compose -f $COMPOSE_FILE build --no-cache backend
echo -e "${GREEN}✓ Backend image built${NC}"
echo ""

# Build frontend
echo "Building frontend image..."
docker-compose -f $COMPOSE_FILE build --no-cache frontend
echo -e "${GREEN}✓ Frontend image built${NC}"
echo ""

echo "Step 7: Starting services..."
docker-compose -f $COMPOSE_FILE up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

echo "Step 8: Waiting for services to initialize (60 seconds)..."
sleep 60
echo ""

echo "Step 9: Running database migrations..."
BACKEND_CONTAINER=$(docker ps --format "{{.Names}}" | grep backend | head -1)
if [ -n "$BACKEND_CONTAINER" ]; then
    docker exec $BACKEND_CONTAINER npm run prisma:deploy
    echo -e "${GREEN}✓ Database migrations applied${NC}"
else
    echo -e "${YELLOW}⚠ Backend container not found, skipping migrations${NC}"
fi
echo ""

echo "Step 10: Checking service status..."
docker-compose -f $COMPOSE_FILE ps
echo ""

echo "Step 11: Checking service health..."
echo ""

# Check backend health
echo "Backend health:"
curl -f http://localhost:3001/health 2>/dev/null && echo -e "${GREEN}✓ Backend healthy${NC}" || echo -e "${RED}✗ Backend not responding${NC}"
echo ""

# Check frontend
echo "Frontend health:"
curl -f http://localhost/ 2>/dev/null && echo -e "${GREEN}✓ Frontend accessible${NC}" || echo -e "${YELLOW}⚠ Frontend not accessible (nginx might not be configured)${NC}"
echo ""

echo "Step 12: Checking logs for errors..."
echo ""
echo "Backend logs (last 20 lines):"
docker logs $BACKEND_CONTAINER --tail 20 2>&1 | grep -i "error\|warning" || echo "No errors found"
echo ""

echo "Step 13: Checking resource usage..."
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
echo ""

echo "=== Deployment Complete ==="
echo ""
echo -e "${GREEN}✓ Latest code deployed${NC}"
echo -e "${GREEN}✓ Docker images rebuilt${NC}"
echo -e "${GREEN}✓ Services running${NC}"
echo ""
echo "Backup location: $BACKUP_DIR"
echo ""
echo "Useful commands:"
echo "  View logs:        docker-compose -f $COMPOSE_FILE logs -f"
echo "  View backend:     docker logs -f $BACKEND_CONTAINER"
echo "  Check status:     docker-compose -f $COMPOSE_FILE ps"
echo "  Restart service:  docker-compose -f $COMPOSE_FILE restart <service>"
echo "  Stop all:         docker-compose -f $COMPOSE_FILE down"
echo ""
echo "Monitor for issues:"
echo "  watch -n 5 'docker stats --no-stream'"
echo ""
