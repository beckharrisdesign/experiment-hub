#!/usr/bin/env node
/**
 * Sync W+H listing mockup galleries from the local Google Drive mount into
 * the Notion Listing Inventory rows (the shop's source of truth).
 *
 * For every Listing Inventory row whose SKU has a gallery folder in Drive,
 * uploads the folder's role-named PNGs to Notion (File Upload API) and sets
 * the row's "Images" files property to the complete set (Hero preview is
 * left untouched). Files over the size cap are recompressed to JPEG first.
 *
 * Dry-run by default; --apply uploads. --sku WH-UN-S-XXXX limits to one row.
 * Idempotent-ish: rows whose Images already hold >= the folder's file count
 * are skipped (rerun after a partial failure continues where it left off).
 *
 * Env: NOTION_TOKEN, NOTION_INVENTORY_DB_ID. Run from Katy's own terminal
 * (op-injected creds — see .env.example and CLAUDE.md Secrets).
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DRIVE_ROOT =
  '/Users/katybharris/Library/CloudStorage/GoogleDrive-katy@beckharrisdesign.com/My Drive/W+H Listings/W+H Listings';
const NOTION = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const MAX_BYTES = 4.5 * 1024 * 1024; // stay safely under Notion's 5MB single-part cap

// Gallery role order = Etsy slot order (hero first).
const ROLE_ORDER = [
  'hero', 'lifestyle', 'scale', 'transferring', 'content-tl', 'content-center',
  'content-bl', 'content-suggestions-4up', 'badge', 'faq-1', 'faq-2', 'faq-3',
  'endcap', 'color-options', 'detail-1', 'detail-2', 'detail-3', 'detail-4',
];

const apply = process.argv.includes('--apply');
const skuArg = (() => {
  const i = process.argv.indexOf('--sku');
  return i > -1 ? process.argv[i + 1] : null;
})();

const token = process.env.NOTION_TOKEN;
const dbId = process.env.NOTION_INVENTORY_DB_ID;
if (!token || !dbId) {
  console.error('Missing NOTION_TOKEN or NOTION_INVENTORY_DB_ID in env.');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json',
};

async function notion(pathname, init = {}) {
  const resp = await fetch(`${NOTION}${pathname}`, { headers, ...init });
  if (!resp.ok) throw new Error(`${init.method ?? 'GET'} ${pathname} -> ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  return resp.json();
}

async function allRows() {
  const rows = [];
  let cursor;
  do {
    const body = { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) };
    const page = await notion(`/databases/${dbId}/query`, { method: 'POST', body: JSON.stringify(body) });
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

function galleryFiles(sku) {
  const dir = path.join(DRIVE_ROOT, sku);
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
  const roleOf = (f) => f.replace(new RegExp(`^Listing-${sku}-`), '').replace(/\.png$/, '');
  files.sort((a, b) => {
    const ia = ROLE_ORDER.indexOf(roleOf(a));
    const ib = ROLE_ORDER.indexOf(roleOf(b));
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return files.map((f) => ({ role: roleOf(f), file: path.join(dir, f), name: f }));
}

async function bytesFor(entry) {
  const raw = fs.readFileSync(entry.file);
  if (raw.length <= MAX_BYTES) return { buf: raw, name: entry.name, type: 'image/png' };
  const jpg = await sharp(raw).jpeg({ quality: 88 }).toBuffer();
  return { buf: jpg, name: entry.name.replace(/\.png$/, '.jpg'), type: 'image/jpeg' };
}

async function uploadFile({ buf, name, type }) {
  const created = await notion('/file_uploads', {
    method: 'POST',
    body: JSON.stringify({ filename: name, content_type: type }),
  });
  const form = new FormData();
  form.append('file', new Blob([buf], { type }), name);
  const resp = await fetch(`${NOTION}/file_uploads/${created.id}/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION },
    body: form,
  });
  if (!resp.ok) throw new Error(`file upload send ${name} -> ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return created.id;
}

const rows = await allRows();
let done = 0, skipped = 0, failed = 0;
for (const row of rows) {
  const sku = skuFor(row);
  if (skuArg && sku !== skuArg) continue;
  const entries = galleryFiles(sku);
  const title = row.properties?.['Short Title']?.rich_text?.[0]?.plain_text
    ?? row.properties?.Name?.title?.[0]?.plain_text ?? sku;
  if (!entries || entries.length === 0) { continue; }
  const existing = row.properties?.Images?.files?.length ?? 0;
  if (existing >= entries.length) {
    console.log(`SKIP  ${sku} ${title} — Images already has ${existing} (folder has ${entries.length})`);
    skipped++;
    continue;
  }
  console.log(`${apply ? 'SYNC ' : 'PLAN '} ${sku} ${title} — ${entries.length} images (${entries.map((e) => e.role).join(', ')})`);
  if (!apply) continue;
  try {
    const ids = [];
    for (const entry of entries) {
      const payload = await bytesFor(entry);
      ids.push({ id: await uploadFile(payload), name: payload.name });
      process.stdout.write(`   uploaded ${payload.name}\n`);
    }
    await notion(`/pages/${row.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        properties: {
          Images: { files: ids.map((u) => ({ type: 'file_upload', file_upload: { id: u.id }, name: u.name })) },
        },
      }),
    });
    done++;
    console.log(`   OK — ${ids.length} images attached`);
  } catch (err) {
    failed++;
    console.error(`   FAILED ${sku}: ${err.message}`);
  }
}
console.log(`\n${apply ? 'Synced' : 'Planned'}: ${done || '-'} rows${apply ? `, ${failed} failed` : ''}, ${skipped} skipped.` +
  (apply ? '' : ' Rerun with --apply to upload.'));
