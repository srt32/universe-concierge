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
