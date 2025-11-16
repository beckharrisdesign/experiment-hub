import OpenAI from 'openai';

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Lazy initialization - only create client when needed
let openaiInstance: OpenAI | null = null;

function getOpenAI() {
  if (!openaiInstance) {
    openaiInstance = getOpenAIClient();
  }
  return openaiInstance;
}

// Export a proxy that only initializes when accessed
export const openai = {
  get chat() {
    return getOpenAI().chat;
  },
} as OpenAI;

export async function generateContent(prompt: string, systemPrompt?: string): Promise<string> {
  // Check for API key before attempting to use OpenAI
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables. OpenAI integration is not available.');
  }
  
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      { role: 'user' as const, content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content || '';
}

