"use client";

import { usePathname } from "next/navigation";
import { Callout, Container, Section, Stack } from "@beckharrisdesign/mvds";
import { chromeFor, parseRoute, showsTabs, tabFor } from "../../../lib/estate-sale-planner/routes";
import { undecided } from "../../../lib/estate-sale-planner/session";
import TopBar from "../TopBar";
import TabBar from "../TabBar";
import { SaleProvider, useSaleStore } from "./store";

/**
 * The app shell (round 05a): every screen under /estate-sale-planner except
 * the printable summary and the paid sheet gets the sticky top bar and, outside
 * the camera flows, the tab bar. Chrome is a lookup on the URL — see
 * lib/estate-sale-planner/routes.ts — so a page never has to say where it is.
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
  const chrome = chromeFor(route, saleName, item?.name);
  const tabs = showsTabs(route.screen);
  const left = inContext ? undecided(inContext).length : store.history.find((h) => h.id === saleId)?.undecided ?? 0;

  return (
    <>
      <TopBar chrome={chrome} />
      <Section bg="background" py={24} className={tabs ? "pb-28" : undefined}>
        <Container size="md">
          <Stack gap={16}>
            {store.notice && tabs && (
              <Callout>
                <span>{store.notice}</span>{" "}
                <button type="button" className="underline" onClick={() => store.setNotice(null)}>
                  Dismiss
                </button>
              </Callout>
            )}
            {children}
          </Stack>
        </Container>
      </Section>
      {tabs && <TabBar active={tabFor(route.screen)} saleId={saleId} left={left} />}
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SaleProvider>
      <Shell>{children}</Shell>
    </SaleProvider>
  );
}
