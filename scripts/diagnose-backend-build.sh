#!/bin/bash

# Backend Build Diagnostic Script
# Checks for issues with backend Docker build

echo "=========================================="
echo "Backend Build Diagnostics"
echo "=========================================="
echo ""

echo "1. Checking Dockerfile.prod content..."
echo "   Looking for OpenSSL references:"
grep -n "openssl" backend/Dockerfile.prod || echo "   No openssl references found"
echo ""

echo "2. Checking Node base image..."
echo "   Current base image:"
grep "FROM" backend/Dockerfile.prod | head -1
echo ""

echo "3. Checking for cached images..."
echo "   Backend images:"
docker images | grep -E "backend|REPOSITORY" || echo "   No backend images found"
echo ""

echo "4. Checking Docker build cache..."
docker system df
echo ""

echo "5. Checking Alpine version in Node 18 image..."
docker run --rm node:18-alpine cat /etc/alpine-release 2>/dev/null || echo "   Could not determine Alpine version"
echo ""

echo "6. Checking available OpenSSL packages in Alpine..."
echo "   Searching for openssl packages..."
docker run --rm node:18-alpine apk search openssl 2>/dev/null || echo "   Could not query packages"
echo ""

echo "=========================================="
echo "Diagnostic Complete"
echo "=========================================="
echo ""
echo "If you see 'openssl1.1-compat' in the Dockerfile, it needs to be removed."
echo "Alpine 3.21+ only supports OpenSSL 3.x (package name: 'openssl')"
echo ""
echo "To fix:"
echo "  1. Run: ./scripts/fix-backend-openssl.sh"
echo "  2. This will clear cache and rebuild with correct OpenSSL version"
