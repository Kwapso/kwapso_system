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
   · GROUND. Same shape as `ToolbarRow`'s own `ground` prop and for the
     identical reason: a fixed fill is right on exactly one screen, and a
     toolbar-shaped row cannot know what it is standing on. `bare` (the
     default) paints nothing, which is correct wherever a caller wraps this
     in `PINNED_TOOLBAR` — that box already paints the ground behind it.
     `page`/`panel` are here only for the day a caller mounts this bar
     un-pinned, standing directly on paper it names itself; the token pair is
     `ToolbarRow`'s own, not a second opinion.
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

   NO ROLE PLAYS AN ACCENT AS A PANEL. Unlike `Alert`, this bar has no panel
   fill of its own to warm — `ground="bare"` paints nothing, in front of
   whatever the pin wrapper already paints — so there is no "fill a panel
   with poppy" mistake available to make here.

   RADIUS — TWO, NEVER A THIRD. `rounded-[var(--radius)]` only when this
   file itself paints (`ground !== "bare"`); when a caller wraps this in
   `PINNED_TOOLBAR` the wrapper's own `::before` is what rounds the corners
   a reader is looking at (R63 part 4), and this file stays unrounded so the
   two boxes never round the same edge twice.

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

/* Reuses `ToolbarRow`'s own two ground tokens rather than minting a third
   opinion about which paper a toolbar-shaped row stands on — see the header,
   "WHAT THIS FILE DOES NOT DECIDE · GROUND". */
const unsavedChangesBarVariants = cva(
  ["flex min-w-0 flex-nowrap items-center justify-between gap-3", "px-4 py-3"],
  {
    variants: {
      ground: {
        /** Nothing painted — the right answer wherever a caller wraps this
         * row in the app's own `PINNED_TOOLBAR` (`shared/web/pinned-chrome.ts`),
         * which already paints the ground behind it. The default, because a
         * row that paints nothing cannot paint the wrong thing. */
        bare: "",
        /** Standing directly on off-beige (a page, a body pane) — takes soft
         * paper, `ToolbarRow`'s own `page` token. */
        page: "bg-surface-panel",
        /** Standing directly on soft paper (a card, a panel, a sheet) —
         * takes off-beige, `ToolbarRow`'s own `panel` token. */
        panel: "bg-surface-raised",
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

    const painted = ground !== "bare";

    return (
      <div
        ref={ref}
        data-slot="unsaved-changes-bar"
        role="status"
        className={cn(
          unsavedChangesBarVariants({ ground }),
          painted && "rounded-[var(--radius)]",
          className,
        )}
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
