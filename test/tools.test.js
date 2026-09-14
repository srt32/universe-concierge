import assert from "node:assert/strict";
import test from "node:test";

import { createUniverseTools } from "../plugins/universe-concierge/src/tools.js";

const catalog = {
  event: {
    id: "github-universe-2026",
    name: "GitHub Universe 2026",
    dates: ["2026-10-28", "2026-10-29"],
    venue: "Fort Mason Center",
  },
  sessions: [
    {
      id: "universe26-agentic-systems",
      title: "Building agentic systems",
      description: "Design reliable software agents.",
      start: "2026-10-29T13:30:00-07:00",
      end: "2026-10-29T14:00:00-07:00",
      topics: ["AI", "Copilot"],
      speakers: [{ name: "Octo Cat" }],
      sourceUrl:
        "https://events.githubuniverse.com/api/session?id=universe26-agentic-systems",
    },
  ],
  venueTips: [{ id: "arrive-early", title: "Arrive early", detail: "Allow time." }],
  metadata: {
    source: "embedded-snapshot",
    sourceUrl: "https://github.com/srt32/universe-concierge",
    retrievedAt: "2026-09-14T17:00:00.000Z",
    fallback: true,
  },
};

const tools = createUniverseTools({ loadCatalog: async () => catalog });

test("exposes the complete read-only tool set", () => {
  assert.deepEqual([...tools.keys()].sort(), [
    "get_event_overview",
    "get_session",
    "get_venue_tips",
    "search_sessions",
    "validate_itinerary",
  ]);
});

test("search_sessions matches topics and preserves source metadata", async () => {
  const result = await tools.get("search_sessions").handler({ query: "copilot" });

  assert.equal(result.sessions[0].id, "universe26-agentic-systems");
  assert.equal(result.metadata.source, "embedded-snapshot");
});

test("get_session returns a canonical session or a typed not-found error", async () => {
  const found = await tools
    .get("get_session")
    .handler({ id: "universe26-agentic-systems" });
  assert.equal(found.session.title, "Building agentic systems");

  await assert.rejects(
    tools.get("get_session").handler({ id: "missing" }),
    (error) => error.code === "SESSION_NOT_FOUND",
  );
});

test("validate_itinerary returns deterministic validation details", async () => {
  const result = await tools.get("validate_itinerary").handler({
    items: [
      {
        id: "universe26-agentic-systems",
        type: "session",
        title: "Building agentic systems",
        start: "2026-10-29T13:30:00-07:00",
        end: "2026-10-29T14:00:00-07:00",
        source: "embedded-snapshot",
        sourceUrl:
          "https://events.githubuniverse.com/api/session?id=universe26-agentic-systems",
      },
    ],
  });

  assert.equal(result.valid, true);
});

test("validate_itinerary rejects sessions that are absent from the catalog", async () => {
  const result = await tools.get("validate_itinerary").handler({
    items: [
      {
        id: "invented-session",
        type: "session",
        title: "Invented session",
        start: "2026-10-29T13:30:00-07:00",
        end: "2026-10-29T14:00:00-07:00",
        source: "embedded-snapshot",
        sourceUrl:
          "https://events.githubuniverse.com/api/session?id=invented-session",
      },
    ],
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors[0].code, "unknown_session");
});
