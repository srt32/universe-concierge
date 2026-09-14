# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is a GitHub Universe attendee using Copilot CLI or Copilot cloud
agent to turn personal interests, timing constraints, and a requested break into
a practical conference itinerary. The repository is also a teaching artifact for
developers evaluating GitHub Copilot Agent Plugins 1.0.

These facts are inferred from the supplied implementation brief.

## Product Purpose

Universe Concierge demonstrates a complete Agent Plugins 1.0 package that plans
a personalized GitHub Universe day and writes the result into a small attendee
site. Success means a presenter can explain and run the full prompt-to-site flow
within a 15-minute live demo, with every recommendation grounded in public event
data and every itinerary checked deterministically.

## Positioning

The product makes the plugin architecture visible through one concrete workflow:
prompts provide intent, a skill provides procedure, MCP provides facts, a hook
provides guarantees, a custom agent provides a bounded role, and the plugin
packages the complete experience.

## Operating Context

- The attendee interacts through GitHub Copilot CLI or Copilot cloud agent.
- The agent reads public GitHub Universe and RainFocus data without attendee
  authentication or personal agenda access.
- The agent updates repository-owned itinerary JSON that drives a static site.
- The presenter can run local MCP, plugin, hook, site, and fallback checks before
  the live demo.
- The same repository is both the plugin marketplace and the plugin source.

## Capabilities and Constraints

- The source chain attempts live public retrieval, then a hosted snapshot, then
  an embedded snapshot.
- Every result identifies its source, source URL, retrieval time, and fallback
  reason when applicable.
- MCP exposes event overview, session search, session lookup, venue tips, and
  itinerary validation as read-only tools.
- The hook rejects overlaps, missing canonical session identifiers or sources,
  and a missing requested break.
- Custom agents and hooks live under `com.github.copilot/`; portable skills and
  root MCP configuration use the Agent Plugins 1.0 layout.
- Cloud agent uses MCP tools only; resources, prompts, and remote OAuth MCP are
  outside this product.
- Web search and web fetch remain available in CCA. Playwright MCP is available
  but its default GitHub instance is scoped to localhost and `127.0.0.1`.
- No secrets, attendee credentials, or personal agenda data belong in the
  repository.

## Brand Commitments

The product name is **Universe Concierge**. The voice is direct, informed,
welcoming, and explicit about data freshness. GitHub and GitHub Universe remain
the factual context; the product does not imply official endorsement beyond
public source attribution.

## Evidence on Hand

- Public event source: https://githubuniverse.com/
- Public session catalog:
  https://reg.githubuniverse.com/flow/github/universe26/attendee-portal/page/sessioncatalog
- Hosted snapshot target:
  https://srt32.github.io/universe-concierge/data/sessions.json
- Repository and marketplace identity:
  https://github.com/srt32/universe-concierge
- No testimonials, attendee data, private APIs, or unpublished event claims are
  available and none should be fabricated.

## Product Principles

1. Ground every recommendation in inspectable public source metadata.
2. Make fallback behavior resilient without presenting stale data as live.
3. Separate intent, procedure, facts, guarantees, and role so the plugin anatomy
   is obvious during a demo.
4. Prefer deterministic, rehearsable behavior over brittle live-only spectacle.
5. Keep the attendee experience focused enough to understand at a glance.

## Accessibility & Inclusion

The static site must be keyboard accessible, responsive, readable in bright
conference environments, and usable with reduced motion. Session times,
locations, source status, and validation state must not rely on color alone.
