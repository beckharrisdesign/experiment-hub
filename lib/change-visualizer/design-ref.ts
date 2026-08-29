/**
 * The Figma reference a conforming `design.md` already records.
 *
 * `rules/figma.mdc` requires the Visual design table to carry a file URL, page
 * name and frame node id for any UI change. That is enough to fetch the frame
 * on demand — which is why a row can show the design rather than link to it.
 * A committed PNG is still preferred: it survives losing Figma access.
 */

export type FigmaRef = {
  fileKey: string;
  /** Page name as written, e.g. `02.1 Proposed — History preview`. */
  page: string | null;
  /** Frame node id, e.g. `9:82`. */
  nodeId: string | null;
};

const FILE_URL = /figma\.com\/design\/([0-9a-zA-Z]{22,128})/;
const NODE_ID = /node[\s`]*([0-9]+:[0-9]+)/i;
const PAGE_NAME = /[Pp]age\s+[`"']?((?:\d+(?:\.\d+)*)\s+[^`"'()\n,;]*)/;

export function parseFigmaRef(designMarkdown: string): FigmaRef | null {
  const file = FILE_URL.exec(designMarkdown);
  if (!file) return null;

  const node = NODE_ID.exec(designMarkdown);
  const page = PAGE_NAME.exec(designMarkdown);

  return {
    fileKey: file[1],
    page: page ? page[1].trim() : null,
    nodeId: node ? node[1] : null,
  };
}
