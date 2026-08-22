/**
 * Tests for components/ImpactScores.tsx (scoring-impact-rubric): tab bar with
 * score badges, in-place legend with the scored anchor bold, justification
 * rendering, History as the fourth tab, and empty states.
 */
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ImpactScoresDisplay from "@/components/ImpactScores";
import { IMPACT_ANCHORS } from "@/lib/rubric";

const scores = { personal: 5, social: 4, business: 2 };

describe("ImpactScoresDisplay", () => {
  it("shows the IMPACT SCORE head with the n/15 total", () => {
    render(<ImpactScoresDisplay scores={scores} />);
    expect(screen.getByText("Impact score")).toBeTruthy();
    expect(screen.getByText("11/15")).toBeTruthy();
  });

  it("renders four tabs with a score badge on each dimension", () => {
    render(<ImpactScoresDisplay scores={scores} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Personal5",
      "Social4",
      "Business2",
      "History",
    ]);
  });

  it("opens with the Personal legend, scored anchor bold", () => {
    render(<ImpactScoresDisplay scores={scores} />);
    const scored = screen
      .getByText(IMPACT_ANCHORS.personal[0].text)
      .closest("div");
    const other = screen
      .getByText(IMPACT_ANCHORS.personal[1].text)
      .closest("div");
    expect(scored?.className).toContain("font-bold");
    expect(other?.className).toContain("font-normal");
  });

  it("renders the selected dimension's justification with paragraphs preserved", () => {
    render(
      <ImpactScoresDisplay
        scores={scores}
        rationale={{ personal: "First paragraph.\n\nSecond paragraph." }}
      />,
    );
    const prose = screen.getByText(/First paragraph\./);
    expect(prose.textContent).toBe("First paragraph.\n\nSecond paragraph.");
    expect(prose.className).toContain("whitespace-pre-wrap");
  });

  it("shows the empty-state note for dimensions without a Why: page", () => {
    render(<ImpactScoresDisplay scores={scores} />);
    fireEvent.click(screen.getByRole("tab", { name: /Business/ }));
    expect(screen.getByText("Nothing written here yet.")).toBeTruthy();
    expect(
      screen.getByText(IMPACT_ANCHORS.business[3].text),
    ).toBeTruthy();
  });

  it("renders milestones under the History tab", () => {
    render(
      <ImpactScoresDisplay
        scores={scores}
        history={[
          {
            id: "hist-1",
            date: "2026-07-01",
            when: "Jul 2026",
            milestone: "Became the flagship.",
            receiptUrl: null,
            sources: [
              [
                { text: "Katy:", bold: true, code: false, href: null },
                { text: " \"the flagship story.\"", bold: false, code: false, href: null },
              ],
            ],
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "History" }));
    expect(screen.getByText("Became the flagship.")).toBeTruthy();
    expect(screen.getByText("Jul 2026")).toBeTruthy();
  });

  it("shows an empty History state rather than nothing", () => {
    render(<ImpactScoresDisplay scores={scores} />);
    fireEvent.click(screen.getByRole("tab", { name: "History" }));
    expect(screen.getByText("No milestones yet.")).toBeTruthy();
  });
});
