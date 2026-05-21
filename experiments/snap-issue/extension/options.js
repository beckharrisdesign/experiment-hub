/* global chrome */

const KEYS = [
  'githubOwner',
  'githubRepo',
  'githubToken',
  'githubSnapIssueBranch',
  'labelsBug',
  'labelsFeedback',
  'assignee',
];

async function load() {
  const data = await chrome.storage.sync.get(KEYS);
  for (const k of KEYS) {
    const el = document.getElementById(k);
    if (el) el.value = data[k] || '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  load();
  document.getElementById('openPanel').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
  });
  document.getElementById('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {};
    for (const k of KEYS) {
      payload[k] = document.getElementById(k).value.trim();
    }
    await chrome.storage.sync.set(payload);
    const s = document.getElementById('status');
    s.textContent = 'Saved.';
    setTimeout(() => {
      s.textContent = '';
    }, 2500);
  });
});
