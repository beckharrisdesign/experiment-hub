#!/usr/bin/env node
/**
 * MCP Server for Experiment Hub Logs
 * Provides access to Turbopack/Next.js dev server logs via MCP
 * 
 * This server exposes log files from all experiments as MCP resources
 * so the AI agent can access them as context.
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const fs = require('fs').promises;
const path = require('path');
const { watch } = require('fs');

class ExperimentLogServer {
  constructor() {
    this.server = new Server(
      {
        name: 'experiment-logs',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );
    
    this.experimentsDir = process.env.EXPERIMENTS_DIR || 
      path.join(__dirname, '..', 'experiments');
    
    this.setupHandlers();
  }
  
  setupHandlers() {
    // List available log resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = await this.findLogResources();
      return { resources };
    });
    
    // Read a log resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      const resource = await this.readLogResource(uri);
      return resource;
    });
    
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'tail_log',
            description: 'Get the last N lines from an experiment log file',
            inputSchema: {
              type: 'object',
              properties: {
                experiment: {
                  type: 'string',
                  description: 'Experiment name (e.g., etsy-embroidery-pattern-manager)',
                },
                lines: {
                  type: 'number',
                  description: 'Number of lines to retrieve (default: 50)',
                  default: 50,
                },
              },
              required: ['experiment'],
            },
          },
          {
            name: 'list_experiment_logs',
            description: 'List all available log files for experiments',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });
    
    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case 'tail_log':
          return await this.tailLog(args.experiment, args.lines || 50);
        case 'list_experiment_logs':
          return await this.listExperimentLogs();
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }
  
  async findLogResources() {
    const resources = [];
    
    try {
      const experiments = await fs.readdir(this.experimentsDir, { withFileTypes: true });
      
      for (const exp of experiments) {
        if (!exp.isDirectory()) continue;
        
        const prototypeDir = path.join(this.experimentsDir, exp.name, 'prototype');
        const logFile = path.join(prototypeDir, '.next', 'turbopack.log');
        const terminalLog = path.join(prototypeDir, '.next', 'terminal.log');
        
        // Check for various log file locations
        const possibleLogs = [
          { path: logFile, name: `${exp.name}/turbopack.log` },
          { path: terminalLog, name: `${exp.name}/terminal.log` },
          { path: path.join(prototypeDir, 'turbopack.log'), name: `${exp.name}/turbopack.log` },
        ];
        
        for (const log of possibleLogs) {
          try {
            await fs.access(log.path);
            resources.push({
              uri: `experiment-log://${log.name}`,
              name: log.name,
              description: `Turbopack/Next.js logs for ${exp.name}`,
              mimeType: 'text/plain',
            });
            break; // Only add one log per experiment
          } catch {
            // File doesn't exist, continue
          }
        }
      }
    } catch (error) {
      console.error('Error finding log resources:', error);
    }
    
    return resources;
  }
  
  async readLogResource(uri) {
    if (!uri.startsWith('experiment-log://')) {
      throw new Error(`Invalid URI: ${uri}`);
    }
    
    const logName = uri.replace('experiment-log://', '');
    const [experiment, ...rest] = logName.split('/');
    const logFileName = rest.join('/');
    
    const logPath = path.join(
      this.experimentsDir,
      experiment,
      'prototype',
      logFileName.includes('.next') ? logFileName : path.join('.next', logFileName)
    );
    
    try {
      const content = await fs.readFile(logPath, 'utf-8');
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: content,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Could not read log file: ${logPath} - ${error.message}`);
    }
  }
  
  async tailLog(experiment, lines) {
    const logPath = path.join(
      this.experimentsDir,
      experiment,
      'prototype',
      '.next',
      'turbopack.log'
    );
    
    try {
      const content = await fs.readFile(logPath, 'utf-8');
      const allLines = content.split('\n');
      const tailLines = allLines.slice(-lines).join('\n');
      
      return {
        content: [
          {
            type: 'text',
            text: `Last ${lines} lines from ${experiment}:\n\n${tailLines}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error reading log: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
  
  async listExperimentLogs() {
    const resources = await this.findLogResources();
    const logList = resources.map(r => r.name).join('\n');
    
    return {
      content: [
        {
          type: 'text',
          text: `Available experiment logs:\n\n${logList || 'No log files found'}`,
        },
      ],
    };
  }
  
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Experiment Logs MCP server running on stdio');
  }
}

const server = new ExperimentLogServer();
server.run().catch(console.error);

