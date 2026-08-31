import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Landing from '@/app/etsy-listing-kit/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// jsdom implements neither; the component uses both (#336 feedback behavior).
const scrollIntoView = vi.fn();
let reducedMotion = false;

beforeEach(() => {
  reducedMotion = false;
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((q: string) => ({
    matches: q.includes('prefers-reduced-motion') ? reducedMotion : false,
    media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })));
  URL.createObjectURL = vi.fn(() => 'blob:thumb');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => vi.unstubAllGlobals());

const PREVIEWS = {
  previews: Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, label: `Image ${i + 1}`, dataUrl: 'data:image/jpeg;base64,x' })),
};

function uploadFile(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]')!;
  fireEvent.change(input, { target: { files: [new File([new Uint8Array([1])], 'd.png', { type: 'image/png' })] } });
}

function deferredFetch() {
  let resolve!: (v: unknown) => void;
  const fetchMock = vi.fn(() => new Promise((r) => { resolve = r; }));
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, respond: (ok: boolean, json: unknown) => resolve({ ok, json: async () => json }) };
}

describe('ELK preview feedback (#336)', () => {
  it('shows in-progress state and announces it while generating (1.1, 1.4)', async () => {
    deferredFetch();
    const { container } = render(<Landing />);
    uploadFile(container);
    const cta = screen.getByRole('button', { name: /preview my 6 listing images/i });
    fireEvent.click(cta);

    const building = await screen.findByRole('button', { name: /building your 6 images/i });
    expect(building).toBeDisabled(); // repeat submits blocked
    expect(screen.getByRole('status')).toHaveTextContent(/building your 6 images/i);
  });

  it('scrolls previews into view, focuses the heading, announces ready (1.2, 1.3, 1.4)', async () => {
    const { respond } = deferredFetch();
    const { container } = render(<Landing />);
    uploadFile(container);
    fireEvent.click(screen.getByRole('button', { name: /preview my 6 listing images/i }));
    respond(true, PREVIEWS);

    const heading = await screen.findByRole('heading', { name: /here.s your set/i });
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' }));
    expect(heading).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent(/your 6 preview images are ready/i);
  });

  it('scrolls instantly under prefers-reduced-motion (1.2)', async () => {
    reducedMotion = true;
    const { respond } = deferredFetch();
    const { container } = render(<Landing />);
    uploadFile(container);
    fireEvent.click(screen.getByRole('button', { name: /preview my 6 listing images/i }));
    respond(true, PREVIEWS);

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' }));
  });

  it('failure surfaces the alert and clears the status region (1.4)', async () => {
    const { respond } = deferredFetch();
    const { container } = render(<Landing />);
    uploadFile(container);
    fireEvent.click(screen.getByRole('button', { name: /preview my 6 listing images/i }));
    respond(false, { error: 'Preview failed' });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/preview failed/i);
    expect(screen.getByRole('status')).toHaveTextContent('');
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('regression guard: all 6 previews render with price + what-you-get (1.5)', async () => {
    const { respond } = deferredFetch();
    const { container } = render(<Landing />);
    uploadFile(container);
    fireEvent.click(screen.getByRole('button', { name: /preview my 6 listing images/i }));
    respond(true, PREVIEWS);

    await screen.findByRole('heading', { name: /here.s your set/i });
    expect(container.querySelectorAll('img[src^="data:image"]').length).toBe(6);
    expect(screen.getByRole('button', { name: /pay \$3 & download/i })).toBeInTheDocument();
    expect(screen.getByText(/six full-size photos/i)).toBeInTheDocument();
  });
});
