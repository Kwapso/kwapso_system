#!/usr/bin/env node
/* ============================================================================
   THE STATUS-STEPPER MARK CHECK — pins Aurora's 23 Sep 2026 rulings (TWO of
   them, same day) against every way the mango, or a number, could drift back
   into the `steps` mark. Run by `npm run check` beside the other
   `check-*.mjs` component pins (badge, avatar, select, …).

   THE FIRST RULING, VERBATIM: "on ticket stages, mark the active and past in
   black, only future are gray."

   WHAT WAS WRONG (before v1.2.164). The ticket ladder is this kit's
   `StatusStepper`, drawn in its `steps` variant (chapter 15's rail — the
   ticket screen uses `orientation="horizontal"`, but the vertical wizard
   rail shares the identical mark logic). The LABEL text was already two
   readings by inheritance — done and current both painted `text-foreground`,
   only a later stage dropped to `text-ink-tertiary` — so the label was never
   the defect. The THIRD reading was the MARK, the small circle beside each
   label: a done step drew an ink circle with a tick, a later step drew a
   grey circle with its number, and a CURRENT step alone drew a MANGO circle
   with its number — the one accent in the view, which is exactly what her
   first ruling asked to stop.

   THE FIRST FIX, SHIPPED AS v1.2.164. `isCurrent`'s mark took `isDone`'s ink
   fill (`bg-surface-inverse text-ink-on-inverse`) in BOTH places this file
   draws that mark, while a later step stayed on `bg-surface-lift
   text-ink-tertiary`, and the current mark kept the extra
   `font-[var(--font-weight-medium)]` weight it always carried. The current
   mark still drew its own NUMBER rather than `isDone`'s tick, and that pass
   argued a reader could still tell current from done by the tick-to-number
   boundary.

   THE SECOND RULING, VERBATIM, REVIEWING v1.2.164 LATER THE SAME DAY:
   "remove the numbers inside (they are not numbered) is either check or
   empty." She removed the tick-to-number argument by name: the stages are
   not numbered things, so a mark is either a check or it is empty.

   THE SECOND FIX, THIS PASS. `isCurrent`'s mark now draws the SAME GLYPH
   `isDone` draws — the `CheckFat` tick — instead of
   `formatNumber(index + 1)`, in both the horizontal `steps` rail and the
   vertical wizard rail. A later mark draws neither fill nor glyph: an empty
   grey circle, where it used to carry its own number. The ink-vs-grey fill
   and the current mark's extra weight from the first fix are untouched —
   this pass only removes what was still drawn inside the fill.

   THE `stages` VARIANT (chapter 23's hero row of pills, this file's OTHER
   drawing) IS DELIBERATELY UNTOUCHED, by both fixes. It has no separate mark
   at all — the whole PILL is the position indicator, which is the drawing
   chapter 23 specifies ("current takes mango with a charcoal label"), and
   neither ruling ("ticket stages" / "the stage ladder that shipped as kit
   v1.2.164") names it, though it is flagged in status-stepper.tsx's own
   render-site comment that `stages` DOES draw a number for every pill,
   including done ones — the same kind of thing the second ruling's words
   could describe, left for Aurora to rule on rather than acted on here.
   Section 3, below, PINS that the `stages` pill still reads
   `--surface-brand`/`--ink-on-accent` for its current pill AND still calls
   `formatNumber` for every stage — a positive proof this check did not also
   silently retire mango or numbers from the hero row.

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

   THE UNDERLINE, ADDED THE SAME DAY, IMMEDIATELY AFTER THE SECOND FIX. Her
   second ruling is about what the MARK contains, nothing more, and removing
   the number from it is correct on its own terms. But once neither the fill
   nor the glyph told `isDone` from `isCurrent` apart, this ladder — whose
   whole job is saying where a record stands — had no visible mark of
   position left for a sighted reader glancing at the row. She did not ask
   for that regression and would have noticed it inside a minute. The fix
   is on the LABEL, not the mark: `isCurrent`'s label takes `underline
   underline-offset-[0.1875rem] decoration-hair-strong` — the kit's own
   existing "ink, underlined, never coloured" idiom (`button.tsx`'s
   text-link variant, `article-body.tsx`'s in-copy links), not an invented
   one, and not a colour — `--hair-strong` is a neutral ink-hairline token.
   The mark stays exactly what the second fix leaves it: a tick on ink or an
   empty grey circle, nothing added there.

   SIX SECTIONS. 1 pins the horizontal `steps` mark's fill and weight (the
   ticket ladder's own drawing). 2 pins the same for the vertical wizard
   rail's mark (the identical fill logic, checked separately so a fix
   applied to only one block cannot pass). 3 pins that `stages` is untouched
   — mango AND numbers both. 4 pins the later state's fill in both `steps`
   windows. 5 is the second ruling's own pin: it requires BOTH marks to draw
   `isDone` and `isCurrent` through the identical `CheckFat`-tick branch and
   REFUSES `formatNumber(index + 1)` appearing anywhere in either `steps`
   mark window, so a number cannot come back to this variant even by adding
   a new branch rather than editing the old one. 6 pins the underline itself
   — REQUIRES the exact class string on `isCurrent`'s LABEL in both `steps`
   windows, so it cannot be deleted later as apparent leftover decoration;
   it is the row's only remaining visible mark of position for a sighted
   reader. Every REFUSES check in this file was proved to bite this pass by
   putting the retired code back (the mango class in sections 1/2, a
   `formatNumber` branch in section 5, the underline class removed in
   section 6), confirming `npm run check`'s status-stepper step fails red
   each time, then restoring `status-stepper.tsx` from a `cp` backup taken
   before the edit.
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
   3 · THE `stages` PILL STAYS MANGO, AND STAYS NUMBERED — POSITIVE PROOF
   neither fix silently retired chapter 23's hero row, which neither ruling
   named and which has no separate "mark" for either ruling's own words to
   describe.
   ========================================================================= */
{
  if (stagesPillWindow === "") {
    findings.push(`Could not isolate the stages pill's own window in ${rel} to check section 3.`);
  } else {
    if (
      !/isCurrent &&\s*\n\s*"bg-\[var\(--surface-brand\)\] text-ink-on-accent font-\[var\(--font-weight-medium\)\]"/.test(
        stagesPillWindow,
      )
    ) {
      findings.push(
        `${rel}'s \`stages\` pill (chapter 23's hero row) no longer paints its current PILL with ` +
          'bg-[var(--surface-brand)] text-ink-on-accent — neither ruling is scoped to the `steps` variant\'s mark ' +
          "and never asked for the hero pill's own mango to move. If this is deliberate, it needs its own ruling " +
          "and this pin updated to match; if not, the fix over-reached past the ticket ladder it was scoped to.",
      );
    }
    if (!/\{formatNumber\(index \+ 1\)\}/.test(stagesPillWindow)) {
      findings.push(
        `${rel}'s \`stages\` pill no longer calls {formatNumber(index + 1)} — the second ruling ("remove the ` +
          "numbers inside … is either check or empty\") was scoped to the `steps` variant's mark by its own words " +
          '("the stage ladder that shipped as kit v1.2.164"), not to chapter 23\'s hero pills, which this file\'s ' +
          "own render-site comment flags as an open question for Aurora rather than something to act on silently. " +
          "If she has since ruled the hero pills unnumbered too, this pin needs updating to match; if not, the " +
          "number was dropped without a ruling for it.",
      );
    }
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

/* ============================================================================
   5 · THE SECOND RULING'S OWN PIN — "remove the numbers inside (they are not
   numbered) is either check or empty." Checked against the FULL mark window
   (not the class-only slice section 1/2 use), because the glyph these two
   checks are about is drawn in the mark's CHILDREN, after the class
   conditional the earlier sections inspect. Requires the `isDone ||
   isCurrent` ternary to still gate the SAME `CheckFat` tick for both states,
   and REFUSES `formatNumber(index + 1)` anywhere in either `steps` mark
   window — the exact branch that used to draw the current mark's number and
   the later mark's number both — so neither state can grow a digit back,
   whether by editing the old branch or by adding a new one beside it.
   ========================================================================= */
const tickBranchRe =
  /isDone \|\| isCurrent \? \(\s*<>\s*\{isDone \? <span className="sr-only">\{doneLabel\}<\/span> : null\}\s*<CheckFat size=\{16\} aria-hidden="true" \/>\s*<\/>\s*\) : null\}/;
for (const [label, rawWindow] of [
  ["horizontal steps", horizontalMarkWindow],
  ["vertical wizard rail", verticalMarkWindow],
]) {
  if (rawWindow === "") {
    findings.push(`Could not isolate the ${label} mark's full window in ${rel} to check section 5.`);
    continue;
  }
  // Comments stripped before either test — this file's own doc prose quotes
  // `formatNumber(index + 1)` in backticks while explaining what was
  // retired, and that quotation must not itself trip the REFUSAL below. The
  // POSITIVE tick-branch pin is checked against the raw window on purpose
  // (codeOnly() would also collapse the JSX children it needs to match).
  const window = codeOnly(rawWindow);
  if (!tickBranchRe.test(rawWindow)) {
    findings.push(
      `${rel}'s ${label} mark does not draw isDone and isCurrent through the identical ` +
        '"isDone || isCurrent ? (…CheckFat…) : null" tick branch — Aurora, 23 Sep 2026 (second ruling, reviewing ' +
        'kit v1.2.164): "remove the numbers inside (they are not numbered) is either check or empty." A reached ' +
        "stage must draw a check on the ink fill; nothing else may distinguish it.",
    );
  }
  if (/formatNumber\(index \+ 1\)/.test(window)) {
    findings.push(
      `${rel}'s ${label} mark calls formatNumber(index + 1) — a number has drifted back into this mark. The ` +
        "second ruling retired every number this mark drew, for every state, not only the current mark's: a " +
        "reached stage is a check, a stage still ahead is empty, and nothing here is numbered.",
    );
  }
}

/* ============================================================================
   6 · THE UNDERLINE — added the SAME day as section 5's fix, once removing
   the number left the row with no visible mark of position at all for a
   sighted reader (see the law block's own bullet in status-stepper.tsx).
   REQUIRES `isCurrent`'s LABEL, in both `steps` windows, to carry the exact
   class string — comments stripped first, the same reason section 5 strips
   them: this file's own doc prose quotes `decoration-hair-strong` while
   explaining the fix, and that quotation must not satisfy the pin on its
   own. This is the one thing standing between the ladder and a current step
   nobody can find at a glance, so it is pinned as strictly as the fill and
   the glyph are — a later "cleanup" that treats it as decoration is exactly
   what this section exists to catch.
   ========================================================================= */
const underlineRe =
  /isCurrent &&\s*\n\s*"font-\[var\(--font-weight-medium\)\] underline underline-offset-\[0\.1875rem\] decoration-hair-strong"/;
for (const [label, rawWindow] of [
  ["horizontal steps", horizontalMarkWindow],
  ["vertical wizard rail", verticalMarkWindow],
]) {
  if (rawWindow === "") {
    findings.push(`Could not isolate the ${label} mark's full window in ${rel} to check section 6.`);
    continue;
  }
  if (!underlineRe.test(codeOnly(rawWindow))) {
    findings.push(
      `${rel}'s ${label} step's LABEL no longer carries isCurrent && "font-[var(--font-weight-medium)] underline ` +
        'underline-offset-[0.1875rem] decoration-hair-strong" — once her second ruling took the number out of the ' +
        "mark, this underline became the row's only remaining visible mark of position for a sighted reader; " +
        "dropping it as apparent decoration leaves a ladder where nobody can tell where the record stands.",
    );
  }
}

if (findings.length > 0) {
  console.error("FAIL status-stepper check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK status-stepper check: the `steps` variant's MARK (both horizontal — the ticket ladder's own drawing — and " +
    "vertical) paints a done and a current step with the SAME ink fill (bg-surface-inverse text-ink-on-inverse) " +
    "and the SAME CheckFat tick glyph, with a later step an empty bg-surface-lift text-ink-tertiary circle and no " +
    "glyph at all — Aurora, 23 Sep 2026 (two rulings, same day): \"on ticket stages, mark the active and past in " +
    "black, only future are gray\" and \"remove the numbers inside (they are not numbered) is either check or " +
    "empty\" — while the current step's LABEL carries the underline (decoration-hair-strong) added the same day " +
    "so the row still has a visible mark of position for a sighted reader, alongside the current mark and " +
    "label's own extra weight and aria-current — and the `stages` variant's hero pill, which no ruling named, " +
    "still carries its own mango current fill and its own per-stage number unchanged.",
);
