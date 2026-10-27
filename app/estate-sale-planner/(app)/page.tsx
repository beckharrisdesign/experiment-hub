"use client";

import { useRouter } from "next/navigation";
import { Button, Stack } from "@beckharrisdesign/mvds";
import { paths } from "../../../lib/estate-sale-planner/routes";
import { track } from "../../../lib/estate-sale-planner/analytics";
import SaleList from "../SaleList";
import { useSaleStore } from "./store";

/**
 * Home (round 05a): every sale on this device, and the way to start one.
 * Founder, 2026-10-15: "I want this to be the core app where I kick off those
 * listings and monitor their progress" — this is that screen in its device-only
 * form; accounts and estimated-vs-sold come with 05b.
 */
export default function HomePage() {
  const router = useRouter();
  const store = useSaleStore();
  if (!store.ready) return null;

  const start = () => {
    if (store.history.length > 0) track("esp_new_walkthrough");
    router.push(paths.newSale());
  };

  if (store.history.length === 0) {
    return (
      <Stack gap={40}>
        <Stack gap={16}>
          <h1 className="text-h1 text-foreground md:text-display">Your sales</h1>
          <p className="max-w-prose text-body-lg text-muted-foreground">
            Nothing here yet. Take a few photos of the house and you&apos;ll have a list of what might be worth something, sorted into sell, donate, and keep.
          </p>
        </Stack>
        <div className="flex justify-center">
          <Button size="lg" onClick={start}>
            Start a sale
          </Button>
        </div>
        <p className="text-caption text-muted-foreground">
          Sales are saved on this device. Value bands are a model&apos;s guess with a confidence, never an appraisal.
        </p>
      </Stack>
    );
  }

  return (
    <Stack gap={40}>
      <Stack gap={16}>
        <h1 className="text-h1 text-foreground">Your sales</h1>
        <p className="text-small text-muted-foreground">
          {store.history.length} {store.history.length === 1 ? "sale" : "sales"} on this device. Open one to keep sorting, or start another.
        </p>
      </Stack>
      <SaleList entries={store.history} onDelete={store.deleteSale} />
      <div className="flex justify-center">
        <Button size="lg" variant="outline" onClick={start}>
          Start a new sale
        </Button>
      </div>
    </Stack>
  );
}
