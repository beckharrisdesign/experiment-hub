import { NextRequest, NextResponse } from "next/server";
import { readPhoto, savePhoto, validPhotoKey } from "../../../../lib/estate-sale-planner/sales-db";
import { MAX_PHOTO_BYTES, PHOTO_TYPES, SALE_ID, contextOf, failed, noStore, notFound } from "../../../../lib/estate-sale-planner/sales-route";
import { makeThrottle } from "../../../../lib/estate-sale-planner/throttle";

export const runtime = "nodejs";

/**
 * /estate-sale-planner/api/photos (esp-server-sales design D4, D6)
 *
 * POST form { saleId, key, photo }: store one 1600 px original in the private bucket. The
 * sale must already be saved by this device.
 * GET ?saleId=&key=: the photo's bytes, only for the device that owns it, or 404. Served from
 * this origin, never as a link: the hub's CSP blocks the page from fetching Supabase directly,
 * and nothing that could be shared ever leaves the server.
 */

const throttled = makeThrottle(120, 1200);

function isBlob(v: unknown): v is Blob {
  return !!v && typeof v === "object" && typeof (v as Blob).arrayBuffer === "function" && typeof (v as Blob).size === "number";
}

export async function POST(request: NextRequest) {
  const ctx = await contextOf(request, throttled);
  if ("response" in ctx) return ctx.response;
  if (Number(request.headers.get("content-length") ?? 0) > MAX_PHOTO_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "That photo is too big." }, { status: 413 });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a form with saleId, key and photo." }, { status: 400 });
  }
  const saleId = form.get("saleId");
  const key = form.get("key");
  const photo = form.get("photo");
  if (typeof saleId !== "string" || !SALE_ID.test(saleId) || typeof key !== "string" || !validPhotoKey(saleId, key)) {
    return NextResponse.json({ error: "Send the sale id and the photo's key." }, { status: 400 });
  }
  // Duck-typed: the form's File can come from a different realm than this module's `Blob`.
  if (!isBlob(photo) || !(PHOTO_TYPES as readonly string[]).includes(photo.type) || photo.size === 0 || photo.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "Send one JPEG or PNG under 2 MB." }, { status: 400 });
  }
  try {
    const saved = await savePhoto(ctx.db, { deviceHash: ctx.deviceHash, saleId, key, type: photo.type, data: await photo.arrayBuffer() });
    return saved ? NextResponse.json({ success: true }) : notFound();
  } catch (error: unknown) {
    return failed("save the photo", error);
  }
}

export async function GET(request: NextRequest) {
  const ctx = await contextOf(request, throttled);
  if ("response" in ctx) return ctx.response;
  const saleId = request.nextUrl.searchParams.get("saleId") ?? "";
  const key = request.nextUrl.searchParams.get("key") ?? "";
  if (!SALE_ID.test(saleId) || !validPhotoKey(saleId, key)) return notFound();
  try {
    const photo = await readPhoto(ctx.db, ctx.deviceHash, saleId, key);
    if (!photo) return notFound();
    return new NextResponse(photo.data, { status: 200, headers: { ...noStore, "content-type": photo.type } });
  } catch (error: unknown) {
    return failed("load the photo", error);
  }
}
