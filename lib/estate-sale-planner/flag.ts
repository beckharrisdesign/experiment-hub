/**
 * The vision pass — frames in, flagged items out.
 *
 * The response is validated against a zod schema (structured outputs), so the
 * route never forwards free text. The provider follows the key the environment
 * carries — OPENAI_API_KEY first (the hub's synced model key), ANTHROPIC_API_KEY
 * as the alternate, the ELK composer's order. With neither, the fixture set is
 * served and the caller is told, so the demo runs end to end with no keys.
 */

import { z } from "zod";
import fixture from "./fixtures/flags.json";

/**
 * Garage-sale-sized value bands, narrow at the bottom where most of a house
 * sells (founder, 2026-10-27: "in a garage sale $1 and $5 are really big
 * buckets"). Order matters: low to high.
 */
export const BANDS = ["under $1", "$1–$5", "$5–$10", "$10–$25", "$25–$50", "$50–$100", "$100–$250", "$250–$500", "$500–$2,000", "over $2,000"] as const;

/** The five bands used before 2026-10-27. Saved sales and sheets may still carry them; they stay readable. */
export const LEGACY_BANDS = ["under $25", "$25–$100", "$100–$500"] as const;

/**
 * Where the object sits in its frame, normalized 0–1 from the top-left. The
 * device crops the kept frame to this box to show "what it thinks it found";
 * null means the model wasn't sure and the whole frame is shown instead.
 */
export const BoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
});

export const FlaggedItemSchema = z.object({
  name: z.string().min(1).max(80),
  room: z.string().min(1).max(40),
  /** True = Sell list candidate; false = everything else the model noticed. */
  flagged: z.boolean(),
  band: z.enum(BANDS),
  reason: z.string().min(1).max(160),
  confidence: z.enum(["low", "medium", "high"]),
  /** Index into the frames sent, so the UI can show where it was seen. */
  frame: z.number().int().min(0),
  box: BoxSchema.nullable(),
});

export type Box = z.infer<typeof BoxSchema>;

export const FlagResponseSchema = z.object({
  items: z.array(FlaggedItemSchema).max(120),
});

export type FlaggedItem = z.infer<typeof FlaggedItemSchema>;
export type FlagResponse = z.infer<typeof FlagResponseSchema>;

export type VisionProvider = "openai" | "anthropic";

export interface FlagResult extends FlagResponse {
  /** "model" when the vision pass ran; "fixture" when no key was configured. */
  source: "model" | "fixture";
  provider: VisionProvider | "fixture";
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
}

/**
 * What "band" and "confidence" mean, shared by the walkthrough pass and the
 * re-read. Without it the model priced the best example it could find online,
 * in perfect condition (founder, 2026-10-27: "the confidence and price ranges
 * are wildly optimistic").
 */
export const BAND_GUIDE = `"band" is what this object would most likely sell for, used, in the condition you can see, at a local estate sale, garage sale, or Facebook Marketplace: the typical price a buyer actually pays. Not retail, not replacement cost, and not an online asking price for a perfect example. Estate sales get a small fraction of what things cost new, and most things at a garage sale sell for $1 to $10. Put an object at $100 or more only when you can see why a buyer would pay that: solid wood in a known style, sterling, a brand people search for. Put it at $500 or more only when you can identify the maker, model, or artist. "over $2,000" from a photo is almost never right. When you are torn between two bands, choose the lower one.

"confidence" is how sure you are of the band. "high" means you can identify the maker or model and similar ones sell often at a known price. "medium" means the kind of object is clear but the maker is not. "low" means anything less. Use "low" freely; a wrong "high" costs trust.`;

export const SYSTEM_PROMPT = `You help an adult child clearing out a parent's house decide what might be worth selling before a clean-out crew takes everything.

You will see frames sampled from a phone walkthrough. For each distinct object you can identify, return one item. Set "flagged": true only for objects that a local estate-sale company or online resale buyer would plausibly pay for: furniture with recognizable style or maker, art, rugs, instruments, tools, collectibles, jewelry, electronics still in demand, quality cookware. Everyday consumables, worn soft furnishings, and generic décor are not flagged.

${BAND_GUIDE}

Be honest and specific. "reason" is one plain sentence a grieving person can act on, no hedging boilerplate. "room" is a short label for where it was seen. Never invent an object you did not see. Prefer fewer, better items over a long list.

"frame" is the index of the frame the object is clearest in. "box" is where it sits in that frame: x and y are the top-left corner and w and h the size, all as fractions of the frame from 0 to 1. Make the box generous enough to include the whole object. Use null when you cannot place it.`;

/** Which provider the environment can run, or null for fixture mode. */
export function visionProvider(env: Record<string, string | undefined> = process.env): { provider: VisionProvider; apiKey: string } | null {
  const openai = env.OPENAI_API_KEY?.trim();
  if (openai) return { provider: "openai", apiKey: openai };
  const anthropic = env.ANTHROPIC_API_KEY?.trim();
  if (anthropic) return { provider: "anthropic", apiKey: anthropic };
  return null;
}

export function visionConfigured(): boolean {
  return visionProvider() !== null;
}

type Band = (typeof BANDS)[number];
type Confidence = FlaggedItem["confidence"];

/**
 * The most confidence a band can carry when no mark was read. A wide photo
 * shows what kind of thing an object is, not who made it, and past $500 the
 * maker is the price. The prompt asks for this too; the cap holds when the
 * model doesn't listen.
 */
const CEILING_WITHOUT_MARK: Partial<Record<Band, Confidence>> = {
  "$500–$2,000": "medium",
  "over $2,000": "low",
};
const RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

/** Lower confidence to the band's ceiling unless a mark was read. Never raises it or touches the band. */
export function capConfidence<T extends { band: Band; confidence: Confidence }>(item: T, markReading: string | null): T {
  if (markReading?.trim()) return item;
  const ceiling = CEILING_WITHOUT_MARK[item.band];
  if (!ceiling || RANK[item.confidence] <= RANK[ceiling]) return item;
  return { ...item, confidence: ceiling };
}

/**
 * Cut text to `max` characters at a word, with an ellipsis. OpenAI's strict mode can't carry
 * length limits to the model (vision/schema.ts drops them), so a long name or reason is
 * trimmed here rather than failing the whole read (phone test 2026-10-27: every message and
 * re-read after a split came back "unreadable").
 */
export function clipText(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const atWord = cut.lastIndexOf(" ");
  return `${(atWord > max * 0.5 ? cut.slice(0, atWord) : cut).replace(/[\s,;:.\u2014-]+$/, "")}…`;
}

/** Trim the free-text fields of an item-shaped object to their schema limits; anything else passes through. */
export function clipFields<T>(raw: T, limits: Record<string, number>): T {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const out: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  for (const [key, max] of Object.entries(limits)) if (typeof out[key] === "string") out[key] = clipText(out[key] as string, max);
  return out as T;
}

const ITEM_LIMITS = { name: 80, room: 40, reason: 160 };

/** Validate a raw response. Returns null when the shape is wrong; over-long text is trimmed, not rejected. */
export function parseFlagResponse(raw: unknown): FlagResponse | null {
  const items = raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items) ? (raw as { items: unknown[] }).items : null;
  const result = FlagResponseSchema.safeParse(items ? { ...(raw as object), items: items.map((i) => clipFields(i, ITEM_LIMITS)) } : raw);
  return result.success ? result.data : null;
}

export interface KnownItem {
  name: string;
  room: string;
}

/** Appended to the walkthrough prompt when rooms are added to an existing walkthrough. */
export function knownContext(known: KnownItem[] | undefined): string | null {
  if (!known || known.length === 0) return null;
  const lines = known.slice(0, 300).map((k) => `- ${k.name} (${k.room})`);
  return `Already listed from earlier rooms of this house — do not return these again unless what you see is clearly a different object:\n${lines.join("\n")}`;
}

/**
 * Fixture mode. Called with no `known` (tests, the library default) it is the
 * whole sample house. Called with a `known` list — which the route always
 * passes — it grows the demo house room by room, the way the product does:
 * the first pass is the first three rooms, each later pass the next room not
 * yet listed, and nothing once the house is done.
 */
export function fixtureFlags(known?: KnownItem[]): FlagResult {
  const parsed = parseFlagResponse(fixture);
  if (!parsed) throw new Error("estate-sale-planner fixture does not match FlagResponseSchema");
  if (known === undefined) return { ...parsed, source: "fixture", provider: "fixture", model: "fixture" };
  const rooms: string[] = [];
  for (const item of parsed.items) if (!rooms.includes(item.room)) rooms.push(item.room);
  const knownRooms = new Set(known.map((k) => k.room));
  const unseen = rooms.filter((r) => !knownRooms.has(r));
  const pick = knownRooms.size === 0 ? unseen.slice(0, 3) : unseen.slice(0, 1);
  return { items: parsed.items.filter((i) => pick.includes(i.room)), source: "fixture", provider: "fixture", model: "fixture" };
}

export interface FrameInput {
  /** Base64 JPEG, no data: prefix. */
  data: string;
  /** Seconds into the walkthrough (or photo index), for the prompt. */
  at: number;
}

/**
 * Run the vision pass with whichever provider is keyed. Throws on API
 * failure; the route maps that to a 502.
 */
export async function flagFrames(frames: FrameInput[], known?: KnownItem[]): Promise<FlagResult> {
  const chosen = visionProvider();
  if (!chosen) return fixtureFlags(known);
  let result: FlagResult;
  if (chosen.provider === "openai") {
    const { flagWithOpenAI } = await import("./vision/openai");
    result = await flagWithOpenAI(frames, chosen.apiKey, fetch, known);
  } else {
    const { flagWithAnthropic } = await import("./vision/anthropic");
    result = await flagWithAnthropic(frames, chosen.apiKey, known);
  }
  return { ...result, items: result.items.map((item) => capConfidence(item, null)) };
}
