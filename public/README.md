# `public/` — served from the site root

Anything here is served at `https://labs.beckharrisdesign.com/<path>`.

| File               | URL                    | Notes                                                                                                       |
| ------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| `bhd-wordmark.png` | `/bhd-wordmark.png`    | Beck Harris Design wordmark, 454×54, palette PNG with `tRNS` transparency — sits correctly on light or dark |
| `figma-grabber/`   | `/figma-grabber/`      | Snap-issue grabber page                                                                                     |
| `scripts/`, `lib/` | `/scripts/…`, `/lib/…` | Bookmarklet and capture sources                                                                             |

**On the wordmark:** 454 px wide is a 1× asset. It is sharp up to about
227 px of display width on a retina screen and softens past that, so it
suits a header lockup or an email signature rather than a hero. If it is
ever needed larger, or as a favicon, export an SVG from the source
artwork instead of upscaling this.
