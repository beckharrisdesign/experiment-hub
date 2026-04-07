import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FilterBar } from './FilterBar';

describe('FilterBar', () => {
  it('marks configured filter types as disabled', () => {
    const markup = renderToStaticMarkup(
      React.createElement(FilterBar, {
        activeType: 'all',
        onTypeChange: vi.fn(),
        disabledTypes: ['use-first'],
      })
    );

    // Ensure at least one disabled button is present.
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Use First');
  });

  it('supports icon instance overrides for filters', () => {
    const markup = renderToStaticMarkup(
      React.createElement(FilterBar, {
        activeType: 'all',
        onTypeChange: vi.fn(),
        iconOverrides: {
          'use-first': React.createElement('span', { 'data-icon': 'seedling' }),
        },
      })
    );

    expect(markup).toContain('data-icon="seedling"');
  });
});
