# BHD Labs — Site Map

Visual site map of every live page at `labs.beckharrisdesign.com`, where each node is an actual screenshot thumbnail.

## What's here

| Path | Purpose |
|---|---|
| `docs/sitemap/screenshots/*.png` | Screenshot of every live page (1280×800 @2x) |
| `docs/sitemap/manifest.json` | Page inventory: id, path, label, group, parent, filename |
| `scripts/sitemap/screenshot-pages.js` | Script that captures all screenshots |
| `scripts/sitemap/figma-plugin/` | Figma plugin that builds the sitemap in a Figma file |

## Refreshing screenshots

Run from the repo root:

```bash
node scripts/sitemap/screenshot-pages.js
```

Screenshots go to `docs/sitemap/screenshots/`. The manifest at `docs/sitemap/manifest.json` is updated automatically.

To target a different deployment (e.g. a Vercel preview):

```bash
BASE_URL=https://your-preview.vercel.app node scripts/sitemap/screenshot-pages.js
```

## Building the Figma sitemap

### First time: install the plugin

1. Open Figma Desktop.
2. **Plugins → Development → Import plugin from manifest…**
3. Select `scripts/sitemap/figma-plugin/manifest.json`.

### Every time you want to refresh the sitemap

1. Open your BHD Labs Figma file (the one from `https://www.figma.com/design/9VJTxmBWKgeCDTyJLsYM7I/BHD-Labs`).
2. **Plugins → Development → BHD Labs Sitemap Builder**.
3. In the plugin UI:
   - **Step 1**: select `docs/sitemap/manifest.json`.
   - **Step 2**: select all `*.png` files from `docs/sitemap/screenshots/`.
   - Click **Build Sitemap in Figma**.
4. The plugin creates (or replaces) a frame called **"BHD Labs — Site Map"** on the current Figma page, with every page as a screenshot card connected by tree lines.

### Re-building the plugin after editing `code.ts`

```bash
cd scripts/sitemap/figma-plugin
npm install       # first time only
npx tsc           # compiles code.ts → code.js
```

Figma picks up the change automatically when you re-run the plugin.

## Page inventory

Generated `2026-04-02` from `https://labs.beckharrisdesign.com`.

### Hub

| ID | Path | Label |
|---|---|---|
| `home` | `/` | Home |
| `scoring` | `/scoring` | Scoring |
| `heuristics` | `/heuristics` | Heuristics |
| `workflow` | `/workflow` | Workflow |
| `harness` | `/harness` | Harness |
| `documentation` | `/documentation` | Documentation |
| `font-preview` | `/font-preview` | Font Preview |

### Experiments

| ID | Path | Label |
|---|---|---|
| `exp-seed-finder` | `/experiments/seed-finder` | Seed Finder |
| `exp-simple-seed` | `/experiments/simple-seed-organizer` | Simple Seed Organizer |
| `exp-best-day-ever` | `/experiments/best-day-ever` | Best Day Ever |
| `exp-xp-repo` | `/experiments/experience-principles-repository` | XP Repository |
| `exp-garden-guide` | `/experiments/garden-guide-generator` | Garden Guide Generator |
| `exp-photo-memories` | `/experiments/photo-memories` | Photo Memories |
| `exp-illuminator` | `/experiments/the-illuminator` | The Illuminator |

### Experiment Docs

| ID | Path | Label |
|---|---|---|
| `doc-best-day-ever` | `/experiments/best-day-ever/doc/landing-page-content` | Best Day Ever — Landing Page Content |
| `doc-simple-seed` | `/experiments/simple-seed-organizer/doc/landing-page-content` | Simple Seed Organizer — Landing Page Content |

### Static Landings

| ID | Path | Label |
|---|---|---|
| `landing-simple-seed` | `/landing/simple-seed-organizer/` | Simple Seed Organizer Landing |
| `landing-best-day` | `/landing/best-day-ever/` | Best Day Ever Landing |

## Flagging pages for Figma component work

When you want to translate a page into Figma components, add a `"flagged": true` field to that page's entry in `manifest.json`. The Figma plugin respects this field and will visually mark those cards (future feature). This creates a clear queue for the Figma MCP + skills workflow.
