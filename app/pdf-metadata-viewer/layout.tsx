import { cookies } from "next/headers";
import { PDF_SESSION_COOKIE, verifySession } from "@/lib/pdf-auth";
import { getDriveConnection } from "@/lib/pdf-drive";
import { AppBar } from "./AppBar";

export const dynamic = "force-dynamic";

/**
 * Every PDF Organizer view sits under the same bar (AppBar).
 *
 * The sign-in page sits under it too, and is public. So the Drive account is
 * read only with a valid session, checked exactly as middleware checks it:
 * signed out, the bar shows the name alone, and nothing touches the database.
 */
export default async function PdfMetadataViewerLayout({ children }: { children: React.ReactNode }) {
  let drive: { connected: boolean; email: string | null } | null = null;
  const session = await verifySession(
    (await cookies()).get(PDF_SESSION_COOKIE)?.value,
    process.env.PDF_SESSION_SECRET ?? "",
  );
  if (session) {
    try {
      const connection = await getDriveConnection();
      drive = { connected: connection.connected, email: connection.email };
    } catch (error) {
      // The bar must never take a view down; the view reports its own problems.
      console.error("pdf layout: could not read the Drive connection:", error);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppBar drive={drive} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
