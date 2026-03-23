import { describe, it, expect, beforeAll } from 'vitest';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars for local dev (.env.local takes priority over .env)
beforeAll(() => {
  dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
});

describe('OpenAI API connection', () => {
  it('OPENAI_API_KEY is set', () => {
    expect(
      process.env.OPENAI_API_KEY,
      'Add OPENAI_API_KEY to your .env.local file'
    ).toBeTruthy();
  });

  it('can reach the OpenAI API and get a response', async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not set — add it as a GitHub repository secret');
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
        max_tokens: 5,
        temperature: 0,
      }),
    });

    const text = await res.text();
    expect(
      res.ok,
      `OpenAI API returned ${res.status} — check your API key is valid and has credits.\n${text}`
    ).toBe(true);

    const data = JSON.parse(text);
    expect(data.choices?.[0]?.message?.content).toBeTruthy();
  }, 15_000); // 15 s timeout for the network round-trip
});
