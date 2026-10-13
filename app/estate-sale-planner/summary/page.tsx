"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Callout, Card, CardContent, CardDescription, CardHeader, CardTitle, Container, Section, Stack } from "@beckharrisdesign/mvds";
import { SELL_SHEET } from "../../../lib/estate-sale-planner/config";
import { sellList, overrides, type Session } from "../../../lib/estate-sale-planner/session";
import { formatPrice, sheetInputFromSession } from "../../../lib/estate-sale-planner/sheet";
import { loadSession } from "../../../lib/estate-sale-planner/storage";
import { track } from "../../../lib/estate-sale-planner/analytics";

/**
 * The printable sell list — free — and the paid moment beside it: the Sell
 * Sheet, the same list with the photos saved at a link that survives closing
 * the tab. The "not an appraisal" line comes first because it is the honest
 * frame for everything under it.
 */
export default function SummaryPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [canceled, setCanceled] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  useEffect(() => {
    setSession(loadSession());
    setCanceled(new URLSearchParams(window.location.search).get("canceled") === "1");
  }, []);

  const buySheet = async () => {
    if (!session) return;
    setBuying(true);
    setBuyError(null);
    track("esp_sheet_checkout", { items: sellList(session).length });
    try {
      const res = await fetch("/estate-sale-planner/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sheetInputFromSession(session)),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? `HTTP ${res.status}`);
      window.location.assign(json.url);
    } catch (e: any) {
      setBuyError(e.message ?? "Checkout didn't open.");
      setBuying(false);
    }
  };

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
              {session.name ? `${session.name} · ` : ""}Walkthrough {new Date(session.createdAt).toLocaleDateString()} · {sell.length} items
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
                    <td className="py-2 pr-4 text-foreground">
                      {item.name}
                      {item.markReading && <span className="block text-muted-foreground">Mark: {item.markReading}</span>}
                      {item.note && <span className="block text-muted-foreground">{item.note}</span>}
                    </td>
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

          {sell.length > 0 && (
            <Card className="shadow-lg ring-foreground/15 print:hidden">
              <CardHeader>
                <p className="text-caption uppercase tracking-wider text-muted-foreground">Keep this list</p>
                <CardTitle>Save the sell sheet with photos</CardTitle>
                <CardDescription>
                  The same list with the pictures, at a link you can send to siblings or the
                  estate-sale company. It stays up after you close this tab. One-time, {formatPrice(SELL_SHEET.priceCents)}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Stack gap={8}>
                  <div className="flex justify-center">
                    <Button size="lg" onClick={buySheet} disabled={buying}>
                      {buying ? "Opening checkout…" : `Save the sell sheet — ${formatPrice(SELL_SHEET.priceCents)}`}
                    </Button>
                  </div>
                  {canceled && !buyError && (
                    <p className="text-center text-small text-muted-foreground">Checkout was canceled. The free print below still works.</p>
                  )}
                  {buyError && <p className="text-center text-small text-destructive">{buyError}</p>}
                </Stack>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-center print:hidden">
            <Button size="lg" variant={sell.length > 0 ? "outline" : "default"} onClick={() => window.print()}>
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
