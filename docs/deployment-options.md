# Deployment Options

Meshtastic Node Mapper offers multiple deployment options to suit different needs.

## Option 1: Pre-built Docker Images (Recommended for Users)

**Best for:** End users who want the easiest installation and updates

**Advantages:**
- No build time required
- Fastest installation
- Automatic updates with `docker compose pull`
- Minimal disk space usage
- Consistent, tested builds

**Installation:**

```bash
# Quick install script
curl -fsSL https://raw.githubusercontent.com/your-org/meshtastic-node-mapper/main/scripts/quick-install.sh | bash
```

Or manually:

```bash
# Download compose file
curl -fsSL https://raw.githubusercontent.com/your-org/meshtastic-node-mapper/main/docker-compose.images.yml -o docker-compose.yml

# Configure
nano .env

# Start
docker compose up -d
```

**Updating:**

```bash
docker compose pull
docker compose up -d
```

## Option 2: Build from Source (For Developers)

**Best for:** Developers, contributors, or users who want to customize

**Advantages:**
- Full source code access
- Ability to modify and customize
- Latest development features
- Contribute to the project

**Installation:**

```bash
# Clone repository
git clone https://github.com/your-org/meshtastic-node-mapper.git
cd meshtastic-node-mapper

# Configure
cp .env.prod.example .env
nano .env

# Build and start
docker compose -f docker-compose.prod.yml up -d --build
```

**Updating:**

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Option 3: Development Mode

**Best for:** Active development and testing

**Advantages:**
- Hot reload for code changes
- Development tools enabled
- Easier debugging
- Separate from production

**Installation:**

```bash
# Clone repository
git clone https://github.com/your-org/meshtastic-node-mapper.git
cd meshtastic-node-mapper

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..

# Start development services
docker compose -f docker-compose.dev.yml up -d

# Start backend (terminal 1)
cd backend && npm run dev

# Start frontend (terminal 2)
cd frontend && npm start
```

## Comparison

| Feature | Pre-built Images | Build from Source | Development Mode |
|---------|-----------------|-------------------|------------------|
| Installation Time | ⚡ Fast (5 min) | 🐢 Slow (15-20 min) | 🐢 Slow (20-30 min) |
| Disk Space | 💾 Small (~2GB) | 💾 Large (~5GB) | 💾 Very Large (~8GB) |
| Updates | ⚡ Instant | 🐢 Rebuild required | 🐢 Rebuild required |
| Customization | ❌ No | ✅ Yes | ✅ Yes |
| Hot Reload | ❌ No | ❌ No | ✅ Yes |
| Production Ready | ✅ Yes | ✅ Yes | ❌ No |
| Best For | End Users | Developers | Active Development |

## Recommended Deployment

### For Production Servers

Use **Pre-built Docker Images**:

```bash
curl -fsSL https://raw.githubusercontent.com/your-org/meshtastic-node-mapper/main/scripts/quick-install.sh | bash
```

### For Development

Use **Development Mode**:

```bash
git clone https://github.com/your-org/meshtastic-node-mapper.git
cd meshtastic-node-mapper
./scripts/setup.sh
```

### For Contributing

Use **Build from Source**:

```bash
git clone https://github.com/your-org/meshtastic-node-mapper.git
cd meshtastic-node-mapper
docker compose -f docker-compose.prod.yml up -d --build
```

## Docker Image Details

### Backend Image

- **Name:** `meshtastic/node-mapper-backend`
- **Base:** Node.js 18 Alpine
- **Size:** ~200MB
- **Includes:** API server, database migrations, MQTT integration

### Frontend Image

- **Name:** `meshtastic/node-mapper-frontend`
- **Base:** Nginx Alpine
- **Size:** ~50MB
- **Includes:** Built React application, optimized static files

## Image Tags

- `latest` - Latest stable release (recommended)
- `v1.0.0` - Specific version number
- `main` - Latest development build (may be unstable)

## Building Your Own Images

If you want to build and host your own images:

```bash
# Build images
./scripts/build-and-push.sh v1.0.0

# Or manually
docker build -f backend/Dockerfile.prod -t your-registry/backend:v1.0.0 ./backend
docker build -f frontend/Dockerfile.prod -t your-registry/frontend:v1.0.0 ./frontend

# Push to your registry
docker push your-registry/backend:v1.0.0
docker push your-registry/frontend:v1.0.0
```

Then update your `.env`:

```bash
DOCKER_REGISTRY=your-registry
VERSION=v1.0.0
```

## Automated Builds

Images are automatically built and published when:

1. **New Release:** Tagged with version number (e.g., `v1.0.0`)
2. **Main Branch:** Tagged as `latest`
3. **Pull Requests:** Built for testing (not published)

See `.github/workflows/docker-publish.yml` for details.

## Storage Requirements

### Pre-built Images
- Backend: ~200MB
- Frontend: ~50MB
- PostgreSQL: ~100MB
- Redis: ~10MB
- Mosquitto: ~5MB
- **Total:** ~365MB + data volumes

### Build from Source
- Source code: ~500MB
- Build cache: ~2GB
- Images: ~365MB
- **Total:** ~3GB + data volumes

### Development Mode
- Source code: ~500MB
- Node modules: ~2GB
- Build cache: ~2GB
- Images: ~365MB
- **Total:** ~5GB + data volumes

## Data Persistence

All deployment options use Docker volumes for data persistence:

- `postgres_data` - Database data
- `redis_data` - Cache data
- `mosquitto_data` - MQTT broker data
- `nginx_cache` - Nginx cache

Data is preserved across updates and restarts.

## Security Considerations

### Pre-built Images
- Images are scanned for vulnerabilities
- Built from official base images
- Minimal attack surface
- Regular security updates

### Build from Source
- Full control over build process
- Can audit all code
- Can apply custom security patches
- Requires manual security updates

## Support

- **Pre-built Images:** Fully supported, recommended for production
- **Build from Source:** Supported for development and customization
- **Development Mode:** Supported for active development only

## Questions?

- **Documentation:** [Full Documentation](index.md)
- **Issues:** [GitHub Issues](https://github.com/your-org/meshtastic-node-mapper/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-org/meshtastic-node-mapper/discussions)
