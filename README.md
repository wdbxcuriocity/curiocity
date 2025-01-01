# Curiocity

## Tech Stack

- **Next.js**
- **TypeScript**
- **AWS**: DynamoDB + S3

## Key Features

- Document Uploading
- Resource Organization
- Resource Uploading
- Resource Parsing
- Authentication

## Running the Development Server

```bash
git clone https://github.com/wdbxcuriocity/curiocity.git
npm install
npm run dev
```

## Pushing to Production

### Notes on `next.config.js`

- Auto-push to Vercel is currently disabled.
- ESLint and TypeScript checks are ignored during builds:
  ```javascript
  eslint: {
    ignoreDuringBuilds: true, // Ignore ESLint during builds
  },
  typescript: {
    ignoreBuildErrors: true, // Ignore TypeScript errors during builds
  },
  ```

### Deploying Manually

Use the following command to push to Vercel:

```bash
vercel --prod --force
```

## File Structure

```
App
├── Api
│   ├── auth
│   ├── db
│   │   ├── documents
│   │   ├── resource
│   │   ├── resourcemeta
│   │   ├── (others, need to be reorganized)
│   ├── resource_parsing
│   ├── manual-signup
│   ├── reset-password
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
│   ├── AppContext (Resources and Documents)
│   ├── AuthContext
│   └── SwitchContext
```

## Environment Variables

- Update `.env` when pushing to production:
  - Change `NEXTAUTH_URL` from `localhost:4000` to the Vercel deployment URL.

## Parsing

- Parsing is currently disabled.
  - Change `DISABLE_PARSING` to `false` to enable it.
- Known Issues:
  - Some files are skipped during parsing or parsed unnecessarily.

## Bugs Identified

1. Files occasionally fail to upload to the database, Error Code 413.

- Bug most likely occurs in UploadAllFiles function in S3Button.tsx

2. Parsing bug (see above).
3. TypeScript rules are not fully enforced.
4. ESLint rules are not fully enforced.

## Minor Issues

1. Imports are not standarized using root (@/..)

## Not Implemented

- Screen resizing for devices smaller than a laptop.

## Feature Recommendations

- Create /utils to move all api calls

## Contact Information

**Created by:**

- **Web Development at Berkeley** - [webatberkeley@gmail.com](mailto:webatberkeley@gmail.com)
- **Jason Duong** - [jasonduong@berkeley.edu](mailto:jasonduong@berkeley.edu)
- **Ashley Zheng** - [ashley.zheng@berkeley.edu](mailto:ashley.zheng@berkeley.edu)
