#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { validateItineraryDocumentAgainstCatalog } from "../../src/itinerary/validate-document.js";

const itineraryPath = resolve(
  process.env.UNIVERSE_ITINERARY_PATH ?? "site/itinerary.json",
);
const event = process.env.UNIVERSE_HOOK_EVENT ?? "postToolUse";

function rejection(message) {
  if (event === "agentStop") {
    return {
      decision: "block",
      reason: message,
    };
  }
  return {
    modifiedResult: {
      resultType: "failure",
      textResultForLlm: message,
      error: message,
    },
  };
}

async function validationFailure() {
  try {
    const plan = JSON.parse(await readFile(itineraryPath, "utf8"));
    const result = await validateItineraryDocumentAgainstCatalog(plan);
    if (!result.valid) {
      return `Rejected itinerary: ${result.errors
        .map(({ code, message }) => `${code}: ${message}`)
        .join(" ")}`;
    }
    return null;
  } catch (error) {
    return `Rejected itinerary: ${error instanceof Error ? error.message : String(error)}`;
  }
}

const failure = await validationFailure();
if (failure) {
  process.stdout.write(`${JSON.stringify(rejection(failure))}\n`);
}
