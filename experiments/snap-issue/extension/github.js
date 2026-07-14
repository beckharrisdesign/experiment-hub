const NOTE_TRUNC = 72;

function truncate(s, max) {
  const t = (s || '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function buildIssueTitle({ issueType, note, pageTitle }) {
  const prefix = issueType === 'feedback' ? '[Feedback]' : '[Bug]';
  const n = (note || '').trim();
  if (n) return `${prefix} ${truncate(n, NOTE_TRUNC)}`;
  const title = (pageTitle || 'Untitled page').trim() || 'Untitled page';
  return `${prefix} Screenshot report from ${truncate(title, 60)}`;
}

export function buildIssueBody({
  issueType,
  pageUrl,
  pageTitle,
  capturedAtIso,
  browserLine,
  viewport,
  dpr,
  note,
  screenshotFilename,
  screenshotMarkdownImage,
  uploadFailureMessage = '',
}) {
  const typeLabel = issueType === 'feedback' ? 'Feedback' : 'Bug';
  const noteBlock =
    (note || '').trim() || 'No note added at capture time.';
  const localLine = screenshotFilename
    ? `Also saved locally (Downloads): \`${screenshotFilename}\``
    : '_(Local filename unavailable.)_';

  const hosted = (screenshotMarkdownImage || '').trim();
  const fail = (uploadFailureMessage || '').trim();
  let hostedBlock;
  if (hosted) {
    hostedBlock = hosted;
  } else if (fail) {
    const short = fail.length > 600 ? `${fail.slice(0, 597)}…` : fail;
    hostedBlock = `**No inline screenshot in this issue** (GitHub rejected creating/pushing the media branch — see below).

> ${short}

The PNG is still in **Downloads** (\`${screenshotFilename || 'snap-issue-*.png'}\`). Snap Issue normally uses branch \`snap-issue-media\` (off \`main\`) for uploads. If this failed, check your PAT can **create refs** and **push contents**, or set **Upload branch for screenshots** in Options to a branch your token can use, then reload the extension.`;
  } else {
    hostedBlock =
      '_(GitHub-hosted image unavailable — attach the downloaded PNG manually if needed.)_';
  }

  return `## Capture
- Type: ${typeLabel}
- URL: ${pageUrl}
- Page title: ${pageTitle}
- Timestamp: ${capturedAtIso}
- Browser: ${browserLine}
- Viewport: ${viewport.width}x${viewport.height}
- Device pixel ratio: ${dpr}

## Note
${noteBlock}

## Screenshot
${hostedBlock}

${localLine}

## Follow-up
- Repro steps:
- Expected behavior:
- Actual behavior:
- Severity:
- Environment:
- Additional context:
`;
}

function parseLabelCsv(csv) {
  return (csv || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createGitHubIssue({
  owner,
  repo,
  token,
  title,
  body,
  issueType,
  labelsBug,
  labelsFeedback,
  assignee,
}) {
  const labels =
    issueType === 'feedback'
      ? parseLabelCsv(labelsFeedback)
      : parseLabelCsv(labelsBug);
  const payload = {
    title,
    body,
  };
  if (labels.length) payload.labels = labels;
  if ((assignee || '').trim()) {
    payload.assignees = [(assignee || '').trim()];
  }
  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(payload),
    }
  );
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { message: text || res.statusText };
  }
  if (!res.ok) {
    const msg =
      json.message ||
      json.error ||
      `GitHub API error (${res.status}): ${text.slice(0, 200)}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}
