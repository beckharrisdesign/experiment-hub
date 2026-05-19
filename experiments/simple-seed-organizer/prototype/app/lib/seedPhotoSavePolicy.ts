/**
 * Pure helpers for deciding when packet photos must be re-uploaded vs reused.
 * Keeps https display URLs off fetch() (CORS / private bucket issues).
 */

/**
 * True when the image source is local blob or legacy data URL (safe for fetch + upload).
 * When true, narrows `imageUrl` to `string` so `fetch(imageUrl)` type-checks.
 */
export function needsLocalPhotoUpload(
  imageUrl: string | null | undefined,
): imageUrl is string {
  return (
    !!imageUrl &&
    (imageUrl.startsWith("blob:") || imageUrl.startsWith("data:"))
  );
}
