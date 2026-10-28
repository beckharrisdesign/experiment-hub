"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Callout, Stack } from "@beckharrisdesign/mvds";
import { sellList, overrides, type Session } from "../../../lib/estate-sale-planner/session";
import { loadSession } from "../../../lib/estate-sale-planner/storage";
import { paths } from "../../../lib/estate-sale-planner/routes";
import Loading from "../Loading";

/**
 * The printable sell list. The paid Sell Sheet that sat beside it is out for
 * now (founder, 2026-10-27: "skip all the upsells for now. I just want to build
 * it for now and then SaaSify it later"); the checkout route, webhook and sheet
 * page stay in place, unlinked. The "not an appraisal" line sits last, in its
 * own block below everything else (founder, 2026-10-27: "this is footer filler -- move it to a
 * content block below any other block").
 */
export default function SummaryPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    setSession(loadSession());
  }, []);

  if (session === undefined) return <Loading label="Loading the sell list" />;

  if (!session) {
    return (
      <>
      <Stack gap={24}>
        <h1 className="text-h2 text-foreground">No sale to print</h1>
        <p className="text-muted-foreground">Open a sale from Home first; the summary prints the one in context.</p>
        <Button asChild>
          <Link href={paths.home()}>Go to Home</Link>
        </Button>
      </Stack>
      </>
    );
  }

  const sell = sellList(session);
  const moved = overrides(session);

  return (
    <>
    <Stack gap={32}>
      <Stack gap={8}>
        <h1 className="text-h1 text-foreground">Might be worth selling</h1>
        <p className="text-caption uppercase text-muted-foreground">
          {session.name ? `${session.name} · ` : ""}Sale started {new Date(session.createdAt).toLocaleDateString()} · {sell.length} items
        </p>
      </Stack>

      {sell.length === 0 ? (
        <p className="text-muted-foreground">Nothing was flagged for this house.</p>
      ) : (
        <table className="w-full text-left text-small">
          <thead>
            <tr className="text-muted-foreground">
              <th className="py-2 pr-4 text-caption">Photo</th>
              <th className="py-2 pr-4 text-caption">Item</th>
              <th className="py-2 pr-4 text-caption">Band</th>
              <th className="py-2 pr-4 text-caption">Confidence</th>
              <th className="py-2 text-caption">Why</th>
            </tr>
          </thead>
          <tbody>
            {sell.map((item) => (
              <tr key={item.id} className="border-t border-border align-top">
                <td className="py-2 pr-4">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" className="size-12 rounded-md object-cover" />
                  ) : null}
                </td>
                <td className="py-2 pr-4 text-foreground">
                  {item.name}
                  {item.markReading && <span className="block text-muted-foreground">Mark: {item.markReading}</span>}
                  {item.note && <span className="block text-muted-foreground">{item.note}</span>}
                </td>
                <td className="py-2 pr-4">{item.band}</td>
                <td className="py-2 pr-4">{item.confidence}</td>
                <td className="py-2">{item.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {moved.length > 0 && (
        <p className="text-small text-muted-foreground">
          You moved {moved.length} flagged {moved.length === 1 ? "item" : "items"} to keep or donate; they are not listed here.
        </p>
      )}

      <div className="flex justify-center print:hidden">
        <Button size="lg" onClick={() => window.print()}>
          Print or save as PDF
        </Button>
      </div>
      <div className="flex justify-center print:hidden">
        <Button variant="ghost" asChild>
          <Link href={paths.sale(session.id)}>Back to the sale</Link>
        </Button>
      </div>
      <p className="max-w-prose text-caption text-muted-foreground">
        These value bands are a model&apos;s guess from phone photos, with a stated confidence. They are not an appraisal and not advice for insurance, tax, or probate.
      </p>
    </Stack>
    </>
  );
}
