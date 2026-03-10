# Figma MCP Setup

This guide adds the **Figma MCP server** to Cursor so the agent can read design context and screenshots from Figma files and implement designs (e.g. Best Day Ever landing) from links.

## 1. Get a Figma API token

1. Log in at [figma.com](https://www.figma.com).
2. Click your **profile/avatar** (top-left or account menu) → **Settings**.
3. Open the **Security** tab.
4. Click **Generate new token**.
5. Name it (e.g. "Cursor MCP"), use **read-only** access, then **Generate token**.
6. **Copy the token** and store it somewhere safe. Figma shows it only once.

## 2. Add the Figma MCP server in Cursor

Cursor reads MCP config from **user settings**, not from the repo. You can use either method below.

### Option A: Cursor Settings UI

1. Open **Cursor Settings**: `Cmd+,` (Mac) or `Ctrl+,` (Windows/Linux), or **Cursor → Settings**.
2. Search for **"MCP"** or go to **Tools and MCP** / **Models** (name may vary by version).
3. Click **Add new MCP server** or **Edit mcp.json**.
4. Add the Figma server. If you already have other servers, add the `figma-developer-mcp` block inside `mcpServers`:

```json
"figma-developer-mcp": {
  "command": "npx",
  "args": ["-y", "figma-developer-mcp", "--stdio"],
  "env": {
    "FIGMA_API_KEY": "paste-your-figma-token-here"
  }
}
```

5. Replace `paste-your-figma-token-here` with your actual token. Save.

### Option B: Edit mcp.json directly

1. Open your Cursor MCP config file:
   - **Mac/Linux**: `~/.cursor/mcp.json`
   - **Windows**: `%USERPROFILE%\.cursor\mcp.json`
2. If the file doesn’t exist, create it with `{ "mcpServers": {} }`.
3. Add the `figma-developer-mcp` entry under `mcpServers` (see block above), using your real `FIGMA_API_KEY`.
4. If you have other servers (e.g. filesystem, experiment-logs), keep them and add the Figma one alongside. Example full structure:

```json
{
  "mcpServers": {
    "filesystem": { ... },
    "experiment-logs": { ... },
    "figma-developer-mcp": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp", "--stdio"],
      "env": {
        "FIGMA_API_KEY": "your-token"
      }
    }
  }
}
```

5. Save the file.

## 3. Restart Cursor

Restart Cursor (or reload the window) so it picks up the new MCP server.

## 4. Verify

1. In Cursor, open **Settings → Tools and MCP** (or similar) and confirm **figma-developer-mcp** is listed and enabled.
2. In a chat, paste a Figma design link (e.g. a frame URL) and ask to implement the design. The agent should be able to call Figma MCP tools (e.g. get design context, screenshot) if the server is working.

## Security

- **Do not** commit your Figma token or put it in repo files. Keep it only in Cursor’s user config (`mcp.json` or Settings).
- The token has read-only access; revoke it in Figma Settings → Security if you stop using the MCP.

## Reference

- Package: [figma-developer-mcp](https://www.npmjs.com/package/figma-developer-mcp) (runs via `npx`).
- Project example config (no token): `.cursor/mcp-config.json.example`.
