-- Subscription state cache, synced from Stripe via webhook.
-- Avoids querying Stripe API on every request to check tier.
--
-- Populated by: POST /api/stripe/webhook
-- Read by:      lib/tier.ts (DB-first, Stripe fallback)

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id    TEXT NOT NULL,
  stripe_subscription_id TEXT,
  stripe_price_id       TEXT,
  tier                  TEXT NOT NULL DEFAULT 'Seed Stash Starter',
  status                TEXT NOT NULL DEFAULT 'free',
    -- Stripe statuses: active | trialing | past_due | canceled | unpaid | incomplete | incomplete_expired
    -- 'free' = no subscription record in Stripe
  current_period_end    TIMESTAMPTZ,
  cancel_at_period_end  BOOLEAN NOT NULL DEFAULT false,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup by Stripe customer ID (used for subscription.updated / subscription.deleted events)
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(stripe_customer_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription row (for profile/pricing display)
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- The webhook uses the service role key which bypasses RLS by default.
-- No user-facing INSERT/UPDATE/DELETE policies needed.
