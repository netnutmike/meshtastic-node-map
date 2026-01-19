# Meshtastic Node Mapper

A web application for visualizing and monitoring your Meshtastic mesh network in real-time.

![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

## What is This?

Meshtastic Node Mapper shows you all the nodes in your mesh network on an interactive map. See who's online, track messages, view telemetry data, and analyze your network coverage - all in real-time through your web browser.

**[📸 See All Features with Screenshots →](docs/features.md)**

## Production Installation (Recommended)

Most users will want to run this on a server accessible from anywhere. We provide pre-built Docker images for the easiest installation.

### What You Need

- A Linux server (Ubuntu, Debian, or similar)
- Docker and Docker Compose installed
- Your server's IP address or domain name
- Your Meshtastic MQTT broker details

### Quick Install (Using Pre-built Images)

The fastest way to get started - no building required!

**Step 1: Install Docker**

```bash
# Update package list
sudo apt update

# Install Docker
sudo apt install -y docker.io docker-compose-plugin

# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and back in, then verify
docker --version
```

**Step 2: Download and Run**

```bash
# Create a directory for the application
mkdir meshtastic-node-mapper
cd meshtastic-node-mapper

# Download the quick install script
curl -fsSL https://raw.githubusercontent.com/your-org/meshtastic-node-mapper/main/scripts/quick-install.sh -o quick-install.sh
chmod +x quick-install.sh

# Run the installer
./quick-install.sh
```

The script will:
- Download necessary configuration files
- Create a `.env` file with generated passwords
- Pull pre-built Docker images
- Start all services

**Step 3: Configure**

Edit the `.env` file to set your server IP:

```bash
nano .env
```

Update these lines:
```bash
REACT_APP_API_URL=http://YOUR_SERVER_IP/api
REACT_APP_WS_URL=ws://YOUR_SERVER_IP
FRONTEND_URL=http://YOUR_SERVER_IP
```

Replace `YOUR_SERVER_IP` with your actual server IP or domain name.

**Step 4: Restart**

```bash
docker compose -f docker-compose.images.yml restart
```

**Step 5: Access**

Open your browser and go to: **http://YOUR_SERVER_IP**

### Manual Installation (Using Pre-built Images)

If you prefer manual setup:

**Step 1: Download Files**

```bash
# Create directory
mkdir meshtastic-node-mapper
cd meshtastic-node-mapper

# Download docker-compose file
curl -fsSL https://raw.githubusercontent.com/your-org/meshtastic-node-mapper/main/docker-compose.images.yml -o docker-compose.yml

# Download nginx config
mkdir -p config/nginx
curl -fsSL https://raw.githubusercontent.com/your-org/meshtastic-node-mapper/main/config/nginx/nginx.prod.conf -o config/nginx/nginx.prod.conf

# Create directories
mkdir -p logs/{backend,nginx,mosquitto} backups
```

**Step 2: Create Configuration**

Create a `.env` file:

```bash
nano .env
```

Add this content (update YOUR_SERVER_IP and passwords):

```bash
# Server Configuration
REACT_APP_API_URL=http://YOUR_SERVER_IP/api
REACT_APP_WS_URL=ws://YOUR_SERVER_IP
FRONTEND_URL=http://YOUR_SERVER_IP

# Security - Generate with: openssl rand -base64 32
JWT_SECRET=your_generated_secret_here
SESSION_SECRET=your_generated_secret_here

# Database
POSTGRES_PASSWORD=your_strong_password
REDIS_PASSWORD=your_strong_password

# Ports
HTTP_PORT=80
```

**Step 3: Start**

```bash
# Pull images
docker compose pull

# Start services
docker compose up -d

# Check status
docker compose ps
```

### Building from Source (For Developers)

If you want to build the images yourself or contribute to development:

```bash
# Clone the full repository
git clone https://github.com/your-org/meshtastic-node-mapper.git
cd meshtastic-node-mapper

# Copy and edit environment file
cp .env.prod.example .env
nano .env

# Build and start
docker compose -f docker-compose.prod.yml up -d --build
```


## Quick Commands

### Using Pre-built Images (Recommended)

```bash
# View logs
docker compose logs -f

# Stop the application
docker compose down

# Restart the application
docker compose restart

# Update to latest version
docker compose pull
docker compose up -d

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend
```

### Building from Source (Developers)

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop
docker compose -f docker-compose.prod.yml down

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# Update code and restart
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Local Testing (Development)

Want to test locally before deploying to production?

```bash
# Quick start for local testing
./scripts/setup.sh

# Access at http://localhost:3000
```

## Key Features

### 📍 Interactive Map
- See all your nodes on a real-time map
- Color-coded status indicators (online/offline)
- Click any node for detailed information
- Zoom and pan to explore your network

### 📊 Network Analytics
- View network statistics and trends
- Monitor message traffic
- Analyze coverage areas
- Track node performance

### 📱 Mobile Friendly
- Works on phones and tablets
- Offline mode for field use
- GPS integration for location tracking

### 🔍 Search & Filter
- Find nodes by name or ID
- Filter by hardware type or status
- Search message history
- Export data for analysis

### 🌐 Multi-Network Support
- Manage multiple mesh networks
- Switch between networks easily
- Compare network performance

**[📸 See All Features with Screenshots →](docs/features.md)**

## Common Tasks

### Viewing Node Details
Click any node marker on the map to see:
- Battery level and voltage
- Signal strength (RSSI/SNR)
- GPS location and altitude
- Message history
- Neighbor connections

### Exporting Data
1. Go to **Settings** → **Data Export**
2. Choose your format (CSV, JSON, or KML)
3. Select what to export
4. Click **Export**

### Monitoring Network Health
1. Open the **Network Insights** page
2. View statistics dashboard
3. Check coverage analysis
4. Review message patterns

## Troubleshooting

### Getting 502 Bad Gateway Error?

If you see a 502 Bad Gateway error after installation, the frontend container may not be running correctly.

**Quick Fix:**
```bash
./scripts/fix-frontend-502.sh
```

This automated script will rebuild the frontend container and fix the issue.

**Manual Fix:**
```bash
# Rebuild frontend container
docker compose -f docker-compose.prod.yml stop frontend
docker compose -f docker-compose.prod.yml rm -f frontend
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml up -d frontend

# Restart nginx
docker compose -f docker-compose.prod.yml restart nginx
```

**Diagnose the Issue:**
```bash
./scripts/diagnose-frontend.sh
```

### Can't Access the Application?

**Check if services are running:**
```bash
docker compose -f docker-compose.prod.yml ps
```

**View logs for errors:**
```bash
docker compose -f docker-compose.prod.yml logs
```

**Restart everything:**
```bash
docker compose -f docker-compose.prod.yml restart
```

### No Nodes Showing Up?

1. Check MQTT connection status (top right indicator)
2. Verify your MQTT broker URL is correct
3. Ensure your topic pattern matches your network
4. Check that nodes are actively transmitting

### Port 80 Already in Use?

Find what's using it:
```bash
sudo lsof -i :80
```

Either stop that service or change the port in `.env`:
```bash
HTTP_PORT=8080
```

### Need More Help?

- **[Complete Installation Guide](docs/installation.md)** - Detailed setup instructions
- **[User Guide](docs/user-guide.md)** - How to use all features
- **[Troubleshooting Guide](docs/troubleshooting.md)** - Common issues and solutions
- **[GitHub Issues](https://github.com/your-org/meshtastic-node-mapper/issues)** - Report bugs

## Updating

### Using Pre-built Images

To update to the latest version:

```bash
# Pull latest images
docker compose pull

# Restart with new images
docker compose up -d
```

Your data is preserved during updates.

### Building from Source

```bash
# Stop the application
docker compose -f docker-compose.prod.yml down

# Get the latest code
git pull

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build
```

## Security Notes

For production deployments:

1. **Use strong passwords** - Generate secure passwords for all services
2. **Enable HTTPS** - Set up SSL certificates for secure access
3. **Firewall** - Only expose necessary ports (80/443)
4. **Regular updates** - Keep the application and Docker updated
5. **Backups** - Regularly backup your data

See the [Production Deployment Guide](docs/production-deployment.md) for detailed security recommendations.

## Documentation

- **[Features Overview](docs/features.md)** - Visual tour with screenshots
- **[User Guide](docs/user-guide.md)** - Complete feature walkthrough
- **[Installation Guide](docs/installation.md)** - Detailed setup instructions
- **[Production Deployment](docs/production-deployment.md)** - Production best practices
- **[API Documentation](docs/api-guide.md)** - For integrations
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues

## For Developers

Want to contribute or customize the application? See the [Developer Documentation](docs/developer/).

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0).

## Acknowledgments

- **[Meshtastic Project](https://meshtastic.org/)** - The amazing mesh networking platform
- **[OpenStreetMap](https://www.openstreetmap.org/)** - Open map data
- **Community Contributors** - Everyone who helps improve this project

---

**⭐ If you find this useful, please star the repository!**

**Questions?** Check the [documentation](docs/) or open an [issue](https://github.com/your-org/meshtastic-node-mapper/issues).
