import { NextResponse } from 'next/server';
import { getSource } from '@/lib/generative-sandbox/storage';
import { renderStack } from '@/lib/generative-sandbox/render';
import type { StackEntry } from '@/lib/generative-sandbox/stack';

export const runtime = 'nodejs';

interface Body {
  sourceRef?: unknown;
  stack?: unknown;
  preview?: unknown;
}

function parseStack(raw: unknown): StackEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const e = entry as Record<string, unknown>;
    if (typeof e.module !== 'string') return [];
    return [{
      uid: typeof e.uid === 'string' ? e.uid : e.module,
      module: e.module,
      enabled: e.enabled !== false,
      params: (e.params && typeof e.params === 'object' ? e.params : {}) as Record<string, number>,
    }];
  });
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  if (typeof body.sourceRef !== 'string') {
    return NextResponse.json({ error: 'sourceRef required' }, { status: 400 });
  }

  try {
    const source = await getSource(body.sourceRef);
    const png = await renderStack(source, parseStack(body.stack), { preview: body.preview !== false });
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        // Every render is a fresh composition; a cached one would show the
        // previous stack after a reorder.
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'render failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
