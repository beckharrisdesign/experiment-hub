# Cursor MCP Configuration for Experiment Hub

This directory contains MCP (Model Context Protocol) configuration for Cursor IDE to automatically capture and provide access to Turbopack/Next.js development server logs.

## Setup Instructions

### 1. Install MCP SDK (if needed)

The log server uses the MCP SDK. If you encounter issues, you may need to install it:

```bash
npm install -g @modelcontextprotocol/sdk
```

### 2. Configure Cursor MCP Settings

1. Open Cursor Settings:
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "MCP" and select "Preferences: Open User Settings (JSON)"
   - Or navigate to: `File > Preferences > Settings` and search for "MCP"

2. Add MCP Configuration:

   Copy the contents of `mcp-config.json.example` to your Cursor settings file.
   
   **Important**: Update the paths in the configuration to match your system:
   - Replace `/Users/katybharris/Documents/code/experiment-hub` with your actual project path
   - Update the `EXPERIMENTS_DIR` environment variable if your experiments are in a different location

3. The configuration includes:
   - **filesystem**: Standard filesystem MCP server for general file access
   - **experiment-logs**: Custom server that provides easy access to experiment logs

### 3. Setup Logging for All Experiments

Run the setup script to configure logging for all Next.js projects:

```bash
node scripts/setup-logging.js
```

This script:
- Finds all Next.js projects in the `experiments/` directory
- Ensures log directories exist
- Adds logging configuration comments to `next.config.js` files

### 4. Configure Next.js to Output Logs

For each experiment, you can configure Next.js to output logs to a file. Add this to your `package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev -p 3001 2>&1 | tee .next/turbopack.log"
  }
}
```

Or use a more sophisticated logging setup with a custom script.

### 5. Restart Cursor

After configuring MCP, restart Cursor IDE to apply the changes.

## Usage

Once configured, the AI agent can:

1. **Access log files directly** via MCP resources:
   - Resources are available as `experiment-log://experiment-name/turbopack.log`
   - The agent can read these logs to understand build errors, warnings, etc.

2. **Use MCP tools**:
   - `tail_log`: Get the last N lines from an experiment's log file
   - `list_experiment_logs`: List all available log files

3. **Query logs automatically** when debugging issues or understanding build output

## Troubleshooting

### MCP Server Not Starting

- Check that Node.js is in your PATH
- Verify the paths in `mcp-config.json` are correct
- Check Cursor's developer console for MCP errors

### Logs Not Found

- Ensure the experiment has a `prototype/.next/` directory
- Run `npm run dev` at least once to generate log files
- Check that the experiment path matches the directory structure

### Permission Issues

- Ensure the log server script is executable: `chmod +x scripts/mcp-log-server.js`
- Check file permissions on the experiments directory

## Customization

You can customize the log server by editing `scripts/mcp-log-server.js`:
- Change log file locations
- Add additional log sources
- Modify the tools and resources exposed

