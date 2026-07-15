import { NextResponse } from "next/server";
import { requireAdminCookie } from "@/lib/admin-auth";
import { dispatchEtsySyncWorkflow } from "@/lib/etsy-sync";

export async function POST() {
  if (!(await requireAdminCookie())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await dispatchEtsySyncWorkflow();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to dispatch sync",
      },
      { status: 502 },
    );
  }
  return NextResponse.json({ dispatched: true }, { status: 202 });
}
