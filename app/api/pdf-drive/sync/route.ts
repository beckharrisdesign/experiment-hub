import { NextResponse } from "next/server";
import { DriveReauthorizationRequired } from "@/lib/pdf-drive";
import { syncFolder } from "@/lib/pdf-sync";
import { keepSyncKey } from "@/lib/pdf-sync-key";

/**
 * Run the folder sync: import new PDFs, then read the unread ones (task 7d,
 * design.md D12). Called every ten minutes by the database (migration 035), and
 * twice a day by .github/workflows/pdf-folder-sync.yml as a check.
 *
 * Gated by middleware.ts: a signed-in session, or the schedule's derived key
 * on this path alone (lib/pdf-auth.ts, verifySyncKey). The answer is counts
 * only — never a filename or a value — so the key can start a sync but can't
 * read anything.
 */
export const maxDuration = 60;

export async function POST() {
  try {
    await keepSyncKey();
    const result = await syncFolder();
    console.log("pdf sync:", JSON.stringify(result));
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof DriveReauthorizationRequired) {
      return NextResponse.json(
        { error: "Drive access needs re-authorizing. Sign in again." },
        { status: 409 },
      );
    }
    console.error("pdf sync failed:", error);
    return NextResponse.json({ error: "The folder sync failed" }, { status: 502 });
  }
}
