/**
 * Tests for the etsy-listing-kit.vercel.app vanity host:
 *   middleware.ts — rewrites unprefixed paths on the ELK host to
 *   /etsy-listing-kit/*, leaves labs.* hosts and prefixed paths alone.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

const ELK_HOST = "etsy-listing-kit.vercel.app";

describe("middleware ELK vanity host rewrite", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function rewriteTarget(res: Response) {
    return res.headers.get("x-middleware-rewrite");
  }

  it("rewrites the root of the vanity host to the funnel page", async () => {
    const { middleware } = await import("@/middleware");
    const res = await middleware(new NextRequest(`https://${ELK_HOST}/`));

    expect(rewriteTarget(res)).toContain("/etsy-listing-kit");
  });

  it("prefixes unprefixed subpaths (API routes keep working)", async () => {
    const { middleware } = await import("@/middleware");
    const res = await middleware(
      new NextRequest(`https://${ELK_HOST}/api/checkout`),
    );

    expect(rewriteTarget(res)).toContain("/etsy-listing-kit/api/checkout");
  });

  it("preserves query strings through the rewrite", async () => {
    const { middleware } = await import("@/middleware");
    const res = await middleware(
      new NextRequest(`https://${ELK_HOST}/?utm_source=google`),
    );

    expect(rewriteTarget(res)).toContain("utm_source=google");
  });

  it("does not double-prefix already-prefixed paths", async () => {
    const { middleware } = await import("@/middleware");
    const res = await middleware(
      new NextRequest(`https://${ELK_HOST}/etsy-listing-kit/result?order=abc`),
    );

    expect(rewriteTarget(res)).toBeNull();
    expect(res.headers.get("location")).toBeNull();
  });

  it("leaves other hosts untouched", async () => {
    const { middleware } = await import("@/middleware");
    const res = await middleware(
      new NextRequest("https://labs.beckharrisdesign.com/"),
    );

    expect(rewriteTarget(res)).toBeNull();
    expect(res.headers.get("location")).toBeNull();
  });

  it("hides the hub admin behind the funnel prefix on the vanity host", async () => {
    vi.stubEnv("ADMIN_SECRET", "secret-xyz");
    const { middleware } = await import("@/middleware");
    const res = await middleware(new NextRequest(`https://${ELK_HOST}/admin`));

    // Rewritten into the funnel namespace (a 404), not the admin login redirect.
    expect(rewriteTarget(res)).toContain("/etsy-listing-kit/admin");
    expect(res.headers.get("location")).toBeNull();
  });
});
