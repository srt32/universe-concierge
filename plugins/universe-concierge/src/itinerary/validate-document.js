import { loadSessionCatalog } from "../data/source-chain.js";
import { validateItineraryDocument } from "./validate.js";

const SOURCES = new Set([
  "rainfocus-public-page",
  "hosted-snapshot",
  "embedded-snapshot",
]);

export async function validateItineraryDocumentAgainstCatalog(
  plan,
  { loadCatalog = loadSessionCatalog } = {},
) {
  if (!SOURCES.has(plan?.metadata?.source)) {
    return validateItineraryDocument(plan);
  }

  const catalog = await loadCatalog({ forceSource: plan.metadata.source });
  return validateItineraryDocument(plan, {
    catalogSessions: catalog.sessions,
    catalogMetadata: catalog.metadata,
  });
}
