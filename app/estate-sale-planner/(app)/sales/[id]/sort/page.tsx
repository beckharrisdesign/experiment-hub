"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { paths } from "../../../../../../lib/estate-sale-planner/routes";
import { sortFinished, type Destination } from "../../../../../../lib/estate-sale-planner/session";
import { track } from "../../../../../../lib/estate-sale-planner/analytics";
import { Stack } from "@beckharrisdesign/mvds";
import PendingPasses from "../../../../PendingPasses";
import Swipe from "../../../../Swipe";
import { useSaleStore } from "../../../store";
import SaleScreen from "../SaleScreen";

/**
 * /sales/[id]/sort — the undecided pile one at a time; the last decision lands on Progress. New
 * photos land here too, shown while the model reads them, and their items join the pile as they
 * come back.
 */
export default function SortPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const store = useSaleStore();
  const reading = store.pending.filter((p) => p.saleId === id);
  const onDestination = (itemId: string, to: Destination) => {
    const next = store.onDestination(itemId, to);
    // Still reading photos: more is coming, so the last decision isn't the end of the pile.
    if (next && sortFinished(next) && reading.length === 0) {
      track("esp_swipe_complete", { items: next.items.length });
      router.push(paths.progress(id));
    }
  };
  return (
    <SaleScreen id={id}>
      {(session) => (
        <Stack gap={32}>
          <PendingPasses passes={reading} onRetry={store.retryPass} onDismiss={store.dismissPass} />
          <Swipe session={session} reading={reading.some((p) => !p.error)} onDestination={onDestination} onOpen={(itemId) => router.push(paths.item(id, itemId))} onUndo={store.onUndo} />
        </Stack>
      )}
    </SaleScreen>
  );
}
