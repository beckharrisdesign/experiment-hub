/**
 * Transactional email for Etsy Listing Kit — provider-agnostic, no new account.
 *
 * Uses Resend if RESEND_API_KEY is present (smallest suitable adapter). When no
 * provider is configured it becomes a logged no-op that reports {sent:false} —
 * so fulfillment never breaks for lack of email, and nothing is faked.
 *
 * Branding matches the funnel (Figma 02.3 tokens: terracotta #b24a2e, ochre
 * #d99a2b, cream #fdf3ee, Fraunces headings): buyers should recognise the email
 * as coming from the page they just paid on. Mail clients can't load webfonts,
 * so headings fall back to Georgia — the same fallback the site declares.
 */
import { EXPERIMENT_ID } from './config';

export interface EmailResult { sent: boolean; id: string | null; reason?: string; }

const FROM = process.env.ELK_EMAIL_FROM || 'Etsy Listing Kit <onboarding@resend.dev>';
/**
 * Where buyer replies land. The sending subdomain receives no mail, so without
 * this the "just reply to this email" line is a dead end. Unset → no header.
 */
const REPLY_TO = process.env.ELK_REPLY_TO;
const SITE = (process.env.ELK_SITE_URL || 'https://etsy-listing-kit.vercel.app').replace(/\/$/, '');
const SITE_LABEL = SITE.replace(/^https?:\/\//, '');

// ── shared shell ─────────────────────────────────────────────────────────────
const INK = '#252525', MUTED = '#555555', FAINT = '#8a8a8a';
const PRIMARY = '#b24a2e', ACCENT = '#d99a2b', ACCENT_TINT = '#f5e3be', ACCENT_INK = '#7a4d12';
const CREAM = '#fdf3ee', SURFACE = '#f7f7f7', BORDER = '#e5e5e5';
const SERIF = `Georgia,'Times New Roman',serif`;
const SANS = 'Inter,Arial,sans-serif';

/** Masthead + footer wrapper, so every ELK email reads as the same product. */
function shell(body: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:${CREAM}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:32px 16px">
<tr><td align="center">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#ffffff;border:1px solid ${BORDER};border-radius:16px;overflow:hidden">
    <tr><td style="background:${SURFACE};border-bottom:1px solid ${BORDER};padding:18px 28px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-family:${SERIF};font-weight:700;font-size:18px;color:${INK};letter-spacing:-0.01em">Etsy Listing Kit</td>
        <td align="right" style="font-family:${SANS};font-size:12px;color:${MUTED}">One design &rarr; 6 Etsy-ready images</td>
      </tr></table>
    </td></tr>
    <tr><td style="height:3px;background:${ACCENT};line-height:3px;font-size:0">&nbsp;</td></tr>
    ${body}
    <tr><td style="background:${SURFACE};border-top:1px solid ${BORDER};padding:18px 28px">
      <p style="margin:0 0 4px;font-family:${SANS};font-size:12px;color:${MUTED}">
        <a href="${SITE}" style="color:${PRIMARY};text-decoration:none;font-weight:600">${SITE_LABEL}</a> &middot; by Beck Harris Design
      </p>
      <p style="margin:0;font-family:${SANS};font-size:11px;line-height:1.5;color:${FAINT}">
        You&rsquo;re receiving this because you bought a listing kit. This is a one-time order email &mdash; no list, no newsletter.
      </p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

export function resultEmailHtml(downloadUrl: string): string {
  return shell(`
    <tr><td style="padding:32px 28px 8px">
      <h1 style="margin:0 0 10px;font-family:${SERIF};font-size:26px;line-height:1.25;color:${INK}">All set &mdash; your photos are ready</h1>
      <p style="margin:0 0 20px;font-family:${SANS};font-size:15px;line-height:1.55;color:${MUTED}">
        All six of your Etsy listing images are ready to download, clean and full-size. This link works for 7 days.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
        <tr><td style="background:${PRIMARY};border-radius:10px">
          <a href="${downloadUrl}" style="display:inline-block;padding:13px 26px;font-family:${SANS};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">Download your 6 images &rarr;</a>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 28px 28px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};border:1px solid ${ACCENT_TINT};border-radius:12px">
        <tr><td style="padding:16px 18px">
          <p style="margin:0 0 8px;font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:0.08em;color:${ACCENT_INK}">WHAT&rsquo;S IN YOUR SET</p>
          <p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.6;color:${MUTED}">
            Six 2000px square JPGs &mdash; hoop on linen, styled photo, in-hoop, terracotta, floss flat-lay and a stitched preview. Sized for Etsy, no watermark.
          </p>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 28px 28px">
      <p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.6;color:${MUTED}">
        Drop them straight into your Etsy listing &mdash; they&rsquo;re already the right size. Need anything? Just reply to this email.
      </p>
    </td></tr>`);
}

export function resultEmailText(downloadUrl: string): string {
  return `ETSY LISTING KIT — one design → 6 Etsy-ready images

All set — your photos are ready

All six of your Etsy listing images are ready to download (clean, full-size). This link works for 7 days:
${downloadUrl}

What's in your set: six 2000px square JPGs — hoop on linen, styled photo, in-hoop, terracotta, floss flat-lay and a stitched preview. Sized for Etsy, no watermark.

Drop them straight into your Etsy listing — already sized right. Need anything? Just reply to this email.

${SITE_LABEL} · by Beck Harris Design
You're receiving this because you bought a listing kit — a one-time order email, no list.`;
}

export function refundEmailHtml(): string {
  return shell(`
    <tr><td style="padding:32px 28px 28px">
      <h1 style="margin:0 0 10px;font-family:${SERIF};font-size:24px;line-height:1.3;color:${INK}">Something went wrong &mdash; and we&rsquo;ve refunded you</h1>
      <p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.55;color:${MUTED}">
        Your payment went through, but we hit a snag generating your images and couldn&rsquo;t complete the order. We&rsquo;ve <strong style="color:${INK}">automatically refunded you in full</strong> &mdash; nothing for you to do. Sorry for the trouble. Reply to this email if you&rsquo;d like to try again and we&rsquo;ll help.
      </p>
    </td></tr>`);
}

export function refundEmailText(): string {
  return `ETSY LISTING KIT

Something went wrong — and we've refunded you

Your payment went through, but we hit a snag generating your images and couldn't complete the order. We've automatically refunded you in full — no action needed. Sorry for the trouble; reply to this email if you'd like to try again and we'll help.

${SITE_LABEL} · by Beck Harris Design`;
}

/** POST to Resend with the shared envelope. Never throws — returns a result. */
async function send(to: string, subject: string, html: string, text: string): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[elk email] no provider configured — would send "${subject}" to ${to}`);
    return { sent: false, id: null, reason: 'no-provider' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
        subject,
        html,
        text,
        headers: { 'X-Experiment-Id': EXPERIMENT_ID },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { sent: false, id: null, reason: `provider ${res.status}: ${body.slice(0, 140)}` };
    }
    const json = await res.json();
    return { sent: true, id: json.id ?? null };
  } catch (err) {
    return { sent: false, id: null, reason: err instanceof Error ? err.message : 'send failed' };
  }
}

/** Send the "we refunded you" email. Never throws — returns a result. */
export function sendRefundEmail(to: string): Promise<EmailResult> {
  return send(to, 'Your Etsy Listing Kit order — refunded', refundEmailHtml(), refundEmailText());
}

/** Send the "your images are ready" email. Never throws — returns a result. */
export function sendResultEmail(to: string, downloadUrl: string): Promise<EmailResult> {
  return send(to, 'Your Etsy listing images are ready', resultEmailHtml(downloadUrl), resultEmailText(downloadUrl));
}
