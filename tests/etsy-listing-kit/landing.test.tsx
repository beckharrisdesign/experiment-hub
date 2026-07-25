import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Landing from '@/app/etsy-listing-kit/page';

describe('Landing page — accessibility basics', () => {
  it('renders the promise, price, and named CTA', () => {
    render(<Landing />);
    expect(screen.getByRole('heading', { name: /you made the design/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose file/i })).toBeInTheDocument();
    expect(screen.getAllByText(/\$3/).length).toBeGreaterThan(0);
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
