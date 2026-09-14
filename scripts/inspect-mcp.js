import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [
    process.env.UNIVERSE_MCP_ENTRY ??
      "plugins/universe-concierge/dist/universe-mcp.js",
  ],
  env: {
    ...process.env,
    UNIVERSE_SOURCE: process.env.UNIVERSE_SOURCE ?? "",
  },
});
const client = new Client({
  name: "universe-concierge-inspector",
  version: "1.0.0",
});

function structured(result) {
  if (result.structuredContent) {
    return result.structuredContent;
  }
  const text = result.content?.find(({ type }) => type === "text")?.text;
  return text ? JSON.parse(text) : {};
}

async function inspect() {
  await client.connect(transport);
  const listed = await client.listTools();
  console.log(`Tools: ${listed.tools.map(({ name }) => name).join(", ")}`);

  const overview = structured(
    await client.callTool({ name: "get_event_overview", arguments: {} }),
  );
  console.log(
    `Overview: ${overview.event.name} via ${overview.metadata.source} (${overview.metadata.fallback ? "fallback" : "live"})`,
  );

  const search = structured(
    await client.callTool({
      name: "search_sessions",
      arguments: { query: process.env.UNIVERSE_QUERY ?? "AI", limit: 3 },
    }),
  );
  console.log(`Search: ${search.count} sessions`);

  const firstSession = search.sessions[0];
  if (!firstSession) {
    throw new Error("The inspection query returned no session to inspect.");
  }
  const detail = structured(
    await client.callTool({
      name: "get_session",
      arguments: { id: firstSession.id },
    }),
  );
  console.log(`Session: ${detail.session.id} — ${detail.session.title}`);

  const venue = structured(
    await client.callTool({ name: "get_venue_tips", arguments: {} }),
  );
  console.log(`Venue tips: ${venue.tips.length}`);

  const validation = structured(
    await client.callTool({
      name: "validate_itinerary",
      arguments: {
        date: firstSession.start.slice(0, 10),
        timezone: "America/Los_Angeles",
        items: [
          {
            id: detail.session.id,
            type: "session",
            title: detail.session.title,
            start: detail.session.start,
            end: detail.session.end,
            source: detail.session.source,
            sourceUrl: detail.session.sourceUrl,
          },
        ],
      },
    }),
  );
  console.log(`Validation: ${validation.valid ? "valid" : "invalid"}`);
}

inspect()
  .finally(() => client.close())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
