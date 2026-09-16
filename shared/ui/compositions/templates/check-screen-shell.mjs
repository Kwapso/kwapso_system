#!/usr/bin/env node
/* ============================================================================
   THE ASIDE RESIZE ROT CHECK — run by `npm run check` beside the token/icon/
   book checks.

   WHAT THIS USED TO BE. A same-day 2026-09-16 pair of rulings had put a
   resizable assistant column into this file: `RESIZE_SEAM`, a hover-reveal
   drag handle on the aside's inner edge, 320/400/520 snap points, and the
   `asideWidth`/`defaultAsideWidth`/`onAsideWidthChange`/`asideMinWidth`/
   `asideMaxWidth`/`asideResizeLabel` props that drove them. This script used
   to pin which edge that seam sat on (`start-0`, not `end-`), after the
   client corrected its placement once already that day.

   WHY IT IS DIFFERENT NOW. The client's own verdict on the shipped build,
   later the same day, verbatim: *"Let's forget about the resize. It's a
   disaster. Remove it."* The seam, its drag/keyboard/snap logic and every
   prop that controlled it were removed outright — the aside is back to ONE
   fixed width, `ASIDE_WIDTH` (`23.75rem`, unchanged since before the resize
   ever existed). A check that still asserted the seam's PLACEMENT would pass
   trivially once the seam no longer exists at all, which is not the same as
   asserting the ruling — "remove it" — actually held. So this script now
   asserts the opposite of what it used to: that every CODE SHAPE the resize
   feature introduced is absent from this file. A regression that
   reintroduces any of it — a revert, a bad merge, a well-meaning "let's
   bring back drag resize" PR that does not also remove this check — fails
   `npm run check` instead of waiting for the next client screenshot.

   WHY THESE ARE DECLARATION/USAGE SHAPES, NOT BARE WORDS. This file's own
   house style documents removed features by NAME, in prose, at length —
   `ASIDE_WIDTH`'s own doc above names `RESIZE_SEAM` and every retired prop
   to say what it replaced. A bare substring search (`"asideWidth"` anywhere
   in the file) would fail on that prose the day it was written, which is
   backwards: the rot this check exists to catch is the CODE coming back, not
   the sentence that explains why it will not. Every pattern below is
   therefore shaped like the declaration or call-site syntax the feature
   actually needs to function — `export const ASIDE_WIDTH_MIN`, `asideWidth?:`
   as a prop signature, `-[var(--aside-width)]` as a Tailwind arbitrary value —
   none of which a sentence in a comment has a reason to spell.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "screen-shell.tsx");

const src = fs.readFileSync(FILE, "utf8");
const rel = path.relative(process.cwd(), FILE);

// Each pattern is a working CODE SHAPE the resize feature needs — a
// declaration, a prop signature, or a call-site — not a bare identifier, so
// this cannot fire on the historical prose that names these things while
// explaining their removal (see the header above).
const FORBIDDEN = [
  { name: "ASIDE_WIDTH_MIN", pattern: /\bexport const ASIDE_WIDTH_MIN\b/ },
  { name: "ASIDE_WIDTH_MAX", pattern: /\bexport const ASIDE_WIDTH_MAX\b/ },
  { name: "ASIDE_WIDTH_DEFAULT", pattern: /\bexport const ASIDE_WIDTH_DEFAULT\b/ },
  { name: "ASIDE_WIDTH_SNAP_POINTS", pattern: /\bexport const ASIDE_WIDTH_SNAP_POINTS\b/ },
  { name: "ASIDE_WIDTH_SNAP_TOLERANCE", pattern: /\bconst ASIDE_WIDTH_SNAP_TOLERANCE\b/ },
  { name: "ASIDE_RESIZE_KEY_STEP", pattern: /\bconst ASIDE_RESIZE_KEY_STEP\b/ },
  { name: "ASIDE_RESIZE_DRAG_THRESHOLD", pattern: /\bconst ASIDE_RESIZE_DRAG_THRESHOLD\b/ },
  { name: "clampAsideWidth(...)", pattern: /\bfunction clampAsideWidth\b/ },
  { name: "snapAsideWidth(...)", pattern: /\bfunction snapAsideWidth\b/ },
  { name: "the RESIZE_SEAM constant", pattern: /\bconst RESIZE_SEAM\b/ },
  { name: "the EdgeHandleResize interface", pattern: /\binterface EdgeHandleResize\b/ },
  { name: "EdgeHandle's resize prop", pattern: /\bresize\?:\s*EdgeHandleResize\b/ },
  { name: "EdgeHandle's bare prop", pattern: /\bbare\?:\s*boolean\b/ },
  { name: "ScreenShellProps.asideWidth", pattern: /\basideWidth\?:\s*number\b/ },
  { name: "ScreenShellProps.defaultAsideWidth", pattern: /\bdefaultAsideWidth\?:\s*number\b/ },
  { name: "ScreenShellProps.onAsideWidthChange", pattern: /\bonAsideWidthChange\?:/ },
  { name: "ScreenShellProps.asideResizeLabel", pattern: /\basideResizeLabel\?:\s*string\b/ },
  { name: "ScreenShellProps.asideMinWidth", pattern: /\basideMinWidth\?:\s*number\b/ },
  { name: "ScreenShellProps.asideMaxWidth", pattern: /\basideMaxWidth\?:\s*number\b/ },
  { name: "the --aside-width custom property in a Tailwind arbitrary value", pattern: /-\[var\(--aside-width\)\]/ },
  { name: "the --aside-width inline style", pattern: /["']--aside-width["']\s*:/ },
];

const findings = [];

for (const { name, pattern } of FORBIDDEN) {
  if (pattern.test(src)) {
    findings.push(
      `${name} is back in ${rel} — the resize feature was ruled out ("Let's forget about the ` +
        'resize. It\'s a disaster. Remove it.", 16 Sep 2026) and every working trace of it must stay gone.',
    );
  }
}

// THE ASIDE'S OWN WIDTH IS BACK TO THE ONE FIXED LITERAL. Checked positively
// — not just "the resize is gone" but "the fixed measure is actually there"
// — because a regression that deletes the feature AND the fallback would
// pass every check above while drawing a column of width `undefined`.
if (!/export const ASIDE_WIDTH = "23\.75rem";/.test(src)) {
  findings.push(
    `ASIDE_WIDTH is not the literal "23.75rem" in ${rel} — that is the fixed width the shell used ` +
      "before the resize feature (and now, again, permanently).",
  );
}

if (findings.length > 0) {
  console.error("FAIL screen-shell resize rot check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK screen-shell resize rot check: no working trace of the removed resize feature; " +
    'ASIDE_WIDTH is the one fixed "23.75rem" measure.',
);
