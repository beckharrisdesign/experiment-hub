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

## Reference

- Plugin source: [figma/mcp-server-guide](https://github.com/figma/mcp-server-guide)
- Figma MCP docs: [developers.figma.com/docs/figma-mcp-server](https://developers.figma.com/docs/figma-mcp-server/)
- Project design tokens: `tailwind.config.ts`
- Project design rules: `.cursor/rules/design-guidelines.mdc`
