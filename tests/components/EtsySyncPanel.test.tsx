/**
 * Tests for the etsy-notion-sync hub panel (openspec/changes/etsy-notion-sync-build 3.5):
 * run history rendering, Sync now dispatch with optimistic queued row, and the
 * unauthorized path.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EtsySyncPanel from "@/components/EtsySyncPanel";

const RUNS = [
  {
    id: 2,
    started_at: new Date(Date.now() - 60_000).toISOString(),
    finished_at: null,
    status: "ok",
    trigger_source: "manual",
    summary: {
      listings_captured: 12,
      new_fields: [{ key: "buyer_price" }],
      quota: { remaining_today: 9000, limit_per_day: 10000 },
      notion: { updates: 3, dry_run: false },
    },
  },
  {
    id: 1,
    started_at: new Date(Date.now() - 86_400_000).toISOString(),
    finished_at: null,
    status: "paused_quota",
    trigger_source: "scheduled",
    summary: { listings_captured: 4, new_fields: [] },
  },
];

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("EtsySyncPanel", () => {
  it("renders run history newest-first with capture and Notion stats", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, runs: RUNS }));

    render(<EtsySyncPanel />);

    const rows = await screen.findAllByTestId("run-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("12 listings");
    expect(rows[0]).toHaveTextContent("3 Notion updates");
    expect(rows[0]).toHaveTextContent("1 new field");
    expect(rows[0]).toHaveTextContent("90% quota left");
    expect(rows[1]).toHaveTextContent("paused_quota");
    expect(rows[1]).toHaveTextContent("scheduled");
  });

  it("shows the quota callout when the last run paused early", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        success: true,
        runs: [{ ...RUNS[0], summary: { ...RUNS[0].summary, quota_low: true } }],
      }),
    );

    render(<EtsySyncPanel />);
    expect(
      await screen.findByText(/paused early: Etsy daily quota/),
    ).toBeInTheDocument();
  });

  it("dispatches Sync now and shows an optimistic queued row", async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/etsy-sync/dispatch" && init?.method === "POST") {
        return jsonResponse(202, { success: true, dispatched: true });
      }
      return jsonResponse(200, { success: true, runs: RUNS });
    });

    render(<EtsySyncPanel />);
    await screen.findAllByTestId("run-row");

    fireEvent.click(screen.getByRole("button", { name: "Sync now" }));

    expect(await screen.findByTestId("queued-row")).toHaveTextContent("queued");
    expect(screen.getByRole("button", { name: /Sync in progress/ })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/etsy-sync/dispatch",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("explains the unauthorized path instead of queuing", async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") return jsonResponse(401, { error: "Unauthorized" });
      return jsonResponse(200, { success: true, runs: RUNS });
    });

    render(<EtsySyncPanel />);
    await screen.findAllByTestId("run-row");

    fireEvent.click(screen.getByRole("button", { name: "Sync now" }));

    expect(
      await screen.findByText(/Unauthorized — unlock edit mode/),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("queued-row")).not.toBeInTheDocument();
  });

  it("shows 0% quota left when the daily quota is exhausted", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        success: true,
        runs: [
          {
            ...RUNS[0],
            summary: {
              ...RUNS[0].summary,
              quota: { remaining_today: 0, limit_per_day: 10000 },
            },
          },
        ],
      }),
    );

    render(<EtsySyncPanel />);
    expect(await screen.findByText("0% quota left")).toBeInTheDocument();
  });

  it("renders the empty state before any runs exist", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, runs: [] }));

    render(<EtsySyncPanel />);
    expect(await screen.findByText(/No runs yet/)).toBeInTheDocument();
  });
});
