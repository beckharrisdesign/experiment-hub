import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
