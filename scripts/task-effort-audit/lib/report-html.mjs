/*
 * Static HTML report: one self-contained file per run (report.html), with
 * screenshots embedded as data URIs so it can be opened, attached, or shared
 * without the rest of the run directory.
 *
 * Built only from run.json + actions.json. Everything that came from the page
 * or from config (targets, error text, annotation prose) is HTML-escaped.
 * The file contains the same evidence as the screenshots: treat it as
 * sensitive in the same way.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Capitalize the first letter: run-record strings often start lowercase. */
const sentence = (v) => {
  const t = String(v ?? '');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const fmtDelta = (d) => (d > 0 ? `+${d}` : `${d}`);

function chip(text, tone = 'muted') {
  return `<span class="chip chip-${tone}">${esc(text)}</span>`;
}

function statusCard(letter, title, value, tone, detail) {
  return `<div class="card card-${tone}">
  <p class="card-label">${letter}. ${esc(title)}</p>
  <p class="card-value">${esc(value)}</p>
  <p class="card-detail">${detail}</p>
</div>`;
}

function figure(rel, images, caption, id) {
  const src = images[rel];
  const body = src
    ? `<img src="${src}" alt="${esc(caption)}" loading="lazy">`
    : `<div class="missing">Screenshot not available (${esc(rel)})</div>`;
  return `<figure class="shot"${id ? ` id="${esc(id)}"` : ''}>
  <button type="button" class="zoom" aria-label="Enlarge screenshot">${body}</button>
  <figcaption>${esc(caption)}<br><code>${esc(rel)}</code></figcaption>
</figure>`;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function summary(run) {
  const ex = run.execution;
  const cmp = run.comparison;
  const execCard =
    ex.status === 'completed'
      ? statusCard('A', 'Execution', 'Completed', 'ok', `${ex.stepsExecuted} of ${ex.stepsPlanned} steps on the reviewed path.`)
      : statusCard('A', 'Execution', 'Stopped', 'bad', `At step <code>${esc(ex.failure?.stepId)}</code>: ${esc(ex.failure?.label)}. Root cause not established.`);
  const v = run.verification.status;
  const verCard = statusCard('B', 'Verified completion', v === 'pass' ? 'Pass' : v === 'fail' ? 'Fail' : 'Unknown', v === 'pass' ? 'ok' : v === 'fail' ? 'bad' : 'warn', esc(sentence(run.verification.note)));
  let cmpCard;
  if (!cmp) cmpCard = statusCard('C', 'Comparison', 'Not run', 'muted', '');
  else if (cmp.status === 'compared') {
    const n = cmp.changed?.length ?? 0;
    cmpCard = statusCard('C', 'Comparison', n ? `${n} metric${n > 1 ? 's' : ''} changed` : 'No change', n ? 'warn' : 'ok', `Against baseline <code>${esc(cmp.baselineRunId)}</code>. Changes are review signals, not verdicts.`);
  } else if (cmp.status === 'not-comparable') {
    cmpCard = statusCard('C', 'Comparison', 'Not comparable', 'warn', esc(sentence(cmp.reasons[0])));
  } else cmpCard = statusCard('C', 'Comparison', 'No baseline', 'muted', 'Approve a completed, verified run to start comparing.');

  const m = run.metrics;
  const partial = ex.status !== 'completed';
  const stat = (label, value, note) =>
    `<div class="stat"><p class="stat-value">${esc(value)}</p><p class="stat-label">${esc(label)}${note ? `<br><span class="muted">${esc(note)}</span>` : ''}</p></div>`;
  return `<section aria-labelledby="h-summary">
  <h2 id="h-summary">Summary</h2>
  <div class="cards">${execCard}${verCard}${cmpCard}</div>
  <div class="stats">
    ${stat('Required actions', m.path.actions, partial ? 'partial, before the stop' : 'reviewed path')}
    ${stat('Repeated-entry fields', m.path.repeatedEntryFields, 'from annotations')}
    ${stat('Context switches', m.path.contextSwitches, 'from annotations')}
    ${run.task.scenarioKind === 'recovery' ? stat('Recovery actions', m.recovery.actions, 'counted separately') : ''}
  </div>
</section>`;
}

function comparison(run) {
  const cmp = run.comparison;
  if (!cmp) return '';
  const parts = [];
  if (cmp.status === 'compared') {
    const rows = cmp.metrics
      .map(
        (mt) => `<tr class="${mt.delta !== 0 ? 'changed' : ''}">
  <td>${esc(mt.label)}${mt.delta !== 0 ? ` ${chip('Review', 'warn')}` : ''}</td>
  <td class="num">${mt.baseline}</td><td class="num">${mt.current}</td><td class="num">${fmtDelta(mt.delta)}</td>
</tr>`,
      )
      .join('');
    parts.push(`<table>
  <thead><tr><th>Metric</th><th class="num">Baseline</th><th class="num">Current</th><th class="num">Change</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`);
    const f = cmp.findings;
    const keys = (list) => (list.length ? list.map((k) => `<code>${esc(k)}</code>`).join(', ') : 'none');
    parts.push(`<p>New findings: ${keys(f.new)}. Resolved: ${keys(f.resolved)}. Unchanged: ${f.unchanged.length}.</p>`);
    for (const n of cmp.notes ?? []) parts.push(`<p class="muted">Note: ${esc(n)}</p>`);
  } else if (cmp.status === 'not-comparable') {
    parts.push(`<p>Baseline <code>${esc(cmp.baselineRunId)}</code> can't be compared with this run:</p><ul>${cmp.reasons.map((r) => `<li>${esc(sentence(r))}</li>`).join('')}</ul>`);
  } else {
    parts.push('<p>No approved baseline for this task and scenario yet.</p>');
  }
  if (cmp.partial) {
    const p = cmp.partial;
    parts.push(`<div class="callout callout-warn">
  <p><strong>Partial execution, not a completed path.</strong> Stopped at <code>${esc(p.stoppedAtStep)}</code> (${esc(p.category)}) after ${p.stepsExecuted} of ${p.stepsPlanned} steps. ${p.actionsBeforeStop} action(s) were counted before the stop. They are not compared with the baseline.</p>
</div>`);
  }
  return `<section aria-labelledby="h-compare"><h2 id="h-compare">Against baseline</h2>${parts.join('\n')}</section>`;
}

function evidenceLink(e) {
  if (e.type === 'ledger') {
    const i = e.ref.split('#')[1];
    return `<a href="#entry-${esc(i)}">Step #${esc(i)} in the ledger</a>`;
  }
  if (e.type === 'screenshot') {
    return `<a href="#shot-${esc(slug(e.ref))}">Screenshot</a>`;
  }
  if (e.type === 'trace') return `<code>${esc(e.ref)}</code> (Playwright trace)`;
  return `<code>${esc(e.ref)}</code>`;
}

const slug = (s) => String(s).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');

function findings(run) {
  const tone = { observation: 'info', annotation: 'accent', hypothesis: 'muted' };
  const items = run.findings
    .map(
      (f) => `<li class="finding" id="finding-${esc(f.id)}">
  <p class="finding-head"><strong>${esc(f.id)}</strong> ${chip(f.kind, tone[f.kind] ?? 'muted')} <code>${esc(f.key)}</code></p>
  <p>${esc(sentence(f.statement))}</p>
  ${f.reviewRequired ? `<p class="review"><strong>Review:</strong> ${esc(f.reviewNote)}</p>` : ''}
  ${f.suggestion ? `<p class="suggestion"><strong>${esc(f.suggestion.label)}:</strong> ${esc(f.suggestion.text)}</p>` : ''}
  <p class="evidence">Evidence: ${f.evidence.map(evidenceLink).join(' · ')}</p>
</li>`,
    )
    .join('');
  return `<section aria-labelledby="h-findings"><h2 id="h-findings">Findings</h2>
${run.findings.length ? `<ol class="findings">${items}</ol>` : '<p>No findings.</p>'}
<p class="muted">Observation: the runner saw it. Annotation: a reviewer declared it. Hypothesis: unverified. No severity or user impact is inferred.</p>
</section>`;
}

const PHASE_TITLE = { path: 'Reviewed path', 'error-induction': 'Reviewed path', recovery: 'Recovery', verify: 'Independent verification' };

function timeline(entries, images, extraShots) {
  const groups = [];
  for (const e of entries) {
    const title = PHASE_TITLE[e.phase] ?? e.phase;
    if (!groups.length || groups.at(-1).title !== title) groups.push({ title, entries: [] });
    groups.at(-1).entries.push(e);
  }
  const row = (e) => {
    const chips = [];
    if (e.phase === 'error-induction') chips.push(chip('Controlled error', 'warn'));
    if (e.annotations?.repeatedEntry) chips.push(chip('Repeated entry', 'accent'));
    if (e.annotations?.contextSwitch) chips.push(chip(`Context switch: ${e.annotations.contextSwitch.boundary}`, 'accent'));
    if (e.mutates) chips.push(chip(`Changes ${e.mutates}`, 'muted'));
    if (e.conditional) chips.push(chip(e.conditional.performed ? 'Conditional: ran' : 'Conditional: skipped', e.conditional.performed ? 'warn' : 'muted'));
    if (e.outcome === 'failed') chips.push(chip('Failed', 'bad'));
    const counts = e.counted ? '1' : '0';
    const detail = [
      e.value !== undefined ? `Value: <code>${esc(e.value)}</code>` : '',
      e.annotations?.repeatedEntry ? `Already supplied: ${esc(e.annotations.repeatedEntry.source)}.` : '',
      e.annotations?.contextSwitch ? `${esc(e.annotations.contextSwitch.from)} to ${esc(e.annotations.contextSwitch.to)}.` : '',
      e.error ? `<span class="bad-text">${esc(e.error)}</span>` : '',
      e.note ? `<span class="muted">${esc(e.note)}</span>` : '',
    ].filter(Boolean);
    return `<li class="entry entry-${esc(e.outcome)}" id="entry-${e.index}">
  <div class="entry-row">
    <span class="entry-idx">#${e.index}</span>
    <span class="entry-what"><strong>${esc(e.do)}</strong> ${esc(e.target)} <span class="muted">(${esc(e.stepId)})</span></span>
    <span class="entry-count num" title="Counted actions">${counts}</span>
  </div>
  ${chips.length ? `<p class="entry-chips">${chips.join(' ')}</p>` : ''}
  ${detail.length ? `<p class="entry-detail">${detail.join(' ')}</p>` : ''}
  ${e.screenshot ? figure(e.screenshot, images, `After step ${e.stepId}`, `shot-${slug(e.screenshot)}`) : ''}
</li>`;
  };
  const extras = extraShots.length
    ? `<h3>Other checkpoints</h3><div class="extras">${extraShots.map((s) => figure(s, images, s.replace(/^screenshots\/\d+-/, '').replace(/\.png$/, ''), `shot-${slug(s)}`)).join('')}</div>`
    : '';
  return `<section aria-labelledby="h-ledger"><h2 id="h-ledger">Action ledger</h2>
<p class="muted">Every step in order. The right column is what counted toward the action metric: one click, selection, key press, tab switch, or full field entry each. Waits, assertions, reads, and verification never count.</p>
${groups.map((g) => `<h3>${esc(g.title)}</h3><ol class="entries">${g.entries.map(row).join('')}</ol>`).join('\n')}
${extras}
</section>`;
}

function context(run) {
  const c = run.executionContext;
  const t = run.task;
  const rows = [
    ['Goal', t.goal],
    ['User role', t.userRole],
    ['Familiarity', t.familiarity],
    ['Property', `${run.property.name} (${run.property.environment}), ${run.property.baseUrl}`],
    ['Viewport / locale', `${c.viewport.width}×${c.viewport.height}, ${c.locale}`],
    ['Auth reference', c.authRef],
    ['Fixture variant', c.fixtureVariant ?? 'none'],
    ['Safety', `${run.safety.mode}. Writes performed: ${run.safety.mutationsPerformed.length}. Blocked requests: ${run.safety.blockedRequests.length}. Suppressed side-effect requests: ${(run.safety.suppressedRequests ?? []).length}.`],
    ['Hosts contacted', (run.safety.requestOrigins ?? []).join(', ') || 'none recorded'],
    ['Cleanup', `${run.cleanup.status}. ${run.cleanup.detail}`],
    ['Non-UI steps', (c.nonUiSteps ?? []).join(' | ')],
    ['Definition hash', t.definitionHash],
    ['Comparison context', t.comparisonContext],
    ['Tooling', Object.entries(c.tooling ?? {}).map(([k, v]) => `${k} ${v}`).join(', ')],
    ['Browser duration', `${run.execution.diagnostics?.browserDurationMs ?? '?'} ms. Diagnostic only, not human task time.`],
  ];
  return `<section aria-labelledby="h-context"><h2 id="h-context">Run context</h2>
<details><summary>Show context, safety, and tooling</summary>
<dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
</details></section>`;
}

const LIGHT = `--bg:#ffffff; --bg2:#f6f8fa; --bg3:#eaeef2; --fg:#1f2328; --fg2:#59636e; --fg3:#6e7781;
  --border:#d1d9e0; --accent:#0969da; --ok:#1a7f37; --warn:#9a6700; --bad:#cf222e; --purple:#8250df; color-scheme: light;`;

const STYLE = `
:root { --bg:#0d1117; --bg2:#161b22; --bg3:#21262d; --fg:#c9d1d9; --fg2:#8b949e; --fg3:#6e7681; --border:#30363d;
  --accent:#58a6ff; --ok:#3fb950; --warn:#d29922; --bad:#f85149; --purple:#bc8cff; color-scheme: dark; }
/* Dark-first (hub palette). Light follows the OS setting, and an explicit
   data-theme from a host viewer wins in either direction. */
@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { ${LIGHT} } }
:root[data-theme="light"] { ${LIGHT} }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--fg); font:14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
main { max-width: 960px; margin: 0 auto; padding-block: 32px 64px;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
@media (min-width: 768px) { main { padding-block: 40px 80px; padding-left: max(32px, env(safe-area-inset-left, 0px)); padding-right: max(32px, env(safe-area-inset-right, 0px)); } }
h1 { font-size: 24px; margin: 0 0 8px; } h2 { font-size: 18px; margin: 40px 0 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
h3 { font-size: 14px; margin: 24px 0 8px; color: var(--fg2); text-transform: uppercase; letter-spacing: .04em; }
code { font-family: 'SF Mono', Monaco, Inconsolata, 'Fira Code', monospace; font-size: 12px; background: var(--bg3); padding: 1px 4px; border-radius: 4px; overflow-wrap: anywhere; }
a { color: var(--accent); } a:focus-visible, button:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.muted { color: var(--fg2); } .bad-text { color: var(--bad); }
.meta { color: var(--fg2); margin: 0 0 16px; }
.callout { border: 1px solid var(--border); border-left-width: 4px; background: var(--bg2); padding: 8px 16px; border-radius: 6px; margin: 16px 0; }
.callout p { margin: 8px 0; } .callout-warn { border-left-color: var(--warn); } .callout-bad { border-left-color: var(--bad); } .callout-info { border-left-color: var(--accent); }
.cards { display: grid; gap: 16px; grid-template-columns: 1fr; } @media (min-width: 768px) { .cards { grid-template-columns: repeat(3, 1fr); } }
.card { background: var(--bg2); border: 1px solid var(--border); border-top: 4px solid var(--fg3); border-radius: 6px; padding: 16px; }
.card p { margin: 0; } .card-label { color: var(--fg2); font-size: 12px; } .card-value { font-size: 20px; font-weight: 600; margin: 4px 0 8px !important; }
.card-detail { color: var(--fg2); font-size: 13px; }
.card-ok { border-top-color: var(--ok); } .card-bad { border-top-color: var(--bad); } .card-warn { border-top-color: var(--warn); }
.stats { display: grid; gap: 16px; grid-template-columns: repeat(2, 1fr); margin-top: 16px; } @media (min-width: 768px) { .stats { grid-template-columns: repeat(4, 1fr); } }
.stat { border: 1px solid var(--border); border-radius: 6px; padding: 8px 16px; } .stat p { margin: 0; }
.stat-value { font-size: 24px; font-weight: 600; font-variant-numeric: tabular-nums; } .stat-label { font-size: 12px; color: var(--fg2); }
table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
th, td { text-align: left; vertical-align: top; padding: 8px; border-bottom: 1px solid var(--border); } th { color: var(--fg2); font-weight: 500; font-size: 12px; }
.num { text-align: right; } tr.changed td { background: color-mix(in srgb, var(--warn) 10%, transparent); }
.chip { display: inline-block; font-size: 11px; font-weight: 500; padding: 0 8px; border-radius: 999px; border: 1px solid currentColor; line-height: 18px; white-space: nowrap; }
.chip-muted { color: var(--fg2); } .chip-info { color: var(--accent); } .chip-accent { color: var(--purple); } .chip-warn { color: var(--warn); } .chip-bad { color: var(--bad); }
ol.findings, ol.entries { list-style: none; padding: 0; margin: 0; }
.finding { border: 1px solid var(--border); border-radius: 6px; padding: 8px 16px; margin-bottom: 16px; background: var(--bg2); }
.finding p { margin: 8px 0; } .finding:target, .entry:target, .shot:target { outline: 2px solid var(--accent); outline-offset: 4px; }
.review { color: var(--fg2); } .suggestion { border-left: 2px solid var(--purple); padding-left: 8px; color: var(--fg2); font-style: italic; } .evidence { font-size: 13px; }
.entry { border-bottom: 1px solid var(--border); padding: 8px 0; } .entry p { margin: 4px 0 0 48px; }
.entry-row { display: grid; grid-template-columns: 40px 1fr 32px; gap: 8px; align-items: baseline; }
.entry-idx { color: var(--fg3); font-variant-numeric: tabular-nums; } .entry-count { font-weight: 600; }
.entry-skipped .entry-what { color: var(--fg3); } .entry-failed { background: color-mix(in srgb, var(--bad) 8%, transparent); }
.entry-detail { font-size: 13px; color: var(--fg2); }
.shot { margin: 8px 0 8px 48px; max-width: 480px; } .shot.zoomed { max-width: none; margin-left: 0; }
.zoom { all: unset; cursor: zoom-in; display: block; } .shot.zoomed .zoom { cursor: zoom-out; }
.shot img { width: 100%; display: block; border: 1px solid var(--border); border-radius: 6px; }
.shot figcaption { font-size: 12px; color: var(--fg2); margin-top: 4px; }
.extras { display: grid; gap: 16px; grid-template-columns: 1fr; } @media (min-width: 768px) { .extras { grid-template-columns: repeat(2, 1fr); } }
.extras .shot { margin-left: 0; }
.missing { padding: 24px; border: 1px dashed var(--border); border-radius: 6px; color: var(--fg3); }
dl { display: grid; grid-template-columns: 1fr; gap: 4px 16px; } @media (min-width: 768px) { dl { grid-template-columns: 180px 1fr; } }
dt { color: var(--fg2); } dd { margin: 0 0 8px; overflow-wrap: anywhere; }
summary { cursor: pointer; color: var(--accent); } footer { margin-top: 48px; color: var(--fg2); font-size: 12px; }
@media print { .shot { max-width: 320px; } details { display: block; } }
`;

/** Pure render. `images` maps a run-relative screenshot path to a data URI (or nothing). */
export function renderHtmlReport(run, entries, images = {}) {
  const ledgerIndexByShot = {};
  for (const e of entries) if (e.screenshot) ledgerIndexByShot[e.screenshot] = e.index;
  const extraShots = (run.artifacts?.screenshots ?? []).filter((s) => ledgerIndexByShot[s] === undefined);
  const ctx = run.executionContext;
  const residual = run.cleanup?.residualChanges
    ? `<div class="callout callout-bad" role="alert"><p><strong>Residual test changes may remain.</strong> ${esc(run.cleanup.detail)}</p></div>`
    : '';
  const why = run.execution.failure
    ? `<div class="callout callout-bad"><p><strong>Why it stopped (observed):</strong> ${esc(run.execution.failure.observed)}</p><p><strong>Root cause:</strong> ${esc(run.execution.failure.rootCause)}. ${esc(run.execution.failure.reviewNote)}</p></div>`
    : '';
  const limits = [...(run.comparison?.limitations ?? []), 'Browser duration is diagnostic only. It is not human task time.'];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="robots" content="noindex">
<title>Task-effort audit: ${esc(run.task.name)}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<header>
  <p class="muted">Task-effort audit · scenario <strong>${esc(run.task.scenario)}</strong></p>
  <h1>${esc(run.task.name)}</h1>
  <p class="meta"><code>${esc(run.runId)}</code> · ${esc(run.property.name)} · ${esc(ctx.startedAt)}${ctx.fixtureVariant ? ` · fixture <code>${esc(ctx.fixtureVariant)}</code>` : ''}</p>
  <div class="callout callout-info"><p>A regression audit of interface-imposed work along one reviewed path. It is not user research, and it says nothing about emotion, human task time, or discoverability.</p></div>
  ${residual}
</header>
${summary(run)}
${why}
${comparison(run)}
${findings(run)}
${timeline(entries, images, extraShots)}
${context(run)}
<section aria-labelledby="h-limits"><h2 id="h-limits">Limitations</h2><ul>${limits.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></section>
<footer>
  <p>Generated from <code>run.json</code> and <code>actions.json</code>. Replay the browser session with <code>npx playwright show-trace trace.zip</code> in the run folder.</p>
  <p>Screenshots are embedded in this file and can contain sensitive information. They are not sanitized. Share it the way you would share the screenshots.</p>
</footer>
</main>
<script>
document.querySelectorAll('.zoom').forEach(function (b) {
  b.addEventListener('click', function () { b.parentElement.classList.toggle('zoomed'); });
});
</script>
</body>
</html>
`;
}

/** Read screenshots from the run directory and write report.html. */
export async function writeHtmlReport(runDir, run, entries) {
  const images = {};
  for (const rel of run.artifacts?.screenshots ?? []) {
    try {
      images[rel] = `data:image/png;base64,${(await readFile(path.join(runDir, rel))).toString('base64')}`;
    } catch {
      /* rendered as "not available" */
    }
  }
  await writeFile(path.join(runDir, 'report.html'), renderHtmlReport(run, entries, images));
}
