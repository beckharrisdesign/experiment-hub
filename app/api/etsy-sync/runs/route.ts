import { NextResponse } from "next/server";
import { getEtsySyncRuns } from "@/lib/etsy-sync";

export async function GET() {
  try {
    const runs = await getEtsySyncRuns();
    return NextResponse.json({ success: true, runs });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load sync runs",
      },
      { status: 503 },
    );
  }
}
