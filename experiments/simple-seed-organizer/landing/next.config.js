/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: [
    'https://*.riker.replit.dev',
    'https://*.kirk.replit.dev', 
    'https://*.picard.replit.dev',
    'https://*.spock.replit.dev',
    'https://*.replit.dev',
    'https://*.repl.co',
    'https://*.replit.app',
  ],
}

module.exports = nextConfig
