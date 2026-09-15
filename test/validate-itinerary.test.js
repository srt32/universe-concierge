import assert from "node:assert/strict";
import test from "node:test";

import {
  validateItinerary,
  validateItineraryDocument,
} from "../plugins/universe-concierge/src/itinerary/validate.js";

function session(overrides = {}) {
  const value = {
    id: "universe26-opening-keynote",
    type: "session",
    title: "Opening keynote",
    start: "2026-10-29T09:00:00-07:00",
    end: "2026-10-29T10:00:00-07:00",
    source: "embedded-snapshot",
    ...overrides,
  };
  value.sourceUrl ??=
    `https://events.githubuniverse.com/api/session?id=${value.id}`;
  return value;
}

function itineraryDocument(overrides = {}) {
  const items = overrides.items ?? [
    session(),
    {
      id: "break-1",
      type: "break",
      title: "Break",
      start: "2026-10-29T12:00:00-07:00",
      end: "2026-10-29T13:00:00-07:00",
    },
  ];
  const requestedBreak = overrides.requestedBreak ?? {
    start: "12:00",
    end: "13:00",
  };
  return {
    event: {
      id: "github-universe-2026",
      name: "GitHub Universe 2026",
      timezone: "America/Los_Angeles",
    },
    date: "2026-10-29",
    attendee: {
      name: "Universe attendee",
      interests: ["Copilot"],
    },
    publication: {
      mode: "anonymous",
      publicSharingConsent: false,
    },
    requestedBreak,
    metadata: {
      source: "embedded-snapshot",
      sourceUrl:
        "https://github.com/srt32/universe-concierge/blob/main/plugins/universe-concierge/data/sessions.json",
      retrievedAt: "2026-09-14T17:00:00.000Z",
      fallback: true,
    },
    items,
    validation: validateItinerary(items, { requestedBreak }),
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

test("rejects itinerary items without an explicit type", () => {
  const item = session();
  delete item.type;
  const result = validateItinerary([item]);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "invalid_item_type"));
});

test("rejects session sources whose canonical URL does not carry the session ID", () => {
  const result = validateItinerary([
    session({
      id: "invented-session",
      sourceUrl: "https://example.invalid/fake",
    }),
  ]);

  assert.equal(result.valid, false);
  assert.equal(result.errors[0].code, "invalid_canonical_source");
});

test("rejects an itinerary that does not preserve the requested break", () => {
  const result = validateItinerary([session()], {
    requestedBreak: { start: "12:00", end: "13:00" },
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors[0].code, "requested_break_missing");
});

test("evaluates requested breaks in the event timezone", () => {
  const result = validateItinerary(
    [
      {
        id: "break-noon-eastern",
        type: "break",
        title: "Noon in New York",
        start: "2026-10-29T12:00:00-04:00",
        end: "2026-10-29T13:00:00-04:00",
      },
    ],
    { requestedBreak: { start: "12:00", end: "13:00" } },
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(({ code }) => code === "requested_break_missing"),
  );
});

test("rejects items that are not ordered chronologically", () => {
  const result = validateItinerary([
    session({
      id: "afternoon-session",
      start: "2026-10-29T14:00:00-07:00",
      end: "2026-10-29T15:00:00-07:00",
    }),
    session(),
  ]);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "out_of_order"));
});

test("rejects non-HTTPS source URLs", () => {
  const items = [
    session(),
    {
      id: "travel-1",
      type: "travel",
      title: "Walk to the next room",
      start: "2026-10-29T10:00:00-07:00",
      end: "2026-10-29T10:15:00-07:00",
      sourceUrl: "javascript:alert(document.domain)",
    },
    {
      id: "break-lunch",
      type: "break",
      title: "Lunch break",
      start: "2026-10-29T12:00:00-07:00",
      end: "2026-10-29T13:00:00-07:00",
    },
  ];
  const result = validateItineraryDocument(itineraryDocument({ items }));

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "invalid_source_url"));
});

test("rejects impossible itinerary dates and items from another event day", () => {
  const impossible = validateItineraryDocument(
    itineraryDocument({ date: "2026-02-30" }),
  );
  const wrongDay = validateItineraryDocument(
    itineraryDocument({ date: "2026-10-28" }),
  );

  assert.equal(impossible.valid, false);
  assert.ok(impossible.errors.some(({ message }) => message.startsWith("/date:")));
  assert.equal(wrongDay.valid, false);
  assert.ok(wrongDay.errors.some(({ code }) => code === "wrong_event_date"));
});

test("rejects calendar-invalid RFC 3339 timestamps", () => {
  const items = [
    session({
      start: "2026-02-30T12:00:00-08:00",
      end: "2026-02-30T13:00:00-08:00",
    }),
  ];
  const result = validateItinerary(items);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "invalid_time"));
});

test("rejects inconsistent fallback and session-source metadata", () => {
  const mislabeledFallback = validateItineraryDocument(
    itineraryDocument({
      metadata: {
        source: "embedded-snapshot",
        sourceUrl:
          "https://github.com/srt32/universe-concierge/blob/main/plugins/universe-concierge/data/sessions.json",
        retrievedAt: "2026-09-14T17:00:00.000Z",
        fallback: false,
      },
    }),
  );
  const mismatchedSource = validateItineraryDocument(
    itineraryDocument({
      metadata: {
        source: "hosted-snapshot",
        sourceUrl:
          "https://srt32.github.io/universe-concierge/data/sessions.json",
        retrievedAt: "2026-09-14T17:00:00.000Z",
        fallback: true,
      },
    }),
  );

  assert.equal(mislabeledFallback.valid, false);
  assert.ok(
    mislabeledFallback.errors.some(({ message }) =>
      message.includes("fallback must match"),
    ),
  );
  assert.equal(mismatchedSource.valid, false);
  assert.ok(
    mismatchedSource.errors.some(({ code }) => code === "session_source_mismatch"),
  );
});

test("rejects source metadata that does not match the selected adapter", () => {
  const result = validateItineraryDocument(
    itineraryDocument({
      metadata: {
        source: "embedded-snapshot",
        sourceUrl: "https://attacker.example/sessions.json",
        retrievedAt: "2026-09-14T17:00:00.000Z",
        fallback: true,
      },
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(({ message }) =>
      message.includes("selected source endpoint"),
    ),
  );
});

test("requires a selected catalog to validate a sourced document", () => {
  const result = validateItineraryDocument(itineraryDocument());

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(({ code }) => code === "catalog_verification_required"),
  );
});

test("rejects displayed session fields that differ from the selected catalog", () => {
  const items = [
    session({
      room: "Invented room",
      format: "Invented format",
    }),
  ];
  const plan = itineraryDocument({
    items,
    requestedBreak: { start: "11:00", end: "11:30" },
  });
  const result = validateItineraryDocument(plan, {
    catalogSessions: [
      {
        ...items[0],
        room: "Canonical room",
        format: "Breakout",
      },
    ],
    catalogMetadata: plan.metadata,
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "session_mismatch"));
});

test("rejects a fabricated description on an opted-in canonical session", () => {
  const items = [
    session({
      description: "Fabricated attendee-facing session description",
    }),
  ];
  const plan = itineraryDocument({
    attendee: { name: "Octo Builder", interests: ["Copilot"] },
    publication: {
      mode: "public-opt-in",
      publicSharingConsent: true,
    },
    items,
    requestedBreak: { start: "11:00", end: "11:30" },
  });
  const result = validateItineraryDocument(plan, {
    catalogSessions: [
      {
        ...items[0],
        description: "Canonical public session description",
      },
    ],
    catalogMetadata: plan.metadata,
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "session_mismatch"));
});

test("invalid event timezones return validation errors instead of throwing", () => {
  const plan = itineraryDocument({
    event: {
      id: "github-universe-2026",
      name: "GitHub Universe 2026",
      timezone: "Mars/Phobos",
    },
  });

  assert.doesNotThrow(() => validateItineraryDocument(plan));
  assert.equal(validateItineraryDocument(plan).valid, false);
});

test("malformed item collections return validation errors instead of throwing", () => {
  const plan = itineraryDocument({ items: {} });

  assert.doesNotThrow(() => validateItineraryDocument(plan));
  const result = validateItineraryDocument(plan);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ message }) => message.startsWith("/items:")));
});

test("requested-break validation handles null items deterministically", () => {
  assert.doesNotThrow(() =>
    validateItinerary([null], {
      requestedBreak: { start: "12:00", end: "13:00" },
    }),
  );
  const result = validateItinerary([null], {
    requestedBreak: { start: "12:00", end: "13:00" },
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "invalid_item_type"));
  assert.ok(result.errors.some(({ code }) => code === "requested_break_missing"));
});

test("rejects an itinerary date outside the selected event dates", () => {
  const items = [
    {
      id: "break-only",
      type: "break",
      title: "Break",
      start: "2026-10-30T12:00:00-07:00",
      end: "2026-10-30T13:00:00-07:00",
    },
  ];
  const plan = itineraryDocument({
    date: "2026-10-30",
    items,
    validation: validateItinerary(items, {
      requestedBreak: { start: "12:00", end: "13:00" },
      planDate: "2026-10-30",
      timeZone: "America/Los_Angeles",
    }),
  });
  const result = validateItineraryDocument(plan, {
    catalogSessions: [],
    catalogMetadata: plan.metadata,
    catalogEvent: { dates: ["2026-10-28", "2026-10-29"] },
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "invalid_event_date"));
});

for (const [field, value] of [
  ["id", "another-event"],
  ["name", "Another event"],
  ["timezone", "UTC"],
]) {
  test(`rejects an event ${field} that differs from the selected catalog`, () => {
    const plan = itineraryDocument({
      event: {
        id: "github-universe-2026",
        name: "GitHub Universe 2026",
        timezone: "America/Los_Angeles",
        [field]: value,
      },
    });
    const result = validateItineraryDocument(plan, {
      catalogSessions: [],
      catalogMetadata: plan.metadata,
      catalogEvent: {
        id: "github-universe-2026",
        name: "GitHub Universe 2026",
        timezone: "America/Los_Angeles",
        dates: ["2026-10-28", "2026-10-29"],
      },
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.some(({ code }) => code === "event_mismatch"));
  });
}

test("defaults public output to an anonymous attendee", () => {
  const result = validateItineraryDocument(
    itineraryDocument({
      attendee: { name: "Octo Cat", interests: ["Copilot"] },
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "privacy_violation"));
});

test("allows an identifying display label only with explicit public opt-in", () => {
  const plan = itineraryDocument({
    attendee: {
      name: "Octo Cat",
      interests: ["Copilot and Octo's team goals"],
    },
    publication: {
      mode: "public-opt-in",
      publicSharingConsent: true,
    },
  });
  const result = validateItineraryDocument(plan);

  assert.ok(
    !result.errors.some(({ code }) => code === "privacy_violation"),
  );
});

test("rejects public sharing without explicit consent", () => {
  const result = validateItineraryDocument(
    itineraryDocument({
      attendee: { name: "Octo Cat", interests: ["Copilot"] },
      publication: {
        mode: "public-opt-in",
        publicSharingConsent: false,
      },
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "privacy_violation"));
});

test("rejects identifying free text from an anonymous public plan", () => {
  const result = validateItineraryDocument(
    itineraryDocument({
      attendee: {
        name: "Universe attendee",
        interests: ["alice@example.com"],
      },
      items: [
        session({ description: "Meet Alice from Example Corp" }),
        {
          id: "break-alice",
          type: "break",
          title: "Alice's accessibility break",
          start: "2026-10-29T12:00:00-07:00",
          end: "2026-10-29T13:00:00-07:00",
          note: "Mobility accommodation",
        },
      ],
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "privacy_violation"));
});

test("rejects private fields anywhere in an anonymous public document", () => {
  const plan = itineraryDocument();
  plan.attendee.email = "alice@example.com";
  plan.metadata.privateConstraints = "Mobility accommodation";
  plan.validation.warnings = [{ message: "Meet Alice from Example Corp" }];

  const result = validateItineraryDocument(plan);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "privacy_violation"));
});

test("rejects unknown fields from an opted-in public document", () => {
  const plan = itineraryDocument({
    attendee: { name: "Octo Cat", interests: ["Copilot"] },
    publication: {
      mode: "public-opt-in",
      publicSharingConsent: true,
    },
  });
  plan.attendee.email = "alice@example.com";

  const result = validateItineraryDocument(plan);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "privacy_violation"));
});

test("rejects untyped optional metadata from a public document", () => {
  const plan = itineraryDocument();
  plan.metadata.snapshotGeneratedAt = "alice@example.com";

  const result = validateItineraryDocument(plan);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "privacy_violation"));
});

test("rejects nested data in an opted-in item's text fields", () => {
  const plan = itineraryDocument({
    attendee: { name: "Octo Cat", interests: ["Copilot"] },
    publication: {
      mode: "public-opt-in",
      publicSharingConsent: true,
    },
  });
  plan.items[0].description = { privateNote: "Mobility accommodation" };

  const result = validateItineraryDocument(plan);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "privacy_violation"));
});

test("rejects a free-form note on an opted-in canonical session", () => {
  const plan = itineraryDocument({
    attendee: { name: "Octo Builder", interests: ["Copilot"] },
    publication: {
      mode: "public-opt-in",
      publicSharingConsent: true,
    },
  });
  plan.items[0].note = "PRIVATE-CONTENT-BYPASS";

  const result = validateItineraryDocument(plan);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "privacy_violation"));
});
