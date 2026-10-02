import { describe, it, expect } from "vitest";
import {
  CUT,
  ENGRAVE,
  generateLantern,
} from "../experiments/jack-o-lantern-faces/prototype/src/render.js";

function parsed(svg: string) {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  expect(doc.querySelector("parsererror")).toBeNull();
  return doc;
}

function strokeColors(svg: string) {
  return [...svg.matchAll(/stroke="([^"]+)"/g)].map((match) => match[1]);
}

describe("jack-o-lantern faces", () => {
  // ---------------------------------------------------------------------------
  // Prompt
  // ---------------------------------------------------------------------------

  it("draws the same prompt the same way every time", () => {
    const first = generateLantern("grumpy librarian cat");
    const second = generateLantern("  Grumpy   librarian cat  ");
    expect(first.svg).toBe(second.svg);
    expect(first.reading).toBe(second.reading);
  });

  it("changes the carving when the mood changes", () => {
    const grumpy = generateLantern("grumpy");
    const surprised = generateLantern("surprised");
    expect(grumpy.svg).not.toBe(surprised.svg);
    expect(grumpy.svg).toContain('data-style="frown"');
    expect(surprised.svg).toContain('data-style="o"');
  });

  it("reads a few prompts as a joke instead of a caption", () => {
    expect(generateLantern("grumpy cat").reading).toBe("A grumpy cat.");
    expect(generateLantern("librarian").reading).toBe(
      "A librarian who just found the overdue list.",
    );
    expect(generateLantern("surprised librarian").reading).toBe(
      "A surprised librarian who just found the overdue list.",
    );
  });

  it("still carves a face when the prompt is empty or unfamiliar", () => {
    const blank = generateLantern("");
    const odd = generateLantern("banana telescope");
    expect(blank.reading).toMatch(/no prompt/i);
    expect(odd.reading).toMatch(/improvised/);
    expect(odd.svg).not.toBe(blank.svg);
    expect(odd.svg).not.toBe(generateLantern("pickle telescope").svg);
    parsed(blank.svg);
    parsed(odd.svg);
  });

  it("keeps the prompt out of the cut file", () => {
    const { svg } = generateLantern("<script>alert(1)</script>");
    expect(svg).not.toMatch(/<text[\s>]/);
    expect(svg).not.toContain("<script>");
    expect(svg).not.toContain("alert");
    parsed(svg);
  });

  it("names the file from the prompt", () => {
    expect(generateLantern("Grumpy Cat!!!").filename).toBe("grumpy-cat.svg");
    expect(generateLantern("").filename).toBe("jack-o-lantern.svg");
    expect(generateLantern("a/b\\c").filename).not.toMatch(/[/\\]/);
  });

  // ---------------------------------------------------------------------------
  // Features
  // ---------------------------------------------------------------------------

  it("adds ears, glasses, and fangs when the prompt asks", () => {
    expect(generateLantern("cat").svg).toContain('data-part="cat-ears"');
    expect(generateLantern("librarian").svg).toContain('data-part="glasses"');
    expect(generateLantern("vampire").svg).toContain('data-part="fang"');
    expect(generateLantern("smug").svg).toContain('data-part="wink"');
  });

  // ---------------------------------------------------------------------------
  // Machine file
  // ---------------------------------------------------------------------------

  it("exports 1:1 millimetres with a cut outline and engraved face", () => {
    const { svg } = generateLantern("happy", { widthMm: 100, strokeMm: 1.2 });
    expect(svg).toContain('width="100mm"');
    expect(svg).toContain('height="120mm"');
    expect(svg).toContain('viewBox="0 0 100 120"');
    expect(svg).toContain('stroke-width="1.2"');
    expect(svg).not.toContain("NaN");
    const colors = new Set(strokeColors(svg));
    expect(colors).toEqual(new Set([CUT, ENGRAVE]));
    parsed(svg);
  });

  it("cuts the face instead of engraving it in stencil mode", () => {
    const plain = generateLantern("happy", { mode: "stencil" }).svg;
    const bookish = generateLantern("librarian", { mode: "stencil" }).svg;
    expect(strokeColors(plain).every((color) => color === CUT)).toBe(true);
    expect(plain).not.toContain('data-part="rib"');
    expect(bookish).toContain(ENGRAVE);
    expect(bookish).toContain('data-part="glasses"');
  });

  it("uses display ink for the on-screen preview", () => {
    const { svg } = generateLantern("vampire", { palette: "preview" });
    expect(svg).not.toContain(CUT);
    expect(svg).not.toContain(ENGRAVE);
    expect(svg).toContain('stroke="currentColor"');
  });

  it("clamps a wild size instead of emitting a broken file", () => {
    expect(generateLantern("happy", { widthMm: 1 }).svg).toContain('width="40mm"');
    expect(generateLantern("happy", { widthMm: 9999 }).svg).toContain(
      'width="400mm"',
    );
  });
});
