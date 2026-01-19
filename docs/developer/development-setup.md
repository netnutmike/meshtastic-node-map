# Developer Guide

This guide provides comprehensive information for developers who want to contribute to, extend, or understand the Meshtastic Node Mapper codebase.

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Structure](#project-structure)
3. [Architecture Overview](#architecture-overview)
4. [Development Workflow](#development-workflow)
5. [Testing](#testing)
6. [API Development](#api-development)
7. [Frontend Development](#frontend-development)
8. [Database Development](#database-development)
9. [Contributing Guidelines](#contributing-guidelines)
10. [Deployment](#deployment)

## Development Environment Setup

### Prerequisites

- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Git**: Latest version
- **IDE**: VS Code (recommended) with extensions

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "ms-vscode-remote.remote-containers",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "prisma.prisma",
    "ms-vscode.vscode-docker"
  ]
}
```

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/your-org/meshtastic-node-mapper.git
cd meshtastic-node-mapper

# Install dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Return to root
cd ..

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Development Services

Start the development environment:

```bash
# Start development services (database, redis, mqtt)
docker-compose -f docker-compose.dev.yml up -d

# Start backend development server
cd backend && npm run dev

# Start frontend development server (in another terminal)
cd frontend && npm start
```

## Project Structure

```
meshtastic-node-mapper/
├── backend/                    # Backend API service
│   ├── src/
│   │   ├── __tests__/         # Test files
│   │   ├── database/          # Database layer
│   │   │   └── repositories/  # Data access layer
│   │   ├── middleware/        # Express middleware
│   │   ├── routes/           # API route handlers
│   │   ├── services/         # Business logic layer
│   │   ├── types/            # TypeScript type definitions
│   │   ├── utils/            # Utility functions
│   │   └── index.ts          # Application entry point
│   ├── prisma/               # Database schema and migrations
│   ├── package.json
│   └── tsconfig.json
├── frontend/                  # React frontend application
│   ├── src/
│   │   ├── __tests__/        # Test files
│   │   ├── components/       # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API and external services
│   │   ├── store/           # Redux store and slices
│   │   ├── styles/          # CSS and styling
│   │   └── index.tsx        # Application entry point
│   ├── public/              # Static assets
│   ├── package.json
│   └── tsconfig.json
├── config/                   # Configuration files
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
├── docker-compose.yml       # Production Docker setup
├── docker-compose.dev.yml   # Development Docker setup
└── package.json            # Root package.json
```

## Architecture Overview

### System Architecture

The application follows a microservices architecture with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   MQTT Broker   │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Mosquitto)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │   Database      │              │
         │              │   (PostgreSQL)  │              │
         │              └─────────────────┘              │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Static Files  │    │     Cache       │    │   Message Queue │
│   (Nginx)       │    │    (Redis)      │    │    (Redis)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

**Backend:**
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with middleware
- **Database**: PostgreSQL 15+ with TimescaleDB
- **ORM**: Prisma for type-safe database access
- **Cache**: Redis for session and data caching
- **Real-time**: Socket.IO for WebSocket connections
- **MQTT**: MQTT.js for message broker integration
- **Testing**: Jest with Supertest for API testing

**Frontend:**
- **Framework**: React 18+ with TypeScript
- **State Management**: Redux Toolkit
- **Routing**: React Router v6
- **UI Library**: Material-UI (MUI)
- **Maps**: Leaflet.js with React-Leaflet
- **Charts**: Chart.js with react-chartjs-2
- **HTTP Client**: Axios for API communication
- **Testing**: Jest with React Testing Library

## Development Workflow

### Git Workflow

We use a feature branch workflow:

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add new feature description"

# Push branch
git push origin feature/your-feature-name

# Create pull request on GitHub
```

### Commit Message Convention

We follow the Conventional Commits specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(api): add node filtering by hardware type
fix(frontend): resolve map marker clustering issue
docs: update installation guide
test(backend): add integration tests for MQTT service
```

### Code Style and Linting

We use ESLint and Prettier for code formatting:

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

**ESLint Configuration (.eslintrc.js):**
```javascript
module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
```

## Testing

### Testing Strategy

We employ a comprehensive testing strategy:

1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test API endpoints and database operations
3. **Property-Based Tests**: Test system properties with generated data
4. **End-to-End Tests**: Test complete user workflows

### Running Tests

```bash
# Run all tests
npm test

# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run property-based tests
npm run test:property
```

### Writing Tests

**Unit Test Example (Backend):**
```typescript
// src/__tests__/services/node.service.test.ts
import { NodeService } from '../services/node.service';
import { NodeRepository } from '../database/repositories/node.repository';

jest.mock('../database/repositories/node.repository');

describe('NodeService', () => {
  let nodeService: NodeService;
  let mockNodeRepository: jest.Mocked<NodeRepository>;

  beforeEach(() => {
    mockNodeRepository = new NodeRepository() as jest.Mocked<NodeRepository>;
    nodeService = new NodeService(mockNodeRepository);
  });

  it('should create a new node', async () => {
    const nodeData = {
      nodeId: '123456789',
      shortName: 'TEST01',
      longName: 'Test Node 01'
    };

    mockNodeRepository.create.mockResolvedValue(nodeData as any);

    const result = await nodeService.createNode(nodeData);

    expect(result).toEqual(nodeData);
    expect(mockNodeRepository.create).toHaveBeenCalledWith(nodeData);
  });
});
```

**Component Test Example (Frontend):**
```typescript
// src/__tests__/components/NodeMarker.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { NodeMarker } from '../components/Map/NodeMarker';

const mockNode = {
  id: '123',
  shortName: 'TEST01',
  longName: 'Test Node',
  position: { latitude: 40.7128, longitude: -74.0060 },
  isOnline: true
};

describe('NodeMarker', () => {
  it('renders node information correctly', () => {
    render(<NodeMarker node={mockNode} />);
    
    expect(screen.getByText('TEST01')).toBeInTheDocument();
    expect(screen.getByText('Test Node')).toBeInTheDocument();
  });

  it('shows online status', () => {
    render(<NodeMarker node={mockNode} />);
    
    expect(screen.getByTestId('node-status')).toHaveClass('online');
  });
});
```

**Property-Based Test Example:**
```typescript
// src/__tests__/properties/node-validation.property.test.ts
import fc from 'fast-check';
import { validateNodeData } from '../utils/validation';

describe('Node Validation Properties', () => {
  it('should validate any valid node data structure', () => {
    fc.assert(fc.property(
      fc.record({
        nodeId: fc.string({ minLength: 1 }),
        shortName: fc.string({ minLength: 1, maxLength: 4 }),
        longName: fc.string({ minLength: 1, maxLength: 40 }),
        hardwareModel: fc.constantFrom('TBEAM', 'HELTEC_V3', 'RAK4631'),
        role: fc.constantFrom('CLIENT', 'ROUTER', 'REPEATER')
      }),
      (nodeData) => {
        const result = validateNodeData(nodeData);
        expect(result.isValid).toBe(true);
      }
    ));
  });
});
```

## API Development

### API Structure

The API follows RESTful conventions with the following structure:

```
/api/v1/
├── /nodes              # Node management
├── /positions          # Position data
├── /telemetry          # Telemetry readings
├── /messages           # Message history
├── /networks           # Network management
├── /auth               # Authentication
├── /export             # Data export
└── /admin              # Administrative functions
```

### Creating New Endpoints

1. **Define Route Handler:**
```typescript
// src/routes/nodes.ts
import { Router } from 'express';
import { NodeController } from '../controllers/node.controller';
import { validateRequest } from '../middleware/validation';
import { nodeSchema } from '../schemas/node.schema';

const router = Router();
const nodeController = new NodeController();

router.get('/', nodeController.getAllNodes);
router.get('/:id', nodeController.getNodeById);
router.post('/', validateRequest(nodeSchema), nodeController.createNode);
router.put('/:id', validateRequest(nodeSchema), nodeController.updateNode);
router.delete('/:id', nodeController.deleteNode);

export { router as nodeRoutes };
```

2. **Implement Controller:**
```typescript
// src/controllers/node.controller.ts
import { Request, Response } from 'express';
import { NodeService } from '../services/node.service';

export class NodeController {
  private nodeService = new NodeService();

  getAllNodes = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = req.query;
      const nodes = await this.nodeService.getAllNodes(filters);
      res.json(nodes);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  getNodeById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const node = await this.nodeService.getNodeById(id);
      
      if (!node) {
        res.status(404).json({ error: 'Node not found' });
        return;
      }
      
      res.json(node);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
}
```

3. **Add Validation Schema:**
```typescript
// src/schemas/node.schema.ts
import Joi from 'joi';

export const nodeSchema = Joi.object({
  nodeId: Joi.string().required(),
  shortName: Joi.string().max(4).required(),
  longName: Joi.string().max(40).required(),
  hardwareModel: Joi.string().valid('TBEAM', 'HELTEC_V3', 'RAK4631').required(),
  role: Joi.string().valid('CLIENT', 'ROUTER', 'REPEATER').required()
});
```

### API Documentation

We use OpenAPI/Swagger for API documentation:

```typescript
// src/docs/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Meshtastic Node Mapper API',
      version: '1.0.0',
      description: 'API for managing Meshtastic mesh network data'
    },
    servers: [
      {
        url: 'http://localhost:3001/api/v1',
        description: 'Development server'
      }
    ]
  },
  apis: ['./src/routes/*.ts']
};

export const specs = swaggerJsdoc(options);
```

## Frontend Development

### Component Structure

We follow a component-based architecture:

```
src/components/
├── Layout/              # Layout components
├── Map/                # Map-related components
├── Nodes/              # Node-specific components
├── Charts/             # Chart and visualization components
├── Forms/              # Form components
└── Common/             # Reusable common components
```

### Creating New Components

1. **Component File Structure:**
```
ComponentName/
├── ComponentName.tsx    # Main component
├── ComponentName.css    # Component styles
├── index.ts            # Export file
└── ComponentName.test.tsx # Tests
```

2. **Component Template:**
```typescript
// src/components/NodeCard/NodeCard.tsx
import React from 'react';
import { Card, CardContent, Typography, Chip } from '@mui/material';
import { Node } from '../../types/node';
import './NodeCard.css';

interface NodeCardProps {
  node: Node;
  onClick?: (node: Node) => void;
}

export const NodeCard: React.FC<NodeCardProps> = ({ node, onClick }) => {
  const handleClick = (): void => {
    onClick?.(node);
  };

  const getStatusColor = (isOnline: boolean): 'success' | 'error' => {
    return isOnline ? 'success' : 'error';
  };

  return (
    <Card className="node-card" onClick={handleClick}>
      <CardContent>
        <Typography variant="h6" component="h3">
          {node.shortName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {node.longName}
        </Typography>
        <Chip
          label={node.isOnline ? 'Online' : 'Offline'}
          color={getStatusColor(node.isOnline)}
          size="small"
        />
      </CardContent>
    </Card>
  );
};
```

3. **Export File:**
```typescript
// src/components/NodeCard/index.ts
export { NodeCard } from './NodeCard';
export type { NodeCardProps } from './NodeCard';
```

### State Management

We use Redux Toolkit for state management:

```typescript
// src/store/slices/nodeSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Node } from '../../types/node';
import { nodeApi } from '../../services/api';

interface NodeState {
  nodes: Node[];
  selectedNode: Node | null;
  loading: boolean;
  error: string | null;
}

const initialState: NodeState = {
  nodes: [],
  selectedNode: null,
  loading: false,
  error: null
};

export const fetchNodes = createAsyncThunk(
  'nodes/fetchNodes',
  async (filters?: Record<string, any>) => {
    const response = await nodeApi.getAll(filters);
    return response.data;
  }
);

const nodeSlice = createSlice({
  name: 'nodes',
  initialState,
  reducers: {
    selectNode: (state, action: PayloadAction<Node>) => {
      state.selectedNode = action.payload;
    },
    clearSelectedNode: (state) => {
      state.selectedNode = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNodes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNodes.fulfilled, (state, action) => {
        state.loading = false;
        state.nodes = action.payload;
      })
      .addCase(fetchNodes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch nodes';
      });
  }
});

export const { selectNode, clearSelectedNode } = nodeSlice.actions;
export default nodeSlice.reducer;
```

## Database Development

### Schema Management

We use Prisma for database schema management:

```typescript
// prisma/schema.prisma
model Node {
  id                  String    @id @default(cuid())
  nodeId              String    @unique
  hexId               String    @unique
  shortName           String?
  longName            String?
  hardwareModel       String?
  role                NodeRole  @default(CLIENT)
  isOnline            Boolean   @default(false)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  // Relations
  positions         Position[]
  telemetryReadings TelemetryReading[]
  
  @@map("nodes")
}
```

### Migrations

```bash
# Create new migration
npx prisma migrate dev --name add_new_field

# Deploy migrations to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

### Repository Pattern

```typescript
// src/database/repositories/node.repository.ts
import { PrismaClient, Node, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';

export class NodeRepository extends BaseRepository<Node> {
  constructor(prisma?: PrismaClient) {
    super(prisma);
  }

  async findByNodeId(nodeId: string): Promise<Node | null> {
    return this.prisma.node.findUnique({
      where: { nodeId },
      include: {
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1
        },
        telemetryReadings: {
          orderBy: { timestamp: 'desc' },
          take: 10
        }
      }
    });
  }

  async findActiveNodes(): Promise<Node[]> {
    return this.prisma.node.findMany({
      where: {
        isOnline: true,
        lastSeen: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      include: {
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });
  }
}
```

## Contributing Guidelines

### Pull Request Process

1. **Fork and Clone**: Fork the repository and clone your fork
2. **Create Branch**: Create a feature branch from `main`
3. **Make Changes**: Implement your changes with tests
4. **Test**: Ensure all tests pass
5. **Document**: Update documentation if needed
6. **Submit PR**: Create a pull request with clear description

### Code Review Checklist

- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] New features have appropriate tests
- [ ] Documentation is updated
- [ ] No breaking changes (or properly documented)
- [ ] Performance impact is considered
- [ ] Security implications are reviewed

### Issue Reporting

When reporting issues, please include:

1. **Environment**: OS, Node.js version, Docker version
2. **Steps to Reproduce**: Clear steps to reproduce the issue
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Logs**: Relevant log output
6. **Screenshots**: If applicable

## Deployment

### Development Deployment

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Run in development mode
npm run dev
```

### Production Deployment

```bash
# Build production images
docker-compose build

# Start production environment
docker-compose up -d

# Monitor logs
docker-compose logs -f
```

### CI/CD Pipeline

We use GitHub Actions for continuous integration:

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Run integration tests
      run: npm run test:integration
```

## Performance Considerations

### Backend Optimization

1. **Database Indexing**: Ensure proper indexes for queries
2. **Connection Pooling**: Use connection pooling for database
3. **Caching**: Implement Redis caching for frequently accessed data
4. **Rate Limiting**: Implement rate limiting for API endpoints

### Frontend Optimization

1. **Code Splitting**: Use React.lazy for route-based code splitting
2. **Memoization**: Use React.memo and useMemo for expensive operations
3. **Virtual Scrolling**: For large lists of nodes
4. **Image Optimization**: Optimize map tiles and icons

### Monitoring

```typescript
// src/middleware/monitoring.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const performanceMonitoring = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};
```

This developer guide provides a comprehensive foundation for contributing to the Meshtastic Node Mapper project. For specific questions or clarifications, please refer to the project's GitHub issues or discussions.