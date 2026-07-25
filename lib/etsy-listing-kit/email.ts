/**
 * Transactional email for Etsy Listing Kit — provider-agnostic, no new account.
 *
 * Uses Resend if RESEND_API_KEY is present (smallest suitable adapter). When no
 * provider is configured it becomes a logged no-op that reports {sent:false} —
 * so fulfillment never breaks for lack of email, and nothing is faked.
 */
import { EXPERIMENT_ID } from './config';

export interface EmailResult { sent: boolean; id: string | null; reason?: string; }

const FROM = process.env.ELK_EMAIL_FROM || 'Etsy Listing Kit <onboarding@resend.dev>';

export function resultEmailHtml(downloadUrl: string): string {
  return `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#252525;background:#fdf3ee;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:16px;padding:32px">
    <h1 style="font-family:Georgia,serif;font-size:26px;margin:0 0 8px">All set — your photos are ready</h1>
    <p style="color:#555;font-size:15px;line-height:1.5">All six of your Etsy listing images are ready to download, clean and full-size. This link works for 7 days.</p>
    <p style="margin:24px 0"><a href="${downloadUrl}" style="background:#b24a2e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:500;display:inline-block">Download your 6 images →</a></p>
    <p style="color:#555;font-size:13px">Next up: drop these straight into your Etsy listing — they&rsquo;re already the right size. Need anything? Just reply to this email.</p>
  </div></body></html>`;
}
export function resultEmailText(downloadUrl: string): string {
  return `All set — your photos are ready\n\nAll six of your Etsy listing images are ready to download (clean, full-size). This link works for 7 days:\n${downloadUrl}\n\nDrop them straight into your Etsy listing — already sized right. Need anything? Just reply to this email.`;
}

/** Send the "your images are ready" email. Never throws — returns a result. */
export async function sendResultEmail(to: string, downloadUrl: string): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[elk email] no provider configured — would email ${to} with ${downloadUrl}`);
    return { sent: false, id: null, reason: 'no-provider' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: 'Your Etsy listing images are ready',
        html: resultEmailHtml(downloadUrl),
        text: resultEmailText(downloadUrl),
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
