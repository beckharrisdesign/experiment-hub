import { buildCaptureEnvelope } from "./shared/capture-utils.js";

const statusEl = document.getElementById("status");
const modeSelect = document.getElementById("mode");
const fileKeyInput = document.getElementById("fileKey");
const pageNameInput = document.getElementById("pageName");
const pickElementButton = document.getElementById("pickElement");
const copyJsonButton = document.getElementById("copyJson");
const downloadJsonButton = document.getElementById("downloadJson");

let selectedMode = modeSelect.value;
let lastCaptureEnvelope = null;

function setStatus(message, kind = "ok") {
  statusEl.textContent = message;
  statusEl.className = kind === "err" ? "err" : "ok";
}

function downloadJson(filename, value) {
  const blob = new Blob([value], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab?.id || !tab.url) {
    throw new Error("No active tab available.");
  }
  return tab;
}

async function ensureCanRunOnTab(tab) {
  const disallowed = ["chrome://", "edge://", "about:", "chrome-extension://"];
  if (disallowed.some((prefix) => tab.url.startsWith(prefix))) {
    throw new Error("Open a normal web page before capturing.");
  }
}

async function requestSelectionFromTab(tabId, target) {
  const response = await chrome.tabs.sendMessage(tabId, {
    type: "W2F_PICK_ELEMENT",
    target,
  });
  if (!response?.ok) {
    throw new Error(response?.error || "Failed to select an element.");
  }
  return response;
}

async function requestScreenshotCapture(tabId, pageMetadata, target) {
  const screenshotResponse = await chrome.runtime.sendMessage({
    type: "W2F_CAPTURE_REQUEST",
  });
  if (!screenshotResponse?.ok) {
    throw new Error(screenshotResponse?.error || "Screenshot capture failed.");
  }

  const response = await chrome.tabs.sendMessage(tabId, {
    type: "W2F_CAPTURE_SCREENSHOT",
    imageDataUrl: screenshotResponse.dataUrl,
    rect: pageMetadata.selectedRect,
    pageUrl: pageMetadata.pageUrl,
    pageTitle: pageMetadata.pageTitle,
    viewport: pageMetadata.viewport,
    target,
  });
  if (!response?.ok) {
    throw new Error(response?.error || "Failed to build screenshot payload.");
  }
  return response;
}

async function requestLayoutCapture(tabId) {
  const response = await chrome.tabs.sendMessage(tabId, {
    type: "W2F_CAPTURE_LAYOUT",
  });
  if (!response?.ok) {
    throw new Error(response?.error || "Failed to build layout payload.");
  }
  return response;
}

async function captureModePayload(tab, mode, pageMetadata, target) {
  if (mode === "screenshot") {
    return requestScreenshotCapture(tab.id, pageMetadata, target);
  }
  return requestLayoutCapture(tab.id);
}

async function onPickElement() {
  try {
    setStatus("Pick mode active. Click an element in the page.");
    const tab = await getActiveTab();
    await ensureCanRunOnTab(tab);
    const target = {
      fileKey: fileKeyInput.value.trim(),
      pageName: pageNameInput.value.trim() || "Web Captures",
    };
    await requestSelectionFromTab(tab.id, target);
    setStatus("Element selected. Building capture...");

    const pageMetadata = await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Timed out waiting for selected element.")),
        120000,
      );

      const listener = (message) => {
        if (message?.type === "W2F_SELECTION_READY") {
          clearTimeout(timeout);
          chrome.runtime.onMessage.removeListener(listener);
          resolve(message);
          return;
        }
        if (message?.type === "W2F_SELECTION_CANCELLED") {
          clearTimeout(timeout);
          chrome.runtime.onMessage.removeListener(listener);
          reject(new Error("Selection cancelled."));
          return;
        }
        if (message?.type === "W2F_ERROR") {
          clearTimeout(timeout);
          chrome.runtime.onMessage.removeListener(listener);
          reject(new Error(message.message || "Capture error."));
        }
      };

      chrome.runtime.onMessage.addListener(listener);
    });

    const captureResult = await captureModePayload(
      tab,
      selectedMode,
      pageMetadata,
      target,
    );
    if (!captureResult?.ok) {
      throw new Error(captureResult?.error || "Capture failed.");
    }

    const capturePayload =
      selectedMode === "layout"
        ? captureResult.capture
        : {
            selectedRect: pageMetadata.selectedRect,
            domPath: pageMetadata.domPath,
            imageDataUrl: captureResult.capture?.imageDataUrl,
          };

    lastCaptureEnvelope = buildCaptureEnvelope({
      mode: selectedMode,
      source: {
        pageUrl: pageMetadata.pageUrl,
        pageTitle: pageMetadata.pageTitle,
        viewport: pageMetadata.viewport,
      },
      target,
      payload: capturePayload,
    });

    await chrome.storage.local.set({ lastCaptureEnvelope });
    setStatus("Capture complete. Copy or download JSON.");
  } catch (error) {
    setStatus(error.message, "err");
  }
}

async function onCopyJson() {
  if (!lastCaptureEnvelope) {
    setStatus("Capture first to copy payload.", "err");
    return;
  }
  await navigator.clipboard.writeText(
    JSON.stringify(lastCaptureEnvelope, null, 2),
  );
  setStatus("Payload copied to clipboard.");
}

function onDownloadJson() {
  if (!lastCaptureEnvelope) {
    setStatus("Capture first to download payload.", "err");
    return;
  }
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const filename = `web-to-figma-grabber-${selectedMode}-${timestamp}.json`;
  downloadJson(filename, JSON.stringify(lastCaptureEnvelope, null, 2));
  setStatus("Payload downloaded.");
}

function bindEvents() {
  modeSelect.addEventListener("change", () => {
    selectedMode = modeSelect.value;
    setStatus(
      selectedMode === "screenshot"
        ? "Screenshot mode selected."
        : "Layout mode selected.",
    );
  });

  pickElementButton.addEventListener("click", onPickElement);
  copyJsonButton.addEventListener("click", onCopyJson);
  downloadJsonButton.addEventListener("click", onDownloadJson);
}

async function bootstrap() {
  bindEvents();
  const storage = await chrome.storage.local.get("lastCaptureEnvelope");
  if (storage.lastCaptureEnvelope) {
    lastCaptureEnvelope = storage.lastCaptureEnvelope;
    setStatus("Loaded previous capture.");
  } else {
    setStatus("Ready.");
  }
}

bootstrap();
