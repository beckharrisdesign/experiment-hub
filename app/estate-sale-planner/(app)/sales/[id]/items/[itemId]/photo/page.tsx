"use client";

import { use } from "react";
import Link from "next/link";
import { Button, Stack } from "@beckharrisdesign/mvds";
import { paths } from "../../../../../../../../lib/estate-sale-planner/routes";
import SourcePhoto from "../../../../../../SourcePhoto";
import SaleScreen from "../../../SaleScreen";

/** /sales/[id]/items/[itemId]/photo — the photo an item came from, and every correction on it. */
export default function SourcePhotoPage({ params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = use(params);
  return (
    <SaleScreen id={id}>
      {(session) => {
        const item = session.items.find((i) => i.id === itemId);
        if (!item) {
          return (
            <Stack gap={16}>
              <h1 className="text-h2 text-foreground">That item is gone</h1>
              <p className="text-body text-muted-foreground">It was split, merged or removed.</p>
              <div>
                <Button asChild>
                  <Link href={paths.sale(id)}>Back to the items</Link>
                </Button>
              </div>
            </Stack>
          );
        }
        return <SourcePhoto key={item.id} session={session} item={item} />;
      }}
    </SaleScreen>
  );
}
