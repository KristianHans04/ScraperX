#!/bin/bash

BASE_URL="http://localhost:3000"

echo "========================================="
echo "Testing Account Locking Feature"
echo "========================================="
echo ""

# Attempt 5 failed logins to trigger account lock
echo "Attempting 5 failed logins to trigger account lock..."

for i in {1..5}; do
  echo "Attempt $i..."
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "WrongPassword",
      "rememberMe": false
    }')
  
  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
  
  echo "Status: $HTTP_STATUS"
  echo "Response: $RESPONSE_BODY" | jq -c '.'
  echo ""
done

echo "Now attempting login with correct password (should be locked)..."
LOCKED_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "rememberMe": false
  }')

HTTP_STATUS=$(echo "$LOCKED_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LOCKED_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response: $RESPONSE_BODY" | jq '.'
echo ""

if [ "$HTTP_STATUS" = "403" ]; then
  echo "✓ Account correctly locked after 5 failed attempts"
else
  echo "✗ Account should be locked"
fi
echo ""

echo "Checking database for lock status..."
psql "postgresql://kristianhans@localhost:5432/scraperx" -c "SELECT email, login_failed_count, locked_until FROM users WHERE email = 'test@example.com';" 2>&1 | grep -A2 "email"
echo ""

echo "========================================="
echo "Test completed!"
echo "========================================="
