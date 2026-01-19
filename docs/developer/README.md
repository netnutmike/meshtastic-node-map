# Developer Documentation

Welcome to the Meshtastic Node Mapper developer documentation. This section contains technical information for developers who want to contribute to, extend, or understand the codebase.

## Documentation Index

### Getting Started
- **[Development Setup](development-setup.md)** - Set up your development environment
- **[Architecture Overview](architecture.md)** - System design and components
- **[Project Structure](project-structure.md)** - Codebase organization

### Development Guides
- **[API Development](api-development.md)** - Creating and modifying API endpoints
- **[Frontend Development](frontend-development.md)** - React components and UI development
- **[Database Development](database-development.md)** - Schema management and queries
- **[Testing Guide](testing.md)** - Writing and running tests

### Contributing
- **[Contributing Guidelines](contributing.md)** - How to contribute to the project
- **[Code Style Guide](code-style.md)** - Coding standards and conventions
- **[Pull Request Process](pull-request-process.md)** - Submitting changes

### Reference
- **[API Reference](../api-guide.md)** - Complete API documentation
- **[Database Schema](database-schema.md)** - Data models and relationships
- **[Configuration Reference](configuration-reference.md)** - All configuration options

## Quick Links

### For New Contributors
1. Read the [Contributing Guidelines](contributing.md)
2. Set up your [Development Environment](development-setup.md)
3. Review the [Architecture Overview](architecture.md)
4. Check out [Good First Issues](https://github.com/your-org/meshtastic-node-mapper/labels/good%20first%20issue)

### For API Developers
1. Review the [API Development Guide](api-development.md)
2. Check the [API Reference](../api-guide.md)
3. Understand the [Database Schema](database-schema.md)
4. Write tests following the [Testing Guide](testing.md)

### For Frontend Developers
1. Read the [Frontend Development Guide](frontend-development.md)
2. Review the [Component Structure](project-structure.md#frontend-structure)
3. Follow the [Code Style Guide](code-style.md)
4. Test with the [Testing Guide](testing.md)

## Technology Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 15+ with TimescaleDB extension
- **ORM**: Prisma for type-safe database access
- **Cache**: Redis for session and data caching
- **Real-time**: Socket.IO for WebSocket connections
- **MQTT**: MQTT.js for message broker integration
- **Testing**: Jest with Supertest

### Frontend
- **Framework**: React 18+ with TypeScript
- **State Management**: Redux Toolkit
- **Routing**: React Router v6
- **UI Library**: Material-UI (MUI)
- **Maps**: Leaflet.js with React-Leaflet
- **Charts**: Chart.js with react-chartjs-2
- **HTTP Client**: Axios
- **Testing**: Jest with React Testing Library

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose
- **Reverse Proxy**: Nginx
- **Message Broker**: Eclipse Mosquitto
- **Monitoring**: Prometheus (optional)
- **Visualization**: Grafana (optional)

## Development Workflow

### Standard Workflow
1. **Fork** the repository
2. **Clone** your fork locally
3. **Create** a feature branch
4. **Make** your changes with tests
5. **Test** thoroughly
6. **Commit** with conventional commit messages
7. **Push** to your fork
8. **Submit** a pull request

### Commit Message Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Example:**
```
feat(api): add node filtering by hardware type

Implement filtering endpoint that allows users to filter nodes
by hardware model. Includes tests and documentation.

Closes #123
```

## Code Quality

### Linting and Formatting
```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Testing
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test.ts

# Run in watch mode
npm test -- --watch
```

### Type Checking
```bash
# Check TypeScript types
npm run type-check

# Check types in watch mode
npm run type-check:watch
```

## Getting Help

### Resources
- **[GitHub Issues](https://github.com/your-org/meshtastic-node-mapper/issues)**: Bug reports and feature requests
- **[GitHub Discussions](https://github.com/your-org/meshtastic-node-mapper/discussions)**: Questions and community discussion
- **[Pull Requests](https://github.com/your-org/meshtastic-node-mapper/pulls)**: Code review and contributions

### Communication
- **Issues**: For bugs, features, and technical discussions
- **Discussions**: For questions, ideas, and community chat
- **Pull Requests**: For code review and implementation discussion

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0). By contributing, you agree that your contributions will be licensed under the same license.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please read and follow our Code of Conduct when participating in this project.

---

Ready to contribute? Start with the [Development Setup](development-setup.md) guide!
