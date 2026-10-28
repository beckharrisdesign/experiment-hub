"use client";

import Link from "next/link";
import { Chrome, Container } from "@beckharrisdesign/mvds";
import type { Chrome as ChromeInfo } from "../../lib/estate-sale-planner/routes";

/**
 * The sticky header on every page: a one-line breadcrumb (sold-comps design D11; founder,
 * 2026-10-27: "just do a simple breadcrumb style header and let that function as the back
 * button too"). Every ancestor is a link and the last one is Back. Under 640 px the leading
 * crumbs collapse to "…" so the parent and the current page always show.
 *
 * `children` is an optional slot under the trail that stays sticky with it — the item screen
 * puts its destination toggle there (D21). The breadcrumb itself is meant to be swapped for a
 * better pattern later; it is the only thing in the first row.
 *
 * MVDS Chrome clips to `--chrome-top-height`, so the header sets that token for its own
 * contents rather than letting MVDS's 4 rem default decide.
 */
export default function TopBar({ chrome, children }: { chrome: ChromeInfo; children?: React.ReactNode }) {
  const { crumbs, title } = chrome;
  const parent = crumbs.length - 1;
  const height = children ? "6.75rem" : "2.75rem";
  return (
    <Chrome position="top" bg="background" className="border-b border-border print:hidden" style={{ ["--chrome-top-height" as string]: height }}>
      <Container size="xl" className="h-full">
        <nav aria-label="Breadcrumb" className="flex h-11 items-center">
          <ol className="flex min-w-0 items-center gap-2 text-small">
            {parent > 0 && (
              <li aria-hidden className="flex shrink-0 items-center gap-2 text-muted-foreground sm:hidden">
                <span>…</span>
                <span>/</span>
              </li>
            )}
            {crumbs.map((c, i) => (
              <li key={`${c.href}-${i}`} className={`${i < parent ? "hidden sm:flex" : "flex"} min-w-0 shrink items-center gap-2`}>
                <Link
                  href={c.href}
                  className="block truncate rounded-sm py-3 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...(i === parent ? { "aria-label": `Back to ${c.label}` } : {})}
                >
                  {c.label}
                </Link>
                <span aria-hidden className="text-muted-foreground">
                  /
                </span>
              </li>
            ))}
            <li className="min-w-0">
              <span aria-current="page" aria-live="polite" className="block truncate font-medium text-foreground">
                {title}
              </span>
            </li>
          </ol>
        </nav>
        {children && <div className="pb-2">{children}</div>}
      </Container>
    </Chrome>
  );
}
