/*
 * Local fixture for the task-effort audit: a tiny "Northwind" account app.
 *
 * It exists so the audit can be built and demonstrated without touching a live
 * property. State is in memory and resets on restart or POST /__fixture/reset.
 *
 * Variants simulate product releases, so the same reviewed task can be run
 * against each and the audit's behaviour checked:
 *
 *   v1             baseline
 *   v2-confirm     Save opens a "Confirm email change?" dialog (a supported
 *                  conditional interaction — the task path covers it)
 *   v3-renamed     the Save button is renamed "Update contact" (an unexpected
 *                  path change — the reviewed path should stop for review)
 *   v4-no-persist  Save shows the success message but never persists
 *                  (only an independent check after reload catches it)
 *
 * Usage: node scripts/task-effort-audit/fixture/server.mjs --port 4789 --variant v1
 */
import http from 'node:http';
import { fileURLToPath } from 'node:url';

export const VARIANTS = ['v1', 'v2-confirm', 'v3-renamed', 'v4-no-persist'];

const INITIAL = Object.freeze({
  name: 'Alex Rivera (test account)',
  email: 'alex@example.test',
  accountNumber: 'NW-40217',
});

function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${title} · Northwind (fixture)</title>
<style>
  body { font: 16px/1.5 system-ui, sans-serif; margin: 0; background: #f6f6f4; color: #1d1d1b; }
  header { background: #1d1d1b; color: #fff; padding: 12px 24px; display: flex; gap: 24px; align-items: center; }
  header a { color: #fff; }
  main { max-width: 720px; margin: 24px auto; background: #fff; padding: 24px; border-radius: 8px; }
  nav.tabs a { margin-right: 16px; }
  nav.tabs a[aria-current="page"] { font-weight: 700; }
  label { display: block; margin-top: 12px; font-weight: 600; }
  input { font: inherit; padding: 6px 8px; width: 320px; }
  button { font: inherit; padding: 8px 14px; margin-top: 16px; margin-right: 8px; }
  [role="alert"] { color: #a40000; margin-top: 12px; }
  [role="status"] { color: #0a6b2c; margin-top: 12px; }
  .banner { font-size: 12px; background: #fff3c4; padding: 4px 24px; }
</style></head><body>
<div class="banner">Local test fixture — not a real product. No real data.</div>
<header><strong>Northwind</strong><a href="/">Dashboard</a><a href="/settings">Settings</a></header>
<main>${body}</main></body></html>`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function tabs(current) {
  const t = (href, label) =>
    `<a href="${href}"${current === href ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<nav class="tabs" aria-label="Settings sections">${t('/settings', 'Profile')}${t('/settings/contact', 'Contact details')}</nav>`;
}

function contactPage(state, variant) {
  const saveLabel = variant === 'v3-renamed' ? 'Update contact' : 'Save changes';
  const confirm = variant === 'v2-confirm';
  return page(
    'Contact details',
    `<h1>Settings</h1>${tabs('/settings/contact')}
<h2>Contact details</h2>
<p>Current email: <span data-testid="contact-email">${esc(state.email)}</span></p>
<button type="button" id="edit">Edit contact details</button>
<form id="form" hidden novalidate>
  <label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="off">
  <label for="confirm">Confirm email address</label><input id="confirm" name="confirm" type="email" autocomplete="off">
  <label for="acct">Account number</label><input id="acct" name="acct" autocomplete="off">
  <p><a href="/billing" target="_blank" rel="opener">Look up account number</a></p>
  <div id="error" role="alert"></div>
  <button type="submit">${saveLabel}</button>
</form>
<div id="status" role="status"></div>
<dialog id="dlg" aria-labelledby="dlg-title">
  <h3 id="dlg-title">Confirm email change?</h3>
  <p>Notices will go to the new address.</p>
  <button type="button" id="dlg-ok">Confirm change</button>
  <button type="button" id="dlg-cancel">Cancel</button>
</dialog>
<script>
  const $ = (id) => document.getElementById(id);
  $('edit').addEventListener('click', () => { $('form').hidden = false; $('edit').hidden = true; });
  async function send(payload) {
    const r = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const j = await r.json();
    if (!r.ok) { $('error').textContent = j.error; return; }
    $('form').hidden = true; $('edit').hidden = false;
    $('status').textContent = 'Contact details saved';
  }
  $('form').addEventListener('submit', (e) => {
    e.preventDefault();
    $('error').textContent = '';
    const payload = { email: $('email').value.trim(), confirm: $('confirm').value.trim(), accountNumber: $('acct').value.trim() };
    if (!payload.email || payload.email !== payload.confirm) { $('error').textContent = "Email addresses don't match"; return; }
    ${confirm ? "window.__pending = payload; $('dlg').showModal(); return;" : ''}
    send(payload);
  });
  $('dlg-ok').addEventListener('click', () => { $('dlg').close(); send(window.__pending); });
  $('dlg-cancel').addEventListener('click', () => $('dlg').close());
</script>`,
  );
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
  });
}

/**
 * Start the fixture. Resolves to { url, port, close, state, variant }.
 * `port: 0` picks a free port (used by tests).
 */
export function startFixture({ port = 4789, host = '127.0.0.1', variant = 'v1' } = {}) {
  if (!VARIANTS.includes(variant)) {
    throw new Error(`Unknown fixture variant "${variant}". Known: ${VARIANTS.join(', ')}`);
  }
  const state = { ...INITIAL };
  const requests = [];

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://fixture');
    requests.push({ method: req.method, path: url.pathname });
    const html = (code, body) => {
      res.writeHead(code, { 'content-type': 'text/html; charset=utf-8' });
      res.end(body);
    };
    const json = (code, body) => {
      res.writeHead(code, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    if (req.method === 'GET' && url.pathname === '/') {
      return html(200, page('Dashboard', `<h1>Welcome back, ${esc(state.name)}</h1><p>Use Settings to manage your account.</p>`));
    }
    if (req.method === 'GET' && url.pathname === '/settings') {
      return html(200, page('Profile', `<h1>Settings</h1>${tabs('/settings')}<h2>Profile</h2><p>Name: ${esc(state.name)}</p>`));
    }
    if (req.method === 'GET' && url.pathname === '/settings/contact') {
      return html(200, contactPage(state, variant));
    }
    if (req.method === 'GET' && url.pathname === '/billing') {
      return html(200, page('Billing portal', `<h1>Billing portal</h1><p>Account number: <span data-testid="account-number">${esc(state.accountNumber)}</span></p>`));
    }
    if (req.method === 'GET' && url.pathname === '/api/account') {
      return json(200, { email: state.email, accountNumber: state.accountNumber });
    }
    if (req.method === 'POST' && url.pathname === '/api/contact') {
      let body;
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        return json(400, { error: 'Bad request' });
      }
      if (body.email !== body.confirm) return json(400, { error: "Email addresses don't match" });
      if (body.accountNumber !== state.accountNumber) return json(400, { error: 'Account number not recognised' });
      if (variant !== 'v4-no-persist') state.email = body.email;
      return json(200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/__fixture/reset') {
      Object.assign(state, INITIAL);
      return json(200, { ok: true });
    }
    return html(404, page('Not found', '<h1>Not found</h1>'));
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const actual = server.address().port;
      resolve({
        url: `http://${host}:${actual}`,
        port: actual,
        variant,
        state,
        requests,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const get = (flag, dflt) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : dflt;
  };
  const f = await startFixture({ port: Number(get('--port', 4789)), variant: get('--variant', 'v1') });
  console.log(`Northwind fixture (${f.variant}) on ${f.url} — Ctrl+C to stop`);
}
