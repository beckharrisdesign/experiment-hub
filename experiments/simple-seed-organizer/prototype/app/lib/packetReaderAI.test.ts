import { describe, it, expect } from 'vitest';
import { normalizeAIData } from './packetReaderAI';

// Simulate the raw JSON object GPT returns before normalization.

describe('normalizeAIData', () => {
  describe('string fields', () => {
    it('passes through valid strings', () => {
      const result = normalizeAIData({ name: 'Tomato', variety: 'Black Krim' });
      expect(result.name).toBe('Tomato');
      expect(result.variety).toBe('Black Krim');
    });

    it('converts empty strings to undefined', () => {
      const result = normalizeAIData({ name: '', brand: '' });
      expect(result.name).toBeUndefined();
      expect(result.brand).toBeUndefined();
    });

    it('converts null to undefined', () => {
      const result = normalizeAIData({ name: null, spacing: null });
      expect(result.name).toBeUndefined();
      expect(result.spacing).toBeUndefined();
    });

    it('converts non-string types to undefined', () => {
      const result = normalizeAIData({ name: 42, variety: true });
      expect(result.name).toBeUndefined();
      expect(result.variety).toBeUndefined();
    });

    it('normalizes all string fields', () => {
      const result = normalizeAIData({
        name: 'Basil',
        variety: 'Genovese',
        latinName: 'Ocimum basilicum',
        brand: 'Burpee',
        quantity: '250 seeds',
        daysToGermination: '5-10 days',
        daysToMaturity: '60-90 days',
        plantingDepth: '1/4 inch',
        spacing: '6-12 inches',
        sunRequirement: 'Full sun',
        description: 'Classic Italian basil.',
        plantingInstructions: 'Sow after last frost.',
        summary: 'Great for pesto.',
        additionalNotes: 'Pinch flowers to extend harvest.',
      });
      expect(result.name).toBe('Basil');
      expect(result.latinName).toBe('Ocimum basilicum');
      expect(result.daysToGermination).toBe('5-10 days');
      expect(result.sunRequirement).toBe('Full sun');
      expect(result.additionalNotes).toBe('Pinch flowers to extend harvest.');
    });
  });

  describe('year field', () => {
    it('passes through a numeric year', () => {
      expect(normalizeAIData({ year: 2024 }).year).toBe(2024);
    });

    it('parses a string year', () => {
      expect(normalizeAIData({ year: '2023' }).year).toBe(2023);
    });

    it('converts null to undefined', () => {
      expect(normalizeAIData({ year: null }).year).toBeUndefined();
    });

    it('converts an empty string to NaN (not undefined) — caller should validate', () => {
      // parseInt('') returns NaN; we document this behaviour rather than hide it
      const result = normalizeAIData({ year: '' });
      expect(result.year).toBeNaN();
    });
  });

  describe('confidence', () => {
    it('is always 0.9 regardless of input', () => {
      expect(normalizeAIData({}).confidence).toBe(0.9);
      expect(normalizeAIData({ confidence: 0.1 }).confidence).toBe(0.9);
    });
  });

  describe('rawKeyValuePairs', () => {
    it('parses a valid array', () => {
      const result = normalizeAIData({
        rawKeyValuePairs: [
          { key: 'Lot', value: 'A123', source: 'front' },
          { key: 'Net weight', value: '2g', source: 'back' },
        ],
      });
      expect(result.rawKeyValuePairs).toHaveLength(2);
      expect(result.rawKeyValuePairs![0]).toEqual({ key: 'Lot', value: 'A123', source: 'front' });
      expect(result.rawKeyValuePairs![1]).toEqual({ key: 'Net weight', value: '2g', source: 'back' });
    });

    it('drops unknown source values', () => {
      const result = normalizeAIData({
        rawKeyValuePairs: [{ key: 'X', value: 'Y', source: 'middle' }],
      });
      expect(result.rawKeyValuePairs![0].source).toBeUndefined();
    });

    it('is undefined when the array is empty', () => {
      expect(normalizeAIData({ rawKeyValuePairs: [] }).rawKeyValuePairs).toBeUndefined();
    });

    it('is undefined when the field is absent', () => {
      expect(normalizeAIData({}).rawKeyValuePairs).toBeUndefined();
    });

    it('coerces non-string key/value to strings', () => {
      const result = normalizeAIData({
        rawKeyValuePairs: [{ key: 42, value: true }],
      });
      expect(result.rawKeyValuePairs![0].key).toBe('42');
      expect(result.rawKeyValuePairs![0].value).toBe('true');
    });
  });

  describe('fieldSources', () => {
    it('passes through a valid fieldSources object', () => {
      const sources = { name: 'front', brand: 'back' } as const;
      const result = normalizeAIData({ fieldSources: sources });
      expect(result.fieldSources).toEqual(sources);
    });

    it('is undefined when absent', () => {
      expect(normalizeAIData({}).fieldSources).toBeUndefined();
    });
  });

  describe('realistic GPT response', () => {
    it('handles a full well-formed response', () => {
      const raw = {
        name: 'Marigold',
        variety: 'French Dwarf',
        latinName: 'Tagetes patula',
        brand: 'Baker Creek',
        year: 2024,
        quantity: '100 seeds',
        daysToGermination: '5-7 days',
        daysToMaturity: '50-60 days',
        plantingDepth: '1/4 inch',
        spacing: '6-9 inches',
        sunRequirement: 'Full Sun',
        description: 'Bright orange blooms all season.',
        plantingInstructions: 'Direct sow after last frost.',
        fieldSources: { name: 'front', description: 'back' },
        rawKeyValuePairs: [{ key: 'Lot', value: 'MG24A', source: 'back' }],
      };
      const result = normalizeAIData(raw);
      expect(result.name).toBe('Marigold');
      expect(result.year).toBe(2024);
      expect(result.confidence).toBe(0.9);
      expect(result.fieldSources).toEqual({ name: 'front', description: 'back' });
      expect(result.rawKeyValuePairs).toHaveLength(1);
    });

    it('handles a sparse response with mostly nulls', () => {
      const raw = {
        name: 'Sunflower',
        variety: null,
        brand: null,
        year: null,
        daysToGermination: null,
        rawKeyValuePairs: [],
      };
      const result = normalizeAIData(raw);
      expect(result.name).toBe('Sunflower');
      expect(result.variety).toBeUndefined();
      expect(result.year).toBeUndefined();
      expect(result.rawKeyValuePairs).toBeUndefined();
    });

    it('handles a completely empty response without throwing', () => {
      expect(() => normalizeAIData({})).not.toThrow();
      const result = normalizeAIData({});
      expect(result.confidence).toBe(0.9);
    });
  });
});
