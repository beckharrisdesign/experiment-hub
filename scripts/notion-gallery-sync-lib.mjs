/**
 * Pure logic for notion-gallery-sync.mjs — extracted so dry-run planning,
 * resume filtering, and the Images patch payload are unit-testable
 * (tests/scripts/notion-gallery-sync.test.ts).
 */

// Gallery role order = Etsy slot order (hero first).
export const ROLE_ORDER = [
  'hero', 'lifestyle', 'scale', 'transferring', 'content-tl', 'content-center',
  'content-bl', 'content-suggestions-4up', 'badge', 'faq-1', 'faq-2', 'faq-3',
  'endcap', 'color-options', 'detail-1', 'detail-2', 'detail-3', 'detail-4',
];

const IMAGE_EXT = /\.(png|jpe?g)$/i;

/** Parse CLI args; throws on a malformed --sku so a targeted run can never
 * silently widen into a full-database write. */
export function parseArgs(argv) {
  const apply = argv.includes('--apply');
  const i = argv.indexOf('--sku');
  let sku = null;
  if (i > -1) {
    sku = argv[i + 1];
    if (!sku || sku.startsWith('-')) {
      throw new Error('--sku requires a SKU operand (e.g. --sku WH-UN-S-0DF4)');
    }
  }
  return { apply, sku };
}

export function roleOf(filename, sku) {
  return filename.replace(new RegExp(`^Listing-${sku}-`), '').replace(IMAGE_EXT, '');
}

/** Order a folder listing into gallery entries (png and jpg both count). */
export function orderGallery(filenames, sku) {
  return filenames
    .filter((f) => IMAGE_EXT.test(f))
    .map((f) => ({ role: roleOf(f, sku), name: f }))
    .sort((a, b) => {
      const ia = ROLE_ORDER.indexOf(a.role);
      const ib = ROLE_ORDER.indexOf(b.role);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
}

const stem = (name) => name.replace(IMAGE_EXT, '');

/**
 * Split a row's plan into files to upload vs existing attachments to keep.
 * Matching is by filename stem: compression renames .png uploads to .jpg,
 * so extension can't be part of identity. This is what makes a rerun after
 * a mid-row failure resume instead of re-uploading everything.
 */
export function resumePlan(existingFiles, entries) {
  const have = new Set((existingFiles ?? []).map((f) => stem(f.name ?? '')));
  return {
    keep: existingFiles ?? [],
    toUpload: entries.filter((e) => !have.has(stem(e.name))),
  };
}

/** Existing attachments pass through verbatim; new uploads reference their
 * file_upload ids. Sent after EVERY successful upload so progress persists. */
export function buildImagesPatch(keep, uploaded) {
  return {
    properties: {
      Images: {
        files: [
          ...keep.map((f) => ({ name: f.name, type: f.type, [f.type]: f[f.type] })),
          ...uploaded.map((u) => ({ type: 'file_upload', file_upload: { id: u.id }, name: u.name })),
        ],
      },
    },
  };
}

export function shouldSkipRow(existingCount, entryCount) {
  return entryCount > 0 && existingCount >= entryCount;
}
