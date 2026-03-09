# Best Day Ever — Phase 1 Landing (Validation)

Same architecture as **Simple Seed Organizer**: this `landing/` folder is the pared-down first phase of the prototype (validation). It is static HTML/JS; a full app would live in `prototype/` later.

- **Source of truth:** `experiments/best-day-ever/landing/` (this folder)
- **Served by hub:** Copy into `public/landing/best-day-ever/` so the hub serves it at `/landing/best-day-ever/index.html`

## Run locally

1. **Option A — Served by hub (same origin)**  
   Copy this folder into the hub's public landing dir, then open the hub URL:
   ```bash
   mkdir -p public/landing/best-day-ever && cp -r experiments/best-day-ever/landing/* public/landing/best-day-ever/
   ```
   Then open http://localhost:3000/landing/best-day-ever/index.html (with hub running). Form posts to the hub's `/api/landing-submission`; leave `HUB_API_URL` empty in `script.js` for same-origin.

2. **Option B — Standalone static server**  
   Run a static server in this folder (e.g. `npx serve -p 3002`). Edit `config.js` and set `window.HUB_API_URL = 'http://localhost:3000'` (your hub URL) so the form can submit.

## Deploy to Vercel (CI/CD)

To run the landing on its own URL (e.g. for ads) instead of the hub, deploy with Vercel. Every push to your branch will redeploy.

See **[DEPLOY.md](./DEPLOY.md)** for:

- Root Directory: `experiments/best-day-ever/landing`
- Env var: `HUB_API_URL` = your hub origin (e.g. `https://your-hub.vercel.app`)
- Optional custom domain

## Directory structure (matches Simple Seed Organizer)

```
experiments/best-day-ever/
├── docs/
│   ├── PRD.md
│   ├── landing-page-content.md
│   └── ad-campaign-content.md
├── landing/          ← Phase 1 / validation (this folder). Copy to public/landing/best-day-ever/ for hub.
│   ├── index.html
│   ├── config.js     ← HUB_API_URL (empty = same-origin; set in Vercel env for deploy)
│   ├── script.js
│   ├── vercel.json   ← Vercel build/output config
│   ├── DEPLOY.md     ← Vercel CI/CD setup
│   └── README.md
└── prototype/        ← Optional later: full app (e.g. Next.js) when you build past validation
```

## Form submission

Submissions go to the Experiment Hub `/api/landing-submission` with:

- `experiment`: "Best Day Ever"
- `email`, `name`, `source: 'landing-page'`
- Custom fields (calendar, paper usage, hardest part) sent in `notes`

Ensure the hub has `NOTION_LANDING_DATABASE_ID` set if you use Notion for responses.

## Layout

Page follows Figma spec: flex column, align start, max-width 992px, white background. Design: warm neutrals, accent color, print-inspired typography per `docs/landing-page-content.md`.
