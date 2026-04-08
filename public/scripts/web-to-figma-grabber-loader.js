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
  const DEFAULT_HOSTED_ORIGIN = "https://labs.beckharrisdesign.com";

  function getLoaderScriptOrigin() {
    const currentScript = document.currentScript;
    if (currentScript && currentScript.src) {
      try {
        return new URL(currentScript.src).origin;
      } catch (_error) {
        return null;
      }
    }
    const scripts = Array.from(document.querySelectorAll("script[src]"));
    for (let i = scripts.length - 1; i >= 0; i -= 1) {
      const src = scripts[i].getAttribute("src") || "";
      if (src.indexOf("/scripts/web-to-figma-grabber-loader.js") !== -1) {
        try {
          return new URL(src, window.location.href).origin;
        } catch (_error) {
          return null;
        }
      }
    }
    return null;
  }

  function getAssetOrigin() {
    const config = window.__FIGMA_CAPTURE_CONFIG || {};
    if (
      typeof window.__FIGMA_CAPTURE_ASSET_BASE_URL === "string" &&
      window.__FIGMA_CAPTURE_ASSET_BASE_URL.trim().length > 0
    ) {
      return window.__FIGMA_CAPTURE_ASSET_BASE_URL.replace(/\/$/, "");
    }
    if (
      typeof config.assetOrigin === "string" &&
      config.assetOrigin.trim().length > 0
    ) {
      return config.assetOrigin.replace(/\/$/, "");
    }
    return getLoaderScriptOrigin() || DEFAULT_HOSTED_ORIGIN;
  }

  function ensureCaptureScriptLoaded() {
    debugState.stage = "ensure-capture-script";
    if (window.figma && typeof window.figma.captureForDesign === "function") {
      debugState.captureScriptStatus = "already-loaded";
      log("capture script already loaded");
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existing = document.querySelector(
        'script[data-web-to-figma-loader="capture"]',
      );
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
      const assetOrigin = getAssetOrigin();
      script.src = `${assetOrigin}${CAPTURE_SCRIPT_PATH}`;
      script.async = true;
      script.dataset.webToFigmaLoader = "capture";
      script.setAttribute("data-web-to-figma-loader", "capture");
      debugState.captureScriptUrl = script.src;
      debugState.assetOrigin = assetOrigin;
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
      throw new Error(
        "captureForDesign is unavailable after loading capture script.",
      );
    }

    // Default to interactive picker overlay for visible feedback.
    // If selector is explicitly provided in config, use direct capture instead.
    const config = window.__FIGMA_CAPTURE_CONFIG || {};
    const selector =
      typeof config.selector === "string" && config.selector.trim().length > 0
        ? config.selector
        : null;
    const delayMs = Number.isFinite(config.delayMs)
      ? Math.max(0, config.delayMs)
      : 0;
    const verbose = typeof config.verbose === "boolean" ? config.verbose : true;
    const mode = typeof config.mode === "string" ? config.mode : "clipboard";
    const usePickerOverlay =
      typeof config.usePickerOverlay === "boolean"
        ? config.usePickerOverlay
        : !selector;
    debugState.config = {
      selector,
      delayMs,
      verbose,
      mode,
      usePickerOverlay,
      hasWindowConfig: Boolean(window.__FIGMA_CAPTURE_CONFIG),
    };

    const captureRequest = {
      delayMs,
      verbose,
      mode,
    };

    if (selector) {
      captureRequest.selector = selector;
      log("starting direct capture flow", debugState.config);
    } else {
      log("starting picker-overlay capture flow", debugState.config);
    }

    return window.figma.captureForDesign(captureRequest);
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
