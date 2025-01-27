# AWS to Cloudflare Migration Plan

✅ = Completed
🚧 = In Progress
⏳ = Pending

## Critical Codebase-Specific Requirements

1. **Preserve DynamoDB nested document patterns**  
   Found in: app/api/db/documents/renameFolder/route.ts
   Status: ✅ Schema created with JSON support

2. **Maintain 400KB document size limits**  
   Existing constraint in: app/api/db/resource/upload/route.ts
   Status: ✅ Constraint preserved in schema

3. **Keep NextAuth.js integration intact**  
   Current implementation in: app/api/auth/[...nextauth]/route.ts
   Status: ✅ KV adapter implemented with AWS fallback

## Phase 0: Pre-Migration Setup ✅

**Goal:** Prepare for migration with minimal risk

**Environment Variables:**

```env
# Cloudflare Credentials ✅
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_ACCESS_KEY_ID=
CLOUDFLARE_ACCESS_KEY_SECRET=
R2_BUCKET_NAME=curiocity-apex-storage
D1_DATABASE_NAME=curiocity-apex-db
KV_NAMESPACE_ID=2133cc6d43154955b6dcf0f491408d49

# Keep existing AWS vars during migration
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_UPLOAD_BUCKET=
DYNAMODB_TABLE=
```

**Infrastructure Setup:**

- ✅ D1 Database created and schema deployed
- ✅ R2 Bucket created with CORS configuration
- ✅ KV Namespace created and tested

## Phase 1: Parallel Infrastructure Setup ✅

**Goal:** Establish Cloudflare services without breaking AWS functionality

**Technical Implementation:**

1. R2 Configuration

   - ✅ Match S3 path patterns: app/api/user/upload-photo/route.ts
   - ✅ Preserve multipart logic: context/AppContext.tsx

2. D1 Database Setup

   - ✅ Convert DynamoDB tables: dynamodb-tables.sql
   - ✅ Test with sample data
   - ✅ Verify JSON support for nested documents
   - ✅ Implement dual-write capability
     - ✅ POST: Create documents in both databases
     - ✅ GET: Read from D1 with DynamoDB fallback
     - ✅ DELETE: Remove from both databases
     - ✅ PUT: Complete with rollback
   - ✅ Implement data validation checks

3. KV Namespaces
   - ✅ Basic structure created
   - ✅ Session storage implementation
   - ✅ Session persistence testing
     - ✅ Basic session operations
     - ✅ OAuth flow testing
     - ✅ Session expiry testing
     - ✅ Account linking testing

**Validation:**

- ✅ D1 Database schema matches DynamoDB structure
- ✅ JSON fields work for nested document storage
- ✅ Basic CRUD operations working in both databases
- ✅ AWS SDK imports remain unchanged
- ✅ All existing DynamoDB queries execute normally
- ✅ S3 URLs resolve through both AWS and R2

**Feature Flags:**

```env
ENABLE_CLOUDFLARE_DATABASE=true  # Enable dual-write to D1
ENABLE_CLOUDFLARE_STORAGE=true   # R2 fully implemented
ENABLE_CLOUDFLARE_KV=true       # Session storage implemented and tested
```

**Current Implementation:**

```typescript
// NextAuth KV adapter with AWS fallback
if (process.env.ENABLE_CLOUDFLARE_KV === 'true' && kvNamespace) {
  adapter: KVAdapter(kvNamespace);
} else {
  // Fall through to DynamoDB
}

// Dual-write example (POST)
if (process.env.ENABLE_CLOUDFLARE_DATABASE === 'true' && ctx?.env?.DB) {
  const d1Result = await putD1Object(ctx.env.DB, Item, 'Documents');
  if (!d1Result.success) {
    console.error('Failed to write to D1:', d1Result.error);
  }
}

// Graceful fallback example (GET)
if (process.env.ENABLE_CLOUDFLARE_DATABASE === 'true' && ctx?.env?.DB) {
  try {
    const d1Result = await getD1Object(ctx.env.DB, id, 'Documents');
    if (d1Result) return Response.json(d1Result);
  } catch (error) {
    // Fall through to DynamoDB
  }
}
```

## Phase 2: Vercel Hosting Preparation 🚧

**Goal:** Confirm deployment readiness

**Implementation:**

1. ✅ Verify build compatibility: package.json
2. ✅ Update image optimization: next.config.js
3. ✅ Add Cloudflare env vars: .env.cloudflare.local, .env.cloudflare, .env

**Precautions:**

- ✅ Maintain `NEXTAUTH_URL` handling
- ✅ Keep existing `experimental.workerThreads`
- ✅ Preserve PDF worker config in webpack

## Phase 3: Gradual Service Cutover ⏳

**Goal:** Safely transition services with ability to rollback

**Implementation Order:**

1. Authentication (KV)

   - 🚧 Test session storage in KV
   - ⏳ Enable KV adapter in production
   - ⏳ Monitor session handling

2. File Storage (R2)

   - ⏳ Test dual uploads: context/AppContext.tsx
   - ⏳ Verify file retrieval

3. Database Migration
   - ⏳ Dual-write to D1: app/api/db/route.ts
   - ⏳ Maintain nested docs: app/api/db/documents/renameFolder/route.ts
   - ⏳ Run SQL integrity checks

**Validation:**

- ⏳ 100MB uploads succeed
- ⏳ Folder renames complete <500ms
- ⏳ Mixed auth providers functional

## Phase 4: AWS Dependency Removal ⏳

**Prerequisites:**

- ⏳ 72-hour monitoring period
- ⏳ Basic functionality verification:
  - Document CRUD operations
  - File uploads/downloads
  - Authentication flows
  - Resource management

**API Endpoints to Update:**

1. `/api/db/*` - DynamoDB to D1
2. `/api/user/upload-photo` - S3 to R2
3. `/api/resource/*` - S3/DynamoDB to R2/D1
4. `/api/auth/*` - Session storage to KV

**Removal Steps:**

1. Delete AWS SDK from:

   ```json:package.json:15-19

   ```

2. Remove client configs in 14 files including:

   ```typescript:app/api/db/route.ts:15

   ```

3. Prune S3 code from:

   ```typescript:app/api/user/upload-photo/route.ts:9

   ```

**Final Checks:**

- All API routes 200 without AWS vars
- Document history remains accessible
- Resource moves <500ms

**Current Status:**

- ✅ Phase 0 completed
- ✅ Phase 1 completed
  - ✅ D1 database setup
  - ✅ KV session storage
  - ✅ R2 storage integration
- 🚧 Phase 2 in progress
- ⏳ Phase 3 pending
- ⏳ Phase 4 pending
