const itineraryList = document.querySelector("#itinerary");
const template = document.querySelector("#itinerary-item-template");
let eventTimeZone = "America/Los_Angeles";

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

function renderItem(item, index) {
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

  fragment.querySelector(".strip-kind").textContent =
    item.type === "session" ? item.format || "Session" : item.type;
  fragment.querySelector("h3").textContent = item.title;
  fragment.querySelector(".strip-detail").textContent =
    item.description || item.note || "";
  fragment.querySelector(".location").textContent = item.room || "On your route";

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
  setText("#traveler", plan.attendee.name);
  setText("#focus", plan.attendee.interests.join(" · "));
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
    ...plan.items.map((item, index) => renderItem(item, index)),
  );
  itineraryList.setAttribute("aria-busy", "false");
  renderValidation(plan.validation);
} catch (error) {
  renderFailure(error instanceof Error ? error : new Error(String(error)));
  itineraryList.setAttribute("aria-busy", "false");
}
