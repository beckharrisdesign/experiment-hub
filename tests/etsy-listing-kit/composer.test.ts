import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildBrief, isTraceable, type BriefInput } from '@/lib/etsy-listing-kit/brief';
import {
  DeterministicComposer,
  HaikuComposer,
  OpenAIComposer,
  composerFromEnv,
  composerConfigured,
  validateKitText,
  TITLE_MAX,
  TAG_MAX,
  TAG_CHAR_MAX,
} from '@/lib/etsy-listing-kit/composer';
import keychain from '@/lib/etsy-listing-kit/fixtures/keychain-4522917501.json';
import floral from '@/lib/etsy-listing-kit/fixtures/floral-4465357735.json';

const keychainBrief = buildBrief(keychain as unknown as BriefInput);
const floralBrief = buildBrief(floral as unknown as BriefInput);
const photos = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ rank: i + 1, context: '' }));

describe('DeterministicComposer (keyless test double)', () => {
  it('produces valid, brief-grounded output for the wording-thin keychain', async () => {
    const text = await new DeterministicComposer().compose({ brief: keychainBrief, photos: photos(2) });
    expect(validateKitText(text, 2)).toHaveLength(0);
    expect(text.suggestedTitle.length).toBeLessThanOrEqual(TITLE_MAX);
    // grounded by construction: the title is assembled from brief entries
    expect(text.suggestedTitle).toContain('Custom engraved pet keychain');
    expect(text.tags.length).toBeLessThanOrEqual(TAG_MAX);
    for (const tag of text.tags) expect(tag.length).toBeLessThanOrEqual(TAG_CHAR_MAX);
    expect(text.altTexts).toHaveLength(2);
  });

  it('prefers the listing’s real tags when they exist', async () => {
    const text = await new DeterministicComposer().compose({ brief: floralBrief, photos: photos(10) });
    expect(text.tags).toContain('floral hoop art');
    for (const tag of text.tags) {
      expect(isTraceable(floralBrief, tag)).toBe(true);
    }
  });
});

describe('composerFromEnv', () => {
  it('returns null without a key — text deliverables go unavailable, never junk', () => {
    expect(composerFromEnv({})).toBeNull();
    expect(composerFromEnv({ ANTHROPIC_API_KEY: '  ', OPENAI_API_KEY: '' })).toBeNull();
    expect(composerConfigured({})).toBe(false);
  });

  it('prefers the OpenAI key — the vault\u2019s one product-completions key (founder, 2026-08-31)', () => {
    expect(composerFromEnv({ OPENAI_API_KEY: 'sk-o' })).toBeInstanceOf(OpenAIComposer);
    expect(composerFromEnv({ OPENAI_API_KEY: 'sk-o', ANTHROPIC_API_KEY: 'sk-a' })).toBeInstanceOf(OpenAIComposer);
    expect(composerConfigured({ OPENAI_API_KEY: 'sk-o' })).toBe(true);
  });

  it('falls back to the Haiku composer when only that key is set', () => {
    expect(composerFromEnv({ ANTHROPIC_API_KEY: 'sk-test' })).toBeInstanceOf(HaikuComposer);
  });
});

describe('OpenAIComposer', () => {
  afterEach(() => vi.unstubAllGlobals());

  const stubChat = (content: string, ok = true, status = 200) =>
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok,
      status,
      json: async () => ({ choices: [{ message: { content } }] }),
    })));

  it('parses and shape-validates the model output', async () => {
    stubChat(JSON.stringify({
      suggestedTitle: 'Custom Engraved Pet Keychain, Made to Order',
      tags: ['pet keychain'],
      altTexts: [{ rank: 1, alt: 'A keychain' }, { rank: 2, alt: 'A keychain on a bag' }],
    }));
    const text = await new OpenAIComposer('sk-test').compose({ brief: keychainBrief, photos: photos(2) });
    expect(validateKitText(text, 2)).toHaveLength(0);
  });

  it('refuses malformed output instead of shipping it', async () => {
    stubChat(JSON.stringify({ suggestedTitle: '', tags: [], altTexts: [] }));
    await expect(
      new OpenAIComposer('sk-test').compose({ brief: keychainBrief, photos: photos(2) }),
    ).rejects.toThrow(/invalid output/);
  });

  it('surfaces API failures as errors, not silent junk', async () => {
    stubChat('', false, 500);
    await expect(
      new OpenAIComposer('sk-test').compose({ brief: keychainBrief, photos: photos(2) }),
    ).rejects.toThrow(/500/);
  });
});

describe('title floor (founder note 2026-08-31: 58/140 was a non-suggestion)', () => {
  afterEach(() => vi.unstubAllGlobals());
  const LONG = 'Custom Engraved Pet Keychain, Personalized Wooden Dog Portrait Charm, Made to Order Gift for Pet Lovers, Handmade Memorial Keyring';
  const SHORT = 'Custom Engraved Pet Keychain Gift';
  const payload = (title: string) => JSON.stringify({
    suggestedTitle: title,
    tags: ['pet keychain'],
    altTexts: [{ rank: 1, alt: 'A keychain' }, { rank: 2, alt: 'On a bag' }],
  });

  it('retries once with a correction when the title comes back short', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url, init: RequestInit) => {
      calls.push(String(init.body));
      return {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: payload(calls.length === 1 ? SHORT : LONG) } }] }),
      };
    }));
    const text = await new OpenAIComposer('sk-test').compose({ brief: keychainBrief, photos: photos(2) });
    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain('must be 120 to 140 characters');
    expect(text.suggestedTitle).toBe(LONG);
  });

  it('refuses a suggestion no fuller than the current title, even after retry', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: payload('Pet keychain') } }] }),
    })));
    await expect(
      new OpenAIComposer('sk-test').compose({ brief: keychainBrief, photos: photos(2) }),
    ).rejects.toThrow(/no fuller than the current title/);
  });
});

describe('HaikuComposer', () => {
  afterEach(() => vi.unstubAllGlobals());

  const stubResponse = (payload: unknown, ok = true, status = 200) =>
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok,
      status,
      json: async () => payload,
    })));

  it('parses and shape-validates the model output', async () => {
    stubResponse({
      content: [{
        type: 'text',
        text: JSON.stringify({
          suggestedTitle: 'Custom Engraved Pet Keychain, Made to Order',
          tags: ['pet keychain'],
          altTexts: [{ rank: 1, alt: 'A keychain' }, { rank: 2, alt: 'A keychain on a bag' }],
        }),
      }],
    });
    const text = await new HaikuComposer('sk-test').compose({ brief: keychainBrief, photos: photos(2) });
    expect(text.tags).toEqual(['pet keychain']);
    expect(validateKitText(text, 2)).toHaveLength(0);
  });

  it('refuses malformed output instead of shipping it', async () => {
    stubResponse({
      content: [{
        type: 'text',
        text: JSON.stringify({ suggestedTitle: '', tags: [], altTexts: [] }),
      }],
    });
    await expect(
      new HaikuComposer('sk-test').compose({ brief: keychainBrief, photos: photos(2) }),
    ).rejects.toThrow(/invalid output/);
  });

  it('surfaces API failures as errors, not silent junk', async () => {
    stubResponse({}, false, 500);
    await expect(
      new HaikuComposer('sk-test').compose({ brief: keychainBrief, photos: photos(2) }),
    ).rejects.toThrow(/500/);
  });
});
