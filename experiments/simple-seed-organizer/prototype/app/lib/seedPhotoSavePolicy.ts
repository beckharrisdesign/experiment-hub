/**
 * Pure helpers for deciding when packet photos must be re-uploaded vs reused.
 * Keeps https display URLs off fetch() (CORS / private bucket issues).
 */

/** True when the image source is local blob or legacy data URL (safe for fetch + upload). */
export function needsLocalPhotoUpload(imageUrl: string | null | undefined): boolean {
  return (
    !!imageUrl &&
    (imageUrl.startsWith("blob:") || imageUrl.startsWith("data:"))
  );
}
