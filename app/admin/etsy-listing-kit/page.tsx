/**
 * Owner view for Etsy Listing Kit — orders + revenue-target progress.
 * Lives under /admin, so the hub middleware (hub-edit cookie = ADMIN_SECRET)
 * gates access. Read-only; service-role reads happen server-side only.
 */
import { createAdminSupabaseClient } from '../../../lib/etsy-listing-kit/supabase-admin';
import { REVENUE_TARGET } from '../../../lib/etsy-listing-kit/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const PAID = new Set(['paid', 'processing', 'fulfilled', 'partially_refunded']);

/**
 * Confirmation-email outcome per order. A paid, fulfilled order whose email
 * never sent is invisible without this — the send is deliberately non-fatal.
 */
type OrderRow = {
  status: string; customer_email: string | null; fulfilled_at: string | null;
  email_sent_at: string | null; email_error: string | null; email_attempted_at: string | null;
};
function emailStatus(o: OrderRow) {
  if (o.email_sent_at) return <span style={{ color: '#1e7a3c' }}>sent</span>;
  if (o.email_error) {
    return <span style={{ color: '#b3261e' }} title={o.email_error}>
      ✕ failed — {o.email_error.length > 48 ? `${o.email_error.slice(0, 48)}…` : o.email_error}
    </span>;
  }
  if (!o.customer_email) return <span style={{ color: '#777' }}>no address</span>;
  if (o.fulfilled_at) return <span style={{ color: '#b06a00' }}>not sent</span>;
  return <span style={{ color: '#777' }}>—</span>;
}

export default async function OwnerView() {
  const db = createAdminSupabaseClient();
  if (!db) {
    return <main style={{ padding: 40, fontFamily: 'Inter, sans-serif' }}>
      <h1>Etsy Listing Kit — orders</h1>
      <p>Supabase isn’t configured (set <code>SUPABASE_URL</code> + <code>SUPABASE_SERVICE_ROLE_KEY</code>).</p>
    </main>;
  }

  const { data: orders } = await db
    .from('elk_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = orders ?? [];
  const paidRows = rows.filter((o) => PAID.has(o.status) && o.livemode);
  const netCents = paidRows.reduce((s, o) => s + ((o.amount_total ?? 0) - (o.refunded_total ?? 0)), 0);
  const pct = Math.min(100, Math.round((netCents / REVENUE_TARGET.targetCents) * 100));

  return (
    <main style={{ padding: 40, fontFamily: 'Inter, sans-serif', color: '#252525', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Georgia, serif' }}>Etsy Listing Kit — orders</h1>

      <section style={{ background: '#fdf3ee', border: '1px solid #e5e5e5', borderRadius: 12, padding: 20, margin: '16px 0' }}>
        <strong>Revenue target:</strong> {usd(netCents)} / {usd(REVENUE_TARGET.targetCents)} ({pct}%) · {REVENUE_TARGET.windowDays}-day window ·
        launched: {REVENUE_TARGET.launchedAt ?? 'not launched'}
        <div style={{ height: 8, background: '#e5e5e5', borderRadius: 4, marginTop: 8 }}>
          <div style={{ width: `${pct}%`, height: 8, background: '#b24a2e', borderRadius: 4 }} />
        </div>
        <small style={{ color: '#555' }}>Live-mode paid revenue only. Run <code>pnpm revenue:test</code> for the authoritative check.</small>
      </section>

      <p style={{ color: '#555' }}>{rows.length} orders · {paidRows.length} paid (live)</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #e5e5e5' }}>
            <th style={{ padding: 8 }}>Order</th><th>Status</th><th>Amount</th><th>Mode</th>
            <th>Email</th><th>Email status</th><th>Fulfilled</th><th>Attribution</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} style={{ borderBottom: '1px solid #eee', background: o.status === 'failed' ? '#fdecec' : undefined }}>
              <td style={{ padding: 8, fontFamily: 'monospace' }}>{o.id.slice(0, 8)}</td>
              <td>{o.status}</td>
              <td>{o.amount_total != null ? usd(o.amount_total) : '—'}</td>
              <td>{o.livemode ? 'live' : 'test'}</td>
              <td>{o.customer_email ?? '—'}</td>
              <td>{emailStatus(o)}</td>
              <td>{o.fulfilled_at ? new Date(o.fulfilled_at).toLocaleString() : '—'}</td>
              <td>{[o.utm_source, o.utm_campaign].filter(Boolean).join(' / ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.some((o) => o.status === 'failed') && (
        <p style={{ color: '#b3261e', marginTop: 16 }}>⚠ Failed orders are highlighted — retry/refund tooling is a follow-up.</p>
      )}
    </main>
  );
}
