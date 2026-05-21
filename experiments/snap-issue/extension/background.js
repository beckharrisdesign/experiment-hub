import { cropVisibleTabToPngBlob, blobToDataUrl } from './crop.js';
import {
  buildIssueBody,
  buildIssueTitle,
  createGitHubIssue,
} from './github.js';
import { uploadScreenshotForMarkdown } from './image-host.js';

const MIN_SELECTION = 4;

chrome.runtime.onInstalled.addListener(() => {
  void chrome.contextMenus.removeAll().then(() => {
    chrome.contextMenus.create({
      id: 'snap-issue-capture',
      title: 'Capture region on this tab',
      contexts: ['action'],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'snap-issue-capture' && tab?.id) {
    beginCapture(tab);
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (tab?.id) beginCapture(tab);
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'snap-issue-capture') return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab?.id) beginCapture(tab);
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SNAP_ISSUE_START_CAPTURE') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) beginCapture(tab).then(() => sendResponse({ ok: true })).catch((e) => sendResponse({ ok: false, error: String(e.message || e) }));
    });
    return true;
  }
  if (msg.type === 'SNAP_ISSUE_SELECTION_DONE') {
    handleSelectionDone(sender.tab, msg.payload)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e.message || e) }));
    return true;
  }
  if (msg.type === 'SNAP_ISSUE_SELECTION_CANCEL') {
    sendResponse({ ok: true });
    return false;
  }
  if (msg.type === 'SNAP_ISSUE_SUBMIT') {
    handleSubmit(msg.payload)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((e) =>
        sendResponse({ ok: false, error: String(e.message || e) })
      );
    return true;
  }
  return false;
});

async function ensureContentScript(tabId) {
  try {
    const pong = await chrome.tabs.sendMessage(tabId, {
      type: 'SNAP_ISSUE_PING',
    });
    if (pong?.ok) return;
  } catch {
    // inject below
  }
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content-script.js'],
  });
}

async function injectToast(tabId, text) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (message) => {
        const el = document.createElement('div');
        el.textContent = message;
        el.setAttribute('role', 'status');
        Object.assign(el.style, {
          position: 'fixed',
          zIndex: '2147483646',
          top: '16px',
          right: '16px',
          maxWidth: 'min(360px, 90vw)',
          padding: '12px 14px',
          background: '#21262d',
          color: '#c9d1d9',
          border: '1px solid #30363d',
          borderRadius: '8px',
          font: '13px/1.4 system-ui, sans-serif',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        });
        document.documentElement.appendChild(el);
        setTimeout(() => el.remove(), 6000);
      },
      args: [text],
    });
  } catch {
    // ignore
  }
}

async function beginCapture(tab) {
  const url = tab.url || '';
  if (!/^https?:/i.test(url)) {
    await injectToast(
      tab.id,
      'Snap Issue: only regular http(s) pages can be captured (not chrome:// or the store).'
    );
    return;
  }
  try {
    await ensureContentScript(tab.id);
    await chrome.tabs.sendMessage(tab.id, { type: 'SNAP_ISSUE_START' });
  } catch (e) {
    await injectToast(
      tab.id,
      `Snap Issue: could not start capture — ${e?.message || e}`
    );
  }
}

async function handleSelectionDone(tab, payload) {
  if (!tab?.id || !tab.windowId) {
    throw new Error('Missing tab for capture.');
  }
  const {
    rect,
    dpr,
    viewportWidth,
    viewportHeight,
    pageUrl,
    pageTitle,
  } = payload;
  if (
    !rect ||
    rect.width < MIN_SELECTION ||
    rect.height < MIN_SELECTION
  ) {
    await injectToast(
      tab.id,
      'Snap Issue: selection too small — drag a larger rectangle.'
    );
    return;
  }

  let dataUrl;
  try {
    dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
    });
  } catch (e) {
    await injectToast(
      tab.id,
      `Snap Issue: capture failed — ${e?.message || e}`
    );
    return;
  }

  const viewportCss = { width: viewportWidth, height: viewportHeight };
  let croppedBlob;
  try {
    croppedBlob = await cropVisibleTabToPngBlob(
      dataUrl,
      rect,
      viewportCss
    );
  } catch (e) {
    await injectToast(
      tab.id,
      `Snap Issue: crop failed — ${e?.message || e}`
    );
    return;
  }

  const imageDataUrl = await blobToDataUrl(croppedBlob);
  const capturedAtIso = new Date().toISOString();
  const draft = {
    imageDataUrl,
    rect,
    dpr,
    viewportWidth,
    viewportHeight,
    pageUrl,
    pageTitle,
    capturedAtIso,
    tabId: tab.id,
  };
  await chrome.storage.session.set({ snapIssueReviewDraft: draft });
  await chrome.tabs.create({
    url: chrome.runtime.getURL('review.html'),
    active: true,
  });
}

async function handleSubmit(payload) {
  const { issueType, note } = payload;
  const { snapIssueReviewDraft: draft } = await chrome.storage.session.get(
    'snapIssueReviewDraft'
  );
  if (!draft?.imageDataUrl) {
    throw new Error('No capture in session — run capture again.');
  }

  const sync = await chrome.storage.sync.get([
    'githubOwner',
    'githubRepo',
    'githubToken',
    'githubSnapIssueBranch',
    'labelsBug',
    'labelsFeedback',
    'assignee',
  ]);
  const owner = (sync.githubOwner || '').trim();
  const repo = (sync.githubRepo || '').trim();
  const token = (sync.githubToken || '').trim();
  if (!owner || !repo || !token) {
    throw new Error(
      'GitHub owner, repository, and token are required. Open Snap Issue options.'
    );
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const browserLine = ua || 'Unknown';

  const stamp = draft.capturedAtIso.replace(/[:.]/g, '-');
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
  const filename = `snap-issue-${stamp}-${rand}.png`;

  await chrome.downloads.download({
    url: draft.imageDataUrl,
    filename,
    saveAs: false,
  });

  let screenshotMarkdownImage = '';
  let uploadFailureMessage = '';
  try {
    const uploaded = await uploadScreenshotForMarkdown({
      owner,
      repo,
      token,
      imageDataUrl: draft.imageDataUrl,
      filename,
      branch: (sync.githubSnapIssueBranch || '').trim() || undefined,
    });
    screenshotMarkdownImage = uploaded.markdownImage;
  } catch (e) {
    uploadFailureMessage =
      e?.message || String(e) || 'Upload failed';
  }

  const title = buildIssueTitle({
    issueType,
    note,
    pageTitle: draft.pageTitle,
  });
  const body = buildIssueBody({
    issueType,
    pageUrl: draft.pageUrl,
    pageTitle: draft.pageTitle,
    capturedAtIso: draft.capturedAtIso,
    browserLine,
    viewport: {
      width: draft.viewportWidth,
      height: draft.viewportHeight,
    },
    dpr: draft.dpr,
    note,
    screenshotFilename: filename,
    screenshotMarkdownImage,
    uploadFailureMessage: uploadFailureMessage || undefined,
  });

  const issue = await createGitHubIssue({
    owner,
    repo,
    token,
    title,
    body,
    issueType,
    labelsBug: sync.labelsBug,
    labelsFeedback: sync.labelsFeedback,
    assignee: sync.assignee,
  });

  const issueUrl = issue.html_url;
  await chrome.storage.local.set({ snapIssueLastIssueUrl: issueUrl });
  await chrome.storage.session.remove('snapIssueReviewDraft');

  return {
    issueUrl,
    imageUploadSkipped: Boolean(uploadFailureMessage),
  };
}
