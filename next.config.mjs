// next.config.mjs

/** @type {import('next').NextConfig} */
const config = {
  images: {
    domains: [
      'lh3.googleusercontent.com',
      'wdb-curiocity-bucket.s3.amazonaws.com', // Global S3 URL
      'wdb-curiocity-bucket.s3.us-west-1.amazonaws.com', // Regional S3 URL
    ],
  },
  experimental: {
    workerThreads: true,
    cpus: 1,
  },
  eslint: {
    // Enforce ESLint during builds and development
    ignoreDuringBuilds: false,
    // Strict mode to catch all errors and warnings
    dirs: ['pages', 'components', 'lib', 'app', 'context', 'utils']
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default config;
