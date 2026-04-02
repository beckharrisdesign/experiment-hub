# Figma MCP setup

Figma integration uses a two-layer architecture:

- **Layer 1 (global):** The Figma MCP server + skills — how to use Figma tools correctly. Installed once per tool, same in every repo.
- **Layer 2 (project):** Project-specific rules — how to translate Figma output into *this* project's design tokens, components, and conventions. Lives in the repo, different per project.

## Layer 1: Install the Figma MCP server

Each tool has its own install method. You only need to do this once per machine — it applies to every repo.

### Cursor

```
/add-plugin figma
```

Type this in agent chat. Installs the MCP server, skills, and asset-handling rules. Verify in **Settings → Tools and MCP**.

### Claude Code

```bash
claude plugin install figma@claude-plugins-official
```

Or manual setup:

```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
```

### VS Code

`Cmd+Shift+P` → `MCP: Add Server` → select `HTTP` → paste `https://mcp.figma.com/mcp` → server ID `figma`. Requires GitHub Copilot.

### Gemini CLI

```bash
gemini extensions install https://github.com/figma/mcp-server-guide
```

Then authenticate: run `gemini`, then `/mcp auth figma`.

### Other tools

Any tool that supports Streamable HTTP MCP can connect with:

```json
{
  "mcpServers": {
    "figma": {
      "url": "https://mcp.figma.com/mcp"
    }
  }
}
```

### Auth

The MCP server uses OAuth — your browser handles the Figma login flow. No personal access tokens to manage.

Rate limits: Dev or Full seats on paid plans get per-minute limits (same as Figma REST API Tier 1). Starter/View/Collab seats are limited to 6 tool calls per month.

## Layer 2: Project-specific rules

These rules tell agents how to adapt Figma output for this specific repo. They live in each tool's config format:

| Tool | Where Layer 2 lives |
|---|---|
| Cursor | `.cursorrules` → Figma section |
| Claude Code | `CLAUDE.md` → Figma section |

The rules for this project:

- **Map to our system** — use design tokens from `tailwind.config.ts`, components from `components/`, typography (Fraunces headings, Inter body). Validate for 1:1 visual parity with Figma screenshots.
- **Reuse, don't duplicate** — use existing components. No new icon packages from Figma assets. No hardcoded colors or spacing; use tokens.
- **Asset handling** — if the MCP server returns a `localhost` source for an image or SVG, use it directly. No placeholders.

Design tokens are defined in `tailwind.config.ts` and documented in `.cursor/rules/design-guidelines.mdc`.

## Verify

1. Confirm the Figma MCP server is connected in your tool's settings.
2. Test with `get_design_context` — type `#get_design_context` in Cursor, or ask the agent to call it in other tools.
3. Paste a Figma design link and ask to implement it. The agent should fetch design context and a screenshot before writing code.

## Troubleshooting

### MCP server not connecting

Restart your tool after installing. Check that your browser can reach `mcp.figma.com` for the OAuth flow.

### Assets not loading

The MCP server serves assets at `localhost` URLs. Use these directly — do not replace them with placeholders or import icon packages.

### Rate limited

Check your Figma plan and seat type. Dev/Full seats on Professional+ plans get per-minute limits. Starter/View/Collab seats get 6 calls per month.

## Build a screenshot sitemap for the live hub

If you want a sitemap where each node is a screenshot thumbnail of the
actual deployed page, use the repo's local capture flow first and keep
Figma calls for the import/composition step later.

Why this order works:

- it avoids spending MCP calls on discovery
- it lets you capture every deployed page, not just one canonical screen
- it creates a stable manifest you can reuse when translating selected
  pages into Figma components

### What the capture flow includes

The repo includes a route manifest builder and a live screenshot tool in:

- `scripts/site-map/routes.js`
- `scripts/site-map/capture.mjs`

The route builder covers:

- top-level hub pages
- experiment detail pages from `data/experiments.json`
- experiment landing-page-content docs when present
- static landing pages under `public/landing/*/index.html`

It intentionally does **not** hit prototype apps by default, since many
of those are separate local dev apps rather than stable public routes on
the main deployment.

It also skips optional hub routes that are disabled in production, such
as `/prototypes` when `SHOW_PROTOTYPES` is not enabled.

### Generate the sitemap artifacts

Run this against the production hub:

```bash
node --experimental-strip-types scripts/site-map/capture.mjs \
  --base-url=https://labs.beckharrisdesign.com \
  --delay-ms=2500 \
  --budget-ms=6000
```

This writes artifacts to `.site-map/experiment-hub/`:

- `manifest.json` — page inventory and output paths
- `index.html` — local visual contact sheet for review
- `screenshots/*.png` — one screenshot per route

### Rate-limit guidance

Use the screenshot tool serially, with delays between pages. Recommended
defaults:

- `--delay-ms=2500` for normal runs
- `--delay-ms=5000` if the deployment is under load
- `--limit=3` or similar for smoke tests before full runs

Examples:

```bash
# Smoke test three pages first
node --experimental-strip-types scripts/site-map/capture.mjs \
  --base-url=https://labs.beckharrisdesign.com \
  --limit=3

# Resume a longer run more conservatively
node --experimental-strip-types scripts/site-map/capture.mjs \
  --base-url=https://labs.beckharrisdesign.com \
  --delay-ms=5000 \
  --budget-ms=7000
```

### Bring the sitemap into Figma with minimal MCP usage

After you have reviewed `.site-map/experiment-hub/index.html` and confirmed the image
set is correct:

1. Create or open the sitemap file in Figma.
2. Import the generated PNGs into a dedicated page or section.
3. Use Figma MCP for targeted layout/composition help rather than asking
   it to discover the site from scratch.
4. When you flag pages for deeper design work, use those screenshots as
   the source set for component translation.

Good prompt shape for the later Figma step:

> Use these screenshot thumbnails as sitemap nodes for the experiment hub.
> Preserve one node per actual deployed page. Do not deduplicate visually
> similar pages. Group by hub page, experiment page, doc page, and static
> landing page. Keep the structure ready for later component extraction.

## Reference

- Plugin source: [figma/mcp-server-guide](https://github.com/figma/mcp-server-guide)
- Figma MCP docs: [developers.figma.com/docs/figma-mcp-server](https://developers.figma.com/docs/figma-mcp-server/)
- Project design tokens: `tailwind.config.ts`
- Project design rules: `.cursor/rules/design-guidelines.mdc`
