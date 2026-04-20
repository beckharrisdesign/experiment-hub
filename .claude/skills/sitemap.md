# Sitemap to Figma

Build a visual site map of the Experiment Hub in Figma with real screenshot thumbnails. Each deployed page becomes a card with its actual screenshot as the thumbnail. Cards are arranged in a tree layout by depth, with connector lines linking each page to its parent.

---

## Prerequisites

- **Figma Desktop** (not Web) — the plugin code fetches screenshots from `localhost`
- Figma MCP server connected (`claude mcp add --transport http figma https://mcp.figma.com/mcp`)
- `google-chrome` available locally, OR screenshots already captured from a previous run

---

## Figma file

- **File key:** `9VJTxmBWKgeCDTyJLsYM7I`
- **Target page:** "Landing Page" canvas
- **Frame name:** "BHD Labs — Site Map"

---

## Step 1 — Capture screenshots (skip if fresh)

Check whether a recent manifest already exists (captured within the last 24 hours):

```bash
find .site-map/experiment-hub -name manifest.json -mmin -1440 2>/dev/null | head -1
```

If that returns a path, skip to Step 2.

Otherwise, capture fresh screenshots:

```bash
node --experimental-strip-types scripts/site-map/capture.mjs \
  --base-url=https://labs.beckharrisdesign.com \
  --height=900 \
  --delay-ms=2500 \
  --budget-ms=6000 \
  --clean
```

This writes:
- `.site-map/experiment-hub/manifest.json` — inventory with `routes[].thumbnailName` and `routes[].captureStatus`
- `.site-map/experiment-hub/screenshots/*.png` — one screenshot per route

If `google-chrome` is unavailable locally, trigger the GitHub Actions workflow instead:

```bash
gh workflow run sitemap-capture.yml
gh run watch
```

Then pull the artifacts before continuing.

---

## Step 2 — Start a localhost server

Figma Desktop plugins can reach `localhost`. Serve the screenshot directory:

```bash
python3 -m http.server 8765 --directory .site-map/experiment-hub &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
```

Verify it's up:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8765/manifest.json
```

Should return `200`.

---

## Step 3 — Read the manifest

```bash
cat .site-map/experiment-hub/manifest.json
```

Note the full `routes` array. Each entry has:
- `id`, `path`, `title`, `group`, `pageType`
- `parentId` — matches another route's `id` (or `null` for root)
- `depth` — 0 = root, 1 = top-level, 2 = nested
- `thumbnailName` — filename like `home.png` or `experiments--best-day-ever.png`
- `captureStatus` — only include routes where this is `"captured"`

---

## Step 4 — Write to Figma

Call `use_figma` on file key `9VJTxmBWKgeCDTyJLsYM7I` with the plugin code below.

**Replace `ROUTES_JSON` with the actual JSON array from the manifest** (only routes where `captureStatus === "captured"`).

```javascript
// ── config ────────────────────────────────────────────────────────────────
const BASE_URL      = "http://localhost:8765";
const FRAME_NAME    = "BHD Labs — Site Map";
const CARD_W        = 360;
const CARD_H        = 230;
const LABEL_H       = 44;
const COL_GAP       = 480;   // horizontal gap between depth columns
const ROW_GAP       = 300;   // vertical gap between cards in same column
const FRAME_PAD     = 120;
const CONNECTOR_CLR = { r: 0.4, g: 0.5, b: 0.6, a: 1 };

// ── route data ────────────────────────────────────────────────────────────
// Paste the captured routes array here (captureStatus === "captured" only)
const ROUTES = ROUTES_JSON;

// ── helpers ───────────────────────────────────────────────────────────────
async function fetchImageHash(url) {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const img = figma.createImage(new Uint8Array(buf));
  return img.hash;
}

function loadFont(family, style) {
  return figma.loadFontAsync({ family, style });
}

// ── main ──────────────────────────────────────────────────────────────────
await Promise.all([
  loadFont("Inter", "Regular"),
  loadFont("Inter", "Semi Bold"),
]);

// Remove existing frame if present
const page = figma.currentPage;
const existing = page.findOne(n => n.name === FRAME_NAME && n.type === "FRAME");
if (existing) existing.remove();

// Group routes by depth, sort each bucket by path
const byDepth = new Map();
for (const route of ROUTES) {
  const d = route.depth ?? 0;
  if (!byDepth.has(d)) byDepth.set(d, []);
  byDepth.get(d).push(route);
}
for (const bucket of byDepth.values()) {
  bucket.sort((a, b) => (a.path || "").localeCompare(b.path || ""));
}

// Assign positions
const depths = [...byDepth.keys()].sort((a, b) => a - b);
const positioned = new Map(); // id → { route, x, y, node }

for (const depth of depths) {
  const bucket = byDepth.get(depth);
  bucket.forEach((route, i) => {
    positioned.set(route.id, {
      route,
      x: FRAME_PAD + depth * (CARD_W + COL_GAP),
      y: FRAME_PAD + i * (CARD_H + ROW_GAP),
    });
  });
}

// Calculate frame size
let maxX = 0, maxY = 0;
for (const { x, y } of positioned.values()) {
  maxX = Math.max(maxX, x + CARD_W);
  maxY = Math.max(maxY, y + CARD_H);
}

const frame = figma.createFrame();
frame.name = FRAME_NAME;
frame.resize(maxX + FRAME_PAD, maxY + FRAME_PAD);
frame.fills = [{ type: "SOLID", color: { r: 0.05, g: 0.07, b: 0.1 } }];
page.appendChild(frame);

// Build cards
for (const [id, entry] of positioned) {
  const { route, x, y } = entry;

  // Card frame
  const card = figma.createFrame();
  card.name = route.title;
  card.resize(CARD_W, CARD_H);
  card.x = x;
  card.y = y;
  card.cornerRadius = 10;
  card.clipsContent = true;
  card.fills = [{ type: "SOLID", color: { r: 0.09, g: 0.1, b: 0.13 } }];
  frame.appendChild(card);

  // Screenshot fill
  const imgRect = figma.createRectangle();
  imgRect.resize(CARD_W, CARD_H - LABEL_H);
  imgRect.x = 0;
  imgRect.y = 0;
  try {
    const hash = await fetchImageHash(`${BASE_URL}/screenshots/${route.thumbnailName}`);
    imgRect.fills = [{ type: "IMAGE", scaleMode: "FILL", imageHash: hash }];
  } catch {
    imgRect.fills = [{ type: "SOLID", color: { r: 0.15, g: 0.17, b: 0.21 } }];
  }
  card.appendChild(imgRect);

  // Label bar
  const bar = figma.createFrame();
  bar.resize(CARD_W, LABEL_H);
  bar.x = 0;
  bar.y = CARD_H - LABEL_H;
  bar.fills = [{ type: "SOLID", color: { r: 0.09, g: 0.1, b: 0.13 } }];
  card.appendChild(bar);

  const label = figma.createText();
  label.characters = route.title;
  label.fontSize = 13;
  label.fontName = { family: "Inter", style: "Semi Bold" };
  label.fills = [{ type: "SOLID", color: { r: 0.8, g: 0.85, b: 0.9 } }];
  label.x = 12;
  label.y = 8;
  label.textAutoResize = "WIDTH_AND_HEIGHT";
  bar.appendChild(label);

  const sublabel = figma.createText();
  sublabel.characters = route.path;
  sublabel.fontSize = 11;
  sublabel.fontName = { family: "Inter", style: "Regular" };
  sublabel.fills = [{ type: "SOLID", color: { r: 0.45, g: 0.52, b: 0.6 } }];
  sublabel.x = 12;
  sublabel.y = 26;
  sublabel.textAutoResize = "WIDTH_AND_HEIGHT";
  bar.appendChild(sublabel);

  entry.node = card;
}

// Draw connectors (parent right-edge → child left-edge)
for (const [id, entry] of positioned) {
  const { route, x, y } = entry;
  if (!route.parentId || !positioned.has(route.parentId)) continue;

  const parent = positioned.get(route.parentId);

  const fromX = parent.x + CARD_W;
  const fromY = parent.y + CARD_H / 2;
  const toX   = x;
  const toY   = y + CARD_H / 2;
  const midX  = (fromX + toX) / 2;

  const line = figma.createVector();
  line.vectorNetwork = {
    vertices: [
      { x: fromX, y: fromY },
      { x: midX,  y: fromY },
      { x: midX,  y: toY   },
      { x: toX,   y: toY   },
    ],
    segments: [
      { start: 0, end: 1 },
      { start: 1, end: 2 },
      { start: 2, end: 3 },
    ],
  };
  line.strokes = [{ type: "SOLID", color: CONNECTOR_CLR }];
  line.strokeWeight = 1.5;
  line.fills = [];
  frame.appendChild(line);
}

figma.viewport.scrollAndZoomIntoView([frame]);
figma.notify(`Site map built — ${positioned.size} pages`);
```

---

## Step 5 — Stop the server

```bash
kill $SERVER_PID
```

---

## Layout reference

| Depth | Column | Content |
|-------|--------|---------|
| 0 | leftmost | Home (root) |
| 1 | +480px | Top-level hub pages + experiment pages |
| 2 | +960px | Experiment docs + landing pages |

Card size: 360 × 230px (186px image area + 44px label bar).  
Column gap: 480px. Row gap: 300px within each depth column.

---

## Troubleshooting

**Screenshots not loading in Figma**
The Figma Web app cannot reach `localhost`. Use Figma Desktop. Confirm `curl http://localhost:8765/screenshots/home.png` succeeds before running Step 4.

**`google-chrome` not found**
Use the GitHub Actions fallback in Step 1 (requires the `sitemap-capture.yml` workflow).

**Connector lines appear at wrong coordinates**
The plugin code places vectors in the frame's local coordinate space — `x`/`y` values are already relative to the frame's origin, so no offset adjustment is needed.

**Rate limits**
This workflow uses a single `use_figma` call regardless of page count. All screenshot fetching happens inside the plugin, not as separate MCP tool calls.
