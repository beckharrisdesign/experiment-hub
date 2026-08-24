import { NextRequest, NextResponse } from "next/server";
import { isAccessConfigured, isAuthorized } from "@/lib/exec-function/access";
import {
  getStoreClient,
  insertSession,
  listSessions,
} from "@/lib/exec-function/server-store";
import { MODULE_ORDER } from "@/lib/exec-function/sessions";
import type { StoredSession } from "@/lib/exec-function/sessions";

export const dynamic = "force-dynamic";

/**
 * The session log.
 *
 * Both methods degrade the same way: if Supabase or the access key is not
 * configured, they answer 503 with `configured: false` rather than an error.
 * The client reads that as "use the local fallback" and the tool keeps working
 * with no infrastructure at all — which is the v1 promise in the brief.
 */

function guard(request: NextRequest): NextResponse | null {
  if (!isAccessConfigured()) {
    return NextResponse.json(
      { error: "Session log not configured", configured: false },
      { status: 503 },
    );
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;

  const client = getStoreClient();
  if (!client) {
    return NextResponse.json(
      { error: "Session log not configured", configured: false },
      { status: 503 },
    );
  }

  try {
    const sessions = await listSessions(client);
    return NextResponse.json({ success: true, configured: true, sessions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to read sessions" },
      { status: 500 },
    );
  }
}

/** Fields a client is allowed to set. `id` is assigned by the database. */
type SessionInput = Omit<StoredSession, "id">;

function validate(body: unknown): { session: SessionInput } | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "Body must be an object" };
  const candidate = body as Record<string, unknown>;

  const moduleId = candidate.module;
  if (typeof moduleId !== "string" || !MODULE_ORDER.includes(moduleId as never)) {
    return { error: "Unknown module" };
  }

  const timestamp = candidate.timestamp;
  if (typeof timestamp !== "string" || Number.isNaN(Date.parse(timestamp))) {
    return { error: "timestamp must be an ISO 8601 string" };
  }

  const dayKey = candidate.dayKey;
  if (typeof dayKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
    return { error: "dayKey must be YYYY-MM-DD" };
  }

  const headline = candidate.headline;
  if (typeof headline !== "number" || !Number.isFinite(headline)) {
    return { error: "headline must be a finite number" };
  }

  const durationMs = candidate.durationMs;
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs < 0) {
    return { error: "durationMs must be a non-negative number" };
  }

  const variant = candidate.variant;
  if (variant !== null && typeof variant !== "string") {
    return { error: "variant must be a string or null" };
  }

  if (typeof candidate.detail !== "object" || candidate.detail === null) {
    return { error: "detail must be an object" };
  }

  return {
    session: {
      module: moduleId as StoredSession["module"],
      variant: variant ?? null,
      timestamp,
      dayKey,
      durationMs,
      headline,
      detail: candidate.detail as StoredSession["detail"],
    },
  };
}

export async function POST(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;

  const client = getStoreClient();
  if (!client) {
    return NextResponse.json(
      { error: "Session log not configured", configured: false },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const parsed = validate(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const session = await insertSession(client, parsed.session);
    return NextResponse.json({ success: true, session }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to write session" },
      { status: 500 },
    );
  }
}
