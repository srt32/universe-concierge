const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function issue(code, message, itemIds = []) {
  return { code, message, itemIds };
}

function validDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function minuteOfDay(value) {
  const match = CLOCK_PATTERN.exec(value ?? "");
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function localMinute(dateValue) {
  const match = /T(\d{2}):(\d{2})/.exec(dateValue ?? "");
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function validateRequestedBreak(items, requestedBreak, errors) {
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
    const itemStart = localMinute(item.start);
    const itemEnd = localMinute(item.end);
    return itemStart !== null && itemEnd !== null && itemStart <= start && itemEnd >= end;
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
      } else {
        try {
          new URL(item.sourceUrl);
        } catch {
          errors.push(
            issue(
              "invalid_source_url",
              `Session "${label}" has an invalid source URL.`,
              [label],
            ),
          );
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
    scheduledItems.push({ id: label, start, end });
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

  validateRequestedBreak(items, options.requestedBreak, errors);

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
