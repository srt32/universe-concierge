import assert from "node:assert/strict";
import test from "node:test";

import { structured } from "../scripts/inspect-mcp.js";

test("the MCP inspector surfaces structured tool errors", () => {
  assert.throws(
    () =>
      structured({
        isError: true,
        structuredContent: {
          error: {
            code: "ALL_SOURCES_FAILED",
            message: "Every Universe data source failed.",
          },
        },
      }),
    /ALL_SOURCES_FAILED: Every Universe data source failed/,
  );
});
