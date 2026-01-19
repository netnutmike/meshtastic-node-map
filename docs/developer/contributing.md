# Contributing Guidelines

Thank you for your interest in contributing to Meshtastic Node Mapper! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful, constructive, and professional in all interactions.

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check the [existing issues](https://github.com/your-org/meshtastic-node-mapper/issues) to avoid duplicates
2. Verify the bug exists in the latest version
3. Collect relevant information (logs, screenshots, steps to reproduce)

**Bug Report Template:**
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g. Ubuntu 22.04]
 - Docker version: [e.g. 20.10.21]
 - Browser: [e.g. Chrome 120]
 - Version: [e.g. 1.0.0]

**Additional context**
Any other relevant information.
```

### Suggesting Features

We welcome feature suggestions! Before creating a feature request:
1. Check if the feature already exists or is planned
2. Consider if it fits the project's scope and goals
3. Think about how it would benefit users

**Feature Request Template:**
```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Other solutions or features you've considered.

**Additional context**
Mockups, examples, or other relevant information.
```

### Contributing Code

#### Getting Started

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/meshtastic-node-mapper.git
   cd meshtastic-node-mapper
   ```

2. **Set up development environment**
   ```bash
   # Install dependencies
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   cd ..
   
   # Start development services
   docker compose -f docker-compose.dev.yml up -d
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

#### Development Workflow

1. **Make your changes**
   - Write clean, readable code
   - Follow the project's code style
   - Add tests for new features
   - Update documentation as needed

2. **Test your changes**
   ```bash
   # Run linting
   npm run lint
   
   # Run tests
   npm test
   
   # Run integration tests
   npm run test:integration
   
   # Check test coverage
   npm run test:coverage
   ```

3. **Commit your changes**
   ```bash
   # Stage your changes
   git add .
   
   # Commit with a descriptive message
   git commit -m "feat: add new feature description"
   ```

4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill out the PR template
   - Submit the pull request

#### Pull Request Guidelines

**Before submitting:**
- [ ] Code follows the project's style guidelines
- [ ] All tests pass
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] No merge conflicts with main branch

**PR Description should include:**
- What changes were made and why
- How to test the changes
- Screenshots (for UI changes)
- Related issue numbers (e.g., "Closes #123")

**PR Review Process:**
1. Automated checks run (linting, tests, build)
2. Maintainers review the code
3. Feedback is provided if changes are needed
4. Once approved, PR is merged

## Code Style Guidelines

### TypeScript/JavaScript

**General Rules:**
- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

**Example:**
```typescript
/**
 * Retrieves active nodes from the database
 * @param filters - Optional filters to apply
 * @returns Promise resolving to array of nodes
 */
async function getActiveNodes(filters?: NodeFilters): Promise<Node[]> {
  const nodes = await nodeRepository.findActive(filters);
  return nodes.filter(node => node.isOnline);
}
```

**Naming Conventions:**
- **Variables/Functions**: camelCase (`getUserData`, `nodeCount`)
- **Classes/Interfaces**: PascalCase (`NodeService`, `IRepository`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`, `API_URL`)
- **Files**: kebab-case (`node-service.ts`, `api-client.ts`)

### React Components

**Component Structure:**
```typescript
import React from 'react';
import { ComponentProps } from './types';
import './Component.css';

/**
 * Component description
 */
export const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // Hooks at the top
  const [state, setState] = useState<string>('');
  
  // Event handlers
  const handleClick = (): void => {
    // Handler logic
  };
  
  // Render
  return (
    <div className="component">
      {/* JSX */}
    </div>
  );
};
```

**Best Practices:**
- Use functional components with hooks
- Extract complex logic into custom hooks
- Memoize expensive computations
- Use TypeScript for props and state
- Keep components focused and reusable

### CSS/Styling

**Conventions:**
- Use CSS modules or styled-components
- Follow BEM naming for CSS classes
- Use CSS variables for theming
- Mobile-first responsive design

**Example:**
```css
.node-card {
  /* Layout */
  display: flex;
  flex-direction: column;
  
  /* Spacing */
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  
  /* Visual */
  background-color: var(--color-surface);
  border-radius: var(--border-radius);
}

.node-card__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}
```

## Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

**Format:**
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates
- `ci`: CI/CD changes
- `build`: Build system changes

**Scope (optional):**
- `api`: Backend API changes
- `ui`: Frontend UI changes
- `db`: Database changes
- `mqtt`: MQTT integration changes
- `docs`: Documentation changes

**Examples:**
```
feat(api): add node filtering by hardware type

fix(ui): resolve map marker clustering issue

docs: update installation guide with Docker Compose v2

test(api): add integration tests for MQTT service

refactor(db): optimize node query performance

chore: update dependencies to latest versions
```

**Breaking Changes:**
```
feat(api)!: change node API response format

BREAKING CHANGE: Node API now returns `nodeId` instead of `id`
```

## Testing Guidelines

### Unit Tests

**What to test:**
- Individual functions and methods
- Component rendering and behavior
- Edge cases and error handling
- Business logic

**Example:**
```typescript
describe('NodeService', () => {
  describe('getActiveNodes', () => {
    it('should return only online nodes', async () => {
      // Arrange
      const mockNodes = [
        { id: '1', isOnline: true },
        { id: '2', isOnline: false }
      ];
      jest.spyOn(nodeRepository, 'findAll').mockResolvedValue(mockNodes);
      
      // Act
      const result = await nodeService.getActiveNodes();
      
      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });
});
```

### Integration Tests

**What to test:**
- API endpoints end-to-end
- Database operations
- External service integrations
- Multi-component interactions

**Example:**
```typescript
describe('GET /api/v1/nodes', () => {
  it('should return all nodes', async () => {
    // Arrange
    await createTestNodes(3);
    
    // Act
    const response = await request(app)
      .get('/api/v1/nodes')
      .expect(200);
    
    // Assert
    expect(response.body.data).toHaveLength(3);
  });
});
```

### Property-Based Tests

**What to test:**
- System properties that should always hold
- Input validation across many cases
- Data consistency

**Example:**
```typescript
import fc from 'fast-check';

describe('Node validation', () => {
  it('should validate any valid node structure', () => {
    fc.assert(fc.property(
      fc.record({
        nodeId: fc.string({ minLength: 1 }),
        shortName: fc.string({ maxLength: 4 }),
        isOnline: fc.boolean()
      }),
      (node) => {
        const result = validateNode(node);
        expect(result.isValid).toBe(true);
      }
    ));
  });
});
```

### Test Coverage

**Minimum Requirements:**
- **Unit Tests**: 80% coverage
- **Integration Tests**: Critical paths covered
- **Property Tests**: Key invariants tested

**Running Coverage:**
```bash
npm run test:coverage
```

## Documentation Guidelines

### Code Documentation

**JSDoc for Functions:**
```typescript
/**
 * Calculates the distance between two geographic points
 * @param point1 - First point with latitude and longitude
 * @param point2 - Second point with latitude and longitude
 * @returns Distance in kilometers
 * @throws {Error} If coordinates are invalid
 * @example
 * const distance = calculateDistance(
 *   { lat: 40.7128, lng: -74.0060 },
 *   { lat: 34.0522, lng: -118.2437 }
 * );
 */
function calculateDistance(point1: Point, point2: Point): number {
  // Implementation
}
```

**README Files:**
- Every major directory should have a README
- Explain the purpose and structure
- Provide usage examples
- Link to related documentation

### User Documentation

When adding features, update:
- **User Guide**: How to use the feature
- **API Guide**: New endpoints or changes
- **Installation Guide**: New requirements
- **Troubleshooting**: Common issues

## Review Process

### For Contributors

**After submitting a PR:**
1. Automated checks run (CI/CD)
2. Maintainers review within 1-3 days
3. Address feedback promptly
4. Request re-review when ready
5. PR is merged when approved

**Responding to Feedback:**
- Be open to suggestions
- Ask questions if unclear
- Make requested changes
- Update the PR description if scope changes

### For Reviewers

**Review Checklist:**
- [ ] Code follows style guidelines
- [ ] Tests are adequate and passing
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance impact is acceptable
- [ ] Breaking changes are documented
- [ ] Commit messages follow conventions

**Providing Feedback:**
- Be constructive and respectful
- Explain the reasoning behind suggestions
- Distinguish between required changes and suggestions
- Approve when ready or request changes

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features, backwards compatible
- **Patch** (0.0.1): Bug fixes, backwards compatible

### Release Checklist

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create release branch
4. Run full test suite
5. Build and test Docker images
6. Create GitHub release
7. Tag the release
8. Deploy to production

## Getting Help

### Resources

- **Documentation**: Check the [docs](../) directory
- **Issues**: Search [existing issues](https://github.com/your-org/meshtastic-node-mapper/issues)
- **Discussions**: Ask in [GitHub Discussions](https://github.com/your-org/meshtastic-node-mapper/discussions)
- **Discord**: Join our community server (if available)

### Asking Questions

**Good Questions Include:**
- What you're trying to accomplish
- What you've already tried
- Relevant code snippets or error messages
- Your environment details

**Example:**
```
I'm trying to add a new API endpoint for exporting telemetry data.
I've created the route and controller, but I'm not sure how to
implement pagination for large datasets. I've looked at the nodes
endpoint but it uses a different approach. What's the recommended
pattern for paginating time-series data?

Environment: Node.js 18, PostgreSQL 15, TimescaleDB
```

## Recognition

Contributors are recognized in:
- GitHub contributors list
- CONTRIBUTORS.md file
- Release notes
- Project README

Thank you for contributing to Meshtastic Node Mapper! 🎉

---

**Questions?** Open a [discussion](https://github.com/your-org/meshtastic-node-mapper/discussions) or reach out to the maintainers.
