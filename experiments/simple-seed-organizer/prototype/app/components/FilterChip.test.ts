import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FilterChip, getFilterChipClasses } from './FilterChip';

describe('getFilterChipClasses', () => {
  it('returns plain classes for default variant', () => {
    const classes = getFilterChipClasses({ variant: 'plain', selected: false, disabled: false, hasIcon: false });
    expect(classes).toContain('bg-white');
    expect(classes).toContain('border-[#e5e7eb]');
    expect(classes).toContain('text-[#6a7282]');
  });

  it('returns selected classes for selected chips', () => {
    const classes = getFilterChipClasses({ variant: 'plain', selected: true, disabled: false, hasIcon: true });
    expect(classes).toContain('bg-[#16a34a]');
    expect(classes).toContain('text-white');
  });

  it('returns badge classes for badge variant', () => {
    const classes = getFilterChipClasses({ variant: 'badge', selected: false, disabled: false, hasIcon: false });
    expect(classes).toContain('bg-[#fff7ed]');
    expect(classes).toContain('text-[#f54900]');
  });

  it('adds disabled styles when chip is disabled', () => {
    const classes = getFilterChipClasses({ variant: 'plain', selected: false, disabled: true, hasIcon: false });
    expect(classes).toContain('opacity-50');
    expect(classes).toContain('cursor-not-allowed');
  });
});

describe('FilterChip', () => {
  it('supports icon instance swapping', () => {
    const clockMarkup = renderToStaticMarkup(
      React.createElement(FilterChip, {
        label: 'Use First',
        icon: React.createElement('span', { 'data-icon': 'clock' }),
      })
    );
    const leafMarkup = renderToStaticMarkup(
      React.createElement(FilterChip, {
        label: 'Use First',
        icon: React.createElement('span', { 'data-icon': 'leaf' }),
      })
    );

    expect(clockMarkup).toContain('data-icon="clock"');
    expect(leafMarkup).toContain('data-icon="leaf"');
  });

  it('renders disabled state on the button element', () => {
    const markup = renderToStaticMarkup(
      React.createElement(FilterChip, { label: 'Vegetables', disabled: true })
    );
    expect(markup).toContain('disabled=""');
  });
});
