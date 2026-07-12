import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateExperiment } from "@/lib/supabase";
import {
  hasNotionExperiments,
  updateExperimentInNotion,
  toNotionStatus,
  toNotionType,
} from "@/lib/notion-experiments";

// Fields that exist as Notion properties. tags has no Notion column and
// last_modified is Notion's own last_edited_time, so neither is writable
// through the Notion path.
const NOTION_EDITABLE = ["name", "statement", "status", "type"] as const;

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

  // Notion is the preferred experiments source when configured, so edits must
  // land there — a write that goes to Supabase while reads come from Notion
  // would silently never show up. Experiments not yet migrated to Notion
  // (slug miss) still fall through to the Supabase path below.
  if (hasNotionExperiments()) {
    const notionFields: Record<string, string> = {};
    for (const key of NOTION_EDITABLE) {
      if (key in fields) notionFields[key] = String(fields[key]);
    }
    if (Object.keys(notionFields).length === 0) {
      return NextResponse.json(
        {
          error:
            "Only name, statement, status, and type are editable while Notion is the experiments source",
        },
        { status: 400 },
      );
    }
    if (
      notionFields.status !== undefined &&
      !toNotionStatus(notionFields.status)
    ) {
      return NextResponse.json(
        {
          error: `Status "${notionFields.status}" has no Notion equivalent; set the phase in Notion instead`,
        },
        { status: 400 },
      );
    }
    if (notionFields.type !== undefined && !toNotionType(notionFields.type)) {
      return NextResponse.json(
        { error: `Unknown experiment type "${notionFields.type}"` },
        { status: 400 },
      );
    }
    try {
      const updated = await updateExperimentInNotion(id, notionFields);
      if (updated) {
        return NextResponse.json({ success: true, experiment: updated });
      }
    } catch (err) {
      // No Supabase fallback on Notion errors: once Notion recovers, reads
      // would come from it again and the Supabase write would be invisible.
      console.error("[Experiment update] Notion error:", err);
      return NextResponse.json(
        { error: "Failed to update experiment in Notion" },
        { status: 502 },
      );
    }
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
