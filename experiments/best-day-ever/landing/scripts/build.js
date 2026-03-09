#!/usr/bin/env node
/**
 * Vercel build: copy static assets to dist and inject HUB_API_URL into config.js.
 * Run from landing folder: node scripts/build.js
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

if (!fs.existsSync(dist)) {
  fs.mkdirSync(dist, { recursive: true });
}

// Copy static files
['index.html', 'script.js'].forEach((file) => {
  fs.copyFileSync(path.join(root, file), path.join(dist, file));
});

// Write config.js with env HUB_API_URL (empty string = same-origin)
const hubUrl = (process.env.HUB_API_URL || '').trim();
const configContent = `// Injected at build time on Vercel from HUB_API_URL. For local/same-origin, leave empty.
window.HUB_API_URL = ${JSON.stringify(hubUrl)};
`;
fs.writeFileSync(path.join(dist, 'config.js'), configContent, 'utf8');

console.log('Build complete: dist/ (HUB_API_URL =', hubUrl || '(same-origin)', ')');
