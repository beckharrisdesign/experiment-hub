# Setting Up MCP for Turbopack Logs in Cursor

This guide will help you set up MCP (Model Context Protocol) in Cursor IDE to automatically capture and provide access to Turbopack/Next.js development server logs for all your experiments.

## Quick Start

### Step 1: Install MCP SDK (One-time setup)

```bash
npm install -g @modelcontextprotocol/sdk
```

Or install it locally in the project:

```bash
npm install --save-dev @modelcontextprotocol/sdk
```

### Step 2: Configure Logging for All Experiments

Run the setup script:

```bash
npm run setup:logging
```

This will:
- Find all Next.js projects in your experiments
- Ensure log directories exist
- Add logging configuration to project files

### Step 3: Configure Next.js to Output Logs

For each experiment prototype, update the `dev` script in `package.json` to capture logs:

```json
{
  "scripts": {
    "dev": "next dev -p 3001 2>&1 | tee .next/turbopack.log"
  }
}
```

Or use a more sophisticated approach with a logging script.

### Step 4: Configure Cursor MCP Settings

1. **Open Cursor Settings**:
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "MCP" and look for MCP-related settings
   - Or go to: `File > Preferences > Settings` and search for "MCP"

2. **Add MCP Configuration**:
   
   Cursor's MCP settings are typically in:
   - **Mac**: `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
   - **Windows**: `%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
   - **Linux**: `~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

   Create or edit this file and add:

   ```json
   {
     "mcpServers": {
       "filesystem": {
         "command": "npx",
         "args": [
           "-y",
           "@modelcontextprotocol/server-filesystem",
           "/Users/katybharris/Documents/code/experiment-hub"
         ]
       },
       "experiment-logs": {
         "command": "node",
         "args": [
           "/Users/katybharris/Documents/code/experiment-hub/scripts/mcp-log-server.js"
         ],
         "env": {
           "EXPERIMENTS_DIR": "/Users/katybharris/Documents/code/experiment-hub/experiments"
         }
       }
     }
   }
   ```

   **Important**: Update the paths to match your system:
   - Replace `/Users/katybharris/Documents/code/experiment-hub` with your actual project path
   - Update `EXPERIMENTS_DIR` if your experiments are in a different location

3. **Alternative: Use Cursor's MCP Settings UI**:
   - In Cursor, press `Cmd+Shift+P` / `Ctrl+Shift+P`
   - Type "MCP" and select "MCP: Configure Servers"
   - Add the servers manually using the UI

### Step 5: Restart Cursor

After configuring MCP, restart Cursor IDE completely to apply the changes.

## How It Works

Once configured, the AI agent can:

1. **Access log files directly** via MCP resources:
   - Resources are available as `experiment-log://experiment-name/turbopack.log`
   - The agent can read these logs automatically when debugging

2. **Use MCP tools**:
   - `tail_log`: Get the last N lines from an experiment's log file
   - `list_experiment_logs`: List all available log files

3. **Automatically query logs** when you ask about:
   - Build errors
   - Compilation issues
   - Runtime errors
   - Turbopack warnings

## Example Usage

Once set up, you can ask the AI:

- "What errors are in the etsy-embroidery-pattern-manager logs?"
- "Show me the last 100 lines from the seed-finder Turbopack log"
- "Check all experiment logs for compilation errors"

The AI will automatically access the logs via MCP.

## Troubleshooting

### MCP Server Not Starting

1. Check that Node.js is in your PATH:
   ```bash
   which node
   node --version
   ```

2. Verify the paths in your MCP configuration are correct and absolute

3. Check Cursor's developer console:
   - `Help > Toggle Developer Tools`
   - Look for MCP-related errors in the console

### Logs Not Found

1. Ensure the experiment has been run at least once:
   ```bash
   cd experiments/etsy-embroidery-pattern-manager/prototype
   npm run dev
   ```

2. Check that log files exist:
   ```bash
   ls -la experiments/*/prototype/.next/turbopack.log
   ```

3. Verify the experiment path matches the directory structure

### Permission Issues

1. Make the log server script executable:
   ```bash
   chmod +x scripts/mcp-log-server.js
   ```

2. Check file permissions on the experiments directory

### Alternative: Use Filesystem MCP Only

If the custom log server doesn't work, you can use just the filesystem MCP:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/katybharris/Documents/code/experiment-hub"
      ]
    }
  }
}
```

Then the AI can access logs at paths like:
- `experiments/etsy-embroidery-pattern-manager/prototype/.next/turbopack.log`

## Next Steps

1. Test the setup by asking the AI to check logs from a running experiment
2. Customize log locations if needed by editing `scripts/mcp-log-server.js`
3. Add additional log sources (e.g., test output, build logs) as needed

