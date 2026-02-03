#!/bin/bash

echo "=== Testing Traceroutes API Endpoint ==="
echo ""

# Test the API endpoint
echo "Testing: GET /api/v1/links/traceroutes"
echo ""

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:3001/api/v1/links/traceroutes?limit=5")

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $http_status"
echo ""

if [ "$http_status" = "200" ]; then
    echo "✅ Success! Response:"
    echo "$body" | jq '.'
else
    echo "❌ Error! Response:"
    echo "$body"
fi

echo ""
echo "=== Test Complete ==="
