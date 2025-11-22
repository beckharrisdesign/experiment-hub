# Quick Start: MCP Logging Setup

## 1. Install MCP SDK

```bash
npm install -g @modelcontextprotocol/sdk
```

## 2. Setup Logging

```bash
npm run setup:logging
```

## 3. Configure Cursor

1. Open Cursor Settings (Cmd+Shift+P → "MCP")
2. Copy configuration from `.cursor/mcp-config.json.example`
3. Update paths to match your system
4. Restart Cursor

## 4. Update Experiment package.json

For each experiment, add logging to the dev script:

```json
{
  "scripts": {
    "dev": "next dev -p 3001 2>&1 | tee .next/turbopack.log"
  }
}
```

## Full Documentation

See `SETUP_MCP_LOGGING.md` for detailed instructions.

