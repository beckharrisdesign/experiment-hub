/**
 * Shared upload validation — one rule set for the client (friendly messages)
 * and the server routes (re-validate, never trust the client). Unit-tested.
 */
import { UPLOAD } from './config';

export interface UploadCandidate { type: string; size: number; }

/** Returns a human-readable error, or null if the file is acceptable. */
export function validateUpload(file: UploadCandidate): string | null {
  if (!(UPLOAD.acceptedMime as readonly string[]).includes(file.type)) {
    return 'That file type isn’t supported — please use a PNG, JPG, or SVG.';
  }
  if (file.size > UPLOAD.maxBytes) {
    const mb = Math.round(UPLOAD.maxBytes / (1024 * 1024));
    return `That file is a bit big — please keep it under ${mb} MB.`;
  }
  return null;
}

export const uploadMaxMb = Math.round(UPLOAD.maxBytes / (1024 * 1024));
