# Photo banner studio — local prototype

Client-only photo ingest, filter presets, banner overlays, and PNG download.

**Port:** 3009 (see `docs/PROTOTYPE_PORTS.md`)

## Quick start

```bash
npm install
npm run dev
```

(`pnpm install && pnpm dev` also works if you have pnpm installed.)

Open [http://localhost:3009](http://localhost:3009).

## Scripts

| Script       | Description                                 |
| ------------ | ------------------------------------------- |
| `pnpm dev`   | Next.js dev server on port 3009             |
| `pnpm build` | Production build                            |
| `pnpm test`  | Vitest unit tests (filters, ingest helpers) |

## From repo root

```bash
npm run dev:photo-filters-banner
```

## QA checklist (manual)

1. Choose a JPEG/PNG/WebP — preview updates within a few seconds.
2. Switch filter presets — visible tonal change.
3. Toggle header band / footer ribbon — overlays appear on canvas.
4. Download PNG — file `photo-studio-export.png` saves; repeat download works.
5. Tab through controls — focus ring visible on each control.
