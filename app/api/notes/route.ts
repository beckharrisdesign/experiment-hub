import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getNotes, createNote, NoteType } from "@/lib/supabase";

async function requireAdmin() {
  const cookieStore = await cookies();
  const editCookie = cookieStore.get("hub-edit");
  return editCookie?.value === process.env.ADMIN_SECRET;
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const experimentId = request.nextUrl.searchParams.get("experiment");
  if (!experimentId) {
    return NextResponse.json(
      { error: "experiment query param required" },
      { status: 400 },
    );
  }

  const notes = await getNotes(experimentId);
  return NextResponse.json(notes);
}

const VALID_TYPES: NoteType[] = [
  "observation",
  "decision",
  "learning",
  "question",
  "idea",
];

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { experiment_id, content, title, note_type, source_file, created_at } =
    body;

  if (!experiment_id || typeof experiment_id !== "string") {
    return NextResponse.json(
      { error: "experiment_id required" },
      { status: 400 },
    );
  }
  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }
  if (note_type !== undefined && !VALID_TYPES.includes(note_type as NoteType)) {
    return NextResponse.json({ error: "invalid note_type" }, { status: 400 });
  }
  if (title !== undefined && title !== null && typeof title !== "string") {
    return NextResponse.json(
      { error: "title must be a string" },
      { status: 400 },
    );
  }
  if (
    source_file !== undefined &&
    source_file !== null &&
    typeof source_file !== "string"
  ) {
    return NextResponse.json(
      { error: "source_file must be a string" },
      { status: 400 },
    );
  }
  if (created_at !== undefined && typeof created_at !== "string") {
    return NextResponse.json(
      { error: "created_at must be a string" },
      { status: 400 },
    );
  }

  const note = await createNote(experiment_id, {
    title: title as string | null | undefined,
    content,
    note_type: note_type as NoteType | undefined,
    source_file: source_file as string | null | undefined,
    created_at: created_at as string | undefined,
  });
  return NextResponse.json(note, { status: 201 });
}
