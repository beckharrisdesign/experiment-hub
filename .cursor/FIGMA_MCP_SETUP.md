# Figma in Cursor — setup

Figma integration in this project uses a two-layer architecture:

- **Layer 1 (global):** The Figma plugin — installs the MCP server and skills for how to use Figma tools correctly. Same in every repo.
- **Layer 2 (project):** Rules in `.cursorrules` — tells the agent how to translate Figma output into *this* project's design tokens, components, and conventions. Different per repo.

## Install the Figma plugin (one-time, global)

In Cursor's agent chat, type:

```
/add-plugin figma
```

This installs the official [Figma MCP server guide](https://github.com/figma/mcp-server-guide) plugin, which provides:

- **MCP server** — connects to `https://mcp.figma.com/mcp` (streamable HTTP, OAuth-based auth)
- **Skills** — structured workflows for implementing designs, connecting components via Code Connect, creating design system rules, and more

The plugin is global — it applies to every repo you open in Cursor. You authenticate with Figma directly through the MCP server (OAuth flow), so there are no API tokens to manage manually.

### Verify

1. Open **Cursor Settings → Tools and MCP** and confirm **figma** is listed and enabled.
2. In a chat, type `#get_design_context` to confirm the Figma MCP tools are available.
3. Paste a Figma design link and ask to implement it. The agent should call `get_design_context` and `get_screenshot` before writing code.

## Project-specific rules (Layer 2)

The Figma section in `.cursorrules` tells the agent how to adapt Figma output for this repo:

```
## Figma (when using Figma MCP)
- Flow first — run get_design_context then get_screenshot before writing code
- Map to our system — use this project's design tokens, components, and typography
- Reuse, don't duplicate — use existing design-system components, no hardcoded colors
```

This is what makes Figma integration different per repo. In another project with a different design system, this section would reference different tokens, components, and conventions — but the global Figma plugin (Layer 1) stays the same.

Design tokens for this project are defined in `tailwind.config.ts` and documented in `.cursor/rules/design-guidelines.mdc`.

## Troubleshooting

### Plugin not showing up

Restart Cursor after running `/add-plugin figma`. Check **Settings → Tools and MCP** to confirm it's listed.

### OAuth flow not completing

The Figma MCP server uses OAuth. If the auth flow doesn't complete, check that your browser can reach `mcp.figma.com`. You need a Figma account with a Dev or Full seat on a paid plan for full access (Starter/View/Collab seats are limited to 6 tool calls per month).

### Assets not loading

The MCP server serves assets at `localhost` URLs. Use these directly — do not replace them with placeholders or import icon packages.

## Reference

- Plugin source: [figma/mcp-server-guide](https://github.com/figma/mcp-server-guide)
- Figma MCP docs: [developers.figma.com/docs/figma-mcp-server](https://developers.figma.com/docs/figma-mcp-server/)
- Project design tokens: `tailwind.config.ts`
- Project design rules: `.cursor/rules/design-guidelines.mdc`
