/* ============================================================================
   StatusStepper — the record's progression (2 direct call sites).

   DESIGN SOURCE — CHAPTER 23, NOT 27
   "Kwapso UI Kit.dc.html" → `<section id="ch23">` "Auth & account", the
   sub-specimen headed

       "Record hero with the stages in it"
       "Seven named stages · the portal shows three"

   and its spec line, verbatim and load-bearing:

       "Stage pills 12.5px / 26px tall · done takes the paper fill, current
        takes mango with a charcoal label, later stages take the quiet fill
        with disabled ink · a stage is pressable and scrolls the record to
        that stage's panel · over five stages the tail folds into “+n” · the
        portal collapses the same seven into with us / with you / done"

   Transcribed into design-mothership/specimens/kwapso-patterns.css as
   `.kw-stages`, `.kw-stage`, `.kw-stage__n`, `.kw-stage--current`,
   `.kw-stage--later`, which is where the 12.5 becomes the badge step ("it IS
   status text under ruling 02; the kit's 12.5 is the retired non-step") and
   the height becomes `--control-height-pill` (26).

   The kit ALSO draws a second stepper, in chapter 15 (Navigation), headed
   "Stepper — programme phases": four equal columns, each a 26 mark over a
   hairline connector with the label beneath. That is `variant="steps"`
   below. It is an ADDED variant — the commission lists none for this folder
   and PATTERN §2 permits additions — and it exists because motion/motion.css
   ships `.motion-step-connector` for exactly this drawing and because the
   chapter draws it. Both variants are the kit's own; neither is invented.

   THE LAW THIS FILE OBEYS
   · ONE MANGO PER VIEW, AND IT IS THE PRESENT — `stages` ONLY, amended 23 SEP
     2026. The current PILL carries the only mango in the hero. This is not
     mango-as-a-status, which ruling 26 forbids — it is mango marking
     position, the same use `.kw-stage--current` makes and the same use
     t20-gaps.md T20-3 records as explicitly not violating the ruling. Done
     and later stages carry no accent at all. THIS BULLET IS SCOPED TO
     `variant="stages"` (chapter 23's hero row of pills) SINCE 23 SEP 2026 —
     see the `steps` mark's own comment, below, for why `variant="steps"`
     (chapter 15's rail, both orientations) no longer marks its current step
     with mango at all: Aurora's ruling that day ("on ticket stages, mark the
     active and past in black, only future are gray") retired the accent for
     that variant's small circular MARK specifically, and only for it — the
     `stages` pill and this law both stand unchanged.
   · Charcoal on every accent: the current pill's label is `--ink-on-accent`,
     never white, in both palettes. (Also `stages`-only since 23 Sep 2026, for
     the same reason — `steps`' current mark carries `--ink-on-inverse` now.)
   · Every pill is a pill (`--radius-pill`). No box radius reaches this file.
   · Disabled is a fill and an ink — `--surface-idle` with `--ink-disabled` —
     which is exactly how the kit already draws a LATER stage. "Later is
     disabled ink, not hidden": a record that hides its future reads as
     finished.
   · Focus is ONE global rule (tokens.css §8). A pressable stage is a real
     button and the ring lands on it at its own radius. No ring here.
   · Motion is `.motion-step` (colour) and `.motion-step-connector` (the fill
     between two marks, a scaleX whose origin motion.css already mirrors
     under `dir="rtl"`). No keyframe, no duration and no curve is written in
     this file.
   · Numbers are tabular and never drop — "we are at three of seven" is the
     sentence a client repeats back — and they go through `formatNumber`, so
     a document in Arabic, Urdu or Persian gets its own numerals. THIS BULLET
     IS NOW `stages`-ONLY TOO, SINCE 23 SEP 2026 (second ruling that day,
     reviewing kit v1.2.164): "remove the numbers inside (they are not
     numbered) is either check or empty." `variant="steps"` (chapter 15's
     rail, both orientations) no longer calls `formatNumber` from either mark
     at all — a reached stage (done or current) draws the `Check` tick, a
     stage still ahead draws nothing. The sentence a client repeats back is
     still true of `stages`' hero pills, which keep their numbers unchanged;
     it stopped being true of the small circular MARK the moment she ruled it
     was never a numbered thing to begin with.
   · NOTHING IS UNDERLINED, AND THE TICK IS PHOSPHOR'S `Check` AT REGULAR
     WEIGHT — `variant="steps"` ONLY, 24 SEP 2026. Two of her words, one
     line: "on tickets stage, why is done underlined? … icon on completed
     stages shoudl be phospor check regular."

     THE UNDERLINE LIVED FOR ONE DAY AND WAS NEVER HERS. The 23 Sep pass that
     carried out the bullet above took the number out of the mark, found that
     `isDone` and `isCurrent` then drew the identical fill AND the identical
     glyph, and underlined the current LABEL to put the position back. Her
     ruling that day says nothing about the label; asking why it is there is
     a rejection. It is gone from BOTH `steps` windows.

     WHAT THAT LEAVES, MEASURED: `aria-current="step"` (a screen reader only),
     the current mark's and label's `font-[var(--font-weight-medium)]`, and
     the row's own ordering. The weight is worth nothing in `kwapso_system` —
     Saans ships two faces, 300 and 500, the app sets no base font-weight, and
     CSS font matching resolves the UA's `normal` (400) to the 500 face, so
     the whole page already renders at Medium. Measured: "In progress" at 13px
     is 50.375px at 300 and 51.984px at 400, 500 and `normal` alike. The kit's
     own demo sets body to `--font-weight-light`, which is why the signal
     looks alive here and is dead there. So on the ticket screen the current
     step now draws exactly like a done step. That is filed back to her, not
     patched with a second uninvited mark. See the horizontal `steps` label's
     own render-site comment for the full working.

     THE TICK IS `Check`, NOT `CheckFat`. Her own words name Phosphor's
     `check` at regular weight, and this kit already ships it that way:
     `foundations/icons/Check.svg` is byte-identical to upstream
     `regular/check.svg` and `icon-art.manifest.json` records
     `{"upstream":"check","weight":"regular"}`. `CheckFat` was a different
     Phosphor glyph (`check-fat`, fill) that this file happened to draw. No
     new exception was created — `Check` has been on the kit's regular-weight
     list since 6 Sep 2026 (`foundations/icons/ATTRIBUTION.md`, §Weight,
     which her ruling now also names).

   THE SEVEN-STAGE CASE AT MOBILE WIDTH — WHAT IT DOES AND WHY
   The kit answers this itself and the answer is NOT a media query: "over
   five stages the tail folds into '+n'", and the kit's own drawing of the
   seven-stage record shows five pills followed by a "+2". So `maxVisible`
   defaults to 5 and the fold is unconditional — the same at 320 as at 1440.
   Two reasons that is right rather than lazy. A fold that only happened on a
   phone would mean the client and the account manager are looking at two
   different progressions while talking to each other on a call, which is the
   one thing this hero exists to prevent. And a width-triggered fold needs a
   breakpoint the kit never states, which would be an invented value.
   Underneath the fold, `.kw-stages` is `flex-wrap`, so five pills that still
   do not fit at 320 wrap to a second line rather than scrolling out of
   reach. A four-stage progression is under the fold and draws all four,
   which is the other case this component has to handle.

   RENDERING CONTEXT
   `"use client"`. A pressable stage means this module builds an event
   handler during its own render.
   ========================================================================= */

"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { Check } from "../../foundations/icons";

/** Where a stage sits relative to the present. */
export type StatusStageState = "done" | "current" | "later";

export interface StatusStage {
  /** Stable key, and the value handed to `onStageSelect`. Falls back to the index. */
  id?: string;
  /** The stage's name. The words always say it; the number never carries it alone. */
  label: React.ReactNode;
  /**
   * Override the position this stage is drawn at. Left unset, everything
   * before `current` is done, `current` is current, and the rest are later.
   */
  state?: StatusStageState;
}

/* `.kw-stage` — the pill. Shared by all three positions so they cannot drift
   apart; the position adds only a fill and an ink. */
const pillClasses = [
  "inline-flex items-center gap-[var(--space-1h)]",
  "h-[var(--control-height-pill)] px-3 rounded-pill",
  // badge · 12 / 500-or-300 by position. `leading-none` is the kit's own
  // `line-height: 1` on a 26 pill.
  "text-badge leading-none whitespace-nowrap",
  "border-0",
  "motion-step",
];

/* The chapter-15 mark: 26 across, a circle, centred content. */
const markClasses = [
  "inline-grid size-[var(--control-height-pill)] shrink-0 place-content-center",
  "rounded-pill border-0",
  "text-badge leading-none tabular-nums",
  "motion-step",
];

export interface StatusStepperProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "children"> {
  /** The progression, in order. Seven and four are both real; see the header. */
  stages: readonly StatusStage[];
  /**
   * Zero-based index of the stage the record is at now. Anything before it is
   * done, anything after it is later. A stage may still override its own
   * position through `stage.state`.
   */
  current?: number;
  /**
   * Which drawing. `stages` is chapter 23's hero — a wrapping row of pills,
   * the default. `steps` is chapter 15's equal-column rail with a connector
   * between the marks and the label beneath each one.
   */
  variant?: "stages" | "steps";
  /**
   * Which way the `steps` rail runs. Ignored by `stages`, which is chapter
   * 23's wrapping row of pills and has no vertical drawing anywhere.
   *
   * `horizontal` is chapter 15's "Stepper — programme phases": equal columns,
   * a connector between the marks, the label beneath each one.
   *
   * `vertical` is the WIZARD rail, and it is a different drawing rather than
   * the same one rotated — read off the artifact's own markup, which is the
   * same in all four flows that draw it (27.14 onboarding, 27.30 import,
   * 27.38 multi-step form, 27.44 import proposal):
   *
   *     <div style="display: flex; flex-direction: column; gap: 14px;">
   *       <div style="display: flex; align-items: center; gap: 10px;">
   *         <span 24px circle>✓</span><span>The file</span>
   *
   * A column of mark-beside-label rows, and NO CONNECTOR — the artifact
   * draws none in any of the four. So vertical does not rotate the connector,
   * it drops it, which is why this is a branch and not a flex-direction.
   */
  orientation?: "horizontal" | "vertical";
  /**
   * How many stages are drawn before the tail folds into "+n". The kit's own
   * figure is five ("over five stages the tail folds into '+n'"). `0` turns
   * the fold off and draws every stage.
   */
  maxVisible?: number;
  /**
   * Pressing a stage moves the record to it. Absent, the stages render as
   * spans: a control that silently does nothing is worse than a label.
   */
  onStageSelect?: (index: number, stage: StatusStage) => void;
  /** Nothing may be pressed. A fill and an ink, never an opacity. */
  disabled?: boolean;
  /**
   * The whole progression's accessible name. Defaulted so no call site ships
   * a nameless list, and a prop because the apps run in Arabic, Urdu and
   * Persian.
   */
  label?: string;
  /**
   * The sentence a screen reader hears for the current stage — the kit's own
   * "we are at three of seven". Both numbers go through `formatNumber`, so
   * only the words here need translating.
   */
  formatProgress?: (position: number, total: number) => string;
  /**
   * The "+2" pill. A prop because the plus sign is punctuation in one
   * alphabet and not in another, and because some locales put the count
   * first.
   */
  formatOverflow?: (count: number) => string;
  /**
   * The number printed inside a stage pill. The kit draws "01", "02" — two
   * digits, tabular, never dropped — so the default pads to two.
   */
  formatNumber?: (value: number) => string;
  /**
   * The accessible name of a done stage's tick, which has no words of its
   * own. Read before the stage's label.
   */
  doneLabel?: string;
}

/** Two tabular digits in the runtime's own numbering system. */
function defaultFormatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumIntegerDigits: 2,
    useGrouping: false,
  }).format(value);
}

/** One number in the runtime's own numbering system, unpadded. */
function plainNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { useGrouping: false }).format(value);
}

/**
 * The system's record progression.
 *
 * TEN STATES
 *  1. default        — the kit's three positions at once, `stages` (the hero
 *                      row of pills): done stages on `--surface-raised` with
 *                      a tertiary-ink number, the current stage on mango with
 *                      a charcoal label at weight 500, later stages on
 *                      `--surface-idle` with `--ink-disabled`. `steps` (the
 *                      chapter-15 rail, both orientations) draws its MARK
 *                      differently since 23 Sep 2026 — done and current share
 *                      one ink fill (`--surface-inverse`/`--ink-on-inverse`)
 *                      AND, since her second ruling that same day ("remove
 *                      the numbers inside … is either check or empty"), the
 *                      same glyph too: both draw the `Check` tick (Phosphor's
 *                      `check` at regular weight, her 24 Sep 2026 ruling;
 *                      `CheckFat` until then), never a number. A later mark
 *                      draws neither fill nor glyph — an empty grey circle.
 *                      Done and current are told apart by NOTHING the mark
 *                      draws and, since the underline came off on 24 Sep
 *                      2026, by nothing visible on the label either: what is
 *                      left is `aria-current`, the current mark and label's
 *                      own extra weight (a no-op in `kwapso_system`, whose
 *                      body carries no font-weight — measured, see the
 *                      horizontal label's render-site comment), and the row's
 *                      reached-before-later ordering. That gap is open with
 *                      Aurora rather than closed with a second invention.
 *  2. hover          — a pressable stage takes one defined step from its own
 *                      fill: `--surface-quiet` for done and later,
 *                      `--btn-primary-hover` for the mango current pill. A
 *                      colour swap, never a fade, and never `--primary`
 *                      itself. The kit draws no hover for `.kw-stage` at all;
 *                      derived, and logged as GAPS-CE STP-2.
 *  3. focus-visible  — NOT here. tokens.css §8 rings every control at once,
 *                      at the pill's own radius.
 *  4. active/pressed — does not apply as a skin. Pressing a stage navigates;
 *                      the acknowledgement is the record moving, and the kit
 *                      draws no pressed state for a pill that is a link in
 *                      everything but markup. `aria-current` carries which
 *                      one is the present.
 *  5. disabled       — `disabled`: every stage renders as a span, and the
 *                      current stage keeps its own fill (mango on `stages`,
 *                      ink on `steps` since 23 Sep 2026) because the record
 *                      is still at that stage — the progression is not
 *                      switched off, the navigation is. Later stages already
 *                      carry the disabled ink by design.
 *  6. loading        — does not apply, deliberately. A progression drawn
 *                      before its stages arrive would state a position the
 *                      record may not be at. The caller renders a `Skeleton`
 *                      in the hero's place until the stages exist.
 *  7. empty          — `stages` of length zero renders `null`. An empty
 *                      progression rail with no stages in it is noise, and
 *                      the kit never draws one.
 *  8. error          — does not apply, and must not be faked. A BLOCKED
 *                      record is a status and belongs to the status pill
 *                      beside the title (`Badge`, ruling 26's dot plus
 *                      words); a poppy stage would put a status colour into
 *                      a position mark and break "one mango, and it is the
 *                      present". GAPS-CE STP-3.
 *  9. selected       — the current stage IS the selected one, `aria-current=
 *                      "step"` on every variant. `stages` still draws it with
 *                      the mango fill and charcoal label chapter 23 specifies;
 *                      `steps`' own MARK no longer carries an accent for this,
 *                      nor (since 23 Sep 2026's second ruling) a distinct
 *                      glyph — done and current share both the ink fill and
 *                      the tick, so "selected" there reads through
 *                      `aria-current` and the current mark's extra weight
 *                      alone — not through colour, not through the mark's own
 *                      content, and (since 24 Sep 2026) not through an
 *                      underline on the label either.
 * 10. read-only      — every stepper without `onStageSelect` is read-only,
 *                      and that is the default. The stages become spans, so
 *                      there are no tab stops that do nothing.
 *
 * THREE BREAKPOINTS
 *  mobile / tablet / desktop — UNCHANGED BY WIDTH, on purpose, and the header
 *  explains at length why the seven-stage fold is a count rule rather than a
 *  breakpoint. What does change with width is reflow, not drawing: the
 *  `stages` row is `flex-wrap`, exactly as `.kw-stages` is, so pills that do
 *  not fit take a second line; the `steps` rail keeps its equal columns and
 *  ellipsises the labels (`min-w-0` + `truncate`), because stacking a rail
 *  turns a stepper into a list and loses the spine that makes it readable as
 *  a progression at a glance.
 *
 * RTL — this is the component that needed the most care. The `stages` row is
 * ordered by `flex` in DOM order with no side named, so stage 01 sits at the
 * reading start in Arabic, Urdu and Persian. The `steps` connector fills in
 * READING ORDER: it is a `scaleX` and motion.css's `.motion-step-connector`
 * already flips its `transform-origin` to `100% 50%` under `[dir="rtl"]`, so
 * the rail fills the way the reader reads with nothing written here. The tick
 * glyph is not mirrored — a checkmark is a symbol, not a direction.
 */
const StatusStepper = React.forwardRef<HTMLDivElement, StatusStepperProps>(
  (
    {
      className,
      stages,
      current = 0,
      variant = "stages",
      orientation = "horizontal",
      maxVisible = 5,
      onStageSelect,
      disabled = false,
      label = "Progress",
      formatProgress,
      formatOverflow,
      formatNumber = defaultFormatNumber,
      doneLabel = "Done",
      ...props
    },
    ref,
  ) => {
    // Empty: the kit never draws a progression with no stages in it.
    if (stages.length === 0) return null;

    const total = stages.length;
    const pressable = Boolean(onStageSelect) && !disabled;

    const stateOf = (stage: StatusStage, index: number): StatusStageState =>
      stage.state ?? (index < current ? "done" : index === current ? "current" : "later");

    const describeProgress =
      formatProgress ??
      ((position: number, count: number) => `Step ${plainNumber(position)} of ${plainNumber(count)}`);
    const describeOverflow = formatOverflow ?? ((count: number) => `+${plainNumber(count)}`);

    /* "Over five stages the tail folds into '+n'." The fold keeps the CURRENT
       stage visible even when it sits in the tail — a hero that hides where
       the record is has stopped being a hero. */
    const folding = maxVisible > 0 && total > maxVisible;
    let visibleCount = folding ? maxVisible : total;
    if (folding && current >= visibleCount) visibleCount = Math.min(current + 1, total);
    const hidden = total - visibleCount;
    const visible = stages.slice(0, visibleCount);

    const rowProps = {
      "data-slot": "status-stepper",
      "data-variant": variant,
      "data-orientation": variant === "steps" ? orientation : undefined,
      "data-disabled": disabled ? "" : undefined,
      role: "list" as const,
      "aria-label": label,
    };

    /* ---- The wizard rail: a column of mark-beside-label rows, no connector.
       The artifact draws this identically in 27.14, 27.30, 27.38 and 27.44 —
       `flex-direction: column; gap: 14px`, each row `align-items: center;
       gap: 10px`, and no connector in any of the four. 14 and 10 land on
       `--space-3h` and `--space-2h`. The mark is the same mark the horizontal
       rail draws, so the done / current / later skins are not restated.
       ------------------------------------------------------------------- */
    if (variant === "steps" && orientation === "vertical") {
      return (
        <div
          ref={ref}
          {...rowProps}
          className={cn("flex w-full min-w-0 flex-col gap-[var(--space-3h)]", className)}
          {...props}
        >
          {visible.map((stage, index) => {
            const state = stateOf(stage, index);
            const isDone = state === "done";
            const isCurrent = state === "current";
            const key = stage.id ?? String(index);

            const body = (
              <>
                <span
                  data-slot="status-stepper-mark"
                  className={cn(
                    markClasses,
                    /* AURORA, 23 SEP 2026, VERBATIM (first ruling that day):
                       "on ticket stages, mark the active and past in black,
                       only future are gray." See the horizontal `steps` block
                       below for the full argument (this vertical wizard rail
                       draws the identical mark, never wired to a real call
                       site as of this pass, so it is fixed in step rather
                       than left to drift the day something does call it).
                       `isDone` and `isCurrent` share the one ink fill; that
                       part of the first ruling stands.

                       AURORA, 23 SEP 2026, VERBATIM (SECOND RULING, LATER THE
                       SAME DAY, reviewing this fill as shipped in kit
                       v1.2.164): "remove the numbers inside (they are not
                       numbered) is either check or empty." The first ruling
                       left the current mark's NUMBER in place on the ink
                       fill, and the previous pass argued a reader could still
                       tell current from done by the tick-vs-number glyph. She
                       removed that argument: the stages are not numbered
                       things, so a mark is either a check or it is empty. See
                       the horizontal block's own comment for the full
                       argument and what survives once the glyph can no
                       longer say it either. */
                    (isDone || isCurrent) && "bg-surface-inverse text-ink-on-inverse",
                    // The current mark alone keeps the extra weight it always
                    // had — the smallest non-colour mark of "you are here"
                    // once neither the fill nor the glyph can say it.
                    isCurrent && "font-[var(--font-weight-medium)]",
                    !isDone && !isCurrent && "bg-surface-lift text-ink-tertiary shadow-[var(--hairline)]",
                  )}
                >
                  {isDone || isCurrent ? (
                    <>
                      {isDone ? <span className="sr-only">{doneLabel}</span> : null}
                      <Check size={16} aria-hidden="true" />
                    </>
                  ) : null}
                </span>
                <span
                  data-slot="status-stepper-label"
                  className={cn(
                    "min-w-0 truncate text-caption",
                    // NO UNDERLINE. Removed 24 Sep 2026 with the horizontal
                    // rail's — see that block's own render-site comment,
                    // below, for her question and what it leaves. Weight is
                    // what remains here, exactly as it was before 23 Sep.
                    isCurrent && "font-[var(--font-weight-medium)]",
                    state === "later" ? "text-ink-tertiary" : "text-foreground",
                  )}
                >
                  {stage.label}
                </span>
              </>
            );

            const rowClasses = "flex w-full items-center gap-[var(--space-2h)] text-start";

            return (
              <span
                key={key}
                role="listitem"
                data-slot="status-stepper-step"
                data-state={state}
                aria-current={isCurrent ? "step" : undefined}
                className="flex min-w-0"
              >
                {pressable ? (
                  <button
                    type="button"
                    onClick={() => onStageSelect?.(index, stage)}
                    aria-label={isCurrent ? describeProgress(index + 1, total) : undefined}
                    /* The reset line, WITHOUT `[font:inherit]`: Tailwind emits
                       that arbitrary property AFTER the named utilities in the
                       bundle, where it silently outranks any control's own
                       type step (the accordion/mode-toggle bug). The row's
                       type lives on its children, so preflight's
                       `button { font: inherit }` already does the whole job. */
                    className={cn(
                      rowClasses,
                      "cursor-pointer border-0 bg-transparent p-0 text-inherit",
                    )}
                  >
                    {body}
                  </button>
                ) : (
                  <span className={rowClasses}>{body}</span>
                )}
              </span>
            );
          })}
          {hidden > 0 ? (
            <span
              role="listitem"
              data-slot="status-stepper-overflow"
              className="text-caption text-ink-tertiary"
            >
              {describeOverflow(hidden)}
            </span>
          ) : null}
        </div>
      );
    }

    /* ---- Chapter 15's rail: equal columns, mark over connector, label under.
       ------------------------------------------------------------------- */
    if (variant === "steps") {
      return (
        <div
          ref={ref}
          {...rowProps}
          className={cn("flex w-full items-start", className)}
          {...props}
        >
          {visible.map((stage, index) => {
            const state = stateOf(stage, index);
            const isDone = state === "done";
            const isCurrent = state === "current";
            const key = stage.id ?? String(index);

            const mark = (
              <span
                data-slot="status-stepper-mark"
                className={cn(
                  markClasses,
                  /* AURORA, 23 SEP 2026, VERBATIM (first ruling that day):
                     "on ticket stages, mark the active and past in black,
                     only future are gray."

                     THIS RAIL IS THE TICKET LADDER (`web/components/tickets/
                     ticket-stages.tsx`, this app's own `variant="steps"
                     orientation="horizontal"` caller). The app lane that read
                     her ruling found the label text was already ONE reading
                     by inheritance — done and current both painted this
                     span's own `text-foreground`, only a later stage dropped
                     to `text-ink-tertiary` — so the label was never the
                     problem. The THIRD reading was this mark: done took an
                     ink circle with a tick, a later stage took a grey circle
                     with its number, and the current stage alone took a
                     MANGO circle with its number — the one accent in the
                     view, which is exactly what her ruling asked to stop.

                     THE APP LANE ALSO TRIED, AND REJECTED, A LOCAL FIX:
                     rebinding `--surface-brand`/`--ink-on-accent` from the
                     app leaks, because `--warning-foreground` (the
                     "Reopened" badge on the same ladder) resolves through
                     `--ink-on-accent` too — repainting the mark black would
                     repaint that badge's label and break its contrast on
                     `--warning`. That is why this is a kit change and not an
                     app-side rebind.

                     THE FIRST FIX (v1.2.164): `isCurrent` took the SAME ink
                     fill `isDone` already took — `--surface-inverse` /
                     `--ink-on-inverse` — while the current mark kept drawing
                     its own NUMBER rather than the tick `isDone` draws. Two
                     fill readings replaced three, and the pass argued a
                     reader could still tell current from done by the
                     tick-to-number boundary: the current mark was the first
                     ink circle still showing a number, structurally the same
                     way a reader finds today's date on a calendar by finding
                     the boundary between the crossed-off days and the ones
                     still blank.

                     AURORA, 23 SEP 2026, VERBATIM (SECOND RULING, LATER THE
                     SAME DAY, reviewing that fill as shipped in kit v1.2.164):
                     "remove the numbers inside (they are not numbered) is
                     either check or empty." She removed the tick-to-number
                     argument by name: the stages are not numbered things, so
                     a mark is either a check or it is empty.

                     THE SECOND FIX (23 Sep 2026): `isCurrent` now draws
                     the SAME GLYPH `isDone` draws — the tick — instead
                     of `formatNumber(index + 1)`. A later mark draws nothing
                     at all (an empty circle), where it used to draw its own
                     number. No branch in this mark calls `formatNumber`
                     anymore; `check-status-stepper.mjs` pins that it cannot
                     come back. The ink-vs-grey fill from the first fix is
                     untouched — this pass only removes what was still inside
                     the fill.

                     THE THIRD RULING, 24 SEP 2026, VERBATIM: "icon on
                     completed stages shoudl be phospor check regular." The
                     glyph this branch draws is now `Check` — Phosphor's
                     `check`, regular weight, which this kit has shipped at
                     that weight since 6 Sep 2026 — and no longer `CheckFat`,
                     which is Phosphor's separate `check-fat` glyph at fill.
                     Her word is the glyph's own upstream name, so nothing is
                     translated on the way in. No new weight exception was
                     minted; `foundations/icons/ATTRIBUTION.md` §Weight is the
                     list, it already held `Check`, and it now also carries
                     her ruling and its date.

                     WHAT A READER HAS LEFT, NOW THAT NEITHER THE FILL NOR THE
                     GLYPH TELLS DONE FROM CURRENT, AND THE UNDERLINE IS GONE
                     TOO (24 Sep 2026 — see the LABEL's own comment below):
                     (1) weight — the current mark and its label both keep the
                     `font-[var(--font-weight-medium)]` they carried before
                     either ruling. IN THE KIT'S OWN DEMO that is a real step,
                     because demo.css sets body to `--font-weight-light`; IN
                     `kwapso_system` IT IS NOTHING, measured rather than
                     assumed — the app sets no base font-weight, Saans ships
                     only 300 and 500, and CSS font matching resolves a 400
                     request to the 500 face, so every label on the row is
                     already Medium. (2) `aria-current="step"` on the
                     pressable/static stage below, unchanged, which is what a
                     screen reader still reports — and the ONLY one of these
                     that is unambiguously working. (3) position — the row is
                     ordered and contiguous (done, done, …, current, later,
                     later…), so the LAST filled (ink) mark in reading order
                     is structurally the current one; that requires scanning
                     the row rather than reading one mark. So for a sighted
                     reader on the ticket screen there is now NO mark of
                     position at all. This is stated, not patched: the last
                     thing invented here to close it is the thing she just
                     asked about. The MARK itself still says nothing beyond
                     fill and glyph — this file's own TEN STATES block, item
                     1, and GAPS-CE STP-2/3 record the same honest read this
                     comment does.

                     SCOPE — checked against every variant and orientation
                     this file draws, not only this one, the same way the
                     first fix was:
                       · `steps` / horizontal (this block) — CHANGED (twice
                         now: the ink fill, then the glyph). The ticket
                         ladder, plus every other kit caller of
                         `variant="steps"` with no explicit orientation
                         (`import-wizard.tsx`, `run-steps.tsx`, `import.tsx`'s
                         own rail) — same mark, same fix, so the rail does not
                         draw one rule on the ticket screen and a different
                         one inside an import dialog.
                       · `steps` / vertical (the wizard rail, above) —
                         CHANGED, for the same reason both times: it is the
                         identical `markClasses` fill and glyph logic, laid
                         out in a column rather than a row, and leaving it
                         numbered would mean the same "current step" concept
                         reads two different ways depending only on which way
                         the rail is drawn.
                       · `stages` (chapter 23's hero row of pills, this file's
                         OTHER drawing, at the very bottom) — LEFT ALONE, both
                         times. It has no separate mark at all; the whole PILL
                         is the position indicator, and colouring the current
                         pill IS the drawing chapter 23 specifies ("current
                         takes mango with a charcoal label"), ruled and
                         measured under GAPS-CONTRAST §2 row 8 (see that
                         block, below). Neither of her two rulings that day
                         names it — the first names "ticket stages" and "the
                         MARK, the small circle beside each label" (a
                         structure `stages` does not have); the second reviews
                         "the stage ladder that shipped as kit v1.2.164",
                         which was this mark alone. FLAGGED, NOT ACTED ON: the
                         `stages` pill DOES draw a number for every stage,
                         done and later included (`formatNumber(index + 1)` in
                         the `inner` block below), which is the same kind of
                         mark her second ruling's words ("the stages are not
                         numbered things") could plausibly also describe. This
                         pass leaves it alone on the letter of both rulings —
                         "ticket stages" and "the stage ladder that shipped as
                         kit v1.2.164" both name this mark, not the hero row —
                         and files that question back to her rather than
                         acting on it; `record-detail.tsx`'s own progression
                         header and `import-proposal.tsx` both call
                         `variant="stages"` and are unaffected either way. */
                  (isDone || isCurrent) && "bg-surface-inverse text-ink-on-inverse",
                  // The current mark alone keeps the extra weight it always
                  // had — the smallest non-colour mark of "you are here" once
                  // the fill can no longer say it on its own.
                  isCurrent && "font-[var(--font-weight-medium)]",
                  /* Not yet reached. The paper tone IS the separation; the
                     edge is the artifact's hairline drawn as an inset shadow,
                     never a `border` property (review 1A · fix 2).

                     AND THE PAPER TONE HAS TO BE A TONE. This read `bg-card`
                     until the contrast law measured it against the ground the
                     shell actually puts a stepper on: `--surface-raised` IS
                     `--card`, so the sentence above was false in exactly the
                     places it mattered — 1.000 in both palettes, the hairline
                     carrying a separation the fill was supposed to make.
                     tokens.css §4's `--surface-lift` is the same paper,
                     rebound by the ground it lands on. */
                  !isDone && !isCurrent && "bg-surface-lift text-ink-tertiary shadow-[var(--hairline)]",
                )}
              >
                {isDone || isCurrent ? (
                  <>
                    {isDone ? <span className="sr-only">{doneLabel}</span> : null}
                    <Check size={16} aria-hidden="true" />
                  </>
                ) : null}
              </span>
            );

            const body = (
              <>
                <span className="flex w-full items-center">
                  {mark}
                  {/* The connector. A hairline track holding a fill that
                      scales from the inline start; motion.css mirrors the
                      origin under dir="rtl". */}
                  <span
                    aria-hidden="true"
                    data-slot="status-stepper-connector"
                    className="h-px flex-1 overflow-hidden bg-border"
                  >
                    <span
                      className="motion-step-connector block h-full w-full bg-surface-inverse"
                      style={{ transform: `scaleX(${isDone ? 1 : 0})` }}
                    />
                  </span>
                </span>
                <span
                  data-slot="status-stepper-label"
                  className={cn(
                    "block w-full truncate pe-[var(--space-2h)] text-caption",
                    /* NO UNDERLINE ON THIS LABEL. REMOVED 24 SEP 2026.

                       An underline lived here for one day. It was added
                       23 Sep 2026 by the pass that carried out her second
                       ruling of that day ("remove the numbers inside (they
                       are not numbered) is either check or empty") — not by
                       the ruling, which is about what the MARK contains. The
                       pass took the number out, saw that done and current
                       then drew the identical fill AND the identical glyph,
                       and added an underline to the current LABEL so a
                       sighted reader could still find the row's position.
                       She never asked for it.

                       AURORA, 24 SEP 2026, VERBATIM: "on tickets stage, why
                       is done underlined?" A question about a mark nobody
                       asked for is a rejection, not curiosity, so it is
                       gone — and gone in BOTH `steps` windows, not only the
                       one she was looking at.

                       WHAT IS LEFT, MEASURED RATHER THAN ASSERTED, so the
                       next reader does not have to re-derive it:
                         · `aria-current="step"` on the step below — real,
                           and only a screen reader hears it.
                         · the current mark's and label's own
                           `font-[var(--font-weight-medium)]`, kept here
                           untouched. IT IS WORTH NOTHING IN THE APP, and
                           that is a measurement, not a guess: Saans ships
                           exactly two faces, Light 300 and Medium 500
                           (tokens.css §"WHY `swap`"), `--font-weight-medium`
                           is 500, and `kwapso_system` sets NO base
                           font-weight on `<body>` — so the app's resting
                           weight is the UA's `normal`, and CSS font matching
                           resolves a 400 request to 500 when 400 is absent.
                           Measured in a browser against these two faces:
                           "In progress" at 13px is 50.375px wide at 300 and
                           51.984px at 400, at 500 AND at `normal` — three
                           identical numbers. The kit's own demo sets
                           `font-weight: var(--font-weight-light)` on body
                           (demo/demo.css), which is why this signal LOOKS
                           like it works when the kit is built and looked at,
                           and does not on the ticket screen.
                         · position: the row is ordered, so the LAST ink mark
                           is structurally the current one. Requires scanning
                           the row rather than reading one mark.
                       So on the ticket screen the current step is now drawn
                       identically to a done step. That is stated back to her
                       rather than patched with a second invention — the
                       first one is what she just rejected. */
                    isCurrent && "font-[var(--font-weight-medium)]",
                    state === "later" ? "text-ink-tertiary" : "text-foreground",
                  )}
                >
                  {stage.label}
                </span>
              </>
            );

            return (
              <span
                key={key}
                role="listitem"
                data-slot="status-stepper-step"
                data-state={state}
                aria-current={isCurrent ? "step" : undefined}
                className="flex min-w-0 flex-1 flex-col gap-[var(--space-2h)]"
              >
                {pressable ? (
                  <button
                    type="button"
                    onClick={() => onStageSelect?.(index, stage)}
                    aria-label={
                      isCurrent ? describeProgress(index + 1, total) : undefined
                    }
                    className="flex w-full cursor-pointer flex-col gap-[var(--space-2h)] border-0 bg-transparent p-0 text-start"
                  >
                    {body}
                  </button>
                ) : (
                  body
                )}
              </span>
            );
          })}
        </div>
      );
    }

    /* ---- Chapter 23's hero row of pills. ------------------------------- */
    return (
      <div
        ref={ref}
        {...rowProps}
        className={cn("flex flex-wrap items-center gap-2", className)}
        {...props}
      >
        {visible.map((stage, index) => {
          const state = stateOf(stage, index);
          const isCurrent = state === "current";
          const isLater = state === "later";
          const key = stage.id ?? String(index);

          const skin = cn(
            pillClasses,
            isCurrent &&
              "bg-[var(--surface-brand)] text-ink-on-accent font-[var(--font-weight-medium)]",
            /* CORRECTLY DIVERGENT — do not "fix" `isLater` to tertiary.
               GAPS-CONTRAST §2 row 8 measures a later pill at 2.335:1 light /
               3.979:1 dark against 4.5, and it stays: CH23 asks for this pair
               by name, twice. Its specimen line reads "later stages take the
               quiet fill with disabled ink", and it gives the rule its own
               heading — "Later is disabled ink, not hidden … Stages still to
               come stay visible in the quiet fill. A record that hides its
               future reads as finished, and the client cannot see what they
               are waiting for."

               The trade the artifact made, stated: a later stage is NOT a
               disabled control — it is a word ("Versand", "Erledigt") the
               client reads to learn what is coming, and CH23's own next rule
               is that the numbers are "part of the name" because "we are at
               three of seven" is the sentence a client repeats back. That
               sentence is now painted in the one tier excused from being
               legible. Ruled, recorded in GAPS-CONTRAST "Resolved", and the
               artifact's to reverse. The overflow tail below inherits it.

               AND THE EDGE IS A STROKE, NOT A DARKER FILL, 2026-09-08. The
               contrast law measured `--surface-idle` at 1.042 against
               off-beige paper in light — under its 1.05 invisibility gate —
               wherever a stepper is placed on a raised ground (the shell's
               content region, a dialog). A real finding: the pill's shape
               genuinely did not exist in light on that paper.

               THE OBVIOUS FIX WAS REJECTED BECAUSE IT MAKES A RULED NUMBER
               WORSE. CH23's specimen line says "the quiet fill", and
               `--surface-quiet` would clear the boundary at 1.339 light /
               1.324 dark — but the pair the client actually ruled on is
               GAPS-CONTRAST §2 row 8, "a later pill at 2.335:1 light /
               3.979:1 dark", and those two figures are `--ink-disabled` on
               `--surface-idle` to three decimals. On `--surface-quiet` the
               same label reads 1.817 / 2.508. Closing the boundary that way
               would darken the ground under the one word CH23 insists stays
               readable ("a record that hides its future reads as finished").

               SO THE FILL STAYS AND THE BOUNDARY IS DRAWN THE KIT'S OTHER
               SANCTIONED WAY. tokens.css forbids the `border` property
               (review 1A · fix 2) and gives an inset stroke in its place;
               `--hairline` is that stroke, and the mark two hundred lines up
               already draws its not-yet-reached state with one. The ring
               composites to 1.175 against off-beige paper in light and 1.161
               against the unlit raised paper in dark — above the law's
               hairline floor in both — while `--ink-disabled` on
               `--surface-idle` is untouched at 2.335 / 3.979.

               The law was taught the same thing at the same time: a fill
               below the boundary tier passes only if the element also draws a
               hairline that itself clears the hairline tier against that
               ground, MEASURED, not counted. See check-contrast.mjs, "A
               BOUNDARY IS A STEP OR A STROKE", and its DISCHARGES fixtures —
               four of the five assert a refusal. The pair now prints in that
               run's DISCHARGED band rather than in its findings. */
            isLater && "bg-surface-idle text-ink-disabled shadow-[var(--hairline)]",
            !isCurrent && !isLater && "bg-surface-lift text-foreground",
            pressable && "cursor-pointer",
            // One defined step from each fill. Never --primary itself.
            pressable && isCurrent && "hover:bg-[var(--btn-primary-hover)]",
            pressable && !isCurrent && "hover:bg-surface-quiet",
          );

          const inner = (
            <>
              <span
                aria-hidden="true"
                data-slot="status-stepper-number"
                className={cn(
                  "tabular-nums",
                  // The current pill's number takes the charcoal label with
                  // the rest of the pill; every other number is one tier down.
                  isCurrent ? "text-ink-on-accent" : isLater ? "text-ink-disabled" : "text-ink-tertiary",
                )}
              >
                {formatNumber(index + 1)}
              </span>
              {stage.label}
              {isCurrent ? <span className="sr-only">{describeProgress(index + 1, total)}</span> : null}
            </>
          );

          return (
            /* A real wrapper rather than `display: contents`: a listitem that
               generates no box is dropped from the accessibility tree in more
               than one engine, and the wrapper costs nothing here because the
               row is `flex-wrap` and the wrapper is the flex item. */
            <span key={key} role="listitem">
              {pressable ? (
                <button
                  type="button"
                  data-slot="status-stepper-stage"
                  data-state={state}
                  aria-current={isCurrent ? "step" : undefined}
                  onClick={() => onStageSelect?.(index, stage)}
                  className={skin}
                >
                  {inner}
                </button>
              ) : (
                <span
                  data-slot="status-stepper-stage"
                  data-state={state}
                  aria-current={isCurrent ? "step" : undefined}
                  className={skin}
                >
                  {inner}
                </span>
              )}
            </span>
          );
        })}

        {hidden > 0 ? (
          // The kit's own tail: `--surface-idle` with disabled ink, no number
          // span, and no gap inside it. It inherits the later pill's fill and
          // therefore the later pill's edge — see the argument at `isLater`
          // above: the fill is the ruled one, the boundary is the stroke.
          <span
            data-slot="status-stepper-overflow"
            role="listitem"
            className={cn(pillClasses, "bg-surface-idle text-ink-disabled shadow-[var(--hairline)]")}
          >
            {describeOverflow(hidden)}
          </span>
        ) : null}
      </div>
    );
  },
);

StatusStepper.displayName = "StatusStepper";

export { StatusStepper };
