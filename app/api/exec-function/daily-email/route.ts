import { NextRequest, NextResponse } from "next/server";
import { effectiveKey, isAuthorized } from "@/lib/exec-function/access";
import { sendDailyEmail } from "@/lib/exec-function/email";
import {
  assignmentFor,
  currentStreak,
  dayKeyFor,
} from "@/lib/exec-function/schedule";
import { getStoreClient, listSessions } from "@/lib/exec-function/server-store";
import { completedDayKeys, trackFor } from "@/lib/exec-function/sessions";

export const dynamic = "force-dynamic";

/**
 * Cron target for the daily nudge.
 *
 * Called once a day by .github/workflows/exec-function-daily.yml. It is a POST
 * with the access key so a stray GET — a crawler, a link preview fetcher —
 * cannot make it send mail.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Single-user tool, so the recipient is a constant rather than configuration.
  // This is a public repo, but the address is already the author of every commit
  // in it — the most-scraped email source on GitHub — so writing it here adds no
  // exposure the git history does not already give away. EFA_NOTIFY_EMAIL
  // overrides it.
  const to = process.env.EFA_NOTIFY_EMAIL || "katy@beckharrisdesign.com";

  // Central by default — the zone this is actually used in. Override with
  // EFA_TIMEZONE if that ever changes.
  const timeZone = process.env.EFA_TIMEZONE || "America/Chicago";
  const dayKey = dayKeyFor(new Date(), timeZone);
  const assignment = assignmentFor(dayKey);

  // The hub's production host. Hard-coded as the last resort rather than
  // guessing from Vercel: NEXT_PUBLIC_APP_URL is not set in production, and
  // VERCEL_PROJECT_PRODUCTION_URL is a *.vercel.app name — the obvious guess,
  // experiment-hub.vercel.app, is an unrelated static app that answers POST
  // with 405. A wrong origin here puts a dead link in every email.
  const origin =
    process.env.EFA_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://labs.beckharrisdesign.com";
  const siteUrl = origin.replace(/\/$/, "");
  // The key rides in the link so tapping it from the phone just works; the page
  // stores it locally, so it only has to travel this way once.
  const link = `${siteUrl}${assignment.href}${assignment.href.includes("?") ? "&" : "?"}k=${encodeURIComponent(effectiveKey() ?? "")}`;

  // History is best-effort: a store that is down should still not stop the
  // reminder going out, it just goes out without the streak line.
  let streak = 0;
  let lastScore: { label: string; value: number } | null = null;

  const client = getStoreClient();
  if (client) {
    try {
      const sessions = await listSessions(client);
      streak = currentStreak(completedDayKeys(sessions), dayKey);

      const sameTask = sessions.filter(
        (s) =>
          s.module === assignment.module &&
          (assignment.condition ? s.variant === assignment.condition : true),
      );
      const last = sameTask[sameTask.length - 1];
      const track = trackFor(assignment.module, assignment.condition ?? null);
      if (last && track) {
        lastScore = { label: track.headlineLabel, value: last.headline };
      }
    } catch (error) {
      console.error("[efa daily-email] history lookup failed", error);
    }
  }

  const result = await sendDailyEmail(to, { assignment, link, streak, lastScore });

  return NextResponse.json(
    {
      success: result.sent,
      dayKey,
      timeZone,
      assignment: { module: assignment.module, condition: assignment.condition ?? null },
      streak,
      email: result,
    },
    { status: result.sent ? 200 : 502 },
  );
}
