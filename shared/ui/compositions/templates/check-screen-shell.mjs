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
const CARD_FILE = path.join(HERE, "..", "..", "components", "card", "card.tsx");

const src = fs.readFileSync(FILE, "utf8");
const rel = path.relative(process.cwd(), FILE);
const cardSrc = fs.readFileSync(CARD_FILE, "utf8");
const cardRel = path.relative(process.cwd(), CARD_FILE);

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

/* ============================================================================
   THE 17 SEP 2026 GUTTER-SHRINK CHECK — client, verbatim: "Because adding the
   breadcrumbs took up considerable screen space, let's reduce the margin that
   we have on the sides above and below both the main content and the
   assistant. Let's optimize the height. Let's not leave so much blank space
   there." Every block-direction contributor to the outer gutter around the
   content column and the aside — `--shell-gutter`, `--aside-inset`,
   `DENSITY_HEADER`'s `pt`/`pb`/`px`, `DENSITY_TRAIL`'s `px` (which must keep
   mirroring `DENSITY_HEADER`'s, see that record's own comment), `DENSITY_BODY`'s
   `p`, and `TRAIL_GAP` — steps down exactly one rung on the scale already in
   `tokens.css` (`--space-5` -> `--space-4`, `--space-7` -> `--space-6`,
   `--space-6` -> `--space-5`, calm's `--space-5` -> `--space-4`). Asserted as
   working code shapes, the same style the resize-rot check above uses, so a
   revert back to the pre-17-Sep numbers fails here instead of waiting for the
   next client screenshot.

   `--rail-inset` (`DENSITY_RAIL`) IS DELIBERATELY NOT ASSERTED HERE. Today's
   ruling names only "the main content and the assistant" — not the rail — so
   this check does not require it to move, even though leaving it at
   `--space-5` while `--shell-gutter` drops to `--space-4` reopens the exact
   22.5-against-18.75 mismatch `DENSITY_RAIL`'s own header spent a whole
   ruling fixing on 2026-09-06. Flagged in the CHANGELOG for the owner to rule
   on; not this lane's call to make unasked. */
const gutterFindings = [];

// DENSITY_TRAIL, DENSITY_BODY and TRAIL_GAP are DELIBERATELY NOT IN THIS
// LIST ANY MORE — the 17 Sep EVENING rulings (S3/D2 on the trail, Ruling 2 on
// the content inset) moved all three again, the same evening this midday
// check was written against. Their own, later values are pinned by the two
// check blocks below this one, each carrying its own ruling's text. Checking
// a superseded literal here would fail the moment the evening rulings shipped
// — exactly the kind of stale assertion this file's own header warns against.
const GUTTER_SHAPES = [
  {
    name: "DENSITY_GUTTER (--shell-gutter)",
    pattern: /const DENSITY_GUTTER: Record<ScreenDensity, string> = \{\s*comfortable: "\[--shell-gutter:var\(--space-4\)\]",\s*calm: "\[--shell-gutter:var\(--space-4\)\]",\s*\};/,
  },
  {
    name: "DENSITY_ASIDE (--aside-inset)",
    pattern: /const DENSITY_ASIDE: Record<ScreenDensity, string> = \{\s*comfortable: "\[--aside-inset:var\(--space-4\)\]",\s*calm: "\[--aside-inset:var\(--space-4\)\]",\s*\};/,
  },
  {
    name: "DENSITY_HEADER",
    pattern: /const DENSITY_HEADER: Record<ScreenDensity, string> = \{\s*comfortable: "px-\[var\(--space-6\)\] pt-\[var\(--space-6\)\] pb-\[var\(--space-5\)\]",\s*calm: "px-\[var\(--space-5\)\] pt-\[var\(--space-5\)\] pb-\[var\(--space-4\)\]",\s*\};/,
  },
];

for (const { name, pattern } of GUTTER_SHAPES) {
  if (!pattern.test(src)) {
    gutterFindings.push(
      `${name} in ${rel} does not read the 17 Sep 2026 gutter-shrink values — the block gutters around ` +
        "the content column and the aside must be one rung smaller (see the CHANGELOG entry for the old/new numbers).",
    );
  }
}

if (gutterFindings.length > 0) {
  console.error("FAIL screen-shell gutter-shrink check:\n" + gutterFindings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK screen-shell gutter-shrink check: --shell-gutter/--aside-inset/DENSITY_HEADER all read the " +
    "17 Sep 2026 midday one-rung-smaller values (DENSITY_TRAIL/DENSITY_BODY/TRAIL_GAP checked below, " +
    "against the same evening's later rulings).",
);

/* ============================================================================
   THE 17 SEP 2026 EVENING TRAIL-SPACING CHECK — S3/D2. Client, verbatim:
   "Make a bit more space above the breadcrumbs. Reduce the space between the
   breadcrumbs and the chips. Maybe we could add a divider line." Then, picking
   from the design page: "for the spacing, do s3. and d2." S3: 20px above the
   trail (was 12), 8px between the trail and the title/chip row (was 20), plus
   a hairline divider under the trail spanning the card's inner width.

   Asserted as working code shapes, the same style every check in this file
   uses: `DENSITY_TRAIL` carries a flat `pt-[var(--space-5)]` at BOTH
   densities (the ruling named one number, not a density pair), `TRAIL_GAP`
   is `mb-[var(--space-2)]`, and the trail slot renders a `<Separator />`
   AFTER `{trail}` and BEFORE the slot's own closing tag — inside the padded
   div, so it spans the content box, not the card's bare edge. A regression
   that reverts any one of the three — a bad merge, a "let's put it back to
   flush" edit that forgets the other two moved with it — fails here instead
   of waiting for the next client screenshot. */
const trailSpacingFindings = [];

const DENSITY_TRAIL_PATTERN =
  /const DENSITY_TRAIL: Record<ScreenDensity, string> = \{\s*comfortable: "px-\[var\(--space-6\)\] pt-\[var\(--space-5\)\]",\s*calm: "px-\[var\(--space-5\)\] pt-\[var\(--space-5\)\]",\s*\};/;
if (!DENSITY_TRAIL_PATTERN.test(src)) {
  trailSpacingFindings.push(
    `DENSITY_TRAIL in ${rel} does not read S3's flat pt-[var(--space-5)] (20px above the trail) at both densities.`,
  );
}

const TRAIL_GAP_PATTERN = /const TRAIL_GAP = "mb-\[var\(--space-2\)\]";/;
if (!TRAIL_GAP_PATTERN.test(src)) {
  trailSpacingFindings.push(
    `TRAIL_GAP in ${rel} does not read S3's mb-[var(--space-2)] (8px between the trail and the title/chip row).`,
  );
}

// THE DIVIDER — a working render shape (Separator called inside the `trail`
// slot's own JSX block), not a bare mention of the word "Separator" anywhere
// in the file (the import line alone would satisfy a bare substring search
// without proving anything is actually drawn).
const TRAIL_SLOT_BLOCK = /data-slot="screen-shell-trail"[\s\S]{0,1600}?<\/div>/;
const trailSlotMatch = src.match(TRAIL_SLOT_BLOCK);
if (!trailSlotMatch || !/<Separator\s*\/>/.test(trailSlotMatch[0])) {
  trailSpacingFindings.push(
    `The screen-shell-trail slot in ${rel} does not render <Separator /> — S3's divider line is missing.`,
  );
}
if (!/^import \{ Separator \} from "\.\.\/\.\.\/components\/separator\/separator";$/m.test(src)) {
  trailSpacingFindings.push(`${rel} does not import Separator from components/separator/separator.`);
}

if (trailSpacingFindings.length > 0) {
  console.error(
    "FAIL screen-shell trail-spacing check (S3/D2):\n" + trailSpacingFindings.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  "OK screen-shell trail-spacing check: DENSITY_TRAIL pt, TRAIL_GAP and the trail's own <Separator /> " +
    "all read S3's 17 Sep 2026 evening values.",
);

/* ============================================================================
   THE 17 SEP 2026 EVENING CONTENT-INSET CHECK — RULING 2, CORRECTED THE SAME
   EVENING. Client, verbatim: "can you make the overall full content inside
   this container wider, not only the toolbar, but everything?... the margin
   on the sides should be the same as the margin you now have on top of the
   toolbar... apply this absolutely everywhere."

   THE FIRST PASS MEASURED A STACKED NUMBER (36px) AND MISNAMED IT
   `--space-3`; IT IS `--space-7`, THIS FILE'S OWN OLD FIGURE, SO THAT PASS
   WOULD HAVE SHIPPED NO CHANGE AT ALL. Corrected by reading `getComputedStyle`
   on staging precisely: a toolbar-led collection card's own `CardContent`
   reads `padding-top: 13.5px`, which is `kwapso_system/web/app/globals.css`
   (R83)'s `calc(var(--toolbar-lead-gap) - var(--tab-content-gap))` =
   `calc(2rem - 1.25rem)` = `0.75rem` — this kit's own `--space-3`, exactly.
   See `DENSITY_BODY`'s own comment in `screen-shell.tsx` for the full
   derivation and why the app's own override cannot be read from this repo.

   ONE TOKEN, TWO SEAMS, CHECKED AS AN IMPORT — NOT TWO LITERALS THAT AGREE
   BY COINCIDENCE. `CARD_CONTENT_INSET_X` (`components/card/card.tsx`) is
   the single export both `CardContent`'s own padding and `screen-shell.tsx`'s
   `DENSITY_BODY` read; this check pins THREE things, each catching a
   different way the two could drift apart again: (1) `card.tsx` exports
   `CARD_CONTENT_INSET_X` reading `px-[var(--space-3)]`, (2) `CardContent`'s
   own className actually uses that identifier (not a literal it happens to
   match today), and (3) `screen-shell.tsx` imports the same identifier AND
   spends it inside `DENSITY_BODY`, at both densities. */
const insetFindings = [];

const CARD_CONTENT_INSET_X_PATTERN = /const CARD_CONTENT_INSET_X = "px-\[var\(--space-3\)\]";/;
if (!CARD_CONTENT_INSET_X_PATTERN.test(cardSrc)) {
  insetFindings.push(
    `${cardRel} does not export CARD_CONTENT_INSET_X = "px-[var(--space-3)]" — the one token Ruling 2's ` +
      "sides-equal-top-of-toolbar equality is built on (measured 13.5px at this app's root, R83's own remainder).",
  );
}
const cardExportBlock = cardSrc.slice(cardSrc.lastIndexOf("export {"));
if (!/CARD_CONTENT_INSET_X/.test(cardExportBlock)) {
  insetFindings.push(`${cardRel} does not export CARD_CONTENT_INSET_X from its own export block.`);
}
if (!/className=\{cn\("min-w-0 flex-1 py-6 lg:py-\[var\(--space-7\)\]", CARD_CONTENT_INSET_X, className\)\}/.test(cardSrc)) {
  insetFindings.push(
    `${cardRel}'s CardContent does not spend CARD_CONTENT_INSET_X for its own left/right padding — ` +
      "a literal px-[...] here would silently stop matching what DENSITY_BODY reads.",
  );
}

if (!/import \{ CARD_CONTENT_INSET_X \} from "\.\.\/\.\.\/components\/card\/card";/.test(src)) {
  insetFindings.push(`${rel} does not import CARD_CONTENT_INSET_X from components/card/card.`);
}
const DENSITY_BODY_PATTERN =
  /const DENSITY_BODY: Record<ScreenDensity, string> = \{\s*comfortable: cn\(CARD_CONTENT_INSET_X, "py-\[var\(--space-5\)\] lg:py-\[var\(--space-6\)\]"\),\s*calm: cn\(CARD_CONTENT_INSET_X, "py-\[var\(--space-4\)\] lg:py-\[var\(--space-5\)\]"\),\s*\};/;
if (!DENSITY_BODY_PATTERN.test(src)) {
  insetFindings.push(
    `DENSITY_BODY in ${rel} does not build both densities from cn(CARD_CONTENT_INSET_X, "py-…") — ` +
      "the imported token must be the sole horizontal inset, at both densities, with vertical rhythm unchanged.",
  );
}

// A REGRESSION SHAPED LIKE THE BUG THIS RULING FIXED: a bare, symmetric
// `p-[var(--space-…)]` reintroduces exactly the "one utility, every side"
// pattern that made the horizontal inset silently track the vertical one.
if (/const DENSITY_BODY: Record<ScreenDensity, string> = \{\s*comfortable: "p-\[/.test(src)) {
  insetFindings.push(
    `DENSITY_BODY in ${rel} reads a bare, symmetric "p-[...]" again — Ruling 2 split it into px/py specifically ` +
      "so the sides stop tracking whatever the vertical figure is.",
  );
}

if (insetFindings.length > 0) {
  console.error("FAIL screen-shell content-inset check (Ruling 2):\n" + insetFindings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK screen-shell content-inset check: card.tsx exports CARD_CONTENT_INSET_X (px-[var(--space-3)]), " +
    "CardContent spends it, and DENSITY_BODY imports and spends the SAME identifier at both densities.",
);
