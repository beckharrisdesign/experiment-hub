import { buildCaptureEnvelope } from "./shared/capture-utils.js";

const statusEl = document.getElementById("status");
const payloadPreviewEl = document.getElementById("payloadPreview");
const modeSelect = document.getElementById("mode");
const fileKeyInput = document.getElementById("fileKey");
const pageNameInput = document.getElementById("pageName");
const pickElementButton = document.getElementById("pickElement");
const downloadJsonButton = document.getElementById("downloadJson");
const copyJsonButton = document.getElementById("copyJson");

let selectedMode = modeSelect.value;
let lastCaptureEnvelope = null;

function setStatus(message, tone = "info") {
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

function renderPreview() {
  payloadPreviewEl.textContent = lastCaptureEnvelope
    ? JSON.stringify(lastCaptureEnvelope, null, 2)
    : "No capture yet.";
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

async function waitForSelectionMessage() {
  return new Promise((resolve, reject) => {
    const listener = (message) => {
      if (message?.type === "W2F_SELECTION_READY") {
        clearTimeout(timeoutId);
        chrome.runtime.onMessage.removeListener(listener);
        resolve(message);
        return;
      }
      if (message?.type === "W2F_SELECTION_CANCELLED") {
        clearTimeout(timeoutId);
        chrome.runtime.onMessage.removeListener(listener);
        reject(new Error("Selection cancelled."));
      }
    };

    const timeoutId = setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      reject(new Error("Timed out waiting for selected element."));
    }, 120000);

    chrome.runtime.onMessage.addListener(listener);
  });
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
    const selectedMetadata = await waitForSelectionMessage();

    const captureResult = await captureModePayload(
      tab,
      selectedMode,
      selectedMetadata,
      target,
    );
    if (!captureResult?.ok) {
      throw new Error(captureResult?.error || "Capture failed.");
    }

    const capturePayload =
      selectedMode === "layout"
        ? captureResult.capture
        : {
            selectedRect: selectedMetadata.selectedRect,
            domPath: selectedMetadata.domPath,
            imageDataUrl: captureResult.capture?.imageDataUrl,
          };

    lastCaptureEnvelope = buildCaptureEnvelope({
      mode: selectedMode,
      source: {
        pageUrl: selectedMetadata.pageUrl,
        pageTitle: selectedMetadata.pageTitle,
        viewport: selectedMetadata.viewport,
      },
      target,
      payload: capturePayload,
    });
    renderPreview();
    await chrome.storage.local.set({ lastCaptureEnvelope });
    setStatus("Capture complete. Copy or download JSON.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function onCopyJson() {
  if (!lastCaptureEnvelope) {
    setStatus("Capture first to copy payload.", "error");
    return;
  }
  await navigator.clipboard.writeText(
    JSON.stringify(lastCaptureEnvelope, null, 2),
  );
  setStatus("Payload copied to clipboard.", "success");
}

function onDownloadJson() {
  if (!lastCaptureEnvelope) {
    setStatus("Capture first to download payload.", "error");
    return;
  }
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const filename = `web-to-figma-grabber-${selectedMode}-${timestamp}.json`;
  downloadJson(filename, JSON.stringify(lastCaptureEnvelope, null, 2));
  setStatus("Payload downloaded.", "success");
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
  const storage = await chrome.storage.local.get(["lastCaptureEnvelope"]);
  if (storage.lastCaptureEnvelope) {
    lastCaptureEnvelope = storage.lastCaptureEnvelope;
  }
  renderPreview();
  if (!lastCaptureEnvelope) {
    setStatus("Ready.");
  } else {
    setStatus("Loaded previous capture.");
  }
}

bootstrap();
