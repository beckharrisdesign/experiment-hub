import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ExperimentTypeBadge from "@/components/ExperimentTypeBadge";

// ---------------------------------------------------------------------------
// ExperimentTypeBadge
// ---------------------------------------------------------------------------

describe("ExperimentTypeBadge", () => {
  it("renders a 'Commercial' badge for the commercial type", () => {
    render(<ExperimentTypeBadge type="commercial" />);
    expect(screen.getByText("Commercial")).toBeInTheDocument();
  });

  it("renders a 'Tool' badge for the tool type", () => {
    render(<ExperimentTypeBadge type="tool" />);
    expect(screen.getByText("Tool")).toBeInTheDocument();
  });

  it("renders a 'Personal' badge for the personal type", () => {
    render(<ExperimentTypeBadge type="personal" />);
    expect(screen.getByText("Personal")).toBeInTheDocument();
  });

  it("renders nothing when type is undefined", () => {
    const { container } = render(<ExperimentTypeBadge />);
    expect(container.firstChild).toBeNull();
  });
});
