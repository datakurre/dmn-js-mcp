/**
 * dmn-js-mcp server entry point.
 *
 * Thin shell that wires MCP SDK transport ↔ tool modules ↔ handlers.
 *
 * Tool modules are pluggable: each editor back-end (BPMN, DMN, Forms, …)
 * implements the ToolModule interface and registers its tools here.
 * Currently only the DMN module is active.
 *
 * CLI usage:
 *   dmn-js-mcp [options]
 *
 * Options:
 *   --persist-dir <dir>   Enable file-backed persistence in <dir>
 *   --help                Show usage information
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { type ToolModule } from './module';
import { dmnModule } from './dmn-module';
import { enablePersistence } from './persistence';
import type { HintLevel } from './types';
import { RESOURCE_TEMPLATES, listResources, readResource } from './resources';
import { listPrompts, getPrompt } from './prompts';

// ── CLI argument parsing ───────────────────────────────────────────────────

interface CliOptions {
  persistDir?: string;
  hintLevel?: HintLevel;
}

function printUsage(): void {
  console.error(`Usage: dmn-js-mcp [options]

Options:
  --persist-dir <dir>   Enable file-backed diagram persistence in <dir>.
                        Diagrams are saved as .dmn files and restored on startup.
  --hint-level <level>  Set server-wide feedback verbosity. Values: full (default),
                        minimal (lint errors only), none (no implicit feedback).
  --help                Show this help message and exit.

Examples:
  dmn-js-mcp
  dmn-js-mcp --persist-dir ./diagrams
  dmn-js-mcp --hint-level minimal

MCP configuration (.vscode/mcp.json):
  {
    "servers": {
      "dmn": {
        "command": "npx",
        "args": ["dmn-js-mcp", "--persist-dir", "./diagrams", "--hint-level", "minimal"]
      }
    }
  }
`);
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2); // skip node + script
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--persist-dir': {
        const dir = args[++i];
        if (!dir) {
          console.error('Error: --persist-dir requires a directory path');
          process.exit(1);
        }
        options.persistDir = dir;
        break;
      }
      case '--hint-level': {
        const level = args[++i];
        if (!level || !['none', 'minimal', 'full'].includes(level)) {
          console.error("Error: --hint-level requires a value: 'none', 'minimal', or 'full'");
          process.exit(1);
        }
        options.hintLevel = level as HintLevel;
        break;
      }
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        printUsage();
        process.exit(1);
    }
  }

  return options;
}

// ── Registered tool modules ────────────────────────────────────────────────
// Add new editor modules here when available.
const modules: ToolModule[] = [dmnModule];

const server = new Server(
  { name: 'dmn-js-mcp', version: '0.1.0' },
  { capabilities: { tools: {}, resources: {}, prompts: {} } }
);

// ── Tool handlers ──────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: modules.flatMap((m) => m.toolDefinitions),
}));

server.setRequestHandler(CallToolRequestSchema, async (request: any): Promise<any> => {
  const { name, arguments: args } = request.params;

  for (const mod of modules) {
    const result = mod.dispatch(name, args);
    if (result) return result;
  }

  throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
});

// ── Resource handlers ──────────────────────────────────────────────────────

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: listResources(),
}));

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
  resourceTemplates: RESOURCE_TEMPLATES,
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
  const uri: string = request.params.uri;
  return readResource(uri);
});

// ── Prompt handlers ────────────────────────────────────────────────────────

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: listPrompts(),
}));

server.setRequestHandler(GetPromptRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;
  return getPrompt(name, args || {});
});

async function main() {
  const options = parseArgs(process.argv);

  // Enable file-backed persistence if requested
  if (options.persistDir) {
    const count = await enablePersistence(options.persistDir);
    console.error(`Persistence enabled in ${options.persistDir} (${count} diagram(s) loaded)`);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('dmn-js-mcp server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
