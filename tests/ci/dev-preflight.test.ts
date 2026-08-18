import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "child_process";
import { mkdtempSync, rmSync, writeFileSync, chmodSync } from "fs";
import { tmpdir } from "os";
import path from "path";

// ---------------------------------------------------------------------------
// Guards scripts/op-preflight.sh — the check that runs before `pnpm dev`.
//
// `op run` is a hard dependency of local dev (design.md Risks). When the
// 1Password CLI cannot resolve references, start-up must fail with a message
// naming 1Password as the cause and pointing at the documented bypass —
// never start Next with empty credentials and fail three layers deep
// (specs/secret-references, scenario "A broken CLI integration fails loudly").
//
// The failure modes exercised here are the three real ones observed so far:
// the CLI missing entirely, the desktop app quit/locked, and macOS denying
// the calling app access to 1Password's data (2026-08-17, Claude desktop).
// ---------------------------------------------------------------------------

const PREFLIGHT = path.resolve(__dirname, "../../scripts/op-preflight.sh");

/** A minimal PATH that still has bash's needs but no real `op`. */
const BARE_PATH = "/usr/bin:/bin";

let stubDir: string;

/** Writes an executable `op` stub into stubDir with the given behavior. */
function stubOp(script: string) {
  const file = path.join(stubDir, "op");
  writeFileSync(file, `#!/bin/bash\n${script}\n`);
  chmodSync(file, 0o755);
}

function runPreflight(pathEnv: string): { exitCode: number; stderr: string } {
  try {
    execFileSync("bash", [PREFLIGHT], {
      encoding: "utf8",
      stdio: "pipe",
      env: { ...process.env, PATH: pathEnv },
    });
    return { exitCode: 0, stderr: "" };
  } catch (err) {
    const e = err as { status?: number; stderr?: string };
    return { exitCode: e.status ?? -1, stderr: e.stderr ?? "" };
  }
}

beforeEach(() => {
  stubDir = mkdtempSync(path.join(tmpdir(), "op-stub-"));
});

afterEach(() => {
  rmSync(stubDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Failure — must be loud, name 1Password, and point at the bypass
// ---------------------------------------------------------------------------

describe("op-preflight fails loudly when 1Password cannot answer", () => {
  it("fails when the op CLI is not installed", () => {
    const { exitCode, stderr } = runPreflight(BARE_PATH);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("1Password");
  });

  it("fails when op cannot see the vault (app quit, integration off, macOS denial)", () => {
    stubOp('echo "No accounts configured for use with 1Password CLI." >&2; exit 1');
    const { exitCode, stderr } = runPreflight(`${stubDir}:${BARE_PATH}`);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("1Password");
  });

  it("points at the documented bypass, not just the failure", () => {
    stubOp("exit 1");
    const { stderr } = runPreflight(`${stubDir}:${BARE_PATH}`);
    // The runbook section is the bypass documentation of record …
    expect(stderr).toContain("SECRETS_RUNBOOK.md");
    // … and the emergency route is `op read` + per-shell export.
    expect(stderr).toContain("op read");
  });

  it("surfaces op's own stderr so the specific cause is visible", () => {
    stubOp('echo "connecting to desktop app: connection refused" >&2; exit 1');
    const { stderr } = runPreflight(`${stubDir}:${BARE_PATH}`);
    expect(stderr).toContain("connection refused");
  });
});

// ---------------------------------------------------------------------------
// Success — a working integration must add no friction
// ---------------------------------------------------------------------------

describe("op-preflight passes silently when 1Password answers", () => {
  it("exits 0 when op can see the vault", () => {
    stubOp('[ "$1" = "vault" ] && exit 0; exit 0');
    const { exitCode } = runPreflight(`${stubDir}:${BARE_PATH}`);
    expect(exitCode).toBe(0);
  });
});
