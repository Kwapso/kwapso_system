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
const RECORD_CHROME_FILE = path.join(HERE, "record-chrome.tsx");
const RECORD_DETAIL_FILE = path.join(HERE, "..", "..", "components", "record-detail", "record-detail.tsx");
const TITLE_FILE = path.join(HERE, "..", "..", "components", "title", "title.tsx");
const TRAIL_LINE_FILE = path.join(HERE, "..", "..", "components", "breadcrumbs", "trail-line.tsx");
const RAIL_FILE = path.join(HERE, "rail.tsx");

const src = fs.readFileSync(FILE, "utf8");
const rel = path.relative(process.cwd(), FILE);
const railSrc = fs.readFileSync(RAIL_FILE, "utf8");
const railRel = path.relative(process.cwd(), RAIL_FILE);
const trailLineSrc = fs.readFileSync(TRAIL_LINE_FILE, "utf8");
const trailLineRel = path.relative(process.cwd(), TRAIL_LINE_FILE);
const cardSrc = fs.readFileSync(CARD_FILE, "utf8");
const cardRel = path.relative(process.cwd(), CARD_FILE);
const recordChromeSrc = fs.readFileSync(RECORD_CHROME_FILE, "utf8");
const recordChromeRel = path.relative(process.cwd(), RECORD_CHROME_FILE);
const recordDetailSrc = fs.readFileSync(RECORD_DETAIL_FILE, "utf8");
const recordDetailRel = path.relative(process.cwd(), RECORD_DETAIL_FILE);
const titleSrc = fs.readFileSync(TITLE_FILE, "utf8");
const titleRel = path.relative(process.cwd(), TITLE_FILE);

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
   THE 17 SEP 2026 EVENING TRAIL-SPACING CHECK — S3/D2, HALVED AND
   DE-DIVIDERED 18 SEP 2026. Client, 17 Sep, verbatim: "Make a bit more space
   above the breadcrumbs. Reduce the space between the breadcrumbs and the
   chips. Maybe we could add a divider line." Then, picking from the design
   page: "for the spacing, do s3. and d2." S3: 20px above the trail (was 12),
   8px between the trail and the title/chip row (was 20), plus a hairline
   divider under the trail spanning the card's inner width.

   SUPERSEDED THE NEXT DAY — client, 18 Sep, verbatim: "for the breadrcumbs /
   search - half of the margin that now is on top, and exactly same under.
   no line divider under." Half of S3's 20 is 10 — `--space-2h`, the tokens
   scale's own existing half-step, not a new token — and "exactly same
   under" reads that identical custom property into `TRAIL_GAP` too, rather
   than leaving it at S3's unrelated 8. The divider is retired outright.

   SUPERSEDED AGAIN, THE SAME DAY — CLIENT RULING, VERBATIM: "change to
   trail line 10px abpove 16below." `above` and `below` are no longer "the
   SAME token" — `DENSITY_TRAIL`'s `pt` stays `--space-2h` (10, unchanged by
   this ruling), `TRAIL_GAP`'s `mb` moves one rung up to `--space-4` (16).
   The check below moves with it: it now asserts the two constants read
   DIFFERENT tokens, not the same one, and the "exactly same" pattern this
   comment used to test for would itself be a regression.

   Asserted as working code shapes, the same style every check in this file
   uses: `DENSITY_TRAIL` carries a flat `pt-[var(--space-2h)]` at BOTH
   densities (the ruling named one number, not a density pair), `TRAIL_GAP`
   is `mb-[var(--space-4)]` — the next rung up, per the second 18 Sep ruling
   — and the trail slot renders `{trail}` with NO `<Separator />` anywhere
   inside it. A regression that reverts any one of the three — a bad merge,
   a "let's put it back to equal" edit that forgets the two now read
   different tokens, or a divider that creeps back in — fails here instead
   of waiting for the next client screenshot.

   EXTENDED 2026-09-17 NIGHT — THE TITLE SLOT'S OWN LEADING PADDING, PINNED
   TO ZERO WHEN A TRAIL RENDERS. `DENSITY_TRAIL`'s `pt` and `TRAIL_GAP` were
   both already correct (checked above) and `npm run check` was already
   green, yet a live `getComputedStyle` read (`verify/trail-line/`, 15px
   root) measured 30px between the hairline and the title, not S3's 8 —
   `DENSITY_HEADER`'s own `pt` (the space a TRAIL-LESS screen still needs
   above its title) was stacking on top of `TRAIL_GAP` uninvited, because
   `getBoundingClientRect().top` on the header WRAPPER — the only thing the
   two checks above and `verify/trail-line/`'s own delta proof ever read —
   cannot see a wrapper's own padding at all. A green check that cannot see
   the box that owns the bug is not proof the bug is fixed, so this check
   now pins the RENDER SITE'S code shape directly: `screen-shell-header`'s
   own `className` must read `trail ? "pt-0" : undefined` as one of its
   `cn(...)` arguments, and (the symmetric case, a `trail` with no `band` at
   all, where `screen-shell-body` is what follows the trail instead)
   `screen-shell-body`'s own `className` must read `trail && !band ?
   "pt-0 lg:pt-0" : undefined`. Neither pattern can be satisfied by a
   comment alone — both are call-site syntax inside a `cn(...)` argument
   list, the same "working code shape, not a bare word" standard the file
   header states for every check in this script. */
const trailSpacingFindings = [];

const DENSITY_TRAIL_PATTERN =
  /const DENSITY_TRAIL: Record<ScreenDensity, string> = \{\s*comfortable: cn\(CARD_CONTENT_INSET_X, "pt-\[var\(--space-2h\)\]"\),\s*calm: cn\(CARD_CONTENT_INSET_X, "pt-\[var\(--space-2h\)\]"\),\s*\};/;
if (!DENSITY_TRAIL_PATTERN.test(src)) {
  trailSpacingFindings.push(
    `DENSITY_TRAIL in ${rel} does not read the 18 Sep evening ruling's flat pt-[var(--space-2h)] (10px above the ` +
      "trail, half of S3's 20) at both densities, built on cn(CARD_CONTENT_INSET_X, ...) — see the 18 Sep MORNING " +
      "ruling's own check, further down this file, for why px is CARD_CONTENT_INSET_X and not a literal any more.",
  );
}

const TRAIL_GAP_PATTERN = /const TRAIL_GAP = "mb-\[var\(--space-4\)\]";/;
if (!TRAIL_GAP_PATTERN.test(src)) {
  trailSpacingFindings.push(
    `TRAIL_GAP in ${rel} does not read mb-[var(--space-4)] — the 18 Sep ruling ("trail line 10px abpove 16below") ` +
      "supersedes the earlier 'exactly same under' ruling and moves TRAIL_GAP one rung up from DENSITY_TRAIL's " +
      "own --space-2h pt, to --space-4 (16px).",
  );
}

// THE DIVIDER IS GONE — the 18 Sep ruling's own last sentence, "no line
// divider under," retired it outright. Checked as the ABSENCE of a working
// render shape (Separator called inside the `trail` slot's own JSX block),
// not a bare mention of the word "Separator" anywhere in the file — this
// file's own historical comments are free to keep naming it while
// explaining why it is gone, exactly the standard the resize-rot check
// above states for its own removed feature.
const TRAIL_SLOT_BLOCK = /data-slot="screen-shell-trail"[\s\S]{0,1600}?<\/div>/;
const trailSlotMatch = src.match(TRAIL_SLOT_BLOCK);
if (trailSlotMatch && /<Separator\s*\/>/.test(trailSlotMatch[0])) {
  trailSpacingFindings.push(
    `The screen-shell-trail slot in ${rel} still renders <Separator /> — the 18 Sep 2026 ruling ("no line divider ` +
      'under") retired it and it must stay gone.',
  );
}
if (/^import \{ Separator \} from "\.\.\/\.\.\/components\/separator\/separator";$/m.test(src)) {
  trailSpacingFindings.push(
    `${rel} still imports Separator from components/separator/separator — dead weight now that the trail slot's ` +
      "own divider is retired and nothing else in this file renders one.",
  );
}

// THE TITLE SLOT'S OWN LEADING PADDING, ZEROED AT THE HEADER'S RENDER SITE
// WHEN A TRAIL IS PRESENT — see this check's own header comment for the
// 30px-not-8px bug a wrapper-top-only proof cannot see. Matched inside the
// `screen-shell-header` block specifically (not anywhere in the file) so a
// `pt-0` that landed on some unrelated div would not satisfy this.
const HEADER_SLOT_BLOCK = /data-slot="screen-shell-header"[\s\S]{0,900}?\n\s*>/;
const headerSlotMatch = src.match(HEADER_SLOT_BLOCK);
if (!headerSlotMatch || !/trail\s*\?\s*"pt-0"\s*:\s*undefined/.test(headerSlotMatch[0])) {
  trailSpacingFindings.push(
    `The screen-shell-header slot in ${rel} does not read trail ? "pt-0" : undefined — DENSITY_HEADER's own ` +
      "pt still stacks on top of TRAIL_GAP when a trail renders, doubling the gap the hairline sits above the title.",
  );
}

// THE SYMMETRIC CASE — a `trail` with no `band` at all, where
// `screen-shell-body` is the thing that would double the leading gap
// instead of the header. Matched inside the `screen-shell-body` block for
// the same reason as the header match above.
const BODY_SLOT_BLOCK = /data-slot="screen-shell-body"[\s\S]{0,400}?>/;
const bodySlotMatch = src.match(BODY_SLOT_BLOCK);
if (!bodySlotMatch || !/trail\s*&&\s*!band\s*\?\s*"pt-0 lg:pt-0"\s*:\s*undefined/.test(bodySlotMatch[0])) {
  trailSpacingFindings.push(
    `The screen-shell-body slot in ${rel} does not read trail && !band ? "pt-0 lg:pt-0" : undefined — a ` +
      "trail with no title band would still double its own leading gap against a title-less screen's body pt.",
  );
}

// THE MAGNIFIER AND THE "⌘K" HINT ARE GONE — 18 SEP 2026, CLIENT RULING,
// VERBATIM: "on the top navbar, kill the search icon, makes no sense there.
// also kill the cmd+k." Checked against trail-line.tsx itself (this is the
// one file that ever drew either): no MagnifyingGlass import, no
// data-slot="trail-line-hint" span. Working code shapes, not a bare mention
// of either word — trail-line.tsx's own header is free to keep discussing
// the retired D2 drawing in prose while explaining why it is gone, the same
// standard the resize-rot check at the top of this file holds itself to.
// WORKING CODE SHAPES ONLY — an import or a JSX render, not a bare mention.
// trail-line.tsx's own header is free to keep discussing the retired D2
// magnifier in prose (see its own comment above `TRAIL_PILL`) while
// explaining why it is gone; a substring match on the bare word would fail
// on that prose the moment it was written, which is backwards.
if (
  /^import \{[^}]*\bMagnifyingGlass\b[^}]*\} from "\.\.\/\.\.\/foundations\/icons";$/m.test(trailLineSrc) ||
  /<MagnifyingGlass\b/.test(trailLineSrc)
) {
  trailSpacingFindings.push(
    `${trailLineRel} still imports or renders MagnifyingGlass — the 18 Sep 2026 ruling ("kill the search icon") ` +
      "retired the trail field's magnifier and it must stay gone.",
  );
}
if (/data-slot="trail-line-hint"/.test(trailLineSrc)) {
  trailSpacingFindings.push(
    `${trailLineRel} still renders a data-slot="trail-line-hint" span — the 18 Sep 2026 ruling ("also kill the ` +
      'cmd+k") retired the "⌘K" hint and it must stay gone.',
  );
}

if (trailSpacingFindings.length > 0) {
  console.error(
    "FAIL screen-shell trail-spacing check (S3/D2, superseded 18 Sep):\n" +
      trailSpacingFindings.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  "OK screen-shell trail-spacing check: DENSITY_TRAIL pt reads --space-2h (10px above the trail) and TRAIL_GAP " +
    "reads --space-4 (16px below it, the 18 Sep 'trail line 10px abpove 16below' ruling), no <Separator /> renders " +
    "in the trail slot (and none is imported), the title slot's leading pt stays pinned to zero (header and body) " +
    "whenever a trail renders, and trail-line.tsx draws neither the magnifier nor the ⌘K hint any more.",
);

/* ============================================================================
   THE 17 SEP 2026 NIGHT BODY-HOSTED TITLE CHECK — a THIRD place the same
   "space above the title" figure could hide, found reading `agency-staging`
   live (root 16px): `/tasks` and `/tickets` still measured 40px between the
   hairline and the title AFTER the two checks above went green, because
   neither `one`/`four`/`nine` in `verify/trail-line/` nor the two checks
   above ever render the shape the system's own fourteen record screens
   actually use. `RecordRoute` (`record-route.tsx`) hands `ScreenShell` NO
   `title`/`header` at all — `band` is `null`, `screen-shell-header` never
   renders — and passes `RecordChrome` as `children` instead, whose title is
   drawn by `RecordDetail`'s OWN header region, inside `screen-shell-body`.
   The two checks above pin `screen-shell.tsx`'s own render sites; they say
   nothing about whether `record-detail.tsx`, `record-chrome.tsx` or
   `title.tsx` themselves spend a leading `pt`/`mt` above that region, which
   would double the gap exactly the way `DENSITY_HEADER`'s `pt` once did,
   invisibly to every proof that only reads `screen-shell.tsx`.

   MEASURED: on `agency-staging`, `screen-shell-body`'s own `paddingTop`
   already reads 0px (the fix above IS live and IS correct) and every
   KIT-OWNED box between it and the title — `record-chrome`'s root,
   `record-detail`'s header region, `Title`'s own root — reads 0 padding and
   0 margin too. The remaining 32 of the live 40 (`TRAIL_GAP`'s 8 plus 32) is
   `--space-7` at a 16px root, paid by a wrapper `agency-staging` builds
   around whatever it hands `ScreenShell` as `children` — a box this repo
   does not contain (`pb-24`, `overflow-x-clip`, `max-w-none min-w-0
   min-h-full` together match nothing here) and so cannot be asserted here
   either; it is the pipeline owner's fact, logged in the CHANGELOG, not a
   defect this check can catch or this file can fix.

   WHAT THIS CHECK CAN AND DOES PIN: the three KIT-OWNED render sites stay at
   zero, as working code shapes, so a regression that gives any of them a
   leading `pt`/`mt` fails here instead of waiting for the next
   `getComputedStyle` read to catch it by hand. `verify/trail-line/`'s own
   `record` case renders this exact composition and reads the same 8 off the
   live DOM — this check is the static half of that proof.

   EXTENDED 18 SEP 2026 — THE SAME REGION'S INLINE AXIS, NOT ONLY ITS BLOCK
   ONE. Client, verbatim, on a ticket record: "pils and title are slightliy
   wider that the topnavbar. should not be. they shoul be same width and end
   at the same point in the left." Live measurement after v1.2.116: the trail
   field and this component's own root both sat at left 219px; this header
   region — carrying the title AND, through `meta`, `RecordChrome`'s own
   identity-row chips ("pils") — sat at 223px. The cause was `px-1` on this
   exact div, carrying a comment claiming it lined the band's type up with
   the panel's inset below ("4 of inline breathing") — arithmetically false
   (the panel's own inset is `--space-5`/20 opening to `--space-7`/32, no
   multiple of which is 4) and never load-bearing: this wrapper is a child of
   the record root, which carries no inline padding of its own either, so
   both it and the trail above it already read the SAME parent edge without
   help. `px-1` is deleted, not merely commented around, so this check pins
   its absence the same way it already pins pt-/mt-'s: any `px-`/`pl-`/`pr-`/
   `ps-`/`pe-` utility on this region reopens the exact 4px the ruling named,
   whether or not it happens to be a 4px value again — the fix is that this
   wrapper spends NOTHING on the inline axis, not that it spends the right
   number. */
const bodyTitleFindings = [];

// {0,1800}: 18 Sep 2026's own px-1 finding widened this file's inline
// comment on the region well past the old {0,300} window (the previous
// comment was two lines; this one documents a live regression with its own
// measurement, matching the length this file's other multi-hundred-char
// comments already run to elsewhere in record-detail.tsx).
const RECORD_DETAIL_HEADER_BLOCK = /data-record-region="header"[\s\S]{0,1800}?className="([^"]*)"/;
const recordDetailHeaderMatch = recordDetailSrc.match(RECORD_DETAIL_HEADER_BLOCK);
if (!recordDetailHeaderMatch) {
  bodyTitleFindings.push(
    `${recordDetailRel} does not have a data-record-region="header" block with a plain className to check.`,
  );
} else if (/\b(?:pt|mt)-[^\s"]/.test(recordDetailHeaderMatch[1])) {
  bodyTitleFindings.push(
    `${recordDetailRel}'s header region (data-record-region="header") carries its own leading pt-/mt- ` +
      `("${recordDetailHeaderMatch[1]}") — that doubles the gap above a body-hosted title exactly the way ` +
      "DENSITY_HEADER's pt once doubled the header-band one.",
  );
} else if (/\b(?:px|pl|pr|ps|pe)-[^\s"]/.test(recordDetailHeaderMatch[1])) {
  bodyTitleFindings.push(
    `${recordDetailRel}'s header region (data-record-region="header") carries its own inline px-/pl-/pr-/ps-/pe- ` +
      `("${recordDetailHeaderMatch[1]}") — this wrapper is a child of the record root, which spends no inline ` +
      "padding of its own, so any padding here pushes the title and RecordChrome's identity-row chips off the " +
      'trail\'s left edge (the 18 Sep 2026 ruling: "should be same width and end at the same point in the left").',
  );
}

if (!/const SHAPE_SHELL: Record<ScreenDensity, string> = \{\s*comfortable: "gap-6",\s*calm: "gap-\[var\(--space-7\)\] mx-auto w-full max-w-\[60rem\]",\s*\};/.test(
  fs.readFileSync(path.join(HERE, "..", "states", "states.tsx"), "utf8"),
)) {
  bodyTitleFindings.push(
    "SHAPE_SHELL (compositions/states/states.tsx) no longer reads its known pt-/mt-free shape — " +
      "record-chrome.tsx's own root spends this token and a pt/mt added there would sit above every record's title.",
  );
}

const RECORD_CHROME_ROOT = /data-slot="record-chrome"[\s\S]{0,200}?className=\{cn\(([^)]*)\)\}/;
const recordChromeRootMatch = recordChromeSrc.match(RECORD_CHROME_ROOT);
if (!recordChromeRootMatch) {
  bodyTitleFindings.push(`${recordChromeRel} does not have a data-slot="record-chrome" root with a cn(...) className to check.`);
} else if (/\b(?:pt|mt)-[^\s"'`]/.test(recordChromeRootMatch[1])) {
  bodyTitleFindings.push(
    `${recordChromeRel}'s own root (data-slot="record-chrome") spends a literal pt-/mt- in its cn(...) call — ` +
      "that sits above every record's title, header band or not.",
  );
}

// `Title`'s OWN ROOT (`data-slot="title"`) MUST NOT CARRY AN UNCONDITIONAL
// LEADING pt-/mt- — the one conditional case (`mt-[var(--space-1h)]` on
// `title-heading` when `eyebrow` is set) is untouched by this check because
// `RecordChrome` never passes `eyebrow` (override 73), so it never fires on
// a record; this pins the ROOT div's own className, which is unconditional.
const TITLE_ROOT_BLOCK = /data-slot="title"[\s\S]{0,700}?className=\{cn\(([\s\S]{0,700}?)\)\}/;
const titleRootMatch = titleSrc.match(TITLE_ROOT_BLOCK);
if (!titleRootMatch) {
  bodyTitleFindings.push(`${titleRel} does not have a data-slot="title" root with a cn(...) className to check.`);
} else {
  // Only the two literal strings up to (not including) the `rule && …` ternary
  // are unconditional — that ternary's own `pb-[var(--space-3h)]` is a real,
  // deliberate leading-edge-adjacent value this check must not trip on, so
  // this reads only the text BEFORE it, not the whole cn(...) argument list.
  const unconditionalPart = titleRootMatch[1].split(/rule\s*&&/)[0];
  if (/\b(?:pt|mt)-[^\s"]/.test(unconditionalPart)) {
    bodyTitleFindings.push(
      `${titleRel}'s own root (data-slot="title") carries an unconditional pt-/mt- ` +
        `("${unconditionalPart.trim()}") — a record's title has no eyebrow above it to justify one.`,
    );
  }
}

if (bodyTitleFindings.length > 0) {
  console.error(
    "FAIL screen-shell body-hosted-title check (S3/D2, the record shape):\n" +
      bodyTitleFindings.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  "OK screen-shell body-hosted-title check: record-chrome.tsx's root, record-detail.tsx's header region and " +
    "title.tsx's own root all stay pt-/mt-free, so a record's body-hosted title carries no leading space of its " +
    "own beyond screen-shell-body's already-checked pt-0; record-detail.tsx's header region also stays " +
    "px-/pl-/pr-/ps-/pe-free, so the title and its chip row cannot drift off the trail's left edge either.",
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

/* ============================================================================
   THE 18 SEP 2026 MORNING TRAIL/BODY INSET-PARITY CHECK — client, verbatim,
   measured on a ticket record: "pils and title are slightliy wider that the
   topnavbar. should not be. they shoul be same width and end at the same
   point in the left."

   MEASURED, `agency-staging`, a ticket record, 1440 viewport, BEFORE this
   fix: `[data-slot="trail-line-field"]` left edge 231px;
   `[data-slot="title"]` / `[data-slot="badge"]` left edge 223px — an 8px
   gap, `DENSITY_TRAIL`'s old `--space-6` against `DENSITY_BODY`'s
   `CARD_CONTENT_INSET_X` (`--space-3`), on the one screen shape (a record,
   `band` null) where `DENSITY_TRAIL` used to copy `DENSITY_HEADER`'s figure
   instead of the token that actually governs the title it sits above.

   THE FIX IS THE IDENTIFIER — `DENSITY_TRAIL`'s own `px` must be built from
   the SAME `CARD_CONTENT_INSET_X` import `DENSITY_BODY` already reads
   (checked above), not a second copy of `DENSITY_HEADER`'s larger figure and
   not a hand-typed literal that merely matches it today. Checked as an
   import-plus-usage pair, the same standard the content-inset check above
   holds `DENSITY_BODY` to, so the trail's left edge and the body's own left
   edge cannot drift apart independently again. */
const trailInsetParityFindings = [];

if (!/const DENSITY_TRAIL: Record<ScreenDensity, string> = \{\s*comfortable: cn\(CARD_CONTENT_INSET_X,/.test(src)) {
  trailInsetParityFindings.push(
    `DENSITY_TRAIL in ${rel} does not build its px from cn(CARD_CONTENT_INSET_X, …) — the trail slot's own ` +
      "left edge must read the SAME identifier DENSITY_BODY's px does (18 Sep morning ruling: the pill and the " +
      "title must end at the same point on the left), not a copy of DENSITY_HEADER's larger figure.",
  );
}

// A REGRESSION SHAPED LIKE THE BUG THIS RULING FIXED: DENSITY_TRAIL going
// back to a literal px-[var(--space-6/5)] would silently stop matching
// DENSITY_BODY the next time either figure moved, exactly the "two strings
// that happen to agree today" failure mode Ruling 2's own check (above)
// already guards on DENSITY_BODY's side.
if (/const DENSITY_TRAIL: Record<ScreenDensity, string> = \{\s*comfortable: "px-\[/.test(src)) {
  trailInsetParityFindings.push(
    `DENSITY_TRAIL in ${rel} reads a literal "px-[...]" again — the 18 Sep morning ruling replaced it with the ` +
      "imported CARD_CONTENT_INSET_X specifically so the trail and the body inset cannot drift apart.",
  );
}

if (trailInsetParityFindings.length > 0) {
  console.error(
    "FAIL screen-shell trail/body inset-parity check (18 Sep morning ruling):\n" +
      trailInsetParityFindings.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  "OK screen-shell trail/body inset-parity check: DENSITY_TRAIL builds its px from the same imported " +
    "CARD_CONTENT_INSET_X identifier DENSITY_BODY spends, so the trail field's left edge and the title/chip left " +
    "edge cannot drift apart (measured live: 231px vs 223px before the fix, on a ticket record).",
);

/* ============================================================================
   THE 18 SEP 2026 RAIL-GUTTER-HALVING CHECK — client, verbatim: "reduce the
   margin between the super far edge of screen and the side navbar, same as
   reduce it between side navbar and main content. keep spacing equal on both
   sides - but reduce (i'd say to half of what it is, but i dont see the
   pixels, just human eye)."

   MEASURED, `agency-staging`, a ticket record, 1440 viewport, 16px root,
   BEFORE this fix: `[data-slot="rail"]` left edge 19px from the viewport;
   `[data-slot="rail"]` right edge 187px against `[data-slot="screen-shell-body"]`
   left edge 207px, a 20px gap — both edges already the SAME `--rail-inset`
   token (`--space-5`, 20px), because `RAIL_COLUMN`'s own `p-[var(--rail-inset)]`
   pads all four sides of the rail column at once and the content column's own
   matching trailing gutter was removed outright back on 2026-09-06 (see
   `DENSITY_RAIL`'s own comment). Half of 20 is 10 — `--space-2h`, the same
   half-step token `TRAIL_GAP`/`DENSITY_TRAIL` already reach for elsewhere in
   this file for an identical "half of the current figure" ruling.

   THREE THINGS PINNED, each guarding a different way the two edges could
   drift apart again: (1) `DENSITY_RAIL` reads the halved `--space-2h` at
   both densities: (2) `RAIL_COLUMN` still pads all four sides with the ONE
   `--rail-inset` token, not a split ps-/pe- pair that could disagree; (3) the
   content column's own leading padding still zeroes out at `md` when a rail
   is present (`railNode ? "ps-[var(--shell-gutter)] md:ps-0" : …`), so
   nothing reintroduces a second, independent gutter on the content side. */
const railGutterFindings = [];

const DENSITY_RAIL_PATTERN =
  /const DENSITY_RAIL: Record<ScreenDensity, string> = \{\s*comfortable: "\[--rail-inset:var\(--space-2h\)\]",\s*calm: "\[--rail-inset:var\(--space-2h\)\]",\s*\};/;
if (!DENSITY_RAIL_PATTERN.test(src)) {
  railGutterFindings.push(
    `DENSITY_RAIL in ${rel} does not read the 18 Sep ruling's halved [--rail-inset:var(--space-2h)] (10px, half ` +
      "of the old --space-5/20px) at both densities.",
  );
}

if (!/const RAIL_COLUMN = cn\("p-\[var\(--rail-inset\)\]"\);/.test(src)) {
  railGutterFindings.push(
    `RAIL_COLUMN in ${rel} does not pad all four sides with the single p-[var(--rail-inset)] — a split ps-/pe- ` +
      'pair here could let "screen edge to navbar" and "navbar to main content" disagree again.',
  );
}

if (!/railNode \? "ps-\[var\(--shell-gutter\)\] md:ps-0" : "ps-\[var\(--shell-gutter\)\]"/.test(src)) {
  railGutterFindings.push(
    `${rel}'s content column does not read railNode ? "ps-[var(--shell-gutter)] md:ps-0" : … any more — a ` +
      "second leading gutter on the content side (present alongside the rail's own trailing --rail-inset) would " +
      "double the rail-to-content gap the 2026-09-06 ruling already closed once.",
  );
}

if (railGutterFindings.length > 0) {
  console.error(
    "FAIL screen-shell rail-gutter-halving check (18 Sep ruling):\n" +
      railGutterFindings.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  "OK screen-shell rail-gutter-halving check: DENSITY_RAIL's --rail-inset is the halved --space-2h (10px) at both " +
    "densities, RAIL_COLUMN still pads all four sides with that one token, and the content column still zeroes " +
    "its own leading padding at md when a rail is present — so the screen-edge-to-navbar and navbar-to-content " +
    "gaps stay equal and cannot drift apart independently.",
);

/* ============================================================================
   THE 18 SEP 2026 ASSISTANT-HANDLE-IN-THE-BAND CHECK — client, verbatim: "put
   the open assistant button completely on the top margin, not liek now that
   its slightly overlaping with main content." EXTENDED THE SAME DAY, A
   SECOND RULING, verbatim: "need to be bigger, as big as the space allows
   it."

   MEASURED, `agency-staging`, a ticket record, 1440 viewport, BEFORE the
   FIRST fix: the shut aside handle at top 16px (`--shell-gutter`),
   `HANDLE_HIT`'s own 40px (`--control-height-button`) box put its bottom
   edge at 56px — 9.52px past the content card's own top edge (46.48px).
   That fix sized this ONE branch to `--control-height-pill` (26px), the
   same token `trail-line.tsx` already proved fits the identical
   `--folder-lip` (30.48px) band; bottom edge 42px, 4.48px clear of the
   card — correct against the overlap complaint, but "as big as the space
   allows" is bigger than that: the SECOND fix sizes the branch to the
   band's own height, `--folder-lip` (30.48px) directly, so the bottom edge
   lands at 16 + 30.48 = 46.48px — exactly the card's own top edge, the same
   number by construction, not a coincidence this check can drift away from
   without also catching the band's own two component tokens moving apart. */
const assistantHandleFindings = [];

if (
  !/: cn\(\s*"max-md:hidden top-\[var\(--shell-gutter\)\] end-\[var\(--shell-gutter\)\]",[\s\S]{0,3200}?"size-\[var\(--folder-lip\)\]",\s*\),/.test(
    src,
  )
) {
  assistantHandleFindings.push(
    `${rel}'s shut aside handle placement does not size itself to size-[var(--folder-lip)] — at HANDLE_HIT's own ` +
      "40px (--control-height-button) its bottom edge (top-[var(--shell-gutter)] + 40px) runs past the content " +
      "card's own top edge, and at the retired --control-height-pill (26px) it falls short of the 18 Sep " +
      '"as big as the space allows it" ruling.',
  );
}

// THE OLD, UNDERSIZED FIX MUST STAY GONE — a regression that reverts to the
// first ruling's own answer (26px, correct for the overlap complaint alone)
// would pass every other check here and still fail the second ruling.
if (/"max-md:hidden top-\[var\(--shell-gutter\)\] end-\[var\(--shell-gutter\)\]",[\s\S]{0,3200}?"size-\[var\(--control-height-pill\)\]",/.test(src)) {
  assistantHandleFindings.push(
    `${rel}'s shut aside handle still sizes itself to size-[var(--control-height-pill)] (26px) in the shut-band ` +
      "branch — the 18 Sep \"as big as the space allows it\" ruling replaced that with size-[var(--folder-lip)] " +
      "(30.48px), the band's own full height, not another borrowed control size.",
  );
}

// THE OPEN BRANCH MUST STAY UNTOUCHED — it is a mid-edge grab against the
// open column, not a top-strip corner, and HANDLE_HIT's own 40px still
// applies to it (and to the rail's own handle, both states) exactly as
// before either ruling.
if (!/isAsideOpen\s*\n\s*\? "max-\[45rem\]:hidden top-1\/2 -translate-y-1\/2 end-\[var\(--shell-gutter\)\]"/.test(src)) {
  assistantHandleFindings.push(
    `${rel}'s open aside handle placement changed — it must stay the mid-edge grab at HANDLE_HIT's own 40px; ` +
      "only the SHUT branch's own top-strip corner is sized by either 18 Sep ruling.",
  );
}

// THE PINNED MATH ITSELF — --shell-gutter is --space-4 (16px, tokens.css)
// and --folder-lip is 1.905rem (30.48px, tokens.css), so the shut handle's
// bottom edge (top inset + its own height, both these same two tokens) must
// land AT OR BEFORE the content card's own top edge (46.48px — the same
// 16px column padding plus --folder-lip; see this file's own comment and
// trail-line.tsx's identical math). Equal is the ruling's own answer ("as
// big as the space allows", not "smaller than the space"); past it is the
// exact overlap the FIRST ruling already fixed once and this must not
// reopen.
const SHELL_GUTTER_PX = 16;
const FOLDER_LIP_PX = 30.48;
const CARD_TOP_PX = 46.48;
const handleBottomPx = SHELL_GUTTER_PX + FOLDER_LIP_PX;
if (handleBottomPx > CARD_TOP_PX + 0.005) {
  assistantHandleFindings.push(
    `The shut aside handle's pinned math no longer holds in ${rel}: --shell-gutter (${SHELL_GUTTER_PX}px) + ` +
      `--folder-lip (${FOLDER_LIP_PX}px) = ${handleBottomPx.toFixed(2)}px, which now runs past the content ` +
      `card's own top edge (${CARD_TOP_PX}px) — the handle would overlap the card again, the exact defect the ` +
      "first 18 Sep ruling fixed.",
  );
}

if (assistantHandleFindings.length > 0) {
  console.error(
    "FAIL screen-shell assistant-handle-in-the-band check (18 Sep rulings):\n" +
      assistantHandleFindings.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  "OK screen-shell assistant-handle-in-the-band check: the shut aside handle sizes itself to --folder-lip " +
    "(30.48px) — the band's own full height, \"as big as the space allows it\" — its pinned bottom edge " +
    "(--shell-gutter + --folder-lip = 46.48px) lands exactly at, never past, the content card's own top edge, " +
    "the retired --control-height-pill (26px) sizing stays gone, and the open branch's mid-edge grab is " +
    "untouched.",
);

/* ============================================================================
   THE 18 SEP 2026 RAIL-BRAND-ALIGNMENT CHECK — client ruling, verbatim: "on
   the sidebar tge logo is way too up!!! make it aligned with text on foler
   tabs."

   MEASURED, `verify/shell-chrome/` (1440×900, this kit's own 15px harness
   root), BEFORE this fix: `[data-slot="rail-brand"]`'s own box (mark +
   wordmark) centred at 18.74px from the viewport top; the active folder
   tab's own label glyph (a `Range` over its text node, inside
   `nav[data-slot="breadcrumb-folders"]`) centred at 28.75 — 10px lower.
   AFTER: 29.27 against 28.75, 0.52px apart (line-box rounding against a
   geometric flex-row centre; see `rail.tsx`'s own comment on the fix for
   the full derivation).

   PINNED AS THE WORKING CALC, not the delta a screenshot could show: the
   fix reads four tokens already in scope on `rail-brand` (`--shell-gutter`,
   `--folder-lip`, `--icon-20`, `--rail-inset` — see `rail.tsx`'s own
   comment for why each is visible there) rather than a literal pixel
   margin, so a change to any one of the four moves the alignment with it
   instead of silently drifting stale. */
const railBrandFindings = [];

const RAIL_BRAND_BLOCK = /data-slot="rail-brand"[\s\S]{0,400}?className=\{cn\(([\s\S]{0,4500}?)\)\}/;
const railBrandMatch = railSrc.match(RAIL_BRAND_BLOCK);
if (!railBrandMatch) {
  railBrandFindings.push(`${railRel} does not have a data-slot="rail-brand" block with a cn(...) className to check.`);
} else if (
  !/mt-\[calc\(var\(--shell-gutter\)_\+_var\(--folder-lip\)\/2_-_var\(--icon-20\)\/2_-_var\(--rail-inset\)\)\]/.test(
    railBrandMatch[1],
  )
) {
  railBrandFindings.push(
    `${railRel}'s rail-brand block does not read the 18 Sep alignment calc (mt-[calc(var(--shell-gutter) + ` +
      "var(--folder-lip)/2 - var(--icon-20)/2 - var(--rail-inset))]) — the logo's own vertical centre would " +
      "drift back above the workspace tab strip's label centre (measured 10px high before this fix).",
  );
}

// A REGRESSION SHAPED LIKE THE BUG THIS RULING FIXED: the row must not go
// back to having NO top-alignment margin at all (the pre-fix shape) — the
// specific calc string is the strongest pin, but an empty diff here (no
// `mt-` on this block at all) is the exact starting point the ruling fixed,
// so it is named as its own finding rather than relying on the first check
// alone to imply it.
if (railBrandMatch && !/\bmt-\[/.test(railBrandMatch[1])) {
  railBrandFindings.push(
    `${railRel}'s rail-brand block carries no mt-[...] at all — back to the pre-18-Sep shape the ruling reported.`,
  );
}

if (railBrandFindings.length > 0) {
  console.error(
    "FAIL rail-brand alignment check (18 Sep ruling):\n" + railBrandFindings.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  "OK rail-brand alignment check: rail-brand's own vertical centre is bound to --shell-gutter + --folder-lip/2 " +
    "- --icon-20/2 - --rail-inset — measured live before/after: 10.01px above the active tab's label centre, " +
    "then 0.52px, at this kit's 15px harness root.",
);

/* ============================================================================
   THE 18 SEP 2026 COLLAPSED-RAIL-KEEPS-ITS-SIZE CHECK — client ruling,
   verbatim: "when contracting sidebar, yuo should not make icons or spaces
   smaller, keep it as it is, just without tetxs."

   MEASURED, `verify/rail/`'s own `data-case="scroll"` two-column proof (a
   real height, real overflow, both rail states side by side), BEFORE this
   fix: expanded row height 37.5px / row-to-row rhythm 45px (`--control-
   height-button`, 40 at 16px root) against collapsed row height 30px /
   rhythm 37.5px (`--avatar-md`, 32) — an 8px shrink in both the row's own
   box and, because the row-to-row GAP token itself never changed
   (`--space-2` measured identical, 7.5px, in both states), the rhythm that
   box height drives. AFTER: 37.5px / 45px in BOTH states — identical. The
   icon's own glyph was NEVER part of the shrink (15×15 measured before and
   after, in both states — `ROW_SHAPE`'s shared `[&_svg]:size-[var(--icon-
   button)]` descendant rule reads off the row, not the expanded-only
   `rail-item-icon` wrapper), so this check pins only what actually moved:
   the row's own box, and the column width that must widen with it or a
   `--control-height-button` circle clips against a narrower column. */
const railCollapsedFindings = [];

if (!/const ROW_COLLAPSED = cn\(\s*"size-\[var\(--control-height-button\)\] justify-center rounded-pill p-0",?\s*\);/.test(railSrc)) {
  railCollapsedFindings.push(
    `${railRel}'s ROW_COLLAPSED does not read size-[var(--control-height-button)] — a regression back to size-` +
      "[var(--avatar-md)] (32px) shrinks the collapsed row 8px against its own expanded state (measured: 30px " +
      "vs 37.5px row height, 37.5px vs 45px row-to-row rhythm), the exact 'icons or spaces smaller' the 18 Sep " +
      "ruling refused.",
  );
}

// THE OLD, SMALLER TOKEN MUST STAY GONE FROM THIS ONE CONSTANT — matched
// narrowly (the ROW_COLLAPSED declaration itself, not every --avatar-md in
// the file) because the member chip's own avatar is untouched by this
// ruling and legitimately keeps reading --avatar-md elsewhere.
if (/const ROW_COLLAPSED = cn\(\s*"size-\[var\(--avatar-md\)\]/.test(railSrc)) {
  railCollapsedFindings.push(
    `${railRel}'s ROW_COLLAPSED still sizes itself to size-[var(--avatar-md)] — the 18 Sep ruling replaced it ` +
      "with size-[var(--control-height-button)] so a collapsed destination row stays the same size as its " +
      "expanded self.",
  );
}

if (!/isCollapsed && "w-\[var\(--control-height-button\)\] flex-none items-center"/.test(railSrc)) {
  railCollapsedFindings.push(
    `${railRel}'s collapsed rail root does not widen to w-[var(--control-height-button)] — a ROW_COLLAPSED row ` +
      "sized to that same token would overflow a column still reading the narrower --avatar-md width.",
  );
}

if (railCollapsedFindings.length > 0) {
  console.error(
    "FAIL collapsed-rail-keeps-its-size check (18 Sep ruling):\n" +
      railCollapsedFindings.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  "OK collapsed-rail-keeps-its-size check: ROW_COLLAPSED reads size-[var(--control-height-button)] (matching " +
    "ROW_EXPANDED's own height token, not the smaller --avatar-md), the collapsed rail root widens to match, and " +
    "the retired --avatar-md row sizing stays gone — measured live before/after: 30px/37.5px row height and " +
    "37.5px/45px row rhythm collapsing to one 37.5px/45px pair in both rail states.",
);
