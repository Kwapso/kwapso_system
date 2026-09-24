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

   THE UNDERLINE WAS ADDED THE SAME DAY, IMMEDIATELY AFTER THE SECOND FIX,
   AND IT WAS TAKEN OUT AGAIN ON 24 SEP 2026 — SECTION 6 NOW REFUSES IT.
   Her second ruling is about what the MARK contains, nothing more, and
   removing the number from it is correct on its own terms. But once neither
   the fill nor the glyph told `isDone` from `isCurrent` apart, the 23 Sep
   pass judged the ladder had no visible mark of position left for a sighted
   reader, and underlined `isCurrent`'s LABEL to put one back — the kit's own
   "ink, underlined, never coloured" idiom, but nothing she asked for.

   THE THIRD RULING, VERBATIM, 24 SEP 2026: "on tickets stage, why is done
   underlined? also date is missing. icon on completed stages shoudl be
   phospor check regular."

   A question about a mark she never asked for is a rejection, so the
   underline is gone from BOTH `steps` windows and section 6 — which used to
   REQUIRE it — now REFUSES it, while still requiring the weight class that
   sat beside it and predates both 23 Sep rulings.

   WHAT IS LEFT MARKING THE CURRENT STEP, MEASURED. `aria-current="step"`
   (a screen reader only); `font-[var(--font-weight-medium)]` on the current
   mark and label; and the row's own ordering. The weight is worth NOTHING in
   `kwapso_system`: Saans ships two faces (300, 500), the app sets no base
   font-weight, and CSS font matching resolves the UA's `normal` (400) to the
   500 face. Measured in a browser against these two faces at 13px:
   "In progress" is 50.375px wide at 300 and 51.984px at 400, at 500 and at
   `normal` — three identical numbers. The kit's own demo sets body to
   `--font-weight-light`, which is why the signal looks alive here and is dead
   on the ticket screen. Filed back to Aurora rather than replaced with a
   second uninvited mark; this check pins the absence, not a substitute.

   THE GLYPH, HER THIRD SENTENCE. The mark drew `CheckFat` — Phosphor's
   SEPARATE `check-fat` glyph at FILL weight, a tick knocked out of a plate.
   It now draws `Check`, Phosphor's `check`, which this kit has shipped at
   REGULAR weight since 6 Sep 2026 (`foundations/icons/ATTRIBUTION.md`
   §Weight). No new exception was minted; what was wrong was the prose in
   `icon-base.tsx` and `generate-icons.mjs` still claiming the exception list
   was "three named exceptions — Plus, Power and Prohibit", 108 files out of
   date. Section 7 pins the name AND the weight, the latter by reading
   `foundations/icons/icon-art.manifest.json` — so a later edit cannot satisfy
   "it says Check" while `Check.svg` has been flipped back to fill.

   THE DATE, HER SECOND SENTENCE — WHAT THIS FILE CAN AND CANNOT PIN. The
   date is not drawn by this kit. `kwapso_system`'s
   `web/components/tickets/ticket-stages.tsx` hands each stage a `label` that
   is TWO `block` children, the stage name over `formatStageMoment(rung.span
   .from)`, and draws the second only for a rung with a recorded span. What
   the KIT owes that drawing is the half section 8 pins: the `steps` label
   renders the caller's whole `ReactNode` inside a `block w-full truncate`
   box, so each `block` child takes its own line and its own ellipsis. A
   later edit that clamped this label to one line, or rendered anything less
   than `{stage.label}`, would delete the date from every ticket in the
   product from inside this file. Measured, 24 Sep 2026, in a real render
   (`web/test/ticket-stages-shrink.test.tsx`, passing, plus a throwaway probe
   over three histories): the date is present on every rung that has a
   recorded span and absent only where there is none — a stage the ticket
   never stood on, or a ticket whose history predates team migration 0066.
   Nothing in either 23 Sep fix touched it.

   EIGHT SECTIONS. 1 pins the horizontal `steps` mark's fill and weight (the
   ticket ladder's own drawing). 2 pins the same for the vertical wizard
   rail's mark (the identical fill logic, checked separately so a fix
   applied to only one block cannot pass). 3 pins that `stages` is untouched
   — mango AND numbers both. 4 pins the later state's fill in both `steps`
   windows. 5 is the second ruling's own pin: it requires BOTH marks to draw
   `isDone` and `isCurrent` through the identical `CheckFat`-tick branch and
   REFUSES `formatNumber(index + 1)` appearing anywhere in either `steps`
   mark window, so a number cannot come back to this variant even by adding
   a new branch rather than editing the old one. 6 is her third ruling's first half — it
   REFUSES any `underline` / `decoration-` / `underline-offset-` on either
   `steps` LABEL, and still REQUIRES the `font-[var(--font-weight-medium)]`
   that predates both 23 Sep rulings, so the removal cannot be undone and the
   weight cannot be dropped with it. 7 is her third ruling's second half: the
   `steps` mark must draw `Check`, imported from `foundations/icons`, never
   `CheckFat`, and `icon-art.manifest.json` must still record `Check` as
   Phosphor's `check` at REGULAR weight — the name and the weight, pinned
   apart. 8 is the kit's half of her second sentence: both `steps` labels must
   render `{stage.label}` whole, the horizontal one inside `block w-full
   truncate`, with no `line-clamp` anywhere in either label — the contract the
   app's two-line name-over-date label depends on. Every REFUSES check in this
   file was proved to bite by putting the retired code back (the mango class
   in sections 1/2, a `formatNumber` branch in section 5, the underline class
   in section 6, `CheckFat` and a fill-weight manifest entry in section 7, a
   `line-clamp-1` in section 8), confirming the status-stepper step fails red
   each time, then restoring from a `cp` backup taken before the edit.
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

/* The LABEL's own window inside a mark block — from its `data-slot` to the
   end of the `cn(...)` + children that draw it. Sections 6 and 8 need the
   label ALONE: the mark above it legitimately carries the weight class, and
   `status-stepper.tsx`'s own prose around the mark now narrates the retired
   underline at length. Cut positionally by the slot name, never by line. */
function labelWindow(window) {
  const start = window.indexOf('data-slot="status-stepper-label"');
  if (start === -1) return "";
  const end = window.indexOf("{stage.label}", start);
  return end === -1 ? window.slice(start) : window.slice(start, end + "{stage.label}".length);
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
  /isDone \|\| isCurrent \? \(\s*<>\s*\{isDone \? <span className="sr-only">\{doneLabel\}<\/span> : null\}\s*<Check size=\{16\} aria-hidden="true" \/>\s*<\/>\s*\) : null\}/;
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
        '"isDone || isCurrent ? (…Check…) : null" tick branch — Aurora, 23 Sep 2026 (second ruling, reviewing ' +
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
   6 · NOTHING IS UNDERLINED — Aurora, 24 SEP 2026, verbatim: "on tickets
   stage, why is done underlined?"

   THIS SECTION USED TO REQUIRE THE OPPOSITE, AND THAT IS THE POINT OF THE
   NOTE. It was written on 23 Sep 2026 to stop a later "cleanup" quietly
   dropping an underline the same pass had just added — an underline no
   ruling asked for, added because removing the number left `isDone` and
   `isCurrent` drawing the identical fill and the identical glyph. She asked
   why it was there. So the pin is inverted: the class is REFUSED, in both
   `steps` LABEL windows, and the weight class that sat beside it (and
   predates both 23 Sep rulings) is still REQUIRED, so the removal cannot be
   undone by hand and the weight cannot be swept out with it.

   Comments are stripped before the REFUSAL, the same reason sections 5 and 7
   strip them: both this file's header and `status-stepper.tsx`'s own render-
   site comment now narrate the underline at length, by name, in backticks,
   and none of that prose may trip a guard about the working code.
   ========================================================================= */
const labelWeightRe = /isCurrent && "font-\[var\(--font-weight-medium\)\]"/;
for (const [label, rawWindow] of [
  ["horizontal steps", horizontalMarkWindow],
  ["vertical wizard rail", verticalMarkWindow],
]) {
  if (rawWindow === "") {
    findings.push(`Could not isolate the ${label} step's full window in ${rel} to check section 6.`);
    continue;
  }
  const window = codeOnly(labelWindow(rawWindow));
  if (window === "") {
    findings.push(
      `Could not isolate the ${label} step's LABEL window in ${rel} (no data-slot="status-stepper-label") to ` +
        "check section 6.",
    );
    continue;
  }
  if (/underline|decoration-|underline-offset-/.test(window)) {
    findings.push(
      `${rel}'s ${label} step's LABEL is underlined again — Aurora, 24 Sep 2026: "on tickets stage, why is done ` +
        'underlined?" That underline was added on 23 Sep 2026 by the pass that removed the number from the mark, ' +
        "to replace the position signal the removal cost; she never asked for it and asking why it is there is a " +
        "rejection. If a visible mark of position is put back, it needs her ruling and this pin rewritten to " +
        "match — not an underline reintroduced under the old argument.",
    );
  }
  if (!labelWeightRe.test(window)) {
    findings.push(
      `${rel}'s ${label} step's LABEL no longer carries isCurrent && "font-[var(--font-weight-medium)]" — that ` +
        "weight predates both 23 Sep 2026 rulings and was not part of the underline; removing the underline must " +
        "not take it too. (Measured 24 Sep 2026: it is a no-op in kwapso_system, whose <body> sets no " +
        "font-weight, so the UA's normal resolves to Saans's 500 face and every label on the row is already " +
        "Medium. It still reads in the kit's own demo, which sets body to --font-weight-light. The gap is filed " +
        "back to Aurora, not patched here.)",
    );
  }
}

/* ============================================================================
   7 · THE TICK IS PHOSPHOR'S `Check`, AT REGULAR WEIGHT — Aurora, 24 SEP
   2026, verbatim: "icon on completed stages shoudl be phospor check
   regular."

   TWO PINS, DELIBERATELY APART. The NAME is pinned in this file's source
   (the import, and the absence of `CheckFat` from either mark's code); the
   WEIGHT is pinned against `foundations/icons/icon-art.manifest.json`, which
   records every glyph's verified upstream name and weight as data and is
   itself enforced offline by `check-icon-art.mjs`. Pinning only the name
   would pass the day somebody re-drew `Check.svg` at fill weight, which is
   exactly the defect ATTRIBUTION.md records shipping once before ("a rounded
   rectangle 208 units across with the tick knocked out of it").

   `CheckFat` IS NOT A HEAVIER `Check`. It is Phosphor's own separate glyph
   `check-fat`, at fill weight. Her word is `check`, which is the name on
   phosphor.dev, which is the name in this folder — no alias, no translation.
   ========================================================================= */
{
  if (!/^import \{ Check \} from "\.\.\/\.\.\/foundations\/icons";$/m.test(src)) {
    findings.push(
      `${rel} does not import { Check } from "../../foundations/icons" — Aurora, 24 Sep 2026: "icon on completed ` +
        'stages shoudl be phospor check regular." `Check` is Phosphor\'s `check`, which this kit ships at regular ' +
        "weight; the glyph this file drew before her ruling, `CheckFat`, is Phosphor's separate `check-fat` at " +
        "fill weight.",
    );
  }
  for (const [label, rawWindow] of [
    ["horizontal steps", horizontalMarkWindow],
    ["vertical wizard rail", verticalMarkWindow],
  ]) {
    if (rawWindow !== "" && /CheckFat/.test(codeOnly(rawWindow))) {
      findings.push(
        `${rel}'s ${label} mark draws CheckFat again — the fill-weight plate her 24 Sep 2026 ruling replaced with ` +
          "Phosphor's regular-weight `Check`.",
      );
    }
  }

  const manifestPath = path.join(HERE, "..", "..", "foundations", "icons", "icon-art.manifest.json");
  let manifest = null;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    findings.push(
      `Could not read foundations/icons/icon-art.manifest.json to check the tick's WEIGHT (${error.message}) — ` +
        "section 7 pins the name and the weight separately on purpose, and without the manifest the weight half " +
        "is unproven.",
    );
  }
  if (manifest) {
    const glyphs = manifest.glyphs ?? manifest;
    const check = glyphs.Check;
    if (!check) {
      findings.push("icon-art.manifest.json no longer records a glyph named `Check` at all.");
    } else if (check.upstream !== "check" || check.weight !== "regular") {
      findings.push(
        "icon-art.manifest.json records `Check` as " +
          `{upstream: ${JSON.stringify(check.upstream)}, weight: ${JSON.stringify(check.weight)}} — it must be ` +
          "Phosphor's `check` at REGULAR weight, which is what Aurora asked the stage mark to draw on 24 Sep " +
          "2026 and what foundations/icons/ATTRIBUTION.md §Weight records. `check` at FILL weight is not a " +
          "heavier tick; it is a rounded rectangle with the tick knocked out of it, and it has shipped as a " +
          "filled square in this product once already.",
      );
    }
  }
}

/* ============================================================================
   8 · THE LABEL DRAWS WHATEVER THE CALLER HANDS IT, ON AS MANY LINES AS IT
   HAS — the kit's half of Aurora's second sentence, 24 SEP 2026: "also date
   is missing."

   THE DATE IS NOT DRAWN HERE and cannot be pinned here directly.
   `kwapso_system`'s `web/components/tickets/ticket-stages.tsx` hands each
   stage a `label` of TWO `block` children — the stage name over
   `formatStageMoment(rung.span.from)` — and draws the second only for a rung
   with a recorded span. Measured 24 Sep 2026 over a real render: the date is
   present on every rung that has a span and absent only where there is none.

   WHAT THE KIT OWES THAT DRAWING is the contract this section pins: the
   `steps` label renders `{stage.label}` WHOLE, inside a `block w-full
   truncate` box, so each `block` child gets its own line and its own
   ellipsis instead of one cutting the other short. A `line-clamp`, a height
   cap, or a label narrowed to anything less than the caller's node would
   delete the date from every ticket in the product from inside this file,
   and would look like tidying while doing it.
   ========================================================================= */
for (const [label, rawWindow] of [
  ["horizontal steps", horizontalMarkWindow],
  ["vertical wizard rail", verticalMarkWindow],
]) {
  if (rawWindow === "") {
    findings.push(`Could not isolate the ${label} step's full window in ${rel} to check section 8.`);
    continue;
  }
  const raw = labelWindow(rawWindow);
  if (raw === "") {
    findings.push(`Could not isolate the ${label} step's LABEL window in ${rel} to check section 8.`);
    continue;
  }
  if (!/\{stage\.label\}/.test(raw)) {
    findings.push(
      `${rel}'s ${label} step's LABEL no longer renders {stage.label} — the caller's whole node is the drawing. ` +
        "`ticket-stages.tsx` hands this two block children, the stage name over its date; anything that renders " +
        "less than the node deletes the second line from every ticket in the product.",
    );
  }
  if (/line-clamp|max-h-|h-\[var\(--control-height/.test(codeOnly(raw))) {
    findings.push(
      `${rel}'s ${label} step's LABEL has grown a line clamp or a height cap — the label must grow to the node ` +
        'it is handed. Aurora, 24 Sep 2026: "also date is missing." The date is the SECOND line of that node.',
    );
  }
}
{
  const raw = labelWindow(horizontalMarkWindow);
  if (raw !== "" && !/"block w-full truncate/.test(raw)) {
    findings.push(
      `${rel}'s horizontal \`steps\` LABEL is no longer "block w-full truncate …" — that exact shape is what lets ` +
        "each `block` child of the caller's label take the full column width and its own ellipsis, which is how " +
        "the ticket ladder draws a stage name above its date without one clipping the other.",
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
    "and the SAME tick glyph, with a later step an empty bg-surface-lift text-ink-tertiary circle and no glyph " +
    "at all — Aurora, 23 Sep 2026 (two rulings, same day): \"on ticket stages, mark the active and past in " +
    "black, only future are gray\" and \"remove the numbers inside (they are not numbered) is either check or " +
    "empty\". That tick is Phosphor's `Check` at REGULAR weight (name pinned here, weight pinned against " +
    "icon-art.manifest.json), never `CheckFat` — Aurora, 24 Sep 2026: \"icon on completed stages shoudl be " +
    "phospor check regular\". NEITHER `steps` LABEL is underlined — same ruling, \"why is done underlined?\" — " +
    "and both still carry the current step's own font-weight-medium, which predates it; both also still render " +
    "{stage.label} whole inside an unclamped block w-full truncate box, which is what lets the ticket ladder " +
    "draw a stage name above its date. And the `stages` variant's hero pill, which no ruling named, still " +
    "carries its own mango current fill and its own per-stage number unchanged.",
);
