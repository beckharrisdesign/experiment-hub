"use client";

import { usePathname } from "next/navigation";
import { Callout, Section, Stack } from "@beckharrisdesign/mvds";
import { chromeFor, parseRoute, tabFor } from "../../lib/estate-sale-planner/routes";
import { undecided } from "../../lib/estate-sale-planner/session";
import TopBar from "./TopBar";
import DestinationToggle from "./DestinationToggle";
import TabBar from "./TabBar";
import { SaleProvider, useSaleStore } from "./(app)/store";

/**
 * The app shell on every page under /estate-sale-planner — app screens, the
 * printable sell list and the shared Sell Sheet alike (founder, 2026-10-27:
 * "make the footer and header sticky on all views and all pages"). Both bars
 * are MVDS Chrome, sticky to their edge; the column is a full-height flex so the
 * tab bar sits at the bottom even on a short page. Content runs to MVDS's `xl`
 * container on desktop (Section carries the Container — one, not two) ("expand to a full desktop breakpoint when the viewport
 * allows it"). Chrome is a lookup on the URL — see lib/estate-sale-planner/routes.ts.
 */
function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const store = useSaleStore();
  const route = parseRoute(pathname ?? "");
  // The sale the tabs point at: the one in the URL, else the one in context, else the newest on the device.
  const saleId = route.saleId ?? store.session?.id ?? store.history[0]?.id;
  const inContext = store.session && store.session.id === saleId ? store.session : null;
  const saleName = inContext?.name ?? store.history.find((h) => h.id === saleId)?.name;
  const item = route.itemId && inContext ? inContext.items.find((i) => i.id === route.itemId) : undefined;
  const chrome = chromeFor(route, saleName, item?.name, saleId);
  const left = inContext ? undecided(inContext).length : store.history.find((h) => h.id === saleId)?.undecided ?? 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar chrome={chrome}>
        {/* The item screen's destination rides in the sticky header (sold-comps D21). */}
        {route.screen === "item" && item && (
          <DestinationToggle variant="segmented" value={item.destination} onChange={(to) => store.onDestination(item.id, to)} />
        )}
      </TopBar>
      <main className="flex-1">
        <Section bg="background" py={24} innerSize="xl">
          <Stack gap={24}>
            {store.notice && (
              <Callout>
                <span>{store.notice}</span>{" "}
                <button type="button" className="underline" onClick={() => store.setNotice(null)}>
                  Dismiss
                </button>
              </Callout>
            )}
            {children}
          </Stack>
        </Section>
      </main>
      <TabBar active={tabFor(route.screen)} saleId={saleId} left={left} />
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SaleProvider>
      <Shell>{children}</Shell>
    </SaleProvider>
  );
}
