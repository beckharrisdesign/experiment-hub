/**
 * Agent rubrics — the single source of truth for what each agent
 * in the experiment workflow is responsible for and how to verify it.
 *
 * Used by:
 * - app/heuristics/page.tsx  (renders agent cards)
 * - tests/agents/heuristics.test.ts  (verifies agent files comply)
 */

export interface AgentRubric {
  /** @-handle used in Cursor/Claude */
  handle: string;
  /** Human role title */
  role: string;
  /** Path to the agent instruction file, relative to repo root */
  file: string;
  /** What this agent receives */
  input: string;
  /** What this agent produces */
  output: string;
  /** Human-readable checklist shown on the heuristics page */
  rubric: string[];
  /**
   * Strings that MUST appear in the agent file.
   * Tests fail if any are missing — the file has drifted from its rubric.
   */
  markers: string[];
  /**
   * Strings that must NOT appear in the agent file.
   * Guards against scope creep (e.g. experiment-creator must not generate scores).
   */
  prohibitions?: string[];
}

export const agentRubrics: AgentRubric[] = [
  {
    handle: "experiment-creator",
    role: "Product Strategist",
    file: "skills/experiment-creator.md",
    input: "Raw idea",
    output: "Structured experiment with directory and metadata; Human anchor prose for OpenSpec lite proposal",
    rubric: [
      "Captures founder words verbatim (1–3 sentences) as Human anchor for `/opsx:propose` (experiment-hub-lite)",
      "Refines the concept before creating any files",
      "Generates a one-line statement that must pass the passion + market need + social impact test",
      "Proposes tags from the established experiment taxonomy",
      "Creates the directory structure before writing metadata",
      "Never generates scores — scoring belongs to @market-research",
      "Stops after each step and waits for explicit approval",
    ],
    markers: ["approval", "statement", "directory", "metadata", "tags"],
    prohibitions: ["score: "],
  },
  {
    handle: "market-research",
    role: "Entrepreneurship Mentor",
    file: "skills/market-research.md",
    input: "Experiment statement and target market",
    output: "Market research report with TAM/SAM/SOM and experiment scores",
    rubric: [
      "Collects at least 2 real-world market signals before calculating TAM",
      "Uses bottom-up methodology (customer count × ARPU) as the primary TAM",
      "Uses top-down only as a cross-check — never the headline number",
      "Cites a competitor revenue anchor to sanity-check TAM scale",
      "Includes an explicit Assumptions section",
      "Justifies confidence level — HIGH requires verifiable sources",
      "Generates scores across all 5 dimensions: B, P, C, $, S",
    ],
    markers: [
      "bottom-up",
      "top-down",
      "competitor",
      "Assumptions",
      "TAM",
      "SAM",
      "SOM",
      "approval",
    ],
  },
  {
    handle: "prd-writer",
    role: "Product requirements (lean PRD)",
    file: "skills/prd-writer.md",
    input: "Business case, experiment statement, optional market research skim",
    output: "PRD saved to docs/PRD.md with outcomes and failing tests",
    rubric: [
      "Aligns with business-case.md; does not paste TAM/SAM/SOM from market research",
      "Success metrics include outcomes and explicit Fails until checks",
      "Follows prd-template.mdc section order; no user-stories or tech-spec sections",
      "Invokes @design-advisor when UI is specified",
      "Saves to experiments/{slug}/docs/PRD.md and does not auto-start prototype",
    ],
    markers: [
      "design-advisor",
      "Fails until",
      "failing test",
      "Outcomes",
      "business-case",
    ],
  },
  {
    handle: "prototype-builder",
    role: "Senior Engineering Lead",
    file: "skills/prototype-builder.md",
    input: "PRD (required)",
    output: "Working prototype with zero-manual-step startup",
    rubric: [
      "Requires a completed PRD before starting",
      "Assigns a port sequentially from PROTOTYPE_PORTS.md",
      "Creates .env.local.example with all required variables",
      "Invokes @design-advisor for design compliance review",
      "Startup requires zero manual steps after npm install",
    ],
    markers: [
      "design-advisor",
      "approval",
      "PROTOTYPE_PORTS",
      ".env.local",
      "port",
    ],
  },
  {
    handle: "design-advisor",
    role: "Design Lead / UX Director",
    file: "skills/design-advisor.md",
    input: "PRD, prototype code, or live deployed URL",
    output: "Design review report with heuristic findings and recommendations",
    rubric: [
      "Runs test-site.sh before any heuristic evaluation (test-first)",
      "Applies Nielsen's 10 usability heuristics in live evaluation",
      "Reviews both code and live browser — neither alone is sufficient",
      "Checks design token compliance (colors, spacing, typography)",
      "Verifies accessibility basics: keyboard, contrast, semantic HTML",
      "Invoked automatically by @prd-writer and @prototype-builder",
    ],
    markers: [
      "test-site.sh",
      "Nielsen",
      "heuristic",
      "approval",
      "accessibility",
    ],
  },
];
