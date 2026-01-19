# Meshtastic Node Mapper - Docker Images

Pre-built Docker images for easy deployment of Meshtastic Node Mapper.

## Quick Start

```bash
# Create directory
mkdir meshtastic-node-mapper
cd meshtastic-node-mapper

# Download docker-compose file
curl -fsSL https://raw.githubusercontent.com/your-org/meshtastic-node-mapper/main/docker-compose.images.yml -o docker-compose.yml

# Download nginx config
mkdir -p config/nginx
curl -fsSL https://raw.githubusercontent.com/your-org/meshtastic-node-mapper/main/config/nginx/nginx.prod.conf -o config/nginx/nginx.prod.conf

# Create .env file (see Configuration below)
nano .env

# Start
docker compose up -d
```

## Available Images

- **meshtastic/node-mapper-backend** - Backend API service
- **meshtastic/node-mapper-frontend** - Frontend web application

## Configuration

Create a `.env` file with:

```bash
# Server Configuration
REACT_APP_API_URL=http://YOUR_SERVER_IP/api
REACT_APP_WS_URL=ws://YOUR_SERVER_IP
FRONTEND_URL=http://YOUR_SERVER_IP

# Security
JWT_SECRET=your_generated_secret
SESSION_SECRET=your_generated_secret
POSTGRES_PASSWORD=your_password
REDIS_PASSWORD=your_password

# Ports
HTTP_PORT=80
```

Generate secrets with: `openssl rand -base64 32`

## Tags

- `latest` - Latest stable release
- `v1.0.0` - Specific version
- `main` - Latest development build

## Documentation

Full documentation: https://github.com/your-org/meshtastic-node-mapper/tree/main/docs

## Support

- Issues: https://github.com/your-org/meshtastic-node-mapper/issues
- Discussions: https://github.com/your-org/meshtastic-node-mapper/discussions

## License

GPL-3.0 License
