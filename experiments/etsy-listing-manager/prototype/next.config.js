// Turbopack logging: Logs are automatically captured to .next/turbopack.log
// These logs are accessible via MCP filesystem resources for AI context
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

