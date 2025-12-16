/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    '*.riker.replit.dev',
    '*.replit.dev',
    '*.repl.co',
    '*.replit.app',
    'localhost',
    '127.0.0.1',
  ],
};

module.exports = nextConfig;
