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

import * as React from "react"

import { Headline, Text } from "@shared/ui/components/typography/typography"
/* THE BOARD AND THE SPLIT — the kit's own, vendored, and both adopted in this
   pass (their `KIT_COMPONENT_EXEMPT` lines were deleted by the same commit —
   R46's rot-check refuses an exemption for a part that is reached). Neither is
   drawn app-side: `OpenBoard` and `ReadySplit` below supply rows and a pane. */
/* `KanbanColumnDot` USED TO BE IMPORTED BESIDE IT, for the tone each column
   head wore. The client took the colour off the column heads on 2026-09-09 (the
   ruling is written out at `COLUMN` below), the kit's `dot` prop is optional and
   is simply not passed any more, so the type has nothing left to constrain. */
import { Split } from "@shared/ui/components/split/split"
/* THE LIST VIEW'S TABLE, composed from the kit's own primitives rather than
   drawn through `RecordTable` — the reason is written out at the `triageView
   === "list"` branch below, and it is R16's: `RecordTable` brings
   `CollectionFrame`, which brings a second search box and a second count onto a
   screen that already has one of each. */

import { ticketTitle } from "@shared/web/ticket-chips"
// THE LABELS ONLY. The collection's DEFAULT sort used to be read here too and
// is not any more: which order a tab opens in is a per-tab answer now
// (`helpTabSorts`), and a screen holding both would be two places deciding one
// thing — with the tab's answer silently losing on whichever prop forgot.
/* ONE READER OF THIS FILE LEFT, AND IT IS THE STATUS FILTER. `helpStatusDotTone`
   still fills the swatch on each option of the Status facet below (`DOT_TONE_FILL`
   + `helpFacets`), which is a menu of STATUSES and is untouched by the 2026-09-09
   ruling — she took the colour off the board's COLUMN HEADS, not off the app's
   idea of what a status colour is. `waitingDotTone` came with it until that day
   and is gone from `shared/status-tones.ts` entirely: the board's Waiting column
   was its only caller, and an export nobody imports is a contract nobody agreed
   to (web/test/dead-exports.test.ts). */
import { formatDate } from "@shared/web/format"
import { useLanguage } from "@shared/web/language"
import type { HelpTicket } from "@shared/types"
import { richTextPlain } from "@shared/web/rich-text"
import { TriageChips } from "@/components/tickets/triage-chips"

/** THE READY TAB'S SECOND BODY — client, 2026-09-06: "add another tab: ready /
 * will do split view and list / between triage and open".
 *
 * ── THE KIT SHIPS THIS, AND IT IS VENDORED ────────────────────────────────
 *
 * `shared/ui/components/split/split.tsx`, drawn from CH19 view 12 and CH27.27
 * ("Split list and preview"): the 300px list on the left, the record filling the
 * rest, two independent scroll containers, one row always selected, and the
 * keyboard sentence spelled out under the pane. Nothing about the layout, the
 * selection or the keys is written here — this file supplies the rows and the
 * pane, which is the division the kit's own header insists on ("THE PANE IS THE
 * CALLER'S … passing a node rather than rendering one keeps this file from
 * having a second opinion about what a record looks like").
 *
 * ADOPTING IT DELETED ITS `KIT_COMPONENT_EXEMPT` LINE, and the sentence in that
 * line was true when it was written: the app's convention is a list navigating
 * to a full-page deep-link detail, and a persistent two-pane master-detail
 * contradicts that. The client has now asked for one, on one tab, which is what
 * R46's rot-check is for — an exemption whose part is reached turns the build
 * red, so the argument had to be revisited rather than quietly outlived.
 *
 * ── WHAT THE PANE IS, AND WHAT IT DELIBERATELY IS NOT ─────────────────────
 *
 * IT IS NOT `help-detail.tsx`. That screen is the ticket's whole record — tabs,
 * activity, the reply composer, the send-hold — and mounting it inside a 1fr
 * column would put a second set of record tabs inside a collection card, on a
 * tab whose own toolbar is six inches above it. CH27.27 says the pane is
 * composition 27.8 "with its breadcrumb removed", not a screen inside a screen.
 *
 * So the pane is the ticket's FACE plus its words: the same shared chip line
 * every other ticket surface draws (`TicketChips`, the client's standing ruling)
 * and the description underneath, with the kit's own `openLabel` control as the
 * way out to the full record. That is what a preview pane is for — deciding
 * which one to open — and it makes the promise it can keep.
 *
 * ── WHY READY IS THE TAB THAT EARNS IT ────────────────────────────────────
 *
 * CH27.27's own brief names the case: "for collections a person works down one
 * by one — an inbox of requests, a review queue". Ready is exactly that pile —
 * every story closed, nobody has sent it — and the act it exists for is reading
 * each one and deciding what to say. Open and Closed are not worked down one by
 * one, which is why neither offers this. */
export function ReadySplit({
  teamId,
  rows,
  onOpen,
}: {
  teamId: string
  rows: readonly HelpTicket[]
  onOpen: (id: string) => void
}) {
  const { t, lang } = useLanguage()
  /* WHICH ROW IS BEING READ. Controlled, and held here rather than left to the
     kit's own uncontrolled default, for one reason: the pane is built from the
     ROW, so this component has to know which row that is. Plain state rather
     than `useRemembered` — a selection is where you are in one sitting, not a
     preference; coming back tomorrow to the fourth ticket you happened to be
     reading is a surprise rather than a convenience. */
  const [selected, setSelected] = React.useState<string | null>(null)
  // ONE ROW IS ALWAYS SELECTED (CH27.27, and the kit refuses to draw an empty
  // "select a record" pane at all). A selection that no longer names a row —
  // the page moved, the ticket was resolved — falls back to the first rather
  // than blanking the pane.
  const current = rows.find((r) => r.id === selected) ?? rows[0]
  return (
    <Split
      records={rows.map((r) => ({
        id: r.id,
        number: r.ref ?? undefined,
        title: ticketTitle(r),
        // ONE METADATA LINE, which is all the 300px column has room for and all
        // CH27.27 draws. The kind and the day it was raised: the two facts that
        // tell you which of forty finished tickets this one is.
        //
        // THE TEAM'S OWN GLYPH USED TO LEAD IT and no longer does — client,
        // 2026-09-07, "for type, kill the emojis". This is a plain STRING slot
        // (the kit joins it into one quiet line), so unlike the table's Type
        // cell there is no colour to fall back on here: the kind is carried by
        // its word, which is condition three of a type mark anyway ("a missing
        // mark is never a missing fact", web/lib/type-marks.ts). A `Swatch` in a
        // string slot would render as nothing at all, so it is not attempted.
        meta: [r.helpType ?? t("No type"), formatDate(r.createdAt, lang)].join(" · "),
      }))}
      selectedId={current?.id}
      onSelectionChange={(id) => setSelected(id)}
      onOpen={(record) => onOpen(record.id)}
      openLabel={t("Open the ticket")}
      listLabel={t("Ready tickets")}
      detailLabel={t("The ticket you are reading")}
      hint={t("Up and down move between tickets. Enter opens the one you are reading.")}
      detail={
        current && (
          <div className="flex flex-col gap-4">
            <TriageChips teamId={teamId} ticket={current} />
            <Headline as="h3" size="h4">
              {ticketTitle(current)}
            </Headline>
            {/* THE CLIENT'S OWN WORDS, as they wrote them. `richTextPlain`
                rather than the stored markup: this pane is a PREVIEW, the full
                record renders the rich text properly one click away, and a
                sanitiser is not something a preview pane should be carrying its
                own copy of. `whitespace-pre-wrap` keeps their paragraphs. */}
            <Text as="p" size="sm" tone="secondary" className="whitespace-pre-wrap">
              {richTextPlain(current.description)}
            </Text>
          </div>
        )
      }
    />
  )
}
