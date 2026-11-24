/** tesseract.js-core ships no types; lib/pdf-ocr.ts says what it uses of it. */
declare module "tesseract.js-core/tesseract-core-simd-lstm.wasm.js" {
  const load: (options?: Record<string, unknown>) => Promise<unknown>;
  export default load;
}
