import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacyPolicyPage from "@/app/policy/page";
import TermsPage from "@/app/terms/page";

const { pathnameState } = vi.hoisted(() => ({
  pathnameState: { current: "/" },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.current,
}));

// ---------------------------------------------------------------------------
// /policy
// ---------------------------------------------------------------------------

describe("Privacy policy page", () => {
  beforeEach(() => {
    pathnameState.current = "/policy";
  });

  it("renders the title and a last-updated date", () => {
    render(<PrivacyPolicyPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /privacy policy/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/last updated/i)).toBeInTheDocument();
  });

  it("carries the Google Limited Use disclosure the consent screen points at", () => {
    render(<PrivacyPolicyPage />);
    expect(
      screen.getByText(/google api services user data policy/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/limited use/i)).toBeInTheDocument();
  });

  it("gives a working contact and a link to the terms", () => {
    render(<PrivacyPolicyPage />);
    const mailLinks = screen.getAllByRole("link", {
      name: /katy@beckharrisdesign\.com/i,
    });
    expect(mailLinks.length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: /terms of service/i }),
    ).toHaveAttribute("href", "/terms");
  });
});

// ---------------------------------------------------------------------------
// /terms
// ---------------------------------------------------------------------------

describe("Terms of service page", () => {
  beforeEach(() => {
    pathnameState.current = "/terms";
  });

  it("renders the title and a last-updated date", () => {
    render(<TermsPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /terms of service/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/last updated/i)).toBeInTheDocument();
  });

  it("links back to the privacy policy", () => {
    render(<TermsPage />);
    expect(
      screen.getByRole("link", { name: /privacy policy/i }),
    ).toHaveAttribute("href", "/policy");
  });
});
