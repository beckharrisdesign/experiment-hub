import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  buildManifest,
  resolveFamily,
  woff2UrlForSubset,
} from "../../scripts/fonts/vendor.mjs";

/**
 * The refresh path talks to Google, so `fetch` is injected. The offline
 * checksum check only validates an existing manifest; these cover the parser
 * and failure handling that run before vendored fonts are replaced.
 */
const CSS = `/* cyrillic */
@font-face { font-family: 'Inter'; src: url(https://fonts.gstatic.com/cyrillic.woff2) format('woff2'); }
/* latin-ext */
@font-face { font-family: 'Inter'; src: url(https://fonts.gstatic.com/latin-ext.woff2) format('woff2'); }
/* latin */
@font-face { font-family: 'Inter'; src: url(https://fonts.gstatic.com/latin.woff2) format('woff2'); }
`;

const FONT = Buffer.from("fake-woff2-bytes");
const FAMILY = {
  file: "inter-latin-variable.woff2",
  query: "Inter:wght@100..900",
};

type Reply = { ok: boolean; status?: number; text?: string; bytes?: Buffer };

/** Answers the css request first, then the font request. */
function fakeFetch(css: Reply, font: Reply) {
  const calls: string[] = [];
  const impl = async (url: string) => {
    calls.push(url);
    const reply = url.includes("googleapis") ? css : font;
    return {
      ok: reply.ok,
      status: reply.status ?? (reply.ok ? 200 : 500),
      text: async () => reply.text ?? "",
      arrayBuffer: async () => {
        const b = reply.bytes ?? Buffer.alloc(0);
        return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
      },
    };
  };
  // Only the parts of Response the script reads are faked.
  return { impl: impl as unknown as typeof fetch, calls };
}

describe("woff2UrlForSubset", () => {
  it("picks the exact subset, not one whose name contains it", () => {
    expect(woff2UrlForSubset(CSS, "latin")).toBe(
      "https://fonts.gstatic.com/latin.woff2",
    );
    expect(woff2UrlForSubset(CSS, "latin-ext")).toBe(
      "https://fonts.gstatic.com/latin-ext.woff2",
    );
  });

  it("returns null when the subset is missing", () => {
    expect(woff2UrlForSubset(CSS, "greek")).toBeNull();
  });
});

describe("resolveFamily", () => {
  it("downloads the latin woff2 and checksums it", async () => {
    const { impl, calls } = fakeFetch(
      { ok: true, text: CSS },
      { ok: true, bytes: FONT },
    );
    const entry = await resolveFamily(FAMILY, impl);
    expect(calls[1]).toBe("https://fonts.gstatic.com/latin.woff2");
    expect(entry.url).toBe("https://fonts.gstatic.com/latin.woff2");
    expect(Buffer.compare(entry.bytes, FONT)).toBe(0);
    expect(entry.sha256).toBe(createHash("sha256").update(FONT).digest("hex"));
  });

  it("fails loudly when the css request fails", async () => {
    const { impl } = fakeFetch(
      { ok: false, status: 503 },
      { ok: true, bytes: FONT },
    );
    await expect(resolveFamily(FAMILY, impl)).rejects.toThrow(/503/);
  });

  it("fails loudly when the css has no latin woff2", async () => {
    const { impl } = fakeFetch(
      { ok: true, text: "/* greek */ @font-face {}" },
      { ok: true },
    );
    await expect(resolveFamily(FAMILY, impl)).rejects.toThrow(/No latin woff2/);
  });

  it("fails loudly when the font download fails", async () => {
    const { impl } = fakeFetch(
      { ok: true, text: CSS },
      { ok: false, status: 404 },
    );
    await expect(resolveFamily(FAMILY, impl)).rejects.toThrow(/404/);
  });
});

describe("buildManifest", () => {
  it("records provenance, size, and checksum for each font", async () => {
    const { impl } = fakeFetch(
      { ok: true, text: CSS },
      { ok: true, bytes: FONT },
    );
    const entry = await resolveFamily(FAMILY, impl);
    const manifest = buildManifest([entry], "2026-10-16");
    expect(manifest.generated).toBe("2026-10-16");
    expect(manifest.fonts).toEqual([
      {
        file: FAMILY.file,
        query: FAMILY.query,
        subset: "latin",
        url: "https://fonts.gstatic.com/latin.woff2",
        bytes: FONT.length,
        sha256: entry.sha256,
      },
    ]);
  });
});
