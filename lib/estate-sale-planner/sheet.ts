/**
 * The Sell Sheet — what the family pays for. Pure shapes and validation so the
 * checkout route and the sheet page agree on what a sheet is, testable without
 * Stripe or Supabase.
 */
import { z } from "zod";
import { DETAIL_SHOT, SELL_SHEET } from "./config";
import { BANDS } from "./flag";
import { sellList, type Session } from "./session";

export const SheetItemSchema = z.object({
  name: z.string().min(1).max(80),
  room: z.string().min(1).max(40),
  band: z.enum(BANDS),
  reason: z.string().min(1).max(160),
  confidence: z.enum(["low", "medium", "high"]),
  image: z
    .string()
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/)
    .max(SELL_SHEET.maxImageBytes)
    .optional(),
  /** Detail-shot thumbs (a seam, a stamp) the user added. */
  details: z
    .array(z.string().regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/).max(SELL_SHEET.maxImageBytes))
    .max(DETAIL_SHOT.maxPerItem)
    .optional(),
  /** What the model read off a mark, if anything. */
  markReading: z.string().max(160).nullable().optional(),
  /** What the family knows — provenance in their words. */
  note: z.string().max(500).optional(),
});

export const SheetInputSchema = z.object({
  sessionId: z.string().regex(/^esp_[a-z0-9]+_[a-z0-9]{6}$/),
  walkthroughAt: z.string().datetime({ offset: true }).optional(),
  items: z.array(SheetItemSchema).min(1).max(SELL_SHEET.maxItems),
});

export type SheetItem = z.infer<typeof SheetItemSchema>;
export type SheetInput = z.infer<typeof SheetInputSchema>;

export interface SheetRow {
  id: string;
  session_id: string;
  status: "created" | "checkout_started" | "paid" | "refunded";
  items: SheetItem[];
  item_count: number;
  walkthrough_at: string | null;
  stripe_session_id: string | null;
  stripe_event_id: string | null;
  customer_email: string | null;
  paid_at: string | null;
  created_at: string;
}

/** What the browser sends to checkout: the Sell list, nothing else. */
export function sheetInputFromSession(session: Session): SheetInput {
  return {
    sessionId: session.id,
    walkthroughAt: session.createdAt,
    items: sellList(session).map(({ name, room, band, reason, confidence, image, details, markReading, note }) => ({
      name,
      room,
      band,
      reason,
      confidence,
      ...(image && image.length <= SELL_SHEET.maxImageBytes ? { image } : {}),
      ...(details?.length ? { details: details.filter((d) => d.length <= SELL_SHEET.maxImageBytes).slice(0, DETAIL_SHOT.maxPerItem) } : {}),
      ...(markReading ? { markReading } : {}),
      ...(note?.trim() ? { note: note.trim().slice(0, 500) } : {}),
    })),
  };
}

export function parseSheetInput(raw: unknown): SheetInput | null {
  const result = SheetInputSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function formatPrice(cents: number, currency: string = SELL_SHEET.currency): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}

export const sheetPath = (id: string) => `/estate-sale-planner/sheet/${id}`;
