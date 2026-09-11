import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import StitchPreview from "@/app/svg-to-stitch/StitchPreview";
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
