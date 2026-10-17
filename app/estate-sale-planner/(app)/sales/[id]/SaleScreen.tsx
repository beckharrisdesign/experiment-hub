"use client";

import Link from "next/link";
import { Button, Stack } from "@beckharrisdesign/mvds";
import { paths } from "../../../../../lib/estate-sale-planner/routes";
import type { Session } from "../../../../../lib/estate-sale-planner/session";
import { useSale } from "../../store";

interface SaleScreenProps {
  id: string;
  children: (session: Session) => React.ReactNode;
}

/** Loads the sale for a /sales/[id] screen; renders nothing while reading the device and an honest message when it is not here. */
export default function SaleScreen({ id, children }: SaleScreenProps) {
  const state = useSale(id);
  if (state.status === "loading") return null;
  if (state.status === "missing") {
    return (
      <Stack gap={16}>
        <h1 className="text-h2 text-foreground">That sale isn&apos;t on this device</h1>
        <p className="max-w-prose text-body text-muted-foreground">
          Sales are saved on the phone that photographed them. Open one from Home, or start a new sale.
        </p>
        <div>
          <Button asChild>
            <Link href={paths.home()}>Go to Home</Link>
          </Button>
        </div>
      </Stack>
    );
  }
  return <>{children(state.session)}</>;
}
