import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

import { DetailsEditor, type DetailsEditorProps } from "@/app/pdf-metadata-viewer/id/[id]/DetailsEditor";

const PROPS: DetailsEditorProps = {
  documentId: "doc-1",
  values: { title: "HEB Receipt", subject: null, author: null, keywords: ["heb"] },
  inFile: { title: "HEB Receipt", subject: null, author: null, keywords: ["heb"] },
  edited: { fields: [], keywordsAdded: [], keywordsRemoved: [] },
  disabled: false,
  pendingCount: 0,
};

type Reply = { status: number; body: unknown };
function respond(replies: Record<string, Reply>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? "GET"} ${url}`;
    const r = replies[key];
    if (!r) throw new Error(`unexpected ${key}`);
    return new Response(JSON.stringify(r.body), { status: r.status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const SUGGEST = "POST /api/pdf-documents/id/doc-1/suggestions";
const SAVE = "PATCH /api/pdf-documents/id/doc-1";

beforeEach(() => refresh.mockClear());
afterEach(() => vi.unstubAllGlobals());

describe("Suggest metadata", () => {
  // Katy's call (2026-11-23): suggestions fill the fields as pending edits, as
  // frame 34:289 shows; review is the ordinary pending state, Discard undoes it.
  it("fills the fields as one staged edit, adding keywords to the ones already there", async () => {
    const fetchMock = respond({
      [SUGGEST]: {
        status: 200,
        body: { suggestions: { title: "HEB grocery receipt", subject: "Groceries", keywords: ["receipt", "heb"] } },
      },
      [SAVE]: { status: 200, body: {} },
    });
    render(<DetailsEditor {...PROPS} />);
    fireEvent.click(screen.getByRole("button", { name: /Suggest metadata/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      title: "HEB grocery receipt",
      subject: "Groceries",
      keywords: ["heb", "receipt"],
    });
    await waitFor(() => expect(screen.getByText(/Suggestions added/)).toBeTruthy());
    expect(refresh).toHaveBeenCalled();
  });

  it("stages nothing when the suggestions match what's already there", async () => {
    const fetchMock = respond({
      [SUGGEST]: { status: 200, body: { suggestions: { title: "HEB Receipt", subject: "", keywords: ["heb"] } } },
    });
    render(<DetailsEditor {...PROPS} />);
    fireEvent.click(screen.getByRole("button", { name: /Suggest metadata/ }));
    await waitFor(() => expect(screen.getByText(/Nothing to change/)).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("says why when suggestions are switched off", async () => {
    respond({
      [SUGGEST]: {
        status: 503,
        body: { error: "AI suggestions are off: no OpenAI key is configured", unavailable: true },
      },
    });
    render(<DetailsEditor {...PROPS} />);
    fireEvent.click(screen.getByRole("button", { name: /Suggest metadata/ }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("AI suggestions are off: no OpenAI key is configured"),
    );
  });

  it("can't be pressed while the editor is disabled", () => {
    render(<DetailsEditor {...PROPS} disabled />);
    expect((screen.getByRole("button", { name: /Suggest metadata/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
