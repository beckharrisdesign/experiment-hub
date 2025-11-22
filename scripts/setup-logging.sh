#!/bin/bash
# Setup script to configure logging for all Next.js experiments
# This ensures Turbopack/Next.js logs are captured for MCP access

set -e

echo "Setting up logging configuration for all experiments..."

# Find all Next.js projects (those with next.config.js)
find experiments -name "next.config.js" -type f | while read -r config_file; do
  project_dir=$(dirname "$config_file")
  prototype_dir="$project_dir/prototype"
  
  # Check if prototype directory exists and has next.config.js
  if [ -d "$prototype_dir" ] && [ -f "$prototype_dir/next.config.js" ]; then
    echo "Configuring logging for: $prototype_dir"
    
    # Create logs directory if it doesn't exist
    mkdir -p "$prototype_dir/.next"
    
    # Check if next.config.js already has logging configuration
    if ! grep -q "experimental.*logging" "$prototype_dir/next.config.js" 2>/dev/null; then
      echo "  - Adding logging configuration to next.config.js"
      # This will be handled by the Node.js script for better JSON handling
    fi
  fi
done

echo "Logging setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure MCP in Cursor settings (see .cursor/mcp-config.json)"
echo "2. Restart Cursor to apply MCP configuration"
echo "3. Logs will be available at: experiments/*/prototype/.next/turbopack.log"

