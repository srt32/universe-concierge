import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const script = new URL("../scripts/validate-itinerary.js", import.meta.url);
const hookScript = new URL(
  "../plugins/universe-concierge/com.github.copilot/hooks/validate-itinerary-hook.js",
  import.meta.url,
);
const source = {
  source: "embedded-snapshot",
  sourceUrl: "https://github.com/srt32/universe-concierge",
};

async function run(items, requestedBreak) {
  const directory = await mkdtemp(join(tmpdir(), "universe-hook-"));
  const file = join(directory, "itinerary.json");
  await writeFile(file, JSON.stringify({ items, requestedBreak }));
  return spawnSync(process.execPath, [script.pathname, file], {
    encoding: "utf8",
  });
}

test("the file validator accepts a sourced plan with its requested break", async () => {
  const result = await run(
    [
      {
        id: "session-1",
        type: "session",
        title: "A session",
        start: "2026-10-29T09:00:00-07:00",
        end: "2026-10-29T10:00:00-07:00",
        ...source,
      },
      {
        id: "break-1",
        type: "break",
        title: "Recharge",
        start: "2026-10-29T12:00:00-07:00",
        end: "2026-10-29T13:00:00-07:00",
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
      ...source,
    },
    {
      id: "session-2",
      type: "session",
      title: "Another session",
      start: "2026-10-29T09:30:00-07:00",
      end: "2026-10-29T10:30:00-07:00",
      ...source,
    },
  ]);

  assert.equal(result.status, 1);
  const output = JSON.parse(result.stderr);
  assert.equal(output.valid, false);
  assert.equal(output.errors[0].code, "overlap");
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
          ...source,
        },
        {
          id: "session-2",
          type: "session",
          title: "Another session",
          start: "2026-10-29T09:30:00-07:00",
          end: "2026-10-29T10:30:00-07:00",
          ...source,
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
