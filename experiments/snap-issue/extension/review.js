/* global chrome */

function selectedIssueType() {
  const el = document.querySelector('input[name="issueType"]:checked');
  return el?.value === 'feedback' ? 'feedback' : 'bug';
}

function show(el, on) {
  el.hidden = !on;
  if (on) el.removeAttribute('hidden');
  else el.setAttribute('hidden', '');
}

document.addEventListener('DOMContentLoaded', async () => {
  const draft = (await chrome.storage.session.get('snapIssueReviewDraft'))
    .snapIssueReviewDraft;

  const preview = document.getElementById('preview');
  const meta = document.getElementById('meta');
  const loadError = document.getElementById('loadError');

  if (!draft?.imageDataUrl) {
    show(loadError, true);
    loadError.textContent =
      'No capture found. Close this tab, run capture from a web page, then try again.';
    return;
  }

  preview.src = draft.imageDataUrl;
  preview.removeAttribute('hidden');
  meta.textContent = `${draft.pageTitle || 'Untitled'} — ${draft.pageUrl || ''}`;

  document.getElementById('openOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('submit').addEventListener('click', async () => {
    const formError = document.getElementById('formError');
    const formSuccess = document.getElementById('formSuccess');
    show(formError, false);
    show(formSuccess, false);
    const note = document.getElementById('note').value;
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'SNAP_ISSUE_SUBMIT',
        payload: {
          issueType: selectedIssueType(),
          note,
        },
      });
      if (!res?.ok) {
        show(formError, true);
        formError.textContent = res?.error || 'Submit failed.';
        return;
      }
      show(formSuccess, true);
      formSuccess.innerHTML = `Created. <a href="${res.issueUrl}" target="_blank" rel="noopener">Open issue</a>`;
      document.getElementById('submit').disabled = true;
    } catch (e) {
      show(formError, true);
      formError.textContent = e?.message || String(e);
    }
  });
});
