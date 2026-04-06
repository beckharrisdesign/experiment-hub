import { buildDomPath, clampRectToBounds, extractStyleSubset } from "./shared/capture-utils.js";

const SELECTOR_OVERLAY_ID = "wtfg-selector-overlay";
const HIGHLIGHT_ID = "wtfg-highlight-box";
const SELECTED_ID = "wtfg-selected-box";

let active = false;
let hoveredElement = null;
let selectedElement = null;
const MAX_LAYOUT_DEPTH = 4;
const MAX_CHILDREN_PER_NODE = 20;

function ensureOverlay() {
  if (!document.getElementById(SELECTOR_OVERLAY_ID)) {
    const overlay = document.createElement("div");
    overlay.id = SELECTOR_OVERLAY_ID;
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "2147483646",
    });

    const highlight = document.createElement("div");
    highlight.id = HIGHLIGHT_ID;
    Object.assign(highlight.style, {
      position: "fixed",
      border: "2px solid #58a6ff",
      background: "rgba(88, 166, 255, 0.12)",
      pointerEvents: "none",
      display: "none",
      zIndex: "2147483647",
    });

    const selected = document.createElement("div");
    selected.id = SELECTED_ID;
    Object.assign(selected.style, {
      position: "fixed",
      border: "2px solid #3fb950",
      background: "rgba(63, 185, 80, 0.18)",
      pointerEvents: "none",
      display: "none",
      zIndex: "2147483647",
    });

    overlay.appendChild(highlight);
    overlay.appendChild(selected);
    document.documentElement.appendChild(overlay);
  }
}

function removeOverlay() {
  const overlay = document.getElementById(SELECTOR_OVERLAY_ID);
  if (overlay) overlay.remove();
}

function drawBox(id, rect) {
  const node = document.getElementById(id);
  if (!node) return;
  Object.assign(node.style, {
    display: "block",
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
}

function hideBox(id) {
  const node = document.getElementById(id);
  if (!node) return;
  node.style.display = "none";
}

function getRect(el) {
  const rect = el.getBoundingClientRect();
  return clampRectToBounds(
    {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    },
    { width: window.innerWidth, height: window.innerHeight },
  );
}

function buildElementPath(el) {
  const segments = [];
  let current = el;
  while (current && current.nodeType === Node.ELEMENT_NODE && segments.length < 8) {
    const parent = current.parentElement;
    const siblings = parent
      ? Array.from(parent.children).filter(
          (child) => child.tagName === current.tagName,
        )
      : [current];
    const index = Math.max(0, siblings.indexOf(current));
    segments.unshift({
      tag: current.tagName.toLowerCase(),
      id: current.id || undefined,
      classes:
        current.classList && current.classList.length
          ? Array.from(current.classList).slice(0, 3)
          : undefined,
      index,
    });
    current = parent;
  }
  return buildDomPath(segments);
}

function getStyleMap(el) {
  const computed = window.getComputedStyle(el);
  return extractStyleSubset(
    {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      lineHeight: computed.lineHeight,
      borderRadius: computed.borderRadius,
      border: computed.border,
      padding: computed.padding,
      margin: computed.margin,
      display: computed.display,
      position: computed.position,
    },
    [
      "color",
      "backgroundColor",
      "fontFamily",
      "fontSize",
      "fontWeight",
      "lineHeight",
      "borderRadius",
      "border",
      "padding",
      "margin",
      "display",
      "position",
    ],
  );
}

function collectLayoutNode(node, depth = 0) {
  const rect = getRect(node);
  const computed = window.getComputedStyle(node);
  const payload = {
    tag: node.tagName.toLowerCase(),
    text: (node.textContent || "").trim().slice(0, 300),
    rect,
    style: getStyleMap(node),
    layout: {
      display: computed.display,
      flexDirection: computed.flexDirection,
      justifyContent: computed.justifyContent,
      alignItems: computed.alignItems,
      gap: computed.gap,
      gridTemplateColumns: computed.gridTemplateColumns,
      gridTemplateRows: computed.gridTemplateRows,
    },
    children: [],
  };

  if (depth >= MAX_LAYOUT_DEPTH) {
    return payload;
  }

  const childElements = Array.from(node.children).slice(0, MAX_CHILDREN_PER_NODE);
  payload.children = childElements.map((child) => collectLayoutNode(child, depth + 1));
  return payload;
}

function startSelection(config) {
  if (active) return;
  active = true;
  ensureOverlay();
  document.body.style.cursor = "crosshair";
  window.addEventListener("mousemove", onMouseMove, true);
  window.addEventListener("click", onClick, true);
  window.addEventListener("keydown", onKeyDown, true);
}

function stopSelection() {
  active = false;
  hoveredElement = null;
  document.body.style.cursor = "";
  hideBox(HIGHLIGHT_ID);
  window.removeEventListener("mousemove", onMouseMove, true);
  window.removeEventListener("click", onClick, true);
  window.removeEventListener("keydown", onKeyDown, true);
}

function onMouseMove(event) {
  if (!active) return;
  const el = document.elementFromPoint(event.clientX, event.clientY);
  if (!el || el.id === SELECTOR_OVERLAY_ID || el.id === HIGHLIGHT_ID || el.id === SELECTED_ID) {
    return;
  }
  hoveredElement = el;
  const rect = getRect(el);
  drawBox(HIGHLIGHT_ID, rect);
}

async function onClick(event) {
  if (!active) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  const el = hoveredElement || document.elementFromPoint(event.clientX, event.clientY);
  if (!el) return;
  selectedElement = el;
  const rect = getRect(el);
  drawBox(SELECTED_ID, rect);
  stopSelection();

  chrome.runtime.sendMessage({
    type: "W2F_SELECTION_READY",
    selectedRect: rect,
    domPath: buildElementPath(el),
    pageUrl: window.location.href,
    pageTitle: document.title,
    viewport: { width: window.innerWidth, height: window.innerHeight },
  });
}

function onKeyDown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    stopSelection();
    removeOverlay();
    chrome.runtime.sendMessage({ type: "W2F_SELECTION_CANCELLED" });
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return false;

  if (message.type === "W2F_PICK_ELEMENT") {
    startSelection();
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "W2F_CAPTURE_LAYOUT") {
    if (!selectedElement) {
      sendResponse({ ok: false, error: "No selected element. Click Pick element first." });
      return true;
    }

    const payload = {
      mode: "layout",
      pageUrl: window.location.href,
      pageTitle: document.title,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      selectedRect: getRect(selectedElement),
      domPath: buildElementPath(selectedElement),
      tree: collectLayoutNode(selectedElement),
    };

    sendResponse({ ok: true, capture: payload });
    return true;
  }

  if (message.type === "W2F_CAPTURE_SCREENSHOT") {
    if (!selectedElement) {
      sendResponse({ ok: false, error: "No selected element. Click Pick element first." });
      return true;
    }

    const payload = {
      mode: "screenshot",
      pageUrl: window.location.href,
      pageTitle: document.title,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      selectedRect: getRect(selectedElement),
      domPath: buildElementPath(selectedElement),
      imageDataUrl: message.imageDataUrl,
    };

    sendResponse({ ok: true, capture: payload });
    return true;
  }

  if (message.type === "W2F_RESET") {
    selectedElement = null;
    stopSelection();
    removeOverlay();
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

