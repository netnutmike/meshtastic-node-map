#!/bin/bash

# Test Encryption Key Helper Script
# This script helps you verify if your encryption keys are correct

set -e

echo "==================================="
echo "Meshtastic Encryption Key Tester"
echo "==================================="
echo ""

# Check if a key was provided
if [ -z "$1" ]; then
    echo "Usage: $0 <base64-encoded-key>"
    echo ""
    echo "Example:"
    echo "  $0 AQ=="
    echo "  $0 1PG7OiApB3XvvX7g8kYzDYQD+CW+3Oi+Qs/LoIWh/gg="
    echo ""
    echo "This will decode the key and show its length."
    exit 1
fi

KEY="$1"

echo "Testing key: $KEY"
echo ""

# Decode the key
echo "Decoding base64..."
DECODED=$(echo "$KEY" | base64 -d 2>/dev/null || echo "ERROR")

if [ "$DECODED" = "ERROR" ]; then
    echo "❌ ERROR: Invalid base64 encoding"
    echo ""
    echo "Make sure your key is properly base64-encoded."
    exit 1
fi

# Get the length
LENGTH=$(echo -n "$DECODED" | wc -c | tr -d ' ')

echo "✅ Key decoded successfully"
echo "📏 Key length: $LENGTH bytes"
echo ""

# Show hex dump
echo "Hex dump of key:"
echo "$KEY" | base64 -d | xxd
echo ""

# Provide guidance
if [ "$LENGTH" -lt 32 ]; then
    echo "ℹ️  Note: Key is shorter than 32 bytes."
    echo "   The encryption service will automatically pad it to 32 bytes with zeros."
    echo "   Padded length: 32 bytes"
elif [ "$LENGTH" -eq 32 ]; then
    echo "✅ Key is exactly 32 bytes (perfect for AES-256)"
else
    echo "⚠️  Warning: Key is longer than 32 bytes."
    echo "   The encryption service will truncate it to 32 bytes."
fi

echo ""
echo "To use this key in your config, add it to config/app.yml:"
echo ""
echo "encryption:"
echo "  channels:"
echo "    - name: \"YourChannelName\""
echo "      key: \"$KEY\""
echo "      default: true"
echo ""
echo "Then restart the backend:"
echo "  docker-compose restart backend"
echo ""
