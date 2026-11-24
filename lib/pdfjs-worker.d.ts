// pdf.js ships its worker without type declarations; lib/pdf-render.ts only
// hands the module to pdf.js (globalThis.pdfjsWorker), so its shape is opaque.
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs";
