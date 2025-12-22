/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Enable standalone output for optimized Docker builds
  output: 'standalone',
};

module.exports = nextConfig;
