/**
 * Reading `tasks.md` — checkbox state, sections, and the back-references that
 * make an outcome's evidence *derivable* rather than a judgement call.
 *
 * The repo's task lists already carry `(→ 1.4, 1.5)` pointers from the items
 * that satisfy an outcome back to the outcome itself. That turns "how well is
 * this proven?" into a lookup: which item points here, and what kind of item is
 * it — a test, an implementation line, a human check, or something deferred.
 */

export type CheckState = "done" | "open" | "partial";

export type TaskItem = {
  /** `1.1`, `2.1a`, `7b.1` — as written. */
  id: string;
  state: CheckState;
  text: string;
  /** Leading `## N.` of the section this item sits in, e.g. `4`. */
  section: string;
  sectionTitle: string;
  /** Outcome ids this item declares it satisfies, from `(→ 1.4, 1.5)`. */
  refs: string[];
};

export type ParsedTasks = {
  items: TaskItem[];
  /** True when §1 is the user-outcome list the lite schema asks for. */
  outcomesAreScenarios: boolean;
  outcomes: TaskItem[];
  sectionTitles: Map<string, string>;
};

/**
 * How an outcome is held up. Ordered weakest-to-strongest is deliberate: the
 * page never averages these, so the only ordering that matters is which one
 * wins when several items point at the same outcome.
 */
export type EvidenceKind =
  | "automated test"
  | "code path"
  | "human review"
  | "deferred"
  | "not stated";

const CHECKBOX = /^\s*-\s*\[( |x|X|~)\]\s*(.*)$/;
const ID_AT_START = /^((?:\d+[a-z]?)(?:\.\d+[a-z]?)+)\s+([\s\S]*)$/;
const SECTION = /^##\s+([\dA-Za-z]+)\.\s*(.*)$/;
const REFS = /\(→\s*([^)]*)\)/g;
const REF_ID = /\d+[a-z]?(?:\.\d+[a-z]?)+/g;

function stateFor(marker: string): CheckState {
  if (marker === "~") return "partial";
  return marker.trim().length > 0 ? "done" : "open";
}

export function parseTasks(markdown: string): ParsedTasks {
  const items: TaskItem[] = [];
  const sectionTitles = new Map<string, string>();
  let section = "";
  let sectionTitle = "";

  for (const rawLine of markdown.split("\n")) {
    const heading = SECTION.exec(rawLine);
    if (heading) {
      section = heading[1];
      sectionTitle = heading[2].trim();
      sectionTitles.set(section, sectionTitle);
      continue;
    }

    const box = CHECKBOX.exec(rawLine);
    if (!box) continue;

    const body = box[2].trim();
    const withId = ID_AT_START.exec(body);
    // An item without a leading `1.1`-style id is still a task; it just cannot
    // be pointed at, so it gets no id rather than being dropped.
    const id = withId ? withId[1] : "";
    const text = withId ? withId[2].trim() : body;

    const refs: string[] = [];
    for (const match of text.matchAll(REFS)) {
      refs.push(...(match[1].match(REF_ID) ?? []));
    }

    items.push({ id, state: stateFor(box[1]), text, section, sectionTitle, refs });
  }

  const firstTitle = (sectionTitles.get("1") ?? "").toLowerCase();
  const outcomesAreScenarios =
    firstTitle.includes("outcome") || firstTitle.includes("scenario");

  return {
    items,
    outcomesAreScenarios,
    outcomes: outcomesAreScenarios ? items.filter((i) => i.section === "1") : [],
    sectionTitles,
  };
}

const TEST_FILE = /\.test\.[tj]sx?\b/;
const AUTOMATED = /\bautomated\b|\bvitest\b|\btests? pass\b|\b\d+ tests\b/i;
const DEFERRED = /\bDEFERRED\b|\bdeferred\b/;
const BY_HAND =
  /authoring-time|not enforced by code|content review|manual walkthrough|by hand|human/i;

/**
 * Classify one item's evidence weight.
 *
 * A test file named in the text is the only claim that survives someone
 * changing the code, so it outranks everything. "Deferred" outranks "code path"
 * because a wired seam with nothing behind it is not evidence.
 */
function kindOfItem(item: TaskItem): Exclude<EvidenceKind, "not stated"> {
  if (TEST_FILE.test(item.text) || (item.section === "4" && AUTOMATED.test(item.text))) {
    return "automated test";
  }
  if (DEFERRED.test(item.text)) return "deferred";
  if (BY_HAND.test(item.text)) return "human review";
  return "code path";
}

const STRENGTH: Record<Exclude<EvidenceKind, "not stated">, number> = {
  "automated test": 4,
  "human review": 3,
  deferred: 2,
  "code path": 1,
};

/**
 * The strongest evidence pointing at an outcome, or `not stated` when nothing
 * points at it. Saying "not stated" is the point: an outcome nobody claimed to
 * satisfy is more interesting than one backed by a weak claim.
 */
export function evidenceKindFor(
  outcomeId: string,
  items: TaskItem[],
): EvidenceKind {
  let best: EvidenceKind = "not stated";
  let bestScore = 0;

  for (const item of items) {
    if (!item.refs.includes(outcomeId)) continue;
    const kind = kindOfItem(item);
    if (STRENGTH[kind] > bestScore) {
      bestScore = STRENGTH[kind];
      best = kind;
    }
  }
  return best;
}

export function evidenceSummary(
  parsed: ParsedTasks,
): Record<EvidenceKind, number> {
  const counts: Record<EvidenceKind, number> = {
    "automated test": 0,
    "code path": 0,
    "human review": 0,
    deferred: 0,
    "not stated": 0,
  };
  for (const outcome of parsed.outcomes) {
    counts[evidenceKindFor(outcome.id, parsed.items)] += 1;
  }
  return counts;
}

export function progress(parsed: ParsedTasks): {
  done: number;
  partial: number;
  open: number;
  total: number;
} {
  const counted = parsed.items.filter((i) => i.id.length > 0);
  return {
    done: counted.filter((i) => i.state === "done").length,
    partial: counted.filter((i) => i.state === "partial").length,
    open: counted.filter((i) => i.state === "open").length,
    total: counted.length,
  };
}
