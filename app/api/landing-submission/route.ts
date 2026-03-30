import { NextRequest, NextResponse } from "next/server";
import { insertSubmission } from "@/lib/supabase";

const CORS_ORIGIN = process.env.LANDING_CORS_ORIGIN || "*";

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { experiment, email, name, source, notes, ...rest } = body;

    if (!email) {
      return withCors(
        NextResponse.json(
          { error: "Missing required field: email" },
          { status: 400 },
        ),
      );
    }

    // Any experiment-specific fields (e.g. seedCount, challenges) go into metadata
    const metadata = Object.keys(rest).length > 0 ? rest : undefined;

    const row = await insertSubmission({
      experiment: experiment || "unknown",
      email,
      name,
      source: source || "landing-page",
      notes,
      metadata,
    });

    return withCors(NextResponse.json({ success: true, id: row.id }));
  } catch (error: any) {
    console.error("Error submitting landing page response:", error);
    return withCors(
      NextResponse.json(
        { error: "Failed to submit response", details: error.message },
        { status: 500 },
      ),
    );
  }
}
