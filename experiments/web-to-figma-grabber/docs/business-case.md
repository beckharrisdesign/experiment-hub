# Web-to-Figma Grabber

## Hypothesis

Design and product people need a dead simple browser-to-Figma handoff. No logins, no node IDs, just copy and paste from your browser to Figma.

---

## Why This Matters to Me

There's so many points of failure in the design workflow right now, from credentials, to parsing, to SSO limitations. Newer tools seem to break, or drift, or run out of tokens constantly. I just want a cut and paste from my browser to Figma that works every time so that I can get on with my task.

---

## Who It's For

Designers and design engineers on production UI; PMs and UXR who need review snapshots. Not for token-perfect, one-click design-system import in v1.

---

## What It Does

- Element picker in the browser with explicit selection
- Screenshot mode for quick pixel-accurate crops
- Layout mode with bounded JSON (structure, key styles, bounds) for faster rebuild
- Handoff via clipboard or download for import and automation; script-first is a valid default, extension as a path

---

## Existing Options

| Product                     | Price                 | User Base                      | Strength                  | Limitation                                 |
| --------------------------- | --------------------- | ------------------------------ | ------------------------- | ------------------------------------------ |
| Figma (native)              | Free–~$15+/user/mo    | ~13M MAU (Figma, Mar 2025)     | System of record, collab  | No live element-pick → payload loop        |
| html.to.design              | Free + Pro ~$12–18/mo | unknown                        | In-Figma URL/paste import | Plugin-first; not selection-scoped script  |
| HTML to Figma (html2design) | $12/mo or $96/yr      | 2,000+ (vendor); reach unknown | HTML → Figma layers       | HTML flows, not arbitrary DOM element pick |
| Screenshot + manual         | $0                    | universal                      | Pixels in seconds         | No structure; manual Figma rebuild         |

Page-level and pixel paths are default; element scope plus a Figma-friendly envelope is the wedge.
