#!/usr/bin/env node
/* ============================================================================
   THE TOOLBAR-ROW CHECK — pins the client's 17 Sep 2026 ruling ("toolbar
   option B" / "popover menu") and the row's own standing promise ("ONE ROW.
   AT EVERY WIDTH.") together, run by `npm run check` beside the token/icon/
   book/seam/unsaved-changes-bar checks.

   THE RULING, VERBATIM: "We need to look at the toolbar on smaller screens. I
   want everything in one row." … "toolbar option B" … "popover menu". Option
   B: the search field never shrinks or hides; on tablet and phone widths
   Filter, Sort and the view switch fold into ONE "···" (More) button beside
   the action group, opening a popover that holds the same nodes.

   WHAT THIS PINS, so the next edit that quietly breaks one of these fails
   here instead of in the next client screenshot:

     1. THE FOLD IS A CONTAINER QUERY, NOT A VIEWPORT ONE. The row's own root
        carries `@container` (`container-type: inline-size`); the fold pair
        (`filters`/`viewSwitch` inline vs. `foldTrigger`) answers to
        `@min-[48rem]`, never `sm:`/`md:`/`lg:`. A future edit that reaches
        for a viewport breakpoint on either half of the pair folds this row
        one way inside a wide window and the other way inside a narrow sheet
        at the same viewport — exactly the bug a container query exists to
        prevent.
     2. SEARCH NEVER FOLDS. The search slot's own wrapper carries no `hidden`
        and no container-query variant, at any width.
     3. THE ACTIONS GROUP NEVER FOLDS INTO THE NEW `···`. It stays inside the
        `toolbar-row-trailing` wrapper, pinned, with no fold gate of its own —
        it has its own long-standing overflow (`maxActions`), a different
        mechanism for a different rule.
     4. THE TRACK NEVER WRAPS. `toolbar-row-track` carries `flex-nowrap`
        (never a bare `flex-wrap`) — the promise this whole component exists
        to keep, restated so the fold can never reopen it by accident.
     5. THE FOLD PAIR IS EXACTLY COMPLEMENTARY. The inline `filters` block and
        `viewSwitch` block are `hidden` under 48rem and `flex` at 48rem and
        up; `foldTrigger` is `flex` under 48rem and `hidden` at 48rem and up.
        A future edit that changes one side's breakpoint without the other's
        opens a width band where the controls are either doubled or gone.
     6. ONE `ms-auto`. `toolbar-row-trailing` carries it; neither
        `toolbar-row-actions` nor `toolbar-row-fold` may carry their own, or
        the free space splits between them and a gap opens where the `···`
        is meant to sit flush beside the actions (the client's "beside the
        create/actions button").
     7. THE FOLD TRIGGER IS THE KIT'S OWN — `Button` (`secondary`/`icon`) and
        the `DotsThree` glyph already imported for the actions overflow, never
        a second one-off icon button built by hand.
     8. THE FOLD OPENS A `Popover`, NEVER A `DropdownMenu`. `filters`/
        `viewSwitch` are not commands and do not belong under `role="menu"` —
        see the file's own header and `foldTrigger`'s note. A future edit that
        "simplifies" the fold back onto `DropdownMenu` (matching the actions
        overflow beside it) reopens the ARIA conflict this file was written
        to avoid.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "toolbar-row.tsx");

const src = fs.readFileSync(FILE, "utf8");

const findings = [];

function between(startMarker, fromIndex, endMarker) {
  const start = src.indexOf(startMarker, fromIndex);
  if (start === -1) return null;
  const end = src.indexOf(endMarker, start + startMarker.length);
  if (end === -1) return null;
  return { start, end, text: src.slice(start, end) };
}

/* ── 1 · THE CONTAINER, ONCE, ON THE ROOT ────────────────────────────────
   `toolbarRowVariants`'s base array is where every instance of this
   component gets its root classes; `@container` has to live there, not on
   some conditional branch that a `ground` variant could opt out of. */
const cvaBase = between("const toolbarRowVariants = cva(\n  [", 0, "],");
if (!cvaBase) {
  console.error(`FAIL toolbar-row check: could not find \`toolbarRowVariants\`'s base class array in ${FILE}.`);
  process.exit(1);
}
/* Extracted, 25 Sep 2026, so `kwapso_system`'s own hand-built toolbar track
   could reuse the identical value instead of a second literal — see
   `TOOLBAR_ROW_FOLD_CONTAINER`'s own comment. This check now accepts either
   the constant reference (what the root array carries today) or a bare
   `@container` literal (in case a future edit inlines it again), but only
   the reference form passes if the constant itself has drifted off
   `"@container"`. */
const containerConstMatch = src.match(/export const TOOLBAR_ROW_FOLD_CONTAINER = "([^"]*)";/);
if (!containerConstMatch) {
  findings.push(
    "could not find `export const TOOLBAR_ROW_FOLD_CONTAINER = \"...\";` — the fold's exported container-query " +
      "value, which `kwapso_system`'s own toolbar track is meant to reuse rather than copy.",
  );
} else if (containerConstMatch[1] !== "@container") {
  findings.push(
    `TOOLBAR_ROW_FOLD_CONTAINER is ${JSON.stringify(containerConstMatch[1])}, not "@container" — every reader ` +
      "of this export, inside this file and out, now measures against the wrong query.",
  );
}
if (!/\bTOOLBAR_ROW_FOLD_CONTAINER\b/.test(cvaBase.text) && !/\B@container\b/.test(cvaBase.text)) {
  findings.push(
    "the row's root (`toolbarRowVariants`'s base array) carries neither `TOOLBAR_ROW_FOLD_CONTAINER` nor a bare " +
      "`@container` — the fold below has nothing to measure against, and `container-type: inline-size` is what " +
      "makes this row query ITS OWN width rather than the viewport's.",
  );
}

/* ── 2 · SEARCH NEVER FOLDS ───────────────────────────────────────────────
   The search wrapper is anchored by its own unique class string; anything
   that turns up `hidden` or a container-query variant on it is the one thing
   Option B forbids outright. */
const searchWrapper = src.match(/<div className="min-w-\[var\(--space-11\)\] flex-1">\{search\}<\/div>/);
if (!searchWrapper) {
  findings.push(
    "could not find the search wrapper (`<div className=\"min-w-[var(--space-11)] flex-1\">{search}</div>`) to " +
      "confirm it carries no fold gate. If its markup moved, re-anchor this check on the new shape.",
  );
} else if (/hidden|@min-\[|@max-\[|@container/.test(searchWrapper[0])) {
  findings.push("the search wrapper now carries a `hidden`/container-query class — search must never fold.");
}

/* ── 3 · THE FOLD PAIR, EXACTLY COMPLEMENTARY ────────────────────────────
   Both inline blocks answer `hidden … @min-[48rem]:flex`; the trigger
   answers the mirror, `flex … @min-[48rem]:hidden`. A bare grep for the two
   fragments, scoped near each anchor, catches a breakpoint edited on one side
   and not the other without needing a full class-string parse. */
/* Anchored on the inline blocks' own `data-slot`s (added alongside the fold
   so a test page can query them too — see `verify/toolbar-one-row`), through
   to where each hands its node to the DOM. Anchoring on the `data-slot`
   rather than the exact `<div>`/`className={cn(` formatting survives a
   reformat that this check should not be sensitive to. */
/* Same extraction as the container query, above: `TOOLBAR_ROW_FOLD_LANE` is
   the exported value both lanes below and `ToolbarRowFold`'s own mirror
   gate are meant to read. */
const laneConstMatch = src.match(/export const TOOLBAR_ROW_FOLD_LANE = "([^"]*)";/);
if (!laneConstMatch) {
  findings.push(
    "could not find `export const TOOLBAR_ROW_FOLD_LANE = \"...\";` — the fold's exported lane-hidden value.",
  );
} else if (laneConstMatch[1] !== "hidden @min-[48rem]:flex") {
  findings.push(
    `TOOLBAR_ROW_FOLD_LANE is ${JSON.stringify(laneConstMatch[1])}, not "hidden @min-[48rem]:flex" — every ` +
      "lane reading this export now folds at the wrong width, or not at all.",
  );
}
const hasLane = (text) => text.includes("TOOLBAR_ROW_FOLD_LANE") || text.includes("hidden @min-[48rem]:flex");

const inlineFiltersBlock = between('data-slot="toolbar-row-filters"', 0, "{filters}");
if (!inlineFiltersBlock) {
  findings.push('could not find the inline `filters` block (`data-slot="toolbar-row-filters"`) to confirm its fold gate.');
} else if (!hasLane(inlineFiltersBlock.text)) {
  findings.push(
    "the inline `filters` block no longer reads `TOOLBAR_ROW_FOLD_LANE`/`hidden @min-[48rem]:flex` — it must be " +
      "hidden below 48rem and flex at 48rem and up, in lockstep with `ToolbarRowFold`.",
  );
}

const inlineViewSwitchBlock = between('data-slot="toolbar-row-view-switch"', 0, "{viewSwitch}");
if (!inlineViewSwitchBlock) {
  findings.push('could not find the inline `viewSwitch` block (`data-slot="toolbar-row-view-switch"`) to confirm its fold gate.');
} else if (!hasLane(inlineViewSwitchBlock.text)) {
  findings.push(
    "the inline `viewSwitch` block no longer reads `TOOLBAR_ROW_FOLD_LANE`/`hidden @min-[48rem]:flex` — it must " +
      "be hidden below 48rem and flex at 48rem and up, in lockstep with `ToolbarRowFold`.",
  );
}

/* EXTRACTED TO `ToolbarRowFold`, 25 Sep 2026 — so `kwapso_system`'s own
   hand-built track could open the identical trigger instead of copying it.
   `foldTrigger` (below) is now just this row's first call of that export;
   the trigger's own contents (glyph, button, Popover, divider) are pinned
   against the exported function's body instead. */
const foldTriggerBlock = between('const foldTrigger =', 0, ") : null;");
if (!foldTriggerBlock) {
  findings.push("could not find the `foldTrigger` definition to confirm its own fold gate.");
} else if (!/<ToolbarRowFold\b/.test(foldTriggerBlock.text)) {
  findings.push(
    "`foldTrigger` no longer renders `<ToolbarRowFold`  — it must call the exported fold rather than building its " +
      "own trigger inline, so `kwapso_system`'s track and this row cannot drift apart again.",
  );
}

const toolbarRowFoldBlock = between("ToolbarRowFoldProps) {", 0, "\n}\n\nconst toolbarRowVariants = cva(");
if (!toolbarRowFoldBlock) {
  findings.push("could not find the exported `ToolbarRowFold` function to confirm its own fold gate and contents.");
} else {
  if (!/@min-\[48rem\]:hidden/.test(toolbarRowFoldBlock.text)) {
    findings.push(
      "`ToolbarRowFold`'s root no longer reads `@min-[48rem]:hidden` — it must be the exact mirror of the inline " +
        "lanes it stands in for: visible below 48rem, hidden at 48rem and up.",
    );
  }
  if (!/flex shrink-0 items-center/.test(toolbarRowFoldBlock.text)) {
    findings.push("`ToolbarRowFold`'s root no longer reads `flex shrink-0 items-center`.");
  }
  if (!/DotsThree/.test(toolbarRowFoldBlock.text)) {
    findings.push("`ToolbarRowFold` no longer renders `DotsThree` — the kit's own overflow glyph, already used for the actions `···`.");
  }
  if (!/variant="secondary"\s+size="icon"/.test(toolbarRowFoldBlock.text)) {
    findings.push('`ToolbarRowFold`\'s button is no longer `Button variant="secondary" size="icon"` — the kit\'s icon-only pill, matching the actions overflow trigger.');
  }
  if (!/aria-label=\{moreFiltersLabel\}/.test(toolbarRowFoldBlock.text)) {
    findings.push("`ToolbarRowFold`'s button no longer carries `aria-label={moreFiltersLabel}` — an icon-only trigger with no accessible name.");
  }
  if (!/<Popover>[\s\S]*<PopoverTrigger asChild>[\s\S]*<PopoverContent/.test(toolbarRowFoldBlock.text)) {
    findings.push(
      "`ToolbarRowFold` no longer opens through `Popover`/`PopoverTrigger`/`PopoverContent` — `filters`/`viewSwitch` " +
        'are not commands and must never be hosted by `DropdownMenu` (`role="menu"`); see the file header.',
    );
  }
  if (/<DropdownMenu\b|DropdownMenuTrigger|DropdownMenuContent/.test(toolbarRowFoldBlock.text)) {
    findings.push(
      "`ToolbarRowFold` renders a `DropdownMenu`/`DropdownMenuTrigger`/`DropdownMenuContent` somewhere in its own " +
        "JSX — the fold must stay on `Popover`, never the menu role. See the file header's ARIA note. (Prose " +
        "mentioning \"DropdownMenu\" in a comment does not trip this — only the component tags do.)",
    );
  }
  if (!/filters && viewSwitch \? <div className=\{FOLD_DIVIDER_CLASS\} \/> : null/.test(toolbarRowFoldBlock.text)) {
    findings.push(
      "`ToolbarRowFold` no longer draws the `FOLD_DIVIDER_CLASS` divider between the `filters` and `viewSwitch` " +
        'groups when both are present — the ruling\'s "a divider, then the view switch".',
    );
  }
}

/* ── 4 · ONE `ms-auto` ────────────────────────────────────────────────────
   `toolbar-row-trailing` carries it; `toolbar-row-actions` and
   `toolbar-row-fold` must not carry their own, or the free space splits
   between the two and a gap opens where the `···` should sit flush beside
   the actions. */
const trailingWrapper = between('data-slot="toolbar-row-trailing"', 0, "</div>\n          ) : null}");
if (!trailingWrapper) {
  findings.push("could not find the `toolbar-row-trailing` wrapper to confirm it is the row's one pinned group.");
} else if (!/className="ms-auto flex shrink-0 flex-nowrap items-center gap-2"/.test(trailingWrapper.text)) {
  findings.push('`toolbar-row-trailing` no longer reads `className="ms-auto flex shrink-0 flex-nowrap items-center gap-2"`.');
}

const actionsWrapperMatch = src.match(/data-slot="toolbar-row-actions"[\s\S]{0,400}?className="([^"]*)"/);
if (!actionsWrapperMatch) {
  findings.push("could not find `toolbar-row-actions`'s class list.");
} else if (/\bms-auto\b/.test(actionsWrapperMatch[1])) {
  findings.push(
    "`toolbar-row-actions` carries its own `ms-auto` again — that pin belongs to the shared `toolbar-row-trailing` " +
      "wrapper alone; two `ms-auto` siblings split the free space and open a gap beside the `···`.",
  );
}

const foldWrapperMatch = src.match(/data-slot="toolbar-row-fold"[\s\S]{0,200}?className="([^"]*)"/);
if (!foldWrapperMatch) {
  findings.push("could not find `toolbar-row-fold`'s class list.");
} else if (/\bms-auto\b/.test(foldWrapperMatch[1])) {
  findings.push("`toolbar-row-fold` carries its own `ms-auto` — see the note on `toolbar-row-actions` above; only `toolbar-row-trailing` may.");
}

/* ── 5 · THE TRACK NEVER WRAPS ────────────────────────────────────────────
   Restated because the fold touches every group inside the track; this is
   the row's one non-negotiable promise and the reason the file exists. */
const trackMatch = src.match(/data-slot="toolbar-row-track"[\s\S]{0,4000}?className=\{cn\(\s*"([^"]*)"/);
if (!trackMatch) {
  findings.push("could not find `toolbar-row-track`'s class list to confirm it stays `flex-nowrap`.");
} else {
  const trackClasses = trackMatch[1];
  if (!/\bflex-nowrap\b/.test(trackClasses)) {
    findings.push(`\`toolbar-row-track\` is ${JSON.stringify(trackClasses)} — missing \`flex-nowrap\`. The row must never wrap, fold or not.`);
  }
  if (/(?<!flex-no)\bflex-wrap\b/.test(trackClasses)) {
    findings.push(`\`toolbar-row-track\` is ${JSON.stringify(trackClasses)} — carries a bare \`flex-wrap\`, which reopens the second line this row was built to close.`);
  }
}

if (findings.length > 0) {
  console.error("FAIL toolbar-row check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK toolbar-row check: the root carries `@container`, `search` never folds, `filters`/`viewSwitch` and " +
    "`foldTrigger` answer the same `@min-[48rem]` gate in mirror, the trailing group carries the row's one " +
    "`ms-auto`, and the track stays `flex-nowrap`.",
);
