# Production Quick Start - Port 80 Deployment

## What Was Fixed

1. ✅ Created `config/nginx/nginx.prod.conf` (was missing)
2. ✅ Fixed upstream configuration to point to `frontend:80` (not `frontend:3000`)
3. ✅ Created `.env.prod.example` template
4. ✅ Created comprehensive production deployment guide

## Quick Steps to Deploy

### 1. Create Your .env File

```bash
cp .env.prod.example .env
```

Edit `.env` and set these **required** values:

```bash
# Replace with your server's IP or domain
REACT_APP_API_URL=http://YOUR_SERVER_IP/api
REACT_APP_WS_URL=ws://YOUR_SERVER_IP
FRONTEND_URL=http://YOUR_SERVER_IP

# Generate secure secrets (run: openssl rand -base64 32)
JWT_SECRET=<paste_generated_secret>
SESSION_SECRET=<paste_generated_secret>

# Set secure passwords
POSTGRES_PASSWORD=<strong_password>
REDIS_PASSWORD=<strong_password>
```

### 2. Stop Development Containers

```bash
docker compose down
```

### 3. Start Production

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 4. Check Status

```bash
# View all containers
docker compose -f docker-compose.prod.yml ps

# Check nginx logs
docker logs meshtastic-nginx-prod

# Check backend logs
docker logs meshtastic-backend-prod

# Check frontend logs
docker logs meshtastic-frontend-prod
```

### 5. Access Application

Open browser: `http://YOUR_SERVER_IP` or `http://localhost`

## Troubleshooting

### If Port 80 is Already in Use

Find what's using it:
```bash
sudo lsof -i :80
# or
sudo netstat -tulpn | grep :80
```

Stop the conflicting service or change port in `.env`:
```bash
HTTP_PORT=8080
```

### If Containers Won't Start

Check logs:
```bash
docker compose -f docker-compose.prod.yml logs
```

### If Frontend Shows 502 Bad Gateway

1. Check frontend container is running:
   ```bash
   docker ps | grep frontend
   ```

2. Check frontend health:
   ```bash
   docker exec meshtastic-nginx-prod curl -f http://frontend:80/
   ```

3. Rebuild frontend:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build frontend
   ```

### Network Already Exists Error

Remove the external network declaration:
```bash
docker network rm meshtastic-node-map_meshtastic-network
```

Then start again:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## Key Files Created/Modified

- ✅ `config/nginx/nginx.prod.conf` - Production nginx configuration
- ✅ `.env.prod.example` - Production environment template
- ✅ `docs/production-deployment.md` - Full deployment guide
- ✅ `PRODUCTION-QUICKSTART.md` - This quick reference

## Full Documentation

See `docs/production-deployment.md` for complete details on:
- Security recommendations
- Monitoring setup
- Backup procedures
- Performance tuning
- SSL/HTTPS configuration
