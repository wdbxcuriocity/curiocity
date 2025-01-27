#!/bin/bash

# Load environment variables
source .env.cloudflare.local

echo "Testing Account Linking"
echo "======================"

# 1. Create test user
echo "1. Creating test user..."
TEST_USER_ID="test-user-$(date +%s)"
TEST_EMAIL="test@example.com"

wrangler kv:key put --namespace-id=$KV_NAMESPACE_ID "users/$TEST_USER_ID" "{
  \"id\": \"$TEST_USER_ID\",
  \"name\": \"Test User\",
  \"email\": \"$TEST_EMAIL\"
}"

# Create email index
echo "Creating email index..."
wrangler kv:key put --namespace-id=$KV_NAMESPACE_ID "emails/$TEST_EMAIL" "$TEST_USER_ID"

# 2. Link Google account
echo "2. Linking Google account..."
GOOGLE_PROVIDER_ID="google-id-$(date +%s)"
wrangler kv:key put --namespace-id=$KV_NAMESPACE_ID "accounts/google/$GOOGLE_PROVIDER_ID" "$TEST_USER_ID"

# 3. Link GitHub account
echo "3. Linking GitHub account..."
GITHUB_PROVIDER_ID="github-id-$(date +%s)"
wrangler kv:key put --namespace-id=$KV_NAMESPACE_ID "accounts/github/$GITHUB_PROVIDER_ID" "$TEST_USER_ID"

# 4. Verify user data
echo "4. Verifying user data..."
wrangler kv:key get --namespace-id=$KV_NAMESPACE_ID "users/$TEST_USER_ID"

# 5. Verify account links
echo "5. Verifying Google account link..."
wrangler kv:key get --namespace-id=$KV_NAMESPACE_ID "accounts/google/$GOOGLE_PROVIDER_ID"

echo "Verifying GitHub account link..."
wrangler kv:key get --namespace-id=$KV_NAMESPACE_ID "accounts/github/$GITHUB_PROVIDER_ID"

# 6. Test unlinking account
echo "6. Testing account unlinking..."
echo "Unlinking GitHub account..."
wrangler kv:key delete --namespace-id=$KV_NAMESPACE_ID "accounts/github/$GITHUB_PROVIDER_ID"

echo "Verifying GitHub account unlinked..."
wrangler kv:key get --namespace-id=$KV_NAMESPACE_ID "accounts/github/$GITHUB_PROVIDER_ID"

echo "Verifying Google account still linked..."
wrangler kv:key get --namespace-id=$KV_NAMESPACE_ID "accounts/google/$GOOGLE_PROVIDER_ID"

# 7. Test email lookup
echo "7. Testing email lookup..."
wrangler kv:key get --namespace-id=$KV_NAMESPACE_ID "emails/$TEST_EMAIL"

# Cleanup
echo "8. Cleaning up test data..."
wrangler kv:key delete --namespace-id=$KV_NAMESPACE_ID "users/$TEST_USER_ID"
wrangler kv:key delete --namespace-id=$KV_NAMESPACE_ID "emails/$TEST_EMAIL"
wrangler kv:key delete --namespace-id=$KV_NAMESPACE_ID "accounts/google/$GOOGLE_PROVIDER_ID"

echo "Account linking test complete!" 