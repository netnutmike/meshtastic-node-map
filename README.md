# Meshtastic Node Mapper

A comprehensive web-based application for visualizing and monitoring Meshtastic mesh networks through real-time MQTT data consumption.

## 🌟 Features

- **Real-time Node Visualization**: Interactive map showing all active Meshtastic nodes
- **Comprehensive Monitoring**: Node telemetry, message tracking, and network analytics
- **Multi-Network Support**: Manage multiple mesh networks simultaneously
- **Advanced Analytics**: Predictive analysis, coverage planning, and performance optimization
- **Mobile-Friendly**: Responsive design with offline capabilities
- **Docker-Ready**: Complete containerized deployment solution

## 🚀 Quick Start

### Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- 4GB RAM minimum (8GB recommended)
- 20GB storage space

### Installation

#### Option 1: Quick Start (Recommended for Development)
```bash
git clone https://github.com/your-org/meshtastic-node-mapper.git
cd meshtastic-node-mapper
./scripts/quick-start.sh
```

#### Option 2: Full Setup (Production-Ready)
```bash
git clone https://github.com/your-org/meshtastic-node-mapper.git
cd meshtastic-node-mapper
./scripts/setup.sh
```

#### If you get Docker permission errors:
```bash
# Run the permission fix script
./scripts/fix-docker-permissions.sh

# Then try setup again
./scripts/setup.sh
```

3. **Access the Application**:
- 🌐 **Frontend**: http://localhost:3000
- 🔧 **Backend API**: http://localhost:3001
- 📚 **API Docs**: http://localhost:3001/api/v1/docs

That's it! The setup script handles everything automatically.

### Troubleshooting

If you encounter issues:
- 🔧 **Docker Permissions**: Run `./scripts/fix-docker-permissions.sh`
- 📖 **Common Issues**: Check [docs/troubleshooting.md](docs/troubleshooting.md)
- 🐛 **Bug Reports**: Open an issue on GitHub

## 📖 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[📋 Installation Guide](docs/installation.md)** - Complete setup instructions
- **[👤 User Guide](docs/user-guide.md)** - How to use all features
- **[⚙️ Configuration Guide](docs/configuration.md)** - Customization options
- **[👨‍💻 Developer Guide](docs/developer-guide.md)** - Development and contribution
- **[🔌 API Documentation](docs/api-guide.md)** - REST API and WebSocket reference
- **[🏗️ Architecture Overview](docs/architecture.md)** - System design details

## 🛠️ Development

### Quick Development Setup

```bash
# Install dependencies
npm install

# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Start backend (terminal 1)
cd backend && npm run dev

# Start frontend (terminal 2)
cd frontend && npm start
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

See the [Developer Guide](docs/developer-guide.md) for detailed development instructions.

## 🌐 API Overview

The API provides comprehensive access to mesh network data:

### REST API Examples

```javascript
// Get all online nodes
const nodes = await fetch('/api/v1/nodes?isOnline=true');

// Get telemetry data
const telemetry = await fetch('/api/v1/telemetry?nodeId=123456789');

// Export data
const csv = await fetch('/api/v1/export/nodes?format=csv');
```

### WebSocket Real-time Updates

```javascript
const socket = io('http://localhost:3001');

socket.on('nodeUpdate', (data) => {
  console.log('Node updated:', data);
});

socket.on('messageReceived', (message) => {
  console.log('New message:', message);
});
```

Full API documentation: [API Guide](docs/api-guide.md)

## 🚢 Production Deployment

### Docker Production Setup

```bash
# Production deployment
./scripts/setup.sh --prod

# Or manually
docker-compose -f docker-compose.prod.yml up -d
```

### Key Production Features

- 🔒 **Security**: JWT authentication, rate limiting, input validation
- 📊 **Monitoring**: Health checks, metrics, logging
- 🔄 **High Availability**: Load balancing, auto-restart, graceful shutdown
- 📈 **Performance**: Caching, connection pooling, optimized queries
- 🔧 **Maintenance**: Automated backups, log rotation, updates

See [Installation Guide](docs/installation.md) for detailed deployment instructions.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   MQTT Broker   │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Mosquitto)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │   PostgreSQL    │              │
         │              │   + TimescaleDB │              │
         │              └─────────────────┘              │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      Nginx      │    │      Redis      │    │   Monitoring    │
│   (Reverse      │    │    (Cache)      │    │  (Prometheus)   │
│    Proxy)       │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Technology Stack:**
- **Frontend**: React 18+, TypeScript, Material-UI, Leaflet
- **Backend**: Node.js, Express, Socket.IO, Prisma ORM
- **Database**: PostgreSQL 15+ with TimescaleDB
- **Cache**: Redis for sessions and caching
- **MQTT**: Mosquitto broker integration
- **Deployment**: Docker with multi-stage builds

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Read the [Developer Guide](docs/developer-guide.md)**
2. **Fork the repository**
3. **Create a feature branch**: `git checkout -b feature/amazing-feature`
4. **Make your changes and add tests**
5. **Submit a pull request**

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Update documentation as needed
- Follow conventional commit messages
- Ensure all tests pass

## 📄 License

This project is licensed under the **GNU General Public License v3.0** - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Community

- **📖 Documentation**: Complete guides in `docs/` directory
- **🐛 Issues**: Report bugs on [GitHub Issues](https://github.com/your-org/meshtastic-node-mapper/issues)
- **💬 Discussions**: Join [GitHub Discussions](https://github.com/your-org/meshtastic-node-mapper/discussions)
- **📧 Security**: Report security issues privately

## 🙏 Acknowledgments

- **[Meshtastic Project](https://meshtastic.org/)** - The amazing mesh networking platform
- **[OpenStreetMap](https://www.openstreetmap.org/)** - Open map data
- **Open Source Community** - All the amazing libraries and tools
- **Contributors** - Everyone who helps make this project better

---

**⭐ Star this repository if you find it useful!**

For detailed information on any topic, please refer to the comprehensive documentation in the `docs/` directory.