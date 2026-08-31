import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Result from '@/app/etsy-listing-kit/result/page';

// The result page polls its order API on mount; this suite only cares about the
// header, so a never-resolving fetch keeps it in the "putting your set together"
// state without any Supabase/Stripe wiring.
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('order=3f241132-da83-44b7-b9a9-d6d9e77359b8'),
}));

describe('Result page header — #360 route back to the start', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  });

  // A never-resolving fetch is especially bad to leak — restore it, matching
  // preview-feedback.test.tsx and email.test.ts.
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exposes the wordmark as a link to the landing page', () => {
    render(<Result />);
    const home = screen.getByRole('link', { name: /etsy listing kit/i });
    expect(home).toHaveAttribute('href', '/etsy-listing-kit');
  });

  it('keeps the order reference visible alongside it', () => {
    render(<Result />);
    expect(screen.getByText(/order #3f241132/i)).toBeInTheDocument();
  });
});

describe('Result page — #361 make-another CTA', () => {
  // The CTA only exists once the order is fulfilled AND images have arrived, so
  // this suite answers the order API with a delivered order rather than hanging.
  const fulfilled = {
    status: 'fulfilled',
    images: [
      { id: 'flat', label: 'Hoop on linen', url: 'https://example.test/flat.jpg' },
      { id: 'sewn', label: 'Stitched preview', url: 'https://example.test/sewn.jpg' },
    ],
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(fulfilled) }),
    ));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers a route to start a new set once the order is delivered', async () => {
    render(<Result />);
    const cta = await screen.findByRole('link', { name: /check another listing/i });
    expect(cta).toHaveAttribute('href', '/etsy-listing-kit');
    expect(screen.getByText(/got another listing\?/i)).toBeInTheDocument();
  });

  it('keeps the paid download as the primary action', async () => {
    render(<Result />);
    // Both routes exist, but the zip download is the one the buyer paid for —
    // if this ever regresses to a single CTA, the wrong one must not survive.
    const download = await screen.findByRole('link', { name: /download everything/i });
    expect(download).toHaveAttribute('href', expect.stringContaining('/api/download'));
  });

  it('does not show the CTA before the order is delivered', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'processing' }) }),
    ));
    render(<Result />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /putting your set together/i })).toBeInTheDocument(),
    );
    expect(screen.queryByRole('link', { name: /check another listing/i })).toBeNull();
  });
});
