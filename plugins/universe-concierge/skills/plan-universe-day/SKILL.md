---
name: plan-universe-day
description: Build a personalized, sourced, conflict-free GitHub Universe itinerary and update the repository attendee site.
license: MIT
---

# Plan a GitHub Universe day

Use this procedure when an attendee asks for a personalized GitHub Universe
itinerary, a day plan, or an update to `site/itinerary.json`.

## Inputs to resolve

Before selecting sessions, identify:

- the event day;
- two to four interests or goals;
- preferred session formats, if any;
- accessibility, pacing, or walking constraints the attendee volunteers;
- one requested break with explicit `HH:MM` start and end times.

Never request RainFocus credentials, attendee authentication, or personal agenda
access. Use only the public data exposed by the `universe` MCP server.

## Procedure

1. Call `get_event_overview` and retain its complete source metadata.
2. Call `search_sessions` once per distinct interest. Use a day filter and a
   small result limit so the candidate set stays explainable.
3. Call `get_session` for every shortlisted canonical ID. Do not invent a
   session, time, room, speaker, source, or identifier.
4. Select a coherent route. Include realistic transfer buffers when consecutive
   rooms are in different Fort Mason buildings.
5. Add the requested break as an itinerary item with `type: "break"`. The break
   must cover the full requested interval.
6. Build items in chronological order. Every session item must copy its
   canonical `id`, `source`, and `sourceUrl` from MCP results.
7. Call `validate_itinerary` with the complete item array and requested break.
   Resolve every validation error before writing the file.
8. Update only `site/itinerary.json` using
   `schemas/itinerary.schema.json`. Copy the validator result into the
   top-level `validation` field and the catalog source metadata into
   `metadata`.
9. Summarize the choices, name any fallback source or stale snapshot explicitly,
   and tell the attendee that public schedules can change.

## Selection guidance

- Prefer a strong narrative across the day over filling every minute.
- Never schedule overlapping sessions, including partial overlaps.
- Keep at least 15 minutes for transfers between different buildings unless the
  attendee asks for a tighter plan and accepts the risk.
- Treat fallback data as fallback. Do not use words such as "live" or "latest"
  unless `metadata.fallback` is `false`.
- If the source chain fails completely, stop and report the source errors rather
  than writing a plausible-looking itinerary.

## Output contract

`site/itinerary.json` must include:

- event identity, date, attendee label, and interests;
- `requestedBreak`;
- source metadata including `source`, `sourceUrl`, `retrievedAt`, `fallback`,
  and any `failures`;
- ordered itinerary items;
- the exact result returned by `validate_itinerary`.

The plugin hook independently validates this file after edits. A failed hook is
a hard stop: fix the file and rerun validation before continuing.
