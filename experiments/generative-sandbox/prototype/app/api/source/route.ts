import { NextResponse } from 'next/server';
import { putSource } from '@/lib/storage';
import { MAX_BYTES, isAcceptedMime, mimeRejectionMessage } from '@/lib/ingest';

export const runtime = 'nodejs';

/**
 * Upload once. Everything afterwards sends parameters and this reference —
 * never the file again (specs/transform-module-stack, requirement 1).
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no file provided' }, { status: 400 });
  }
  if (!isAcceptedMime(file.type)) {
    return NextResponse.json({ error: mimeRejectionMessage(file.type) }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file too large (25 MB max)' }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const sourceRef = await putSource(bytes, file.type);
  return NextResponse.json({ sourceRef });
}
