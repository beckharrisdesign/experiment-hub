# Stripe Setup Guide

This app uses Stripe for subscription billing. Follow these steps to wire it up.

## 1. Create Products & Prices in Stripe

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. **Products** → **Add product**
3. Create three products (or reuse existing ones):

| Product Name     | Price  | Billing | Price ID (you'll copy this) |
|------------------|--------|---------|----------------------------|
| Home Garden      | $5/mo  | Monthly | `price_xxx`                 |
| Home Garden (yr) | $49/yr | Yearly  | `price_xxx`                 |
| Serious Hobby    | $15/mo | Monthly | `price_xxx`                 |
| Serious Hobby (yr)| $144/yr| Yearly  | `price_xxx`                 |

For each product:
- Click **Add product**
- Name it (e.g. "Home Garden")
- Under **Pricing**, add a **Recurring** price
- Set amount and interval (monthly or yearly)
- Click **Save**
- Copy the **Price ID** (starts with `price_`) — you'll need it for env vars

**Tip:** Use **Test mode** (toggle in top-right) while developing. Switch to Live when ready.

## 2. Get Your API Keys

1. In Stripe Dashboard, go to **Developers** → **API keys**
2. Copy:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`) — click **Reveal** if hidden

**Never** commit the secret key or expose it to the client. It stays in `.env.local` and is only used in API routes.

## 3. Add Environment Variables

Add these to `.env.local` in `prototype/app/`:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx

# Price IDs (from step 1)
NEXT_PUBLIC_STRIPE_PRICE_HOME_GARDEN_MONTHLY=price_xxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_HOME_GARDEN_YEARLY=price_xxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_SERIOUS_HOBBY_MONTHLY=price_xxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_SERIOUS_HOBBY_YEARLY=price_xxxxxxxxxxxx
```

Replace the `price_xxx` values with the actual Price IDs from your Stripe products.

## 4. Install Stripe

From `prototype/app/`:

```bash
npm install stripe
```

## 5. Verify Setup

1. Restart your Next.js dev server
2. Click **Subscribe** on a paid tier on the landing page (choose Monthly or Yearly first)
3. You should be redirected to Stripe Checkout
4. Use test card `4242 4242 4242 4242` to complete a test payment

**Fallback:** If Stripe keys or price IDs are not set, the paid-tier buttons show "Get started" and link to the signup form instead.

## 6. Webhooks (Optional, for production)

To sync subscription status (active, canceled, etc.) with your database:

1. **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://your-domain.com/api/stripe/webhook`
3. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy the **Signing secret** (starts with `whsec_`)
5. Add to `.env.local`: `STRIPE_WEBHOOK_SECRET=whsec_xxx`

For local testing, use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks:

```bash
stripe listen --forward-to localhost:3009/api/stripe/webhook
```

## 7. Stripe Customer Portal (for Profile "Manage billing")

The Profile page shows subscription tier and recent charges, with a "Manage billing" button that opens Stripe's Customer Portal. To enable it:

1. **Settings** → **Billing** → **Customer portal**
2. Configure branding, and enable features (subscription management, invoice history, payment method updates)
3. Save. The app creates portal sessions via `/api/stripe/portal` when users click "Manage billing"

---

## Troubleshooting

- **"No such price"**: Double-check the Price ID in env vars. It must match the product’s price in Stripe.
- **CORS or redirect errors**: Ensure `success_url` and `cancel_url` use your actual domain (or `http://localhost:3009` for dev).
- **Webhook signature errors**: Verify `STRIPE_WEBHOOK_SECRET` matches the endpoint’s signing secret.
