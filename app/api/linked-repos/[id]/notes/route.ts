import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getLinkedRepoNotes,
  createLinkedRepoNote,
  NoteType,
} from "@/lib/supabase";

async function requireAdmin() {
  const cookieStore = await cookies();
  const editCookie = cookieStore.get("hub-edit");
  return editCookie?.value === process.env.ADMIN_SECRET;
}

const VALID_TYPES: NoteType[] = [
  "observation",
  "decision",
  "learning",
  "question",
  "idea",
];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const notes = await getLinkedRepoNotes(id);
  return NextResponse.json(notes);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { content, title, note_type, source_file } = body;

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

  const note = await createLinkedRepoNote(id, {
    title: title as string | null | undefined,
    content,
    note_type: note_type as NoteType | undefined,
    source_file: source_file as string | null | undefined,
  });
  return NextResponse.json(note, { status: 201 });
}
