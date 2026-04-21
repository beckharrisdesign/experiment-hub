import { ANTHROPIC_MODELS, AnthropicModel } from "./models";

/**
 * Returns a configured Anthropic SDK client.
 * Requires `@anthropic-ai/sdk` to be installed in the calling experiment.
 *
 * Usage:
 *   import Anthropic from "@anthropic-ai/sdk";
 *   const client = createAnthropicClient(Anthropic);
 */
export function createAnthropicClient<T extends new (opts: object) => unknown>(
  AnthropicClass: T,
  options: { apiKey?: string } = {},
): InstanceType<T> {
  return new AnthropicClass({
    apiKey: options.apiKey ?? process.env.ANTHROPIC_API_KEY,
  }) as InstanceType<T>;
}

/**
 * Returns a configured OpenAI SDK client.
 * Requires `openai` to be installed in the calling experiment.
 */
export function createOpenAIClient<T extends new (opts: object) => unknown>(
  OpenAIClass: T,
  options: { apiKey?: string; baseURL?: string } = {},
): InstanceType<T> {
  return new OpenAIClass({
    apiKey: options.apiKey ?? process.env.OPENAI_API_KEY,
    ...(options.baseURL ? { baseURL: options.baseURL } : {}),
  }) as InstanceType<T>;
}

/** Read the active Anthropic model from env, falling back to Sonnet. */
export function getAnthropicModel(): AnthropicModel {
  const fromEnv = process.env.ANTHROPIC_MODEL as AnthropicModel | undefined;
  const valid = Object.values(ANTHROPIC_MODELS) as AnthropicModel[];
  return fromEnv && valid.includes(fromEnv) ? fromEnv : ANTHROPIC_MODELS.SONNET;
}
