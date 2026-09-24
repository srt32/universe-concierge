# 15-minute live demo

## 0:00–2:00 — Tell the component story

Open `README.md` and use one sentence:

> Prompts provide intent, skills provide procedure, MCP provides facts, hooks
> provide guarantees, custom agents provide a role, and plugins package it all.

Show `plugins/universe-concierge/` and point out that portable content lives at
the root and Copilot-specific content lives under `com.github.copilot/`.

## 2:00–4:00 — Prove the facts are live and resilient

```bash
npm run inspect:mcp
```

Name the selected source from the output. Then show the deterministic fallback:

```bash
UNIVERSE_SOURCE=embedded-snapshot npm run inspect:mcp
```

Explain that fallback metadata retains the failed source reasons and never
pretends the snapshot is live.

## 4:00–9:00 — Ask the concierge

Start Copilot CLI, select `universe-concierge`, and paste:

```text
Plan October 28 at GitHub Universe for an agent-platform engineer interested
in Copilot, context engineering, and practical developer productivity. Keep
12:10–1:10 completely free, include realistic building transfers, update
site/itinerary.json, and say whether the source is live or a fallback.
```

Narrate the sequence:

1. the skill turns intent into a repeatable procedure;
2. MCP searches and resolves canonical sessions;
3. the validator checks the complete plan;
4. the agent writes the site data;
5. the hook independently checks the output.

## 9:00–11:00 — Show the deterministic guarantee

```bash
node --test test/hook.test.js
node scripts/validate-itinerary.js test/fixtures/invalid-overlap.json
```

The second command intentionally exits nonzero. Explain why post-tool hooks
replace a result rather than undoing an edit, routing the agent back into repair
without applying itinerary validation to unrelated sessions.

## 11:00–14:00 — Reveal the attendee site

```bash
npm run build
npm run preview
```

Open http://127.0.0.1:4173.

Show:

- chronological flight strips rather than generic session cards;
- the visible protected break;
- canonical source links;
- live/fallback labeling;
- desktop and narrow responsive layouts.

## 14:00–15:00 — Close on portability

Show `.github/copilot/settings.json` and
`.github/plugin/marketplace.json`. Explain that the repository activates its own
marketplace, while `plugin.json`, `mcp.json`, and the skill follow Agent Plugins
1.0.

End with the Pages snapshot:

https://srt32.github.io/universe-concierge/data/sessions.json

If Pages is not enabled, say so explicitly and use the embedded source. Do not
spend demo time debugging external infrastructure.
