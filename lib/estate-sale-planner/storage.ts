/**
 * The session lives in the browser only. Closing the tab loses it, and the
 * UI says so; this is the whole persistence story for v1 (no accounts).
 */
import { SESSION_STORAGE_KEY } from "./config";
import type { Session } from "./session";

export function loadSession(): Session | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null): void {
  try {
    if (!session) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Over quota (item thumbnails on a long walkthrough): keep the decisions,
      // drop the pictures. The in-memory session still shows them this tab.
      const slim = { ...session, items: session.items.map(({ image: _image, ...rest }) => rest) };
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(slim));
    }
  } catch {
    // Private mode or blocked storage: the in-memory session still works.
  }
}
