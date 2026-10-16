"use client";

import { useState } from "react";
import { Button, Inline } from "@beckharrisdesign/mvds";

/** Print and copy-link, the two things a paid sheet is for. Client-only. */
export default function SheetActions() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href.split("?")[0]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Inline gap={16} justify="center" className="print:hidden">
      <Button size="lg" onClick={() => window.print()}>
        Print or save as PDF
      </Button>
      <Button size="lg" variant="outline" onClick={copy}>
        {copied ? "Link copied" : "Copy the link"}
      </Button>
    </Inline>
  );
}
