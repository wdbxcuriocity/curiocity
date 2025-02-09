# Knowledge Base

## DynamoDB Operations

- AWS SDK v3 marshalling is preferred over v2 for better type safety
- Avoid double marshalling by ensuring data is marshalled exactly once
- Key patterns:
  1. Use marshall() for input data before putObject
  2. Use unmarshall() for output data after getObject
  3. Never marshall already marshalled data
- Common pitfalls:
  1. Double marshalling causing ValidationException
  2. Inconsistent ID handling between string and map types
  3. Forgetting to marshall keys in query operations
- Best practices:
  1. Always marshall at the API route level
  2. Use consistent patterns across all operations
  3. Handle ValidationException errors gracefully
  4. Include proper error context in logs

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

## Logging Patterns

- All logs now use JSON format for machine parsing
- Correlation IDs flow through client/server boundaries
- Sensitive fields are redacted using pattern matching
- Errors include sanitized stack traces
- Page views track authenticated user context

### Authentication

- Tracks sign-in attempts and session creation
- Logs provider and session duration
- Redacts sensitive tokens

### Resource Management

- Tracks uploads, metadata updates, and access
- Includes resource IDs and operation types
- Measures operation durations

### Document Operations

- Logs folder renames and document updates
- Tracks before/after states
- Includes document context

### Resource Uploads

- Tracks file sizes and document context
- Measures upload durations
- Redacts file contents

### Analytics

- Logs event types and properties
- Tracks PostHog integration
- Redacts sensitive event data

### User Management

- Tracks profile updates
- Logs changed fields
- Redacts PII

### Resource Notes

- Tracks note fetch and update operations
- Logs note lengths
- Redacts note content

### Resource Content

- Tracks resource fetch operations
- Logs content hashes
- Measures fetch durations

## Logging System

- The application uses a centralized logging system in `lib/logging.ts`
- Logger instances can be created per service with `new Logger(serviceName)`
- Convenience methods available through `defaultLogger`
- All logs include timestamps, correlation IDs, and proper redaction of sensitive data
- Direct console.log usage is discouraged and will trigger ESLint warnings
