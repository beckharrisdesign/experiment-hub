import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * The API's `authenticator` role preloads `safeupdate`, which rejects any
 * UPDATE or DELETE without a WHERE clause, including one inside a function
 * called through PostgREST. Testing a function from the SQL console does not
 * catch it, because that session does not load the library; migration 026 went
 * live that way and every folder import failed. So check the migrations' text.
 *
 * Scoped to migrations from 023 on, the ones written since this was learned.
 */
const MIGRATIONS = path.join(__dirname, "../../supabase/migrations");
const FIRST_CHECKED = 23;

/** SQL with comments removed, so a WHERE in a comment cannot satisfy the check. */
function stripComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
}

/**
 * Each UPDATE/DELETE statement, from its keyword to the end of the statement.
 * The statement ends at `;` or at the `)` closing a CTE; an `ON CONFLICT DO
 * UPDATE SET` belongs to an INSERT and is skipped.
 */
function writeStatements(sql: string): string[] {
  const found: string[] = [];
  const pattern = /\b(update|delete\s+from)\s+(?!set\b)[a-z_][\w.]*/gi;
  for (const match of sql.matchAll(pattern)) {
    const before = sql.slice(Math.max(0, match.index - 20), match.index).toLowerCase();
    if (/do\s*$/.test(before)) continue; // ON CONFLICT ... DO UPDATE
    if (/after\s*$|before\s*$|of\s*$|or\s*$/.test(before)) continue; // trigger event lists
    let depth = 0;
    let end = sql.length;
    for (let i = match.index; i < sql.length; i++) {
      const c = sql[i];
      if (c === "(") depth++;
      else if (c === ")") {
        if (depth === 0) {
          end = i;
          break;
        }
        depth--;
      } else if (c === ";" && depth === 0) {
        end = i;
        break;
      }
    }
    found.push(sql.slice(match.index, end));
  }
  return found;
}

const files = readdirSync(MIGRATIONS)
  .filter((f) => /^\d+_.*\.sql$/.test(f) && Number(f.split("_")[0]) >= FIRST_CHECKED)
  .sort();

describe("migrations: every UPDATE and DELETE has a WHERE (safeupdate)", () => {
  it("finds the migrations it checks", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("recognises an unguarded UPDATE, so the check is not vacuous", () => {
    expect(writeStatements("update t set a = 1;")).toEqual(["update t set a = 1"]);
    expect(writeStatements("update t set a = 1 where id;")[0]).toMatch(/\bwhere\b/);
    expect(writeStatements("insert into t values (1) on conflict (id) do update set a = 2;")).toEqual([]);
  });

  // 024 and 026 shipped the bug and are superseded by 028; their text stays as
  // history, so the check covers what is live: the latest definition wins.
  const SUPERSEDED: Record<string, string[]> = {
    "024_pdf_pending_matches_file.sql": ["pdf_documents_rebuild_pending"],
    "026_pdf_drive_folder.sql": ["pdf_import_folder"],
  };

  for (const file of files) {
    it(`${file}`, () => {
      let sql = stripComments(readFileSync(path.join(MIGRATIONS, file), "utf8"));
      for (const fn of SUPERSEDED[file] ?? []) {
        // Drop the superseded function's body before checking.
        sql = sql.replace(new RegExp(`create or replace function ${fn}[\\s\\S]*?\\$\\$;`, "i"), "");
      }
      const unguarded = writeStatements(sql).filter((s) => !/\bwhere\b/i.test(s));
      expect(unguarded).toEqual([]);
    });
  }
});
