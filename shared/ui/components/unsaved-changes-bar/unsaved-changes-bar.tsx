/* ============================================================================
   UnsavedChangesBar — the flag for a dirty staged draft, and the two acts
   that resolve it (2 direct call sites: kwapso_system's Settings › Appearance
   and Settings › Team › Roles, both staging draft state behind Save today).

   DESIGN SOURCE
   The consuming app's own design lane, 14 Sep 2026 — a five-option comparison
   artifact built directly against the client's own words over a screenshot of
   the two screens above: *"We need some kind of hint or flag, very visible,
   probably not at the bottom, that allows me to save or to restart… however
   we call it normally in UI, to not save the changes."* Five shapes were
   mocked (a pinned top band, a floating pill, a tab dot, the panel's own
   header growing two buttons, and a toast — the last shown only to reject
   it), and she chose the first: a quiet band, pinned directly under the tab
   strip, reusing the idiom the app's own collection toolbar already pins
   with (its R63, `PINNED_TOOLBAR`) rather than inventing a fourth kind of
   sticky chrome. That artifact's markup, copy and reasoning are this file's
   spec.

   TERMINOLOGY, SETTLED BY THE ARTIFACT'S OWN "term" NOTE. **Save changes /
   Discard changes**, never Reset (already means "back to factory defaults"
   in the app's own `Choices` module) and never Revert (reads as undoing a
   PAST save, which this affordance never does — it only ever throws away
   what was never saved). This file holds no copy of either word; see PROPS.

   WHAT THIS FILE DOES NOT DECIDE, ON PURPOSE
   · POSITION — REVERSED FOR `ground="bare"` ONLY, 2026-09-17. Used to be the
     pin's own decision app-side (R63, `shared/web/pinned-chrome.ts`,
     `PINNED_TOOLBAR`), unconditionally: this component drew the flag and the
     two acts on one row and nothing about where that row sat. Client, on the
     shipped bar, verbatim: *"The 'You haven't saved changes' needs to be
     floating and visible at all times, directly under the tabs, even if I'm
     very down in the scroll."* "Even if I'm very down in the scroll" is a
     requirement on THIS row, not on whatever wraps it — a caller could
     already stick `PINNED_TOOLBAR` to the viewport, but this bar lives
     inside a SCROLLING panel (Settings › Appearance, Settings › Team ›
     Roles), and a sticky ancestor does not make a static descendant sticky
     with it. So `ground="bare"` — "the `bare` ground used under a tab
     strip", the one real shape both call sites render — now carries its own
     `position: sticky` (see the cva block); `page`/`panel` do not, because
     neither is the shape a tab strip sits under and neither has a scroll
     ancestor this row is meant to survive. `PINNED_TOOLBAR`'s own corner
     engineering is UNCHANGED and still supplies the rounded top corners "when
     pin, I still want it round" asked for — this reversal is about `top`,
     not about the wrapper going away.
   · THE STICKY OFFSET IS TWO APP-SUPPLIED NUMBERS, NEVER ONE WRITTEN HERE.
     `top: calc(var(--pinned-chrome-h, 0px) + var(--tab-strip-h, 0px))` —
     `--pinned-chrome-h` is whatever fixed/sticky chrome already sits above
     this row at the viewport (a page header, a global toolbar; 0 when there
     is none), and `--tab-strip-h` is the tabs this bar is meant to sit
     "directly under" ("directly under the tabs", her own words) — the
     Settings navigation's own tab row, whatever it measures at the app's own
     type scale. Neither number is this file's to know: R28's boundary means
     this file never reads the app's layout constants, so both arrive as CSS
     custom properties with a `0px` fallback each, the same idiom
     `--pinned-chrome-h` already uses on its own. A call site that sets
     neither gets a bar stuck at `top: 0`, which is still correct the day
     there is no chrome above it at all.
   · GROUND, NARROWED 2026-09-15, AND NOW ALSO POSITION. Used to be
     `ToolbarRow`'s own `ground` prop, matching this row's own fill to
     whatever paper it stood on — `bare` painted nothing so `PINNED_TOOLBAR`'s
     wrapper could paint the container's own tone straight through. That was
     the bug the client rang in about (see "AN ACCENT DOES BECOME A
     BACKGROUND" below): a row whose whole job is being visible cannot also
     be the same colour as its container. So `ground` no longer picks a fill
     — every value now paints the identical `--warning` wash, which is the
     fix, because a translucent accent reads as distinct against ANY backdrop
     without being told which one it is (see "MEASURED"). What `ground`
     decides now: which corners round (see "RADIUS" below) — `bare` rides
     `PINNED_TOOLBAR`'s own corner engineering, `page`/`panel` stand alone
     and round on their own — AND, as of today, whether the row is sticky at
     all, for the identical reason the two were already paired: `bare` is the
     shape standing under a tab strip and pinned to a scrolling panel; the
     other two are not.
   · COPY. Not one string lives in this file. `message`, `saveLabel`,
     `discardLabel` and `savingLabel` are all props — R28's own boundary
     (`resolveImport` in the consuming app refuses every specifier under
     `shared/ui/`, so a sentence written here could never be catalogued,
     translated, or checked stale) means a component that says something
     itself says it in English forever. The app translates; this file only
     ever renders what it is handed.

   THE DOT IS A WARNING MARK, NOT MANGO. The artifact's own drawing is a
   small coloured dot beside the sentence — read `--warning`
   (`--kw-orange`), never `--primary` (`--kw-mango`): both screens this bar
   ships on already spend their one mango on the Save button's own primary
   fill (`roles-matrix.tsx`'s header has the long account of why a screen
   gets exactly one), and a second mango mark on the same view would be the
   exact violation that file's client ruling forbids. `--warning` is a
   distinct token from the brand fill (tokens.css §3), so the dot reads as
   "something is unresolved" without competing with Save for the one mango a
   view is allowed.

   AN ACCENT DOES BECOME A BACKGROUND HERE, AND IT IS DELIBERATE. `Alert`'s
   own law is "the panel stays neutral — accents never become a background"
   (see that file's header). This row breaks it on the client's own ruling,
   2026-09-15, verbatim: *"the 'You have unsaved changes' pinned bar at the
   top had a different color. Please implement that because right now it's
   in the same color as the container, which makes it not so visible."* A
   neutral row with only a warning DOT (v1.2.82/83, as shipped) is exactly
   `Alert`'s law applied here, and it is exactly what she is describing.
   `Alert`'s law holds for a box that sits AMONG other neutral boxes and uses
   a dot to say which kind of notice it is; this row is never one of
   several — it is the one thing on the screen that means "something changed
   and is not saved yet", and its whole job is failing if it reads as more
   of the same paper. So it takes `--warning` at 10% alpha as its own fill —
   never the raw `--kw-orange`, never opaque; a WASH, not `Alert`'s "fill a
   panel with poppy" mistake, which is a full-strength brand fill standing in
   for a neutral one — plus a `--warning`-tinted hairline at 35% (the
   boundary law's inset-shadow remedy; see the cva block). `Alert`'s law is
   untouched everywhere else; this is a second, narrower one, written down
   rather than left implicit: a translucent accent wash is allowed on a row
   whose entire job is being the one thing on the screen that is not
   neutral.

   MEASURED, 2026-09-15 (a script against the real hexes in tokens.css §2/§3,
   not eyeballed). `--warning` (`--kw-orange` #F7953E) at 10% alpha, flattened
   over every ground this row is ever laid over — light `--surface-panel`
   #F7F2EB, light `--surface-raised` #FFFEF9, dark `--surface-panel` #1C1B18,
   dark `--surface-raised` #26241F — resolves to #F7E9DA / #FEF4E6 / #32271C
   / #3B2F22. The caption's `text-ink-secondary` (#4a4946 light, #d5d1c9
   dark) measures 7.55 / 8.27 / 9.56 / 8.54 against those four in turn — all
   clear AA's 4.5:1 with wide margin, so `text-ink-secondary` stays; nothing
   here forced a switch to a stronger ink. 10% was picked as the low end of a
   range that already clears comfortably rather than the alpha the numbers
   required — the dark grounds pass north of 8.5 at this same value, so there
   was room to go lower and none to spare going up.

   RADIUS — ONE SHAPE, ALL THREE `ground` VALUES, CORRECTED 2026-09-16. This
   row paints unconditionally as of 2026-09-15 (see "AN ACCENT DOES BECOME A
   BACKGROUND" above), so it can no longer leave rounding to whatever it is
   standing on. `ground="bare"` (`PINNED_TOOLBAR`, the two real call sites)
   USED TO round the TOP edge only, `rounded-t-[var(--radius)]` — R31's own
   second named position, "the top band of a pinned toolbar" (added
   2026-09-10 for this exact wrapper's corner engineering, R63 part 4) — on
   the argument that the wrapper's own `::before` already rounds those SAME
   top corners one layer further out, so the bottom stayed square: nothing
   below this row for a rounded corner to separate it from, the container's
   own content keeps scrolling under it and shares that edge.

   THE CLIENT OVERRULED THAT, 2026-09-16, DIRECTLY ON THE SHIPPED BAR: "use
   the orange color in the kit and make sure the container is round on all
   corners, because currently two corners are not round." Two of `bare`'s
   corners were exactly the ones that argument left square. `bare` now
   matches `page`/`panel`: `rounded-[var(--radius)]`, all four, unconditionally
   — one shape for every `ground` value. Riding `PINNED_TOOLBAR` still rounds
   the SAME top pair a second, now-redundant way at the wrapper's own border
   box; two coincident radii on one corner draw as one, so nothing doubles
   visibly. `ground` is kept as three names rather than collapsed to a single
   unconditional class only because a call site should still say which paper
   it believes it is standing on — the same reasoning `page` and `panel`
   already state below for why they stayed apart despite an identical value.

   A11Y — THE APPEARANCE OF THE ROW IS THE ANNOUNCEMENT. `role="status"` on
   the row itself, the same shape the kit's own `data-table.tsx` selection
   line already uses for "a fact changed, tell a screen reader politely and
   once" — no `aria-live` written beside it, because `role="status"` already
   implies a polite live region and a second attribute saying the same thing
   twice is the kit's own `PATTERN §7` a step ahead of itself. Both buttons
   are ordinary `Button`s (real, focusable, in the tab order); nothing here
   binds Esc, because Esc already means "close the overlay" everywhere else
   in this kit (`Sheet`, `AlertDialog`) and this bar is not one — the
   artifact's own note is explicit that overloading it here would be the
   first non-overlay Esc handler in the consuming app.

   AT NARROW WIDTHS THIS FILE DOES NOTHING SPECIAL, ON PURPOSE. The
   artifact's own "At phone width" note for this option: *"Stays inline and
   full-width rather than becoming a bottom sheet — this is chrome
   describing form state, not a surface sliding in (R59 governs
   modals/pickers, not this). It just narrows: the caption text truncates
   before the buttons do."* So the message wears `min-w-0 truncate` and the
   action group wears `shrink-0` — one flex row, no breakpoint, no second
   layout to maintain.

   THE MESSAGE STEPS UP ONE RUNG, 2026-09-17. Client, on the shipped bar:
   *"I'm not sure of the size of this typography. Make sure that this is in
   the kit because it looks too small."* It already was a kit step
   (`text-caption`, `--text-caption`, 13/300) — never a raw px — so "make
   sure it's in the kit" is answered by moving it to the NEXT rung on the
   same ladder `Text`'s own `size` variant states (`components/typography/
   typography.tsx`: `caption` 13 -> `sm` 14 -> `base` 16), not by inventing a
   fourth. `text-sm` (`--text-sm`, 14/300) is that next rung — one step, not
   two: `base` is `Text`'s own reading size and a full three points up, which
   is more than "too small" asked for. The dot, the buttons and the row's own
   padding are unchanged; only the sentence's own step moved.

   RENDERING CONTEXT
   No `"use client"`. This module holds no state and calls no hook; every
   click it draws calls back to the props it was handed.
   ========================================================================= */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";
import { Button } from "../button/button";

/* CLIENT RULING, 2026-09-15 — see the header, "AN ACCENT DOES BECOME A
   BACKGROUND HERE". This row now paints its own warning wash unconditionally
   instead of matching whatever paper it stands on, so `ground` decides only
   the corner radius below — see "RADIUS" in the header. AS OF 2026-09-17,
   `ground` ALSO decides stickiness — see "POSITION" in the header and the
   `bare` variant's own comment below. */
const unsavedChangesBarVariants = cva(
  [
    "flex min-w-0 flex-nowrap items-center justify-between gap-3",
    "px-4 py-3",
    /* THE WASH. `--warning` (`--kw-orange`) at 10% — measured against every
       ground this row is laid over, both palettes; see the header,
       "MEASURED". Never the raw `--kw-orange` and never opaque: a translucent
       accent reads as distinct against any backdrop without needing to know
       which one it is, which is the whole point (the header, "GROUND"). */
    "bg-warning/10",
    /* THE BOUNDARY LAW (`foundations/rules/borders.mjs`) forbids a `border-*`
       utility outright — a boundary is a fill or an inset shadow, never a
       stroke. This is the inset-shadow remedy, the same idiom
       `select.tsx`/`date-picker.tsx` already use for a tinted hairline
       (`color-mix(in srgb, var(--destructive) 65%, transparent)`), at
       `--warning` and a lower percentage: this line decorates a translucent
       wash, it is not a form field's required stroke. */
    "shadow-[inset_0_0_0_0.0625rem_color-mix(in_srgb,var(--warning)_35%,transparent)]",
  ],
  {
    variants: {
      ground: {
        /** ALL FOUR CORNERS, `rounded-[var(--radius)]` — CORRECTED 2026-09-16.
         * Used to be TOP ONLY (`rounded-t-[var(--radius)]`): the reasoning
         * was that the wrapper's own `PINNED_TOOLBAR` `::before`
         * (`shared/web/pinned-chrome.ts`, R63 part 4) already rounds those
         * same top corners one layer further out, and the bottom edge had
         * nothing below it to be separated from — the container's own
         * content keeps scrolling under this row and shares that edge. The
         * client looked at the shipped bar and ruled directly against that:
         * "use the orange color in the kit and make sure the container is
         * round on all corners, because currently two corners are not
         * round." Riding `PINNED_TOOLBAR` still rounds the SAME top pair a
         * second, now-redundant way at the wrapper's own border box, which
         * is harmless — two coincident radii on the same corner draw as
         * one — but the bottom pair no longer stays square waiting on a
         * distinction the client never asked for.
         *
         * STICKY, 2026-09-17 — see the header, "POSITION — REVERSED FOR
         * `ground="bare"` ONLY". Client: "needs to be floating and visible
         * at all times, directly under the tabs, even if I'm very down in
         * the scroll." `sticky` plus `top`, at the app's own two offsets
         * (`--pinned-chrome-h` for whatever fixed chrome sits above the
         * scroll container, `--tab-strip-h` for the tab row this bar sits
         * "directly under"), each falling back to `0px` so a call site that
         * sets neither still renders correctly pinned to the very top.
         * `z-20`: comfortably above this row's own scroll container's
         * ordinary content in ITS OWN local stacking context — the app's
         * `PINNED_TOOLBAR` wrapper must not open a stacking context of its
         * own between this row and the content it is meant to cover, or a
         * higher z-index here would not help (the same class of bug
         * `screen-shell.tsx`'s own top-bar comment measures, "a control you
         * can see and cannot press"). */
        bare: "sticky top-[calc(var(--pinned-chrome-h,0px)_+_var(--tab-strip-h,0px))] z-20 rounded-[var(--radius)]",
        /** Standing directly on off-beige, un-pinned — the day a caller
         * mounts this bar without `PINNED_TOOLBAR`. An ordinary box, all four
         * corners: `rounded-[var(--radius)]`. */
        page: "rounded-[var(--radius)]",
        /** Standing directly on soft paper, un-pinned. Same shape as `page` —
         * kept as its own name because a call site should still say which
         * paper it believes it is floating on, even though the wash no
         * longer varies by it (the header, "GROUND": that was the bug, not a
         * distinction worth two branches). */
        panel: "rounded-[var(--radius)]",
      },
    },
    defaultVariants: { ground: "bare" },
  },
);

export interface UnsavedChangesBarProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "onSave">,
    VariantProps<typeof unsavedChangesBarVariants> {
  /** Whether there is a staged draft to flag. `false` renders nothing at
   * all — the artifact's own spec, "appears ONLY when there are unsaved
   * changes" — so a caller never has to wrap this in its own conditional. */
  dirty: boolean;
  /** Commits the staged draft. Called with no argument; the caller already
   * knows what it staged. */
  onSave: () => void;
  /** Throws the staged draft away, back to the last-saved value. */
  onDiscard: () => void;
  /** True while `onSave`'s own request is in flight. Both acts disable —
   * Discard because there is nothing left to safely discard mid-request,
   * Save through the kit `Button`'s own `loading` treatment (a spinner, in
   * place of `saveLabel` when `savingLabel` is given). */
  saving?: boolean;
  /** The flag sentence — "You have unsaved changes" in the artifact, but
   * this file holds no English of its own; see the header, "COPY". */
  message: React.ReactNode;
  /** The primary act's label — "Save changes" or "Save", the caller's word. */
  saveLabel: string;
  /** The quiet act's label — "Discard changes" or "Discard", the caller's
   * word. Terminology is the artifact's own settled pair; see the header. */
  discardLabel: string;
  /** Shown on the Save button in place of `saveLabel` while `saving` is
   * true. Left undefined, the label stays put and only the spinner shows —
   * `Button`'s own `loadingLabel` contract, unchanged. */
  savingLabel?: string;
}

/**
 * The unsaved-changes flag, pinned nowhere by itself. Renders nothing at
 * all while `dirty` is false.
 *
 * TEN STATES
 *  1. default        — the dot, the sentence, Discard then Save.
 *  2. hover          — does not apply to the row; each button carries its own.
 *  3. focus-visible  — not on the row, which is not focusable; tokens.css §8
 *                      rings each button.
 *  4. active/pressed — does not apply to the row.
 *  5. disabled       — does not apply to the row; see `saving` for the one
 *                      state that reaches into it.
 *  6. loading        — `saving`: Discard disabled, Save shows `Button`'s own
 *                      spinner treatment.
 *  7. empty          — `dirty === false` renders `null`. A flag with nothing
 *                      to flag is not a quieter version of this row; it is
 *                      not this row.
 *  8. error          — does not apply. A failed save is the caller's toast;
 *                      this row keeps showing the same staged draft either
 *                      way, because it is still unsaved.
 *  9. selected        — does not apply.
 * 10. read-only       — does not apply; the row holds no value of its own,
 *                      only the two acts a caller gave it.
 *
 * RTL — safe. `justify-between` and the flex row both mirror on their own;
 * nothing here names a physical side.
 */
const UnsavedChangesBar = React.forwardRef<HTMLDivElement, UnsavedChangesBarProps>(
  (
    {
      className,
      ground = "bare",
      dirty,
      onSave,
      onDiscard,
      saving = false,
      message,
      saveLabel,
      discardLabel,
      savingLabel,
      ...props
    },
    ref,
  ) => {
    if (!dirty) return null;

    return (
      <div
        ref={ref}
        data-slot="unsaved-changes-bar"
        role="status"
        className={cn(unsavedChangesBarVariants({ ground }), className)}
        {...props}
      >
        <span className="flex min-w-0 items-center gap-2 text-sm text-ink-secondary">
          {/* The dot carries no meaning alone (the kit's own law, Alert's
              header) — the sentence beside it already says what changed, so
              the mark is `aria-hidden` and purely visual. Warning, not
              mango; see the header, "THE DOT IS A WARNING MARK". */}
          <span aria-hidden className="size-2 shrink-0 rounded-pill bg-warning" />
          <span className="truncate">{message}</span>
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="cancel" disabled={saving} onClick={onDiscard}>
            {discardLabel}
          </Button>
          <Button type="button" loading={saving} loadingLabel={savingLabel} onClick={onSave}>
            {saveLabel}
          </Button>
        </div>
      </div>
    );
  },
);

UnsavedChangesBar.displayName = "UnsavedChangesBar";

export { UnsavedChangesBar, unsavedChangesBarVariants };
