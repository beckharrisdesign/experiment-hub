import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getNoteById, updateNote, deleteNote, NoteType } from "@/lib/supabase";

async function requireAdmin() {
  const cookieStore = await cookies();
  const editCookie = cookieStore.get("hub-edit");
  return editCookie?.value === process.env.ADMIN_SECRET;
}

// The note must belong to the linked repo in the URL — otherwise this route
// could mutate notes owned by another linked repo or an experiment.
async function findScopedNote(linkedRepoId: string, noteId: string) {
  const note = await getNoteById(noteId);
  if (!note || note.linked_repo_id !== linkedRepoId) return null;
  return note;
}

const VALID_TYPES: NoteType[] = [
  "observation",
  "decision",
  "learning",
  "question",
  "idea",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, noteId } = await params;
  if (!(await findScopedNote(id, noteId))) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, content, note_type } = body;

  if (note_type !== undefined && !VALID_TYPES.includes(note_type as NoteType)) {
    return NextResponse.json({ error: "invalid note_type" }, { status: 400 });
  }
  if (content !== undefined && typeof content !== "string") {
    return NextResponse.json(
      { error: "content must be a string" },
      { status: 400 },
    );
  }
  if (title !== undefined && title !== null && typeof title !== "string") {
    return NextResponse.json(
      { error: "title must be a string" },
      { status: 400 },
    );
  }

  const note = await updateNote(noteId, {
    title: title as string | null | undefined,
    content: content as string | undefined,
    note_type: note_type as NoteType | undefined,
  });
  return NextResponse.json(note);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, noteId } = await params;
  if (!(await findScopedNote(id, noteId))) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  await deleteNote(noteId);
  return new NextResponse(null, { status: 204 });
}
