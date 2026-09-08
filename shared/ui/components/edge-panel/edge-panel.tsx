"use client";

/* ============================================================================
   EdgePanel — the docked rail (0 direct call sites here; the app's activity
   rail is the first, and the shell's assistant column is the second this box
   was drawn for).

   DESIGN SOURCE
   THE CLIENT, 2026-09-07, ON THE RECORD-ACTIVITY SHAPES, VERBATIM:

       "recoerd activity- implemet 'A · in the eyebrow row' across the app.
        kill all old activity tabs. For the design, let's do a a 6 - but make
        it slide in in desktop and slide up in phone"

   "a 6" is shape 06 of the artifact she reviewed — THE DOCKED RAIL: the
   record's history stands at the inline end while the record stays live
   beside it. She chose it over the three SHEET shapes on the same page, and
   the thing that separates it from all three is the one thing this file
   exists to preserve: it is NOT MODAL. Nothing dims, nothing locks, nothing
   traps, and the reader can keep working with the history open. Her
   amendment moves it off the layout — it no longer PUSHES the record over,
   it slides in OVER the inline end — and re-anchors it on a phone, where it
   rises from the bottom.

   THE ARTIFACT ITSELF IS NOT VENDORED IN THIS REPO. The sentence above is
   therefore the source of record, quoted rather than paraphrased, and this
   note is the honest half of PATTERN §9: what is drawn below is read off her
   words and off the kit's own drawer, not off a specimen this repo holds.

   WHY IT IS `EdgePanel` AND NOT `ActivityRail`
   PATTERN §9 forbids product vocabulary in a kit file, and it would be wrong
   here on the merits too: `foundations/motion/motion.css` §3b already names
   this exact box — "the same rule for A PANEL THAT IS NOT A SHEET" — and
   calls it `.motion-edge-panel`. The class was written for the shell's
   assistant COLUMN, not for a history. Taking the motion contract's own word
   means the component and the class that moves it cannot end up with two
   names for one idea, and it leaves the box general enough for the next rail
   that wants it.

   THE LAW THIS FILE OBEYS
   · NON-MODAL BY CONSTRUCTION ABOVE 45rem. No scrim, no focus trap, no page
     lock, no Radix Dialog. That is not a simplification, it is the shape the
     client picked; a rail that dimmed the record would be one of the three
     sheets she did not pick.
   · MODAL ONLY BELOW 45rem — argued in full at `NARROW_BOTTOM` below,
     because a reader will otherwise read the asymmetry as an oversight.
   · The geometry above 45rem is the kit's ONE drawer's, taken out of
     `components/sheet/sheet.tsx` rather than re-derived: 420 on the inline
     end, `--radius` on the INNER edge only, and a three-part frame whose
     head and foot do not move while the body scrolls. Every number below
     that looks like a decision was copied from that file, and each one says
     so at the point of use. A rail and a drawer that were nearly the same
     420 would be the worst of both.
   · This file writes NO DURATION AND NO CURVE (RULES §6.1). It adds ONE
     class, `.motion-edge-panel`, and satisfies that class's four-point
     contract literally. The one place it reads a duration is the unmount
     lag, and it READS the token rather than restating it — see `exitMs`.
   · Separation is a fill or an INSET SHADOW, never a border. The head's and
     the foot's rules are `--hairline-under` / `--hairline-over`.
   · Two radii and the pill: `--radius` on the panel's inner edge, the pill
     on the close chip and on the grabber. No third.
   · No mango. A rail is a side channel; the one brand fill in a view belongs
     to the view's own primary action.
   · Focus is ONE global rule (tokens.css §8). No ring is written here.
   · Every user-visible string is a prop with a default.

   WHY IT PORTALS TO `document.body`, WHICH IS NOT OPTIONAL
   Everything below is `position: fixed`, and a fixed box resolves against the
   viewport only while NO ancestor establishes a containing block. This kit
   ships one that always does: `.motion-page` (motion.css §2) animates
   `transform` with `animation-fill-mode: both`, so the route wrapper holds
   `translateY(0)` for the whole life of the page — a non-`none` transform,
   and therefore a containing block, long after the entrance has finished. A
   rail mounted inside a route would silently anchor to the route's box
   instead of the window, and it would look almost right, which is worse. The
   drawer never had to think about this because Radix's `Portal` was doing it;
   this component has no Radix, so it does it itself.

   RENDERING CONTEXT
   `"use client"`. State, effects, `matchMedia`, `createPortal` and document
   listeners — every one of PATTERN §8's triggers at once.
   ========================================================================= */

import * as React from "react";
import { createPortal } from "react-dom";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";
import { X } from "../../foundations/icons";

/* ----------------------------------------------------------------------------
   THE SCRIM — AND WHY IT IS NOT THE FOURTH HAND-MIXED CHARCOAL IN THIS KIT.

   `bg-scrim-drawer` is a NAMED utility over a token minted in tokens.css §3
   on 2026-09-07. Until then the kit's two scrim values lived as an arbitrary
   background holding a `color-mix` of the raw charcoal at 28% against
   transparent — described rather than spelled, per PATTERN §10: Tailwind
   scans this file's comments and cannot tell an explanation from an
   intention, and a retired class emitted out of a comment is a dead rule in
   somebody's bundle. It was written out in four separate files, each with its
   own paragraph explaining that the raw palette layer is being reached
   deliberately (GAPS-A.md OVL-2). OVL-2's own
   text says what the fix is — "A component may not write a colour, so the
   value has to come from a token" — and the reason it stayed unfixed was that
   no semantic token is charcoal in BOTH palettes. A token whose whole job is
   to be that is the answer, and this component asked the question for the
   fifth time. It is now one definition and four consumers, all of them named
   utilities, which is also what the record footer's 2026-09-07 note demands
   of any element that paints a ground.

   THE DRAWER'S 28% AND NOT THE MODAL'S 36%, deliberately: the kit's own note
   is that a drawer is a side channel and a modal is a stop, and below 45rem
   this panel IS the drawer — that is the client's slide-up rule, not a
   resemblance. A rail that dimmed harder than the drawer would be claiming to
   be more interrupting than the thing it borrows its geometry from.

   IT IS DRAWN ONLY BELOW 45rem, AND THE DECISION IS CSS. `hidden` is a real
   `display: none`, so above 45rem this element paints nothing, catches no
   pointer and has no click target — the non-modal half of the asymmetry, made
   out of a media query rather than out of a viewport read, so there is no
   first frame to get wrong. See `NARROW_BOTTOM` for why the BEHAVIOURAL half
   is allowed to read the viewport when this half is not.

   z 50 — ONE RUNG UNDER THE DRAWER. The system's ladder is stated in
   `select.tsx`: sheet 55, dialog and alert-dialog 60, then the four anchored
   surfaces at 70. A rail belongs under all of them. It must cover the page
   and the shell's own chrome (which tops out at 10), and it must NOT cover a
   drawer or a dialog opened from inside it — a picker opened out of the rail
   is exactly the "must clear a dialog" case that put Select at 70, and it
   still clears this. The panel takes the same 50, so the two are ordered by
   DOM order, which is how the drawer's pair is ordered too.
   ------------------------------------------------------------------------- */
const SCRIM = [
  "fixed inset-0 z-[50]",
  "bg-scrim-drawer",
  "motion-scrim",
  "hidden max-[45rem]:block",
] as const;

/* ----------------------------------------------------------------------------
   BELOW 45rem THIS IS A BOTTOM SHEET, AND IT IS MODAL. TWO CHANGES, ONE RULE.

   THE CLIENT, 2026-09-07: "make it slide in in desktop and slide up in phone".
   And the standing system rule she gave three days earlier, which this is the
   same sentence twice: "everythung that's slisde in in desktop, should be
   slide up in mobile" (2026-09-04, quoted in full in sheet.tsx and in
   motion.css §3a).

   1 · THE GEOMETRY. `.motion-edge-panel` makes a left/right panel TRAVEL
   upward below 45rem and explicitly does NOT move it — contract point 4,
   "the caller must place the panel where it is going to land, or the travel
   will be right and the destination wrong". Moving it is this file's job, and
   the eight declarations below are, line for line, the ones `sheet.tsx`
   already wrote for the same flip. They are COPIED, not re-derived, and the
   reason is in sheet.tsx's own comment at its `NARROW_BOTTOM`: each one is
   fighting a specific base declaration (`inset-x-0` adds the second
   horizontal inset, `top-auto` kills the `top: 0` half of `inset-y-0`,
   `h-auto` kills `h-full` so `max-h` can bite, the two radius classes touch
   four different corners and share none so their emission order cannot
   matter). Two bottom sheets on one phone that differed by a pixel would be
   the worst possible outcome of a rule whose entire purpose is that panels
   behave the same way.

   85dvh IS THE CLIENT'S 85/15 RULING and `dvh` rather than `vh` for
   sheet.tsx's reason: on a phone the browser chrome is the difference between
   a footer you can press and one under the address bar. The 15 that is left
   is not spare — it is the strip of scrim that says the record is still
   there, and it is a tap target.

   2 · AND ONLY HERE IS IT MODAL. THIS IS DELIBERATE ASYMMETRY, NOT AN
   OVERSIGHT, and it is the one thing in this file most likely to be "fixed"
   by somebody making it consistent.

   The whole point of shape 06 is that the reader keeps working. On a desktop
   that is true by construction: the rail takes 420 of a 1440 viewport, the
   record is fully visible beside it, and dimming or trapping would be taking
   away the exact thing she chose the shape for.

   On a phone none of that survives. The panel is FULL WIDTH and 85dvh tall:
   the record is not beside it, it is under it. A page that is 85% covered,
   still scrollable, still tabbable and still clickable is not "non-modal", it
   is a page you can operate BLIND — the reader tabs from the last control in
   the sheet into a form they cannot see, or scrolls the record instead of the
   history and cannot tell which one moved. The honest name for that is a
   trap. So below 45rem the panel takes the three things it refuses above it:
   a scrim (above), a focus trap and a page lock (both in the effects below).

   Put the other way round: the asymmetry is not between two widths, it is
   between two SHAPES. Above 45rem this is a rail beside a record. Below it,
   it is the drawer — the kit already has one, it is already modal, and this
   panel becomes it. The root element's ROLE changes with it, from `aside` to
   `role="dialog" aria-modal="true"`, because that is the truth at each width
   and a component that lied about one of them would be readable by nobody.

   WHY THE GEOMETRY MAY NOT READ THE VIEWPORT AND THE BEHAVIOUR MAY.
   sheet.tsx and motion.css §3a both refuse `matchMedia` for the LAYOUT, and
   the reason is stated there: a JS breakpoint read during render gives the
   server the desktop answer and the client the phone answer — a hydration
   mismatch — and even where it hydrates cleanly the first painted frame is a
   panel flying in from the side before it corrects itself. Every VISIBLE
   decision in this file therefore lives in a media query, and there is no
   first frame to get wrong.

   A focus trap, a page lock and an ARIA role are not painted. They are
   attached in an EFFECT, which does not run on the server at all and runs
   after the first client paint, so reading `matchMedia` there mismatches
   nothing and flashes nothing. The one visible consequence is that for one
   frame on a phone the panel is announced as a complementary region rather
   than as a dialog; the scrim is already drawn by then, because the scrim is
   CSS. That is the correct place for the seam and it is why it is here rather
   than anywhere else.

   THE THRESHOLD IS WRITTEN THE SAME WAY IN BOTH HALVES. The classes compile
   to `width < 45rem` (Tailwind's `max-[45rem]:` variant) and the effect asks
   `matchMedia("(width < 45rem)")` — the RANGE form, not `max-width: 45rem`,
   for motion.css §3a's reason: at exactly 720px an inclusive query would flip
   one half of this component one pixel before the other half followed.
   ------------------------------------------------------------------------- */
const NARROW_BOTTOM = [
  "max-[45rem]:inset-x-0",
  "max-[45rem]:top-auto",
  "max-[45rem]:bottom-0",
  "max-[45rem]:h-auto",
  "max-[45rem]:w-full",
  "max-[45rem]:max-h-[85dvh]",
  "max-[45rem]:rounded-t-[var(--radius)]",
  "max-[45rem]:rounded-b-none",
].join(" ");

const edgePanelVariants = cva(
  [
    /* The frame. Head and foot are fixed and the body scrolls, so a column
       flex rather than a padded block — `.kw-drawer`'s own anatomy, reached
       through sheet.tsx. */
    "fixed z-[50] flex flex-col",
    /* The drawer's surface, verbatim: `--popover` under `--shadow-overlay`
       (`shadow-xl` is re-pointed at it by tokens.css §10). Named utilities,
       never an arbitrary background. */
    "bg-popover text-popover-foreground",
    "shadow-xl",
    /* MOTION, ATTACHED AND NEVER RESTATED — contract point 1: the class goes
       on the PANEL ELEMENT, never on a wrapper, because the keyframes
       translate 100% of the animated box. Points 2 and 3 (`data-side`,
       `data-state`) are set on the same element below.

       IT IS `.motion-edge-panel` AND NOT `.motion-edge-panel-narrow`, and
       §3c is where the difference is written down: the narrow twin exists for
       a panel that does NOT slide on a desktop — the shell's assistant, which
       minimises on the inline axis instead — so it carries the slide-up and
       nothing above 45rem. This panel slides at BOTH widths, because that is
       what the client asked for in one sentence: "slide in in desktop and
       slide up in phone". §3b's class is that sentence, already written. */
    "motion-edge-panel",
  ],
  {
    variants: {
      /**
       * Which edge the panel is anchored to, positioned LOGICALLY: `left` is
       * the reading-start edge and `right` the reading-end edge, and both
       * mirror with the document exactly as the drawer's do. The names are
       * the drawer's own four words minus two — see below — so a reader who
       * knows `Sheet` knows this.
       */
      side: {
        /** The reading-start edge. 420 and `max-w-full` are the kit drawer's. */
        left: `inset-y-0 start-0 h-full w-[26.25rem] max-w-full rounded-e-[var(--radius)] ${NARROW_BOTTOM}`,
        /** The reading-end edge — where the client's shape 06 puts the rail. */
        right: `inset-y-0 end-0 h-full w-[26.25rem] max-w-full rounded-s-[var(--radius)] ${NARROW_BOTTOM}`,
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

/* THERE IS NO `top` OR `bottom` SIDE, AND THAT IS A DECISION, NOT AN OMISSION.
   `.motion-edge-panel` supports four, and `Sheet` exposes four because 18 call
   sites already passed them. Nothing passes this one yet, so the API can be
   the honest size. A `bottom` edge panel is a bottom sheet at every width and
   the kit already draws that; a `top` one cannot obey the client's rule at all
   — sheet.tsx's sentence is the whole argument, "a `top` sheet that rose from
   the bottom would arrive at the edge it did not come from". Two sides are the
   two the rule is about. If a fifth caller ever needs a block edge, it needs
   `Sheet`. */

/* The close chip. `.kw-drawer__close` — a 32 pill in the panel tone carrying
   secondary ink, with the kit's colour transition and no hover fill of its
   own. Taken class for class out of `sheet.tsx`'s `OVERLAY_CLOSE` so the rail
   and the drawer close with the same control; it is duplicated rather than
   imported because `sheet.tsx` does not export it and widening that file's
   public surface to serve this one is exactly what RULES §9.1 is protecting.
   motion.css §3b was written as a copy of §3 for the same trade. */
const OVERLAY_CLOSE = [
  "absolute top-[var(--space-6)] end-[var(--space-6)] z-[1]",
  "inline-grid size-[var(--control-height-dense)] place-content-center",
  "cursor-pointer rounded-pill border-0",
  "bg-surface-panel text-ink-secondary",
  "hover:bg-surface-quiet hover:text-foreground",
  "transition-colors duration-[var(--duration-colour)] ease-kwapso",
] as const;

/* What the narrow trap counts as a stop. The standing list, minus anything
   the browser has already taken out of the order (`inert` subtrees,
   `tabindex="-1"`, a disabled control, a hidden input). */
const FOCUSABLE =
  'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),' +
  "select:not([disabled]),textarea:not([disabled]),iframe,object,embed," +
  '[contenteditable="true"],[tabindex]:not([tabindex="-1"])';

/* ----------------------------------------------------------------------------
   `--duration-exit`, READ RATHER THAN RESTATED.

   Contract point 5 is the one §3b says will be got wrong first: unmounting
   the panel in the same commit that sets `data-state="closed"` lands
   `display: none` on the exit's FIRST FRAME, so the panel disappears instead
   of leaving and the class looks broken when the caller is what broke it.
   `inert` goes on immediately — a panel on its way out must be unreachable
   from the keyboard, the accessibility tree and the pointer while it is still
   painted — and REMOVAL waits.

   Waits for how long is the interesting half. RULES §6.1 says a component
   writes no duration, and `verify/sheet-slide-up`'s `EdgePanelProbe` spends a
   literal 200 to out-wait the token's 140. That is right for a probe and
   wrong for a shipped component: it is a second copy of a number that lives
   in `tokens.css`, and it stays 200 when somebody retunes the exit. So the
   value is READ off the document — the same token the animation itself
   resolves, which means reduced motion is handled for free, because
   tokens.css §9 zeroes `--duration-exit` and this reads the zero.

   NOT `animationend`, and this is not a preference either. PATTERN §12 has
   the case written down: an embedded browser pane running at
   `document.hidden === true` never ticks a CSS animation, so `animationend`
   never fires and a surface that unmounts on it never unmounts — "a supposed
   unmount bug reproduced perfectly there and was pure artefact". A timer runs
   in a tab that does not paint.

   AN UNREADABLE TOKEN RETURNS 0, WHICH IS THE COHERENT ANSWER AND NOT A
   FALLBACK GUESS: if the stylesheet that declares `--duration-exit` is not
   there, the stylesheet that would have animated the exit is not there
   either, so there is no exit to wait for.
   ------------------------------------------------------------------------- */
function exitMs(): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  const raw = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue("--duration-exit")
    .trim();
  if (raw === "") return 0;
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) return 0;
  /* `140ms` and `0s` are both legal CSS times and tokens.css §9 emits the
     second one under reduced motion. Seconds are the unit CSS assumes when
     the suffix is not `ms`. */
  return raw.endsWith("ms") ? value : value * 1000;
}

export interface EdgePanelProps
  extends Omit<React.ComponentPropsWithoutRef<"aside">, "title">,
    VariantProps<typeof edgePanelVariants> {
  /**
   * Whether the panel is shown. CONTROLLED, with no uncontrolled twin: a rail
   * is opened from somewhere else on the screen — a footer's action, a
   * toolbar, a keyboard shortcut — and the thing that opens it is the thing
   * that has to know it is open, so a second copy of that state inside here
   * could only ever disagree with it.
   */
  open: boolean;
  /**
   * The reader dismissed it: Escape, the close chip, or — below 45rem only,
   * where there is one — the scrim. Absent, the panel has no self-dismissal
   * and the caller is expected to close it from outside; the close chip is
   * then not drawn, because a control that cannot do anything is worse than
   * no control.
   */
  onClose?: () => void;
  /**
   * The panel's heading, and its accessible name. Drawn at the drawer's own
   * title step — smaller than a modal's on purpose, because a rail is a
   * record and a modal is an interruption.
   */
  title?: React.ReactNode;
  /** The line under the title. */
  description?: React.ReactNode;
  /**
   * The pinned foot. Given, the frame's third band is drawn and never
   * scrolls; omitted, the body runs to the bottom edge. A rail often has no
   * commit control at all, which is why this is a slot and not a shape.
   */
  footer?: React.ReactNode;
  /**
   * Draw the built-in close chip. Default `true` — the kit's drawer head has
   * one, and below 45rem this panel covers 85dvh, where an exit you can see
   * is not optional. It is suppressed anyway when no `onClose` is given.
   */
  showClose?: boolean;
  /**
   * The close chip's accessible name. A default so no call site ships a
   * nameless button, and a prop so it can be translated.
   */
  closeLabel?: string;
  /**
   * The panel's accessible name when it carries no `title`. Undefined leaves
   * it unnamed, which is right when the call site wires `aria-labelledby` to
   * a heading it drew itself — so nothing is hardcoded here. With a `title`
   * this is ignored: the title element names the panel.
   */
  label?: string;
}

/**
 * A panel docked to a reading edge — non-modal beside the page above 45rem, a
 * modal bottom sheet below it.
 *
 * TEN STATES
 *  1. default        — `--popover` under `--shadow-overlay`, 420 on the
 *                      inline end, `--radius` on the inner edge only, no
 *                      scrim and nothing behind it disabled. Below 45rem:
 *                      full width, bottom-anchored, capped at 85dvh, over the
 *                      drawer's 28% scrim.
 *  2. hover          — does not apply to the surface. The close chip moves
 *                      `--surface-panel` → `--surface-quiet`, which is the
 *                      drawer's own chip; anything in the body brings its own
 *                      hover, and a page-sized target that responded to the
 *                      pointer would light up on every mouse move.
 *  3. focus-visible  — NOT here. tokens.css §8 rings every control at once.
 *                      What IS here is where focus may go: trapped inside the
 *                      panel below 45rem, and deliberately NOT moved at all
 *                      above it, because a rail that stole focus from the
 *                      record would have taken away the one thing shape 06
 *                      was chosen for.
 *  4. active/pressed — does not apply to a surface.
 *  5. disabled       — does not apply. A panel is open or closed. Controls
 *                      inside it carry their own disabled fill and ink.
 *  6. loading        — does not apply to the frame, and deliberately: a rail
 *                      that is fetching keeps its frame and its title and
 *                      puts a `skeleton` — or `ActivityFeed`'s own
 *                      `loading` — in the body. Blanking the frame would lose
 *                      the reader's place in the record they opened it from.
 *  7. empty          — does not apply to the frame. An empty body is the
 *                      empty register's job, placed as a child; a rail that
 *                      vanished because its history was empty would answer a
 *                      question by disappearing.
 *  8. error          — does not apply to the frame; a failed load is an
 *                      `alert` in the body. A poppy panel edge would read as
 *                      the record being broken rather than the request.
 *  9. selected       — does not apply.
 * 10. read-only      — does not apply to the frame. A read-only body shows
 *                      read-only fields, which `input` already draws.
 *
 * THREE BREAKPOINTS — the case that is the whole component.
 *  mobile   — CHANGED, and changed twice over: it becomes a BOTTOM SHEET
 *             (full width, `bottom-0`, 85dvh, radius on the top corners, the
 *             drawer's grabber) and it becomes MODAL (scrim, focus trap, page
 *             lock, `role="dialog" aria-modal="true"`). The geometry is
 *             argued at `NARROW_BOTTOM` above and the modality with it; both
 *             are the client's 2026-09-07 sentence and her standing
 *             2026-09-04 rule, and the geometry is `sheet.tsx`'s own so the
 *             phone never gets two different bottom sheets.
 *  tablet   — UNCHANGED. 834 is comfortably above 45rem, so a tablet gets the
 *             desktop rail: 420 beside a record that is still 414 wide and
 *             still live. Nothing in either ruling reaches it.
 *  desktop  — UNCHANGED, and the panel does NOT widen with the viewport. 420
 *             is the measure the kit states for its drawer and a wider rail
 *             is a worse one: past about 480 a history column stops being a
 *             margin note and starts competing with the record for the
 *             reader's eye, which is the failure the client rejected when she
 *             rejected the sheets.
 *
 * RTL — safe. `side` is positioned with `start-*` / `end-*` and
 * `rounded-s-*` / `rounded-e-*`, so the panel and its radius mirror with the
 * document; the ENTRANCE mirrors with them, because motion.css §3b carries
 * the `[dir="rtl"]` swap for `.motion-edge-panel` exactly as §3 carries it
 * for the sheet. Nothing in this file names a physical side.
 */
const EdgePanel = React.forwardRef<HTMLElement, EdgePanelProps>(
  (
    {
      className,
      children,
      side = "right",
      open,
      onClose,
      title,
      description,
      footer,
      showClose = true,
      closeLabel = "Close",
      label,
      ...props
    },
    ref,
  ) => {
    const titleId = React.useId();
    const panelRef = React.useRef<HTMLElement | null>(null);
    /* Two refs to one node: the caller's, honoured, and this file's, needed
       by the trap. Written as a callback so neither has to know about the
       other. */
    const setRefs = React.useCallback(
      (node: HTMLElement | null) => {
        panelRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref !== null && ref !== undefined) ref.current = node;
      },
      [ref],
    );

    /* The portal cannot exist on the server, and rendering it on the client's
       FIRST pass when the server rendered nothing is a hydration mismatch. So
       the first client render agrees with the server (nothing) and the portal
       arrives on the effect that follows it. A panel that is already open on
       the very first paint is the rare case and it costs one frame; a panel
       opened by a press — every real case — costs nothing, because the press
       is long after mount. */
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => {
      setMounted(true);
    }, []);

    /* PAINTED LAGS OPEN. Contract point 5: `inert` immediately, removal after
       `--duration-exit`. See `exitMs` above for why the wait is read and not
       written, and why it is not `animationend`. */
    const [painted, setPainted] = React.useState(open);
    React.useEffect(() => {
      if (open) {
        setPainted(true);
        return;
      }
      const ms = exitMs();
      if (ms <= 0) {
        setPainted(false);
        return;
      }
      const id = window.setTimeout(() => {
        setPainted(false);
      }, ms);
      return () => {
        window.clearTimeout(id);
      };
    }, [open]);

    /* THE VIEWPORT, READ IN AN EFFECT AND NOWHERE ELSE. Everything visible is
       decided by a media query (see `NARROW_BOTTOM`); this drives only the
       three things that are not painted — the role, the trap and the lock. It
       starts `false` so the server and the first client paint agree, and the
       range syntax matches the classes' own boundary pixel. */
    const [narrow, setNarrow] = React.useState(false);
    React.useEffect(() => {
      const query = window.matchMedia("(width < 45rem)");
      const read = () => {
        setNarrow(query.matches);
      };
      read();
      query.addEventListener("change", read);
      return () => {
        query.removeEventListener("change", read);
      };
    }, []);

    /* Escape, at BOTH widths. On the document rather than on the panel,
       because above 45rem the panel is non-modal and focus is normally
       somewhere else entirely — a rail you can only dismiss while your cursor
       is inside it is a rail you cannot dismiss. */
    React.useEffect(() => {
      if (!open || onClose === undefined) return;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") onClose();
      };
      document.addEventListener("keydown", onKeyDown);
      return () => {
        document.removeEventListener("keydown", onKeyDown);
      };
    }, [open, onClose]);

    /* Whether the reader's focus is currently inside the panel. Recorded on
       the way in rather than measured on the way out: by the time the panel
       is closing it is already `inert`, which the browser has answered by
       moving focus off it, so asking afterwards always says no. */
    const heldFocus = React.useRef(false);

    /* ---- THE MODAL HALF, AND ONLY BELOW 45rem ------------------------- */
    React.useEffect(() => {
      if (!open || !narrow) return;
      const node = panelRef.current;
      if (node === null) return;

      const opener = document.activeElement as HTMLElement | null;
      const body = document.body;
      /* The page lock. A sheet covering 85dvh whose page still scrolls under
         it is the "operate it blind" failure in its most common form: the
         thumb is over the sheet, the momentum lands on the record, and
         nothing on screen says which one moved. Restored to whatever was
         there before rather than to a blank, so a host that sets its own
         overflow gets it back. */
      const previousOverflow = body.style.overflow;
      body.style.overflow = "hidden";

      const stops = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));

      /* Focus goes IN. The first stop if there is one, the panel itself if
         there is not — which is why the panel carries `tabIndex={-1}`: a
         target, never a stop. */
      const first = stops()[0];
      (first ?? node).focus();

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Tab") return;
        /* Re-read on every press. A rail's contents change under the reader
           — a feed loads, a register is replaced — and a list captured once
           at open would send Tab to a control that has since left. */
        const list = stops();
        if (list.length === 0) {
          /* Nothing to tab to: hold focus on the panel rather than letting it
             escape to the page underneath, which is the page this sheet is
             covering. */
          event.preventDefault();
          node.focus();
          return;
        }
        const firstStop = list[0];
        const lastStop = list[list.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === firstStop || active === node)) {
          event.preventDefault();
          lastStop.focus();
        } else if (!event.shiftKey && active === lastStop) {
          event.preventDefault();
          firstStop.focus();
        }
      };

      node.addEventListener("keydown", onKeyDown);
      return () => {
        node.removeEventListener("keydown", onKeyDown);
        body.style.overflow = previousOverflow;
        if (heldFocus.current) {
          heldFocus.current = false;
          opener?.focus();
        }
      };
    }, [open, narrow]);

    /* ABOVE 45rem NOTHING TAKES FOCUS AND NOTHING GIVES IT BACK — except
       this: if the reader WAS working inside the rail when it closed, focus
       would otherwise land on `<body>` and the next Tab would start the page
       again from the top. Returning it to whatever opened the panel is the
       only focus move a non-modal panel is entitled to make. */
    const openerRef = React.useRef<HTMLElement | null>(null);
    React.useEffect(() => {
      if (open) {
        openerRef.current = document.activeElement as HTMLElement | null;
        heldFocus.current = false;
        return;
      }
      if (heldFocus.current) {
        heldFocus.current = false;
        openerRef.current?.focus();
      }
    }, [open]);

    if (!mounted || !painted) return null;

    const state = open ? "open" : "closed";
    const hasHead = title !== undefined && title !== null;
    const hasDescription = description !== undefined && description !== null;
    /* A chip that cannot dismiss anything is not drawn. `onClose` is what
       makes the panel self-dismissing at all. */
    const drawClose = showClose && onClose !== undefined;

    return createPortal(
      <React.Fragment>
        {/* Decorative and narrow-only: dismissal also lives on the chip and on
            Escape, both of which a keyboard can reach, so this carries no role
            and is hidden from the accessibility tree. `.motion-scrim` reads
            `data-state` for its own fade out. */}
        <div
          data-slot="edge-panel-scrim"
          data-state={state}
          aria-hidden="true"
          onClick={onClose}
          className={cn(SCRIM)}
        />

        <aside
          ref={setRefs}
          data-slot="edge-panel"
          /* Contract points 2 and 3, on the panel element itself. `data-side`
             stays the CALL SITE'S STATED INTENT at every width — it still
             says "right" on a phone — for the reason sheet.tsx gives: the
             prop is intent, the viewport is a separate fact, and the
             attribute stays honest so the media query can do the translating. */
          data-side={side}
          data-state={state}
          /* Inert from the FIRST FRAME OF THE EXIT, while the panel is still
             painted. The pair `inert` / removal is contract point 5, and the
             two do not happen at the same moment — treating them as one flag
             is the bug the contract names. */
          inert={!open || undefined}
          tabIndex={-1}
          /* The role IS different at the two widths, because the object is —
             see `NARROW_BOTTOM`. Above 45rem: a complementary region beside
             live content. Below it: the drawer, and the drawer is modal. */
          role={narrow ? "dialog" : undefined}
          aria-modal={narrow ? true : undefined}
          aria-labelledby={hasHead ? titleId : undefined}
          aria-label={hasHead ? undefined : label}
          onFocusCapture={() => {
            heldFocus.current = true;
          }}
          className={cn(edgePanelVariants({ side }), className)}
          {...props}
        >
          {/* THE GRABBER — ch27.2, verbatim: "On narrow it rises from the
              bottom as a sheet with a grabber." 42 × 4, a pill in the strong
              hairline tone, centred at the top. Below 45rem this panel IS
              that sheet, so it wears that sheet's affordance; a bottom sheet
              with the geometry and none of the affordance would be the odd
              one of two, which is the outcome the whole slide-up rule exists
              to avoid. Above 45rem it is not drawn at all: a docked panel's
              affordance is its inner rounded edge, and the kit's drawer draws
              no grabber there either.

              `hidden` is a real `display: none`, as the house rule requires,
              and nothing here is in the tab order to begin with — an
              `aria-hidden` span with no tabindex and no handler. */}
          <span
            data-slot="edge-panel-grabber"
            aria-hidden="true"
            className="mx-auto mt-[var(--space-2h)] hidden h-1 w-[2.625rem] shrink-0 rounded-pill bg-[var(--hair-strong)] max-[45rem]:block"
          />

          {/* `.kw-drawer__head` — 24 inset with an 18 bottom, one hairline
              under it, and it does not scroll. The hairline is an inset
              shadow, never a border. The inline-end reserve keeps a long
              title clear of the close chip and is unconditional, because a
              head cannot see whether its panel drew one. */}
          {hasHead || hasDescription ? (
            <div
              data-slot="edge-panel-header"
              className="flex shrink-0 flex-col gap-[var(--space-2h)] shadow-[var(--hairline-under)] px-[var(--space-6)] pt-[var(--space-6)] pb-[var(--space-4h)] pe-[var(--space-9)]"
            >
              {hasHead ? (
                <h2
                  id={titleId}
                  data-slot="edge-panel-title"
                  className="m-0 text-xl font-[var(--font-weight-medium)] text-foreground"
                >
                  {title}
                </h2>
              ) : null}
              {hasDescription ? (
                <p
                  data-slot="edge-panel-description"
                  className="m-0 text-sm text-ink-secondary"
                >
                  {description}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* `.kw-drawer__body` — 24 inset, scrolling, taking the remaining
              height. THIS IS A REAL ELEMENT AND THE DRAWER'S IS NOT, which is
              a difference worth stating: `sheet.tsx` hands the body treatment
              to "every direct child this file did not put there itself",
              because its commission fixed eight exported symbols and 18 call
              sites compose the head and the foot themselves. This component
              draws its own head and foot from props, so it owns the whole
              frame and can draw the middle band too — which is strictly
              better, because a caller passing a bare string, a fragment or
              two sibling nodes gets a scrolling body either way instead of
              only when their children happen to be one element. */}
          <div
            data-slot="edge-panel-body"
            className="min-h-0 flex-1 overflow-y-auto p-[var(--space-6)]"
          >
            {children}
          </div>

          {/* `.kw-drawer__foot` — pinned with `mt-auto` so it never scrolls,
              16 above / 24 around, one hairline over it, gap 12, end-aligned
              with the primary LAST (ruling 1B, 2026-08-22 — see sheet.tsx's
              own note for why the kit's start-aligned row was overruled).
              `flex-col-reverse` below `sm` puts the primary on top of the
              stack while keeping it last in the DOM, so the reading order and
              the tab order still end on the commit control. */}
          {footer === undefined || footer === null ? null : (
            <div
              data-slot="edge-panel-footer"
              className="mt-auto flex shrink-0 flex-col-reverse gap-3 shadow-[var(--hairline-over)] px-[var(--space-6)] pt-[var(--space-4)] pb-[var(--space-6)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
            >
              {footer}
            </div>
          )}

          {drawClose ? (
            <button
              type="button"
              data-slot="edge-panel-close-button"
              aria-label={closeLabel}
              onClick={onClose}
              className={cn(OVERLAY_CLOSE)}
            >
              <X size={16} />
            </button>
          ) : null}
        </aside>
      </React.Fragment>,
      document.body,
    );
  },
);

EdgePanel.displayName = "EdgePanel";

export { EdgePanel, edgePanelVariants };
