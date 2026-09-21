"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@beckharrisdesign/mvds";
import type { KeywordListingRow, KeywordTableRow } from "@/types";
import {
  bulkValueLabel,
  demandRatio,
  historyPeak,
  historySparkline,
  monthsAboveFloor,
  totalTagOccurrences,
} from "@/lib/keyword-metrics";

type Direction = "asc" | "desc";

/** Gap between the frozen column's edge and a pinned group label. */
const LABEL_GUTTER = 12;

/**
 * The frozen column's right edge.
 *
 * Without it a pinned column reads as a gap rather than as a column holding
 * its ground — Katy, 2026-09-21: "lets also include a shadow on the frozen
 * col so I can tell that's what is going on", then "still missing the frozen
 * column" when the first attempt drew nothing.
 *
 * Drawn with pseudo-elements rather than `border-r` + `box-shadow`, because
 * the table is `border-collapse: collapse` and under it a cell's own border
 * is merged away and its shadow paints beneath the neighbouring cells — the
 * styles compute exactly as written and render nothing. design.md Decision 12
 * predicted this ("sticky cells under border-collapse drop their borders");
 * this is what it looks like when it happens. The sticky cell is already a
 * positioned, stacked box, so an absolutely-positioned child of it escapes
 * the collapse entirely and paints above its siblings.
 *
 * `before` is the line, at full accent so it reads on the dark green; `after`
 * is the falloff to its right. A plain black shadow was the first attempt and
 * is close to invisible on `#194b31`.
 */
const FROZEN_EDGE =
  "before:pointer-events-none before:absolute before:inset-y-0 before:right-0 before:z-10 before:w-[2px] before:bg-accent-primary before:content-[''] " +
  "after:pointer-events-none after:absolute after:inset-y-0 after:left-full after:z-10 after:w-4 after:bg-gradient-to-r after:from-black/45 after:to-transparent after:content-['']";

const ALL = "__all__";
const NO_RANGE = "__none__";

/**
 * Which instrument produced a column. Every source gets a band above its own
 * short, unprefixed headers (design.md, round 01 Option A).
 *
 * The deciding constraint is name collision, not column count: KD appears
 * three times, and Avg searches / Avg clicks / Avg CTR / Etsy comp. twice
 * each — nine of the twenty columns share a name with another column. A band
 * resolves that once per source; per-header prefixes would resolve it
 * nineteen times and cost ~200px of width for the same rows.
 */
type GroupKey =
  | "keyword"
  | "erank"
  | "targeting"
  | "ranked"
  | "shop"
  | "ads";

/**
 * The kind of claim a group of columns makes, above the source bands.
 *
 * Observed is someone else's estimate of the market; Targeted is a deliberate
 * act of ours; Performance is what really happened. Katy, 2026-09-21. The
 * bands are ordered so each bucket covers a contiguous run — `Targeting`
 * moves ahead of `Ranked`, which is the only column-order change the tier
 * requires (design.md Decision 11).
 */
type BucketKey = "keyword" | "observed" | "targeted" | "performance";

const BUCKETS: { key: BucketKey; label: string; groups: GroupKey[] }[] = [
  { key: "keyword", label: "", groups: ["keyword"] },
  { key: "observed", label: "Observed", groups: ["erank"] },
  { key: "targeted", label: "Targeted", groups: ["targeting"] },
  { key: "performance", label: "Performance", groups: ["ranked", "shop", "ads"] },
];

/**
 * `window` is rendered in the band label, not a footnote.
 *
 * Shop covers the year; Etsy Ads keyword data covers the last 30 days. A
 * reader who misses that will divide one into the other and get a number
 * that corresponds to no period at all, so the scope is written where the
 * columns are read.
 */
const GROUPS: { key: GroupKey; label: string; window?: string }[] = [
  { key: "keyword", label: "" },
  { key: "erank", label: "eRank" },
  { key: "targeting", label: "Targeting" },
  { key: "ranked", label: "Ranked" },
  { key: "shop", label: "Shop — captured", window: "this year" },
  { key: "ads", label: "Etsy Ads — matched by Etsy", window: "last 30 days" },
];

/**
 * Columns as data rather than as twenty branches of a switch.
 *
 * `value` is the single source of truth for a column's number: sorting and
 * range filtering both read it, so they cannot disagree about what a column
 * means or about when it is blank. A column without `value` is not numeric
 * and is not range-filterable.
 */
interface Column {
  key: string;
  label: string;
  group: GroupKey;
  numeric?: boolean;
  /** Numeric value for sort + range. `null` means blank — never a `0`. */
  value?: (row: KeywordTableRow) => number | null;
  /**
   * Sort-only numeric key for a column that is not itself numeric, so it
   * sorts by a number without becoming range-filterable or right-aligned.
   * Found via is the only one: it renders a query list but has always sorted
   * by total tag occurrences.
   */
  sortNumber?: (row: KeywordTableRow) => number;
  /** String value for sorting a non-numeric column. */
  text?: (row: KeywordTableRow) => string;
  render: (row: KeywordTableRow) => string;
  /**
   * What this column shows on a listing sub-row.
   *
   * Absent means the column is keyword-grained — it renders blank on a
   * sub-row rather than repeating the parent's value, because repeating it
   * would read as a per-listing figure that was never measured per listing.
   */
  renderListing?: (listing: KeywordListingRow) => string;
}

/** A plain number, or an em dash. Never `0` standing in for "no data". */
function num(value: number | null): string {
  return value === null ? "—" : value.toLocaleString();
}

const COLUMNS: Column[] = [
  {
    key: "keyword",
    label: "Keyword",
    group: "keyword",
    text: (r) => r.keyword,
    render: (r) => r.keyword,
  },

  // --- eRank (the three exports merged; design.md Decisions 1-4) ---
  {
    key: "erank.searches",
    label: "Search Volume",
    group: "erank",
    numeric: true,
    value: (r) => r.erank?.searches ?? null,
    render: (r) =>
      r.erank
        ? bulkValueLabel(r.erank.searches, r.erank.searchesCensored)
        : "—",
  },
  {
    key: "erank.competition",
    label: "Etsy Competition",
    group: "erank",
    numeric: true,
    value: (r) => r.erank?.competition ?? null,
    render: (r) => num(r.erank?.competition ?? null),
  },
  {
    key: "erank.kd",
    label: "KD",
    group: "erank",
    numeric: true,
    value: (r) => r.erank?.kd ?? null,
    render: (r) => num(r.erank?.kd ?? null),
  },
  {
    key: "erank.avgClicks",
    label: "Avg Clicks",
    group: "erank",
    numeric: true,
    value: (r) => r.erank?.avgClicks ?? null,
    render: (r) =>
      r.erank ? bulkValueLabel(r.erank.avgClicks, r.erank.avgClicksCensored) : "—",
  },
  {
    key: "erank.avgCtr",
    label: "Avg CTR %",
    group: "erank",
    numeric: true,
    value: (r) => r.erank?.avgCtr ?? null,
    render: (r) =>
      r.erank ? bulkValueLabel(r.erank.avgCtr, r.erank.avgCtrCensored) : "—",
  },
  {
    key: "erank.google",
    label: "Google Volume",
    group: "erank",
    numeric: true,
    value: (r) => r.erank?.googleSearches ?? null,
    render: (r) => num(r.erank?.googleSearches ?? null),
  },
  {
    key: "erank.tagCount",
    label: "Tag Count",
    group: "erank",
    numeric: true,
    value: (r) => r.erank?.tagOccurrences ?? null,
    render: (r) => num(r.erank?.tagOccurrences ?? null),
  },
  {
    // Tag occurrences stay per query. `embroidery font` read 6, 81, 80 and 12
    // under four queries on one day; one merged number would be invented.
    key: "erank.foundVia",
    label: "Found via",
    group: "erank",
    sortNumber: (r) => totalTagOccurrences(r.erank),
    render: (r) => {
      const hits = r.erank?.foundVia ?? [];
      if (hits.length === 0) return "—";
      return hits.map((hit) => `${hit.query} (${hit.tagOccurrences})`).join(", ");
    },
  },
  {
    // Computed from the MERGED values, so it renders on 2,078 rows rather
    // than the 1,931 the Keyword Tool alone could reach. Where the searches
    // figure was capped the ratio is an upper bound and says so.
    key: "erank.ratio",
    label: "Search / Competition",
    group: "erank",
    numeric: true,
    value: (r) => demandRatio(r.erank)?.value ?? null,
    render: (r) => {
      const ratio = demandRatio(r.erank);
      if (ratio === null) return "—";
      return `${ratio.censored ? "< " : ""}${ratio.value.toFixed(3)}`;
    },
  },
  {
    // Attestation, not per-field provenance: which eRank tools had a record
    // for this keyword at all (design.md Decision 3).
    key: "erank.reportedBy",
    label: "Reported by",
    group: "erank",
    text: (r) => (r.erank?.reportedBy ?? []).join(" · "),
    render: (r) => {
      const by = r.erank?.reportedBy ?? [];
      return by.length ? by.join(" · ") : "—";
    },
  },
  {
    // eRank over time. Peak month and value from the keyword-history pull;
    // sorts by the peak value so the biggest spikes come first.
    // Numeric on the peak value, so it sorts and range-filters like any other
    // eRank figure and a keyword with no series sorts last, never as zero.
    key: "erank.peak",
    label: "Peak Month",
    group: "erank",
    numeric: true,
    value: (r) => historyPeak(r.erank)?.searches ?? null,
    render: (r) => {
      const peak = historyPeak(r.erank);
      return peak ? `${peak.label} · ${num(peak.searches)}` : "—";
    },
  },
  {
    // One glyph per month, scaled to the keyword's own peak. Sorts by how
    // many months read above eRank's `< 20` floor — a steady keyword first,
    // a one-month spike next, a flat line after that, and a keyword with no
    // series behind them all (-1: below any real count, same shape as Found
    // via's sort-only number).
    key: "erank.trend",
    label: "15-Month Trend",
    group: "erank",
    sortNumber: (r) => monthsAboveFloor(r.erank) ?? -1,
    render: (r) => historySparkline(r.erank) ?? "—",
  },

  {
    // How many listings relate to this keyword at all — the sub-row count.
    // Replaces what used to be the lowest tag slot; the slot survives on each
    // listing's own row, which is strictly more than `best` ever showed.
    key: "targeting.count",
    label: "Listings",
    group: "targeting",
    numeric: true,
    value: (r) => (r.listings.length === 0 ? null : r.listings.length),
    render: (r) => (r.listings.length === 0 ? "—" : String(r.listings.length)),
  },
  {
    // The one column a listing title is ever written in (Decision 15).
    key: "listing.title",
    label: "Listing",
    group: "targeting",
    text: (r) => r.listings[0]?.title ?? "",
    render: () => "",
    renderListing: (l) => l.title ?? l.listingId,
  },
  {
    // Sorts on the keyword's LOWEST slot across its listings, which is what
    // `targeting` already holds. Without an accessor this column fell through
    // to `localeCompare` — and with no `text` either, that compared keywords,
    // so "sort by Tag slot" quietly sorted by something else entirely.
    key: "listing.tagSlot",
    label: "Tag slot",
    group: "targeting",
    numeric: true,
    value: (r) => r.targeting,
    render: () => "",
    renderListing: (l) => (l.tagSlot === null ? "not tagged" : `#${l.tagSlot}`),
  },
  {
    // Etsy matched an ad for THIS keyword to this listing. A blank is not
    // evidence the listing is unadvertised — it means no match was observed
    // for this keyword (design.md Decision 15).
    key: "listing.advertised",
    label: "Advertised",
    group: "targeting",
    // `sortNumber`, not `value`: a mark is not a range anyone would filter by
    // a minimum of. Groups the keywords Etsy matched an ad to.
    sortNumber: (r) => (r.listings.some((l) => l.advertised) ? 1 : 0),
    render: () => "",
    renderListing: (l) => (l.advertised ? "✓" : "—"),
  },

  {
    // Best (lowest) position across every ranking listing; blank, never 0,
    // when there is no Spotted on Etsy match.
    key: "ranked",
    label: "Etsy SEO",
    group: "ranked",
    numeric: true,
    value: (r) => r.ranked,
    render: (r) => num(r.ranked),
  },

  // --- Shop: captured search terms (visits, i.e. arrivals) ---
  {
    key: "shop.visits",
    label: "Visits",
    group: "shop",
    numeric: true,
    value: (r) => r.shopSearch?.visits ?? null,
    render: (r) => num(r.shopSearch?.visits ?? null),
    renderListing: (l) => num(l.visits)
  },
  {
    key: "shop.etsy",
    label: "Etsy",
    group: "shop",
    numeric: true,
    value: (r) => r.shopSearch?.etsyVisits ?? null,
    render: (r) => num(r.shopSearch?.etsyVisits ?? null),
  },
  {
    key: "shop.google",
    label: "Google",
    group: "shop",
    numeric: true,
    value: (r) => r.shopSearch?.googleVisits ?? null,
    render: (r) => num(r.shopSearch?.googleVisits ?? null),
  },
  {
    // The listing's own numbers, not the term's. One visit from this term did
    // not itself produce this revenue — see design.md decision on labelling.
    key: "shop.sold",
    label: "L. sold",
    group: "shop",
    numeric: true,
    value: (r) => r.shopSearch?.listingItemsSold ?? null,
    render: (r) => num(r.shopSearch?.listingItemsSold ?? null),
    renderListing: (l) => num(l.itemsSold)
  },
  {
    key: "shop.revenue",
    label: "L. revenue",
    group: "shop",
    numeric: true,
    value: (r) => r.shopSearch?.listingRevenueUsd ?? null,
    render: (r) => {
      const v = r.shopSearch?.listingRevenueUsd;
      return v === null || v === undefined ? "—" : `$${v.toFixed(2)}`;
    },
    renderListing: (l) => l.revenueUsd === null ? "—" : `$${l.revenueUsd.toFixed(2)}`
  },

  // --- Etsy Ads: targeted keywords (views, i.e. impressions) ---
  {
    key: "ads.views",
    label: "Views",
    group: "ads",
    numeric: true,
    value: (r) => r.ads?.views ?? null,
    render: (r) => num(r.ads?.views ?? null),
    renderListing: (l) => num(l.adViews)
  },
  {
    key: "ads.clicks",
    label: "Clicks",
    group: "ads",
    numeric: true,
    value: (r) => r.ads?.clicks ?? null,
    render: (r) => num(r.ads?.clicks ?? null),
    renderListing: (l) => num(l.adClicks)
  },
  {
    key: "ads.ctr",
    label: "Click rate",
    group: "ads",
    numeric: true,
    value: (r) => r.ads?.clickRatePct ?? null,
    render: (r) => {
      const v = r.ads?.clickRatePct;
      return v === null || v === undefined ? "—" : `${v}%`;
    },
    renderListing: (l) => l.adClickRatePct === null ? "—" : `${l.adClickRatePct}%`
  },
  {
    key: "ads.spend",
    label: "Spend",
    group: "ads",
    numeric: true,
    value: (r) => r.ads?.spendUsd ?? null,
    render: (r) => {
      const v = r.ads?.spendUsd;
      return v === null || v === undefined ? "—" : `$${v.toFixed(2)}`;
    },
    renderListing: (l) => l.adSpendUsd === null ? "—" : `$${l.adSpendUsd.toFixed(2)}`
  },
  {
    key: "ads.revenue",
    label: "Revenue",
    group: "ads",
    numeric: true,
    value: (r) => r.ads?.revenueUsd ?? null,
    render: (r) => {
      const v = r.ads?.revenueUsd;
      return v === null || v === undefined ? "—" : `$${v.toFixed(2)}`;
    },
    renderListing: (l) => l.adRevenueUsd === null ? "—" : `$${l.adRevenueUsd.toFixed(2)}`
  },
  {
    key: "ads.orders",
    label: "Orders",
    group: "ads",
    numeric: true,
    value: (r) => r.ads?.orders ?? null,
    render: (r) => num(r.ads?.orders ?? null),
    renderListing: (l) => num(l.adOrders)
  },
  {
    key: "ads.roas",
    label: "ROAS",
    group: "ads",
    numeric: true,
    value: (r) => r.ads?.roas ?? null,
    render: (r) => num(r.ads?.roas ?? null),
    renderListing: (l) => l.adRoas === null ? "—" : String(l.adRoas)
  },
];

const RANGE_COLUMNS = COLUMNS.filter((c) => c.value);

/**
 * Columns worth asking "has / has no" about.
 *
 * Every column with a value, a per-listing renderer or sortable text, minus
 * the keyword itself — every row has one of those, so the question is never
 * interesting.
 */
const PRESENCE_COLUMNS = COLUMNS.filter(
  (c) => c.key !== "keyword" && (c.value || c.renderListing || c.text),
);

const SOURCE_FILTERS: {
  key: string;
  label: string;
  has: (row: KeywordTableRow) => boolean;
}[] = [
  // The merge deletes the three sub-objects these used to read, so they are
  // re-pointed at `reportedBy` rather than dropped: "has Tag Report data"
  // stays both visible and filterable (design.md Decision 4).
  {
    key: "kt",
    label: "Keyword Tool",
    has: (r) => (r.erank?.reportedBy ?? []).includes("KT"),
  },
  {
    key: "bulk",
    label: "Bulk Keywords",
    has: (r) => (r.erank?.reportedBy ?? []).includes("B"),
  },
  {
    key: "tag",
    label: "Tag Report",
    has: (r) => (r.erank?.reportedBy ?? []).includes("T"),
  },
  { key: "ranked", label: "Ranked", has: (r) => r.ranked !== null },
  { key: "targeting", label: "Targeting", has: (r) => r.targeting !== null },
  { key: "shop", label: "Shop — captured", has: (r) => r.shopSearch !== null },
  { key: "ads", label: "Etsy Ads", has: (r) => r.ads !== null },
];

/**
 * A min bound asserts "at or above X" — a blank value can't confirm that, so
 * it is excluded. A max-only bound asserts a ceiling only; a blank value
 * contradicts nothing about a ceiling, so it stays included. This mirrors
 * `keyword-corpus`'s "absence is not a verdict" rule rather than treating an
 * unknown value as if it were 0.
 */
/**
 * Does this column hold anything for this row?
 *
 * Reads the rendered value rather than a source field, so "has a value"
 * means the same thing the reader sees — an em dash is absence, a `< 20` cap
 * is presence. A listing-grained column asks whether ANY of the keyword's
 * sub-rows holds a value, which is what makes "has Ad views and no Tag slot"
 * answerable at the keyword level.
 */
function columnHasValue(column: Column, row: KeywordTableRow): boolean {
  if (column.renderListing) {
    return row.listings.some((l) => {
      const v = column.renderListing!(l);
      return v !== "" && v !== "—" && v !== "not tagged";
    });
  }
  const v = column.render(row);
  return v !== "" && v !== "—";
}

function passesRange(
  value: number | null,
  min: number | null,
  max: number | null,
): boolean {
  if (min === null && max === null) return true;
  if (value === null) return min === null;
  if (min !== null && value < min) return false;
  if (max !== null && value > max) return false;
  return true;
}

/**
 * One presence/absence filter: "has this column" or "has no value here".
 *
 * The pattern Katy wants surfaced — a listing with impressions and no tag
 * slot — is a presence AND an absence in one query, which range filters
 * cannot express (design.md Decision 16). These AND together with the range
 * filters rather than replacing them.
 */
interface PresenceFilter {
  key: string;
  present: boolean;
}

/** One active numeric filter. Several are held at once and AND together. */
interface RangeFilter {
  id: number;
  key: string;
  min: string;
  max: string;
}

/** One active sort key. At most two are held; the second breaks ties. */
interface SortKey {
  key: string;
  direction: Direction;
}

const groupLabel = (key: GroupKey) =>
  GROUPS.find((g) => g.key === key)?.label ?? "";

/** `"eRank Keyword Tool — KD"`. The picker is flat, so the source has to be
 *  spelled out: three different columns are named KD. */
const qualified = (c: Column) =>
  groupLabel(c.group) ? `${groupLabel(c.group)} — ${c.label}` : c.label;

/**
 * CSV escaping: quote everything and double any inner quote.
 *
 * Quoting unconditionally rather than only when a comma is present keeps a
 * captured term's own punctuation, and any leading `<` from a censored value,
 * from being reinterpreted by a spreadsheet.
 */
function csvCell(text: string): string {
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsv(rows: KeywordTableRow[]): string {
  const header = COLUMNS.map((c) => csvCell(qualified(c))).join(",");
  const body = rows.map((row) =>
    COLUMNS.map((c) => csvCell(c.render(row))).join(","),
  );
  return [header, ...body].join("\n");
}

interface KeywordTableProps {
  rows: KeywordTableRow[];
}

export default function KeywordTable({ rows }: KeywordTableProps) {
  const [sorts, setSorts] = useState<SortKey[]>([
    { key: "erank.searches", direction: "desc" },
  ]);
  const [keywordFilter, setKeywordFilter] = useState("");
  const [captureFilter, setCaptureFilter] = useState(ALL);
  const [queryFilter, setQueryFilter] = useState(ALL);
  const [sourceFilter, setSourceFilter] = useState(ALL);
  const [filters, setFilters] = useState<RangeFilter[]>([]);
  const [presence, setPresence] = useState<PresenceFilter[]>([]);
  const [pendingColumn, setPendingColumn] = useState<string>(NO_RANGE);
  /**
   * The keyword column is always sticky. There is no toggle.
   *
   * It was a toggle, off by default, then on by default — and Katy hit the
   * off state as a defect three times before it was understood as a setting.
   * Katy, 2026-09-21: "that toggle is hidden and breaks a rule of making
   * things that are clickable look clickable. and I shouldn't have to toggle
   * it. Once I scroll enough it should just be sticky like the header."
   *
   * Which is the right shape: the header stays because a column without its
   * heading is unreadable, and a row without its keyword is unreadable for
   * the same reason. Neither is a preference.
   */
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const keywordHeadRef = useRef<HTMLTableCellElement | null>(null);
  /**
   * The frozen column's real width, measured rather than assumed.
   *
   * Pinned group labels sit `left: <this> + gutter` so they clear the frozen
   * column instead of sliding under it. A constant was tried first and the
   * labels disappeared behind the keyword column, which is 496px with this
   * corpus and changes with the longest keyword — there is no number to
   * hardcode.
   */
  const [frozenWidth, setFrozenWidth] = useState(0);

  useEffect(() => {
    const cell = keywordHeadRef.current;
    if (!cell) return;
    const measure = () => setFrozenWidth(cell.getBoundingClientRect().width);
    measure();
    // The observer keeps the offset right when the column resizes — a filter
    // that changes the longest visible keyword, or a viewport change. It is an
    // enhancement over the measurement above, not the mechanism, so an
    // environment without it (jsdom) degrades to a correct first measurement
    // rather than throwing.
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(cell);
    return () => observer.disconnect();
  }, []);

  const labelOffset = frozenWidth + LABEL_GUTTER;
  const nextId = useRef(1);

  const captures = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.capture).filter((c): c is string => c !== null)),
      )
        .sort()
        .reverse(),
    [rows],
  );

  const queries = useMemo(
    () =>
      Array.from(
        new Set(
          rows.flatMap((r) =>
            (r.erank?.foundVia ?? []).map((hit) => hit.query),
          ),
        ),
      ).sort(),
    [rows],
  );

  const boundFilters = filters.filter(
    (f) => f.min.trim() !== "" || f.max.trim() !== "",
  );

  const { visible, rangeIsCause } = useMemo(() => {
    const needle = keywordFilter.trim().toLowerCase();
    const source = SOURCE_FILTERS.find((s) => s.key === sourceFilter);

    const withoutRange = rows.filter((row) => {
      if (needle && !row.keyword.toLowerCase().includes(needle)) return false;
      if (captureFilter !== ALL && row.capture !== captureFilter) return false;
      if (
        queryFilter !== ALL &&
        !(row.erank?.foundVia ?? []).some((hit) => hit.query === queryFilter)
      ) {
        return false;
      }
      if (source && !source.has(row)) return false;
      return true;
    });

    // Every bound filter must pass: they narrow together rather than
    // replacing one another.
    // Presence/absence first: cheaper than the range predicates, and it is
    // the filter most likely to cut the set down hard.
    const withPresence = withoutRange.filter((row) =>
      presence.every((p) => {
        const column = COLUMNS.find((c) => c.key === p.key);
        if (!column) return true;
        const has = columnHasValue(column, row);
        return p.present ? has : !has;
      }),
    );

    const filtered = withPresence.filter((row) =>
      filters.every((f) => {
        const column = COLUMNS.find((c) => c.key === f.key);
        if (!column?.value) return true;
        const min = f.min.trim() === "" ? null : Number(f.min);
        const max = f.max.trim() === "" ? null : Number(f.max);
        return passesRange(column.value(row), min, max);
      }),
    );

    const compare = (
      a: KeywordTableRow,
      b: KeywordTableRow,
      sort: SortKey,
    ): number => {
      const column = COLUMNS.find((c) => c.key === sort.key);
      if (!column) return 0;
      if (column.value) {
        const av = column.value(a);
        const bv = column.value(b);
        // Blank sorts last in BOTH directions and at EVERY key position —
        // never as the lowest possible number, which is what a fabricated 0
        // would do.
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        if (av === bv) return 0;
        return sort.direction === "asc" ? av - bv : bv - av;
      }
      if (column.sortNumber) {
        const av = column.sortNumber(a);
        const bv = column.sortNumber(b);
        if (av === bv) return 0;
        return sort.direction === "asc" ? av - bv : bv - av;
      }
      // Falling back to the keyword is a trap: a column with no accessor at
      // all sorts by something the reader never clicked, and looks broken
      // rather than unsortable. Every column now defines one of `value`,
      // `sortNumber` or `text`; this stays as the safety net for the keyword
      // column itself.
      const left = column.text ? column.text(a) : a.keyword;
      const right = column.text ? column.text(b) : b.keyword;
      if (left === right) return 0;
      const order = left.localeCompare(right);
      return sort.direction === "asc" ? order : -order;
    };

    const sorted = [...filtered].sort((a, b) => {
      for (const sort of sorts) {
        const order = compare(a, b, sort);
        if (order !== 0) return order;
      }
      return a.keyword.localeCompare(b.keyword);
    });

    return {
      visible: sorted,
      rangeIsCause:
        boundFilters.length > 0 &&
        withoutRange.length > 0 &&
        filtered.length === 0,
    };
  }, [
    rows,
    keywordFilter,
    captureFilter,
    queryFilter,
    sourceFilter,
    filters,
    presence,
    boundFilters.length,
    sorts,
  ]);

  /**
   * Clicking a column makes it the PRIMARY key and demotes the previous
   * primary to the tie-breaker; clicking the current primary cycles it
   * desc -> asc -> removed.
   *
   * Prepending rather than appending matters: appending meant a single click
   * on Ranked left the table still sorted by Searches, with Ranked only
   * breaking ties — which looks broken, because the column you just clicked
   * visibly does not order the table. Only two keys are kept; a third is
   * unreadable in the control.
   */
  function toggleSort(key: string) {
    setSorts((current) => {
      const index = current.findIndex((s) => s.key === key);
      if (index !== 0) {
        const rest = current.filter((s) => s.key !== key);
        return [{ key, direction: "desc" as Direction }, ...rest].slice(0, 2);
      }
      const next = [...current];
      if (next[0].direction === "desc") {
        next[0] = { key, direction: "asc" };
        return next;
      }
      next.shift();
      return next;
    });
  }

  function addPresence(raw: string) {
    if (raw === NO_RANGE) return;
    const [key, mode] = raw.split(":");
    setPresence((prev) =>
      prev.some((p) => p.key === key)
        ? prev.map((p) => (p.key === key ? { key, present: mode === "has" } : p))
        : [...prev, { key, present: mode === "has" }],
    );
  }

  function addFilter(key: string) {
    if (key === NO_RANGE) return;
    setFilters((f) => [...f, { id: nextId.current++, key, min: "", max: "" }]);
    setPendingColumn(NO_RANGE);
  }

  function updateFilter(id: number, patch: Partial<RangeFilter>) {
    setFilters((f) => f.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function removeFilter(id: number) {
    setFilters((f) => f.filter((x) => x.id !== id));
  }

  function exportCsv() {
    const blob = new Blob([buildCsv(visible)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keyword-explorer-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Scrolls a band into view. Never hides the others — a jump that hid
   *  columns would be a column picker wearing a different name. */
  function jumpTo(group: GroupKey) {
    const container = scrollRef.current;
    const target = container?.querySelector<HTMLElement>(
      `[data-band="${group}"]`,
    );
    if (!container || !target) return;
    const left = Math.max(target.offsetLeft - 16, 0);
    // Set the position first, then ask for the animation. `behavior: "smooth"`
    // is a no-op in some contexts — under `prefers-reduced-motion`, and in
    // automation — and when it no-ops it does not fall back, it simply does
    // not scroll. Assigning first means the chip always lands; the smooth call
    // afterwards is the nicety, not the mechanism.
    container.scrollLeft = left;
    container.scrollTo({ left, behavior: "smooth" });
  }

  const sortLabel =
    sorts.length === 0
      ? "none"
      : sorts
          .map((s) => {
            const c = COLUMNS.find((x) => x.key === s.key);
            return `${c ? c.label : s.key} ${s.direction === "asc" ? "↑" : "↓"}`;
          })
          .join(", then ");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Row 1 — narrowing, ordering, and getting the data out. */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={keywordFilter}
          onChange={(e) => setKeywordFilter(e.target.value)}
          placeholder="Filter keywords"
          aria-label="Filter keywords"
          className="h-9 w-56 rounded-md border border-border bg-background-primary px-3 text-sm text-text-primary placeholder:text-text-muted"
        />

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger size="sm" className="w-44" aria-label="Source">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sources</SelectItem>
            {SOURCE_FILTERS.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={captureFilter} onValueChange={setCaptureFilter}>
          <SelectTrigger size="sm" className="w-40" aria-label="Capture">
            <SelectValue placeholder="Capture" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All captures</SelectItem>
            {captures.map((capture) => (
              <SelectItem key={capture} value={capture}>
                {capture}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={queryFilter} onValueChange={setQueryFilter}>
          <SelectTrigger size="sm" className="w-52" aria-label="Found via">
            <SelectValue placeholder="Found via" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All queries</SelectItem>
            {queries.map((query) => (
              <SelectItem key={query} value={query}>
                {query}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={pendingColumn} onValueChange={addFilter}>
          <SelectTrigger size="sm" className="w-52" aria-label="Add range filter">
            <SelectValue placeholder="+ Add filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_RANGE}>+ Add filter</SelectItem>
            {RANGE_COLUMNS.map((col) => (
              <SelectItem key={col.key} value={col.key}>
                {qualified(col)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/*
          Presence/absence. "has Ad views" AND "no Tag slot" in one query is
          the shape that surfaces a listing winning on a keyword it was never
          tagged with (design.md Decision 16).
        */}
        <Select value={NO_RANGE} onValueChange={addPresence}>
          <SelectTrigger
            size="sm"
            className="w-56"
            aria-label="Add presence filter"
          >
            <SelectValue placeholder="+ Has / has no…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_RANGE}>+ Has / has no…</SelectItem>
            {PRESENCE_COLUMNS.map((col) => (
              <Fragment key={col.key}>
                <SelectItem value={`${col.key}:has`}>
                  has {qualified(col)}
                </SelectItem>
                <SelectItem value={`${col.key}:no`}>
                  no {qualified(col)}
                </SelectItem>
              </Fragment>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={exportCsv}
          className="h-9 rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary transition-colors hover:text-text-secondary"
        >
          ⭳ Export CSV
        </button>

        <span className="ml-auto text-sm text-text-muted">
          {visible.length} of {rows.length}
          <span className="ml-3">Sort: {sortLabel}</span>
        </span>
      </div>

      {/* Active filters. Each stays visible and individually removable —
          adding one never clears another. Presence filters count too: an
          active filter with no chip is a filter the reader cannot see or
          undo. */}
      {(filters.length > 0 || presence.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {presence.map((p) => {
            const column = COLUMNS.find((c) => c.key === p.key);
            return (
              <span
                key={`presence:${p.key}`}
                className="flex items-center gap-2 rounded-md border border-accent-primary/40 bg-background-secondary px-2 py-1 text-xs text-text-primary"
              >
                {p.present ? "has" : "no"} {column ? qualified(column) : p.key}
                <button
                  type="button"
                  aria-label={`Remove ${p.present ? "has" : "no"} ${
                    column ? qualified(column) : p.key
                  } filter`}
                  onClick={() =>
                    setPresence((prev) => prev.filter((x) => x.key !== p.key))
                  }
                  className="text-text-muted transition-colors hover:text-text-primary"
                >
                  ×
                </button>
              </span>
            );
          })}
          {filters.map((f) => {
            const column = COLUMNS.find((c) => c.key === f.key);
            return (
              <span
                key={f.id}
                className="flex items-center gap-2 rounded-md border border-border bg-background-secondary px-2 py-1 text-xs text-text-primary"
              >
                <span className="text-text-secondary">
                  {column ? qualified(column) : f.key}
                </span>
                <input
                  type="number"
                  inputMode={f.key === "erank.ratio" ? "decimal" : "numeric"}
                  value={f.min}
                  onChange={(e) => updateFilter(f.id, { min: e.target.value })}
                  placeholder="Min"
                  aria-label={`${column ? qualified(column) : f.key} minimum`}
                  className="h-7 w-16 rounded border border-border bg-background-primary px-1 text-xs text-text-primary placeholder:text-text-muted"
                />
                <span className="text-text-muted" aria-hidden>
                  –
                </span>
                <input
                  type="number"
                  inputMode={f.key === "erank.ratio" ? "decimal" : "numeric"}
                  value={f.max}
                  onChange={(e) => updateFilter(f.id, { max: e.target.value })}
                  placeholder="Max"
                  aria-label={`${column ? qualified(column) : f.key} maximum`}
                  className="h-7 w-16 rounded border border-border bg-background-primary px-1 text-xs text-text-primary placeholder:text-text-muted"
                />
                <button
                  type="button"
                  onClick={() => removeFilter(f.id)}
                  aria-label={`Remove ${column ? qualified(column) : f.key} filter`}
                  className="text-text-muted transition-colors hover:text-text-primary"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Row 2 — moving around a table that is wider than the screen. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-muted">Jump to band</span>
        {/*
          The keyword column is a band with no label, so it produced no chip —
          which left no way back to the start, because the first labelled band
          begins 496px in. Katy, 2026-09-21: "the quick links to different col
          groups don't include a fully left option."
        */}
        <button
          type="button"
          onClick={() => scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" })}
          className="rounded-md border border-border bg-background-secondary px-2 py-1 text-xs text-text-primary transition-colors hover:text-text-secondary"
        >
          Keyword
        </button>
        {GROUPS.filter((g) => g.label).map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => jumpTo(g.key)}
            className="rounded-md border border-border bg-background-secondary px-2 py-1 text-xs text-text-primary transition-colors hover:text-text-secondary"
          >
            {g.label}
          </button>
        ))}
      </div>

      {/*
        The scroll region is capped to the viewport and scrolls in BOTH axes.
        It used to be as tall as its content — 88,878px with this corpus —
        which broke two things at once and neither loudly: the horizontal
        scrollbar sat at the very bottom of that column, some 89,000px down
        the page and unreachable without scrolling past every row; and
        `sticky top-0` on the header pinned to a scrollport that had itself
        scrolled away, so the headers vanished after the first screenful
        despite computing as `position: sticky`.

        The region now FILLS the space the toolbar leaves rather than taking
        a guessed height: `flex-1 min-h-0` inside a viewport-tall flex column.
        A fixed `max-h-[calc(100vh-Nrem)]` was tried first and put the
        scrollbar 50px below the fold, because the chrome above it is not a
        constant — the filter chips wrap. Katy, 2026-09-21: "I can't scroll
        left and right".

        The scrollbar is forced visible rather than left to the platform:
        macOS overlay bars fade out, so a 4,000px table looks exactly like a
        1,000px one at rest and gives no sign that 20 more columns exist. The
        thumb's width is the only honest indicator of how much is off-screen.
      */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-accent-primary/60 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-accent-primary/10"
      >
        <table className="w-auto min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-30">
            {/*
              The bucket tier. Its rule is heavier than a band's so the two
              levels of grouping are not confusable, and each label is
              `sticky left-…` so it survives being scrolled past: a
              left-aligned label at the start of a 14-column bucket is gone
              the moment you scroll into that bucket, and freezing the header
              row only fixes that vertically (design.md Decision 12).
            */}
            <tr>
              {BUCKETS.map((bucket) => {
                const span = COLUMNS.filter((c) =>
                  bucket.groups.includes(c.group),
                ).length;
                if (span === 0) return null;
                return (
                  <th
                    key={bucket.key}
                    data-bucket={bucket.key}
                    scope="colgroup"
                    colSpan={span}
                    className={`whitespace-nowrap bg-background-primary px-3 pb-1 pt-3 text-left text-xs font-bold uppercase tracking-widest text-text-primary ${
                      bucket.key === "keyword"
                        ? `sticky left-0 z-40 ${FROZEN_EDGE}`
                        : ""
                    }`}
                  >
                    {bucket.label ? (
                      <span className="block border-b-[3px] border-accent-primary pb-1">
                        <span
                          className="sticky inline-block"
                          style={{ left: labelOffset }}
                        >
                          {bucket.label}
                        </span>
                      </span>
                    ) : null}
                  </th>
                );
              })}
            </tr>
            <tr>
              {GROUPS.map((group) => {
                const span = COLUMNS.filter((c) => c.group === group.key).length;
                if (span === 0) return null;
                return (
                  <th
                    key={group.key}
                    data-band={group.key}
                    scope="colgroup"
                    colSpan={span}
                    className={`whitespace-nowrap bg-background-primary px-3 pb-1 pt-2 text-left text-[11px] font-medium uppercase tracking-wide text-text-secondary ${
                      group.key === "keyword"
                        ? `sticky left-0 z-40 ${FROZEN_EDGE}`
                        : ""
                    }`}
                  >
                    {group.label ? (
                      <span className="block border-b-2 border-accent-primary/50 pb-1">
                        <span
                          className="sticky inline-block"
                          style={{ left: labelOffset }}
                        >
                          {group.label}
                          {group.window && (
                            <span className="ml-2 normal-case text-text-muted">
                              ({group.window})
                            </span>
                          )}
                        </span>
                      </span>
                    ) : null}
                  </th>
                );
              })}
            </tr>
            <tr className="border-b border-border">
              {COLUMNS.map((column, index) => {
                const sort = sorts.find((s) => s.key === column.key);
                const rank = sorts.findIndex((s) => s.key === column.key);
                const sticky =
                  index === 0
                    ? `sticky left-0 z-20 bg-background-primary ${FROZEN_EDGE}`
                    : "";
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      sort
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    // Opaque, like the two tiers above it. A sticky <thead>
                    // paints no background of its own — the section and row
                    // backgrounds are not honoured — so an unpainted header
                    // cell lets the rows scroll through it. Katy, 2026-09-21:
                    // "third tier header needs a background to avoid strange
                    // overlaps."
                    ref={index === 0 ? keywordHeadRef : undefined}
                    className={`w-[1%] whitespace-nowrap bg-background-primary px-3 py-2 font-normal ${sticky} ${
                      column.numeric ? "text-right" : "text-left"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className="whitespace-nowrap text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {column.label}
                      <span aria-hidden className="ml-1 text-text-muted">
                        {sort ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
                        {sorts.length > 1 && rank !== -1 ? rank + 1 : ""}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <Fragment key={row.keyword}>
                <tr data-row="keyword" className="border-b border-border">
                  {COLUMNS.map((column, index) => (
                    <td
                      key={column.key}
                      className={`w-[1%] whitespace-nowrap px-3 py-2 text-text-primary ${
                        index === 0
                          ? `sticky left-0 z-10 bg-background-primary ${FROZEN_EDGE}`
                          : ""
                      } ${column.numeric ? "text-right" : "text-left"}`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
                {/*
                  One sub-row per related listing. The sub-row IS the listing:
                  its title is written once, in the Listing column, and every
                  other fact about it — tag slot, advertised, visits, ad spend
                  — is an attribute on the same line (design.md Decision 15).
                  Roughly 86% of keywords relate to no listing at all and
                  render as a single row, exactly as before.
                */}
                {row.listings.map((listing) => (
                  <tr
                    key={`${row.keyword}:${listing.listingId}`}
                    data-row="listing"
                    className="border-b border-border bg-background-secondary/40"
                  >
                    {COLUMNS.map((column, index) => (
                      <td
                        key={column.key}
                        className={`w-[1%] whitespace-nowrap px-3 py-2 text-text-primary ${
                          index === 0
                            ? `sticky left-0 z-10 bg-background-primary ${FROZEN_EDGE}`
                            : ""
                        } ${column.numeric ? "text-right" : "text-left"}`}
                      >
                        {column.renderListing
                          ? column.renderListing(listing)
                          : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>

        {visible.length === 0 && (
          <p className="px-3 py-6 text-sm text-text-muted">
            {!rangeIsCause ? (
              <>
                No rows match these filters. The archive is hand-filtered at
                capture time, so a keyword you expected may simply never have
                been exported — that is unexplained, not evidence it lost
                demand.
              </>
            ) : (
              <>No rows fall within these ranges. Widen or remove one to see more.</>
            )}
          </p>
        )}
      </div>

      <p className="text-xs text-text-muted">
        “&lt; N” means eRank capped the value rather than reporting it exactly;
        a dash means it was never scored at all, or that this source has no row
        for the keyword. Neither is 0. Shop counts <em>visits</em> (people who
        arrived) and Etsy Ads counts <em>views</em> (impressions) over
        different windows — they are never summed.
      </p>
    </div>
  );
}
