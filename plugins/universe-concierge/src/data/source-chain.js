import { UniverseConciergeError } from "../errors.js";
import { createDefaultAdapters } from "./sources.js";

const STALE_AFTER_DAYS = 14;

function errorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}

function assertCatalog(catalog, source) {
  if (!catalog || typeof catalog !== "object") {
    throw new UniverseConciergeError(`${source} returned no catalog object.`, {
      code: "INVALID_CATALOG",
    });
  }
  if (!catalog.event || !Array.isArray(catalog.sessions)) {
    throw new UniverseConciergeError(
      `${source} returned a catalog without event and sessions fields.`,
      { code: "INVALID_CATALOG" },
    );
  }
  if (catalog.sessions.length === 0) {
    throw new UniverseConciergeError(`${source} returned an empty session catalog.`, {
      code: "EMPTY_CATALOG",
    });
  }
}

function snapshotFreshness(catalog, now) {
  if (!catalog.generatedAt) {
    return {};
  }
  const generatedAt = new Date(catalog.generatedAt);
  if (Number.isNaN(generatedAt.getTime())) {
    return { snapshotGeneratedAt: catalog.generatedAt, stale: true };
  }
  const ageDays = Math.floor((now.getTime() - generatedAt.getTime()) / 86_400_000);
  return {
    snapshotGeneratedAt: generatedAt.toISOString(),
    snapshotAgeDays: Math.max(ageDays, 0),
    stale: ageDays > STALE_AFTER_DAYS,
  };
}

export async function loadSessionCatalog({
  adapters = createDefaultAdapters(),
  forceSource = process.env.UNIVERSE_SOURCE,
  now = () => new Date(),
} = {}) {
  const selectedAdapters = forceSource
    ? adapters.filter((adapter) => adapter.name === forceSource)
    : adapters;

  if (selectedAdapters.length === 0) {
    throw new UniverseConciergeError(
      `Unknown source "${forceSource}". Available sources: ${adapters
        .map(({ name }) => name)
        .join(", ")}.`,
      { code: "UNKNOWN_SOURCE" },
    );
  }

  const failures = [];
  for (const adapter of selectedAdapters) {
    try {
      const catalog = await adapter.load();
      assertCatalog(catalog, adapter.name);
      const retrievedAt = now().toISOString();
      const metadata = {
        ...(catalog.metadata ?? {}),
        source: adapter.name,
        sourceUrl: adapter.sourceUrl,
        retrievedAt,
        fallback: adapter.name !== adapters[0]?.name,
        forced: Boolean(forceSource),
        failures,
        ...snapshotFreshness(catalog, now()),
      };
      const sessions = catalog.sessions.map((session) => ({
        ...session,
        source: adapter.name,
        sourceUrl: session.sourceUrl || adapter.sourceUrl,
        retrievedAt,
      }));

      return {
        ...catalog,
        sessions,
        metadata,
      };
    } catch (error) {
      failures.push({
        source: adapter.name,
        reason: errorMessage(error),
      });
    }
  }

  throw new UniverseConciergeError(
    `Every Universe data source failed:\n${failures
      .map(({ source, reason }) => `- ${source}: ${reason}`)
      .join("\n")}`,
    { code: "ALL_SOURCES_FAILED" },
  );
}
