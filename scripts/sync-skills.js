#!/usr/bin/env node

/**
 * Syncs external skill files into skills/ so they can be committed to git.
 *
 * Run:   npm run skills:sync
 * Then:  git add skills/ && git commit -m "chore(skills): sync external skills"
 *
 * Skills are treated as vendored dependencies — fetch deliberately, commit the
 * result. Every tool (Claude Code, Cursor, etc.) reads from the committed files.
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const SOURCES = [
  {
    name: "figma/mcp-server-guide",
    base: "https://raw.githubusercontent.com/figma/mcp-server-guide/main/skills",
    dest: "skills/figma",
    files: [
      "figma-use.md",
      "figma-implement-design.md",
      "figma-generate-design.md",
      "figma-code-connect.md",
      "figma-create-design-system-rules.md",
      "figma-create-new-file.md",
      "figma-generate-library.md",
    ],
  },
];

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return get(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve(body));
      })
      .on("error", reject);
  });
}

async function sync() {
  let synced = 0;
  let failed = 0;

  for (const source of SOURCES) {
    console.log(`\n${source.name}`);
    fs.mkdirSync(path.join(process.cwd(), source.dest), { recursive: true });

    for (const file of source.files) {
      const url = `${source.base}/${file}`;
      const dest = path.join(process.cwd(), source.dest, file);
      try {
        const content = await get(url);
        fs.writeFileSync(dest, content);
        console.log(`  + ${file}`);
        synced++;
      } catch (err) {
        console.error(`  ✗ ${file}: ${err.message}`);
        failed++;
      }
    }
  }

  console.log(`\n${synced} synced, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

sync().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
