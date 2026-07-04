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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Body must be an object" },
      { status: 400 },
    );
  }
  const bodyObj = body as Record<string, unknown>;

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
    if (Object.prototype.hasOwnProperty.call(bodyObj, key))
      fields[key] = bodyObj[key];
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  try {
    const updated = await updateExperiment(id, fields);
    return NextResponse.json({ success: true, experiment: updated });
  } catch (err) {
    console.error("[Experiment update] Error:", err);
    return NextResponse.json(
      { error: "Failed to update experiment" },
      { status: 500 },
    );
  }
}
