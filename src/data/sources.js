import { readFile } from "node:fs/promises";

import { SourceUnavailableError } from "../errors.js";

export const RAINFOCUS_CATALOG_URL =
  "https://reg.githubuniverse.com/flow/github/universe26/attendee-portal/page/sessioncatalog";
export const HOSTED_SNAPSHOT_URL =
  "https://srt32.github.io/universe-concierge/data/sessions.json";
export const EMBEDDED_SNAPSHOT_URL = new URL("../../data/sessions.json", import.meta.url);

function getValue(object, keys) {
  for (const key of keys) {
    const value = object?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

function asIso(value) {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function normalizeSession(raw) {
  const id = String(
    getValue(raw, ["canonicalId", "sessionId", "sessionID", "id", "code"]) ?? "",
  ).trim();
  const title = String(
    getValue(raw, ["title", "sessionTitle", "name", "publicName"]) ?? "",
  ).trim();
  const start = asIso(
    getValue(raw, ["start", "startTime", "startDate", "startDateTime"]),
  );
  const end = asIso(getValue(raw, ["end", "endTime", "endDate", "endDateTime"]));
  if (!id || !title || !start || !end) {
    return null;
  }

  const speakersValue = getValue(raw, ["speakers", "speakerNames", "presenters"]);
  const speakers = Array.isArray(speakersValue)
    ? speakersValue.map((speaker) =>
        typeof speaker === "string"
          ? { name: speaker }
          : { name: getValue(speaker, ["name", "fullName", "displayName"]) },
      )
    : [];

  return {
    id,
    title,
    description: String(getValue(raw, ["description", "abstract", "summary"]) ?? ""),
    start,
    end,
    room: String(getValue(raw, ["room", "location", "venue"]) ?? ""),
    format: String(getValue(raw, ["format", "sessionType", "type"]) ?? ""),
    topics: getValue(raw, ["topics", "tracks", "categories"]) ?? [],
    speakers: speakers.filter(({ name }) => typeof name === "string" && name.trim()),
    sourceUrl: String(
      getValue(raw, ["sourceUrl", "url", "detailUrl"]) ?? RAINFOCUS_CATALOG_URL,
    ),
  };
}

function collectSessionObjects(value, results, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) {
    return;
  }
  seen.add(value);

  const normalized = normalizeSession(value);
  if (normalized) {
    results.set(normalized.id, normalized);
  }

  for (const child of Object.values(value)) {
    if (child && typeof child === "object") {
      collectSessionObjects(child, results, seen);
    }
  }
}

function jsonScriptPayloads(html) {
  const payloads = [];
  const scriptPattern =
    /<script[^>]*(?:type=["']application\/json["']|id=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(scriptPattern)) {
    try {
      payloads.push(JSON.parse(match[1]));
    } catch {
      // Non-JSON script content is not a supported public-page payload.
    }
  }
  return payloads;
}

async function fetchResponse(url, source) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/json",
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

export const rainfocusPublicPageAdapter = {
  name: "rainfocus-public-page",
  sourceUrl: RAINFOCUS_CATALOG_URL,
  async load() {
    const response = await fetchResponse(
      RAINFOCUS_CATALOG_URL,
      "rainfocus-public-page",
    );
    const html = await response.text();
    const sessions = new Map();
    for (const payload of jsonScriptPayloads(html)) {
      collectSessionObjects(payload, sessions);
    }
    if (sessions.size === 0) {
      throw new SourceUnavailableError(
        "rainfocus-public-page",
        "the public page did not expose recognizable session JSON; browser extraction may be required",
      );
    }
    return {
      event: {
        id: "github-universe-2026",
        name: "GitHub Universe 2026",
        sourceUrl: "https://githubuniverse.com/",
      },
      sessions: [...sessions.values()],
      venueTips: [],
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
    "https://github.com/srt32/universe-concierge/blob/main/data/sessions.json",
  async load() {
    const content = await readFile(EMBEDDED_SNAPSHOT_URL, "utf8");
    return JSON.parse(content);
  },
};

export function createDefaultAdapters() {
  return [
    rainfocusPublicPageAdapter,
    hostedSnapshotAdapter,
    embeddedSnapshotAdapter,
  ];
}
