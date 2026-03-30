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
