import { describe, it, expect, vi } from "vitest";
import {
  AHEAD,
  CHUNK,
  MAX_AHEAD_IN_FLIGHT,
  chunkedFetcher,
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
    // The first request is the first chunk; any after it are fetched ahead.
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
    const size = 5 * CHUNK;
    let dropped = false;
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const range = (init?.headers as Record<string, string>).Range;
      const [b, e] = range.replace("bytes=", "").split("-").map(Number);
      if (b === 3 * CHUNK && !dropped) {
        dropped = true;
        throw new Error("dropped");
      }
      return reply(bytes(e - b + 1, b), 206, { "content-range": `bytes ${b}-${e}/${size}` });
    });
    const source = await openRangedSource(URL_, fetchImpl as unknown as typeof fetch);
    if (!("fetchRange" in source)) throw new Error("expected a ranged source");
    const chunk = await source.fetchRange(3 * CHUNK + 5, 3 * CHUNK + 15);
    expect(chunk).toEqual(bytes(10, 3 * CHUNK + 5));
    expect(dropped).toBe(true);
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

describe("chunkedFetcher", () => {
  const LENGTH = 10 * CHUNK + 500;
  const setup = () => {
    const calls: Array<[number, number]> = [];
    const resolvers = new Map<number, () => void>();
    const fetchBytes = vi.fn((begin: number, end: number) => {
      calls.push([begin, end]);
      return new Promise<Uint8Array>((resolve) => resolvers.set(begin, () => resolve(bytes(end - begin, begin))));
    });
    const finish = (chunk: number) => resolvers.get(chunk * CHUNK)?.();
    const fetchRange = chunkedFetcher(LENGTH, bytes(CHUNK), fetchBytes);
    return { calls, finish, fetchRange, fetchBytes };
  };

  it("never has more fetches ahead than the cap", () => {
    const { calls, fetchRange } = setup();
    void fetchRange(5 * CHUNK, 6 * CHUNK);
    // The chunk asked for always starts; prefetches stay within the cap.
    expect(calls.length).toBeLessThanOrEqual(MAX_AHEAD_IN_FLIGHT + 1);
  });

  it("starts the end of the file and the next chunks at once", () => {
    const { calls } = setup();
    expect(calls).toEqual([
      [10 * CHUNK, LENGTH],
      ...Array.from({ length: AHEAD }, (_, k) => [(k + 1) * CHUNK, (k + 2) * CHUNK] as [number, number]),
    ]);
    expect(calls.length).toBeLessThanOrEqual(MAX_AHEAD_IN_FLIGHT);
  });

  it("answers from a chunk already on its way, without asking again", async () => {
    const { calls, finish, fetchRange } = setup();
    const asked = fetchRange(10 * CHUNK, LENGTH);
    finish(10);
    expect(await asked).toEqual(bytes(500, 10 * CHUNK));
    expect(calls.filter(([b]) => b === 10 * CHUNK)).toHaveLength(1);
  });

  it("joins a request that spans chunks, and slices it to the bytes asked for", async () => {
    const { finish, fetchRange } = setup();
    const asked = fetchRange(CHUNK - 10, CHUNK + 10);
    finish(1);
    expect(await asked).toEqual(bytes(20, CHUNK - 10));
  });

  it("starts the chunks after each one asked for, as slots free up", async () => {
    const { calls, finish, fetchRange } = setup();
    const asked = fetchRange(3 * CHUNK, 4 * CHUNK);
    for (const i of [10, 1, 2, 3]) finish(i);
    await asked;
    await vi.waitFor(() => expect(calls.map(([b]) => b / CHUNK)).toEqual(expect.arrayContaining([4, 5, 6])));
  });

  it("fetches a chunk again when its prefetch failed", async () => {
    let failOnce = true;
    const fetchBytes = vi.fn(async (begin: number, end: number) => {
      if (begin === CHUNK && failOnce) {
        failOnce = false;
        throw new Error("dropped");
      }
      return bytes(end - begin, begin);
    });
    const fetchRange = chunkedFetcher(LENGTH, bytes(CHUNK), fetchBytes);
    await vi.waitFor(() => expect(failOnce).toBe(false));
    await new Promise((r) => setTimeout(r, 0));
    expect(await fetchRange(CHUNK, CHUNK + 4)).toEqual(bytes(4, CHUNK));
  });
});
