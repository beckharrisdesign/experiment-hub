"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Stack } from "@beckharrisdesign/mvds";
import { loadProfile } from "../../../../../../../lib/estate-sale-planner/profile";
import { paths } from "../../../../../../../lib/estate-sale-planner/routes";
import ItemDetail from "../../../../../ItemDetail";
import { useSaleStore } from "../../../../store";
import SaleScreen from "../../SaleScreen";

/** /sales/[id]/items/[itemId] — one object, everything about it editable. */
export default function ItemPage({ params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = use(params);
  const router = useRouter();
  const store = useSaleStore();
  const { onOpenItem } = store;
  const loadedId = store.session?.id;
  // A gated item that was never looked up, or whose last lookup failed, tries again when it's
  // opened — once this URL's sale is the one in context, not the sale we navigated away from.
  useEffect(() => {
    if (loadedId === id) onOpenItem(id, itemId);
  }, [loadedId, id, itemId, onOpenItem]);
  return (
    <SaleScreen id={id}>
      {(session) => {
        const item = session.items.find((i) => i.id === itemId);
        if (!item) {
          return (
            <Stack gap={16}>
              <h1 className="text-h2 text-foreground">That item is gone</h1>
              <p className="text-body text-muted-foreground">It was removed from this sale, or the link is old.</p>
              <div>
                <Button asChild>
                  <Link href={paths.sale(id)}>Back to the items</Link>
                </Button>
              </div>
            </Stack>
          );
        }
        return (
          <ItemDetail
            item={item}
            saleId={id}
            refining={store.refining === item.id}
            checkingComps={store.checkingComps.includes(item.id)}
            lookupMinBand={loadProfile().lookupMinBand}
            onUpdate={store.onUpdate}
            onRetryReread={store.onRetryReread}
            onMessage={store.onMessage}
            onUndoMessage={store.onUndoMessage}
            onAddPhoto={store.onAddPhoto}
            onRemove={(removeId) => {
              store.onRemove(removeId);
              router.replace(paths.sale(id));
            }}
          />
        );
      }}
    </SaleScreen>
  );
}
