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

### Changed

- Updated NextAuth configuration to use KV adapter when enabled
- Modified JWT and Session type definitions
- Updated migration documentation with KV implementation details
- Improved error handling in session management
- Enhanced PUT handler with D1 database support and error tracking
- Updated upload-photo endpoint to support both S3 and R2 storage
- Modified resource upload functionality to use both storage systems
- Enhanced error handling and rollback for storage operations

### Fixed

- Type safety in NextAuth callbacks
- Proper null handling in session data
- Undefined checks in token data
- Error handling in PUT handler with PostHog tracking
- Improved type safety in storage operations
- Added proper error handling for storage failures
- Fixed session expiry handling in KV storage

## [Previous Versions]
