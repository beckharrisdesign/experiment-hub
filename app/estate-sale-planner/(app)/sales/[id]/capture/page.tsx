"use client";

import { use } from "react";
import CaptureFlow from "../../../../CaptureFlow";
import SaleScreen from "../SaleScreen";

/** /sales/[id]/capture — photograph another room; what comes back joins this sale. */
export default function AddRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <SaleScreen id={id}>{(session) => <CaptureFlow sale={session} />}</SaleScreen>;
}
