# Deploy Best Day Ever Landing to Vercel (CI/CD)

Deploy the phase 1 landing as its own static site on Vercel. Every push to your chosen branch triggers a new deployment.

## Prerequisites

- Repo on GitHub (e.g. `experiment-hub`)
- Experiment Hub API deployed somewhere (so form submissions can hit `/api/landing-submission`). If the hub is also on Vercel, use that project’s URL for `HUB_API_URL`.

## 1. Create the Vercel project

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub recommended).
2. **Add New** → **Project**.
3. Import the repo that contains this landing (e.g. `experiment-hub`).

## 2. Configure project (Root Directory)

In **Configure Project**:

| Setting | Value |
|--------|--------|
| **Framework Preset** | Other (or leave as detected; we override below) |
| **Root Directory** | `experiments/best-day-ever/landing` ← set and click **Edit** |
| **Build Command** | `npm run build` (or leave default; `vercel.json` sets it) |
| **Output Directory** | `dist` (or leave default; `vercel.json` sets it) |
| **Install Command** | `npm install` (optional; `vercel.json` sets it) |

`vercel.json` in this folder already sets `buildCommand`, `outputDirectory`, and `installCommand`, so you can rely on that once Root Directory is correct.

## 3. Environment variables

In the Vercel project: **Settings** → **Environment Variables**.

| Variable | Required | Where | Notes |
|----------|----------|--------|--------|
| `HUB_API_URL` | Yes (for production) | Production, Preview | Your Experiment Hub origin, e.g. `https://your-hub.vercel.app`. No trailing slash. Form posts to `HUB_API_URL/api/landing-submission`. |

- **Production**: set for your main landing URL.
- **Preview**: set if you want preview deployments (e.g. PRs) to submit to the same hub; use the same value or a staging hub URL.

If you leave `HUB_API_URL` empty, the built site will use same-origin (only works if the landing and hub are on the same domain, which they won’t be when the landing is its own Vercel project).

## 4. Deploy

1. Click **Deploy**.
2. After the build, the site is live at `https://<project-name>-<team>.vercel.app` (and on every push to the connected branch).

## 5. CI/CD behavior

- **Trigger**: Pushes (and optionally PRs) to the branch you connected (e.g. `main`).
- **Build**: Vercel runs `npm install` and `npm run build` in `experiments/best-day-ever/landing`. The build script copies `index.html` and `script.js` to `dist/` and writes `dist/config.js` with `window.HUB_API_URL` from the env.
- **Output**: Vercel serves the `dist/` folder as a static site.

No extra CI config (e.g. GitHub Actions) is required unless you want additional checks.

## 6. Custom domain (optional)

1. **Settings** → **Domains**.
2. Add your domain (e.g. `bestdayever.com` or `landing.bestdayever.com`).
3. Follow Vercel’s DNS instructions (CNAME or A record).

## 7. Hub CORS (if hub is a separate deployment)

The hub’s `/api/landing-submission` route allows cross-origin POSTs. By default it uses `Access-Control-Allow-Origin: *`. To restrict to your landing domain, set on the **hub** project (not the landing):

- `LANDING_CORS_ORIGIN` = your landing URL, e.g. `https://best-day-ever.vercel.app` (no trailing slash)

If you don’t set it, the hub allows any origin for this endpoint.

## 8. Post-deploy checks

- [ ] Landing page loads at the Vercel URL (or custom domain).
- [ ] Submit the early-access form; confirm the request goes to `HUB_API_URL/api/landing-submission` (e.g. in Network tab).
- [ ] Confirm the hub receives the submission (Notion or your configured storage).

## Troubleshooting

- **Form submits to wrong URL**: Ensure `HUB_API_URL` is set in Vercel for the environment you’re testing (Production vs Preview).
- **CORS**: The hub’s `/api/landing-submission` sets CORS (default `*`). To restrict, set `LANDING_CORS_ORIGIN` on the hub to your landing origin.
- **Root Directory**: If the build fails with “no such file”, confirm Root Directory is exactly `experiments/best-day-ever/landing` (no leading slash).
