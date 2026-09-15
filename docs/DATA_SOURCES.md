# Public data sources

Universe Concierge reads public GitHub Universe information without attendee
authentication, personal agenda access, cookies, or repository secrets.

## Primary sources

Event overview:

https://githubuniverse.com/

Public session catalog:

https://reg.githubuniverse.com/flow/github/universe26/attendee-portal/page/sessioncatalog

The catalog is a JavaScript application. Its initial HTML is a shell, so the live
adapter reads the unauthenticated public page-data response:

```text
https://reg.githubuniverse.com/flow/loadPage?pageUri=sessioncatalog&workflowApiToken=github.universe26.attendee-portal
```

That response exposes the public widget profile, widget ID, events host, and
event timezone. The adapter then pages the widget's public `/api/search`
endpoint and accepts only records with:

```text
published: 1
status: "Accepted"
viewAccessPublic: true
```

Each normalized session links to its canonical public `/api/session` detail
request.

## Verified denied boundary

The public portal JavaScript exposes API profile:

```text
AjWe02u25IuBR01J4a6OsQvAsdXwPSjr
```

The public speaker dump succeeds, but its content includes declined and
unpublished proposals, so it is not used as a session feed. The session dump
returns RainFocus response code `124`, access denied. The implementation does
not retry, scrape around, or depend on that denied endpoint.

The live session path instead derives the public catalog widget configuration
from `flow/loadPage`. This is the same backing dataset rendered by the public
catalog.

## Hosted and embedded snapshots

Hosted:

https://srt32.github.io/universe-concierge/data/sessions.json

Embedded:

`plugins/universe-concierge/data/sessions.json`

The embedded file contains 16 publicly visible sessions across both event days.
Descriptions are concise normalizations of public abstracts. Every record keeps
its public source URL. GitHub Pages publishes the same asset through the
repository workflow.

Snapshot metadata is explicit:

- `generatedAt` records snapshot creation;
- source-chain results include `snapshotGeneratedAt`;
- `snapshotAgeDays` measures age;
- `stale` becomes true after 14 days.

Fallback is an operating mode, not an error disguise. Earlier adapter failures
remain in `metadata.failures`.

## Refresh policy

Schedules can change before the event. To refresh:

1. run `UNIVERSE_SOURCE=rainfocus-public-page npm run inspect:mcp`;
2. compare curated records with their canonical detail URLs;
3. update only published, accepted, public sessions;
4. update `generatedAt`;
5. run `npm run check`;
6. deploy the Pages workflow after review.

Never add attendee tokens, authenticated agenda endpoints, or unpublished
speaker-dump records.
