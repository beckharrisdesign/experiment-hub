#!/usr/bin/env node
/**
 * Sync W+H listing mockup galleries from the local Google Drive mount into
 * the Notion Listing Inventory rows (the shop's source of truth).
 *
 * For every Listing Inventory row whose SKU has a gallery folder in Drive,
 * uploads the folder's role-named images to Notion (File Upload API) and
 * keeps the row's "Images" files property up to date (Hero preview is left
 * untouched). Files over the size cap are recompressed to JPEG first.
 *
 * Dry-run by default; --apply uploads. --sku WH-UN-S-XXXX limits to one row.
 * Resume is per FILE: the Images property is re-patched after every
 * successful upload, and reruns skip files already attached (matched by
 * filename stem, since compression renames .png to .jpg).
 *
 * All Notion calls share bounded 429/Retry-After handling plus pacing, so
 * a long run degrades to slow, not to failed rows.
 *
 * Env: NOTION_TOKEN, NOTION_INVENTORY_DB_ID. Run from Katy's own terminal
 * (op-injected creds — see .env.example and CLAUDE.md Secrets).
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  parseArgs, orderGallery, resumePlan, buildImagesPatch, ROLE_ORDER,
} from './notion-gallery-sync-lib.mjs';

// GALLERY_ROOT overrides the Drive mount — e.g. a locally unzipped copy of
// the W+H Listings folder when DriveFS won't materialize files.
const DRIVE_ROOT = process.env.GALLERY_ROOT ||
  '/Users/katybharris/Library/CloudStorage/GoogleDrive-katy@beckharrisdesign.com/My Drive/W+H Listings/W+H Listings';
const NOTION = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const MAX_BYTES = 4.5 * 1024 * 1024; // stay safely under Notion's 5MB single-part cap
const PACING_MS = 350; // Notion allows ~3 requests/second
const MAX_RETRIES = 5;
const REQUEST_TIMEOUT_MS = 120_000; // a 2000px PNG on a slow uplink, with margin
const READ_TIMEOUT_MS = 90_000; // Drive streams cloud-only files on first read

let opts;
try {
  opts = parseArgs(process.argv.slice(2));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const token = process.env.NOTION_TOKEN;
const dbId = process.env.NOTION_INVENTORY_DB_ID;
if (!token || !dbId) {
  console.error('Missing NOTION_TOKEN or NOTION_INVENTORY_DB_ID in env.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Shared fetch: pacing + bounded 429/Retry-After retries for EVERY Notion call. */
async function notionFetch(url, init, { retryOnTimeout = true } = {}) {
  for (let attempt = 0; ; attempt++) {
    await sleep(PACING_MS);
    let resp;
    try {
      resp = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch (err) {
      if (retryOnTimeout && attempt < MAX_RETRIES) {
        console.warn(`   request ${err.name === 'TimeoutError' ? 'timed out' : 'failed'} — retrying (${attempt + 1}/${MAX_RETRIES})`);
        continue;
      }
      throw err;
    }
    if (resp.status === 429 && attempt < MAX_RETRIES) {
      const after = Number(resp.headers.get('retry-after')) || 2 ** attempt;
      console.warn(`   429 — waiting ${after}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(after * 1000);
      continue;
    }
    return resp;
  }
}

async function notionJson(pathname, init = {}) {
  const resp = await notionFetch(`${NOTION}${pathname}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    ...init,
  });
  if (!resp.ok) {
    throw new Error(`${init.method ?? 'GET'} ${pathname} -> ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  }
  return resp.json();
}

async function allRows() {
  const rows = [];
  let cursor;
  do {
    const body = { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) };
    const page = await notionJson(`/databases/${dbId}/query`, { method: 'POST', body: JSON.stringify(body) });
    rows.push(...page.results);
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);
  return rows;
}

function skuFor(row) {
  // SKU property is a formula ("WH-UN-S-" + last 4 hex of the page id, upper).
  const f = row.properties?.SKU?.formula?.string;
  if (f) return f;
  const last4 = row.id.replace(/-/g, '').slice(-4).toUpperCase();
  return `WH-UN-S-${last4}`;
}

/** Abortable Drive read: the CloudStorage mount streams cloud-only files on
 * first access and can take minutes per file (or stall). Bounded retries,
 * then the caller skips the file so the run finishes and a rerun resumes.
 * Bulk-downloading first (Finder: right-click the folder > Make Available
 * Offline) makes every read instant. */
async function readWithTimeout(file) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fs.promises.readFile(file, { signal: AbortSignal.timeout(READ_TIMEOUT_MS) });
    } catch (err) {
      if (err.name === 'AbortError' && attempt < 2) {
        console.warn(`   Drive read timed out — retrying (${attempt + 1}/2)`);
        continue;
      }
      throw new Error(`Drive did not materialize ${path.basename(file)} — make the folder Available Offline and rerun`);
    }
  }
}

async function bytesFor(dir, entry) {
  const raw = await readWithTimeout(path.join(dir, entry.name));
  if (raw.length <= MAX_BYTES) {
    return { buf: raw, name: entry.name, type: entry.name.match(/\.png$/i) ? 'image/png' : 'image/jpeg' };
  }
  const jpg = await sharp(raw).jpeg({ quality: 88 }).toBuffer();
  return { buf: jpg, name: entry.name.replace(/\.(png|jpe?g)$/i, '.jpg'), type: 'image/jpeg' };
}

async function uploadFile({ buf, name, type }) {
  const created = await notionJson('/file_uploads', {
    method: 'POST',
    body: JSON.stringify({ filename: name, content_type: type }),
  });
  const form = new FormData();
  form.append('file', new Blob([buf], { type }), name);
  // No timeout replay here: /send is not idempotent. A timeout fails this
  // file; the rerun creates a fresh upload object and the orphan expires.
  const resp = await notionFetch(`${NOTION}/file_uploads/${created.id}/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION },
    body: form,
  }, { retryOnTimeout: false });
  if (!resp.ok) throw new Error(`file upload send ${name} -> ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return created.id;
}

const rows = await allRows();
let done = 0, skipped = 0, failed = 0;
for (const row of rows) {
  const sku = skuFor(row);
  if (opts.sku && sku !== opts.sku) continue;
  const dir = path.join(DRIVE_ROOT, sku);
  if (!fs.existsSync(dir)) continue;
  const all = orderGallery(fs.readdirSync(dir), sku);
  const entries = all.filter((e) => ROLE_ORDER.includes(e.role));
  const extras = all.length - entries.length;
  if (extras > 0) console.log(`      (${extras} non-gallery files in ${sku} ignored: wip/finish/etc)`);
  if (entries.length === 0) continue;
  const title = row.properties?.['Short Title']?.rich_text?.[0]?.plain_text
    ?? row.properties?.Name?.title?.[0]?.plain_text ?? sku;
  const existing = row.properties?.Images?.files ?? [];
  const { keep, toUpload } = resumePlan(existing, entries);
  if (toUpload.length === 0) {
    console.log(`SKIP  ${sku} ${title} — all ${entries.length} gallery files already attached`);
    skipped++;
    continue;
  }
  console.log(`${opts.apply ? 'SYNC ' : 'PLAN '} ${sku} ${title} — ${toUpload.length} to upload, ${keep.length} already attached (${entries.map((e) => e.role).join(', ')})`);
  if (!opts.apply) continue;
  try {
    const uploaded = [];
    for (const entry of toUpload) {
      process.stdout.write(`   reading ${entry.name} (Drive may stream it down first)...\n`);
      let payload;
      try {
        payload = await bytesFor(dir, entry);
      } catch (err) {
        failed++;
        console.error(`   SKIPPED ${entry.name}: ${err.message}`);
        continue;
      }
      process.stdout.write(`   uploading ${payload.name} (${(payload.buf.length / 1e6).toFixed(1)}MB)...\n`);
      uploaded.push({ id: await uploadFile(payload), name: payload.name });
      // Re-patch after EVERY upload so a mid-row failure loses nothing.
      await notionJson(`/pages/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify(buildImagesPatch(keep, uploaded)),
      });
      process.stdout.write(`   attached ${payload.name}\n`);
    }
    done++;
    console.log(`   OK — ${keep.length + uploaded.length} images on the row`);
  } catch (err) {
    failed++;
    console.error(`   FAILED ${sku}: ${err.message} (rerun resumes from the next file)`);
  }
}
console.log(`\n${opts.apply ? 'Synced' : 'Planned'}: ${done || '-'} rows${opts.apply ? `, ${failed} failed` : ''}, ${skipped} skipped.` +
  (opts.apply ? '' : ' Rerun with --apply to upload.'));
