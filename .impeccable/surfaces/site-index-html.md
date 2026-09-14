---
version: 1
slug: "site-index-html"
primary_target: "site/index.html"
related_targets: ["site/styles.css","site/app.js"]
---

## Scope and mode

The attendee itinerary at `site/index.html` is an Operate surface: it lets a
conference attendee scan and trust one personalized day.

## Audience, job, and action

An attendee in a bright, crowded venue needs to confirm where to go next,
whether the schedule conflicts, and where each recommendation came from. The
primary action is following the ordered itinerary; source links support
inspection without competing with the route.

## Proof and constraints

The page renders repository-owned itinerary JSON. Every session shows its
canonical ID and source, the plan announces its validation state, requested
breaks remain visible, and fallback data is labeled. The layout is keyboard
accessible, responsive, and reduced-motion safe.

## Direction and memorable moment

The visual world is an air-traffic flight-strip board on pale operations paper.
Times, venue, provenance, and state occupy stable fields on each strip. A single
arrival sequence makes the plan feel cleared and placed onto the board without
obscuring content.
