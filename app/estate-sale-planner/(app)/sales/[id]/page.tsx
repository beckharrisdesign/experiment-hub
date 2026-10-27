"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { paths } from "../../../../../lib/estate-sale-planner/routes";
import Lists from "../../../Lists";
import { useSaleStore } from "../../store";
import SaleScreen from "./SaleScreen";

/** /sales/[id] — the Items screen: Sell cards, Still to sort, Donate, Keep. */
export default function ItemsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const store = useSaleStore();
  return (
    <SaleScreen id={id}>
      {(session) => (
        <Lists
          session={session}
          fromFixture={store.fromFixture}
          onDestination={store.onDestination}
          onOpen={(itemId) => router.push(paths.item(id, itemId))}
          onAdd={store.onAdd}
          onStartSorting={() => router.push(paths.sort(id))}
          onAddRoom={() => router.push(paths.capture(id))}
          onRename={store.onRename}
        />
      )}
    </SaleScreen>
  );
}
