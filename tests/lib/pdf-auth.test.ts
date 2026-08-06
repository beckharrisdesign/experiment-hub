import { describe, it, expect } from "vitest";
import {
  acceptGoogleIdentity,
  isAllowedAccount,
  isGatedPath,
  PDF_SESSION_TTL_SECONDS,
  signSession,
  verifySession,
  type PdfSession,
} from "@/lib/pdf-auth";

const SECRET = "test-secret-not-a-real-key";
const OTHER_SECRET = "a-different-secret";

function future(seconds = 3600): number {
  return Math.floor(Date.now() / 1000) + seconds;
}

const SESSION: PdfSession = {
  sub: "103948572910384756102",
  email: "someone@example.com",
  exp: future(),
};

// ---------------------------------------------------------------------------
// Session round trip
// ---------------------------------------------------------------------------

describe("signSession / verifySession", () => {
  it("round-trips a valid session", async () => {
    const token = await signSession(SESSION, SECRET);
    await expect(verifySession(token, SECRET)).resolves.toEqual(SESSION);
  });

  it("produces a token that is not itself a credential", async () => {
    const token = await signSession(SESSION, SECRET);
    expect(token).not.toContain(SECRET);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signSession(SESSION, OTHER_SECRET);
    await expect(verifySession(token, SECRET)).resolves.toBeNull();
  });

  it("rejects a tampered payload", async () => {
    const token = await signSession(SESSION, SECRET);
    const [, signature] = token.split(".");
    const forged = btoa(JSON.stringify({ ...SESSION, sub: "someone-else" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    await expect(verifySession(`${forged}.${signature}`, SECRET)).resolves.toBeNull();
  });

  it("rejects an expired session", async () => {
    const token = await signSession(
      { ...SESSION, exp: Math.floor(Date.now() / 1000) - 1 },
      SECRET,
    );
    await expect(verifySession(token, SECRET)).resolves.toBeNull();
  });

  it("rejects absent, malformed and unsigned tokens", async () => {
    for (const bad of [undefined, "", "no-separator", ".", "abc.", ".abc"]) {
      await expect(verifySession(bad, SECRET)).resolves.toBeNull();
    }
  });

  it("rejects everything when no secret is configured", async () => {
    const token = await signSession(SESSION, SECRET);
    await expect(verifySession(token, "")).resolves.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Allowlist — keyed on sub, never on email
// ---------------------------------------------------------------------------

describe("isAllowedAccount", () => {
  const env = { PDF_ALLOWED_GOOGLE_SUBS: "sub-one, sub-two" };

  it("admits a listed sub", () => {
    expect(isAllowedAccount("sub-one", env)).toBe(true);
    expect(isAllowedAccount("sub-two", env)).toBe(true);
  });

  it("refuses an unlisted sub", () => {
    expect(isAllowedAccount("sub-three", env)).toBe(false);
  });

  it("fails closed when the allowlist is unset or empty", () => {
    expect(isAllowedAccount("sub-one", {})).toBe(false);
    expect(isAllowedAccount("sub-one", { PDF_ALLOWED_GOOGLE_SUBS: "" })).toBe(false);
    expect(isAllowedAccount("sub-one", { PDF_ALLOWED_GOOGLE_SUBS: "  ,  " })).toBe(false);
  });

  it("refuses a missing sub", () => {
    expect(isAllowedAccount(undefined, env)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Google identity acceptance
// ---------------------------------------------------------------------------

describe("acceptGoogleIdentity", () => {
  const env = { PDF_ALLOWED_GOOGLE_SUBS: "sub-one" };

  it("accepts an allowlisted, verified account", () => {
    const session = acceptGoogleIdentity(
      { sub: "sub-one", email: "a@example.com", email_verified: true },
      env,
    );
    expect(session?.sub).toBe("sub-one");
    expect(session?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(session!.exp - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(
      PDF_SESSION_TTL_SECONDS,
    );
  });

  it("refuses an unverified email even when the sub is allowlisted", () => {
    expect(
      acceptGoogleIdentity(
        { sub: "sub-one", email: "a@example.com", email_verified: false },
        env,
      ),
    ).toBeNull();
    expect(
      acceptGoogleIdentity({ sub: "sub-one", email: "a@example.com" }, env),
    ).toBeNull();
  });

  it("refuses any account not on the allowlist", () => {
    expect(
      acceptGoogleIdentity(
        { sub: "somebody-else", email: "b@example.com", email_verified: true },
        env,
      ),
    ).toBeNull();
  });

  it("is unaffected by an email change, because the key is sub", () => {
    const before = acceptGoogleIdentity(
      { sub: "sub-one", email: "old@example.com", email_verified: true },
      env,
    );
    const after = acceptGoogleIdentity(
      { sub: "sub-one", email: "new@example.com", email_verified: true },
      env,
    );
    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    expect(after?.sub).toBe(before?.sub);
  });

  it("does not admit an allowlisted email attached to a different sub", () => {
    expect(
      acceptGoogleIdentity(
        { sub: "attacker-sub", email: "a@example.com", email_verified: true },
        env,
      ),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Gated paths
// ---------------------------------------------------------------------------

describe("isGatedPath", () => {
  it("gates every document, drive and app route", () => {
    for (const p of [
      "/api/pdf-documents",
      "/api/pdf-documents/id/abc",
      "/api/pdf-documents/id/abc/commit",
      "/api/pdf-documents/id/abc/content",
      "/api/pdf-drive/import",
      "/pdf-metadata-viewer",
      "/pdf-metadata-viewer/documents",
    ]) {
      expect(isGatedPath(p), p).toBe(true);
    }
  });

  it("leaves the sign-in handshake open, or nobody could ever sign in", () => {
    for (const p of [
      "/api/pdf-drive/connect",
      "/api/pdf-drive/callback",
      "/pdf-metadata-viewer/sign-in",
    ]) {
      expect(isGatedPath(p), p).toBe(false);
    }
  });

  it("does not gate unrelated hub routes", () => {
    for (const p of ["/", "/admin", "/experiments", "/api/experiments", "/api/pdf"]) {
      expect(isGatedPath(p), p).toBe(false);
    }
  });

  it("is not fooled by a prefix that merely starts the same", () => {
    expect(isGatedPath("/api/pdf-documents-other")).toBe(false);
    expect(isGatedPath("/pdf-metadata-viewer-public")).toBe(false);
  });
});
