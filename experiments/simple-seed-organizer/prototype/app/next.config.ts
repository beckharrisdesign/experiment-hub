// Turbopack logging: Logs are automatically captured to .next/turbopack.log
// These logs are accessible via MCP filesystem resources for AI context
import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app is a pnpm workspace member inside the hub repo, so Turbopack's
  // root inference walks up to the workspace root and adopts what it finds
  // there — including the hub's own middleware.ts. That file's "@/..." imports
  // then resolve against this app, where they do not exist, and the build
  // fails with a module-not-found for code this app never referenced.
  //
  // It stayed invisible while the hub's middleware imported only "next/server";
  // it surfaced the moment that middleware gained a "@/lib/..." import.
  // Pinning the root keeps this build inside this directory.
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
