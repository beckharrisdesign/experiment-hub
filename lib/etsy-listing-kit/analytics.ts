/**
 * Typed funnel analytics for Etsy Listing Kit. The funnel IS the primary KPI
 * (ad → checkout conversion + CAC), so events are named/typed here — but the
 * client transport reuses the hub's existing GA helper (no second analytics
 * system). The server-side verified purchase uses the GA4 Measurement Protocol.
 * All no-op safely when GA isn't configured — nothing is faked.
 */
import { trackEvent, isOptedOut, ELK_GOOGLE_ADS_ID } from '../analytics/ga';
import { EXPERIMENT_ID, PRICE_CENTS, CURRENCY } from './config';

/**
 * Google Ads conversion label: "Sign-up" action (id 7659388987) = paid image
 * view delivered. Scoped to the standalone ELK Ads account, NOT the hub account —
 * the same label string also exists under the hub account for simple-seed-organizer,
 * so the account prefix is what keeps the two conversion actions distinct.
 */
export const ADS_CONVERSION_PURCHASE = `${ELK_GOOGLE_ADS_ID}/dX8MCLuApMQcEO7Lx88o`;

/**
 * GA4 event name backing the imported Ads conversion "FormSubmit" (id 6657647682).
 * Must stay exactly this string — GA4 event names are case-sensitive and the Ads
 * import matches literally, so the usual snake_case convention does not apply here.
 */
export const GA4_FORM_SUBMIT_EVENT = 'FormSubmit' as const;

/**
 * Funnel events. Every step a visitor can *attempt* has a start event and a
 * terminal event (success or failure) so the funnel measures both duration and
 * drop-off. A step with only a success event is invisible when it fails or when
 * the visitor abandons mid-step — that was the gap this list closes.
 *
 *   landing_view
 *     └─ upload_picker_opened → upload_started | upload_rejected
 *          └─ preview_requested → preview_viewed | preview_failed
 *               └─ checkout_started (+FormSubmit) → [Stripe] | checkout_failed
 *                    └─ result_delivered → download_clicked | restart_clicked | processing_failed
 *                       payment_cancelled (returned from Stripe unpaid)
 */
export type FunnelEvent =
  | 'landing_view'
  | 'upload_picker_opened'
  | 'upload_started'
  | 'upload_rejected'
  | 'preview_requested'
  | 'preview_viewed'
  | 'preview_failed'
  | 'checkout_started'
  | 'checkout_failed'
  | 'payment_completed'
  | 'result_delivered'
  | 'download_clicked'
  | 'restart_clicked'
  | 'payment_cancelled'
  | 'processing_failed'
  // elk-listing-evaluation funnel (spec: evaluation events fire without PII)
  | 'evaluation_started'
  | 'evaluation_completed'
  | 'evaluation_failed'
  /** Superseded by kit_cta_click (Figma 02.27 legend, E4) — kept for history. */
  | 'pack_offer_click'
  // First-pass instrumentation per the approved 02.27 legend (task 3.9):
  | 'kit_cta_click' // E4 — props.placement: hero_skip | report_offer | kit_box
  | 'generation_completed' // E7 — server-side; duration_ms, scene_count, wording_thin
  | 'copy_clicked'; // E8 — props.block: title | tags | alt

type EventProps = Record<string, string | number | boolean | undefined>;

/** Client-side funnel event — delegates to the hub GA helper (safe no-op if GA off). */
export function track(event: FunnelEvent, props: EventProps = {}): void {
  trackEvent(event, { experiment_id: EXPERIMENT_ID, ...props });
}

/**
 * Ad attribution read from the current location (E1 capture + checkout
 * pass-through). One reader so landing_view props and checkout payloads
 * can never drift apart.
 */
export function attributionFromLocation(): Record<string, string | undefined> {
  if (typeof window === 'undefined') return {};
  const q = new URLSearchParams(window.location.search);
  const out: Record<string, string | undefined> = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const v = q.get(k); if (v) out[k] = v;
  }
  const clickId = q.get('gclid') || q.get('fbclid');
  if (clickId) out.click_id = clickId;
  out.landing_path = window.location.pathname;
  return out;
}

/**
 * GA4 `FormSubmit` — the event Google Ads imports as conversion 6657647682.
 * Fired on checkout submit (the pay button), alongside the snake_case
 * `checkout_started` funnel event: `checkout_started` is ours for funnel
 * analysis, `FormSubmit` exists solely to feed the Ads import. Keep both.
 */
export function trackFormSubmit(props: EventProps = {}): void {
  trackEvent(GA4_FORM_SUBMIT_EVENT, { experiment_id: EXPERIMENT_ID, ...props });
}

/**
 * Google Ads conversion — fired when the paid image view loads (result page
 * reaches 'fulfilled'). transaction_id lets Google Ads dedupe page refreshes.
 * Safe no-op when gtag isn't loaded or analytics is opted out.
 */
export function trackAdsConversion(orderId: string): void {
  if (
    typeof window === 'undefined' ||
    typeof window.gtag !== 'function' ||
    isOptedOut()
  ) {
    return;
  }
  window.gtag('event', 'conversion', {
    send_to: ADS_CONVERSION_PURCHASE,
    value: PRICE_CENTS / 100,
    currency: CURRENCY.toUpperCase(),
    transaction_id: orderId,
  });
}

/**
 * Server-side GA4 purchase event (Measurement Protocol) after verified payment.
 * Idempotency is the caller's responsibility (fire once per fulfilled order).
 */
export async function trackPurchaseServer(order: { id: string; amount_total?: number | null; currency?: string | null; click_id?: string | null }): Promise<void> {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
  const apiSecret = process.env.GA_API_SECRET;
  if (!measurementId || !apiSecret) return; // not configured → no-op
  const value = (order.amount_total ?? PRICE_CENTS) / 100;
  const currency = (order.currency ?? CURRENCY).toUpperCase();
  try {
    await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`, {
      method: 'POST',
      body: JSON.stringify({
        client_id: order.id,
        events: [{
          name: 'purchase',
          params: {
            transaction_id: order.id,
            value,
            currency,
            experiment_id: EXPERIMENT_ID,
            items: [{ item_id: EXPERIMENT_ID, item_name: 'Etsy Listing Kit — 6 images', price: value, quantity: 1 }],
          },
        }],
      }),
    });
  } catch {
    // analytics must never break fulfillment
  }
}

/**
 * Server-side funnel event via Measurement Protocol (E7 generation_completed
 * — the 02.27 legend's product-health number: the "about a minute" promise,
 * measured). Same no-op/never-throw posture as trackPurchaseServer.
 */
export async function trackServerEvent(clientId: string, event: FunnelEvent, params: EventProps): Promise<void> {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
  const apiSecret = process.env.GA_API_SECRET;
  if (!measurementId || !apiSecret) return;
  try {
    await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`, {
      method: 'POST',
      body: JSON.stringify({
        client_id: clientId,
        events: [{ name: event, params: { experiment_id: EXPERIMENT_ID, ...params } }],
      }),
    });
  } catch {
    // analytics must never break fulfillment
  }
}
