/**
 * Kit text composer — suggested title, 13 tags, per-photo alt text
 * (design decision 30; spec: "Text deliverables are grounded generation").
 *
 * The composer is an interface so the pipeline is testable without a key:
 * - DeterministicComposer: test double. Assembles output purely from the
 *   brief, so provenance assertions hold by construction. Never production.
 * - HaikuComposer: one small Claude call, grounded strictly in the brief and
 *   photo alt context; output is shape-validated before it may ship.
 * - composerFromEnv(): Haiku when ANTHROPIC_API_KEY is set, otherwise null —
 *   fulfillment then marks the text deliverables UNAVAILABLE (kit still ships
 *   images + template; we never ship junk to look complete).
 */

import type { ListingBrief } from './brief';

export interface ComposePhoto {
  rank: number;
  /** What the pipeline knows about the photo (existing alt text, scene label). */
  context: string;
}

export interface ComposeInput {
  brief: ListingBrief;
  photos: ComposePhoto[];
}

export interface KitText {
  suggestedTitle: string; // ≤ 140 chars
  tags: string[]; // ≤ 13, each ≤ 20 chars
  altTexts: { rank: number; alt: string }[]; // one per photo
}

export interface Composer {
  compose(input: ComposeInput): Promise<KitText>;
}

export const TITLE_MAX = 140;
export const TAG_MAX = 13;
export const TAG_CHAR_MAX = 20;

/** Shape gate both composers pass through — malformed output must not ship. */
export function validateKitText(text: KitText, photoCount: number): string[] {
  const problems: string[] = [];
  if (!text.suggestedTitle.trim()) problems.push('empty title');
  if (text.suggestedTitle.length > TITLE_MAX) problems.push(`title over ${TITLE_MAX} chars`);
  if (text.tags.length > TAG_MAX) problems.push(`more than ${TAG_MAX} tags`);
  if (text.tags.some((t) => t.length > TAG_CHAR_MAX)) problems.push(`tag over ${TAG_CHAR_MAX} chars`);
  if (text.tags.some((t) => !t.trim())) problems.push('empty tag');
  if (text.altTexts.length !== photoCount) problems.push('alt text count != photo count');
  if (text.altTexts.some((a) => !a.alt.trim())) problems.push('empty alt text');
  return problems;
}

// ---------------------------------------------------------------------------
// Deterministic composer (tests + fixtures only)
// ---------------------------------------------------------------------------

export class DeterministicComposer implements Composer {
  async compose({ brief, photos }: ComposeInput): Promise<KitText> {
    const parts = [brief.what.text, ...brief.phrases.map((p) => p.text), ...brief.facts.map((f) => f.text)];
    let title = '';
    for (const part of parts) {
      const next = title ? `${title}, ${part}` : part;
      if (next.length > TITLE_MAX) break;
      title = next;
    }

    const tagSources = brief.phrases.filter((p) => p.source === 'tag').map((p) => p.text);
    const fromTitle = brief.what.text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2);
    const bigrams = fromTitle.slice(0, -1).map((w, i) => `${w} ${fromTitle[i + 1]}`);
    const tags = [...new Set([...tagSources, ...bigrams])]
      .filter((t) => t.length <= TAG_CHAR_MAX)
      .slice(0, TAG_MAX);

    const fact = brief.facts[0]?.text;
    const altTexts = photos.map((p) => ({
      rank: p.rank,
      alt: [p.context || `Photo ${p.rank} of ${brief.what.text}`, fact].filter(Boolean).join(' — '),
    }));
    return { suggestedTitle: title, tags, altTexts };
  }
}

// ---------------------------------------------------------------------------
// Haiku composer (production)
// ---------------------------------------------------------------------------

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM = `You write Etsy listing text. You are given a LISTING BRIEF extracted verbatim from a real listing. Ground every word in it: never claim a material, size, quality, or feature the brief does not state. Respond with ONLY a JSON object: {"suggestedTitle": string (<=140 chars, keyword-rich, natural), "tags": string[] (exactly up to 13, each <=20 chars, lowercase), "altTexts": [{"rank": number, "alt": string}] (one per photo, describing what the photo context says is pictured)}.`;

export class HaikuComposer implements Composer {
  constructor(private apiKey: string) {}

  async compose(input: ComposeInput): Promise<KitText> {
    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        messages: [{
          role: 'user',
          content: `LISTING BRIEF:\n${JSON.stringify(input.brief, null, 2)}\n\nPHOTOS:\n${JSON.stringify(input.photos)}`,
        }],
      }),
    });
    if (!response.ok) throw new Error(`composer: Anthropic API ${response.status}`);
    const body = (await response.json()) as { content?: { type: string; text?: string }[] };
    const textBlock = body.content?.find((c) => c.type === 'text')?.text ?? '';
    const jsonMatch = textBlock.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('composer: no JSON in model output');
    const parsed = JSON.parse(jsonMatch[0]) as KitText;
    const problems = validateKitText(parsed, input.photos.length);
    if (problems.length) throw new Error(`composer: invalid output — ${problems.join('; ')}`);
    return parsed;
  }
}

/**
 * Production selection. Null means "no composer": fulfillment ships the kit
 * without text deliverables and marks them unavailable (design decision 30) —
 * the DeterministicComposer is deliberately NOT the fallback here.
 */
export function composerFromEnv(env: Record<string, string | undefined> = process.env): Composer | null {
  const key = env.ANTHROPIC_API_KEY?.trim();
  return key ? new HaikuComposer(key) : null;
}
