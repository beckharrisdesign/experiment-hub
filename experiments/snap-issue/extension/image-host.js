/**
 * GitHub-hosted screenshot for issue Markdown.
 *
 * **Flow:** `PUT /repos/{owner}/{repo}/contents/snap-issue-captures/{filename}` on a
 * **dedicated media branch** (default `snap-issue-media`), not the repo default branch,
 * so “protect main” rulesets that require PRs on `main` do not block uploads. If that
 * branch does not exist, Snap Issue creates `refs/heads/snap-issue-media` pointing at
 * the current default-branch tip (empty extra commits on `main`).
 *
 * Optional `branch` override in options uses that name instead (same create-if-missing
 * behavior).
 *
 * Requires **Contents: Read and write** (and ref create uses the same). **Issues**
 * permission still required elsewhere for `POST /issues`.
 *
 * @param {object} opts
 * @param {string} opts.owner
 * @param {string} opts.repo
 * @param {string} opts.token
 * @param {string} opts.imageDataUrl PNG as `data:image/png;base64,...`.
 * @param {string} opts.filename File name under `snap-issue-captures/`.
 * @param {string} [opts.branch] Optional branch name from options (else `snap-issue-media`).
 * @returns {Promise<{ markdownImage: string, downloadUrl: string }>}
 */
const DEFAULT_MEDIA_BRANCH = 'snap-issue-media';

export async function uploadScreenshotForMarkdown({
  owner,
  repo,
  token,
  imageDataUrl,
  filename,
  branch: branchOverride,
}) {
  const base64 = extractBase64FromDataUrl(imageDataUrl);
  if (!base64) {
    throw new Error(
      'Snap Issue: expected a PNG data URL from capture — cannot upload.'
    );
  }

  const safeName = String(filename || 'snap-issue.png').replace(
    /[^a-zA-Z0-9._-]/g,
    '_'
  );
  const path = `snap-issue-captures/${safeName}`;

  const metaRes = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { headers: githubHeaders(token) }
  );
  const metaJson = await parseJsonResponse(metaRes);
  if (!metaRes.ok) {
    throw formatGithubError(
      'Could not read repository metadata',
      metaRes.status,
      metaJson
    );
  }
  const defaultBranch = metaJson.default_branch || 'main';
  const uploadBranch =
    sanitizeBranchName(branchOverride) || DEFAULT_MEDIA_BRANCH;

  await ensureBranchExists({
    owner,
    repo,
    token,
    branchName: uploadBranch,
    defaultBranch,
  });

  const putUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeRepoPath(path)}`;
  const putRes = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      ...githubHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `chore(snap-issue): add capture ${safeName}`,
      content: base64,
      branch: uploadBranch,
    }),
  });
  const putJson = await parseJsonResponse(putRes);
  if (!putRes.ok) {
    throw formatGithubError(
      'Could not upload screenshot via GitHub Contents API (check token scopes and rules on the upload branch)',
      putRes.status,
      putJson
    );
  }

  const downloadUrl = putJson?.content?.download_url;
  if (!downloadUrl || typeof downloadUrl !== 'string') {
    throw new Error(
      'Snap Issue: GitHub did not return content.download_url after upload — try again or check API response.'
    );
  }

  const markdownImage = `![Snap Issue capture](${downloadUrl})`;
  return { markdownImage, downloadUrl };
}

async function ensureBranchExists({
  owner,
  repo,
  token,
  branchName,
  defaultBranch,
}) {
  const headUrl = gitRefUrl(owner, repo, branchName);
  const headRes = await fetch(headUrl, { headers: githubHeaders(token) });
  if (headRes.ok) return;

  if (headRes.status !== 404) {
    const j = await parseJsonResponse(headRes);
    throw formatGithubError(
      `Could not read branch refs/heads/${branchName}`,
      headRes.status,
      j
    );
  }

  const baseUrl = gitRefUrl(owner, repo, defaultBranch);
  const baseRes = await fetch(baseUrl, { headers: githubHeaders(token) });
  const baseJson = await parseJsonResponse(baseRes);
  if (!baseRes.ok) {
    throw formatGithubError(
      `Could not read default branch ref heads/${defaultBranch}`,
      baseRes.status,
      baseJson
    );
  }
  const sha = baseJson?.object?.sha;
  if (!sha || typeof sha !== 'string') {
    throw new Error(
      'Snap Issue: could not resolve default branch SHA to create media branch.'
    );
  }

  const createRes = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`,
    {
      method: 'POST',
      headers: {
        ...githubHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha,
      }),
    }
  );
  const createJson = await parseJsonResponse(createRes);
  if (createRes.ok) return;

  if (createRes.status === 422) {
    const exists =
      Array.isArray(createJson?.errors) &&
      createJson.errors.some(
        (e) =>
          String(e?.message || '').includes('already exists') ||
          String(e?.message || '').includes('Reference already exists')
      );
    if (exists) {
      const again = await fetch(headUrl, { headers: githubHeaders(token) });
      if (again.ok) return;
    }
  }

  throw formatGithubError(
    `Could not create media branch "${branchName}" from ${defaultBranch} (needs permission to create refs, or create the branch manually in GitHub)`,
    createRes.status,
    createJson
  );
}

function gitRefUrl(owner, repo, branchShortName) {
  const ref = `heads/${branchShortName}`;
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/${encodeURIComponent(ref)}`;
}

async function parseJsonResponse(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text || res.statusText };
  }
}

function githubHeaders(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function encodeRepoPath(relPath) {
  return String(relPath)
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
}

function extractBase64FromDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return '';
  const i = dataUrl.indexOf(',');
  if (i === -1) return '';
  return dataUrl.slice(i + 1).trim();
}

function sanitizeBranchName(name) {
  const t = String(name || '').trim();
  if (!t) return '';
  if (!/^[a-zA-Z0-9/_.-]+$/.test(t)) return '';
  if (t.includes('..') || t.startsWith('/') || t.endsWith('/')) return '';
  return t;
}

function formatGithubError(prefix, status, json) {
  let extra = '';
  if (Array.isArray(json?.errors) && json.errors.length) {
    const first = json.errors[0];
    if (first?.message) extra = ` — ${first.message}`;
  }
  const core =
    json?.message ||
    json?.error ||
    (typeof json === 'string' ? json : '') ||
    `HTTP ${status}`;
  const msg = extra ? `${core}${extra}` : core;
  const err = new Error(`${prefix}: ${msg}`);
  err.status = status;
  err.body = json;
  return err;
}
