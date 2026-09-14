import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { validateItinerary } from "../plugins/universe-concierge/src/itinerary/validate.js";

const embeddedCatalog = JSON.parse(
  await readFile(
    new URL(
      "../plugins/universe-concierge/data/sessions.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

const script = new URL("../scripts/validate-itinerary.js", import.meta.url);
const hookScript = new URL(
  "../plugins/universe-concierge/com.github.copilot/hooks/validate-itinerary-hook.js",
  import.meta.url,
);
const writeScopeHookScript = new URL(
  "../plugins/universe-concierge/com.github.copilot/hooks/enforce-write-scope-hook.js",
  import.meta.url,
);
function source(id) {
  return {
    source: "embedded-snapshot",
    sourceUrl: `https://events.githubuniverse.com/api/session?id=${id}`,
  };
}

function canonicalSession(id) {
  const session =
    embeddedCatalog.sessions.find((candidate) => candidate.id === id) ??
    embeddedCatalog.sessions[0];
  return {
    id: session.id,
    type: "session",
    title: session.title,
    start: session.start,
    end: session.end,
    source: "embedded-snapshot",
    sourceUrl: session.sourceUrl,
  };
}

async function run(items, requestedBreak) {
  const directory = await mkdtemp(join(tmpdir(), "universe-hook-"));
  const file = join(directory, "itinerary.json");
  const requiredBreak = requestedBreak ?? { start: "12:00", end: "13:00" };
  await writeFile(
    file,
    JSON.stringify({
      event: {
        id: "github-universe-2026",
        name: "GitHub Universe 2026",
        timezone: "America/Los_Angeles",
      },
      date: items[0]?.start?.slice(0, 10) ?? "2026-10-28",
      attendee: { name: "Agent builder", interests: ["Copilot"] },
      requestedBreak: requiredBreak,
      metadata: {
        source: "embedded-snapshot",
        sourceUrl:
          "https://github.com/srt32/universe-concierge/blob/main/plugins/universe-concierge/data/sessions.json",
        retrievedAt: "2026-09-14T17:00:00.000Z",
        fallback: true,
      },
      items,
      validation: validateItinerary(items, { requestedBreak: requiredBreak }),
    }),
  );
  return spawnSync(process.execPath, [script.pathname, file], {
    encoding: "utf8",
  });
}

function runWriteScopeHook(cwd, toolName, toolArgs) {
  return spawnSync(process.execPath, [writeScopeHookScript.pathname], {
    cwd,
    input: JSON.stringify({ cwd, toolName, toolArgs }),
    encoding: "utf8",
  });
}

test("the file validator accepts a sourced plan with its requested break", async () => {
  const result = await run(
    [
      canonicalSession("1786370222106001jLNQ"),
      {
        id: "break-1",
        type: "break",
        title: "Recharge",
        start: "2026-10-28T12:00:00-07:00",
        end: "2026-10-28T13:00:00-07:00",
      },
    ],
    { start: "12:00", end: "13:00" },
  );

  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).valid, true);
});

test("the file validator exits nonzero for overlapping sessions", async () => {
  const result = await run([
    {
      id: "session-1",
      type: "session",
      title: "A session",
      start: "2026-10-29T09:00:00-07:00",
      end: "2026-10-29T10:00:00-07:00",
      ...source("session-1"),
    },
    {
      id: "session-2",
      type: "session",
      title: "Another session",
      start: "2026-10-29T09:30:00-07:00",
      end: "2026-10-29T10:30:00-07:00",
      ...source("session-2"),
    },
  ]);

  assert.equal(result.status, 1);
  const output = JSON.parse(result.stderr);
  assert.equal(output.valid, false);
  assert.equal(output.errors[0].code, "overlap");
});

test("the file validator rejects a fabricated canonical-looking session", async () => {
  const result = await run([
    {
      id: "invented-session",
      type: "session",
      title: "Invented session",
      start: "2026-10-28T09:00:00-07:00",
      end: "2026-10-28T10:00:00-07:00",
      ...source("invented-session"),
    },
    {
      id: "break-1",
      type: "break",
      title: "Recharge",
      start: "2026-10-28T12:00:00-07:00",
      end: "2026-10-28T13:00:00-07:00",
    },
  ]);

  assert.equal(result.status, 1);
  const output = JSON.parse(result.stderr);
  assert.ok(output.errors.some(({ code }) => code === "unknown_session"));
});

test("the post-tool hook replaces an invalid edit result with a failure", async () => {
  const directory = await mkdtemp(join(tmpdir(), "universe-post-hook-"));
  const siteDirectory = join(directory, "site");
  await mkdir(siteDirectory, { recursive: true });
  await writeFile(
    join(siteDirectory, "itinerary.json"),
    JSON.stringify({
      items: [
        {
          id: "session-1",
          type: "session",
          title: "A session",
          start: "2026-10-29T09:00:00-07:00",
          end: "2026-10-29T10:00:00-07:00",
          ...source("session-1"),
        },
        {
          id: "session-2",
          type: "session",
          title: "Another session",
          start: "2026-10-29T09:30:00-07:00",
          end: "2026-10-29T10:30:00-07:00",
          ...source("session-2"),
        },
      ],
    }),
  );

  const result = spawnSync(process.execPath, [hookScript.pathname], {
    cwd: directory,
    env: { ...process.env, UNIVERSE_HOOK_EVENT: "postToolUse" },
    encoding: "utf8",
  });
  const output = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(output.modifiedResult.resultType, "failure");
  assert.match(output.modifiedResult.error, /overlap/i);
});

test("the agent-stop hook blocks completion with an invalid itinerary", async () => {
  const directory = await mkdtemp(join(tmpdir(), "universe-stop-hook-"));
  const missingPath = join(directory, "site", "itinerary.json");
  const result = spawnSync(process.execPath, [hookScript.pathname], {
    cwd: directory,
    env: {
      ...process.env,
      UNIVERSE_HOOK_EVENT: "agentStop",
      UNIVERSE_ITINERARY_PATH: missingPath,
    },
    encoding: "utf8",
  });
  const output = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(output.decision, "block");
  assert.match(output.reason, /rejected itinerary/i);
});

test("the agent-stop hook blocks a schema-incomplete itinerary", async () => {
  const directory = await mkdtemp(join(tmpdir(), "universe-stop-hook-"));
  const siteDirectory = join(directory, "site");
  await mkdir(siteDirectory, { recursive: true });
  await writeFile(
    join(siteDirectory, "itinerary.json"),
    JSON.stringify({
      items: [],
      validation: { valid: true, errors: [], warnings: [], summary: {} },
    }),
  );
  const result = spawnSync(process.execPath, [hookScript.pathname], {
    cwd: directory,
    env: { ...process.env, UNIVERSE_HOOK_EVENT: "agentStop" },
    encoding: "utf8",
  });
  const output = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(output.decision, "block");
  assert.match(output.reason, /event/i);
});

test("the pre-tool hook allows writes only to the itinerary", async () => {
  const directory = await mkdtemp(join(tmpdir(), "universe-scope-hook-"));
  const result = runWriteScopeHook(directory, "edit", {
    path: "site/itinerary.json",
  });

  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).permissionDecision, "allow");
});

test("the pre-tool hook denies writes outside the itinerary", async () => {
  const directory = await mkdtemp(join(tmpdir(), "universe-scope-hook-"));
  const result = runWriteScopeHook(directory, "edit", {
    path: ".github/workflows/ci.yml",
  });
  const output = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(output.permissionDecision, "deny");
  assert.match(output.permissionDecisionReason, /site\/itinerary\.json/);
});

test("the pre-tool hook denies mixed-path patches", async () => {
  const directory = await mkdtemp(join(tmpdir(), "universe-scope-hook-"));
  const result = runWriteScopeHook(directory, "apply_patch", {
    patch:
      "*** Begin Patch\n*** Update File: site/itinerary.json\n@@\n-old\n+new\n*** Update File: README.md\n@@\n-old\n+new\n*** End Patch",
  });

  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).permissionDecision, "deny");
});

test("the pre-tool hook accepts the runtime's raw patch argument", async () => {
  const directory = await mkdtemp(join(tmpdir(), "universe-scope-hook-"));
  const result = runWriteScopeHook(
    directory,
    "apply_patch",
    "*** Begin Patch\n*** Update File: ./site/itinerary.json\n@@\n-old\n+new\n*** End Patch\n",
  );

  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).permissionDecision, "allow");
});

test("the pre-tool hook fails closed when the write target is missing", async () => {
  const directory = await mkdtemp(join(tmpdir(), "universe-scope-hook-"));
  const result = runWriteScopeHook(directory, "edit", {
    oldText: "old",
    newText: "new",
  });

  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).permissionDecision, "deny");
});
