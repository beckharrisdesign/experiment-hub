/**
 * Heuristic rubric compliance tests.
 *
 * Verifies that each agent instruction file contains the markers that
 * prove its rubric is actually documented within it. If a marker goes
 * missing the agent has drifted from its spec — these tests fail fast.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { agentRubrics } from "@/lib/agent-rubrics";

const root = resolve(__dirname, "../..");

function readAgent(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf-8");
}

describe("Agent rubric compliance", () => {
  for (const agent of agentRubrics) {
    describe(`@${agent.handle}`, () => {
      let content: string;

      beforeAll(() => {
        content = readAgent(agent.file);
      });

      it("agent file exists and is non-empty", () => {
        expect(content.length).toBeGreaterThan(0);
      });

      it("rubric array is non-empty", () => {
        expect(agent.rubric.length).toBeGreaterThan(0);
      });

      it("has a defined input and output", () => {
        expect(agent.input.length).toBeGreaterThan(0);
        expect(agent.output.length).toBeGreaterThan(0);
      });

      for (const marker of agent.markers) {
        it(`contains required marker: "${marker}"`, () => {
          expect(content).toContain(marker);
        });
      }

      if (agent.prohibitions) {
        for (const banned of agent.prohibitions) {
          it(`does not contain prohibited string: "${banned}"`, () => {
            expect(content).not.toContain(banned);
          });
        }
      }
    });
  }
});

describe("Rubric data consistency", () => {
  it("all agent handles are unique", () => {
    const handles = agentRubrics.map((a) => a.handle);
    expect(new Set(handles).size).toBe(handles.length);
  });

  it("all agent files are unique", () => {
    const files = agentRubrics.map((a) => a.file);
    expect(new Set(files).size).toBe(files.length);
  });

  it("every agent has at least 3 rubric criteria", () => {
    for (const agent of agentRubrics) {
      expect(agent.rubric.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("every agent has at least 3 markers", () => {
    for (const agent of agentRubrics) {
      expect(agent.markers.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("design-advisor is referenced by prd-writer and prototype-builder", () => {
    const prd = agentRubrics.find((a) => a.handle === "prd-writer");
    const proto = agentRubrics.find((a) => a.handle === "prototype-builder");
    expect(prd?.markers).toContain("design-advisor");
    expect(proto?.markers).toContain("design-advisor");
  });

  it("experiment-creator prohibits score generation", () => {
    const creator = agentRubrics.find((a) => a.handle === "experiment-creator");
    expect(creator?.prohibitions?.length).toBeGreaterThan(0);
  });

  it("market-research requires bottom-up and competitor markers", () => {
    const mr = agentRubrics.find((a) => a.handle === "market-research");
    expect(mr?.markers).toContain("bottom-up");
    expect(mr?.markers).toContain("competitor");
    expect(mr?.markers).toContain("Assumptions");
  });
});
