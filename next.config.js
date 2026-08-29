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
    // The change pages read this by a path built at runtime, so tracing cannot
    // follow it. Without it the deployed runtime has no history at all and the
    // pages render every date as a dash (change-history-manifest).
    '/changes/**': ['data/change-history.json'],
    '/etsy-listing-kit/**': [
      'node_modules/.pnpm/@img+sharp-libvips-linux-x64@*/node_modules/@img/sharp-libvips-linux-x64/**',
      // Bundled fonts — serverless has none; without these, SVG text renders
      // as tofu boxes (see assets/fonts/fonts.conf).
      'assets/fonts/**',
      // Real hoop photo templates (exported from Katy's W&H Figma file).
      'assets/mockups/**',
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
    // Base CSP for the whole hub.
    const baseCsp = {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://www.googletagmanager.com'], // unsafe-eval required by Mermaid
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'blob:', 'https://www.google-analytics.com', 'https://analytics.google.com', 'https://www.googletagmanager.com', 'https://*.supabase.co'], // *.supabase.co: Etsy Listing Kit signed download images; analytics.google.com: GA4 pixel fallback for the same beacon

      // analytics.google.com: GA4's current /g/collect beacon host — the tag
      // migrated off www.google-analytics.com and hits were silently dropped
      // (live console CSP reports, 2026-08-17).
      'connect-src': ["'self'", 'https://www.google-analytics.com', 'https://region1.google-analytics.com', 'https://analytics.google.com', 'https://www.googletagmanager.com'],
      'frame-ancestors': ["'none'"],
    };

    // pdf-metadata-viewer only. The Google Picker is how a folder gets chosen,
    // and it needs its loader script, an iframe from docs.google.com, and calls
    // to the Drive API. (It was once also the only way to establish a
    // `drive.file` grant over existing files; full `drive` removed that
    // constraint but not the CSP requirement.) Scoped to these
    // pages rather than widened hub-wide, so one feature's requirement does not
    // become everyone's attack surface.
    const pickerCsp = {
      ...baseCsp,
      'script-src': [...baseCsp['script-src'], 'https://apis.google.com'],
      'connect-src': [...baseCsp['connect-src'], 'https://www.googleapis.com', 'https://content.googleapis.com'],
      'frame-src': ["'self'", 'https://docs.google.com', 'https://drive.google.com'],
      'img-src': [...baseCsp['img-src'], 'https://*.googleusercontent.com', 'https://drive-thirdparty.googleusercontent.com'],
    };

    const render = (csp) =>
      Object.entries(csp)
        .map(([directive, values]) => `${directive} ${values.join(' ')}`)
        .join('; ');

    const securityHeaders = (csp) => [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: render(csp) },
    ];

    return [
      // The Picker pages. X-Frame-Options is omitted here rather than set to
      // DENY: it is a legacy header with no frame-src equivalent, and
      // frame-ancestors 'none' in the CSP already denies being framed.
      { source: '/pdf-metadata-viewer', headers: securityHeaders(pickerCsp) },
      { source: '/pdf-metadata-viewer/:path*', headers: securityHeaders(pickerCsp) },

      // Everything else keeps the original policy. The negative lookahead stops
      // two CSP headers landing on one response — browsers enforce the
      // intersection of multiple policies, which would silently re-block the
      // Picker.
      {
        source: '/((?!pdf-metadata-viewer).*)',
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
              // Google Ads conversion tracking does NOT go through googletagmanager.com —
              // gtag loads a second script from googleadservices.com, then beacons to
              // google.com/ccm, google.com/rmkt, googleads.g.doubleclick.net (as a
              // *script*, not just a pixel) and ad.doubleclick.net. Omitting any of
              // these silently drops Ads conversions: the tag fires, CSP blocks the
              // beacon, and Google Ads records nothing. Verified against live console
              // CSP reports — do not trim this list without re-checking the console.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.googleadservices.com https://*.doubleclick.net", // unsafe-eval required by Mermaid
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://www.google.com https://www.googleadservices.com https://*.doubleclick.net https://*.supabase.co", // *.supabase.co: Etsy Listing Kit signed download images; analytics.google.com: GA4 pixel fallback
              // analytics.google.com: GA4's current /g/collect beacon host — see baseCsp note.
              "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://www.google.com https://www.googleadservices.com https://*.doubleclick.net",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
