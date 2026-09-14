import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pluginRoot = resolve(root, "plugins", "universe-concierge");
const outputDirectory = resolve(pluginRoot, "dist");

await mkdir(outputDirectory, { recursive: true });
await build({
  entryPoints: [resolve(pluginRoot, "src", "server.js")],
  outfile: resolve(outputDirectory, "universe-mcp.js"),
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  legalComments: "none",
  minify: false,
});

console.log(`Built plugin MCP server in ${outputDirectory}`);
