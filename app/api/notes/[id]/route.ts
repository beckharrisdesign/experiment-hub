import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateNote, deleteNote, NoteType } from "@/lib/supabase";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { title, content, note_type } = body;

  if (note_type && !VALID_TYPES.includes(note_type)) {
    return NextResponse.json({ error: "invalid note_type" }, { status: 400 });
  }

  const note = await updateNote(id, { title, content, note_type });
  return NextResponse.json(note);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await deleteNote(id);
  return new NextResponse(null, { status: 204 });
}
