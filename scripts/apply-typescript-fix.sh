#!/bin/bash

# Quick fix for TypeScript compilation error

echo "Applying TypeScript fix..."

# Fix the type annotation on line 85
sed -i.bak 's/let networks = \[\];/let networks: any[] = [];/' backend/src/index.ts

if [ $? -eq 0 ]; then
    echo "✓ TypeScript fix applied"
    echo ""
    echo "Now run: ./scripts/force-schema-creation.sh"
else
    echo "✗ Failed to apply fix"
    echo ""
    echo "Manual fix: Edit backend/src/index.ts line 85"
    echo "Change: let networks = [];"
    echo "To:     let networks: any[] = [];"
fi
