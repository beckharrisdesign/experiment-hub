/**
 * In-memory rate limiter for API routes.
 * Uses fixed-window counting. Per-instance only (not shared across serverless invocations).
 * Suitable for closed alpha; consider Redis/Upstash for production scale.
 */

interface WindowEntry {
  count: number;
  windowStart: number;
}

const windows = new Map<string, WindowEntry>();

const MAX_ENTRIES = 10_000;
const CLEANUP_INTERVAL = 60_000; // prune every 60s
let lastCleanup = Date.now();

function pruneExpired(now: number, windowMs: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL && windows.size < MAX_ENTRIES) return;
  lastCleanup = now;
  for (const [key, entry] of windows.entries()) {
    if (now - entry.windowStart > windowMs) windows.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

/**
 * Check and consume one request from the rate limit.
 * Returns { allowed, remaining, retryAfter? }.
 */
export function rateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const { windowMs, max } = options;
  const now = Date.now();

  pruneExpired(now, windowMs);

  const entry = windows.get(key);
  const inWindow = entry && now - entry.windowStart < windowMs;

  if (!inWindow) {
    windows.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: max - 1 };
  }

  const newCount = entry!.count + 1;
  entry!.count = newCount;

  if (newCount > max) {
    const retryAfter = Math.ceil((entry!.windowStart + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining: max - newCount };
}

/** Get client IP from request headers (Vercel, etc.) */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}
