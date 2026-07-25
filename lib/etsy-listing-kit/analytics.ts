/**
 * Typed funnel analytics for Etsy Listing Kit. The funnel IS the primary KPI
 * (ad → checkout conversion + CAC), so events are first-class here rather than
 * ad-hoc gtag calls. Client events go through GA4 (window.gtag); the verified
 * purchase is sent server-side via the GA4 Measurement Protocol. All no-op
 * safely when GA isn't configured — nothing is faked.
 */
import { EXPERIMENT_ID, PRICE_CENTS, CURRENCY } from './config';

export type FunnelEvent =
  | 'landing_view'
  | 'upload_started'
  | 'preview_viewed'
  | 'checkout_started'
  | 'payment_completed'
  | 'result_delivered'
  | 'payment_cancelled'
  | 'processing_failed';

interface Gtag { (command: string, event: string, params?: Record<string, unknown>): void; }
declare global { interface Window { gtag?: Gtag; } }

/** Client-side funnel event. Safe no-op if gtag isn't present. */
export function track(event: FunnelEvent, props: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', event, { experiment_id: EXPERIMENT_ID, ...props });
}

/**
 * Server-side GA4 purchase event (Measurement Protocol) after verified payment.
 * Idempotency is the caller's responsibility (fire once per fulfilled order).
 */
export async function trackPurchaseServer(order: { id: string; amount_total?: number | null; currency?: string | null; click_id?: string | null }): Promise<void> {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
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
