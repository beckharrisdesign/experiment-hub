import { NextResponse } from "next/server";

/**
 * Web app manifest for Estate Sale Planner (founder, 2026-10-28: "lets just do the web
 * manifest"; "just ridding myself of the chrome chrome is a start"). Added to the home
 * screen, the planner opens standalone, with no browser bars.
 *
 * A route handler rather than `app/manifest.ts`, which Next only serves for the whole site;
 * this one is scoped to /estate-sale-planner so the rest of the hub stays a website. The
 * layout links it via `metadata.manifest`. Colors are the `.esp-theme` background
 * (app/globals.css). Icons are placeholders in public/estate-sale-planner/.
 */
const MANIFEST = {
  id: "/estate-sale-planner",
  name: "Estate Sale Planner",
  short_name: "Estate Sale",
  description: "Photograph a parent's house, sort sell, donate or keep, and see what might be worth something.",
  start_url: "/estate-sale-planner",
  scope: "/estate-sale-planner",
  display: "standalone",
  orientation: "portrait",
  background_color: "#14100d",
  theme_color: "#14100d",
  icons: [
    { src: "/estate-sale-planner/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/estate-sale-planner/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/estate-sale-planner/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

export function GET() {
  return NextResponse.json(MANIFEST, {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" },
  });
}
