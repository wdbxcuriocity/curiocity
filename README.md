# Curiocity

## Tech Stack

- **Next.js 14**
- **TypeScript**
- **AWS**: DynamoDB + S3
- **Tailwind CSS**
- **PostHog Analytics**

## Prerequisites

- Node.js >= 18.x
- Yarn package manager
- AWS credentials configured
- PostHog account (for analytics)

## Key Features

- Document Uploading
- Resource Organization
- Resource Uploading
- Resource Parsing
- Authentication

## Development Setup

1. Clone the repository:

```bash
git clone https://github.com/wdbxcuriocity/curiocity.git
```

2. Install dependencies:

```bash
yarn install
```

3. Set up environment variables:

- Copy `.env.example` to `.env`
- Update the following variables:
  - `NEXTAUTH_URL`: Use `http://localhost:4000` for development
  - `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
  - `POSTHOG_KEY`

4. Start the development server:

```bash
yarn dev
```

The app will be available at http://localhost:4000

## Testing

Run the test suite:

```bash
yarn test
```

Tests are written using Jest and React Testing Library. Test files are located in:

- `components/__tests__/` - Component tests
- `app/api/db/__tests__/` - API endpoint tests

## File Structure

```
App
├── Api
│   ├── analytics      # PostHog analytics endpoints
│   ├── auth          # Authentication endpoints
│   ├── db
│   │   ├── documents
│   │   ├── resource
│   │   ├── resourcemeta
│   ├── resource_parsing
│   ├── s3-upload     # S3 file upload handlers
│   ├── manual-signup
│   ├── reset-password
│   └── user          # User management endpoints
├── Login
├── Report-home
├── Signup
├── Assets
├── Components
│   ├── DocumentComponents
│   ├── GeneralComponents
│   ├── ModalComponent
│   ├── PostHogComponent
│   └── ResourceComponents
├── Context
│   ├── AppContext    # Resources and Documents
│   ├── AuthContext
│   └── SwitchContext
├── lib              # Utility functions and shared logic
├── types           # TypeScript type definitions
└── test            # Test utilities and mocks
```

## Configuration Files

- `next.config.mjs` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `.prettierrc` - Code formatting rules
- `.eslintrc.json` - Linting rules
- `jest.config.js` - Test configuration
- `tsconfig.json` - TypeScript configuration

## Production Deployment

### Notes on `next.config.mjs`

- Auto-push to Vercel is currently disabled
- ESLint and TypeScript checks are ignored during builds:
  ```javascript
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  ```

### Deploying Manually

Use the following command to push to Vercel:

```bash
vercel --prod --force
```

## Known Issues

1. Files occasionally fail to upload to the database (Error 413)

   - Bug likely in UploadAllFiles function in S3Button.tsx

2. Parsing is currently disabled

   - Set `DISABLE_PARSING=false` to enable
   - Some files are skipped or parsed unnecessarily

3. TypeScript and ESLint rules not fully enforced

4. No responsive design for mobile devices

## Development Guidelines

1. Use absolute imports with `@/` prefix
2. Run tests before submitting PRs
3. Format code using Prettier
4. Follow the existing component structure
5. Update tests when modifying components

## Contact Information

**Created by:**

- **Web Development at Berkeley** - [webatberkeley@gmail.com](mailto:webatberkeley@gmail.com)
- **Jason Duong** - [jasonduong@berkeley.edu](mailto:jasonduong@berkeley.edu)
- **Ashley Zheng** - [ashley.zheng@berkeley.edu](mailto:ashley.zheng@berkeley.edu)
