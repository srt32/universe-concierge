import { z } from "zod";

import { loadSessionCatalog } from "./data/source-chain.js";
import { SessionNotFoundError } from "./errors.js";
import { validateItinerary } from "./itinerary/validate.js";

const itineraryItemSchema = z.object({
  id: z.string(),
  type: z.enum(["session", "break", "travel", "note"]).default("session"),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  source: z.string().optional(),
  sourceUrl: z.string().url().optional(),
});

const requestedBreakSchema = z
  .object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  })
  .optional();

function normalizedText(value) {
  return String(value ?? "").toLocaleLowerCase();
}

function includesQuery(session, query) {
  const haystack = [
    session.title,
    session.description,
    session.room,
    session.format,
    ...(session.topics ?? []),
    ...(session.speakers ?? []).map(({ name }) => name),
  ]
    .map(normalizedText)
    .join(" ");
  return haystack.includes(normalizedText(query));
}

function tool(description, inputSchema, handler) {
  return { description, inputSchema, handler };
}

export function createUniverseTools({ loadCatalog = loadSessionCatalog } = {}) {
  return new Map([
    [
      "get_event_overview",
      tool(
        "Get public GitHub Universe event dates, venue, source freshness, and planning context.",
        {},
        async () => {
          const catalog = await loadCatalog();
          return { event: catalog.event, metadata: catalog.metadata };
        },
      ),
    ],
    [
      "search_sessions",
      tool(
        "Search public GitHub Universe sessions by topic, title, description, speaker, room, or format.",
        {
          query: z.string().min(1).describe("Words to match across session fields."),
          day: z.string().optional().describe("Optional YYYY-MM-DD date filter."),
          limit: z.number().int().min(1).max(50).default(10),
        },
        async ({ query, day, limit = 10 }) => {
          const catalog = await loadCatalog();
          const sessions = catalog.sessions
            .filter((session) => includesQuery(session, query))
            .filter((session) => !day || session.start.startsWith(day))
            .slice(0, limit);
          return {
            query,
            count: sessions.length,
            sessions,
            metadata: catalog.metadata,
          };
        },
      ),
    ],
    [
      "get_session",
      tool(
        "Get one GitHub Universe session by its canonical public ID.",
        { id: z.string().min(1).describe("Canonical session ID.") },
        async ({ id }) => {
          const catalog = await loadCatalog();
          const session = catalog.sessions.find((candidate) => candidate.id === id);
          if (!session) {
            throw new SessionNotFoundError(id);
          }
          return { session, metadata: catalog.metadata };
        },
      ),
    ],
    [
      "get_venue_tips",
      tool(
        "Get public, non-personal venue and attendee logistics tips for GitHub Universe.",
        {},
        async () => {
          const catalog = await loadCatalog();
          return {
            venue: catalog.event.venue,
            tips: catalog.venueTips ?? [],
            metadata: catalog.metadata,
          };
        },
      ),
    ],
    [
      "validate_itinerary",
      tool(
        "Validate that an itinerary has no overlaps, every session is canonical and sourced, and the requested break is preserved.",
        {
          items: z.array(itineraryItemSchema),
          requestedBreak: requestedBreakSchema,
        },
        async ({ items, requestedBreak }) => {
          const catalog = await loadCatalog();
          return validateItinerary(items, {
            requestedBreak,
            catalogSessions: catalog.sessions,
            catalogMetadata: catalog.metadata,
          });
        },
      ),
    ],
  ]);
}
