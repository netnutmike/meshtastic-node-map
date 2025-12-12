# Meshtastic Node Mapper

A comprehensive web-based application for visualizing, monitoring, and analyzing Meshtastic mesh networks through real-time MQTT data consumption.

## Features

- 🗺️ **Interactive Map Visualization** - Real-time node positioning with status-based color coding
- 📊 **Comprehensive Analytics** - Historical telemetry data, network topology, and performance metrics
- 🔄 **Real-time Updates** - Live data streaming via WebSocket connections
- 📱 **Mobile Responsive** - Optimized for desktop and mobile devices
- 🐳 **Containerized Deployment** - Easy setup with Docker Compose
- 🔒 **Security Features** - Authentication, rate limiting, and access controls
- 📈 **Advanced Analytics** - Predictive modeling and network optimization

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for development)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd meshtastic-node-mapper
   ```

2. **Copy environment configuration**
   ```bash
   cp .env.example .env
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Web Interface: http://localhost:3000
   - API Documentation: http://localhost:3001/api/docs
   - MQTT Broker: localhost:1883

### Development Setup

1. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Start development servers**
   ```bash
   npm run dev
   ```

## Architecture

The application follows a microservices architecture:

- **Frontend**: React 18 with TypeScript, Leaflet.js for mapping
- **Backend**: Node.js with Express, Socket.IO for real-time updates
- **Database**: PostgreSQL with TimescaleDB for time-series data
- **Cache**: Redis for session storage and caching
- **Message Broker**: Mosquitto MQTT for Meshtastic data ingestion

## Configuration

### Application Settings

Edit `config/app.yml` to customize:
- Map default location and zoom
- Node age thresholds
- Custom branding and links
- Feature toggles

### MQTT Configuration

Configure MQTT broker connection in `config/mqtt.yml`:
- Broker host and authentication
- Topic subscriptions
- Message processing settings

### Database Settings

Database configuration in `config/database.yml`:
- Connection parameters
- Retention policies
- Backup settings

## API Documentation

The REST API provides endpoints for:
- Node data retrieval and management
- Telemetry data queries
- Message history access
- Network topology information

WebSocket API supports:
- Real-time node updates
- Live telemetry streaming
- Network event notifications

## Testing

```bash
# Run all tests
npm test

# Backend tests only
npm run test:backend

# Frontend tests only
npm run test:frontend

# Coverage reports
npm run test:coverage
```

## Deployment

### Production Deployment

1. **Configure environment variables**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with production values
   ```

2. **Deploy with production profile**
   ```bash
   docker-compose --profile production up -d
   ```

### Security Considerations

- Change default passwords in production
- Enable HTTPS with proper SSL certificates
- Configure firewall rules
- Set up monitoring and logging
- Regular security updates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the GPL v3 License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](docs/)
- 🐛 [Issue Tracker](issues/)
- 💬 [Community Forum](https://meshtastic.discourse.group)
- 📧 [Contact](mailto:support@example.com)

## Acknowledgments

- [Meshtastic Project](https://meshtastic.org) for the amazing mesh networking platform
- [OpenStreetMap](https://openstreetmap.org) for map data
- All contributors and community members