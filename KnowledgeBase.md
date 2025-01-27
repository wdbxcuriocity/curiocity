# Knowledge Base

## Cloudflare D1

- Access through request context in Edge functions
- JSON fields need to be stringified/parsed when storing/retrieving
- Dual-write pattern implementation:
  1. Write to primary database (DynamoDB) first
  2. Check feature flag and context for D1 access
  3. Write to D1 if enabled, log errors but don't fail request
  4. Use GET fallback pattern: try D1 first, fallback to DynamoDB
  5. Track failures in analytics for monitoring

## Cloudflare KV

- KV namespaces are accessed through the request context in Edge functions
- KV is best suited for small values (<25MB) with high read frequency
- KV doesn't support querying, so we need to maintain our own indexes (e.g., email -> userId)
- KV operations are eventually consistent
- KV is ideal for session storage due to its low latency and global distribution

## NextAuth.js

- Custom adapters can be conditionally loaded based on feature flags
- Session and JWT types can be extended to include custom fields
- The adapter interface requires implementing user management even if only using session storage
- Request context must be passed to NextAuth for Edge compatibility
- Null safety is important in token and session handling

## Migration Strategy

- Feature flags enable gradual rollout of new services
- Keeping existing functionality while adding new services reduces risk
- Testing each service independently before integration is crucial
- Documentation should be updated in real-time as changes are made
- Validation steps should be automated where possible
- Implement dual-write with fallback patterns for safe migration

## Migration Insights

### Storage Systems

- R2 and S3 can operate in parallel during migration
- R2 URLs require custom domain configuration for proper access
- File operations should be atomic across both storage systems
- Error handling should account for partial success scenarios

### Database Operations

- D1 handles JSON fields differently than DynamoDB
- Dual-write operations need careful transaction handling
- Error states should be tracked independently for each database
- Performance characteristics differ between D1 and DynamoDB

### Session Management

- KV storage provides faster access than DynamoDB for sessions
- Session expiry needs to be handled at the application level
- Account linking requires careful index management
- OAuth flows can be tested with mock providers

### Testing Strategies

- Parallel systems require comprehensive integration testing
- Feature flags enable gradual migration of functionality
- Test scripts should validate both success and failure paths
- Clean up is critical for maintaining test data isolation
