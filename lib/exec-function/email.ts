/**
 * The daily nudge.
 *
 * Deliberately thin: a subject line, what today's task is, how long it takes,
 * and one link. No interpretation of yesterday's score, no encouragement, no
 * coaching — the brief rules that out, and a measurement instrument that
 * comments on its own readings changes the thing it is measuring.
 *
 * The two facts it does carry (streak, last score on this task) are there to
 * make the link worth tapping, and both are plain retrieved values.
 */

import type { Assignment } from "./schedule";

export interface EmailResult {
  sent: boolean;
  id: string | null;
  reason?: string;
}

const FROM = process.env.EFA_EMAIL_FROM || "Assessment Suite <onboarding@resend.dev>";

const INK = "#1a1a1a";
const MUTED = "#5b5b5b";
const FAINT = "#8a8a8a";
const BORDER = "#e4e4e4";
const SURFACE = "#f6f7f8";
const ACCENT = "#2f5d8a";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

export interface DailyEmailContext {
  assignment: Assignment;
  /** Absolute URL, access key already attached. */
  link: string;
  /** Consecutive days completed before today. */
  streak: number;
  /** Last headline value on this same task, if there is one. */
  lastScore: { label: string; value: number } | null;
}

export function dailySubject(context: DailyEmailContext): string {
  return `Today's assessment — ${context.assignment.label}`;
}

function factLine(context: DailyEmailContext): string {
  const parts: string[] = [];
  if (context.streak > 0) {
    parts.push(`Streak: ${context.streak} day${context.streak === 1 ? "" : "s"}`);
  }
  if (context.lastScore) {
    parts.push(`Last ${context.lastScore.label}: ${context.lastScore.value}`);
  }
  return parts.join(" · ");
}

export function dailyEmailHtml(context: DailyEmailContext): string {
  const { assignment, link } = context;
  const facts = factLine(context);

  return `<!doctype html><html><body style="margin:0;padding:0;background:${SURFACE}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SURFACE};padding:32px 16px">
<tr><td align="center">
  <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:100%;background:#ffffff;border:1px solid ${BORDER};border-radius:14px;overflow:hidden">
    <tr><td style="padding:28px 28px 8px">
      <p style="margin:0 0 6px;font:600 12px/1.4 ${SANS};letter-spacing:.08em;text-transform:uppercase;color:${FAINT}">Today's assessment</p>
      <h1 style="margin:0;font:600 22px/1.3 ${SANS};color:${INK}">${assignment.label}</h1>
      <p style="margin:8px 0 0;font:400 15px/1.5 ${SANS};color:${MUTED}">One block, about ${assignment.estimatedMinutes} minutes.</p>
    </td></tr>
    <tr><td style="padding:20px 28px 4px">
      <a href="${link}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font:600 15px/1 ${SANS};padding:14px 22px;border-radius:8px">Start today's block</a>
    </td></tr>
    ${
      facts
        ? `<tr><td style="padding:18px 28px 0">
      <p style="margin:0;font:400 13px/1.5 ${SANS};color:${FAINT}">${facts}</p>
    </td></tr>`
        : ""
    }
    <tr><td style="padding:8px 28px 26px"></td></tr>
  </table>
</td></tr></table></body></html>`;
}

export function dailyEmailText(context: DailyEmailContext): string {
  const facts = factLine(context);
  return [
    `Today's assessment — ${context.assignment.label}`,
    "",
    `One block, about ${context.assignment.estimatedMinutes} minutes.`,
    "",
    context.link,
    "",
    facts,
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n");
}

/** POST to Resend. Never throws — returns a result the cron can log. */
export async function sendDailyEmail(
  to: string,
  context: DailyEmailContext,
): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  const subject = dailySubject(context);

  if (!key) {
    console.log(`[efa email] no provider configured — would send "${subject}" to ${to}`);
    return { sent: false, id: null, reason: "no-provider" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject,
        html: dailyEmailHtml(context),
        text: dailyEmailText(context),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { sent: false, id: null, reason: `provider ${res.status}: ${body.slice(0, 140)}` };
    }

    const json = await res.json();
    return { sent: true, id: json.id ?? null };
  } catch (err) {
    return { sent: false, id: null, reason: err instanceof Error ? err.message : "send failed" };
  }
}
