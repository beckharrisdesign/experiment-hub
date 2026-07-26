import { describe, it, expect, vi, beforeEach } from 'vitest';

const { generatePack } = vi.hoisted(() => ({ generatePack: vi.fn() }));
vi.mock('@/lib/etsy-listing-kit/generator', () => ({ generatePack }));

import { POST } from '@/app/etsy-listing-kit/api/preview/route';

function req(fd: FormData) {
  return { formData: async () => fd } as never;
}
function pngFd() {
  const fd = new FormData();
  fd.append('design', new File([new Uint8Array([1, 2, 3])], 'd.png', { type: 'image/png' }));
  return fd;
}

beforeEach(() => {
  generatePack.mockReset().mockResolvedValue([
    { id: 'flat', label: 'Flat render', clean: Buffer.from('c'), watermarked: Buffer.from('wm') },
    { id: 'framed', label: 'Framed mockup', clean: Buffer.from('c'), watermarked: Buffer.from('wm2') },
  ]);
});

describe('POST /etsy-listing-kit/api/preview', () => {
  it('returns watermarked data URLs (never the clean images)', async () => {
    const res = await POST(req(pngFd()));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.previews).toHaveLength(2);
    expect(json.previews[0]).toMatchObject({ id: 'flat', label: 'Flat render' });
    expect(json.previews[0].dataUrl).toMatch(/^data:image\/jpeg;base64,/);
    // watermarked 'wm' base64 present; clean 'c' must NOT be exposed
    expect(json.previews[0].dataUrl).toContain(Buffer.from('wm').toString('base64'));
  });

  it('rejects unsupported types (415) without generating', async () => {
    const fd = new FormData();
    fd.append('design', new File(['x'], 'a.gif2', { type: 'image/tiff' }));
    const res = await POST(req(fd));
    expect(res.status).toBe(415);
    expect(generatePack).not.toHaveBeenCalled();
  });

  it('rejects a missing file (400)', async () => {
    const res = await POST(req(new FormData()));
    expect(res.status).toBe(400);
  });

  it('returns 422 when generation throws', async () => {
    generatePack.mockRejectedValue(new Error('bad image'));
    const res = await POST(req(pngFd()));
    expect(res.status).toBe(422);
  });
});
