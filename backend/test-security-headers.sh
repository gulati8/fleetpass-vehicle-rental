#!/bin/bash

echo "Testing security headers on backend API..."
echo ""

# Wait for the server to be ready
echo "Checking if server is running..."
if ! curl -s http://localhost:3001/api/v1 > /dev/null 2>&1; then
  echo "⚠️  Warning: Server not responding at http://localhost:3001"
  echo "Please start the backend with: cd backend && npm run start:dev"
  exit 1
fi

echo "Server is running. Fetching headers..."
echo ""

RESPONSE=$(curl -sI http://localhost:3001/api/v1)

echo "=== Raw Response Headers ==="
echo "$RESPONSE"
echo ""
echo "=== Security Headers Check ==="

check_header() {
  local header=$1
  if echo "$RESPONSE" | grep -qi "$header"; then
    echo "✅ $header present"
  else
    echo "❌ $header MISSING"
  fi
}

check_header "X-Frame-Options"
check_header "Strict-Transport-Security"
check_header "X-Content-Type-Options"
check_header "X-XSS-Protection"
check_header "Referrer-Policy"
check_header "Content-Security-Policy"

echo ""
echo "=== Checking X-Powered-By removed ==="
if echo "$RESPONSE" | grep -qi "X-Powered-By"; then
  echo "❌ X-Powered-By still present (should be hidden)"
else
  echo "✅ X-Powered-By removed"
fi

echo ""
echo "=== Security Headers Test Complete ==="
