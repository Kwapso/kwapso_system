"use client"

// THE TICKETS SCREEN — one tab strip, one collection, and a triage queue.
//
// It lived inside the deep-link host's collection switch, which was fine while it
// was one strip. CHECKLIST 5.1 added a second ("sub-tabs by TYPE beneath the
// existing All / My / Archived strip") and 5.11 added a queue that is not a
// filter of the list at all, and both needed state of their own — so this is a
// component rather than a branch. The host renders it and hands over the things
// only the host knows: the recipe, the rights, and the two action callbacks.
//
// ── THE REDESIGN, 2026-08-31 ─────────────────────────────────────────────────
//
// This screen used to stack TWO folder tab strips (CHECKLIST 5.1's own
// description above is the fossil of that: "sub-tabs … beneath the existing …
// strip"). The owner had ruled, 2026-08-28, to keep both rather than move one
// into the toolbar ("there's no way out .. lets' keep 2 tabs but both as the
// folder tabs" — `web/test/rules.test.ts`'s `TWO_STRIPS_OK` carried that
// ruling). The CLIENT overruled it the next business day, verbatim: "there can
// never be 2 rows of tabs, no folder tabs, no line tabs. just never." Not a
// narrower version of the 28 Aug ruling — the opposite of it — so this is a
// genuine redesign, not a spacing fix.
//
// WHAT THE TWO STRIPS WERE ASKING were always two different questions:
//
//   the OLD OUTER strip was WHOSE and WHERE — All tickets / Archived, a raiser-
//   scope-turned-VIEW the door has answered as a server scope since tickets
//   started paging;
//
//   the strip that REMAINS is WHAT KIND and HOW FAR ALONG — Ready, then one tab
//   per live `Ticket type` value, then Closed, then All. DERIVED from the
//   team's own vocabulary rather than hard-coded: deactivating "Bug" on the
//   Dropdown values screen takes its tab away, and adding a word adds one.
//
// THREE SHAPES WERE ON THE TABLE. (a) fold Archived in as one more value on the
// remaining strip — rejected, because Archived is orthogonal to kind/stage (an
// archived ticket can be any type, at any stage) and folding it in as a sibling
// of Ready/Issue/Closed would have made "archived Ready tickets" unreachable,
// a real capability the two stacked strips already gave away. (b) move it to
// the toolbar as a plain control — too vague to be a decision. What shipped is
// closer to (c): Archived becomes a real FILTER (`COLLECTION_FILTERS.help`,
// field `view`), the exact shape Accounts' own "Archived" toggle already uses
// beside its Companies/All tab (`web/lib/collection-filters.ts`) — so scope and
// kind/stage stay two REAL, independently-askable questions, just never drawn
// as two tab strips. A tab and a filter compose for free through
// `<PagedFind>`'s own `query` object (paged-find.tsx), so "archived Ready
// tickets" is still one search away, through the toolbar's Filter control
// rather than a second folder strip.
//
// THE TOOLBAR MOVES INSIDE THE CARD, the other half of the same client note
// (verbatim on a screenshot of THIS screen: the search/sort sat on the base
// background, above the peachy panel holding the rows). Accounts hit the
// identical defect the same day and fixed it the identical way
// (`collection-content.tsx`, `accountTabs`): `<PagedFind>`'s `wrap` boxes the
// toolbar AND the rows in one `CollectionCard`, and the tab strip sits directly
// above it with zero gap. Before v1.2.28 that gap had to stay zero so the
// folder tab's own pulled-down feet (`--folder-tab-overlap`) melted into the
// card rather than showing on the base background; the folder shape is gone
// now (tabs-view.tsx's own header has the client's 2026-09-02 ruling) and the
// flush join is kept on its own merits. Tickets and Accounts draw the same
// join.
//
// THE TOOLBAR GAINS A FILTER AND A CREATE BUTTON, the two pieces the old
// search-and-sort-only bar was missing next to Accounts' fixed one: the
// Archived filter above, and a "Raise ticket" button beside the tab row where
// Accounts' New/Import/Export row sits. There is no Export/Import button here
// because there is no export or import door for tickets (SCOPE ch.07 — a
// ticket is a conversation, not an importable record; `internal-money.ts`'s
// neighbour AGENTIC-IMPORT.md says the same about what earns a target). A
// "view selector" beyond the tab strip and the Archived filter is not drawn
// either. The kit's own `ViewSwitch` (`shared/ui/components/collection-frame/
// view-switch.tsx`) is genuinely reached elsewhere now (Apps' Tiles/List,
// Waves' List/Timeline, 1 Sep 2026) — the reason it stays off THIS screen is
// that a ticket has no second real way to look at the same rows, not that
// the control is unproven. A Board grouped by `status` was analysed and
// flagged as real future work (per-status paged reads, an R16 arbitration
// question), not a "no view exists yet" gap.
//
// Every narrowing is still the DOOR's (R14 + R16). Filtering the loaded page
// would answer "the questions among the newest fifty" while the badge above
// counted all of them, which is the failure R16 exists for and the one a
// manager reported as "filter by type, the count doesn't change".
//
// AND ONE TAB IS STILL NOT A FILTER — IT IS THE FIRST ONE NOW (2026-09-06).
// "Triage" swaps the collection for the queue of requests nobody has read, and
// the DOOR decides whether this caller is given that queue at all (CHECKLIST
// 5.11: only the person on duty sees it). A screen that hid a list it had
// already been handed would be a curtain, not a rule.
//
// It sat on the END of this strip until the client's eighth design round, for
// two reasons that were both true and neither of which was about her: it was
// written last, and it is not a narrowing of the list. A strip is read left to
// right in the order the work happens, and triage is the FIRST thing done to a
// ticket — and, for the one person who does it, the only reason to open this
// screen at all. The tab moved; the reasoning is on `tabsConfig` below, and the
// queue behind it is a SITTING rather than a list now (`TriageQueue`'s own
// header has the client's words and the kit component it is built on).


/* THE BOARD AND THE SPLIT — the kit's own, vendored, and both adopted in this
   pass (their `KIT_COMPONENT_EXEMPT` lines were deleted by the same commit —
   R46's rot-check refuses an exemption for a part that is reached). Neither is
   drawn app-side: `OpenBoard` and `ReadySplit` below supply rows and a pane. */
/* `KanbanColumnDot` USED TO BE IMPORTED BESIDE IT, for the tone each column
   head wore. The client took the colour off the column heads on 2026-09-09 (the
   ruling is written out at `COLUMN` below), the kit's `dot` prop is optional and
   is simply not passed any more, so the type has nothing left to constrain. */
/* THE LIST VIEW'S TABLE, composed from the kit's own primitives rather than
   drawn through `RecordTable` — the reason is written out at the `triageView
   === "list"` branch below, and it is R16's: `RecordTable` brings
   `CollectionFrame`, which brings a second search box and a second count onto a
   screen that already has one of each. */

import { TicketChips, type TicketChipFacts } from "@shared/web/ticket-chips"
import { InAppLink } from "@/components/shell/in-app-link"
// THE LABELS ONLY. The collection's DEFAULT sort used to be read here too and
// is not any more: which order a tab opens in is a per-tab answer now
// (`helpTabSorts`), and a screen holding both would be two places deciding one
// thing — with the tab's answer silently losing on whichever prop forgot.
import { Swatch } from "@/components/records/record-picker"
import { ticketTypeColour } from "@/lib/type-colours"
/* ONE READER OF THIS FILE LEFT, AND IT IS THE STATUS FILTER. `helpStatusDotTone`
   still fills the swatch on each option of the Status facet below (`DOT_TONE_FILL`
   + `helpFacets`), which is a menu of STATUSES and is untouched by the 2026-09-09
   ruling — she took the colour off the board's COLUMN HEADS, not off the app's
   idea of what a status colour is. `waitingDotTone` came with it until that day
   and is gone from `shared/status-tones.ts` entirely: the board's Waiting column
   was its only caller, and an export nobody imports is a contract nobody agreed
   to (web/test/dead-exports.test.ts). */

/** THE CHIP LINE — four facts and nothing else: the number, the type, the
 * app, the date.
 *
 * MOVED OUT OF THIS FILE, 2026-09-06, INTO `shared/web/ticket-chips.tsx`
 * (`TicketChips`) — the client, reading this card next to the ticket DETAIL
 * screen, verbatim: "replicate the pills that we have on the view outside.
 * These are: ID, type, app, date. Remove the rest, and everywhere else where
 * tickets have pills, reuse this." Every design ruling this line has ever
 * carried — the black `variant="inverse"` chip for the number, why a
 * numberless ticket draws no chip, the `#F7F2EB`/`--surface-panel` paper and
 * why it is a rebind rather than a class, the app pill's 2026-09-06 return
 * ("bring the app back in the chips at the top, without the icon") and why it
 * stays a link, and the date chip's word-for-word wording — is recorded there
 * now, in full, rather than duplicated here. This wrapper exists only because
 * `Swatch`, `ticketTypeColour` and `InAppLink` are `web/`-only (the shared
 * file's own header says why they cannot be imported from `shared/web/`
 * itself) and `teamId` is this screen's own routing fact — so this is the one
 * place that supplies them, and every other ticket surface (the ticket detail
 * screen, `web/components/tickets/help-detail.tsx`, among them) supplies its own the
 * same way.
 *
 * `TriageChips` KEEPS ITS NAME rather than being inlined at its one call
 * site below, because this file's own comments refer to it by that name in
 * four other places (the list view's app-column note, the identical-dot
 * note on its own type chip, and twice on the sitting's `eyebrow`/`TriageMeta`
 * pairing) — renaming the wrapper would have made every one of those a
 * dangling reference for no reader benefit. */
/* IT TAKES `TicketChipFacts` NOW, NOT `TriageWaiting` (2026-09-06). Two more
   ticket surfaces on this screen draw the same four chips — the Kanban card on
   the Open tab and the reading pane on Ready — and both hold a `HelpTicket`
   rather than a queue row. The shared component underneath has always typed its
   argument by the FACTS it needs (ref, kind, app, date) rather than by any one
   row shape, so widening this wrapper to the same type is what lets three
   surfaces share one chip line instead of two of them growing a fourth and a
   fifth way to draw a ticket's number — which is the exact thing the client's
   ruling behind `ticket-chips.tsx` forbids. */
/* AND IT FORWARDS `omitDate` (2026-09-07), which is the whole of what the
   board's own ruling costs this file. Client, reading the Open tab's board:
   "lets put the date below title as simole tex". `OpenBoard` is the one caller
   that passes it, and it draws the date itself in the kit card's `description`
   slot — the shared line still owns what a ticket's date LOOKS like (through
   `formatDate`, and through the sentence the client dictated for this exact
   position), the board only owns where it sits. See `shared/web/ticket-chips.tsx`
   for why that is a subtraction rather than a second chip line. */
export function TriageChips({
  teamId,
  ticket,
  omitDate,
}: {
  teamId: string
  ticket: TicketChipFacts
  omitDate?: boolean
}) {
  return (
    // THE ONE PLACE THIS SCREEN NAMES THE PAPER — see `shared/web/ticket-chips.tsx`'s
    // header for why the fill is a REBIND the call site owns rather than
    // something the shared line sets for itself. Spelled as a Tailwind
    // arbitrary-property class rather than a `style` object because that is
    // the spelling the app already uses for this exact rebind one file over
    // (`record-chrome.tsx`'s own `[--badge-quiet-fill:var(--surface-quiet)]`,
    // whose long comment is the history of why the kit built this hatch).
    <span className="[--badge-quiet-fill:var(--surface-panel)]">
      <TicketChips
        ticket={ticket}
        // THE SAME DOT THE PICKER ROW DRAWS, from the same component and the
        // same map — so the colour a person clicks and the colour they read
        // back afterwards cannot be two different objects that happen to
        // agree today.
        typeDot={<Swatch colour={ticketTypeColour(ticket.helpType)} />}
        appHref={ticket.appId ? `/t/${teamId}/apps/${ticket.appId}` : undefined}
        AppLink={InAppLink}
        omitDate={omitDate}
      />
    </span>
  )
}
