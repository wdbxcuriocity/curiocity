#!/bin/bash

# Load environment variables
source .env.cloudflare.local

echo "Testing OAuth Flow with KV Storage"
echo "================================="

# 1. Test Session Creation
echo "1. Testing Session Creation..."
TEST_SESSION_TOKEN="test-oauth-session-$(date +%s)"
TEST_USER_ID="test-user-$(date +%s)"

wrangler kv:key put --namespace-id=$KV_NAMESPACE_ID "sessions/$TEST_SESSION_TOKEN" "{
  \"userId\": \"$TEST_USER_ID\",
  \"expires\": \"$(date -v+1d -u +%Y-%m-%dT%H:%M:%S.000Z)\",
  \"sessionToken\": \"$TEST_SESSION_TOKEN\"
}"

# 2. Test User Creation
echo "2. Testing User Creation..."
wrangler kv:key put --namespace-id=$KV_NAMESPACE_ID "users/$TEST_USER_ID" "{
  \"id\": \"$TEST_USER_ID\",
  \"name\": \"Test OAuth User\",
  \"email\": \"test-oauth@example.com\",
  \"emailVerified\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
  \"image\": \"https://example.com/avatar.jpg\"
}"

# 3. Create Email Index
echo "3. Testing Email Index Creation..."
wrangler kv:key put --namespace-id=$KV_NAMESPACE_ID "emails/test-oauth@example.com" "$TEST_USER_ID"

# 4. Test Account Linking
echo "4. Testing Account Linking..."
TEST_PROVIDER="google"
TEST_PROVIDER_ID="test-provider-id-$(date +%s)"
wrangler kv:key put --namespace-id=$KV_NAMESPACE_ID "accounts/$TEST_PROVIDER/$TEST_PROVIDER_ID" "$TEST_USER_ID"

# 5. Verify Session
echo "5. Verifying Session Data..."
wrangler kv:key get --namespace-id=$KV_NAMESPACE_ID "sessions/$TEST_SESSION_TOKEN"

# 6. Verify User
echo "6. Verifying User Data..."
wrangler kv:key get --namespace-id=$KV_NAMESPACE_ID "users/$TEST_USER_ID"

# 7. Verify Email Index
echo "7. Verifying Email Index..."
wrangler kv:key get --namespace-id=$KV_NAMESPACE_ID "emails/test-oauth@example.com"

# 8. Verify Account Link
echo "8. Verifying Account Link..."
wrangler kv:key get --namespace-id=$KV_NAMESPACE_ID "accounts/$TEST_PROVIDER/$TEST_PROVIDER_ID"

# Cleanup
echo "9. Cleaning up test data..."
wrangler kv:key delete --namespace-id=$KV_NAMESPACE_ID "sessions/$TEST_SESSION_TOKEN"
wrangler kv:key delete --namespace-id=$KV_NAMESPACE_ID "users/$TEST_USER_ID"
wrangler kv:key delete --namespace-id=$KV_NAMESPACE_ID "emails/test-oauth@example.com"
wrangler kv:key delete --namespace-id=$KV_NAMESPACE_ID "accounts/$TEST_PROVIDER/$TEST_PROVIDER_ID"

echo "Test complete!" 