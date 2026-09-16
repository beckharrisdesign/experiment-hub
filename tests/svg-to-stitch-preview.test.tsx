import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import StitchPreview from "@/app/svg-to-stitch/StitchPreview";
import SewOrder, { motifBreakdown } from "@/app/svg-to-stitch/SewOrder";
import { convertSvg } from "@/lib/svg-to-stitch/convert";

// Two thread colors: a red line then a blue line.
const TWO_COLOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
  <path d="M0 0 H10" stroke="#ff0000" fill="none"/>
  <path d="M0 5 H10" stroke="#0000ff" fill="none"/>
</svg>`;

function twoColorPlan() {
  return convertSvg(TWO_COLOR_SVG, {
    targetWidthMm: 100,
    stitchLengthMm: 2.5,
  }).plan;
}

function hitLines(container: HTMLElement) {
  return container.querySelectorAll("[data-color-index]");
}

function tap(el: Element, x = 0, y = 0) {
  fireEvent.pointerDown(el, { pointerId: 1, clientX: x, clientY: y });
  fireEvent.pointerUp(el, { pointerId: 1, clientX: x, clientY: y });
}

describe("StitchPreview selection", () => {
  it("renders a clickable hit line per color run", () => {
    const { container } = render(<StitchPreview plan={twoColorPlan()} />);
    const hits = hitLines(container);
    expect(hits.length).toBeGreaterThanOrEqual(2);
    const indices = new Set(
      [...hits].map((el) => el.getAttribute("data-color-index")),
    );
    expect(indices).toEqual(new Set(["0", "1"]));
  });

  it("clicking a run selects its color; clicking it again clears", () => {
    const onSelectColor = vi.fn();
    const { container, rerender } = render(
      <StitchPreview plan={twoColorPlan()} onSelectColor={onSelectColor} />,
    );
    const blue = container.querySelector('[data-color-index="1"]')!;
    tap(blue);
    expect(onSelectColor).toHaveBeenLastCalledWith(1);

    rerender(
      <StitchPreview
        plan={twoColorPlan()}
        selectedColor={1}
        onSelectColor={onSelectColor}
      />,
    );
    tap(container.querySelector('[data-color-index="1"]')!);
    expect(onSelectColor).toHaveBeenLastCalledWith(null);
  });

  it("clicking empty canvas clears the selection", () => {
    const onSelectColor = vi.fn();
    const { container } = render(
      <StitchPreview
        plan={twoColorPlan()}
        selectedColor={0}
        onSelectColor={onSelectColor}
      />,
    );
    tap(container.querySelector("svg")!);
    expect(onSelectColor).toHaveBeenLastCalledWith(null);
  });

  it("a slow drag of tiny moves still counts as a drag, not a click", () => {
    const onSelectColor = vi.fn();
    const { container } = render(
      <StitchPreview plan={twoColorPlan()} onSelectColor={onSelectColor} />,
    );
    const svg = container.querySelector("svg")!;
    fireEvent.pointerDown(svg, { pointerId: 1, clientX: 0, clientY: 0 });
    for (let x = 1; x <= 6; x++) {
      fireEvent.pointerMove(svg, { pointerId: 1, clientX: x, clientY: 0 });
    }
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 6, clientY: 0 });
    expect(onSelectColor).not.toHaveBeenCalled();
  });

  it("sub-threshold jitter still counts as a click", () => {
    const onSelectColor = vi.fn();
    const { container } = render(
      <StitchPreview plan={twoColorPlan()} onSelectColor={onSelectColor} />,
    );
    const hit = container.querySelector('[data-color-index="0"]')!;
    fireEvent.pointerDown(hit, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(hit, { pointerId: 1, clientX: 3, clientY: 0 });
    fireEvent.pointerUp(hit, { pointerId: 1, clientX: 3, clientY: 0 });
    expect(onSelectColor).toHaveBeenLastCalledWith(0);
  });

  it("a canceled pointer never selects", () => {
    const onSelectColor = vi.fn();
    const { container } = render(
      <StitchPreview plan={twoColorPlan()} onSelectColor={onSelectColor} />,
    );
    const hit = container.querySelector('[data-color-index="0"]')!;
    fireEvent.pointerDown(hit, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerCancel(hit, { pointerId: 1, clientX: 0, clientY: 0 });
    expect(onSelectColor).not.toHaveBeenCalled();
  });

  it("a drag does not change the selection", () => {
    const onSelectColor = vi.fn();
    const { container } = render(
      <StitchPreview plan={twoColorPlan()} onSelectColor={onSelectColor} />,
    );
    const svg = container.querySelector("svg")!;
    fireEvent.pointerDown(svg, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 40, clientY: 0 });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 40, clientY: 0 });
    expect(onSelectColor).not.toHaveBeenCalled();
  });

  it("marks needle penetrations on painted runs, not jumps", () => {
    const { container } = render(<StitchPreview plan={twoColorPlan()} />);
    // Top stitching only — underlay draws recessed without markers.
    const painted = [...container.querySelectorAll("polyline")].filter(
      (p) =>
        p.getAttribute("stroke")?.startsWith("#") &&
        p.getAttribute("stroke-width") === "2.5",
    );
    expect(painted.length).toBeGreaterThan(0);
    for (const p of painted) {
      expect(p.getAttribute("marker-mid")).toBe("url(#penetration)");
    }
    const jumps = [...container.querySelectorAll("polyline")].filter(
      (p) => p.getAttribute("stroke-dasharray") === "6 6",
    );
    for (const j of jumps) {
      expect(j.getAttribute("marker-mid")).toBeNull();
    }
  });

  it("dims the runs of unselected colors", () => {
    const { container } = render(
      <StitchPreview plan={twoColorPlan()} selectedColor={0} />,
    );
    const painted = [...container.querySelectorAll("polyline")].filter((p) =>
      p.getAttribute("stroke")?.startsWith("#"),
    );
    const byOpacity = (want: string) =>
      painted.filter((p) => p.getAttribute("stroke-opacity") === want);
    expect(byOpacity("1").length).toBeGreaterThan(0); // selected color
    expect(byOpacity("0.12").length).toBeGreaterThan(0); // the other color
  });
});

describe("StitchPreview underlay rendering", () => {
  it("splits contiguous stitching where the underlay flag changes and renders it recessed", () => {
    // Two contiguous runs (no jump between them): underlay first, then the
    // top fill continuing from the same position.
    const plan = {
      entries: [
        { kind: "stitch" as const, x: 0, y: 0, underlay: true },
        { kind: "stitch" as const, x: 100, y: 0, underlay: true },
        { kind: "stitch" as const, x: 200, y: 0 },
        { kind: "stitch" as const, x: 300, y: 0 },
        { kind: "end" as const, x: 300, y: 0 },
      ],
      colors: ["#e11d48"],
      stats: {
        stitches: 4,
        jumps: 0,
        colorChanges: 0,
        satinRuns: 0,
        brushRuns: 0,
        widthMm: 30,
        heightMm: 0,
      },
    };
    const { container } = render(<StitchPreview plan={plan} />);
    const painted = [...container.querySelectorAll("polyline")].filter(
      (p) => p.getAttribute("stroke") === "#e11d48",
    );
    expect(painted).toHaveLength(2);
    const recessed = painted.filter(
      (p) => p.getAttribute("stroke-opacity") === "0.35",
    );
    const top = painted.filter((p) => p.getAttribute("stroke-opacity") === "1");
    expect(recessed).toHaveLength(1);
    expect(top).toHaveLength(1);
    expect(recessed[0].getAttribute("stroke-width")).toBe("1");
  });
});

describe("StitchPreview pan and zoom", () => {
  it("zoom in shrinks the viewBox; Fit restores it", () => {
    const { container } = render(<StitchPreview plan={twoColorPlan()} />);
    const svg = container.querySelector("svg")!;
    const initial = svg.getAttribute("viewBox")!;
    const initialW = Number(initial.split(" ")[2]);

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    const zoomedW = Number(svg.getAttribute("viewBox")!.split(" ")[2]);
    expect(zoomedW).toBeLessThan(initialW);

    fireEvent.click(screen.getByRole("button", { name: "Fit design" }));
    expect(svg.getAttribute("viewBox")).toBe(initial);
  });

  it("zoom out is clamped so the design cannot be lost", () => {
    const { container } = render(<StitchPreview plan={twoColorPlan()} />);
    const svg = container.querySelector("svg")!;
    const baseW = Number(svg.getAttribute("viewBox")!.split(" ")[2]);
    const zoomOut = screen.getByRole("button", { name: "Zoom out" });
    for (let i = 0; i < 20; i++) fireEvent.click(zoomOut);
    const finalW = Number(svg.getAttribute("viewBox")!.split(" ")[2]);
    expect(finalW).toBeLessThanOrEqual(baseW * 4 + 1e-6);
  });

  it("dragging pans the viewBox", () => {
    const { container } = render(<StitchPreview plan={twoColorPlan()} />);
    const svg = container.querySelector("svg")!;
    const before = svg.getAttribute("viewBox")!;
    fireEvent.pointerDown(svg, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 60, clientY: 80 });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 60, clientY: 80 });
    const after = svg.getAttribute("viewBox")!;
    expect(after).not.toBe(before);
    // Dragging left/up moves the view right/down (content follows the finger).
    const [bx, by] = before.split(" ").map(Number);
    const [ax, ay] = after.split(" ").map(Number);
    expect(ax).toBeGreaterThan(bx);
    expect(ay).toBeGreaterThan(by);
  });

  it("pinch with two pointers zooms by the distance ratio", () => {
    const { container } = render(<StitchPreview plan={twoColorPlan()} />);
    const svg = container.querySelector("svg")!;
    const initialW = Number(svg.getAttribute("viewBox")!.split(" ")[2]);
    fireEvent.pointerDown(svg, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(svg, { pointerId: 2, clientX: 200, clientY: 100 });
    // Spread the second finger: distance 100 → 300 should zoom in ~3×.
    fireEvent.pointerMove(svg, { pointerId: 2, clientX: 400, clientY: 100 });
    const pinchedW = Number(svg.getAttribute("viewBox")!.split(" ")[2]);
    expect(pinchedW).toBeLessThan(initialW);
    expect(pinchedW).toBeCloseTo(initialW / 3, 5);
    fireEvent.pointerUp(svg, { pointerId: 2, clientX: 400, clientY: 100 });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 100, clientY: 100 });
  });

  it("double-click refits the view", () => {
    const { container } = render(<StitchPreview plan={twoColorPlan()} />);
    const svg = container.querySelector("svg")!;
    const initial = svg.getAttribute("viewBox")!;
    fireEvent.pointerDown(svg, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 50, clientY: 50 });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 50, clientY: 50 });
    expect(svg.getAttribute("viewBox")).not.toBe(initial);
    fireEvent.doubleClick(svg);
    expect(svg.getAttribute("viewBox")).toBe(initial);
  });
});

// One thread color carrying every brush in the library — the case that used
// to overflow the sew-order row and clip the stitch count off the panel.
// Ids avoid a leading "p<n>" token: the tag parser reads that as a pitch.
const ALL_BRUSHES = [
  "cross",
  "cross",
  "tick",
  "tick",
  "chain",
  "chain",
  "dot",
  "bird",
  "bean",
];
const SIX_BRUSH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
${ALL_BRUSHES.map(
  (b, i) =>
    `  <line id="run${i}_st-brush-${b}" x1="0" y1="${i * 10 + 5}" x2="100" y2="${
      i * 10 + 5
    }" stroke="#204080" stroke-width="1" fill="none"/>`,
).join("\n")}
</svg>`;

function sixBrushPlan() {
  return convertSvg(SIX_BRUSH_SVG, {
    targetWidthMm: 100,
    stitchLengthMm: 2.5,
  }).plan;
}

describe("sew-order motif breakdown", () => {
  it("never lets a glyph separate from its run count", () => {
    const text = motifBreakdown([
      { name: "cross", runs: 2 },
      { name: "bean", runs: 1 },
    ]);
    // Non-breaking space between glyph and count, so a wrap can't split them.
    expect(text).toContain("\u00a02");
    expect(text).not.toContain("✕ 2");
    expect(text).toBe("✕\u00a02\u00a0· ▬\u00a01");
  });

  it("keeps each separator on the line of the motif it follows", () => {
    const text = motifBreakdown([
      { name: "cross", runs: 1 },
      { name: "tick", runs: 1 },
    ]);
    // The only break opportunity is after the separator, never before it.
    expect(text.split(" ")).toEqual(["✕\u00a01\u00a0·", "╱\u00a01"]);
  });

  it("falls back to the brush name when there is no glyph for it", () => {
    expect(motifBreakdown([{ name: "loop", runs: 3 }])).toBe("loop\u00a03");
  });
});

describe("SewOrder rows", () => {
  it("keeps the stitch count out of the motif list when a thread carries every brush", () => {
    const plan = sixBrushPlan();
    render(<SewOrder plan={plan} />);

    const motifs = screen.getByTestId("sew-order-motifs-0");
    const stitches = screen.getByTestId("sew-order-stitches-0");

    // All six motifs are listed...
    expect(motifs).toHaveTextContent("✕ 2 · ╱ 2 · ◯ 2 · ● 1 · ∨ 1 · ▬ 1");
    // ...and the stitch count is its own element on the row's first line,
    // not the tail of the list that used to get clipped.
    expect(stitches).toHaveTextContent(
      `${plan.colorStats![0].stitches.toLocaleString()} sts`,
    );
    expect(motifs).not.toContainElement(stitches);
    expect(motifs.textContent).not.toMatch(/sts/);
  });

  it("lets the motif line wrap instead of overflowing the panel", () => {
    render(<SewOrder plan={sixBrushPlan()} />);
    // The button preset sets whitespace-nowrap on its whole subtree, so the
    // motif line has to opt back out or it clips again.
    expect(screen.getByTestId("sew-order-motifs-0")).toHaveStyle({
      whiteSpace: "normal",
    });
    // The stitch count is the one thing that must never wrap or shrink.
    expect(screen.getByTestId("sew-order-stitches-0")).toHaveStyle({
      whiteSpace: "nowrap",
      flexShrink: "0",
    });
    // Wrapping is only half of it: the button size preset pins the height at
    // 32px, so without height:auto a wrapped motif line spills out of the row
    // and over the next one. jsdom has no layout to measure, so assert the
    // property that buys the growth.
    expect(
      screen.getByTestId("sew-order-motifs-0").closest("button"),
    ).toHaveStyle({ height: "auto" });
  });

  it("shows a stitch count with no motif line when a color has no brushes", () => {
    render(<SewOrder plan={twoColorPlan()} />);
    expect(screen.getByTestId("sew-order-stitches-0")).toBeInTheDocument();
    expect(screen.queryByTestId("sew-order-motifs-0")).toBeNull();
  });

  it("stays plain for machine files, which carry no per-color stats", () => {
    const plan = { ...twoColorPlan(), colorStats: undefined };
    render(<SewOrder plan={plan} />);
    expect(screen.getByText("#ff0000")).toBeInTheDocument();
    expect(screen.queryByTestId("sew-order-stitches-0")).toBeNull();
    expect(screen.queryByTestId("sew-order-motifs-0")).toBeNull();
  });

  it("toggles the selected color when a row is clicked", () => {
    const onSelectColor = vi.fn();
    const { rerender } = render(
      <SewOrder plan={twoColorPlan()} onSelectColor={onSelectColor} />,
    );
    const rows = screen.getAllByRole("button");
    fireEvent.click(rows[1]);
    expect(onSelectColor).toHaveBeenLastCalledWith(1);

    rerender(
      <SewOrder
        plan={twoColorPlan()}
        selectedColor={1}
        onSelectColor={onSelectColor}
      />,
    );
    fireEvent.click(screen.getAllByRole("button")[1]);
    expect(onSelectColor).toHaveBeenLastCalledWith(null);
  });
});
