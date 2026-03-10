# Best Day Ever — Phase 1 Landing Page

Static landing page for validating interest before building the MVP. Copy and structure from `docs/landing-page-content.md`.

## Run locally

1. **Option A — Same host as hub**  
   Copy this folder into the hub's public landing dir so the hub serves it at `/landing/best-day-ever/index.html`:
   ```bash
   mkdir -p public/landing/best-day-ever && cp -r experiments/best-day-ever/landing/* public/landing/best-day-ever/
   ```
   Form posts to the hub's `/api/landing-submission` endpoint; use same origin (leave `HUB_API_URL` empty in `script.js`).

2. **Option B — Standalone**  
   Open `index.html` in a browser or use any static server (e.g. `npx serve .`). Set `HUB_API_URL` in `script.js` to your hub URL (e.g. `http://localhost:3000` for local hub) so the form can submit.

## Form submission

Submissions go to the Experiment Hub `/api/landing-submission` with:

- `experiment`: "Best Day Ever"
- `email`, `name`, `source: 'landing-page'`
- Custom fields (calendar, paper usage, hardest part) sent in `notes`

Set `NOTION_LANDING_DATABASE_ID_BEST_DAY_EVER` on the hub for this landing: locally in `.env.local` (see repo root `.env.example`); on Vercel in the hub project’s Environment Variables.

## Layout

Page follows Figma spec: flex column, align start, max-width 992px, white background. Design: warm neutrals, accent color, print-inspired typography per `docs/landing-page-content.md`.
