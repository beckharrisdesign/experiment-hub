/**
 * Everyday Executive Function Check-In — a self-report questionnaire that
 * borrows BRIEF-A's *structure* and none of its content.
 *
 * BRIEF-A (Roth, Isquith & Gioia, PAR Inc.) is a copyrighted, commercially
 * licensed instrument. Its 75 items are not reproduced here in whole or in
 * part. What is reused is the published structure — which is descriptive of
 * the executive-function model, not the test: a 3-point response scale, nine
 * clinical subscales, two indices, and an overall composite. Every item below
 * is originally worded for this tool.
 *
 * This is NOT a validated instrument. Scores here have no norms, no
 * standardization sample, and no diagnostic meaning. They are only comparable
 * to other administrations of this same questionnaire by the same person. The
 * UI must state this wherever a score is shown.
 */

// ---------------------------------------------------------------------------
// Response scale
// ---------------------------------------------------------------------------

export const RESPONSE_OPTIONS = [
  { value: 1, label: "Never" },
  { value: 2, label: "Sometimes" },
  { value: 3, label: "Often" },
] as const;

export type ResponseValue = 1 | 2 | 3;

// ---------------------------------------------------------------------------
// Subscales and indices
// ---------------------------------------------------------------------------

export type SubscaleId =
  | "inhibit"
  | "shift"
  | "emotionalControl"
  | "selfMonitor"
  | "initiate"
  | "workingMemory"
  | "planOrganize"
  | "taskMonitor"
  | "organizationOfMaterials";

export type IndexId = "behavioralRegulation" | "metacognition";

export const SUBSCALES: Record<SubscaleId, { label: string; index: IndexId; blurb: string }> = {
  inhibit: {
    label: "Inhibit",
    index: "behavioralRegulation",
    blurb: "Stopping an impulse before it becomes an action.",
  },
  shift: {
    label: "Shift",
    index: "behavioralRegulation",
    blurb: "Moving between tasks, ideas, or plans.",
  },
  emotionalControl: {
    label: "Emotional Control",
    index: "behavioralRegulation",
    blurb: "How proportionate and settled emotional responses are.",
  },
  selfMonitor: {
    label: "Self-Monitor",
    index: "behavioralRegulation",
    blurb: "Noticing your own effect on other people.",
  },
  initiate: {
    label: "Initiate",
    index: "metacognition",
    blurb: "Getting started without an external push.",
  },
  workingMemory: {
    label: "Working Memory",
    index: "metacognition",
    blurb: "Holding information while you use it.",
  },
  planOrganize: {
    label: "Plan / Organize",
    index: "metacognition",
    blurb: "Anticipating steps and sequencing them.",
  },
  taskMonitor: {
    label: "Task Monitor",
    index: "metacognition",
    blurb: "Checking work and catching your own errors.",
  },
  organizationOfMaterials: {
    label: "Organization of Materials",
    index: "metacognition",
    blurb: "Keeping physical and digital space usable.",
  },
};

export const INDICES: Record<IndexId, { label: string; subscales: SubscaleId[] }> = {
  behavioralRegulation: {
    label: "Behavioral Regulation",
    subscales: ["inhibit", "shift", "emotionalControl", "selfMonitor"],
  },
  metacognition: {
    label: "Metacognition",
    subscales: [
      "initiate",
      "workingMemory",
      "planOrganize",
      "taskMonitor",
      "organizationOfMaterials",
    ],
  },
};

// ---------------------------------------------------------------------------
// Items — all original wording, five per subscale
// ---------------------------------------------------------------------------

export interface Item {
  id: string;
  subscale: SubscaleId;
  text: string;
}

/**
 * All items are keyed in the same direction: a higher response means more
 * everyday difficulty. No reverse-scored items, so a rising line on the trend
 * chart always means the same thing.
 */
export const ITEMS: readonly Item[] = [
  // Inhibit
  { id: "inh1", subscale: "inhibit", text: "I speak before I have finished thinking through what I want to say." },
  { id: "inh2", subscale: "inhibit", text: "I switch to something else mid-task without having decided to." },
  { id: "inh3", subscale: "inhibit", text: "I commit to things on the spur of the moment and regret it later." },
  { id: "inh4", subscale: "inhibit", text: "I cut in while someone else is still talking." },
  { id: "inh5", subscale: "inhibit", text: "I find it hard to stay put when I am supposed to." },

  // Shift
  { id: "shf1", subscale: "shift", text: "Being pulled away from what I am doing derails the rest of the day." },
  { id: "shf2", subscale: "shift", text: "I keep using the same approach after it is clearly not working." },
  { id: "shf3", subscale: "shift", text: "A change of plan at short notice takes me a long time to absorb." },
  { id: "shf4", subscale: "shift", text: "I get stuck on one idea and cannot move to the next one." },
  { id: "shf5", subscale: "shift", text: "Alternating between two kinds of work in one sitting is hard for me." },

  // Emotional Control
  { id: "emo1", subscale: "emotionalControl", text: "My reaction to a small setback is bigger than the setback." },
  { id: "emo2", subscale: "emotionalControl", text: "My mood shifts quickly for reasons I cannot point to." },
  { id: "emo3", subscale: "emotionalControl", text: "Once I am frustrated it takes a long time to settle." },
  { id: "emo4", subscale: "emotionalControl", text: "Small annoyances stack up until I snap at someone." },
  { id: "emo5", subscale: "emotionalControl", text: "I get upset about things I later judge to have been minor." },

  // Self-Monitor
  { id: "slf1", subscale: "selfMonitor", text: "I do not realize I have upset someone until they say so." },
  { id: "slf2", subscale: "selfMonitor", text: "People tell me I came across differently than I intended." },
  { id: "slf3", subscale: "selfMonitor", text: "I am surprised by how others describe my behaviour." },
  { id: "slf4", subscale: "selfMonitor", text: "I miss the signals that someone wants to end a conversation." },
  { id: "slf5", subscale: "selfMonitor", text: "I talk for longer than the other person wants to listen." },

  // Initiate
  { id: "ini1", subscale: "initiate", text: "I put off starting even when I know exactly what to do." },
  { id: "ini2", subscale: "initiate", text: "I need someone else to prompt me before I begin." },
  { id: "ini3", subscale: "initiate", text: "I sit with the task open in front of me without starting it." },
  { id: "ini4", subscale: "initiate", text: "Getting started takes longer than doing the work itself." },
  { id: "ini5", subscale: "initiate", text: "I cannot begin until the deadline is close enough to force it." },

  // Working Memory
  { id: "wmm1", subscale: "workingMemory", text: "I walk into a room and cannot recall why I went there." },
  { id: "wmm2", subscale: "workingMemory", text: "I lose the thread of my own sentence halfway through it." },
  { id: "wmm3", subscale: "workingMemory", text: "I forget the second half of an instruction while doing the first." },
  { id: "wmm4", subscale: "workingMemory", text: "I re-read the same passage several times to hold on to it." },
  { id: "wmm5", subscale: "workingMemory", text: "After an interruption I cannot recall what I was doing." },

  // Plan / Organize
  { id: "pln1", subscale: "planOrganize", text: "I underestimate how long something will take." },
  { id: "pln2", subscale: "planOrganize", text: "I start before working out what order the steps go in." },
  { id: "pln3", subscale: "planOrganize", text: "I get partway through and find I am missing something I needed." },
  { id: "pln4", subscale: "planOrganize", text: "I have trouble breaking a large job into smaller pieces." },
  { id: "pln5", subscale: "planOrganize", text: "I leave too little time to finish what I committed to." },

  // Task Monitor
  { id: "tsk1", subscale: "taskMonitor", text: "I hand work over without checking it." },
  { id: "tsk2", subscale: "taskMonitor", text: "I make careless mistakes that I only catch later." },
  { id: "tsk3", subscale: "taskMonitor", text: "I do not spot an error until someone points it out." },
  { id: "tsk4", subscale: "taskMonitor", text: "I move to the next thing before the current one is actually done." },
  { id: "tsk5", subscale: "taskMonitor", text: "I misjudge how well I have done something." },

  // Organization of Materials
  { id: "org1", subscale: "organizationOfMaterials", text: "My work surface is too cluttered to use." },
  { id: "org2", subscale: "organizationOfMaterials", text: "I cannot find a thing I need at the moment I need it." },
  { id: "org3", subscale: "organizationOfMaterials", text: "I put things away in places with no system behind them." },
  { id: "org4", subscale: "organizationOfMaterials", text: "I lose belongings I use every day." },
  { id: "org5", subscale: "organizationOfMaterials", text: "Papers and files pile up without being dealt with." },
] as const;

export const ITEMS_PER_SUBSCALE = 5;
export const MIN_ITEM_SCORE = 1;
export const MAX_ITEM_SCORE = 3;

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export type Responses = Partial<Record<string, ResponseValue>>;

export interface ScaleScore {
  /** Sum of the raw 1-3 item responses. */
  raw: number;
  min: number;
  max: number;
  /** Position within the possible range, 0-1. Comparable across scales. */
  proportion: number;
  itemCount: number;
}

export interface SelfReportScore {
  subscales: Record<SubscaleId, ScaleScore>;
  indices: Record<IndexId, ScaleScore>;
  /** The overall composite — every item, analogous to BRIEF-A's GEC. */
  composite: ScaleScore;
}

function makeScale(raw: number, itemCount: number): ScaleScore {
  const min = itemCount * MIN_ITEM_SCORE;
  const max = itemCount * MAX_ITEM_SCORE;
  return {
    raw,
    min,
    max,
    proportion: max === min ? 0 : (raw - min) / (max - min),
    itemCount,
  };
}

/** Item ids with no response yet — the questionnaire is only scorable when empty. */
export function missingItems(responses: Responses): string[] {
  return ITEMS.filter((item) => responses[item.id] === undefined).map((item) => item.id);
}

export function isComplete(responses: Responses): boolean {
  return missingItems(responses).length === 0;
}

/**
 * Score a completed questionnaire.
 *
 * Throws on an incomplete set rather than scoring what is there: a partial sum
 * looks like a lower score, and silently logging one would put a meaningless
 * point on the trend chart that is indistinguishable from a real improvement.
 */
export function score(responses: Responses): SelfReportScore {
  const missing = missingItems(responses);
  if (missing.length > 0) {
    throw new Error(`cannot score: ${missing.length} item(s) unanswered`);
  }

  const subscales = {} as Record<SubscaleId, ScaleScore>;
  for (const id of Object.keys(SUBSCALES) as SubscaleId[]) {
    const items = ITEMS.filter((item) => item.subscale === id);
    const raw = items.reduce((sum, item) => sum + (responses[item.id] as ResponseValue), 0);
    subscales[id] = makeScale(raw, items.length);
  }

  const indices = {} as Record<IndexId, ScaleScore>;
  for (const id of Object.keys(INDICES) as IndexId[]) {
    const members = INDICES[id].subscales.map((s) => subscales[s]);
    indices[id] = makeScale(
      members.reduce((sum, s) => sum + s.raw, 0),
      members.reduce((sum, s) => sum + s.itemCount, 0),
    );
  }

  const composite = makeScale(
    Object.values(indices).reduce((sum, s) => sum + s.raw, 0),
    ITEMS.length,
  );

  return { subscales, indices, composite };
}

// ---------------------------------------------------------------------------
// Session record
// ---------------------------------------------------------------------------

export interface SelfReportSession {
  id: string;
  timestamp: string;
  durationMs: number;
  responses: Record<string, ResponseValue>;
  scores: SelfReportScore;
}
