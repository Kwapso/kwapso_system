#!/usr/bin/env node
/* ============================================================================
   THE RAIL INDICATOR CHECK — run by `npm run check` beside `check-screen-
   shell.mjs`, the other composition-level check in this directory.

   HER RULING, 22 SEP 2026, VERBATIM: "do you know how when changing tabs
   (line tabs) there's a slight animating where the active tab travels? i
   want the same idea on the sidebar nav."

   The model is `TabsList` (`components/tabs/tabs.tsx`, its own "THE
   INDICATOR, AND WHY IT IS MEASURED" section): a measured transform written
   back from a layout effect, a `MutationObserver` watching the selection
   attribute and `childList`, a `ResizeObserver` on the container and on
   every row, a context flag so the selected row stops drawing its own
   static fill once the travelling mark can draw it instead, and no mark
   painted before the first measurement lands. `rail.tsx` copies that shape
   onto the BLOCK axis (`offsetTop`/`offsetHeight`, not `offsetLeft`/
   `offsetWidth` — every row shares one of two fixed widths, collapsed or
   expanded, so only the vertical position and height are measured; the
   inline axis is CSS/token driven, see `ACTIVE_TREATMENT`'s own block
   comment in that file).

   WHY THIS IS A STATIC SOURCE CHECK, THE SAME STYLE `check-screen-shell.mjs`
   USES THROUGHOUT. A live DOM proof belongs in `verify/rail/`; what this
   script pins is that the CODE SHAPE the indicator needs to function stays
   in the file — a regression that deletes the effect, the observers, the
   context, or quietly points the motion rule at a literal duration instead
   of the shared tokens fails here, at `npm run check`, instead of waiting
   for the next screenshot. Every pattern below is a working declaration or
   call-site shape, not a bare word, for the same reason `check-screen-
   shell.mjs`'s own header gives: this file's prose is free to keep
   discussing removed or superseded drawings without tripping a check aimed
   at the code that makes the current one run.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAIL_FILE = path.join(HERE, "rail.tsx");
const MOTION_FILE = path.join(HERE, "..", "..", "foundations", "motion", "motion.css");

const railSrc = fs.readFileSync(RAIL_FILE, "utf8");
const railRel = path.relative(process.cwd(), RAIL_FILE);
const motionSrc = fs.readFileSync(MOTION_FILE, "utf8");
const motionRel = path.relative(process.cwd(), MOTION_FILE);

const findings = [];

/* ----------------------------------------------------------------------------
   1 · THE MEASUREMENT ITSELF — a layout effect that reads offsetTop/
   offsetHeight off the active row, never offsetLeft/offsetWidth (that pair is
   tabs.tsx's own axis, not this file's — see the header above for why).
   -------------------------------------------------------------------------- */
const REQUIRED_SHAPES = [
  {
    name: "the SSR-safe layout-effect helper",
    pattern: /const useIsomorphicLayoutEffect =\s*\n?\s*typeof window === "undefined" \? React\.useEffect : React\.useLayoutEffect;/,
  },
  {
    name: "the indicator context, defaulting to false (undrawn until measured)",
    pattern: /const RailIndicatorContext = React\.createContext\(false\);/,
  },
  {
    name: "the indicator state, null until the first measurement lands",
    pattern: /const \[indicatorMark, setIndicatorMark\] = React\.useState<\s*\{\s*top: number; height: number \} \| null\s*>\(null\);/,
  },
  {
    name: "the active-row query, scoped to rail-item + data-active",
    pattern: /nav\.querySelector<HTMLElement>\(\s*'\[data-slot="rail-item"\]\[data-active\]',\s*\)/,
  },
  {
    name: "the block-axis measurement (offsetTop)",
    pattern: /const top = active\.offsetTop;/,
  },
  {
    name: "the block-axis measurement (offsetHeight)",
    pattern: /const height = active\.offsetHeight;/,
  },
  {
    name: "the nav ref wired to the <nav> element",
    pattern: /<nav\s*\n\s*ref=\{navRef\}/,
  },
  {
    name: "position: relative on the nav (the indicator's containing block)",
    pattern: /"relative flex min-h-0 min-w-0 flex-1 flex-col gap-\[var\(--space-5\)\] overflow-y-auto"/,
  },
];

for (const { name, pattern } of REQUIRED_SHAPES) {
  if (!pattern.test(railSrc)) {
    findings.push(`${railRel} is missing ${name} — the indicator cannot measure the active row without it.`);
  }
}

/* ----------------------------------------------------------------------------
   2 · THE OBSERVER PAIR — MutationObserver on the active attribute and
   childList (a selection change, and a group opening/closing above the
   active row); ResizeObserver on the nav AND on every row (what makes a
   collapse/expand reflow correctly, since every row keeps its DOM identity
   across that transition and only resizes).
   -------------------------------------------------------------------------- */
const OBSERVER_SHAPES = [
  {
    name: "the MutationObserver watching data-active and childList",
    pattern: /mutations\.observe\(nav, \{\s*subtree: true,\s*attributes: true,\s*attributeFilter: \["data-active", "disabled"\],\s*childList: true,\s*\}\);/,
  },
  {
    name: "the ResizeObserver watching the nav itself",
    pattern: /resizes\.observe\(nav\);/,
  },
  {
    name: "the ResizeObserver watching every row (rail-item), not just the nav",
    pattern: /nav\.querySelectorAll<HTMLElement>\('\[data-slot="rail-item"\]'\)/,
  },
  {
    name: "observer teardown on effect cleanup",
    pattern: /mutations\.disconnect\(\);\s*resizes\.disconnect\(\);/,
  },
];

for (const { name, pattern } of OBSERVER_SHAPES) {
  if (!pattern.test(railSrc)) {
    findings.push(`${railRel} is missing ${name}.`);
  }
}

// `closed` (the group-disclosure state) MUST sit in the effect's own
// dependency list — it is what re-queries the resize observer's live rows
// after a group toggle unmounts/remounts them; without it a group that opens
// after mount keeps its new rows unobserved by the resize half of the pair.
if (!/\}, \[groups, isCollapsed, closed, current\]\);/.test(railSrc)) {
  findings.push(
    `${railRel}'s measurement effect does not depend on [groups, isCollapsed, closed, current] — dropping ` +
      "any of these (closed especially) stops the observers from re-binding to rows a group toggle or a " +
      "collapse/expand just remounted or resized.",
  );
}

/* ----------------------------------------------------------------------------
   3 · THE CONTEXT FLAG STOPS THE ROW'S OWN FILL — the same "never both, never
   neither" law tabs.tsx states for TRIGGER_SELECTED_WITH_INDICATOR. A row
   reads the context and switches treatment; it never paints both a static
   fill AND sits under a live indicator at the same time.
   -------------------------------------------------------------------------- */
if (!/const ACTIVE_TREATMENT_WITH_INDICATOR = \[/.test(railSrc)) {
  findings.push(
    `${railRel} has no ACTIVE_TREATMENT_WITH_INDICATOR — the active row has no reduced treatment to fall back ` +
      "to once the indicator is live, so the two marks would double up.",
  );
}
if (/const ACTIVE_TREATMENT_WITH_INDICATOR = \[[\s\S]{0,200}?bg-\[var\(--spine-active-fill\)\]/.test(railSrc)) {
  findings.push(
    `${railRel}'s ACTIVE_TREATMENT_WITH_INDICATOR still paints bg-[var(--spine-active-fill)] — that fill belongs ` +
      "to the travelling indicator now, not to the row underneath it.",
  );
}
if (!/const indicatorLive = React\.useContext\(RailIndicatorContext\);/.test(railSrc)) {
  findings.push(`${railRel}'s RailRow does not read RailIndicatorContext — it cannot know to stop painting its own fill.`);
}
if (
  !/active\s*\n\s*\? indicatorLive\s*\n\s*\? ACTIVE_TREATMENT_WITH_INDICATOR\s*\n\s*: ACTIVE_TREATMENT\s*\n\s*: ROW_IDLE/.test(
    railSrc,
  )
) {
  findings.push(
    `${railRel}'s RailRow skin does not branch active ? (indicatorLive ? ACTIVE_TREATMENT_WITH_INDICATOR : ` +
      "ACTIVE_TREATMENT) : ROW_IDLE — the row must pick its treatment off both active and indicatorLive, in that order.",
  );
}
if (!/<RailIndicatorContext\.Provider value=\{indicatorLive\}>/.test(railSrc)) {
  findings.push(`${railRel} never provides RailIndicatorContext around the rows it renders — every RailRow reads the default (false) forever.`);
}

/* ----------------------------------------------------------------------------
   4 · NO INDICATOR BEFORE THE FIRST MEASUREMENT — the span is gated on
   indicatorMark, the same way TabsList gates its own span on `mark`.
   -------------------------------------------------------------------------- */
if (!/\{indicatorMark \? \(\s*<span/.test(railSrc)) {
  findings.push(
    `${railRel} does not gate the indicator span on indicatorMark — an ungated span would draw a slide-in from ` +
      "nowhere on first paint, before any row has ever been measured.",
  );
}
if (!/data-slot="rail-indicator"/.test(railSrc)) {
  findings.push(`${railRel}'s indicator span carries no data-slot="rail-indicator" — the one hook a harness or a later check can query it by.`);
}

/* ----------------------------------------------------------------------------
   5 · THE TIMING IS THE SHARED TOKENS, NEVER A NEW NUMBER. Pinned in BOTH
   directions: motion.css must declare .motion-rail-indicator on the two
   tokens .motion-tab-indicator already uses, and rail.tsx must actually wear
   that class (a class that exists but is never applied is dead weight, not a
   fix).
   -------------------------------------------------------------------------- */
if (!/\.motion-rail-indicator \{\s*transition:\s*transform var\(--duration-entrance\) var\(--ease-move\),\s*height\s+var\(--duration-entrance\) var\(--ease-move\);\s*\}/.test(motionSrc)) {
  findings.push(
    `${motionRel} does not declare .motion-rail-indicator transitioning transform and height on var(--duration-` +
      "entrance)/var(--ease-move) — the exact two tokens .motion-tab-indicator already uses, never a new literal.",
  );
}
if (!/"motion-rail-indicator pointer-events-none absolute rounded-pill"/.test(railSrc)) {
  findings.push(`${railRel}'s indicator span does not wear the motion-rail-indicator class — the geometry it sets has no timing without it.`);
}

if (findings.length > 0) {
  console.error("FAIL rail indicator check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK rail indicator check: rail.tsx measures the active row's offsetTop/offsetHeight from an SSR-safe layout " +
    "effect, watches data-active/childList with a MutationObserver and the nav plus every row with a " +
    "ResizeObserver (re-binding on [groups, isCollapsed, closed, current]), RailIndicatorContext gates the row's " +
    "own fill off once the indicator is live, the indicator itself is undrawn until the first measurement lands, " +
    "and both files spend only the shared --duration-entrance/--ease-move tokens for the travel.",
);
