import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import nextConfig from "../../next.config";

/**
 * pdf.js reads its fonts and scan decoders from disk by paths built at runtime,
 * so tracing can't find them and each route that draws pages has to be given
 * them. A route without them doesn't fail: it draws the page without its scan.
 */
const includes = (nextConfig as { outputFileTracingIncludes: Record<string, string[]> })
  .outputFileTracingIncludes;
const FOLDERS = ["standard_fonts", "wasm", "iccs"];

function covering(route: string): string[] {
  return Object.entries(includes)
    .filter(([key]) => route.startsWith(key.replace(/\*\*$/, "")))
    .flatMap(([, globs]) => globs);
}

describe("what's packaged for drawing pages", () => {
  it.each(["/api/pdf-documents/id/[id]/pages/[page]", "/api/pdf-drive/sync"])(
    "%s has pdf.js's fonts, decoders and colour profiles",
    (route) => {
      for (const folder of FOLDERS) {
        expect(covering(route).some((g) => g.includes(`pdfjs-dist/${folder}/`))).toBe(true);
      }
    },
  );

  it("covers every route whose code draws pages", () => {
    const root = path.join(process.cwd(), "app/api");
    const routes: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const at = path.join(dir, e.name);
        if (e.isDirectory()) walk(at);
        else if (e.name === "route.ts") {
          // Directly, or through the sync or the page store.
          if (/@\/lib\/(pdf-render|pdf-page-store|pdf-sync)"/.test(readFileSync(at, "utf8"))) {
            routes.push(`/api${path.dirname(at).slice(root.length)}`);
          }
        }
      }
    };
    walk(root);
    expect(routes.length).toBeGreaterThanOrEqual(2);
    for (const route of routes) {
      for (const folder of FOLDERS) {
        expect([route, covering(route).some((g) => g.includes(`pdfjs-dist/${folder}/`))]).toEqual([route, true]);
      }
    }
  });

  it("gives the sync the language tesseract reads", () => {
    expect(covering("/api/pdf-drive/sync")).toContain("assets/ocr/**");
    expect(existsSync(path.join(process.cwd(), "assets/ocr/eng.traineddata.gz"))).toBe(true);
  });

  it("names folders that exist", () => {
    for (const folder of FOLDERS) {
      expect(existsSync(path.join(process.cwd(), "node_modules/pdfjs-dist", folder))).toBe(true);
    }
  });
});
