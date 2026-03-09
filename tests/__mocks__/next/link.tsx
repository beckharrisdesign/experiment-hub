// Minimal next/link mock for jsdom tests
import React from "react";

export default function Link({
  href,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) {
  return <a href={href} {...props}>{children}</a>;
}
