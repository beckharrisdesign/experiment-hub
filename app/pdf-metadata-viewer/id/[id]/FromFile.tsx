"use client";

import { useEffect, useState } from "react";
import { DetailsEditor, type DetailsEditorProps } from "./DetailsEditor";
import { shownValues, type FileValuesState, type ShownValues } from "@/lib/pdf-shown-values";

/**
 * The parts of the detail page that need what the file itself says, when the
 * stored copy may be stale. The page renders without them; these ask
 * `GET …/file` from the browser and fill in when it answers. Reading the file
 * means downloading all of it, so the page no longer waits for that.
 */

// One read per document revision, shared by the details panel and the page
// count, so the file is downloaded once per view.
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

/**
 * Below the preview: the page count, the way into Split, and Open full size.
 * The count comes from the file only when it isn't stored, and stays blank
 * until known (Split is offered only once it is).
 */
export function PreviewFooter({
  documentId,
  revision,
  storedPageCount,
  wasSplit,
  contentUrl,
}: {
  documentId: string;
  revision: string | null;
  storedPageCount: number | null;
  wasSplit: boolean;
  contentUrl: string;
}) {
  return storedPageCount === null ? (
    <FooterFromFile
      documentId={documentId}
      revision={revision}
      wasSplit={wasSplit}
      contentUrl={contentUrl}
    />
  ) : (
    <Footer documentId={documentId} pageCount={storedPageCount} wasSplit={wasSplit} contentUrl={contentUrl} />
  );
}

function FooterFromFile(props: {
  documentId: string;
  revision: string | null;
  wasSplit: boolean;
  contentUrl: string;
}) {
  const state = useFileValues(props.documentId, props.revision);
  return <Footer {...props} pageCount={state?.ok ? state.embedded.pageCount : null} />;
}

function Footer({
  documentId,
  pageCount,
  wasSplit,
  contentUrl,
}: {
  documentId: string;
  pageCount: number | null;
  wasSplit: boolean;
  contentUrl: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs text-text-muted">
      <span className="flex items-center gap-4">
        <span>{pageCount === null ? "" : `${pageCount} ${pageCount === 1 ? "page" : "pages"}`}</span>
        {/* Split (Figma 02.11): offered for any multi-page scan not already split. */}
        {wasSplit ? (
          <a
            href={`/pdf-metadata-viewer/id/${documentId}/split`}
            className="inline-flex min-h-11 items-center text-warning hover:underline"
          >
            Split into parts — see them
          </a>
        ) : pageCount !== null && pageCount > 1 ? (
          <a
            href={`/pdf-metadata-viewer/id/${documentId}/split`}
            className="inline-flex min-h-11 items-center text-text-secondary hover:underline"
          >
            Split pages
          </a>
        ) : null}
      </span>
      <a
        href={contentUrl}
        target="_blank"
        rel="noopener"
        className="inline-flex min-h-11 items-center text-text-secondary hover:underline"
      >
        Open full size
      </a>
    </div>
  );
}
