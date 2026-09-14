const itineraryList = document.querySelector("#itinerary");
const template = document.querySelector("#itinerary-item-template");

function formatTime(value) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}

function renderValidation(validation) {
  const clearance = document.querySelector(".clearance");
  const valid = validation?.valid === true;
  clearance.classList.add(valid ? "is-valid" : "is-invalid");
  setText("#validation-label", valid ? "Itinerary cleared" : "Review required");
  setText(
    "#validation-detail",
    valid
      ? `${validation.summary.sessionCount} sourced sessions · ${validation.summary.breakCount} protected break`
      : (validation?.errors ?? []).map(({ message }) => message).join(" "),
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
  if (item.sourceUrl) {
    sourceLink.href = item.sourceUrl;
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
  setText("#event-date", `${formatDate(plan.date)} · ${plan.event.name}`);
  setText("#traveler", plan.attendee.name);
  setText("#focus", plan.attendee.interests.join(" · "));
  setText(
    "#source-status",
    plan.metadata.stale
      ? `${plan.metadata.source} stale fallback`
      : plan.metadata.fallback
      ? `${plan.metadata.source} fallback`
      : `${plan.metadata.source} live`,
  );
  setText(
    "#retrieved-at",
    `Source retrieved ${new Date(plan.metadata.retrievedAt).toLocaleString()}`,
  );
  document.querySelector("#catalog-link").href = plan.metadata.sourceUrl;

  itineraryList.replaceChildren(
    ...plan.items.map((item, index) => renderItem(item, index)),
  );
  itineraryList.setAttribute("aria-busy", "false");
  renderValidation(plan.validation);
} catch (error) {
  renderFailure(error instanceof Error ? error : new Error(String(error)));
  itineraryList.setAttribute("aria-busy", "false");
}
