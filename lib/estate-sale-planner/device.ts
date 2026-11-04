/**
 * The phone's private id (esp-server-sales design D1) — a STOPGAP until sign-in (#50).
 *
 * Safari's 7-day cap deletes everything a page writes (localStorage, IndexedDB, cookies set
 * from script). A cookie the server sets is the one thing it doesn't cap, so the id lives
 * there: HttpOnly, so no page script can read or copy it. The database only ever sees its
 * sha256, so a leaked table can't be turned back into working cookies.
 *
 * Edge-safe (middleware runs it): Web Crypto only, no Node imports.
 */
import type { NextRequest, NextResponse } from "next/server";

export const DEVICE_COOKIE = "esp-device";
export const DEVICE_PATH = "/estate-sale-planner";
/** 400 days: the longest Chrome allows. Re-set on every visit, so it rolls. */
export const DEVICE_MAX_AGE = 400 * 24 * 60 * 60;
/** 32 random bytes, base64url: 43 characters. */
const VALID = /^[A-Za-z0-9_-]{43}$/;

export function newDeviceId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function validDeviceId(value: string | undefined): value is string {
  return !!value && VALID.test(value);
}

export async function hashDevice(id: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(id));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The device hash a route scopes every read and write to, or null when the phone has no id. */
export async function deviceHashOf(request: NextRequest): Promise<string | null> {
  const id = request.cookies.get(DEVICE_COOKIE)?.value;
  return validDeviceId(id) ? hashDevice(id) : null;
}

export function setDeviceCookie(response: NextResponse, id: string): void {
  response.cookies.set(DEVICE_COOKIE, id, {
    httpOnly: true,
    // Secure even locally: browsers treat http://localhost as a secure context.
    secure: true,
    sameSite: "lax",
    path: DEVICE_PATH,
    maxAge: DEVICE_MAX_AGE,
  });
}
