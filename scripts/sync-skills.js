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
    // Each skill lives at skills/{name}/SKILL.md — saved locally as {name}.md
    base: "https://raw.githubusercontent.com/figma/mcp-server-guide/main/skills",
    dest: "skills/figma",
    files: [
      { remote: "figma-use/SKILL.md", local: "figma-use.md" },
      {
        remote: "figma-implement-design/SKILL.md",
        local: "figma-implement-design.md",
      },
      {
        remote: "figma-generate-design/SKILL.md",
        local: "figma-generate-design.md",
      },
      { remote: "figma-code-connect/SKILL.md", local: "figma-code-connect.md" },
      {
        remote: "figma-create-design-system-rules/SKILL.md",
        local: "figma-create-design-system-rules.md",
      },
      {
        remote: "figma-create-new-file/SKILL.md",
        local: "figma-create-new-file.md",
      },
      {
        remote: "figma-generate-library/SKILL.md",
        local: "figma-generate-library.md",
      },
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

    for (const { remote, local } of source.files) {
      const url = `${source.base}/${remote}`;
      const dest = path.join(process.cwd(), source.dest, local);
      try {
        const content = await get(url);
        fs.writeFileSync(dest, content);
        console.log(`  + ${local}`);
        synced++;
      } catch (err) {
        console.error(`  ✗ ${local}: ${err.message}`);
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
