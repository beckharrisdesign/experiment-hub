chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "W2F_CAPTURE_REQUEST") {
    return;
  }

  chrome.tabs.captureVisibleTab({ format: "png" }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      sendResponse({
        ok: false,
        error: chrome.runtime.lastError.message || "captureVisibleTab failed",
      });
      return;
    }

    if (!dataUrl) {
      sendResponse({ ok: false, error: "No screenshot data returned" });
      return;
    }

    sendResponse({ ok: true, dataUrl });
  });

  return true;
});
