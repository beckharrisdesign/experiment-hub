import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/pdf-documents", () => ({
  getPdfAdminClient: vi.fn(),
}));

import {
  GOOGLE_SCOPES,
  buildAuthUrl,
  newOAuthState,
  readIdTokenClaims,
} from "@/lib/pdf-drive";

const CONFIG = {
  PDF_GOOGLE_CLIENT_ID: "test-client.apps.googleusercontent.com",
  // Deliberately not the real "GOCSPX-" prefix: this repo is public, and a
  // string shaped like a Google client secret trips secret scanning and
  // push protection. Nothing here parses the prefix.
  PDF_GOOGLE_CLIENT_SECRET: "not-a-real-client-secret",
  PDF_GOOGLE_REDIRECT_URI: "http://localhost:3000/api/pdf-drive/callback",
};

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const [k, v] of Object.entries(CONFIG)) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
});

afterEach(() => {
  for (const k of Object.keys(CONFIG)) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

// ---------------------------------------------------------------------------
// Scopes — the decision D9 rests on
// ---------------------------------------------------------------------------

describe("GOOGLE_SCOPES", () => {
  it("requests only the four non-sensitive scopes", () => {
    expect([...GOOGLE_SCOPES]).toEqual([
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/drive.file",
    ]);
  });

  it("contains no restricted Drive scope", () => {
    const restricted = [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
    ];
    for (const scope of restricted) {
      expect(GOOGLE_SCOPES as readonly string[]).not.toContain(scope);
    }
  });
});

// ---------------------------------------------------------------------------
// Authorization URL
// ---------------------------------------------------------------------------

describe("buildAuthUrl", () => {
  it("carries the state and the registered redirect", () => {
    const url = new URL(buildAuthUrl("state-123"));
    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("redirect_uri")).toBe(
      CONFIG.PDF_GOOGLE_REDIRECT_URI,
    );
    expect(url.searchParams.get("response_type")).toBe("code");
  });

  it("asks for offline access and forces consent, or no refresh token arrives", () => {
    const url = new URL(buildAuthUrl("s"));
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
  });

  it("never leaks the client secret into the URL", () => {
    expect(buildAuthUrl("s")).not.toContain(CONFIG.PDF_GOOGLE_CLIENT_SECRET);
  });

  it("throws rather than building a half-configured URL", () => {
    delete process.env.PDF_GOOGLE_CLIENT_ID;
    expect(() => buildAuthUrl("s")).toThrow(/must be set/);
  });
});

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

describe("newOAuthState", () => {
  it("is long and does not repeat", () => {
    const a = newOAuthState();
    const b = newOAuthState();
    expect(a).toHaveLength(64);
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// id_token claims
// ---------------------------------------------------------------------------

describe("readIdTokenClaims", () => {
  const b64u = (s: string) =>
    btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  it("reads sub, email and email_verified", () => {
    const payload = b64u(
      JSON.stringify({ sub: "123", email: "a@b.c", email_verified: true }),
    );
    expect(readIdTokenClaims(`header.${payload}.sig`)).toEqual({
      sub: "123",
      email: "a@b.c",
      email_verified: true,
    });
  });

  it("returns null for anything that is not a three-part token", () => {
    for (const bad of ["", "a", "a.b", "a.b.c.d"]) {
      expect(readIdTokenClaims(bad)).toBeNull();
    }
  });

  it("returns null when the payload is not decodable JSON", () => {
    expect(readIdTokenClaims("h.!!!!.s")).toBeNull();
  });
});
