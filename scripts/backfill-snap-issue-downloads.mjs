#!/usr/bin/env node
/**
 * One-off: find GitHub issues (from “today” or a time window) whose body references
 * `snap-issue-*.png` in Downloads, upload that file to `snap-issue-media` the same way
 * the Snap Issue extension does, then PATCH the issue body: inserts a framed capture
 * under `## Screenshot` (markdown table + caption so it does not blend into the page).
 *
 * Usage (from repo root):
 *   export GH_TOKEN=...   # optional if `gh auth login` is active — script runs `gh auth token`
 *   node scripts/backfill-snap-issue-downloads.mjs --dry-run
 *   node scripts/backfill-snap-issue-downloads.mjs --apply
 *
 * Options:
 *   --repo owner/name     (default: `gh repo view --json nameWithOwner`)
 *   --downloads PATH      (default: ~/Downloads)
 *   --branch NAME         (default: snap-issue-media)
 *   --since-midnight      only issues created since local midnight today (default)
 *   --hours N             instead of midnight, last N hours
 *   --max-issues N        stop after N issues (default 50)
 *   --dry-run / --apply   default is dry-run
 *
 * Skips if the body already has an inline `![Snap Issue capture](https://...)` or
 * contains `<!-- snap-issue-backfill-body -->` from a prior run.
 *
 * Token: `GH_TOKEN` / `GITHUB_TOKEN`, else `gh auth token` (same as the GitHub CLI).
 */

import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, basename } from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_MEDIA_BRANCH = 'snap-issue-media';
/** Hidden marker so re-runs do not duplicate the framed block. */
const BODY_MARKER = '<!-- snap-issue-backfill-body -->';

/**
 * GFM table gives a visible border around the screenshot on github.com so it does not
 * visually merge with surrounding copy (blockquote is only a left stripe).
 */
function buildBackfillInsertion(downloadUrl, fname) {
  return `${BODY_MARKER}

| **Snap Issue capture** — _backfilled from Downloads_ (\`${fname}\`) |
|:---:|
| ![Snap Issue capture](${downloadUrl}) |

`;
}

/**
 * @returns {{ body: string } | { error: string }}
 */
function patchBodyInsertScreenshot(body, downloadUrl, fname) {
  const b = body || '';
  if (b.includes(BODY_MARKER)) {
    return { error: 'body already contains backfill marker' };
  }
  const insertion = buildBackfillInsertion(downloadUrl, fname);
  const heading = /^##\s+Screenshot\s*\r?\n/m;
  if (heading.test(b)) {
    return { body: b.replace(heading, (m) => `${m}${insertion}`) };
  }
  const appended = `${b.trimEnd()}\n\n## Screenshot\n\n${insertion}`;
  return { body: appended };
}

function parseArgs(argv) {
  const out = {
    repo: '',
    downloads: join(homedir(), 'Downloads'),
    branch: DEFAULT_MEDIA_BRANCH,
    sinceMidnight: true,
    hours: 0,
    maxIssues: 50,
    dryRun: true,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') out.dryRun = false;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--since-midnight') {
      out.sinceMidnight = true;
      out.hours = 0;
    } else if (a === '--hours') out.hours = Number(argv[++i] || '24');
    else if (a === '--repo') out.repo = argv[++i] || '';
    else if (a === '--downloads') out.downloads = argv[++i] || out.downloads;
    else if (a === '--branch') out.branch = argv[++i] || out.branch;
    else if (a === '--max-issues') out.maxIssues = Number(argv[++i] || '50');
    else if (a === '--help' || a === '-h') {
      console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(2, 25).join('\n'));
      process.exit(0);
    }
  }
  return out;
}

function ghRepoView() {
  const r = spawnSync(
    'gh',
    ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'],
    { encoding: 'utf8' }
  );
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || 'gh repo view failed');
    process.exit(1);
  }
  return r.stdout.trim();
}

function token() {
  const fromEnv = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (fromEnv) return fromEnv;
  const r = spawnSync('gh', ['auth', 'token'], { encoding: 'utf8' });
  const fromGh = (r.stdout || '').trim();
  if (r.status === 0 && fromGh) return fromGh;
  console.error(
    'No GitHub token: set GH_TOKEN or GITHUB_TOKEN, or run `gh auth login`.'
  );
  process.exit(1);
}

function headers(tok) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${tok}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function parseJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function cutoffDate(opts) {
  if (opts.hours > 0) {
    return new Date(Date.now() - opts.hours * 3600 * 1000);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function extractSnapFilename(body) {
  const re = /`((snap-issue-[a-zA-Z0-9_.-]+\.png))`/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const name = m[1];
    if (name && /^snap-issue-/.test(name)) return name;
  }
  return '';
}

function alreadyHosted(body) {
  return /\!\[Snap Issue capture\]\(https?:\/\//i.test(body);
}

function encodeRepoPath(relPath) {
  return String(relPath)
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
}

function gitRefUrl(owner, repo, branchShortName) {
  const ref = `heads/${branchShortName}`;
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/${encodeURIComponent(ref)}`;
}

async function ensureBranchExists({ owner, repo, tok, branchName, defaultBranch }) {
  const headUrl = gitRefUrl(owner, repo, branchName);
  const headRes = await fetch(headUrl, { headers: headers(tok) });
  if (headRes.ok) return;

  if (headRes.status !== 404) {
    const j = await parseJson(headRes);
    throw new Error(`Could not read refs/heads/${branchName}: ${j.message || headRes.status}`);
  }

  const baseRes = await fetch(gitRefUrl(owner, repo, defaultBranch), {
    headers: headers(tok),
  });
  const baseJson = await parseJson(baseRes);
  if (!baseRes.ok) {
    throw new Error(`Could not read default branch: ${baseJson.message || baseRes.status}`);
  }
  const sha = baseJson?.object?.sha;
  if (!sha) throw new Error('No SHA on default branch ref');

  const createRes = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`,
    {
      method: 'POST',
      headers: { ...headers(tok), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha }),
    }
  );
  if (createRes.ok) return;
  const cj = await parseJson(createRes);
  if (createRes.status === 422 && String(cj?.message || '').includes('already exists')) {
    const again = await fetch(headUrl, { headers: headers(tok) });
    if (again.ok) return;
  }
  throw new Error(`Could not create branch ${branchName}: ${cj.message || createRes.status}`);
}

async function uploadPng({ owner, repo, tok, branch, issueNumber, originalName, bytes }) {
  const safeBase = basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeName = `backfill-${issueNumber}-${Date.now()}-${safeBase}`;
  const path = `snap-issue-captures/${safeName}`;
  const b64 = Buffer.from(bytes).toString('base64');

  const metaRes = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { headers: headers(tok) }
  );
  const meta = await parseJson(metaRes);
  if (!metaRes.ok) throw new Error(meta.message || 'repo meta');
  const defaultBranch = meta.default_branch || 'main';

  await ensureBranchExists({
    owner,
    repo,
    tok,
    branchName: branch,
    defaultBranch,
  });

  const putUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeRepoPath(path)}`;
  const putRes = await fetch(putUrl, {
    method: 'PUT',
    headers: { ...headers(tok), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `chore(snap-issue): backfill capture for #${issueNumber}`,
      content: b64,
      branch,
    }),
  });
  const putJson = await parseJson(putRes);
  if (!putRes.ok) {
    throw new Error(putJson.message || `PUT contents ${putRes.status}`);
  }
  const downloadUrl = putJson?.content?.download_url;
  if (!downloadUrl) throw new Error('No download_url in PUT response');
  return { downloadUrl, path };
}

async function patchIssueBody({ owner, repo, tok, issueNumber, body }) {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...headers(tok), 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.message || String(res.status));
  return data;
}

/** Newest-first pages until an issue is older than `since` (exclusive of old issues). */
async function listIssuesNewerThan({ owner, repo, tok, since, maxPages = 10 }) {
  const out = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = new URL(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`
    );
    url.searchParams.set('state', 'all');
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    url.searchParams.set('sort', 'created');
    url.searchParams.set('direction', 'desc');
    const res = await fetch(url, { headers: headers(tok) });
    const chunk = await parseJson(res);
    if (!res.ok) throw new Error(chunk.message || String(res.status));
    if (!Array.isArray(chunk) || chunk.length === 0) break;

    let hitOld = false;
    for (const issue of chunk) {
      if (issue.pull_request) continue;
      const created = new Date(issue.created_at);
      if (created < since) {
        hitOld = true;
        break;
      }
      out.push(issue);
    }
    if (hitOld || chunk.length < 100) break;
  }
  return out;
}

async function main() {
  const opts = parseArgs(process.argv);
  const tok = token();
  const repoFull = opts.repo || ghRepoView();
  const [owner, repo] = repoFull.split('/');
  if (!owner || !repo) {
    console.error('Bad repo:', repoFull);
    process.exit(1);
  }

  const since = cutoffDate(opts);
  console.error(`Repo: ${owner}/${repo}`);
  console.error(
    `Filter: issues created >= ${since.toISOString()} (local ${since.toString()})`
  );
  console.error(`Downloads: ${opts.downloads}`);
  console.error(`Branch: ${opts.branch}`);
  console.error(opts.dryRun ? 'Mode: DRY-RUN (no API writes)' : 'Mode: APPLY');

  const issues = await listIssuesNewerThan({ owner, repo, tok, since });
  const recent = issues.slice(0, opts.maxIssues);

  let processed = 0;
  for (const issue of recent) {
    const body = issue.body || '';
    if (body.includes(BODY_MARKER)) {
      console.error(`#${issue.number} skip: body already backfilled (marker present)`);
      continue;
    }
    if (alreadyHosted(body)) {
      console.error(`#${issue.number} skip: body already has inline Snap Issue image`);
      continue;
    }
    const fname = extractSnapFilename(body);
    if (!fname) {
      console.error(`#${issue.number} skip: no \`snap-issue-*.png\` in backticks`);
      continue;
    }
    const localPath = join(opts.downloads, basename(fname));
    if (!existsSync(localPath)) {
      console.error(`#${issue.number} skip: file missing: ${localPath}`);
      continue;
    }

    processed++;
    const bytes = readFileSync(localPath);
    console.error(`#${issue.number} ${issue.title?.slice(0, 60)}`);
    console.error(`  file: ${localPath} (${bytes.length} bytes)`);

    if (opts.dryRun) {
      console.error('  (dry-run: would upload + PATCH issue body with framed table block)');
      continue;
    }

    const { downloadUrl } = await uploadPng({
      owner,
      repo,
      tok,
      branch: opts.branch,
      issueNumber: issue.number,
      originalName: fname,
      bytes,
    });

    const patched = patchBodyInsertScreenshot(body, downloadUrl, fname);
    if ('error' in patched) {
      console.error(`  skip after upload: ${patched.error}`);
      continue;
    }

    await patchIssueBody({
      owner,
      repo,
      tok,
      issueNumber: issue.number,
      body: patched.body,
    });
    console.error(`  done: issue body updated (framed screenshot under ## Screenshot)`);
  }

  console.error(`\nSummary: ${processed} issue(s) would be/were updated (see log above).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
