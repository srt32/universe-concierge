import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateItineraryDocumentAgainstCatalog } from "../plugins/universe-concierge/src/itinerary/validate-document.js";
import { parseItineraryJson } from "../plugins/universe-concierge/src/itinerary/parse-json.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const siteDirectory = resolve(root, "site");
const outputDirectory = resolve(root, "dist");
const itineraryPath = resolve(siteDirectory, "itinerary.json");

async function main() {
  const plan = parseItineraryJson(await readFile(itineraryPath, "utf8"));
  const result = await validateItineraryDocumentAgainstCatalog(plan);
  if (!result.valid) {
    throw new Error(
      `Refusing to build an invalid itinerary:\n${result.errors
        .map(({ code, message }) => `- ${code}: ${message}`)
        .join("\n")}`,
    );
  }

  await rm(outputDirectory, { recursive: true, force: true });
  await cp(siteDirectory, outputDirectory, { recursive: true });
  await mkdir(resolve(outputDirectory, "data"), { recursive: true });
  await mkdir(resolve(outputDirectory, "schemas"), { recursive: true });
  await cp(
    resolve(root, "plugins", "universe-concierge", "data", "sessions.json"),
    resolve(outputDirectory, "data", "sessions.json"),
  );
  await cp(resolve(root, "schemas"), resolve(outputDirectory, "schemas"), {
    recursive: true,
  });
  await writeFile(
    resolve(outputDirectory, "itinerary.json"),
    `${JSON.stringify(plan, null, 2)}\n`,
  );
  console.log(`Built static site in ${outputDirectory}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
