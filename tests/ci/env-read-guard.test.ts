import { describe, it, expect } from "vitest";
import { execFileSync } from "child_process";
import path from "path";

// ---------------------------------------------------------------------------
// Guards the pre-tool-use hook that blocks bulk reads of .env* files.
//
// This is the defense that would have stopped the 2026-08-14 leak, where an
// agent's `sed` range ran past its intended block and printed three live
// credentials into a session transcript.
//
// Both directions are tested deliberately. A guard that blocks everything is as
// useless as one that blocks nothing — agents legitimately need to check whether
// a key exists, and breaking that would push people back to `cat`.
// ---------------------------------------------------------------------------

const HOOK = path.resolve(__dirname, "../../.claude/hooks/pre-tool-use.sh");

/** Runs the hook with a Bash tool payload. Exit 0 = allowed, exit 2 = blocked. */
function runHook(command: string): { exitCode: number; stderr: string } {
  const payload = JSON.stringify({ tool_name: "Bash", tool_input: { command } });
  try {
    execFileSync("bash", [HOOK], { input: payload, encoding: "utf8", stdio: "pipe" });
    return { exitCode: 0, stderr: "" };
  } catch (err) {
    const e = err as { status?: number; stderr?: string };
    return { exitCode: e.status ?? -1, stderr: e.stderr ?? "" };
  }
}

// ---------------------------------------------------------------------------
// Blocked — commands that would emit file contents
// ---------------------------------------------------------------------------

describe("pre-tool-use hook blocks bulk reads of env files", () => {
  const blocked = [
    "cat .env.local",
    "cat /Users/katybharris/Documents/code/experiment-hub/.env.local",
    "sed -n '1,200p' .env.local",
    "head -50 .env.local",
    "tail -20 .env.local",
    "cat .env",
    "cat .env.production",
    "less .env.local",
    "bat .env.local",
    // grep prints the matching LINE, value included. Omitting grep from the
    // blocklist was the guard's biggest hole on first implementation.
    "grep OPENAI_API_KEY .env.local",
    "grep -n STRIPE .env.local",
    "rg SUPABASE .env.local",
  ];

  it.each(blocked)("blocks: %s", (command) => {
    const { exitCode } = runHook(command);
    expect(exitCode).toBe(2);
  });

  it("explains why it blocked, so the agent can choose another route", () => {
    const { stderr } = runHook("cat .env.local");
    expect(stderr.trim().length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Allowed — ordinary env work that must keep functioning
// ---------------------------------------------------------------------------

describe("pre-tool-use hook allows key-name inspection", () => {
  const allowed = [
    // Listing variable names without values — the common legitimate need.
    "grep -E '^[A-Z_]+=' .env.local | cut -d= -f1",
    "cut -d= -f1 .env.local",
    // Checking existence / counting, no values emitted.
    "grep -c OPENAI_API_KEY .env.local",
    "test -f .env.local && echo present",
    // Unrelated commands must be untouched.
    "cat package.json",
    "cat README.md",
    "ls -la",
    // The registry is values-free by design and must stay readable.
    "cat .env.example",
    // Searching the CODEBASE for env references must keep working. These only
    // mention ".env" inside a quoted pattern; the file being read is a workflow
    // or source file, not a secrets file.
    'grep -nE "env.local|\\.env" .github/workflows/ci.yml',
    "grep -rn '.env.local' README.md",
    'rg "\\.env" scripts/',
    // A heredoc body is data. Writing a commit message that *describes*
    // reading an env file must not be blocked — this exact command was
    // refused while committing the guard itself.
    "git commit -F - <<'MSG'\nfix: grep OPENAI_API_KEY .env.local printed the value\nMSG",
  ];

  it.each(allowed)("allows: %s", (command) => {
    const { exitCode } = runHook(command);
    expect(exitCode).toBe(0);
  });
});
