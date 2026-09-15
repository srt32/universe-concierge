---
name: Universe Concierge
description: A tactile conference operations board for sourced, conflict-free itineraries.
colors:
  operations-paper: "#eee9dc"
  raised-paper: "#fffdf6"
  carbon-ink: "#18201d"
  pencil-muted: "#59645e"
  rule-line: "#9ba39c"
  runway-teal: "#006b71"
  runway-teal-deep: "#004c51"
  clearance-yellow: "#f7c948"
  conflict-red: "#bf3d2f"
  board-gray: "#d9d5c9"
typography:
  display:
    fontFamily: '"Avenir Next Condensed", "Arial Narrow", "Helvetica Neue", sans-serif'
    fontSize: "clamp(3rem, 7.5vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.04em"
  title:
    fontFamily: '"Avenir Next Condensed", "Arial Narrow", "Helvetica Neue", sans-serif'
    fontSize: "clamp(1.25rem, 3vw, 2rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  body:
    fontFamily: '"Avenir Next", Avenir, "Segoe UI", sans-serif'
    fontSize: "1rem"
    lineHeight: 1.45
  data-label:
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.055em"
rounded:
  none: "0"
  status-light: "50%"
spacing:
  xs: "0.5rem"
  sm: "1rem"
  md: "1.5rem"
  lg: "2rem"
  xl: "4rem"
components:
  source-link:
    backgroundColor: "{colors.carbon-ink}"
    textColor: "{colors.raised-paper}"
    typography: "{typography.data-label}"
    rounded: "{rounded.none}"
    padding: "0.4rem 0.55rem"
    height: "32px"
  itinerary-strip:
    backgroundColor: "{colors.raised-paper}"
    textColor: "{colors.carbon-ink}"
    rounded: "{rounded.none}"
    padding: "1.1rem 1.3rem"
  route-board:
    backgroundColor: "{colors.board-gray}"
    textColor: "{colors.carbon-ink}"
    rounded: "{rounded.none}"
    padding: "clamp(1.2rem, 3vw, 2rem)"
---

# Design System: Universe Concierge

## Overview

**Creative North Star: "The Cleared Flight Board"**

Universe Concierge feels like an operations artifact prepared for one attendee,
not a generic conference dashboard. Warm paper, carbon-dark type, compact data
labels, and hard-edged flight strips make the itinerary feel physical,
trustworthy, and ready to use in a bright venue.

The system balances expressive display type with disciplined information fields.
It uses color sparingly to communicate clearance, provenance, movement, and
conflict; it never substitutes decoration for status.

**Key Characteristics:**

- Tactile operations paper rather than glossy application chrome.
- One strong time trace built from rectangular flight strips.
- Condensed headlines paired with monospace labels for operational data.
- Visible source identity, validation state, and venue information.
- Responsive reflow that preserves scan order and readable fields.

## Colors

The palette combines warm, low-glare neutrals with runway teal and two
purpose-bound state colors.

### Primary

- **Runway Teal** (`#006b71`): Valid clearance lights, break strips, and branded
  details.
- **Deep Runway Teal** (`#004c51`): Data labels and interactive hover states.

### Secondary

- **Clearance Yellow** (`#f7c948`): Session-strip routing marks and pending state.
- **Conflict Red** (`#bf3d2f`): Invalid itinerary state only.

### Neutral

- **Operations Paper** (`#eee9dc`): Page background and ruled-paper field.
- **Raised Paper** (`#fffdf6`): Itinerary strip surface.
- **Carbon Ink** (`#18201d`): Primary type and high-contrast controls.
- **Pencil Muted** (`#59645e`): Secondary copy and labels.
- **Rule Line** (`#9ba39c`): Dividers and structural borders.
- **Board Gray** (`#d9d5c9`): Flight-plan board surface.

**The Signal Color Rule.** Teal, yellow, and red communicate route or validation
meaning. Keep them rare enough that their status remains unmistakable.

## Typography

**Display Font:** Avenir Next Condensed, with Arial Narrow and Helvetica Neue fallbacks  
**Body Font:** Avenir Next, with Avenir and Segoe UI fallbacks  
**Label/Mono Font:** SFMono-Regular, with Consolas and Liberation Mono fallbacks

**Character:** Condensed display type gives the page the authority of venue
signage. Humanist body copy stays comfortable to read, while monospace is
reserved for times, identifiers, and operational labels.

### Hierarchy

- **Display** (800, `clamp(3rem, 7.5vw, 6rem)`, 0.92): The single page statement.
- **Section title** (800, `clamp(1.8rem, 4vw, 3rem)`, 1): Major route sections.
- **Strip title** (800, `clamp(1.25rem, 3vw, 2rem)`, 1.05): Session or movement.
- **Body** (400, `1rem`, 1.45–1.65): Supporting rationale, capped near 68ch.
- **Data label** (700, `0.75rem`, `0.055em`, uppercase): IDs, types, and facts.

**The Instrument Label Rule.** Monospace belongs to data and measurement, never
to decorative body copy.

## Layout

Content sits inside a centered 1180px container with one rem of edge protection.
The wide briefing uses an asymmetric two-column grid; the route heading pairs its
title with three factual fields. Itinerary strips use stable time, description,
and location columns.

At 760px the briefing, route heading, provenance, and strips become single-column.
At 480px route facts and strip metadata also stack so long interests, rooms, and
canonical IDs cannot force horizontal scrolling. Spacing uses tight groups inside
strips and generous separation between briefing, route, provenance, and footer.

## Elevation & Depth

Depth is structural and tactile rather than atmospheric. The route board receives
one soft ambient shadow; individual strips use a short offset shadow that suggests
stacked paper. Tonal layering and one-pixel borders carry most hierarchy.

### Shadow Vocabulary

- **Board lift** (`0 14px 35px rgba(24, 32, 29, 0.12)`): The route board only.
- **Strip offset** (`3px 5px 0 rgba(24, 32, 29, 0.12)`): Each itinerary strip.
- **Status peg** (`2px 3px 0 rgba(24, 32, 29, 0.18)`): Clearance indicator.

**The One Board Rule.** Use ambient elevation for the route board, not for every
piece of content.

## Shapes

The system is deliberately rectangular. Hard corners, fine borders, ruled lines,
and narrow routing marks evoke printed operations materials. Only the clearance
indicator is circular. Dashed perforation lines appear inside flight strips,
never as a generic divider.

## Components

### Source Link

- **Shape:** Hard rectangular ticket (`0` radius) with a minimum 32px height.
- **Default:** Carbon ink background, raised-paper text, compact data type.
- **Hover / Focus:** Deep runway teal on hover; a 3px teal focus outline with
  4px offset remains visible.

### Route Board

- **Shape:** Hard-edged container with a one-pixel structural border.
- **Background:** Board gray around raised-paper strips.
- **Shadow Strategy:** One board-lift shadow for the whole route.
- **Internal Padding:** Responsive from 1.2rem to 2rem.

### Itinerary Strip

- **Shape:** A hard-edged paper strip with a one-pixel border and offset shadow.
- **Signal:** An 8px left routing mark identifies sessions, breaks, and travel.
- **Content:** Time first, title and rationale second, venue and source last.
- **Motion:** A 480ms staggered arrival uses exponential ease-out, blur, and
  horizontal movement only when reduced motion is not requested.

### Clearance Status

- **Shape:** Border rules frame a labeled circular signal light.
- **State:** Teal means cleared, yellow means checking, and red means review
  required. Text always states the status independently of color.

## Do's and Don'ts

### Do:

- **Do** keep canonical IDs, venue, time, and source status visually findable.
- **Do** reserve condensed type for hierarchy and monospace for operational data.
- **Do** preserve square corners and one-pixel structural rules.
- **Do** reflow data fields instead of clipping them on narrow screens.

### Don't:

- **Don't** turn flight strips into rounded cards or add ornamental icons.
- **Don't** use signal colors without a corresponding text label.
- **Don't** imply live data when the source metadata reports a fallback.
- **Don't** add decorative gradients, glass effects, or floating card stacks.
