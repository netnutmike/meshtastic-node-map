# Meshtastic Node Mapper Documentation

Welcome to the Meshtastic Node Mapper documentation. This comprehensive guide will help you understand, install, configure, and use the Meshtastic Node Mapper application.

## Table of Contents

### User Documentation
- [Installation Guide](installation.md) - Complete setup and deployment instructions
- [User Guide](user-guide.md) - How to use the application features
- [Configuration Guide](configuration.md) - Customizing the application settings

### Developer Documentation
- [Developer Guide](developer-guide.md) - Development setup and contribution guidelines
- [API Documentation](api-guide.md) - REST API and WebSocket reference
- [Architecture Overview](architecture.md) - System design and components

### Deployment Documentation
- [Docker Deployment](docker-deployment.md) - Container-based deployment
- [Production Setup](production-setup.md) - Production environment configuration
- [Monitoring and Maintenance](monitoring.md) - System monitoring and troubleshooting

## Quick Start

1. **Installation**: Follow the [Installation Guide](installation.md) to set up the application
2. **Configuration**: Customize settings using the [Configuration Guide](configuration.md)
3. **Usage**: Learn the features with the [User Guide](user-guide.md)

## Overview

The Meshtastic Node Mapper is a comprehensive web-based application designed to visualize, monitor, and analyze Meshtastic mesh networks through real-time MQTT data consumption. The system provides:

- **Interactive Map Visualization**: Real-time node positioning and status display
- **Comprehensive Monitoring**: Node telemetry, message tracking, and network analytics
- **Multi-Network Support**: Manage multiple mesh networks simultaneously
- **Advanced Analytics**: Predictive analysis, coverage planning, and performance optimization
- **Mobile-Friendly**: Responsive design with offline capabilities

## Key Features

### Core Functionality
- Real-time node visualization on interactive maps
- Comprehensive node details with telemetry data
- Message history and routing path analysis
- Network topology visualization
- Search and filtering capabilities

### Advanced Features
- Multi-network management and federation
- Coverage analysis and network planning
- Predictive analytics and anomaly detection
- Data export and backup functionality
- Authentication and role-based access control

### Technical Features
- Docker-based containerized deployment
- RESTful API with WebSocket real-time updates
- PostgreSQL with TimescaleDB for time-series data
- Redis caching and session management
- MQTT integration with Mosquitto broker

## System Requirements

### Minimum Requirements
- **CPU**: 2 cores, 2.0 GHz
- **RAM**: 4 GB
- **Storage**: 20 GB available space
- **Network**: Stable internet connection
- **Docker**: Docker 20.10+ and Docker Compose 2.0+

### Recommended Requirements
- **CPU**: 4 cores, 2.5 GHz or higher
- **RAM**: 8 GB or more
- **Storage**: 50 GB SSD storage
- **Network**: High-speed internet connection
- **OS**: Linux (Ubuntu 20.04+, CentOS 8+, or similar)

## Support and Community

### Getting Help
- **Documentation**: Comprehensive guides and references
- **Issues**: Report bugs and request features on GitHub
- **Community**: Join discussions and share experiences

### Contributing
We welcome contributions! Please see the [Developer Guide](developer-guide.md) for information on:
- Setting up the development environment
- Code style and standards
- Testing requirements
- Pull request process

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0). See the LICENSE file for details.

## Version Information

- **Current Version**: 1.0.0
- **Release Date**: December 2024
- **Compatibility**: Meshtastic firmware 2.0+
- **Node.js**: 18.0+ required
- **Docker**: 20.10+ required

---

For detailed information on any topic, please refer to the specific documentation sections linked above.