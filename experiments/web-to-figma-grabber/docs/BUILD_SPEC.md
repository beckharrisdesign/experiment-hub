# Web to Figma Grabber - MVP Build Spec

## Goal

Ship a local, installable Chrome extension MVP that captures a selected DOM
element in either screenshot mode or lightweight layout mode, then produces a
Figma-ready payload for manual MCP handoff.

## Non-goals (v1)

- No direct OAuth integration to Figma APIs
- No automatic component recognition
- No token extraction or design-system mapping
- No multi-element batch capture

## Architecture

The MVP has four modules:

1. **Popup UI (`popup.html` + `popup.js`)**
   - User chooses mode (`screenshot` or `layout`)
   - User enters optional `fileKey` and `pageName`
   - User toggles element-picker on current tab
   - User runs capture and copies/downloads payload

2. **Background service worker (`background.js`)**
   - Manages extension state per tab
   - Injects content script when needed
   - Relays popup commands to content script
   - Uses `chrome.tabs.captureVisibleTab` for screenshot mode

3. **Content script (`content.js`)**
   - Provides hover/highlight picker
   - Stores current selected element
   - Builds layout payload from selected node subtree
   - Emits selection metadata to popup

4. **Shared capture utilities (`lib/web-to-figma-grabber/capture-utils.ts`)**
   - Rectangle clamping
   - DOM path creation
   - Envelope assembly for stable schema
   - Shared by tests and extension code contract

## Capture Contract

Schema version: `1.0.0`

### Common envelope

```json
{
  "schemaVersion": "1.0.0",
  "mode": "screenshot | layout",
  "capturedAt": "ISO-8601 timestamp",
  "source": {
    "pageUrl": "string",
    "pageTitle": "string",
    "viewport": { "width": 0, "height": 0 }
  },
  "target": {
    "fileKey": "optional string",
    "pageName": "optional string"
  },
  "payload": {}
}
```

### Screenshot payload

```json
{
  "selectedRect": { "x": 0, "y": 0, "width": 0, "height": 0 },
  "imageDataUrl": "data:image/png;base64,...",
  "domPath": "css-like dom path"
}
```

### Layout payload

```json
{
  "selectedRect": { "x": 0, "y": 0, "width": 0, "height": 0 },
  "domPath": "css-like dom path",
  "tree": {
    "tag": "div",
    "text": "optional direct text",
    "rect": { "x": 0, "y": 0, "width": 0, "height": 0 },
    "style": {
      "display": "block",
      "color": "rgb(...)",
      "fontSize": "16px"
    },
    "children": []
  }
}
```

## User Flow

1. Open website
2. Open extension popup
3. Choose mode and optional Figma target values
4. Click **Pick element**
5. Hover + click target element
6. Click **Capture**
7. Copy JSON payload or download payload file
8. Paste/use payload in Figma MCP workflow

## File Layout (implemented)

```text
experiments/web-to-figma-grabber/prototype/
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

## Error Handling

- No selected element: show inline warning in popup
- Capture API fails: return action-specific error message
- Layout tree too large: truncate at max depth and max children per node

## Validation Plan for Build

Agent-runnable checks:

1. Unit tests for capture utilities pass
2. Manual smoke run:
   - Load unpacked extension
   - Pick element on any site
   - Run screenshot capture
   - Run layout capture
   - Confirm JSON includes `schemaVersion`, `mode`, `source`, `target`, `payload`

