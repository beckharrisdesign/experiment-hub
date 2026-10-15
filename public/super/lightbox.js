/*
 * Image lightbox for beckharrisdesign.com (Notion → Super).
 *
 * Replaces Super's stock snippet (sites.super.so/snippets/v2/lightbox.js),
 * which opens one image at a time with no keyboard, no captions, no
 * neighbours and no hi-res: it re-shows the same 1920px file the page
 * already loaded, and the only way out is the close button or a click.
 *
 * What this one does:
 *   - Gallery: every content image on the page, in reading order.
 *     ← / → keys, on-screen buttons, and swipe on touch screens.
 *   - Caption: the Notion caption under the image (alt text as fallback),
 *     plus a "3 / 7" counter.
 *   - Hi-res: shows the already-loaded image instantly, then swaps in a
 *     larger Cloudflare variant once it arrives. Neighbours are preloaded.
 *   - Zoom: click the image (or press Z) to see it at full size and pan by
 *     scrolling or dragging. Only offered when there is more to see.
 *   - Accessible: images are keyboard-focusable buttons; the viewer is a
 *     modal dialog that traps focus, closes on Esc, and returns focus to the
 *     image that opened it. Honours prefers-reduced-motion.
 *   - Locks page scroll while open.
 *
 * Install: Super's head code carries one line (and Super's own lightbox
 * snippet comes out — see experiments/super-css-control/README.md):
 *
 *   <script src="https://labs.beckharrisdesign.com/super/lightbox.js" async></script>
 *
 * Styles live in site.css, section 10, so they load render-blocking in the
 * head with the rest of the library.
 *
 * Super is a Next.js app: pages change without a reload. Clicks are handled
 * by one delegated listener, and a light MutationObserver keeps newly
 * rendered images keyboard-reachable, so client-side navigation just works.
 */
(function () {
  "use strict";
  if (window.__bhdLightbox) return; // loaded twice — keep the first
  window.__bhdLightbox = true;

  /* Content images only: Notion image blocks. Linked images keep their link. */
  var IMAGE_SELECTOR = ".notion-image img";
  /* Cloudflare Images flexible variant used by Super: w=1920,quality=90,… */
  var HIRES_WIDTH = 3200;
  var SWIPE_PX = 50;

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var root, stage, img, caption, counter, btnPrev, btnNext, btnClose, btnZoom;
  var items = [];
  var index = 0;
  var opener = null;
  var isOpen = false;
  var loadToken = 0;

  /* ---------- helpers ---------- */

  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    for (var k in attrs || {}) n.setAttribute(k, attrs[k]);
    return n;
  }

  function isEligible(node) {
    return (
      node &&
      node.tagName === "IMG" &&
      node.matches(IMAGE_SELECTOR) &&
      !node.closest("a") &&
      !(root && root.contains(node))
    );
  }

  function eligibleImages() {
    return Array.prototype.filter.call(
      document.querySelectorAll(IMAGE_SELECTOR),
      isEligible
    );
  }

  function displaySrc(node) {
    return node.currentSrc || node.src;
  }

  function hiresSrc(node) {
    var src = displaySrc(node);
    if (/images\.spr\.so\/cdn-cgi\/imagedelivery\//.test(src) && /\bw=\d+/.test(src)) {
      return src.replace(/\bw=\d+/, "w=" + HIRES_WIDTH);
    }
    return src;
  }

  function captionFor(node) {
    var block = node.closest(".notion-image");
    var fig = block && block.querySelector("figcaption, .notion-caption");
    var text = fig ? fig.textContent.trim() : "";
    return text || (node.alt || "").trim();
  }

  function enhance(node) {
    if (!isEligible(node) || node.hasAttribute("data-bhd-lb")) return;
    node.setAttribute("data-bhd-lb", "");
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "button");
    var label = (node.alt || "").trim();
    node.setAttribute("aria-label", label ? "Enlarge image: " + label : "Enlarge image");
  }

  function enhanceAll() {
    eligibleImages().forEach(enhance);
  }

  /* ---------- build the dialog once ---------- */

  function build() {
    root = el("div", "bhd-lb", {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Image viewer",
      hidden: "",
    });
    if (reduceMotion) root.classList.add("bhd-lb--still");

    stage = el("div", "bhd-lb__stage");
    img = el("img", "bhd-lb__img", { alt: "", draggable: "false" });
    stage.appendChild(img);

    var bar = el("div", "bhd-lb__bar");
    counter = el("p", "bhd-lb__count", { "aria-live": "polite" });
    caption = el("p", "bhd-lb__caption");
    bar.appendChild(counter);
    bar.appendChild(caption);

    btnClose = button("bhd-lb__btn bhd-lb__close", "Close image viewer (Esc)", "×");
    btnPrev = button("bhd-lb__btn bhd-lb__prev", "Previous image (←)", "‹");
    btnNext = button("bhd-lb__btn bhd-lb__next", "Next image (→)", "›");
    btnZoom = button("bhd-lb__btn bhd-lb__zoom", "Zoom to full size (Z)", "+");

    root.appendChild(stage);
    root.appendChild(bar);
    root.appendChild(btnPrev);
    root.appendChild(btnNext);
    root.appendChild(btnZoom);
    root.appendChild(btnClose);
    document.body.appendChild(root);

    btnClose.addEventListener("click", close);
    btnPrev.addEventListener("click", function () { go(-1); });
    btnNext.addEventListener("click", function () { go(1); });
    btnZoom.addEventListener("click", function () { toggleZoom(); });
    root.addEventListener("keydown", onKey);
    stage.addEventListener("click", onStageClick);
    img.addEventListener("load", syncZoomAvailability);
    wireTouch();
    wireDragPan();
  }

  function button(cls, label, glyph) {
    var b = el("button", cls, { type: "button", "aria-label": label, title: label });
    b.innerHTML = '<span aria-hidden="true">' + glyph + "</span>";
    return b;
  }

  /* ---------- open / close / navigate ---------- */

  function open(node) {
    items = eligibleImages();
    index = Math.max(0, items.indexOf(node));
    opener = node;
    if (!root || !document.body.contains(root)) build();

    root.hidden = false;
    document.documentElement.classList.add("bhd-lb-open");
    isOpen = true;
    show(index);
    // next frame so the fade-in transition runs
    requestAnimationFrame(function () { root.classList.add("is-visible"); });
    btnClose.focus({ preventScroll: true });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    setZoom(false);
    root.classList.remove("is-visible");
    document.documentElement.classList.remove("bhd-lb-open");
    var done = function () {
      if (!isOpen) {
        root.hidden = true;
        img.removeAttribute("src");
      }
    };
    if (reduceMotion) done(); else setTimeout(done, 200);
    if (opener && document.body.contains(opener)) opener.focus({ preventScroll: true });
  }

  function go(step) {
    if (items.length < 2) return;
    show((index + step + items.length) % items.length);
  }

  function show(i) {
    index = i;
    var node = items[i];
    var token = ++loadToken;
    setZoom(false);

    // Instant: the file the page already has. Then upgrade.
    img.src = displaySrc(node);
    img.alt = (node.alt || "").trim();
    var hi = hiresSrc(node);
    if (hi !== img.src) {
      var pre = new Image();
      pre.onload = function () {
        if (token === loadToken && isOpen) img.src = hi;
      };
      pre.src = hi;
    }

    var text = captionFor(node);
    caption.textContent = text;
    caption.hidden = !text;
    var multi = items.length > 1;
    counter.textContent = multi ? i + 1 + " / " + items.length : "";
    counter.hidden = !multi;
    btnPrev.hidden = btnNext.hidden = !multi;

    preload(i + 1);
    preload(i - 1);
  }

  function preload(i) {
    if (items.length < 2) return;
    var node = items[(i + items.length) % items.length];
    new Image().src = hiresSrc(node);
  }

  /* ---------- zoom ---------- */

  function canZoom() {
    // only when the image has more pixels than the fitted view shows
    return (
      img.naturalWidth > img.clientWidth + 8 ||
      img.naturalHeight > img.clientHeight + 8
    );
  }

  function syncZoomAvailability() {
    if (root.classList.contains("is-zoomed")) return;
    var ok = canZoom();
    btnZoom.hidden = !ok;
    stage.classList.toggle("can-zoom", ok);
  }

  function setZoom(on, focusX, focusY) {
    if (!root) return;
    var was = root.classList.contains("is-zoomed");
    if (on === was) return;
    if (on) {
      var rect = img.getBoundingClientRect();
      var fx = focusX == null ? 0.5 : (focusX - rect.left) / rect.width;
      var fy = focusY == null ? 0.5 : (focusY - rect.top) / rect.height;
      root.classList.add("is-zoomed");
      btnZoom.setAttribute("aria-label", "Fit to screen (Z)");
      btnZoom.title = "Fit to screen (Z)";
      btnZoom.firstChild.textContent = "−";
      // keep the clicked point under the cursor
      stage.scrollLeft = fx * img.offsetWidth - stage.clientWidth / 2;
      stage.scrollTop = fy * img.offsetHeight - stage.clientHeight / 2;
    } else {
      root.classList.remove("is-zoomed");
      btnZoom.setAttribute("aria-label", "Zoom to full size (Z)");
      btnZoom.title = "Zoom to full size (Z)";
      btnZoom.firstChild.textContent = "+";
      stage.scrollLeft = stage.scrollTop = 0;
    }
  }

  function toggleZoom(x, y) {
    var zoomed = root.classList.contains("is-zoomed");
    if (!zoomed && !canZoom()) return;
    setZoom(!zoomed, x, y);
  }

  var dragMoved = false;

  function onStageClick(e) {
    if (dragMoved) { dragMoved = false; return; }
    if (e.target === img) toggleZoom(e.clientX, e.clientY);
    else if (!root.classList.contains("is-zoomed")) close(); // backdrop click
  }

  function wireDragPan() {
    var startX, startY, sl, st, down = false;
    stage.addEventListener("mousedown", function (e) {
      if (!root.classList.contains("is-zoomed") || e.button !== 0) return;
      down = true; dragMoved = false;
      startX = e.clientX; startY = e.clientY;
      sl = stage.scrollLeft; st = stage.scrollTop;
      e.preventDefault();
    });
    window.addEventListener("mousemove", function (e) {
      if (!down) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved = true;
      stage.scrollLeft = sl - dx;
      stage.scrollTop = st - dy;
    });
    window.addEventListener("mouseup", function () { down = false; });
  }

  /* ---------- touch ---------- */

  function wireTouch() {
    var x0 = null, y0 = null;
    stage.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1 || root.classList.contains("is-zoomed")) { x0 = null; return; }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    stage.addEventListener("touchend", function (e) {
      if (x0 == null) return;
      var dx = e.changedTouches[0].clientX - x0;
      var dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
        dragMoved = true; // swallow the click that follows
        go(dx < 0 ? 1 : -1);
      }
    }, { passive: true });
  }

  /* ---------- keyboard ---------- */

  function onKey(e) {
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        if (root.classList.contains("is-zoomed")) setZoom(false); else close();
        break;
      case "ArrowRight":
        if (!root.classList.contains("is-zoomed")) { e.preventDefault(); go(1); }
        break;
      case "ArrowLeft":
        if (!root.classList.contains("is-zoomed")) { e.preventDefault(); go(-1); }
        break;
      case "z":
      case "Z":
        e.preventDefault(); toggleZoom();
        break;
      case "Tab":
        trapFocus(e);
        break;
    }
  }

  function trapFocus(e) {
    var focusables = Array.prototype.filter.call(
      root.querySelectorAll("button"),
      function (b) { return !b.hidden; }
    );
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- page wiring ---------- */

  // Capture phase on window runs before any listener on the image itself,
  // so if Super's stock lightbox is still installed it never sees the click.
  window.addEventListener("click", function (e) {
    var node = e.target;
    if (!isEligible(node) || e.button !== 0 || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    e.stopPropagation();
    open(node);
  }, true);

  document.addEventListener("keydown", function (e) {
    if (isOpen || (e.key !== "Enter" && e.key !== " ")) return;
    if (isEligible(e.target)) { e.preventDefault(); open(e.target); }
  });

  // Close if the page changes underneath (client-side navigation).
  ["pushState", "replaceState"].forEach(function (method) {
    var original = history[method];
    history[method] = function () {
      var result = original.apply(this, arguments);
      if (isOpen && method === "pushState") close();
      return result;
    };
  });
  window.addEventListener("popstate", close);

  function start() {
    enhanceAll();
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; enhanceAll(); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
