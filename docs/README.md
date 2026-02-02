# Meshtastic Node Mapper Documentation

Welcome to the Meshtastic Node Mapper documentation. Whether you're a user wanting to monitor your mesh network or a developer looking to contribute, you'll find everything you need here.

## 📚 Documentation for Users

Perfect for anyone who wants to install, configure, and use the application.

### Getting Started
- **[Installation Guide](installation.md)** - Step-by-step setup instructions
- **[Features Overview](features.md)** - Visual tour of all features with screenshots
- **[User Guide](user-guide.md)** - Complete feature walkthrough and how-to guides
- **[Troubleshooting](troubleshooting.md)** - Solutions to common problems

### New Features (v1.1.0)
- **[RF Link Visualization](features/rf-link-visualization.md)** - Real-time network topology and RF connections
- **[Theme Customization](features/theme-customization.md)** - Light/dark/auto theme support
- **[Mobile Usage Guide](features/mobile-usage.md)** - Mobile-optimized interface and features
- **[Dashboard Analytics](features/dashboard-analytics.md)** - Comprehensive network insights and metrics
- **[Deployment Guide](deployment-new-features.md)** - Deploy and configure new features

### Deployment
- **[Production Deployment](production-deployment.md)** - Deploy on port 80 for production use
- **[Production Quick Start](production-quickstart.md)** - Fast production deployment reference

### Reference
- **[API Guide](api-guide.md)** - REST API and WebSocket documentation for integrations

## 👨‍💻 Documentation for Developers

For developers who want to contribute, extend, or understand the codebase.

### Developer Documentation
- **[Developer Hub](developer/)** - Main developer documentation index
- **[Architecture Overview](developer/architecture.md)** - System design and technical details
- **[Contributing Guidelines](developer/contributing.md)** - How to contribute to the project
- **[Development Setup](developer/development-setup.md)** - Set up your dev environment
- **[Implementation Guides](implementation/)** - Detailed technical implementation documentation

## Quick Navigation

### I want to...

**...install and use the application**
1. Follow the [Installation Guide](installation.md)
2. Read the [User Guide](user-guide.md)
3. Check [Troubleshooting](troubleshooting.md) if you have issues

**Deploy to production**
1. Review [Production Deployment](production-deployment.md)
2. Use the [Production Quick Start](production-quickstart.md)
3. Set up monitoring and backups

**...integrate with the API**
1. Read the [API Guide](api-guide.md)
2. Review authentication methods
3. Test with the interactive API docs

**...contribute to development**
1. Read [Contributing Guidelines](developer/contributing.md)
2. Set up your [Development Environment](developer/development-setup.md)
3. Review the [Architecture](developer/architecture.md)
4. Check out [Good First Issues](https://github.com/your-org/meshtastic-node-mapper/labels/good%20first%20issue)

## What is Meshtastic Node Mapper?

A comprehensive web-based application for visualizing, monitoring, and analyzing Meshtastic mesh networks through real-time MQTT data.

### Key Features

**For Network Operators:**
- 📍 Interactive map with real-time node visualization
- 📊 Network analytics and performance monitoring
- 🗺️ Coverage analysis and planning tools
- 📱 Mobile-friendly with offline capabilities
- 🌐 Multi-network management

**For Developers:**
- 🔌 RESTful API with WebSocket support
- 🐳 Docker-based deployment
- 📚 Comprehensive documentation
- 🧪 Full test coverage
- 🔧 Extensible architecture

### Technology Stack

- **Frontend**: React 18+ with TypeScript, Material-UI, Leaflet maps
- **Backend**: Node.js with Express, Socket.IO for real-time updates
- **Database**: PostgreSQL 15+ with TimescaleDB for time-series data
- **Cache**: Redis for performance optimization
- **MQTT**: Mosquitto broker integration
- **Deployment**: Docker with multi-stage builds

## System Requirements

### For Users
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **RAM**: 4 GB minimum (8 GB recommended)
- **Storage**: 20 GB minimum (50 GB recommended)
- **OS**: Linux, macOS, or Windows with Docker

### For Developers
- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher
- **Git**: Latest version
- **IDE**: VS Code recommended
- All user requirements above

## Getting Help

### For Users
- **Documentation**: Start with the [User Guide](user-guide.md)
- **Issues**: Report problems on [GitHub Issues](https://github.com/your-org/meshtastic-node-mapper/issues)
- **Community**: Ask questions in [GitHub Discussions](https://github.com/your-org/meshtastic-node-mapper/discussions)

### For Developers
- **Developer Docs**: See the [Developer Hub](developer/)
- **API Reference**: Check the [API Guide](api-guide.md)
- **Contributing**: Read [Contributing Guidelines](developer/contributing.md)
- **Code Review**: Submit [Pull Requests](https://github.com/your-org/meshtastic-node-mapper/pulls)

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0). See the LICENSE file for details.

## Version Information

- **Current Version**: 1.0.0
- **Release Date**: December 2024
- **Meshtastic Compatibility**: Firmware 2.0+
- **Node.js**: 18.0+ required
- **Docker**: 20.10+ required

---

**New to the project?** Start with the [Installation Guide](installation.md) or [User Guide](user-guide.md).

**Want to contribute?** Check out the [Developer Documentation](developer/).