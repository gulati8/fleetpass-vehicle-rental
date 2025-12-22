#!/bin/bash

# E2E Idempotency Test Script
# Tests all idempotency scenarios for the FleetPass API

set -e

BASE_URL="http://localhost:3001/api/v1"
IDEMPOTENCY_KEY=$(uuidgen)

echo "=================================="
echo "Idempotency E2E Tests"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

function log_error() {
  echo -e "${RED}✗${NC} $1"
}

function log_info() {
  echo -e "${YELLOW}ℹ${NC} $1"
}

# Test 1: Missing Idempotency-Key should fail
echo "Test 1: POST without Idempotency-Key header"
log_info "Expected: 400 BadRequest"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${BASE_URL}/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "organizationName": "Test Org"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "400" ]; then
  log_success "Correctly rejected request without Idempotency-Key"
else
  log_error "Expected 400, got $HTTP_CODE"
  echo "Response: $BODY"
fi

echo ""

# Test 2: Invalid Idempotency-Key format should fail
echo "Test 2: POST with invalid Idempotency-Key format"
log_info "Expected: 400 BadRequest"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${BASE_URL}/auth/signup" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: short" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "organizationName": "Test Org"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "400" ]; then
  log_success "Correctly rejected invalid Idempotency-Key format"
else
  log_error "Expected 400, got $HTTP_CODE"
  echo "Response: $BODY"
fi

echo ""

# Test 3: First request with valid key should succeed
echo "Test 3: First POST with valid Idempotency-Key"
log_info "Expected: 201 Created (or appropriate success code)"
RANDOM_EMAIL="test-$(date +%s)@example.com"
IDEMPOTENCY_KEY=$(uuidgen)

RESPONSE1=$(curl -s -w "\n%{http_code}" -X POST \
  "${BASE_URL}/auth/signup" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{
    \"email\": \"$RANDOM_EMAIL\",
    \"password\": \"Test123!@#\",
    \"organizationName\": \"Test Org\"
  }")

HTTP_CODE1=$(echo "$RESPONSE1" | tail -n1)
BODY1=$(echo "$RESPONSE1" | head -n-1)

if [ "$HTTP_CODE1" = "201" ] || [ "$HTTP_CODE1" = "200" ]; then
  log_success "First request succeeded with code $HTTP_CODE1"
else
  log_error "Expected 201 or 200, got $HTTP_CODE1"
  echo "Response: $BODY1"
fi

echo ""

# Test 4: Duplicate request with same key should return cached response
echo "Test 4: Duplicate POST with same Idempotency-Key"
log_info "Expected: Same response as Test 3, no duplicate data"
sleep 1 # Give Redis a moment to cache

RESPONSE2=$(curl -s -w "\n%{http_code}" -X POST \
  "${BASE_URL}/auth/signup" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{
    \"email\": \"$RANDOM_EMAIL\",
    \"password\": \"Test123!@#\",
    \"organizationName\": \"Test Org\"
  }")

HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
BODY2=$(echo "$RESPONSE2" | head -n-1)

if [ "$HTTP_CODE2" = "$HTTP_CODE1" ]; then
  log_success "Duplicate request returned same status code: $HTTP_CODE2"

  # Compare response bodies (ignoring whitespace differences)
  if [ "$(echo $BODY1 | jq -c .)" = "$(echo $BODY2 | jq -c .)" ]; then
    log_success "Response bodies are identical (cached response)"
  else
    log_error "Response bodies differ (cache miss)"
    echo "First:  $BODY1"
    echo "Second: $BODY2"
  fi
else
  log_error "Expected $HTTP_CODE1, got $HTTP_CODE2"
  echo "Response: $BODY2"
fi

echo ""

# Test 5: GET requests should not require Idempotency-Key
echo "Test 5: GET request without Idempotency-Key"
log_info "Expected: Success (GET is naturally idempotent)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "${BASE_URL}/health")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  log_success "GET request succeeded without Idempotency-Key"
else
  log_error "Expected 200, got $HTTP_CODE"
fi

echo ""

# Test 6: Different endpoints should use scoped keys
echo "Test 6: Same Idempotency-Key on different endpoint"
log_info "Expected: Keys are scoped to organization, not globally"
log_info "(This test would need authentication setup to properly verify)"

echo ""
echo "=================================="
echo "Summary"
echo "=================================="
echo "All idempotency tests completed."
echo "Review the output above for any failures."
echo ""
echo "Note: Tests 3-4 created a user with email: $RANDOM_EMAIL"
echo "Idempotency-Key used: $IDEMPOTENCY_KEY"
