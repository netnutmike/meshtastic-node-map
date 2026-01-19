# Production Deployment Guide

This guide walks you through deploying Meshtastic Node Mapper in production on port 80.

## Prerequisites

- Docker and Docker Compose installed
- Server with at least 4GB RAM
- Port 80 available (not used by other services)
- Domain name or static IP (optional but recommended)

## Quick Start

### 1. Create Production Environment File

Copy the example environment file and customize it:

```bash
cp .env.prod.example .env
```

Edit `.env` and update the following **critical** values:

```bash
# Replace YOUR_SERVER_IP with your actual server IP or domain
REACT_APP_API_URL=http://YOUR_SERVER_IP/api
REACT_APP_WS_URL=ws://YOUR_SERVER_IP
FRONTEND_URL=http://YOUR_SERVER_IP

# Generate secure secrets (run these commands):
# openssl rand -base64 32
JWT_SECRET=<paste_generated_secret_here>
SESSION_SECRET=<paste_generated_secret_here>

# Set secure passwords
POSTGRES_PASSWORD=<strong_password>
REDIS_PASSWORD=<strong_password>
GRAFANA_ADMIN_PASSWORD=<strong_password>
```

### 2. Create Required Directories

```bash
mkdir -p logs/backend logs/nginx logs/mosquitto
mkdir -p config/nginx/ssl
mkdir -p backups
```

### 3. Stop Development Containers (if running)

```bash
docker compose down
```

### 4. Build and Start Production Containers

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

This will:
- Build optimized production images
- Start all services
- Expose the application on port 80

### 5. Verify Deployment

Check that all containers are running:

```bash
docker compose -f docker-compose.prod.yml ps
```

All containers should show status as "Up" and "(healthy)".

Check nginx logs:

```bash
docker logs meshtastic-nginx-prod
```

Check backend logs:

```bash
docker logs meshtastic-backend-prod
```

### 6. Access the Application

Open your browser and navigate to:
- `http://YOUR_SERVER_IP` or `http://localhost` (if on the same machine)

## Troubleshooting

### Port 80 Already in Use

If port 80 is already in use, you can either:

1. **Stop the conflicting service:**
   ```bash
   # Find what's using port 80
   sudo lsof -i :80
   # or
   sudo netstat -tulpn | grep :80
   ```

2. **Use a different port:**
   Edit `.env` and change:
   ```bash
   HTTP_PORT=8080
   ```
   Then access via `http://YOUR_SERVER_IP:8080`

### Containers Not Starting

Check logs for specific containers:

```bash
docker compose -f docker-compose.prod.yml logs <service_name>
```

Common issues:
- **Database connection errors**: Check `POSTGRES_PASSWORD` matches in `.env`
- **Redis connection errors**: Check `REDIS_PASSWORD` matches in `.env`
- **Frontend build errors**: Check `REACT_APP_API_URL` is set correctly

### Network Overlap Error

If you see "Pool overlaps with other one on this address space":

1. Check existing networks:
   ```bash
   docker network ls
   docker network inspect <network_name>
   ```

2. The production compose uses subnet `172.21.0.0/16`. If this conflicts, edit `docker-compose.prod.yml` and change the subnet to an unused range (e.g., `172.22.0.0/16`).

### Frontend Not Loading

1. Check frontend container is running:
   ```bash
   docker ps | grep frontend
   ```

2. Check frontend logs:
   ```bash
   docker logs meshtastic-frontend-prod
   ```

3. Verify nginx can reach frontend:
   ```bash
   docker exec meshtastic-nginx-prod curl -f http://frontend:80/
   ```

### API Requests Failing

1. Check backend is healthy:
   ```bash
   docker exec meshtastic-nginx-prod curl -f http://backend:3001/health
   ```

2. Check backend logs:
   ```bash
   docker logs meshtastic-backend-prod
   ```

## Maintenance

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
```

### Restart Services

```bash
# All services
docker compose -f docker-compose.prod.yml restart

# Specific service
docker compose -f docker-compose.prod.yml restart backend
```

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build
```

### Backup Database

```bash
docker exec meshtastic-postgres-prod pg_dump -U meshtastic meshtastic_mapper > backup_$(date +%Y%m%d).sql
```

### Stop All Services

```bash
docker compose -f docker-compose.prod.yml down
```

### Remove All Data (CAUTION!)

```bash
docker compose -f docker-compose.prod.yml down -v
```

## Security Recommendations

1. **Use HTTPS**: Configure SSL certificates in `config/nginx/ssl/` and update nginx configuration
2. **Firewall**: Only expose necessary ports (80, 443)
3. **Strong Passwords**: Use generated passwords, not defaults
4. **Regular Updates**: Keep Docker images and application code updated
5. **Monitoring**: Enable Prometheus/Grafana for monitoring (see Monitoring section)

## Monitoring (Optional)

To enable Prometheus and Grafana monitoring:

```bash
docker compose -f docker-compose.prod.yml --profile monitoring up -d
```

Access:
- Prometheus: `http://YOUR_SERVER_IP:9090`
- Grafana: `http://YOUR_SERVER_IP:3000` (default login: admin / password from `.env`)

## Performance Tuning

For high-traffic deployments, consider:

1. **Increase worker connections** in `config/nginx/nginx.prod.conf`
2. **Scale backend** using Docker Compose scale:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --scale backend=3
   ```
3. **Optimize PostgreSQL** settings in `config/postgres/`
4. **Enable Redis caching** for frequently accessed data

## Support

For issues or questions:
- Check logs first: `docker compose -f docker-compose.prod.yml logs`
- Review troubleshooting section above
- Check GitHub issues
