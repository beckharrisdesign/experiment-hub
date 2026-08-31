import { NextRequest, NextResponse } from 'next/server';
import { getOrder, downloadOutput } from '../../../../lib/etsy-listing-kit/orders';
import { makeZip } from '../../../../lib/etsy-listing-kit/zip';
import { PACK_ITEMS } from '../../../../lib/etsy-listing-kit/config';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /etsy-listing-kit/api/download?order=<id>
 * Streams all 6 clean images as a single .zip. Only for a fulfilled order;
 * possession of the order id (from the paid success URL / email) is the gate.
 */
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('order');
  if (!orderId) return NextResponse.json({ error: 'Missing order id.' }, { status: 400 });

  let order;
  try { order = await getOrder(orderId); }
  catch { return NextResponse.json({ error: 'Lookup unavailable.' }, { status: 500 }); }
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (order.status !== 'fulfilled') return NextResponse.json({ error: 'Not ready yet.' }, { status: 409 });

  try {
    // Listing kits carry a manifest (variable scene set + template + text);
    // upload-era orders fall back to the fixed six-pack listing.
    let files: { name: string; path: string }[];
    let kitTextEntry: { name: string; data: Buffer } | null = null;
    try {
      const manifest = JSON.parse((await downloadOutput(`${orderId}/manifest.json`)).toString());
      files = [...manifest.images, manifest.template].map((i: { file: string }) => ({ name: i.file, path: `${orderId}/${i.file}` }));
      if (manifest.kitText) {
        const t = manifest.kitText;
        const text = [
          `SUGGESTED TITLE\n${t.suggestedTitle}`,
          `TAGS\n${t.tags.join(', ')}`,
          `ALT TEXT\n${t.altTexts.map((a: { rank: number; alt: string }) => `${a.rank}. ${a.alt}`).join('\n')}`,
        ].join('\n\n');
        kitTextEntry = { name: 'title-tags-alt-text.txt', data: Buffer.from(text) };
      }
    } catch {
      files = PACK_ITEMS.map((item) => ({ name: `${item.id}.jpg`, path: `${orderId}/${item.id}.jpg` }));
    }
    const entries = await Promise.all(
      files.map(async (f) => ({ name: f.name, data: await downloadOutput(f.path) })),
    );
    if (kitTextEntry) entries.push(kitTextEntry);
    const zip = makeZip(entries);
    return new NextResponse(new Uint8Array(zip), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="etsy-listing-kit-${orderId.slice(0, 8)}.zip"`,
        'Content-Length': String(zip.length),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not build your download.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
