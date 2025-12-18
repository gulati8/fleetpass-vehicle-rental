#!/bin/bash

# Test script to verify rate limiting on authentication endpoints

echo "========================================"
echo "Rate Limiting Test - FleetPass API"
echo "========================================"
echo ""

# Test 1: Login endpoint rate limiting
echo "Test 1: Login Endpoint Rate Limiting"
echo "Making 7 rapid login attempts (should block after 5)..."
echo ""

for i in {1..7}; do
  RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpassword"}')

  HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

  echo "Attempt $i: HTTP $HTTP_CODE"

  if [ "$HTTP_CODE" -eq 429 ]; then
    echo "✅ Rate limit triggered successfully!"
    echo "Response body:"
    echo "$BODY" | jq '.'
    echo ""
    break
  elif [ "$HTTP_CODE" -eq 401 ]; then
    echo "   (Invalid credentials, as expected)"
  fi

  sleep 0.3
done

echo ""
echo "========================================"
echo ""

# Test 2: Signup endpoint rate limiting
echo "Test 2: Signup Endpoint Rate Limiting"
echo "Making 7 rapid signup attempts (should block after 5)..."
echo ""

for i in {1..7}; do
  RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST http://localhost:3001/api/v1/auth/signup \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test$i@example.com\",\"password\":\"Test123!@#\",\"name\":\"Test User\"}")

  HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

  echo "Attempt $i: HTTP $HTTP_CODE"

  if [ "$HTTP_CODE" -eq 429 ]; then
    echo "✅ Rate limit triggered successfully!"
    echo "Response body:"
    echo "$BODY" | jq '.'
    echo ""
    break
  elif [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 400 ]; then
    echo "   (Request processed normally)"
  fi

  sleep 0.3
done

echo ""
echo "========================================"
echo ""

# Test 3: Check rate limit headers
echo "Test 3: Verify Rate Limit Headers"
echo "Sending a single request to check headers..."
echo ""

curl -I -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' 2>&1 | grep -i "ratelimit"

echo ""
echo "========================================"
echo "Test complete!"
echo ""
echo "Expected results:"
echo "  - Login attempts should be blocked after 5 tries"
echo "  - Signup attempts should be blocked after 5 tries"
echo "  - X-RateLimit-* headers should be present"
echo "========================================"
