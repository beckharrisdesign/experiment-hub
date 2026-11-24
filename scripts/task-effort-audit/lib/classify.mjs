/*
 * Failure classification. Records what is KNOWN about why a run stopped and
 * never claims a root cause the evidence can't support. A stopped reference
 * path is not a confirmed product usability failure.
 */
import { ASSERTIONS } from './config.mjs';

export const FAILURE_CATEGORIES = {
  'product-assertion': 'Product assertion failure',
  'reference-path': 'Reference-path or locator failure',
  authentication: 'Authentication failure',
  environment: 'Environment failure',
  timeout: 'Timeout',
  'safety-stop': 'Safety stop',
  unknown: 'Unknown',
};

/** Thrown by the runner itself when it decides to stop (limits, safety, auth). */
export class StopError extends Error {
  constructor(category, message) {
    super(message);
    this.name = 'StopError';
    this.category = category;
  }
}

const ENV_PATTERNS = /(net::ERR_|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ECONNRESET|has been closed|browserType\.launch|Executable doesn't exist)/i;

const REVIEW = {
  'product-assertion':
    'The expected state was not observed. Review whether the product changed, the assertion is stale, or test data was not as assumed.',
  'reference-path':
    'Not a confirmed product failure. The interface may have changed, the locator may be stale, or the page may have been slow. Review the screenshot and trace before updating the path or filing a product issue.',
  authentication: 'Check the auth profile reference and whether the stored session has expired.',
  environment: 'The property or browser was unreachable. Nothing about the product can be concluded from this run.',
  timeout: 'The run hit its duration limit. Browser time is diagnostic only; this says nothing about human task time.',
  'safety-stop': 'The runner stopped itself to stay within its safety limits. Review the blocked request or limit before rerunning.',
  unknown: 'The cause could not be classified. Review the trace.',
};

/**
 * @param {{ step: any, error: any, remainingMs?: number, stepTimeoutMs?: number }} p
 *   step: the step that failed (or null) · remainingMs: time left before maxDurationMs
 */
export function classifyFailure({ step, error, remainingMs = Infinity, stepTimeoutMs = Infinity }) {
  const message = String(error?.message ?? error).split('\n')[0].slice(0, 400);
  let category;
  if (error instanceof StopError || error?.name === 'StopError') category = error.category;
  else if (ENV_PATTERNS.test(String(error?.message ?? ''))) category = 'environment';
  else if (error?.name === 'TimeoutError' && remainingMs < stepTimeoutMs) category = 'timeout';
  else if (step && (ASSERTIONS.includes(step.do) || step.do === 'httpJson')) category = 'product-assertion';
  else if (step && ['click', 'fill', 'select', 'check', 'uncheck', 'press', 'switchPage', 'read', 'waitFor', 'scroll'].includes(step.do)) {
    category = 'reference-path';
  } else category = 'unknown';

  return {
    category,
    label: FAILURE_CATEGORIES[category],
    stepId: step?.id ?? null,
    observed: message,
    rootCause: 'not established',
    reviewRequired: true,
    reviewNote: REVIEW[category],
  };
}
