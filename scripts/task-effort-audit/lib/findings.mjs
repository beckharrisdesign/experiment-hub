/*
 * Findings: each one names the task and step, says whether it is an
 * observation (the runner saw it), an annotation (a reviewer declared it), or a
 * hypothesis (a possible explanation, unverified), and points to evidence.
 *
 * No severity, user reaction, or business impact is ever generated.
 */

const TRACE = { type: 'trace', ref: 'trace.zip' };

function evidenceFor(entry) {
  const ev = [{ type: 'ledger', ref: `actions.json#${entry.index}` }];
  if (entry.screenshot) ev.unshift({ type: 'screenshot', ref: entry.screenshot });
  ev.push(TRACE);
  return ev;
}

function suggestion(entry) {
  const text = entry.annotations?.suggestion;
  return text ? { suggestion: { label: 'Suggestion, not an observed fact', text } } : {};
}

/**
 * @param {{ taskId: string, scenario: string, entries: any[], failure: any, verification: any,
 *   blockedRequests?: any[], cleanup?: any, failureScreenshot?: string | null }} p
 */
export function buildFindings({ taskId, scenario, entries, failure, verification, blockedRequests = [], cleanup, failureScreenshot = null }) {
  const out = [];
  const add = (f) => out.push({ id: `F${out.length + 1}`, taskId, scenario, ...f });

  for (const e of entries) {
    if (!e.counted) continue;
    const re = e.annotations?.repeatedEntry;
    if (re) {
      add({
        key: `repeated-entry:${scenario}:${e.stepId}`,
        stepId: e.stepId,
        kind: 'annotation',
        statement: `${e.target} asks for information that was already supplied or available: ${re.source}. ${re.explanation}`,
        evidence: evidenceFor(e),
        reviewRequired: true,
        reviewNote: 'Counted from a reviewed annotation, not detected by the runner. Confirm it still holds.',
        ...suggestion(e),
      });
    }
    const cs = e.annotations?.contextSwitch;
    if (cs) {
      add({
        key: `context-switch:${scenario}:${e.stepId}`,
        stepId: e.stepId,
        kind: 'annotation',
        statement: `Context switch (${cs.boundary}): ${cs.from} → ${cs.to}.`,
        evidence: evidenceFor(e),
        reviewRequired: true,
        reviewNote: 'Counted from a reviewed annotation, not detected by the runner. Confirm the boundary still applies.',
        ...suggestion(e),
      });
    }
    if (e.conditional?.performed) {
      add({
        key: `conditional-performed:${scenario}:${e.stepId}`,
        stepId: e.stepId,
        kind: 'observation',
        statement: `Conditional step ran because its condition was met (${e.conditional.reason}); it added 1 action.`,
        evidence: evidenceFor(e),
        reviewRequired: true,
        reviewNote: 'An added step can serve a legitimate purpose (e.g. preventing a mistake). Review before treating it as a regression.',
      });
    }
  }

  const recovery = entries.filter((e) => e.counted && e.phase === 'recovery');
  if (recovery.length) {
    const err = entries.find((e) => e.do === 'expectError' && e.outcome === 'done');
    add({
      key: `recovery:${scenario}`,
      stepId: recovery[0].stepId,
      kind: 'observation',
      statement: `Recovering from the controlled error${err ? ` (${err.target})` : ''} took ${recovery.length} action(s), counted separately from the path.`,
      evidence: [
        ...(err ? evidenceFor(err).slice(0, -1) : []),
        ...evidenceFor(recovery[recovery.length - 1]),
      ],
      reviewRequired: false,
    });
  }

  if (failure) {
    add({
      key: `path-stopped:${scenario}:${failure.stepId}:${failure.category}`,
      stepId: failure.stepId,
      kind: 'observation',
      statement: `Reference path stopped at step "${failure.stepId}": ${failure.label}. Observed: ${failure.observed}`,
      evidence: [
        ...(failureScreenshot ? [{ type: 'screenshot', ref: failureScreenshot }] : []),
        { type: 'ledger', ref: `actions.json#${entries.length - 1}` },
        TRACE,
      ],
      reviewRequired: true,
      reviewNote: `Root cause not established. ${failure.reviewNote}`,
    });
  }

  for (const a of verification.assertions.filter((x) => x.outcome === 'failed')) {
    add({
      key: `verification-failed:${scenario}:${a.stepId}`,
      stepId: a.stepId,
      kind: 'observation',
      statement: `Independent verification "${a.stepId}" did not hold: ${a.observed}`,
      evidence: [
        ...(a.screenshot ? [{ type: 'screenshot', ref: a.screenshot }] : []),
        { type: 'ledger', ref: `actions.json#${a.ledgerIndex}` },
        TRACE,
      ],
      reviewRequired: true,
      reviewNote: 'The path reached its end but the intended final state was not confirmed. Root cause not established.',
    });
  }

  for (const b of blockedRequests) {
    add({
      key: `safety-blocked:${scenario}:${b.stepId}`,
      stepId: b.stepId,
      kind: 'observation',
      statement: `Blocked ${b.method} ${b.url}: ${b.reason}.`,
      evidence: [{ type: 'run', ref: 'run.json#safety.blockedRequests' }, TRACE],
      reviewRequired: true,
      reviewNote: 'Decide whether the request is a real state change (declare it) or reviewed as harmless (allowlist it on the property).',
    });
  }

  if (cleanup?.residualChanges) {
    add({
      key: `residual-changes:${scenario}`,
      stepId: null,
      kind: 'observation',
      statement: `Test changes may remain in the environment: ${cleanup.detail}`,
      evidence: [{ type: 'run', ref: 'run.json#cleanup' }, TRACE],
      reviewRequired: true,
      reviewNote: 'Reset the test environment/account by hand before the next run.',
    });
  }
  return out;
}
