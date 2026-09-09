/* ============================================================================
   Title — the section header: eyebrow, heading, actions, rule
   (0 direct call sites).

   DESIGN SOURCE
   Kit chapter 13, the specimen labelled "Section header" — one of the two
   blocks in the chapter that the specimen set never transcribed. Read out of
   "Kwapso UI Kit.dc.html" and kept figure for figure:

     · the row      — `display: flex; align-items: flex-end; gap: 16px;
                       padding-bottom: 14px; flex-wrap: wrap;`
     · the rule     — `box-shadow: inset 0 -1px 0 var(--hair2)`, the HEAVY
                       hairline; the kit's `--hair2` is `rgba(26,25,24,.20)`
                       in light and `rgba(255,254,249,.24)` in dark, which is
                       this repository's `--hair-strong` exactly
     · the eyebrow  — 11 / 500 / uppercase / 0.08em tracking, tertiary ink
     · the heading  — 30 / 500 / -0.02em, 6 under the eyebrow
     · the actions  — `margin-left: auto`, gap 10

   The same eyebrow-over-heading pair is drawn again at `.kw-register__title`
   and `.kw-stagehero__title` in kwapso-patterns.css, at the h2 and h3 steps,
   which is where the `size` ladder below comes from.

   THE LAW THIS FILE OBEYS
   · The rule under a SECTION is the heavy hairline (`--hair-strong`), not the
     8% one. The 8% weight is same-tone card separation — `CardHeader`'s
     border — and the two are not interchangeable: `separator`'s
     `variant="section"` draws the same heavy weight for the same reason.
   · The eyebrow is `--tracking-eyebrow` (0.08em), which `text-micro` already
     carries; kit ruling 16 makes that tracking the eyebrow's, and micro is
     UPPERCASE only.
   · The actions are pushed with `ms-auto` — margin-inline-start — not with
     the kit's own physical `margin-left: auto`, which would leave the buttons
     stranded on the wrong side of an Arabic page.
   · Focus is ONE global rule (tokens.css §8). The actions are Buttons and
     carry it themselves.
   · Every user-facing string is the caller's. This file holds none at all:
     the eyebrow, the heading and the actions are nodes.

   RENDERING CONTEXT
   No `"use client"`. It forwards props and a ref.
   ========================================================================= */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

/* ----------------------------------------------------------------------------
   The heading step.

   Chapter 13 draws the section heading at 30, which is not a step on the
   thirteen-step ladder. It IS drawn at -0.02em, and -0.02em is the tracking
   of exactly one step: `--text-3xl`, at 32. So the drawing was snapped up one
   step rather than a fourteenth size being invented for it. Logged as
   GAPS-F TTL-1.

   The other two rungs are the kit's own smaller section headings, at the h3
   and h4 tracking values, which resolve to `text-2xl` and `text-xl` by the
   same tracking match.

   ── THE LADDER GREW UPWARD ON 2026-09-08, AND THE THREE RUNGS ABOVE ARE NOT
   NEW SIZES ──────────────────────────────────────────────────────────────────

   WHAT WAS WRONG. This ladder stopped at 32 because chapter 13's SECTION
   HEADER is what this file was transcribed from, and 32 is the top of a
   section header. Nothing was ever decided about the rungs above it — the
   ladder simply ended where its own design source did. That absence then
   travelled, silently, into three other files, because `Title` is not only
   the section header: it is also the one heading row `RecordDetail`,
   `ScreenRenderer` and `ScreenShell` draw a SCREEN'S OWN NAME with.

     · `RecordDetail` renders `<Title as="h1">` — the ELEMENT has always been
       the page's h1 — and could ask for no step larger than 32 for it.
     · `SHAPE_HEADING_SIZE` (compositions/states/states.tsx) is typed
       `Record<ScreenDensity, "h2" | "h3">`. That union is not a design
       decision about a door; it is this ladder's top two rungs, written down
       somewhere else. A ceiling wearing a decision's clothes.
     · `ScreenRenderer` typed the same two values again, inline.

   The consuming app hit the floor of that on 2026-08-31 and could only reach
   past it from outside — a `[&_[data-slot=title-heading]]:text-4xl` descendant
   selector applied at every detail call site, and a law (its R52) written to
   police that every call site applies it. A rule an application had to invent
   because the kit did not ship the part.

   WHY THESE THREE VALUES AND NOT A JUDGEMENT. The kit's own type-scale table
   NAMES every rung with the role it is for, and the two roles above "Section
   title" are exactly the two `Title` is being asked to draw:

       display-m · 56 · "Page title"        <- a screen's own name
       h1        · 44 · "Record heading"    <- a record's own name
       h2        · 32 · "Section title"     <- chapter 13, this file's source
       h3        · 24 · "Card heading"
       h4        · 20 · "Row heading"

   So nothing here is chosen. The rungs are the ladder's, the steps are matched
   to their tracking tokens exactly as `Headline` matches them
   (`components/typography/typography.tsx` has carried BOTH of the new rungs
   since it was written — the same two steps existed in the token system and in
   one kit component, and were unreachable from the other), and the three
   sizes above are the ones the table already assigns to the three things a
   `Title` is ever the heading OF.

   THE DEFAULT DOES NOT MOVE, AND THAT IS THE POINT. `size="h2"` stays,
   because chapter 13 is still this component's design source and a section
   header is still 32. Raising the ceiling is not the same as raising the
   floor: what changes is that a call site drawing a PAGE or a RECORD can now
   name the rung the kit already named for it, instead of reaching around this
   file with a descendant selector.

   WHAT IS DELIBERATELY NOT HERE. The three display rungs above `display-m`
   (`display-l` 72, `display-xl` 96) are `Headline`'s and stay `Headline`'s.
   The table names them "Structured" and "Work, structured." — cover type, a
   marketing measure — and a component whose row also holds an eyebrow, an
   actions cluster and a section rule is not what sets a 96px cover line. A
   call site that wants one wants `Headline`, bare.
   ------------------------------------------------------------------------- */
const titleHeadingVariants = cva(["font-[var(--font-weight-medium)]"], {
  variants: {
    size: {
      /** 56 · the display-m step (`--tracking-display-m`, -0.025em). The
       *  scale's "Page title": a screen's own name, at the top of its door. */
      "display-m": "text-5xl",
      /** 44 · the h1 step (`--tracking-h1`, -0.025em). The scale's "Record
       *  heading": the name of the one thing a detail screen is about. */
      h1: "text-4xl",
      /** 32 · the h2 step (`--tracking-h2`, -0.02em). Chapter 13's drawing,
       *  the scale's "Section title", and this component's default. */
      h2: "text-3xl",
      /** 24 · the h3 step (`--tracking-h3`, -0.014em). A block inside a page. */
      h3: "text-2xl",
      /** 20 · the h4 step (`--tracking-h4`, -0.01em). A band inside a panel. */
      h4: "text-xl",
    },
  },
  defaultVariants: { size: "h2" },
});

/**
 * The rungs `Title` draws, as a type any file that CHOOSES one may name.
 *
 * Published because three modules already choose one on somebody else's
 * behalf — `RecordDetail`'s `titleSize`, `ScreenRenderer`'s per-door step and
 * `SHAPE_HEADING_SIZE` — and until today each of them wrote its own narrower
 * union by hand. Two of the three wrote `"h2" | "h3"`, which was this ladder's
 * ceiling copied into a place that could not see when the ceiling moved. A
 * name they can all import cannot fall behind the ladder it names.
 */
export type TitleStep = NonNullable<
  NonNullable<VariantProps<typeof titleHeadingVariants>>["size"]
>;

/**
 * THE LADDER'S OWN ORDER, largest first — so "one rung down" is a fact a
 * caller can READ rather than a pair of sizes it has to retype.
 *
 * `ScreenShell` is the reason this is published. It steps a nested screen's
 * title one rung below its door's, and its own comment already insisted the
 * map it does that with "is a RELATION, not a size — one rung down `Title`'s
 * own three-rung ladder — which is why it can be written at all in a folder
 * whose law is that no file in it writes a type step". It was still a hand-
 * written pair of values, and the ladder is no longer three rungs. A relation
 * that is spelled as its results stops being true the moment the thing it
 * relates changes; this array is what lets it be spelled as itself.
 *
 * The order is the type scale's, descending, and it is the same order the
 * tracking tokens run in (`--tracking-display-m` … `--tracking-h4`). The
 * bottom rung is its own floor: stepping down from `h4` yields `h4`, because
 * a heading smaller than the row heading is body copy and this component does
 * not draw body copy.
 */
export const TITLE_LADDER = ["display-m", "h1", "h2", "h3", "h4"] as const satisfies readonly TitleStep[];

/** One rung down `TITLE_LADDER`, floored at its last rung. */
export function titleStepDown(step: TitleStep): TitleStep {
  const at = TITLE_LADDER.indexOf(step as (typeof TITLE_LADDER)[number]);
  return TITLE_LADDER[Math.min(at + 1, TITLE_LADDER.length - 1)];
}

export interface TitleProps
  extends React.ComponentPropsWithoutRef<"div">,
    VariantProps<typeof titleHeadingVariants> {
  /**
   * The micro line above the heading — the kit's own example is a count and
   * a state, read as one phrase. A node, so a call site can put a `Badge` in
   * it. Undefined draws nothing, which is why this component hardcodes no
   * string.
   */
  eyebrow?: React.ReactNode;
  /** The controls at the inline end of the row. Usually Buttons. */
  actions?: React.ReactNode;
  /**
   * The heavy hairline under the row. On by default because chapter 13 draws
   * it; turn it off for a heading that opens a card, where `CardHeader`'s own
   * 8% border is already the separation and two rules would stack.
   */
  rule?: boolean;
  /**
   * The heading element. Defaulted to `h2`, because a section header is a
   * heading and a page that renders its sections as `div`s has no outline. A
   * call site whose page already spends `h1` and `h2` passes `h3`, and a
   * caption that only LOOKS like a heading passes `div`.
   */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div";
}

/**
 * A section header.
 *
 * TEN STATES
 *  1. default        — eyebrow, heading, actions, heavy rule.
 *  2. hover          — does not apply to the header itself; it is a label,
 *                      not a target. The actions are Buttons and carry
 *                      `--btn-*-hover`.
 *  3. focus-visible  — NOT here. tokens.css §8 rings every control at once,
 *                      and the header is not focusable. (A heading that is a
 *                      scroll anchor takes `tabIndex={-1}`, which is not
 *                      focus-visible and draws no ring — correctly.)
 *  4. active/pressed — does not apply.
 *  5. disabled       — does not apply. A section title cannot be disabled;
 *                      an unavailable section disables its own controls.
 *  6. loading        — does not apply. The heading is the one thing on a
 *                      screen that is known before the data is: it names what
 *                      is being fetched. Skeletoning it would leave the
 *                      reader with nothing to read while they wait. A COUNT
 *                      inside the eyebrow that has not arrived renders
 *                      nothing, which is `Badge`'s law, not this file's.
 *  7. empty          — no children and no eyebrow renders `null`: a bare rule
 *                      with buttons floating over it is not a section header.
 *                      An eyebrow WITHOUT a heading is allowed and renders,
 *                      because the kit draws that as a quiet band label.
 *  8. error          — does not apply. A heading reports nothing.
 *  9. selected       — does not apply.
 * 10. read-only      — always.
 *
 * THREE BREAKPOINTS
 *  mobile / tablet / desktop — UNCHANGED in step and in structure, with one
 *  behaviour that is written and not left to chance: the row WRAPS. Chapter
 *  13's own drawing carries `flex-wrap: wrap`, so on a narrow viewport the
 *  actions drop to a second line UNDER the heading rather than squeezing it,
 *  and `ms-auto` then has no effect because the actions are alone on their
 *  line — they sit at the inline start, in line with the heading above them,
 *  which is where the kit puts a wrapped action row everywhere else. Nothing
 *  restacks and nothing changes size: a 32 heading is legible at 320 and
 *  shrinking it would make the page's largest type the same size as its body
 *  copy. The same answer holds one and two rungs up, and it is the reason
 *  every step on this ladder carries its own line-height: `--text-4xl` is
 *  1.08 and `--text-5xl` is 1.06 against `--text-3xl`'s 1.18, so a "Page
 *  title" that wraps to three lines at 320 sets tighter rather than taller,
 *  which is what the scale was drawn to do. One class carries all three
 *  values, which is why no rung here is ever spelled as a raw length.
 *
 * RTL — safe, and one thing was changed to make it so. The kit pushes the
 * actions with `margin-left: auto`; this file uses `ms-auto`
 * (margin-inline-start), so the actions sit at the inline END of the row in
 * both directions. Everything else is `gap`-driven and mirrors on its own.
 */
const Title = React.forwardRef<HTMLDivElement, TitleProps>(
  (
    { className, eyebrow, actions, rule = true, size = "h2", as = "h2", children, ...props },
    ref,
  ) => {
    const hasHeading = React.Children.count(children) > 0;
    if (!hasHeading && eyebrow === undefined) return null;

    const Heading = as;

    return (
      <div
        ref={ref}
        data-slot="title"
        className={cn(
          // Chapter 13: baseline-of-the-block alignment, 16 between the
          // heading group and the actions, wrapping on a narrow row.
          "flex flex-wrap items-end gap-4",
          // 14 under the row, then the heavy section rule.
          /* ch01's "Hairline 20% — section rules", drawn as an inset shadow
             rather than a border (review 1A · fix 2). */
          rule && "shadow-[var(--hairline-under-strong)] pb-[var(--space-3h)]",
          className,
        )}
        {...props}
      >
        <div className="min-w-0">
          {eyebrow !== undefined && eyebrow !== null ? (
            <span
              data-slot="title-eyebrow"
              className={cn(
                // micro · 11 / 500 / uppercase. `text-micro` carries the
                // 0.08em eyebrow tracking of ruling 16 in the same class.
                "block text-micro font-[var(--font-weight-medium)] uppercase",
                "text-ink-tertiary",
              )}
            >
              {eyebrow}
            </span>
          ) : null}

          {hasHeading ? (
            <Heading
              data-slot="title-heading"
              className={cn(
                titleHeadingVariants({ size }),
                // 6 under the eyebrow, and nothing at all without one.
                eyebrow !== undefined && eyebrow !== null && "mt-[var(--space-1h)]",
              )}
            >
              {children}
            </Heading>
          ) : null}
        </div>

        {actions ? (
          <div
            data-slot="title-actions"
            /* `ms-auto` — margin-inline-start. The kit's own drawing is
               `margin-left: auto`, which strands the controls under
               `dir="rtl"`. Gap 10 is the kit's figure. */
            className="ms-auto flex flex-wrap items-center gap-[var(--space-2h)]"
          >
            {actions}
          </div>
        ) : null}
      </div>
    );
  },
);

Title.displayName = "Title";

export { Title, titleHeadingVariants };
