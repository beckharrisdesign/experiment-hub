"use client";

import { useEffect, useState } from "react";
import { DetailsEditor, type DetailsEditorProps } from "./DetailsEditor";
import { shownValues, type FileValuesState, type ShownValues } from "@/lib/pdf-shown-values";

/**
 * The part of the detail page that needs what the file itself says, when the
 * stored copy may be stale. The page renders without them; these ask
 * `GET …/file` from the browser and fill in when it answers. Reading the file
 * means downloading all of it, so the page no longer waits for that.
 */

// One read per document revision, so a remount in the same view (after an
// edit refreshes the page) doesn't download the file again.
const reads = new Map<string, Promise<FileValuesState>>();

function readFileValues(documentId: string, revision: string | null): Promise<FileValuesState> {
  const key = `${documentId}@${revision ?? ""}`;
  let read = reads.get(key);
  if (!read) {
    read = fetch(`/api/pdf-documents/id/${documentId}/file`, { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<FileValuesState>) : Promise.reject(res.status)))
      .catch((): FileValuesState => ({ ok: false, reason: "unreadable" }));
    reads.set(key, read);
  }
  return read;
}

function useFileValues(documentId: string, revision: string | null): FileValuesState | null {
  const [state, setState] = useState<FileValuesState | null>(null);
  useEffect(() => {
    let live = true;
    void readFileValues(documentId, revision).then((s) => live && setState(s));
    return () => {
      live = false;
    };
  }, [documentId, revision]);
  return state;
}

export function DetailsFromFile({
  revision,
  stored,
  baselined,
  locked,
  ...editor
}: Omit<DetailsEditorProps, "values" | "inFile" | "disabled"> & {
  /** Drive's head revision as the page found it; keys the shared read. */
  revision: string | null;
  stored: ShownValues;
  baselined: boolean;
}) {
  const state = useFileValues(editor.documentId, revision);
  if (!state) {
    // The stored values, not yet editable: the first edit records what the
    // file says, so it waits until that is known.
    return (
      <DetailsEditor
        {...editor}
        values={stored}
        inFile={undefined}
        disabled
        locked={locked ?? "Reading the file from Drive…"}
      />
    );
  }
  const inFile = state.ok ? state.embedded : undefined;
  return (
    <DetailsEditor
      {...editor}
      values={shownValues(stored, baselined, inFile)}
      inFile={inFile}
      disabled={!state.ok && !baselined}
      locked={locked}
    />
  );
}
