/**
 * Load environment from the prototype's own .env, then fall back to the hub's
 * root .env.local.
 *
 * Notion is configured once at the hub root and every experiment picks it up.
 * A prototype-local .env still wins where it sets something, so this can be
 * pointed at a different PDF directory or a different Notion database without
 * touching hub-wide config.
 *
 * dotenv does not overwrite variables that are already set, so load order is
 * precedence order: local first, hub second.
 *
 * Import this before anything that reads process.env.
 */
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prototypeRoot = join(__dirname, '..');

// experiments/<slug>/prototype -> experiments/<slug> -> experiments -> hub root
const hubRoot = resolve(prototypeRoot, '..', '..', '..');

const sources = [
  { label: 'prototype .env', path: join(prototypeRoot, '.env') },
  { label: 'hub .env.local', path: join(hubRoot, '.env.local') }
];

export const loadedEnvFiles = [];

for (const source of sources) {
  if (!existsSync(source.path)) continue;
  const result = config({ path: source.path, quiet: true });
  if (result.error) {
    console.warn(`⚠ Could not read ${source.label}: ${result.error.message}`);
    continue;
  }
  loadedEnvFiles.push(source.label);
}

if (loadedEnvFiles.length === 0) {
  console.warn('⚠ No .env file found. Copy .env.example to .env, or set variables in the environment.');
} else {
  console.log(`Environment loaded from: ${loadedEnvFiles.join(', ')}`);
}
