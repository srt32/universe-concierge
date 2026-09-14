import assert from "node:assert/strict";
import test from "node:test";

import {
  discoverCatalogConfiguration,
  normalizeRainFocusSession,
} from "../plugins/universe-concierge/src/data/sources.js";

const configuration = {
  eventsHost: "events.githubuniverse.com",
  apiProfileToken: "profile",
  widgetToken: "widget",
};

test("discovers the public session widget from loadPage data", () => {
  assert.deepEqual(
    discoverCatalogConfiguration({
      data: {
        responseCode: "0",
        eventsUrl: "events.githubuniverse.com",
        timeZone: "US/Pacific",
        widgetConf: {
          apiProfileToken: "profile",
          widgetToken: "widget",
          workflowId: "workflow",
        },
      },
    }),
    {
      apiProfileToken: "profile",
      widgetToken: "widget",
      workflowId: "workflow",
      eventsHost: "events.githubuniverse.com",
      timeZone: "America/Los_Angeles",
    },
  );
});

test("rejects a discovered RainFocus host outside the public allow-list", () => {
  assert.throws(
    () =>
      discoverCatalogConfiguration({
        data: {
          responseCode: "0",
          eventsUrl: "https://169.254.169.254/latest/meta-data",
          widgetConf: {
            apiProfileToken: "profile",
            widgetToken: "widget",
          },
        },
      }),
    /expected public events host/i,
  );
});

test("normalizes RainFocus local times, tracks, speakers, and canonical source", () => {
  const session = normalizeRainFocusSession(
    {
      sessionID: "session-1",
      title: "Agent systems",
      abstract: "Build a reliable agent.",
      type: "Breakout",
      published: 1,
      status: "Accepted",
      viewAccessPublic: true,
      times: [
        {
          date: "2026-10-28",
          endDate: "2026-10-28",
          startTime: "10:30",
          endTime: "11:10",
          utcStartTime: "2026/10/28 17:30:00",
          room: "Cowell Theater",
          isHidden: false,
        },
      ],
      attributevalues: [{ attribute: "Track", value: "Build software, not code" }],
      participants: [{ fullName: "Octo Cat" }],
    },
    configuration,
  );

  assert.equal(session.start, "2026-10-28T10:30:00-07:00");
  assert.equal(session.end, "2026-10-28T11:10:00-07:00");
  assert.deepEqual(session.topics, ["Build software, not code"]);
  assert.deepEqual(session.speakers, [{ name: "Octo Cat" }]);
  assert.equal(
    session.sourceUrl,
    "https://events.githubuniverse.com/api/session?rfApiProfileId=profile&rfWidgetId=widget&id=session-1",
  );
});
