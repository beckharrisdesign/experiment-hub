/* global chrome */

function setStatus(t) {
  document.getElementById('status').textContent = t;
}

document.addEventListener('DOMContentLoaded', async () => {
  const { snapIssueLastIssueUrl } = await chrome.storage.local.get(
    'snapIssueLastIssueUrl'
  );
  if (snapIssueLastIssueUrl) {
    const a = document.getElementById('lastIssue');
    a.href = snapIssueLastIssueUrl;
    a.style.display = 'inline';
    a.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: snapIssueLastIssueUrl });
    });
  }

  document.getElementById('openOptions').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('capture').addEventListener('click', async () => {
    setStatus('Starting…');
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'SNAP_ISSUE_START_CAPTURE',
      });
      if (res?.ok) {
        setStatus('Overlay started on the active tab.');
        window.close();
      } else {
        setStatus(res?.error || 'Could not start capture.');
      }
    } catch (err) {
      setStatus(err?.message || String(err));
    }
  });
});
