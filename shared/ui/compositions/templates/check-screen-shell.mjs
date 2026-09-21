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
const COLLECTION_FRAME_FILE = path.join(HERE, "..", "..", "components", "collection-frame", "collection-frame.tsx");
const TOOLBAR_ROW_FILE = path.join(HERE, "..", "..", "components", "toolbar-row", "toolbar-row.tsx");
const TABS_FILE = path.join(HERE, "..", "..", "components", "tabs", "tabs.tsx");

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
const collectionFrameSrc = fs.readFileSync(COLLECTION_FRAME_FILE, "utf8");
const collectionFrameRel = path.relative(process.cwd(), COLLECTION_FRAME_FILE);
const toolbarRowSrc = fs.readFileSync(TOOLBAR_ROW_FILE, "utf8");
const toolbarRowRel = path.relative(process.cwd(), TOOLBAR_ROW_FILE);
const tabsSrc = fs.readFileSync(TABS_FILE, "utf8");
const tabsRel = path.relative(process.cwd(), TABS_FILE);

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

/* `SHELL_CONTENT_INSET_X`, NOT `CARD_CONTENT_INSET_X`, SINCE 21 SEP 2026 -
   the pane's gutter and the boxed card's body inset stopped being one export
   when the air ruling gave them different jobs. The SHAPE this pattern pins
   is unchanged and is the whole point of it: `DENSITY_TRAIL` must still be
   built on the SAME identifier `DENSITY_BODY` is built on, so the trail's
   arrows and the body's own left edge cannot drift apart. Only the name of
   that identifier moved. See `screen-shell.tsx`'s own
   `SHELL_CONTENT_INSET_X` comment, and the inset check further down this
   file, which pins both ends of the new constant exactly as it pinned the
   old one. */
const DENSITY_TRAIL_PATTERN =
  /const DENSITY_TRAIL: Record<ScreenDensity, string> = \{\s*comfortable: cn\(SHELL_CONTENT_INSET_X, "pt-\[var\(--space-2h\)\]"\),\s*calm: cn\(SHELL_CONTENT_INSET_X, "pt-\[var\(--space-2h\)\]"\),\s*\};/;
if (!DENSITY_TRAIL_PATTERN.test(src)) {
  trailSpacingFindings.push(
    `DENSITY_TRAIL in ${rel} does not read the 18 Sep evening ruling's flat pt-[var(--space-2h)] (10px above the ` +
      "trail, half of S3's 20) at both densities, built on cn(SHELL_CONTENT_INSET_X, ...) - see the 18 Sep MORNING " +
      "ruling's own check, further down this file, for why px is the shell's own inset constant and not a literal, " +
      "and the 21 Sep air ruling for why that constant is no longer CARD_CONTENT_INSET_X.",
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
   THE 22 SEP 2026 RECORD-TITLE 32PX REGISTER CHECK — live audit on staging,
   app detail A0002 ("PORTAL SMOKE · another system"), 1440×900. The record
   title was computing at h1 · 44 (`RecordDetail`'s own default, since
   2026-09-08), wrapping to two lines at that width, and its second line sat
   under the tab strip drawn directly below it. The client's standing
   typography ruling caps every screen AND record title at 32px — this app
   already carries that ruling for a screen's own name through
   `SHAPE_HEADING_SIZE` (states.tsx), but `RecordDetail`'s default answered a
   different question and had drifted past it. Fixed at the source:
   `RecordDetail`'s own `titleSize` default is `h2` · 32 now, so every
   record — through this component directly or through `RecordChrome`, which
   passes no `titleSize` of its own — draws its name at the client's register
   with no override needed anywhere above it. See `record-detail.tsx`'s own
   `titleSize` doc for the full account, including the app-side descendant
   selector this repository does not own and cannot remove from here.

   TWO THINGS ARE PINNED, NOT ONE — the register alone would have caught this
   exact regression, but not a future one shaped the other way: a title
   restored to a larger step with the LAYOUT then patched to "fit" it by
   giving the head a fixed height, floating the strip out with `absolute`, or
   pulling it up with a negative margin, rather than by simply letting flow
   layout push the strip down. All three are also how `Title`'s own header
   comment says this kind of overlap tends to ship (a hand patch that treats
   the symptom at the exact spot a screenshot was taken). So this check reads
   the SAME two wrapper elements the body-hosted-title check above already
   isolates — record-detail.tsx's header region and its sticky-strip wrapper
   — for a bare fixed-height utility, a negative margin, or `absolute`
   positioning, none of which this composition has ever needed: it is a plain
   `flex-col` with token gaps end to end, and a title that wraps simply makes
   its own flex item taller, which the strip below it already follows in
   normal flow with no help from either wrapper. */
const recordTitleRegisterFindings = [];

const RECORD_DETAIL_TITLE_DEFAULT_PATTERN = /titleSize\s*=\s*"h2"/;
if (!RECORD_DETAIL_TITLE_DEFAULT_PATTERN.test(recordDetailSrc)) {
  recordTitleRegisterFindings.push(
    `${recordDetailRel} no longer defaults titleSize to "h2" (32px, the client's standing register) — ` +
      "a record's own name has drifted off the ceiling this check exists to hold.",
  );
}

// The strip wrapper `record-detail.tsx` renders as `data-slot="record-detail-strip"`
// (region 2). Its className is a cn(...) call; only `sticky`/`top-0`/`z-10` and the
// TABS_STRIP_GAP padding token belong there — no fixed height, no negative margin,
// no `absolute`.
const RECORD_DETAIL_STRIP_BLOCK = /data-slot="record-detail-strip"[\s\S]{0,300}?className=\{cn\(([^)]*)\)\}/;
const recordDetailStripMatch = recordDetailSrc.match(RECORD_DETAIL_STRIP_BLOCK);
if (!recordDetailStripMatch) {
  recordTitleRegisterFindings.push(
    `${recordDetailRel} does not have a data-slot="record-detail-strip" wrapper with a cn(...) className to check.`,
  );
} else {
  const stripClass = recordDetailStripMatch[1];
  if (/(?<!min-)(?<!max-)\bh-\[/.test(stripClass)) {
    recordTitleRegisterFindings.push(
      `${recordDetailRel}'s sticky-strip wrapper (data-slot="record-detail-strip") carries a fixed h-[…] height ` +
        `("${stripClass.trim()}") — a fixed head/strip height is exactly what stops a wrapped title from pushing ` +
        "the strip down instead of under it.",
    );
  }
  if (/(?:^|[\s"'`])-m[a-z]{0,2}-(?:\[|\d)/.test(stripClass)) {
    recordTitleRegisterFindings.push(
      `${recordDetailRel}'s sticky-strip wrapper (data-slot="record-detail-strip") carries a negative margin ` +
        `("${stripClass.trim()}") — the exact shape that pulls a strip back up over a title's own wrapped line.`,
    );
  }
  if (/\babsolute\b/.test(stripClass)) {
    recordTitleRegisterFindings.push(
      `${recordDetailRel}'s sticky-strip wrapper (data-slot="record-detail-strip") is positioned absolute — ` +
        'it must stay in normal flow ("sticky", never "absolute") so a taller header pushes it down.',
    );
  }
}

// The header band itself (region 1, already isolated above for pt-/px-) gets the
// same three forbidden shapes checked here, so one place answers "can this region
// ever overlap the strip below it" rather than splitting the question in two.
if (recordDetailHeaderMatch) {
  const headerClass = recordDetailHeaderMatch[1];
  if (/(?<!min-)(?<!max-)\bh-\[/.test(headerClass)) {
    recordTitleRegisterFindings.push(
      `${recordDetailRel}'s header region (data-record-region="header") carries a fixed h-[…] height ` +
        `("${headerClass.trim()}") — a title that wraps needs the region to grow with it, not clip against a cap.`,
    );
  }
  if (/(?:^|[\s"'`])-m[a-z]{0,2}-(?:\[|\d)/.test(headerClass)) {
    recordTitleRegisterFindings.push(
      `${recordDetailRel}'s header region (data-record-region="header") carries a negative margin ` +
        `("${headerClass.trim()}") — that is the other shape that can pull the strip back up over a wrapped title.`,
    );
  }
}

// `Title`'s own heading keeps `text-balance` — 2026-09-22, alongside the h2
// default above, so a wrapped title (a record's, or a long collection heading
// through the same component) breaks evenly across its lines.
if (!/["'`]text-balance["'`]/.test(titleSrc)) {
  recordTitleRegisterFindings.push(
    `${titleRel}'s heading no longer carries text-balance — a wrapped record or collection title will break ` +
      "unevenly across its lines again.",
  );
}

// THE COLLECTION HEAD GETS THE SAME LAYOUT GUARD. `CollectionFrame` already
// defaults its own `headingSize` to `Title`'s own default (h2 · 32 — see that
// prop's doc in collection-frame.tsx), so there is no second register to pin
// here; what this checks is that a long module title wrapping in that heading
// still cannot overlap the tabs below it, the same way a record's cannot.
const COLLECTION_FRAME_STACK_BLOCK = /data-slot="collection-frame-stack"[\s\S]{0,60}?className="([^"]*)"/;
const collectionFrameStackMatch = collectionFrameSrc.match(COLLECTION_FRAME_STACK_BLOCK);
if (!collectionFrameStackMatch) {
  recordTitleRegisterFindings.push(
    `${collectionFrameRel} does not have a data-slot="collection-frame-stack" wrapper with a plain className to check.`,
  );
} else {
  const stackClass = collectionFrameStackMatch[1];
  if (/(?<!min-)(?<!max-)\bh-\[/.test(stackClass) || /\babsolute\b/.test(stackClass)) {
    recordTitleRegisterFindings.push(
      `${collectionFrameRel}'s tab stack (data-slot="collection-frame-stack") carries a fixed height or absolute ` +
        `position ("${stackClass.trim()}") — the collection heading above it needs to stay in normal flow to push ` +
        "this stack down when it wraps.",
    );
  }
}

if (recordTitleRegisterFindings.length > 0) {
  console.error(
    "FAIL screen-shell record-title-register check (the 22 Sep 2026 A0002 fix):\n" +
      recordTitleRegisterFindings.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  "OK screen-shell record-title-register check: record-detail.tsx's titleSize default stays h2 (32px, the " +
    "client's register), its header region and sticky-strip wrapper stay free of a fixed height, a negative " +
    "margin and absolute positioning so a wrapped title always pushes the strip down in flow, title.tsx's own " +
    "heading keeps text-balance, and collection-frame.tsx's tab stack carries the same layout guard.",
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

   ONE TOKEN, TWO SEAMS, CHECKED BY IDENTIFIER - NOT LITERALS THAT AGREE BY
   COINCIDENCE. That was the standard this block set and it is unchanged;
   WHICH two seams changed on 21 Sep 2026.

   UNTIL THEN the pair was the boxed card's own body inset and the pane's,
   held together by one export, `CARD_CONTENT_INSET_X`. The minimal pass gave
   those two different jobs - the pane has to pay the side air a plain
   section no longer has, a card that still has its box has given nothing up
   - so `screen-shell.tsx` declares `SHELL_CONTENT_INSET_X` (`--space-6`) and
   `card.tsx` keeps `CARD_CONTENT_INSET_X` (`--space-3`). Both files carry
   the arithmetic.

   SO THIS CHECK NOW PINS FOUR THINGS, and the first two are what stop the
   split from being an excuse to stop checking either half:
     1 · `card.tsx` still exports `CARD_CONTENT_INSET_X = "px-[var(--space-3)]"`
         and `CardContent` still spends it BY IDENTIFIER. The boxed card's
         inset did not move, and a later edit that quietly moved it would be
         Ruling 2 undone from the other side.
     2 · `screen-shell.tsx` declares `SHELL_CONTENT_INSET_X` reading
         `px-[var(--space-6)]` - the client's own chosen number for the
         pane's sides, 21 Sep 2026.
     3 · `DENSITY_BODY` is built on that identifier at both densities.
     4 · `DENSITY_TRAIL` is built on the SAME identifier (pinned further up
         this file), which is the equality that actually matters now: the
         pane's two seams, its sides and the trail above it, read one
         constant, so the h1, the table's first cell and the trail's arrows
         cannot drift apart. */
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
// Order, not an exact literal: "min-w-0 flex-1", then CARD_CONTENT_INSET_Y,
// then CARD_CONTENT_INSET_X, then (v1.2.145, the `plain` variant) whatever
// group-data overrides that variant needs, with `className` still last so a
// caller's own override still wins over all of it. The three identifiers'
// own order is what Ruling 2 actually pins; the classes a later variant adds
// in between are that variant's business, not this check's.
const cardContentBody = cardSrc.slice(
  cardSrc.indexOf("const CardContent = React.forwardRef"),
  cardSrc.indexOf("CardContent.displayName"),
);
if (
  !/cn\(\s*"min-w-0 flex-1",\s*CARD_CONTENT_INSET_Y\[inset\],\s*CARD_CONTENT_INSET_X,[\s\S]*?className,\s*\)/.test(
    cardContentBody,
  )
) {
  insetFindings.push(
    `${cardRel}'s CardContent does not spend CARD_CONTENT_INSET_X for its own left/right padding, in order, ` +
      "ahead of className: a literal px-[...] here would silently stop matching what DENSITY_BODY reads.",
  );
}
// The `inset` prop (added for a compact CardContent body) must leave the
// DEFAULT vertical rhythm exactly where Ruling 2 measured it — the same
// "py-6 lg:py-[var(--space-7)]" figure this check has always pinned, now
// read through CARD_CONTENT_INSET_Y_DEFAULT rather than inlined.
if (!/const CARD_CONTENT_INSET_Y_DEFAULT = "py-6 lg:py-\[var\(--space-7\)\]";/.test(cardSrc)) {
  insetFindings.push(
    `${cardRel} does not read CARD_CONTENT_INSET_Y_DEFAULT = "py-6 lg:py-[var(--space-7)]" — the ` +
      "inset=\"default\" vertical rhythm Ruling 2 measured must stay exactly this figure.",
  );
}

/* THE PANE'S OWN CONSTANT, DECLARED IN THIS FILE RATHER THAN IMPORTED SINCE
   21 SEP 2026 - see this block's own header. The value is pinned, not just
   the name: `--space-6` is the number the client chose out loud ("the same
   spacing thats now before the footer i want above nav and on sides"), and a
   later edit that moved it should have to come back here and say so. */
if (!/const SHELL_CONTENT_INSET_X = "px-\[var\(--space-6\)\]";/.test(src)) {
  insetFindings.push(
    `${rel} does not declare SHELL_CONTENT_INSET_X = "px-[var(--space-6)]" - the pane's own gutter, ruled ` +
      "21 Sep 2026, and the one constant DENSITY_BODY and DENSITY_TRAIL must both be built on.",
  );
}
/* AND THE OLD IMPORT MUST BE GONE. Leaving it behind would be the exact
   failure the split was made to avoid: two constants in scope, both
   plausible, and nothing saying which of the pane's seams reads which. */
if (/import \{ CARD_CONTENT_INSET_X \} from "\.\.\/\.\.\/components\/card\/card";/.test(src)) {
  insetFindings.push(
    `${rel} still imports CARD_CONTENT_INSET_X - the pane's inset is SHELL_CONTENT_INSET_X since 21 Sep 2026, ` +
      "and a second inset constant in scope here is how the two seams drift apart again.",
  );
}
const DENSITY_BODY_PATTERN =
  /const DENSITY_BODY: Record<ScreenDensity, string> = \{\s*comfortable: cn\(SHELL_CONTENT_INSET_X, "py-\[var\(--space-5\)\] lg:py-\[var\(--space-6\)\]"\),\s*calm: cn\(SHELL_CONTENT_INSET_X, "py-\[var\(--space-4\)\] lg:py-\[var\(--space-5\)\]"\),\s*\};/;
if (!DENSITY_BODY_PATTERN.test(src)) {
  insetFindings.push(
    `DENSITY_BODY in ${rel} does not build both densities from cn(SHELL_CONTENT_INSET_X, "py-…") - ` +
      "the pane's own constant must be the sole horizontal inset, at both densities, with vertical rhythm unchanged.",
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
  "OK screen-shell content-inset check: card.tsx exports CARD_CONTENT_INSET_X (px-[var(--space-3)]) and " +
    "CardContent spends it, so the boxed card's body inset did not follow the pane; screen-shell.tsx declares " +
    "SHELL_CONTENT_INSET_X (px-[var(--space-6)]), no longer imports the card's, and DENSITY_BODY spends the " +
    "shell's own constant at both densities.",
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
   the SAME constant `DENSITY_BODY` already reads (checked above), not a
   second copy of `DENSITY_HEADER`'s larger figure and not a hand-typed
   literal that merely matches it today. Checked as a declaration-plus-usage
   pair, the same standard the content-inset check above holds
   `DENSITY_BODY` to, so the trail's left edge and the body's own left edge
   cannot drift apart independently again.

   THAT CONSTANT IS `SHELL_CONTENT_INSET_X` SINCE 21 SEP 2026, AND THE
   MEASUREMENT ABOVE IS HISTORY RATHER THAN A TARGET. The 21 Sep air ruling
   moved the pane's gutter from `--space-3` to `--space-6` and split it away
   from `card.tsx`'s own export, so both figures in the 231-against-223 line
   above are now stale; what this check is FOR is unchanged, and is the only
   thing it ever pinned - the two seams read one name. See
   `screen-shell.tsx`'s `SHELL_CONTENT_INSET_X` comment. */
const trailInsetParityFindings = [];

if (!/const DENSITY_TRAIL: Record<ScreenDensity, string> = \{\s*comfortable: cn\(SHELL_CONTENT_INSET_X,/.test(src)) {
  trailInsetParityFindings.push(
    `DENSITY_TRAIL in ${rel} does not build its px from cn(SHELL_CONTENT_INSET_X, …) - the trail slot's own ` +
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
      "shell's own inset constant specifically so the trail and the body inset cannot drift apart.",
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
  "OK screen-shell trail/body inset-parity check: DENSITY_TRAIL builds its px from the same " +
    "SHELL_CONTENT_INSET_X constant DENSITY_BODY spends, so the trail field's left edge and the title/chip left " +
    "edge cannot drift apart (measured live: 231px vs 223px before the 18 Sep fix; the constant itself moved to " +
    "--space-6 on 21 Sep, which moves both seams together by construction).",
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
  /const DENSITY_RAIL: Record<ScreenDensity, string> = \{\s*comfortable: `\[--rail-inset:var\(--space-2h\)\] \[--rail-width:\$\{DENSITY_RAIL_WIDTH_CALC\}\]`,\s*calm: `\[--rail-inset:var\(--space-2h\)\] \[--rail-width:\$\{DENSITY_RAIL_WIDTH_CALC\}\]`,\s*\};/;
if (!DENSITY_RAIL_PATTERN.test(src)) {
  railGutterFindings.push(
    `DENSITY_RAIL in ${rel} does not read the 18 Sep ruling's halved [--rail-inset:var(--space-2h)] (10px, half ` +
      "of the old --space-5/20px) at both densities, built from the one shared DENSITY_RAIL_WIDTH_CALC template " +
      "so the two densities cannot disagree on --rail-width either.",
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
   THE 19 SEP 2026 RAIL-WIDTH-FROM-LABEL CHECK — Aurora, verbatim: "can we
   make sidebar less wide? assume knowledge will be the longest word there."

   `RAIL_WIDTH` used to be a flat literal, `"13rem"`, with nothing tying it
   to what the rail draws. It is now `"var(--rail-width)"`, a `calc()` of
   the row's own tokens (`--rail-inset` twice, `--space-3` twice,
   `--icon-button`, `--space-2`) plus `--rail-label-ch` (tokens.css) —
   "Knowledge" measured once, at the row's own `--text-sm`/medium/0em
   cascade, and pinned as a rem. FOUR THINGS PINNED, each guarding a
   different way the derivation could quietly rot back into a bare number:
   (1) `RAIL_WIDTH` itself reads the custom property, not a literal; (2) the
   rail dock reads `w-[var(--rail-width)]`, not `w-[13rem]`; (3) no bare
   `13rem`/`208px` remains anywhere in this file as a rail measure (the one
   exception, `verify/shell-chat/before-shell.tsx`'s own frozen `RAIL_WIDTH`,
   is a different file entirely and is not read here); (4) `tokens.css`
   still carries the pinned `--rail-label-ch` the calc depends on. A fifth
   guard lives in `rail.tsx`'s own check, further down this file: the
   label/heading/member spans this width was sized against still carry
   `truncate`, so a label LONGER than "Knowledge" degrades instead of
   forcing the column wider again. */
const railWidthFindings = [];

if (!/export const RAIL_WIDTH = "var\(--rail-width\)";/.test(src)) {
  railWidthFindings.push(
    `${rel}'s RAIL_WIDTH is not "var(--rail-width)" — a re-introduced literal (e.g. "13rem") would silently stop ` +
      "tracking the label/token derivation DENSITY_RAIL computes.",
  );
}

if (!/"flex w-\[var\(--rail-width\)\] min-h-0 flex-none flex-col"/.test(src)) {
  railWidthFindings.push(
    `${rel}'s rail dock does not read w-[var(--rail-width)] on [data-slot="screen-shell-rail"] — the column would ` +
      "stop tracking RAIL_WIDTH's own value even if the exported constant were still correct.",
  );
}

if (/w-\[13rem\]|w-\[208px\]/.test(src)) {
  railWidthFindings.push(
    `${rel} still contains a bare w-[13rem] or w-[208px] — the rail's expanded width must come from ` +
      "var(--rail-width) everywhere it is read, not from a re-typed literal beside it.",
  );
}

const railWidthTokensPath = path.join(HERE, "..", "..", "foundations", "tokens", "tokens.css");
const railWidthTokensSrc = fs.readFileSync(railWidthTokensPath, "utf8");
if (!/--rail-label-ch:\s*4\.5rem;/.test(railWidthTokensSrc)) {
  railWidthFindings.push(
    "tokens.css does not pin --rail-label-ch: 4.5rem — the measured-and-rounded 'Knowledge' width DENSITY_RAIL's " +
      "--rail-width calc depends on.",
  );
}

/* THE 19 SEP 2026 CORRECTION, SAME DAY — the label alone under-sized the
   rail against the brand mark (`--icon-28`'s logotype, `rail.tsx`'s
   `MARK_STEP`) and pushed it into its own `max-w-full` shrink, undoing
   Aurora's "make the logo bigger" rulings. `--rail-width` is now `max()` of
   the label's own floor and the mark's natural-width floor — pinned so
   neither floor can quietly drop back to a single sum. */
if (!/--brand-lockup-w:\s*8\.75rem;/.test(railWidthTokensSrc)) {
  railWidthFindings.push(
    "tokens.css does not pin --brand-lockup-w: 8.75rem — the mark's own natural-width floor DENSITY_RAIL's " +
      "--rail-width max() depends on, so the rail can no longer shrink the brand mark to fit a narrow label.",
  );
}

if (
  !/const DENSITY_RAIL_WIDTH_CALC = `max\(\$\{RAIL_WIDTH_LABEL_FLOOR\},\$\{RAIL_WIDTH_MARK_FLOOR\}\)`;/.test(src)
) {
  railWidthFindings.push(
    `${rel}'s DENSITY_RAIL_WIDTH_CALC is not max(RAIL_WIDTH_LABEL_FLOOR, RAIL_WIDTH_MARK_FLOOR) — a --rail-width ` +
      "built from the label sum alone would re-open the brand-mark shrink this check exists to prevent.",
  );
}

if (!/var\(--brand-lockup-w\)/.test(src)) {
  railWidthFindings.push(
    `${rel} does not read var(--brand-lockup-w) anywhere — RAIL_WIDTH_MARK_FLOOR would not be sizing the rail to ` +
      "the mark's own natural width.",
  );
}

if (railWidthFindings.length > 0) {
  console.error(
    "FAIL screen-shell rail-width-from-label check (19 Sep ruling, corrected same day):\n" +
      railWidthFindings.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  "OK screen-shell rail-width-from-label check: RAIL_WIDTH reads var(--rail-width), the rail dock's own column " +
    "reads w-[var(--rail-width)], no bare 13rem/208px rail literal remains, --rail-width is max() of the label's " +
    "own floor and the brand mark's natural-width floor, and tokens.css still pins the measured --rail-label-ch " +
    "and --brand-lockup-w both floors are built from.",
);

/* THE FIFTH GUARD, ON rail.tsx ITSELF — --rail-width is sized to fit exactly
   "Knowledge" (Aurora's own worst case). Any label ACTUALLY longer than that
   — another language's word, an application's own vocabulary — must degrade
   by ellipsis, never by reflowing the row or pushing the rail wider again.
   So every text run --rail-width was sized against (the destination's own
   label, the group heading, the member chip's name) must keep `truncate`
   inside a `min-w-0` ancestor — the pairing Tailwind's own overflow model
   requires (a flex child needs `min-w-0` before `truncate`'s `overflow:
   hidden` has a constrained box to clip against at all). */
const railTruncateFindings = [];

if (!/<span className="min-w-0 flex-1 truncate">\{item\.label\}<\/span>/.test(railSrc)) {
  railTruncateFindings.push(
    `${railRel}'s nav item label no longer reads <span className="min-w-0 flex-1 truncate">{item.label}</span> — ` +
      "a label longer than the --rail-width the kit derives from \"Knowledge\" would reflow the row instead of " +
      "eliding.",
  );
}

if (!/<span className="min-w-0 truncate">\{group\.heading\}<\/span>/.test(railSrc)) {
  railTruncateFindings.push(
    `${railRel}'s group heading no longer reads <span className="min-w-0 truncate">{group.heading}</span>.`,
  );
}

if (
  !/className="min-w-0 flex-1 truncate font-\[var\(--font-weight-medium\)\] text-\[var\(--spine-member-ink\)\]"/.test(
    railSrc,
  )
) {
  railTruncateFindings.push(`${railRel}'s member chip name no longer truncates inside a min-w-0 box.`);
}

if (railTruncateFindings.length > 0) {
  console.error(
    "FAIL rail truncate-under-narrower-width check (19 Sep ruling):\n" +
      railTruncateFindings.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  "OK rail truncate-under-narrower-width check: the nav item label, the group heading and the member chip's name " +
    "all still truncate inside a min-w-0 box, so a label longer than \"Knowledge\" elides instead of forcing " +
    "--rail-width wider or reflowing the row.",
);

/* ============================================================================
   THE 20 SEP 2026 ASSISTANT-HANDLE-MATCHES-RAIL-HANDLE CHECK — REWRITES,
   NOT EXTENDS, THE RETIRED 18 SEP ASSISTANT-HANDLE-IN-THE-BAND CHECK.
   Client, verbatim: "make the open assistant mango button same size as the
   one on the sidebar to compress/open the sidebar."

   THE TWO 18 SEP RULINGS THIS REPLACES sized the SHUT aside handle to fit
   its own 16px-to-card-top band -- first --control-height-pill (26px,
   "not overlapping with main content"), then --folder-lip (30.48px, "as
   big as the space allows it") -- both spent as a size-[...] override on
   that one branch, winning the cn() merge against HANDLE_HIT's own
   default. Today's ruling asks for a DIFFERENT thing: this handle need not
   fit its own band at all, it must equal the rail's own handle
   (edge="rail"), which has never carried a size override and has always
   read HANDLE_HIT's own size-[var(--control-height-button)] (40px). The
   two pins cannot both hold -- fit-the-band caps the shut handle below
   40px, match-the-rail requires exactly 40px -- so this check replaces the
   retired one rather than sitting beside it.

   MEASURED, agency-staging, a ticket record, 1440 viewport: BEFORE this
   fix, edge="rail" was 40x40 (--control-height-button) at (144, 850) and
   the shut edge="aside" was 30.47x30.47 (--folder-lip) at (1378.5, 16) --
   the two edge handles disagreeing by exactly the token the 18 Sep rulings
   had left on the aside branch alone. AFTER: both 40x40, because the
   override is gone and both edges now read the identical HANDLE_HIT
   default -- "unify on one constant" literally, not a third hand-typed
   number chosen to match the rail's by coincidence. */
const assistantHandleFindings = [];

// THE SHUT BRANCH CARRIES NO SIZE OVERRIDE OF ITS OWN ANY MORE -- neither
// retired rung (26px pill, 30.48px folder-lip) and no third value either.
// HANDLE_HIT's own default is what must size it, so nothing in this
// component's own placement string may spend a size-[...] utility at all.
const assistantHandleBlock = src.match(
  /placement=\{cn\(\s*"pointer-events-auto",\s*isAsideOpen[\s\S]{0,4000}?\n {16}\)\}/,
);
if (!assistantHandleBlock) {
  assistantHandleFindings.push(
    `${rel} has no recognisable aside-handle placement={cn("pointer-events-auto", isAsideOpen ? ... : ...)} block to check.`,
  );
} else if (/size-\[var\(--folder-lip\)\]/.test(assistantHandleBlock[0])) {
  assistantHandleFindings.push(
    `${rel}'s aside handle placement still reads size-[var(--folder-lip)] -- the 20 Sep "same size as the ` +
      'sidebar" ruling retired the 18 Sep band-fill sizing outright; the shut branch must carry no size ' +
      "override at all and fall through to HANDLE_HIT's own size-[var(--control-height-button)].",
  );
} else if (/size-\[var\(--control-height-pill\)\]/.test(assistantHandleBlock[0])) {
  assistantHandleFindings.push(
    `${rel}'s aside handle placement still reads size-[var(--control-height-pill)] -- the first, even smaller ` +
      "18 Sep rung must stay gone too.",
  );
} else if (/size-\[var\(/.test(assistantHandleBlock[0])) {
  assistantHandleFindings.push(
    `${rel}'s aside handle placement spends a size-[var(...)] utility of some other kind -- the 20 Sep ruling ` +
      "is that this handle takes HANDLE_HIT's own default, not a third hand-picked size.",
  );
}

// BOTH BRANCHES (open mid-edge grab, shut top-strip corner) MUST STILL BE
// THE INSET-ONLY STRINGS THEY WERE BEFORE EITHER 18 SEP RULING -- the fix is
// a deletion, not a rewrite of the insets themselves.
if (
  !/isAsideOpen\s*\n\s*\? "max-\[45rem\]:hidden top-1\/2 -translate-y-1\/2 end-\[var\(--shell-gutter\)\]"\s*\n\s*: "max-md:hidden top-\[var\(--shell-gutter\)\] end-\[var\(--shell-gutter\)\]",/.test(
    src,
  )
) {
  assistantHandleFindings.push(
    `${rel}'s aside handle open/shut insets no longer match the expected "isAsideOpen ? ... : ..." pair, each a ` +
      "bare inset string with no trailing size utility.",
  );
}

// THE RAIL'S OWN HANDLE STAYS UNTOUCHED -- no size override there either,
// today or before; it is the reference the aside handle now matches.
if (/edge="rail"\s*\n\s*open=\{!isRailCollapsed\}[\s\S]{0,2000}?size-\[var\(/.test(src)) {
  assistantHandleFindings.push(
    `${rel}'s rail handle (edge="rail") now reads a size-[var(...)] override of its own -- it must stay the ` +
      "reference size (HANDLE_HIT's own default), unchanged by this ruling.",
  );
}

if (assistantHandleFindings.length > 0) {
  console.error(
    "FAIL screen-shell assistant-handle-matches-rail-handle check (20 Sep ruling):\n" +
      assistantHandleFindings.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  "OK screen-shell assistant-handle-matches-rail-handle check: the shut aside handle carries no size-[...] " +
    "override of its own (neither retired 18 Sep rung, --control-height-pill nor --folder-lip), the rail " +
    "handle carries none either, and both edge handles fall through to the identical HANDLE_HIT default " +
    "(size-[var(--control-height-button)], 40px) -- measured live, both 40x40 -- so a future density-scale " +
    "change can never move one without the other.",
);

/* ============================================================================
   THE 18 SEP 2026 RAIL-BRAND-ALIGNMENT CHECK, REWRITTEN THE SAME DAY —
   client ruling, verbatim: "on the sidebar tge logo is way too up!!! make it
   aligned with text on foler tabs."

   THE FIRST FIX (v1.2.121, the check this replaces) computed a CENTRE:
   `mt-[calc(var(--shell-gutter) + var(--folder-lip)/2 - var(--icon-20)/2 -
   var(--rail-inset))]`. MEASURED at this kit's own 15px harness root it held
   — 0.52px off the active tab's label centre — but the live app reported
   8.65px off at 16px root, a residual that should not exist if every term in
   a rem-based calc scales with the root the way the other three did. The
   difference was `--icon-20`: the formula's THIRD term stood in for "the
   mark's own rendered height", which is a fact about `Logotype`/`Isotype`
   and `MARK_STEP`, not a fact about the tab strip band it was reaching for
   — so the fix was only ever as good as that assumption holding, on every
   consumer, forever.

   THE REWRITE BUILDS A BAND, NOT A CENTRE, AND THE CHECK NOW PINS THE BAND.
   `--strip-row` (tokens.css, aliased to `--folder-lip`) names the box the
   tab strip's own label already centres inside; `rail-brand` now takes
   `h-[var(--strip-row)]` and relies on its own pre-existing `items-center`
   to centre the mark inside that box, however tall the mark renders. The
   only calc left, `mt-[calc(var(--shell-gutter) - var(--rail-inset))]`,
   moves the box's top edge from where `RAIL_COLUMN`'s ambient padding parks
   it to `--shell-gutter` below the shared top edge — the same two box-model
   tokens `screen-shell.tsx`'s own assistant handle reaches for
   (`top-[var(--shell-gutter)] size-[var(--folder-lip)]`) with none of the
   mark's own geometry mixed in.

   MEASURED, `verify/shell-chrome/` (1440×900), AFTER THIS REWRITE, AT BOTH
   ROOTS THE FIRST FIX DISAGREED ON: 0.53px at the kit's 15px harness root,
   0.59px at the live app's 16px root (tab label centre 30.64px, matching the
   app measurement in the brief exactly) — both sub-pixel, both close to
   IDENTICAL, which is the actual proof: a fix whose residual does not move
   with the root is bound to the band by construction rather than by a
   coincidence at one root size. */
const railBrandFindings = [];

// 10000, not 8000: the v1.2.123 fix's own comment (the CSS-strut diagnosis,
// quoted from CHANGELOG.md) pushed the block past the cap v1.2.122 sized for
// — raised again for the same reason, not a new one.
const RAIL_BRAND_BLOCK = /data-slot="rail-brand"[\s\S]{0,400}?className=\{cn\(([\s\S]{0,10000}?)\)\}/;
const railBrandMatch = railSrc.match(RAIL_BRAND_BLOCK);
if (!railBrandMatch) {
  railBrandFindings.push(`${railRel} does not have a data-slot="rail-brand" block with a cn(...) className to check.`);
} else {
  if (!/mt-\[calc\(var\(--shell-gutter\)_-_var\(--rail-inset\)\)\]/.test(railBrandMatch[1])) {
    railBrandFindings.push(
      `${railRel}'s rail-brand block does not read the band's top-offset calc (mt-[calc(var(--shell-gutter) - ` +
        "var(--rail-inset))]) — the logo's own box would no longer start where the tab strip's own band starts.",
    );
  }
  if (!/h-\[var\(--strip-row\)\]/.test(railBrandMatch[1])) {
    railBrandFindings.push(
      `${railRel}'s rail-brand block does not read h-[var(--strip-row)] — the logo's own box would no longer ` +
        "share the tab strip's row height, and centring inside it would go back to being computed from the " +
        "mark's own rendered height (--icon-20) instead of falling out of the box the browser already centres it in.",
    );
  }
  // THE REGRESSION THIS REPLACES A CENTRE-CALC TO GUARD AGAINST: the old
  // four-token formula reappearing (directly, or copy-pasted onto a related
  // consumer) is the exact fragility this rewrite exists to retire.
  if (/var\(--icon-20\)\/2_-_var\(--rail-inset\)/.test(railBrandMatch[1])) {
    railBrandFindings.push(
      `${railRel}'s rail-brand block still reads the retired --icon-20-dependent centre calc — the alignment ` +
        "would again depend on the mark's own rendered height staying in step with a token it does not read.",
    );
  }
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

// THE SHARED TOKEN'S OTHER HALF: a consumer reading --strip-row is only
// "the same band as the tab strip" while --strip-row itself is still the tab
// strip's own lip measurement, and never a second, independently-tunable
// number. Pinned in tokens.css directly (`compositions/templates/rail.tsx`
// has no view of `foundations/tokens/tokens.css`), read here off disk.
const tokensPath = path.join(HERE, "..", "..", "foundations", "tokens", "tokens.css");
const tokensSrc = fs.readFileSync(tokensPath, "utf8");
if (!/--strip-row:\s*var\(--folder-lip\)/.test(tokensSrc)) {
  railBrandFindings.push(
    "foundations/tokens/tokens.css does not declare --strip-row: var(--folder-lip) — the rail brand row and " +
      "the workspace tab strip would no longer share one row-height token, and a future change to the tab " +
      "strip's own band would not carry to the rail by construction any more.",
  );
}

// v1.2.123 — THE BAND WAS STILL 2.9px OFF, LIVE, INSIDE A CALLER'S <button>.
// items-center correctly centres whatever box a direct child occupies; a
// non-flex wrapper (kwapso_system's click-to-home <button>) picks up a CSS
// line-box "strut" around its own single child that inflates ITS box by a
// few pixels, all on one side, and items-center then centres THAT box
// rather than the artwork inside it. The fix makes every direct child of
// rail-brand its own flex container — the one formatting context a strut
// cannot form inside — so no wrapper a caller reaches for can reopen this,
// the same "ask nothing of the caller" standard the band itself is held to.
if (railBrandMatch && !/\[&>\*\]:flex/.test(railBrandMatch[1])) {
  railBrandFindings.push(
    `${railRel}'s rail-brand block does not force every direct child into its own flex container ` +
      "([&>*]:flex) — a caller's non-flex mark wrapper (a bare <button>, e.g. kwapso_system's click-to-home " +
      "handle) would pick up a CSS line-box strut around its own child and the artwork inside it would drift " +
      "back off the row's true centre, exactly the live 2.9px this fix closed.",
  );
}
if (railBrandMatch && !/\[&>\*\]:items-center/.test(railBrandMatch[1])) {
  railBrandFindings.push(
    `${railRel}'s rail-brand block forces every direct child to flex ([&>*]:flex) but not to centre its own ` +
      "content ([&>*]:items-center) — a flexed wrapper with no cross-axis alignment of its own defaults to " +
      "stretch, not centre, which reopens the same drift the strut fix exists to close.",
  );
}

if (railBrandFindings.length > 0) {
  console.error(
    "FAIL rail-brand alignment check (18 Sep ruling, v1.2.122/123 rewrite):\n" +
      railBrandFindings.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  "OK rail-brand alignment check: rail-brand shares --strip-row (== --folder-lip) as its own height with the " +
    "workspace tab strip's label band, top-offset by mt-[calc(var(--shell-gutter) - var(--rail-inset))] and " +
    "centred by its own items-center — measured live in verify/shell-chrome: 0.53px residual at the kit's " +
    "15px harness root, 0.59px at the live app's 16px root (tab label centre 30.64px, matching the brief) — " +
    "and every direct child is forced into its own flex container ([&>*]:flex items-center), so a caller's " +
    "non-flex mark wrapper (a <button>, an <a>) cannot reopen the strut-induced drift v1.2.123 closed.",
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

/* ============================================================================
   THE 2026-09-19 ASIDE-SCRIM-COVERS-THE-WHOLE-OVERLAY-RANGE CHECK. A
   narrow-sweep audit (1440/1024/760, every screen) found the aside's overlay
   and its scrim answering to two DIFFERENT numbers: the dock itself becomes
   an overlay below `lg` (`max-lg:absolute max-lg:inset-y-0 max-lg:end-0`,
   argued at length above that block), but the scrim only painted below
   `45rem` (720px) — the SHEET's own, unrelated breakpoint. Between 720 and
   1024 the overlay sat on the card, and on open dialogs, with nothing behind
   it dimmed and nothing blocking a click through to them (evidence: a
   raise-ticket dialog painted UNDER the assistant overlay at 760 wide).

   Fixed by construction rather than by adding a second number: the scrim now
   mounts on the exact same `max-lg:` condition the dock's own overlay switch
   uses, and it is `fixed inset-0` rather than `absolute inset-0` so it covers
   the true viewport regardless of how narrow the dock's own box is between
   720 and 1024 (the dock only earns `start-0` — full-bleed — below `45rem`,
   which is the sheet's own geometry and is untouched by this fix). Measured
   live in `verify/shell-chrome` (`?aside=open`) before shipping this check:
   at 760/900/1000 wide the scrim is `position: fixed`, `display: block`,
   `getBoundingClientRect()` exactly the viewport, `pointer-events: auto`,
   backed by the same `charcoal 28%` `--scrim-drawer` token, and a click on it
   flips the dock's `data-state` to `shut`; at 1024 the scrim is `display:
   none` and the dock is back to `position: relative` (docked, not an
   overlay). Below `45rem` the rect is unchanged from before this fix — the
   dock box already spanned the viewport there, so `fixed inset-0` and the
   old `absolute inset-0` resolve to the same rectangle. */
const scrimFindings = [];

const SCRIM_BLOCK = /data-slot="screen-shell-aside-scrim"[\s\S]{0,300}?className=\{cn\(\s*([\s\S]*?)\)\}/;
const scrimMatch = src.match(SCRIM_BLOCK);

if (!scrimMatch) {
  scrimFindings.push(
    `${rel} does not have a data-slot="screen-shell-aside-scrim" element with a cn(...) className to check.`,
  );
} else {
  const scrimClasses = scrimMatch[1];

  if (!/"hidden max-lg:block"/.test(scrimClasses)) {
    scrimFindings.push(
      `${rel}'s aside scrim does not mount on "hidden max-lg:block" — the scrim must answer to the SAME ` +
        "breakpoint the dock's own overlay switch uses (max-lg:absolute, argued on the dock above), not a " +
        "second, independently-chosen number.",
    );
  }

  if (/max-\[45rem\]:block/.test(scrimClasses)) {
    scrimFindings.push(
      `${rel}'s aside scrim still reads max-[45rem]:block — that is the SHEET's own breakpoint, not the ` +
        "overlay's, and gating the scrim to it reopens the 720-1024 gap where the overlay sits over the card " +
        "and any open dialog with nothing dimmed and nothing blocking a click through to them.",
    );
  }

  if (!/"fixed inset-0"/.test(scrimClasses)) {
    scrimFindings.push(
      `${rel}'s aside scrim is not "fixed inset-0" — an "absolute inset-0" scrim is confined to the dock's own ` +
        "box, which is only as wide as the column between 45rem and lg (it earns start-0/full-bleed only below " +
        "45rem), so it would dim a strip rather than \"everything behind\" the overlay.",
    );
  }
}

if (!/max-lg:absolute max-lg:inset-y-0 max-lg:end-0 max-lg:z-\[3\]/.test(src)) {
  scrimFindings.push(
    `${rel}'s aside dock no longer reads max-lg:absolute max-lg:inset-y-0 max-lg:end-0 max-lg:z-[3] — this is ` +
      "the one constant (`lg`) the scrim check above assumes the scrim is matching; if this dock expression " +
      "changes breakpoint, the scrim's own max-lg: must move with it.",
  );
}

if (scrimFindings.length > 0) {
  console.error("FAIL aside-scrim overlay-range check:\n" + scrimFindings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK aside-scrim overlay-range check: the scrim mounts on max-lg:, the same constant the dock's own " +
    "docking-to-overlay switch uses, is fixed inset-0 so it covers the true viewport (not just the dock's own " +
    "box) everywhere between 720 and 1024, and the old max-[45rem]: gate is gone.",
);

/* ============================================================================
   THE 2026-09-19 RAIL-NAV-SCROLLS-ABOVE-THE-FOOT CHECK. The same narrow-sweep
   audit's second finding: at 1024x768 a rail with more entries than fit
   showed its last row half hidden behind the profile card. `verify/rail-
   foot`'s own long register, measured live at 1024x768 in both rail states
   before this check was written: `rail-nav` already read `min-h-0 flex-1
   overflow-y-auto` (the 2026-09-02 fix for the same class of bug — the foot
   travelling with the list — argued at length in rail.tsx above), and
   scrolling it to its end put the last row fully inside the viewport with
   zero rect intersection against `rail-member`. The one thing that had not
   shipped is pinned here: the platform's own scrollbar, which nothing else
   in this column draws, hidden with the same pair `tabs.tsx`'s strip and
   `breadcrumb-folders.tsx`'s trail already use — a paint change, not an
   `overflow` one, so wheel/touch/keyboard scrolling are untouched. */
const railNavFindings = [];

const RAIL_NAV_BLOCK = /data-slot="rail-nav"[\s\S]{0,120}?className=\{cn\(\s*([\s\S]*?)\)\}/;
const railNavMatch = railSrc.match(RAIL_NAV_BLOCK);

if (!railNavMatch) {
  railNavFindings.push(
    `${railRel} does not have a data-slot="rail-nav" element with a cn(...) className to check.`,
  );
} else {
  const railNavClasses = railNavMatch[1];

  if (!/\bmin-h-0\b/.test(railNavClasses) || !/\bflex-1\b/.test(railNavClasses) || !/\boverflow-y-auto\b/.test(railNavClasses)) {
    railNavFindings.push(
      `${railRel}'s rail-nav does not read min-h-0, flex-1 and overflow-y-auto together — without all three the ` +
        "nav floors at its content height (flex's own min-height:auto default) and cannot scroll, so a rail with " +
        "more entries than fit pushes the foot (the collapse toggle and the profile card) off the bottom instead " +
        "of scrolling under it, and the last row can sit behind the card.",
    );
  }

  if (!/\[scrollbar-width:none\]/.test(railNavClasses) || !/\[&::-webkit-scrollbar\]:hidden/.test(railNavClasses)) {
    railNavFindings.push(
      `${railRel}'s rail-nav does not hide its own scrollbar ([scrollbar-width:none] [&::-webkit-scrollbar]:` +
        "hidden, the kit's own pair from tabs.tsx/breadcrumb-folders.tsx) — this column draws no other bar " +
        "(background-color: transparent, measured in verify/rail-foot), so the platform's default bar reads as " +
        "a second edge over the last row.",
    );
  }
}

if (railNavFindings.length > 0) {
  console.error("FAIL rail-nav scroll-above-the-foot check:\n" + railNavFindings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK rail-nav scroll-above-the-foot check: rail-nav reads min-h-0 flex-1 overflow-y-auto (both rail states — " +
    "the classes are unconditional, not gated on isCollapsed) with its own scrollbar hidden — measured live in " +
    "verify/rail-foot at 1024x768: last row fully visible after scrolling, zero intersection with rail-member, " +
    "in both the expanded and collapsed rail.",
);

/* ============================================================================
   THE 2026-09-19 A-STATUS-CHIP-IS-A-CHIP REBIND CHECK — CLIENT RULING,
   VERBATIM: "chips and pills always must have the background card or shape
   wherever they are. In this case, I'm talking inside ticket-related
   stories. The type of ticket and the status need the card to have a
   background." `badge.tsx` closed its own half of this ruling (`status` now
   reads `--badge-quiet-fill`, `check-badge.mjs` §1b pins it) but the token it
   reads is only as good as what rebinds it, and nothing did: `screen-shell
   .tsx`, `collection-frame.tsx`, `record-detail.tsx` and `toolbar-row.tsx`
   each carried a local `[--pill-fill:…]` (or, for `toolbar-row.tsx`, a
   comment CLAIMING a rebind that tokens.css §8 never actually carried) tuned
   for the status pill's OLD property name — a no-op the moment `Badge`
   stopped reading it. `card.tsx` carried none at all, which is the exact
   defect her report describes: a `default` Card nested inside a `BODY` that
   had already rebound the (old) token to the SAME soft-paper value as the
   card's own ground.

   EVERY CHECK BELOW IS POSITIVE (the new property, at the SAME value the old
   one carried) AND NEGATIVE (the old bracket rebind is gone), the same two-
   sided shape `check-badge.mjs` §1b already holds itself to — a rename that
   only added the new line and left the old one behind would still leave two
   properties disagreeing about a ground nobody asks Badge to read any more. */
const badgeQuietFillFindings = [];

// screen-shell.tsx — SCREEN (the spine), CARD and BODY (the raised level).
if (!/\[--badge-quiet-fill:var\(--spine-chip-fill\)\]/.test(src)) {
  badgeQuietFillFindings.push(
    `${rel}'s SCREEN constant does not rebind [--badge-quiet-fill:var(--spine-chip-fill)] — a Badge standing ` +
      "directly on the spine (the rail's own member chip aside, anything else a route renders on the ground) " +
      "would read no rebind at all and fall through to Badge's own flat --surface-quiet fallback, which is not " +
      "spine-aware (paper/ink/mango each want a different chip tone — tokens.css §7b).",
  );
}
const screenShellBadgeQuietFillCount = (src.match(/\[--badge-quiet-fill:var\(--surface-panel\)\]/g) ?? []).length;
if (screenShellBadgeQuietFillCount < 2) {
  badgeQuietFillFindings.push(
    `${rel} does not carry [--badge-quiet-fill:var(--surface-panel)] on both CARD and BODY (found ` +
      `${screenShellBadgeQuietFillCount}) — both levels stand on --surface-raised and both used to rebind ` +
      "--pill-fill to soft paper for exactly this reason (ruling 01, this file's own header law).",
  );
}
if (/\[--pill-fill:/.test(src)) {
  badgeQuietFillFindings.push(
    `${rel} still carries a [--pill-fill:…] rebind — the 19 Sep 2026 ruling retired --pill-fill as the property ` +
      "Badge's status variant reads; every local rebind aimed at it is a no-op and must read --badge-quiet-fill " +
      "instead.",
  );
}

// card.tsx — one rebind per variant that paints its own ground, matching
// this file's own per-variant doc comment for the value and the reasoning.
const CARD_VARIANT_REBINDS = [
  ["default", /default:\s*"bg-surface-panel \[--badge-quiet-fill:var\(--surface-raised\)\]",/],
  ["raised", /raised:\s*"bg-card shadow-sm \[--badge-quiet-fill:var\(--surface-panel\)\]",/],
  ["brand", /brand:\s*"bg-surface-brand text-ink-on-accent \[--badge-quiet-fill:var\(--surface-brand-chip\)\]",/],
  [
    "inverse",
    /inverse:\s*"bg-surface-inverse text-ink-on-inverse \[--badge-quiet-fill:var\(--surface-record-footer-well\)\]",/,
  ],
];
for (const [name, pattern] of CARD_VARIANT_REBINDS) {
  if (!pattern.test(cardSrc)) {
    badgeQuietFillFindings.push(
      `${cardRel}'s ${name} variant does not carry its own [--badge-quiet-fill:…] rebind — the 19 Sep 2026 ` +
        "ruling's own reported case (a default Card nested inside a BODY that had already rebound the token to " +
        "the SAME value as the card's own ground) needs the rebind AT THE CARD, not only at the shell levels " +
        "above it, or a nested card keeps inheriting whatever its ancestor last set.",
    );
  }
}
if (/\[--pill-fill:/.test(cardSrc)) {
  badgeQuietFillFindings.push(`${cardRel} carries a [--pill-fill:…] rebind — see the screen-shell.tsx finding above for why this must read --badge-quiet-fill.`);
}

/* collection-frame.tsx - tone: "page", tone: "panel", and the panel's own
   two surfaces. FOUR SINCE 21 SEP 2026, not three: `collectionPanelVariants`
   stopped carrying its rebind in a base class list and now answers the
   question per surface, because a `paper` panel and a `plain` one stand on
   opposite grounds and a chip takes the other tone from each. The floor
   stays the assertion - every ground in this file rebinds, none is left to
   inherit whatever an ancestor happened to set. */
const collectionFrameBadgeQuietFillCount = (collectionFrameSrc.match(/\[--badge-quiet-fill:var\(--surface-(?:panel|page)\)\]/g) ?? []).length;
if (collectionFrameBadgeQuietFillCount < 4) {
  badgeQuietFillFindings.push(
    `${collectionFrameRel} does not carry four [--badge-quiet-fill:…] rebinds (tone: "page", tone: "panel", and ` +
      `collectionPanelVariants' surface: paper / surface: plain - found ${collectionFrameBadgeQuietFillCount}) - ` +
      "every one of them rebinds for the identical reason --btn-secondary-fill sits beside it, and a plain panel " +
      "needs its own because it paints no class §8 could key on.",
  );
}
if (/\[--pill-fill:/.test(collectionFrameSrc)) {
  badgeQuietFillFindings.push(`${collectionFrameRel} carries a [--pill-fill:…] rebind — see the screen-shell.tsx finding above.`);
}

// record-detail.tsx — the ink footer's own well, an object literal rather
// than a bracket class (inline style, not Tailwind), so it is checked as a
// quoted property key.
if (!/"--badge-quiet-fill":\s*"var\(--surface-record-footer-well\)",/.test(recordDetailSrc)) {
  badgeQuietFillFindings.push(
    `${recordDetailRel}'s ink footer does not rebind "--badge-quiet-fill": "var(--surface-record-footer-well)" — ` +
      "a status or secondary Badge inside the footer's own well would fall through to a property nothing on this " +
      "inverse ground sets any more.",
  );
}
if (/"--pill-fill":/.test(recordDetailSrc)) {
  badgeQuietFillFindings.push(`${recordDetailRel} still sets "--pill-fill" as an inline style property — rename it to "--badge-quiet-fill" (see the finding above).`);
}

// toolbar-row.tsx — ground: "page" and ground: "panel" each need their OWN
// rebind: unlike --btn-secondary-fill, --badge-quiet-fill is not one of
// tokens.css §8's class-keyed tokens (this file's own corrected comment
// explains why), so nothing rebinds it here for free off the bg- class alone.
if (!/page:\s*\["bg-surface-panel",\s*"\[--badge-quiet-fill:var\(--surface-raised\)\]"\],/.test(toolbarRowSrc)) {
  badgeQuietFillFindings.push(
    `${toolbarRowRel}'s ground: "page" does not carry its own [--badge-quiet-fill:var(--surface-raised)] — this ` +
      "token is not in tokens.css §8's class-keyed list (only --btn-secondary-fill and --surface-lift are), so a " +
      "Badge standing on this row reads no rebind at all without one written here directly.",
  );
}
if (!/panel:\s*\["bg-surface-raised",\s*"\[--badge-quiet-fill:var\(--surface-panel\)\]"\],/.test(toolbarRowSrc)) {
  badgeQuietFillFindings.push(
    `${toolbarRowRel}'s ground: "panel" does not carry its own [--badge-quiet-fill:var(--surface-panel)] — same ` +
      "reason as ground: \"page\", above.",
  );
}
if (/tokens\.css rebinds `--btn-secondary-fill` and `--pill-fill` off a LIST/.test(toolbarRowSrc)) {
  badgeQuietFillFindings.push(
    `${toolbarRowRel} still claims tokens.css §8 rebinds --pill-fill off its class-keyed list — it never did ` +
      "(only --btn-secondary-fill and --surface-lift are in that list); the comment was corrected 19 Sep 2026 and " +
      "must not regress.",
  );
}

if (badgeQuietFillFindings.length > 0) {
  console.error("FAIL badge-quiet-fill rebind check:\n" + badgeQuietFillFindings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK badge-quiet-fill rebind check: screen-shell.tsx's SCREEN/CARD/BODY, card.tsx's default/raised/brand/" +
    "inverse variants, collection-frame.tsx's tone: page/panel and both of its panel surfaces, record-detail.tsx's ink-footer " +
    "well, and toolbar-row.tsx's ground: page/panel all rebind --badge-quiet-fill to the surface one rung away " +
    "from their own ground — the 19 Sep 2026 ruling's five-file follow-up, plus the card.tsx rebind the ruling " +
    "actually reported — and no file still carries the old, now-inert --pill-fill rebind.",
);

/* ============================================================================
   THE 21 SEP 2026 AIR AND BOTTOM-EDGE CHECK - TWO CLIENT RULINGS, ONE DAY.

   HER WORDS, VERBATIM:
     · "the same spacing thats now before the footer i want above nav and on
        sides, bring more air"  (ruled to --space-6, 24)
     · "also implement the to the bottom edge for main content and assistant
        like in your previous artifact"
     · "also, make footer not inside a container, but the full row side to
        side (within the main content)"

   MEASURED BEFORE, ON T0001 AT 1440 BY 900: the window's top edge to the
   folder tab strip was 16 and the air before the black band was 24; the
   content column and the assistant's own outer edge both stopped 16px short
   of the viewport's bottom edge (confirmed again at 1991 by 842); the ink
   band sat inset 24 from both sides of the pane it stood in.

   SEVEN THINGS PINNED, each a different way one of the three could regress
   while the other two stayed green - which is the failure mode that matters
   here, because all three are one shape to a reader and three separate lines
   of code.
   ========================================================================= */
const airFindings = [];

/* 1 · THE TOP IS ITS OWN TOKEN, AT THE NUMBER SHE NAMED. A second token
   rather than a wider `--shell-gutter` because the shell gutter is also the
   measure between the rail and the card and between the card and the
   assistant, and the 21 Sep page keeps those at 16. */
if (
  !/const DENSITY_GUTTER_TOP: Record<ScreenDensity, string> = \{\s*comfortable: "\[--shell-gutter-top:var\(--space-6\)\]",\s*calm: "\[--shell-gutter-top:var\(--space-6\)\]",\s*\};/.test(
    src,
  )
) {
  airFindings.push(
    `${rel} does not declare DENSITY_GUTTER_TOP at [--shell-gutter-top:var(--space-6)] at both densities - ` +
      "the air above the nav row is the client's own 24, ruled 21 Sep 2026, and it is a separate token from " +
      "--shell-gutter precisely so widening it does not move the rail and assistant seams with it.",
  );
}
if (!/DENSITY_GUTTER_TOP\[density\],/.test(src)) {
  airFindings.push(`${rel} declares DENSITY_GUTTER_TOP but never spends it on the screen - the token is inert.`);
}

/* 2 · THE CONTENT COLUMN PAYS THE TOP AND NOTHING AT THE BOTTOM. `py-` here
   is the regression: it was what insets the card from the window's bottom
   edge as well as its top, and restoring it puts the mango ground back under
   the card's foot. */
if (!/"flex min-h-0 min-w-0 flex-1 flex-col pt-\[var\(--shell-gutter-top\)\]",/.test(src)) {
  airFindings.push(
    `${rel}'s content column does not read pt-[var(--shell-gutter-top)] with no bottom padding - a py- here ` +
      "insets the card from the window's BOTTOM edge too, which is the 21 Sep bottom-edge ruling undone.",
  );
}

/* 3 · THE ASSISTANT ENDS WHERE THE CARD ENDS, WHICH IS NOW THE WINDOW. The
   2026-09-04 ruling ("make it exactly as the main content") is kept by the
   two columns agreeing, and they now agree on zero. A `pb-` returning on the
   dock alone reopens the 2026-09-06 report from the other side. */
if (/data-slot="screen-shell-aside-dock"[\s\S]{0,4000}?pb-\[var\(--shell-gutter\)\]/.test(src)) {
  airFindings.push(
    `${rel}'s aside dock carries a pb-[var(--shell-gutter)] again - the content column pays no bottom gutter ` +
      "since 21 Sep 2026, so a dock that pays one makes the assistant end 16px above the card, which is " +
      'exactly the 2026-09-06 report ("assistant container is still not same length as main content").',
  );
}

/* 4 · THE TWO COLUMNS' TABS STILL START AT THE SAME y. This is the standing
   invariant `ASIDE_TAB`'s own comment states and `verify/shell-chat/` proves;
   it survives the air ruling only if the aside reads the SAME token the
   content column's top gutter now reads. */
if (!/const ASIDE_TAB = cn\("pt-\[var\(--shell-gutter-top\)\]"\);/.test(src)) {
  airFindings.push(
    `${rel}'s ASIDE_TAB does not read pt-[var(--shell-gutter-top)] - the content column's own top gutter moved ` +
      "to that token on 21 Sep 2026, and a tab strip left on --aside-inset sits 8px above the breadcrumb.",
  );
}

/* 5 · THE CARD'S FOOT SQUARES OFF WHERE IT MEETS THE WINDOW, and it is
   applied, not merely declared. A rounded corner at the window's edge reads
   as a rendering mistake rather than a deliberate flush edge. */
if (!/const CARD_FLUSH = "rounded-b-none";/.test(src)) {
  airFindings.push(`${rel} does not declare CARD_FLUSH = "rounded-b-none" - the card's foot is the window's edge now.`);
}
if (!/cn\(CARD, CARD_FLUSH, breadcrumb \? CARD_JOINED : undefined\)/.test(src)) {
  airFindings.push(
    `${rel} does not spend CARD_FLUSH on the card - unconditionally, unlike CARD_JOINED, because the window's ` +
      "bottom edge is there on every screen at every width whether or not anything else is.",
  );
}

/* 6 · THE PANE PUBLISHES ITS OWN GUTTER AND ITS OWN EDGE RADIUS, which is
   the only way a part inside it can span it without writing a literal or
   assuming which shell it is in. */
if (!/"\[--pane-inset-x:var\(--space-6\)\]",/.test(src)) {
  airFindings.push(
    `${rel}'s BODY does not publish [--pane-inset-x:var(--space-6)] - it must say its own gutter out loud, at ` +
      "the same number DENSITY_BODY spends as padding, or the ink band cannot break out of it and pay it back.",
  );
}
if (!/"\[--radius-pane-edge:0px\]",/.test(src)) {
  airFindings.push(
    `${rel}'s BODY does not publish [--radius-pane-edge:0px] - the pane's own bottom corners are square against ` +
      "the window now, and anything spanning the pane to its edges has to square off with it.",
  );
}

/* 7 · AND THE BAND READS BOTH, IN BOTH DIRECTIONS. The negative margin and
   the inner padding are one property read twice; either alone is a bug - the
   first would put the band's text hard against the window, the second would
   change nothing at all. */
if (!/"-mx-\[var\(--pane-inset-x,0px\)\]",/.test(recordDetailSrc)) {
  airFindings.push(
    `${recordDetailRel}'s ink footer does not pull itself out by -mx-[var(--pane-inset-x,0px)] - the client asked ` +
      'for "the full row side to side (within the main content)", and the 0px fallback is what keeps a record ' +
      "drawn outside a pane (a dialog, a demo cell) exactly where it always drew.",
  );
}
if (
  !/"px-\[var\(--pane-inset-x,var\(--space-5\)\)\] py-\[var\(--space-4h\)\]",/.test(recordDetailSrc) ||
  !/"lg:px-\[var\(--pane-inset-x,var\(--space-7\)\)\] lg:py-6",/.test(recordDetailSrc)
) {
  airFindings.push(
    `${recordDetailRel}'s ink footer does not spend the pane's own gutter back inside itself at both steps - ` +
      "without it the band spans the pane but its first word lands at the window's edge instead of under the h1. " +
      "27.8's 20/32 stay as the fallbacks so a band outside a pane is drawn as the chapter draws it.",
  );
}
if (!/"rounded-\[var\(--radius-pane-edge\)\]",/.test(recordDetailSrc)) {
  airFindings.push(
    `${recordDetailRel}'s ink footer does not read rounded-[var(--radius-pane-edge)] - a rounded band under a ` +
      "squared pane reads as a rendering mistake, and the token's own root value is --radius so nothing changes " +
      "anywhere else.",
  );
}

if (airFindings.length > 0) {
  console.error(
    "FAIL screen-shell air/bottom-edge check (21 Sep 2026 rulings):\n" +
      airFindings.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  "OK screen-shell air/bottom-edge check: the air above the nav is --shell-gutter-top (--space-6) at both " +
    "densities and is spent on the screen; the content column pays that top and no bottom gutter, and the aside " +
    "dock pays none either, so the card and the assistant both reach the window's bottom edge together; " +
    "ASIDE_TAB reads the same top token, so the two columns' tabs still start at one y; CARD_FLUSH squares the " +
    "card's foot unconditionally; and the pane publishes --pane-inset-x and --radius-pane-edge, which " +
    "record-detail.tsx's ink band reads in both directions so it spans the pane while its text stays under the h1.",
);

/* ============================================================================
   THE 21 SEP 2026 TOOLBAR-RHYTHM CHECK - HER NUMBER, AND ITS TWO OWNERS.

   CLIENT, VERBATIM, ON THE LIVE PRODUCT AND AFTER THE PAGE THAT PROPOSED THE
   OPPOSITE: "on tickets, reduce space above and under toolbar to 10px".

   WHY IT NEEDS A CHECK AT ALL. The 21 Sep page recommended the other answer
   in writing, with a measurement behind it ("a group of five floating pills
   is not a toolbar"), and that recommendation is still sitting in the
   artifact. A later reader with the page in hand and not the ruling would
   reasonably put the pill back, and every one of the three lines below would
   have to move for that to look right, so the three are pinned together.

   THE TWO OWNERS, AND WHY NEITHER IS THE ROW ITSELF. A toolbar's trailing
   margin (`TOOLBAR_ROW_GAP`) is what a row standing ALONE pays; inside a
   collection the host's column gap is that distance. And the distance ABOVE
   belongs to the tab strip's own box, never to the collection, because a gap
   that lives anywhere else stops holding the moment the strip goes sticky -
   `tabs.tsx`'s own `TABS_STRIP_GAP` comment makes that argument at length and
   the consuming app's first version of this fix put the 10 on the collection
   instead.
   ========================================================================= */
const toolbarRhythmFindings = [];

/* 1 - THE STRIP'S OWN 10, on the box that gets pinned. */
if (!/export const TABS_STRIP_GAP_PLAIN = "pb-\[var\(--space-2h\)\]";/.test(tabsSrc)) {
  toolbarRhythmFindings.push(
    `${tabsRel} does not export TABS_STRIP_GAP_PLAIN = "pb-[var(--space-2h)]" - 10px is the client's own ` +
      "number for the space above a toolbar, and it is padding on the STRIP so it survives the strip going sticky.",
  );
}
/* And the boxed value is untouched: a paper panel's join is unchanged. */
if (!/export const TABS_STRIP_GAP = "pb-\[var\(--space-5\)\]";/.test(tabsSrc)) {
  toolbarRhythmFindings.push(
    `${tabsRel}'s TABS_STRIP_GAP is no longer pb-[var(--space-5)] - the plain host got a second value, not a ` +
      "replacement, and a boxed collection's own join did not move.",
  );
}

/* 2 - THE PLAIN PANEL DROPS ITS TOP INSET AND TIGHTENS ITS COLUMN GAP. Either
   one left behind reopens the 34-to-40 join her number replaced. */
if (
  !/\{ surface: "plain", density: "default", class: "px-0 lg:px-0 pt-0 lg:pt-0 gap-\[var\(--space-2h\)\]" \},/.test(
    collectionFrameSrc,
  ) ||
  !/\{ surface: "plain", density: "compact", class: "px-0 pt-0 gap-\[var\(--space-2h\)\]" \},/.test(collectionFrameSrc)
) {
  toolbarRhythmFindings.push(
    `${collectionFrameRel}'s plain panel does not drop its horizontal AND top insets and tighten its column gap ` +
      "to --space-2h at both densities - a top inset here stacks on the strip's own gap and puts the toolbar " +
      "between 34 and 40 under the tabs again, which is the join the client's 10px replaced.",
  );
}

/* 3 - AND THE ROW STAYS UNPAINTED BY DEFAULT. The pill is reachable, and it
   is not what a collection draws. */
if (!/ground=\{toolbarGround \?\? "bare"\}/.test(collectionFrameSrc)) {
  toolbarRhythmFindings.push(
    `${collectionFrameRel} does not pass ground={toolbarGround ?? "bare"} to its ToolbarRow - the 21 Sep page ` +
      'recommended the soft paper pill and the client overruled it the same day ("reduce space above and under ' +
      'toolbar to 10px"): what read as loose was the pill\'s own 6px inset, not a missing fill.',
  );
}
if (!/toolbarGround\?:\s*"bare" \| "page" \| "panel";/.test(collectionFrameSrc)) {
  toolbarRhythmFindings.push(
    `${collectionFrameRel} does not declare toolbarGround?: "bare" | "page" | "panel" - the pill stays reachable ` +
      "by prop; only the default is the ruling.",
  );
}

if (toolbarRhythmFindings.length > 0) {
  console.error(
    "FAIL toolbar-rhythm check (21 Sep 2026 ruling):\n" + toolbarRhythmFindings.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  "OK toolbar-rhythm check: TABS_STRIP_GAP_PLAIN is the client's 10px as padding on the strip's own box (and " +
    "TABS_STRIP_GAP's boxed 20 is untouched), the plain collection panel drops its horizontal and top insets and " +
    "tightens its column gap to the same 10 at both densities, and the toolbar row stays unpainted by default " +
    "with the soft paper pill still reachable through toolbarGround.",
);
