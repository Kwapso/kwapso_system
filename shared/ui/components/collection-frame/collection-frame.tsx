/* ============================================================================
   CollectionFrame — the shell every list sits in: eyebrow, heading, count,
   figure strip, tabs, and ONE PANEL holding toolbar, rows and pager
   (1 direct call site).

   CLIENT RULING J2 · 2026-08-22 · override register #11 — HALF SPENT ON
   2026-09-02, AND THE OTHER HALF MOVED. Read both paragraphs before restoring
   anything.

   J2 said "a folder tab attaches to a panel", because ruling E had put the
   brand folder shape on every main screen and a folder tab is drawn to be
   pulled DOWN under a panel by `--folder-tab-overlap` and filled with the
   panel's own colour — without a panel it is a shape joined to nothing. THIS
   FRAME NO LONGER DRAWS A FOLDER TAB. The client retired the variant on
   2026-09-02 ("the only tabs that we will have are the line tabs because
   folders will only be used for the breadcrumbs"), so the strip here is a
   `line` strip, attached to nothing by design, and J2's attachment rule has
   nothing to govern in this file. It governs
   `components/breadcrumbs/breadcrumb-folders.tsx` instead, which is the one
   folder strip left and the only place the overlap is still drawn.

   WHAT SURVIVES J2 HERE IS THE ONE PANEL. CH27.1 states the region order and
   the container in one sentence, verbatim:

       "Figures, folder tabs, then the collection panel — toolbar, rows, pager
        inside it. A collection may drop the figure strip; it may not reorder
        what remains, and filters never sit above the tabs."

   The chapter's word for the strip is stale by one client ruling; its ORDER
   and its ONE CONTAINER are not. The toolbar, the body and whatever pager the
   body carries are still not three sibling bands: they are ONE panel,
   `--surface-panel` at `--radius`. What changed is the seam above it — the
   strip and the panel take the frame's ordinary band gap now, because a line
   strip has no feet to hide.

   OVERRIDE 15 WAS REVERSED ON 2026-08-23. READ THIS BEFORE CHANGING A FILL.

   Ruling K1 pinned this panel to `--card`, the off-beige paper. The client's
   own reference pages reverse it, in three independent places:

     · 26.04, verbatim: "The page itself is off-beige and every panel on it is
       soft paper: never the other way round."
     · the active folder tab's fill was `#F7F2EB`, and CH14's rule is that the
       active tab takes the panel's own fill — so the panel is soft paper.
       (The folder tab is retired; the reading it produced still stands, and
       the breadcrumb strip's live tab makes the same argument today.)
     · the client's own screenshots of both doors.

   A design-lead flip was made on their instruction to match the kit exactly.
   The nesting the whole system now alternates on is `SHELL.md`'s four levels:

       off-beige PAGE  →  soft-paper SCREEN CARD  →  off-beige BODY PANE
         →  soft-paper PANEL (this file)  →  off-beige CARDS

   Two things keep the panel readable, and both are load-bearing. (There were
   three; the first was the rebinding that made the folder tab's fill and this
   panel's fill one colour, and it went with the folder tab on 2026-09-02.)
     · The panel's ground is the BODY PANE, off-beige — the frame's own fill
       at `tone="page"`, which is now the default. In light the panel is
       #F7F2EB and the ground is #FFFEF9; without that ground the panel would
       be invisible and there would be nothing for an inactive tab to be
       clipped against. (Before the reversal these two were the other way
       round, which is what `ScreenShell`'s missing body pane was hiding.)
     · Nothing is separated by a stroke. There is no `border` here, and no
       hairline either: the panel is told apart from its ground by colour, as
       CH13's subtitle demands ("Colour separates, strokes don't").

   The panel keeps chapter 24.3's middle z-index, 2. The 1 and the 3 around it
   were the inactive and active folder tabs' and are gone from this file; the
   breadcrumb strip keeps all three.

   DESIGN SOURCE
   Kit "Assembled screens → List / collection page", read out of
   `Design Mothership/kit-current/Kwapso UI Kit.dc.html`. Its own paragraph is
   the whole brief, verbatim:

       "Every collection screen shares this anatomy: eyebrow + title, optional
        figure strip, tabs, then one shared toolbar (search, filters, view
        switch, actions) above a swappable body. Only the body changes between
        a list, a board, a calendar, and so on."

   and the dev note under it, also verbatim, is the law this file enforces:

       "Toolbar order never changes: search, then filters, then view switcher,
        then actions pinned right. … The 4th+ action collapses under a '···'
        icon button rather than adding more pills."

   OVERRIDE 28 (2026-08-23) — THE CONTRACT CAN GROW A SLOT, AND THIS IS THE
   PRECEDENT. SAY IT OUT LOUD, BECAUSE IT IS THE CONSEQUENCE OF THE RULING.

   CH27.26 draws a period stepper — `‹ 6 weeks ›` — INSIDE this toolbar,
   between the search field and the view switch. The contract above fixes the
   slots and adds "only the body below the toolbar changes", and GAPS-TRACK2A
   calls this "the one place the seven views touch the toolbar contract at
   all". The client ruled for CH27.26's placement, so the stepper is in the
   toolbar and THE CONTRACT GREW A FIFTH SLOT to hold it. What that settles,
   and what a future reader must not un-settle by "correcting" this file back:

       The toolbar's ORDER is still absolute and still the component's, not
       the call site's. What is no longer closed is the LIST. A slot may be
       ADDED when a chapter draws a control in this toolbar that none of the
       existing slots describes — and it is added HERE, as its own named prop
       in a fixed position, never by letting a call site smuggle a control
       into `filters` and hope. Before this ruling, the artifact's own
       placement was only reachable by exactly that smuggling.

       A slot is still a PLACEMENT AND NOT A DRAWING. `period` renders the
       node it is handed and styles nothing, the way `band` does. The stepper
       itself is drawn by `gantt.tsx`, which is where CH27.26 is transcribed.

   The order is now: search → filters → PERIOD → view switch → actions.

   THE PRECEDENT WAS USED A SECOND TIME ON 2026-09-02, and this is the note
   that says so rather than leaving a reader to wonder whether `toolbarPanel`
   was smuggled in. The slot that grew is not inside the toolbar row — it is
   BETWEEN the toolbar and the rows. CH27.1's sentence fixes the REGIONS
   ("toolbar, rows, pager inside it"), and the client's ruling of the same day
   ("the expanded toolbar shoudl not be an overlay, but literaly expand the
   space") requires a place in flow for what a toolbar control opens. There
   was none, so hosts were portalling into the panel's body. One named slot,
   in one fixed position, drawn only when passed — the same three conditions
   override 28 set. The region order inside the panel is now:

       band → toolbar → TOOLBAR PANEL → rows → pager

   and, as before, the ORDER is the component's and the DRAWING is not.

   The same toolbar is drawn again in kit chapter 19 ("Collection views · 24
   view types · one toolbar contract"), where the hairline rule between the
   toolbar groups is a 1-wide, 22-tall bar at 14% ink — drawn as
   `Separator orientation="vertical"`, which is the same rule at `--border`,
   and drawn by `ToolbarRow` since the row moved there.

   The two registers are the kit's own:
     · `kwapso-ui.css` → `.kw-empty` — the in-place register: centred column,
       gap 8, inset 48/24, tertiary ink, body-s, centred text.
     · `kwapso-patterns.css` → `.kw-register` — the block register: panel
       fill, box radius, inset 32, eyebrow / title / body / action row.
   Chapter 21's subtitle is the rule they both obey: "Say what happened, then
   the one next step."

   THE LAW THIS FILE OBEYS
   · The frame's ground is `--background`, not `--surface-panel` — the K1
     reversal, and the opposite of what this line said until 2026-08-23. The
     frame does not hold cards directly: it holds ONE PANEL, and that panel is
     soft paper, so the ground under it has to be the other tone or the panel
     is invisible. PATTERN §11's rule — a card's ground is the panel tone — is
     unchanged and now applies one level further in, INSIDE the panel, which
     is where the cards actually are.
   · A band states which paper tone it is, and the secondary-button and pill
     fills re-resolve inside it — kwapso-ui.css's `.kw-on-panel` /
     `.kw-on-page`, the provisional GAP-10 mechanism. Carried here as two
     custom properties set on the root, so a `Button variant="secondary"`
     inside the frame is never the same tone as the frame. THE PANEL SETS THEM
     AGAIN, because a control in the toolbar stands on the panel and not on
     the frame: ruling 01 is relational — "a filled paper button in the other
     tone, so a band and its buttons are never the same tone" — and CH27.1
     draws that same opposition on this very toolbar ("both keeping their
     round off-beige well, which is what makes them read as buttons on a
     soft-paper toolbar").
   · The toolbar order is fixed by the component, not by the call site. That
     is the entire reason the search, filter and view-switch slots are three
     separate props instead of one `toolbar` node. Since 2026-09-08 the
     component that fixes it is `ToolbarRow`, which this frame renders and
     which is reachable on its own — the slots and their order are unchanged
     and are now stated in one file rather than welded into this one. Read
     `components/toolbar-row/toolbar-row.tsx` for the whole argument,
     including why it does not have a sixth `sort` slot and does not hide
     itself over an empty collection.
   · An unqualified `<Badge>` is quiet. The record count is a quiet chip;
     mango is opt-in and one per view.
   · Blocks are separated by colour, not by strokes. The one hairline here is
     `Title`'s own section rule, which is same-tone separation.
   · Focus is one global rule (tokens.css §8). Nothing here draws a ring.
   · Every user-facing string is a prop with a default, including the two the
     screen reader hears and the eye never does.

   RENDERING CONTEXT
   No `"use client"`. This module holds no state, calls no hook and creates no
   handler during its own render — it forwards nodes and props. `Tabs` is
   itself a client component and carries its own directive, as does the
   `DropdownMenu` inside `ToolbarRow`; a server component may render them
   unchanged.
   ========================================================================= */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";
import { Badge } from "../badge/badge";
import { Spinner } from "../spinner/spinner";
import { Tabs, TabsCount, TabsList, TabsTrigger, TABS_STRIP_GAP } from "../tabs/tabs";
import { Title, type TitleStep } from "../title/title";
/* `Button`, `DropdownMenu`, `Separator` and `DotsThree` left this file with
   the toolbar on 2026-09-08 — the overflow menu and the group rules are drawn
   by `ToolbarRow` now, and nothing else here reached for any of them. */
import { ToolbarRow } from "../toolbar-row/toolbar-row";

/* ============================================================================
   CollectionRegister — the empty / error / busy notice a collection shows
   instead of its body.

   Exported because all nine collections in this batch need the identical
   picture and nine private copies of it is nine chances to drift. It is an
   ADDITION to the commission's export list, not a rename or a drop of one;
   logged as GAPS-COL1 CF-1.
   ========================================================================= */

const registerVariants = cva(["flex min-w-0 flex-col"], {
  variants: {
    /**
     * `inline` — `.kw-empty`: the register drawn IN PLACE of a body, inside a
     * frame that already carries the panel tone. Centred, tertiary, no fill
     * of its own, because a panel-toned card on a panel-toned band is
     * invisible in light (PATTERN §11).
     *
     * `block` — `.kw-register`: the standalone block, panel fill at the box
     * radius, inset 32, left-aligned. For a register that is the whole
     * region rather than a hole inside one.
     *
     * `plain` - NO CARD AT ALL, added 22 Sep 2026. See the variant's own
     * comment below for the ruling; the short version is that the empty
     * register stopped being a region and went back to being a hole.
     */
    variant: {
      /* Left-aligned, not centred. 27.21: "Type and one button carry it,
         left-aligned like everything else." The artifact writes `text-align`
         it 110 times, but never on one of CH21's four registers, and
         27.21 says left in words -- the centring was ours, copied into
         eleven registers, and two screens had already worked around it
         locally before it was traced here. GAPS-TRACK3C DEF-2. */
      /* NO `gap` on the column. The three lines carry their own block-start
         measures (12 over the title, 8 over the body, 20 over the action
         row) exactly as chapter 21 draws them; a container gap on top of
         those margins was adding a second 8 to every one of them. */
      inline: "items-start px-6 py-[var(--space-8)] text-start",
      block: "items-start rounded-[var(--radius)] bg-surface-panel p-[var(--space-7)]",
      /**
       * NO CARD AT ALL - 22 SEP 2026. No fill, no radius, no inset of its
       * own: the register stands directly on whatever ground the panel
       * already painted, or did not. Aurora, verbatim, on the Accounts /
       * Inactive screenshot ("Nothing matched. Try fewer words, or clear
       * the filters." on a soft paper card): "The empty collection now. We
       * need to get rid of the card background." The app's own
       * `CollectionEmptyState` stopped papering itself the same day; this
       * is the kit's `CollectionFrame` composition catching up.
       *
       * Reserved for the EMPTY register - and the identical register a
       * filter reduces a collection to, since this frame carries one
       * `empty` boolean and no second "filtered" flag - on a
       * `panel="plain"` frame. See `CollectionFrame`'s own
       * `emptyRegisterVariant`. LOADING and FAILED are NOT this ruling and
       * stay on `block`: a spinner or a failure with nothing under it reads
       * as a page that broke, which is exactly the read the 21 Sep entry
       * warned about - that warning still holds for those two, and only
       * for those two.
       */
      plain: "items-start text-start",
    },
  },
  defaultVariants: { variant: "inline" },
});

/** The 7 status dot — `--dot-status`, the kit's one dot size.
    ONLY THE ERROR REGISTER CARRIES ONE. Chapter 21 draws four registers —
    "First run", "No results", "Load failed", "Permission" — and exactly one
    of them, the failure, puts a 7px poppy dot in front of its eyebrow. The
    other three are the bare micro line. A quiet dot in `--ink-disabled` was
    ours; CH01 also reserves that ink for "disabled only". An empty string
    renders no dot at all, the way `busy` already does. */
const DOT_TONE = {
  /** No dot. The wording carries the meaning; ruling 26, and CH21's drawing. */
  quiet: "",
  /** Poppy. Ruling 26 again: the dot names it, the label says it in words. */
  error: "bg-destructive",
  /** A wait is a spinner, not a dot; this value renders no dot at all. */
  busy: "",
} as const;

export type CollectionRegisterTone = keyof typeof DOT_TONE;

export interface CollectionRegisterProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "title">,
    VariantProps<typeof registerVariants> {
  /**
   * The micro uppercase line above the title — `.kw-register__eyebrow`. A
   * node, so a `Badge` can ride along. Undefined draws nothing, which is why
   * this component hardcodes no eyebrow of its own.
   */
  eyebrow?: React.ReactNode;
  /** The one sentence that says what happened. `.kw-register__title`. */
  title?: React.ReactNode;
  /** The paragraph under it, capped at the kit's 40ch. `.kw-register__body`. */
  body?: React.ReactNode;
  /** The one next step. Usually a single `Button`. `.kw-register__row`. */
  actions?: React.ReactNode;
  /** Which dot the eyebrow carries, or `busy` for a spinner instead. */
  tone?: CollectionRegisterTone;
  /**
   * What a screen reader says while `tone="busy"`. Defaulted so no call site
   * can ship a silent wait, and a prop because the applications run in more
   * than one language.
   */
  busyLabel?: string;
}

/**
 * The notice a collection shows in place of its body.
 *
 * TEN STATES
 *  1. default        — eyebrow, title, body, actions; any of the four may be
 *                      absent and none is invented.
 *  2. hover          — does not apply. The register is prose; the `Button`
 *                      inside `actions` carries the hover.
 *  3. focus-visible  — NOT here. tokens.css §8 rings every control at once.
 *  4. active/pressed — does not apply, for the same reason as hover.
 *  5. disabled       — does not apply. A notice cannot be unavailable.
 *  6. loading        — `tone="busy"`: the dot is replaced by a `Spinner`.
 *                      This IS the loading register.
 *  7. empty          — every slot undefined renders `null`. The system's rule
 *                      throughout is to render nothing rather than fill a
 *                      hole with a dash.
 *  8. error          — `tone="error"`: poppy dot, and the wording says it.
 *                      The dot never carries the meaning alone (ruling 26).
 *  9. selected       — does not apply.
 * 10. read-only      — always. A register holds no value.
 *
 * THREE BREAKPOINTS
 *  mobile / tablet / desktop — UNCHANGED. Both drawings are a single column
 *  at every width and the copy is already capped at 40ch, which is narrower
 *  than a 320 viewport can show; there is nothing left to restack. The action
 *  row wraps rather than stacking, exactly as `CardFooter` does.
 *
 * RTL — safe. Every inset is logical and nothing is positioned by side.
 */
const CollectionRegister = React.forwardRef<HTMLDivElement, CollectionRegisterProps>(
  (
    {
      className,
      variant = "inline",
      eyebrow,
      title,
      body,
      actions,
      tone = "quiet",
      busyLabel = "Loading…",
      children,
      ...props
    },
    ref,
  ) => {
    const hasEyebrow = eyebrow !== undefined && eyebrow !== null;
    const showMark = hasEyebrow || tone === "busy";

    // Prefer nothing (PATTERN §4). An empty register is a hole with an inset.
    if (
      !hasEyebrow &&
      title === undefined &&
      body === undefined &&
      !actions &&
      !children &&
      tone !== "busy"
    ) {
      return null;
    }

    return (
      <div
        ref={ref}
        data-slot="collection-register"
        data-tone={tone}
        className={cn(registerVariants({ variant }), className)}
        {...props}
      >
        {showMark ? (
          <span
            data-slot="collection-register-eyebrow"
            className={cn(
              /* The dot-to-word measure is the drawn 10. */
              "inline-flex items-center gap-[var(--space-2h)]",
              "text-micro font-[var(--font-weight-medium)] uppercase text-ink-tertiary",
            )}
          >
            {tone === "busy" ? (
              <Spinner size="sm" label={busyLabel} />
            ) : DOT_TONE[tone] ? (
              <span
                aria-hidden="true"
                className={cn(
                  "size-[var(--dot-status)] shrink-0 rounded-pill",
                  DOT_TONE[tone],
                )}
              />
            ) : null}
            {eyebrow}
          </span>
        ) : null}

        {title !== undefined && title !== null ? (
          <div
            data-slot="collection-register-title"
            className={cn(
              // `.kw-register__title` — the h3 step, medium.
              "text-2xl font-[var(--font-weight-medium)]",
              variant === "block" ? "mt-3" : "mt-2",
            )}
          >
            {title}
          </div>
        ) : null}

        {body !== undefined && body !== null ? (
          <p
            data-slot="collection-register-body"
            className="mt-2 max-w-[40ch] text-caption leading-[var(--leading-normal)] text-ink-secondary"
          >
            {body}
          </p>
        ) : null}

        {children}

        {actions ? (
          <div
            data-slot="collection-register-actions"
            /* `gap: 10px`, which chapter 21 draws on every register that
               has more than one control. */
            className="mt-5 flex flex-wrap items-center gap-[var(--space-2h)]"
          >
            {actions}
          </div>
        ) : null}
      </div>
    );
  },
);

CollectionRegister.displayName = "CollectionRegister";

/* ============================================================================
   CollectionFrame
   ========================================================================= */

const collectionFrameVariants = cva(
  [
    // The frame is a column: header, figures, then the tab strip and the one
    // panel that holds the toolbar, the rows and the pager (ruling J2).
    "flex min-w-0 flex-col",
    // The box radius. There is no fifth radius.
    "rounded-[var(--radius)]",
  ],
  {
    variants: {
      /**
       * WHICH PAPER TONE THE FRAME'S GROUND IS — not the panel's. Since
       * ruling J2 the frame is a ground with a `--card` panel on it, so this
       * prop no longer decides what the toolbar and the rows sit on; it
       * decides what the PANEL sits on, and therefore whether the panel and
       * the tabs attached to it can be seen at all.
       *
       * It still re-resolves the secondary-button and pill fills for anything
       * OUTSIDE the panel (the heading band, the figure strip) —
       * kwapso-ui.css's `.kw-on-panel` / `.kw-on-page`, carried as custom
       * properties on the root instead of as a global class, because this
       * repository ships components rather than a stylesheet. GAP-10's
       * provisional mechanism, unchanged; logged as GAPS-COL1 CF-2.
       */
      tone: {
        /**
         * THE DEFAULT SINCE THE K1 REVERSAL. Off-beige — the body pane's own
         * tone, and the ground CH27.1 draws the soft-paper collection panel
         * against. 26.04: "The page itself is off-beige
         * and every panel on it is soft paper: never the other way round."
         *
         * Measured against the panel at #F7F2EB: 1.103 light, 1.111 dark.
         */
        page: [
          "bg-background",
          "[--btn-secondary-fill:var(--surface-panel)]",
          /* RENAMED FROM `--pill-fill`, 19 Sep 2026 — CHANGELOG v1.2.132.
             Same value. */
          "[--badge-quiet-fill:var(--surface-panel)]",
        ],
        /**
         * Soft paper. WAS the default, under ruling K1, and it is now the
         * broken combination rather than the settled one: a soft-paper panel
         * on a soft-paper ground measures 1.000 in both palettes and the panel
         * has nothing to be seen against.
         *
         * Kept as a value, because removing it would change a public prop's
         * accepted set. Do not reach for it: a frame that needs a soft-paper
         * ground is a frame drawn on a screen card, and what it wants is the
         * body pane between them — `ScreenShell`.
         */
        panel: [
          "bg-surface-panel",
          "[--btn-secondary-fill:var(--surface-page)]",
          /* RENAMED FROM `--pill-fill`, 19 Sep 2026 — CHANGELOG v1.2.132.
             Same value. */
          "[--badge-quiet-fill:var(--surface-page)]",
        ],
        /**
         * No fill at all, for a frame nested inside a band that already has
         * one — which since the K1 reversal is the ordinary case: `MainScreen`
         * drops this frame straight into `ScreenShell`'s off-beige body pane,
         * and a second off-beige fill on top of it would be a level of the
         * nesting that is not there.
         *
         * The ground is then the parent's, and the parent is responsible for
         * it being off-beige. That is the one thing `bare` has always meant.
         * GAPS-J2 J2-3.
         */
        bare: "bg-transparent",
      },
      /**
       * How much air the frame spends on itself. The kit draws the collection
       * page at the 24/32 card inset (chapter 5's stated range) and the same
       * anatomy inside a panel at 20.
       */
      density: {
        default: "gap-5 p-6 lg:p-[var(--space-7)]",
        compact: "gap-4 p-5",
      },
      /**
       * Whether the frame spends an inset of its own. `false` is for a frame
       * dropped into a container that has already paid for the air —
       * `ScreenShell`'s body pane — where the frame's own 24/32 would be a
       * second inset the kit never draws. The PANEL's inset is untouched:
       * that one is the card's and it is always spent.
       */
      inset: {
        true: "",
        false: "p-0 lg:p-0",
      },
    },
    defaultVariants: { tone: "page", density: "default", inset: true },
  },
);

/* ----------------------------------------------------------------------------
   THE COLLECTION PANEL — ruling J2.

   CH27.1: "toolbar, rows, pager inside it". One surface, not three bands.

   · `bg-surface-panel` — soft paper, the K1 reversal. CH27.1 and CH14 both
     argue it from the active folder tab's own fill, which this frame no longer
     draws; the fill they argued FOR is unchanged, and the breadcrumb strip's
     live tab now makes the same argument against the screen card.
   · `rounded-[var(--radius)]` — ruling 03: 24, the one box radius.
   · `relative z-[2]` — chapter 24.3's middle number. It used to sit between an
     inactive folder tab (1) and an active one (3); with the folder tab retired
     there is nothing above or below it here, and it is kept because the panel
     is still the frame's own painted layer and a caller may drop positioned
     content on either side of it.
   · The secondary and pill fills re-resolve AGAIN here, because a control in
     the toolbar stands on `--card` and not on the frame's ground. Ruling 01
     is relational, and CH27.1 draws the opposition on this exact toolbar.
   · No `border`, no hairline, no shadow. Colour is the separation (CH13), and
     neither CH27.1 nor CH14 draws a rule or a lift on this panel — CH14's own
     folder PANEL (`FolderPanel`, which is not retired) is a plain fill at 24.
     GAPS-J2 J2-4.
   · No `overflow: hidden`. A clipped panel would shave the global focus ring
     off the first control in the toolbar and off the first and last row.
   -------------------------------------------------------------------------- */
/* ── THE PANEL GOES PLAIN BY DEFAULT, 21 SEP 2026 - THE MINIMAL PASS.
   CLIENT, VERBATIM: "go an implement this appwide", after "the goal: make a
   more minimal clean app".

   THE PANEL WAS NEVER JUST A FILL, WHICH IS THE WHOLE DIFFICULTY. It
   supplied THREE things at once and the 21 Sep page measured all three
   going at once when a caller simply stopped painting it: the soft paper,
   the 24/32 inset, and the two rebinds that tell a control inside it which
   tone to take. A `surface="plain"` that only dropped the fill would drop
   the other two by accident.

   SO THE PLAIN PANEL KEEPS THE INSET AND INVERTS THE REBINDS RATHER THAN
   DROPPING THEM. On soft paper a control takes off-beige; on the page a
   control takes soft paper. That is ruling 01 read in the other direction,
   not a new rule - and it is the same inversion `ToolbarRow`'s `page` and
   `panel` grounds already carry one file over. Measured before the fix, on
   the live tickets list: `--badge-quiet-fill` inside a plain collection
   resolved #FFFEF9 against a pane of rgb(255, 254, 249), 1.000, and every
   quiet chip on the module was invisible.

   `data-ground="page"` BESIDE THE INVERSION, for the same reason the lane
   in `kanban.tsx` carries `data-ground="panel"`: tokens.css §8 keys
   `--btn-secondary-fill`, `--surface-lift` and (since 21 Sep)
   `--surface-selected` off a class name or that attribute, and a panel that
   paints nothing has no class for §8 to see. The attribute is how a
   transparent region still declares what it is standing on, so a face, a
   lift and a selected row all get the page's answer instead of the last
   answer some ancestor happened to leave behind.

   NO RADIUS AND NO INSET-OWNED EDGE, DELIBERATELY. A radius on a
   transparent box is a promise nothing keeps. What used to say where the
   collection began and ended is now the rows' own hairlines above and
   below, which `Table` already draws and which survive the switch
   untouched. */
const collectionPanelVariants = cva(
  ["relative z-[2] flex min-w-0 flex-col"],
  {
    variants: {
      /** See `CollectionFrameProps.panel`. */
      surface: {
        /**
         * The soft paper panel, ruling J2's own drawing, unchanged to the
         * byte and reachable by prop.
         */
        paper: [
          "rounded-[var(--radius)] bg-surface-panel text-foreground",
          /* A control in the toolbar stands on soft paper, so its fill is the
             other tone - off-beige. CH27.1 draws exactly that opposition on
             this toolbar: "both keeping their round off-beige well, which is
             what makes them read as buttons on a soft-paper toolbar". Before
             the K1 reversal these two lines said the opposite, and the
             toolbar's buttons were soft paper on off-beige, which is the
             sentence backwards. */
          "[--btn-secondary-fill:var(--surface-page)]",
          /* RENAMED FROM `--pill-fill`, 19 Sep 2026 - CHANGELOG v1.2.132.
             Same value. */
          "[--badge-quiet-fill:var(--surface-page)]",
        ],
        /**
         * No paper. The rows and the toolbar stand on the pane itself, and
         * the two rebinds run the other way: a control on the page takes
         * soft paper. See this block's own note above.
         */
        plain: [
          "bg-transparent text-foreground",
          "[--btn-secondary-fill:var(--surface-panel)]",
          "[--badge-quiet-fill:var(--surface-panel)]",
        ],
      },
      /** The card inset, matching the frame's own density step for step. */
      density: {
        default: "gap-5 p-6 lg:p-[var(--space-7)]",
        compact: "gap-4 p-5",
      },
    },
    /* ── WHAT A PLAIN PANEL STOPS PAYING, AND THE ONE NUMBER IT KEEPS.

       THE SIDES GO. The 21 Sep page's candidate-one caption states the
       target as a number: "Pane edge to the h1 and to the table's first
       cell 24." ONE 24, and it is the pane's. A plain panel that also spent
       24 (32 above `lg:`) would put the first cell 48 or 56 in from the
       pane's edge and break the one alignment the whole air argument is
       about, the h1 and the table's first column reading one left edge.

       THE TOP GOES, AND THE COLUMN GAP DROPS TO 10. CLIENT, 21 SEP 2026,
       AFTER that page and measured on the live product: "on tickets, reduce
       space above and under toolbar to 10px". That ruling supersedes the
       page's own "keeps the inset" on the block-START, and it has to,
       because the two cannot both be true: a 24 or 32 top inset here, plus
       the tab strip's own gap above it, put the toolbar between 34 and 40
       under the tabs. With this top inset gone the STRIP owns the whole
       distance above the toolbar (`TABS_STRIP_GAP_PLAIN`, 10) and this
       column's own gap owns the whole distance below it (`--space-2h`, 10),
       so her two numbers are one step each with one owner each.

       THE BOTTOM STAYS, and it is the reasoning `CardContent`'s own `plain`
       override already spends: with nothing beneath it, that one is this
       region's trailing space before whatever follows the pager, and
       nothing else pays it.

       `density="compact"`'s `gap-4` moves with the default's `gap-5`, for
       the same ruling. A compact collection is denser, not differently
       ruled, and two answers to "how far under the toolbar" is exactly the
       drift her own number was given to end. */
    compoundVariants: [
      { surface: "plain", density: "default", class: "px-0 lg:px-0 pt-0 lg:pt-0 gap-[var(--space-2h)]" },
      { surface: "plain", density: "compact", class: "px-0 pt-0 gap-[var(--space-2h)]" },
    ],
    defaultVariants: { surface: "plain", density: "default" },
  },
);

export interface CollectionFrameTab {
  /** The value the strip switches on. Unique within the frame. */
  value: string;
  /** What the tab says. A node, so a count or an icon can ride along. */
  label: React.ReactNode;
  /**
   * A count after the label, drawn by `TabsCount` — R-4a's asymmetric line
   * count: quiet tertiary text at rest, the same round `Badge`-counter fill
   * this frame's own heading count wears on the ACTIVE tab (mango,
   * primary-ink text; `size-*` circle clause reversed 2026-09-03 — see
   * `tabs.tsx`). CH14's alternative quiet number was the FOLDER tab's, and it
   * left with the folder variant on 2026-09-02. Zero renders nothing.
   */
  count?: number;
  /** Dead tab: an ink and a cursor, never an opacity. */
  disabled?: boolean;
}

export interface CollectionFrameProps
  extends Omit<React.ComponentPropsWithoutRef<"section">, "onChange">,
    VariantProps<typeof collectionFrameVariants> {
  /** The micro uppercase line over the heading. The kit's own example is a count and a state. */
  eyebrow?: React.ReactNode;
  /** The heading. A node, not a string, so it hardcodes nothing. */
  heading?: React.ReactNode;
  /** The heading step. `Title`'s ladder — the WHOLE of it since 2026-09-08
   *  (56 / 44 / 32 / 24 / 20), named as `TitleStep` rather than retyped here
   *  as the three rungs the ladder used to end at. The default is `Title`'s
   *  own, which is the scale's "Section title" and is right for a collection
   *  heading inside a screen; a frame that IS the screen names a rung. */
  headingSize?: TitleStep;
  /** The heading element, so a page keeps a real outline. */
  headingAs?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div";
  /**
   * How many records the collection holds. Rendered as a quiet `Badge` beside
   * the heading. Zero, negative or `undefined` renders nothing — the kit never
   * shows a "0" chip.
   */
  count?: number;
  /** Screen-reader wording for the count chip, so "8" is not read bare. */
  countLabel?: string;
  /** Replace the count formatter entirely, for a locale the two suffixes cannot express. */
  formatCount?: (value: number) => string;
  /** The heavy hairline under the heading row. On, as chapter 13 draws it. */
  rule?: boolean;

  /**
   * WHETHER THE ONE PANEL IS A BOX - 21 SEP 2026, THE MINIMAL PASS.
   * `"plain"` (THE DEFAULT, the client's "go an implement this appwide")
   * paints nothing: the toolbar and the rows stand on the pane, the two
   * paper rebinds invert, and the panel keeps only its own vertical air.
   * `"paper"` is ruling J2's soft paper panel, unchanged and reachable for a
   * frame that genuinely stands on off-beige with nothing else between it
   * and the page. See `collectionPanelVariants` for the whole argument.
   *
   * IT ALSO DECIDES TWO THINGS THAT USED TO BE HARD CODED, because both
   * were answers to "what has already been painted here":
   *  · `toolbarGround`'s own default - see that prop.
   *  · which register an empty, loading or failed collection draws - and,
   *    AS OF 22 SEP 2026, the three no longer draw alike. Aurora, verbatim,
   *    on the Accounts / Inactive screenshot: "The empty collection now. We
   *    need to get rid of the card background." A plain frame's EMPTY
   *    register (and the identical register a filter reduces a collection
   *    to - this frame has one `empty` boolean and no second "filtered"
   *    flag) now takes `CollectionRegister variant="plain"`: no fill, no
   *    radius, no inset of its own, sitting at the panel's own rhythm.
   *    LOADING and FAILED are NOT this ruling and are UNCHANGED: both still
   *    take `variant="block"`, the register that keeps its paper, because a
   *    spinner or a failure with nothing under it still reads as a page
   *    that broke rather than as a place that is empty - the 21 Sep
   *    reasoning, narrowed now to the two states it actually governs. See
   *    `CollectionFrame`'s own `emptyRegisterVariant` for the split.
   */
  panel?: "plain" | "paper";
  /**
   * WHAT THE TOOLBAR ROW STANDS ON. `"bare"` is the default on both panel
   * surfaces, and on a PLAIN one that is a client ruling rather than an
   * inheritance.
   *
   * THE 21 SEP PAGE RECOMMENDED THE OPPOSITE AND SHE OVERRULED IT THE SAME
   * DAY, ON THE LIVE PRODUCT. The page's argument was good and is worth
   * keeping: measured on the tickets list, the toolbar track painted
   * rgba(0, 0, 0, 0) with no row wrapper at all, so search, Filter, the
   * order control, the view switch and the plus floated as five separate
   * pills on white with nothing holding them, and it called that the one
   * place where going plain made the page BUSIER rather than quieter. Her
   * answer, verbatim and after seeing it: "on tickets, reduce space above
   * and under toolbar to 10px". Not a pill: less air. What was reading as
   * loose was the 6px inset inside a painted pill pushing 44px controls to
   * 16 and 17px from the tabs and the table, and a 56px table header row
   * centring its 11px text under them.
   *
   * SO THE PAINT STAYS OFF AND THE AIR COMES IN, which is what the plain
   * panel's own compound variants and `TABS_STRIP_GAP_PLAIN` now spend. A
   * group of five controls 10px under the tabs and 10px above the rows IS
   * a row; it did not need a fill to become one.
   *
   * Pass a value to override: `"page"` for the soft paper pill on an
   * off-beige ground, `"panel"` for a row standing on soft paper. Both
   * remain exactly what `ToolbarRow` has always drawn.
   */
  toolbarGround?: "bare" | "page" | "panel";

  /** The optional figure strip between the heading and the tabs. Usually a `StatGrid`. */
  figures?: React.ReactNode;

  /** The tab strip. An empty array renders no strip at all. */
  tabs?: CollectionFrameTab[];
  /** Controlled tab value. */
  value?: string;
  /** Uncontrolled starting tab. Defaults to the first item. */
  defaultValue?: string;
  /** Fires when the reader picks a tab. */
  onValueChange?: (value: string) => void;
  /* `tabsVariant` IS GONE — CLIENT RULING, 2026-09-02. "the only tabs that we
     will have are the line tabs because folders will only be used for the
     breadcrumbs." It defaulted to `folder` under ruling E of 2026-08-22
     ("folder tabs are for main screens, line tabs for detail screens"), which
     that ruling replaces: there is one tab shape now, so a frame has nothing
     to choose and a prop offering the choice would be a lever with nothing on
     the other end. `Tabs` draws the strip; this frame states no variant. */
  /** Accessible name for the strip. Undefined leaves it named by the heading. */
  tabsLabel?: string;

  /**
   * ONE LINE OF STANDING, INSIDE THE PANEL AND ABOVE THE TOOLBAR — CH27.5.
   *
   * The archive tab is the only composition in the kit that draws one:
   * "one extra band saying where you are". The artifact renders it as the
   * FIRST CHILD OF THE PANEL, before the toolbar row — not as a band between
   * the tab strip and the panel. That placement was impossible under ruling
   * J2, when the folder tab's foot rode on the panel's top edge and anything
   * in the gap broke the join; it is merely wrong now, because CH27.5 draws
   * the band inside the panel and the artifact is the reference.
   *
   * A placement slot, not a drawing: the frame decides only WHERE it sits.
   * The words, their steps and their inks belong to the composition, which
   * is why nothing here styles the node.
   *
   * CH27.1's bulk bar is NOT this. That one is the toolbar's own
   * replacement — the artifact wraps the two in `sc-if cpAnySel` /
   * `sc-if cpNoneSel`, so they are alternatives at one position, never two
   * rows at once. `BulkEditScreen`'s own note says the same: "row and no
   * second band appears."
   */
  band?: React.ReactNode;

  /** Toolbar slot 1. Usually a `SearchInput`. */
  search?: React.ReactNode;
  /** Toolbar slot 2. Usually a `FilterBar`. */
  filters?: React.ReactNode;
  /**
   * TOOLBAR SLOT 3 — THE PERIOD STEPPER. CH27.26's `‹ 6 weeks ›`, between the
   * search field and the view switch, exactly where the chapter draws it.
   *
   * This is the slot the contract grew (override 28, 2026-08-23) and the
   * precedent that the contract CAN grow: the order stays the component's,
   * the list is no longer closed. A placement, not a drawing — pass
   * `GanttPeriodStepper`, or a control of your own; nothing here styles it.
   */
  period?: React.ReactNode;
  /**
   * TOOLBAR SLOT 4 — THE VIEW SWITCH. `ViewSwitch`, in this same folder.
   *
   * It was a named hole for as long as this file has existed: the slot was
   * here, CH19's contract was quoted above, and no control was ever drawn to
   * stand in it. Client feedback round 1 item 4 said so — "you missed a full
   * section of the toolbar which is the view selector" — and `view-switch.tsx`
   * is the answer, drawn off CH19's own specimen toolbar and CH27.24's board.
   *
   * Still a placement and not a drawing: the frame decides only WHERE this
   * stands. `SortControl` shares the slot by CH27.13's "the view switcher and
   * the sub-tab picker are controls" — see `collection-screen.tsx`.
   */
  viewSwitch?: React.ReactNode;
  /**
   * Toolbar slot 5, pinned to the inline end. Children past `maxActions`
   * collapse into an overflow menu rather than adding more pills, which is
   * the kit's own dev note.
   */
  actions?: React.ReactNode;
  /** How many actions stay visible before the rest collapse. The kit's figure is 3. */
  maxActions?: number;
  /** Accessible name for the overflow trigger. */
  moreActionsLabel?: string;

  /**
   * WHAT A TOOLBAR CONTROL OPENS — BETWEEN THE TOOLBAR AND THE ROWS, IN FLOW.
   * Added 2026-09-02 on override 28's precedent, which is the second time
   * that precedent has been used and the reason it was written down.
   *
   * CLIENT, 2026-09-02, VERBATIM: "the expanded toolbar shoudl not be an
   * overlay, but literaly expand the space". A filter panel opened off the
   * toolbar's own pill has to PUSH THE ROWS DOWN — not float over them, and
   * not grow the pill it came out of. This frame owns every line of markup
   * between its toolbar and its body, so until this slot existed there was
   * nowhere in flow for such a panel to land: the consuming app wrapped the
   * whole frame in a context provider, published a DOM node as the first
   * child of the body, and `createPortal`'d the panel into it — roughly 90
   * lines of app code, all of it to reach a position this component could
   * simply offer. It offers it.
   *
   * A PLACEMENT, NOT A DRAWING, exactly as `band` and `period` are: the frame
   * decides only WHERE the node sits and gives it the panel's own column gap.
   * Nothing here styles it, sizes it, or animates it — the control that owns
   * the panel owns its skin, and a panel that wants to be an overlay should
   * not be passed here at all.
   *
   * NOT `band`, and the two are not interchangeable. `band` is CH27.5's one
   * line of standing — where you are — and it sits ABOVE the toolbar,
   * permanently. This is what a toolbar control opened, below the toolbar,
   * transiently. A composition may have both.
   *
   * Drawn only when a node is passed, so no existing call site changes.
   */
  toolbarPanel?: React.ReactNode;

  /** The body has not arrived. Shows the busy register in place of `children`. */
  loading?: boolean;
  /** The body arrived and is empty. Shows the empty register in place of `children`. */
  empty?: boolean;
  /** The body failed. Shows the error register in place of `children`. */
  error?: boolean;
  /** Override the busy register. */
  loadingState?: React.ReactNode;
  /** Override the empty register. */
  emptyState?: React.ReactNode;
  /** Override the error register. */
  errorState?: React.ReactNode;
  /** Default wording for the three registers. Every one is overridable. */
  loadingLabel?: string;
  emptyLabel?: string;
  emptyBody?: string;
  errorLabel?: string;
  errorBody?: string;
}

/**
 * The shell every collection sits in.
 *
 * TEN STATES
 *  1. default        — heading band, optional figures, optional tabs, then
 *                      ONE panel holding the optional standing band, the
 *                      toolbar, whatever a toolbar control has opened, the
 *                      rows and the pager (CH27.1, ruling J2, and the second
 *                      use of override 28's precedent). The active tab is
 *                      attached to that panel's top edge; nothing else is a
 *                      band.
 *  2. hover          — does not apply to the frame. It is a band; the rows,
 *                      cards and controls inside it carry their own, and a
 *                      whole reacting panel would be noise.
 *  3. focus-visible  — NOT here. tokens.css §8 rings every control at once,
 *                      at the control's own radius. NEITHER the frame NOR the
 *                      panel sets `overflow: hidden`, so a ring on the first
 *                      tab, on the search field or on the first row is never
 *                      shaved off at a corner.
 *  4. active/pressed — does not apply. The press belongs to the tab or the
 *                      button, both of which already nudge.
 *  5. disabled       — does not apply to the frame; per tab via
 *                      `tabs[].disabled`, as a fill and an ink. A whole
 *                      collection that is unavailable is a screen the
 *                      composition should not have rendered.
 *  6. loading        — `loading`: the CHROME STAYS and only the body is
 *                      replaced, by the busy register. Swapping the heading
 *                      and the tabs for placeholders moves the controls the
 *                      reader is already aiming at, and the counts they read
 *                      a moment ago.
 *  7. empty          — `empty`: the `.kw-empty` register, centred and quiet.
 *                      Note the kit's own warning next to that class —
 *                      hide-when-empty is a real pattern elsewhere and must
 *                      not be "fixed" into this; a frame that should vanish
 *                      is not mounted by the composition in the first place.
 *  8. error          — `error`: the same register with a poppy dot and its
 *                      own wording. Chapter 21: say what happened, then the
 *                      one next step — which is why the register takes
 *                      `actions` and the default is a single control.
 *  9. selected       — the selected TAB, owned by Radix via `value` /
 *                      `defaultValue` and drawn by the strip's indicator. The
 *                      frame itself is never selected.
 * 10. read-only      — the frame holds no value of its own. A read-only
 *                      collection passes read-only controls into the slots.
 *
 *  Precedence, resolved in JS rather than stacked as classes: loading beats
 *  error beats empty. A request still in flight has not failed yet, and a
 *  request that failed has not come back empty — it has not come back.
 *
 * THREE BREAKPOINTS
 *  THE TOOLBAR IS ONE ROW AT ALL THREE — client, 2026-09-04, and the only
 *  part of this section that is not width-dependent. It is one flex row that
 *  never wraps, made of a scrolling lane (search, filters, period, view
 *  switch) and the action group pinned outside it. Its height is one
 *  control's height at 380, at 834 and at 1440; where the slots need more
 *  width than the panel has, the LANE scrolls and the page does not. The full
 *  reasoning, and the three shapes that were tried and rejected, are on the
 *  row itself.
 *  · mobile (base) — one column throughout. The heading row wraps, so the
 *    header actions drop under the heading rather than squeezing it. In the
 *    toolbar the search field is the elastic slot, floored at `--space-11` so
 *    it cannot be squeezed out of existence, and the rest of the lane is
 *    reached by swiping it. The vertical rules between the toolbar groups are
 *    hidden, because a rule between two groups the reader scrolls past one at
 *    a time is just a mark, and because 39px of rule and gap is a quarter of
 *    the width a 380 phone gives this toolbar. The period stepper's own words
 *    never wrap (`whitespace-nowrap` on the label), so it stays one readable
 *    control at 380 rather than breaking across two lines. Frame inset 24,
 *    panel inset 24 — CH27.1 is explicit that narrow keeps the toolbar and the
 *    panel ("the toolbar is never dropped — it condenses"), so nothing about
 *    the J2 attachment is width-dependent.
 *  · tablet (`sm:`, 40rem) — the rules between the toolbar groups reappear.
 *    This is the width the kit's own toolbar drawing fits at. Frame inset 24,
 *    panel inset 24.
 *  · desktop (`lg:`, 64rem) — unchanged in structure; the frame inset and the
 *    panel inset both step to 32, matching `Card`'s inset response so a frame
 *    and a card inside it stay in register. The tab strip never wraps at any
 *    width; it scrolls, which is `TabsList`'s own stated behaviour — and the
 *    panel it is attached to does not scroll with it, so a strip scrolled to
 *    its end still meets the same edge.
 *
 * RTL — safe, and unused: the system is LTR only. Every inset is logical
 * (`px-*` is padding-inline), the action group is pushed with `ms-auto`
 * rather than a physical margin, and nothing here names a side.
 */
const CollectionFrame = React.forwardRef<HTMLElement, CollectionFrameProps>(
  (
    {
      className,
      /* K1 REVERSED — off-beige is the ground, soft paper is the panel. */
      tone = "page",
      density = "default",
      inset = true,
      eyebrow,
      heading,
      headingSize = "h2",
      headingAs,
      count,
      countLabel = "records",
      formatCount,
      rule = true,
      panel: panelSurface = "plain",
      toolbarGround,
      figures,
      tabs,
      value,
      defaultValue,
      onValueChange,
      tabsLabel,
      band,
      search,
      filters,
      period,
      viewSwitch,
      actions,
      maxActions = 3,
      moreActionsLabel = "More actions",
      toolbarPanel,
      loading = false,
      empty = false,
      error = false,
      loadingState,
      emptyState,
      errorState,
      loadingLabel = "Loading…",
      emptyLabel = "Nothing here",
      emptyBody = "Nothing matches what you are looking at right now.",
      errorLabel = "Something went wrong",
      errorBody = "We can’t show this right now. Try again in a moment.",
      children,
      ...props
    },
    ref,
  ) => {
    /* -- The heading band -------------------------------------------------
       The count rides beside the heading as a quiet chip. `Badge` already
       renders nothing at zero, negative or loading, so no guard is written
       here and no "0" can reach the screen. */
    const countChip =
      count === undefined ? null : (
        <Badge count={count} loading={loading} formatCount={formatCount} aria-label={countLabel}>
          {undefined}
        </Badge>
      );

    /* THE ACTION GROUP IS `ToolbarRow`'s NOW — 2026-09-08. The `React.Children`
       count, the `···` overflow, the pinned `shrink-0` group and the note about
       the one width budget this row cannot balance all moved with the row; this
       file passes `actions`, `maxActions` and `moreActionsLabel` straight
       through and counts nothing. `hasToolbar` went with them: `ToolbarRow`
       returns `null` when every slot is empty, which is the same question asked
       by the component that can actually see the answer. */

    const hasHeader =
      eyebrow !== undefined || heading !== undefined || countChip !== null;

    /* -- The body ---------------------------------------------------------
       Exclusive states resolved in JS (PATTERN §4), never stacked as
       same-specificity classes racing each other. */
    const bodyState = loading ? "loading" : error ? "error" : empty ? "empty" : "default";

    /* THE REGISTER KEPT ITS PAPER ON A PLAIN FRAME FOR EVERY STATE - 21 SEP
       2026, NARROWED 22 SEP 2026 TO LOADING AND FAILED ONLY. `inline` is
       `.kw-empty`, the lighter register, right INSIDE a painted panel, where
       "a panel-toned card on a panel-toned band is invisible in light" (see
       `registerVariants`). `block` is `.kw-register`: soft paper at 24 with
       the `--space-7` inset, inside the plain frame - kept for LOADING and
       FAILED, which still want a boundary: a spinner or a failure with
       nothing under it reads as a page that broke, not as a place that is
       empty. That was the 21 Sep reasoning for all three states; it still
       holds for these two.

       EMPTY IS DIFFERENT NOW. Aurora, verbatim, on the Accounts / Inactive
       screenshot (22 Sep 2026): "The empty collection now. We need to get
       rid of the card background." The empty register - and the identical
       register a filter reduces a collection to, since this frame carries
       one `empty` boolean and no separate "filtered" flag - takes
       `variant="plain"` on a plain panel instead: no fill, no radius, no
       inset of its own, so it sits at the panel's own rhythm - 10px under
       the toolbar through the panel's own `gap-[var(--space-2h)]` column
       gap when a toolbar is drawn, or at the frame's own top edge through
       the panel's own `pt-0` when it is not; neither number is spent again
       here. `panel="paper"` is untouched either way: the frame itself is
       the paper there, so every register keeps `inline`, exactly as ruling
       J2 always drew it. */
    const registerVariant = panelSurface === "plain" ? "block" : "inline";
    const emptyRegisterVariant = panelSurface === "plain" ? "plain" : "inline";

    let body: React.ReactNode = children;
    if (bodyState === "loading") {
      body =
        loadingState ??
        (<CollectionRegister
          variant={registerVariant}
          tone="busy"
          eyebrow={loadingLabel}
          busyLabel={loadingLabel}
        />);
    } else if (bodyState === "error") {
      body =
        errorState ??
        (<CollectionRegister
          variant={registerVariant}
          tone="error"
          eyebrow={errorLabel}
          body={errorBody}
        />);
    } else if (bodyState === "empty") {
      body =
        emptyState ??
        (<CollectionRegister
          variant={emptyRegisterVariant}
          tone="quiet"
          eyebrow={emptyLabel}
          body={emptyBody}
        />);
    }

    return (
      <section
        ref={ref as React.Ref<HTMLElement>}
        data-slot="collection-frame"
        data-tone={tone ?? "page"}
        data-state={bodyState}
        aria-busy={loading || undefined}
        className={cn(collectionFrameVariants({ tone, density, inset }), className)}
        {...props}
      >
        {hasHeader ? (
          <Title
            data-slot="collection-frame-heading"
            eyebrow={eyebrow}
            size={headingSize}
            as={headingAs}
            rule={rule}
            actions={undefined}
          >
            <span className="inline-flex flex-wrap items-center gap-3">
              {heading}
              {countChip}
            </span>
          </Title>
        ) : null}

        {figures ? <div data-slot="collection-frame-figures">{figures}</div> : null}

        {/* RULING J2 IS SPENT, AND ITS OTHER HALF SURVIVES ELSEWHERE.

            J2 said the strip and the panel are ONE REGION, because a `folder`
            strip carried a negative block-end margin of exactly
            `--folder-tab-overlap` and any gap at all left a stripe of ground
            under the tabs' feet and broke the join. That was true of the
            folder strip, which this frame no longer draws (client ruling,
            2026-09-02) — and it is still true of the one thing that does, the
            breadcrumb folder strip in
            `components/breadcrumbs/breadcrumb-folders.tsx`, which is where the
            overlap and the rule about not putting anything in the gap now
            live.

            THE STACK NO LONGER SPENDS A `gap` OF ITS OWN — CHANGED 2026-09-03,
            SAME DAY AS THE NUMBER ITSELF. It used to keep "the frame's
            ordinary band gap at every density" here, a flex `gap` between
            this `<Tabs>` wrapper and the panel below. The client then asked
            for that space to survive scrolling — a strip that pins at the top
            of a scrolling pane keeps its own box, including any padding, but
            a flex `gap` is a static distance between two siblings and stops
            meaning anything the moment one of them goes sticky. So the space
            moved onto the STRIP's own box: `TABS_STRIP_GAP` is
            `tabs.tsx`'s exported padding-block-end, on the `<Tabs>` wrapper
            immediately below (whose only child is `TabsList`, so this is
            "padding right after the strip" with nothing else inside that
            box to disturb). This stack is a plain column now; the density
            variants above still govern the frame's OWN inset and its OTHER
            gaps (header to figures, figures to this stack), which this join
            was never about. */}
        <div data-slot="collection-frame-stack" className="flex min-w-0 flex-col">
          {tabs && tabs.length > 0 ? (
            <Tabs
              value={value}
              defaultValue={value === undefined ? (defaultValue ?? tabs[0].value) : undefined}
              onValueChange={onValueChange}
              data-slot="collection-frame-tabs"
              className={TABS_STRIP_GAP}
              /* THE THREE PAPERS THAT USED TO BE RESOLVED HERE ARE GONE WITH
                 THE FOLDER VARIANT (client ruling, 2026-09-02), AND SO IS THE
                 WHOLE OVERRIDE 30 / 38 / 39 ARGUMENT THIS BLOCK CARRIED.

                 What stood here: `--card: var(--surface-panel)` on `Tabs` and
                 `--surface-panel: var(--muted)` on `TabsList`, two rebindings
                 that moved the folder shape's active and inactive fills
                 without editing `tabs.tsx`, plus a `rounded-t-[var(--radius)]
                 bg-surface-page` band for the strip to stand on. A `line`
                 strip is a rule under a heading, not a shape standing on a
                 ground: it has no fill to move, no band to stand on and no
                 corner to round. All four classes are removed rather than
                 left inert — an inert rebinding is exactly the kind of thing
                 the next reader "fixes".

                 The measured figures they produced are not lost. The register
                 keeps them, and the surviving folder shape — the breadcrumb
                 strip — restates its own pair and measures them again in
                 `verify/breadcrumb-folder/`. */
            >
              <TabsList aria-label={tabsLabel}>
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} disabled={tab.disabled}>
                    {tab.label}
                    {/* OVERRIDE 45 (2026-08-23) — A TAB'S COUNT IS QUIET,
                        NEVER A BADGE. This strip used to ship a `Badge` on
                        every tab, which is a filled chip inside a tab shape —
                        two boxes deep, and the one thing CH14 ruled out by
                        name. The quiet number this override fixed it to is now
                        `TabsCount` itself (GAPS-RULINGS.md R-4a), so this
                        frame's own hand-rolled span cannot drift from the
                        contract a second time the way it drifted the first.
                        The chapter it cited was the FOLDER chapter and the
                        folder tab is retired; the override survives it,
                        because R-4a's line count is not a badge either. */}
                    <TabsCount count={tab.count} />
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : null}

          {/* CH27.1: "toolbar, rows, pager inside it." The pager is the
              body's own — `DataTable` draws it after the rows, and a
              continuation button arrives as the last child — so it is inside
              this panel by being inside the body, not by a fourth slot. */}
          <div
            data-slot="collection-frame-panel"
            data-surface={panelSurface}
            /* `data-ground` IS THE PLAIN PANEL'S ONLY WAY TO BE SEEN BY
               tokens.css §8 - see `collectionPanelVariants`' own note. A
               `paper` panel needs nothing here: its `bg-surface-panel` class
               is already one of the names §8 keys on. */
            data-ground={panelSurface === "plain" ? "page" : undefined}
            className={collectionPanelVariants({ surface: panelSurface, density })}
          >
            {/* CH27.5's band. Inside the panel, above the toolbar, and
                drawn only when a composition passes one — the archive tab
                is the only one that does. */}
            {band ? <div data-slot="collection-frame-band">{band}</div> : null}

            {/* THE TOOLBAR IS `ToolbarRow` NOW — 2026-09-08, and the ~300
                lines of measured argument that used to sit here moved with it
                rather than being summarised away. Read
                `components/toolbar-row/toolbar-row.tsx`: the one-row rebuild
                of 2026-09-04, the scrolling lane and why it is `relative`, the
                elastic search slot's floor, the chip slot as the row's shock
                absorber, the `sm:` group rules, and the pinned action group
                with its `···` overflow are all there, unchanged, with their
                measurements.

                WHY IT LEFT THIS FILE. The contract was reachable only by
                adopting this whole frame — its heading, count chip, figure
                strip, tab strip, one soft-paper panel, three registers, body
                and pager. A screen whose body is a month grid or a chart
                cannot do that for a search box and a `+`, so it writes a bare
                `<div className="flex justify-end">` instead; the consuming app
                wrote that four times, then wrote a private toolbar of its own,
                which then could not receive this row's later rulings and still
                wraps to a second line at the widths the 2026-09-04 change was
                made to fix. Extracting costs this file nothing — the same
                markup, from one module instead of two — and it is what makes
                that a bug somebody can fix rather than a component somebody
                has to rewrite.

                THE GROUND IS STILL `bare`, AND IT IS A PROP NOW - 21 SEP
                2026. The reason this line has always given is unchanged on
                a PAPER panel and is kept verbatim: "the row is
                `ground="bare"` because this frame's own panel already paints
                the soft paper it stands on and already spends `gap-5` under
                it, which is the same number the standalone row pays as its
                own trailing margin."

                ON A PLAIN PANEL THAT SENTENCE IS FALSE AND THE ANSWER IS
                THE SAME ANYWAY, which is the part worth writing down.
                Nothing has painted, so the 21 Sep page argued the row
                should take its soft paper pill back - a toolbar is a group,
                and five controls floating on white are not one. The client
                saw exactly that and ruled the other way the same day, on
                the live product: "on tickets, reduce space above and under
                toolbar to 10px". What read as loose was never the missing
                fill; it was a painted pill's own 6px inset pushing 44px
                controls to 16 and 17px off the tabs and the table, with a
                56px table header centring 11px text under them. Take the
                air out and the group reads as a row with no box at all.

                SO `ground` IS A PROP WITH `bare` AS ITS DEFAULT rather
                than a hard coded value: the pill is still the right answer
                for a row standing alone on a page, and this frame is no
                longer the only caller allowed an opinion. The 10px above
                and below are spent by the two owners that survive a sticky
                strip - `TABS_STRIP_GAP_PLAIN` on the strip, and this
                panel's own column gap - not by a margin on the row.

                The panel a toolbar control opens stays THIS file's
                `toolbarPanel`, a sibling below, for the same reason as
                before: there is already a place in flow here, and routing it
                through the row would nest it a box deeper for nothing.
                `data-slot` is passed through so the element keeps the name
                every probe has always known it by. */}
            <ToolbarRow
              data-slot="collection-frame-toolbar"
              ground={toolbarGround ?? "bare"}
              search={search}
              filters={filters}
              period={period}
              viewSwitch={viewSwitch}
              actions={actions}
              maxActions={maxActions}
              moreActionsLabel={moreActionsLabel}
            />

            {/* What a toolbar control opened. A sibling of the toolbar and of
                the body, so it takes the panel column's own gap and PUSHES
                THE ROWS DOWN — the client's ruling of 2026-09-02, and the
                whole reason the slot exists. See `toolbarPanel`. */}
            {toolbarPanel ? (
              <div data-slot="collection-frame-toolbar-panel" className="min-w-0">
                {toolbarPanel}
              </div>
            ) : null}

            <div data-slot="collection-frame-body" className="min-w-0">
              {body}
            </div>
          </div>
        </div>
      </section>
    );
  },
);

CollectionFrame.displayName = "CollectionFrame";

/* `collectionPanelVariants` is deliberately NOT exported. The panel is not a
   part a call site may assemble on its own — the whole point of ruling J2 is
   that the toolbar, the rows and the pager are inside ONE panel the frame
   owns, and an exported recipe would be an invitation to draw a second one. */
export { CollectionFrame, CollectionRegister, collectionFrameVariants, registerVariants };
