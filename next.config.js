const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next from treating ~/package-lock.json as the monorepo root (breaks dev module resolution).
  outputFileTracingRoot: path.join(__dirname),
  // sharp is a native module — keep it external so its .so binaries are traced
  // into the serverless bundle (Etsy Listing Kit image generator). Without this
  // the linux-x64 libvips fails to load on Vercel.
  serverExternalPackages: ['sharp'],
  // File tracing misses libvips (loaded at the binary level, never require()d),
  // so force sharp's platform packages into the Etsy Listing Kit function
  // bundles. Globs cover both top-level and pnpm-store layouts.
  outputFileTracingIncludes: {
    '/etsy-listing-kit/**': [
      'node_modules/@img/**',
      'node_modules/.pnpm/@img+sharp-linux-x64@*/**',
      'node_modules/.pnpm/@img+sharp-libvips-linux-x64@*/**',
      'node_modules/.pnpm/sharp@*/**',
    ],
  },
  reactStrictMode: true,
  allowedDevOrigins: [
    '*.riker.replit.dev',
    '*.replit.dev',
    '*.repl.co',
    '*.replit.app',
    'localhost',
    '127.0.0.1',
  ],
  async redirects() {
    return [
      {
        // /workflow removed 2026-07 (remove-workflow-page); method narrative lives in Notion
        source: '/workflow',
        destination: '/',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com", // unsafe-eval required by Mermaid
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com https://*.supabase.co", // *.supabase.co: Etsy Listing Kit signed download images
              "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
