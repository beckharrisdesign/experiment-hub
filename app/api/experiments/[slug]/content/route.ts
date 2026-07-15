import { NextRequest, NextResponse } from "next/server";
import { requireAdminCookie } from "@/lib/admin-auth";
import { upsertContent } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!(await requireAdminCookie())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const body = await request.json();
  const { type, content } = body;

  if (
    !type ||
    !content ||
    !["prd", "business_case", "market_research"].includes(type)
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await upsertContent(slug, type, content);
  return NextResponse.json({ success: true });
}
