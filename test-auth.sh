#!/bin/bash

BASE_URL="http://localhost:3000"

echo "========================================="
echo "Testing Authentication Endpoints"
echo "========================================="
echo ""

echo "1. Testing Registration..."
REGISTER_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }')

HTTP_STATUS=$(echo "$REGISTER_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$REGISTER_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" = "201" ]; then
  echo "✓ Registration successful"
else
  echo "✗ Registration failed"
fi
echo ""

echo "2. Testing /api/auth/me (should be authenticated)..."
ME_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/auth/me" \
  -b cookies.txt)

HTTP_STATUS=$(echo "$ME_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$ME_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ Session valid"
else
  echo "✗ Session invalid"
fi
echo ""

echo "3. Testing Logout..."
LOGOUT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/auth/logout" \
  -b cookies.txt \
  -c cookies2.txt)

HTTP_STATUS=$(echo "$LOGOUT_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LOGOUT_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ Logout successful"
else
  echo "✗ Logout failed"
fi
echo ""

echo "4. Testing /api/auth/me after logout (should fail)..."
ME_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/auth/me" \
  -b cookies2.txt)

HTTP_STATUS=$(echo "$ME_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$ME_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" = "401" ]; then
  echo "✓ Correctly unauthenticated after logout"
else
  echo "✗ Should be unauthenticated"
fi
echo ""

echo "5. Testing Login..."
LOGIN_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -c cookies3.txt \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "rememberMe": false
  }')

HTTP_STATUS=$(echo "$LOGIN_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ Login successful"
else
  echo "✗ Login failed"
fi
echo ""

echo "6. Testing Login with wrong password (should fail)..."
WRONG_LOGIN_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "WrongPassword123!",
    "rememberMe": false
  }')

HTTP_STATUS=$(echo "$WRONG_LOGIN_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$WRONG_LOGIN_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" = "401" ]; then
  echo "✓ Correctly rejected wrong password"
else
  echo "✗ Should reject wrong password"
fi
echo ""

echo "7. Testing Registration with existing email (should fail)..."
DUPLICATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "AnotherPassword123!",
    "name": "Another User"
  }')

HTTP_STATUS=$(echo "$DUPLICATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$DUPLICATE_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" = "409" ]; then
  echo "✓ Correctly rejected duplicate email"
else
  echo "✗ Should reject duplicate email"
fi
echo ""

echo "8. Testing Registration with weak password (should fail)..."
WEAK_PASSWORD_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "weak@example.com",
    "password": "password",
    "name": "Weak User"
  }')

HTTP_STATUS=$(echo "$WEAK_PASSWORD_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$WEAK_PASSWORD_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" = "400" ]; then
  echo "✓ Correctly rejected weak password"
else
  echo "✗ Should reject weak password"
fi
echo ""

rm -f cookies.txt cookies2.txt cookies3.txt

echo "========================================="
echo "Test completed!"
echo "========================================="
