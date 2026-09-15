const itineraryList = document.querySelector("#itinerary");
const template = document.querySelector("#itinerary-item-template");
let eventTimeZone = "America/Los_Angeles";
const anonymousInterests = new Set([
  "AI",
  "Copilot",
  "DevOps",
  "GitHub",
  "agents",
  "context engineering",
  "developer experience",
  "developer productivity",
  "open source",
  "platform engineering",
  "security",
]);

function formatTime(value) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: eventTimeZone,
  }).format(new Date(value));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: eventTimeZone,
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatRetrievedAt(value) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: eventTimeZone,
    timeZoneName: "short",
  }).format(new Date(value));
}

function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function renderValidation(validation) {
  const clearance = document.querySelector(".clearance");
  const valid = validation?.valid === true;
  const errors = (validation?.errors ?? [])
    .map(({ message }) => message)
    .join(" ");
  const breakCount = validation?.summary?.breakCount ?? 0;
  clearance.classList.add(valid ? "is-valid" : "is-invalid");
  setText("#validation-label", valid ? "Itinerary cleared" : "Review required");
  setText(
    "#validation-detail",
    valid
      ? `${validation.summary.sessionCount} sourced sessions · ${breakCount} protected ${
          breakCount === 1 ? "break" : "breaks"
        }`
      : errors || "The itinerary validator did not provide a reason.",
  );
}

function renderItem(item, index, hasPublicOptIn) {
  const fragment = template.content.cloneNode(true);
  const strip = fragment.querySelector(".strip");
  strip.dataset.type = item.type;
  strip.style.setProperty("--index", index);

  const start = fragment.querySelector(".start");
  const end = fragment.querySelector(".end");
  start.dateTime = item.start;
  start.textContent = formatTime(item.start);
  end.dateTime = item.end;
  end.textContent = formatTime(item.end);

  const isSession = item.type === "session";
  fragment.querySelector(".strip-kind").textContent = isSession
    ? item.format || "Session"
    : item.type;
  fragment.querySelector("h3").textContent =
    isSession || hasPublicOptIn
      ? item.title
      : item.type === "break"
        ? "Break"
        : "Travel buffer";
  fragment.querySelector(".strip-detail").textContent =
    hasPublicOptIn
      ? item.description || (isSession ? "" : item.note) || ""
      : "";
  fragment.querySelector(".location").textContent =
    (isSession || hasPublicOptIn) && item.room ? item.room : "On your route";

  const sourceLink = fragment.querySelector(".source-link");
  const sourceUrl = safeHttpsUrl(item.sourceUrl);
  if (sourceUrl) {
    sourceLink.href = sourceUrl;
    fragment.querySelector(".source-id").textContent = item.id;
  } else {
    sourceLink.hidden = true;
  }

  return fragment;
}

function renderFailure(error) {
  const clearance = document.querySelector(".clearance");
  clearance.classList.add("is-invalid");
  setText("#validation-label", "Flight plan unavailable");
  setText("#validation-detail", error.message);
  itineraryList.replaceChildren();
  const item = document.createElement("li");
  item.className = "error-strip";
  item.textContent =
    "The itinerary could not be loaded. Run npm run build after regenerating site/itinerary.json.";
  itineraryList.append(item);
}

async function loadItinerary() {
  const response = await fetch("./itinerary.json", {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Itinerary request failed with HTTP ${response.status}.`);
  }
  return response.json();
}

try {
  const plan = await loadItinerary();
  eventTimeZone = plan.event.timezone ?? eventTimeZone;
  setText("#event-date", `${formatDate(plan.date)} · ${plan.event.name}`);
  const hasPublicOptIn =
    plan.publication?.mode === "public-opt-in" &&
    plan.publication?.publicSharingConsent === true;
  setText("#traveler", hasPublicOptIn ? plan.attendee.name : "Universe attendee");
  const displayedInterests = hasPublicOptIn
    ? plan.attendee.interests
    : plan.attendee.interests.filter((interest) =>
        anonymousInterests.has(interest),
      );
  setText("#focus", displayedInterests.join(" · ") || "Technical sessions");
  setText(
    "#privacy-status",
    hasPublicOptIn ? "Public sharing opted in" : "Anonymous public plan",
  );
  const isFallback = plan.metadata.source !== "rainfocus-public-page";
  setText(
    "#source-status",
    plan.metadata.stale
      ? `${plan.metadata.source} stale fallback`
      : isFallback
      ? `${plan.metadata.source} fallback`
      : `${plan.metadata.source} live`,
  );
  setText(
    "#retrieved-at",
    `Source retrieved ${formatRetrievedAt(plan.metadata.retrievedAt)}`,
  );
  const catalogLink = document.querySelector("#catalog-link");
  const catalogUrl = safeHttpsUrl(plan.metadata.sourceUrl);
  if (catalogUrl) {
    catalogLink.href = catalogUrl;
  } else {
    catalogLink.hidden = true;
  }

  itineraryList.replaceChildren(
    ...plan.items.map((item, index) =>
      renderItem(item, index, hasPublicOptIn),
    ),
  );
  itineraryList.setAttribute("aria-busy", "false");
  renderValidation(plan.validation);
} catch (error) {
  renderFailure(error instanceof Error ? error : new Error(String(error)));
  itineraryList.setAttribute("aria-busy", "false");
}
