import assert from "node:assert/strict";
import test from "node:test";

import { loadSessionCatalog } from "../src/data/source-chain.js";

const catalog = {
  event: { id: "github-universe-2026", name: "GitHub Universe 2026" },
  sessions: [{ id: "universe26-opening-keynote", title: "Opening keynote" }],
};

function adapter(name, outcome) {
  return {
    name,
    sourceUrl: `https://example.test/${name}`,
    load: async () => {
      if (outcome instanceof Error) {
        throw outcome;
      }
      return outcome;
    },
  };
}

test("returns live data with explicit freshness metadata", async () => {
  const result = await loadSessionCatalog({
    adapters: [adapter("rainfocus-public-page", catalog)],
    now: () => new Date("2026-09-14T17:00:00Z"),
  });

  assert.equal(result.metadata.source, "rainfocus-public-page");
  assert.equal(result.metadata.fallback, false);
  assert.equal(result.metadata.retrievedAt, "2026-09-14T17:00:00.000Z");
  assert.equal(result.sessions[0].source, "rainfocus-public-page");
});

test("falls back in order and reports why live retrieval failed", async () => {
  const result = await loadSessionCatalog({
    adapters: [
      adapter("rainfocus-public-page", new Error("page extraction changed")),
      adapter("hosted-snapshot", catalog),
      adapter("embedded-snapshot", catalog),
    ],
    now: () => new Date("2026-09-14T17:00:00Z"),
  });

  assert.equal(result.metadata.source, "hosted-snapshot");
  assert.equal(result.metadata.fallback, true);
  assert.deepEqual(result.metadata.failures, [
    {
      source: "rainfocus-public-page",
      reason: "page extraction changed",
    },
  ]);
});

test("throws a combined error when every source fails", async () => {
  await assert.rejects(
    loadSessionCatalog({
      adapters: [
        adapter("live", new Error("offline")),
        adapter("hosted", new Error("not published")),
        adapter("embedded", new Error("corrupt")),
      ],
    }),
    /live: offline.*hosted: not published.*embedded: corrupt/s,
  );
});

test("supports forcing a deterministic fallback source", async () => {
  const result = await loadSessionCatalog({
    adapters: [
      adapter("rainfocus-public-page", catalog),
      adapter("hosted-snapshot", catalog),
      adapter("embedded-snapshot", catalog),
    ],
    forceSource: "embedded-snapshot",
  });

  assert.equal(result.metadata.source, "embedded-snapshot");
  assert.equal(result.metadata.forced, true);
});
