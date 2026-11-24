import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));

import PrefillReview, { keywordReasons } from "@/app/pdf-metadata-viewer/id/[id]/PrefillReview";
import SplitFirst from "@/app/pdf-metadata-viewer/id/[id]/SplitFirst";

const PREFILL = {
  title: "Foodmart receipt",
  keywords: ["receipt", "foodmart", "year-2026", "month-04"],
  why: {
    title: "The vendor’s name and the kind of document",
    receipt: "Reads like a till receipt",
    foodmart: "Its name is in the filename",
    "year-2026": "The date in the filename",
    "month-04": "The date in the filename",
  },
};
const API = "/api/pdf-documents/id/doc-1";

function respond(replies: Record<string, { status: number; body: unknown }>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const r = replies[`${init?.method ?? "GET"} ${url}`];
    if (!r) throw new Error(`unexpected ${init?.method} ${url}`);
    return new Response(JSON.stringify(r.body), { status: r.status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const sent = (m: ReturnType<typeof respond>, i = 0) => JSON.parse((m.mock.calls[i][1] as RequestInit).body as string);

const review = (o: Partial<React.ComponentProps<typeof PrefillReview>> = {}) =>
  render(
    <PrefillReview
      documentId="doc-1"
      revision="r1"
      values={{ title: null, subject: null, author: null, keywords: [] }}
      prefill={PREFILL}
      nextUrl="/pdf-metadata-viewer/id/doc-2?prefilled=1"
      nextIsDocument
      {...o}
    />,
  );
const press = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

beforeEach(() => {
  refresh.mockClear();
  push.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe("PrefillReview (task 7i)", () => {
  it("shows what is prefilled and why, with subject and author left alone", () => {
    const fetchMock = respond({});
    review();
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("Foodmart receipt");
    expect((screen.getByLabelText("Subject") as HTMLInputElement).value).toBe("");
    expect(screen.getByText("The vendor’s name and the kind of document")).toBeTruthy();
    expect(screen.getByText("4 prefilled")).toBeTruthy();
    expect(screen.getByText(/Nothing is saved until you accept/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("gives each reason once, and only for what is still there", () => {
    expect(keywordReasons(PREFILL, ["receipt", "year-2026", "month-04"])).toBe(
      "Reads like a till receipt. The date in the filename.",
    );
  });

  it("accepts what is shown as one ordinary edit", async () => {
    const fetchMock = respond({ [`PATCH ${API}`]: { status: 200, body: {} } });
    review();
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Weekly shop" } });
    press("Remove keyword receipt");
    fireEvent.change(screen.getByPlaceholderText("Add keyword"), { target: { value: "tax" } });
    press("Accept");
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(sent(fetchMock)).toEqual({
      title: "Weekly shop",
      subject: null,
      author: null,
      keywords: ["foodmart", "year-2026", "month-04", "tax"],
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("goes on to the next one", async () => {
    respond({ [`PATCH ${API}`]: { status: 200, body: {} } });
    review();
    press("Accept and next ›");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/pdf-metadata-viewer/id/doc-2?prefilled=1"));
  });

  it("says so when it is the last", () => {
    respond({});
    review({ nextIsDocument: false });
    expect(screen.getByRole("button", { name: "Accept and finish" })).toBeTruthy();
  });

  it("stays put, with everything still there, when it can't be saved", async () => {
    respond({ [`PATCH ${API}`]: { status: 500, body: { error: "Not saved." } } });
    review();
    press("Accept and next ›");
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Not saved."));
    expect(push).not.toHaveBeenCalled();
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("Foodmart receipt");
  });

  it("won't accept a keyword with a space", () => {
    const fetchMock = respond({});
    review();
    fireEvent.change(screen.getByPlaceholderText("Add keyword"), { target: { value: "car tax" } });
    press("Accept");
    expect(screen.getByRole("alert").textContent).toContain("car-tax");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dismisses for this version of the file", async () => {
    const fetchMock = respond({ [`POST ${API}/prefill/dismiss`]: { status: 200, body: { success: true } } });
    review();
    press("Dismiss");
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(sent(fetchMock)).toEqual({ revision: "r1" });
  });

  it("puts the AI's answer in place of what is prefilled", async () => {
    const fetchMock = respond({
      [`POST ${API}/suggestions`]: {
        status: 200,
        body: { suggestions: { title: "Groceries", subject: "Food", keywords: ["receipt"] } },
      },
      [`PATCH ${API}`]: { status: 200, body: {} },
    });
    review();
    press(/Suggest with AI/);
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(sent(fetchMock, 1)).toEqual({ title: "Groceries", subject: "Food", keywords: ["receipt"] });
  });
});

describe("SplitFirst (task 7i)", () => {
  it("offers Split, or that it's one document", async () => {
    const fetchMock = respond({ [`POST ${API}/split/not-needed`]: { status: 200, body: {} } });
    render(<SplitFirst documentId="doc-1" pageCount={30} splitUrl="/split" />);
    expect(screen.getByText("30 pages. Is this more than one document?")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Split pages" }).getAttribute("href")).toBe("/split");
    press("It's one document");
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
