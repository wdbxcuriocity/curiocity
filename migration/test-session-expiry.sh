#!/bin/bash

# Load environment variables
source .env.cloudflare.local

echo "Testing Session Expiry"
echo "====================="

# 1. Create an expired session
echo "1. Creating expired session..."
TEST_SESSION_TOKEN="test-expired-session-$(date +%s)"
TEST_USER_ID="test-user-$(date +%s)"

wrangler kv:key put --namespace-id=$KV_NAMESPACE_ID "sessions/$TEST_SESSION_TOKEN" "{
  \"userId\": \"$TEST_USER_ID\",
  \"expires\": \"$(date -v-1d -u +%Y-%m-%dT%H:%M:%S.000Z)\",
  \"sessionToken\": \"$TEST_SESSION_TOKEN\"
}"

# 2. Create a valid session
echo "2. Creating valid session..."
VALID_SESSION_TOKEN="test-valid-session-$(date +%s)"

wrangler kv:key put --namespace-id=$KV_NAMESPACE_ID "sessions/$VALID_SESSION_TOKEN" "{
  \"userId\": \"$TEST_USER_ID\",
  \"expires\": \"$(date -v+1d -u +%Y-%m-%dT%H:%M:%S.000Z)\",
  \"sessionToken\": \"$VALID_SESSION_TOKEN\"
}"

# 3. Create user data
echo "3. Creating test user..."
wrangler kv:key put --namespace-id=$KV_NAMESPACE_ID "users/$TEST_USER_ID" "{
  \"id\": \"$TEST_USER_ID\",
  \"name\": \"Test User\",
  \"email\": \"test@example.com\"
}"

# 4. Verify expired session
echo "4. Verifying expired session..."
echo "Expected: Session should be considered invalid"
wrangler kv:key get --namespace-id=$KV_NAMESPACE_ID "sessions/$TEST_SESSION_TOKEN"

# 5. Verify valid session
echo "5. Verifying valid session..."
echo "Expected: Session should be valid"
wrangler kv:key get --namespace-id=$KV_NAMESPACE_ID "sessions/$VALID_SESSION_TOKEN"

# 6. Test session refresh
echo "6. Testing session refresh..."
REFRESHED_EXPIRES=$(date -v+1d -u +%Y-%m-%dT%H:%M:%S.000Z)
wrangler kv:key put --namespace-id=$KV_NAMESPACE_ID "sessions/$VALID_SESSION_TOKEN" "{
  \"userId\": \"$TEST_USER_ID\",
  \"expires\": \"$REFRESHED_EXPIRES\",
  \"sessionToken\": \"$VALID_SESSION_TOKEN\"
}"

echo "Verifying refreshed session..."
wrangler kv:key get --namespace-id=$KV_NAMESPACE_ID "sessions/$VALID_SESSION_TOKEN"

# Cleanup
echo "7. Cleaning up test data..."
wrangler kv:key delete --namespace-id=$KV_NAMESPACE_ID "sessions/$TEST_SESSION_TOKEN"
wrangler kv:key delete --namespace-id=$KV_NAMESPACE_ID "sessions/$VALID_SESSION_TOKEN"
wrangler kv:key delete --namespace-id=$KV_NAMESPACE_ID "users/$TEST_USER_ID"

echo "Session expiry test complete!" 