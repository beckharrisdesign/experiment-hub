import { Badge } from "@beckharrisdesign/mvds";

/**
 * The bar across the top of every PDF Organizer view, in every state.
 *
 * Edits save as they are made, so going back to the dashboard from anywhere
 * loses nothing: the app name is always the way home. It is a link, not a
 * heading, so each view keeps its own h1. `drive` is null when signed out,
 * so the public sign-in page never shows whose Drive this is.
 */
export function AppBar({ drive }: { drive: { connected: boolean; email: string | null } | null }) {
  return (
    <div className="border-b border-border bg-background-secondary px-4 py-3 lg:px-24">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <a href="/pdf-metadata-viewer" className="font-heading text-lg text-text-primary hover:underline">
          PDF Metadata Viewer
        </a>
        {drive === null ? null : drive.connected ? (
          <Badge variant="success">Drive connected{drive.email ? ` · ${drive.email}` : ""}</Badge>
        ) : (
          <Badge variant="muted">Drive not connected</Badge>
        )}
      </div>
    </div>
  );
}
