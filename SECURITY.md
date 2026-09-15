# Security policy

## Reporting a vulnerability

Please report suspected vulnerabilities through GitHub private vulnerability
reporting for https://github.com/srt32/universe-concierge rather than opening a
public issue.

Do not include attendee credentials, personal agenda data, access tokens, or
other secrets in a report, test fixture, itinerary, or pull request.

## Data boundaries

Universe Concierge reads public event information only. It does not request
attendee authentication or access personal RainFocus agendas. The MCP server
exposes read-only tools, and fallback metadata identifies when data did not come
from the live public page.

## Public itinerary privacy

`site/itinerary.json` is published by GitHub Pages and is therefore public. The
schema, build, and hooks default to an anonymous contract:

```json
{
  "attendee": { "name": "Universe attendee" },
  "publication": {
    "mode": "anonymous",
    "publicSharingConsent": false
  }
}
```

Anonymous plans may contain only schema-allow-listed broad interests, canonical
public session fields, and generic break/travel records. Free-form item text,
note items, identifying schedule labels, arbitrary fields, source failure prose,
and stored validation messages are rejected. Names, handles, employers, email
addresses, accessibility details, and other private constraints must remain
outside the public file. Source failures remain available in MCP results and the
agent's chat response instead of the published JSON.

Itinerary readers reject duplicate JSON keys, and the Pages build serializes the
validated object rather than copying the submitted bytes. This prevents a safe
last duplicate value from hiding sensitive content that remains in the file.

A personalized display label may be published only when the attendee explicitly
asks for a shareable public microsite and agrees that the label, interests, and
itinerary will be public. That contract is recorded as
`mode: "public-opt-in"` with `publicSharingConsent: true`. The site independently
ignores an identifying attendee label unless both fields are present, while the
schema and hook reject inconsistent contracts.
