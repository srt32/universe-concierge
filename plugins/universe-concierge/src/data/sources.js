import { readFile } from "node:fs/promises";

import { SourceUnavailableError } from "../errors.js";

export const RAINFOCUS_CATALOG_URL =
  "https://reg.githubuniverse.com/flow/github/universe26/attendee-portal/page/sessioncatalog";
export const RAINFOCUS_PAGE_DATA_URL =
  "https://reg.githubuniverse.com/flow/loadPage?pageUri=sessioncatalog&workflowApiToken=github.universe26.attendee-portal";
export const RAINFOCUS_PUBLIC_API_PROFILE =
  "AjWe02u25IuBR01J4a6OsQvAsdXwPSjr";
export const HOSTED_SNAPSHOT_URL =
  "https://srt32.github.io/universe-concierge/data/sessions.json";
export const EMBEDDED_SNAPSHOT_URLS = [
  new URL("../data/sessions.json", import.meta.url),
  new URL("../../data/sessions.json", import.meta.url),
];
export const PUBLIC_VENUE_TIPS = [
  {
    id: "fort-mason-address",
    title: "Start at Fort Mason Center",
    detail:
      "GitHub Universe 2026 is at Fort Mason Center, 2 Marina Blvd, San Francisco.",
    sourceUrl: "https://githubuniverse.com/",
  },
  {
    id: "allow-building-transfers",
    title: "Leave time between buildings",
    detail:
      "Sessions span Festival Pavilion, Gateway Pavilion, Buildings B and C, and the Firehouse. Keep transfer time in the itinerary.",
    sourceUrl: RAINFOCUS_CATALOG_URL,
  },
  {
    id: "recheck-schedule",
    title: "Recheck the public catalog",
    detail:
      "Published times and rooms can change. Refresh the live catalog before relying on the plan onsite.",
    sourceUrl: RAINFOCUS_CATALOG_URL,
  },
];

function canonicalTimeZone(value) {
  return value === "US/Pacific" ? "America/Los_Angeles" : value;
}

function offsetIso(time) {
  const utcValue = time?.utcStartTime;
  if (!time?.date || !time?.startTime || !utcValue) {
    return undefined;
  }
  const utc = new Date(`${utcValue.replaceAll("/", "-").replace(" ", "T")}Z`);
  const localAsUtc = new Date(`${time.date}T${time.startTime}:00Z`);
  if (Number.isNaN(utc.getTime()) || Number.isNaN(localAsUtc.getTime())) {
    return undefined;
  }
  const offsetMinutes = Math.round((localAsUtc.getTime() - utc.getTime()) / 60_000);
  const sign = offsetMinutes < 0 ? "-" : "+";
  const absolute = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");
  return `${time.date}T${time.startTime}:00${sign}${hours}:${minutes}`;
}

function endOffsetIso(time) {
  const start = offsetIso(time);
  if (!start || !time?.endDate || !time?.endTime) {
    return undefined;
  }
  return `${time.endDate}T${time.endTime}:00${start.slice(-6)}`;
}

function rainFocusTopics(raw) {
  return (raw.attributevalues ?? [])
    .filter(({ attribute, attribute_id: attributeId }) =>
      [attribute, attributeId].includes("Track"),
    )
    .map(({ value }) => value)
    .filter((value) => typeof value === "string" && value.trim());
}

export function normalizeRainFocusSession(raw, configuration) {
  const time = raw.times?.find(({ isHidden }) => !isHidden) ?? raw.times?.[0];
  const id = String(raw.sessionID ?? raw.externalID ?? "").trim();
  const title = String(raw.title ?? "").trim();
  const start = offsetIso(time);
  const end = endOffsetIso(time);
  if (!id || !title || !start || !end) {
    return null;
  }
  const detailUrl = new URL(`https://${configuration.eventsHost}/api/session`);
  detailUrl.searchParams.set("rfApiProfileId", configuration.apiProfileToken);
  detailUrl.searchParams.set("rfWidgetId", configuration.widgetToken);
  detailUrl.searchParams.set("id", id);

  return {
    id,
    title,
    description: String(raw.abstract ?? ""),
    start,
    end,
    room: String(time?.room ?? ""),
    format: String(raw.type ?? ""),
    topics: rainFocusTopics(raw),
    speakers: (raw.participants ?? [])
      .map((speaker) => ({ name: speaker.fullName ?? speaker.globalFullName }))
      .filter(({ name }) => typeof name === "string" && name.trim()),
    sourceUrl: detailUrl.toString(),
  };
}

async function fetchResponse(url, source) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "srt32/universe-concierge",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    throw new SourceUnavailableError(
      source,
      `request failed with HTTP ${response.status}`,
    );
  }
  return response;
}

function assertRainFocusSuccess(payload, source) {
  const responseCode = payload?.responseCode ?? payload?.data?.responseCode;
  if (responseCode !== "0") {
    const responseMessage =
      payload?.responseMessage ?? payload?.data?.responseMessage ?? "unknown error";
    throw new SourceUnavailableError(
      source,
      `RainFocus response ${responseCode ?? "missing"}: ${responseMessage}`,
    );
  }
}

export function discoverCatalogConfiguration(pagePayload) {
  assertRainFocusSuccess(pagePayload, "rainfocus-page-data");
  const configuration = pagePayload.data?.widgetConf;
  const eventsHost = pagePayload.data?.eventsUrl;
  if (
    !configuration?.apiProfileToken ||
    !configuration?.widgetToken ||
    !eventsHost
  ) {
    throw new SourceUnavailableError(
      "rainfocus-page-data",
      "the public page did not expose its catalog widget configuration",
    );
  }
  return {
    apiProfileToken: configuration.apiProfileToken,
    widgetToken: configuration.widgetToken,
    workflowId: configuration.workflowId,
    eventsHost,
    timeZone: canonicalTimeZone(
      pagePayload.data?.timeZone ?? "America/Los_Angeles",
    ),
  };
}

function searchItems(payload) {
  if (Array.isArray(payload.items)) {
    return payload.items;
  }
  return payload.sectionList?.flatMap(({ items }) => items ?? []) ?? [];
}

async function fetchSearchPage(configuration, from, size) {
  const url = new URL(`https://${configuration.eventsHost}/api/search`);
  url.searchParams.set("rfApiProfileId", configuration.apiProfileToken);
  url.searchParams.set("rfWidgetId", configuration.widgetToken);
  url.searchParams.set("type", "session");
  url.searchParams.set("size", String(size));
  url.searchParams.set("from", String(from));
  const response = await fetchResponse(url, "rainfocus-public-page");
  const payload = await response.json();
  assertRainFocusSuccess(payload, "rainfocus-public-page");
  return payload;
}

export const rainfocusPublicPageAdapter = {
  name: "rainfocus-public-page",
  sourceUrl: RAINFOCUS_CATALOG_URL,
  async load() {
    const pageResponse = await fetchResponse(
      RAINFOCUS_PAGE_DATA_URL,
      "rainfocus-page-data",
    );
    const pagePayload = await pageResponse.json();
    const configuration = discoverCatalogConfiguration(pagePayload);
    const pageSize = 100;
    const firstPage = await fetchSearchPage(configuration, 0, pageSize);
    const total = firstPage.totalSearchItems ?? firstPage.total ?? 0;
    const rawSessions = searchItems(firstPage);

    for (let from = rawSessions.length; from < total; from += pageSize) {
      const page = await fetchSearchPage(configuration, from, pageSize);
      rawSessions.push(...searchItems(page));
    }

    const sessions = rawSessions
      .filter(
        (session) =>
          session.published === 1 &&
          session.status === "Accepted" &&
          session.viewAccessPublic === true,
      )
      .map((session) => normalizeRainFocusSession(session, configuration))
      .filter(Boolean);

    if (sessions.length === 0) {
      throw new SourceUnavailableError(
        "rainfocus-public-page",
        "the public widget returned no accepted, published sessions",
      );
    }
    return {
      event: {
        id: "github-universe-2026",
        name: "GitHub Universe 2026",
        dates: ["2026-10-28", "2026-10-29"],
        timezone: configuration.timeZone,
        venue: "Fort Mason Center, 2 Marina Blvd, San Francisco, CA 94123",
        sourceUrl: "https://githubuniverse.com/",
      },
      sessions,
      venueTips: PUBLIC_VENUE_TIPS,
    };
  },
};

export const hostedSnapshotAdapter = {
  name: "hosted-snapshot",
  sourceUrl: HOSTED_SNAPSHOT_URL,
  async load() {
    const response = await fetchResponse(HOSTED_SNAPSHOT_URL, "hosted-snapshot");
    return response.json();
  },
};

export const embeddedSnapshotAdapter = {
  name: "embedded-snapshot",
  sourceUrl:
    "https://github.com/srt32/universe-concierge/blob/main/plugins/universe-concierge/data/sessions.json",
  async load() {
    const failures = [];
    for (const candidate of EMBEDDED_SNAPSHOT_URLS) {
      try {
        const content = await readFile(candidate, "utf8");
        return JSON.parse(content);
      } catch (error) {
        failures.push(
          `${candidate.pathname}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    throw new SourceUnavailableError(
      "embedded-snapshot",
      `snapshot file was unavailable:\n${failures.join("\n")}`,
    );
  },
};

export function createDefaultAdapters() {
  return [
    rainfocusPublicPageAdapter,
    hostedSnapshotAdapter,
    embeddedSnapshotAdapter,
  ];
}
