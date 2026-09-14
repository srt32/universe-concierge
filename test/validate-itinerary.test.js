import assert from "node:assert/strict";
import test from "node:test";

import { validateItinerary } from "../plugins/universe-concierge/src/itinerary/validate.js";

const source = {
  source: "embedded-snapshot",
  sourceUrl: "https://github.com/srt32/universe-concierge",
};

function session(overrides = {}) {
  return {
    id: "universe26-opening-keynote",
    type: "session",
    title: "Opening keynote",
    start: "2026-10-29T09:00:00-07:00",
    end: "2026-10-29T10:00:00-07:00",
    ...source,
    ...overrides,
  };
}

test("accepts a sourced, non-overlapping itinerary with the requested break", () => {
  const result = validateItinerary(
    [
      session(),
      {
        id: "break-lunch",
        type: "break",
        title: "Lunch break",
        start: "2026-10-29T12:00:00-07:00",
        end: "2026-10-29T13:00:00-07:00",
      },
      session({
        id: "universe26-agentic-systems",
        title: "Building agentic systems",
        start: "2026-10-29T13:30:00-07:00",
        end: "2026-10-29T14:00:00-07:00",
      }),
    ],
    { requestedBreak: { start: "12:00", end: "13:00" } },
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("rejects overlaps with actionable item identifiers", () => {
  const result = validateItinerary([
    session(),
    session({
      id: "universe26-overlap",
      start: "2026-10-29T09:30:00-07:00",
      end: "2026-10-29T10:30:00-07:00",
    }),
  ]);

  assert.equal(result.valid, false);
  assert.match(result.errors[0].message, /overlap/i);
  assert.deepEqual(result.errors[0].itemIds, [
    "universe26-opening-keynote",
    "universe26-overlap",
  ]);
});

test("rejects sessions without canonical IDs and source metadata", () => {
  const result = validateItinerary([
    session({ id: "", source: "", sourceUrl: "" }),
  ]);

  assert.equal(result.valid, false);
  assert.deepEqual(
    result.errors.map(({ code }) => code).sort(),
    ["missing_session_id", "missing_source", "missing_source_url"],
  );
});

test("rejects an itinerary that does not preserve the requested break", () => {
  const result = validateItinerary([session()], {
    requestedBreak: { start: "12:00", end: "13:00" },
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors[0].code, "requested_break_missing");
});
