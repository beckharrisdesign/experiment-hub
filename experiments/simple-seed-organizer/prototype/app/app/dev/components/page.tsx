import { notFound } from "next/navigation";
import { DevComponentsClient } from "./DevComponentsClient";

// Dev-only surface for the figma-code-parity loop.
// 404s in any non-development build so it never ships to prod.
// See openspec/changes/sso-design-code-loop/ for context.

export const metadata = {
  title: "Dev components preview",
  robots: { index: false, follow: false },
};

export default function DevComponentsPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <DevComponentsClient />;
}
