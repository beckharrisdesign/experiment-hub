"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Callout, Container, Section, Stack } from "@beckharrisdesign/mvds";
import { sellList, overrides, type Session } from "../../../lib/estate-sale-planner/session";
import { loadSession } from "../../../lib/estate-sale-planner/storage";

/**
 * The printable sell list — the one artifact that outlives the session. The
 * "not an appraisal" line comes first because it is the honest frame for
 * everything under it.
 */
export default function SummaryPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    setSession(loadSession());
  }, []);

  if (session === undefined) return null;

  if (!session) {
    return (
      <Section bg="background" py={24}>
        <Container size="md">
          <Stack gap={16}>
            <h1 className="text-h2 text-foreground">No session to print</h1>
            <p className="text-muted-foreground">The session lives in this tab only. Start a walkthrough to make one.</p>
            <Button asChild>
              <Link href="/estate-sale-planner">Start a walkthrough</Link>
            </Button>
          </Stack>
        </Container>
      </Section>
    );
  }

  const sell = sellList(session);
  const moved = overrides(session);

  return (
    <Section bg="background" py={24}>
      <Container size="md">
        <Stack gap={24}>
          <Callout>
            These value bands are a model&apos;s guess from a phone walkthrough, with a stated
            confidence. They are not an appraisal and not advice for insurance, tax, or probate.
          </Callout>

          <Stack gap={8}>
            <h1 className="text-h1 text-foreground">Might be worth selling</h1>
            <p className="text-caption uppercase tracking-wider text-muted-foreground">
              Walkthrough {new Date(session.createdAt).toLocaleDateString()} · {sell.length} items
            </p>
          </Stack>

          {sell.length === 0 ? (
            <p className="text-muted-foreground">Nothing was flagged for this house.</p>
          ) : (
            <table className="w-full text-left text-small">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Photo</th>
                  <th className="py-2 pr-4 font-medium">Item</th>
                  <th className="py-2 pr-4 font-medium">Room</th>
                  <th className="py-2 pr-4 font-medium">Band</th>
                  <th className="py-2 pr-4 font-medium">Confidence</th>
                  <th className="py-2 font-medium">Why</th>
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
                    <td className="py-2 pr-4 text-foreground">{item.name}</td>
                    <td className="py-2 pr-4">{item.room}</td>
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
              You moved {moved.length} flagged {moved.length === 1 ? "item" : "items"} to keep or toss; they are not listed here.
            </p>
          )}

          <div className="flex justify-center print:hidden">
            <Button size="lg" onClick={() => window.print()}>
              Print or save as PDF
            </Button>
          </div>
          <div className="flex justify-center print:hidden">
            <Button variant="ghost" asChild>
              <Link href="/estate-sale-planner">Back to the sort</Link>
            </Button>
          </div>
        </Stack>
      </Container>
    </Section>
  );
}
