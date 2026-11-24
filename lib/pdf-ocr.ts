/**
 * Read a scanned page's words on the hub's own server (task 7h).
 * openspec/changes/pdf-metadata-viewer-cloud — design.md D15.
 *
 * Tesseract's engine, driven in this process rather than through tesseract.js's
 * worker threads: the engine is one module imported by name, which deployment
 * tracing can follow, where a worker started by a path built at runtime is what
 * broke pdf.js once already (#636). It is synchronous while it reads, about a
 * second a page, so it belongs in the sync and not in front of anyone.
 */
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";

interface TessApi {
  Init(dataPath: string | null, language: string, engine: number): number;
  SetImageFile(exifOrientation: number, angle: number): number;
  Recognize(monitor: null): number;
  GetUTF8Text(): string;
  MeanTextConf(): number;
  Clear(): void;
  End(): void;
}

interface TessModule {
  FS: { writeFile(name: string, data: Uint8Array): void };
  TessBaseAPI: new () => TessApi;
}

/** Tesseract's own number for its LSTM engine, the only one in this build. */
const LSTM_ONLY = 1;

const LANGUAGE = path.join("assets", "ocr", "eng.traineddata.gz");

export interface PageReader {
  /** The words on a page, and how sure of them tesseract is, 0–100. */
  read(jpeg: Uint8Array): { text: string; confidence: number };
  close(): void;
}

/** A reader to use for as many pages as needed, then close. */
export async function openReader(): Promise<PageReader> {
  const [{ default: load }, language] = await Promise.all([
    import("tesseract.js-core/tesseract-core-simd-lstm.wasm.js"),
    readFile(path.join(process.cwd(), LANGUAGE)),
  ]);
  const tess = (await load({ print: () => {}, printErr: () => {} })) as TessModule;
  tess.FS.writeFile("./eng.traineddata", new Uint8Array(gunzipSync(language)));
  const api = new tess.TessBaseAPI();
  if (api.Init(null, "eng", LSTM_ONLY) === -1) throw new Error("tesseract couldn't start");
  return {
    read(jpeg) {
      tess.FS.writeFile("/input", jpeg);
      // Pages are drawn upright, so there is no rotation to undo.
      if (api.SetImageFile(1, 0) === 1) throw new Error("tesseract couldn't open the image");
      try {
        api.Recognize(null);
        return { text: api.GetUTF8Text(), confidence: api.MeanTextConf() };
      } finally {
        api.Clear();
      }
    },
    close() {
      api.End();
    },
  };
}
