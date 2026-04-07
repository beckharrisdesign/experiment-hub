# Web to Figma Grabber - Prototype

Script-first DOM-to-Figma capture utilities, plus a Chrome extension fallback.

You can run this without installing a browser extension by loading the hosted
capture script directly from your site.

This flow is now optimized for clipboard speed:

- click bookmarklet or run console snippet
- get overlay
- click your element
- payload is copied to clipboard

## Script-first (recommended)

### Console snippet

```js
(() => {
  const s = document.createElement("script");
  s.src = "https://labs.beckharrisdesign.com/scripts/web-to-figma-grabber-loader.js";
  s.async = true;
  document.head.appendChild(s);
})();
```

### Bookmarklet

Use this as the bookmark URL:

```text
javascript:(()=>{const s=document.createElement('script');s.src='https://labs.beckharrisdesign.com/scripts/web-to-figma-grabber-bookmarklet.js';s.async=true;document.head.appendChild(s);})();
```

### Debugging when "nothing happens"

If the bookmarklet appears to do nothing, open DevTools Console and inspect:

```js
window.__WEB_TO_FIGMA_DEBUG__
```

If you see an error loading `https://<current-site>/lib/capture.js`, your
loader is stale. The current loader resolves `capture.js` from the loader host
(`labs.beckharrisdesign.com`) and supports an explicit override via:

```js
window.__FIGMA_CAPTURE_CONFIG = {
  ...(window.__FIGMA_CAPTURE_CONFIG || {}),
  assetOrigin: "https://labs.beckharrisdesign.com"
};
```

This object includes:

- `status` (`bookmarklet-started`, `loader-loading-capture`, `loader-launch-called`,
  `loader-capture-dispatched`, `loader-launch-error`, etc.)
- `errors[]` with timestamped failures
- `events[]` with timestamped trace steps
- resolved script URLs used by the loader

Quick checks:

1. Confirm bookmarklet script can load:
   - visit `https://labs.beckharrisdesign.com/scripts/web-to-figma-grabber-bookmarklet.js`
2. Confirm loader script can load:
   - visit `https://labs.beckharrisdesign.com/scripts/web-to-figma-grabber-loader.js`
3. Confirm capture script can load:
   - visit `https://labs.beckharrisdesign.com/lib/capture.js`
4. Run this in Console and check `window.__WEB_TO_FIGMA_DEBUG__`:

```js
(() => {
  const s = document.createElement("script");
  s.src = "https://labs.beckharrisdesign.com/scripts/web-to-figma-grabber-loader.js?debug=1";
  s.async = true;
  document.head.appendChild(s);
})();
```

The loader injects:

- `https://labs.beckharrisdesign.com/lib/capture.js`

and then starts:

- `window.figma.captureForDesign({ mode: "clipboard", verbose: true })`

When `selector` is omitted, `capture.js` opens its interactive page picker overlay
so you can click the exact element to capture.

No captureId or endpoint prompts are required in this default flow.

You can still run your own call afterwards, for example:

```js
window.figma.captureForDesign({
  selector: "body",
  verbose: true,
  // optional:
  // captureId: "<capture-id>",
  // endpoint: "https://mcp.figma.com/mcp/html-to-design/capture/<capture-id>/submit"
});
```

---

Chrome extension MVP for selecting a DOM element and sending a structured
capture payload for Figma ingestion in two modes:

- Screenshot mode (pixel-accurate image crop)
- Layout mode (editable structural JSON)

## Quick Start

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this directory:
   `experiments/web-to-figma-grabber/prototype`
5. Open any page and click the extension icon

## What the MVP Does

- Toggle element picker overlay
- Highlight hovered element
- Click element to select target
- Choose mode:
  - **Screenshot**: uses `chrome.tabs.captureVisibleTab` + viewport crop metadata
  - **Layout**: collects a bounded element subtree with computed style subset
- Configure Figma target:
  - File key (optional)
  - Page name (optional)
- Export payload:
  - Download as `.json`
  - Copy JSON to clipboard

## Payload Schema

All payloads use envelope schema version `1.0.0`:

```json
{
  "schemaVersion": "1.0.0",
  "mode": "screenshot | layout",
  "capturedAt": "ISO8601",
  "source": {
    "pageUrl": "https://...",
    "pageTitle": "Page title",
    "viewport": { "width": 1440, "height": 900 }
  },
  "target": {
    "fileKey": "optional-figma-file-key",
    "pageName": "optional-target-page-name"
  },
  "payload": {}
}
```

## Files

```
prototype/
├── manifest.json
└── src/
    ├── background.js
    ├── content.js
    ├── popup.html
    ├── popup.css
    ├── popup.js
    ├── icon.svg
    └── shared/
        └── capture-utils.js
```

## Notes

- This MVP does not write directly to Figma yet.
- Expected handoff is to the existing Figma MCP workflow (paste/import JSON, then
  place via `use_figma`).
