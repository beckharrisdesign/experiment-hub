// Shared factories for the task-effort-audit unit tests. Not a test file.

export function rawProperty(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    id: "test-prop",
    name: "Test property",
    baseUrl: "http://127.0.0.1:4789",
    environment: "local",
    writesApproved: true,
    fixtureApi: { pathPrefix: "/__fixture/" },
    authProfiles: { owner: { type: "none" } },
    ...overrides,
  };
}

export function rawTask(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    id: "edit-thing",
    name: "Edit a thing",
    propertyRef: "../properties/test.json",
    userRole: "Owner",
    familiarity: "Returning",
    goal: "Change the thing",
    startingState: { path: "/", description: "Home" },
    testData: { value: "new" },
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    authRef: "owner",
    limits: { maxDurationMs: 10000, maxActions: 10, stepTimeoutMs: 1000 },
    allowedMutations: [
      { id: "thing.value", kind: "update", description: "the thing" },
    ],
    comparisonContext: "v1",
    verify: [
      { id: "reload", do: "reload" },
      {
        id: "value-persisted",
        do: "assertText",
        target: { testId: "thing" },
        value: "{{data.value}}",
      },
    ],
    scenarios: {
      normal: {
        kind: "normal",
        steps: [
          { id: "open", do: "click", target: { role: "link", name: "Thing" } },
          {
            id: "enter",
            do: "fill",
            target: { label: "Value" },
            value: "{{data.value}}",
          },
          {
            id: "save",
            do: "click",
            target: { role: "button", name: "Save" },
            mutates: "thing.value",
          },
        ],
      },
    },
    ...overrides,
  };
}

/** A run record shaped like run.json, for comparison/approval tests. */
export function runRecord(overrides: Record<string, any> = {}) {
  const base = {
    runId: "20261124T000000Z-edit-thing-normal-aaaa",
    task: {
      id: "edit-thing",
      scenario: "normal",
      scenarioKind: "normal",
      definitionHash: "h1",
      comparisonContext: "v1",
    },
    property: { id: "test-prop", contextHash: "p1" },
    executionContext: {
      tooling: { tool: "0.1.0", playwright: "1.59.1", browser: "chromium 1" },
      fixtureVariant: null,
    },
    execution: {
      status: "completed",
      stepsExecuted: 3,
      stepsPlanned: 3,
      failure: null,
    },
    verification: { status: "pass", assertions: [] },
    metrics: {
      path: { actions: 3, repeatedEntryFields: 0, contextSwitches: 0 },
      recovery: { actions: 0, repeatedEntryFields: 0, contextSwitches: 0 },
      conditional: { performed: 0, skipped: 0 },
      scrolls: 0,
    },
    findings: [] as { key: string }[],
    cleanup: { residualChanges: false },
  };
  return { ...base, ...overrides };
}

/** The baseline record approveBaseline() would store for a run. */
export function baselineFrom(run: ReturnType<typeof runRecord>) {
  return {
    taskId: run.task.id,
    scenario: run.task.scenario,
    runId: run.runId,
    definitionHash: run.task.definitionHash,
    comparisonContext: run.task.comparisonContext,
    propertyContextHash: run.property.contextHash,
    metrics: run.metrics,
    findingKeys: run.findings.map((f) => f.key),
    tooling: run.executionContext.tooling,
  };
}
