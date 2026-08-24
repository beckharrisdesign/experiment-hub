"use client";

/**
 * Browser-side access to the session log.
 *
 * Two-tier on purpose. The server log is the record of truth, because the daily
 * link gets opened on whichever device is to hand and a per-device store would
 * split one history into several. But the tool has to stay usable with no
 * infrastructure — running it locally, or before the Supabase table exists —
 * so every operation falls back to localStorage and says which tier it used.
 *
 * The fallback is never silent: the UI shows which store answered, so a session
 * that only made it to one laptop is visible as such rather than looking like
 * it is safely in the history.
 */

import { ACCESS_HEADER } from "./access";
import type { StoredSession } from "./sessions";

const LOCAL_SESSIONS_KEY = "efa:v1:sessions";
const LOCAL_ACCESS_KEY = "efa:v1:key";

export type StoreTier = "server" | "local";

export interface LoadResult {
  sessions: StoredSession[];
  tier: StoreTier;
  /** Why the server tier was not used, when it was not. */
  reason?: string;
}

export interface SaveResult {
  session: StoredSession;
  tier: StoreTier;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Access key
// ---------------------------------------------------------------------------

/**
 * Capture the key from the daily link and keep it, so the link only has to
 * carry it once. Strips it from the address bar afterwards — a key sitting in
 * a URL ends up in screenshots and browser history.
 */
export function captureAccessKey(): string | null {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const fromLink = url.searchParams.get("k");

  if (fromLink) {
    window.localStorage.setItem(LOCAL_ACCESS_KEY, fromLink);
    url.searchParams.delete("k");
    window.history.replaceState({}, "", url.toString());
    return fromLink;
  }

  return window.localStorage.getItem(LOCAL_ACCESS_KEY);
}

export function getAccessKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LOCAL_ACCESS_KEY);
}

// ---------------------------------------------------------------------------
// Local tier
// ---------------------------------------------------------------------------

function readLocal(): StoredSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredSession[]) : [];
  } catch {
    // A corrupt blob should not take the whole page down; an empty history is
    // wrong but recoverable, and the export button still holds the raw string.
    return [];
  }
}

function writeLocal(sessions: StoredSession[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions));
}

function localId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Combined
// ---------------------------------------------------------------------------

/**
 * Headers for a server call. The bearer key is optional: the hub's admin cookie
 * is sent automatically and authorizes on its own, so a browser signed in at
 * /admin/login needs no key at all. Only the email link and a fresh device rely
 * on the key.
 */
function authHeaders(): HeadersInit {
  const key = getAccessKey();
  return key ? { [ACCESS_HEADER]: key } : {};
}

export async function loadSessions(): Promise<LoadResult> {
  try {
    // Always try the server, key or not — the admin cookie may authorize it.
    const res = await fetch("/api/exec-function/sessions", {
      headers: authHeaders(),
      credentials: "same-origin",
      cache: "no-store",
    });

    if (res.ok) {
      const body = await res.json();
      // Merge in anything that only ever made it to this device, so a local
      // fallback session is not invisible once the server comes back.
      const local = readLocal().filter((s) => s.id.startsWith("local-"));
      const sessions = [...(body.sessions as StoredSession[]), ...local].sort((a, b) =>
        a.timestamp.localeCompare(b.timestamp),
      );
      return { sessions, tier: "server" };
    }

    return { sessions: readLocal(), tier: "local", reason: unauthorizedReason(res.status) };
  } catch {
    return { sessions: readLocal(), tier: "local", reason: "Could not reach the session log" };
  }
}

/** Plain-language reason, so the banner says something actionable. */
function unauthorizedReason(status: number): string {
  if (status === 401) return "Sign in at /admin/login, or open today's link from your email";
  if (status === 503) return "The shared history is not configured yet";
  return "The shared history is unavailable";
}

export async function saveSession(session: Omit<StoredSession, "id">): Promise<SaveResult> {
  let reason = "The shared history is unavailable";

  try {
    const res = await fetch("/api/exec-function/sessions", {
      method: "POST",
      headers: { ...authHeaders(), "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(session),
    });
    if (res.ok) {
      const body = await res.json();
      return { session: body.session as StoredSession, tier: "server" };
    }
    reason = unauthorizedReason(res.status);
  } catch {
    reason = "Could not reach the session log";
  }

  // Always land the result somewhere. A finished 8-minute block that vanishes
  // because the network blinked is the worst possible failure for this tool.
  const stored: StoredSession = { ...session, id: localId() };
  writeLocal([...readLocal(), stored]);
  return { session: stored, tier: "local", reason };
}

/** Everything this device holds, as a JSON string, for manual export. */
export function exportLocal(): string {
  return JSON.stringify(readLocal(), null, 2);
}
