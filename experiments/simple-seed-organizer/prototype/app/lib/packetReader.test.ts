import { describe, it, expect } from 'vitest';
import { parsePacketText } from './packetReader';

// ─── fixtures ────────────────────────────────────────────────────────────────

const BURPEE_TOMATO = `
BURPEE
TOMATO
CHERRY TOMATO
Packed for 2024

30 Seeds

Days to Germination: 10-20 days
Days to Maturity: 70-80 days

Planting Depth: 1/4 inch
Spacing: 12-18 inches apart

Full Sun

Plant after last frost date.
Start indoors 6-8 weeks before last frost.
`;

const MINIMAL = `
Sunflower
`;

const BAKER_CREEK_MARIGOLD = `
Baker Creek Heirloom Seeds
African Marigold
Tagetes erecta
Packed for 2023
50 seeds
Days to Germination: 5-14 days
Days to Maturity: 50-60 days
Planting Depth: 1/4 inch
Spacing: 12-18 inches
Full Sun
`;

// ─── tests ───────────────────────────────────────────────────────────────────

describe('parsePacketText', () => {
  describe('year extraction', () => {
    it('extracts the packed year', () => {
      const result = parsePacketText(BURPEE_TOMATO);
      expect(result.year).toBe(2024);
    });

    it('extracts year from Baker Creek packet', () => {
      const result = parsePacketText(BAKER_CREEK_MARIGOLD);
      expect(result.year).toBe(2023);
    });
  });

  describe('quantity extraction', () => {
    it('extracts seed count', () => {
      const result = parsePacketText(BURPEE_TOMATO);
      expect(result.quantity).toBeTruthy();
      expect(result.quantity).toMatch(/30/);
    });
  });

  describe('days to germination', () => {
    it('extracts a range', () => {
      const result = parsePacketText(BURPEE_TOMATO);
      expect(result.daysToGermination).toBe('10-20');
    });

    it('extracts germination range from Baker Creek packet', () => {
      const result = parsePacketText(BAKER_CREEK_MARIGOLD);
      expect(result.daysToGermination).toBe('5-14');
    });
  });

  describe('days to maturity', () => {
    it('extracts a range', () => {
      const result = parsePacketText(BURPEE_TOMATO);
      expect(result.daysToMaturity).toBe('70-80');
    });
  });

  describe('planting depth', () => {
    it('extracts fractional depth', () => {
      const result = parsePacketText(BURPEE_TOMATO);
      expect(result.plantingDepth).toBeTruthy();
      expect(result.plantingDepth).toMatch(/1\/4/);
    });
  });

  describe('spacing', () => {
    it('extracts a range in inches', () => {
      const result = parsePacketText(BURPEE_TOMATO);
      expect(result.spacing).toBeTruthy();
      expect(result.spacing).toMatch(/12/);
    });
  });

  describe('sun requirement', () => {
    it('normalises "Full Sun" to full-sun', () => {
      const result = parsePacketText(BURPEE_TOMATO);
      expect(result.sunRequirement).toBe('full-sun');
    });

    it('normalises "Partial Shade" to partial-shade', () => {
      const result = parsePacketText('Lettuce\nPartial Shade\n14 seeds\n');
      expect(result.sunRequirement).toBe('partial-shade');
    });

    it('normalises "Full Shade" to full-shade', () => {
      const result = parsePacketText('Fern\nFull Shade\n');
      expect(result.sunRequirement).toBe('full-shade');
    });
  });

  describe('seed name extraction', () => {
    it('extracts a known seed type', () => {
      const result = parsePacketText(BURPEE_TOMATO);
      expect(result.name?.toLowerCase()).toContain('tomato');
    });

    it('returns something for minimal text', () => {
      const result = parsePacketText(MINIMAL);
      // Should extract "Sunflower" as a name or variety — just not crash
      expect(result).toBeDefined();
    });
  });

  describe('brand extraction', () => {
    it('extracts Baker Creek brand', () => {
      const result = parsePacketText(BAKER_CREEK_MARIGOLD);
      expect(result.brand).toBe('Baker Creek');
    });
  });

  describe('empty / noise input', () => {
    it('returns an empty object for blank text', () => {
      const result = parsePacketText('');
      expect(result.year).toBeUndefined();
      expect(result.daysToGermination).toBeUndefined();
      expect(result.daysToMaturity).toBeUndefined();
    });

    it('does not throw on noise-only input', () => {
      expect(() => parsePacketText('!!! ??? ### $$$')).not.toThrow();
    });
  });
});
