#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { UniverseConciergeError } from "./errors.js";
import { createUniverseTools } from "./tools.js";

function toToolResult(value) {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

export function createMcpServer() {
  const server = new McpServer({
    name: "universe-concierge",
    version: "1.0.0",
  });

  for (const [name, definition] of createUniverseTools()) {
    server.registerTool(
      name,
      {
        description: definition.description,
        inputSchema: definition.inputSchema,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      async (args) => {
        try {
          return toToolResult(await definition.handler(args));
        } catch (error) {
          if (!(error instanceof UniverseConciergeError)) {
            throw error;
          }
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { error: { code: error.code, message: error.message } },
                  null,
                  2,
                ),
              },
            ],
          };
        }
      },
    );
  }

  return server;
}

async function main() {
  const server = createMcpServer();
  await server.connect(new StdioServerTransport());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
