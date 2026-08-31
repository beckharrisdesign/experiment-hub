import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Landing from '@/app/etsy-listing-kit/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('Landing page — accessibility basics', () => {
  it('renders the promise, price, and named CTA', () => {
    render(<Landing />);
    expect(screen.getByRole('heading', { name: /is your listing actually finished/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check my listing/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose file/i })).toBeInTheDocument();
    expect(screen.getAllByText(/\$3/).length).toBeGreaterThan(0);
  });

  it('keeps the evaluation as the primary above-the-fold action with a kit skip link', () => {
    render(<Landing />);
    expect(screen.getByRole('textbox', { name: /listing url/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /buy the whole kit now/i })).toBeInTheDocument();
  });

  it('uses a native button as the keyboard/AT upload control (no nested interactive)', () => {
    render(<Landing />);
    // exactly one control named "choose file" — a native <button>, keyboard-operable
    const btn = screen.getByRole('button', { name: /choose file/i });
    expect(btn.tagName).toBe('BUTTON');
    expect(screen.getByText(/drop your design here/i)).toBeInTheDocument();
  });

  it('provides a file input scoped to the accepted image types', () => {
    const { container } = render(<Landing />);
    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    expect(input!.getAttribute('accept')).toContain('image/png');
  });
});
