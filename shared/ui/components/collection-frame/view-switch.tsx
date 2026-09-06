"use client";

/* ============================================================================
   ViewSwitch — ZONE 3 OF THE TOOLBAR. The control that swaps the body.

   WHY THIS FILE EXISTS AT ALL
   Client feedback, round 1, item 4, verbatim: *"you missed a full section of
   the toolbar which is the view selector! review the screenshot from the
   claude design! its explained there! 1 search 2 filters 3 views 4 buttons"*.

   The client is right and the miss was total. `CollectionFrame` has carried a
   `viewSwitch` SLOT since it was written, and CH19's contract has been quoted
   in three files — but no control was ever drawn to stand in it, and no route
   in either door passed one. The slot was a hole with a name.

   ─────────────────────────────────────────────────────────────────────────
   WHAT THE ARTIFACT DRAWS. FOUND, NOT CHOSEN.
   ─────────────────────────────────────────────────────────────────────────
   "Kwapso UI Kit.dc.html" draws this control three times and the three
   drawings agree on every measurement.

     1. CH19, the 24-view catalogue, in the toolbar every specimen opens with:

          <div style="display: inline-flex; align-items: center; gap: 8px;
                      padding: 9px 8px 9px 16px; border-radius: 999px;
                      background: var(--card); flex: 0 0 auto;">
            <span style="font-size: 13px; font-weight: 500;">{{ v.short }} view</span>
            <svg viewBox="0 0 12 8" width="9" height="6" style="opacity: .5;">…</svg>
          </div>

     2. CH27.24, the assembled board screen: the same pill, reading
        `Board` with the same 9x6 caret at 50%.

     3. CH27's second board specimen: `Board` and the caret again.

   So, settled by the drawing and not by taste:

     · IT IS A DROPDOWN, NOT A SEGMENTED CONTROL AND NOT A ROW OF ICON
       BUTTONS. One pill, showing the CURRENT view's name. (The chapter draws
       a caret after the name; the client removed it on 2026-09-02 — see THE
       PILL'S CONTENTS below. What the drawing settles is the CONTROL, and a
       dropdown is still what this is.) The repo's transcriptions read it the
       same way — INVENTORY-1 calls it the "view-switch dropdown";
       INVENTORY-3's region table calls it "a paper `Board ▾` view-switch
       pill". A `ToggleGroup` was proposed on `verify/decide-2.html` §D7-5; it
       is not what the chapter draws, and the drawing wins.
     · IT IS A PAPER PILL, NOT A FIELD. In CH19's own toolbar row the SEARCH
       pill carries `box-shadow: inset 0 0 0 1px var(--hair)` and this one
       carries none — the chapter draws the distinction twice in one row. So
       the resting skin here is the `Export` pill's, which is
       `--btn-secondary-fill`, re-resolved by the panel to off-beige. CH27.1:
       "both keeping their round off-beige well, which is what makes them read
       as buttons on a soft-paper toolbar".
     · ITS LABEL IS 500. The artifact writes the weight on this pill and on
       no other in the row — `Export` and `Group` inherit 300 there. MEASURED
       IN THE BUILD, the difference does not survive: `button.tsx` already
       sets `--font-weight-medium` on every variant, so every pill in this
       toolbar is 500 and this one matches rather than stands out. The weight
       is written here because the chapter writes it; whether the build's
       action pills should step back down to 300 to restore the artifact's
       contrast is `button.tsx`'s question, not this file's, and is reported
       rather than taken.
     · WHERE IT SITS: after the filters, before the actions. That is
       `CollectionFrame`'s slot 4 and the frame already places it. CH27.13:
       "Toolbar order never changes: search, then filters, then view switcher,
       then actions pinned right."

   ─────────────────────────────────────────────────────────────────────────
   THE PILL'S CONTENTS — CLIENT, 2026-09-02, OVERRIDING THE CHAPTER'S CARET
   ─────────────────────────────────────────────────────────────────────────
   Two rulings, one breath, both verbatim:

     "same on views - rmeove the chevron"

     "on the view, on the left of teh word, add an icon inside tha pill that
      represents the view (we will map this later, so far put a random icon)
      same positio as the arrow on the left of srot, but without the splitted
      pill"

   So the pill is now [icon, label] where the chapter drew [label, caret].

     · THE CARET GOES. `hideChevron` on `SelectTrigger` — the opt-out lives
       there because the glyph is `SelectPrimitive.Icon`'s and no class at
       this call site could take its RESERVED ROOM with it. `SortControl`'s
       field took the same ruling in the same breath, so the toolbar's three
       pills — filter chip, sort chip, view pill — stay one family, and that
       family is now caret-free throughout. The filter chip never had one.
     · THE ICON ARRIVES, LEADING, INSIDE THE ONE PILL. "Same position as the
       arrow on the left of sort" is about WHERE, and the client closes the
       door on the rest herself: "but without the splitted pill". So this
       control does NOT grow a segment, a divider or a second rounding — no
       `rounded-s-*`, no fused edge, nothing of `SortControl`'s two-half
       geometry. One pill, `justify-start`, the trigger's own `gap-2` between
       glyph and word.
     · THE SIZE IS THE KIT'S, NOT A LITERAL. `size={16}` resolves through
       `icon-base.tsx`'s SIZE_TOKEN to `var(--icon-16)`, which is what
       `--icon-button` also is — the same 16 the caret it replaces was drawn
       at, so the pill's width does not move: 16 of glyph and 8 of gap out,
       16 of glyph and 8 of gap in. Measured: verify/toolbar-trio.
     · THE GLYPH IS A PLACEHOLDER AND THE API IS THE POINT. See
       `CollectionViewOption.icon` — the mapping is the client's and it is
       not made here.

   ─────────────────────────────────────────────────────────────────────────
   WHICH VIEWS IT OFFERS IS DATA, AND IT IS THE CALL SITE'S
   ─────────────────────────────────────────────────────────────────────────
   The kit ships many collection bodies and the artifact is explicit that they
   are NOT all offered everywhere. CH27.28, verbatim:

       "Gallery appears in the view switcher for deliverables, assets and
        screens. It is never offered for tickets, accounts or sprints — an
        image-led view of text records is a grid of empty boxes pretending to
        be content."

   So the offered set is per-collection data, never a constant in a component.
   `views` is a required prop and this file ships NO default list, NO default
   labels and NO opinion about which collection gets which body. That is
   product vocabulary; inventing it is a thing this project has already been
   corrected for. The mechanism is here; the sets belong to the routes.

   ─────────────────────────────────────────────────────────────────────────
   ONE VIEW IS A LABEL, NOT A CONTROL AND NOT A HOLE — CLIENT, 2026-09-06
   ─────────────────────────────────────────────────────────────────────────
   THIS REVERSES WHAT THIS FILE USED TO DO, AND THE REVERSAL IS THE CLIENT'S.
   Until today, fewer than two views rendered `null` on the argument that "a
   control that offers no choice is not a control" — `/meetings`'s standing
   decision (OPEN.md §C21) made general so no route had to remember it. The
   reasoning was sound about the CONTROL and wrong about the ROW. Verbatim,
   2026-09-06:

     "And then, when there is no other option, so there is only one, include
      this in the kit. Basically, it looks exactly like if it was selected,
      only that you cannot click, and there is no dropdown."

   WHY SHE WANTS IT, because the reason governs the edges. She has twice
   demanded the toolbars stop varying between screens — *"why the fuck i
   still have different toolbar variations??? unify joder"*. A row that keeps
   its third zone on one tab and drops it on the next IS that variation, and
   it is the kind a reader feels without being able to name: the actions slide
   left, the row's rhythm changes, and two screens of the same product stop
   looking like the same product. Drawing the pill costs one inert span and
   buys a toolbar that reads identically everywhere. That trade is hers to
   make and she has made it.

   SO: EXACTLY ONE VIEW DRAWS THE PILL EXACTLY AS THE SELECTED TRIGGER DRAWS
   IT — same fill, same 40, same 18 of inline padding, same pill radius, same
   16 glyph, same 8 of gap, same 14/500 label — AND IS NOT A CONTROL. No
   dropdown, no caret, no hover, no focus ring, not in the tab order.

   ZERO VIEWS IS UNCHANGED AND STILL RENDERS `null`. There is no view to name,
   so a pill would have to say something, and the only thing it could say is a
   word this file invented. A collection that offers no bodies has no third
   zone; that is not a variation, it is an absence of data.

   WHAT IT IS SEMANTICALLY, AND IT IS NOT A DISABLED BUTTON
   A disabled control is a PROMISE DEFERRED: it says "this does something, and
   not right now". Assistive technology says so out loud — "button, dimmed",
   "unavailable" — and a reader who hears that goes looking for the condition
   that would switch it on. There is no such condition here and there never
   will be one: the collection ships one body, and the day it ships two this
   becomes a real `Select` rather than an enabled version of this. Announcing
   a permanently-unavailable action is a lie with a to-do list attached, so
   `aria-disabled`, `disabled`, `role="button"` and `role="combobox"` are all
   refused. `tabIndex={-1}` is not used either — you cannot remove from the
   tab order a thing that was never in it, and writing it would imply there
   was a control to exclude.

   IT IS TEXT. A `<span>` with no role, holding the view's name, with the
   glyph `aria-hidden` exactly as the trigger's is. The naming context the
   control got from `aria-label` — the word "View" — is carried by an
   `sr-only` span instead, so the two drawings tell a screen reader the SAME
   TWO FACTS and differ only in the third:

       two views   "View, Board, combobox"      ← name, value, and an action
       one view    "View, Board"                ← name and value, no action

   The colon in the hidden text is a PAUSE, not a word: no screen reader at
   its default punctuation level speaks ":", and it is there so the two facts
   do not run together into "Viewboard". `aria-label` on a roleless `<span>`
   was the shorter route and is not reliable — a generic element is not a
   naming target and several screen readers ignore it, which would have left
   this reader with a bare "Board" floating in a toolbar. Hiding the whole
   pill was the other short route and gives the non-sighted reader LESS than
   the sighted one gets, which is the reverse of the point: the pill exists to
   say which view you are in.

   THE CARET COSTS NOTHING TO OMIT, AND THAT IS MEASURED RATHER THAN HOPED.
   The multi-view trigger has drawn NO caret since 2026-09-02 ("same on views
   - rmeove the chevron") — `hideChevron` does not hide the glyph, it declines
   to render it, so the 16 of glyph and the 8 of gap went with it. There is
   therefore no caret to remove here and no room to reclaim: the one-view pill
   is not the two-view pill minus something. Both are [glyph, label] inside
   the same box.

   THE METRICS CANNOT DRIFT BECAUSE THERE IS ONLY ONE COPY OF THEM. Both
   drawings compose `selectTriggerVariants({ state: "default" })` and the same
   `VIEW_PILL_SKIN` below; the static one adds `cursor-default` and withholds
   the hover, and that is the whole of the difference in the class list. A
   one-view toolbar and a two-view toolbar on the same screen therefore sit on
   the same baseline with the same pill height by construction, not by two
   people typing 40 twice. Measured side by side in `verify/toolbar-trio`.

   ─────────────────────────────────────────────────────────────────────────
   D7-5 IS RULED: REMEMBERED, PER PERSON. THIS FILE STILL STORES NOTHING.
   ─────────────────────────────────────────────────────────────────────────
   CH27's closing paragraph names "the saved switch between calendar and
   table" as one of five rules the artifact itself says it still owes. It was
   OPEN.md §C21 item 5 and decision D7-5. It is answered.

   Client, 2026-08-24, verbatim: **"no. this is individual"**, to *"when you
   switch your view, should a colleague's screen change too?"*. That is
   option B — the choice is REMEMBERED and it is PER PERSON. It follows the
   person who made it; no other screen moves. A reader who has never chosen
   gets the page's recommendation, which is **table-first**. Register row 69.

   THE CONTROL IS STILL CONTROLLED ONLY, AND THAT IS NOW A DECISION RATHER
   THAN A GAP. "Remembered, per person" names a PERSON and a PLACE TO PUT
   THINGS, and a design system vendored into two Next.js apps owns neither.
   Reaching for `localStorage` here would give an app that already keeps user
   preferences on its own server two stores answering one question, with the
   kit's winning every first paint. So `value` is required, there is no
   `defaultValue` and there is no storage in this file.

   WHAT THE KIT SHIPS INSTEAD, and it is the whole of the ruling:

     · THE CONTRACT. `value` in, `onValueChange` out — see both props below.
       The application owns the store and it must be keyed by the PERSON,
       never by the workspace or the team. That is the word "individual".
     · THE FIRST-RUN DEFAULT. `views[0]`, and the rule given to routes is
       that the TABLE GOES FIRST. The kit cannot check this — which of a
       route's views is the table is that route's vocabulary — so it is
       written down in three places rather than enforced in one.
     · AN OPTIONAL HOOK, `useRememberedView` in `use-remembered-view.ts`,
       for an app that has nothing better. It keeps the choice in one browser
       profile, which is one person. An app with a real per-user preference
       store should not import it.

   THE LAW THIS FILE OBEYS
   · The order is the frame's, not this file's. This control knows nothing
     about where it stands.
   · Mango appears nowhere. Choosing a view is not the screen's one action.
   · Focus is one global rule (tokens.css §8). Nothing here draws a ring.
   · Disabled is a fill and an ink, never an opacity — `SelectTrigger`'s own.
   · Every user-facing string is a prop with a default.
   · No token is added. Every value here already exists.

   RENDERING CONTEXT
   `"use client"`. `Select` is a client component and this file passes it a
   handler.
   ========================================================================= */

import * as React from "react";

import { cn } from "../../lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  selectTriggerVariants,
} from "../select/select";
import { SquaresFour } from "../../foundations/icons";

/* THE PLACEHOLDER GLYPH, AND IT IS ONLY THAT.

   Client, 2026-09-02: *"we will map this later, so far put a random icon"*.
   `SquaresFour` is the kit's most view-shaped neutral and it is drawn for EVERY
   view until a mapping arrives, on purpose: one glyph repeated down the
   toolbar reads as "not yet assigned", where four different glyphs invented
   here would read as a decided mapping and would have to be un-decided later.
   The mapping is product vocabulary — which body is the table, which is the
   board, which is the calendar — and inventing that is a thing this project
   has already been corrected for. See `CollectionViewOption.icon`. */
const PLACEHOLDER_VIEW_ICON = <SquaresFour size={16} />;

/* ============================================================================
   THE PILL'S SKIN — ONE COPY, WORN BY BOTH DRAWINGS.

   The client's 2026-09-06 ruling is a statement about SAMENESS: the one-view
   pill "looks exactly like if it was selected". A claim like that cannot be
   kept by two class lists that happen to agree today — the last time this
   toolbar moved, `SortControl` and `ViewSwitch` drifted apart on exactly this
   list and it took `verify/toolbar-trio` to find it. So there is one list,
   and "exactly" is true by construction rather than by review.

   What this changes about `SelectTrigger`, and nothing else. Everything
   unlisted — the pill radius, the 18 of inline padding, the `gap-2`, the 14
   type step, the truncation rules, the open ink — is `select.tsx`'s and is
   deliberately not restated.

     · ALIGNMENT. `justify-start`. The base is `justify-between`, which is
       right for a field holding [value, caret] and wrong for a pill holding
       [glyph, label]: between would push the two to opposite ends of the pill
       instead of setting the glyph beside the word. `SortControl`'s field
       needs no such override — it has one child left, and one child starts at
       the start.
     · WIDTH. `w-auto`: the pill is as wide as the view's name, not a form
       field filling a column. `SortControl` makes the same change for the
       same reason.
     · HEIGHT. 40, `--control-height-button` — the standing control height,
       and what the toolbar's other pills are. The 44 is a FORM field's and
       this is not one.
     · FILL AND NO HAIRLINE. CH19 draws the search pill with `inset 0 0 0 1px
       var(--hair)` and this pill with none, in the same row.
       `--btn-secondary-fill` is the `Export` pill's fill and the panel
       re-resolves it to off-beige, which is the chapter's `var(--card)`
       exactly. `shadow-none` drops only the RESTING edge; `select.tsx`'s
       focus and open rules are variant-prefixed and survive, so CH09's "the
       hairline goes to ink" still happens while the list is open — which is
       the whole of the affordance on a control with no resting edge.
     · WEIGHT. 500, which is what both drawings of the artifact write on this
       pill. `SelectTrigger`'s own base is 300, so it has to be said here;
       `button.tsx` already ships 500, so the neighbouring pills match rather
       than contrast. See the header.

   THE HOVER IS NOT IN HERE, AND THAT IS THE POINT OF THE SPLIT. It is the one
   resting-state rule the two drawings must NOT share: a label that lightens
   under the cursor is a control saying "press me" about nothing. The
   interactive branch adds it below; the static one does not, and cannot
   acquire it by accident from a shared string.
   ========================================================================= */
const VIEW_PILL_SKIN = [
  "w-auto min-w-0 h-[var(--control-height-button)] justify-start",
  "shadow-none bg-[var(--btn-secondary-fill)] text-[var(--btn-secondary-label)]",
  "font-[var(--font-weight-medium)]",
];

/**
 * The view's glyph, leading, inside the pill — client, 2026-09-02.
 *
 * ONE COMPONENT FOR BOTH DRAWINGS, for the same reason the skin is one list:
 * the ruling is about the two pills being indistinguishable, and a glyph box
 * written twice is a glyph box that can differ once.
 *
 * Sized from `--icon-16` on the box AND on whatever the call site passed, so a
 * mapped icon that forgot its `size` still lands at the kit's 16 rather than
 * at an SVG's own 24. Ink is the cva's `[&_svg]:text-ink-secondary`, which is
 * where the caret's colour came from and is why the disabled skin still
 * reaches it on the interactive pill.
 *
 * `aria-hidden` in both cases, and for the same reason in both: the pill's
 * WORDS already say which view this is. On the trigger the name comes from
 * `aria-label` plus `SelectValue`; on the static label it comes from the
 * `sr-only` span plus the label text. Either way the glyph is a third telling
 * of a fact already told twice, and a screen reader must not read it.
 */
function ViewGlyph({ icon }: { icon: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      data-slot="view-switch-icon"
      className={cn(
        "inline-flex size-[var(--icon-16)] shrink-0 items-center justify-center",
        "[&_svg]:size-[var(--icon-16)]",
      )}
    >
      {icon}
    </span>
  );
}

export interface CollectionViewOption {
  /** Stable key, passed back to `onValueChange`. */
  value: string;
  /**
   * What the pill and the row say. The artifact writes `Board` on an
   * assembled screen and `Board view` in the catalogue — both are just this
   * string, and neither is a name this file invents. Translatable at the call
   * site, where the data is.
   */
  label: string;
  /**
   * The glyph that stands for THIS view, drawn leading the label inside the
   * pill when this is the current view.
   *
   * **THE MAPPING IS NOT MADE YET AND IT IS NOT THIS FILE'S.** Client,
   * 2026-09-02, verbatim: *"add an icon inside tha pill that represents the
   * view (we will map this later, so far put a random icon)"*. Until she maps
   * them, every view that leaves this undefined falls back to the SAME
   * placeholder (`SquaresFour`) — deliberately, so an unmapped toolbar reads as
   * unmapped rather than as a mapping someone here chose.
   *
   * It is per-VIEW rather than one icon on the control because that is what
   * "represents the view" means: the glyph has to change when the body does.
   * So the mapping, when it comes, is data at the call site and no component
   * changes —
   *
   * ```tsx
   * const VIEWS = [
   *   { value: "table",    label: "Table",    icon: <Table2Columns size={16} /> },
   *   { value: "board",    label: "Board",    icon: <ViewColumns3 size={16} /> },
   *   { value: "calendar", label: "Calendar", icon: <Calendar size={16} /> },
   * ];
   * ```
   *
   * — any of the kit's glyphs, at the 16 delivery size, which resolves to
   * `--icon-16` through `icon-base.tsx` rather than to a literal. The names
   * above are an EXAMPLE of the shape, not a proposal for the mapping.
   */
  icon?: React.ReactNode;
  /** Offered but not available right now. A fill and an ink, never an opacity. */
  disabled?: boolean;
}

export interface ViewSwitchProps
  extends Omit<
    React.ComponentPropsWithoutRef<"button">,
    "onChange" | "value" | "defaultValue" | "children"
  > {
  /**
   * The bodies THIS collection offers. Required, and never defaulted:
   * CH27.28 makes the set per-collection data ("Gallery … is never offered
   * for tickets, accounts or sprints").
   *
   * **THE LENGTH CHOOSES THE DRAWING.** Two or more is the dropdown. Exactly
   * ONE is the same pill drawn as a LABEL — no dropdown, not clickable, not
   * in the tab order (client, 2026-09-06, so the toolbar reads the same on
   * every screen). NONE draws nothing at all.
   *
   * **PUT THE TABLE FIRST.** `views[0]` is the first-run view for a reader
   * who has never chosen — ruling D7-5's table-first recommendation — and
   * nothing in the kit can check which entry is the table.
   */
  views: CollectionViewOption[];
  /**
   * The body on screen. CONTROLLED ONLY, and it stays that way now D7-5 is
   * ruled — see the header. The choice is remembered PER PERSON, and the
   * store that remembers it is the application's: read it into this prop,
   * write it back from `onValueChange`. A store keyed by anything shared —
   * the workspace, the team, the account — would move a colleague's screen,
   * which is the thing the client said no to. `useRememberedView` is there
   * for an app with nothing better.
   */
  value: string;
  /**
   * The reader picked a different body. This is where the choice is written
   * back to whatever remembers it for this one person.
   */
  onValueChange?: (value: string) => void;
  /**
   * What a screen reader hears. The artifact draws no visible label on this
   * pill — the pill's own text is the current view — so the control's name is
   * given here rather than rendered.
   *
   * IT IS SPOKEN IN BOTH DRAWINGS AND CARRIED DIFFERENTLY IN EACH. With two
   * or more views it is the trigger's `aria-label`. With exactly one it is
   * `sr-only` TEXT, because `aria-label` on a roleless `<span>` is not a
   * reliable naming target — see the header. Either way the reading is
   * "{label}, {the view's name}".
   */
  label?: string;
  /**
   * The whole control is unavailable.
   *
   * IGNORED WHEN THERE IS EXACTLY ONE VIEW. That drawing is a label and has
   * no action to withhold; dimming it would announce the body you are
   * currently looking at as unavailable, which is not true and not useful.
   */
  disabled?: boolean;
}

/**
 * The toolbar's view switcher: one paper pill naming the current body.
 *
 * TEN STATES
 *  1. default        — a paper pill: the current view's glyph, then its name
 *                      at weight 500. NO caret, and the glyph is a
 *                      PLACEHOLDER — both client, 2026-09-02, see the header.
 *                      CH19 and CH27.24 draw the same pill otherwise.
 *  2. hover          — the secondary button's own wash,
 *                      `--btn-secondary-hover`. Same as the `Export` pill
 *                      standing beside it, because it is the same skin. The
 *                      ONE-VIEW label has none — nothing responds, so nothing
 *                      is promised.
 *  3. focus-visible  — NOT here. tokens.css §8 rings every control at once,
 *                      at the control's own radius. The one-view label is not
 *                      focusable and is not in the tab order, so it is never
 *                      ringed.
 *  4. active/pressed — not drawn. Opening a picker IS the acknowledgement,
 *                      and the pill would nudge out from under the list.
 *  5. disabled       — a fill and an ink, `SelectTrigger`'s own, never an
 *                      opacity. Also per option, via `views[].disabled`. The
 *                      ONE-VIEW label ignores `disabled`: there is no action
 *                      to withhold, and dimming a fact would say the view is
 *                      unavailable when it is the view you are looking at.
 *  6. loading        — does not apply. The set of views a collection offers
 *                      is a fact about the collection, known before its rows
 *                      arrive; a busy switcher would be a spinner over a
 *                      list that was never in flight.
 *  7. empty          — ZERO views renders NOTHING; there is no view to name
 *                      and the only word a pill could show is one this file
 *                      invented. ONE view draws the pill exactly as the
 *                      selected trigger draws it, as a LABEL rather than a
 *                      control — client, 2026-09-06, so the toolbar reads the
 *                      same on every screen. See the header.
 *  8. error          — does not apply. Nothing here fetches.
 *  9. selected       — the current view. It is the pill's own label AND the
 *                      pill's own glyph, and `SelectItem` draws the tick on
 *                      the open row.
 * 10. read-only      — a collection whose body may not be swapped is passed
 *                      one view, so state 7 already covers it — and since
 *                      2026-09-06 that case DRAWS: the pill names the body
 *                      you are in and cannot be operated. Nothing is dimmed
 *                      to say so, because dimming is how this kit says
 *                      "later" and there is no later here.
 *
 * THREE BREAKPOINTS
 *  The pill is the same control at every width — it is one of the two things
 *  the artifact's narrow toolbar keeps ("the toolbar collapses to one field
 *  or one select", INVENTORY-3; 27.24's narrow board is "a single white
 *  select field"). It shrinks rather than wraps: `min-w-0` on the trigger and
 *  `SelectTrigger`'s own truncation keep a long view name inside the pill
 *  instead of pushing the toolbar past the panel. The one-view LABEL inherits
 *  both from the same class list, so the narrow toolbar behaves identically
 *  whichever of the two it is holding — which is the whole point of the
 *  2026-09-06 ruling and would be lost if the label were laid out by hand.
 *
 * RTL — LTR only by client ruling. Logical properties throughout.
 */
const ViewSwitch = React.forwardRef<HTMLButtonElement, ViewSwitchProps>(
  ({ className, views, value, onValueChange, label = "View", disabled, ...props }, ref) => {
    /* STATE 7, FIRST HALF. ZERO VIEWS IS STILL NOTHING, and it is the one
       case the 2026-09-06 ruling does not reach: "when there is no other
       option, so there is only one" is a sentence about ONE. With none, the
       pill would have to name a view that does not exist, and the only word
       available would be one this file invented — which is the thing this
       file refuses to do everywhere else (see `views`). An absent third zone
       is not a toolbar variation; it is an absence of data. */
    if (views.length === 0) return null;

    /* The view ON SCREEN, looked up from `value` rather than held in state —
       the pill has no memory of its own and `value` is the only truth about
       which body is showing (see the prop). An unmapped view falls back to
       the placeholder glyph, which is the whole toolbar today. */
    const current = views.find((v) => v.value === value);
    const currentIcon = current?.icon ?? PLACEHOLDER_VIEW_ICON;

    /* STATE 7, SECOND HALF — ONE VIEW IS A LABEL. Client, 2026-09-06; the
       argument, the semantics and the screen-reader reading are all in the
       header and are not repeated here.

       IT FALLS BACK TO `views[0]` WHEN `value` MATCHES NOTHING, where the
       interactive branch would simply show a placeholder. With one view there
       is exactly one true answer to "which body am I looking at", so a
       `value` naming something else is a call site's bug — one that used to
       be invisible, because this branch drew nothing at all — and a pill left
       empty by it would be a worse toolbar than a pill naming the only view
       there is. The interactive branch cannot make the same fallback: there,
       `value` really is the question.

       `ref` IS NOT FORWARDED HERE, ON PURPOSE. It is typed
       `HTMLButtonElement` because the two-view drawing is a button, and this
       one is a `<span>` that can be neither focused nor clicked — a handle on
       it could only be used to do something this element has just refused to
       do. A caller who wants to measure the pill can find it by its own
       `data-slot`.

       `disabled` IS IGNORED HERE, and state 5 says why: there is no action to
       withhold, and dimming a fact would announce the view you are looking at
       as unavailable. */
    if (views.length === 1) {
      const only = current ?? views[0];

      return (
        <span
          data-slot="view-switch-static"
          className={cn(
            /* THE SAME GEOMETRY, FROM THE SAME PLACE. Composing the cva is
               what makes "looks exactly like if it was selected" a fact about
               one class list rather than a claim about two.

               Its `disabled:`, `enabled:focus:` and `enabled:data-[state=open]:`
               rules ride along and are INERT, not overlooked: `:enabled` and
               `:disabled` match form elements only, and a `<span>` is not
               one, so none of them can ever apply. Hand-stripping them would
               mean maintaining a second transcription of the height, the
               padding, the radius, the gap, the type step and the truncation
               rules — which is the exact drift this shares its way out of.

               `cursor-default` is the one addition, and it is the whole of
               the pointer's story: the arrow does not become a hand, so a
               reader with a mouse learns there is nothing here to press
               before they press it. `cursor-pointer` in the cva's base is
               replaced rather than fought — same tailwind-merge group. */
            selectTriggerVariants({ state: "default" }),
            VIEW_PILL_SKIN,
            "cursor-default",
            className,
          )}
          {...(props as React.ComponentPropsWithoutRef<"span">)}
        >
          {/* THE CONTROL'S NAME, SPOKEN RATHER THAN LABELLED. On the trigger
              this word is `aria-label`; on a roleless `<span>` `aria-label`
              is not a reliable naming target, so it is real text that is not
              painted. The colon is a pause, not a word — see the header. */}
          <span className="sr-only">{label}: </span>
          <ViewGlyph icon={only.icon ?? PLACEHOLDER_VIEW_ICON} />
          {/* The view's name, in the trigger's own place for it, so the cva's
              `[&>span]:truncate` reaches this the way it reaches
              `SelectValue`. A long view name shrinks inside the pill here
              too, rather than pushing the toolbar past the panel. */}
          <span data-slot="view-switch-label">{only.label}</span>
        </span>
      );
    }

    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          ref={ref}
          data-slot="view-switch"
          aria-label={label}
          /* NO CARET — client, 2026-09-02: "same on views - rmeove the
             chevron". See the header for why the opt-out is a prop on
             `SelectTrigger` and not a class here. */
          hideChevron
          className={cn(
            /* THE SHARED SKIN — see `VIEW_PILL_SKIN` above for what each line
               changes about `SelectTrigger` and why. It is a constant rather
               than a literal here because the one-view LABEL has to wear the
               identical list; the client's 2026-09-06 ruling is a statement
               about the two being indistinguishable, and one list is the only
               way to keep it true without a reviewer. */
            VIEW_PILL_SKIN,
            /* THE HOVER, AND IT IS THIS BRANCH'S ALONE. `--btn-secondary-hover`
               is the `Export` pill's own wash, because this is the `Export`
               pill's own skin. The static label withholds it: it responds to
               nothing, so it must promise nothing. */
            "enabled:hover:bg-[var(--btn-secondary-hover)]",
            className,
          )}
          {...props}
        >
          <ViewGlyph icon={currentIcon} />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {/* THE OPEN ROWS CARRY THE SAME GLYPH THE TRIGGER DOES — CLIENT,
              2026-09-03: "when I open the dropdown, apart from the text, I
              also see the icon." The trigger has shown a leading icon since
              2026-09-02; the list this pill opens did not, which was the gap
              — `SelectItem` has carried an `icon` prop since ch10 for exactly
              this ("a module is identified by its icon, in the rail, on the
              record AND in a picker"), and it was simply never passed here.

              ONE SOURCE OF TRUTH, NOT A SECOND MAPPING. `view.icon` is the
              same field `currentIcon` reads above, with the same placeholder
              fallback, so the row a reader opens always shows the glyph the
              pill will collapse back to once they pick it — no icon is
              invented per row and none is looked up twice.

              `SelectItem` already draws this `aria-hidden`, at `--icon-16`,
              beside — not instead of — the `ItemIndicator` tick, so the
              row's accessible name stays `view.label` and the selection mark
              this list already drew is untouched. */}
          {views.map((view) => (
            <SelectItem
              key={view.value}
              value={view.value}
              disabled={view.disabled}
              icon={view.icon ?? PLACEHOLDER_VIEW_ICON}
            >
              {view.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  },
);

ViewSwitch.displayName = "ViewSwitch";

export { ViewSwitch };
