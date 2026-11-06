import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import PossibleMatches from "@/app/estate-sale-planner/PossibleMatches";
import SoldPriceCheck from "@/app/estate-sale-planner/SoldPriceCheck";
import type { CompsCheck } from "@/lib/estate-sale-planner/comps/check";
import type { SoldListing } from "@/lib/estate-sale-planner/comps/provider";

afterEach(cleanup);

const sale = (n: number, extra: Partial<SoldListing> = {}): SoldListing => ({
  title: `Teak roll top desk ${n}`,
  priceCents: 50_000 + n * 100,
  soldAt: "2026-10-02T12:00:00Z",
  url: `https://www.ebay.com/itm/${n}`,
  image: `https://i.ebayimg.com/${n}.jpg`,
  ...extra,
});
const cards = () => screen.getAllByRole("listitem");

describe("PossibleMatches", () => {
  it("shows nothing when there's nothing to show", () => {
    const { container } = render(<PossibleMatches matches={[]} onPick={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows each sale's photo, title, price, date and link, without calling them closest", () => {
    render(<PossibleMatches matches={[sale(1), sale(2)]} onPick={() => {}} />);
    expect(screen.getByText("Possible matches (2)")).toBeInTheDocument();
    expect(screen.queryByText(/closest/i)).toBeNull();
    const card = within(cards()[0]);
    expect(card.getByText("Teak roll top desk 1")).toBeInTheDocument();
    expect(card.getByText("$501")).toBeInTheDocument();
    expect(card.getByText(/Sold Oct 2/)).toBeInTheDocument();
    expect(card.getByRole("link", { name: /View on eBay/ })).toHaveAttribute("href", "https://www.ebay.com/itm/1");
    expect(card.getByRole("img", { name: "Teak roll top desk 1" })).toHaveAttribute("src", "https://i.ebayimg.com/1.jpg");
  });

  it("explains the choice before one is picked, and how to undo it after", () => {
    const { rerender } = render(<PossibleMatches matches={[sale(1), sale(2)]} onPick={() => {}} />);
    expect(screen.getByText(/Compare the photos and pick the one most like yours/)).toBeInTheDocument();
    rerender(<PossibleMatches matches={[sale(1), sale(2)]} pickedUrl={sale(1).url} onPick={() => {}} />);
    expect(screen.getByText("Picked. Tap it again to undo.")).toBeInTheDocument();
  });

  it("picks a sale, and marks only that one as picked", () => {
    const onPick = vi.fn();
    render(<PossibleMatches matches={[sale(1), sale(2)]} pickedUrl={sale(2).url} onPick={onPick} />);
    const [first, second] = screen.getAllByRole("button", { name: /Most likely/ });
    expect(first).toHaveAttribute("aria-pressed", "false");
    expect(second).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(first);
    expect(onPick).toHaveBeenCalledWith(sale(1));
  });

  it("says how far along the carousel you are, and skips that for one card", () => {
    const { rerender } = render(<PossibleMatches matches={[sale(1), sale(2), sale(3)]} onPick={() => {}} />);
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    rerender(<PossibleMatches matches={[sale(1)]} onPick={() => {}} />);
    expect(screen.queryByText("1 of 1")).toBeNull();
  });

  it("keeps the counter valid when a later check returns fewer matches", () => {
    const five = [sale(1), sale(2), sale(3), sale(4), sale(5)];
    const { rerender } = render(<PossibleMatches matches={five} onPick={() => {}} />);
    const track = screen.getByRole("list");
    // jsdom has no layout, so a card is 0 wide and a step is the 16 px gap.
    track.scrollLeft = 64;
    fireEvent.scroll(track);
    expect(screen.getByText("5 of 5")).toBeInTheDocument();
    rerender(<PossibleMatches matches={five.slice(0, 2)} onPick={() => {}} />);
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
  });

  it("still works for a sale with no photo, or one whose photo fails to load", () => {
    render(<PossibleMatches matches={[sale(1, { image: undefined }), sale(2)]} onPick={() => {}} />);
    expect(within(cards()[0]).getByText("No photo")).toBeInTheDocument();
    fireEvent.error(within(cards()[1]).getByRole("img"));
    expect(within(cards()[1]).getByText("No photo")).toBeInTheDocument();
  });
});

const check: CompsCheck = {
  at: "2026-11-06T18:11:56.255Z",
  status: "ok",
  given: { name: "Mid-century barrel top desk", note: "Signed", priceBefore: "$250–$500" },
  query: "barrel top desk",
  tried: [{ query: "barrel top desk", found: 15 }, { query: "roll top desk", found: 50 }],
  queryReused: false,
  provider: "compsapi",
  listingsAt: "2026-11-06T18:11:56.255Z",
  found: 15,
  checked: 15,
  matched: 1,
  reason: "Kept the actual desk.",
  matches: [sale(1)],
  leftOut: [sale(2)],
};

describe("SoldPriceCheck", () => {
  it("starts collapsed, with the timestamp showing", () => {
    render(<SoldPriceCheck check={check} />);
    expect(screen.getByText(/^Checked Nov 6, 2026/)).toBeInTheDocument();
    expect(screen.queryByText("What it was given")).toBeNull();
  });

  it("shows everything on request, and doesn't claim the check set a price", () => {
    render(<SoldPriceCheck check={check} />);
    fireEvent.click(screen.getByRole("button", { name: "Show details" }));
    expect(screen.getByText("What it was given")).toBeInTheDocument();
    expect(screen.getByText("Mid-century barrel top desk")).toBeInTheDocument();
    expect(screen.getByText(/barrel top desk \(15 found\); roll top desk \(50 found\)/)).toBeInTheDocument();
    expect(screen.queryByText("Price set to")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Hide details" }));
    expect(screen.queryByText("What it was given")).toBeNull();
  });
});
