# `public/` — what the web root serves

Everything in `public/` is served at the site root by Next: `/<path>` on
local dev, on preview deployments, and in production
(`https://labs.beckharrisdesign.com/<path>`).

**This file lives in `docs/`, not `public/`, on purpose** — a file placed in
`public/` to explain `public/` becomes a public endpoint itself.

| Entry              | URL                    | What it is                                                                                                  |
| ------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| `bhd-wordmark.png` | `/bhd-wordmark.png`    | Beck Harris Design wordmark, 454×54, palette PNG with `tRNS` transparency — sits correctly on light or dark |
| `figma-grabber/`   | `/figma-grabber/`      | Snap-issue grabber page                                                                                     |
| `landing/`         | `/landing/…`           | Static landing pages (`best-day-ever`, `simple-seed-organizer`)                                             |
| `lib/`, `scripts/` | `/lib/…`, `/scripts/…` | Capture library and bookmarklet sources for the grabber                                                     |

## On the wordmark

454 px wide is a 1× asset. It is sharp to about 227 px of display width on
a retina screen and softens past that, so it suits a header lockup or an
email signature rather than a hero. If it is ever needed larger, or as a
favicon, export from the source artwork instead of upscaling this.

The repo has **no favicon** — no `app/icon.*`, no `favicon.ico`, nothing in
`public/` — so every page serves the browser's default. An SVG of the
circular mark exists outside the repo and would fix it; that is separate
work.
