// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parseTaskAndProperty } from "../../../scripts/task-effort-audit/lib/config.mjs";
import {
  createRequestGuard,
  credentialProblems,
  definitionSafetyProblems,
  runAuthorizationProblems,
} from "../../../scripts/task-effort-audit/lib/safety.mjs";
import { rawProperty, rawTask } from "./helpers";

const load = (task: any = rawTask(), prop: any = rawProperty()) =>
  parseTaskAndProperty(task, prop);

// ---------------------------------------------------------------------------
// Run authorization — writes need config + approval + runtime opt-in
// ---------------------------------------------------------------------------

describe("write authorization", () => {
  it("refuses a mutating task without the runtime --allow-writes opt-in", () => {
    const { task, property } = load();
    expect(
      runAuthorizationProblems(task, property, { allowWrites: false }).join(
        "\n",
      ),
    ).toMatch(/--allow-writes/);
    expect(
      runAuthorizationProblems(task, property, { allowWrites: true }),
    ).toEqual([]);
  });

  it("refuses writes on a property not approved for writes", () => {
    const { task, property } = load(
      rawTask(),
      rawProperty({ writesApproved: false }),
    );
    expect(
      runAuthorizationProblems(task, property, { allowWrites: true }).join(
        "\n",
      ),
    ).toMatch(/not approved for writes/);
  });

  it("never allows writes against production, even with every flag", () => {
    const { task, property } = load(
      rawTask({ setup: [] }),
      rawProperty({
        environment: "production",
        baseUrl: "https://example.com",
        writesApproved: true,
      }),
    );
    expect(
      runAuthorizationProblems(task, property, { allowWrites: true }).join(
        "\n",
      ),
    ).toMatch(/never run against production/);
  });

  it("needs no opt-in for a read-only task", () => {
    const steps = [
      { id: "open", do: "click", target: { role: "link", name: "Thing" } },
    ];
    const { task, property } = load(
      rawTask({
        allowedMutations: [],
        scenarios: { normal: { kind: "normal", steps } },
      }),
    );
    expect(
      runAuthorizationProblems(task, property, { allowWrites: false }),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Definition checks — always on
// ---------------------------------------------------------------------------

describe("prohibited actions", () => {
  const withStep = (s: any) =>
    rawTask({ scenarios: { normal: { kind: "normal", steps: [s] } } });

  it.each([
    "Delete account",
    "Pay now",
    "Send message",
    "Place order",
    "Remove member",
  ])("refuses to click %s", (name) => {
    const { task, property } = load(
      withStep({ id: "x", do: "click", target: { role: "button", name } }),
    );
    expect(definitionSafetyProblems(task, property).join("\n")).toMatch(
      /prohibited action/,
    );
  });

  it("refuses prohibited mutation kinds", () => {
    const { task, property } = load(
      rawTask({
        allowedMutations: [
          { id: "thing.value", kind: "delete", description: "d" },
        ],
      }),
    );
    expect(definitionSafetyProblems(task, property).join("\n")).toMatch(
      /kind "delete" is prohibited/,
    );
  });

  it("refuses typing into a password field", () => {
    const { task, property } = load(
      withStep({
        id: "p",
        do: "fill",
        target: { label: "Password" },
        value: "x",
      }),
    );
    expect(definitionSafetyProblems(task, property).join("\n")).toMatch(
      /password field/,
    );
  });

  it("refuses DELETE in setup or cleanup, and calls outside the fixture API", () => {
    const { task, property } = load(
      rawTask({
        setup: [
          { type: "fixtureApi", method: "POST", path: "/api/real-endpoint" },
        ],
        cleanup: [
          { type: "fixtureApi", method: "DELETE", path: "/__fixture/rows" },
        ],
      }),
    );
    const p = definitionSafetyProblems(task, property).join("\n");
    expect(p).toMatch(/outside the property's fixtureApi prefix/);
    expect(p).toMatch(/no DELETE/);
  });

  it("refuses a 'local' property that is not on loopback", () => {
    const { task, property } = load(
      rawTask(),
      rawProperty({ baseUrl: "https://staging.example.com" }),
    );
    expect(definitionSafetyProblems(task, property).join("\n")).toMatch(
      /not a loopback address/,
    );
  });
});

describe("credentials", () => {
  it("flags credential-looking keys and values", () => {
    expect(
      credentialProblems({ auth: { password: "hunter2" } }, "task"),
    ).toHaveLength(1);
    expect(
      credentialProblems({ testData: { header: "Bearer abc.def" } }, "task"),
    ).toHaveLength(1);
    expect(
      credentialProblems({ testData: { newEmail: "a@example.test" } }, "task"),
    ).toEqual([]);
  });

  it("treats pathEnv as a reference, not a credential", () => {
    expect(
      credentialProblems(
        { authProfiles: { o: { type: "storageState", pathEnv: "TEA_AUTH" } } },
        "property",
      ),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Request guard — runtime enforcement
// ---------------------------------------------------------------------------

describe("request guard", () => {
  const url = "http://127.0.0.1:4789/api/thing";

  it("allows reads and blocks every write in a read-only run", () => {
    const { task, property } = load();
    const g = createRequestGuard({
      task,
      property,
      allowWrites: false,
      getCurrentStep: () => ({ id: "save", mutates: "thing.value" }),
    });
    expect(g.decide({ method: "GET", url }).allow).toBe(true);
    expect(g.decide({ method: "POST", url }).allow).toBe(false);
    expect(g.violations[0]).toMatchObject({ stepId: "save", method: "POST" });
  });

  it("allows a write only during a step that declares the mutation", () => {
    const { task, property } = load();
    let current: any = { id: "enter" };
    const g = createRequestGuard({
      task,
      property,
      allowWrites: true,
      getCurrentStep: () => current,
    });
    expect(g.decide({ method: "POST", url }).allow).toBe(false);
    current = { id: "save", mutates: "thing.value" };
    expect(g.decide({ method: "POST", url }).allow).toBe(true);
    expect(g.mutations).toEqual([
      {
        stepId: "save",
        mutationId: "thing.value",
        method: "POST",
        path: "/api/thing",
      },
    ]);
  });

  it("blocks writes to another origin even during a mutating step", () => {
    const { task, property } = load();
    const g = createRequestGuard({
      task,
      property,
      allowWrites: true,
      getCurrentStep: () => ({ id: "save", mutates: "thing.value" }),
    });
    expect(
      g.decide({ method: "POST", url: "https://tracker.example.com/collect" })
        .allow,
    ).toBe(false);
  });

  it("lets reviewed allowlisted requests through in read-only mode", () => {
    const { task, property } = load(
      rawTask(),
      rawProperty({
        readOnlyRequestAllowlist: ["https://analytics.example.com/"],
      }),
    );
    const g = createRequestGuard({
      task,
      property,
      allowWrites: false,
      getCurrentStep: () => null,
    });
    expect(
      g.decide({ method: "POST", url: "https://analytics.example.com/beacon" })
        .allow,
    ).toBe(true);
    expect(g.violations).toEqual([]);
  });
});
