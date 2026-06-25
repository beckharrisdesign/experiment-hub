"use client";

import { useState } from "react";
import type { Note, NoteType } from "@/lib/supabase";

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  observation: "Observation",
  decision: "Decision",
  learning: "Learning",
  question: "Question",
  idea: "Idea",
};

const NOTE_TYPE_COLORS: Record<NoteType, string> = {
  observation: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  decision: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  learning: "bg-green-500/10 text-green-700 border-green-500/20",
  question: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  idea: "bg-orange-500/10 text-orange-700 border-orange-500/20",
};

const NOTE_TYPES: NoteType[] = [
  "observation",
  "decision",
  "learning",
  "question",
  "idea",
];

interface NotesListProps {
  experimentId: string;
  initialNotes: Note[];
  isEditor: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function NotesList({
  experimentId,
  initialNotes,
  isEditor,
}: NotesListProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [draft, setDraft] = useState({
    title: "",
    content: "",
    note_type: "observation" as NoteType,
  });

  function startAdd() {
    setDraft({ title: "", content: "", note_type: "observation" });
    setAdding(true);
    setEditingId(null);
  }

  function startEdit(note: Note) {
    setDraft({
      title: note.title ?? "",
      content: note.content,
      note_type: note.note_type,
    });
    setEditingId(note.id);
    setAdding(false);
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
  }

  async function saveNew() {
    if (!draft.content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experiment_id: experimentId,
          content: draft.content,
          title: draft.title || null,
          note_type: draft.note_type,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const note: Note = await res.json();
      setNotes((prev) => [note, ...prev]);
      setAdding(false);
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(id: string) {
    if (!draft.content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: draft.content,
          title: draft.title || null,
          note_type: draft.note_type,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated: Note = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(id: string) {
    if (!confirm("Delete this note?")) return;
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold tracking-[0.01em] text-text-dark">
          Notes
        </h2>
        {isEditor && !adding && (
          <button
            onClick={startAdd}
            className="text-xs px-3 py-1.5 rounded border border-border-dark text-text-dark hover:bg-background-secondary transition-colors"
          >
            + Add Note
          </button>
        )}
      </div>

      {adding && (
        <NoteForm
          draft={draft}
          onChange={setDraft}
          onSave={saveNew}
          onCancel={cancel}
          saving={saving}
        />
      )}

      {notes.length === 0 && !adding && (
        <p className="text-sm text-text-dark-secondary">
          {isEditor
            ? "No notes yet. Add one to track observations and decisions."
            : "No notes."}
        </p>
      )}

      <ul className="space-y-3">
        {notes.map((note) =>
          editingId === note.id ? (
            <li
              key={note.id}
              className="border border-border-dark rounded p-4 bg-background-secondary"
            >
              <NoteForm
                draft={draft}
                onChange={setDraft}
                onSave={() => saveEdit(note.id)}
                onCancel={cancel}
                saving={saving}
              />
            </li>
          ) : (
            <li
              key={note.id}
              className="border border-border-dark rounded p-4 bg-background-secondary"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${NOTE_TYPE_COLORS[note.note_type]}`}
                    >
                      {NOTE_TYPE_LABELS[note.note_type]}
                    </span>
                    <span className="text-xs text-text-dark-secondary">
                      {formatDate(note.created_at)}
                    </span>
                  </div>
                  {note.title && (
                    <p className="text-sm font-medium text-text-dark mb-1">
                      {note.title}
                    </p>
                  )}
                  <p className="text-sm text-text-dark-secondary whitespace-pre-wrap">
                    {note.content}
                  </p>
                </div>
                {isEditor && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(note)}
                      className="text-xs text-text-dark-secondary hover:text-text-dark transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="text-xs text-red-600 hover:text-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function NoteForm({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  draft: { title: string; content: string; note_type: NoteType };
  onChange: (d: {
    title: string;
    content: string;
    note_type: NoteType;
  }) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="border border-border-dark rounded p-4 bg-background-secondary space-y-3">
      <div className="flex gap-3">
        <select
          value={draft.note_type}
          onChange={(e) =>
            onChange({ ...draft, note_type: e.target.value as NoteType })
          }
          className="text-xs border border-border-dark rounded px-2 py-1.5 bg-background-light text-text-dark"
        >
          {NOTE_TYPES.map((t) => (
            <option key={t} value={t}>
              {NOTE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Title (optional)"
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          className="flex-1 text-sm border border-border-dark rounded px-3 py-1.5 bg-background-light text-text-dark placeholder-text-dark-secondary"
        />
      </div>
      <textarea
        placeholder="Note content…"
        value={draft.content}
        onChange={(e) => onChange({ ...draft, content: e.target.value })}
        rows={3}
        className="w-full text-sm border border-border-dark rounded px-3 py-2 bg-background-light text-text-dark placeholder-text-dark-secondary resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving || !draft.content.trim()}
          className="text-xs px-3 py-1.5 rounded bg-accent-primary text-white font-medium disabled:opacity-50 hover:bg-accent-primary/90 transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="text-xs px-3 py-1.5 rounded border border-border-dark text-text-dark hover:bg-background-secondary transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
