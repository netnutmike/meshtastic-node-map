# Meshtastic Node Mapper

A web application for visualizing and monitoring your Meshtastic mesh network in real-time.

![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

## What is This?

Meshtastic Node Mapper shows you all the nodes in your mesh network on an interactive map. See who's online, track messages, view telemetry data, and analyze your network coverage - all in real-time through your web browser.

## Quick Start

### What You Need

- A computer with Docker installed
- 4GB of RAM (8GB recommended)
- 20GB of free disk space
- Your Meshtastic network's MQTT connection details

### Installation (5 Minutes)

1. **Download the application:**
   ```bash
   git clone https://github.com/your-org/meshtastic-node-mapper.git
   cd meshtastic-node-mapper
   ```

2. **Run the setup script:**
   ```bash
   ./scripts/setup.sh
   ```
   
   The script will automatically:
   - Install all required components
   - Set up the database
   - Start all services
   - Configure everything for you

3. **Open your browser:**
   - Go to: http://localhost:3000
   - That's it! You're ready to use the application.

### First Time Setup

After opening the application:

1. Click the **Settings** icon (⚙️)
2. Enter your MQTT broker details:
   - **Broker URL**: Your Meshtastic MQTT server address
   - **Username/Password**: If your broker requires authentication
   - **Topic**: Usually `msh/US/2/json/LongFast/!#` (adjust for your region)
3. Click **Save**

Your nodes will start appearing on the map within seconds!

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
1. Click any node marker on the map
2. View real-time telemetry (battery, signal strength, etc.)
3. See message history
4. Check neighbor connections

### Exporting Data
1. Go to **Settings** → **Data Export**
2. Choose your format (CSV, JSON, or KML)
3. Select what to export (nodes, messages, telemetry)
4. Click **Export**

### Monitoring Network Health
1. Open the **Network Insights** page
2. View statistics dashboard
3. Check coverage analysis
4. Review top talkers and message patterns

## Need Help?

### Documentation
- **[User Guide](docs/user-guide.md)** - Complete feature walkthrough
- **[Installation Guide](docs/installation.md)** - Detailed setup instructions
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions

### Getting Support
- **Issues**: Report bugs on [GitHub Issues](https://github.com/your-org/meshtastic-node-mapper/issues)
- **Questions**: Ask in [GitHub Discussions](https://github.com/your-org/meshtastic-node-mapper/discussions)
- **Community**: Join the Meshtastic community forums

### Common Issues

**Can't connect to MQTT broker?**
- Check your broker URL is correct
- Verify username/password if required
- Ensure your firewall allows the connection

**No nodes showing up?**
- Verify your MQTT topic is correct
- Check that nodes are actively transmitting
- Look at the connection status indicator

**Application won't start?**
- Run: `./scripts/fix-docker-permissions.sh`
- Check you have enough disk space
- See the [Troubleshooting Guide](docs/troubleshooting.md)

## Updating

To update to the latest version:

```bash
# Stop the application
docker compose down

# Get the latest code
git pull

# Restart with updates
docker compose up -d
```

Your data is preserved during updates.

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

For complete documentation, visit the [docs](docs/) directory.
