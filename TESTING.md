# Testing Universe Concierge

This ladder starts with deterministic local checks and ends with the complete
Copilot cloud agent issue-to-PR scenario. Run it from the repository root with
Node.js 20 or later.

## Five-minute smoke test

```bash
npm ci
npm run check
UNIVERSE_SOURCE=embedded-snapshot npm run inspect:mcp
npm run preview
```

Open http://127.0.0.1:4173 and confirm:

- the page says **Itinerary cleared**;
- six chronological strips render;
- the 12:10–1:10 break is visible;
- all four session strips expose canonical source links;
- the data label says `embedded-snapshot fallback`.

Stop the preview with `Ctrl-C`.

## Verification ladder

### 1. Unit tests

```bash
npm ci
npm test
```

The suite covers source ordering and forced fallback, RainFocus normalization,
all MCP tool handlers, itinerary invariants, MCP trust labeling, the CLI
validator, pre-tool write-scope enforcement, post-tool rejection, and scoped
agent-stop blocking.

Run only the core contract tests:

```bash
npm run test:unit
```

### 2. Run and inspect every MCP tool

Build the production bundle:

```bash
npm run build:plugin
```

Attempt the live public source, with automatic hosted and embedded fallback:

```bash
npm run inspect:mcp
```

Force the live RainFocus public-page adapter. This command should fail rather
than fall back if the public widget contract has changed:

```bash
UNIVERSE_SOURCE=rainfocus-public-page npm run inspect:mcp
```

Force the hosted Pages snapshot after Pages is enabled:

```bash
UNIVERSE_SOURCE=hosted-snapshot npm run inspect:mcp
```

Force the deterministic offline snapshot:

```bash
UNIVERSE_SOURCE=embedded-snapshot npm run inspect:mcp
```

Each successful inspection lists and invokes:

```text
get_event_overview
search_sessions
get_session
get_venue_tips
validate_itinerary
```

The output names the selected source and whether it is live or fallback.

To inspect the raw MCP protocol interactively, run the bundled stdio server with
an MCP inspector:

```bash
npx --yes @modelcontextprotocol/inspector \
  node plugins/universe-concierge/dist/universe-mcp.js
```

### 3. Validate plugin and marketplace manifests

```bash
npm run build:plugin
npm run validate
```

The validator checks:

- `plugin.json` against the vendored official Agent Plugins 1.0 schema;
- `mcp.json` against the vendored official Agent Plugins 1.0 MCP schema;
- marketplace identity, source path, and repository URL;
- the exact same-repository `.github/copilot/settings.json` activation shape;
- required agent, skill, hook, bundle, and data files;
- the session snapshot and site itinerary against local JSON Schemas.

The canonical schemas are:

https://agent-plugins.org/schemas/1.0.0/plugin.schema.json

https://agent-plugins.org/schemas/1.0.0/mcp.schema.json

### 4. Install in Copilot CLI

Build first because plugin installation does not run `npm install`:

```bash
npm ci
npm run build
copilot plugin marketplace add .
copilot plugin marketplace list
copilot plugin marketplace browse universe-demo
copilot plugin install universe-concierge@universe-demo
copilot plugin list
```

Start the interactive CLI:

```bash
copilot
```

Run these interactive commands and inspect the results:

```text
/plugin list
/agent
/skills list
/mcp
```

Expected:

- `universe-concierge@universe-demo` is enabled;
- `universe-concierge` is available under `/agent`;
- `plan-universe-day` appears under `/skills list`;
- MCP server `universe` is running with five tools.

### 5. Run the concise concierge prompt

Select the `universe-concierge` agent, then paste:

```text
Plan October 28 at GitHub Universe for an agent-platform engineer interested
in Copilot, context engineering, and practical developer productivity. Keep
12:10–1:10 completely free, include realistic building transfers, update
site/itinerary.json, and say whether the source is live or a fallback.
```

Confirm the agent:

- calls public Universe MCP tools instead of inventing sessions;
- calls `validate_itinerary` before writing;
- changes only `site/itinerary.json`;
- preserves the requested break;
- reports source, retrieval time, fallback state, and upstream failures.
- writes anonymous publication fields unless the prompt explicitly opts into a
  public personalized microsite.

Then verify the written file:

```bash
node scripts/validate-itinerary.js site/itinerary.json
npm run build:site
```

Verify the privacy contract:

```bash
tmp="$(mktemp -d)"
cp site/itinerary.json "$tmp/anonymous.json"
node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync(process.argv[1]));p.attendee.name="Octo Cat";fs.writeFileSync(process.argv[2],JSON.stringify(p,null,2))' site/itinerary.json "$tmp/no-consent.json"
node scripts/validate-itinerary.js "$tmp/anonymous.json"
! node scripts/validate-itinerary.js "$tmp/no-consent.json"
node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync(process.argv[1]));p.attendee.name="Octo Cat";p.publication={mode:"public-opt-in",publicSharingConsent:true};fs.writeFileSync(process.argv[2],JSON.stringify(p,null,2))' site/itinerary.json "$tmp/opted-in.json"
node scripts/validate-itinerary.js "$tmp/opted-in.json"
rm -rf "$tmp"
```

The second validation must fail with `privacy_violation`; the anonymous and
explicitly opted-in plans must pass. Run the opt-in path only with a fictional
demo identity unless a real attendee has explicitly agreed to public sharing.

To verify the intended consumer-repository story in `srt32/my-universe`, use an
explicit prompt such as:

```text
Create a shareable public Universe microsite for my public nickname "Octo
Builder" and broad interests "Copilot" and "developer productivity". I
explicitly opt in to publishing that nickname, those interests, and the planned
itinerary. Do not include any other personal details.
```

### 6. Verify same-repository activation in Copilot cloud agent

This step requires the plugin and `.github/copilot/settings.json` on the
repository's default branch. The pull request that introduces the plugin should
remain unmerged until reviewed; run this scenario after approval and merge.

1. Enable Copilot coding agent for
   https://github.com/srt32/universe-concierge.
2. Create an issue with the prompt from step 5 and explicitly request an update
   to `site/itinerary.json`.
3. Assign the issue to Copilot.
4. In the agent session, confirm the same-repository marketplace loads
   `universe-concierge@universe-demo`.
5. Confirm the agent uses the `plan-universe-day` skill and `universe` MCP tools.
6. Review the resulting pull request and verify only the itinerary changed.
7. Run `npm run check` on the pull request branch.

The repository activation source must remain exactly:

```json
{
  "source": "github",
  "repo": "srt32/universe-concierge"
}
```

### 7. Prove the hook catches an overlap

The committed invalid fixture contains two overlapping sourced sessions:

```bash
node scripts/validate-itinerary.js test/fixtures/invalid-overlap.json
```

Expected: exit code `1` and an `overlap` error.

Run the hook integration tests:

```bash
node --test test/hook.test.js
```

Expected:

- the pre-tool hook allows `site/itinerary.json` and denies other write targets;
- the post-tool hook exits `0` with a `modifiedResult.resultType` of `failure`;
- the failure tells the agent which items overlap;
- the agent-stop hook ignores a missing implicit itinerary in an unrelated
  worktree, but explicit missing paths and invalid itinerary files remain
  actionable failures;
- full-document validation also rejects out-of-order or cross-day items,
  non-HTTPS source URLs, source mismatches, fallback data labeled live, and
  breaks that do not cover the requested event-local time.

For an interactive proof, temporarily paste the invalid fixture over
`site/itinerary.json` through the concierge agent. The edit result must become a
failure and the agent must repair the file before stopping. Restore the valid
file afterward:

```bash
git restore site/itinerary.json
```

### 8. Verify the demo site and Pages snapshot

Local:

```bash
npm run build
npm run preview
```

Check http://127.0.0.1:4173 on desktop and a narrow mobile viewport. Also check:

```bash
curl --fail http://127.0.0.1:4173/data/sessions.json
curl --fail http://127.0.0.1:4173/schemas/session-catalog.schema.json
```

After merge, enable **Settings → Pages → Source: GitHub Actions** for
https://github.com/srt32/universe-concierge. Run the **Publish demo site and
snapshot** workflow, then verify:

```bash
curl --fail \
  https://srt32.github.io/universe-concierge/data/sessions.json
```

Open:

https://srt32.github.io/universe-concierge/

The hosted snapshot adapter remains a fallback until this repository setting is
enabled and the workflow has deployed successfully.

## Full dress-rehearsal checklist

- [ ] Use the exact branch or commit intended for the presentation.
- [ ] Run `npm ci && npm run check`.
- [ ] Run live, hosted, and embedded `inspect:mcp` modes.
- [ ] Confirm live output reports `rainfocus-public-page` and `fallback: false`.
- [ ] Confirm embedded output reports `embedded-snapshot` and `fallback: true`.
- [ ] Install or reinstall the plugin from the local marketplace.
- [ ] Verify `/plugin list`, `/agent`, `/skills list`, and `/mcp`.
- [ ] Run the concise prompt once without edits to the wording.
- [ ] Confirm only `site/itinerary.json` changes.
- [ ] Run the invalid-overlap hook proof, then restore the valid itinerary.
- [ ] Build and inspect the site at desktop and mobile widths.
- [ ] Verify keyboard focus, reduced-motion behavior, and every source link.
- [ ] Verify the Pages site and hosted snapshot URL if Pages is enabled.
- [ ] Run the cloud agent issue-to-PR scenario after the plugin reaches `main`.
- [ ] Keep `UNIVERSE_SOURCE=embedded-snapshot` ready as the demo fallback.
- [ ] Keep this repository and the public RainFocus catalog open in separate tabs.
- [ ] Confirm the projector can read the source and validation status labels.

## Troubleshooting

### Live RainFocus extraction fails

Run:

```bash
UNIVERSE_SOURCE=rainfocus-public-page npm run inspect:mcp
```

Forced live mode exposes the actual failure instead of hiding it behind a
fallback. The adapter first reads the public `flow/loadPage` response to discover
the current widget profile and ID, then pages `/api/search`. Do not add attendee
authentication or switch to the denied `entityDataDump/session` endpoint.

For a demo, confirm the fallback chain:

```bash
UNIVERSE_SOURCE=embedded-snapshot npm run inspect:mcp
```

### Fallback metadata is stale

Snapshot results include `snapshotGeneratedAt`, `snapshotAgeDays`, and `stale`.
Do not relabel the response live. Recheck the public catalog, update the curated
records and `generatedAt` in
`plugins/universe-concierge/data/sessions.json`, run `npm run check`, and deploy
Pages again.

### Playwright cannot open the external catalog

GitHub's default Playwright MCP instance in CCA is scoped to localhost and
`127.0.0.1`. The local demo site works within that scope. Browser-driven
RainFocus inspection requires a Playwright MCP configuration that explicitly
permits `https://reg.githubuniverse.com` and
`https://events.githubuniverse.com`.

The concierge's normal live adapter uses unauthenticated HTTP fetches and does
not require Playwright.

### Copilot uses a cached plugin

Marketplace-installed plugins require a catalog refresh and plugin update:

```bash
npm run build
copilot plugin marketplace update universe-demo
copilot plugin update universe-concierge@universe-demo
copilot plugin list
```

Path-sourced plugins from a local marketplace load directly from their source
directory and do not need `plugin update`. Hook registrations are loaded when a
session starts, so use `/restart` or start a new session after changing
`hooks.json`. Then check `/plugin list`, `/skills list`, and `/mcp` again. To
bypass marketplace caching during development, launch with:

```bash
copilot --plugin-dir ./plugins/universe-concierge
```

### The hook reports invalid JSON

Run the validator directly:

```bash
node scripts/validate-itinerary.js site/itinerary.json
```

Fix the named error. The hook intentionally emits one JSON object and exits
zero so Copilot processes the replacement failure. Direct agent-stop
invocations block only when a configured or present itinerary is invalid.
