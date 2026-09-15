import assert from "node:assert/strict";
import test from "node:test";

import { parseItineraryJson } from "../plugins/universe-concierge/src/itinerary/parse-json.js";

test("parses itinerary JSON with unique object keys", () => {
  assert.deepEqual(parseItineraryJson('{"event":{"id":"universe"}}'), {
    event: { id: "universe" },
  });
});

test("rejects duplicate keys even when the final value looks safe", () => {
  assert.throws(
    () =>
      parseItineraryJson(
        '{"attendee":{"name":"Alice"},"attendee":{"name":"Universe attendee"}}',
      ),
    /Duplicate JSON key "attendee"/,
  );
});

test("rejects escaped duplicate keys", () => {
  assert.throws(
    () => parseItineraryJson('{"attendee":{},"att\\u0065ndee":{}}'),
    /Duplicate JSON key "attendee"/,
  );
});
