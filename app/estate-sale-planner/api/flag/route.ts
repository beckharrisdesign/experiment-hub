import { NextRequest, NextResponse } from "next/server";
import { FRAME_BUDGET } from "../../../../lib/estate-sale-planner/config";
import { flagFrames, visionConfigured, type FrameInput } from "../../../../lib/estate-sale-planner/flag";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /estate-sale-planner/api/flag
 * Body: { frames: [{ data: <base64 jpeg>, at: <seconds> }, ...] }
 *
 * The vision pass. Frames arrive already sampled and downscaled by the
 * browser (lib/estate-sale-planner/capture.ts); the budget is re-checked here
 * so a hand-rolled request cannot run up a bill. With neither OPENAI_API_KEY
 * nor ANTHROPIC_API_KEY the fixture set is returned with `source: "fixture"`
 * — the UI says so. The response carries `provider` so logs show which ran.
 */

const MAX_BASE64_PER_FRAME = 600_000; // ~450 KB JPEG; the sampler emits ~80–150 KB

function throttled(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 6;
}
const hits = new Map<string, number[]>();

function validFrame(f: unknown): f is FrameInput {
  if (!f || typeof f !== "object") return false;
  const { data, at } = f as Record<string, unknown>;
  return (
    typeof data === "string" &&
    data.length > 0 &&
    data.length <= MAX_BASE64_PER_FRAME &&
    !data.startsWith("data:") &&
    typeof at === "number" &&
    Number.isFinite(at)
  );
}

export async function POST(request: NextRequest) {
  let body: { frames?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON with a frames array." }, { status: 400 });
  }

  const frames = Array.isArray(body.frames) ? body.frames : null;
  if (!frames || frames.length === 0) {
    return NextResponse.json({ error: "Send at least one frame." }, { status: 400 });
  }
  if (frames.length > FRAME_BUDGET.maxFrames) {
    return NextResponse.json(
      { error: `Too many frames — the budget is ${FRAME_BUDGET.maxFrames} per walkthrough.` },
      { status: 400 },
    );
  }
  if (!frames.every(validFrame)) {
    return NextResponse.json({ error: "Each frame needs base64 JPEG data and a time." }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (throttled(ip)) {
    return NextResponse.json(
      { error: "A few too many walkthroughs at once — give it a minute and try again." },
      { status: 429 },
    );
  }

  try {
    const result = await flagFrames(frames);
    return NextResponse.json({ success: true, configured: visionConfigured(), ...result });
  } catch (error: any) {
    console.error("[esp flag] vision pass failed:", error);
    return NextResponse.json(
      { error: `The vision pass didn't come back: ${error.message ?? "unknown error"}` },
      { status: 502 },
    );
  }
}
