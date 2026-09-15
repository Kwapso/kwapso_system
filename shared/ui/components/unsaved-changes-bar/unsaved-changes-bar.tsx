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
   · POSITION. `position: sticky` is the pin's own decision app-side (R63,
     `shared/web/pinned-chrome.ts`, `PINNED_TOOLBAR`) — the same seam the
     kit's `ToolbarRow` is wrapped in at every one of its own pinned call
     sites, never sticky by itself. This component draws the flag and the two
     acts on one row and nothing about where that row sits; the call site
     wraps it in `<div data-slot="toolbar-row-pin" className={PINNED_TOOLBAR}>`
     exactly as it already wraps `ToolbarRow`, which is also how the rounded
     top corners the client asked for a second time ("when pin, I still want
     it round") arrive here for free — they are the wrapper's `::before`, not
     a radius this file draws.
   · GROUND, NARROWED 2026-09-15. Used to be `ToolbarRow`'s own `ground`
     prop, matching this row's own fill to whatever paper it stood on —
     `bare` painted nothing so `PINNED_TOOLBAR`'s wrapper could paint the
     container's own tone straight through. That was the bug the client
     rang in about (see "AN ACCENT DOES BECOME A BACKGROUND" below): a row
     whose whole job is being visible cannot also be the same colour as its
     container. So `ground` no longer picks a fill — every value now paints
     the identical `--warning` wash, which is the fix, because a translucent
     accent reads as distinct against ANY backdrop without being told which
     one it is (see "MEASURED"). What `ground` still decides is the one
     thing that genuinely differs by context: which corners round (see
     "RADIUS" below) — `bare` rides `PINNED_TOOLBAR`'s own corner
     engineering, `page`/`panel` stand alone and round on their own.
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

   RADIUS — TWO, NEVER A THIRD, AND NOW BOTH ARE THIS FILE'S OWN. This row
   paints unconditionally as of 2026-09-15 (see "AN ACCENT DOES BECOME A
   BACKGROUND" above), so it can no longer leave rounding to whatever it is
   standing on. `ground="bare"` (`PINNED_TOOLBAR`, the two real call sites)
   rounds the TOP edge only, `rounded-t-[var(--radius)]` — R31's own second
   named position, "the top band of a pinned toolbar" (added 2026-09-10 for
   this exact wrapper's corner engineering, R63 part 4) — because the
   wrapper's own `::before` still rounds those SAME top corners one layer
   further out, at the container's real border box, which is part 4's whole
   argument; this row's fill sits inside that and agrees with it rather than
   rounding the same edge a second, competing way. The bottom edge stays
   square: there is nothing below this row for a rounded corner to separate
   it from, the container's own content keeps scrolling under it and shares
   that edge. `page`/`panel` (standing alone, unpinned) round all four,
   `rounded-[var(--radius)]` — the ordinary box, nothing beside them already
   carries a corner.

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
   the corner radius below — see "RADIUS" in the header. */
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
        /** Riding the app's own `PINNED_TOOLBAR` (`shared/web/pinned-chrome.ts`)
         * — the two real call sites, both left at this default. Rounds the
         * TOP edge only, `rounded-t-[var(--radius)]`: R31's own second named
         * position ("the top band of a pinned toolbar", R63 part 4), so this
         * row's corner agrees with the wrapper's own `::before` instead of
         * rounding the same edge a second, competing way. The bottom stays
         * square — the container's own content keeps scrolling under it and
         * shares that edge. */
        bare: "rounded-t-[var(--radius)]",
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
        <span className="flex min-w-0 items-center gap-2 text-caption text-ink-secondary">
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
