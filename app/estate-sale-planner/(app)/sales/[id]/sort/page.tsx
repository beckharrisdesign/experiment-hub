"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { paths } from "../../../../../../lib/estate-sale-planner/routes";
import { sortFinished, type Destination } from "../../../../../../lib/estate-sale-planner/session";
import { track } from "../../../../../../lib/estate-sale-planner/analytics";
import Swipe from "../../../../Swipe";
import { useSaleStore } from "../../../store";
import SaleScreen from "../SaleScreen";

/** /sales/[id]/sort — the undecided pile one at a time; the last decision lands on Progress. */
export default function SortPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const store = useSaleStore();
  const onDestination = (itemId: string, to: Destination) => {
    const next = store.onDestination(itemId, to);
    if (next && sortFinished(next)) {
      track("esp_swipe_complete", { items: next.items.length });
      router.push(paths.progress(id));
    }
  };
  return (
    <SaleScreen id={id}>
      {(session) => (
        <Swipe session={session} onDestination={onDestination} onOpen={(itemId) => router.push(paths.item(id, itemId))} onUndo={store.onUndo} />
      )}
    </SaleScreen>
  );
}
