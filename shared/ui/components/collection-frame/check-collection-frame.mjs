#!/usr/bin/env node
/* ============================================================================
   THE COLLECTION-FRAME EMPTY-REGISTER CHECK - run by `npm run check` beside
   the token/icon/book/seam/kanban/toolbar-row/card checks.

   WHAT THIS PINS, ADDED 2026-09-22, AURORA'S RULING ON THE ACCOUNTS /
   INACTIVE SCREENSHOT. Her words, verbatim, on "Nothing matched. Try fewer
   words, or clear the filters." drawn on a soft paper card: "The empty
   collection now. We need to get rid of the card background." The app side
   was already fixed - `CollectionEmptyState` stopped papering itself - and
   this check exists because `CollectionFrame`'s own composition, the one
   thing every module automation, settings screen, internal screen, work
   panel and the one stories/tasks/sprints-all view are built on, still had
   the paper: v1.2.149 shipped "the empty/loading/failed registers flip to
   variant block inside a plain frame, the one register that keeps its
   paper" as ONE rule for all three states, and this is where that rule
   split in two.

   FIVE THINGS THIS CHECK PINS, each a different way the split could
   silently collapse back into the old one-rule-for-three behaviour:

     1. `registerVariants` DECLARES A THIRD VARIANT, `plain`, and it paints
        no fill, no radius and no horizontal inset - `items-start` and
        `text-start` beside whatever vertical air item 5 pins, nothing
        else. A `plain` that quietly grew a `bg-surface-panel`, a
        `rounded-*` class or a horizontal `px-*` would be `block` wearing
        a new name, which is the exact regression this check exists to
        catch.
     2. `CollectionFrame` COMPUTES TWO SEPARATE VARIANT CONSTANTS  -
        `registerVariant` (loading + error, still `block` on a plain panel)
        and `emptyRegisterVariant` (empty only, `plain` on a plain panel)  -
        rather than one shared constant. One constant driving all three
        registers is exactly how they used to draw alike; two separate
        `const` declarations is the only way the empty register can diverge
        from the other two without an `if` inside the JSX.
     3. THE EMPTY REGISTER READS `emptyRegisterVariant`, NOT
        `registerVariant`. A single find-and-replace slip here would put the
        card straight back.
     4. THE LOADING AND FAILED REGISTERS STILL READ `registerVariant`  -
        UNCHANGED. This is the other half of the same mistake: "fixing" all
        three registers to `plain` would strip the boundary a wait or a
        failure still needs (the brief's own words: "the loading skeleton
        and the failed register may keep whatever the kit's own error law
        requires ... do not invent paper" - the paper they keep is the
        EXISTING `block`, not a new drawing, and this line is what proves
        neither of them silently moved to `plain`).
     5. `plain` CARRIES A FLAT TOP AND BOTTOM INSET, `--space-6` (24px),
        ADDED 22 SEP 2026 ON A SAME-DAY FOLLOW-UP RULING. Aurora, verbatim,
        after seeing the flush register this same entry shipped a few
        hours earlier: "ok, but need a bit more spacing over it (like it
        was with the card)". The card she names is the `block` register
        this variant replaced; the figure restored is not `block`'s own
        `--space-7` panel inset, it is `CardContent`'s own default
        vertical step before `lg:` (`py-6`, `CARD_CONTENT_INSET_Y_DEFAULT`
        in `card.tsx`) - the ticket page's boxed metric tiles this pass is
        modelled on. A `plain` that lost `pt-[var(--space-6)] pb-
        [var(--space-6)]` would be the flush register this ruling
        corrected, back again.

   A sixth thing is implied rather than asserted here: `panel="paper"`
   collapses BOTH constants to `"inline"`, unchanged since ruling J2. That
   is the same ternary this check already reads in (2) - there is no
   separate branch to regress.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "collection-frame.tsx");

const src = fs.readFileSync(FILE, "utf8");
const rel = path.relative(process.cwd(), FILE);

const findings = [];

// (1) THE THIRD VARIANT - no fill, no radius, no horizontal inset.
if (
  !/plain:\s*"items-start pt-\[var\(--space-6\)\] pb-\[var\(--space-6\)\] text-start",/.test(src)
) {
  findings.push(
    `${rel} does not declare registerVariants' "plain" branch as exactly ` +
      '"items-start pt-[var(--space-6)] pb-[var(--space-6)] text-start" - any added fill, radius or ' +
      "horizontal inset would put the card back under a new name, and any figure other than " +
      "--space-6 top and bottom would drift from the 22 Sep 2026 follow-up ruling's own number.",
  );
}

// (2) TWO SEPARATE CONSTANTS, NOT ONE SHARED ONE.
if (!/const registerVariant = panelSurface === "plain" \? "block" : "inline";/.test(src)) {
  findings.push(
    `${rel} does not compute \`registerVariant\` as \`panelSurface === "plain" ? "block" : ` +
      '"inline"\` - this is the constant the loading and failed registers still read, and it must ' +
      "stay exactly what it was before the 22 Sep split.",
  );
}
if (!/const emptyRegisterVariant = panelSurface === "plain" \? "plain" : "inline";/.test(src)) {
  findings.push(
    `${rel} does not compute a separate \`emptyRegisterVariant\` as \`panelSurface === "plain" ? ` +
      '"plain" : "inline"\` - without a second constant the empty register has no way to draw ' +
      "differently from loading and failed, which is the whole ruling.",
  );
}

// (3) THE EMPTY REGISTER READS THE NEW CONSTANT.
const EMPTY_BLOCK_START = src.indexOf('} else if (bodyState === "empty") {');
const emptyBlockSrc =
  EMPTY_BLOCK_START === -1 ? "" : src.slice(EMPTY_BLOCK_START, src.indexOf("return (", EMPTY_BLOCK_START));
if (!/variant=\{emptyRegisterVariant\}/.test(emptyBlockSrc)) {
  findings.push(
    `${rel}'s empty-state CollectionRegister does not read \`variant={emptyRegisterVariant}\` - ` +
      "a slip back to `variant={registerVariant}` here is exactly how the card returns.",
  );
}

// (4) LOADING AND FAILED STILL READ THE OLD CONSTANT - UNCHANGED.
const LOADING_BLOCK = src.slice(
  src.indexOf('if (bodyState === "loading") {'),
  src.indexOf('} else if (bodyState === "error") {'),
);
const ERROR_BLOCK = src.slice(
  src.indexOf('} else if (bodyState === "error") {'),
  EMPTY_BLOCK_START === -1 ? undefined : EMPTY_BLOCK_START,
);
if (!/variant=\{registerVariant\}/.test(LOADING_BLOCK)) {
  findings.push(
    `${rel}'s loading-state CollectionRegister does not read \`variant={registerVariant}\` - ` +
      "loading is not this ruling and must keep its paper (\"block\" on a plain panel) unchanged.",
  );
}
if (!/variant=\{registerVariant\}/.test(ERROR_BLOCK)) {
  findings.push(
    `${rel}'s error-state CollectionRegister does not read \`variant={registerVariant}\` - failed ` +
      "is not this ruling either and must keep its paper (\"block\" on a plain panel) unchanged: " +
      "the brief's own words are \"do not invent paper\", and the paper here is the one that already " +
      "existed, not a new one.",
  );
}

if (findings.length > 0) {
  console.error("FAIL collection-frame check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK collection-frame check: registerVariants' \"plain\" branch paints no fill, no radius and no " +
    "horizontal inset, and carries a flat --space-6 top and bottom air; CollectionFrame computes " +
    "registerVariant and emptyRegisterVariant as two separate constants; the empty register reads " +
    "emptyRegisterVariant; and the loading and failed registers still read the unchanged " +
    "registerVariant, keeping their paper.",
);
