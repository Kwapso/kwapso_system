/* ============================================================================
   BreadcrumbFolders — the trail, drawn as a strip of folder tabs (0 direct
   call sites yet; the node a shell's `breadcrumb` slot is handed).

   THE CLIENT RULING THIS FILE IS, 2026-09-02
   Two halves, and the second is the reason the first has anywhere to live:

     · "REUSE THE EXISTING FOLDER TABS WITHOUT CHANGING ANYTHING ON THE SHAPE.
       Each path level is a folder tab, stacked left to right. Every tab
       before the last is the inactive color; the last (current location) is
       same color as the big content card in the middle, the main color — the
       same hover, and font weight rules apply as they already exist. Deeper
       paths just add more tabs."
     · "the whole concept of folders as tabs gets killed. All the current
       folders as tabs we have will become line tabs. Completely kill and
       remove folder tabs… I don't want any dead body around… the only tabs
       that we will have are the line tabs because folders will only be used
       for the breadcrumbs."

   THE FOLDER TAB **VARIANT** DIED; THE FOLDER **SHAPE** LIVES. `TabsVariant`
   is line-only from v1.2.28 and `tabs.tsx` no longer imports `FolderShape` at
   all. The silhouette did not change by one control point — `folder.tsx` is
   untouched — and this file is now its ONE consumer of the `lip` crop. The
   tab SKIN below (height, insets, type step, weights, hover, the strip's
   overlap) is `tabs.tsx`'s retired `folder` skin, moved here verbatim rather
   than re-derived, which is what "reuse without changing anything" means when
   the file it used to live in is being emptied.

   THE PHONE DOES NOT GET TABS AT ALL, 2026-09-04, CLIENT-RULED, verbatim:
   "in monile, lets use normal breadcrumbs (like they ware before, jhust teh
   text)". Below `md` this component renders the ORDINARY trail — words and
   separators, the way the product drew it before the folder shape arrived —
   and at `md` and above it renders the strip below, unchanged to the pixel.
   The whole mechanism is one display utility per drawing; it is argued at
   length at `TEXT_TRAIL` and `STRIP_ONLY`, including what the swap costs, what
   it deliberately does NOT do, and why the phone's trail is
   `breadcrumbs.tsx`'s own component rather than a second text renderer living
   here.

   THE STRIP IS ALSO A WORKSPACE TAB SET, 2026-09-06, AND THAT IS TWO PROPS
   RATHER THAN A SECOND COMPONENT. The client, on the live product: "all tabs
   i open stay open unless i close them", with "a x icon on the tabs to close
   them" — Chrome, in other words. The app had already built its half of it
   against this component, and two things this file could not express were
   blocking it. Both are now here, both are opt-in, and a call site that
   passes neither renders the identical DOM it rendered yesterday:

     · `onClose` — a REAL `<button>`, a SIBLING of the crumb's own link
       inside the `<li>`, never a descendant of it. The app's stopgap had to
       ride the × inside `label` as a `<span data-tab-close>` caught by an
       `onClickCapture`, because interactive content inside `BreadcrumbLink`'s
       `<a>` is invalid HTML — and the cost of that workaround was the whole
       reason this prop exists: the span was `aria-hidden`, so A KEYBOARD OR
       SCREEN-READER USER COULD NOT CLOSE A TAB AT ALL. An affordance
       assistive technology cannot operate must not be promised to it, so the
       app was right to hide it and wrong to have to. See `TAB_CLOSE`.
     · `activeIndex` — WHICH tab is live, decoupled from WHERE it sits. Until
       today the live paper, `aria-current="page"` and the z-order that lifts
       the live tab were all wired to the LAST item, which forced the app to
       keep its tab set ordered most-recently-activated-last. Tabs therefore
       re-ordered themselves under the reader's cursor on every switch, which
       is the opposite of the thing being copied: in Chrome a tab stays where
       it was opened. Defaulting to the last item is exactly today's
       behaviour, so a trail never notices.

   A TRAIL AND A TAB SET ARE THE SAME DRAWING AND NOT THE SAME THING, and
   where they disagree this file follows the ONE that is being asked for. A
   trail is a path: its crumbs are ancestors, its middle is foldable because
   nobody reads the middle of a path, and its last crumb is where you are. A
   tab set is a set of peers: every member was opened on purpose, none of them
   is an ancestor of any other, and the reader must be able to shut each one.
   `onClose` is what tells the two apart — it is the only prop that could,
   because it is the only one a trail can never want — and it is read as that
   signal in exactly three places, each argued at its own site: the fold
   (`fold()`), the phone gate (`textTrail`), and nothing else.

   WHY IT LIVES IN `breadcrumbs/` AND NOT IN `breadcrumb/`
   `breadcrumb/` is the COMPOSABLE form and its own header states its job in a
   sentence this component fails: "It elides nothing — it renders exactly the
   crumbs it was written with." A strip that folds its own middle at five
   levels is not that. `breadcrumbs/` is the ARRAY form, and its job is
   "an array in, the finished trail out, and it owns the rule about when a
   deep trail collapses" — which is exactly this component, in a second
   drawing. So the fold rule this file needs is not re-invented: `collapse()`
   already lives one file away, in `breadcrumbs.tsx`, and is imported.

   A second file in an existing folder also costs the demo nothing:
   `demo/content.tsx`'s guard is one folder → one slug, and `gen-states.mjs`
   keys its record on the folder, so both this file's TEN STATES blocks land
   under `breadcrumbs` alongside the one that is already there. A new
   `components/breadcrumb-folder/` would have owed the demo a section.

   DESIGN SOURCE
   The SHAPE is kit chapter 14 through `folder/folder.tsx`, unchanged. The tab
   GEOMETRY is chapters 24.3 and 24.6 (47.5 tall, `--space-1` apart, pulled
   down under the panel by `--folder-tab-overlap`), through the skin this file
   inherited. The trail's SEMANTICS — the landmark, the `<ol>`, the crumb, the
   current page, the elision — are `breadcrumb/breadcrumb.tsx`'s parts, reused
   rather than restated, so a screen reader hears the same trail it heard when
   the trail was a line of text.

   THE LAW THIS FILE OBEYS
   · TWO PAPERS, AND THEY ARE RESOLVED ON THE LANDMARK. The live tab is the
     content card's own fill; every tab before it is one step off it, in the
     direction the palette already steps. Both are custom properties declared
     on the `<nav>`, for the reason `tabs.tsx` gave for declaring the folder
     tab's pair on `Tabs` rather than on the trigger (TAB-C1): a caller that
     rebinds `--surface-panel` around the strip must not be able to make the
     live tab and the card disagree.
   · THE LEADING TAB'S TOP-LEFT CORNER IS ROUNDED, LIKE EVERY OTHER TAB'S.
     REVERSED 2026-09-03, CLIENT-RULED, ON THE LIVE PRODUCT: "When I am on the
     left tab, the top corner needs to be more rounded. That's not how the
     tabs are, so go and fix it." Until today this file laid a
     `--folder-radius-lip` square of the shape's own `currentColor` over the
     leading tab's own arc — `FolderShape`'s rounded top-left corner is fixed
     at 6.6 brand units at every size and is not a prop, so the corner was
     FILLED IN rather than redrawn — to square the leading tab off to match
     the card's own squared corner underneath it. THE PATCH IS DELETED, not
     reduced: a tab is meant to look like a tab, and every other tab in the
     strip already stands on its own rounded shoulder; the leading one is no
     longer the exception. `CrumbShape` no longer takes a `lead` flag and
     draws the identical one element at every position.

     THE CARD'S OWN SQUARED CORNER DOES NOT FOLLOW IT BACK. The two squares
     were introduced together on 2026-09-02, but they were never one
     mechanism solving one problem twice — `screen-shell.tsx`'s own header
     has the geometry: the card's radius (24) is bigger than the strip's own
     overlap (17.02), so an un-squared card corner shows roughly 7 of its own
     24 as a curve peeking out below the tab's dead-straight left edge,
     whatever that tab's own top corner is doing. Un-squaring the tab removes
     no part of that collision, so the card's corner stays square on its own
     merits; see that file for the argument and the measurement.
   · Hover and weight are the tab's own, unchanged: an INK move to
     `--foreground` plus a preview of the active weight. No fill move, no
     opacity, no underline — the trail's own link hover underlines, and that
     is suppressed here because a tab is a box and `.kw-link` "occupies no
     box".
   · No transition is written. `tabs.tsx` put `motion-tab-trigger` on the
     folder shape because a trigger's fill crossfaded between two papers on
     selection; nothing here ever moves a fill — a crumb is where you are, not
     something you select — so the class would time a change that cannot
     happen. The LABEL still transitions, on `BreadcrumbLink`'s own
     `--duration-colour`.
   · Every colour and measure is a token. The only radius on this component is
     the folder silhouette's own; there is no exception left on it as of
     2026-09-03 — see the leading-tab bullet above.
   · Focus is ONE global rule (tokens.css §8). No ring here, no
     `outline: none`; the strip pays four pixels of block-start padding and
     takes them straight back as a negative margin so its own `overflow`
     cannot clip a ring off the top of a tab.
   · Every user-facing string is a prop with a default.

   RTL — LTR ONLY, and that is inherited rather than chosen. `FolderShape`'s
   own header puts the silhouette out of scope for RTL ("mirroring it needs a
   kit ruling on whether the brand shape flips at all"), and a strip made of
   that shape cannot be more mirrored than the shape is. Everything this file
   writes is logical anyway, so the day the shape gets its ruling the strip
   follows it for free.

   RENDERING CONTEXT
   `"use client"`. `FolderShape` measures its own box and `DropdownMenu` is a
   Radix overlay; both are client components, and a trail that folds has to be
   able to open what it folded.
   ========================================================================= */

"use client";

import * as React from "react";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "../breadcrumb/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu/dropdown-menu";
import { FolderShape } from "../folder/folder";
import { X } from "../../foundations/icons";
import { cn } from "../../lib/utils";
import { Breadcrumbs, collapse, type BreadcrumbsItem, type Rendered } from "./breadcrumbs";

/* ----------------------------------------------------------------------------
   The strip.

   `flex items-end` and the two block-axis margins are 24.3/24.6's own folder
   strip, moved off `tabs.tsx`'s `LIST_SKIN.folder`:

     · `mb-[calc(var(--folder-tab-overlap)*-1)]` is the whole attachment
       mechanic. The strip ends 17.02 ABOVE where it appears to, so whatever
       is drawn next — the shell's card — rides up over the tabs' cut feet.
       The live tab is the card's own paper, so the join has no edge to show;
       the rest tabs are a different paper and are simply clipped, which is
       ch14's "clipped by the card edge", drawn.
     · `pt-1` + `mt-[calc(var(--space-1)*-1)]` is the focus ring's room.
       `overflow-x: auto` computes `overflow-y` to `auto` as well, and a tab
       fills the strip's height exactly, so without four pixels here the ring
       would be clipped off a tab's top. The negative margin gives the four
       pixels straight back, so the strip occupies what it did before.
     · The strip SCROLLS rather than wraps, which is the opposite of
       `BreadcrumbList`'s own answer and is deliberate: a wrapped folder strip
       would put a second row of tabs' feet through the first row's shoulders,
       and only the bottom row could attach to the card. The crumb that must
       never be lost — the current location — is the LAST one, which is the
       one an inline scroller keeps in view when the strip is scrolled to its
       end. The fold is what keeps a deep trail short; scrolling is the
       fallback for one very long label.

   NO `gap-1` ANY MORE — REMOVED 17 Sep 2026, HER FOURTH REPORT ON THIS EXACT
   SHAPE, verbatim: "The inactives on the assistant are overlapping, so
   they're on top of the active tab, and that's incorrect. They should be
   behind." Two live-staging screenshots (`live-assistant-boundary-zoom.png`,
   `live-content-strip-1440.png`) measured what "overlapping" actually means
   here: every tab is a rounded top-left corner and a sloping right shoulder,
   the silhouette never overhangs its own box, and `gap-1` (4px) used to hold
   consecutive tabs apart so their boxes never shared a pixel at rest. That is
   the opposite of a Chrome tab strip, where consecutive tabs NEST — the next
   tab's rounded corner sits UNDER the previous tab's shoulder, by exactly the
   shoulder's own run. A 4px gap cannot produce that: it is smaller than the
   shoulder (`--folder-shoulder`, 29.52px) in every direction, so the two
   shapes either float apart (gap positive) or, the instant a caller's own
   layout tightened it even slightly, the FOLLOWING tab's own square-cornered
   box-before-its-curve-renders edge would land in front of the previous
   tab's shoulder — which reads exactly as "the inactive is on top", her
   words, for either sibling. The fix is not a smaller gap; it is no gap and
   a real, deliberate overlap of exactly the shoulder's own width, with
   z-index — not proximity — deciding who paints on top. See the per-`<li>`
   `ms-[calc(var(--folder-shoulder)*-1)]` below (rendered in the `.map`, not
   here, because the FIRST tab in the strip must not pull itself left off the
   strip's own edge) and `restZIndex`'s own comment for the stacking half of
   this.

   The three classes it OVERRIDES on `BreadcrumbList` are named here so the
   override is legible rather than accidental: `flex-wrap` -> `flex-nowrap`,
   `items-center` -> `items-end` (a tab stands on its feet), `gap-1.5` ->
   no gap at all (the overlap above replaces the seam). `text-caption`
   survives the merge and is the tab's own type step, so it is not restated.

   REVERSED 2026-09-03, SAME DAY AS THE CHANGE ITSELF. A same-day pass tried
   `w-full` on the strip + `grow` on the live tab, reasoning that a short
   trail stopping inside the card's own right edge should be filled by
   stretching the last tab to the container's width. The client's own
   correction: that changed the SHAPE of every tab in the app, live tab
   included, from one sized to its own label into one that stretches to
   fill whatever room is left, text pushed off-centre — "bring the main
   content folder breadcrumbs exactly as it was before! it was already
   correct." A tab is sized to its content again, full stop; the "reach the
   container" idea is dropped rather than solved a different way.
   -------------------------------------------------------------------------- */
/* THE STRIP NEVER DRAWS ITS OWN SCROLLBAR — client, 17 Sep 2026, verbatim:
   "there is a certain horizontal scroll. Kill that." `[scrollbar-width:none]`
   is Firefox's own property and the ONLY one some engines honour; a WebKit-
   family renderer that ignores it (Safari, and an older Chromium — the exact
   two this file's own scrollbar note already named) falls back to drawing
   the ordinary bar the moment the strip overflows, which is the bar the
   client saw. `[&::-webkit-scrollbar]:hidden` (`display: none` on the
   pseudo-element) plus `:h-0` (belt-and-suspenders — a renderer that still
   reserves the scrollbar's own gutter height even once it is display:none
   would otherwise leave the four-pixel band under the tabs the strip's own
   `pt-1`/negative-margin pair above is not accounting for) close the two
   remaining engines. Wheel and drag scrolling are untouched — hiding the bar
   is a paint change, not an `overflow` one, and `overflow-x-auto` still
   reads its own value below. */
/* `isolate` — 17 Sep 2026, ALONGSIDE `restZIndex`'s NEGATIVE integers, and
   load-bearing rather than decorative. MEASURED, not assumed: without it, a
   tab whose `<li>` carries a NEGATIVE `z-index` (every rest tab after the
   first two — `restZIndex`'s own comment has the formula) is still drawn in
   the right PLACE but stops being clickable at all, in real Chromium — a
   pointer at the exact centre of its own box hit-tests to an ANCESTOR of
   this `<ol>` instead (confirmed: `document.elementFromPoint` at a
   `z-index: -2` tab's own centre returned this file's page-level wrapper
   `<div>`, several DOM levels up, not the tab or even the `<ol>`). This is
   what a negative `z-index` on a flex item MEANS when the flex container
   itself is not a stacking context: CSS Flexbox's own z-order rule paints
   flex items "exactly as inline blocks", and a negative z-index there does
   not mean "behind my SIBLINGS", it means "behind the nearest ANCESTOR that
   establishes a stacking context" — and an `<ol>` with `flex` and
   `overflow-x-auto` but no `position`, no `z-index` of its own and no
   `isolation` is not one, so that ancestor is whatever IS one further up
   the tree, which is the caller's own layout and not this component's to
   assume. `isolate` (`isolation: isolate`) makes THIS `<ol>` that stacking
   context, so every child's z-index — the live tab's `1`, every rest tab's
   `-position` — is compared and painted entirely inside the strip, never
   escaping to fight a caller's own unrelated content for a pixel two
   ancestors away. It costs nothing else: `isolation` does not affect
   layout, and the strip already had no `position` for anything to
   conflict with. */
/* THE OVERLAP IS GONE, 18 SEP 2026 — CLIENT RULING, VERBATIM: "the top tabs
   folder, need space betwwen tehm. right now they merge altogether." The
   17 Sep mechanism this replaces (`TAB_OVERLAP_MARGIN` — a negative margin
   pulling every tab after the first left by exactly `--folder-shoulder`, so
   consecutive tabs NESTED, Chrome-style, with `restZIndex` deciding who
   painted on top of the shared pixels) was itself a fix for a SMALL gap
   (`--space-1`, 4px) reading as tabs overlapping WRONG — smaller than the
   29.52px shoulder in every direction, so the shapes either floated apart or
   the following tab's square-cornered box edge landed in front of the
   previous tab's curve. Today's ruling is not "make the small gap smaller
   still" (the fix that comment already tried and rejected once) — it is the
   opposite instruction: a real, clearly visible gap, not the ambiguous
   almost-touching distance that produced the original defect. `--space-2`
   (8px) is chosen over `--space-1` (4px) for exactly that reason — more than
   double 4px, and unambiguously a gap rather than a near-miss, at every strip
   width this component ships at, measured at 1440 in `verify/tabstrip-parity`.
   `overlap == shoulder` is retired with it: two tabs never share a pixel at
   rest any more, so there is nothing at that boundary for `restZIndex` to
   adjudicate — see that function's own comment, and `measureNesting` in
   `verify/tabstrip-parity/page.tsx`, both updated to read the GAP instead of
   the retired overlap. THE ACTIVE TAB'S LIFT AND THE Z-ORDER ARE UNCHANGED —
   `restZIndex`, `TAB_LIVE`'s `z-[1]`, `isolate` and the per-`<li>` inline
   `zIndex` all stay exactly as they were: a drag still slides a tab under
   `onTabPointerMove`'s own `transform`, which still opens its own stacking
   context, so the numbers this file already writes still have somewhere to
   matter even though two tabs resting side by side no longer overlap to
   begin with. */
const STRIP = cn(
  "flex flex-nowrap items-end isolate gap-[var(--space-2)]",
  // `overflow-y-hidden` — 17 Sep 2026 evening, the same fix `tabs.tsx`'s own
  // `TabsList` took: `overflow-x` alone computes `overflow-y: auto`, and a
  // strip this shape can round 1px tall, which makes it silently vertically
  // scrollable. This strip never moves on that axis. See `tabs.tsx` and
  // `foundations/rules/check-overflow-axis.mjs`.
  "max-w-full overflow-x-auto overflow-y-hidden scroll-p-2 [scrollbar-width:none]",
  "[&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:h-0",
  "pt-1 mt-[calc(var(--space-1)*-1)]",
  "mb-[calc(var(--folder-tab-overlap)*-1)]",
);

/* ----------------------------------------------------------------------------
   `fit="shrink"` — THE STRIP FITS ITS CONTAINER INSTEAD OF OVERFLOWING IT,
   18 SEP 2026, HER THIRD REPORT ON THE SAME SCREENSHOT: "the assistant tabs
   overlap / the issue's still there", and by her own account "very tired of
   this topic". Every rect sweep that answered the first two reports measured
   TAB-TO-TAB GAPS (8px, `--space-2`, correct every time) and never asked
   whether the STRIP ITSELF fit the 380px assistant pane it was drawn in. It
   never did: `STRIP` above is every tab `shrink-0` at its own natural width,
   with "too wide" answered by scrolling the whole row — and the pinned
   trailing items, History and "+", are ordinary `<li>`s INSIDE that same
   scrolling `<ol>`, so on a narrow pane they scroll off with everything
   else. Reported over a screenshot of the assistant pane at its fixed
   380px, three open conversations: "Conversation ×", "Everything ×", a
   third tab cut off mid-label by the pane's own right edge, and both
   History and "+" pushed out of view entirely — not overlapping,
   OVERFLOWING, which is a different defect than the one three fixes
   already answered.

   `fit="natural"` (the default) is BYTE-IDENTICAL to the strip before this
   prop existed: one `<ol>`, every tab `shrink-0`, the whole row scrolls, and
   `STRIP` above is untouched. Nothing changes for a caller that never passes
   `fit`.

   `fit="shrink"` SPLITS THE STRIP'S DRAWING IN TWO, AND ONLY WHEN `onClose`
   IS ALSO GIVEN — a fold trail has no trailing pinned run to protect, and
   `onClose`'s own doc already establishes that a tab set never folds. The
   TRAILING RUN of `closable: false` items (History, "+" — the exact shape
   both `AgentTabStrip` and the workspace content strip already build, see
   `app-shell.tsx`'s own `WORKSPACE_NEW_TAB_HREF` item) renders in a SECOND
   `<ol>`, a plain sibling flex row, `shrink-0` and always visible; every
   item BEFORE that run renders in the FIRST `<ol>`, which is what actually
   shrinks: `flex min-w-0` on the list, `flex-1 min-w-0 basis-0 max-w-max` on
   every tab in it, so a short trail's tabs sit at their own natural
   (`max-content`) width and a long one shares the room evenly, shrinking
   together down to `TAB_SHRINK_MIN_WIDTH` — roughly four characters plus
   the close × — the floor below which a label stops being readable at all.
   Below that floor the FIRST `<ol>` scrolls, exactly as the single-list
   strip always has, while the second `<ol>` — outside the scrolling box
   entirely — never moves and is never clipped.

   ONE TWO-LIST STRIP, NOT A SPLIT `<ol>`. An `<ol>`'s only valid children
   are `<li>` (plus script-supporting elements) — wrapping the trailing run
   in a `<div>` inside the SAME list is invalid markup no `data-slot` fixes.
   Two `<ol>`s, both the kit's own `BreadcrumbList`, both inside the one
   `<nav>` this file already renders, keep the landmark singular (one
   `aria-label`, read once) while giving the trailing run its own,
   unshrinking box — the same shape a real browser tab strip already uses:
   the "+" is chrome, not a list member.

   THE GAP IS SPENT THREE TIMES ON PURPOSE, NOT DRIFTED INTO. `--space-2`
   sits on the outer row (between the two lists), and again on each list
   (between the tabs inside it) — the same token everywhere, so the seam
   between the last shrinking tab and the first pinned one reads no
   differently than any other gap in the strip. */
const STRIP_SHRINK_ROW = cn(
  "flex min-w-0 items-end isolate gap-[var(--space-2)]",
  "mb-[calc(var(--folder-tab-overlap)*-1)]",
);

/* The shrinking half. `min-w-0` is the whole mechanism: without it a flex
   item's default min-width is its own content size, and a row of tabs would
   never shrink below their combined natural widths no matter how little
   room the outer row hands it — exactly the bug this prop exists to fix,
   reintroduced one level down. `pt-1`/the matching negative `mt-` and the
   scrollbar-hiding rules move here from `STRIP` rather than the outer row,
   because they exist for the element that actually carries `overflow-x-
   auto` — the ring-clipping fix and the hidden scrollbar both only mean
   anything on the box that can scroll. */
/* `isolate` — 18 SEP 2026, SAME MECHANISM AS `STRIP`'s OWN (see that class's
   comment above for the full CSS reasoning), CARRIED DOWN ONTO THIS `<ol>`
   RATHER THAN LEFT ON THE OUTER ROW. `fit="shrink"`'s split moved the tab
   tiles' negative inline `z-index` (`restZIndex`, unchanged by the split)
   onto `<li>`s living TWO stacking-context levels below `STRIP_SHRINK_ROW`
   — this `<ol>` sits between them — and `STRIP_SHRINK_ROW`'s own `isolate`
   only stops a negative-z child from escaping THAT far; it does nothing for
   a child whose nearest ancestor stacking context is still this `<ol>`, and
   this `<ol>` had no `position`, no `z-index` and no `isolation` of its
   own. MEASURED, live on staging (kwapso_system's `plus-click-check.mjs`,
   run against v1.2.125): a real pointer click centred on a scrolling tab's
   own anchor rect hit-tested to `document.elementFromPoint` returning THIS
   `<ol>` (`data-slot="breadcrumb-list"`), never the tab — the same defect
   `STRIP`'s own `isolate` comment already proved for the one-list strip,
   reproduced here because the split dropped it one level too high. Adding
   `isolate` here (matching `STRIP`'s own placement: directly on the element
   whose flex children carry the negative z-index, not on some ancestor of
   it) makes every negative-z tab in THIS list paint inside its own,
   self-contained stacking context again — above the `<ol>`'s own box,
   exactly where a click lands. */
const STRIP_SHRINK_SCROLL = cn(
  "flex min-w-0 flex-nowrap items-end isolate gap-[var(--space-2)]",
  "overflow-x-auto overflow-y-hidden scroll-p-2 [scrollbar-width:none]",
  "[&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:h-0",
  "pt-1 mt-[calc(var(--space-1)*-1)]",
);

/* The pinned half — History, "+". Never shrinks, never scrolls, always the
   strip's own trailing edge.

   `isolate` — 18 SEP 2026, THE SAME FIX AS `STRIP_SHRINK_SCROLL`'s OWN,
   ABOVE, AND THE MORE VISIBLE HALF OF IT: History and "+" are the two tiles
   `restZIndex` always assigns the MOST negative numbers to (they sit last
   in strip position), so of the two split lists this is the one where a
   real click was actually reported swallowed — Aurora's staging proof
   (`plus-click-check.mjs`) measured the "+" anchor's own rect and got this
   `<ol>` back from `elementFromPoint` at its centre, tabs-before/after
   staying 2 → 2 through a real `page.mouse.click`. Without `isolate` here,
   History's and "+"'s negative-z `<li>`s had no ancestor stacking context
   closer than `STRIP_SHRINK_ROW` — two levels up, past this `<ol>`'s own
   box — so this `<ol>`'s own in-flow, non-positioned box painted OVER them
   at that shared level, and a browser's hit-test picks the topmost paint,
   not the topmost DOM depth. Same fix, same reasoning, same placement rule
   as `STRIP`'s own comment: put `isolation: isolate` on the element whose
   children actually carry the negative z-index, not on some ancestor of
   it. */
const STRIP_SHRINK_PINNED = "flex flex-nowrap items-end isolate shrink-0 gap-[var(--space-2)]";

/* ONE TAB, IN THE SHRINKING LIST. `basis-0` + `flex-1` is "every tab starts
   from nothing and shares the room equally" — the opposite of `shrink-0`'s
   "take your content's width no matter what" — and `max-w-max`
   (`max-width: max-content`) is the ceiling that stops a short trail's tabs
   from stretching past their own label width to fill empty space: three
   short tabs in a wide pane still read as three tabs sized to their words,
   not three tabs stretched to fill it. `TAB_SHRINK_MIN_WIDTH` is the floor
   on the other end. */
const TAB_SHRINK_ITEM = "flex-1 basis-0 max-w-max";

/**
 * The floor a shrinking tab may never cross: roughly four characters of
 * label, plus the tab's own leading inset (`ps-5`, `--space-5`) and the room
 * the close × already reserves (`--folder-shoulder` + `--control-height-
 * pill` + `--space-2` — `TAB_CLOSABLE`'s own calc, read here rather than
 * re-derived). Below this a label has nothing left to say and the tab
 * should scroll rather than keep shrinking. `4ch` is a CSS length unit (the
 * advance width of the glyph "0" in the element's own font), not a guess
 * dressed as a number.
 */
const TAB_SHRINK_MIN_WIDTH =
  "min-w-[calc(4ch_+_var(--space-5)_+_var(--folder-shoulder)_+_var(--control-height-pill)_+_var(--space-2))]";

/* The anchor/button/page INSIDE a shrinking tab — TWO overrides, and the
   MEASURED reason both are needed, not one.

   `TAB`'s own base class list opens with `shrink-0` (`flex-shrink: 0`),
   which is exactly right for the NATURAL strip — every `<li>` there is
   ALSO `shrink-0`, so nothing downstream of it ever needs to give up room —
   and exactly wrong here: the `<li>` this element lives in is now the thing
   that shrinks (`TAB_SHRINK_ITEM`), but `shrink-0` on the CHILD refuses to
   follow it. Verified live in `verify/agent-tab-strip-fit/`: with only
   `min-w-0` overridden and `shrink-0` left standing, every `<li>` shrank to
   `TAB_SHRINK_MIN_WIDTH` exactly as designed while the anchor INSIDE it
   stayed at its own full content width and silently overflowed the now-
   narrower box — no ellipsis, because nothing ever asked the label to be
   narrower than its text. `shrink` (`flex-shrink: 1`) is the fix: once the
   anchor can shrink, flexbox's own shrink phase — its hypothetical size is
   `auto` here (content-based), not zero, so the shrink weighting the
   `<li>`'s `basis-0` sidesteps for ITSELF still applies normally one level
   down — brings it down to whatever room the `<li>` actually has.

   `min-w-0` is still needed beside it: `TAB`'s own
   `min-w-[var(--folder-tab-min-width)]` (128px) is the natural-width floor
   every OTHER tab still wants, and it would otherwise floor the shrink
   right where `shrink-0` used to. The TRUE floor for a shrinking tab is
   `TAB_SHRINK_MIN_WIDTH`, spent one level up on the `<li>` — this element
   has none of its own, and shrinks to match whatever the `<li>` allows.

   Both merge in AFTER `TAB` so tailwind-merge drops `TAB`'s own
   `shrink-0`/128px values rather than stacking two declarations of the
   same property. */
const TAB_SHRINK_TAB = "shrink min-w-0";

/* The label itself. `truncate` (`overflow-hidden text-ellipsis whitespace-
   nowrap`) only draws an ellipsis on a box that can actually overflow, which
   needs `min-w-0` here too — the label is itself a flex child of `TAB`'s own
   `inline-flex` row, and without this it inherits the same content-based
   minimum every other flex child starts with. */
const LABEL_SHRINK = "min-w-0 truncate";

/* ----------------------------------------------------------------------------
   THE TWO DRAWINGS AND THE ONE GATE BETWEEN THEM.

   CLIENT, 2026-09-04, verbatim: "in monile, lets use normal breadcrumbs (like
   they ware before, jhust teh text)". A phone gets the ordinary trail. Desktop
   and tablet keep the strip above, to the pixel.

   THE PHONE'S TRAIL IS `breadcrumbs.tsx`'s OWN COMPONENT, CALLED — NOT A
   SECOND TEXT RENDERER IN THIS FILE. `Breadcrumbs` is already "an array in,
   the finished trail out"; it takes the identical `BreadcrumbsItem[]` this
   component takes, and it renders the identical `breadcrumb/` parts the tabs
   render (`BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`), so the
   two drawings cannot drift in their semantics, their ink or their type step.
   It is one file away, in this same folder, for the reason that folder's own
   header gives: the two forms of one trail live together so neither can be
   re-derived by accident. `collapse()` was already reached across that seam;
   this is the second thing that is.

   THE ALTERNATIVE WAS WORKED THROUGH AND REJECTED: restyling the TAB markup
   down to plain text at `max-md` — one DOM tree, the silhouette hidden, the
   tab skin unset. It reads cheaper than it is. `BreadcrumbSeparator` has no
   place in the strip's markup at all, so the middle dot between crumbs would
   have had to be CSS generated content — a user-visible mark this file
   invents, that no translator can reach and that lands outside the
   accessibility tree, against this repo's own law that "every user-facing
   string is a prop with a default". It would also have to re-derive the wrap
   behaviour `BreadcrumbList` already ships (`flex-wrap`, which `STRIP` above
   deliberately overrides to `flex-nowrap`), keep the folder silhouette in the
   DOM purely to hide it, and unset eight tab utilities one at a time at a
   breakpoint. Two components, each drawing what it is for, is the smaller
   thing.

   THE GATE IS A DISPLAY UTILITY. NOT `matchMedia`, NOT `useSyncExternalStore`,
   NOT A `useEffect` THAT MEASURES. A JS breakpoint has no answer on the
   server, so the first paint is whichever trail the component guessed at and
   the second is the swap — a hydration mismatch on every phone, and a visible
   flash of tabs before the text on every load. CSS has the width before React
   has anything, so neither happens and there is no state here at all.

   AND IT IS `display: none`, WHICH IS THE POINT AND NOT AN IMPLEMENTATION
   DETAIL. `sr-only`, `visibility`, `opacity: 0` and a zero-size box all leave
   the hidden trail IN the accessibility tree and IN the tab order, and a
   reader would then find two breadcrumb landmarks and two "you are here"
   crumbs at every width — worse than the problem this fixes. `screen-shell.tsx`
   already settled the same question at the same breakpoint for its own
   `md:hidden` menu trigger, in its own words: "a `display: none` button is not
   merely invisible — it is out of the tab order and out of the accessibility
   tree, which is what 'genuinely unreachable' means." Measured the same way it
   measured that — by focusing every focusable in the document and asking
   `document.activeElement` who took it, never by reading `checkVisibility` —
   in `verify/crumb-mobile/`: at 380 the strip hands out no focus, at 834 and
   1440 the text trail hands out none, and exactly one landmark is painted at
   each of the three.

   `md` IS THE SHELL'S OWN BREAKPOINT AND IS NOT A NEW NUMBER. It is where
   `screen-shell.tsx` puts the rail away and stands its menu trigger up, so the
   width at which the product stops being a desktop is already written down
   once; the trail changing shape at any other number would make the phone a
   third layout. Note that the two gates cannot drift even in principle:
   font-relative units inside a media query resolve against the INITIAL
   font-size (16px), never this kit's 15px root, so both flip at 768 CSS px.

   `pb-[var(--space-3)]` IS THE ONLY MEASURE THIS BLOCK SPENDS, and it is
   borrowed rather than chosen. The strip pays a NEGATIVE block-end margin
   (`--folder-tab-overlap`) because the card rides up over its tabs' cut feet;
   a text trail attaches to nothing, so with the strip gone there would be no
   space at all between the last crumb and the card's top edge. `--space-3` is
   what the shell's own phone-only chrome row spends in exactly this position —
   "this row pays its own `--space-3` beneath itself" — so the trail and the
   menu above it sit on one rhythm. It is PADDING and not a margin on purpose:
   a margin here collapses out of any parent that is not already a formatting
   context of its own, and this component cannot see its parent.

   `[overflow-wrap:anywhere]` IS THE HORIZONTAL-SCROLL GUARD, and `break-words`
   is not enough for it. A flex item will not shrink below its min-content
   width, and `overflow-wrap: break-word` does not change min-content — so one
   long unbroken label (a client name with no spaces in it) would push the
   `<ol>` past the viewport and scroll the whole DOCUMENT sideways at 380,
   which is the one thing a phone layout may never do. `anywhere` is defined to
   affect min-content, so the crumb shrinks and the word breaks. MEASURED BOTH
   WAYS in `verify/crumb-mobile/`, on one unbroken label at 380: with this
   line the crumb wraps to three lines and `document.scrollWidth` stays 380;
   with it swapped for `overflow-wrap: normal` in the live cascade the same
   label reports 1005 against a 380 client width — the document scrolling
   sideways, which is the failure this one declaration is here to prevent.
   -------------------------------------------------------------------------- */
/* THE INK IS THE SPINE'S, NOT THE PAGE'S, AND THIS IS THE ONE THING THE SWAP
   COULD NOT INHERIT. A tab brings its own paper with it: every label in the
   strip is read against `--kw-crumb-rest` or `--kw-crumb-live`, both of which
   step with the palette, so the trail never had to know what it was standing
   ON. Take the tabs away and the words land straight on the shell's ground —
   `--spine-fill` — and on the mango spine that ground is #FED069 in BOTH
   palettes (tokens.css §7b says so in as many words: "mango is #FED069 in both
   palettes, so anything drawn on it must be too"), while `--ink-tertiary` and
   `--foreground` flip to near-white in dark. MEASURED, in `verify/crumb-mobile/`
   at `?t=dark`, before these three lines existed: the trail drew #BDB9B1 and
   #FFFEF9 on #FED069 — 1.34 and 1.45 against the ground. A trail nobody can
   read is worse than a trail drawn as tabs.

   `--spine-ink` / `--spine-ink-quiet` ARE THE KIT'S EXISTING ANSWER TO EXACTLY
   THIS, and no new token is minted: they are what `rail.tsx` draws every row,
   heading and hint with, for the same reason — it is the other thing that
   stands on the spine rather than on paper. On the paper spine they resolve to
   `--foreground` / `--muted-foreground`, which is the ordinary trail again; on
   mango they are the palette-independent `--ink-on-accent`.

   THE `var(…, …)` FALLBACK IS THE MECHANISM THIS FILE ALREADY USES ONE BLOCK
   DOWN for `--spine-crumb-rest`, and it carries the same promise: this
   component still names no spine and no palette. Outside a spine — a harness,
   a story, any caller that is not `ScreenShell` — neither token is declared,
   the fallback stands, and the trail draws precisely the inks
   `breadcrumbs.tsx` would have drawn on its own. Nothing is overridden that
   was not going to be wrong.

   ONLY THREE SELECTORS, AND THEY ARE THE THREE THE PARTS ACTUALLY COLOUR. The
   list carries the resting ink, which the links, the separators and the
   ellipsis all INHERIT, so one rule covers four things; the current page
   carries its own; and `BreadcrumbLink`'s hover carries the third. The
   descendant form outranks each part's own class (0,2,0 and 0,3,0 against
   0,1,0 and 0,2,0) without any part being edited, which matters: `breadcrumb/`
   is the composable form and half a dozen other call sites draw from it. */
const TEXT_TRAIL = cn(
  "pb-[var(--space-3)]",
  "[&_[data-slot=breadcrumb-list]]:text-[var(--spine-ink-quiet,var(--ink-tertiary))]",
  "[&_[data-slot=breadcrumb-page]]:text-[var(--spine-ink,var(--foreground))]",
  "[&_[data-slot=breadcrumb-link]:hover]:text-[var(--spine-ink,var(--foreground))]",
  "md:hidden",
);

const TEXT_TRAIL_LIST = cn("min-w-0 [overflow-wrap:anywhere]");

/* The strip's own half of the gate. Written as an ADDITIVE `max-md:` variant
   rather than a `hidden md:block` pair so that at `md` and above the nav's
   class list resolves to exactly what it resolved to before this change and
   the element keeps its own UA `display: block` — the desktop strip is not
   restyled into place, it is simply never gated. */
const STRIP_ONLY = "max-md:hidden";

/* ----------------------------------------------------------------------------
   One tab. `tabs.tsx`'s `TRIGGER_BASE` + `TRIGGER_SKIN.folder`, verbatim in
   every value.

   TWO LINES READ DIFFERENTLY FROM THE ORIGINAL AND NEITHER CHANGES A PIXEL.
   `TRIGGER_SKIN.folder` wrote its resting ink as `[color:var(--ink-secondary)]`
   rather than `text-ink-secondary`, and said why: tailwind-merge did not know
   `text-caption` was a font size, filed it under text-COLOUR, and let a
   following `text-ink-secondary` delete the whole type step. That is no longer
   true — `lib/utils.ts` registers `text-badge`, `text-micro` and
   `text-caption` under `font-size` (GAPS-DOCS A-1), and the two classes now
   land in different groups — so the plain utility is used here and the
   workaround is not carried forward into a new file. Likewise the shared
   base's `[&_svg:not([data-slot=folder-shape])]` guard: it existed because
   `line` and `folder` shared one icon rule and only one of them had a
   silhouette to exclude. There is one skin here, so the exclusion is the
   plain rule.
   -------------------------------------------------------------------------- */
const TAB = cn(
  "relative inline-flex shrink-0 cursor-pointer appearance-none",
  "items-center justify-center whitespace-nowrap select-none",
  "border-0 bg-transparent",
  // One height for every tab — ch14, verbatim: "a tab never shrinks to say it
  // is unselected". `shrink-0` is the same rule on the other axis, measured on
  // a real phone: flex shrinks a child to `min-width` BEFORE its container
  // overflows, so without it every tab clamps to 128 and the label runs into
  // the shoulder curve. A tab takes its content's width and the STRIP scrolls.
  "h-[var(--folder-tab-height)] min-w-[var(--folder-tab-min-width)]",
  // "The label is centred in the lip, never across the join." The foot below
  // the lip is padding, so `items-center` centres against the lip and not the
  // whole box; the inline-end padding clears the shoulder so the label never
  // reaches the curve.
  "pb-[var(--folder-tab-overlap)] ps-5",
  "pe-[calc(var(--folder-shoulder)_+_var(--space-3h))]",
  "gap-[var(--space-2h)]",
  "text-caption",
  // Any icon a call site puts in a crumb sits at the button icon size and
  // never shrinks. The folder silhouette is excluded by its own slot name —
  // a descendant rule (0,1,1) outranks the shape's `size-full` (0,1,0), so
  // without the `:not()` the whole tab's outline paints at 1rem square.
  "[&_svg:not([data-slot=folder-shape])]:pointer-events-none",
  "[&_svg:not([data-slot=folder-shape])]:size-[var(--icon-button)]",
  "[&_svg:not([data-slot=folder-shape])]:shrink-0",
);

/**
 * ICON-ONLY TABS — 16 Sep 2026 fifth ruling, CORRECTED 17 Sep 2026 (the
 * client's THIRD report on this exact shape: "the inactives on the assistant
 * are overlapping, so they're on top of the active tab" — a static
 * screenshot of exactly `History`/`+`, drawn with a flat, square top-left
 * edge where every other tab in the app, content strip included, draws a
 * rounded corner and a sloping shoulder). Applied alongside `TAB` (never
 * instead of it) on any crumb whose item sets `iconOnly: true`; see that
 * field's own doc. `TAB`'s 128px text floor still drops — that ruling did
 * not change — and the two insets still tighten to icon-plus-padding: `ps-3`
 * leading (was `ps-5`) and a trailing inset that keeps the shoulder curve's
 * own width (`--folder-shoulder`, unchanged) but drops the extra
 * `--space-3h` `TAB` reserves for a label's own trailing padding, down to
 * `--space-2`.
 *
 * `min-w-0` DROPPED A FLOOR THE SHAPE ITSELF NEEDS, NOT JUST THE TEXT ONE.
 * `folder.tsx`'s `crop="lip"` path is "Only FLAT runs take the width and the
 * height" (its own law) ONLY down to `radiusLip + shoulder` — its measured
 * minimum, below which `Math.max(w, radiusLip + shoulder)` widens the
 * VIEWBOX past the box `FolderShape` actually measured, and
 * `preserveAspectRatio="none"` (`folder.tsx`'s own "WHY IT MEASURES") then
 * stretches — here, squashes — the curve non-uniformly to force the two
 * back into agreement. A box narrower than that floor does not draw a
 * smaller version of the same corner; it draws a flattened one, which reads
 * exactly like the corner is simply gone. `min-w-0` removed EVERY floor,
 * text and geometric alike, so nothing in this file stopped an icon-only tab
 * from being asked to render under the shape's own minimum — today's
 * `--icon-button` and padding tokens happen to add up to comfortably more
 * than that minimum, which is why this sat quiet until a narrower
 * combination (or a future token change) crossed it.
 *
 * `min-w-[calc(var(--folder-radius-lip)_+_var(--folder-shoulder))]` is that
 * floor, read off the SAME two tokens `folder.tsx`'s `SHAPE.radiusLip` and
 * `SHAPE.shoulder` are the brand-unit twins of (that file's own header:
 * "tokens.css states the relation and carries the CSS side of the same
 * numbers") — not a second, hand-copied number that could drift from them.
 * It sits far below the icon-plus-padding content width this tab actually
 * renders at (roughly 4.1-4.6rem against a 2.505rem floor), so it changes
 * nothing about how any tab looks today; it exists so nothing can ever again
 * hand `FolderShape` a box smaller than the one curve it draws.
 */
const TAB_ICON_ONLY = cn(
  "min-w-[calc(var(--folder-radius-lip)_+_var(--folder-shoulder))]",
  "ps-[var(--space-3)] pe-[calc(var(--folder-shoulder)_+_var(--space-2))]",
);

/* An ancestor: the rest fill, 13/300 in secondary ink, hovering to the active
   WEIGHT ONLY — REVERSED 2026-09-03. `hover:no-underline` is still the ONE
   thing suppressed on `BreadcrumbLink` — its underline is `.kw-link`'s, drawn
   for a link that "occupies no box", and this link is a box — but the ink
   hover it also brings, `hover:text-foreground`, is now overridden back to
   rest here rather than kept: client ruling, verbatim, "when i hover over a
   tab i want that it gets the same weight as the active tab (without
   changing the color) replicate the behaviour we already have in navbar."
   `rail.tsx`'s `ROW_IDLE` is that behaviour — a fixed ink at every state,
   weight the only thing that steps up on hover — so `hover:text-ink-secondary`
   is added, LAST, to win the merge against `BreadcrumbLink`'s own
   `hover:text-foreground` (same utility group, later in the `cn()` call
   `<BreadcrumbLink className={cn(TAB, TAB_REST)}>` passes it through).
   Colour was never invented to move here in the first place — `TAB_REST`
   itself carried no ink hover of its own before today, only the shared
   part's did — so this is a suppression, not a second rule to keep in step.

   BOTH TABS SIT AT `z-[1]` — BELOW A CARD DRAWN AT `z-[2]`. This was
   `z-[1]` for the rest tabs and `z-[3]` for the live one, 24.3's own two
   numbers, so a caller's card clipped the rest tabs while the live tab was
   "attached" by painting OVER the card. The client, twice, on what that
   actually produces — 2026-09-03: "the shape of the folder tab should be
   behind the body, if not when i scroll down look what happens in my
   screenshots - its overlapping and cuts the content", and again on
   2026-09-06 with a screenshot of the join: "the folder tab is still
   overlapping, thats wrong."

   She is right, and the old arrangement could not be anything else. The
   strip ends `--folder-tab-overlap` (17.02) ABOVE where it appears to, so
   the live tab's foot lies over the first 17px of the card — and at `z-[3]`
   it PAINTS there. Whatever the card puts in that band, the tab covers:
   the assistant's first line of conversation, a tab row's shoulder, the top
   of a scrolled list. It is invisible while that band is empty paper, which
   is exactly why it survived so long.

   Putting the live tab under the card costs nothing and is checkable rather
   than argued. The card has NO top border (measured `0px`) and its shadow is
   cast downward (`0 6px 20px -6px` — with the offset and the negative spread
   there is no ink at the top edge), and the live tab's paper IS the card's
   paper, the same `--kw-off-beige`. So the card covering the tab's foot and
   the tab covering the card's head produce the IDENTICAL join, and only one
   of them can hide content.

   THE LIVE TAB STILL PAINTS ABOVE ITS NEIGHBOURS, AND SINCE 2026-09-06 IT
   DOES SO BY A NUMBER AGAIN — ONE STEP, NOT TWO. Until `activeIndex` existed
   both tabs sat at `z-[1]` and the lift was held by DOM order alone: "the
   current location is the LAST crumb, and at equal `z-index` the later
   element in DOM order wins." That sentence was true only while live and
   last were the same thing. They are not any more — a workspace tab set
   activates the tab the reader clicked, wherever it sits — so a live tab in
   the middle of the strip would have been painted over by every tab after
   it, which is the lift running backwards.

   SO THE REST TABS DROP TO `z-0` AND THE LIVE TAB KEEPS THE `z-[1]` THE
   2026-09-03 FIX GAVE IT. That fix is the constraint here and it is not
   disturbed: the live tab is still ONE, still strictly below a card drawn at
   `z-[2]`, and the tab's foot is still painted over by the card rather than
   over it. There is no integer between 1 and 2 to promote the live tab into,
   so the lift is bought by lowering the others instead — which costs
   nothing, because `z-0` and `z-[1]` are both above the un-positioned page
   and both below the card, and rest tabs are still ordered among THEMSELVES
   by DOM order exactly as before.

   IT IS A NO-OP FOR EVERY CALLER THAT EXISTS TODAY. With the live tab last —
   the default — DOM order already put it on top, so 0/1 and 1/1 paint
   identically; the strip's `gap-1` seam means neighbouring tabs do not even
   share pixels to fight over. The number is here for the case DOM order
   cannot answer, and it is written down rather than left to be re-derived
   the next time somebody reads `z-[1]` and wonders why it is not `z-[3]`.

   `z-0` IS STILL A STACKING CONTEXT, WHICH `CrumbShape` DEPENDS ON. A
   positioned element with `z-index: 0` establishes one exactly as `z-index:
   1` does — only `auto` does not — so the silhouette's `-z-10` stays inside
   its own tab and cannot fall behind whatever the strip was dropped onto.
   That is the promise `CrumbShape`'s own comment makes, and it survives the
   change unaltered.

   THIS PAIR IS NO LONGER THE ONLY PLACE THE NUMBER IS WRITTEN — 16 Sep 2026,
   second correction on this exact silhouette. The `<li>` (`BreadcrumbItem`,
   the render below) carries the SAME kind of number itself, and that is not
   a decorative echo. AT REST, WITH NOTHING TRANSFORMED ANYWHERE IN THE
   STRIP, this pair alone was always sufficient — the reasoning two
   paragraphs up holds. What breaks it is a TRANSFORM landing on a sibling
   `<li>` that carries no z-index of its own: `onTabPointerMove`, below,
   slides every tab a drag has moved past — active or not, dragged or not —
   by writing a bare `style.transform` straight onto that `<li>`. A
   transformed element is its own stacking context regardless of its
   `z-index` (`auto` included), so the MOMENT a tab is merely shifted out of
   a dragged neighbour's way, its z-index here on the link stops competing
   in the strip's shared context at all — it is sealed inside the `<li>`'s
   new, unnumbered context, which the OUTER comparison then treats as one
   opaque box at the "auto" level, tied to every other untransformed tab by
   DOM order alone. The `<li>`'s own explicit, per-tab number is what closes
   it: a flex item of `STRIP`'s `<ol>` takes `z-index` as if positioned (CSS
   Flexbox), so writing it there needs no `position` of its own, is never
   touched by a transform (a separate property), and is restored — not
   cleared — by `releaseTransforms` once a drag ends (see that function's own
   comment for why clearing to `""` would have silently flattened every rest
   tab back to DOM-order ties the instant a drag finished). See the `<li>`'s
   own inline `style`, and `onTabPointerMove`'s comment, for the rest of
   this.

   NO LONGER A FLAT PAIR, SINCE 17 SEP 2026 — HER FOURTH REPORT, AND THE ONE
   THAT NAMED THE ACTUAL DEFECT: "The inactives on the assistant are
   overlapping, so they're on top of the active tab… They should be behind."
   Two rest tabs never used to SHARE a pixel — the retired `gap-1` kept every
   tab clear of every other, so `z-0` for the whole rest set settled nothing
   because there was never a tie to settle. `TAB_OVERLAP_MARGIN` (on `STRIP`,
   above) now puts two boxes on the same pixels ON PURPOSE — her own ruling
   is that the earlier tab's shoulder sits OVER the later tab's corner,
   Chrome's own nesting — and CSS's ordinary tie-break (equal z-index, later
   DOM order wins) hands that pixel to the WRONG tab: the later, not the
   earlier. So rest tabs no longer share one number. `restZIndex`, below,
   gives every tab in the strip — rest AND live — its own value, strictly
   DESCENDING by strip position: the earlier (visually left) tab always
   outranks a later rest tab, and the live tab still outranks every rest tab
   regardless of where it sits, still strictly under the card's `z-[2]`. It
   is written as an inline `style` rather than a class for the reason every
   other per-tab number in this file is (`onTabPointerDown`'s own inline
   `zIndex = "2"`, for one): Tailwind can only emit CSS for class strings it
   can see verbatim in source, and a value that depends on `entry.index` and
   `rendered.length` does not exist until render.

   INTEGERS ONLY — MEASURED, NOT ASSUMED, AFTER A FIRST DRAFT SHIPPED
   FRACTIONS AND SILENTLY DID NOTHING. `z-index`'s own CSS grammar is
   `auto | <integer>` — no other number is a valid value at all — and a
   browser that receives an invalid one does not clamp or round it, it
   REFUSES the whole declaration: `el.style.zIndex = "0.833"` (what the
   first draft's `(total - position) / (total + 1)` produced) leaves
   `getComputedStyle(el).zIndex` reading `"auto"`, exactly as if nothing had
   ever been written — confirmed against a real Chromium render, where every
   rest tab but the leading one came back `auto` and the whole mechanism
   this comment describes was quietly inert. So the formula is `-position`:
   the leading rest tab keeps the EXACT value it always had (`0`, position
   `0`), and every tab after it steps one further NEGATIVE integer per
   position — still strictly descending, still integers throughout, and
   still strictly under the live tab's flat `1` for every position (`0` is
   the largest value this function ever returns). */
function restZIndex(position: number): number {
  return -position;
}

const TAB_REST = cn(
  "text-ink-secondary font-[var(--font-weight-light)]",
  "hover:text-ink-secondary hover:font-[var(--font-weight-medium)]",
  "hover:no-underline",
);

/* The current location. `BreadcrumbPage` already draws primary ink at the
   kit's one "bold" (`--font-weight-medium`), which is the same pair 24.3 gives
   an ACTIVE folder tab — so the ruling's "the same font weight rules apply as
   they already exist" is satisfied by the part, and nothing is restated here.
   It is not a link and has no hover, deliberately: a hover response on the
   page you are already on invites a click that does nothing.

   `w-full` + `justify-start` were added and reversed the same day (see
   `STRIP`'s own note) — the live tab is sized to its own label again, like
   every rest tab, and reads centred under `TAB`'s shared `justify-center`. */
const TAB_LIVE = "z-[1] cursor-default";

/** The two papers, as `color` for the shape's `currentColor`. */
const FILL_REST = "text-[var(--kw-crumb-rest)]";
const FILL_LIVE = "text-[var(--kw-crumb-live)]";

/**
 * THE SILHOUETTE'S OWN HOVER — added 17 Sep 2026, client ruling, verbatim:
 * "When I'm hovering over a tab and I'm talking, both in the main container
 * and in the assistant, I want it to have a hover color apart from the
 * changes in the text that are already there." Until today a rest tab's
 * hover moved only the LABEL — ink to `--ink-secondary` (a no-op colour-wise,
 * see `TAB_REST`'s own comment) and the weight preview — and the paper under
 * it, the shape THIS constant paints, never moved at all. This is the
 * SILHOUETTE's own step, one rung up from the rest paper: `--accent`, the
 * SAME token `TAB_CLOSE`'s own hover already uses on this exact strip ("the
 * kit's neutral item wash"), so a reader who has already learned what an
 * accent wash means on the × learns nothing new reading it on the tab
 * itself. `--kw-crumb-hover` is a THIRD custom property beside
 * `--kw-crumb-rest`/`--kw-crumb-live` (declared alongside them, on the same
 * `<nav>`, for TAB-C1's own reason: a caller that rebinds `--accent` around
 * the strip must not be able to make the hover wash disagree with every
 * other hover in its own tree) rather than a THIRD literal here, so a future
 * spine that repoints the rest paper can repoint the hover the same way
 * without this file changing.
 *
 * `group-hover:`, NOT a bare `hover:` on the shape itself — the shape is
 * `pointer-events-none` (`CrumbShape`'s own comment) and can never be the
 * element `:hover` fires on. `group` now lives on the `<li>`
 * UNCONDITIONALLY (previously only on a closable tab, for the identical
 * reason `TAB_REST`'s own weight-preview note gives: the close button is a
 * SIBLING of the link, laid over it, so hovering the × must not drop the
 * tab back to its resting state either). Passed as `CrumbShape`'s
 * `hoverFill` — a SECOND shape, not a swap of `FILL_REST` (see that
 * component's own comment for why a straight swap to a 5%-alpha token reads
 * as the tab vanishing rather than gaining a tint) — ONLY where the crumb
 * also passes `fill={FILL_REST}`, never where it passes `FILL_LIVE`, because
 * the client's own words draw the line: "both in the main container and in
 * the assistant" names every REST tab on both strips, and a hover response
 * on the tab you are already on invites a click that does nothing, the same
 * reason `BreadcrumbPage` has no hover of its own at all (see that class's
 * own comment). Icon-only shares `FILL_REST` with every text tab —
 * `item.iconOnly` only ever changes `TAB`'s insets, never which fill a crumb
 * draws — so it takes this for free.
 */
const FILL_REST_HOVER = "group-hover:text-[var(--kw-crumb-hover)]";

/* ----------------------------------------------------------------------------
   THE CLOSE CONTROL — THE ROOM IT NEEDS, AND THE CONTROL ITSELF.

   IT IS A SIBLING OF THE LINK, POSITIONED OVER THE TAB. That is the whole
   shape of this and it is forced, not chosen. `BreadcrumbLink` renders an
   `<a>`, and an `<a>` may not contain a `<button>` — interactive content
   inside interactive content is invalid HTML, and browsers repair it in ways
   nobody can rely on. So the button is the `<li>`'s SECOND child, beside the
   link rather than inside it, and the `<li>` becomes the positioning parent
   (`relative`, added only on a closable tab) so the button can be laid over
   the tab it belongs to. The two DOM facts that follow are the point of the
   exercise: the button has its own accessible name, and it is its own focus
   target. Neither is true of a `<span>` inside the anchor, however many
   capture-phase handlers are pointed at it.

   THE TAB PAYS FOR THE ROOM RATHER THAN THE BUTTON TAKING IT. `TAB_CLOSABLE`
   is a wider inline-end padding, merged AFTER `TAB`'s own so tailwind-merge
   drops the narrower one: `--folder-shoulder` (the curve the label already
   had to clear) + the control + `--space-2` between the two. Without it the
   button would be laid over the END OF THE LABEL, which is a control sitting
   on top of the text it is named after.

   WHY `--control-height-pill` (26) AND NOT `--control-height-dense` (32).
   The kit's five control heights are 26 / 32 / 38 / 40 / 44 and this is the
   ONLY one that fits. A tab is `--folder-tab-height` (47.5) tall with
   `--folder-tab-overlap` (17.02) of that spent as the foot the card rides
   over, so the box a control may occupy is the difference — `--folder-lip`,
   30.48 — and a 32 control breaks the silhouette's own top edge by three
   quarters of a pixel at each end. 26 fits with 2.24 of air above and below.
   The dialog's own close chip is the 32 (`.kw-drawer__close`), and it is the
   drawing this one follows in every respect EXCEPT the height, because it
   sits on a panel with room rather than inside a shape with none.

   AND 26 IS NOT THE 44 TOUCH ROW, WHICH IS STATED RATHER THAN QUIETLY
   MISSED. `--control-height-input` is "also the touch row" and no control
   inside a 30.48 lip can be it; the lip is chapter 14's, client-ruled, and
   "reuse the existing folder tabs without changing anything on the shape"
   forbids growing the tab to make room. What the strip has instead is that
   the TAB is the large target — 128 wide minimum by 47.5 — and the close is
   the small one inside it, which is the same bargain every browser tab strip
   makes. The strip is also `md` and up (see `STRIP_ONLY`), so the phone,
   where a mis-tap costs most, never draws this control at all.

   NO RESTING FILL, AND THAT IS NOT THE BORDERLESS-BUTTON RULE BEING DODGED.
   The rule is that a button never carries an EDGE and that its fill is what
   makes it a button; here the button is drawn ON a fill already — the tab's
   own paper, which is the box it lives in — and a second disc repeated on
   every tab in a strip of six would compete with the labels those tabs
   exist to show. So the mark is the affordance at rest and the fill arrives
   on hover, as `bg-accent`: the kit's neutral item wash, a named token and a
   NAMED utility (the arbitrary form would not match the token rebinds), and
   never `--primary` — mango is a brand fill and not a hover.

   THE INK IS ONE STEP QUIETER THAN THE LABEL IT SITS BESIDE (`--ink-tertiary`
   against the tab's `--ink-secondary`) and moves to `--foreground` on hover,
   which is `BreadcrumbLink`'s own hover ink. A close control is subordinate
   to the name of the thing it closes until you reach for it.

   FOCUS: NOTHING WRITTEN. tokens.css §8 rings every control at its own
   radius, and the strip's `pt-1` already holds the room open for a ring at
   the top of a tab — this control sits 2.24 further down than the tab does,
   so it is strictly better off than the thing that room was measured for.
   -------------------------------------------------------------------------- */
const TAB_CLOSABLE = cn(
  "pe-[calc(var(--folder-shoulder)_+_var(--control-height-pill)_+_var(--space-2))]",
);

const TAB_CLOSE = cn(
  // Over the tab's lip, clear of the shoulder curve. Both insets are logical,
  // so the day `FolderShape` gets its RTL ruling this follows it for free.
  "absolute z-[1] end-[var(--folder-shoulder)]",
  "top-[calc((var(--folder-lip)_-_var(--control-height-pill))_/_2)]",
  // ABOVE THE LIVE TAB, WHICH IS WHY THE NUMBER IS 1 AND NOT `auto`. The tab
  // is a stacking context at `z-[1]`; a `z-index: auto` sibling would paint
  // in a lower layer and the silhouette would cover the ×. At an equal 1 the
  // later element in DOM order wins, and the button is written second.
  "inline-grid size-[var(--control-height-pill)] place-content-center",
  "cursor-pointer appearance-none rounded-pill border-0 bg-transparent",
  "text-ink-tertiary hover:bg-accent hover:text-foreground",
  "transition-colors duration-[var(--duration-colour)] ease-kwapso",
);

/* ----------------------------------------------------------------------------
   THE CLOSE-ALL CONTROL — RETIRED 17 Sep 2026, CLIENT RULING, VERBATIM: "I
   don't know what it is (this X button that you added in the tabs in the
   main content that closes everything), but no one asked you, so delete
   it." Shipped 2026-09-16 for the app's own "close all tabs" ask, one day
   before this ruling killed it outright — `onCloseAll`, `closeAllLabel`,
   `CLOSE_ALL_WRAP`, `CLOSE_ALL` and the trailing `<li>` they drew are all
   gone, not deprecated: there is no dead body left around for a future
   session to trip on, the same standard this file's own header holds every
   other retirement to. THE APP'S OWN WIRING (`closeAllTabs` in
   `app-shell.tsx`/`workspace-tabs.ts`) IS ANOTHER LANE'S — this file only
   ever owed it the prop, and removing the prop is what makes that call site
   fail to compile until that lane removes its own side of it; that failure
   is the correct, loud signal, not a bug in this change. */

/* ----------------------------------------------------------------------------
   The silhouette behind one tab.

   NO LONGER TAKES A `lead` FLAG. Until 2026-09-02 the leading tab drew an
   extra `--folder-radius-lip` patch here to square its own top-left corner
   off, matching the card's own squared corner underneath it; the client
   reversed the tab half of that on 2026-09-03 ("go and fix it" — see the file
   header), so every tab, leading or not, is now this one element and nothing
   more. `data-slot="breadcrumb-folder-square"` no longer exists anywhere in
   this file; a harness that still queries for it should expect zero.

   `hoverFill` — ADDED 17 Sep 2026, THE SAME CLIENT RULING `FILL_REST_HOVER`
   ARGUES. A SECOND silhouette, not a swap of the first: `--accent` (the wash
   token, `rgba(…, .05)`, the SAME one `TAB_CLOSE`'s own hover already reads)
   is designed to be COMPOSITED OVER an opaque layer, not to BE one — the
   kit's own row-hover idiom is always a translucent wash on a solid base,
   never a base colour swapped for a translucent one. Filling the WHOLE tab's
   currentColor with a 5%-alpha token directly, tried first, reads as the tab
   nearly vanishing against the ground rather than gaining a tint. So this
   draws the identical `crop="lip"` shape TWICE, stacked in the same box:
   `fill` (opaque, always) underneath, `hoverFill` (the wash) on top of it,
   `opacity-0` at rest and `group-hover:opacity-100` — the wash tints the
   opaque paper beneath it exactly the way `TAB_CLOSE`'s own `hover:bg-accent`
   tints ITS OWN opaque tab, and does nothing at all when `hoverFill` is
   omitted (`FILL_LIVE`'s own two call sites never pass it — "the active tab
   does not change on hover", her words). The opacity transition, not a
   colour one, because there is nothing to interpolate BETWEEN — one shape is
   fading in over a second, unmoving one, not one colour turning into
   another. */
function CrumbShape({ fill, hoverFill }: { fill: string; hoverFill?: string }) {
  return (
    <span
      aria-hidden="true"
      data-slot="breadcrumb-folder-fill"
      /* Behind the label. The tab sets a z-index, which makes it a stacking
         context, so this negative index stays inside the tab and can never
         fall behind whatever the strip was dropped onto. */
      className={cn("pointer-events-none absolute inset-0 -z-10", fill)}
    >
      <FolderShape crop="lip" />
      {hoverFill ? (
        <span
          aria-hidden="true"
          data-slot="breadcrumb-folder-fill-hover"
          className={cn(
            "pointer-events-none absolute inset-0 opacity-0",
            "transition-opacity duration-[var(--duration-colour)] ease-kwapso",
            "group-hover:opacity-100",
            hoverFill,
          )}
        >
          <FolderShape crop="lip" />
        </span>
      ) : null}
    </span>
  );
}

/* ============================================================================
   BreadcrumbFolders
   ========================================================================= */

/**
 * Four levels render in full. At five the middle folds.
 *
 * CLIENT, 2026-09-02: "Four levels render in full. At five or more, everything
 * between the first and the parent collapses into one `···` tab." Written as
 * a constant rather than a default on a prop because it is the trail's own
 * rule and not a layout's opinion — `foldAfter` exists so a call site with a
 * genuinely narrower slot can say so, and its default is this.
 */
const FOLD_AFTER = 4;

/**
 * How far the pointer must travel, in px, before `onTabPointerMove` counts a
 * gesture as a DRAG rather than a TAP that happens to have jittered a
 * little. 4px, the same figure browsers themselves use for their own native
 * drag threshold (`-webkit-user-drag`'s own implementations, and the figure
 * `dnd`-style libraries converge on independently).
 *
 * ADDED 17 Sep 2026, over her report that clicking a tab, its ×, or the
 * pinned "+" stopped doing anything once `onReorder` shipped. Two bugs, not
 * one, and this fixes the SECOND. The first — and the one that mattered for
 * her own report, reproduced with a zero-delta synthetic click — is that
 * `setPointerCapture` (`onTabPointerDown`) retargets the eventual `click` to
 * THIS `<li>` rather than the element actually pressed, so even a perfectly
 * still tap never reached the anchor; `onTabPointerEnd`'s own tap-forward
 * comment is the fix for that one. This threshold is the belt beside that
 * braces: a REAL mouse or trackpad rarely lands its `pointerup` on the exact
 * device pixel its `pointerdown` started on, and this file's own comparison
 * used to be a bare `!== 0` — so ordinary human input, not only a script,
 * could still end a plain click flagged as `moved`, install the swallow
 * guard, and lose the tap-forward that only runs when `!drag.moved`. Anything
 * up to this many pixels now still counts as a tap; anything past it is a
 * real drag, exactly as it read before this constant existed.
 */
const DRAG_MOVE_THRESHOLD_PX = 4;

/**
 * What the fold keeps beside the head: the parent and the current location.
 * `collapse()` counts the crumbs a reader ends up seeing, gap excluded, so
 * head (1) + this (2) is the `maxItems` it is handed — see `fold()`.
 */
const FOLD_KEEP_TAIL = 2;

/**
 * Fold the middle, using `breadcrumbs.tsx`'s own rule rather than a second
 * one.
 *
 * `collapse()` couples its threshold to its tail — it folds as soon as there
 * are MORE crumbs than it will show — and the client's rule does not: she
 * asked for four in full and a fold at five, keeping three. So the threshold
 * is applied here and the SHAPE of the fold is still `collapse`'s: passing
 * `undefined` below `foldAfter` is that function's own "show every crumb", and
 * passing 3 above it is its own "head, gap, last two". Nothing about which
 * crumbs survive, in what order, is decided twice.
 *
 * THE ACTIVE CRUMB IS NEVER FOLDED AWAY — ADDED 2026-09-06 WITH `activeIndex`,
 * AND IT IS A HOLE THAT WAS ONLY EVER PLUGGED BY LUCK. The fold keeps the head
 * and the last two, and until today the live crumb WAS the last one, so the
 * one crumb that answers "where am I" could not be in the part that
 * disappears. Point `activeIndex` at the middle of a six-level trail and it
 * can be: the strip would then draw a `···` where the current location is and
 * mark nothing as current, which is worse than a strip that is too long. So
 * when the active crumb falls inside the span the fold would hide, nothing
 * folds. Not "fold differently" — `collapse()`'s shape is the trail's own rule
 * and this file does not get to invent a second one — just not this time.
 */
const fold = (items: BreadcrumbsItem[], foldAfter: number, active: number) => {
  if (items.length <= foldAfter) return collapse(items, undefined);
  // What survives a fold: the head, and the last `FOLD_KEEP_TAIL`.
  const keptFromIndex = items.length - FOLD_KEEP_TAIL;
  const activeSurvives = active === 0 || active >= keptFromIndex;
  return collapse(items, activeSurvives ? FOLD_KEEP_TAIL + 1 : undefined);
};

/**
 * A crumb, plus the two things only the TAB drawing can honour.
 *
 * IT EXTENDS `BreadcrumbsItem` RATHER THAN WIDENING IT, AND THAT IS THE WHOLE
 * DESIGN OF IT. `BreadcrumbsItem` is the trail's shared shape: `breadcrumbs.tsx`
 * renders it as text — including on the phone, where it IS this component's
 * drawing — and `ScreenRenderer` carries it in a screen recipe, where it is
 * plain data. A field that only the desktop tab strip can act on does not
 * belong in a type two other renderers must silently ignore; a reader who
 * finds `closable` on the shared item would reasonably expect a closable
 * crumb everywhere it is drawn, and would be wrong two thirds of the time.
 *
 * Nothing existing has to change to use it: every `BreadcrumbsItem` already
 * IS one of these, structurally, because both added fields are optional. An
 * existing `items` array keeps type-checking untouched.
 */
export interface BreadcrumbFoldersItem extends BreadcrumbsItem {
  /**
   * Draw this tab's close control. Defaults to `true`, so `onClose` alone
   * makes every tab closable — which is the ordinary tab set, and Chrome's
   * own behaviour.
   *
   * Set `false` for the tab that must not be shut: a workspace's home, a
   * pinned record, the one tab a set is not allowed to be emptied below. It
   * is expressed per ITEM and not as a count or a rule, because which tab is
   * privileged is the application's knowledge and not a shape the kit can
   * infer. Ignored entirely when `onClose` is not given.
   */
  closable?: boolean;
  /**
   * This tab's own close label, when the generic join will not do — and
   * ALWAYS when `label` is a node rather than a string, because a name cannot
   * be read out of arbitrary markup and the join falls back to the bare verb
   * rather than guessing. See `formatCloseLabel`.
   */
  closeLabel?: string;
  /**
   * NO LABEL TEXT — an icon alone (History's clock, the "+" new-tab control).
   * Client ruling 16 Sep 2026, fixing a regression the pinned-tab pattern
   * exposed on staging: "the assistant strip's two pinned tabs … render
   * 128px wide — the same width as a text tab — so they read as big empty
   * grey blocks." `TAB`'s 128px floor exists so a text label never crushes
   * into the shoulder curve; an icon has no such risk, so `iconOnly: true`
   * drops that floor and tightens the tab's own insets to icon-plus-padding
   * (`TAB_ICON_ONLY`) instead. Only the BOX changes — the folder silhouette
   * behind it (`CrumbShape`/`FolderShape`) measures its own rendered size on
   * every resize rather than stretching a fixed path, so it draws correctly
   * narrow with no change of its own; see that file's "WHY IT MEASURES".
   */
  iconOnly?: boolean;
}

export interface BreadcrumbFoldersProps
  extends Omit<React.ComponentPropsWithoutRef<"nav">, "children"> {
  /** The trail, root first. An empty array renders `null`. */
  items: BreadcrumbFoldersItem[];
  /**
   * WHICH crumb is the live one. Defaults to the LAST, which is what a trail
   * always means and is byte-for-byte what this component did before the prop
   * existed — the live paper, `aria-current="page"`, the z-lift and the
   * scroll-into-view all followed `items.length - 1` and still do when this
   * is omitted.
   *
   * IT EXISTS BECAUSE A TAB SET IS NOT A PATH. The app's workspace tabs are
   * peers: the reader activates one by clicking it, and the client's ruling
   * is that the set stays as it is — "all tabs i open stay open unless i
   * close them". With liveness pinned to the last position, the only way to
   * mark a tab live was to MOVE it to the end, so every switch re-ordered the
   * strip under the reader's own cursor and the tab they meant to click next
   * had shifted. Position and liveness are two facts and this prop is the
   * second one.
   *
   * AN INDEX OUTSIDE THE ARRAY MEANS NO CRUMB IS CURRENT, and that is
   * deliberate rather than an unguarded edge. It is a real state for a tab
   * set — the strip is open and the reader is looking at something that is
   * not one of these tabs — and the alternative, clamping into range, would
   * announce a crumb as "you are here" that the caller never said was, and
   * would hide the off-by-one that produced it. A trail simply never passes
   * this, and a trail always has its current page.
   */
  activeIndex?: number;
  /**
   * Close the tab this crumb draws. Given, every item that has not opted out
   * with `closable: false` grows a real `<button>` — a SIBLING of the crumb's
   * link inside the `<li>`, with its own accessible name and its own place in
   * the tab order. Omitted, nothing is drawn and the DOM is exactly the DOM a
   * breadcrumb trail has always produced.
   *
   * THE HANDLER IS ON THE COMPONENT AND THE OPT-OUT IS ON THE ITEM, WHICH IS
   * NOT AN ARBITRARY SPLIT. Closing is the STRIP's behaviour — a tab does not
   * close itself, the thing that owns the set removes a member from it — and
   * `(item, index)` is the shape the reducer on the other side already wants.
   * Putting the callback on `BreadcrumbsItem` instead would have pushed a
   * FUNCTION into the shared, otherwise-plain-data item type that
   * `breadcrumbs.tsx` and `ScreenRenderer` also read, where nothing can
   * invoke it — a promise two of the three renderers cannot keep, which is
   * the same class of half-affordance this prop exists to remove. Whether a
   * PARTICULAR tab may be closed is a property of that tab, so it lives on
   * the item; see `BreadcrumbFoldersItem.closable`.
   *
   * TWO THINGS ABOUT THE STRIP CHANGE WHEN THIS IS GIVEN, both because it is
   * the one prop that can only mean "these crumbs are a tab set, not a path":
   *
   *   · THE MIDDLE NO LONGER FOLDS. A folded tab can be re-opened from the
   *     `···` menu and CANNOT be closed from it — a `DropdownMenuItem` is a
   *     `role="menuitem"` in a menu that moves focus with the arrow keys, so
   *     a second control inside a row is not reachable by keyboard at all,
   *     and a menu of "open" rows with no way to shut any of them is exactly
   *     the half-affordance this prop was added to delete. The alternative to
   *     folding already exists and is already the strip's own answer to
   *     running out of room: it SCROLLS, and the effect below keeps the live
   *     tab in view. It is also the behaviour being copied — no browser hides
   *     an open tab behind a menu. `foldAfter` is therefore ignored while
   *     this is given; it is a trail's lever and this is not a trail.
   *   · THE PHONE KEEPS THE TABS. The 2026-09-04 mobile ruling — "in monile,
   *     lets use normal breadcrumbs (like they ware before, jhust teh text)"
   *     — is about the breadcrumb TRAIL, and a set of closable peers is not
   *     one. Swapping it for text below `md` would take the close control
   *     away at the width where an open tab costs most, which is the same
   *     argument `onCurrentActivate` already made for its own tab and the
   *     same conclusion. See `textTrail`.
   */
  onClose?: (item: BreadcrumbFoldersItem, index: number) => void;
  /**
   * The verb in every close control's accessible name. A prop with a default
   * because it is announced, and anything announced must be translatable.
   *
   * IT IS NEVER THE WHOLE NAME. A row of six controls all announced "Close"
   * tells a reader that six things can be closed and nothing about which; the
   * name is joined with the crumb's own label so each one says what it shuts
   * — "Close: Halloway". `formatCloseLabel` replaces the join, and an item's
   * own `closeLabel` replaces the result.
   */
  closeLabel?: string;
  /**
   * Replace the whole close-label join — the escape hatch for a language the
   * "verb: name" shape does not fit. Receives the crumb's label as text (empty
   * when the label is a node) and `closeLabel`. `filter-bar.tsx` carries the
   * identical pair for its chips' remove controls; this is that, not a second
   * idea.
   */
  formatCloseLabel?: (itemLabel: string, closeLabel: string) => string;
  /**
   * The landmark's accessible name. A prop with a default because it is
   * announced, and anything announced must be translatable.
   */
  label?: string;
  /**
   * How many levels render in full before the middle folds. The client's
   * ruling is four; a call site with a narrower slot may say fewer. Below 3
   * there is nothing to fold — the head and the tail are the whole trail — so
   * a smaller number renders every crumb rather than pretending to fold.
   */
  foldAfter?: number;
  /**
   * What the folded tab announces, and the accessible name of the menu it
   * opens. Defaults to `BreadcrumbEllipsis`'s own English.
   */
  ellipsisLabel?: string;
  /** Classes for the `<ol>`, for a call site that needs to change the strip. */
  listClassName?: string;
  /**
   * Turns the LIVE crumb — the last one, or `activeIndex` where that is
   * given — into a real control instead of the read-only
   * "you are here" page: for the one call site where the tab IS the
   * interactive element (the assistant column's own close button,
   * `screen-shell.tsx`) and not a location in a navigational trail.
   *
   * OMIT IT — every real breadcrumb call site does, and always will — and
   * the live crumb renders exactly as it always has: `BreadcrumbPage`, not
   * focusable, not clickable, `aria-current="page"`. This prop adds a
   * second path through the same tab shape rather than changing the first
   * one, which is what keeps a real trail's "current page is not a link"
   * law (`breadcrumb.tsx`'s own header) intact for every consumer that
   * never passes it.
   *
   * When given, the live crumb becomes a real `<button>` — not
   * `BreadcrumbPage`'s `role="link" aria-disabled="true"` span, because a
   * control a reader can activate must not also announce itself as
   * disabled. Keyboard-reachable, `Enter`/`Space` fire it natively, no ring
   * to write (tokens.css §8 already rings it).
   */
  /**
   * DRAG-TO-REORDER, CHROME'S OWN MODEL — client ruling 16 Sep 2026, the
   * second of the day on this file. The first cut ("go with the drag
   * order", same day) shipped native HTML5 drag-and-drop, the same pattern
   * `kanban.tsx` uses for its cards. Her correction, over that build on
   * staging, verbatim: *"visually it's a bit confusing. Can we drag it
   * instead of freely on the same edge, only horizontally, so to say?
   * Exactly the same behavior as when dragging tabs in Google Chrome.
   * Research and implement that."* Native HTML5 drag hands the browser a
   * free-floating drag IMAGE — it can drift off the strip's own axis and
   * carries no sense of the other tabs sliding to open a slot — which is
   * exactly the "freely" she is naming. Replaced with pointer events and a
   * measured `translateX`, no new dependency:
   *
   *   · THE DRAGGED TAB NEVER LEAVES THE STRIP'S OWN AXIS. Its own
   *     `translateX` is a plain signed number clamped between the
   *     leftmost and rightmost edge of the CONTIGUOUS run of movable tabs
   *     around it; `translateY` is never written, so it cannot lift off
   *     the row the way a free HTML5 drag image does.
   *   · IT FOLLOWS THE POINTER, 1:1, ALONG THAT AXIS — no easing while a
   *     finger or a mouse button is down, the same "the pointer is the
   *     clock" rule `cursor-glow.tsx` and `kanban.tsx`'s own carry state
   *     already write down for this kit.
   *   · THE OTHER TABS SLIDE LIVE. The moment the dragged tab's OWN centre
   *     crosses a neighbour's original centre, that neighbour's own
   *     `translateX` steps by the dragged tab's width (plus the strip's
   *     own gap) to open the slot — Chrome's own "make room before you let
   *     go" — rather than waiting for a drop to reveal where it landed.
   *   · RELEASE SETTLES IT. Every transform clears on pointer-up (or
   *     pointer-cancel) with a short settle transition, and `onReorder`
   *     fires exactly once, with the FINAL slot — never once per frame.
   *
   * `fromIndex`/`toIndex` are UNCHANGED as a contract — positions in the
   * `items` array the caller passed, applied with a plain `splice`, exactly
   * as the native-drag build already shipped it and exactly as `onClose`
   * hands back an index rather than mutating anything itself. Nothing
   * downstream of this file (the app's `AgentTabStrip`, the demo) has to
   * change to keep working.
   *
   * A tab with `closable: false` (pinned) is never a drag SOURCE (no
   * pointer handler is attached to it at all) and never a landing SLOT —
   * `movableRange` below stops the contiguous run at the first pinned
   * neighbour on either side, so the run a dragged tab can reorder within
   * never reaches past one. A pinned tab therefore never moves and is never
   * crossed, which is what keeps trailing pinned tabs (History, "+") pinned
   * last with no extra bookkeeping.
   *
   * Alt+ArrowLeft / Alt+ArrowRight on a focused, movable tab still moves it
   * one movable slot in that direction — untouched by today's ruling, which
   * was about the POINTER gesture only.
   *
   * Omitted, no tab carries a pointer handler and no `onKeyDown` is added —
   * byte-identical to the strip before this feature existed.
   */
  onReorder?: (fromIndex: number, toIndex: number) => void;
  /**
   * `"natural"` (the default) is the strip's original answer to running out
   * of room: every tab holds its own content width and the whole row
   * scrolls once the trail (or tab set) is wider than its slot. Byte-
   * identical to this component before the prop existed.
   *
   * `"shrink"` makes the tabs FIT the container instead: named for what it
   * does, not for the width it happens to be built against, because the
   * next narrow slot this strip is asked to fill will not be 380px either.
   * Every tab still open shares the available room and shrinks together —
   * flex-basis 0, a `max-content` ceiling so a short trail is never
   * stretched past its own label width, a `~4ch + close ×` floor below
   * which the row scrolls instead — while any trailing `closable: false`
   * run (History, "+") is pulled OUTSIDE the shrinking list into its own,
   * never-shrinking, always-visible box at the strip's end. Requires
   * `onClose`: see `STRIP_SHRINK_ROW`'s own comment for the whole
   * mechanism and the defect it answers.
   */
  fit?: "natural" | "shrink";
  onCurrentActivate?: () => void;
  /**
   * The accessible name for the button `onCurrentActivate` turns the live
   * crumb into. Falls back to the crumb's own visible label. A caller whose
   * tab doubles as a toggle should say what THIS press does —
   * `screen-shell.tsx` passes "Close the assistant", not "Assistant", so a
   * reader hears the action rather than the location.
   */
  currentActivateLabel?: string;
  /**
   * Published as the button's `aria-expanded` when `onCurrentActivate` is
   * given. Omit it if the control this crumb doubles as is not a
   * disclosure.
   */
  currentActivateExpanded?: boolean;
}

/**
 * The trail as a strip of folder tabs, left to right, ending in the tab that
 * is the card below it.
 *
 * TEN STATES
 *  1. default        — one tab per level: every tab but the live one on the
 *                      rest paper, the live one on the card's own. The live
 *                      tab is the LAST unless `activeIndex` says otherwise. A
 *                      single-level location is ONE tab with nothing to its
 *                      left, which is correct and is not an empty state.
 *  2. hover          — per tab, and only on the ones that are links: a preview
 *                      of the active weight at a fixed ink. No fill move and
 *                      no opacity, which is the tab's own hover unchanged. The
 *                      live tab has none. A close control (`onClose`) carries
 *                      its own, and it is the only hover in this file that
 *                      moves a FILL: `bg-accent`, the kit's neutral item wash,
 *                      because the control has no resting fill of its own —
 *                      see `TAB_CLOSE`.
 *  3. focus-visible  — NOT here. tokens.css §8 rings every control at once.
 *                      The strip holds four pixels of block-start padding open
 *                      so its own `overflow` cannot clip the ring. A close
 *                      control is a real `<button>` and is rung by that one
 *                      rule like everything else; it sits in the tab order
 *                      immediately after the tab it closes.
 *  4. active/pressed — does not apply. A crumb navigates; the acknowledgement
 *                      is the next screen, which is louder than a 1px drop.
 *  5. disabled       — an item with no `href` renders as the non-link crumb on
 *                      the rest paper: a level you can see and not visit. There
 *                      is no greyed-out tab, and no `--btn-disabled-fill` — a
 *                      dead folder tab was the tab VARIANT's state and a trail
 *                      has no dead steps.
 *  6. loading        — does not apply. A trail is known before the page it
 *                      describes is; that is what it is for.
 *  7. empty          — `items: []` renders `null`. Not an empty landmark, not
 *                      one bare tab.
 *  8. error          — does not apply. A trail reports nothing.
 *  9. selected       — exactly one tab: the card's fill, primary ink at
 *                      `--font-weight-medium`, and `aria-current="page"` — so
 *                      the meaning survives without colour. It is the LAST tab
 *                      unless `activeIndex` names another, and it is no tab at
 *                      all when `activeIndex` points outside the array, which
 *                      is a real state for a tab set and not an unguarded
 *                      edge. UNLESS the call site passed `onCurrentActivate`,
 *                      in which case this tab is a control, not a location,
 *                      and renders as a real `<button>` with the caller's own
 *                      label and `aria-expanded` in place of `aria-current` —
 *                      see that prop's own doc.
 * 10. read-only      — always, and it is the trail's default answer. TWO props
 *                      each add a real control without changing it for anyone
 *                      who does not pass them: `onCurrentActivate` makes the
 *                      live tab itself a `<button>`, and `onClose` adds a
 *                      second `<button>` BESIDE each tab's link — a sibling
 *                      inside the `<li>`, never nested in the anchor, which is
 *                      invalid markup and is what made the app's own stopgap
 *                      unreachable to a keyboard. Every tab a call site does
 *                      not opt in stays read-only.
 *
 * THREE BREAKPOINTS
 *  mobile — NOT TABS AT ALL since 2026-09-04. The client: "in monile, lets use
 *  normal breadcrumbs (like they ware before, jhust teh text)". Below `md` the
 *  strip is `display: none` and the trail is `breadcrumbs.tsx`'s plain text
 *  form — same items, same parts, same landmark name — wrapping rather than
 *  scrolling, with every crumb shown and every ancestor still a link. See
 *  `TEXT_TRAIL` for the whole mechanism and for why the fold does not follow
 *  it down there. THE TWO EXCEPTIONS ARE `onCurrentActivate` AND `onClose`:
 *  both mark a call site whose crumbs are CONTROLS rather than a location in a
 *  trail — one tab that acts, or a set of peers that can be shut — and the
 *  mobile ruling is about the trail. Either one keeps the tab strip at every
 *  width, because swapping it for words would delete the affordance at the
 *  width where it is needed most; see those props.
 *  tablet / desktop — the strip, and the geometry is UNCHANGED at every width
 *  from `md` up; what changes is what it does when it runs out of room, and
 *  that changes continuously rather than at a breakpoint. The strip scrolls on
 *  the inline axis; a trail deeper than `foldAfter` has already folded its
 *  middle before width is consulted, because the fold is a CONTENT rule and
 *  the client set its number. A TAB SET (`onClose`) never folds at any width
 *  and scrolls instead — see that prop for why a folded tab could be opened
 *  but not closed.
 *
 * RTL — LTR only, inherited from `FolderShape`. See the file header.
 */
const BreadcrumbFolders = React.forwardRef<HTMLElement, BreadcrumbFoldersProps>(
  (
    {
      items,
      label = "Breadcrumb",
      foldAfter = FOLD_AFTER,
      ellipsisLabel,
      className,
      listClassName,
      activeIndex,
      onClose,
      closeLabel = "Close",
      formatCloseLabel,
      onCurrentActivate,
      currentActivateLabel,
      currentActivateExpanded,
      onReorder,
      fit = "natural",
      ...props
    },
    ref,
  ) => {
    /* DRAG STATE FOR `onReorder` — ONLY the index currently picked up needs
       to be React state; it drives `data-dragging` and the `motion-drag`
       lift, both of which change once per gesture (on pick-up, on
       release), not once per pointer-move. `null` at rest, which is also
       every render where `onReorder` is not given (no pointer handler is
       ever attached, so this never changes). */
    const [carryingIndex, setCarryingIndex] = React.useState<number | null>(null);

    const isMovable = React.useCallback(
      (index: number) => onReorder !== undefined && items[index]?.closable !== false,
      [items, onReorder],
    );

    /* THE KEYBOARD DOOR — Alt+ArrowLeft/Right on a focused movable tab moves
       it to the next or previous MOVABLE slot, skipping over any pinned tab
       rather than swapping into its place (a pinned tab is never a landing
       spot, same rule the pointer handlers below enforce). Untouched by
       today's pointer-drag ruling, which was about the mouse/touch gesture
       only. */
    const moveByKeyboard = React.useCallback(
      (fromIndex: number, direction: -1 | 1) => {
        if (!onReorder || !isMovable(fromIndex)) return;
        let toIndex = fromIndex + direction;
        while (toIndex >= 0 && toIndex < items.length && !isMovable(toIndex)) {
          toIndex += direction;
        }
        if (toIndex < 0 || toIndex >= items.length) return;
        onReorder(fromIndex, toIndex);
      },
      [items.length, isMovable, onReorder],
    );

    /* EVERY RENDERED `<li>`, BY ITS OWN `items` INDEX — an imperative map,
       not React state, because the pointer handlers below read and write
       these nodes' `style.transform` on every `pointermove` and a re-render
       per frame is exactly what a dragged tab must not cost. Populated by
       the composed ref callback in the render below; a `<li>` that leaves
       the DOM (closed, folded) removes its own entry. */
    const itemRefs = React.useRef<Map<number, HTMLLIElement>>(new Map());

    /* EVERY RENDERED `<li>`'s OWN BASELINE STACK NUMBER, BY `items` INDEX —
       written fresh on every render (see the `.map` below, right beside the
       ref callback that populates `itemRefs`) and read back by
       `releaseTransforms` once a drag ends. It exists because
       `restZIndex`'s value depends on where a tab sits AMONG THE CURRENTLY
       RENDERED tabs (`entry`'s position and `rendered.length`), which a
       `useCallback` closed over once could not see change — a `ref`, read at
       call time rather than closed over, always answers with the number the
       MOST RECENT render gave that tab, fold or reorder included. */
    const zIndexRef = React.useRef<Map<number, number>>(new Map());

    /* THE CONTIGUOUS RUN A DRAGGED TAB MAY REORDER WITHIN — walked outward
       from `fromIndex` while the neighbour on each side is itself movable.
       A pinned tab (`closable: false`) stops the walk on that side without
       being included, which is the whole mechanism behind "a pinned tab is
       never crossed": the run this returns never reaches past one, so nothing
       below ever measures, displaces or targets a pinned neighbour. */
    const movableRange = React.useCallback(
      (fromIndex: number): [number, number] => {
        let min = fromIndex;
        while (min - 1 >= 0 && isMovable(min - 1)) min -= 1;
        let max = fromIndex;
        while (max + 1 < items.length && isMovable(max + 1)) max += 1;
        return [min, max];
      },
      [items.length, isMovable],
    );

    /* ONE DRAG'S WHOLE STATE, IN A REF — not React state, for the reason
       `itemRefs` is one: every field here is read and written from
       `pointermove`, and only `carryingIndex` (above) needs to reach a
       render. `others` is the run's geometry at PICK-UP time, captured once
       — Chrome's own tabs do not re-measure mid-drag either, they reorder
       against where things STARTED, which is what makes the "crosses the
       midpoint" rule stable rather than chasing a target that is itself
       moving. */
    const dragRef = React.useRef<{
      fromIndex: number;
      pointerId: number;
      startClientX: number;
      min: number;
      draggedLeft: number;
      draggedWidth: number;
      minLeft: number;
      maxLeft: number;
      gap: number;
      /* Every OTHER movable tab in the run, in strip order, with its
         ORIGINAL centre (inline-axis px, relative to the strip). */
      others: { index: number; center: number }[];
      /* This dragged tab's own rank among `others` at pick-up — i.e. how
         many of them sit to its left. Constant for the whole gesture; see
         `toIndex`'s own derivation below for why. */
      localSlot: number;
      /* The live candidate drop position, in `items`-array terms, recomputed
         every `pointermove` and read once on release. Starts equal to
         `fromIndex` — "no move yet" — which is also what makes a plain
         click-with-no-movement a correct no-op (see the pointer-up
         handler). */
      toIndex: number;
      moved: boolean;
      /* THE ELEMENT THE POINTER ACTUALLY WENT DOWN ON — the anchor, the
         live tab's button, or the per-tab × — captured at pick-up so a tap
         that never moved can REPLAY its click there on release. See
         `onTabPointerEnd`'s own comment for why the browser's own click
         cannot be trusted to reach it once this `<li>` has captured the
         pointer. */
      originTarget: HTMLElement | null;
    } | null>(null);

    /* Return every `<li>` this gesture touched — the dragged one and every
       `other` — to its resting transform, with (`animate`) or without
       (an aborted gesture that never moved) a settle transition.

       THE Z-INDEX IS RESTORED, NOT CLEARED — CHANGED 17 Sep 2026 ALONGSIDE
       `restZIndex`. Clearing `style.zIndex` to `""` used to be enough,
       because the CSS fallback it fell back to (`TAB_REST`'s class-level
       `z-0`, on the `<li>`'s inner link — see that constant's own comment)
       was the SAME number every rest tab shared. It is not any more: each
       tab's real number now only exists as the inline `style` React wrote at
       render time (`zIndexRef`, above — Tailwind cannot emit a class for a
       value it never saw in source). `el.style.zIndex = ""` would have
       fallen through to `auto` on every tab this gesture touched — the exact
       "DOM-order tie, no real ranking" shape the whole mechanism above exists
       to prevent, reintroduced the instant any drag finished. Reading
       `zIndexRef.current.get(index)` instead puts each `<li>` back at the
       SAME number the current render gave it, dragged tab included (its
       `"2"` lift, written by `onTabPointerDown`, is a transient it never
       owned outside the gesture). */
    const releaseTransforms = React.useCallback((indices: number[], animate: boolean) => {
      for (const index of indices) {
        const el = itemRefs.current.get(index);
        if (!el) continue;
        const baselineZ = zIndexRef.current.get(index);
        const restoreZ = () => {
          el.style.zIndex = baselineZ === undefined ? "" : String(baselineZ);
        };
        if (animate) {
          el.style.transition = "transform var(--duration-settle) var(--ease-move)";
          // THE Z-INDEX LIFT OUTLIVES THE TRANSFORM, BY DESIGN — restored
          // only once the settle transition has actually finished, not the
          // instant release fires. Dropping it early would let a sibling it
          // is still sliding past win the tie again for the last
          // `--duration-settle` of the animation, which is the "inactive in
          // front" shape one settle-frame late rather than fixed.
          window.setTimeout(() => {
            el.style.transition = "";
            restoreZ();
          }, 260);
        } else {
          el.style.transition = "";
          restoreZ();
        }
        el.style.transform = "";
      }
    }, []);

    /* PICK UP. Measures the run ONCE — every participant's left edge and
       width, read off the live boxes before anything moves — and captures
       pointer input on the `<li>` itself so every later event in this
       gesture reaches these handlers regardless of where the pointer
       physically travels (off the tab, off the strip, anywhere). */
    const onTabPointerDown = React.useCallback(
      (fromIndex: number) => (event: React.PointerEvent<HTMLLIElement>) => {
        // Left button / primary touch contact only — the same guard a
        // click already gets natively, made explicit because a pointer
        // gesture has no such default.
        if (!onReorder || !isMovable(fromIndex) || event.button !== 0) return;
        const strip = listRef.current;
        const draggedEl = itemRefs.current.get(fromIndex);
        if (!strip || !draggedEl) return;

        const [min, max] = movableRange(fromIndex);
        const stripRect = strip.getBoundingClientRect();

        const others: { index: number; center: number }[] = [];
        let draggedLeft = 0;
        let draggedWidth = 0;
        let runStart = 0;
        let runEnd = 0;
        let previousRight: number | null = null;
        // `--folder-shoulder`'s own NEGATIVE run at the kit's own 16px
        // authoring base — tabs OVERLAP at rest now (`TAB_OVERLAP_MARGIN`,
        // above `STRIP`), so the "gap" between two adjacent boxes is itself
        // negative. This literal is never actually read: the measured
        // sample below replaces it the moment there are two adjacent tabs in
        // the run to measure it from, and a lone tab in its run (nothing to
        // shift) never consults `gap` at all. It is written as the honest
        // resting value anyway, not the old `+4`, so a reader mid-file is
        // not misled about which regime this file draws today.
        let gap = -29.52;

        for (let index = min; index <= max; index += 1) {
          const el = itemRefs.current.get(index);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          const left = rect.left - stripRect.left;
          const right = left + rect.width;
          if (index === min) runStart = left;
          if (index === max) runEnd = right;
          if (previousRight !== null) gap = left - previousRight;
          previousRight = right;
          if (index === fromIndex) {
            draggedLeft = left;
            draggedWidth = rect.width;
          } else {
            others.push({ index, center: left + rect.width / 2 });
          }
        }

        /* CAPTURE, DEFENSIVELY. Every real pointerdown carries an id the
           platform is already tracking, so this never fails for an actual
           finger or mouse — but `setPointerCapture` is specified to THROW
           (`NotFoundError`) for an id the platform is not tracking, and an
           uncaught throw here would abandon the gesture with `carryingIndex`
           already unset and no cleanup run. Caught and refused rather than
           left to reach React: the tab simply does not pick up, exactly as
           if `movable` had been false. */
        try {
          draggedEl.setPointerCapture(event.pointerId);
        } catch {
          return;
        }
        dragRef.current = {
          fromIndex,
          pointerId: event.pointerId,
          startClientX: event.clientX,
          min,
          draggedLeft,
          draggedWidth,
          minLeft: runStart,
          maxLeft: runEnd - draggedWidth,
          gap,
          others,
          localSlot: others.filter((other) => other.index < fromIndex).length,
          toIndex: fromIndex,
          // THE NEAREST REAL CONTROL, NOT `event.target` VERBATIM — every
          // icon inside a tab (the × Phosphor draws, `CrumbShape`'s own
          // silhouette) is SVG, and `SVGElement` has no native `.click()`
          // (that method is `HTMLElement`'s alone; measured, not assumed —
          // a first cut of this fix stored `event.target` directly behind an
          // `instanceof HTMLElement` guard, which is FALSE for an
          // `SVGPathElement`, and silently dropped `originTarget` to `null`
          // on every tap that happened to land on the × glyph rather than
          // its button). `.closest("a, button")` walks up from wherever the
          // pointer actually landed to the one element in a tab that is ever
          // meant to receive a click — the crumb's own link, the live tab's
          // button (`onCurrentActivate`), or the × — so a tap on the icon
          // and a tap on its label forward identically. `null` when neither
          // exists (a tap on bare padding), which is a correct no-op.
          originTarget:
            event.target instanceof Element ? (event.target.closest("a, button") as HTMLElement | null) : null,
          moved: false,
        };
        setCarryingIndex(fromIndex);
        draggedEl.style.transition = "none";
        /* THE SECOND RULING, APPLIED HERE — 16 Sep 2026, same session: "the
           inactive tabs' shape appears in front of the active one … it
           should be behind", the same class of bug the main content strip
           needed several passes to close. A tab sliding under drag can be
           ANY tab, active or not, and it now visually crosses siblings —
           which, since 17 Sep 2026, it does AT REST too (`TAB_OVERLAP_MARGIN`
           puts every tab's box under its predecessor's shoulder on purpose;
           see `STRIP`'s own note and `restZIndex`'s). Left at its resting
           number, a rest tab being dragged RIGHT over a LATER, higher-
           ranked-by-`restZIndex` sibling would lose to it — every rest tab
           still outranks a later one, so a tab dragged rightward would paint
           BEHIND something it is visually sliding on top of. `transform`
           already makes this `<li>` its own stacking context (the file's own
           "z-index IS STILL A STACKING CONTEXT" note, restated for a
           transform rather than a position), so `2` here settles that —
           strictly above the live tab's own flat `1` and every rest tab's
           fractional value, both always `< 1` — with room held below the
           card's own `z-[2]` (a DOM-order tie there, nav before card, still
           resolves to the card, so a horizontal drag still never paints over
           content). Restored to its OWN `restZIndex` — not cleared — on
           release, in `releaseTransforms` (see that function's own note for
           why clearing would have been wrong since 17 Sep 2026).

           THIS INLINE `"2"` WAS NOT THE WHOLE FIX — 16 Sep 2026, third
           correction on this exact silhouette, over a screenshot of the
           STATIC compact strip (no drag in progress at all): "the inactive
           tabs are overlapping [the active one]." This handler only ever
           lifts the tab actually held; `onTabPointerMove` below ALSO writes
           a bare `style.transform` onto every OTHER tab a drag moves past —
           active or not — with no accompanying z-index, and a transform
           alone creates a stacking context. So a tab merely SHIFTED (never
           dragged, never touched here) would lose its own rank the instant
           it moved: sealed inside a new, unnumbered context, tied on DOM
           order against a later, untransformed sibling. The `<li>`'s own
           per-tab number — an inline `style`, written at render and restored
           by `releaseTransforms`, not a class — is what actually closes it:
           a number that lives on the element itself is never touched by the
           plain `transform` `onTabPointerMove` writes (a different CSS
           property), so the shifted tab stays explicitly ranked through the
           whole gesture. This `"2"` still matters on top of that — it is
           what lets the HELD tab beat even the live tab's own `1` while it
           is being dragged, which no tab's own resting number, live or rest,
           would otherwise do (every resting number is `<= 1`). */
        draggedEl.style.zIndex = "2";
      },
      [onReorder, isMovable, movableRange],
    );

    /* TRACK. Every call is one `pointermove`; nothing here waits for a
       frame, because a dragged tab that lags the pointer by even one frame
       is exactly the "confusing" `onReorder`'s own ruling is about.

       EVERY OTHER TAB THIS GESTURE SHIFTS (below, `drag.others.forEach`)
       gets a bare `style.transform` and NO inline z-index — deliberately:
       the `<li>`'s own class-level `z-0`/`z-[1]` (the render's className,
       above) is what has to hold the shifted tab's rank now, precisely
       because a transform alone would otherwise seal whatever z-index the
       INNER link carries into a context this outer comparison cannot see
       into. See that class's own comment, and `onTabPointerDown`'s, for
       the failure this replaced. */
    const onTabPointerMove = React.useCallback((event: React.PointerEvent<HTMLLIElement>) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;

      // THE AXIS LOCK. `newLeft` is clamped to the run's own bounds before
      // anything is written, so the dragged tab can neither cross a pinned
      // neighbour nor overrun the strip's own end; `translateY` is never
      // set anywhere in this handler, so the tab never lifts off the row.
      const rawDeltaX = event.clientX - drag.startClientX;
      const newLeft = Math.min(Math.max(drag.draggedLeft + rawDeltaX, drag.minLeft), drag.maxLeft);
      const deltaX = newLeft - drag.draggedLeft;
      // THE THRESHOLD IS ON `rawDeltaX`, NOT THE CLAMPED `deltaX` — a tab
      // already pinned against the run's own edge (`minLeft`/`maxLeft`)
      // reads `deltaX === 0` for real, sustained pointer travel in the
      // direction it cannot go, and thresholding the clamped number would
      // read that as "never moved" and wrongly replay a click at the end of
      // a genuine (if fruitless) drag attempt. `DRAG_MOVE_THRESHOLD_PX`
      // exists for the opposite reason `onTabPointerEnd`'s own tap-forward
      // does: ordinary human input rarely lands a mouseup at the EXACT pixel
      // a mousedown started on, so a bare `!== 0` test (this file's own,
      // before today) flagged nearly every plain click as "moved" and let
      // the click-guard below swallow it — a second contributor to "after
      // you implemented the drag tabs, I can no longer click them to open
      // them", her words, alongside the retargeting bug that guard's own
      // comment explains.
      if (Math.abs(rawDeltaX) > DRAG_MOVE_THRESHOLD_PX) drag.moved = true;

      const draggedEl = itemRefs.current.get(drag.fromIndex);
      if (draggedEl) draggedEl.style.transform = `translateX(${deltaX}px)`;

      // THE MIDPOINT RULE. `target` is how many of the run's OTHER tabs the
      // dragged tab's own centre now sits past, measured against their
      // ORIGINAL centres (captured at pick-up, never re-read mid-drag —
      // see `dragRef`'s own note on why). It is also, directly, this tab's
      // new rank among them.
      const draggedCenter = newLeft + drag.draggedWidth / 2;
      const target = drag.others.filter((other) => other.center < draggedCenter).length;
      const shiftBy = drag.draggedWidth + drag.gap;

      // OPEN THE SLOT. Every other tab the dragged one has moved PAST — its
      // rank was between where the drag started and where it is now — steps
      // aside by exactly the dragged tab's own width plus the strip's gap,
      // opposite the direction of travel; everything else sits still.
      drag.others.forEach((other, position) => {
        const el = itemRefs.current.get(other.index);
        if (!el) return;
        let shift = 0;
        if (target > drag.localSlot && position >= drag.localSlot && position < target) {
          shift = -shiftBy;
        } else if (target < drag.localSlot && position >= target && position < drag.localSlot) {
          shift = shiftBy;
        }
        el.style.transform = shift ? `translateX(${shift}px)` : "";
      });

      // `min + target` — NOT `others[target].index` — because `target` is a
      // COUNT (how many original-order neighbours now sit before the
      // dragged tab), and the run is a contiguous span of `items` indices
      // starting at `min`; a count offset from that start is directly the
      // `items`-array position this gesture is currently proposing, in the
      // exact `(fromIndex, toIndex)` shape `onReorder` has always taken.
      drag.toIndex = drag.min + target;
    }, []);

    /* RELEASE (or cancel). Fires `onReorder` at most once, with the FINAL
       slot only — never mid-drag — and only when the slot actually changed;
       a tap with no movement (`toIndex === fromIndex`) is a correct no-op
       for reordering, and is handled below as the ordinary click it is. */
    const onTabPointerEnd = React.useCallback(
      (event: React.PointerEvent<HTMLLIElement>) => {
        const drag = dragRef.current;
        if (!drag || event.pointerId !== drag.pointerId) return;
        dragRef.current = null;
        setCarryingIndex(null);

        const draggedEl = itemRefs.current.get(drag.fromIndex);
        if (draggedEl?.hasPointerCapture(drag.pointerId)) {
          draggedEl.releasePointerCapture(drag.pointerId);
        }

        releaseTransforms(
          [drag.fromIndex, ...drag.others.map((other) => other.index)],
          drag.moved,
        );

        const committed = event.type === "pointerup" && drag.toIndex !== drag.fromIndex;
        if (committed) onReorder?.(drag.fromIndex, drag.toIndex);

        /* THE TAP FORWARD — 17 Sep 2026, her report: "after you implemented
           the drag tabs, I can no longer click them to open them" — every
           tab, on BOTH strips, its × included, real clicks measured doing
           nothing (no navigation, no hash change, no console error).
           MEASURED, not guessed: `setPointerCapture` (`onTabPointerDown`,
           on pick-up) makes this `<li>` the target of every later pointer
           event for this gesture AND of the `click` the browser derives from
           it — not "the click reaches the `<li>` first and bubbles from the
           anchor", the click's OWN `.target` becomes the `<li>` directly,
           which is the ancestor of the anchor/button/× a reader actually
           meant to press, never the element itself or a descendant of it.
           An event does not re-dispatch itself down into descendants of its
           own target, so the anchor's native "follow this link" and the
           button's `onClick` never fire — for a PLAIN TAP exactly as much as
           for a real drag, since capture is taken on every `pointerdown`
           this handler ever sees, movement or none. Confirmed against a real
           Chromium `pointerdown`/`pointerup` pair with no synthetic click
           dispatched by hand: the browser's own derived `click` lands with
           `event.target` equal to this `<li>`, never the anchor beneath it.

           So a tap that never became a drag needs its click REPLAYED, at
           the exact element the pointer went down on (`drag.originTarget`,
           captured before capture could retarget anything) — `.click()`,
           called directly on that element, is a fresh dispatch targeted
           exactly where it is called, not subject to the retargeting above,
           the same activation the browser's own click would have produced
           had this `<li>` never captured a pointer at all. Gated on
           `!drag.moved` (never fires for a real drag — see the swallow
           guard below, which still exists for a DIFFERENT reason) and on
           `event.type === "pointerup"` (never for `pointercancel`, an
           aborted gesture with no activation to replay). */
        if (event.type === "pointerup" && !drag.moved && drag.originTarget) {
          drag.originTarget.click();
        }

        /* THE CLICK GUARD. A pointer gesture that actually moved still ends
           in the browser's own derived `click`, retargeted to this `<li>`
           by the SAME mechanism the tap-forward above works around — so, as
           of today, that click was never going to reach the anchor or
           re-select anything on its own. This guard is kept anyway, as a
           second line of defence against any future change that stops
           relying on capture's retargeting (a `<li>` with its own `onClick`
           some day, say): swallowed once, on the dragged element itself,
           only when the gesture actually moved. */
        if (draggedEl && drag.moved) {
          const swallow = (clickEvent: MouseEvent) => {
            clickEvent.preventDefault();
            clickEvent.stopPropagation();
          };
          draggedEl.addEventListener("click", swallow, { capture: true, once: true });
          window.setTimeout(() => {
            draggedEl.removeEventListener("click", swallow, { capture: true });
          }, 0);
        }
      },
      [releaseTransforms, onReorder],
    );
    /* THE STRIP'S OWN NODE, KEPT SEPARATELY FROM `ref`. `ref` above is the
       forwarded `<nav>` — `Breadcrumb`'s own root — and the thing that needs
       scrolling is the `<ol>` one level in, the same node `STRIP`'s
       `overflow-x-auto` lives on. `BreadcrumbList` already forwards a ref to
       it, so this costs the component nothing it did not already have
       wired.

       WHY THIS EXISTS AT ALL. `STRIP`'s own comment above already argues the
       strip scrolls instead of wrapping BECAUSE the crumb that must never be
       lost — the current location — is the LAST one, and "an inline scroller
       keeps it in view when the strip is scrolled to its end." That sentence
       described a scroller that was ALREADY at its end. It never was: a
       freshly mounted `overflow-x-auto` box starts at its leading edge, full
       stop, with no browser behaviour that moves it anywhere else on its
       own. So a trail past four or five levels, or a single long client
       name at a narrow width — `TAB`'s own `shrink-0` guarantees a tab never
       gives up room to fit, which is correct and is also why this bites —
       loaded with exactly the one crumb that answers "where am I" sitting
       off-screen until the reader scrolled it into view by hand. */
    const listRef = React.useRef<HTMLOListElement>(null);

    /* THE LIVE TAB'S OWN NODE, BECAUSE "THE LAST ONE" STOPPED BEING AN ANSWER
       ON 2026-09-06. Everything above is about keeping the crumb that answers
       "where am I" in view, and that crumb is the LIVE one — which was the
       last one until `activeIndex` existed and is wherever the caller says
       now. Reading `lastElementChild` would scroll a workspace tab set to a
       tab the reader is not on. `BreadcrumbItem` forwards a ref to its `<li>`,
       so this is the same "already wired" the strip's own ref is; exactly one
       item in the map is handed it. It stays null when `activeIndex` points
       outside the array — a tab set with nothing live — and the fallback
       below is then the behaviour this file has always had. */
    const liveRef = React.useRef<HTMLLIElement>(null);

    /* Hoisted above the effect because hooks may not sit behind the empty
       guard, and because the effect depends on it. `-1` on an empty array is
       harmless: the effect returns before reading it. */
    const activeCrumb = activeIndex ?? items.length - 1;

    React.useEffect(() => {
      if (items.length === 0) return;
      const strip = listRef.current;
      if (!strip) return;
      const lastTab: Element | null = liveRef.current ?? strip.lastElementChild;
      if (!lastTab) return;

      /* `inline: "end"`, NOT A COMPUTED `scrollLeft`. A hand-rolled "scroll
         to the trailing edge" is `el.scrollLeft = el.scrollWidth -
         el.clientWidth` in LTR, but that expression is wrong or
         browser-dependent in RTL — Chrome reports a negative `scrollLeft` at
         the trailing edge, Firefox a positive one measured from the other
         side, and old WebKit a positive one that counts the other direction
         again — three different sign conventions for the one idea of "all
         the way to the end". `Element.scrollIntoView`'s `inline` axis is
         defined in terms of the box's own writing direction, so `"end"`
         already means the trailing edge in whichever direction `dir` makes
         that, on every engine, with nothing here reading `dir` itself. This
         file's own header calls the SILHOUETTE "LTR only, inherited [from
         `FolderShape`]" — the glyph has no mirroring ruling yet — but "every-
         thing this file writes is logical anyway", and this line is what
         that sentence promises made good: the strip's OWN layout follows
         `dir` for free, same as its `ps-`/`pe-` padding already does.

         `block: "nearest"` keeps this to the strip's own axis. Without it,
         bringing an element "into view" is free to nudge an ancestor's
         vertical scroll too if the browser judges that helpful; the strip is
         the only thing here with horizontal overflow, so `nearest` on the
         block axis means every vertical scroller up the tree reports "already
         visible" and does nothing, and only the strip's `overflow-x-auto`
         actually moves.

         `behavior` IS LEFT UNSET, WHICH IS INSTANT HERE, AND THAT IS THE
         REDUCED-MOTION ANSWER RATHER THAN A `matchMedia` CHECK BESIDE IT. The
         default resolves to the scrolling box's own `scroll-behavior` CSS
         property, which is `auto` (instant) unless something sets `smooth`
         — nothing in `tokens.css`, `motion.css` or `STRIP` above does, so
         there is no motion to suppress under `prefers-reduced-motion` and no
         duration or curve for this file to invent in place of one. A trail
         that jumps straight to its end on load reads as "this is where the
         page already was", which is the correct read for the very first
         paint. */
      /* `"end"` ONLY WHERE "END" IS WHAT THE ELEMENT IS. Aligning the LAST
         tab to the strip's trailing edge is the same thing as scrolling the
         strip to its end, which is the measured behaviour above and what
         `verify/breadcrumb-folder/`'s `lastTabEndAligned` asserts. Aligning a
         MIDDLE tab to that edge is a different and worse thing: it would
         shove every tab after the live one out of sight to satisfy a word,
         when the live tab may well already be perfectly visible. `"nearest"`
         is defined to do nothing at all when the element is in view and the
         smallest scroll that brings it in when it is not, which is the whole
         of what a tab switch wants. The test is the ELEMENT'S POSITION, not
         the prop — so every caller that exists today takes the `"end"` branch
         it has always taken, whether or not it passes `activeIndex`. */
      const inline = lastTab === strip.lastElementChild ? "end" : "nearest";
      lastTab.scrollIntoView({ inline, block: "nearest" });
      // Depends on `items` and on WHICH crumb is live (not on `rendered` or
      // `foldAfter`): the fold only ever hides the MIDDLE of the trail, so the
      // destination changes exactly when the trail or the active tab does, and
      // a screen whose depth crossed `foldAfter` never rescrolls to the same
      // place twice.
    }, [items, activeCrumb]);

    if (items.length === 0) return null;

    /* THE PHONE'S TRAIL, AND WHY IT IS NOT RENDERED FOR EVERY CALLER.
       `onCurrentActivate` marks the one call site where the last crumb is a
       CONTROL rather than a location — `screen-shell.tsx`'s assistant tab,
       which the client asked for one day earlier in those exact terms: "i want
       to close the assistant by clicking on its folder tab, that should
       minimize it." Swapping that for a word would delete the affordance she
       had just asked for, on the width where it is most needed: the assistant
       is an OVERLAY on a phone, so its tab is the thing standing between an
       open column and the screen underneath. The mobile ruling is about the
       breadcrumb TRAIL — "normal breadcrumbs… just the text" — and a single
       tab that is a button is not one. So that path keeps its tab at every
       width, which also keeps the promise this prop's own doc makes: it adds
       a second path through the tab shape and changes nothing about the
       first.

       `onClose` IS THE SECOND SUCH MARK, ADDED 2026-09-06, AND THE ARGUMENT
       IS THE SAME ONE RUNNING A SECOND TIME. A set of tabs the reader may
       shut is not "normal breadcrumbs… just the text" either: text has
       nowhere to put a close control, so the phone would show a trail of
       words and the tabs the reader opened could only be closed by finding a
       tablet. Deleting the affordance at the width where an open tab is most
       in the way is the same loss the sentence above refuses. So a tab set
       keeps its strip at every width, which is also what makes the close
       control's own answer to the 44 touch row honest — see `TAB_CLOSE`.

       `Breadcrumbs` returns `null` on an empty array too, so the guard above
       covers both drawings and neither can render a bare landmark. */
    const textTrail = onCurrentActivate === undefined && onClose === undefined;

    /* A TAB SET DOES NOT FOLD. `onClose`'s own doc carries the argument: the
       `···` menu can re-open a hidden crumb and cannot close one — a
       `role="menuitem"` row moves focus with the arrow keys, so a second
       control inside it is not keyboard-reachable at all — and a fold that
       can only half-serve a tab is the very half-affordance this prop was
       added to remove. `collapse(items, undefined)` is `breadcrumbs.tsx`'s own
       "show every crumb"; the strip's `overflow-x-auto` and the effect above
       are what handle a set too wide for its slot, which is also what a
       browser does with a tab strip. */
    const rendered =
      onClose === undefined
        ? fold(items, foldAfter, activeCrumb)
        : collapse(items, undefined);
    const hidden = items.filter(
      (_, index) =>
        !rendered.some((entry) => entry.kind === "item" && entry.index === index),
    );

    /* `fit="shrink"`'s OWN SPLIT, COMPUTED ONCE. The trailing run of
       `closable: false` entries — History, "+", walked from the END of
       `rendered` so it stops at the first entry that is either closable or a
       fold gap — is what `STRIP_SHRINK_ROW`'s own comment calls "pulled
       OUTSIDE the shrinking list". `pinned` is that run; `scrollable` is
       everything before it, the part that actually shrinks. In `fit=
       "natural"` mode `pinned` is always empty and `scrollable` is `rendered`
       unchanged, so nothing below this line does anything different from
       before the prop existed. */
    let shrinkSplit = rendered.length;
    if (fit === "shrink") {
      for (let index = rendered.length - 1; index >= 0; index -= 1) {
        const entry = rendered[index];
        if (entry.kind === "item" && items[entry.index].closable === false) {
          shrinkSplit = index;
        } else {
          break;
        }
      }
    }
    const scrollable = rendered.slice(0, shrinkSplit);
    const pinned = rendered.slice(shrinkSplit);

    /**
     * One close control's accessible name.
     *
     * "Close" alone, repeated down a strip of six, tells a reader that six
     * things can be closed and nothing about which — so the verb is joined
     * with the crumb's own label. The item's own `closeLabel` wins outright;
     * `formatCloseLabel` replaces the join for a language "verb: name" does
     * not fit; and a label that is a NODE rather than a string yields the bare
     * verb, because an accessible name cannot be read out of arbitrary markup
     * and a guess here is a wrong announcement rather than a missing one.
     * That last case is exactly what the item's own `closeLabel` is for, and
     * it is the same trio `filter-bar.tsx` already runs for its chips.
     */
    const joinCloseLabel = (item: BreadcrumbFoldersItem): string => {
      if (item.closeLabel !== undefined) return item.closeLabel;
      const asText = typeof item.label === "string" ? item.label : "";
      if (formatCloseLabel) return formatCloseLabel(asText, closeLabel);
      return asText ? `${closeLabel}: ${asText}` : closeLabel;
    };

    /**
     * One tile of the strip — a fold gap or a real crumb — pulled out of the
     * `<ol>.map()` it used to live inside so `fit="shrink"` can call it
     * twice, once per list, rather than forking the whole render. `shrinkTab`
     * is the ONLY thing that changes between the two calls: `false` renders
     * byte-identical output to this component before `fit` existed (which is
     * what every `fit="natural"` caller still gets, and what the PINNED half
     * of a `fit="shrink"` strip gets too — History and "+" never shrink).
     * `i` stays the strip's own visual-position argument `restZIndex` has
     * always taken; callers pass the tile's position across the WHOLE
     * strip, pinned tiles included, so the stacking order is continuous
     * across both lists exactly as it was across the one.
     */
    const renderCrumb = (entry: Rendered, i: number, shrinkTab: boolean) => {
      if (entry.kind === "gap") {
        return (
          <BreadcrumbItem
            key="breadcrumb-folders-gap"
            className="shrink-0"
            style={{ zIndex: restZIndex(i) }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger
                data-slot="breadcrumb-folders-fold"
                style={{ zIndex: restZIndex(i) }}
                // `group` HERE, NOT ON AN ANCESTOR — this tile has no
                // close button and no sibling to hover independently
                // of; the trigger IS the whole hoverable box, so it
                // is its own group for `FILL_REST_HOVER`'s
                // `group-hover:`.
                className={cn(TAB, TAB_REST, "group")}
              >
                <CrumbShape fill={FILL_REST} hoverFill={FILL_REST_HOVER} />
                {/* The kit's own elision, reused whole: the glyph is
                    `aria-hidden` and the announced label sits OUTSIDE
                    that wrapper, which is the half of this component
                    everybody gets wrong. A second drawing of "the middle
                    is missing" is exactly what this file must not
                    invent. */}
                <BreadcrumbEllipsis label={ellipsisLabel} />
              </DropdownMenuTrigger>
              {/* …and it OPENS what it hides. `breadcrumb.tsx`'s own
                  note on `BreadcrumbEllipsis` says where this belongs:
                  "Where a call site makes the elision expandable it
                  wraps this in a `DropdownMenuTrigger`, and that control
                  owns every state including its ring." */}
              <DropdownMenuContent align="start" aria-label={ellipsisLabel}>
                {hidden.map((item, index) => (
                  <DropdownMenuItem
                    key={item.key ?? `breadcrumb-folders-hidden-${String(index)}`}
                    asChild={item.href !== undefined}
                    disabled={item.href === undefined}
                  >
                    {item.href === undefined ? (
                      <span>{item.label}</span>
                    ) : (
                      <a href={item.href}>{item.label}</a>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </BreadcrumbItem>
        );
      }

      const live = entry.index === activeCrumb;
      const key = entry.item.key ?? `breadcrumb-folders-${String(entry.index)}`;

      /* READ THE CLOSE FIELDS OFF `items`, NOT OFF `entry.item`.
         `collapse()` is the TRAIL's fold rule and it hands back
         `BreadcrumbsItem` — the shared shape, which deliberately does
         not carry `closable` or a per-item `closeLabel` (see
         `BreadcrumbFoldersItem` for why those two live only on this
         drawing's item). `entry.index` is the index into the array
         the caller passed, so this is the same object with its own
         type intact, not a second lookup. */
      const item = items[entry.index];
      const closable = onClose !== undefined && (item.closable ?? true);
      const movable = isMovable(entry.index);

      /* THIS TAB'S OWN STACK NUMBER — `1`, flat, for the live tab
         (unchanged since 2026-09-03); `restZIndex(i)` for every other
         one, strictly descending by strip position. Written into
         `zIndexRef` HERE, during render, so `releaseTransforms` can
         restore exactly this number once a drag that touched this tab
         ends — see that function's own comment. */
      const stackZ = live ? 1 : restZIndex(i);
      zIndexRef.current.set(entry.index, stackZ);

      /* `fit="shrink"`'s OWN LABEL WRAP — ONLY on a tab this call marked
         shrinkable. `LABEL_SHRINK`'s own comment has the truncation
         mechanism; a pinned or natural-mode tab renders the label exactly
         as it always has, an unwrapped node. */
      const label = shrinkTab ? <span className={LABEL_SHRINK}>{entry.item.label}</span> : entry.item.label;

      return (
        <BreadcrumbItem
          key={key}
          /* THE `<li>` IS THE POSITIONING PARENT, AND ONLY WHEN THERE
             IS SOMETHING TO POSITION. `relative` is what lets the
             close button be laid over the tab while remaining the
             link's SIBLING rather than its child. THE REF GOES ON THE
             LIVE ITEM ONLY, and ALSO registers this `<li>` into
             `itemRefs` for every entry — see those refs' own comments
             above. */
          ref={(node: HTMLLIElement | null) => {
            if (node) itemRefs.current.set(entry.index, node);
            else itemRefs.current.delete(entry.index);
            if (live) liveRef.current = node;
          }}
          data-dragging={carryingIndex === entry.index ? "true" : undefined}
          // NO HANDLER AT ALL ON A PINNED TAB (`movable` false) — the
          // refusal IS the rule, same as the native-drag build's own
          // "never a drop target".
          onPointerDown={movable ? onTabPointerDown(entry.index) : undefined}
          onPointerMove={movable ? onTabPointerMove : undefined}
          onPointerUp={movable ? onTabPointerEnd : undefined}
          onPointerCancel={movable ? onTabPointerEnd : undefined}
          onKeyDown={
            movable
              ? (event) => {
                  if (!event.altKey) return;
                  if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    moveByKeyboard(entry.index, -1);
                  } else if (event.key === "ArrowRight") {
                    event.preventDefault();
                    moveByKeyboard(entry.index, 1);
                  }
                }
              : undefined
          }
          // THE SILHOUETTE'S OWN STACKING AUTHORITY LIVES HERE, ON THE
          // `<li>`, AS AN INLINE STYLE — see `stackZ`'s own comment and
          // `restZIndex`'s for the whole reasoning; unchanged by
          // `fit="shrink"`, which never touches z-order.
          style={{ zIndex: stackZ }}
          className={cn(
            // `fit="shrink"`'s OWN SIZING, ONLY ON A SHRINKABLE TAB —
            // `TAB_SHRINK_ITEM`/`TAB_SHRINK_MIN_WIDTH`'s own comments
            // have the mechanism. Every other tile (natural mode, or a
            // pinned tile in shrink mode) keeps the original `shrink-0`.
            shrinkTab ? TAB_SHRINK_ITEM : "shrink-0",
            shrinkTab && TAB_SHRINK_MIN_WIDTH,
            "group",
            closable && "relative",
            movable && "motion-drag cursor-grab touch-none select-none",
          )}
        >
          {live ? (
            onCurrentActivate ? (
              /* THE ONE CALL SITE WHERE THE LIVE TAB IS A CONTROL. See
                 `onCurrentActivate`'s own prop doc. */
              <button
                type="button"
                data-slot="breadcrumb-folders-current-control"
                aria-expanded={currentActivateExpanded}
                aria-label={currentActivateLabel}
                onClick={onCurrentActivate}
                style={{ zIndex: stackZ }}
                className={cn(
                  TAB,
                  shrinkTab && TAB_SHRINK_TAB,
                  TAB_LIVE,
                  "cursor-pointer",
                  closable && TAB_CLOSABLE,
                  item.iconOnly && TAB_ICON_ONLY,
                )}
              >
                <CrumbShape fill={FILL_LIVE} />
                {label}
              </button>
            ) : (
              <BreadcrumbPage
                style={{ zIndex: stackZ }}
                className={cn(
                  TAB,
                  shrinkTab && TAB_SHRINK_TAB,
                  TAB_LIVE,
                  closable && TAB_CLOSABLE,
                  item.iconOnly && TAB_ICON_ONLY,
                )}
              >
                <CrumbShape fill={FILL_LIVE} />
                {label}
              </BreadcrumbPage>
            )
          ) : entry.item.href === undefined ? (
            /* An ancestor with no route — see the original comment on
               this branch, unchanged, above the file's `render` history. */
            <BreadcrumbPage
              aria-current={undefined}
              style={{ zIndex: stackZ }}
              className={cn(
                TAB,
                shrinkTab && TAB_SHRINK_TAB,
                TAB_REST,
                "cursor-default hover:font-[var(--font-weight-light)] hover:text-ink-secondary",
                closable && TAB_CLOSABLE,
                item.iconOnly && TAB_ICON_ONLY,
              )}
            >
              <CrumbShape fill={FILL_REST} hoverFill={FILL_REST_HOVER} />
              {label}
            </BreadcrumbPage>
          ) : (
            <BreadcrumbLink
              href={entry.item.href}
              // Browsers make an `<a>` draggable by default; suppressed
              // only when this tab actually is one — see the original
              // comment on this prop for the pointer-gesture reasoning.
              draggable={movable ? false : undefined}
              style={{ zIndex: stackZ }}
              className={cn(
                TAB,
                shrinkTab && TAB_SHRINK_TAB,
                TAB_REST,
                closable && TAB_CLOSABLE,
                item.iconOnly && TAB_ICON_ONLY,
                closable && "group-hover:font-[var(--font-weight-medium)]",
              )}
            >
              <CrumbShape fill={FILL_REST} hoverFill={FILL_REST_HOVER} />
              {label}
            </BreadcrumbLink>
          )}

          {/* ── THE CLOSE CONTROL. A SIBLING OF THE CRUMB, NEVER A CHILD
              OF IT — see the file's own header for why. Unaffected by
              `fit`: a shrinking tab still reserves the identical room for
              it (`TAB_CLOSABLE`, read by `TAB_SHRINK_MIN_WIDTH`'s own
              floor too), so the × never gets closer to the label than it
              does in natural mode. */}
          {closable ? (
            <button
              type="button"
              data-slot="breadcrumb-folders-close"
              aria-label={joinCloseLabel(item)}
              onClick={() => { onClose?.(item, entry.index); }}
              className={cn(TAB_CLOSE)}
            >
              {/* Phosphor's `X`, by Phosphor's own name, at the kit's
                  own icon-in-a-button size. */}
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </BreadcrumbItem>
      );
    };

    return (
      <>
        {/* ── THE PHONE'S TRAIL. Below `md` this is the only trail in the
            document; at `md` and above it is `display: none`, which is to say
            it is not in the accessibility tree and not in the tab order.

            NO `maxItems`, SO NOTHING FOLDS HERE, AND THAT IS THE OPPOSITE OF
            THE STRIP ON PURPOSE. The strip folds at five levels because it
            CANNOT wrap — `STRIP` above says why: a wrapped folder strip puts
            one row of tabs' feet through the next row's shoulders and only
            the bottom row can attach to the card — so its only other answer
            is to scroll, and scrolling is what pushes an ancestor out of
            sight. A text trail has neither problem. `BreadcrumbList`'s own
            header already ruled which answer belongs to a trail that can
            wrap: "Wrapping keeps every crumb reachable; scrolling would hide
            the ancestors, which is the half of the trail a reader is looking
            for." Folding here would ALSO be strictly worse than folding
            there, because the strip's elision opens a menu and this one has
            none: the crumbs it hid would be reachable on a desktop and
            unreachable on a phone. And it is what "like they ware before"
            means literally — no call site in this kit ever passed
            `Breadcrumbs` a `maxItems`, so the trail this product had before
            the tabs showed every level.

            `label` IS SHARED, NOT DOUBLED. One trail, one announced name, in
            one translation unit; a second string would be a second thing to
            translate for a landmark a reader meets only one of.

            `ellipsisLabel` IS NOT PASSED, and its absence is the point: with
            no fold there is no elision to announce.

            THE SEPARATOR IS LEFT AT ITS DEFAULT — `BreadcrumbSeparator`'s
            middle dot, ruled in CH15 (NAV-B1), `aria-hidden` and
            `role="presentation"`. No prop is added here to override it: it is
            a MARK and not a string, it is hidden from assistive technology,
            and the composable form already exposes `children` for the one
            call site that ever needs another one.

            `{...props}` DELIBERATELY DOES NOT COME HERE. The caller's rest
            props are `<nav>` attributes and some of them are unique by
            definition — an `id` on both drawings is invalid markup and would
            break any `aria-labelledby` pointing at it, and a `data-testid`
            on both would match twice. They stay on the strip, which is where
            they already landed before today, so no existing caller's
            attribute moves. THE FORWARDED `ref` STAYS ON THE STRIP FOR THE
            SAME REASON — one node, and it is the one it has always been. A
            caller holding it measures zeros below `md`, which is honest:
            the element it asked for is genuinely not laid out there. No
            caller in this kit passes a ref to this component today, and the
            day one needs the phone's node it should ask for it by name
            rather than have `ref` mean two elements. `className` DOES come here, because it is the
            component's own styling hook and a caller styling "the breadcrumb"
            means the trail rather than one drawing of it; the gate is
            appended AFTER it so a caller cannot accidentally win the display
            utility off it in tailwind-merge. */}
        {textTrail ? (
          <Breadcrumbs
            items={items}
            label={label}
            /* PASSED, AND IT IS THE ONE THING THE TWO DRAWINGS MUST NOT
               DISAGREE ABOUT. `Breadcrumbs` gained the identical prop on the
               same day for exactly this: with liveness pinned to the last
               crumb there, a caller who moved it here would have a phone
               announcing one `aria-current="page"` and a desktop announcing
               another, from one array. `undefined` is the same default on
               both sides, so nothing that does not pass it can drift. */
            activeIndex={activeIndex}
            className={cn(className, TEXT_TRAIL)}
            listClassName={TEXT_TRAIL_LIST}
          />
        ) : null}

        <Breadcrumb
          ref={ref}
          label={label}
          data-slot="breadcrumb-folders"
          className={cn(
            /* TAB-C1's mechanism, for this component's own two papers, and
               declared HERE for the reason that block gives: a caller may rebind
               `--surface-panel` or `--card` around a strip, and the live tab has
               to keep agreeing with the CARD rather than with whatever the
               rebinding made of the panel. Custom properties are substituted at
               computed-value time on the element that declares them, so
               resolving both one level above the tabs is correct in every
               container at once.

               THE LIVE PAPER is the content card's own, by ruling: "the last
               (current location) is same color as the big content card in the
               middle, the main color". `screen-shell.tsx` paints that card
               `--surface-raised`, so that is the token, not `--card` and not
               `--spine-chip-fill` — the two agree in light and part company on
               the mango spine in dark.

               THE REST PAPER is one step off it in the direction the palette
               already steps: `--surface-raised` -> `--surface-panel`, which is
               `--kw-soft-paper` in light and `--kw-unlit-panel` in dark. It is
               the same step `screen-shell.tsx`'s CARD block makes when it
               rebinds a filled control on the card to soft paper (ruling 01),
               and it is derived rather than stated per spine — nothing here
               knows what a spine is.

               MEASURED IN `verify/breadcrumb-folder/` and `verify/tab-joint/`,
               on the two spines the client kept and in both palettes, against
               the ground the strip stands on (`--spine-fill`):

                 MANGO · LIGHT  ground #FED069 · rest #F7F2EB 1.306 · live
                                #FFFEF9 1.440 · rest vs live 1.103
                 MANGO · DARK   ground #FED069 · rest #1C1B18 11.843 · live
                                #26241F 10.661 · rest vs live 1.111
                 QUIET · LIGHT  ground #F7F2EB · rest #EDE8E1 1.094 · live
                                #FFFEF9 1.103 · rest vs live 1.207
                 QUIET · DARK   ground #1C1B18 · rest #1C1B18 1.000 · live
                                #26241F 1.111 · rest vs live 1.111

               THE FIGURE THIS FILE USED TO LOG AS OPEN, RULED, 2026-09-03. A
               resting tab on the quiet spine used to measure 1.000 against the
               ground IN BOTH PALETTES, because the quiet spine IS
               `--surface-panel` (tokens.css §7b) and the rest fill was also
               `--surface-panel` — the same value twice. The client was shown
               drawn alternatives and picked #EDE8E1 for QUIET-LIGHT ONLY, the
               quietest option that still reads as a real step off the ground
               (1.094) rather than the loudest one available: `tokens.css`
               names it `--spine-quiet-crumb-rest` and the reasoning for why it
               is a new value and not a repoint of an existing paper is there.
               QUIET-DARK IS LEFT AT 1.000, DELIBERATELY, NOT AN OVERSIGHT: its
               own `--surface-panel` rest fill sits on a ground the live tab
               already carries at 1.111 (the same step the card itself has), so
               the trail's endpoint never disappears there the way it could on a
               genuinely flat quiet-light strip; the client's ruling was scoped
               to the palette she was shown.

               THE MECHANISM IS PER-SPINE, IN TOKENS.CSS, NOT PER-PALETTE HERE.
               `--kw-crumb-rest` below reads `--spine-crumb-rest` with a
               `var(…, var(--surface-panel))` fallback: `[data-spine="quiet"]`
               binds it to the new paper in light and back to `--surface-panel`
               in both dark blocks (tokens.css, right after that spine's own
               block), and the mango spine never sets it at all, so the fallback
               alone keeps mango's own two papers exactly as measured above.
               This file names no palette and no spine — the whole branch is a
               cascade a caller or a future spine can repoint without touching
               this component, which is the same argument TAB-C1 already made
               for declaring both papers as custom properties instead of
               classes.

               THE ALTERNATIVE CONSIDERED BEFORE THE NEW PAPER, AND WHY IT WAS
               NOT TAKEN. `--muted` (#FAF9F7 / #2F2D28, whose own comment in
               tokens.css reads "inactive tabs, idle wells") is the kit's third
               paper and was the retired folder tab's idle fill; it clears the
               ground on quiet, and it costs mango-light, where rest and live
               would sit 1.021 apart instead of 1.103. `--surface-quiet`
               (#E2DDD4, "cancel buttons, disabled wells") was tried next and
               also withdrawn — a reuse the client did not choose once she saw
               the alternatives drawn. */
            "[--kw-crumb-live:var(--surface-raised)]",
            "[--kw-crumb-rest:var(--spine-crumb-rest,var(--surface-panel))]",
            // THE THIRD PAPER — `FILL_REST_HOVER`'s own comment has the
            // client ruling and the reasoning; declared here for TAB-C1's
            // reason, same as the two above: a caller that rebinds
            // `--accent` around the strip must not be able to make the
            // hover wash disagree with the accent every other hover in its
            // own tree already uses.
            "[--kw-crumb-hover:var(--accent)]",
            className,
            /* LAST, AND CONDITIONAL. Last so a caller's own display utility
               cannot win the gate off this element in tailwind-merge — the
               swap is a ruling, not a default. Conditional because a strip
               that is the ONLY drawing (`onCurrentActivate`, above) must not
               be gated away at a width where nothing would replace it, which
               is how a phone would otherwise lose the assistant's close
               control entirely. */
            textTrail ? STRIP_ONLY : undefined,
          )}
          {...props}
        >
          {fit === "shrink" ? (
            /* THE TWO-LIST STRIP — `STRIP_SHRINK_ROW`'s own comment has the
               whole mechanism. `scrollable` (computed above, beside
               `pinned`) is everything BEFORE the trailing `closable: false`
               run; it renders in the FIRST `<ol>`, the one that actually
               shrinks. `pinned` is that trailing run — History, "+" — in a
               SECOND `<ol>`, `shrink-0`, never inside the first list's own
               `overflow-x-auto`. `renderCrumb`'s own `i` argument keeps
               counting across BOTH lists (pinned tiles start at
               `scrollable.length`), so the stacking order this strip has
               always drawn is unbroken by the split. */
            <div data-slot="breadcrumb-folders-shrink-row" className={STRIP_SHRINK_ROW}>
              <BreadcrumbList ref={listRef} className={cn(STRIP_SHRINK_SCROLL, listClassName)}>
                {scrollable.map((entry, i) => renderCrumb(entry, i, true))}
              </BreadcrumbList>
              {pinned.length > 0 ? (
                <BreadcrumbList className={STRIP_SHRINK_PINNED}>
                  {pinned.map((entry, i) => renderCrumb(entry, scrollable.length + i, false))}
                </BreadcrumbList>
              ) : null}
            </div>
          ) : (
            <BreadcrumbList ref={listRef} className={cn(STRIP, listClassName)}>
              {rendered.map((entry, i) => renderCrumb(entry, i, false))}
            </BreadcrumbList>
          )}
        </Breadcrumb>
      </>
    );
  },
);

BreadcrumbFolders.displayName = "BreadcrumbFolders";

/* ----------------------------------------------------------------------------
   `TAB`, `TAB_REST` AND `TAB_LIVE` ARE NOT EXPORTED, AND THAT WAS ASKED AND
   ANSWERED RATHER THAN OVERLOOKED — 2026-09-06.

   THE ASK IS REAL. An application building anything beside this strip that
   must WEAR the tab skin — a "+" slot at the end of a tab set is the obvious
   one — cannot match it today without transcribing a dozen utilities, and a
   transcription is a copy that drifts the first time this file is touched.

   IT IS STILL A NO, AND THE REASON IS WHAT THE EXPORT WOULD PROMISE. A class
   string is not an interface; it is this component's private working-out,
   and exporting it makes every value in it public API:

     · Everything in the list becomes a breaking change. The z-index moved in
       this very commit, `--folder-shoulder` is inside a `calc` a closable tab
       overrides, and the resting ink was a `[color:…]` workaround until
       `lib/utils.ts` learned that `text-caption` is a font size. All three
       were free to change because nothing outside this folder could see
       them. An export freezes them.
     · tailwind-merge makes it worse rather than better. A consumer writing
       `cn(TAB, TAB_REST, "…")` can silently DELETE any class in the skin by
       naming one in the same group, and the failure is a tab that looks
       nearly right — which is precisely the class of bug this repo's own
       house rules exist to catch, and it would be arriving from outside where
       no check here can see it.
     · The papers are already exported, and they are the part that matters.
       `--kw-crumb-rest` / `--kw-crumb-live` are declared on the `<nav>` as
       custom properties exactly so a caller can reach them (TAB-C1), and
       `data-slot` names every part of the strip for anyone who needs to
       target one. That is a contract this file can keep.

   WHAT TO DO INSTEAD, WHEN THE NEED IS CONCRETE: ship the THING, not the
   string. If the app needs a tab-shaped control that is not a crumb, that is
   a component this folder should export — it can then be drawn once, measured
   in `verify/`, and changed here without a second copy to chase. `FolderShape`
   is already exported and is the half of the skin that is genuinely shared.
   Nothing is logged as owed until a call site names the control it wants;
   guessing at one would be the silent invention the house rules forbid.
   -------------------------------------------------------------------------- */
export { BreadcrumbFolders };
