/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // For local development
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig

