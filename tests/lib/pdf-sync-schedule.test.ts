/**
 * Migration 035: the schedule calls the one route the key opens, with the header
 * the gate reads, and its functions are closed to the browser's roles.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PDF_SYNC_KEY_HEADER, PDF_SYNC_PATH } from "@/lib/pdf-auth";

const sql = readFileSync(
  path.join(__dirname, "../../supabase/migrations/035_pdf_sync_schedule.sql"),
  "utf8",
);

describe("035_pdf_sync_schedule", () => {
  it("calls the sync route with its key header", () => {
    expect(sql).toContain(`https://labs.beckharrisdesign.com${PDF_SYNC_PATH}'`);
    expect(sql).toContain(`'${PDF_SYNC_KEY_HEADER}', key`);
  });

  it("waits longer than a run may take", () => {
    const wait = Number(sql.match(/timeout_milliseconds := (\d+)/)?.[1]);
    expect(wait).toBeGreaterThan(60_000);
  });

  it("holds no key", () => {
    expect(sql).not.toMatch(/[0-9a-f]{64}/);
  });

  it("closes both functions to the browser's roles", () => {
    expect(sql).toContain(
      "revoke all on function pdf_sync_set_key(text) from public, anon, authenticated;",
    );
    expect(sql).toContain(
      "revoke all on function pdf_sync_call() from public, anon, authenticated, service_role;",
    );
  });
});
