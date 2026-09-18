# Architecture

Universe Concierge separates probabilistic planning from deterministic facts and
guarantees.

## Component boundaries

### Prompt: intent

The attendee supplies interests, day, pacing needs, and a requested break. The
prompt does not need to know catalog APIs or the site schema.

### Skill: procedure

`plan-universe-day` defines the reusable sequence: resolve preferences, search,
inspect canonical sessions, budget travel, preserve the break, validate, write,
and disclose source state.

The skill is portable Agent Plugins 1.0 content under `skills/`.

### MCP: facts

The `universe` stdio server exposes only read-only or deterministic tools. It
does not expose resources or prompts because Copilot cloud agent supports MCP
tools rather than those capabilities.

The server bundle contains the official MCP SDK and Zod. It reads the embedded
snapshot from the plugin directory, so installation does not need a package
manager lifecycle.

### Hook: guarantee

A fail-closed pre-tool hook permits file-writing tools only when every target
resolves to `site/itinerary.json`. The post-tool hook then validates the
itinerary and replaces an invalid edit's successful result with a failure,
which routes the agent back into repair. The plugin does not register a global
agent-stop hook because the hook configuration format has no agent- or
skill-scoping mechanism.

The validator enforces:

- valid ISO start and end times;
- chronological source order;
- no partial or complete overlap;
- a unique canonical ID for every item;
- HTTPS `sourceUrl` values and canonical public IDs on every session;
- event-local dates that match the itinerary date;
- session provenance that matches live or fallback document metadata;
- full coverage of the requested break.

### Custom agent: role

The agent allow-list contains repository read/edit capabilities and the five
specific `universe` MCP tools. It does not receive shell, browser, or broad MCP
wildcard access. Instructions and a pre-tool hook restrict writes to
`site/itinerary.json`; the validation hooks enforce the itinerary invariants.
MCP responses label remote catalog fields as untrusted public data, and the
agent is instructed never to follow embedded instructions from them.

### Plugin: package

`plugin.json`, `mcp.json`, the skill, the bundled server, the custom agent, the
hooks, and the embedded snapshot live under `plugins/universe-concierge/`.
`.github/plugin/marketplace.json` publishes that directory.

## Source chain

```text
RainFocus public page configuration
  └─ public widget /api/search pages
       └─ normalized live catalog
            ↓ on explicit failure
GitHub Pages hosted snapshot
            ↓ on explicit failure
Embedded curated snapshot
```

The chain catches adapter failures only at the boundary where fallback is
intentional. If all sources fail, it throws a combined error. It never returns a
success-shaped empty catalog.

## Build outputs

`npm run build:plugin` bundles the MCP server to
`plugins/universe-concierge/dist/universe-mcp.js`.

`npm run build:site` validates the itinerary, copies the static site to `dist/`,
and publishes the session snapshot at `dist/data/sessions.json`.

GitHub Pages deploys `dist/` from `.github/workflows/pages.yml`.
