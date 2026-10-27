import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge, Button, Callout, Card, CardContent, CardDescription, CardHeader, CardTitle, Grid, Inline, Stack } from "@beckharrisdesign/mvds";
import { getSheet } from "../../../../lib/estate-sale-planner/db";
import SheetActions from "./SheetActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sell Sheet — Estate Sale Planner",
  robots: { index: false, follow: false },
};

const confidenceVariant = { high: "default", medium: "outline", low: "muted" } as const;

interface SheetPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}

/**
 * Screen 7 — the Sell Sheet. The paid artifact: the Sell list with its photos
 * at a link that outlives the tab. Read with the service-role client on the
 * server; the id is a UUID, so the link is the credential. Unpaid sheets show
 * a holding note rather than the list — the webhook, not the success URL,
 * decides paid.
 */
export default async function SheetPage({ params, searchParams }: SheetPageProps) {
  const { id } = await params;
  const { paid } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sheet = await getSheet(id);
  if (!sheet) notFound();

  if (sheet.status !== "paid") {
    return (
      <>
      <Stack gap={16}>
        <h1 className="text-h2 text-foreground">{paid === "1" ? "Thanks — settling the payment" : "This sheet is not unlocked yet"}</h1>
        <p className="max-w-prose text-body text-muted-foreground">
          {paid === "1"
            ? "Stripe is confirming the payment. Reload in a moment and the sheet will be here."
            : "The sell list is saved, but its payment has not come through. Go back to the summary to finish."}
        </p>
        <Inline gap={16}>
          <Button asChild>
            <Link href={`/estate-sale-planner/sheet/${sheet.id}`}>Reload</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/estate-sale-planner/summary">Back to the summary</Link>
          </Button>
        </Inline>
      </Stack>
      </>
    );
  }

  const when = sheet.walkthrough_at ? new Date(sheet.walkthrough_at).toLocaleDateString() : new Date(sheet.created_at).toLocaleDateString();

  return (
    <>
    <Stack gap={32}>
      <Stack gap={8}>
        <p className="text-caption uppercase text-muted-foreground">Sell sheet</p>
        <h1 className="text-h1 text-foreground">Might be worth selling</h1>
        <p className="text-small text-muted-foreground">
          Walkthrough {when} · {sheet.item_count} {sheet.item_count === 1 ? "item" : "items"} · this link is the copy; anyone with it can open it
        </p>
      </Stack>

      <Grid cols={{ base: 1, md: 2 }} gap={16}>
        {sheet.items.map((item, i) => (
          <Card key={i} className="shadow-lg ring-foreground/15">
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image} alt="" className="aspect-[4/3] w-full bg-muted object-contain" />
            ) : null}
            <CardHeader>
              <CardTitle>{item.name}</CardTitle>
              <Inline gap={8}>
                <Badge variant="success">{item.band}</Badge>
                <Badge variant={confidenceVariant[item.confidence]}>{item.confidence} confidence</Badge>
              </Inline>
              <CardDescription>{item.reason}</CardDescription>
              {item.markReading && <p className="text-small text-foreground">Mark reads: {item.markReading}</p>}
              {item.note && <p className="text-small text-muted-foreground">{item.note}</p>}
            </CardHeader>
            <CardContent>
              {item.details?.length ? (
                <Inline gap={8}>
                  {item.details.map((d, j) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={j} src={d} alt={`Detail ${j + 1}`} className="size-12 rounded-md object-cover ring-1 ring-foreground/10" />
                  ))}
                </Inline>
              ) : (
                <span className="sr-only">Sell candidate</span>
              )}
            </CardContent>
          </Card>
        ))}
      </Grid>

      <SheetActions />
      <p className="max-w-prose text-caption text-muted-foreground">
        These value bands are a model&apos;s guess from a phone walkthrough, with a stated confidence. They are not an appraisal and not advice for insurance, tax, or probate.
      </p>
    </Stack>
    </>
  );
}
