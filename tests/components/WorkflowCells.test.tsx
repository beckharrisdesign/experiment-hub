import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PRDCell, LandingPageCell } from "@/components/WorkflowCells";
import type { ValidationLandingPage } from "@/types";

// ---------------------------------------------------------------------------
// PRDCell
// ---------------------------------------------------------------------------

describe("PRDCell", () => {
  it("renders nothing when hasMRFile is false", () => {
    const { container } = render(
      <PRDCell hasMRFile={false} hasPRDFile={false} href="#prd" />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a 'Create' link when market validation is done but no PRD yet", () => {
    render(<PRDCell hasMRFile={true} hasPRDFile={false} href="/exp/test#prd" />);
    const link = screen.getByRole("link", { name: "Create" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/exp/test#prd");
  });

  it("renders a 'View' link when PRD exists", () => {
    render(<PRDCell hasMRFile={true} hasPRDFile={true} href="/exp/test#prd" />);
    const link = screen.getByRole("link", { name: "View" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/exp/test#prd");
  });
});

// ---------------------------------------------------------------------------
// LandingPageCell
// ---------------------------------------------------------------------------

describe("LandingPageCell", () => {
  const baseProps = {
    planHref: "/exp/test#landing",
    viewHref: "/landing/test/index.html",
  };

  it("renders nothing when hasPRDFile is false", () => {
    const { container } = render(
      <LandingPageCell hasPRDFile={false} hasLandingPage={false} {...baseProps} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders 'Plan' link when PRD exists but no landing page or validation", () => {
    render(
      <LandingPageCell hasPRDFile={true} hasLandingPage={false} {...baseProps} />
    );
    const link = screen.getByRole("link", { name: "Plan" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", baseProps.planHref);
  });

  it("renders 'Plan' link when validation status is not_started", () => {
    const validation: ValidationLandingPage = { status: "not_started" };
    render(
      <LandingPageCell
        hasPRDFile={true}
        hasLandingPage={false}
        validation={validation}
        {...baseProps}
      />
    );
    expect(screen.getByRole("link", { name: "Plan" })).toBeInTheDocument();
  });

  it("renders 'Planned' text when validation status is planned", () => {
    const validation: ValidationLandingPage = { status: "planned" };
    render(
      <LandingPageCell
        hasPRDFile={true}
        hasLandingPage={false}
        validation={validation}
        {...baseProps}
      />
    );
    expect(screen.getByText("Planned")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders 'Live' link when validation status is live", () => {
    const validation: ValidationLandingPage = {
      status: "live",
      url: "https://example.com/landing",
    };
    render(
      <LandingPageCell
        hasPRDFile={true}
        hasLandingPage={false}
        validation={validation}
        {...baseProps}
      />
    );
    const link = screen.getByRole("link", { name: "Live" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://example.com/landing");
  });

  it("falls back to planHref when live validation has no url", () => {
    const validation: ValidationLandingPage = { status: "live" };
    render(
      <LandingPageCell
        hasPRDFile={true}
        hasLandingPage={false}
        validation={validation}
        {...baseProps}
      />
    );
    expect(screen.getByRole("link", { name: "Live" })).toHaveAttribute(
      "href",
      baseProps.planHref
    );
  });

  it("renders 'Complete' text when validation status is complete", () => {
    const validation: ValidationLandingPage = { status: "complete" };
    render(
      <LandingPageCell
        hasPRDFile={true}
        hasLandingPage={false}
        validation={validation}
        {...baseProps}
      />
    );
    expect(screen.getByText("Complete")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders 'View' link when landing page file exists (viewExternal=true opens new tab)", () => {
    render(
      <LandingPageCell
        hasPRDFile={true}
        hasLandingPage={true}
        viewExternal={true}
        {...baseProps}
      />
    );
    const link = screen.getByRole("link", { name: "View" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", baseProps.viewHref);
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders 'View' link without new tab when viewExternal=false", () => {
    render(
      <LandingPageCell
        hasPRDFile={true}
        hasLandingPage={true}
        viewExternal={false}
        {...baseProps}
      />
    );
    const link = screen.getByRole("link", { name: "View" });
    expect(link).toBeInTheDocument();
    expect(link).not.toHaveAttribute("target", "_blank");
  });
});
