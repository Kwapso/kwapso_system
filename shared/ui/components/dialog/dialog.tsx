/* ============================================================================
   Dialog — the modal (115 direct call sites).

   DESIGN SOURCE
   design-mothership/specimens/kwapso-patterns.css → CH20 `.kw-scrim`,
   `.kw-modal`, `.kw-modal__title`, `.kw-modal__body`, `.kw-modal__row`.
   The close chip is `.kw-drawer__close` from the same chapter — the kit draws
   a close control on the drawer and not on the modal, and the modal needs one.
   Motion is motion/motion.css §3 (`.motion-scrim`, `.motion-dialog`).
   Not shadcn. Where the two disagree, the kwapso specimen wins.

   THE LAW THIS FILE OBEYS
   · The overlay surface is `--popover` at `--radius` (24) under
     `--shadow-overlay`. One radius, one elevation, no blur, no border.
     (The kit's own `.kw-modal` says `--surface-page`; the batch's binding law
      and tokens.css both say `--popover`. Both sides in GAPS-A.md OVL-1.)
   · Focus is ONE global rule (tokens.css §8). This file defines no ring and
     never writes an outline reset. Radix's own focus trap moves the caret in;
     the ring that shows where it landed is the token layer's.
   · No duration, no curve, no keyframe is written here. `.motion-scrim` and
     `.motion-dialog` already carry both directions and read Radix's
     `data-state`, so one class covers open and close.
   · Every string is a prop with a default — `closeLabel` is the only one this
     file holds, and it exists because a close control with no accessible name
     is unusable in Arabic, Urdu or Persian just as it is in English.
   · Logical properties only. The dialog is centred by a grid, not by a
     translate, so nothing here has an inline direction at all.

   RENDERING CONTEXT
   `"use client"`. Radix Dialog holds open state, portals to the document and
   attaches document-level listeners; it cannot render in a Server Component.
   ========================================================================= */

"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { cn } from "../../lib/utils";
import { X } from "../../foundations/icons";

/* ----------------------------------------------------------------------------
   The scrim. Kit-stated as charcoal at 36%, with no dark twin drawn and the
   note "kept identical" — so it must stay charcoal in BOTH palettes, which is
   why it cannot be mixed from `--foreground` or `--surface-inverse` (both of
   those flip to off-beige in dark and would produce a white scrim).

   THERE IS A `--scrim` TOKEN NOW, AND THIS FILE NO LONGER MIXES ITS OWN —
   CHANGED 2026-09-07. What stood here was an arbitrary background holding a
   `color-mix` of the raw charcoal at 36% against transparent — spelled out,
   because PATTERN §10's lesson is that Tailwind scans this file's comments
   too and cannot tell an explanation from an intention, so the old class is
   DESCRIBED here rather than written — under a paragraph saying the raw
   palette layer was being reached deliberately
   because no semantic token stays charcoal in both themes (GAPS-A.md OVL-2).
   That was true, and it was never the fix: OVL-2's own text says the fix is a
   token. By this week the same expression was written out by hand in four
   files and `edge-panel.tsx` was about to make it five. tokens.css §3 now
   states the pair and §10 bridges it, so the scrim is a NAMED utility over a
   value decided in the one file allowed to decide a colour. Same 36%, same
   charcoal in both palettes; nothing renders differently.

   z: the kit puts the modal scrim at 60 and the drawer scrim at 55. Kept.
   ------------------------------------------------------------------------- */
const SCRIM = ["fixed inset-0 z-[60]", "bg-scrim", "motion-scrim"] as const;

/* ----------------------------------------------------------------------------
   The positioner. A grid that centres its one child, sitting inside the same
   inset as the scrim so the dialog can never touch the viewport edge.

   Why a wrapper rather than the usual `top-1/2 -translate-y-1/2`: a translate
   utility on the content would fight `.motion-dialog`, whose keyframes own
   `transform`, and the loser is decided by stylesheet order. It also removes
   every physical inset from this file — a grid centres identically in RTL.

   `pointer-events-none` so a click in the gutter still lands on the scrim
   below and dismisses; the content turns them back on for itself.

   WHY THE TRACK IS SPELLED OUT — `grid-cols-[minmax(0,auto)]`.
   A bare `grid` makes ONE implicit column whose sizing function is `auto`.
   An `auto` track's base size is its item's min-content CONTRIBUTION, and a
   grid item that declares a definite `width` contributes that width — 460 —
   in both directions, because its `max-width: 100%` is cyclic during
   intrinsic sizing and is dropped. So the track was sized to 460, and a track
   is never shrunk below its base size. `max-width: 100%` then resolved
   against the GRID AREA — the 460 track — which is the dialog's own width, so
   the rule was self-referential and could never bite. Measured at a real 380
   viewport: the surface stayed 431.25 wide (rem is 15px here, so 28.75rem is
   431.25), its right edge landed at 453.75, and the close chip sat at 401 —
   entirely past the viewport, unreachable.

   `minmax(0, auto)` gives the track a base size of 0 and a growth limit of
   max-content, so it grows to the available 335 and stops. `max-width: 100%`
   now resolves against 335 and the surface fits. Re-measured: 335 wide, right
   edge 357.5, close chip on screen.

   NOT `min-width: 0` on the content: that was tried and changes nothing. The
   automatic minimum size was never the binding constraint — min-content here
   is 228.5, far under the available width. The track was the whole defect.
   ------------------------------------------------------------------------- */
const POSITIONER = [
  "pointer-events-none fixed inset-0 z-[60]",
  "grid grid-cols-[minmax(0,auto)]",
] as const;

/* ----------------------------------------------------------------------------
   PRESENTATION — WHERE THE ONE SURFACE LANDS. Four answers, one modal.

   `overlay` is the drawing this file has always made and is the DEFAULT, so
   the 115 call sites that pass nothing get the same classes they got
   yesterday — the one-sentence test in docs/RULES.md §0, held on purpose.
   `sheet` is the kit's bottom sheet at every width; `fullscreen` is the
   surface with no gutter and no corner; `responsive` is `overlay` at 45rem
   and up and `sheet` below it.

   WHY THIS IS HERE AND NOT AT A CALL SITE. The consuming app's screen engine
   draws exactly these four presentations, and could only do so by reaching
   past this component to the Radix primitive underneath it — its own law
   (kwapso-system R39, `UI_PACKAGE_EXEMPT`) records the reach as the app's
   last exemption and names the fix: "a `presentation` prop on the kit's
   DialogContent. Delete this line the day it ships." A second dialog drawn
   from the same primitive is two dialogs that can disagree about a scrim, a
   radius or an entrance without either file changing. This is the one.

   WHY `responsive` IS NOT THE DEFAULT, STATED SO IT IS NOT MISTAKEN FOR AN
   OVERSIGHT. The client's rule of 2026-09-04 — "everythung that's slisde in
   in desktop, should be slide up in mobile" — is about panels that ARRIVE
   FROM THE SIDE, and `sheet.tsx` applied it to `left` and `right` and left
   `top` and `bottom` alone for that reason. A centred modal does not arrive
   from a side; it rises 8 and fades. Whether every modal on a phone should
   become a bottom sheet is therefore a ruling this rule does not already
   contain, and it is a change to 115 screens. The prop makes it one word
   per call site, or one default here, the day it is ruled. Logged, not
   guessed.

   THE GEOMETRY BELOW 45rem IS `sheet.tsx`'S, LINE FOR LINE. The narrow
   half of `responsive` is the `sheet` presentation with `max-[45rem]:` in
   front of each class and nothing else changed, so the two cannot drift —
   the same construction `NARROW_BOTTOM` uses in `sheet.tsx`, for the same
   reason it gives: "Two kinds of bottom sheet on one phone would be a worse
   answer than the side drawer we started with." The cap is the same 85dvh,
   the corners are the same top pair, and the grabber below is the drawer's
   own grabber (27.2: "On narrow it rises from the bottom as a sheet with a
   grabber"), so a dialog that lands as a sheet reads as THE sheet.

   ONE THING IS DELIBERATELY NOT THE DRAWER'S: the 32 inset. `.kw-drawer`
   hands its body 24 and `.kw-modal` states 32, and this surface is still a
   modal's content — the h3 title, the 14/300 body, the action row — that
   has landed somewhere else. The presentation changes where it lands, not
   what it is, and shrinking the inset "would break the one measurement the
   kit does state" (the breakpoint note on DialogContent, unchanged).

   WHY THE BREAKPOINT IS `45rem` AND NOT `sm:` (40rem). The sheet's own
   threshold is 45rem — 720px at the authoring base, the figure ch27.2,
   ch27.4, ch27.14 and ch27.37 all state — and the drawer flips there. A
   modal that became a sheet at 40rem would be a sheet on a viewport the
   drawer still treats as a desktop; one threshold for both surfaces, so
   the phone is one thing. Above it `responsive` takes the overlay's 32
   gutter directly: the 24 gutter `overlay` draws below `sm` never shows,
   because below 45rem there is no gutter at all.

   WHY CSS AND NOT `matchMedia`, in one sentence borrowed from `sheet.tsx`:
   a JS read at render gives the server the desktop answer and the client
   the phone answer, and a media query has no first frame to get wrong.
   ------------------------------------------------------------------------- */
export type DialogPresentation = "responsive" | "overlay" | "sheet" | "fullscreen";

/* The grid's alignment and gutter, per presentation. `place-items-center`
   sets both axes; the narrow overrides are the two longhands, so a later
   `align-items: end` beats the shorthand's own and `justify-items: stretch`
   lets the surface take the track. The gutter for `sheet` and `fullscreen`
   is none: a surface pinned to an edge has nothing to be inset from. */
const LANDING: Record<DialogPresentation, string> = {
  /** `.kw-modal`: centred, 24 gutter on a phone, the kit's 32 from `sm`. */
  overlay: "place-items-center p-[var(--space-6)] sm:p-[var(--space-7)]",
  /** Pinned to the block end, full width, no gutter. */
  sheet: "items-end justify-items-stretch",
  /** Every edge. */
  fullscreen: "place-items-stretch",
  /** `overlay` from 45rem up, `sheet` below — each class the other's. */
  responsive: [
    "place-items-center min-[45rem]:p-[var(--space-7)]",
    "max-[45rem]:items-end max-[45rem]:justify-items-stretch",
  ].join(" "),
};

/* `.kw-modal` — 460 wide, box radius, overlay shadow, 32 inset. `max-w-full`
   is the kit's own rule, so the same class is the phone treatment. The
   surface's own classes — what does not change with where it lands. */
const CONTENT = [
  "pointer-events-auto relative flex flex-col",
  "overflow-y-auto",
  "bg-popover text-popover-foreground",
  "shadow-xl", // shadow-xl is bridged to --shadow-overlay
  "p-[var(--space-7)]",
  // One class, every presentation: motion.css §3d reads `data-presentation`
  // off this element the way §3a reads `data-side` off the sheet's, so the
  // sheet travel and the narrow flip are decided in the stylesheet.
  "motion-dialog",
] as const;

/* The `sheet` presentation's own four, and — with `max-[45rem]:` in front
   of each, nothing else — the narrow half of `responsive`. Written out
   twice rather than derived so a reader can see they are the same lines. */
const SHEET_SHAPE = "w-full max-h-[85dvh] rounded-t-[var(--radius)] rounded-b-none";
const NARROW_SHEET_SHAPE = [
  "max-[45rem]:w-full",
  "max-[45rem]:max-h-[85dvh]",
  "max-[45rem]:rounded-t-[var(--radius)]",
  "max-[45rem]:rounded-b-none",
].join(" ");

/* The surface's size and corners, per presentation. `rounded-t-*` beside
   `rounded-b-none` rather than `rounded-none` first, for the reason
   `sheet.tsx` gives at `NARROW_BOTTOM`: they touch four different corners
   between them and share none, so emission order cannot change the result. */
const SHAPE: Record<DialogPresentation, string> = {
  /** 460, never wider than its gutter, never taller than its track. */
  overlay: "w-[28.75rem] max-w-full max-h-full rounded-[var(--radius)]",
  /** The kit's bottom sheet: 85dvh cap, corners on the top pair only. */
  sheet: SHEET_SHAPE,
  /** The whole track, no corner — a page, not a card. */
  fullscreen: "h-full w-full max-h-full rounded-none",
  /** The overlay's, then the sheet's below 45rem. */
  responsive: `w-[28.75rem] max-w-full max-h-full rounded-[var(--radius)] ${NARROW_SHEET_SHAPE}`,
};

/* THE GRABBER — `sheet.tsx`'s, in the same tone at the same size: 42 × 4, a
   pill in the strong hairline tone, 10 from the top, centred. Absolute
   rather than in flow because this surface carries the modal's 32 inset and
   a flow grabber would sit 32 down; the drawer has no inset of its own and
   can let it flow. Decorative — dismissal is the scrim, the ✕ and Escape,
   all of which Radix already owns — so it is `aria-hidden` and takes no
   pointer. `hidden` and `block` are given per case rather than stacked, for
   the reason the drawer gives: two `display` utilities of equal specificity
   would leave the winner to emission order. */
const GRABBER = [
  "pointer-events-none absolute inset-x-0 top-[var(--space-2h)] mx-auto",
  "h-1 w-[2.625rem] rounded-pill bg-[var(--hair-strong)]",
] as const;

/* `.kw-drawer__close` — a 32 pill in the panel tone carrying secondary ink.
   The kit states no hover for it; `--surface-quiet` is one defined step from
   `--surface-panel` in both palettes (it darkens in light, lifts in dark), so
   the hover is a named tone rather than a fade. GAPS-A.md OVL-3. */
const OVERLAY_CLOSE = [
  "absolute top-[var(--space-6)] end-[var(--space-6)] z-[1]",
  "inline-grid size-[var(--control-height-dense)] place-content-center",
  "cursor-pointer rounded-pill border-0",
  "bg-surface-panel text-ink-secondary",
  "hover:bg-surface-quiet hover:text-foreground",
  "transition-colors duration-[var(--duration-colour)] ease-kwapso",
] as const;

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /**
   * Draw the built-in close chip. Default `true`. Set `false` for a dialog
   * whose only exits are its own footer buttons — a destructive confirmation
   * that must be answered belongs in `alert-dialog`, not here, but a wizard
   * step that owns its own chrome is a real case.
   */
  showClose?: boolean;
  /**
   * The close chip's accessible name. A default is given so no call site can
   * ship a nameless button, and it is a prop because the apps run in Arabic,
   * Urdu and Persian.
   */
  closeLabel?: string;
  /**
   * Where the surface lands. `overlay` (the default) is the centred card
   * this component has always drawn; `sheet` is the kit's bottom sheet at
   * every width; `fullscreen` fills the viewport; `responsive` is `overlay`
   * from 45rem up and `sheet` below it, decided by a media query and never
   * by a viewport read. See the PRESENTATION note above for why the default
   * is unchanged and why the threshold is the drawer's own 45rem.
   */
  presentation?: DialogPresentation;
}

/**
 * The modal surface. Renders its own scrim and portal, so a call site writes
 * `<Dialog><DialogTrigger/><DialogContent>…</DialogContent></Dialog>` and
 * nothing else.
 *
 * TEN STATES
 *  1. default        — `--popover` at 24 under `--shadow-overlay`, 32 inset,
 *                      over a charcoal 36% scrim.
 *  2. hover          — does not apply to the surface. The only hoverable thing
 *                      this file draws is the close chip, which moves from
 *                      `--surface-panel` to `--surface-quiet`. A colour swap,
 *                      never a fade.
 *  3. focus-visible  — NOT here. tokens.css §8 rings every control at once.
 *                      Radix moves focus into the dialog and traps it; this
 *                      file adds no ring and no outline reset.
 *  4. active/pressed — does not apply. A surface is not pressed.
 *  5. disabled       — does not apply. A dialog is open or it is not; there is
 *                      no disabled modal. A form inside it disables its own
 *                      controls, which is `button` and `input`'s job.
 *  6. loading        — does not apply to the surface, deliberately. A dialog
 *                      that is waiting keeps its own frame and shows the wait
 *                      in its body (`skeleton`) or on its submit control
 *                      (`Button loading`). Blanking the whole modal would
 *                      destroy the reader's place. Stated, not omitted.
 *  7. empty          — does not apply. A dialog with no children is a bug at
 *                      the call site, not a state to draw; Radix still
 *                      requires a `DialogTitle` for the accessibility tree.
 *  8. error          — does not apply to the surface. An error belongs to the
 *                      field that failed or to an `alert` in the body; a poppy
 *                      modal frame would colour the whole conversation.
 *  9. selected       — does not apply.
 * 10. read-only      — does not apply.
 *
 * THREE BREAKPOINTS
 *  mobile   — the gutter drops to `--space-6` (24) so the 460 surface has room;
 *             `max-w-full` then makes the dialog as wide as that gutter allows,
 *             which is the kit's own `max-width: 100%`. The 32 inset INSIDE the
 *             dialog is unchanged: shrinking it would break the one measurement
 *             the kit does state.
 *  tablet   — gutter at the kit's `--space-7` (32) from `sm` (40rem) up. The
 *             surface reaches its full 460 and stops growing.
 *  desktop  — UNCHANGED from tablet. A modal does not widen with the viewport;
 *             a 460 measure is the design.
 *  At every width the surface scrolls inside itself (`max-h-full
 *  overflow-y-auto`) rather than pushing the page, so a long dialog on a phone
 *  in landscape stays reachable.
 *
 *  The three lines above describe `presentation="overlay"`, the default, and
 *  are unchanged. `responsive` is that surface from 45rem up and, below it,
 *  the bottom sheet `sheet.tsx` draws — full width, capped at 85dvh, rounded
 *  on its top pair, a grabber at its top — anchored by a media query so the
 *  server and the client paint the same first frame. `sheet` is that sheet at
 *  every width and `fullscreen` is the track with no gutter and no corner at
 *  every width; neither restacks. Measured in verify/dialog-presentation.
 *
 * RTL — safe. The dialog is centred by `place-items-center`, not by a
 * translate, and the close chip is placed with `end-*`. No physical side is
 * named anywhere in this file; a sheet is pinned to the block end, which has
 * no direction.
 */
const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(
  (
    {
      className,
      children,
      showClose = true,
      closeLabel = "Close",
      presentation = "overlay",
      ...props
    },
    ref,
  ) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay data-slot="dialog-overlay" className={cn(SCRIM)} />
    <div
      data-slot="dialog-positioner"
      data-presentation={presentation}
      className={cn(POSITIONER, LANDING[presentation])}
    >
      <DialogPrimitive.Content
        ref={ref}
        data-slot="dialog-content"
        /* motion.css §3d selects on this. Radix sets data-state itself. */
        data-presentation={presentation}
        className={cn(CONTENT, SHAPE[presentation], className)}
        {...props}
      >
        {presentation === "sheet" || presentation === "responsive" ? (
          <span
            data-slot="dialog-grabber"
            aria-hidden="true"
            className={cn(
              GRABBER,
              presentation === "sheet" ? "block" : "hidden max-[45rem]:block",
            )}
          />
        ) : null}
        {children}
        {showClose ? (
          <DialogPrimitive.Close
            data-slot="dialog-close-button"
            aria-label={closeLabel}
            className={cn(OVERLAY_CLOSE)}
          >
            <X size={16} />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </div>
  </DialogPrimitive.Portal>
));

DialogContent.displayName = "DialogContent";

/**
 * Title and description, stacked. `.kw-modal` puts the body 10 under the
 * title; that gap is this element's whole design.
 *
 * The inline-end padding reserves the close chip's corner so a long title
 * never runs under it. It is unconditional because a header cannot see
 * whether its content drew a close.
 *
 * TEN STATES — none apply. This is a layout block with no interaction and no
 * data of its own: no hover, no focus, no pressed, no disabled, no loading, no
 * empty (a header with no children collapses to nothing, which is correct), no
 * error, no selected, no read-only.
 *
 * THREE BREAKPOINTS — UNCHANGED. A two-element stack has nothing to restack.
 *
 * RTL — safe. `pe-*` is padding-inline-end.
 */
const DialogHeader = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="dialog-header"
      className={cn("flex flex-col gap-[var(--space-2h)] pe-[var(--space-9)]", className)}
      {...props}
    />
  ),
);

DialogHeader.displayName = "DialogHeader";

/**
 * The action row. `.kw-modal__row`: a flex row, gap 12, sitting 24 under the
 * body. Start-aligned with the primary FIRST — that is the kit's drawing, and
 * it is the one place this component deliberately parts from the shadcn shape
 * it replaces (which pushes the buttons to the end). Noted in GAPS-A.md OVL-4
 * because it changes the look of 115 call sites without changing their code.
 *
 * TEN STATES — none apply. The row draws nothing; its children are Buttons and
 * they carry all ten themselves.
 *
 * THREE BREAKPOINTS — UNCHANGED in direction: the row stays a row at every
 * width and wraps rather than stacking, because two 40-tall pills fit side by
 * side at 320 and a stacked pair reads as a list of options rather than as a
 * choice. `flex-wrap` is the only concession, for a three-button footer on a
 * phone.
 *
 * RTL — safe. `gap` and flex order follow the document direction.
 *
 * RULED 2026-08-22 (verify/modal-decisions.html, answer 1B): the footer is
 * END-ALIGNED with the primary action LAST. The kit draws `.kw-modal__foot`
 * start-aligned with the primary written first, and that was built for a day;
 * it was overruled by looking at it. Two reasons it loses: the 229 existing
 * footers are written cancel-first, so the kit order would have silently
 * re-read every one of them, and end-aligned-primary-last is the web/Windows
 * convention these apps already teach their users.
 *
 * `flex-col-reverse` below the sm breakpoint puts the primary on TOP of the
 * stack while keeping it last in the DOM — so the reading order and the tab
 * order still end on the commit control, which is what a keyboard user
 * expects. Departure from the kit logged in GAPS.md as OVL-4.
 */
const DialogFooter = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="dialog-footer"
      className={cn("mt-[var(--space-6)] flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end", className)}
      {...props}
    />
  ),
);

DialogFooter.displayName = "DialogFooter";

/**
 * `.kw-modal__title` — the h3 step (24/500) with its own tracking, which
 * `text-2xl` now carries in one class.
 *
 * TEN STATES — none apply; it is a heading. Radix requires it for the dialog's
 * accessible name, so it is never absent.
 * THREE BREAKPOINTS — UNCHANGED. The kit states one modal title size.
 * RTL — safe. No inset, no direction.
 */
const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    data-slot="dialog-title"
    className={cn("text-2xl font-[var(--font-weight-medium)] text-foreground", className)}
    {...props}
  />
));

DialogTitle.displayName = "DialogTitle";

/**
 * `.kw-modal__body` — 14/300 in secondary ink at the normal leading, all three
 * of which `text-sm` sets in one class.
 *
 * TEN STATES — none apply; it is prose.
 * THREE BREAKPOINTS — UNCHANGED. Its measure is the dialog's 460, which is
 * already inside the kit's reading measure at every width.
 * RTL — safe.
 */
const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    data-slot="dialog-description"
    className={cn("text-sm text-ink-secondary", className)}
    {...props}
  />
));

DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
