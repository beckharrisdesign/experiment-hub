import type { Metadata } from "next";
import Home from "./HomeClient";

// The home page is a client component, so its metadata lives in this server
// wrapper. The canonical resolves against metadataBase (see app/layout.tsx).
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default Home;
