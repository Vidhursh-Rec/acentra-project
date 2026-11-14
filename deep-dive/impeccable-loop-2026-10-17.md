# Deep dive: the Impeccable loop on the management website (2026-10-17)

Mode: compact · Level: mid

## Overview

`/impeccable` is a design skill that works like a **measure → decide → fix → re-measure** loop, the same shape
as a test-driven bug fix but for UX. One full pass went through on `management/src`:

```
critique  ──►  you choose  ──►  fix one area (adapt)  ──►  verify in browser  ──►  stop for "next"
   │                                                                                   │
   └── snapshot saved (.impeccable/critique/…)  ◄──── next critique compares against ──┘
```

Nothing in the backend or the mobile app changed. Only the web UI changed, plus one saved report file.

## Phase 1: Critique (measure)

Two independent reviewers ran in parallel and their results were merged:

| Reviewer | How it looks | What it found |
|---|---|---|
| A: design review | Reads code and screenshots like a UX expert: Nielsen's 10 heuristics, cognitive load, personas | Score **25/40**. No phone layout (P0). Patients page is an inventory, not triage. Doctor actions lack preview and undo. Accessibility gaps. |
| B: detector + browser | Rule-based scanner over the code (`impeccable detect`), plus an overlay that measures the live page | 0 code findings. **3 real contrast failures**, all from brand green `#16a34a` on small text (2.6–3.3:1, needs 4.5:1). 12 map warnings dismissed as false positives. |

**Why two reviewers:** an AI judgment ("feels like generic dashboard") and a deterministic measurement ("3.1:1
contrast") catch different things. A noticed contrast vaguely; B measured exactly which token failed. Where both
agree, confidence is high. Where only the detector fires (the map tiles), a human or AI sanity check filters out
the noise.

**Snapshot:** the report was saved to `.impeccable/critique/2026-10-17T12-33-46Z__management-src.md`. This is the
baseline. Re-running `/impeccable critique` later prints a **trend** (e.g. 25 → 31/40, P0 count 1 → 0), so
progress is measured, not guessed.

## Phase 2: Decide (you)

The skill does not auto-fix everything. It asked three questions, and your answers set the scope:
- **Fix first:** phone layout (the only P0).
- **Scope:** top 3 issues only (P0 plus two P1s), stopping after each.
- **Brand:** keep Kit, switch the black buttons to green.

This matches your project rule: build in steps, then stop for "next".

## Phase 3: Fix (`/impeccable adapt`)

| File | Change | Why |
|---|---|---|
| `components/Layout.tsx` | Sidebar shown only at ≥1024px (`hidden lg:flex`). Below that, a sticky top bar plus a menu that slides in from the left. | A fixed 240px sidebar left a 375px phone with about 135px of content. One sidebar component (`SidebarBody`) renders in both places, so there's one navigation model, not two. |
| same | The menu closes on route change, Escape, or tapping the backdrop. It locks page scroll, moves focus inside, and returns focus to the menu button. Its animation uses the iOS-style curve `[0.32, 0.72, 0, 1]` and becomes a plain fade with Reduce Motion. | Standard accessible "modal drawer" behaviour (`role="dialog" aria-modal`). |
| `pages/*.tsx` headers | `flex-col … sm:flex-row`, with all titles at `text-2xl sm:text-3xl`. | Mobile-first: phone styles are the default, larger screens are layered on with `sm:` and `lg:`. This also fixed the mismatched title sizes from the critique. |
| Patients / Doctors tiles | Tighter padding and smaller icons below `sm`. `pointer-coarse:py-2.5` on chips. | Fit two tiles per row at 375px. `pointer-coarse` detects a **touch input**, not a screen size, so tap targets grow only where fingers are used. |
| `pages/MapPage.tsx` | Added `isolate` to the map wrapper. Full-width dropdown. Height `max(24rem, …100dvh…)`. | **Bug found during verification:** Leaflet's layers use `z-index: 400+`, which beat the menu's `z-50`. `isolate` creates a new *stacking context*, so the map's z-indexes only compete inside its own box. |
| `index.css` | `--primary: #15803d` (green-700). | Every shadcn button and switch reads `bg-primary`, so one token turned them all green. Green-700 keeps white text at about 5:1 (passes WCAG AA). The lighter brand green would fail. |
| `components/Fox.tsx` | Kit is smaller and sits nearer the corner on phones. | It covered more of the content at phone width. |

## Phase 4: Verify

The browser pane was set to a 375×812 phone, and each page was checked for `scrollWidth === clientWidth`
(no sideways scroll), plus screenshots. The menu was opened, a link was tapped, and the result checked: the menu
closed and scroll unlocked. Then the desktop size was checked to make sure nothing regressed. The skill's rule
is **one inspection round, fix everything found, at most one confirming round**, so no endless polishing.

## Key concepts (what + why)

- **Heuristic evaluation:** scoring a UI against fixed principles (Nielsen's 10). Cheap and repeatable, so it
  works as a regression metric.
- **Mobile-first breakpoints:** unprefixed classes are for phones, and `sm:` / `lg:` add the desktop layout.
  Small screens get the least CSS and the simplest layout.
- **Stacking context:** z-index only compares elements inside the same context. `isolate`, `transform` and
  `opacity<1` each create a new one. This is the usual cause of "my modal is behind the map/video".
- **Design tokens:** colours live as CSS variables (`--primary`), so a brand decision is a one-line change and
  not a find-and-replace across 20 components.
- **Contrast ratio:** WCAG AA needs 4.5:1 for normal text. Bright brand greens almost never pass on white, so
  products use a darker shade for text and buttons, and the bright one for fills and icons.

## What's next in the loop

1. `/impeccable layout + clarify`: triage first screen (urgency sort, "Needs action" strip).
2. `/impeccable audit → harden`: accessibility (green text → green-700, focus ring, `aria-pressed`, cards as links).
3. Re-run `/impeccable critique`. The trend line shows whether 25/40 went up and the P0 count went to 0.
