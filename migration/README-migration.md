# Phase 0: Pre-Migration Setup

✅ = Completed
🚧 = In Progress
⏳ = Pending

This phase prepares the codebase for migration from AWS to Cloudflare services by analyzing the current schema and preparing the target infrastructure.

## Prerequisites

1. ✅ Install required tools:

```bash
# Install Wrangler CLI
sudo npm install -g wrangler

# Install jq for JSON processing
brew install jq  # For macOS
apt-get install jq  # For Ubuntu/Debian
```

2. ✅ Login to Cloudflare:

```bash
wrangler login
```

## Setup Steps

1. ✅ Create Cloudflare environment file:

```bash
cp .env.cloudflare .env.cloudflare.local
```

2. ✅ Fill in the environment variables in `.env.cloudflare.local`:

- Get Cloudflare credentials from dashboard
- Set up feature flags for gradual migration
- Configure NextAuth settings

3. ✅ Create D1 database:

```bash
# Create database
wrangler d1 create curiocity-apex-db

# Execute schema
wrangler d1 execute curiocity-apex-db --file=dynamodb-tables.sql
```

4. ✅ Create R2 bucket:

```bash
# Create bucket
wrangler r2 bucket create curiocity-apex-storage

# Configure CORS for web access
wrangler r2 bucket cors set curiocity-apex-storage --file=r2-cors.json
```

5. ✅ Create KV namespace:

```bash
# Create namespace
wrangler kv:namespace create curiocity-kv
```

## Infrastructure Status

### Database (D1)

- ✅ Schema created
- ✅ Sample data test completed
  - Created test user
  - Created test document with JSON folders
  - Verified foreign key relationships
- ✅ JSON support validated
- ✅ Dual-write capability implemented
  - POST: Create documents in both databases
  - GET: Read from D1 with DynamoDB fallback
  - DELETE: Remove from both databases
  - PUT: Update in progress
- ⏳ Query performance validation pending

### Storage (R2)

- ✅ Bucket created
- ✅ CORS configured
- ✅ Upload test completed
- ✅ Basic access patterns validated
- ✅ Production path patterns verified
  - profile-pictures/{userId}/{uuid}\_{filename}
  - resources/{documentId}/{resourceId}/{filename}
- ⏳ Integration with application code pending

### KV Namespace

- ✅ Namespace created
- ✅ Basic read/write verified
- ✅ Session storage implemented
  - ✅ KV adapter for NextAuth
  - ✅ Feature flag support
  - ✅ AWS fallback when KV disabled
  - ✅ User data storage
  - ✅ Account linking
  - ✅ Verification tokens
- ✅ Session storage testing
  - ✅ Basic session operations
  - ✅ OAuth flow testing
  - ✅ Session expiry testing
  - ✅ Account linking testing
- ⏳ Performance testing pending

## Schema Details

### Database Schema

The application uses 5 main tables:

1. **Documents**

   - Primary container for user documents
   - Contains nested folder structure in JSON
   - Links to ResourceMeta through folders

2. **Resources**

   - Stores actual file content/markdown
   - Referenced by ResourceMeta through hash

3. **ResourceMeta**

   - Metadata about resources
   - Links to both Documents and Resources
   - Contains file type information

4. **Users**

   - User profile information
   - Links to Documents through ownerID

5. **LocalLoginUsers**
   - Local authentication data
   - Separate from OAuth users

### Storage Structure

R2 will mirror the current S3 structure:

```
profile-pictures/
  {userId}/
    {uuid}_{filename}
resources/
  {documentId}/
    {resourceId}/
      {filename}
```

### KV Structure

```
sessions/
  {sessionToken}: SessionData
users/
  {userId}: UserData
emails/
  {email}: userId
accounts/
  {provider}/
    {providerAccountId}: userId
verification-tokens/
  {identifier}/
    {token}: TokenData
```

## Validation Steps

1. ✅ Verify database setup:

```bash
# List tables
wrangler d1 execute curiocity-apex-db --command "SELECT name FROM sqlite_master WHERE type='table';"

# Verify schema
wrangler d1 execute curiocity-apex-db --command "SELECT sql FROM sqlite_master WHERE type='table';"

# Test data operations
wrangler d1 execute curiocity-apex-db --command "INSERT INTO Users (id, name, email, accountCreated) VALUES ('test-user-1', 'Test User', 'test@example.com', CURRENT_TIMESTAMP);"
wrangler d1 execute curiocity-apex-db --command "INSERT INTO Documents (id, name, text, folders, dateAdded, ownerID) VALUES ('test-doc-1', 'Test Doc', 'Content', '[]', CURRENT_TIMESTAMP, 'test-user-1');"

# Test dual-write
curl -X POST http://localhost:3000/api/db \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Dual Write","dateAdded":"2024-01-26T00:00:00"}'
```

2. ✅ Test R2 access:

```bash
# Upload test file
echo "test content for R2" > test.txt
wrangler r2 object put curiocity-apex-storage/test.txt --file=test.txt

# Verify access
wrangler r2 object get curiocity-apex-storage/test.txt

# Test production paths
wrangler r2 object put curiocity-apex-storage/profile-pictures/test-user-1/test-profile.jpg --file=test.txt
wrangler r2 object put curiocity-apex-storage/resources/test-doc-1/test-resource-1/test-file.txt --file=test.txt
```

3. ✅ Test KV namespace:

```bash
# Write test value
wrangler kv:key put --namespace-id=$KV_NAMESPACE_ID "test" "value"

# Read test value
wrangler kv:key get --namespace-id=$KV_NAMESPACE_ID "test"

# Test session storage
wrangler kv:key put --namespace-id=$KV_NAMESPACE_ID "sessions/test-session-token" '{"userId": "test-user-1", "expires": "2025-01-27T21:20:47.000Z", "sessionToken": "test-session-token"}'

# Verify session
wrangler kv:key get --namespace-id=$KV_NAMESPACE_ID "sessions/test-session-token"

# Test OAuth flow
./migration/test-oauth-flow.sh

# Test session expiry
./migration/test-session-expiry.sh

# Test account linking
./migration/test-account-linking.sh

# Test user data
wrangler kv:key put --namespace-id=$KV_NAMESPACE_ID "users/test-user-1" '{"id": "test-user-1", "name": "Test User", "email": "test@example.com"}'

# Test email index
wrangler kv:key put --namespace-id=$KV_NAMESPACE_ID "emails/test@example.com" "test-user-1"
```

## Rollback Plan

1. Keep AWS configuration in place
2. Use feature flags to control service switching
3. No data migration in this phase

## Next Steps

1. ✅ Complete database validation steps
2. ✅ Test schema compatibility with sample data
3. 🚧 Complete Phase 1 parallel infrastructure setup
   - ✅ Begin implementing dual-write capability
   - ✅ Complete PUT handler dual-write
   - ✅ Test production R2 paths
   - 🚧 Implement R2 in application code
     - ✅ Profile picture upload endpoint
     - ✅ Resource file storage
     - ✅ Multipart upload support
     - ⏳ Presigned URL generation
   - ✅ Implement session storage in KV
   - ✅ Complete session storage testing

## Implementation Progress

### Database (D1)

- ✅ Basic CRUD operations
- ✅ JSON field handling
- ✅ PUT handler dual-write with rollback
- ✅ Data validation checks
  - ✅ Document structure validation
  - ✅ Resource validation
  - ✅ ResourceMeta validation
  - ✅ JSON field validation

### Storage (R2)

- ✅ Basic operations (upload/download)
- ✅ Path structure validation
- ✅ Multipart upload support
- ✅ Application integration
- ✅ Presigned URL support
  - ✅ Temporary credentials generation
  - ✅ Upload URL generation
  - ✅ Download URL generation
  - ✅ Fallback to S3 presigned URLs

### KV Namespace

- ✅ Basic operations
- ✅ Session storage implementation
- ✅ Session storage testing
  - ✅ OAuth flow
  - ✅ Session expiry
  - ✅ Account linking

## Phase 1: Parallel Infrastructure

With Phase 0 setup complete, we can now proceed to Phase 2.
