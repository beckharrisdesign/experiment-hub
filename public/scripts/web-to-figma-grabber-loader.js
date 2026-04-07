(function () {
  const CAPTURE_SCRIPT_PATH = "/lib/capture.js";
  const FIGMA_ENDPOINT = "https://mcp.figma.com/mcp";

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

  function parseCurrentCaptureParams() {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    return {
      captureId: params.get("figmacapture"),
      endpoint: params.get("figmaendpoint"),
    };
  }

  function setHashCaptureParams({ captureId, endpoint, selector, verbose }) {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    params.set("figmacapture", captureId);
    params.set("figmaendpoint", endpoint || FIGMA_ENDPOINT);
    if (selector) {
      params.set("figmaselector", selector);
    } else {
      params.delete("figmaselector");
    }
    params.set("figmalogverbose", verbose ? "true" : "false");
    window.location.hash = params.toString();
  }

  function launch() {
    const existing = parseCurrentCaptureParams();
    if (existing.captureId && existing.endpoint) {
      console.info(
        "[web-to-figma-grabber] Existing figma capture params found in hash. Triggering capture flow.",
      );
      return Promise.resolve();
    }

    const captureId = window.prompt(
      "Enter figma captureId (from generate_figma_design response):",
      "",
    );

    if (!captureId) {
      throw new Error("Capture cancelled: captureId is required.");
    }

    const endpointInput = window.prompt(
      "Figma endpoint (press Enter for default):",
      FIGMA_ENDPOINT,
    );

    const endpoint = endpointInput && endpointInput.trim() ? endpointInput.trim() : FIGMA_ENDPOINT;
    setHashCaptureParams({
      captureId,
      endpoint,
      selector: "*",
      verbose: true,
    });
    console.info("[web-to-figma-grabber] Capture params added to location hash.");
    console.info(
      "[web-to-figma-grabber] Click once on page if prompted by selector mode, then let the toolbar drive captures.",
    );
  }

  ensureCaptureScriptLoaded()
    .then(() => launch())
    .catch((error) => {
      console.error("[web-to-figma-grabber] Failed to start loader:", error);
      alert(
        `Web-to-Figma loader failed: ${error && error.message ? error.message : String(error)}`,
      );
    });
})();
