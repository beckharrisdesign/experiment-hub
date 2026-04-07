(function () {
  const DEBUG_PREFIX = "[web-to-figma-grabber]";
  const debugState = {
    startedAt: new Date().toISOString(),
    stage: "boot",
    loaderUrl: window.location.href,
    pageUrl: window.location.href,
  };
  window.__WEB_TO_FIGMA_DEBUG__ = debugState;

  function log(...args) {
    console.log(DEBUG_PREFIX, ...args);
  }

  function fail(stage, error) {
    debugState.stage = stage;
    debugState.error = error && error.message ? error.message : String(error);
    console.error(DEBUG_PREFIX, stage, error);
  }

  if (window.__WEB_TO_FIGMA_GRABBER_LOADER_ACTIVE__) {
    log("loader already active; exiting");
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
    debugState.stage = "ensure-capture-script";
    if (window.figma && typeof window.figma.captureForDesign === "function") {
      debugState.captureScriptStatus = "already-loaded";
      log("capture script already loaded");
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-web-to-figma-loader="capture"]');
      if (existing) {
        debugState.captureScriptStatus = "existing-tag";
        log("found existing capture script tag, waiting for load event");
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
      debugState.captureScriptUrl = script.src;
      log("injecting capture script", script.src);
      script.onload = () => {
        debugState.captureScriptStatus = "loaded";
        log("capture script loaded");
        resolve();
      };
      script.onerror = () => {
        debugState.captureScriptStatus = "error";
        reject(new Error(`Failed to load ${script.src}`));
      };
      document.head.appendChild(script);
    });
  }

  function launch() {
    debugState.stage = "launch";
    if (!window.figma || typeof window.figma.captureForDesign !== "function") {
      throw new Error("captureForDesign is unavailable after loading capture script.");
    }

    // Fast path: local clipboard capture with interactive selection overlay.
    // No capture ID, endpoint, or tool switching required.
    const config = window.__FIGMA_CAPTURE_CONFIG || {};
    const selector = typeof config.selector === "string" ? config.selector : "*";
    const delayMs = Number.isFinite(config.delayMs) ? Math.max(0, config.delayMs) : 0;
    const verbose = typeof config.verbose === "boolean" ? config.verbose : true;
    debugState.config = {
      selector,
      delayMs,
      verbose,
      hasWindowConfig: Boolean(window.__FIGMA_CAPTURE_CONFIG),
    };

    log("starting clipboard capture flow", debugState.config);
    return window.figma.captureForDesign({
      selector,
      delayMs,
      verbose,
    });
  }

  ensureCaptureScriptLoaded()
    .then(() => {
      debugState.stage = "capture-running";
      return launch();
    })
    .then((result) => {
      debugState.stage = "capture-finished";
      debugState.result = result ?? "done";
      log("capture flow finished", result);
    })
    .catch((error) => {
      fail("capture-error", error);
      alert(
        `Web-to-Figma loader failed: ${error && error.message ? error.message : String(error)}`,
      );
    })
    .finally(() => {
      window.__WEB_TO_FIGMA_GRABBER_LOADER_ACTIVE__ = false;
    });
})();
