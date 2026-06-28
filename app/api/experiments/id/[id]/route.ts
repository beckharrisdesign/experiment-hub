import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateExperiment } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const editCookie = cookieStore.get("hub-edit");

  if (!editCookie || editCookie.value !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const allowed = [
    "name",
    "statement",
    "status",
    "type",
    "tags",
    "last_modified",
  ];
  const fields: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) fields[key] = body[key];
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const updated = await updateExperiment(id, fields);
  return NextResponse.json(updated);
}
