#!/bin/bash

# Build and push Docker images to Docker Hub
# Usage: ./scripts/build-and-push.sh [version]

set -e

# Configuration
REGISTRY="${DOCKER_REGISTRY:-meshtastic}"
VERSION="${1:-latest}"

echo "Building and pushing Meshtastic Node Mapper images..."
echo "Registry: $REGISTRY"
echo "Version: $VERSION"
echo ""

# Build backend image
echo "Building backend image..."
docker build \
  -f backend/Dockerfile.prod \
  -t ${REGISTRY}/node-mapper-backend:${VERSION} \
  -t ${REGISTRY}/node-mapper-backend:latest \
  --build-arg NODE_ENV=production \
  ./backend

echo "Pushing backend image..."
docker push ${REGISTRY}/node-mapper-backend:${VERSION}
docker push ${REGISTRY}/node-mapper-backend:latest

# Build frontend image
echo "Building frontend image..."
docker build \
  -f frontend/Dockerfile.prod \
  -t ${REGISTRY}/node-mapper-frontend:${VERSION} \
  -t ${REGISTRY}/node-mapper-frontend:latest \
  --build-arg NODE_ENV=production \
  --build-arg REACT_APP_API_URL=/api \
  --build-arg REACT_APP_WS_URL=/socket.io \
  ./frontend

echo "Pushing frontend image..."
docker push ${REGISTRY}/node-mapper-frontend:${VERSION}
docker push ${REGISTRY}/node-mapper-frontend:latest

echo ""
echo "✅ Images built and pushed successfully!"
echo ""
echo "Backend: ${REGISTRY}/node-mapper-backend:${VERSION}"
echo "Frontend: ${REGISTRY}/node-mapper-frontend:${VERSION}"
echo ""
echo "Users can now pull these images with:"
echo "  docker compose -f docker-compose.images.yml pull"
