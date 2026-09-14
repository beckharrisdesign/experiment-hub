#!/usr/bin/env node
/**
 * Compose the Christmas Classics bundle gallery from the four classic
 * singles' existing renders (honest recompositions only — no fabricated
 * scenes). Follows the WH-UN-B-7584 bundle role vocabulary: hero,
 * detail-1..4, content-center. Output: a staging folder in the same Drive
 * listings tree; rename to the bundle's real SKU folder once its Notion
 * row exists.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT =
  '/Users/katybharris/Library/CloudStorage/GoogleDrive-katy@beckharrisdesign.com/My Drive/W+H Listings/W+H Listings';
const CLASSICS = ['WH-UN-S-0DF4', 'WH-UN-S-CA7C', 'WH-UN-S-EA23', 'WH-UN-S-EBE2']; // bow, candy, nutcracker, poinsettia
const OUT = path.join(ROOT, '_staging', 'christmas-classics-bundle');
const PX = 2000;

fs.mkdirSync(OUT, { recursive: true });

async function grid(role, outName) {
  const half = PX / 2;
  const tiles = await Promise.all(
    CLASSICS.map((sku) =>
      sharp(path.join(ROOT, sku, `Listing-${sku}-${role}.png`)).resize(half, half, { fit: 'cover' }).toBuffer(),
    ),
  );
  await sharp({ create: { width: PX, height: PX, channels: 3, background: '#ffffff' } })
    .composite(tiles.map((buf, i) => ({ input: buf, left: (i % 2) * half, top: Math.floor(i / 2) * half })))
    .jpeg({ quality: 90 })
    .toFile(path.join(OUT, outName));
  console.log('composed', outName);
}

await grid('hero', 'Listing-christmas-classics-hero.png'.replace('.png', '.jpg'));
await grid('content-center', 'Listing-christmas-classics-content-center.jpg');

for (let i = 0; i < CLASSICS.length; i++) {
  const src = path.join(ROOT, CLASSICS[i], `Listing-${CLASSICS[i]}-hero.png`);
  const dest = path.join(OUT, `Listing-christmas-classics-detail-${i + 1}.jpg`);
  await sharp(src).jpeg({ quality: 90 }).toFile(dest);
  console.log('composed', path.basename(dest));
}
console.log('done ->', OUT);
