# Changelog

## [Unreleased]

### Added

- KV adapter for NextAuth session storage
- Feature flag for KV session storage: `ENABLE_CLOUDFLARE_KV`
- Support for storing user data in KV
- Support for account linking in KV
- Support for verification tokens in KV
- Session CRUD operations in KV
- Test commands for KV session storage
- Dual-write capability for PUT handler in D1
- Implemented dual-write capability for PUT operations to both DynamoDB and D1
- Added R2 storage support for file uploads alongside S3
- Created R2 storage utilities for file operations
- Added session storage testing scripts for OAuth flow, session expiry, and account linking
- Added parallel storage implementation for profile pictures and resources
- Centralized logging service with redaction
- Request correlation IDs for error tracing
- Basic sensitive field redaction (email, passwords, tokens)
- Structured logging for authentication flows x3
- Resource management operation tracking x5
- Document operation logging x2
- Resource upload logging x2
- Analytics event tracking x3
- User management operation logging x4
- Resource notes operation logging x3
- Resource content fetch tracking x2
- Enhanced logging library with Logger class and convenience methods
- ESLint rule to warn about direct console usage
- Consistent marshalling pattern across all DynamoDB operations x6
- Proper error handling for DynamoDB ValidationExceptions x4

### Changed

- Updated NextAuth configuration to use KV adapter when enabled
- Modified JWT and Session type definitions
- Updated migration documentation with KV implementation details
- Improved error handling in session management
- Enhanced PUT handler with D1 database support and error tracking
- Updated upload-photo endpoint to support both S3 and R2 storage
- Modified resource upload functionality to use both storage systems
- Enhanced error handling and rollback for storage operations
- Consolidated environment variables into a single .env file
- Updated environment configuration to use Vercel as source of truth
- Enabled Cloudflare feature flags by default
- Standardized error responses with correlation IDs x3
- Updated 12 API routes to use new logging format x12
- Refactored DynamoDB operations to use AWS SDK v3 marshalling consistently x8
- Improved error handling in resource upload and metadata operations x4
- Standardized DynamoDB key marshalling across all operations x6

### Fixed

- Type safety in NextAuth callbacks
- Proper null handling in session data
- Undefined checks in token data
- Error handling in PUT handler with PostHog tracking
- Improved type safety in storage operations
- Added proper error handling for storage failures
- Fixed session expiry handling in KV storage
- Resolved environment variable conflicts between AWS and Cloudflare configurations
- Fixed ValidationException errors in DynamoDB operations x4
- Corrected double marshalling issues in putObject operations x6
- Fixed inconsistent ID handling in DynamoDB operations x4

## [Previous Versions]
