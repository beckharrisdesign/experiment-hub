import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { upsertContent } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const cookieStore = await cookies();
  const editCookie = cookieStore.get("hub-edit");

  if (!editCookie || editCookie.value !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const body = await request.json();
  const { type, content } = body;

  if (!type || !content || !["prd", "business_case"].includes(type)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await upsertContent(slug, type, content);
  return NextResponse.json({ success: true });
}
