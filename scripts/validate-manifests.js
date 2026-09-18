import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { parseItineraryJson } from "../plugins/universe-concierge/src/itinerary/parse-json.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pluginRoot = resolve(root, "plugins", "universe-concierge");

async function readJson(path) {
  const text = await readFile(resolve(root, path), "utf8");
  return path === "site/itinerary.json"
    ? parseItineraryJson(text)
    : JSON.parse(text);
}

function validateWithSchema(name, schema, value) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(value)) {
    const details = validate.errors
      .map(({ instancePath, message }) => `${instancePath || "/"} ${message}`)
      .join("\n");
    throw new Error(`${name} is invalid:\n${details}`);
  }
  console.log(`✓ ${name}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function validateAgentPluginFiles() {
  const [pluginSchema, mcpSchema, plugin, mcp, hooks, agent, skill, bundle] =
    await Promise.all([
      readJson("schemas/agent-plugins/plugin.schema.json"),
      readJson("schemas/agent-plugins/mcp.schema.json"),
      readJson("plugins/universe-concierge/plugin.json"),
      readJson("plugins/universe-concierge/mcp.json"),
      readJson("plugins/universe-concierge/com.github.copilot/hooks/hooks.json"),
      readFile(
        resolve(
          pluginRoot,
          "com.github.copilot",
          "agents",
          "universe-concierge.agent.md",
        ),
        "utf8",
      ),
      readFile(
        resolve(pluginRoot, "skills", "plan-universe-day", "SKILL.md"),
        "utf8",
      ),
      readFile(resolve(pluginRoot, "dist", "universe-mcp.js"), "utf8"),
    ]);
  validateWithSchema("plugin.json", pluginSchema, plugin);
  validateWithSchema("mcp.json", mcpSchema, mcp);

  const server = mcp.mcpServers.universe;
  assert(server.type === "stdio", "The Universe MCP server must use stdio.");
  assert(
    server.args?.includes("${PLUGIN_ROOT}/dist/universe-mcp.js"),
    "mcp.json must execute the bundled server inside PLUGIN_ROOT.",
  );
  assert(hooks.version === 1, "Copilot hooks must use version 1.");
  assert(
    hooks.hooks?.preToolUse?.[0]?.matcher ===
      "create|edit|str_replace_editor|apply_patch",
    "The pre-tool hook must enforce the itinerary write scope.",
  );
  assert(
    hooks.hooks?.postToolUse?.[0]?.matcher ===
      "create|edit|str_replace_editor|apply_patch",
    "The post-tool hook must match the documented file-writing tools.",
  );
  assert(
    hooks.hooks?.agentStop?.length === 1,
    "The hook must block agent completion while an itinerary is invalid.",
  );
  for (const tool of [
    "universe/get_event_overview",
    "universe/search_sessions",
    "universe/get_session",
    "universe/get_venue_tips",
    "universe/validate_itinerary",
  ]) {
    assert(agent.includes(`- ${tool}`), `Custom agent must allow ${tool}.`);
  }
  assert(
    !agent.includes("universe/*") && !agent.includes("- execute"),
    "Custom agent must not use broad MCP or shell tool access.",
  );
  assert(
    skill.includes("name: plan-universe-day"),
    "The planning skill must declare its canonical name.",
  );
  assert(
    bundle.includes("get_event_overview") &&
      bundle.startsWith("#!/usr/bin/env node"),
    "The bundled MCP server must be executable and contain the Universe tools.",
  );
  console.log("✓ Copilot agent, skill, hooks, and bundled server");
}

async function validateMarketplace() {
  const [marketplace, settings, pluginManifest] = await Promise.all([
    readJson(".github/plugin/marketplace.json"),
    readJson(".github/copilot/settings.json"),
    readJson("plugins/universe-concierge/plugin.json"),
  ]);
  assert(
    marketplace.name === "universe-demo",
    "Marketplace name must be universe-demo.",
  );
  assert(marketplace.owner?.name === "srt32", "Marketplace owner must be srt32.");
  const plugin = marketplace.plugins?.find(
    ({ name }) => name === "universe-concierge",
  );
  assert(plugin, "Marketplace must publish universe-concierge.");
  assert(
    plugin.version === pluginManifest.version &&
      marketplace.metadata?.version === pluginManifest.version,
    "Marketplace and plugin versions must stay aligned.",
  );
  assert(
    plugin.source === "./plugins/universe-concierge",
    "Marketplace plugin source must point at ./plugins/universe-concierge.",
  );
  assert(
    plugin.repository === "https://github.com/srt32/universe-concierge",
    "Marketplace repository URL must use srt32/universe-concierge.",
  );
  assert(
    JSON.stringify(settings.extraKnownMarketplaces?.["universe-demo"]?.source) ===
      JSON.stringify({
        source: "github",
        repo: "srt32/universe-concierge",
      }),
    "Copilot settings must load universe-demo from srt32/universe-concierge.",
  );
  assert(
    settings.enabledPlugins?.["universe-concierge@universe-demo"] === true,
    "Copilot settings must enable universe-concierge@universe-demo.",
  );
  console.log("✓ marketplace.json and .github/copilot/settings.json");
}

async function validateDataFiles() {
  const [catalogSchema, itinerarySchema, catalog, itinerary] = await Promise.all([
    readJson("schemas/session-catalog.schema.json"),
    readJson("schemas/itinerary.schema.json"),
    readJson("plugins/universe-concierge/data/sessions.json"),
    readJson("site/itinerary.json"),
  ]);
  validateWithSchema("sessions.json", catalogSchema, catalog);
  validateWithSchema("site/itinerary.json", itinerarySchema, itinerary);
}

async function main() {
  await validateAgentPluginFiles();
  await validateMarketplace();
  await validateDataFiles();
  console.log("All plugin, marketplace, and data manifests are valid.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
