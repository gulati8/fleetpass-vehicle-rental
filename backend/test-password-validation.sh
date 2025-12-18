#!/bin/bash

echo "Testing password validation..."
echo ""

test_password() {
  local desc=$1
  local password=$2
  local should_pass=$3

  echo "Testing: $desc"
  echo "Password: '$password'"

  RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/signup \
    -H "Content-Type: application/json" \
    -d '{
      "email":"test'$RANDOM'@test.com",
      "password":"'"$password"'",
      "firstName":"Test",
      "lastName":"User",
      "organizationName":"Test Org"
    }')

  if echo "$RESPONSE" | grep -q "error\|message"; then
    if [ "$should_pass" = "false" ]; then
      echo "✅ Correctly rejected"
    else
      echo "❌ Should have passed but was rejected"
      echo "Response: $RESPONSE"
    fi
  else
    if [ "$should_pass" = "true" ]; then
      echo "✅ Correctly accepted"
    else
      echo "❌ Should have been rejected but was accepted"
      echo "Response: $RESPONSE"
    fi
  fi

  echo ""
}

# Weak passwords (should be rejected)
test_password "Short password" "Pass1!" "false"
test_password "No uppercase" "password123!" "false"
test_password "No lowercase" "PASSWORD123!" "false"
test_password "No number" "Password!" "false"
test_password "No special char" "Password123" "false"
test_password "Common password" "password123456" "false"
test_password "Contains 'password'" "MyPassword123!" "false"

# Strong passwords (should be accepted)
test_password "Strong password" "MyFleet\$Pass2024!" "true"
test_password "Another strong" "Secure#Rental789!" "true"

echo "Password validation testing complete."
