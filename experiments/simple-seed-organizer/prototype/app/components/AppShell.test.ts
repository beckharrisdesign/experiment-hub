import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/components/Header", () => ({
  Header: () => null,
}));

function render() {
  return renderToStaticMarkup(
    createElement(AppShell, null, createElement("div", null, "page content"))
  );
}

describe("AppShell footer — logged out", () => {
  it("renders the footer", () => {
    expect(render()).toContain("<footer");
  });

  it("includes a link to /privacy", () => {
    expect(render()).toContain('href="/privacy"');
  });

  it("includes a link to /terms", () => {
    expect(render()).toContain('href="/terms"');
  });

  it("includes a contact link", () => {
    expect(render()).toContain('href="mailto:katy@beckharrisdesign.com"');
  });
});
