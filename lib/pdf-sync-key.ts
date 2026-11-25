/**
 * Give the database's schedule the key it starts the sync with (task 7k,
 * migration 035, design.md D12). Done on each run rather than by hand: the key
 * is derived here anyway, and a rotated root replaces it on the next run.
 */
import { getPdfAdminClient } from "@/lib/pdf-documents";
import { deriveSyncKey } from "@/lib/pdf-auth";

/** Never worth failing a sync for: the run in hand is already under way. */
export async function keepSyncKey(): Promise<void> {
  const root = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!root) return;
  try {
    const { error } = await getPdfAdminClient().rpc("pdf_sync_set_key", {
      key: await deriveSyncKey(root),
    });
    if (error) throw new Error(error.message);
  } catch (error) {
    console.warn("pdf sync: could not give the schedule its key:", error);
  }
}
