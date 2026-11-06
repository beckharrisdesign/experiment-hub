import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useNowUntil } from "@/app/estate-sale-planner/useNowUntil";

const START = new Date("2026-11-06T16:00:00Z").getTime();
const iso = (ms: number) => new Date(START + ms).toISOString();

describe("useNowUntil", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });
  afterEach(() => vi.useRealTimers());

  it("moves on when the limit expires, so a screen left open re-enables its button", () => {
    const { result } = renderHook(() => useNowUntil(iso(60_000)));
    expect(result.current).toBe(START);
    act(() => void vi.advanceTimersByTime(59_000));
    expect(result.current).toBe(START);
    act(() => void vi.advanceTimersByTime(1_000));
    expect(result.current).toBeGreaterThanOrEqual(START + 60_000);
  });

  it("catches up when the moment has already passed, or the limit changes", () => {
    const { result, rerender } = renderHook(({ next }) => useNowUntil(next), { initialProps: { next: null as string | null } });
    vi.setSystemTime(START + 5_000);
    rerender({ next: iso(1_000) });
    act(() => void vi.advanceTimersByTime(0));
    expect(result.current).toBe(START + 5_000);
  });

  it("waits out a limit longer than one timer can hold", () => {
    const FAR = 60 * 24 * 60 * 60 * 1000; // 60 days: past setTimeout's 24.8-day ceiling.
    const { result } = renderHook(() => useNowUntil(iso(FAR)));
    act(() => void vi.advanceTimersByTime(1_000));
    expect(result.current).toBe(START);
    act(() => void vi.advanceTimersByTime(FAR));
    expect(result.current).toBeGreaterThanOrEqual(START + FAR);
  });
});
