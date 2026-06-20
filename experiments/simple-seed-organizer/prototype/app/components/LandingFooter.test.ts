import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandingFooter } from "./LandingFooter";

function render() {
  return renderToStaticMarkup(createElement(LandingFooter));
}

describe("LandingFooter", () => {
  it("renders a footer element", () => {
    expect(render()).toContain("<footer");
  });

  it("links to /privacy with correct label", () => {
    const html = render();
    expect(html).toContain('href="/privacy"');
    expect(html).toContain("Privacy Policy");
  });

  it("links to /terms with correct label", () => {
    const html = render();
    expect(html).toContain('href="/terms"');
    expect(html).toContain("Terms of Service");
  });

  it("links to contact email with correct label", () => {
    const html = render();
    expect(html).toContain('href="mailto:katy@beckharrisdesign.com"');
    expect(html).toContain("Contact");
  });

  it("does not contain placeholder href anchors", () => {
    expect(render()).not.toContain('href="#"');
  });
});
