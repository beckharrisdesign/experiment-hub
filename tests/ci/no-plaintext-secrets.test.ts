import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Guards the secret-references capability: .env.local must hold op:// pointers
// rather than credential values.
//
// This file reads the secrets file, so it must never put a value into an
// assertion message — a failing CI run prints those messages into a public log,
// which would turn the leak guard into a leak. Every expectation below asserts
// on a list of VARIABLE NAMES only.
// ---------------------------------------------------------------------------

const ENV_PATH = path.resolve(__dirname, "../../.env.local");

/** Credentials that must never appear as literal values. From specs/secret-references. */
const CREDENTIALS = [
  "OPENAI_API_KEY",
  "STRIPE_SECRET_KEY_LIVE",
  "STRIPE_SECRET_KEY_TEST",
  "STRIPE_WEBHOOK_SECRET_LIVE",
  "STRIPE_WEBHOOK_SECRET_TEST",
  "SUPABASE_SERVICE_ROLE_KEY",
  "FIGMA_ACCESS_TOKEN",
  "GITHUB_DISPATCH_TOKEN",
];

/** Prefixes that identify a live credential regardless of which variable holds it. */
const SECRET_PREFIXES = [
  "sk-", // OpenAI
  "sk_live_", // Stripe live
  "sk_test_", // Stripe test
  "rk_live_", // Stripe restricted
  "whsec_", // Stripe webhook signing
  "GOCSPX-", // Google OAuth client secret
  "figd_", // Figma personal access token
  "ghp_", // GitHub personal access token
  "github_pat_", // GitHub fine-grained PAT
];

type EnvLine = { key: string; value: string };

function parseEnv(contents: string): EnvLine[] {
  return contents
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      return { key: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
    });
}

// `.env.local` is untracked and absent in CI. Skipping there is correct rather
// than a gap: CI has no secrets file to leak, and the check exists to protect
// the developer machine where the file actually lives.
const hasEnvFile = existsSync(ENV_PATH);

describe.skipIf(!hasEnvFile)("no plaintext secrets in .env.local", () => {
  const entries = hasEnvFile ? parseEnv(readFileSync(ENV_PATH, "utf8")) : [];

  it("stores every credential as an op:// reference", () => {
    const offenders = entries
      .filter(({ key, value }) => CREDENTIALS.includes(key))
      .filter(({ value }) => value !== "" && !value.startsWith("op://"))
      .map(({ key }) => key);

    expect(
      offenders,
      `These credentials still hold a literal value instead of an op:// reference: ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("contains no value matching a known live-credential prefix", () => {
    const offenders = entries
      .filter(({ value }) => SECRET_PREFIXES.some((p) => value.startsWith(p)))
      .map(({ key }) => key);

    expect(
      offenders,
      `These variables hold something shaped like a live credential: ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("still keeps non-secret config readable as plain text", () => {
    // The point of the change is that the file stays useful, not that it becomes
    // opaque. If every line were a reference, config review would regress.
    const plainConfig = entries.filter(
      ({ key, value }) => !CREDENTIALS.includes(key) && value !== "" && !value.startsWith("op://"),
    );

    expect(plainConfig.length).toBeGreaterThan(0);
  });
});
