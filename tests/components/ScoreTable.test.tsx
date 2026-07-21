import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import ScoreTable, {
  getScorePillColor,
  type ScoreTableColumn,
} from "@/components/ScoreTable";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface Row {
  id: number;
  name: string;
  score: number;
}

const ROWS: Row[] = [
  { id: 1, name: "beta", score: 10 },
  { id: 2, name: "alpha", score: 30 },
  { id: 3, name: "gamma", score: 20 },
];

const COLUMNS: ScoreTableColumn<Row>[] = [
  {
    key: "name",
    header: "Name",
    sortValue: (r) => r.name,
    render: (r) => <span>{r.name}</span>,
  },
  {
    key: "score",
    header: "Score",
    compact: true,
    sortValue: (r) => r.score,
    render: (r) => <span>{r.score}</span>,
  },
  {
    key: "static",
    header: "Static",
    compact: true,
    render: () => <span>—</span>,
  },
];

function rowOrder(): string[] {
  const body = screen.getAllByRole("rowgroup")[1];
  return within(body)
    .getAllByRole("row")
    .map((tr) => within(tr).getAllByRole("cell")[0].textContent ?? "");
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("ScoreTable — rendering", () => {
  it("renders one row per item and one header per column", () => {
    render(<ScoreTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />);

    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(rowOrder()).toHaveLength(3);
  });

  it("preserves the caller's order when no default sort is given", () => {
    // The scorecard depends on this: it hands over a pre-ranked list and the
    // table must not re-order it.
    render(<ScoreTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />);
    expect(rowOrder()).toEqual(["beta", "alpha", "gamma"]);
  });

  it("applies a default sort when one is given", () => {
    render(
      <ScoreTable
        rows={ROWS}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        defaultSortKey="score"
        defaultSortDirection="desc"
      />,
    );
    expect(rowOrder()).toEqual(["alpha", "gamma", "beta"]);
  });

  it("shows the empty message instead of a table when there are no rows", () => {
    render(
      <ScoreTable
        rows={[]}
        columns={COLUMNS}
        rowKey={(r: Row) => r.id}
        emptyMessage="Nothing here."
      />,
    );
    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

describe("ScoreTable — sorting", () => {
  it("sorts descending on first click of a sortable header", () => {
    render(<ScoreTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />);

    fireEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(rowOrder()).toEqual(["gamma", "beta", "alpha"]);
  });

  it("toggles direction on a second click of the same header", () => {
    render(<ScoreTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />);

    const button = screen.getByRole("button", { name: /Name/ });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(rowOrder()).toEqual(["alpha", "beta", "gamma"]);
  });

  it("exposes the active sort direction via aria-sort", () => {
    render(<ScoreTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />);

    const header = screen.getByRole("columnheader", { name: /Score/ });
    const button = screen.getByRole("button", { name: /Score/ });

    fireEvent.click(button);
    expect(header).toHaveAttribute("aria-sort", "descending");

    fireEvent.click(button);
    expect(header).toHaveAttribute("aria-sort", "ascending");
  });

  it("ignores clicks on a column with no sortValue", () => {
    render(<ScoreTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />);

    // Non-sortable columns render no button at all, so there is nothing to click.
    expect(screen.queryByRole("button", { name: /Static/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("columnheader", { name: /Static/ }));
    expect(rowOrder()).toEqual(["beta", "alpha", "gamma"]);
  });

  it("does not mutate the rows prop while sorting", () => {
    const rows = [...ROWS];
    render(<ScoreTable rows={rows} columns={COLUMNS} rowKey={(r) => r.id} />);

    fireEvent.click(screen.getByRole("button", { name: /Score/ }));
    expect(rows.map((r) => r.id)).toEqual([1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// Keyboard accessibility
// ---------------------------------------------------------------------------

describe("ScoreTable — keyboard access", () => {
  it("exposes each sortable column as a focusable button", () => {
    render(<ScoreTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />);

    // Two sortable columns; the static one must not be a control.
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Name/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Score/ })).toBeInTheDocument();
  });

  it("sorts when a header button is activated by keyboard", () => {
    render(<ScoreTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />);

    const button = screen.getByRole("button", { name: /Name/ });
    button.focus();
    expect(button).toHaveFocus();

    // A native button fires click on Enter/Space, which is precisely why the
    // handler lives on a button rather than the <th>.
    fireEvent.click(button);
    expect(rowOrder()).toEqual(["gamma", "beta", "alpha"]);
  });
});

// ---------------------------------------------------------------------------
// Score pill thresholds
// ---------------------------------------------------------------------------

describe("getScorePillColor", () => {
  it("steps green → yellow → orange → red as the score falls", () => {
    expect(getScorePillColor(100)).toContain("green");
    expect(getScorePillColor(70)).toContain("green");
    expect(getScorePillColor(69)).toContain("yellow");
    expect(getScorePillColor(50)).toContain("yellow");
    expect(getScorePillColor(49)).toContain("orange");
    expect(getScorePillColor(35)).toContain("orange");
    expect(getScorePillColor(34)).toContain("red");
    expect(getScorePillColor(0)).toContain("red");
  });
});
