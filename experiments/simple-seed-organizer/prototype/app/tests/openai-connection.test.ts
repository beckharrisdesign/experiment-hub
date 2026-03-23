import { describe, it, expect } from 'vitest';

/**
 * Live check: verifies OPENAI_API_KEY is set and the API responds.
 * Runs in CI on PRs to main (requires the OPENAI_API_KEY secret).
 * Run locally with: npm run test:live
 */
describe('OpenAI API', () => {
  it('OPENAI_API_KEY is set', () => {
    expect(
      process.env.OPENAI_API_KEY,
      'Add OPENAI_API_KEY to your .env.local file or GitHub secrets'
    ).toBeTruthy();
  });

  it('responds to a chat completion request', async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');

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
      `OpenAI returned ${res.status} — check your key is valid and has credits.\n${text}`
    ).toBe(true);

    const data = JSON.parse(text);
    expect(data.choices?.[0]?.message?.content).toBeTruthy();
  }, 15_000);
});
