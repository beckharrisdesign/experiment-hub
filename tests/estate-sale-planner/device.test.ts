import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { DEVICE_COOKIE, deviceHashOf, hashDevice } from "@/lib/estate-sale-planner/device";

const ESP = "https://labs.beckharrisdesign.com/estate-sale-planner";

describe("the esp-device cookie (esp-server-sales D1)", () => {
  it("a first visit gets a private id: random, HttpOnly, Secure, 400 days, scoped to the app", async () => {
    const { middleware } = await import("@/middleware");
    const res = await middleware(new NextRequest(`${ESP}/sales`));
    const set = res.headers.get("set-cookie") ?? "";
    expect(set).toMatch(new RegExp(`${DEVICE_COOKIE}=[A-Za-z0-9_-]{43}`));
    expect(set).toMatch(/HttpOnly/i);
    expect(set).toMatch(/Secure/i);
    expect(set).toMatch(/SameSite=lax/i);
    expect(set).toMatch(/Path=\/estate-sale-planner/i);
    expect(set).toMatch(/Max-Age=34560000/);
  });

  it("two first visits get different ids", async () => {
    const { middleware } = await import("@/middleware");
    const a = (await middleware(new NextRequest(`${ESP}`))).headers.get("set-cookie");
    const b = (await middleware(new NextRequest(`${ESP}`))).headers.get("set-cookie");
    expect(a).not.toEqual(b);
  });

  it("a returning phone keeps its id, and the 400 days roll from this visit", async () => {
    const { middleware } = await import("@/middleware");
    const id = "a".repeat(43);
    const res = await middleware(new NextRequest(`${ESP}/sales`, { headers: { cookie: `${DEVICE_COOKIE}=${id}` } }));
    expect(res.headers.get("set-cookie")).toContain(`${DEVICE_COOKIE}=${id}`);
  });

  it("the very first request, even an API call, already carries the new id to the route", async () => {
    const { middleware } = await import("@/middleware");
    const res = await middleware(new NextRequest(`${ESP}/api/sales`));
    // NextResponse.next({ request }) forwards overridden request headers under this prefix.
    expect(res.headers.get("x-middleware-request-cookie") ?? "").toContain(`${DEVICE_COOKIE}=`);
  });

  it("other parts of the hub never get the cookie", async () => {
    const { middleware } = await import("@/middleware");
    const res = await middleware(new NextRequest("https://labs.beckharrisdesign.com/experiments"));
    expect(res.headers.get("set-cookie") ?? "").not.toContain(DEVICE_COOKIE);
  });
});

describe("deviceHashOf", () => {
  it("is the sha256 of the cookie, hex, never the cookie itself", async () => {
    const id = "b".repeat(43);
    const hash = await deviceHashOf(new NextRequest(`${ESP}/api/sales`, { headers: { cookie: `${DEVICE_COOKIE}=${id}` } }));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(await hashDevice(id));
    expect(hash).not.toContain(id);
  });

  it("is null with no cookie or a malformed one", async () => {
    expect(await deviceHashOf(new NextRequest(`${ESP}/api/sales`))).toBeNull();
    expect(await deviceHashOf(new NextRequest(`${ESP}/api/sales`, { headers: { cookie: `${DEVICE_COOKIE}=short` } }))).toBeNull();
  });
});
