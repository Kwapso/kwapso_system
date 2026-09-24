"use client"

// FilterBar — the app's binding to the DESIGN KIT's own filter row.
//
// ── WHY THIS IS A REWRITE AND NOT A RESKIN ───────────────────────────────────
//
// Until now this file drew a filter row of its OWN: a wrapping strip of compact
// dropdown triggers, one per facet, each opening a popover, with a "Clear all"
// on the end. The kit ships
// `shared/ui/components/filter-bar/filter-bar.tsx` — `FilterBar`,
// `SearchableFacet` and `RangeFacet`, the SAME THREE NAMES — and nothing in
// `web/`, `web-portal/` or `shared/web/` imported a line of it. So every other
// control in this app converges with the designer's build by construction, and
// this one could not, because we were not drawing her component at all. This
// file is now an ADAPTER: it decides nothing about how a filter LOOKS, and the
// three files that used to (`filter-bar` + `range-facet` + `searchable-facet`,
// 618 lines) are one file of wiring.
//
// ── THE POPOVER IS GONE — CLIENT RULING, 2026-09-02 ──────────────────────────
//
// Until that night the "+ filter"/count slot opened a floating, portaled
// Popover holding every facet's own control, stacked one per line. The client,
// against a confirmed mockup: the slot now toggles a SECOND ROW open directly
// under the WHOLE toolbar — not a popover, not an overlay, an actual sibling
// line. Nothing about the facet controls THEMSELVES changed to do this: every
// facet was already rendered by mapping `facets` once, in one place
// (`RangeFacet`/`CompactFacet`, below), so the panel already showed every
// facet's own field at once. And nothing here inserts an "Apply" step: a pick
// calls `onChange` directly, which is what the client asked to keep — "the
// moment I select sth on a dropdown its applied", and, the same day, "remember
// we dont want apply buton".
//
// ── THE PANEL'S GEOMETRY, IN THREE PASSES. READ ALL THREE ────────────────────
//
// PASS ONE — A FLEX SIBLING INSIDE THE PILL, AND THE BLOB. The first cut made
// the panel a genuine flex child of the toolbar's own `rounded-pill` TRACK
// (this component's root was a `<>` fragment for exactly that). It solved
// WIDTH — the panel's `w-full` finally meant the whole pill once nothing
// capped it — and broke HEIGHT: the panel is several facets deep, `flex-wrap`
// folded it onto a second line INSIDE the pill's own box, and a `rounded-pill`
// (999px) box that tall draws a stadium wide enough to read as a giant oval
// with the controls scattered around it. Caught live on a screenshot; the
// client's words were "lol what is this shit".
//
// PASS TWO — `position: absolute`, AND THE OVERLAY. The fix was to take the
// panel out of normal flow entirely (`absolute inset-x-0 top-full` against a
// `relative` track), so its height could never reach the pill's box model no
// matter how many facets a screen adds. That held the pill's shape and cost
// the other half of the behaviour: an open panel FLOATED over the collection
// instead of moving it, which the client then ruled on — verbatim, 2026-09-02:
// "the expanded toolbar shoudl not be an overlay, but literaly expand the
// space".
//
// PASS THREE — THE COLUMN, WHICH IS NEITHER OF THE TWO. Both earlier passes
// took the same thing for granted: that the panel's only possible parent is
// the pill track. It is not. A column wrapping a host's toolbar in a plain
// `flex-col`, whose children are (a) the pill track, unchanged and still
// fixed-shape, and (b) the panel rendered as its own sibling beneath it, makes
// the panel a NORMAL-FLOW SIBLING of the track rather than a child of it: it
// occupies real space and pushes the collection down (the ruling), and its
// height feeds the COLUMN's box model and never the pill's, because the pill
// is a different box — pass one's bug is structurally impossible now rather
// than merely unlikely. Deleting `absolute`/`top-full` and stopping there is
// pass one again, so `web/test/filter-row-is-the-kits.test.tsx` locks the
// difference: it renders the real `ToolbarRow`, opens the panel, and asserts
// the pill track's own subtree is byte-identical open and closed and never
// contains the panel.
//
// PASS FOUR, SUPERSEDING PASS THREE'S OWN MECHANISM — v1.2.27. Pass three's
// column reached its outlet through a PORTAL: the "Filter" pill has to sit
// INSIDE the track (it is a toolbar control) and the panel has to sit OUTSIDE
// it, and a React element renders into exactly one parent, so a bespoke
// context (`PanelSlot` + `FilterPanelProvider` + `FilterPanelOutlet` +
// `FilterPanelColumn`, ~62 lines) published a DOM node for `createPortal` to
// target — built because neither `ToolbarRow` (screen-bits.tsx) nor the
// kit's own `CollectionFrame` offered a real position to hand a panel node
// to. `CollectionFrame` gained one (`toolbarPanel`) the same release this
// facet work landed in, which is the proof a portal was never the point —
// a POSITION was. `useFilterBar` below returns `{ pill, panel }` as two
// ordinary values instead of rendering both itself, so the CALLER holds both
// pieces already and can hand each to wherever it belongs — `filters` and
// `toolbarPanel`, on `ToolbarRow` or on the kit's `CollectionFrame` directly —
// in one render pass, with no context and no portal. `web/test/filter-row-
// is-the-kits.test.tsx`'s byte-identical assertion above WAS true of the
// track's own subtree at the time and is SUPERSEDED below (pass five) — the
// track stopped carrying its own fill/shape at all, which is a stronger
// property than "unchanged", not a weaker one.
//
// PASS FIVE, SUPERSEDING PASS THREE AND FOUR'S "TWO BOXES" SHAPE — CLIENT
// RULING, 2026-09-03. Verbatim: "what this is doing is creating a new card
// underneath... it kind of creates a second toolbar. This is not the
// behaviour I want. I want it to look together, so merge this with the main
// toolbar so that it's one single background or container, more like expand
// behaviour rather than open-a-new-one behaviour."
//
// Passes three and four solved OVERLAY (the panel is in normal flow and
// pushes the collection down) and left a second fault standing: the track
// and this panel were two `bg-background` boxes — the track `rounded-pill`,
// this panel `rounded-[var(--radius)]` — with a `gap-2` between them. Same
// fill, same tone, visibly separate: precisely "a second toolbar" no matter
// how correctly the overlay question was answered. The fix is NOT pass one
// again (the panel is still never a flex child of the pill, still never feeds
// anything's height into a `rounded-pill` calc) — it is giving the fill and
// the shape to exactly ONE element, the caller's own merged container, and
// having THAT element's shape read off `Boolean(panel)` rather than off any
// box's measured height. `ToolbarRow` (screen-bits.tsx) does this now: one
// `bg-[var(--surface-raised)]` div (fixed off `bg-background` since this pass
// landed — see the same correction below, and check screen-bits.tsx directly
// before trusting a token name in a comment about another file), `rounded-
// pill` with no panel and `rounded-[var(--radius)]` the moment one exists,
// the track and this panel
// both painting nothing of their own. This panel's own div lost its
// `bg-background`/`rounded-[var(--radius)]` for the same reason — see its
// own comment, below. `web/test/filter-row-is-the-kits.test.tsx`'s "the panel
// expands the space" test is rewritten for this pass rather than dropped:
// the pill-inside-the-track regression (pass one) and the floating-overlay
// regression (pass two) are both still asserted against; what changed is
// that the track's OWN box now legitimately carries no fill or radius in
// either state, and the single merged container's radius is asserted to
// switch instead of staying byte-identical.
//
// ── PASS SIX, WHICH RETIRES ALL FIVE — CLIENT RULING, 2026-09-23 ────────────
//
// Aurora, choosing among five drawn designs: "filter drop sheet popover". Read
// against her own earlier sentence, which the five were drawn to answer: the
// filters must open as "a temporary overlay not a second row".
//
// SO PASS TWO WAS RIGHT AND WAS RULED AGAINST, and it is worth saying plainly
// rather than quietly reversing: on 2026-09-02 she said "the expanded toolbar
// shoudl not be an overlay, but literaly expand the space", and passes three,
// four and five are three increasingly careful ways of doing exactly that.
// Every one of them is now superseded, and NOT because the work was wrong.
// What she was rejecting in September was a panel that floated over the rows
// while looking like a detached second card; what she has chosen now is an
// overlay that is unmistakably one: anchored, elevated, dismissable, gone the
// moment it is not wanted.
//
// WHAT THE TWO WORDS MEAN, AND WHY THEY ARE ONE COMPONENT. The recommendation
// she accepted said it: "the two coexist because the sheet is simply a popover
// that ran out of room." A POPOVER hangs under the Filter control, 20rem wide,
// and is right for two or three facets. A DROP SHEET falls from the toolbar
// across its full width and floats over the rows, and is right for four or
// more, because every facet can stay open at once. One component, one
// primitive, two geometries: `FilterOverlay`, beside this file.
//
// AND THE CHOICE IS THE CONTENT'S. `span` below is what the declared facets
// cost in field rows, and `filterOverlayForm` is a pure function of it. No
// screen passes a flag, because a screen that had to would be right once and
// wrong the day a facet was added to it. On a phone neither form has room, so
// it is the kit's own bottom sheet: the answer `sheet.tsx` already gives for
// every other overlay below 45rem.
//
// WHAT THIS COST AND WHAT IT BOUGHT. The `{ pill, panel }` pair is gone;
// `useFilterBar` returns ONE node. The pair existed only because the panel had
// to land somewhere other than the pill, and nothing lands anywhere now. With
// it went `ToolbarRow`'s and `ToolbarColumn`'s `toolbarPanel` slots, the
// engine's two placements of it, and the census that used to catch a caller
// dropping half a return value. A slot nothing fills is an invitation to the
// exact row the ruling forbids, so it was removed rather than left empty, and
// `web/test/filters-open-as-an-overlay.test.tsx` is what says so from the
// outside: at all three widths, opening the overlay changes nothing the
// toolbar renders in flow, and the surface is not a descendant of the toolbar
// at all.
//
// ── THE TOOLBAR SAYS A COUNT, NEVER THE FILTERS — CLIENT RULING, 2026-09-02 ──
//
// Verbatim: "when activce filters, do not display them in the toolbar. only a
// count niside the filter pill (like in artifact)". So the kit's CHIP HALF —
// one removable chip per active facet, which this adapter used to build out of
// `facets` + `values` — is not rendered at all. `KitFilterBar` is still what
// draws the row, with no `filters` and no `onRemove`: what survives is its
// "+ filter" slot, which is the pill, reading `Filter` or `Filter (3)`.
//
// What went with the chips, deliberately and completely: the `said` ref that
// remembered a picked value's WORDS so a chip could not end up naming a ULID
// after its option left the loaded page (nothing names a value any more, so
// there is nothing to go stale), `rangeSaid` that turned a numeric bound into
// chip text, the per-chip remove control and its `t("Remove filter: {what}")`
// sentence, and the wrapped-and-truncated chip label. A count cannot clip and
// cannot go stale, which is most of what those existed to survive.
//
// ── WHERE "CLEAR FILTERS" WENT, AND WHY THERE IS STILL EXACTLY ONE ───────────
//
// It was the kit's own control at the end of the chip row, and the kit only
// draws it when there ARE chips (`hasChips` in the kit's file), so with the
// chips gone that control cannot appear and passing `onClear` would be dead
// wiring. The two places it could go are beside the pill, or inside the panel.
//
// IT IS INSIDE THE PANEL, with the fields it clears. Three reasons, in order
// of weight. First, the row it used to belong to is gone: beside the pill it
// would be a second toolbar control that appears and disappears with the
// filter state, changing the track's own contents underneath a person — and
// the pill's count already reports that state, so the toolbar would be saying
// the same thing twice in two shapes. Second, clearing is an edit to the
// facets, and the facets are in the panel; a control standing where the thing
// it acts on is visible is the whole of why the kit drew it beside the chips
// in the first place. Third, the client's own reference artifact draws a Clear
// inside the panel. It is also the reading that keeps the app honest about
// "exactly one": the no-results register already offers its own "Clear
// filters" when a narrowed collection comes back empty
// (`collection-frame.tsx`), and a toolbar control would stand beside that one
// permanently, where this one is on screen only while somebody has the panel
// open.
//
// ── THE THREE TOOLBAR PILLS ARE ONE FAMILY — CLIENT RULING, 2026-09-02,
// SUPERSEDED v1.2.27 ──────────────────────────────────────────────────────
//
// Verbatim: "the filter button-pill it's still differnet than the other 2. fix
// and uniform it". MEASURED, not eyeballed, against the two pills standing
// beside it — `SortControl`'s field and `ViewSwitch`, which both draw through
// the kit's `SelectTrigger` and both override it the same way:
//
//                     Filter (kit `CHIP_ADD`)      Sort / View (`SelectTrigger`)
//   height            40 (--control-height-button) 40  — already equal
//   radius            rounded-pill                 rounded-pill — already equal
//   resting fill      --btn-secondary-fill         --btn-secondary-fill — equal
//   inline padding    12 (px-3)                    18 (--space-4h)
//   type step         12 (--text-badge), leading 1 14 (--text-sm), leading 1.45
//   weight            inherited (300)              500 (--font-weight-medium)
//
// So three real differences, every one of them making the pill read SMALLER,
// plus a fourth this file was itself causing: the hover override that used to
// live here forced `--accent` onto the add slot. That was right when the kit
// drew that slot with `bg-transparent` (a 5% wash tinting the page behind it)
// and is wrong now that it is an opaque `--btn-secondary-fill` pill — the wash
// REPLACES the fill rather than tinting it, and measured against the dark
// palette it comes out darker than resting, i.e. the pill dimming on hover
// where the other two light up. The kit already hovers it to
// `--btn-secondary-hover`, the same token the other two use, so the override
// is deleted rather than corrected.
//
// THE UPSTREAM FIX LANDED, v1.2.27: the kit's own `CHIP_ADD` now takes
// `SelectTrigger`'s padding, type step and weight the same way it already took
// its height and its fill, closing the three real deltas measured above. The
// app-side override that used to close them here (`FILTER_PILL_MATCHES_THE_OTHER_TWO`,
// reached through the kit's stable `data-slot="filter-bar-add"` hook) is
// therefore deleted along with its application — restating a class the kit
// already states is three lines free to drift out of step with the very thing
// they claim to match, and `web/test/filter-row-is-the-kits.test.tsx` rot-checks
// that it stays gone.
//
// ── ONE COMPOSITION CANNOT MARK ITS OWN SLOT ─────────────────────────────────
//
// The vendored kit's OWN `CollectionFrame` gives `filters` a wrapping box of
// its own and offers no slot BELOW its toolbar, so the engine's `useKitPanel`
// branch puts the outlet at the top of the frame's BODY instead — directly
// under the toolbar, above the rows, which is where the panel belongs and what
// the ruling asks for. A slot of the frame's own between toolbar and body is
// the upstream fix, logged for the design-kit pipeline.
//
// ── WHAT THE APP'S FACET CONTRACT IS, MEASURED RATHER THAN ASSUMED ───────────
//
// Every facet in either front door is `control: "select"`, single-valued, with
// options either declared (a closed door vocabulary — `web/lib/collection-
// filters.ts`) or derived from the loaded rows (`facetOptions`). Nothing sets
// `control: "chips"`, nothing sets `control: "range"`, and nothing sets
// `onSearch`. The async option-provider, its debounce, its request-id race
// guard and the whole chips branch were three code paths no screen reached, so
// they are gone rather than ported. `control: "range"` STAYS, because
// `selectRows` compiles it and the kit draws it.
//
// ── A FACET IS A COMPACT FIELD, NOT AN EXPANDED LIST — CLIENT RULING,
// 2026-09-02, AGAINST HER OWN CONFIRMED ARTIFACT. SUPERSEDED IN PART, v1.2.27 ─
//
// `control: "select"` was drawn by the kit's `SearchableFacet`, which is an
// always-expanded panel: a heading, a search pill, then every option as a
// checkbox row. Two facets of it is a full screen of controls hanging under a
// toolbar, and it is what the client's screenshot caught — a "Search client…"
// box over a scrolling list of every client, where her artifact draws one
// short labelled field reading "Any client". The declared control said
// `select` all along; nothing was drawing one. So on 2026-09-02 this file
// composed one out of the kit's own `Select` — a hand-assembled compact field,
// not a hand-rolled trigger, but still this adapter's own composition rather
// than a kit part with a name.
//
// v1.2.27 CLOSED THE GAP UPSTREAM: the kit shipped `CompactFacet` — "one short
// field, and the same filtered list `SearchableFacet` draws, behind it" (the
// kit's own header, `components/filter-bar/filter-bar.tsx`) — built from the
// SAME `selectTriggerVariants` recipe the sort and view pills stand on, so a
// compact facet beside them cannot drift from them the way `CHIP_ADD` did.
// This file's own hand-assembled `Select` composition is deleted in favour of
// it: `SelectFacet` and its `ANY_VALUE` sentinel are gone, and the facet
// branch below draws `<CompactFacet>` directly. `CompactFacet` already draws
// its own `role="group"` + `FacetLabel` frame — matching `RangeFacet`'s, so
// the two facet kinds still read as one family — so this file no longer wraps
// one of its own around it either.
//
// AND THE FEATURE THE FIRST CUT COST COMES BACK. `CompactFacet` is optionally
// `searchable`: the SAME filtered list `SearchableFacet` draws, now reachable
// from behind a short trigger instead of paying for it with an
// always-expanded panel. Waves' own note ("an agency with 131 clients on
// staging") is exactly the case a plain `Select` could not serve — a Radix
// select scrolls and takes type-ahead but does not search — so `wave-finder.tsx`
// turns `searchable` on for its Company facet. The kit's own guidance
// ("`searchable` defaults to FALSE — a facet over eight words does not need a
// search field, and drawing one there would be a control that never earns its
// keystroke") sets the threshold this adapter measures against: `searchable`
// is on wherever a facet's OWN option count exceeds eight, computed per facet
// rather than guessed at a call site, so a vocabulary that grows past the
// threshold turns its own facet searchable without anybody revisiting it.
//
// ── SINGLE-SELECT, AND WHY IT IS NOT A THEMING DECISION ──────────────────────
//
// The doors take one value per query parameter and validate it positionally
// (R20); a comma list would be a change to six doors, their filter parity on
// the machine surface (R19) and their tests. Both the old `Select` composition
// and the kit's own `CompactFacet` are single-valued by construction — and the
// day a door learns a list, this adapter is still the one place that changes.
//
// ── THE FILTERS CASCADE — CLIENT RULING, 2026-09-09 ──────────────────────────
//
// Her screenshot: the tickets toolbar reading Client "Any client" and App
// "Kwapso Portal", and under it "Nothing matched. Try fewer words, or clear the
// filters." Verbatim: *"very wrong! filter the apps by selected client! Until
// clint is not selected, show nothing."* — *"filter by selected client only!"* —
// *"whe using fulters this is how they shoudl work: is client has sth (f.e.
// Kwapos) the filter apps should only show apps of this client. and so on"*.
//
// WHAT WENT WRONG IS NOT THAT A FILTER RETURNED NOTHING. The App control listed
// every app of every client, so the ROW offered a combination that cannot match,
// and an empty list arrived looking like a broken screen. Everything else in
// this app already refuses to draw that shape — `translatedFacets` drops a facet
// with no options ("an empty dropdown is a control that can only disappoint"),
// the ticket form shuts its Module picker because "a picker that can only
// produce a refusal is worse than no picker" — and the filter row was the one
// place nothing said it.
//
// SO THE NARROWING IS HERE, ONCE, AND NOT ON THE TICKETS SCREEN. Her "and so on"
// is explicit: this is the rule for the filter row, not a fix to one control.
// `useFilterBar` is the single function drawing every facet on both front doors,
// so a pair declared anywhere gets the identical behaviour and the next one is a
// field on a declaration rather than a second implementation. Three properties,
// all of them below, all of them driven by `FilterFacet.dependsOn` (config.ts,
// where the ruling and the derivation are written out in full):
//
//   • A CHOSEN PARENT NARROWS THE CHILD. `FacetOption.within` carries the
//     record's own owning id (an app's `accountId`, a sprint's `appId`) — the
//     same column the doors themselves narrow by, so nothing is hand-listed and
//     nothing can go stale. A facet whose options are DERIVED from the rows
//     needs no tagging at all: the rows carry the owner, so the option list is
//     derived from the rows the parent already leaves.
//
//   • NO PARENT, NO OPTIONS — AND THE CONTROL SAYS WHAT TO DO FIRST. Drawn
//     disabled, in place, wearing `dependsOn.emptyText` ("Choose a client
//     first." — the ticket form's own sentence for exactly this state, reused
//     rather than re-authored). It is NOT hidden: a control that vanishes moves
//     every control after it as somebody fills the row in, which is the same
//     argument `help-form-dialog.tsx` makes at length about its own App and
//     People rows, and a toolbar that changes shape under the reader is the
//     variation the client has twice told us to stop.
//
//   • A STRANDED SELECTION CLEARS ITSELF, OUT LOUD. Pick a client, pick one of
//     its apps, then pick a different client: the App value is now a combination
//     that cannot match — precisely the fault she reported, arriving from the
//     other direction. It is CLEARED rather than kept, because the toolbar must
//     never hold an impossible pair; and it is ANNOUNCED, because a filter
//     somebody deliberately set may not disappear without a word. Keeping it and
//     letting the result be empty was the other candidate and is rejected on its
//     own terms: it reproduces her screenshot exactly, one control along.
//
// WHAT THIS IS NOT, AND THE DISTINCTION IS LOAD-BEARING. It is not "narrow every
// facet by every other facet". That is the vanishing-options bug this file's own
// header already forbids ("distinct values are derived from it when a facet
// omits `options` — so choices don't vanish as you filter"), and `apps-screen`,
// `sprints-screen`, `deliverables-panel` and `triageFacets` each repeat the
// warning at their own call site. The difference is DIRECTION: a cascade runs
// down an OWNERSHIP edge and only down it. A client owns apps, so Client narrows
// App; an app does not own its client, so App never narrows Client. Symmetric
// narrowing is what empties a menu and leaves no way back except Clear; a
// directed one cannot, because the parent's own list is never touched.
//
// CLEARING A FACET IS `null` NOW, NOT A SENTINEL STRING. The old `Select`
// composition needed `ANY_VALUE`, a two-underscore placeholder, because Radix
// reserves the empty string for `SelectItem`'s own placeholder state and
// throws if an item declares it — a workaround for a control that speaks in
// strings only. `CompactFacet`'s own `value`/`onValueChange` speak `string |
// null`, `null` already meaning "off" (its own contract: "`null` is the
// facet turned off"), so there is no reserved string to dodge and nothing to
// convert through a sentinel — only the boundary conversion every facet still
// needs, because the app's OWN convention, shared with every door and every
// other facet in this file, is `""` for off: `null` in, `""` out, both ways,
// where this file calls `CompactFacet`.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import {
  CompactFacet,
  FACET_SPAN,
  FilterBar as KitFilterBar,
  FilterOverlay,
  RangeFacet,
} from "@shared/ui/components/filter-bar/filter-bar"
import { joinFacet, splitFacet } from "@shared/facet-list"
import { toast } from "@shared/ui/components/sonner/sonner"
import { useLanguage } from "@shared/web/language"
import { sortedOptions } from "@shared/web/sorted-options"

import { facetOptions } from "./collection"
import { type FacetOption, type FilterFacet } from "./config"
import { formatRange, parseRange } from "./range"

/** THE COMPACT FACET SEARCHES PAST THIS MANY OPTIONS. The kit's own threshold,
 * stated in its `CompactFacet` header: "a facet over eight words does not need
 * a search field, and drawing one there would be a control that never earns
 * its keystroke." Measured per facet, off its own resolved option list —
 * `optionsFor` below, declared or derived from the loaded rows either way — so
 * a vocabulary that grows past eight turns searchable on its own; nobody
 * revisits a call site to flip it. */
const SEARCHABLE_PAST = 8

/**
 * THE TOOLBAR'S FILTER CONTROL AND THE SURFACE IT OPENS, as ONE node.
 *
 * A HOST PUTS IT IN `filters` AND IS DONE. There is nothing else to place: the
 * facets open in a portaled, anchored overlay that the returned node carries
 * with it, so a screen has no second value to hold, no second slot to find and
 * no way to render half of this.
 *
 * SUPERSEDED MACHINERY, AND ALL OF IT IS WORTH A LINE, because each step was a
 * real answer to the ruling in force at the time:
 *
 *   · ONE COMPONENT WITH A PORTAL (before v1.2.27). `<FilterBar>` rendered the
 *     pill in place and `createPortal`'d the panel into a DOM node a bespoke
 *     context (`PanelSlot` + `FilterPanelProvider` + `FilterPanelOutlet` +
 *     `FilterPanelColumn`, ~62 lines) published from wherever the host's
 *     toolbar happened to sit, because no host offered a real position for a
 *     panel that had to land BELOW the whole toolbar.
 *   · `{ pill, panel }`, TWO VALUES (v1.2.27). `CollectionFrame` and
 *     `ToolbarRow` both grew a real `toolbarPanel` slot, so the context and
 *     the portal were deleted and the caller placed each piece itself.
 *   · ONE NODE AGAIN (2026-09-23). Aurora chose "filter drop sheet popover",
 *     which puts the facets back on a floating surface, so there is no second
 *     position left to name. Both `toolbarPanel` slots went with the pair, and
 *     so did the census that used to catch a caller dropping one of two values
 *     on the floor: it cannot drop half of one.
 *
 * The header's own "pass six" section carries the ruling and the argument.
 */
function useFilterBar<T>({
  facets,
  values,
  data,
  onChange,
  onClearFacets,
  resultCount,
  className,
}: {
  facets: FilterFacet[]
  /** Current selection per facet field ({} = none). */
  values: Record<string, string>
  /** The FULL data — distinct values are derived from it when a facet omits
   * `options` (so choices don't vanish as you filter). */
  data: T[]
  /** Empty `value` clears that facet. Called the moment a value is picked —
   * there is no "Apply" step, on the panel exactly as there was none on the
   * popover it replaces. */
  onChange: (field: string, value: string) => void
  /** Drop every facet at once — the PANEL's own "Clear filters", and the only
   * one this row has (the header says why it is not beside the pill). NOT the
   * search box: what somebody typed is cleared by the search field's own ✕
   * (`SearchInput onClear`), which is why this prop was renamed from
   * `onClearAll`, which had been clearing something it did not name. */
  onClearFacets: () => void
  /** Announced politely to screen readers when results change. */
  resultCount?: number
  /** Applied to the box the Filter control stands in, never to the open
   * overlay, which takes its measure from the form it chose. No call site uses
   * this today. */
  className?: string
}): React.ReactNode {
  const { t, lang } = useLanguage()
  /** Is the overlay open? The state is HELD HERE and not inside
   * `FilterOverlay`, because the pill's count has to stay visible and correct
   * while the overlay is open (client ruling, 2026-09-03) and the pill is this
   * file's node. */
  const [open, setOpen] = React.useState(false)

  /** WHAT THIS FACET'S PARENT IS SET TO — `""` when it has no parent to be set,
   * which is every facet in the app that declares no `dependsOn`. Read off
   * `values` and never off a snapshot, so the child's list follows the parent
   * within the same render the parent was picked in (there is no Apply step on
   * this row: "the moment I select sth on a dropdown its applied", the client,
   * 2026-09-02). */
  const parentValues = (f: FilterFacet): string[] =>
    f.dependsOn ? splitFacet(values[f.dependsOn.field] ?? "") : []

  /** THE FACET IS GATED — it hangs off another and that other is not answered
   * yet. Its control still draws (see the panel below); it just has nothing to
   * offer and says what to do first instead. */
  const isGated = (f: FilterFacet): boolean =>
    Boolean(f.dependsOn) && parentValues(f).length === 0

  /** WHAT THIS FACET MAY OFFER RIGHT NOW — the cascade, applied in the one place
   * every facet on both front doors passes through (the header carries the
   * client's 2026-09-09 ruling and the whole argument).
   *
   * THREE BRANCHES, AND THE THIRD IS THE ONE WORTH READING. A facet with no
   * parent is exactly what it always was — declared options, or the distinct
   * values of the WHOLE data set — so every facet in the app that declares no
   * `dependsOn` is byte-for-byte unchanged. A gated one offers nothing. A
   * narrowed one is filtered by OWNERSHIP:
   *
   *   • DECLARED options carry it themselves (`FacetOption.within` — an app's
   *     own `accountId`, passed straight through from the row). `within == null`
   *     is "owned by nobody" and survives every parent: our own systems are
   *     legitimately on a client's ticket, and dropping them would make those
   *     tickets unreachable from this control. That clause is argued in full on
   *     `FacetOption.within` itself.
   *
   *   • DERIVED options (a facet that declares none, on a BOUNDED collection the
   *     browser holds whole) need no tagging at all, and this is where the
   *     derivation is at its most honest: the rows carry the owner, so the
   *     option list comes off the rows the parent already leaves. A row with no
   *     owner is kept for the same reason `within == null` is. */
  const optionsFor = (f: FilterFacet): FacetOption[] => {
    const dep = f.dependsOn
    if (!dep) return f.options ?? facetOptions(data, f.field)
    // THE PARENT IS A SET NOW (24 Sep 2026). Three clients chosen above means
    // this child offers every app of any of the three — the cascade runs down
    // the ownership edge exactly as before, it is just that the edge now has
    // several ends. `within == null` still survives every parent, for the
    // reason `FacetOption.within` argues at length: our own systems are
    // legitimately on a client's ticket.
    const parents = splitFacet(values[dep.field] ?? "")
    if (parents.length === 0) return []
    if (f.options) return f.options.filter((o) => o.within == null || parents.includes(o.within))
    return facetOptions(
      data.filter((row) => {
        const owner = (row as Record<string, unknown>)[dep.field]
        const said = String(owner ?? "")
        return owner == null || said === "" || parents.includes(said)
      }),
      f.field
    )
  }

  /* ── A STRANDED SELECTION CLEARS ITSELF, AND SAYS SO ──────────────────────
     The reader picks a client, picks one of its apps, then picks a DIFFERENT
     client. The App value they set is now a pair that cannot match — her own
     screenshot, arriving from the other direction — and the toolbar may not
     hold one. So it is dropped.

     CLEARED RATHER THAN KEPT, and that is a real choice between two defensible
     answers. Keeping it and letting the result come back empty preserves the
     reader's own click, which is not nothing; it also puts the screen back in
     exactly the state the client called "very wrong", one control along, and
     leaves them to work out which of two filters is the impossible one. The
     whole fault she reported is a row offering a combination that cannot
     match, so a row that CREATES one when the parent moves has not been fixed.

     BUT NEVER SILENTLY. A filter somebody deliberately set disappearing with no
     word is its own small betrayal — the reader is now looking at more rows
     than they asked for and nothing on screen says why. The pill's count
     dropping by one is a signal only to somebody already watching it. So it is
     announced, naming BOTH controls, so the sentence explains itself without
     the panel being open.

     IN AN EFFECT, NOT IN RENDER: `onChange` is the host's own state setter and
     calling it while rendering is a write during another component's render.
     Keyed on WHICH fields are stranded, so it fires once per change and not
     once per render; the refs carry the latest handler and translator without
     putting either in the dependency list, where an inline arrow (which is what
     every call site passes) would re-fire the effect on every render. */
  const stranded = facets
    .filter((f) => f.dependsOn && (values[f.field] ?? "") !== "")
    .map((f) => {
      // ONLY THE VALUES THAT NO LONGER FIT GO. This used to drop the whole
      // facet, which was the only possible answer while a facet held one
      // value; with a set (24 Sep 2026) it would throw away two perfectly
      // valid picks to correct a third. The kept subset is written back, so a
      // reader who chose three of a client's apps and then added a second
      // client keeps all three.
      const offered = new Set(optionsFor(f).map((o) => o.value))
      const had = splitFacet(values[f.field] ?? "")
      return { facet: f, had, kept: had.filter((v) => offered.has(v)) }
    })
    .filter(({ had, kept }) => kept.length < had.length)
    .map(({ facet: f, kept }) => ({
      field: f.field,
      keep: joinFacet(kept),
      label: f.label,
      // The parent's own WORD, so the sentence reads "…the Client you picked"
      // rather than naming a query parameter at somebody. A `dependsOn` naming
      // a facet that is not in this row is a mis-declaration the census beside
      // this file catches; the field name is the honest fallback meanwhile.
      parent: facets.find((p) => p.field === f.dependsOn?.field)?.label ?? f.dependsOn?.field ?? "",
    }))
  const strandedFields = stranded.map((s) => s.field).join(",")
  /** THE LATEST HANDLER AND THE LATEST LIST, off the dependency array. Every
   * call site passes `onChange` as an inline arrow, so naming it as a
   * dependency would re-run this effect on every render of every screen with a
   * filter row — and `stranded` is a fresh array each render for the same
   * reason. The FIELDS are what actually changed, and they are a string. */
  const latest = React.useRef({ stranded, onChange })
  latest.current = { stranded, onChange }
  React.useEffect(() => {
    if (strandedFields === "") return
    const { stranded: gone, onChange: drop } = latest.current
    for (const s of gone) {
      // The SUBSET that still fits, not "" — see `stranded` above.
      drop(s.field, s.keep)
      // `t` is read from the enclosing render rather than through the ref
      // because the extractor's `t-call` position is an IDENTIFIER named `t`
      // (scripts/lib/i18n-source.mjs) — `latest.current.t("…")` is a property
      // access and would not be extracted, so the sentence would ship in
      // English to somebody who chose German with a green build, which is
      // precisely the failure R28 exists to catch.
      toast.info(
        t("Cleared the {what} filter. It doesn't fit the {parent} you picked.", {
          what: s.label,
          parent: s.parent,
        })
      )
    }
    // `latest` is a ref and never changes identity, so the fields string is the
    // whole of what this effect actually reacts to. Once the host drops the
    // value the string goes empty and the effect's next run returns on the
    // first line — it cannot re-fire on the clearing it just did, which is also
    // why naming `t` here (the lint asks, and it is right to) costs nothing: a
    // re-run on a new translator identity meets that same guard.
  }, [strandedFields, t])

  if (facets.length === 0) return null

  /** HOW MANY FACETS ARE ON. The one definition in this row — the pill's count
   * reads it, and so does the panel's "Clear filters", which is not worth
   * drawing over nothing. Counted off `facets` rather than off `values`, so a
   * stale field left behind in a caller's own query object cannot inflate it. */
  const activeCount = facets.reduce((n, f) => n + ((values[f.field] ?? "") === "" ? 0 : 1), 0)

  // THE "FILTER" PILL'S OWN LABEL — CLIENT RULING, 2026-09-03, SUPERSEDING
  // THE `!open &&` GATE THIS USED TO CARRY. Verbatim: "Even if the filter is
  // open, I want to see the count pill at all times, like when I'm selecting
  // and unselecting filters. When the filter toolbar modal is open, I also
  // want the count visible." The old reasoning — "the fields are their own
  // explanation once the panel is open, so the count would say nothing new"
  // — was a plausible-sounding UX call that turned out to be exactly the
  // wrong one: mid-edit is precisely when a reader wants the running total
  // in view, not looking at it. So the count is read off `activeCount`
  // UNCONDITIONALLY now, `open` never enters the expression, and the bare
  // word is reserved for the one case that still deserves it — nothing is
  // on at all. Since the chips went (client ruling, 2026-09-02) this count
  // is still the ONLY thing the toolbar says about what is narrowing the
  // list; what changed is WHEN it says it, not what it says. `activeCount`
  // is computed fresh every render off `facets`/`values` (its own comment
  // above), so the pill — in BOTH open and closed states — updates the
  // instant a facet is ticked or cleared, never off a snapshot taken when
  // the panel last closed.
  //
  // THE COUNT ITSELF MOVED OFF THIS STRING (2026-09-03) AND ONTO A REAL
  // BADGE — see the long note beside `addFilterBadge` below for why a string
  // ternary was a stand-in and not the shape asked for. `addFilterLabel` is
  // back to a plain, un-numbered word because the number now has its own
  // slot; folding it into the sentence a second time would say it twice.
  const addFilterLabel = t("Filter")

  // THE FACETS, AS THE OVERLAY'S OWN CHILDREN — client ruling, 2026-09-23,
  // superseding the in-flow panel this used to be. `FilterOverlay` owns the
  // surface (fill, radius, elevation, geometry, focus, dismissal); this list
  // owns what stands in it, which is exactly the split the four passes
  // written up in this file's header kept failing to find. There is no
  // wrapper of its own left: the overlay's `filter-overlay-body` IS the
  // wrapper, and a second one here is the "two boxes" fault one level in.
  //
  // NO `role="group"`/`aria-label` OF ITS OWN — the surface carries
  // `role="dialog"` and the overlay's title, and each facet names ITSELF
  // (`RangeFacet`/`CompactFacet`'s own `role="group"`).
  const facetFields = (
    <>
      {facets.map((f) => {
        const val = values[f.field] ?? ""

        // A numeric min/max. Either bound may be open; "" clears it.
        if (f.control === "range") {
          const { min, max } = parseRange(val)
          return (
            <div key={f.field} className="min-w-[12rem]">
              <RangeFacet
                label={f.label}
                minLabel={t("Min")}
                maxLabel={t("Max")}
                min={f.min}
                max={f.max}
                step={f.step}
                value={{ min, max }}
                onValueChange={(next) => onChange(f.field, formatRange(next.min, next.max))}
                // A bound BELOW its own floor is a range that can only ever
                // match nothing, and the kit already draws the state — the
                // old row had no way to say it and quietly answered "none".
                error={min != null && max != null && min > max}
                errorLabel={t("The first number must be lower than the second.")}
              />
            </div>
          )
        }

        // ONE COMPACT FIELD PER FACET, side by side (client ruling,
        // 2026-09-02 — see the header). `flex-1` between a floor and a
        // ceiling so two facets share a wide panel evenly and neither
        // grows into a field wider than the words it holds; below the
        // floor the row wraps, which is the only second line this panel
        // ever draws.
        // R75 — THE OPTIONS A PERSON PICKS FROM ARE A→Z. `optionsFor` above
        // carries the DECLARED-vs-DERIVED and gated/narrowed logic; ordering
        // is a display concern read the same way for every facet in the app,
        // so it is applied once, here, rather than at every `filterFacets`
        // declaration — a facet declared tomorrow inherits it for free.
        // `f.ordered` IS THE ESCAPE HATCH — a facet whose list is a PIPELINE
        // rather than a naming vocabulary (`FilterFacet.ordered`'s own doc,
        // config.ts), registered in `FACET_ORDER_OK` (shared/rules/
        // registry.ts) the same way a hand-rolled picker registers in
        // `ORDERED_OPTIONS_OK` — a flag with no matching registry line is
        // still a silent exception, so the one caller that sets it (apps'
        // own Stage facet, 16 Sep 2026) carries the reason there and not
        // only here.
        const facetOptionList = f.ordered ? optionsFor(f) : sortedOptions(optionsFor(f), lang)
        // THE MARK RIDES BESIDE THE WORD, NEVER INSTEAD OF IT — client ask,
        // 2026-09-06: "in filter type i want to see the colored dot / on
        // filter app i wanna see the icon of the app". `FacetOption.mark`
        // (config.ts) is a caller-drawn `ReactNode` — a `<Swatch>` for a
        // ticket type, an `<AppMark>` for an app, whatever picture that
        // record already wears everywhere else — and this file composes it
        // beside `label` rather than deciding what either looks like: the
        // colour map and the app's own mark both live under `web/`, and this
        // file is read by both front doors (the header's own note on why
        // `Swatch`/`ticketTypeColour`/`InAppLink` are props on
        // `ticket-chips.tsx` and never imports, applies identically here).
        //
        // NOTHING UPSTREAM HAD TO CHANGE FOR THIS. The kit's own
        // `CompactFacet`/`SearchableFacet` (shared/ui/components/filter-bar/
        // filter-bar.tsx) already type `FacetOption.label` as
        // `React.ReactNode`, not `string` — the closed field prints
        // `chosen.label` and the option row prints `option.label` as plain
        // children, either already able to hold a composed node. The seam
        // was sitting there unused; a facet with no `mark` renders the exact
        // option object it always did (the `: o` branch below), so every
        // facet that never carries one is byte-for-byte unchanged.
        const kitOptions = facetOptionList.map((o) =>
          o.mark
            ? {
                value: o.value,
                label: (
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true" className="shrink-0">
                      {o.mark}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  </span>
                ),
                count: o.count,
              }
            : o
        )
        // NO PARENT YET — THE CONTROL STAYS AND SAYS WHAT TO DO FIRST (client
        // ruling, 2026-09-09: "Until clint is not selected, show nothing").
        // "Show nothing" is read as its options and not as the control: the
        // field keeps its place, disabled, wearing `dependsOn.emptyText` where
        // "Any app" would otherwise sit — the exact pattern the ticket form
        // already draws for this exact question, and for the reason that form
        // spells out at length ("a row that appears and disappears inside a
        // fixed order moves every field under it as somebody fills the form
        // in"). A filter panel is the same shape of promise: the reader is
        // choosing among a known set of controls, and one of them evaporating
        // because of what they picked in another is a panel that cannot be
        // learned. Disabled is also the kit's own stated answer for a value the
        // reader may see and not change (`CompactFacet` state 10), so this
        // borrows a drawn state rather than inventing one.
        const gated = isGated(f)
        return (
          <div key={f.field} className="min-w-[11rem] max-w-[15rem] flex-1">
            <CompactFacet
              label={f.label}
              placeholder={
                gated && f.dependsOn
                  ? f.dependsOn.emptyText
                  : t("Any {what}", { what: f.label.toLowerCase() })
              }
              disabled={gated}
              options={kitOptions}
              // THE KIT'S OWN SEARCH MATCH IS BACKWARDS THE MOMENT A LABEL
              // BECOMES A NODE. `defaultFilterOption` (the kit file) matches
              // `option.label` when it is a string and falls back to
              // `option.value` otherwise — exactly right for a plain facet
              // and exactly wrong here, because `value` is a stored id (an
              // appId) or a raw dropdown word, never what a person typed
              // looking for it. This always matches the WORD a reader sees,
              // mark or no mark, off the app's own option list rather than
              // the kit-shaped one this facet just built.
              filterOption={(option, query) => {
                if (query.trim() === "") return true
                const said = facetOptionList.find((o) => o.value === option.value)?.label ?? option.value
                return said.toLowerCase().includes(query.trim().toLowerCase())
              }}
              // ── SEVERAL VALUES PER FACET — AURORA, 24 SEP 2026 ────────
              // *"validated, but i shoudl be able to select multile for each
              // filter type"*. Within one facet the chosen values mean OR;
              // across facets the row still means AND, which is the doors'
              // arithmetic (`inClause`, one `IN` per facet ANDed with the rest
              // of the WHERE) and `selectRows`' (one predicate per facet,
              // `every` across them, `includes` inside one).
              //
              // `single` IS THE NAMED EXCEPTION, and it is a fact about the
              // VOCABULARY rather than a preference: a two-word facet whose
              // words are opposites (Status active/inactive, Archived
              // live/put-away) has nothing to multi-select, because ticking
              // both is asking for no narrowing. `CollectionFacet.single`
              // carries the argument and a census holds it to a two-option
              // vocabulary, so a facet over records can never be pinned.
              //
              // THE BOUNDARY CONVERSION IS STILL THE ONLY THING HAPPENING
              // HERE. The kit speaks `string[]`, the app's wire speaks one
              // comma-joined parameter per field (`shared/facet-list.ts`), and
              // `""` is off on this side exactly as `[]` is on that one.
              //
              // BOTH PAIRS ARE HANDED OVER, and that is not belt-and-braces:
              // `multiple` chooses which one the kit reads, and a `single`
              // facet drives `value`/`onValueChange` exactly as every facet
              // did before today. Passing only the set pair left the three
              // two-word facets (Status, Archived, the tickets view) wired to
              // nothing — caught by this file's own single-select case, which
              // is why that case exists.
              multiple={!f.single}
              values={splitFacet(val)}
              onValuesChange={(next) => onChange(f.field, joinFacet(next))}
              // `null` in, `""` out — the boundary conversion for the single
              // half, unchanged since the day the kit's `CompactFacet` landed.
              value={splitFacet(val)[0] ?? null}
              onValueChange={(next) => onChange(f.field, next == null ? "" : joinFacet([next]))}
              // WHAT THE CLOSED FIELD SAYS ABOVE ONE. The kit's own default is
              // the first label and a bare ` +N`; this is the same sentence
              // with a translator in front of it, which is the whole reason
              // the kit made it a prop (R28: a sentence a person reads is in
              // the catalogue, and a number glued to a label by the kit is
              // not).
              //
              // IT READS THE APP'S OWN WORD, NEVER THE KIT-SHAPED LABEL. A
              // facet that carries a `mark` (a ticket type's swatch, an app's
              // own glyph — R93) hands the kit a composed NODE as its label,
              // and a node cannot go into a translated sentence. The plain
              // word is one lookup away in `facetOptionList`, which is the
              // same list `filterOption` above already matches against for
              // exactly this reason.
              formatSummary={(chosen) =>
                t("{what} +{count}", {
                  what:
                    facetOptionList.find((o) => o.value === chosen[0].value)?.label ??
                    chosen[0].value,
                  count: chosen.length - 1,
                })
              }
              // The dense control height, the height the kit's own facet
              // fields take when they stand in a panel rather than a form
              // (`CompactFacet`'s own `size` doc).
              size="dense"
              searchable={facetOptionList.length > SEARCHABLE_PAST}
            />
          </div>
        )
      })}

    </>
  )

  // A REAL BADGE, NOT A NUMBER FOLDED INTO THE SENTENCE — CLIENT RULING,
  // 2026-09-03: "The count design should replicate the count design that we
  // have on the top lines, like this Mango round background with no border
  // behind the number." That reference shape is `Badge`'s own counter
  // geometry (`size="counter"`: `h-5 min-w-5 px-2`, `rounded-pill`,
  // `variant="default"` for the mango fill) — the same shape `TabsCount`'s
  // active state and `CollectionFrame`'s heading count already wear
  // (GAPS-RULINGS.md R-4a). `TabsCount` itself does not fit here: its
  // mango-vs-quiet switch is `group-data-[state=active]/tab:` CSS read off a
  // Radix `Tabs`-internal ancestor this filter row has no reason to
  // construct, so an unwrapped `<TabsCount>` would draw only its OFF state.
  // `Badge` needs none of that — it is already a standalone export
  // (`CollectionFrame`'s own heading count is a bare `<Badge count={…} />`)
  // — so this reaches for `Badge` directly rather than restyling a clone of
  // it.
  //
  // What stood between this pill and that badge was `KitFilterBar`'s own
  // "+ filter" button: its `addFilterLabel` prop is typed `string`, rendered
  // as bare text with no slot for a node. `addFilterBadge` (kit v1.2.33) is
  // the fix — an ADDITIVE sibling prop beside `addFilterLabel`, so every
  // other call site of `KitFilterBar` is byte-identical with it omitted.
  // `Badge` already renders nothing at zero (the kit's own zero law), which
  // is why `addFilterLabel` stays the plain, un-numbered "Filter" rather
  // than folding the count into the sentence a second time.
  const pill = (
    <>
      {/* NO `filters`, NO `onRemove`, NO `onClear` — client ruling,
          2026-09-02: the toolbar shows a count and nothing else (see the
          header). What is left of the kit's bar is its "+ filter" slot,
          which is the pill this row is. */}
      <KitFilterBar
        label={t("Filters")}
        addFilterLabel={addFilterLabel}
        addFilterBadge={<Badge count={activeCount} variant="default" />}
        // THE PILL SAYS WHETHER IT IS OPEN, OUT LOUD — kit v1.2.42's own
        // `addFilterExpanded`, announce-only. This file deliberately holds
        // `open` ITSELF rather than letting the kit's bar own it (that is
        // what let the pill and the panel merge into one container, the
        // client's 2026-09-03 ruling), and the cost was that the trigger had
        // no state left to reflect: a screen reader heard "Filter, button"
        // with no way to know it expands anything, or whether it already
        // had. Handing the same boolean back closes that without giving the
        // kit control of the rendering — it sets `aria-expanded` and nothing
        // else.
        addFilterExpanded={open}
        onAddFilter={() => setOpen((o) => !o)}
      />
      <span aria-live="polite" className="sr-only">
        {resultCount != null ? t("{count} results", { count: resultCount }) : ""}
      </span>
    </>
  )

  // WHAT THE FACETS COST, WHICH IS WHAT DECIDES THE OVERLAY'S FORM — client
  // ruling, 2026-09-23 ("filter drop sheet popover"), and the whole reason it
  // is computed HERE rather than passed by a screen. `filterOverlayForm` takes
  // a number and `FACET_SPAN` says what each declared facet contributes, so a
  // collection that grows a fourth facet tomorrow moves from the popover to
  // the drop sheet on its own, in `web/lib/collection-filters.ts`, with no
  // screen revisited and nothing to keep in step. A screen that had to choose
  // would choose right once and be wrong on the next ruling: `COLLECTION_
  // FILTERS.help` went from three facets to four in a single afternoon's
  // ruling and `accounts` from one to three a week later.
  const span = facets.reduce(
    (n, f) => n + (f.control === "range" ? FACET_SPAN.range : FACET_SPAN.field),
    0
  )

  // THE OVERLAY IS THE WHOLE RETURN NOW — one node, not a `{ pill, panel }`
  // pair. That pair existed because the panel had to land in a DIFFERENT place
  // from the pill: a real sibling BELOW the toolbar, which meant two values and
  // two slots and a census (`filter-row-is-the-kits`) whose job was to catch a
  // caller that rendered one and dropped the other. Nothing lands below the
  // toolbar any more — the surface floats, portaled, anchored — so the two
  // pieces are one element again and half of a value cannot be dropped.
  //
  // "CLEAR ALL" AND "SHOW N" ARE THE OVERLAY'S, not this list's. They are the
  // design's own two foot controls and the overlay places them; this file only
  // says what they do and what they are called. Clear is handed over only when
  // something is on, which is the same rule the old in-panel button followed
  // ("a control that does nothing is worse than no control"), and Show carries
  // the live result count the pill's own `aria-live` span already announces,
  // so the number a reader hears and the number they read are one expression.
  return (
    <FilterOverlay
      open={open}
      onOpenChange={setOpen}
      title={t("Filters")}
      span={span}
      className={className}
      trigger={pill}
      onClear={activeCount > 0 ? onClearFacets : undefined}
      clearLabel={t("Clear all")}
      showLabel={resultCount != null ? t("Show {count}", { count: resultCount }) : undefined}
    >
      {facetFields}
    </FilterOverlay>
  )
}

export { useFilterBar }
