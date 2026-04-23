/**
 * Canonical model identifiers. Update here when Anthropic/OpenAI release new models —
 * experiments import from this file rather than hardcoding strings.
 */

export const ANTHROPIC_MODELS = {
  /** Best reasoning and instruction-following. Use for complex multi-step tasks. */
  OPUS: "claude-opus-4-7",
  /** Best balance of speed and capability. Default for most experiments. */
  SONNET: "claude-sonnet-4-6",
  /** Fastest and most cost-efficient. Use for high-volume, simple tasks. */
  HAIKU: "claude-haiku-4-5-20251001",
} as const;

export const OPENAI_MODELS = {
  /** Highest capability OpenAI model. */
  GPT4O: "gpt-4o",
  /** Cost-efficient with strong reasoning. */
  GPT4O_MINI: "gpt-4o-mini",
  /** Latest reasoning model. */
  O3_MINI: "o3-mini",
} as const;

export type AnthropicModel =
  (typeof ANTHROPIC_MODELS)[keyof typeof ANTHROPIC_MODELS];
export type OpenAIModel = (typeof OPENAI_MODELS)[keyof typeof OPENAI_MODELS];

/** Approximate context window sizes in tokens */
export const CONTEXT_WINDOWS: Record<AnthropicModel | OpenAIModel, number> = {
  [ANTHROPIC_MODELS.OPUS]: 200_000,
  [ANTHROPIC_MODELS.SONNET]: 200_000,
  [ANTHROPIC_MODELS.HAIKU]: 200_000,
  [OPENAI_MODELS.GPT4O]: 128_000,
  [OPENAI_MODELS.GPT4O_MINI]: 128_000,
  [OPENAI_MODELS.O3_MINI]: 200_000,
};

/**
 * Approximate cost in USD per 1M tokens (input / output).
 * Update when pricing changes. Used for experiment cost estimation only.
 */
export const COST_PER_MILLION_TOKENS: Record<
  AnthropicModel | OpenAIModel,
  { input: number; output: number }
> = {
  [ANTHROPIC_MODELS.OPUS]: { input: 15, output: 75 },
  [ANTHROPIC_MODELS.SONNET]: { input: 3, output: 15 },
  [ANTHROPIC_MODELS.HAIKU]: { input: 0.8, output: 4 },
  [OPENAI_MODELS.GPT4O]: { input: 2.5, output: 10 },
  [OPENAI_MODELS.GPT4O_MINI]: { input: 0.15, output: 0.6 },
  [OPENAI_MODELS.O3_MINI]: { input: 1.1, output: 4.4 },
};

/** Estimate cost in USD for a given number of input/output tokens */
export function estimateCost(
  model: AnthropicModel | OpenAIModel,
  inputTokens: number,
  outputTokens: number,
): number {
  const { input, output } = COST_PER_MILLION_TOKENS[model];
  return (inputTokens * input + outputTokens * output) / 1_000_000;
}
