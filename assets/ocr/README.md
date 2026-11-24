# English language data for tesseract

`eng.traineddata.gz`, read by `lib/pdf-ocr.ts` to read scanned pages on the hub's
own server (openspec/changes/pdf-metadata-viewer-cloud, design.md D15).

- **Source:** `https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz`
- **What it is:** tesseract's `tessdata_best` English model, integer version, for the LSTM engine only
- **SHA-256:** `45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91`
- **License:** Apache-2.0 (tesseract-ocr)

Kept here rather than fetched, so reading a page never depends on another site.
