(function () {
  if (window.__WEB_TO_FIGMA_GRABBER_LOADER_ACTIVE__) {
    return;
  }
  window.__WEB_TO_FIGMA_GRABBER_LOADER_ACTIVE__ = true;

  const CAPTURE_SCRIPT_PATH = "/lib/capture.js";

  function getBaseUrl() {
    if (window.location.hostname === "labs.beckharrisdesign.com") {
      return "https://labs.beckharrisdesign.com";
    }
    return `${window.location.protocol}//${window.location.host}`;
  }

  function ensureCaptureScriptLoaded() {
    if (window.figma && typeof window.figma.captureForDesign === "function") {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-web-to-figma-loader="capture"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Failed to load capture script.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.src = `${getBaseUrl()}${CAPTURE_SCRIPT_PATH}`;
      script.async = true;
      script.dataset.webToFigmaLoader = "capture";
      script.setAttribute("data-web-to-figma-loader", "capture");
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${script.src}`));
      document.head.appendChild(script);
    });
  }

  function launch() {
    if (!window.figma || typeof window.figma.captureForDesign !== "function") {
      throw new Error("captureForDesign is unavailable after loading capture script.");
    }

    // Fast path: local clipboard capture with interactive selection overlay.
    // No capture ID, endpoint, or tool switching required.
    const config = window.__FIGMA_CAPTURE_CONFIG || {};
    const selector = typeof config.selector === "string" ? config.selector : "*";
    const delayMs = Number.isFinite(config.delayMs) ? Math.max(0, config.delayMs) : 0;
    const verbose = typeof config.verbose === "boolean" ? config.verbose : true;

    console.info("[web-to-figma-grabber] Starting clipboard capture flow...");
    return window.figma.captureForDesign({
      selector,
      delayMs,
      verbose,
    });
  }

  ensureCaptureScriptLoaded()
    .then(() => launch())
    .catch((error) => {
      console.error("[web-to-figma-grabber] Failed to start loader:", error);
      alert(
        `Web-to-Figma loader failed: ${error && error.message ? error.message : String(error)}`,
      );
    })
    .finally(() => {
      window.__WEB_TO_FIGMA_GRABBER_LOADER_ACTIVE__ = false;
    });
})();
