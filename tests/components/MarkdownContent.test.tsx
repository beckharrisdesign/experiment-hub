import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MarkdownContent from "@/components/MarkdownContent";

// ---------------------------------------------------------------------------
// Null / empty guard
// ---------------------------------------------------------------------------

describe("MarkdownContent – empty / null content", () => {
  it("renders nothing for an empty string", () => {
    const { container } = render(<MarkdownContent content="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for a whitespace-only string", () => {
    const { container } = render(<MarkdownContent content="   " />);
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Headers
// ---------------------------------------------------------------------------

describe("MarkdownContent – headers", () => {
  it("renders # as an h1 element", () => {
    render(<MarkdownContent content="# Top Heading" />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1).toHaveTextContent("Top Heading");
  });

  it("strips the '# ' prefix from h1 text", () => {
    render(<MarkdownContent content="# My Title" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("My Title");
  });

  it("renders ## as an h2 element", () => {
    render(<MarkdownContent content="## Section" />);
    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2).toBeInTheDocument();
    expect(h2).toHaveTextContent("Section");
  });

  it("strips the '## ' prefix from h2 text", () => {
    render(<MarkdownContent content="## Overview" />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Overview");
  });

  it("renders ### as an h3 element", () => {
    render(<MarkdownContent content="### Sub-section" />);
    const h3 = screen.getByRole("heading", { level: 3 });
    expect(h3).toBeInTheDocument();
    expect(h3).toHaveTextContent("Sub-section");
  });

  it("strips the '### ' prefix from h3 text", () => {
    render(<MarkdownContent content="### Details" />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Details");
  });

  it("does not treat #### (four hashes) as a special header", () => {
    // Four hashes aren't handled — falls through to regular paragraph
    render(<MarkdownContent content="#### Not a header" />);
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByText("#### Not a header")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Bullet points
// ---------------------------------------------------------------------------

describe("MarkdownContent – bullet points", () => {
  it("renders a '- ' line with a bullet character", () => {
    const { container } = render(<MarkdownContent content="- Item one" />);
    expect(container.textContent).toContain("•");
    expect(container.textContent).toContain("Item one");
  });

  it("detects bullets when the line has leading whitespace", () => {
    // line.trim().startsWith("- ") is true for "  - indented"
    const { container } = render(<MarkdownContent content="  - Indented item" />);
    expect(container.textContent).toContain("•");
  });

  it("renders plain bullet text as a span (no bold markers)", () => {
    render(<MarkdownContent content="- Plain bullet" />);
    // No <strong> elements
    const { container } = render(<MarkdownContent content="- Plain bullet" />);
    expect(container.querySelector("strong")).toBeNull();
    expect(container.textContent).toContain("Plain bullet");
  });

  it("renders **bold** text inside a bullet as <strong>", () => {
    render(<MarkdownContent content="- **Bold** item" />);
    const strong = screen.getByText("Bold");
    expect(strong.tagName).toBe("STRONG");
  });

  it("renders multiple bold spans within a single bullet", () => {
    render(<MarkdownContent content="- **A** and **B** are bold" />);
    const strongs = screen.getAllByRole("strong" as any);
    // There should be two <strong> elements
    const allStrongs = document.querySelectorAll("strong");
    expect(allStrongs).toHaveLength(2);
    expect(allStrongs[0]).toHaveTextContent("A");
    expect(allStrongs[1]).toHaveTextContent("B");
  });

  it("preserves non-bold text around bold spans in bullets", () => {
    const { container } = render(<MarkdownContent content="- prefix **bold** suffix" />);
    expect(container.textContent).toContain("prefix");
    expect(container.textContent).toContain("suffix");
  });
});

// ---------------------------------------------------------------------------
// Regular paragraphs
// ---------------------------------------------------------------------------

describe("MarkdownContent – regular paragraphs", () => {
  it("renders plain text as a <p> element", () => {
    render(<MarkdownContent content="Hello world" />);
    // getByText returns the innermost element (a <span>); climb up to the <p>
    const p = screen.getByText("Hello world").closest("p");
    expect(p).not.toBeNull();
    expect(p!.tagName).toBe("P");
  });

  it("does not render a <p> for an empty line (renders <br> instead)", () => {
    const { container } = render(<MarkdownContent content={"line one\n\nline two"} />);
    // The blank middle line should produce a <br>
    expect(container.querySelector("br")).toBeInTheDocument();
  });

  it("renders **bold** text in a paragraph as <strong>", () => {
    render(<MarkdownContent content="This is **important**." />);
    const strong = screen.getByText("important");
    expect(strong.tagName).toBe("STRONG");
  });

  it("renders multiple bold spans within a single paragraph", () => {
    render(<MarkdownContent content="**First** and **second** are bold." />);
    const allStrongs = document.querySelectorAll("strong");
    expect(allStrongs).toHaveLength(2);
    expect(allStrongs[0]).toHaveTextContent("First");
    expect(allStrongs[1]).toHaveTextContent("second");
  });

  it("preserves non-bold text around bold spans in paragraphs", () => {
    const { container } = render(<MarkdownContent content="before **mid** after" />);
    expect(container.textContent).toContain("before");
    expect(container.textContent).toContain("after");
  });

  it("does not produce any <strong> for text with no bold markers", () => {
    const { container } = render(<MarkdownContent content="No bold here at all." />);
    expect(container.querySelector("strong")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// maxLines truncation
// ---------------------------------------------------------------------------

describe("MarkdownContent – maxLines prop", () => {
  const fiveLineContent = "line 1\nline 2\nline 3\nline 4\nline 5";

  it("shows all lines when maxLines is not set", () => {
    const { container } = render(<MarkdownContent content={fiveLineContent} />);
    expect(container.textContent).toContain("line 5");
    expect(container.textContent).not.toContain("more lines");
  });

  it("truncates to exactly maxLines lines", () => {
    const { container } = render(
      <MarkdownContent content={fiveLineContent} maxLines={2} />
    );
    expect(container.textContent).toContain("line 1");
    expect(container.textContent).toContain("line 2");
    expect(container.textContent).not.toContain("line 3");
  });

  it("shows the '… (N more lines)' indicator when content is truncated", () => {
    const { container } = render(
      <MarkdownContent content={fiveLineContent} maxLines={2} />
    );
    // 5 total - 2 displayed = 3 more
    expect(container.textContent).toContain("3 more lines");
  });

  it("does NOT show the indicator when maxLines equals total line count", () => {
    const { container } = render(
      <MarkdownContent content={fiveLineContent} maxLines={5} />
    );
    expect(container.textContent).not.toContain("more lines");
  });

  it("does NOT show the indicator when maxLines exceeds total line count", () => {
    const { container } = render(
      <MarkdownContent content={fiveLineContent} maxLines={100} />
    );
    expect(container.textContent).not.toContain("more lines");
  });

  it("shows '1 more lines' when exactly one line is hidden", () => {
    const { container } = render(
      <MarkdownContent content={fiveLineContent} maxLines={4} />
    );
    expect(container.textContent).toContain("1 more lines");
  });
});

// ---------------------------------------------------------------------------
// className passthrough
// ---------------------------------------------------------------------------

describe("MarkdownContent – className prop", () => {
  it("applies custom className to the outer wrapper", () => {
    const { container } = render(
      <MarkdownContent content="Some text" className="my-custom-class" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains("my-custom-class")).toBe(true);
  });

  it("retains the default prose classes when a custom className is added", () => {
    const { container } = render(
      <MarkdownContent content="Some text" className="extra" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains("prose")).toBe(true);
  });

  it("does not throw when no className is provided (uses default empty string)", () => {
    expect(() =>
      render(<MarkdownContent content="Some text" />)
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Mixed content
// ---------------------------------------------------------------------------

describe("MarkdownContent – mixed content", () => {
  const mixed = `# Title
## Section
Normal paragraph with **bold** word.
- Bullet one
- **Strong** bullet
`;

  it("renders all line types in a single pass without throwing", () => {
    expect(() => render(<MarkdownContent content={mixed} />)).not.toThrow();
  });

  it("produces h1, h2, p, and list-like elements from mixed input", () => {
    const { container } = render(<MarkdownContent content={mixed} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Title");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Section");
    expect(container.textContent).toContain("Normal paragraph");
    expect(container.textContent).toContain("•");
    expect(container.textContent).toContain("Bullet one");
  });

  it("renders bold spans both inside bullets and inside paragraphs", () => {
    render(<MarkdownContent content={mixed} />);
    const strongs = document.querySelectorAll("strong");
    // "bold" from paragraph + "Strong" from bullet = 2 <strong>s
    expect(strongs.length).toBeGreaterThanOrEqual(2);
  });
});
