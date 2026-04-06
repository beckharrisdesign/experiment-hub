# Web to Figma Grabber - Prototype

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
