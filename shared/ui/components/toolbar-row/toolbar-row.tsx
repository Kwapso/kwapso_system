/* ============================================================================
   ToolbarRow — the collection toolbar contract, on its own, above any body
   (1 direct call site: `CollectionFrame`).

   WHAT THIS IS, IN ONE SENTENCE
   The row `CollectionFrame` has always drawn — search, filters, period, view
   switch, actions pinned right, on ONE line at every width — lifted out of
   that frame so a screen whose body is NOT a kit collection can reach it.

   ── WHY IT WAS EXTRACTED, WHICH IS THE WHOLE ARGUMENT FOR IT EXISTING ──────

   The contract was never missing from this kit. It is quoted verbatim in
   `collection-frame.tsx`'s own header, out of "Assembled screens → List /
   collection page":

       "Toolbar order never changes: search, then filters, then view switcher,
        then actions pinned right. … The 4th+ action collapses under a '···'
        icon button rather than adding more pills."

   What was missing is a way to REACH it. That row was welded inside a frame
   that also owns the eyebrow, the heading, the count chip, the figure strip,
   the tab strip, the one soft-paper panel, three registers, the body and
   whatever pager the body carries. A screen whose tab body is a month grid, a
   chart or a grouped pair of lists cannot adopt all of that to get a search
   box and a `+`, so it writes `<div className="flex justify-end">` instead —
   and then writes it again on the next screen.

   THAT IS NOT A HYPOTHETICAL. The consuming application at `kwapso_system`
   wrote exactly that four times (its Apps search-and-button row, Sprints'
   Overview and Calendar rows, Tasks' Calendar row), noticed, and built a
   private `ToolbarRow` of its own — which then grew eighteen call sites and
   FOUR laws to police them. The cost is not the duplicated markup. The cost
   is that a second copy of a contract cannot receive the contract's later
   rulings: that private row still carries `flex-wrap`, so it draws a
   two-and-more-line toolbar at the widths this file's own lane was measured
   and rebuilt to fix on 2026-09-04 ("i want that toolbar is a single row like
   in the pdf i gave you long ago wiuth designs"). It has no scrolling lane, no
   group separators and no `···` overflow — not because anybody decided
   against them, but because the ruling landed on the kit's row and the app was
   not holding the kit's row. A rule an application had to invent is a rule the
   next application will invent again, one ruling behind.

   ── WHAT THIS FILE DELIBERATELY DID NOT TAKE FROM THAT APPLICATION ─────────

   A kit component that is one product's component with the serial numbers
   filed off is worse than no component, so three things that private row has
   were read, argued, and left where they are:

     · A SIXTH `sort` SLOT. Its row draws search → filters → sort → view →
       actions, and its own law makes `sort` a config the row builds. The
       argument for that is real and the evidence behind it is real — eight of
       its call sites had smuggled a `<SortControl>` into the `search` slot,
       where it sat inside the one GROWING box at whatever label treatment that
       screen typed. But the fix is one product's, because the CONTRACT here
       does not have a sort slot to fill: `CollectionFrame`'s own note records
       that "`SortControl` shares the slot by CH27.13's 'the view switcher and
       the sub-tab picker are controls'", and the precedent for growing this
       row (override 28, the period stepper) is explicitly "a chapter draws a
       control in this toolbar that none of the existing slots describes".
       Slot 4 describes it. Adding a sixth would be legislating past the
       rulebook, and closing slot 4 into a config pair would break every
       existing `viewSwitch` call site to enforce one product's fixed answer to
       "which controls" — an answer a gantt's period stepper and a sub-tab
       picker already contradict inside this repository.

     · AN `empty` GATE THAT HIDES THE WHOLE ROW. Its R50 — "once again, when
       empty collection no toolbar at all — fix everywhere and set as a rule" —
       is a required prop that returns `null` before any slot is considered. It
       is a good mechanism and it is NOT the kit's ruling: `compositions/states/
       empty-collection.tsx` is 27.21 transcribed, and 27.21 draws the search
       box, the filter chips and the actions over a collection with nothing in
       it. Two client rulings genuinely disagree; the newer one governs that
       product's screens and the chapter governs this repository's, and the kit
       is not the place to settle it silently. A host that holds the newer
       ruling renders no `ToolbarRow` at all when its collection is empty,
       which is a decision it can make in one `if` and enforce with its own
       census — which is exactly what it does today.

     · A FILL AND A RADIUS PICKED BY NAME. Its row paints `bg-surface-raised`,
       and that is the right colour for the ground it happens to stand on
       rather than a property of a toolbar. See `ground` below: the kit already
       has the relational answer and this file asks the relational question.

   ── WHAT THIS FILE DID TAKE, BECAUSE IT IS THE KIT'S OWN NUMBER ────────────

   THE GAP TO WHAT COMES NEXT. `TOOLBAR_ROW_GAP` is `--space-5`, and that is
   not a fourth opinion about air: `TABS_STRIP_GAP` (tabs.tsx) is
   `pb-[var(--space-5)]` for the identical sentence one strip up, and
   `CollectionFrame`'s own panel column is `gap-5` between this row and the
   rows under it. The consuming app re-derived the same number as
   `--toolbar-content-gap` after its fourteen call sites had drifted into five
   different values doing one job (7.5 / 11.25 / 15 / 22.5px and a
   `className="mb-4"` passed straight to the row). One rhythm does not mint a
   second number for the same sentence, and the kit owns the number, so the kit
   pays it — but only where the row is furniture standing on its own. Inside a
   host that stacks it, the host's own gap is that number already and paying it
   twice is the bug the app's law was written about. `ground` decides which of
   those two the row is in, so the question is asked once.

   DESIGN SOURCE
   Kit "Assembled screens → List / collection page" and chapter 19 ("Collection
   views · 24 view types · one toolbar contract"), by way of
   `collection-frame.tsx`, which transcribed both and holds every measurement,
   rejection and client ruling behind the arrangement below. This file is that
   arrangement and nothing else; the reasoning for each line is quoted where it
   is short enough to stand alone and cited where it is not.

   THE LAW THIS FILE OBEYS
   · The ORDER is the component's, never the call site's. That is why there are
     five named slots instead of one `toolbar` node.
   · ONE ROW AT EVERY WIDTH. Nothing wraps; a lane scrolls its own inline axis
     and the action group is pinned outside it. The row's height is its tallest
     control's height at 380 and at 1440 alike.
   · A boundary is a paper step or an inset shadow, never a `border`. The group
     rules are `Separator`, which draws with a fill.
   · TWO RADII AND THE PILL, chosen by STATE and never by content height. The
     collapsed row is the pill; a row with a panel open under it is the box
     radius. There is no third value and neither is measured from anything.
   · A GROUND IS PAINTED WITH A NAMED UTILITY CLASS. `bg-[var(--token)]` paints
     the same colour and matches none of tokens.css's ground selectors, so the
     secondary-button and pill rebinds never fire and every control inside is
     left standing on its own tone. See `ground`.
   · No `--kw-*` ramp, no literal colour, no type step, no icon of its own.
   · Every user-facing string is a prop with a default — here that is one, the
     overflow trigger's accessible name.

   RENDERING CONTEXT
   No `"use client"`. This module holds no state, calls no hook and creates no
   handler during its own render — it forwards nodes and props. `DropdownMenu`
   is itself a client component and carries its own directive.
   ========================================================================= */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";
import { Button } from "../button/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../dropdown-menu/dropdown-menu";
import { Separator } from "../separator/separator";
import { DotsThree } from "../../foundations/icons";

/**
 * THE ROW'S TRAILING SPACE, as a class a host may reach for.
 *
 * `--space-5`, and the third place in this kit to spend that exact number on
 * that exact sentence — `TABS_STRIP_GAP` is the same value for the gap under a
 * tab strip, and `CollectionFrame`'s panel column is `gap-5` between this row
 * and the rows below it. Published for the same reason `TABS_STRIP_GAP` is: a
 * host that stacks this row with its own body by hand should reach for the
 * number rather than pick one, and a host that already has a column gap should
 * be able to see that it is spending the same thing.
 *
 * A MARGIN, NOT PADDING, WHICH IS THE ONE PLACE THIS DIFFERS FROM THE TAB
 * STRIP'S ANSWER. `TABS_STRIP_GAP` is padding because the strip it belongs to
 * can be pinned on scroll and the trailing space has to travel with the pinned
 * box. This row paints a fill when it is standing on its own, and trailing
 * padding inside a painted box is not a gap under it — it is a taller pill.
 */
export const TOOLBAR_ROW_GAP = "mb-[var(--space-5)]";

const toolbarRowVariants = cva(
  [
    /* A COLUMN, not a row: the row itself is the track below, and what a
       toolbar control opened is its sibling. One box around both is what makes
       an open facet panel read as this row EXPANDING rather than as a second
       piece of furniture appearing under it. */
    "flex min-w-0 flex-col",
  ],
  {
    variants: {
      /**
       * WHICH PAPER TONE THIS ROW IS STANDING ON — and therefore, since the
       * kit's rule is relational, which one it paints itself.
       *
       * The question is `CollectionFrame`'s own `tone` question, asked in the
       * same words for the same reason, because a toolbar cannot know its own
       * ground and a fixed fill is right on exactly one screen. ch02 and the
       * `SHELL.md` nesting alternate all the way down — off-beige page, soft-
       * paper screen card, off-beige body pane, soft-paper panel, off-beige
       * cards — so "what colour is a toolbar" has no answer and "what is under
       * this toolbar" has one.
       *
       * NAMED UTILITY CLASSES, AND THAT IS LOAD-BEARING RATHER THAN TIDY.
       * tokens.css rebinds `--btn-secondary-fill` and `--pill-fill` off a LIST
       * OF CLASS NAMES (`.bg-background, .bg-card, .bg-surface-raised,
       * .bg-surface-page` on one side, `.bg-surface-panel, .bg-secondary` on
       * the other), so a secondary control is always the other tone from
       * whatever it stands on and no component needs a prop for it. The
       * consuming app painted this identical row with
       * `bg-[var(--surface-raised)]` — the same colour, a different class —
       * and every button in its toolbar lost its background, twice reported
       * ("the buttons in the toolbar are missing the background") before it
       * was traced. The arbitrary form silently freezes every ground-aware
       * token beneath it.
       */
      ground: {
        /**
         * SOMETHING ELSE ALREADY PAINTED. No fill, no radius, no trailing
         * gap — the host owns all three, which is what `CollectionFrame` does
         * with its own soft-paper panel and its `gap-5`. The default, because
         * a row that paints nothing cannot paint the wrong thing.
         */
        bare: "",
        /**
         * STANDING ON OFF-BEIGE — a page, a body pane, a screen's own ground.
         * The row takes soft paper, which is 26.04 read at this level: "The
         * page itself is off-beige and every panel on it is soft paper: never
         * the other way round." Controls inside then rebind to off-beige.
         */
        page: "bg-surface-panel",
        /**
         * STANDING ON SOFT PAPER — a screen card, a panel, a sheet. The row
         * takes off-beige, and the controls inside rebind to soft paper. This
         * is the value the consuming app's own row arrived at by hand after
         * two rounds of client feedback, which is the relation working.
         */
        panel: "bg-surface-raised",
      },
    },
    defaultVariants: { ground: "bare" },
  },
);

export interface ToolbarRowProps
  extends React.ComponentPropsWithoutRef<"div">,
    VariantProps<typeof toolbarRowVariants> {
  /** Toolbar slot 1. Usually a `SearchInput`. The row's ONE elastic slot. */
  search?: React.ReactNode;
  /** Toolbar slot 2. Usually a `FilterBar`. Its chips are held to one line. */
  filters?: React.ReactNode;
  /**
   * TOOLBAR SLOT 3 — the period stepper. CH27.26's `‹ 6 weeks ›`, between the
   * search field and the view switch, exactly where the chapter draws it. A
   * placement, not a drawing: pass `GanttPeriodStepper`, or a control of your
   * own; nothing here styles it.
   */
  period?: React.ReactNode;
  /**
   * TOOLBAR SLOT 4 — the view switch, and the row's control slot generally.
   * `ViewSwitch` is what it was drawn for; `SortControl` shares it by CH27.13's
   * "the view switcher and the sub-tab picker are controls", which is why this
   * is one slot and not two. A placement, not a drawing.
   */
  viewSwitch?: React.ReactNode;
  /**
   * TOOLBAR SLOT 5, pinned to the inline end and outside the scrolling lane.
   * Children past `maxActions` collapse into an overflow menu rather than
   * adding more pills, which is the kit's own dev note.
   */
  actions?: React.ReactNode;
  /** How many actions stay visible before the rest collapse. The kit's figure is 3. */
  maxActions?: number;
  /**
   * The accessible name of the `···` overflow trigger. A prop with a default
   * because the applications run in more than one language, and the only
   * string this file holds.
   */
  moreActionsLabel?: string;
  /**
   * WHAT A TOOLBAR CONTROL OPENED — under the track, in flow, inside the same
   * painted box.
   *
   * CLIENT, 2026-09-02, VERBATIM: "the expanded toolbar shoudl not be an
   * overlay, but literaly expand the space". CLIENT AGAIN, 2026-09-03, on the
   * first in-flow attempt: "what this is doing is creating a new card
   * underneath... it kind of creates a second toolbar. This is not the
   * behaviour I want. I want it to look together, so merge this with the main
   * toolbar so that it's one single background or container, more like expand
   * behaviour rather than open-a-new-one behaviour." So the panel is a sibling
   * of the TRACK inside this component's own root, with no gap between them
   * and no fill of its own — one box, one colour, two regions.
   *
   * ITS PRESENCE ALSO CHOOSES THE RADIUS, and it chooses it as a boolean
   * rather than by measuring anything. A `rounded-pill` computed against a
   * tall box stretches into an oval; `Boolean(panel)` picks one of exactly two
   * fixed values instead. Collapsed is the pill every other toolbar control
   * wears; expanded is the box radius, so a tall facet panel never has to fit
   * inside a 999px curve.
   *
   * A HOST WITH ITS OWN PLACE IN FLOW SHOULD USE THAT INSTEAD. Inside
   * `CollectionFrame` the panel is a sibling of this whole row within the
   * frame's own panel column (`toolbarPanel` there), where it takes that
   * column's gap and pushes the rows down; routing it through here would nest
   * it one box deeper for nothing. This slot is for the standalone row, which
   * has no such column.
   */
  panel?: React.ReactNode;
}

/**
 * The collection toolbar, on one row, above any body at all.
 *
 * TEN STATES
 *  1. default        — the slots that were passed, in the fixed order, with a
 *                      `Separator` between each group that has a neighbour.
 *  2. hover          — does not apply to the row; it is a rail for controls,
 *                      not a target. Every control inside carries its own.
 *  3. focus-visible  — NOT here. tokens.css §8 rings every control at once,
 *                      and the row is not focusable. The lane's own vertical
 *                      padding exists so that a ring on a control inside it is
 *                      not shaved off by the scroller's clip.
 *  4. active/pressed — does not apply, for the same reason as hover.
 *  5. disabled       — does not apply. A toolbar is not a control; a toolbar
 *                      whose collection cannot be acted on passes fewer slots.
 *  6. loading        — does not apply. The row is drawn from what the screen
 *                      already knows (which columns, which views, which
 *                      actions) and is the one thing that can be right before
 *                      the rows arrive — ch27.6's whole point. A COUNT inside
 *                      a control that has not arrived renders nothing, which
 *                      is `Badge`'s law, not this file's.
 *  7. empty          — no slots at all renders `null`. A painted pill with
 *                      nothing in it is furniture standing in for a toolbar.
 *                      NOTE that this is emptiness of the ROW, never of the
 *                      collection: whether a collection with no rows should
 *                      still draw its toolbar is the host's ruling and this
 *                      file takes no position on it — see the header.
 *  8. error          — does not apply. The row reports nothing; a collection
 *                      that failed swaps its BODY, never its toolbar (ch27's
 *                      law 4: "a state is a body swap").
 *  9. selected       — does not apply. CH27.1's bulk bar is the toolbar's own
 *                      REPLACEMENT at this position, never a second row
 *                      beside it, so a host renders one or the other.
 * 10. read-only      — always. The row holds no value of its own.
 *
 * THREE BREAKPOINTS
 *  mobile / tablet / desktop — ONE ROW AT ALL THREE, which is the whole design
 *  and is measurable rather than eyeballed: the row is a flex that never wraps,
 *  holding a scrolling lane and a pinned action group, so its height is its
 *  tallest control's height at every width. What changes with width is only
 *  the group separators, which are `sm:` and absent on a phone — three of them
 *  cost 3px of rule and 36px of gap, a quarter of the 245px a 380 viewport
 *  gives this row, spent on marks rather than controls. What this costs, said
 *  plainly: on a phone the lane is wider than the screen and the reader swipes
 *  it. Nothing is hidden behind a control, nothing changes its accessible name
 *  and nothing leaves the tab order.
 *
 * RTL — safe. Every inset and every push is logical (`ms-auto`, `pe`/`ps`),
 * the lane scrolls the INLINE axis so it mirrors on its own, and no rule here
 * names a physical side. The `···` glyph is a horizontal ellipsis and is
 * direction-neutral.
 */
const ToolbarRow = React.forwardRef<HTMLDivElement, ToolbarRowProps>(
  (
    {
      className,
      ground = "bare",
      search,
      filters,
      period,
      viewSwitch,
      actions,
      maxActions = 3,
      moreActionsLabel = "More actions",
      panel,
      ...props
    },
    ref,
  ) => {
    /* THE ACTION GROUP — "the 4th+ action collapses under a '···' icon button
       rather than adding more pills", counted off `React.Children` so a call
       site passes its controls as ordinary children and never has to think
       about the rule.

       PINNED, AND IT DOES NOT WRAP. `flex-wrap` was here so a fourth pill
       could drop to a second line; nothing may drop to a second line any more
       (see the track's own note), and the overflow menu is the answer to "too
       many pills" the kit already had. `shrink-0` is what keeps the charcoal
       `+` at full size while the lane beside it gives up width — the client's
       "at least i need to have the + button" is a promise about a control
       being THERE, and a squashed pill is a different way of breaking it.

       THE ONE BUDGET THIS ROW CANNOT BALANCE, STATED SO NOBODY REDISCOVERS IT
       AS A BUG. `maxActions` counts pills; it does not measure them. A caller
       that passes two LABELLED pills and the `+` to a 380 phone hands this
       group 204px of a 245px toolbar, and the lane beside it is left with 30 —
       one row still, and every control still named and still in the tab order,
       but the search field is mostly scrolled out of sight. There is no CSS
       answer: something has to give, and the two things that must not are the
       `+` and the page's own horizontal scroll. The answer is the kit's
       existing one, taken earlier — pass a smaller `maxActions`, and the
       surplus folds under the `···` this group already draws. */
    const actionList = React.Children.toArray(actions);
    const visibleActions = actionList.slice(0, Math.max(0, maxActions));
    const overflowActions = actionList.slice(Math.max(0, maxActions));

    const actionGroup = actionList.length ? (
      <div
        data-slot="toolbar-row-actions"
        className="ms-auto flex shrink-0 flex-nowrap items-center gap-2"
      >
        {visibleActions}
        {overflowActions.length ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" aria-label={moreActionsLabel}>
                <DotsThree />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">{overflowActions}</DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    ) : null;

    /* Prefer nothing (PATTERN §4). An empty row is a painted pill standing in
       for a toolbar, which reads as one that failed to load. A panel with no
       track above it is not this component's shape either — it is a card. */
    if (!search && !filters && !period && !viewSwitch && !actionGroup) return null;

    const expanded = panel !== undefined && panel !== null;
    const painted = ground !== "bare";

    return (
      <div
        ref={ref}
        data-slot="toolbar-row"
        data-ground={ground}
        data-state={expanded ? "expanded" : "collapsed"}
        className={cn(
          toolbarRowVariants({ ground }),
          painted && [
            /* TWO RADII, CHOSEN BY STATE, NEVER BY CONTENT HEIGHT. There is no
               third value and neither is measured. */
            expanded ? "rounded-[var(--radius)]" : "rounded-pill",
            /* The number, paid once, by the only element that knows it is
               standing on its own. See `TOOLBAR_ROW_GAP`. */
            TOOLBAR_ROW_GAP,
          ],
          className,
        )}
        {...props}
      >
        <div
          data-slot="toolbar-row-track"
          /* ONE ROW. AT EVERY WIDTH. Client, 2026-09-04, verbatim: "i want
             that toolbar is a single row like in the pdf i gave you long ago
             wiuth designs". Two children — a scrolling lane and a pinned
             action group — and the lane absorbs every width problem by
             scrolling its own inline axis, so this element's height is its
             tallest control's height and nothing else. The measurements that
             rejected a `···` fold, an in-flow disclosure and a double render
             are in `collection-frame.tsx`'s own note; they are not repeated
             here because they were made once and they did not move.

             The inline-start inset is deeper than the others so a search
             glyph does not sit flush on the seam of a painted row, and the
             insets are spent only when this row PAINTS: inside a host's panel
             the host's own inset is already there and a second one would
             indent the toolbar from the rows beneath it. */
          className={cn(
            "flex flex-nowrap items-center gap-3",
            painted && "py-1.5 pe-1.5 ps-4",
          )}
        >
          <div
            data-slot="toolbar-row-lane"
            /* THE LANE. `min-w-0` is what lets it be narrower than its content
               — without it a flex item's automatic minimum size is its content,
               the lane never scrolls, and the PAGE scrolls instead, which is
               the one outcome forbidden outright.

               The vertical padding and the negative margin that cancels it are
               a PAIR and must stay one: `overflow-x` other than `visible`
               forces `overflow-y` to `auto` too, so a control's 1px
               `:focus-visible` outline would be shaved at the lane's edges.
               `--space-1` is four times the ring and the smallest token that
               clears it; the matching negative margin gives the space back, so
               the row's measured height is unchanged.

               `relative` IS LOAD-BEARING. A scroll container does not clip an
               absolutely positioned descendant unless it is that descendant's
               containing block, and `SortControl` and `ViewSwitch` each carry
               an absolutely positioned `.sr-only` span. Measured with the lane
               `static`, at 834, those two spans pushed the document's
               scrollWidth 74px past its clientWidth and the PAGE scrolled
               sideways. It contains what is already inside the lane; it is not
               an anchor offered to anything outside it, and a panel that a
               control opens belongs in `panel`, in flow. */
            className="relative flex min-w-0 flex-1 flex-nowrap items-center gap-3 overflow-x-auto py-[var(--space-1)] my-[calc(var(--space-1)*-1)]"
          >
            {search ? (
              /* THE ROW'S ONE ELASTIC SLOT: it takes the slack when there is
                 slack and gives it back first when there is not. The floor is
                 real rather than a nicety — `flex-1` is `flex: 1 1 0%` and a
                 zero-basis item has zero shrink WEIGHT, so without a minimum
                 every pixel of an overflow deficit comes out of this slot and
                 the field sits at 0 wide, present in the tree and invisible on
                 the screen. `--space-11` is 8rem, which RESCALES with the
                 text-size control instead of pinning a pixel, and is the
                 narrowest a glyph, a placeholder and a clear control still
                 read as a search field. */
              <div className="min-w-[var(--space-11)] flex-1">{search}</div>
            ) : null}

            {search && (filters || period || viewSwitch) ? (
              <Separator
                orientation="vertical"
                decorative
                /* A rule earns its keep by separating two groups the eye reads
                   as one run — and on a phone it does not: see THREE
                   BREAKPOINTS. Drawn as a fill, never a border. */
                className="hidden h-[1.375rem] sm:block"
              />
            ) : null}

            {filters ? (
              <div
                className={cn(
                  "flex min-w-[var(--space-11)] items-center gap-2",
                  /* THE ROW'S OWN GUARANTEE, NOT A REQUEST OF THE CALL SITE.
                     Left to itself a `FilterBar` releases its chip row to
                     `flex-wrap` from `sm` up, and a wrapping row inside this
                     slot is the toolbar growing a second line from the inside
                     — the one thing the 2026-09-04 ruling forbids,
                     reintroduced by a call site that did nothing wrong. The
                     precedent for reaching a descendant's `data-slot` from the
                     component that positions it is `split.tsx`'s selected-row
                     inks; the selector is class-plus-attribute, so it outranks
                     `FilterBar`'s own single-class `sm:flex-wrap` however the
                     two land in the sheet. A caller who genuinely wants a
                     wrapping facet row wants it OUTSIDE this row — `panel` is
                     in flow and is not a row.

                     THE CHIP SLOT IS THIS ROW'S SHOCK ABSORBER, and that is a
                     choice between two working arrangements. With `shrink-0`
                     here the chips keep their intrinsic width and the lane
                     carries every deficit — measured at 834, that pushed the
                     view switch clean off the visible lane while three filter
                     chips sat in full view. A view switch is a primary control
                     and a chip is a record of something the reader did a
                     moment ago, so the chips shrink and scroll inside
                     themselves instead. The floor stops that becoming a
                     zero-width scroller: people who cannot see their filters
                     "read a filtered list as an empty one". */
                  "[&_[data-slot=filter-bar-chips]]:flex-nowrap",
                  "[&_[data-slot=filter-bar-chips]]:overflow-x-auto",
                )}
              >
                {filters}
              </div>
            ) : null}

            {filters && (period || viewSwitch) ? (
              <Separator
                orientation="vertical"
                decorative
                className="hidden h-[1.375rem] sm:block"
              />
            ) : null}

            {/* `shrink-0` from here down. A period stepper's words and a view
                switch's current-view label are TEXT, and text given less room
                than it needs either wraps — a second row by another name — or
                ellipses away the one thing the control exists to tell you. */}
            {period ? <div className="flex shrink-0 items-center">{period}</div> : null}

            {period && viewSwitch ? (
              <Separator
                orientation="vertical"
                decorative
                className="hidden h-[1.375rem] sm:block"
              />
            ) : null}

            {viewSwitch ? (
              <div className="flex shrink-0 items-center">{viewSwitch}</div>
            ) : null}
          </div>

          {/* OUTSIDE THE LANE, ON PURPOSE. The action group is the one thing
              in this row that may not scroll away — the client's own item 3,
              "everytime i see a collection, on the toolbar, at least i need to
              have the + button" — and a `+` two swipes off the inline edge of
              a phone is a control the reader has to go looking for. Pinning it
              here is also what makes the lane's scroll safe to reason about:
              one scrolling child and one fixed child, in that order, at every
              width. */}
          {actionGroup}
        </div>

        {/* NO GAP ABOVE IT, WHICH IS THE POINT. Two boxes of the identical
            colour with air between them is not one piece of furniture no
            matter what either one is filled with — that seam is what read as
            "a new card underneath". The panel brings no fill and no radius of
            its own; this root's are the only ones. */}
        {expanded ? (
          <div data-slot="toolbar-row-panel" className="min-w-0">
            {panel}
          </div>
        ) : null}
      </div>
    );
  },
);

ToolbarRow.displayName = "ToolbarRow";

export { ToolbarRow, toolbarRowVariants };
