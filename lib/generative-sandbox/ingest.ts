/** Upload validation, ported from photo-filters-banner's ingest.ts. */
export const ACCEPTED_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AcceptedMime = (typeof ACCEPTED_MIMES)[number];

/** 25 MB. The browser no longer decodes the file, so this guards upload cost, not render cost. */
export const MAX_BYTES = 25 * 1024 * 1024;

export function isAcceptedMime(type: string): type is AcceptedMime {
  return (ACCEPTED_MIMES as readonly string[]).includes(type);
}

export function mimeRejectionMessage(type: string): string {
  return `Unsupported file type (“${type || 'unknown'}”). Use JPEG, PNG, or WebP.`;
}
