# Deploy Simple Seed Organizer to Vercel (Test/QA)

This guide walks through deploying the app to Vercel as a test or QA environment.

## Deployment Status

**Deployed to Vercel** — Test/QA environment live. Using Stripe sandbox (test mode) while iterating before soft launch.

## Prerequisites

- GitHub repo pushed (experiment-hub)
- Supabase project set up (migrations run)
- Stripe test mode configured

## 1. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub recommended)
2. Click **Add New** → **Project**
3. Import your `experiment-hub` repository
4. Configure:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `experiments/simple-seed-organizer/prototype/app` ← **Important**
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** (leave default)
   - **Install Command:** `npm install` (default)

## 2. Environment Variables

Add these in Vercel → Project → **Settings** → **Environment Variables**. Use **Preview** (or Production if this is your only env) so they apply to deployments.

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | From Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Publishable key (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | For server-side Supabase (API routes) |
| `OPENAI_API_KEY` | Yes | For AI packet extraction |
| `STRIPE_SECRET_KEY` | Yes | Use test key (`sk_test_...`) for QA |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Use test key (`pk_test_...`) |
| `NEXT_PUBLIC_STRIPE_PRICE_HOME_GARDEN_MONTHLY` | Yes | Stripe Price ID |
| `NEXT_PUBLIC_STRIPE_PRICE_HOME_GARDEN_YEARLY` | Yes | |
| `NEXT_PUBLIC_STRIPE_PRICE_SERIOUS_HOBBY_MONTHLY` | Yes | |
| `NEXT_PUBLIC_STRIPE_PRICE_SERIOUS_HOBBY_YEARLY` | Yes | |
| `STRIPE_WEBHOOK_SECRET` | Optional | Only if you configure a webhook for this env |

**Tip:** Copy from `.env.local` but never commit secrets. Use Vercel’s “Bulk Edit” to paste multiple vars.

## 3. Supabase: Allow Vercel URL

Supabase Auth must allow your Vercel domain:

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add your Vercel URL to **Redirect URLs**, e.g.:
   - `https://your-project.vercel.app/**`
   - `https://your-project-*.vercel.app/**` (for preview deployments)

## 4. Deploy

1. Click **Deploy**
2. Wait for the build to finish
3. Open the deployment URL (e.g. `https://simple-seed-organizer-xxx.vercel.app`)

## 5. Post-Deploy Checks

- [ ] Landing page loads
- [ ] Sign up / sign in works
- [ ] Add a seed (manual entry)
- [ ] AI extraction works (if you have OpenAI key)
- [ ] Pricing page and Stripe checkout open correctly

## 6. Optional: Stripe Webhook (for QA)

If you want webhooks in this environment:

1. Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://your-vercel-url.vercel.app/api/stripe/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy the **Signing secret** (`whsec_...`)
5. Add `STRIPE_WEBHOOK_SECRET` in Vercel env vars
6. Redeploy

## Notes for Test/QA

- **Same Supabase:** You can use the same Supabase project as local; RLS keeps data per user
- **Stripe sandbox:** Using test mode (`sk_test_`, `pk_test_`) while tweaking before soft launch. Switch to live keys when ready.
- **Stripe test cards:** Use `4242 4242 4242 4242` for successful payments in test mode
- **Rate limiting:** In-memory limiter is per-instance on Vercel; fine for QA, consider Redis for production
- **Preview deployments:** Each PR gets a unique URL; add `https://*-xxx.vercel.app/**` to Supabase redirect URLs if you want to test PRs
