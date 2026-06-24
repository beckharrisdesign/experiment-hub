// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";

// Capture the onAuthStateChange callback so tests can drive auth events
// without touching real Supabase or waiting for I/O.
const authMocks = vi.hoisted(() => {
  type AuthCallback = (event: string, session: unknown) => void;
  let _cb: AuthCallback | null = null;
  const unsubscribe = vi.fn();

  return {
    onAuthStateChange: vi.fn((cb: AuthCallback) => {
      _cb = cb;
      return { data: { subscription: { unsubscribe } } };
    }),
    signOut: vi.fn(async () => {}),
    fire: (event: string, session: unknown) => _cb?.(event, session),
    unsubscribe,
    reset() {
      _cb = null;
      vi.clearAllMocks();
    },
  };
});

vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: authMocks.onAuthStateChange,
      signOut: authMocks.signOut,
    },
  },
}));

vi.mock("./analytics", () => ({
  setAnalyticsUser: vi.fn(),
}));

import { AuthProvider, useAuth } from "./auth-context";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AuthProvider, null, children);
}

beforeEach(() => {
  authMocks.reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AuthProvider bootstrap", () => {
  it("starts with loading=true before INITIAL_SESSION fires", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    // onAuthStateChange registered but no event fired yet
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it("clears loading and sets user after INITIAL_SESSION with a session", async () => {
    const fakeUser = { id: "user-1", email: "test@example.com" };
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      authMocks.fire("INITIAL_SESSION", { user: fakeUser });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toEqual(fakeUser);
  });

  it("clears loading with null user after INITIAL_SESSION with no session", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      authMocks.fire("INITIAL_SESSION", null);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("unsubscribes from onAuthStateChange on unmount", () => {
    const { unmount } = renderHook(() => useAuth(), { wrapper });
    unmount();
    expect(authMocks.unsubscribe).toHaveBeenCalledOnce();
  });
});

describe("AuthProvider SIGNED_OUT", () => {
  it("clears user when SIGNED_OUT event fires", async () => {
    const fakeUser = { id: "user-1", email: "test@example.com" };
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      authMocks.fire("INITIAL_SESSION", { user: fakeUser });
    });
    expect(result.current.user).toEqual(fakeUser);

    await act(async () => {
      authMocks.fire("SIGNED_OUT", null);
    });
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });
});

describe("signOut", () => {
  it("clears user immediately before Supabase responds", async () => {
    // Make signOut hang so we can observe intermediate state
    let resolveSignOut!: () => void;
    authMocks.signOut.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSignOut = resolve;
      }),
    );

    const fakeUser = { id: "user-1", email: "test@example.com" };
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      authMocks.fire("INITIAL_SESSION", { user: fakeUser });
    });
    expect(result.current.user).toEqual(fakeUser);

    // Start sign-out but don't await it — user should clear synchronously
    act(() => {
      result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();

    // Let Supabase finish
    await act(async () => {
      resolveSignOut();
    });
  });

  it("calls supabase.auth.signOut()", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      authMocks.fire("INITIAL_SESSION", null);
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(authMocks.signOut).toHaveBeenCalledOnce();
  });
});

describe("useAuth outside provider", () => {
  it("throws when called outside AuthProvider", () => {
    // Suppress the expected React error boundary output
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useAuth())).toThrow(
      /useAuth must be used within an AuthProvider/,
    );
  });
});
