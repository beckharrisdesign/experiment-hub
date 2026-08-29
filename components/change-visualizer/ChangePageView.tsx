import type { ChangePage, TimelineEvent } from "@/lib/change-visualizer";
import type { EvidenceKind } from "@/lib/change-visualizer/tasks";

/**
 * Colour carries state; labels name things. No caption narrates what the
 * reader can already see — prose is spent only on findings.
 */
const EVIDENCE_CLASS: Record<EvidenceKind, string> = {
  "automated test": "text-success",
  "code path": "text-text-primary/75",
  "human review": "text-warning",
  deferred: "text-text-muted",
  "not stated": "text-text-muted",
};

function BandLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[13px] tracking-[0.09em] text-text-muted">
      {children}
    </h2>
  );
}

function StageRail({ page }: { page: ChangePage }) {
  return (
    <section aria-labelledby="stages" className="flex flex-col gap-4">
      <div id="stages">
        <BandLabel>STAGES</BandLabel>
      </div>
      <ol className="flex flex-col gap-px overflow-hidden rounded-lg border border-border lg:flex-row lg:gap-0 lg:border-0">
        {page.gates.map((gate) => (
          <li
            key={gate.id}
            className="flex items-center gap-3 bg-background-secondary px-4 py-3 lg:flex-1 lg:flex-col lg:items-start lg:bg-transparent lg:px-0 lg:py-0"
          >
            <span
              aria-hidden
              className={`h-3 w-3 shrink-0 rounded-full border-2 ${
                gate.state === "passed"
                  ? "border-accent-primary bg-accent-primary"
                  : gate.state === "current"
                    ? "border-text-secondary bg-background-primary"
                    : "border-text-muted/45 bg-transparent"
              }`}
            />
            <span
              className={`text-[15px] font-medium lg:mt-3 ${
                gate.state === "current"
                  ? "text-text-secondary"
                  : gate.state === "passed"
                    ? "text-text-primary"
                    : "text-text-muted"
              }`}
            >
              {gate.label}
            </span>
            <span className="ml-auto font-mono text-[13px] text-text-muted lg:ml-0 lg:mt-1">
              {gate.firstDate ? gate.firstDate.slice(5, 10) : "—"}
              {gate.revisited && gate.lastDate ? ` ↻ ${gate.lastDate.slice(5, 10)}` : ""}
            </span>
            {gate.predatesRule && (
              <span className="w-full font-mono text-[13px] text-text-muted lg:mt-1">
                predates the {gate.predatesRule.rule}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Outcomes({ page }: { page: ChangePage }) {
  if (!page.outcomesAreScenarios) {
    return (
      <section aria-labelledby="outcomes" className="flex flex-col gap-4">
        <div id="outcomes">
          <BandLabel>
            OUTCOMES — {page.progress?.done ?? 0} OF {page.progress?.total ?? 0} DONE, AND
            NOT MAPPABLE TO A CAPABILITY
          </BandLabel>
        </div>
        <p className="text-[15px] leading-relaxed text-text-primary">
          This change organises its tasks by workstream rather than as spec
          scenarios, so progress cannot be split per capability.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="outcomes" className="flex flex-col gap-4">
      <div id="outcomes">
        <BandLabel>OUTCOMES — AND HOW EACH IS MEASURED</BandLabel>
      </div>
      <ul className="flex flex-col gap-px overflow-hidden rounded-lg bg-border">
        {page.outcomes.map((outcome) => (
          <li
            key={outcome.id}
            className="flex flex-col gap-1 bg-background-secondary px-4 py-3 md:flex-row md:items-baseline md:gap-4"
          >
            <span
              aria-label={outcome.state === "done" ? "done" : "not done"}
              className={`font-mono text-[13px] ${outcome.state === "done" ? "text-success" : "text-text-muted"}`}
            >
              {outcome.state === "done" ? "✓" : outcome.state === "partial" ? "~" : "○"}
            </span>
            <span className="w-9 shrink-0 font-mono text-[13px] text-text-muted">
              {outcome.id}
            </span>
            <span
              className={`flex-1 text-[15px] ${outcome.state === "done" ? "text-text-primary" : "text-text-muted"}`}
            >
              {outcome.text}
            </span>
            <span
              className={`font-mono text-[13px] md:text-right ${EVIDENCE_CLASS[outcome.evidence]}`}
            >
              {outcome.evidence}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Capabilities({ page }: { page: ChangePage }) {
  if (page.capabilities.length === 0) return null;
  return (
    <section aria-labelledby="capabilities" className="flex flex-col gap-4">
      <div id="capabilities">
        <BandLabel>
          {page.capabilities.length > 1
            ? `CAPABILITIES — ${page.capabilities.length} IN ONE CHANGE`
            : "CAPABILITY"}
        </BandLabel>
      </div>
      <ul className="flex flex-col gap-px overflow-hidden rounded-lg bg-border">
        {page.capabilities.map((cap) => (
          <li
            key={cap.name}
            className="flex flex-wrap items-baseline gap-4 bg-background-secondary px-4 py-3"
          >
            <span className="font-mono text-[15px] text-text-primary">{cap.name}</span>
            <span className="text-[15px] text-text-muted">
              {cap.requirements.length} requirement
              {cap.requirements.length === 1 ? "" : "s"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Event({ event }: { event: TimelineEvent }) {
  if (event.kind === "gap") {
    return (
      <li className="flex gap-4">
        <div className="flex w-8 shrink-0 flex-col items-center">
          <span aria-hidden className="h-3.5 w-3.5 rounded-full border border-text-muted/50" />
          <span aria-hidden className="w-0.5 flex-1 bg-accent-primary/35" />
        </div>
        <p className="pb-7 text-[15px] text-text-muted">
          {event.days} days quiet — nothing touched this change
        </p>
      </li>
    );
  }

  return (
    <li className="flex gap-4">
      <div className="flex w-8 shrink-0 flex-col items-center">
        <span
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded-full border border-accent-primary bg-background-secondary text-[13px] text-accent-primary"
        >
          {event.revisitOf.length > 0 ? "↺" : "●"}
        </span>
        <span aria-hidden className="w-0.5 flex-1 bg-accent-primary/35" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 pb-7">
        <span className="font-mono text-[12px] tracking-[0.06em] text-text-muted">
          {event.revisitOf.length > 0
            ? `↺ BACK TO ${event.revisitOf.join(" + ").toUpperCase()}`
            : event.stageLabel.toUpperCase()}
        </span>
        <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-4">
          <h3 className="text-[16px] font-medium text-text-primary">
            {event.gatesLanded.length > 0
              ? `${event.gatesLanded.join(" and ")} landed`
              : event.subjects[0]}
          </h3>
          <span className="shrink-0 font-mono text-[13px] text-text-muted">
            {event.date}
            {event.prs.length > 0
              ? ` · ${event.prs.length} pull request${event.prs.length === 1 ? "" : "s"}`
              : ""}
          </span>
        </div>
        {event.subjects.length > 0 && (
          <ul className="mt-1 flex flex-col gap-px overflow-hidden rounded-lg border border-accent-primary/25">
            {event.subjects.map((subject, i) => (
              <li
                key={`${subject}-${i}`}
                className="flex gap-3 bg-background-secondary px-4 py-2.5 font-mono text-[13px]"
              >
                <span className="w-12 shrink-0 text-success">
                  {event.prs[i] ? `#${event.prs[i]}` : ""}
                </span>
                <span className="text-text-primary">{subject}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function Findings({ page }: { page: ChangePage }) {
  if (page.findings.length === 0) return null;
  return (
    <section aria-labelledby="findings" className="flex flex-col gap-4">
      <div id="findings">
        <BandLabel>WHERE THE SOURCES DISAGREE</BandLabel>
      </div>
      {page.findings.map((finding) => (
        <div
          key={`${finding.taskId}-${finding.record}`}
          className="rounded-lg border border-warning/50 bg-background-secondary px-5 py-4"
        >
          <p className="text-[15px] leading-relaxed text-text-primary">
            <span className="font-mono text-warning">{finding.taskId}</span> — the change
            says {finding.claims}; the record shows {finding.record}.
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {finding.evidence.map((line) => (
              <li key={line} className="font-mono text-[13px] text-text-muted">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export default function ChangePageView({ page }: { page: ChangePage }) {
  const current = page.gates.find((g) => g.state === "current");
  return (
    <article className="flex flex-col gap-9 px-4 py-10 md:px-8 lg:px-16">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-3xl font-semibold text-text-primary lg:text-4xl">
          {page.id}
        </h1>
        <span className="flex items-center gap-2 rounded-full bg-background-secondary px-3.5 py-1.5 font-mono text-[13px] text-text-secondary">
          <span aria-hidden className="h-2 w-2 rounded-full bg-text-secondary" />
          {page.archived ? "ARCHIVED" : `IN ${(current?.label ?? "flight").toUpperCase()}`}
        </span>
      </header>

      {page.intent && (
        <p className="max-w-[70ch] font-heading text-[19px] leading-8 text-text-primary">
          {page.intent}
        </p>
      )}

      <StageRail page={page} />
      <Capabilities page={page} />
      <Outcomes page={page} />
      <Findings page={page} />

      <section aria-labelledby="history" className="flex flex-col gap-5">
        <div id="history">
          <BandLabel>WHAT HAPPENED</BandLabel>
        </div>
        <ol className="flex flex-col">
          {page.events.map((event, i) => (
            <Event key={event.kind === "gap" ? `gap-${i}` : `${event.date}-${i}`} event={event} />
          ))}
        </ol>
        <p className="font-mono text-[13px] text-text-muted">
          {page.prs.prs.length} pull request{page.prs.prs.length === 1 ? "" : "s"}, found by{" "}
          {page.prs.method}
          {page.prs.unattributedCommits > 0
            ? ` · ${page.prs.unattributedCommits} commit(s) carry no pull request number`
            : ""}
        </p>
      </section>
    </article>
  );
}
