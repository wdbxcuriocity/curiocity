// next.config.js
module.exports = {
  images: {
    domains: [
      'lh3.googleusercontent.com',
      'wdb-curiocity-bucket.s3.amazonaws.com', // Global S3 URL
      'wdb-curiocity-bucket.s3.us-west-1.amazonaws.com', // Regional S3 URL
      'curiocity-apex-storage.r2.dev', // Cloudflare R2 URL
    ],
  },
  experimental: {
    workerThreads: true,
    cpus: 1,
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?js$/,
      type: 'asset/resource',
    });
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true, // Ignore ESLint during builds
  },
  typescript: {
    ignoreBuildErrors: true, // Ignore TypeScript errors during builds
  },
};
