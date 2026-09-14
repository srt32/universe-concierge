import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateItineraryDocument } from "../plugins/universe-concierge/src/itinerary/validate.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const siteDirectory = resolve(root, "site");
const outputDirectory = resolve(root, "dist");
const itineraryPath = resolve(siteDirectory, "itinerary.json");

async function main() {
  const plan = JSON.parse(await readFile(itineraryPath, "utf8"));
  const result = validateItineraryDocument(plan);
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
  console.log(`Built static site in ${outputDirectory}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
