import { describe, it, expect, vi } from "vitest";
import {
  CHUNK,
  connectTransport,
  openRangedSource,
  totalFromContentRange,
  type RangeTransport,
} from "@/app/pdf-metadata-viewer/pdfjs";

const URL_ = "/api/pdf-documents/id/doc-1/content";
const bytes = (n: number, from = 0) => Uint8Array.from({ length: n }, (_, i) => (from + i) % 256);
const reply = (body: Uint8Array, status = 200, headers: Record<string, string> = {}) =>
  new Response(body as unknown as BodyInit, { status, headers });

describe("totalFromContentRange", () => {
  it("reads the total size", () => {
    expect(totalFromContentRange("bytes 0-1048575/9807226")).toBe(9807226);
  });
  it("is null without one", () => {
    expect(totalFromContentRange(null)).toBeNull();
    expect(totalFromContentRange("bytes 0-10/*")).toBeNull();
  });
});

describe("openRangedSource", () => {
  it("asks for the first chunk only, and learns the size from the reply", async () => {
    const fetchImpl = vi.fn(async () =>
      reply(bytes(CHUNK), 206, { "content-range": `bytes 0-${CHUNK - 1}/9807226` }),
    );
    const source = await openRangedSource(URL_, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect((fetchImpl.mock.calls[0] as unknown[])[1]).toMatchObject({ headers: { Range: `bytes=0-${CHUNK - 1}` } });
    expect(source).toMatchObject({ length: 9807226 });
    expect("initial" in source && source.initial.length).toBe(CHUNK);
  });

  it("uses the whole file when the server ignores the range", async () => {
    const fetchImpl = vi.fn(async () => reply(bytes(500)));
    const source = await openRangedSource(URL_, fetchImpl as unknown as typeof fetch);
    expect("data" in source && source.data.length).toBe(500);
  });

  it("fetches the whole file when a partial reply gives no total", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(reply(bytes(CHUNK), 206))
      .mockResolvedValueOnce(reply(bytes(CHUNK + 500)));
    const source = await openRangedSource(URL_, fetchImpl as unknown as typeof fetch);
    expect("data" in source && source.data.length).toBe(CHUNK + 500);
    expect((fetchImpl.mock.calls[1] as unknown[])[1]).not.toHaveProperty("headers");
  });

  it("uses the first chunk as the file when it's all there is", async () => {
    const fetchImpl = vi.fn(async () => reply(bytes(300), 206, { "content-range": "bytes 0-299/300" }));
    const source = await openRangedSource(URL_, fetchImpl as unknown as typeof fetch);
    expect("data" in source && source.data.length).toBe(300);
  });

  it("fetches a later range, trying twice before giving up", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(reply(bytes(CHUNK), 206, { "content-range": `bytes 0-${CHUNK - 1}/5000000` }))
      .mockRejectedValueOnce(new Error("dropped"))
      .mockResolvedValueOnce(reply(bytes(10, 7), 206, { "content-range": "bytes 4000000-4000009/5000000" }));
    const source = await openRangedSource(URL_, fetchImpl as unknown as typeof fetch);
    if (!("fetchRange" in source)) throw new Error("expected a ranged source");
    const chunk = await source.fetchRange(4000000, 4000010);
    expect(chunk).toEqual(bytes(10, 7));
    expect((fetchImpl.mock.calls[2] as unknown[])[1]).toMatchObject({ headers: { Range: "bytes=4000000-4000009" } });
  });

  it("refuses a failed first request", async () => {
    const fetchImpl = vi.fn(async () => reply(bytes(0), 410));
    await expect(openRangedSource(URL_, fetchImpl as unknown as typeof fetch)).rejects.toThrow("410");
  });
});

describe("connectTransport", () => {
  it("answers each pdf.js request with the fetched bytes", async () => {
    const onDataRange = vi.fn();
    const transport: RangeTransport = { requestDataRange: () => {}, onDataRange };
    connectTransport(transport, async (begin, end) => bytes(end - begin, begin));
    transport.requestDataRange(100, 110);
    await vi.waitFor(() => expect(onDataRange).toHaveBeenCalledWith(100, bytes(10, 100)));
  });
});
