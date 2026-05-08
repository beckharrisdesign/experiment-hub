import type Database from 'better-sqlite3';

/** Stable id so we only ever insert one default SEO template per empty DB */
export const DEFAULT_SINGLE_PATTERN_TEMPLATE_ID =
  'a0000001-0000-4000-8000-000000000001';

/**
 * Inserts one "single digital pattern" product template with Etsy SEO guidance.
 * Runs only when `product_templates` has zero rows.
 */
export function seedDefaultProductTemplateIfEmpty(db: Database.Database): void {
  const { c: count } = db
    .prepare('SELECT COUNT(*) as c FROM product_templates')
    .get() as { c: number };
  if (count > 0) return;

  const now = new Date().toISOString();
  const name = 'Single pattern · digital PDF (Etsy SEO default)';

  // Title: front-load subject + craft + format; Etsy allows up to 140 characters
  const titleFormula =
    '{PatternName} · Hand Embroidery PDF Pattern · {MotifOrStyle} · Instant Download';

  // commonInstructions → DB `description`; used by listing generation + LLM
  const description = `Etsy SEO — use this when generating or editing the listing

TITLE (max 140 characters)
- Put the strongest search phrase in the first 40–50 characters (what it is + craft + format).
- Formula: ${titleFormula}
- Include: craft (e.g. hand embroidery), delivery (instant download / PDF), and one specific hook (theme, skill, occasion) from the pattern.
- Avoid repeating the same phrase twice; do not stuff commas of keywords.

TAGS (exactly 13; all unique)
- Use multi-word phrases shoppers type (e.g. "embroidery pdf pattern"), not single generic words only.
- Cover: craft + format + skill + style + 1–2 gift/occasion terms + long-tail variant.
- Do not duplicate the title word-for-word in every tag; vary phrasing.
- Default tag set to adapt (replace bracketed parts with pattern-specific terms):
  1. embroidery pattern
  2. pdf embroidery pattern
  3. hand embroidery design
  4. digital embroidery pattern
  5. instant download embroidery
  6. printable embroidery pattern
  7. needlework pattern pdf
  8. diy embroidery pattern
  9. modern embroidery pattern
  10. {style} embroidery (e.g. floral, minimalist)
  11. embroidery for beginners
  12. hoop art pattern
  13. {occasion or project} embroidery (e.g. gift idea, home decor)

DESCRIPTION (structure)
1) First 1–2 sentences: what it is, skill level, what the buyer receives (files, sizes) — this is what browsers skim first.
2) "What's included" bullets: file type(s), suggested fabric/hoop if applicable, stitch or color notes if known.
3) "How it works" for digital: instant download after purchase; link to how to open PDFs if needed.
4) Short shop policy line: personal use; no refunds on digital per your shop rules (align with your actual policy).

CATEGORY
- Prefer a specific craft path (e.g. Craft Supplies & Tools → Patterns & How-To → Embroidery) when it matches; pick the closest honest category for the pattern.`;

  const tags = JSON.stringify([
    'embroidery pattern',
    'pdf embroidery pattern',
    'hand embroidery design',
    'digital embroidery pattern',
    'instant download embroidery',
    'printable embroidery pattern',
    'needlework pattern pdf',
    'diy embroidery pattern',
    'modern embroidery pattern',
    'floral embroidery pattern',
    'embroidery for beginners',
    'hoop art pattern',
    'embroidery gift idea',
  ]);

  const category =
    'Craft Supplies & Tools > Patterns & How-To > Embroidery';

  db.prepare(
    `INSERT INTO product_templates (
      id, name, type, number_of_items, status, title, description, tags, category, price, seo_score, image_url, created_at, updated_at
    ) VALUES (?, ?, ?, 'single', 'ready', ?, ?, ?, ?, NULL, 88, NULL, ?, ?)`
  ).run(
    DEFAULT_SINGLE_PATTERN_TEMPLATE_ID,
    name,
    JSON.stringify(['digital']),
    titleFormula,
    description,
    tags,
    category,
    now,
    now
  );

  console.log(
    '[seed] Created default product template:',
    DEFAULT_SINGLE_PATTERN_TEMPLATE_ID
  );
}
