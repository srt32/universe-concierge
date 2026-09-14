import assert from "node:assert/strict";
import test from "node:test";

import { localPath } from "../scripts/preview-site.js";

test("the preview server rejects malformed URL encoding", () => {
  assert.equal(localPath("/%"), null);
});
