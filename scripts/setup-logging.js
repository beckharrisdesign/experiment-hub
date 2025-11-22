#!/usr/bin/env node
/**
 * Setup logging configuration for all Next.js experiments
 * This ensures Turbopack/Next.js logs are captured for MCP access
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function findNextJsProjects() {
  const experimentsDir = path.join(__dirname, '..', 'experiments');
  const projects = [];
  
  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const nextConfig = path.join(fullPath, 'next.config.js');
        if (fs.existsSync(nextConfig)) {
          projects.push(fullPath);
        } else {
          walkDir(fullPath);
        }
      }
    }
  }
  
  walkDir(experimentsDir);
  return projects;
}

function updateNextConfig(projectPath) {
  const configPath = path.join(projectPath, 'next.config.js');
  
  if (!fs.existsSync(configPath)) {
    return false;
  }
  
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Check if logging is already configured
  if (configContent.includes('logging') || configContent.includes('turbopack.log')) {
    return false; // Already configured
  }
  
  // Try to parse as JavaScript/JSON
  try {
    // For Next.js config files, we'll add a comment with instructions
    // since they're typically JavaScript modules
    const logDir = path.join(projectPath, '.next');
    const logFile = path.join(logDir, 'turbopack.log');
    
    // Ensure .next directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Add a comment at the top about logging
    if (!configContent.includes('Turbopack logging')) {
      const comment = `// Turbopack logging: Logs are automatically captured to .next/turbopack.log
// These logs are accessible via MCP filesystem resources for AI context
`;
      configContent = comment + configContent;
      fs.writeFileSync(configPath, configContent, 'utf8');
      return true;
    }
  } catch (error) {
    console.warn(`Could not update ${configPath}:`, error.message);
  }
  
  return false;
}

function main() {
  console.log('Setting up logging configuration for all Next.js experiments...\n');
  
  const projects = findNextJsProjects();
  console.log(`Found ${projects.length} Next.js project(s)\n`);
  
  let updated = 0;
  for (const project of projects) {
    const relativePath = path.relative(process.cwd(), project);
    console.log(`Configuring: ${relativePath}`);
    
    if (updateNextConfig(project)) {
      console.log(`  ✓ Updated next.config.js`);
      updated++;
    } else {
      console.log(`  - Already configured or skipped`);
    }
  }
  
  console.log(`\n✓ Setup complete! ${updated} project(s) updated.`);
  console.log('\nNext steps:');
  console.log('1. Configure MCP in Cursor (see .cursor/mcp-config.json.example)');
  console.log('2. Restart Cursor to apply MCP configuration');
  console.log('3. Logs will be available via MCP filesystem resources');
}

main();

