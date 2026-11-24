// @vitest-environment node
import { describe, it, expect } from "vitest";
import path from "node:path";
import {
  defaultAuthPath,
  isGitIgnored,
  looksSignedOut,
} from "../../../scripts/task-effort-audit/lib/auth-capture.mjs";

/**
 * The capture command saves a live session cookie, so where it writes is a
 * safety rule: only somewhere git ignores. Signing in itself is the person's
 * job and isn't automated or tested here.
 */

const ROOT = path.resolve(__dirname, "../../..");

describe("auth capture", () => {
  it("saves under the data dir's auth folder by default", () => {
    expect(
      defaultAuthPath(
        "artifacts/task-effort-audit",
        "pdf-organizer",
        "katy-google",
      ),
    ).toBe(
      path.join(
        "artifacts/task-effort-audit",
        "auth",
        "pdf-organizer--katy-google.json",
      ),
    );
  });

  it("treats the default auth folder as gitignored and a source folder as not", () => {
    expect(
      isGitIgnored(path.join(ROOT, "artifacts/task-effort-audit/auth/x.json")),
    ).toBe(true);
    expect(
      isGitIgnored(path.join(ROOT, "scripts/task-effort-audit/session.json")),
    ).toBe(false);
  });

  it("recognizes the login page from the profile's pattern", () => {
    const profile = { loginUrlPattern: "/pdf-metadata-viewer/sign-in" };
    expect(
      looksSignedOut(
        "https://labs.example.com/pdf-metadata-viewer/sign-in",
        profile,
      ),
    ).toBe(true);
    expect(
      looksSignedOut("https://labs.example.com/pdf-metadata-viewer", profile),
    ).toBe(false);
    expect(looksSignedOut("https://labs.example.com/anything", {})).toBe(false);
  });
});
