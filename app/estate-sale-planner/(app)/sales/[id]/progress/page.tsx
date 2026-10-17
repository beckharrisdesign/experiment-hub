"use client";

import { use } from "react";
import Progress from "../../../../Progress";
import SaleScreen from "../SaleScreen";

/** /sales/[id]/progress — where the sale stands, and the exits. */
export default function ProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <SaleScreen id={id}>{(session) => <Progress session={session} />}</SaleScreen>;
}
