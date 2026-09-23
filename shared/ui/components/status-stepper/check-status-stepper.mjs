#!/usr/bin/env node
/* ============================================================================
   THE STATUS-STEPPER MARK CHECK — pins Aurora's 23 Sep 2026 ruling against
   every way the mango could drift back in, run by `npm run check` beside the
   other `check-*.mjs` component pins (badge, avatar, select, …).

   THE RULING, VERBATIM: "on ticket stages, mark the active and past in
   black, only future are gray."

   WHAT WAS WRONG. The ticket ladder is this kit's `StatusStepper`, drawn in
   its `steps` variant (chapter 15's rail — the ticket screen uses
   `orientation="horizontal"`, but the vertical wizard rail shares the
   identical mark logic). The LABEL text was already two readings by
   inheritance — done and current both painted `text-foreground`, only a
   later stage dropped to `text-ink-tertiary` — so the label was never the
   defect. The THIRD reading was the MARK, the small circle beside each
   label: a done step drew an ink circle with a tick, a later step drew a
   grey circle with its number, and a CURRENT step alone drew a MANGO circle
   with its number — the one accent in the view, which is exactly what her
   ruling asks to stop.

   THE FIX, IN status-stepper.tsx. `isCurrent`'s mark now shares `isDone`'s
   ink fill (`bg-surface-inverse text-ink-on-inverse`) in BOTH places this
   file draws that mark — the horizontal `steps` rail (chapter 15, the ticket
   ladder's own drawing) and the vertical wizard rail (the identical
   `markClasses` fill logic, laid out as a column) — while a later step stays
   on `bg-surface-lift text-ink-tertiary`. The CURRENT mark keeps the extra
   `font-[var(--font-weight-medium)]` weight it always carried, the smallest
   non-colour signal of position left once the fill can no longer say it; a
   reader otherwise tells current from done by the mark's own glyph (a
   number, not a tick) and from later by the ink-vs-grey fill.

   THE `stages` VARIANT (chapter 23's hero row of pills, this file's OTHER
   drawing) IS DELIBERATELY UNTOUCHED. It has no separate mark at all — the
   whole PILL is the position indicator, which is the drawing chapter 23
   specifies ("current takes mango with a charcoal label"), and neither her
   ruling ("ticket stages") nor the app's own investigation ("the MARK, the
   small circle beside each label") names it. Section 3, below, PINS that the
   `stages` pill still reads `--surface-brand`/`--ink-on-accent` for its
   current pill — a positive proof this check did not also silently retire
   mango from the hero row.

   WHY A REBIND FROM THE APP WAS REJECTED, AND WHY THIS IS A KIT CHECK. The
   app lane tried rebinding `--surface-brand`/`--ink-on-accent` locally and
   found it leaks: `--warning-foreground` (the ticket ladder's own "Reopened"
   badge) resolves through `--ink-on-accent` too, so repainting the mark
   black from the app would repaint that badge's label and break its
   contrast on `--warning`. The fix has to live in the token CHOICE the mark
   itself makes, which is exactly what this file (and only this file) draws
   — so this check reads `status-stepper.tsx` directly, the same shape every
   other `check-*.mjs` in this kit uses (no jsdom/testing-library here — a
   static read of the source, not a mounted render).

   THREE SECTIONS. 1 pins the horizontal `steps` mark (the ticket ladder's
   own drawing). 2 pins the vertical wizard rail's mark (the identical fill
   logic, checked separately so a fix applied to only one block cannot pass).
   3 pins that `stages` is untouched. Each section requires the ink fill on
   BOTH isDone and isCurrent, requires isCurrent to still carry the weight
   class, and REFUSES the old mango tokens appearing anywhere in that mark's
   own class list — proved to bite by `verify-status-stepper-check.sh` in
   this same folder, which restores the mango fill from a `cp` backup and
   watches this file fail red before restoring it.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "status-stepper.tsx");
const src = fs.readFileSync(FILE, "utf8");
const rel = path.relative(process.cwd(), FILE);

const findings = [];

/* ============================================================================
   SPLIT THE FILE INTO ITS THREE MARK-DRAWING WINDOWS, positionally — by the
   unique render-site anchors each block opens with, never by line number
   (a line number rots on the next edit above it). `markClasses,` appears
   exactly twice (the vertical wizard rail, then the horizontal `steps`
   rail); `pillClasses,` at the `stages` pill's own render site follows both.
   ========================================================================= */
const markClassesFirst = src.indexOf("markClasses,");
const markClassesSecond = src.indexOf("markClasses,", markClassesFirst + 1);
const pillClassesIdx = src.indexOf("pillClasses,");

if (markClassesFirst === -1 || markClassesSecond === -1 || pillClassesIdx === -1) {
  findings.push(
    `Could not locate the expected three render-site anchors (two \`markClasses,\` occurrences and one ` +
      `\`pillClasses,\`) in ${rel} — the file's structure moved and this check can no longer find the vertical ` +
      "wizard mark, the horizontal steps mark and the stages pill to pin.",
  );
}

const verticalMarkWindow =
  markClassesFirst === -1 ? "" : src.slice(markClassesFirst, markClassesSecond === -1 ? undefined : markClassesSecond);
const horizontalMarkWindow =
  markClassesSecond === -1 ? "" : src.slice(markClassesSecond, pillClassesIdx === -1 ? undefined : pillClassesIdx);
const stagesPillWindow = pillClassesIdx === -1 ? "" : src.slice(pillClassesIdx);

/* A `later` window closes each mark block — cut there so the SAME-FILL
   pin below cannot accidentally match text that belongs to the next block
   (the `bg-surface-lift` a later mark or a later pill both legitimately
   carry). */
function markOnlyWindow(window) {
  const laterIdx = window.indexOf("!isDone && !isCurrent");
  return laterIdx === -1 ? window : window.slice(0, laterIdx);
}

/* Block comments stripped before any DRIFT check — this file's own doc
   prose argues at length about the mango fill it retired (by name, in
   backticks, quoting the rejected app-side rebind), and none of that prose
   may itself trip the "has the mango come back" guard below. The POSITIVE
   pins (the fill really is there) are checked against the raw window
   instead, on purpose: the exact working code shape, not a comment
   describing it, is what has to be present. */
function codeOnly(window) {
  return window.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

/* ============================================================================
   1 · THE HORIZONTAL `steps` MARK — chapter 15's rail, the ticket ladder's
   own drawing (`orientation="horizontal"` is the prop default, so this is
   what `web/components/tickets/ticket-stages.tsx` renders).
   ========================================================================= */
{
  const window = markOnlyWindow(horizontalMarkWindow);
  if (window === "") {
    findings.push(`Could not isolate the horizontal steps mark's own window in ${rel} to check section 1.`);
  } else {
    if (!/\(isDone \|\| isCurrent\) && "bg-surface-inverse text-ink-on-inverse"/.test(window)) {
      findings.push(
        `${rel}'s horizontal \`steps\` mark (chapter 15's rail, the ticket ladder) does not paint isDone and ` +
          'isCurrent with the SAME ink fill (isDone || isCurrent) && "bg-surface-inverse text-ink-on-inverse" — ' +
          'Aurora, 23 Sep 2026: "on ticket stages, mark the active and past in black, only future are gray."',
      );
    }
    if (!/isCurrent && "font-\[var\(--font-weight-medium\)\]"/.test(window)) {
      findings.push(
        `${rel}'s horizontal \`steps\` mark no longer gives isCurrent its own font-[var(--font-weight-medium)] — ` +
          "the one non-colour signal of position this fix kept once the fill could no longer carry it.",
      );
    }
    if (/--surface-brand|text-ink-on-accent/.test(codeOnly(window))) {
      findings.push(
        `${rel}'s horizontal \`steps\` mark still references --surface-brand or text-ink-on-accent — the mango ` +
          "fill this ruling retired for the current step's mark has drifted back.",
      );
    }
  }
}

/* ============================================================================
   2 · THE VERTICAL WIZARD RAIL'S MARK — the identical markClasses fill
   logic, laid out as a column. Fixed in step with section 1 rather than
   left to drift the day a real call site draws it.
   ========================================================================= */
{
  const window = markOnlyWindow(verticalMarkWindow);
  if (window === "") {
    findings.push(`Could not isolate the vertical wizard rail's own mark window in ${rel} to check section 2.`);
  } else {
    if (!/\(isDone \|\| isCurrent\) && "bg-surface-inverse text-ink-on-inverse"/.test(window)) {
      findings.push(
        `${rel}'s vertical wizard-rail mark does not paint isDone and isCurrent with the same ink fill — it must ` +
          "match the horizontal steps mark section 1 checks, not draw the ladder's current step one way and the " +
          "wizard's current step another.",
      );
    }
    if (!/isCurrent && "font-\[var\(--font-weight-medium\)\]"/.test(window)) {
      findings.push(`${rel}'s vertical wizard-rail mark no longer gives isCurrent its own weight class.`);
    }
    if (/--surface-brand|text-ink-on-accent/.test(codeOnly(window))) {
      findings.push(
        `${rel}'s vertical wizard-rail mark still references --surface-brand or text-ink-on-accent — the mango ` +
          "fill has drifted back on this orientation even if section 1's horizontal rail is clean.",
      );
    }
  }
}

/* ============================================================================
   3 · THE `stages` PILL STAYS MANGO — POSITIVE PROOF this fix did not also
   silently retire chapter 23's hero row, which this ruling never named and
   which has no separate "mark" for the ruling's own words to describe.
   ========================================================================= */
{
  if (stagesPillWindow === "") {
    findings.push(`Could not isolate the stages pill's own window in ${rel} to check section 3.`);
  } else if (
    !/isCurrent &&\s*\n\s*"bg-\[var\(--surface-brand\)\] text-ink-on-accent font-\[var\(--font-weight-medium\)\]"/.test(
      stagesPillWindow,
    )
  ) {
    findings.push(
      `${rel}'s \`stages\` pill (chapter 23's hero row) no longer paints its current PILL with ` +
        'bg-[var(--surface-brand)] text-ink-on-accent — this ruling is scoped to the `steps` variant\'s mark only ' +
        "and never asked for the hero pill's own mango to move. If this is deliberate, it needs its own ruling " +
        "and this pin updated to match; if not, the fix over-reached past the ticket ladder it was scoped to.",
    );
  }
}

/* ============================================================================
   4 · A LATER STEP IS UNCHANGED IN EVERY WINDOW — the ruling's own "only
   future are gray" half, which nothing above touches on purpose, still
   pinned here so a future edit cannot quietly repaint it either.
   ========================================================================= */
for (const [label, window] of [
  ["horizontal steps", horizontalMarkWindow],
  ["vertical wizard rail", verticalMarkWindow],
]) {
  if (window !== "" && !/!isDone && !isCurrent && "bg-surface-lift text-ink-tertiary shadow-\[var\(--hairline\)\]"/.test(window)) {
    findings.push(`${rel}'s ${label} mark's later state no longer reads bg-surface-lift text-ink-tertiary — "only future are gray" broke.`);
  }
}

if (findings.length > 0) {
  console.error("FAIL status-stepper check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK status-stepper check: the `steps` variant's mark (both horizontal — the ticket ladder's own drawing — and " +
    "vertical) paints a done and a current step with the SAME ink fill (bg-surface-inverse text-ink-on-inverse), " +
    "told apart by the mark's own glyph and the current mark's extra weight, while a later step stays " +
    "bg-surface-lift text-ink-tertiary — Aurora, 23 Sep 2026: \"on ticket stages, mark the active and past in " +
    "black, only future are gray\" — and the `stages` variant's hero pill, which this ruling never named, still " +
    "carries its own mango current fill unchanged.",
);
