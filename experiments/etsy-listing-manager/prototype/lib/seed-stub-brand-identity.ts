import type Database from 'better-sqlite3';

export const STUB_BRAND_IDENTITY_ID =
  'b0000001-0000-4000-8000-000000000001';

/** Shipped with `public/brand/stub-shop-logo.svg` */
export const STUB_SHOP_LOGO_PATH = '/brand/stub-shop-logo.svg';

/**
 * Inserts a playful modern stub shop so listing generation and nav work on first run.
 * Runs only when `brand_identity` has zero rows.
 */
export function seedStubBrandIdentityIfEmpty(db: Database.Database): void {
  const { c: count } = db
    .prepare('SELECT COUNT(*) as c FROM brand_identity')
    .get() as { c: number };
  if (count > 0) return;

  const now = new Date().toISOString();
  const storeName = 'Neon Purl';
  const brandTone = 'whimsical';
  const visualStyle = 'modern';
  const colorPalette = JSON.stringify(['#22d3ee', '#a855f7', '#f472b6', '#0a0a0a']);
  const typography = 'DM Sans, system-ui, sans-serif';

  const cols = db.prepare('PRAGMA table_info(brand_identity)').all() as { name: string }[];
  const hasLogo = cols.some((c) => c.name === 'logo_url');

  if (hasLogo) {
    db.prepare(
      `INSERT INTO brand_identity (id, store_name, brand_tone, visual_style, color_palette, typography, logo_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      STUB_BRAND_IDENTITY_ID,
      storeName,
      brandTone,
      visualStyle,
      colorPalette,
      typography,
      STUB_SHOP_LOGO_PATH,
      now,
      now
    );
  } else {
    db.prepare(
      `INSERT INTO brand_identity (id, store_name, brand_tone, visual_style, color_palette, typography, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      STUB_BRAND_IDENTITY_ID,
      storeName,
      brandTone,
      visualStyle,
      colorPalette,
      typography,
      now,
      now
    );
  }

  console.log('[seed] Stub brand identity created:', storeName);
}
