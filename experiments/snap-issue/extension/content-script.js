/* global chrome */

const MIN = 4;
const Z = 2147483647;

let overlayRoot = null;
let state = null;

function teardown() {
  if (overlayRoot?.parentNode) {
    overlayRoot.parentNode.removeChild(overlayRoot);
  }
  overlayRoot = null;
  state = null;
  window.removeEventListener('keydown', onKey, true);
}

function onKey(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    teardown();
    chrome.runtime.sendMessage({ type: 'SNAP_ISSUE_SELECTION_CANCEL' });
  } else if (e.key === 'Enter' && state?.rect) {
    const { rect } = state;
    if (rect.width >= MIN && rect.height >= MIN) {
      e.preventDefault();
      e.stopPropagation();
      const payload = {
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
        dpr: window.devicePixelRatio || 1,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        pageUrl: location.href,
        pageTitle: document.title,
      };
      teardown();
      chrome.runtime.sendMessage({
        type: 'SNAP_ISSUE_SELECTION_DONE',
        payload,
      });
    }
  }
}

function updateShade(rect) {
  if (!overlayRoot || !state) return;
  const { w, h, shadeTop, shadeBottom, shadeLeft, shadeRight, border } = state;
  const r = rect;
  shadeTop.style.height = `${Math.max(0, r.top)}px`;
  shadeBottom.style.top = `${r.top + r.height}px`;
  shadeBottom.style.height = `${Math.max(0, h - r.top - r.height)}px`;
  shadeLeft.style.top = `${r.top}px`;
  shadeLeft.style.height = `${r.height}px`;
  shadeLeft.style.width = `${Math.max(0, r.left)}px`;
  shadeRight.style.top = `${r.top}px`;
  shadeRight.style.height = `${r.height}px`;
  shadeRight.style.left = `${r.left + r.width}px`;
  shadeRight.style.width = `${Math.max(0, w - r.left - r.width)}px`;
  Object.assign(border.style, {
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
  });
}

function startOverlay() {
  teardown();
  const w = window.innerWidth;
  const h = window.innerHeight;
  const root = document.createElement('div');
  root.id = 'snap-issue-overlay-root';
  Object.assign(root.style, {
    position: 'fixed',
    inset: '0',
    zIndex: String(Z),
    pointerEvents: 'auto',
  });

  const scrim = document.createElement('div');
  Object.assign(scrim.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(13, 17, 23, 0.55)',
    pointerEvents: 'auto',
  });

  const hint = document.createElement('div');
  hint.textContent = 'Drag to select · Enter confirm · Esc cancel';
  Object.assign(hint.style, {
    position: 'fixed',
    top: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '8px 12px',
    background: '#21262d',
    color: '#c9d1d9',
    border: '1px solid #30363d',
    borderRadius: '8px',
    font: '12px system-ui, sans-serif',
    zIndex: String(Z + 1),
    pointerEvents: 'none',
  });

  const shade = (extra) => {
    const d = document.createElement('div');
    Object.assign(d.style, {
      position: 'fixed',
      left: '0',
      right: '0',
      background: 'rgba(13, 17, 23, 0.55)',
      pointerEvents: 'none',
      ...extra,
    });
    return d;
  };

  const shadeTop = shade({ top: '0', width: '100%' });
  const shadeBottom = shade({ left: '0', width: '100%' });
  const shadeLeft = shade({ left: '0' });
  const shadeRight = shade({});

  const border = document.createElement('div');
  Object.assign(border.style, {
    position: 'fixed',
    boxSizing: 'border-box',
    border: '2px solid #58a6ff',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.35) inset',
    pointerEvents: 'none',
    zIndex: String(Z + 1),
    visibility: 'hidden',
  });

  [shadeTop, shadeBottom, shadeLeft, shadeRight].forEach((el) => {
    el.style.visibility = 'hidden';
  });

  root.append(scrim, shadeTop, shadeBottom, shadeLeft, shadeRight, border, hint);
  document.documentElement.appendChild(root);

  overlayRoot = root;
  state = {
    w,
    h,
    scrim,
    shadeTop,
    shadeBottom,
    shadeLeft,
    shadeRight,
    border,
    dragging: false,
    startX: 0,
    startY: 0,
    rect: null,
  };

  const normRect = (x0, y0, x1, y1) => {
    const left = Math.min(x0, x1);
    const top = Math.min(y0, y1);
    const width = Math.abs(x1 - x0);
    const height = Math.abs(y1 - y0);
    return { left, top, width, height };
  };

  root.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      if (state.scrim) {
        state.scrim.remove();
        state.scrim = null;
      }
      [state.shadeTop, state.shadeBottom, state.shadeLeft, state.shadeRight, state.border].forEach(
        (el) => {
          el.style.visibility = 'visible';
        }
      );
      state.dragging = true;
      root.setPointerCapture(e.pointerId);
      state.startX = e.clientX;
      state.startY = e.clientY;
      state.rect = normRect(e.clientX, e.clientY, e.clientX, e.clientY);
      updateShade(state.rect);
    },
    true
  );

  root.addEventListener(
    'pointermove',
    (e) => {
      if (!state?.dragging) return;
      e.preventDefault();
      state.rect = normRect(state.startX, state.startY, e.clientX, e.clientY);
      updateShade(state.rect);
    },
    true
  );

  root.addEventListener(
    'pointerup',
    (e) => {
      if (!state?.dragging) return;
      state.dragging = false;
      try {
        root.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      state.rect = normRect(state.startX, state.startY, e.clientX, e.clientY);
      updateShade(state.rect);
    },
    true
  );

  window.addEventListener('keydown', onKey, true);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SNAP_ISSUE_PING') {
    sendResponse({ ok: true });
    return false;
  }
  if (msg.type === 'SNAP_ISSUE_START') {
    startOverlay();
    sendResponse({ ok: true });
    return false;
  }
  return false;
});
