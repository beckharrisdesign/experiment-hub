import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  getSeedPillClasses,
  getSeedPillIconClasses,
  SeedPill,
} from './SeedPill';

describe('getSeedPillClasses', () => {
  it('matches the plain filter pill styling from Figma', () => {
    const classes = getSeedPillClasses({
      variant: 'filter-badge-icon',
      interactive: true,
    });

    expect(classes).toContain('min-h-[34px]');
    expect(classes).toContain('border border-[#e5e7eb]');
    expect(classes).toContain('bg-white');
    expect(classes).toContain('hover:border-[#16a34a]');
  });

  it('adds a distinct disabled state for selected filters', () => {
    const classes = getSeedPillClasses({
      variant: 'filter-selected',
      disabled: true,
      interactive: true,
    });

    expect(classes).toContain('bg-[#86efac]');
    expect(classes).toContain('cursor-not-allowed');
    expect(classes).not.toContain('hover:bg-[#15803d]');
  });

  it('supports badge tones for non-filter variants', () => {
    const classes = getSeedPillClasses({
      variant: 'badge',
      tone: 'warning',
    });

    expect(classes).toContain('bg-[#fff7ed]');
    expect(classes).toContain('text-[#d97706]');
  });
});

describe('getSeedPillIconClasses', () => {
  it('uses the larger icon sizing for the default icon-only variant', () => {
    const classes = getSeedPillIconClasses('default');

    expect(classes).toContain('size-6');
  });
});

describe('SeedPill', () => {
  it('renders trailing icon swaps after the label', () => {
    const markup = renderToStaticMarkup(
      createElement(
        SeedPill,
        {
          as: 'span',
          variant: 'filter-badge-icon',
          iconPlacement: 'trailing',
          icon: createElement(
            'svg',
            { 'data-icon': 'sprout', viewBox: '0 0 16 16' },
            createElement('path', { d: 'M0 0h16v16H0z' }),
          ),
        },
        'Use first',
      ),
    );

    expect(markup).toContain('Use first');
    expect(markup.indexOf('Use first')).toBeLessThan(
      markup.indexOf('data-icon="sprout"'),
    );
  });

  it('defaults button pills to type button', () => {
    const markup = renderToStaticMarkup(
      createElement(SeedPill, { variant: 'filter-plain' }, 'All'),
    );

    expect(markup).toContain('type="button"');
  });
});
