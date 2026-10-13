/**
 * Stripe for Estate Sale Planner (server-only). The secret key is the hub's
 * shared pair (STRIPE_SECRET_KEY_TEST / _LIVE, flipped by STRIPE_MODE), resolved
 * by etsy-listing-kit's module — that file is in practice the hub's Stripe
 * client and moving it to lib/stripe.ts is a hand-off (review queue #33).
 *
 * The webhook signing secret is this experiment's own: Stripe signs per
 * endpoint, and /estate-sale-planner/api/webhook is a different endpoint from
 * ELK's. ESP_STRIPE_WEBHOOK_SECRET_<MODE> in the registry.
 */
export { stripe, stripeMode, isLiveMode } from "../etsy-listing-kit/stripe";
import { stripeMode } from "../etsy-listing-kit/stripe";

export function webhookSecret(): string | undefined {
  const byMode = stripeMode() === "live" ? process.env.ESP_STRIPE_WEBHOOK_SECRET_LIVE : process.env.ESP_STRIPE_WEBHOOK_SECRET_TEST;
  return byMode || process.env.ESP_STRIPE_WEBHOOK_SECRET;
}
