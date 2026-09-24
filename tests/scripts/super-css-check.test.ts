import { describe, it, expect } from 'vitest';
import { diagnoseFreshness } from '../../scripts/super-css/check.mjs';

/**
 * The live check can only observe "served file differs from mine". Which of the
 * very different causes that is comes from git, so the branching is what needs
 * covering — and a real outage cannot be fabricated against production.
 *
 * `run` stands in for the git helper: [args] -> { ok, out }.
 */
const fakeGit =
  (answers: Record<string, { ok: boolean; out?: string }>) =>
  (args: string[]) => {
    const key = args[0];
    return { ok: false, out: '', ...(answers[key] ?? {}) };
  };

const IN_REPO = { 'rev-parse': { ok: true, out: 'true\n' } };
const LIVE_CSS = ':root { --accent: #113723; }';

describe('diagnoseFreshness', () => {
  it('names a failed or pending deploy when main does not match the live file', () => {
    const result = diagnoseFreshness(
      'body{color:red}',
      fakeGit({ ...IN_REPO, show: { ok: true, out: LIVE_CSS } }),
    );
    expect(result.cause).toBe('deploy-not-landed');
    // The regression being guarded: this case used to lead with "uncommitted
    // edit", sending the reader to a clean `git status`.
    expect(result.message).not.toMatch(/uncommitted/i);
    expect(result.message).toMatch(/has NOT shipped/);
  });

  it('blames an uncommitted edit only when main is genuinely live', () => {
    const result = diagnoseFreshness(
      ':root{--accent:#113723;}',
      fakeGit({
        ...IN_REPO,
        show: { ok: true, out: LIVE_CSS },
        diff: { ok: false }, // non-zero exit from --quiet == the file is dirty
      }),
    );
    expect(result.cause).toBe('uncommitted-edit');
  });

  it('points at an unmerged commit when the file is clean but ahead of main', () => {
    const result = diagnoseFreshness(
      ':root{--accent:#113723;}',
      fakeGit({
        ...IN_REPO,
        show: { ok: true, out: LIVE_CSS },
        diff: { ok: true }, // clean
        'rev-list': { ok: true, out: '2\n' },
      }),
    );
    expect(result.cause).toBe('unmerged-commit');
  });

  it('falls back to a stale checkout when nothing local explains the difference', () => {
    const result = diagnoseFreshness(
      ':root{--accent:#113723;}',
      fakeGit({
        ...IN_REPO,
        show: { ok: true, out: LIVE_CSS },
        diff: { ok: true },
        'rev-list': { ok: true, out: '0\n' },
      }),
    );
    expect(result.cause).toBe('stale-checkout');
  });

  it('degrades to unknown rather than guessing when git cannot answer', () => {
    expect(diagnoseFreshness('body{}', fakeGit({})).cause).toBe('unknown');
    // In a repo, but origin/main is unreadable (never fetched, shallow clone).
    expect(diagnoseFreshness('body{}', fakeGit({ ...IN_REPO })).cause).toBe('unknown');
  });

  it('treats only a non-shipping deploy as loud — local causes are the reader\'s own business', () => {
    const deployFailed = diagnoseFreshness(
      'body{color:red}',
      fakeGit({ ...IN_REPO, show: { ok: true, out: LIVE_CSS } }),
    );
    const localEdit = diagnoseFreshness(
      ':root{--accent:#113723;}',
      fakeGit({ ...IN_REPO, show: { ok: true, out: LIVE_CSS }, diff: { ok: false } }),
    );
    expect(deployFailed.message).toMatch(/not something to fix locally/);
    expect(localEdit.message).toMatch(/live and correct/);
  });
});
