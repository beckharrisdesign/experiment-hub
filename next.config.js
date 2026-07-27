const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next from treating ~/package-lock.json as the monorepo root (breaks dev module resolution).
  outputFileTracingRoot: path.join(__dirname),
  // sharp is a native module — keep it external so its .so binaries are traced
  // into the serverless bundle (Etsy Listing Kit image generator). Without this
  // the linux-x64 libvips fails to load on Vercel.
  serverExternalPackages: ['sharp'],
  // File tracing misses libvips (loaded at the binary level via rpath, never
  // require()d), so force ONLY the libvips store dir into the Etsy Listing Kit
  // bundles. Deliberately narrow: including the sharp/sharp-linux-x64 store
  // dirs too makes the deploy packager materialize their internal symlinks
  // twice (real dir + symlink -> EEXIST). sharp-linux-x64 itself is already
  // traced via require(); only the .so payload is missing.
  outputFileTracingIncludes: {
    '/etsy-listing-kit/**': [
      'node_modules/.pnpm/@img+sharp-libvips-linux-x64@*/node_modules/@img/sharp-libvips-linux-x64/**',
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
