# Sitemap to Figma

Capture real browser screenshots of every route in the site and render them as a visual sitemap tree inside the "BHD Labs — Site Map" frame in Figma.

Figma file key: `9VJTxmBWKgeCDTyJLsYM7I`
Sitemap frame node: `116:209`

---

## When to use

Invoke with `/sitemap` any time you want to refresh the Figma sitemap with current screenshots, or when asked to "update the sitemap", "take screenshots of the site", or "build the sitemap in Figma".

---

## Prerequisites

- **Figma Desktop** must be running (the plugin needs to reach `localhost`; Figma Web cannot).
- Chrome must be available at `google-chrome` or the capture step will fail (see GitHub Actions fallback below).
- The live site must be reachable at `https://labs.beckharrisdesign.com`.

---

## Execution steps

### Step 1 — Check for fresh screenshots

Run:
```bash
find .site-map/experiment-hub/screenshots -name "*.png" -mmin -1440 2>/dev/null | wc -l
```

If the count equals or exceeds the total number of routes (check `scripts/site-map/routes.js` with `node -e "const r=require('./scripts/site-map/routes.js');console.log(r.getExperimentHubSiteMapRoutes().length)"`), screenshots are fresh — skip to Step 3.

### Step 2 — Capture screenshots

Run the capture script with viewport height so cards are proportional:

```bash
node --experimental-strip-types scripts/site-map/capture.mjs \
  --base-url=https://labs.beckharrisdesign.com \
  --height=900 \
  --delay-ms=2500 \
  --clean
```

This writes PNGs to `.site-map/experiment-hub/screenshots/` and a manifest to `.site-map/experiment-hub/manifest.json`.

**If `google-chrome` is not found:** tell the user to either install Chrome or trigger the `sitemap-capture` GitHub Actions workflow (`.github/workflows/sitemap-capture.yml`), download the artifact, and unzip it into `.site-map/experiment-hub/`. Then resume from Step 3.

### Step 3 — Read the manifest

```bash
cat .site-map/experiment-hub/manifest.json
```

Note the array of routes — each has `id`, `title`, `group`, `depth`, `parentId`, `thumbnailName`, `captureStatus`.

Only include routes where `captureStatus === "captured"`.

### Step 4 — Start a localhost file server

```bash
python3 -m http.server 8765 --directory .site-map/experiment-hub &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
```

Note the PID — you will kill it in Step 6.

### Step 5 — Write the sitemap to Figma via use_figma

Call the `use_figma` Figma MCP tool with `fileKey: "9VJTxmBWKgeCDTyJLsYM7I"` and the plugin code below.

Substitute `ROUTES_JSON` with the JSON array of captured routes from Step 3 (filter to `captureStatus === "captured"` only, keep fields: `id`, `title`, `depth`, `parentId`, `thumbnailName`).

```javascript
(async () => {
  // ─── config ───────────────────────────────────────────────────────
  const CARD_W       = 360;
  const CARD_H       = 230;
  const H_GAP        = 120;  // horizontal gap between depth columns
  const V_GAP        = 40;   // vertical gap between cards in same column
  const FRAME_PAD    = 80;
  const LABEL_H      = 32;
  const SERVER       = 'http://localhost:8765';
  const FRAME_NAME   = 'BHD Labs — Site Map';

  const routes = ROUTES_JSON; // injected — array of {id, title, depth, parentId, thumbnailName}

  // ─── find or create the sitemap frame ─────────────────────────────
  const page = figma.currentPage;
  let frame = page.findOne(n => n.type === 'FRAME' && n.name === FRAME_NAME);
  if (frame) {
    // remove all children to rebuild
    for (const child of [...frame.children]) child.remove();
  } else {
    frame = figma.createFrame();
    frame.name = FRAME_NAME;
    page.appendChild(frame);
  }
  frame.fills = [{ type: 'SOLID', color: { r: 0.07, g: 0.07, b: 0.09 } }];
  frame.clipsContent = false;

  // ─── load fonts ───────────────────────────────────────────────────
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });

  // ─── group routes by depth, preserve order ────────────────────────
  const byDepth = {};
  for (const r of routes) {
    if (!byDepth[r.depth]) byDepth[r.depth] = [];
    byDepth[r.depth].push(r);
  }
  const depths = Object.keys(byDepth).map(Number).sort((a, b) => a - b);

  // ─── assign positions ─────────────────────────────────────────────
  const posMap = {}; // id → {x, y}
  const colWidth = CARD_W + H_GAP;

  for (const depth of depths) {
    const col = byDepth[depth];
    const x = FRAME_PAD + depth * colWidth;
    for (let i = 0; i < col.length; i++) {
      const y = FRAME_PAD + i * (CARD_H + V_GAP);
      posMap[col[i].id] = { x, y };
    }
  }

  // ─── helper: fetch PNG bytes from localhost ────────────────────────
  async function fetchImage(thumbnailName) {
    try {
      const res = await fetch(`${SERVER}/screenshots/${thumbnailName}`);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      return new Uint8Array(buf);
    } catch {
      return null;
    }
  }

  // ─── build cards ──────────────────────────────────────────────────
  const cardMap = {}; // id → frame node

  for (const route of routes) {
    const pos = posMap[route.id];

    // outer card frame
    const card = figma.createFrame();
    card.name = route.title;
    card.resize(CARD_W, CARD_H);
    card.x = pos.x;
    card.y = pos.y;
    card.cornerRadius = 6;
    card.clipsContent = true;
    card.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.12, b: 0.15 } }];

    // screenshot fill (top portion)
    const imgBytes = await fetchImage(route.thumbnailName);
    if (imgBytes) {
      const imgHash = figma.createImage(imgBytes).hash;
      const screenshotH = CARD_H - LABEL_H;
      const imgRect = figma.createRectangle();
      imgRect.resize(CARD_W, screenshotH);
      imgRect.x = 0;
      imgRect.y = 0;
      imgRect.fills = [{
        type: 'IMAGE',
        scaleMode: 'FILL',
        imageHash: imgHash,
      }];
      card.appendChild(imgRect);
    } else {
      // fallback: grey placeholder
      const placeholder = figma.createRectangle();
      placeholder.resize(CARD_W, CARD_H - LABEL_H);
      placeholder.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.25 } }];
      card.appendChild(placeholder);
    }

    // label bar
    const labelBar = figma.createFrame();
    labelBar.resize(CARD_W, LABEL_H);
    labelBar.x = 0;
    labelBar.y = CARD_H - LABEL_H;
    labelBar.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.2 } }];

    const label = figma.createText();
    label.characters = route.title;
    label.fontSize = 12;
    label.fontName = { family: 'Inter', style: 'Medium' };
    label.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.95 } }];
    label.x = 10;
    label.y = (LABEL_H - 14) / 2;
    labelBar.appendChild(label);
    card.appendChild(labelBar);

    frame.appendChild(card);
    cardMap[route.id] = card;
  }

  // ─── draw connectors (parent right-edge → child left-edge) ─────────
  for (const route of routes) {
    if (!route.parentId || !cardMap[route.parentId] || !cardMap[route.id]) continue;

    const parent = cardMap[route.parentId];
    const child  = cardMap[route.id];

    const x1 = parent.x + CARD_W;
    const y1 = parent.y + CARD_H / 2;
    const x2 = child.x;
    const y2 = child.y + CARD_H / 2;
    const mx = (x1 + x2) / 2;

    const line = figma.createVector();
    line.vectorNetwork = {
      vertices: [
        { x: x1, y: y1 },
        { x: mx, y: y1 },
        { x: mx, y: y2 },
        { x: x2, y: y2 },
      ],
      segments: [
        { start: 0, end: 1 },
        { start: 1, end: 2 },
        { start: 2, end: 3 },
      ],
    };
    line.strokes = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.5 }, opacity: 0.6 }];
    line.strokeWeight = 1.5;
    line.fills = [];
    frame.appendChild(line);
  }

  // ─── resize frame to content ───────────────────────────────────────
  const maxDepth = Math.max(...depths);
  const maxColLen = Math.max(...depths.map(d => byDepth[d].length));
  frame.resize(
    FRAME_PAD * 2 + (maxDepth + 1) * colWidth - H_GAP,
    FRAME_PAD * 2 + maxColLen * (CARD_H + V_GAP) - V_GAP
  );

  figma.viewport.scrollAndZoomIntoView([frame]);
  return `Built sitemap: ${routes.length} routes across ${depths.length} depth levels`;
})();
```

### Step 6 — Stop the file server

```bash
kill $SERVER_PID
```

Or if the PID was lost: `lsof -ti:8765 | xargs kill -9 2>/dev/null || true`

---

## GitHub Actions fallback (no local Chrome)

If Step 2 fails because `google-chrome` is not installed:

1. Tell the user to go to the repo → Actions → **Sitemap Capture** → **Run workflow**.
2. Once the run completes, download the `sitemap-screenshots` artifact.
3. Unzip into `.site-map/experiment-hub/` so that `screenshots/` and `manifest.json` are present.
4. Resume from Step 3 above.

---

## What good output looks like

- The "BHD Labs — Site Map" frame on the **Landing Page** canvas is rebuilt from scratch.
- Every captured route has a card showing its real viewport screenshot (1440×900).
- Cards are arranged in columns by depth: depth-0 leftmost, deeper routes to the right.
- Orthogonal connector lines link each card to its parent.
- The frame auto-sizes to fit all content with 80px padding.
- Figma viewport pans and zooms to show the completed frame.
