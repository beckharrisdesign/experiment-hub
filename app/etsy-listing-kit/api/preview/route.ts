import { NextRequest, NextResponse } from 'next/server';
import { generatePack } from '../../../../lib/etsy-listing-kit/generator';
import { UPLOAD } from '../../../../lib/etsy-listing-kit/config';

// sharp requires the Node.js runtime (not edge).
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /etsy-listing-kit/api/preview
 * Accepts one design file (multipart), returns 6 WATERMARKED preview images
 * as data URLs. Clean (un-watermarked) images are never returned here — they
 * are gated behind payment + webhook fulfillment (later task).
 */
export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected a file upload.' }, { status: 400 });
  }
  const file = form.get('design');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No design file provided.' }, { status: 400 });
  }
  // Server-side re-validation (never trust the client).
  if (!(UPLOAD.acceptedMime as readonly string[]).includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type — use PNG, JPG, or SVG.' }, { status: 415 });
  }
  if (file.size > UPLOAD.maxBytes) {
    return NextResponse.json({ error: 'File too large.' }, { status: 413 });
  }

  try {
    const input = Buffer.from(await file.arrayBuffer());
    const pack = await generatePack(input);
    const previews = pack.map((p) => ({
      id: p.id,
      label: p.label,
      dataUrl: `data:image/jpeg;base64,${p.watermarked.toString('base64')}`,
    }));
    return NextResponse.json({ previews });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not process that image.';
    return NextResponse.json({ error: `We couldn’t read that design — try a different file. (${message})` }, { status: 422 });
  }
}
