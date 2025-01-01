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
    turbo: {
      rules: {
        // Add any custom Turbopack rules here if needed
      },
    },
    workerThreads: true,
    cpus: 1,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default config;
