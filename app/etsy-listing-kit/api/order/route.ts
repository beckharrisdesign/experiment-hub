import { NextRequest, NextResponse } from 'next/server';
import { getOrder, signedOutputUrl } from '../../../../lib/etsy-listing-kit/orders';
import { PACK_ITEMS, DOWNLOAD_TTL_DAYS } from '../../../../lib/etsy-listing-kit/config';

export const runtime = 'nodejs';

/**
 * GET /etsy-listing-kit/api/order?order=<id>
 * Returns order status and — only once fulfilled — short-lived signed download
 * URLs for the 6 clean images. No account: possession of the order id (from the
 * paid success URL / email) is the capability.
 */
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('order');
  if (!orderId) return NextResponse.json({ error: 'Missing order id.' }, { status: 400 });

  let order;
  try { order = await getOrder(orderId); }
  catch { return NextResponse.json({ error: 'Order lookup unavailable.' }, { status: 500 }); }
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

  const status = order.status as string;
  if (status !== 'fulfilled' || !order.output_ref) {
    return NextResponse.json({ status });
  }

  const ttl = DOWNLOAD_TTL_DAYS * 86400;
  const images = await Promise.all(
    PACK_ITEMS.map(async (item) => ({
      id: item.id,
      label: item.label,
      url: await signedOutputUrl(`${orderId}/${item.id}.jpg`, ttl),
    })),
  );
  return NextResponse.json({ status, images });
}
