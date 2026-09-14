const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const RFC3339_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:Z|([+-])(\d{2}):(\d{2}))$/;
const CANONICAL_SOURCE_HOST = "events.githubuniverse.com";
const EVENT_TIME_ZONE = "America/Los_Angeles";
const LIVE_SOURCE = "rainfocus-public-page";
const CANONICAL_SOURCES = new Set([
  LIVE_SOURCE,
  "hosted-snapshot",
  "embedded-snapshot",
]);

function issue(code, message, itemIds = []) {
  return { code, message, itemIds };
}

function validDate(value) {
  const match = typeof value === "string" ? RFC3339_PATTERN.exec(value) : null;
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second, , offsetSign, offsetHour, offsetMinute] =
    match;
  if (
    !validCalendarDate(`${year}-${month}-${day}`) ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59 ||
    (offsetSign &&
      (Number(offsetHour) > 23 || Number(offsetMinute) > 59))
  ) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasText(value) {
  return typeof value === "string" && value.trim() !== "";
}

function validHttpsUrl(value) {
  try {
    const url = hasText(value) ? new URL(value) : null;
    return url?.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function validCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthLengths = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return month >= 1 && month <= 12 && day >= 1 && day <= monthLengths[month - 1];
}

function eventLocalDate(value, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function canonicalSourceError(item, label) {
  if (!CANONICAL_SOURCES.has(item?.source)) {
    return issue(
      "invalid_canonical_source",
      `Session "${label}" has an unsupported source name.`,
      [label],
    );
  }
  try {
    const sourceUrl = new URL(item.sourceUrl);
    if (sourceUrl.hostname !== CANONICAL_SOURCE_HOST) {
      throw new Error("unsupported host");
    }
    const sourceId = sourceUrl.searchParams.get("id");
    if (sourceId !== item.id) {
      throw new Error("ID mismatch");
    }
  } catch {
    return issue(
      "invalid_canonical_source",
      `Session "${label}" must use its canonical public Universe source URL.`,
      [label],
    );
  }
  return null;
}

function validateCatalogSessions(items, catalogSessions, metadata, errors) {
  if (!Array.isArray(catalogSessions)) {
    return;
  }
  const byId = new Map(catalogSessions.map((session) => [session.id, session]));
  for (const item of items.filter((candidate) => candidate?.type === "session")) {
    const canonical = byId.get(item.id);
    if (!canonical) {
      errors.push(
        issue(
          "unknown_session",
          `Session "${item.id}" is not present in the selected public catalog.`,
          [item.id],
        ),
      );
      continue;
    }
    if (
      item.title !== canonical.title ||
      item.start !== canonical.start ||
      item.end !== canonical.end ||
      item.sourceUrl !== canonical.sourceUrl
    ) {
      errors.push(
        issue(
          "session_mismatch",
          `Session "${item.id}" does not match its canonical catalog record.`,
          [item.id],
        ),
      );
    }
  }
}

function validateSessionSources(items, metadata, errors) {
  if (!CANONICAL_SOURCES.has(metadata?.source)) {
    return;
  }
  for (const item of items.filter((candidate) => candidate?.type === "session")) {
    if (item.source !== metadata.source) {
      errors.push(
        issue(
          "session_source_mismatch",
          `Session "${item.id}" must use the itinerary metadata source "${metadata.source}".`,
          [item.id],
        ),
      );
    }
  }
}

function minuteOfDay(value) {
  const match = CLOCK_PATTERN.exec(value ?? "");
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function eventLocalMinute(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(values.hour) * 60 + Number(values.minute);
}

function validateRequestedBreak(items, requestedBreak, errors, timeZone) {
  if (!requestedBreak) {
    return;
  }

  const start = minuteOfDay(requestedBreak.start);
  const end = minuteOfDay(requestedBreak.end);
  if (start === null || end === null || end <= start) {
    errors.push(
      issue(
        "invalid_requested_break",
        "The requested break must use HH:MM values with an end after its start.",
      ),
    );
    return;
  }

  const preservingBreak = items.some((item) => {
    if (item.type !== "break") {
      return false;
    }
    const itemStart = validDate(item.start);
    const itemEnd = validDate(item.end);
    return (
      itemStart !== null &&
      itemEnd !== null &&
      eventLocalMinute(itemStart, timeZone) <= start &&
      eventLocalMinute(itemEnd, timeZone) >= end
    );
  });

  if (!preservingBreak) {
    errors.push(
      issue(
        "requested_break_missing",
        `The itinerary must preserve the requested ${requestedBreak.start}-${requestedBreak.end} break.`,
      ),
    );
  }
}

export function validateItinerary(items, options = {}) {
  if (!Array.isArray(items)) {
    return {
      valid: false,
      errors: [issue("invalid_itinerary", "Itinerary items must be an array.")],
      warnings: [],
    };
  }

  const errors = [];
  const warnings = [];
  const scheduledItems = [];
  const seenIds = new Set();

  for (const [index, item] of items.entries()) {
    const itemId = typeof item?.id === "string" ? item.id.trim() : "";
    const label = itemId || `item-${index + 1}`;
    const type = item?.type ?? "session";

    if (!["session", "break", "travel", "note"].includes(type)) {
      errors.push(
        issue("invalid_item_type", `Item "${label}" has an unsupported type.`, [
          label,
        ]),
      );
    }
    if (!hasText(item?.title)) {
      errors.push(
        issue("missing_title", `Item "${label}" is missing its title.`, [label]),
      );
    }

    if (hasText(item?.sourceUrl) && !validHttpsUrl(item.sourceUrl)) {
      errors.push(
        issue(
          "invalid_source_url",
          `Item "${label}" must use an HTTPS source URL.`,
          [label],
        ),
      );
    }

    if (!itemId) {
      errors.push(
        issue("missing_session_id", `Session item ${index + 1} is missing a canonical ID.`, [
          label,
        ]),
      );
    } else if (seenIds.has(itemId)) {
      errors.push(
        issue("duplicate_item_id", `Canonical ID "${itemId}" appears more than once.`, [
          itemId,
        ]),
      );
    } else {
      seenIds.add(itemId);
    }

    if (type === "session") {
      if (typeof item?.source !== "string" || item.source.trim() === "") {
        errors.push(
          issue("missing_source", `Session "${label}" is missing its source name.`, [
            label,
          ]),
        );
      }
      if (typeof item?.sourceUrl !== "string" || item.sourceUrl.trim() === "") {
        errors.push(
          issue(
            "missing_source_url",
            `Session "${label}" is missing its canonical source URL.`,
            [label],
          ),
        );
      }
      if (item?.source && item?.sourceUrl) {
        const sourceError = canonicalSourceError(item, label);
        if (sourceError) {
          errors.push(sourceError);
        }
      }
    }

    const start = validDate(item?.start);
    const end = validDate(item?.end);
    if (!start || !end) {
      errors.push(
        issue(
          "invalid_time",
          `Item "${label}" must include valid ISO 8601 start and end times.`,
          [label],
        ),
      );
      continue;
    }
    if (end <= start) {
      errors.push(
        issue("invalid_time_range", `Item "${label}" must end after it starts.`, [
          label,
        ]),
      );
      continue;
    }
    if (
      options.planDate &&
      options.timeZone &&
      (eventLocalDate(start, options.timeZone) !== options.planDate ||
        eventLocalDate(end, options.timeZone) !== options.planDate)
    ) {
      errors.push(
        issue(
          "wrong_event_date",
          `Item "${label}" must start and end on itinerary date ${options.planDate} in ${options.timeZone}.`,
          [label],
        ),
      );
    }
    scheduledItems.push({ id: label, start, end });
  }

  for (let index = 1; index < scheduledItems.length; index += 1) {
    const previous = scheduledItems[index - 1];
    const current = scheduledItems[index];
    if (current.start < previous.start) {
      errors.push(
        issue(
          "out_of_order",
          `Itinerary item "${current.id}" starts before preceding item "${previous.id}".`,
          [previous.id, current.id],
        ),
      );
    }
  }

  scheduledItems.sort((a, b) => a.start - b.start || a.end - b.end);
  for (let index = 1; index < scheduledItems.length; index += 1) {
    const previous = scheduledItems[index - 1];
    const current = scheduledItems[index];
    if (current.start < previous.end) {
      errors.push(
        issue(
          "overlap",
          `Itinerary items "${previous.id}" and "${current.id}" overlap.`,
          [previous.id, current.id],
        ),
      );
    }
  }

  validateRequestedBreak(
    items,
    options.requestedBreak,
    errors,
    options.timeZone ?? EVENT_TIME_ZONE,
  );
  validateSessionSources(items, options.catalogMetadata, errors);
  validateCatalogSessions(
    items,
    options.catalogSessions,
    options.catalogMetadata,
    errors,
  );

  if (items.length === 0) {
    warnings.push(issue("empty_itinerary", "The itinerary does not contain any items."));
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      itemCount: items.length,
      sessionCount: items.filter((item) => (item?.type ?? "session") === "session")
        .length,
      breakCount: items.filter((item) => item?.type === "break").length,
    },
  };
}

function documentIssue(path, message) {
  return issue("invalid_document", `${path}: ${message}`);
}

export function validateItineraryDocument(plan, options = {}) {
  const documentErrors = [];
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    return {
      valid: false,
      errors: [documentIssue("/", "the itinerary must be a JSON object.")],
      warnings: [],
    };
  }

  if (
    !hasText(plan.event?.id) ||
    !hasText(plan.event?.name) ||
    plan.event?.timezone !== EVENT_TIME_ZONE
  ) {
    documentErrors.push(
      documentIssue(
        "/event",
        `id, name, and timezone ${EVENT_TIME_ZONE} are required.`,
      ),
    );
  }
  if (!validCalendarDate(plan.date)) {
    documentErrors.push(
      documentIssue("/date", "a real YYYY-MM-DD calendar date is required."),
    );
  }
  if (
    !hasText(plan.attendee?.name) ||
    !Array.isArray(plan.attendee?.interests) ||
    plan.attendee.interests.length === 0 ||
    plan.attendee.interests.some((interest) => !hasText(interest))
  ) {
    documentErrors.push(
      documentIssue(
        "/attendee",
        "a name and at least one non-empty interest are required.",
      ),
    );
  }
  if (!plan.requestedBreak || typeof plan.requestedBreak !== "object") {
    documentErrors.push(
      documentIssue("/requestedBreak", "a requested break is required."),
    );
  }
  if (
    !CANONICAL_SOURCES.has(plan.metadata?.source) ||
    !validHttpsUrl(plan.metadata?.sourceUrl) ||
    !validDate(plan.metadata?.retrievedAt) ||
    typeof plan.metadata?.fallback !== "boolean"
  ) {
    documentErrors.push(
      documentIssue(
        "/metadata",
        "source, sourceUrl, retrievedAt, and fallback metadata are required.",
      ),
    );
  }
  if (
    CANONICAL_SOURCES.has(plan.metadata?.source) &&
    typeof plan.metadata?.fallback === "boolean" &&
    plan.metadata.fallback !== (plan.metadata.source !== LIVE_SOURCE)
  ) {
    documentErrors.push(
      documentIssue(
        "/metadata/fallback",
        "fallback must match whether the selected source is live or a snapshot.",
      ),
    );
  }
  if (!Array.isArray(plan.items) || plan.items.length === 0) {
    documentErrors.push(
      documentIssue("/items", "at least one itinerary item is required."),
    );
  }

  const computed = validateItinerary(plan.items, {
    requestedBreak: plan.requestedBreak,
    catalogSessions: options.catalogSessions,
    catalogMetadata: options.catalogMetadata ?? plan.metadata,
    planDate: validCalendarDate(plan.date) ? plan.date : undefined,
    timeZone: plan.event?.timezone,
  });
  const validation = plan.validation;
  if (
    validation?.valid !== computed.valid ||
    !Array.isArray(validation?.errors) ||
    !Array.isArray(validation?.warnings) ||
    (computed.valid && validation.errors.length !== 0) ||
    validation?.summary?.itemCount !== computed.summary?.itemCount ||
    validation?.summary?.sessionCount !== computed.summary?.sessionCount ||
    validation?.summary?.breakCount !== computed.summary?.breakCount
  ) {
    documentErrors.push(
      documentIssue(
        "/validation",
        "stored validity and summary must match the computed itinerary result.",
      ),
    );
  }

  return {
    ...computed,
    valid: documentErrors.length === 0 && computed.valid,
    errors: [...documentErrors, ...computed.errors],
  };
}
