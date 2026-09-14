#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { validateItineraryDocumentAgainstCatalog } from "../plugins/universe-concierge/src/itinerary/validate-document.js";

const filePath = resolve(process.argv[2] ?? "site/itinerary.json");

async function main() {
  const plan = JSON.parse(await readFile(filePath, "utf8"));
  const result = await validateItineraryDocumentAgainstCatalog(plan);

  if (!result.valid) {
    console.error(
      JSON.stringify(
        {
          valid: false,
          file: filePath,
          errors: result.errors,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify(
      {
        valid: true,
        file: filePath,
        summary: result.summary,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
