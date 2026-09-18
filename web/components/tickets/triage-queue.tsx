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

import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { SearchInput } from "@shared/ui/components/search-input/search-input"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import { useRemembered } from "@shared/web/remembered"
import { Button } from "@shared/ui/components/button/button"
import { toast } from "@shared/ui/components/sonner/sonner"
import { Badge } from "@shared/ui/components/badge/badge"
import { Card } from "@shared/ui/components/card/card"
import { Queue } from "@shared/ui/components/queue/queue"
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
import { ArrowCounterClockwise, Cards, ListBullets, Check, Tag } from "@shared/ui/foundations/icons"
import { useFilterBar } from "@shared/web/screen-engine/filter-bar"

import { RecordRef, REF_LEADS_NAME } from "@shared/web/record-ref"
import { ticketTitle } from "@shared/web/ticket-chips"
// THE LABELS ONLY. The collection's DEFAULT sort used to be read here too and
// is not any more: which order a tab opens in is a per-tab answer now
// (`helpTabSorts`), and a screen holding both would be two places deciding one
// thing — with the tab's answer silently losing on whichever prop forgot.
import { AddButton, ToolbarRow } from "@/components/deep-link/screen-bits"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import { tenancy } from "@/lib/api/tenancy"
import { ApiFailure, content as contentApi } from "@/lib/api"
import type { HelpAccountFacet, TriageWaiting } from "@/lib/api/content"
import { RecordPicker, type PickerOption } from "@/components/records/record-picker"
import { assignableMembers, staffedOn } from "@/lib/members"
import { ticketTypeIconName } from "@shared/ticket-types"
import { Icon } from "@shared/web/screen-engine/icon"
/* ONE READER OF THIS FILE LEFT, AND IT IS THE STATUS FILTER. `helpStatusDotTone`
   still fills the swatch on each option of the Status facet below (`DOT_TONE_FILL`
   + `helpFacets`), which is a menu of STATUSES and is untouched by the 2026-09-09
   ruling — she took the colour off the board's COLUMN HEADS, not off the app's
   idea of what a status colour is. `waitingDotTone` came with it until that day
   and is gone from `shared/status-tones.ts` entirely: the board's Waiting column
   was its only caller, and an export nobody imports is a contract nobody agreed
   to (web/test/dead-exports.test.ts). */
import type { TriageGap } from "@shared/triage-readiness"
import { staffNameFromSnapshot } from "@shared/staff-name"
import { HelpFormDialog } from "@/components/tickets/help-form-dialog"
import { appsKey, helpAttachmentsKey, helpKey, listFetch, triageKey } from "@/lib/live-resources"
import { useSessionUserId } from "@/lib/use-active-team"
import { primeCache, invalidate, mergePage, useCached } from "@shared/web/store"
import { useT } from "@shared/web/language"
import type { AppRow, HelpAttachment, HelpTicket, TeamMember } from "@shared/types"
import { richTextPlain } from "@shared/web/rich-text"
import {
  TicketRowsTable,
  TRIAGE_SORTS,
  narrowTriage,
  triageAct,
  triageFacets,
} from "@/components/tickets/tickets-collection"
import { TriageChips } from "@/components/tickets/triage-chips"
import { TriageMeta } from "@/components/tickets/triage-meta"
import { TriageAttachments } from "@/components/tickets/triage-attachments"

/** THE TRIAGE QUEUE — one ticket at a time, and the one act that sorts it.
 *
 * ── WHAT TRIAGE IS, IN THE CLIENT'S OWN WORDS (2026-09-06, round eight) ──────
 *
 * "One person does the triage (me), and it's just seeing the tickets and seeing
 * that they are in the right category." She does NOT do the work in the queue:
 * questions get answered later, issues get given to somebody, extras and
 * requests are stored for later. TRIAGE SORTS; IT DOES NOT RESOLVE.
 *
 * And the fact the whole screen is shaped around: a ticket almost always arrives
 * typed as ISSUE, because that is what the person raising it picks. So
 * RECATEGORISING is not an edge case reachable through a form — it is the main
 * action, and it is one click from the card.
 *
 * ── WHY IT IS A SITTING AND NOT A LIST ──────────────────────────────────────
 *
 * This used to be a `<ul>` of one-line rows: a reference, a truncated
 * description, and five controls squeezed onto the end of each one. A list asks
 * the reader to choose which row to work on, which is a decision nobody wants to
 * make eighteen times, and it has room for a reference and nothing else — not
 * the client, not who asked, not what they attached. So the person on duty was
 * deciding a ticket's category from a truncated sentence.
 *
 * It is the kit's own `Queue` now (`shared/ui/components/queue/queue.tsx`), and
 * that is not a coincidence: the kit drew this component FROM THE SAME CLIENT'S
 * SPEC (its header cites CH19 view 13 and CH27.41, "Triage sitting · Figures,
 * then one card at a time"), and it has been sitting in the vendored kit
 * unadopted, with a `KIT_COMPONENT_EXEMPT` line saying this exact tab was "a
 * plain filtered list … not a one-record-at-a-time decide/skip sitting." That
 * line is deleted by the same commit as this comment: the sentence stopped being
 * true, so the exemption had to go (R46's ratchet, working).
 *
 * WHAT THE KIT OWNS: the counted strip and its bar, the raised card, the quiet
 * tail of what is still waiting, the decision row pinned to the foot, and the
 * Skip control (ghost, `ms-auto`, and the client's own ruled word). WHAT THIS
 * FILE OWNS: the four decisions, the two pickers, and the sitting's ORDER —
 * which the kit cannot own and says so at length, because it is handed the card
 * in hand and the tail as different shapes.
 *
 * THE FOUR SKIP OBLIGATIONS the kit's header sets out, and where each is kept:
 *   1 · MOVE, DO NOT DROP — `skip()` pushes the id onto `skipped`; nothing is
 *       filtered out of `undecided`, so the ticket comes back at the end.
 *   2 · `total` DOES NOT MOVE — `total` is `undecided.length + decided.length`,
 *       and a skip changes neither term. (The kit warns in development if it
 *       ever falls across a skip; this arithmetic is what keeps it quiet.)
 *   3 · THE TAIL MUST SHOW IT — `order` puts the returning ticket at the END,
 *       so it appears at the bottom of `upcoming` rather than vanishing.
 *   4 · WRITE NOTHING — `skip()` calls no door, logs nothing and pings nothing.
 *       It is browser state for the length of one sitting.
 *
 * AND THE ONE THING 27.41 LEAVES TO THE APPLICATION, which the kit explicitly
 * hands over ("applications should not re-point `position` at a count of
 * decisions without changing `formatCount` to say so"): the counter here counts
 * DECISIONS, not hands. The kit's default counts how many tickets you have been
 * handed, which under an unlimited re-queue can pass `total` — "21 of 18" on a
 * queue of eighteen. A person reading "3 of 18" is asking how far through she
 * is, so the numerator is how many she has settled, it never exceeds the
 * denominator, and `formatCount` below says the sentence out loud. A skip
 * therefore does not advance it, which is the honest answer: passing on a ticket
 * is not progress through the pile.
 *
 * ── THE DOOR STILL DECIDES WHO SEES IT ──────────────────────────────────────
 *
 * "Only the person on duty sees what is waiting to be triaged" is enforced by
 * the DOOR: it answers `yours` and hands an empty list to anybody else. This
 * component renders what it was given and says plainly why it is empty, which is
 * the honest shape — a screen cannot keep a secret it has been told. */
export function TriageQueue({
  teamId,
  canTriage,
  canEdit,
  helpTypeOptions,
  canCreateTicket,
  onCreate,
  onOpen,
}: {
  teamId: string
  canTriage: boolean
  canEdit: boolean
  helpTypeOptions: string[]
  /** present = the reader may raise one, and this opens the form — the
   * toolbar's own "Raise ticket" button, moved in from the parent along with
   * the toolbar itself (see the header comment on why). */
  canCreateTicket: boolean
  onCreate: () => void
  onOpen: (id: string) => void
}) {
  // `useT` AGAIN, AND THE HISTORY IS WORTH KEEPING. This component dropped to
  // `useT` when the date moved out of it into `TriageChips`; it went back to
  // `useLanguage` when the list view arrived, because those rows carry a date of
  // their own; and it is back to `useT` now that the list's table has been
  // lifted into `TicketRowsTable`, which reads the reader's language itself. The
  // rule underneath all three moves is the same one: whoever DRAWS the date asks
  // for the locale, and nobody else holds it just in case.
  const t = useT()
  /** THE SIGNED-IN MEMBER — handed to `staffedOn` below so an app's own
   * staffing can never make her disappear from "who could pick this up?"
   * (16 Sep 2026 correction, `lib/members.ts`'s own account). This row never
   * preselects a value (see `peopleFor`'s own comment for why it is exempt
   * from R79's preselect clause), so there is no default here to seed — only
   * the OFFERED half of the fix applies to an action row. */
  const myUserId = useSessionUserId()
  const triageQ = useCached(triageKey(teamId), () => contentApi.triage())
  const [busy, setBusy] = React.useState(false)
  const [editing, setEditing] = React.useState<TriageWaiting | null>(null)
  // THE QUEUE'S OWN SEARCH — moved in from the parent (R50, 2026-09-03 second
  // pass): the toolbar this narrows and the row count that gates it now live
  // in the same component, so "never toolbar on empty collection" can be
  // answered honestly instead of drawn unconditionally one component up from
  // the fetch that actually knows.
  const [query, setQuery] = React.useState("")
  /** …AND THE REST OF THE TOOLBAR (client ruling, 2026-09-06: "the queue gets
   * the full toolbar — search, filter by type, filter by app, sort by raised").
   *
   * ONE BAG RATHER THAN TWO NAMED PIECES OF STATE, and not for brevity:
   * `useFilterBar` hands back `(field, value)` pairs off a menu it builds from
   * `triageFacets` above, so the state has to be keyed by the same field names
   * the facets declare. Two booleans-with-names here would be a third place
   * those names are written down, and the day a fourth facet arrives it is the
   * one place somebody forgets. Empty string clears, which is the hook's own
   * contract; the key is DELETED rather than set to "" so `Object.keys` is an
   * honest count of what is on. */
  const [facetValues, setFacetValues] = React.useState<Record<string, string>>({})
  /** WHICH END OF THE PILE SHE IS READING FROM. The FIELD never moves — there is
   * one thing this collection can be ordered by and `TRIAGE_SORTS` says why —
   * so this is really one boolean wearing the shape every other sort control in
   * the app wears, which is the point: R53 exists because the same control was
   * being built eleven different ways. Not `useRemembered`: a sitting is a
   * sitting, and an order carried over from last Tuesday's queue is a surprise
   * rather than a convenience — the tab's own facet IS remembered, one component
   * up, because that is "where she was" rather than "how she was reading". */
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc")

  // ── THE SITTING'S OWN BOOKKEEPING, and it is deliberately only two arrays ──
  //
  // Everything else about the queue — which ticket is in hand, how many are
  // left, what the tail says — is DERIVED below from the door's answer and
  // these two. The alternative (holding the order itself in state, seeded once
  // from the first read) was written first and thrown away: it goes stale the
  // moment a colleague raises a ticket, and it has to be re-seeded on every
  // keystroke in the search box, which is two more chances for the card in hand
  // and the count above it to disagree. A queue that says "3 of 18" while
  // holding the wrong ticket is worse than one that re-derives.
  /** Tickets sent to the BACK of this sitting, in the order they were passed
   * over. Never a reason to write anything down: the client struck the log
   * clause of 27.41, so a skip leaves no trace anywhere but here, and here only
   * until the tab is left. */
  const [skipped, setSkipped] = React.useState<string[]>([])
  /* WHICH BODY THE SITTING DRAWS — client: "add view selector - the current one
     and list (so far only add the selector and a raw version of list, we will
     work on the details for list next)".

     `useRemembered` rather than plain state, which is `ViewSwitch`'s own stated
     contract: a view is a PERSON'S preference and is remembered per person, not
     per screen and never in a store a colleague shares. The key is scoped to
     triage so choosing a list here does not decide anything on another
     collection.

     RAW ON PURPOSE, and named so nobody mistakes it for finished: the list is
     the queue's own rows with nothing added — no columns, no sort headers, no
     selection. She asked for the SELECTOR to exist and a body behind it to
     prove the switch works; the details are the next conversation. */
  const [triageView, setTriageView] = useRemembered<"queue" | "list">("triage-view", "list")
  /** Tickets settled in this sitting. They leave the front of the order the
   * instant Accept returns, rather than when the door's next answer lands —
   * without this the card would sit on a ticket it had just triaged for as long
   * as the refetch takes. They stay in `total`, because the denominator is how
   * big the sitting was. */
  const [decided, setDecided] = React.useState<string[]>([])
  /* WHICH OF THE DECIDED WENT TO A PERSON — the one fact the tally needs that
     the ticket rows cannot answer. Everything else in the finished register is
     DERIVED from `decided` against the rows already in hand (an id, and the row
     it belongs to, gives the type), so this is the only thing worth keeping a
     second list for. It moves with `decided` in both directions, including undo,
     which is why it is written beside it rather than folded into the accept
     handler and forgotten on the way back. */
  const [assigned, setAssigned] = React.useState<string[]>([])
  /* WHICH LIST ROW IS MID-DECISION — the client chose L3, the strip that opens
     beneath the row, over a panel or a dialog. One id, not a set: two open
     strips would be two half-made decisions on screen at once, and the row
     leaves as soon as one is finished anyway. */
  const [rowPicker, setRowPicker] = React.useState<string | null>(null)
  /** Which one-row picker is open, if either. One value rather than two
   * booleans: they are alternatives (the type row and the people row cannot
   * both be the answer to what Accept is waiting for), and two booleans is two
   * chances for both to be true. */
  const [picker, setPicker] = React.useState<"type" | "person" | null>(null)
  /** THE LAST DECISION, so it can be taken back. Undo is a real door call in
   * both cases — not a local rewind — because the decision was one: an Accept
   * moved the ticket's status and a recategorisation wrote its type, and
   * "putting it back" means moving it back. */
  const [lastAct, setLastAct] = React.useState<UndoableTriageAct | null>(null)

  /** WHO COULD PICK UP AN ISSUE. Two bounded reads other screens already hold —
   * the team's members (`members:<team>`, read by the strip above this very
   * screen) and the apps list, whose rows carry their own staff. Neither is a
   * new door: `lib/members.ts`'s `staffedOn` says why the staffing needs none. */
  const membersQ = useCached<TeamMember[]>(`members:${teamId}`, () =>
    tenancy.members().then((r) => r.members)
  )
  const appsQ = useCached<AppRow[]>(appsKey(teamId), () => listFetch.apps(teamId))

  /** WHAT THE ROW IS STILL MISSING, in the reader's own language. The gaps
   * themselves are decided by the door (shared/triage-readiness.ts) and arrive
   * as machine words; only the wording is chosen here, because a worker's
   * strings are outside the translation catalogue and a screen's are not. */
  const GAP_WORD: Record<TriageGap, string> = {
    type: t("a ticket type"),
    client: t("an account"),
    app: t("an app"),
    raisedBy: t("who raised it"),
  }

  // ── THE SITTING, DERIVED ────────────────────────────────────────────────
  // Computed BEFORE the four early returns below, because the attachment read
  // for the card in hand is a hook and a hook cannot sit after one. Every
  // expression here is `?.`/`?? []` safe against a `triageQ` that has not
  // answered yet, which is the price of that ordering and the whole of it.
  const view = triageQ.data
  /** THE DOOR'S WHOLE ANSWER, before anything on the toolbar has narrowed it.
   * Held as its own name because THREE separate things need the unnarrowed
   * list and only one of them is obvious: the facet menus (options taken off a
   * filtered set vanish as you filter — see `triageFacets`), `useFilterBar`'s
   * own `data` argument, and R50's emptiness question, which is about the
   * collection and never about the current search. */
  const waiting = view?.waiting ?? []
  // NARROWED MEANS "SOMETHING IS ASKED", AND THE FACETS COUNT TOO. This used to
  // read `query.trim() !== ""` and was the whole truth while search was the only
  // control; with three facets beside it, a reader who filters to an app with no
  // rows would otherwise be shown the kit's "you have been through everything"
  // register — a sitting reported as FINISHED because a dropdown was set. It is
  // the same expression `apps-screen.tsx` writes one line below its own search.
  const narrowed = query.trim() !== "" || Object.keys(facetValues).length > 0
  // The toolbar's four questions, applied in one place (see `narrowTriage`).
  const matching = narrowTriage(waiting, {
    query,
    accountId: facetValues.accountId,
    helpType: facetValues.helpType,
    appId: facetValues.appId,
  })
  const undecided = matching.filter((w) => !decided.includes(w.id))
  // THE DOOR'S OWN ORDER, OR ITS REVERSE — and nothing else, which is what keeps
  // this a queue. `needsTriage` returns oldest-first ("the oldest is the one
  // that has been ignored longest, which is the only ordering this list can
  // honestly have"), so `asc` is that answer untouched and `desc` is the same
  // pile read from the other end. A COPY before `reverse`, because `reverse`
  // mutates in place and `undecided` is read again two lines below for `total`
  // — a reversed count is the same number, which is exactly why that bug would
  // have been invisible.
  const inOrder = sortDir === "asc" ? undecided : [...undecided].reverse()
  // THE RING (the kit's own word for it): what is still in hand, in the order
  // above, then whatever has been passed over, in the order it was passed over.
  // `filter` + `map` rather than a sort, because "the order I was given, with
  // these moved to the end" is not a comparison between two tickets and writing
  // it as one would invite somebody to add a second key.
  const order = [
    ...inOrder.filter((w) => !skipped.includes(w.id)),
    ...skipped
      .map((id) => undecided.find((w) => w.id === id))
      .filter((w): w is TriageWaiting => w !== undefined),
  ]
  const current = order[0]
  const total = undecided.length + decided.length
  /* THE TALLY THE FINISHED REGISTER SHOWS — client's pick D1: the breakdown is
     the reward, and it is also the next thing to do. "5 questions to answer" is
     tomorrow's work, named at the moment she still has the context.

     DERIVED, NOT COUNTED AS IT HAPPENS. `decided` holds ids and the rows stay in
     `matching` — only `undecided` filters them out — so the types can be read
     back off the rows in hand. A running counter would have been a second
     source of truth that undo has to remember to unwind, which is exactly the
     bug `assigned` above is careful about.

     IT COUNTS THIS SITTING, NOT TODAY, and that is a choice worth stating. The
     client asked whether the strip should say "decided today"; a per-type
     breakdown of "today" would need a server read of every ticket triaged since
     midnight, and it would not match the chips beside it the moment somebody
     else on duty triaged one. The sitting is what she just did, it is free, and
     it cannot disagree with itself. */
  const sittingTally = React.useMemo(() => {
    const rows = matching.filter((w) => decided.includes(w.id))
    const byType = new Map<string, number>()
    for (const w of rows) {
      const k = w.helpType ?? ""
      if (k) byType.set(k, (byType.get(k) ?? 0) + 1)
    }
    return { rows, byType: [...byType.entries()], assignedCount: assigned.length }
  }, [matching, decided, assigned])
  const position = Math.min(decided.length + 1, total)

  /** WHAT THEY ATTACHED — for the ONE ticket in hand, and this is the whole
   * reason a sitting can afford thumbnails where a list could not. Attachments
   * live behind their own per-ticket door (there is no bulk read), so the old
   * row list would have needed one round trip PER ROW, up to `LIST_HARD_CAP` of
   * them, to draw the same picture. A queue hands over one ticket, so it makes
   * one call, and the answer is cached under the key the live registry already
   * patches when somebody adds a file (`TEAM_RESOURCES.help.deps`). */
  const currentId = current?.id ?? null
  const attachmentsQ = useCached<HelpAttachment[]>(
    currentId ? helpAttachmentsKey(currentId) : null,
    () =>
      contentApi.helpAttachments(currentId ?? "").then((r) => {
        // R16: the exact server count, never this array's length.
        primeCache(`total:${helpAttachmentsKey(currentId ?? "")}`, r.total)
        return r.attachments
      })
  )

  /** THE TOOLBAR'S FILTER PILL AND ITS PANEL (R53's `filters` + `toolbarPanel`
   * slots) — `useFilterBar`'s own `{ pill, panel }` split, so the count chip
   * sits in the track and the open panel is a real sibling BENEATH it rather
   * than an overlay floating over the card (client ruling, 2 Sep 2026).
   *
   * CALLED UNCONDITIONALLY, AND THAT IS THE WHOLE REASON IT SITS HERE. It is a
   * HOOK, and four early returns follow below (a failed read, an unanswered
   * one, a reader who is not on duty, and a genuinely empty queue) — a hook
   * after any of them would change the hook order between renders, which is the
   * one React rule this file may not break. `apps-screen.tsx` keeps the same
   * discipline for the same call, with the same note. Every expression it is
   * handed is `?? []`-safe against a `triageQ` that has not answered yet, which
   * is the price of that ordering and the whole of it.
   *
   * `data` IS THE UNNARROWED LIST, deliberately: the hook derives a facet's
   * options from it whenever a facet declares none, and every one of ours
   * declares its own — but handing it `matching` would make that fallback
   * wrong the day somebody adds a third facet without options, and a latent
   * wrong default is worse than an unused right one. */
  const { pill: filterPill, panel: filterPanel } = useFilterBar({
    facets: triageFacets(waiting, t, appsQ.data ?? []),
    values: facetValues,
    data: waiting,
    onChange: (field, value) =>
      setFacetValues((prev) => {
        const next = { ...prev }
        // DELETED, never set to "" — `narrowed` above counts the KEYS, so a
        // cleared facet left behind as an empty string would keep the whole
        // screen in its "you asked something" mode for ever.
        if (value === "") delete next[field]
        else next[field] = value
        return next
      }),
    onClearFacets: () => setFacetValues({}),
    resultCount: matching.length,
  })

  /** THE TEAM'S OWN TICKET TYPES, each with the icon the client ruled for it —
   * one map, `shared/ticket-types.ts`, read by this row and by anything that
   * draws a type after it. Colour retired here 17 Sep 2026 ("the one that gets
   * the chip with the color is always the status … for tickets, we need to
   * find icons for the ticket type"). A word that map does not know —
   * "General" on an imported ticket, or one a team typed before the group was
   * locked at four on 15 Sep 2026 — draws no icon rather than being left off:
   * these options are built from what the ROWS say, and a picker that offered
   * only the four would be this screen quietly hiding a card it is showing. */
  const typeOptions: PickerOption[] = helpTypeOptions.map((v) => {
    const iconName = ticketTypeIconName(v)
    return {
      value: v,
      label: v,
      icon: iconName ? <Icon name={iconName} className="size-3.5" /> : undefined,
    }
  })

  /** WHO IS ON THE TICKET'S APP, falling back to everybody who can be given
   * work — `staffedOn`'s own fail-open, shared with the story form (see
   * `lib/members.ts`). The fallback is not a nicety here: Accept on an Issue
   * cannot proceed without somebody to pick, so an empty list would be a dead
   * end on exactly the apps whose staffing has not been filled in yet.
   *
   * AND THE SIGNED-IN MEMBER IS NEVER *NARROWED* OUT OF IT EITHER (16 Sep
   * 2026 correction) — `myUserId` rides as `staffedOn`'s fourth argument
   * below, the same fix the story form carries, because this row asks the
   * identical question of the identical seam. THIS ROW STAYS EXEMPT FROM
   * R79'S PRESELECT CLAUSE, though: it is `RecordPicker layout="row"`, an
   * ACTION row that commits Assign on the click rather than a form with a
   * submit step to preselect a value INTO (R79's own text, and
   * `staff-preselect-call-sites.test.ts`'s derivation reads this file's
   * `<StaffPillPicker>`-only population and finds none here for the same
   * reason) — so the fix here is "she is always an option", never "she is
   * the option already clicked". */
  const appStaff = new Map((appsQ.data ?? []).map((a) => [a.id, a.staff.map((p) => p.userId)]))
  /* WHO MAY TAKE A TICKET ON ONE APP — a function now, not a value, because the
     LIST asks it once per row. The card only ever asks about the ticket in hand,
     so this was `current?.appId` baked in; a table has a different app on every
     line, and narrowing all of them against the card's app would have offered
     the wrong colleagues on every row but one. Same rule, same fail-open
     (`staffedOn` returns everybody when an app has no staff, so Assign is never
     a dead button), asked per ticket.

     A PLAIN FUNCTION, NOT `useCallback`. It was wrapped for a moment and the
     lint was right to refuse it: `appStaff` is a `new Map(...)` built on every
     render, so a callback depending on it is rebuilt every render too — the
     memo would have been theatre, and theatre that costs a dependency array to
     keep honest. The work is a filter and a map over a team's members, done a
     handful of times per render. */
  const peopleFor = (appId: string | null | undefined): PickerOption[] =>
    staffedOn(assignableMembers(membersQ.data), appStaff, appId, myUserId).map((m) => ({
      value: m.id,
      label: m.name,
      picture: m.photo,
      shape: "round" as const,
    }))
  const peopleOptions: PickerOption[] = peopleFor(current?.appId)

  /** The fresh page + facet counts every ticket write hands back. Merged rather
   * than thrown away and refetched — the door's response IS the new first page,
   * and merging by id keeps rows scrolled in past the cursor. */
  function absorb(r: {
    tickets?: HelpTicket[]
    byType?: Record<string, number>
    byStatus?: Record<string, number>
    byAccount?: HelpAccountFacet[]
  }) {
    invalidate(triageKey(teamId))
    if (r.tickets) mergePage(helpKey(teamId, "all"), "id", r.tickets as unknown as Record<string, unknown>[])
    if (r.byType) primeCache(`help-by-type:${teamId}`, r.byType)
    if (r.byStatus) primeCache(`help-by-status:${teamId}`, r.byStatus)
    if (r.byAccount) primeCache(`help-by-account:${teamId}`, r.byAccount)
  }

  function failed(err: unknown) {
    toast.error(err instanceof ApiFailure ? err.message : t("Couldn't do that."))
  }

  /** ACCEPT — "this is in the right place", and the one judgement in the whole
   * ticket lifecycle nothing can infer. Sets the status to `triaged` through the
   * door that has always done it, then advances.
   *
   * `assignTo` IS THE ISSUE PATH, and it is one motion by construction: the
   * person is put on the ticket and the ticket is accepted inside one handler,
   * so there is no state in which a colleague has been named and the ticket is
   * still sitting unread. If the second call fails the first is left standing —
   * which is the right way round: somebody on a ticket that is still in triage
   * is untidy, a triaged ticket nobody was given is lost. */
  async function accept(w: TriageWaiting, assignTo?: string) {
    setBusy(true)
    try {
      if (assignTo) await contentApi.addStakeholder(w.id, assignTo)
      absorb(await contentApi.triageRead(w.id))
      setDecided((d) => [...d, w.id])
      if (assignTo) setAssigned((a) => [...a, w.id])
      setSkipped((s) => s.filter((id) => id !== w.id))
      setPicker(null)
      setLastAct({ kind: "accept", id: w.id })
      toast.success(t("Triaged."))
    } catch (err) {
      failed(err)
    } finally {
      setBusy(false)
    }
  }

  /** CHANGE CATEGORY — the main action, and the reason the picker commits on the
   * click. `updateHelp` is the ticket's own edit door, the same one the form
   * dialog posts through; `description` rides along because the door requires it
   * and the ticket's own words are what we already have. */
  async function recategorise(w: TriageWaiting, next: string) {
    setBusy(true)
    try {
      absorb(await contentApi.updateHelp({ id: w.id, description: w.description, helpType: next }))
      setPicker(null)
      // UNDO IS ONLY OFFERED WHERE IT CAN BE HONOURED HONESTLY — and a ticket
      // that arrived with NO type is exactly the case it cannot, which is also
      // the ordinary case here (a ticket being categorised for the first time).
      //
      // The mechanism EXISTS and is deliberately not used. `help_type` is the
      // one field on the edit door's UPDATE that does NOT fall back to the row
      // (`optionalText(input.helpType, …) ?? null`, workers/content/src/lib/
      // help.ts), while the four fields beside it in the same statement —
      // `app_id`, `module_id`, `raised_by_contact_id`, `account_id` — all read
      // "an absent value means leave it alone". So an undo to "no type" would
      // work today by OMITTING the field, and it would work by depending on one
      // field meaning the opposite of its four neighbours. That asymmetry looks
      // like an oversight to the next person who reads that statement, and the
      // day somebody makes it consistent this Undo stops undoing and says
      // nothing. A disabled button is a smaller loss than a lying one: the type
      // is one click away in the row that is still open.
      setLastAct(
        w.helpType
          ? { kind: "type", before: { id: w.id, description: w.description, helpType: w.helpType } }
          : null
      )
      toast.success(t("Filed as {type}.", { type: next }))
    } catch (err) {
      failed(err)
    } finally {
      setBusy(false)
    }
  }

  /** UNDO — put the last decision back, through the same doors that made it.
   * Never a local rewind: both acts wrote to the database and pinged every open
   * screen, so "taking it back" is another write, and a browser that merely
   * forgot would leave the ticket triaged for everybody else. */
  async function undo() {
    const act = lastAct
    if (!act) return
    setBusy(true)
    try {
      if (act.kind === "accept") {
        // Back to `new`, which is the pre-triage state itself rather than a
        // status invented for the purpose (shared/triage-readiness.ts's own
        // ruling: "`new` IS the pre-triage state"). R17 rides the door, so an
        // undo of an undo moves zero rows and pings nobody.
        absorb(await contentApi.setHelpStatus(act.id, "new"))
        setDecided((d) => d.filter((id) => id !== act.id))
        setAssigned((a) => a.filter((id) => id !== act.id))
      } else {
        // THE WHOLE PAYLOAD, HANDED OVER RATHER THAN RETYPED (the shape
        // `forms-forward-everything.test.ts` exists to hold): the undo record IS
        // the argument `updateHelp` takes, so the day that door grows a field
        // there is one place to carry it and no handler here to forget it.
        absorb(await contentApi.updateHelp(act.before))
      }
      setLastAct(null)
      toast.success(t("Put back as it was."))
    } catch (err) {
      failed(err)
    } finally {
      setBusy(false)
    }
  }

  /** SKIP — the kit's four obligations, all four of them, and nothing else. See
   * this component's header for the list and for where each one is kept. */
  function skip(w: TriageWaiting) {
    setPicker(null)
    setSkipped((s) => [...s.filter((id) => id !== w.id), w.id])
  }

  // NO ERROR BRANCH USED TO EXIST HERE (2026-09-03 audit) — every sibling tab
  // in this file (`scopedQ.error`, above) has its own `ShapeStateBody
  // state="error"` + Retry, and this queue had none: a failed read fell
  // straight through to the `triageQ.data === undefined` check below and
  // spun on a skeleton for ever, with no way out for whoever hit it.
  if (triageQ.error)
    return (
      <ShapeStateBody
        shape="collectionScreen"
        state="error"
        copy={{ errorTitle: t("Couldn't load the triage queue.") }}
        action={
          <Button variant="secondary" onClick={() => triageQ.refresh()}>
            {t("Try again")}
          </Button>
        }
      />
    )
  if (view === undefined) return <Skeleton variant="list" lines={3} />
  // GENUINELY EMPTY, TWO WAYS — NEITHER DRAWS THE TOOLBAR (R50: never toolbar
  // on empty collection). Whoever is not on duty has no rows of THEIRS to
  // search or raise a ticket over from here; a real empty queue has nothing
  // to search either. Only once there is at least one waiting row does the
  // toolbar (search + "Raise ticket") appear at all — which is also why it
  // has to live in this component rather than the parent: the parent knows
  // neither of these two facts.
  if (!view.yours)
    return (
      <p className="text-muted-foreground text-sm">
        {/* A NAMED HOLE (R28/R33), not a raw interpolated fragment glued to a
            value — the same sentence beside it, `t("Nobody is on triage this
            week.")`, was correctly wrapped all along, so a name arriving on
            duty was the one branch of this sentence shipping in English to
            every non-English reader. */}
        {view.onDuty?.userName
          ? // R54: whoever is on triage is one of ours.
            t("{name} is on triage this week, so the queue is theirs.", {
              name: staffNameFromSnapshot(view.onDuty.userName),
            })
          : t("Nobody is on triage this week.")}
      </p>
    )
  /* THE QUEUE THAT WAS ALREADY CLEAR — client's pick E1, and the whole point of
     it is that it is NOT the cleared-queue register. Nobody achieved anything
     here: she opened Triage and there was nothing in it, either because nothing
     was raised or because whoever is on duty got there first. Praising that
     would be applause for a quiet Tuesday.

     So: the fact, then who is on duty, and nothing else. No mark, no count, no
     action — the tabs above already go everywhere, and a button here would be
     the app inventing a task to hand her. The trailing space in the old string
     went with it.

     The on-duty sentence is the same one drawn above when the whole view is
     empty of a rota, reused rather than reworded, so a reader meets one sentence
     about duty in this screen and never two that drifted apart. */
  if (view.waiting.length === 0)
    return (
      /* R62 — THE SAME REGISTER ITS FILTERED TWIN DRAWS (below). This was an
         `EmptyLine` plus a loose `<p>`; the register carries a title and one
         sentence, which is exactly the two things this state has to say. Still
         no action, for the reason above: a button here would be the app
         inventing a task to hand her. */
      <CollectionEmptyState
        title={t("Nothing waiting.")}
        description={
          view.onDuty?.userName
            ? // R54: whoever is on triage is one of ours.
              t("No new tickets to sort. {name} is on triage this week.", {
                name: staffNameFromSnapshot(view.onDuty.userName),
              })
            : t("No new tickets to sort. Nobody is on triage this week.")
        }
      />
    )

  // ── THE CARD IN HAND ────────────────────────────────────────────────────
  // Everything below is one ticket's worth, in the order the client drew it:
  // the chips, the title, her words beside what she attached, the date, and the
  // decisions. `current` is undefined only once the sitting is finished, which
  // is the kit's `done` register rather than a branch here.
  const gapsSentence = (w: TriageWaiting) =>
    t("Needs {gaps} before it can be triaged", { gaps: w.missing.map((g) => GAP_WORD[g]).join(", ") })

  // WHAT THE BUTTON SAYS AND WHETHER IT ASKS FOR A PERSON FIRST — one answer,
  // read off the ticket's own type. The reasoning, the client's ruling and the
  // honest reservation about the word "Plan" are all on `triageAct` at the top
  // of this file; nothing here decides anything.
  const act = triageAct(current?.helpType, t)

  const pickerRow = current && picker && (
    // ORDER-LAST AND FULL-WIDTH, WHICH IS THE WHOLE OF "THE FOOTER MUST NOT
    // MOVE" (client ruling — she chose layout H1 out of eight drawings, and the
    // still footer was the thing she named about it). The kit's decision row is
    // `flex-wrap`, so a `basis-full` child wraps onto a line of its OWN beneath
    // the buttons instead of sitting between them; `order-last` keeps it after
    // Skip, which the kit renders after `decisions` rather than inside it. The
    // buttons therefore do not move a pixel when this opens — they cannot, they
    // are still the whole of line one.
    <div className="order-last basis-full">
      {/* ONE CONTAINER, BOTH PICKERS — CLIENT RULING, 2026-09-06: "the people
          picker sits in the SAME container as the category picker; they must
          read as one pattern."

          IT IS DRAWN HERE, ABOVE THE TERNARY, WHICH IS THE WHOLE FIX. What she
          was looking at was two rows that had grown apart: the type row leads
          with the ticket's current answer and a divider after it, the people
          row leads with nothing, and with no shared frame around them the
          second read as a loose line of chips where the first read as a
          panel. Putting the box inside each branch would have fixed the
          picture and left the fault — two places to change, and the next
          picker on this card is the third. One box, outside the branch, cannot
          differ between them by construction; the branch is now only WHICH
          options are offered.

          A WELL, NOT A STROKE. She said "bordered", and a CSS border is the one
          thing this codebase may not draw (BUILD-A-SCREEN.md §6.1, "no CSS
          border, ever" — separation is a fill or an inset shadow, and the
          dashed spelling of it has been removed twice as a regression;
          `record-picker.tsx`'s header tells that story about the chip beside
          this). The kit's own answer for exactly this shape is chapter 13's
          WELL — "a well holds secondary detail inside a card… same radius, no
          edge, no shadow" — and the queue's card is the card it is inside. So
          the container that says "these two rows are one thing" is a tone step
          off the card rather than a line drawn round it, which is what
          `pulse.tsx`'s `NothingYet` was rewritten into on the same reasoning.
          `Card` also brings R31's radius with it, so there is no shape decision
          to take here at all. */}
      <Card variant="well" className="p-3">
      {picker === "type" ? (
        <RecordPicker
          layout="row"
          ariaLabel={t("Which type is this?")}
          value={current.helpType ?? ""}
          onChange={(v) => void recategorise(current, v)}
          options={typeOptions}
          // THE SUGGESTION SEAM, and it holds the ticket's CURRENT type today.
          // There is deliberately NO model call here and none anywhere behind
          // this row: an automatic suggestion is a separate, costed decision the
          // client has not taken, and a divider is a piece of layout rather than
          // a promise. When one is built it is this prop and nothing else.
          leadValue={current.helpType}
          note={t("Picking one files the ticket straight away. Nothing is sent to the client.")}
          searchPlaceholder={t("Which type is this?")}
          emptyText={t("Your team has no ticket types set up yet.")}
          disabled={busy}
        />
      ) : (
        <RecordPicker
          layout="row"
          ariaLabel={t("Who is picking this up?")}
          value=""
          onChange={(v) => void accept(current, v)}
          options={peopleOptions}
          searchPlaceholder={t("Who is picking this up?")}
          emptyText={t("Nobody on this team can be given work yet.")}
          disabled={busy}
        />
      )}
      </Card>
    </div>
  )

  return (
    <>
      {/* THE FULL TOOLBAR — CLIENT RULING, 2026-09-06, ROUND NINE. This row was
          a search box and a create button; she asked for the same five slots
          every other collection in this app now draws (R53's fixed order:
          search → filters → sort → view → actions).

          `view` IS THE ONE SLOT STILL ABSENT, and that is a decision rather
          than an omission — `ViewSwitch` renders nothing for fewer than two
          views, so a single-body collection is self-exempting (R53 says so
          about this exact prop). The client has said a LIST view is coming;
          the day it does, this slot takes a two-entry config and NOTHING ELSE
          on this row changes, because the search, the two facets and the sort
          are already functions over rows rather than properties of the card
          (see `triageFacets` / `narrowTriage` at the top of this file). That
          is the whole reason they are up there.

          THE ORDER, THE WRAPPERS AND THE CONTROLS ARE THE ROW'S (R53) — this
          call site hands over only what it alone knows: what the collection
          may be ordered by, which way it is pointing, and which facets its own
          rows support. There is no `<SortControl>` in this file to put in the
          wrong slot, which is the change of TYPE that law is. */}
      <ToolbarRow
        // Reached this line only past both genuinely-empty returns above, so
        // the queue always has at least one waiting row here. R50's own
        // question is about the COLLECTION and never about the current search:
        // a queue narrowed to nothing still draws its toolbar, or there would
        // be no way to widen it again (the `narrowed` branch below is that
        // case, and it renders under this row rather than instead of it).
        empty={false}
        search={
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            placeholder={t("Search the triage queue…")}
            className="w-full"
          />
        }
        filters={filterPill}
        toolbarPanel={filterPanel}
        // SORT BY RAISED, one option and a direction — see `TRIAGE_SORTS` for
        // why one option is the answer here rather than a stub, and for the
        // `TOOLBAR_SORT_EXEMPT` entry this replaces.
        sort={{
          options: TRIAGE_SORTS.map((o) => ({ ...o, label: t(o.label) })),
          value: "raised",
          // The FIELD cannot move — there is one — so picking it again is a
          // no-op rather than an unreachable branch. Written as an empty
          // handler with the reason, never omitted: `ToolbarSortSlot` requires
          // it, and a handler that quietly did something else would be worse.
          onValueChange: () => {},
          direction: sortDir,
          onDirectionChange: setSortDir,
        }}
        /* THE VIEW SWITCH, and it can exist now because there are two bodies.
           R53's own sentence is that `view` needs no registry — `ViewSwitch`
           draws nothing below two views, so a single-body collection exempts
           itself. Triage had exactly one until this pass, which is why the slot
           was deliberately absent; adding the list is what earns the control,
           not a decision to show one. */
        view={{
          views: [
            { value: "queue", label: t("Queue"), icon: <Cards className="size-4" /> },
            { value: "list", label: t("List"), icon: <ListBullets className="size-4" /> },
          ],
          value: triageView,
          onValueChange: (v) => setTriageView(v === "list" ? "list" : "queue"),
        }}
        /* UNDO RIDES THE TOOLBAR NOW, TO THE LEFT OF THE CREATE BUTTON —
           client, 2026-09-06: "undo button on top in toolbar, left to +".
           `actions` is the row's own trailing slot and it renders its children
           in order, so a fragment puts Undo first and the `+` last without
           either of them knowing about the other.

           AND IT IS ABSENT WHEN THERE IS NOTHING TO TAKE BACK, which is the
           same message's other half. That is safe HERE in a way it was not in
           the decision row: nothing in the toolbar is a target the hand is
           already travelling towards mid-sitting, so a control that appears
           after the first decision moves nothing that matters. In the decision
           row it would have shifted Accept and Change category under a moving
           hand, which is why it was drawn-and-disabled there for as long as it
           lived there. */
        actions={
          (lastAct || canCreateTicket) && (
            <>
              {lastAct && (
                <Button
                  /* CHARCOAL, NOT A BORDER — client: "undo does need a border
                     (to differentiate from sort, filter, etc)". A border is the
                     one thing a button here may not have: tokens.css states it
                     outright — "Buttons carry NO border in any state — no
                     outline, no hairline, no stroke. A secondary button is a
                     filled button in the other paper tone", and the fill IS the
                     affordance. So the differentiation is a TONE.

                     Why it read flat: its neighbours are not buttons. Filter
                     and sort are pills wearing `shadow-[var(--hairline-strong)]`
                     on the page ground, so they have a crisp edge; Undo was a
                     soft-paper fill on off-beige, a true tone step but a quiet
                     one, and it sat among three sharper things looking like the
                     odd one out rather than the distinct one.

                     `inverse` is the loudest tone that is NOT the brand — chosen
                     when mango was still spoken for by the create button beside
                     it and by Accept on the card (the kit's own §2.5, one brand
                     fill per view). R84, 16 Sep 2026, retired that reasoning:
                     neither neighbour is mango any more, mango lives only in the
                     title now. `inverse` stays anyway, and stays the right
                     choice on its own terms — it also suits what the control
                     does, appearing only after a decision to take that decision
                     back. If it reads too heavy in use, `secondary` is one word
                     away. */
                  variant="inverse"
                  size="sm"
                  disabled={busy}
                  onClick={() => void undo()}
                  className="gap-1"
                >
                  <ArrowCounterClockwise className="size-3.5" />
                  {t("Undo")}
                </Button>
              )}
              {canCreateTicket && <AddButton label={t("Raise ticket")} onClick={onCreate} />}
            </>
          )
        }
      />
      {!current && narrowed && decided.length === 0 ? (
        // The ordinary "nothing matched" case — the toolbar above stays up so it
        // can be cleared or changed, exactly as `narrowed` does everywhere else
        // in the app. Distinct from the kit's `done` register below, which is a
        // sitting somebody FINISHED.
        //
        // THE SENTENCE STOPPED SAYING "your search" ON 2026-09-06, when the
        // filters arrived: three controls can empty this list now, and a
        // reader who had set the App facet and typed nothing would have been
        // told her search matched nothing — a true-sounding sentence pointing
        // at the wrong control, which is the most expensive kind.
        /* R62 — the same register the resting queue draws below, minus the add
           button (there is none here on purpose: "a button here would be the app
           inventing a task"). The sentence is kept rather than defaulted, because
           it names the THREE controls that can empty this list — see the note
           above on why it stopped saying "your search". */
        <CollectionEmptyState
          filtered
          title={t("Nothing waiting.")}
          filteredTitle={t("Nothing in the triage queue matches what you asked for.")}
        />
      ) : triageView === "list" ? (
        /* ══ THE LIST — CLIENT RULING, 2026-09-06, ROUND TEN ══════════════════
           Her whole brief, verbatim: "Now let's build the list view: 1. Title.
           2. Type with the colors, same as we have with the chips. Also include
           the number, the ID. 3. App. 4. Date." — with a screenshot of the kit's
           own List pattern beside it.

           IT IS `TicketRowsTable` NOW, AND THE TABLE ITSELF NO LONGER LIVES
           HERE. It was written inside this branch a few hours earlier; the same
           day, the client asked for the identical table on Open, Closed and All
           ("do the list view exactly the same as we have it in the Triage
           list"), so it was LIFTED OUT rather than copied four more times. Every
           ruling it carried — the column order, the black id chip leading the
           title, the coloured dot, the plain non-sorting headers, the hoverless
           header row, "Raised" rather than "Date" — is kept word for word and
           argued at the cells themselves; see the component's own header.

           WHAT STAYS HERE IS THE ONE THING THAT IS TRIAGE'S: the decision. The
           verb follows the row's own type through the same `triageAct` the card
           uses, so a ticket's fate is one word wherever she meets it — and
           because the word follows the type, the column is not one repeated
           label: it says what kind of decision each line is waiting for before
           she has read anything.

           IT STILL SHARES `inOrder` WITH THE QUEUE, which is the sentence that
           matters most and the one that has survived every redraw: the search,
           the two facets and the sort are functions over rows at the top of this
           file rather than properties of the card (`narrowTriage` /
           `triageFacets` / `TRIAGE_SORTS`), so the queue and the list are one
           question answered twice and cannot disagree about what is in the pile
           or what order it is in. */
        <TicketRowsTable
          rows={inOrder}
          onOpen={onOpen}
          label={t("Triage queue")}
          teamId={teamId}
          decide={{
            // "no header" — client, asked directly, and it is what her own
            // reference screenshot does. The component keeps the column
            // announced to a screen reader either way.
            header: "",
            cell: (w) =>
              canTriage && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy || w.missing.length > 0}
                  title={w.missing.length > 0 ? gapsSentence(w) : undefined}
                  // `stopPropagation` because the row itself opens the ticket.
                  // Without it, deciding would also navigate away from the list
                  // the decision was made in.
                  onClick={(e) => {
                    e.stopPropagation()
                    const a = triageAct(w.helpType, t)
                    if (a.assigns) setRowPicker((r) => (r === w.id ? null : w.id))
                    else void accept(w)
                  }}
                >
                  {triageAct(w.helpType, t).label}
                </Button>
              ),
            // THE PEOPLE ROW, BENEATH ITS OWN ROW — the client picked L3 over a
            // panel and a dialog, knowing it pushes the rows below it down. Only
            // ever under an Issue or a Request, the two verbs that need a
            // person: Accept and Store never open anything, which is why half a
            // list of tickets is pressed straight through. Returning `null` for
            // every other row is what tells the table there is no strip to draw.
            strip: (w) =>
              rowPicker === w.id ? (
                <RecordPicker
                  layout="row"
                  ariaLabel={t("Who is picking this up?")}
                  value=""
                  onChange={(v) => {
                    setRowPicker(null)
                    void accept(w, v)
                  }}
                  options={peopleFor(w.appId)}
                  searchPlaceholder={t("Who is picking this up?")}
                  emptyText={t("Nobody on this team can be given work yet.")}
                  disabled={busy}
                />
              ) : null,
          }}
        />
      ) : (
        <Queue
          /* OPEN AND SKIP, SIDE BY SIDE — client, twice: "open button next to
             skip!!". Being last in `decisions` was not enough and neither was
             `ms-auto` on Open, which is the version she saw the second time.

             The kit draws Skip AFTER `decisions` with an `ms-auto` of its own.
             Two auto margins in one flex row do not stack — they SPLIT the free
             space between them, which I measured at 139.6px of daylight between
             Open and Skip in a 600px row. So Open keeps its `ms-auto` (it
             claims the space and travels to the end) and Skip's is zeroed here,
             leaving it nothing to claim and landing it directly after Open —
             measured at 8px apart, which is the row's own gap and nothing more.

             Spelled as a descendant variant on the Queue rather than fixed
             upstream because Skip's margin is the KIT's decision for its own
             screen, and this app is the caller with a fifth control to place.
             `> *:last-child` is Skip precisely because the kit appends it after
             whatever `decisions` renders. */
          className="[&_[data-slot=queue-decisions]>*:last-child]:ms-0"
          label={t("Triage queue")}
          position={position}
          total={total}
          // SAID AS A WHOLE SENTENCE WITH TWO NAMED HOLES (R28/R33/R34). The
          // kit's own default is `${at} of ${of}`, which is a fragment glued to
          // two values and therefore translated nowhere — and it is a prop
          // precisely so an application can say it in its own catalogue.
          formatCount={(at, of) => t("{position} of {total}", { position: at, total: of })}
          progressLabel={t("How far through the queue you are")}
          done={!current}
          /* THE CLEARED QUEUE — client's pick D1. The count is the
             congratulation, so the words do not have to be: "That's the queue
             cleared" states it once and stops, and the chips underneath say what
             she actually committed herself to.

             NO CELEBRATION FOR AN EMPTY ONE, which is the other half of the same
             ruling and why `empty` below reads flat. Clearing eighteen tickets
             is an achievement; opening Triage and finding nothing waiting is a
             quiet Tuesday, and praising somebody for it is the kind of applause
             that makes software feel like it is performing. The kit already
             separates the two registers and says "done beats empty"; this is
             only the words and the tally for slots that existed.

             THE TALLY RIDES `doneAction`, and that is a stretch of the slot's
             name worth admitting: `CollectionRegister` offers an eyebrow, a body
             and actions, with nowhere for a summary between the sentence and the
             buttons. Passing it here keeps the kit's own register layout rather
             than replacing the whole thing with `doneState` and re-deciding the
             spacing by hand. If a third slot is ever added upstream, this moves
             into it and nothing else changes. */
          doneLabel={t("That's the queue cleared.")}
          doneBody={t("{count} sorted. Nothing else is waiting to be read.", {
            count: decided.length,
          })}
          doneAction={
            <div className="flex flex-col gap-3">
              {sittingTally.byType.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {sittingTally.byType.map(([type, n]) => {
                    const iconName = ticketTypeIconName(type)
                    return (
                      <Badge
                        key={type}
                        variant="secondary"
                        size="pill"
                        icon={
                          iconName ? (
                            <Icon name={iconName} className="text-muted-foreground size-3.5 shrink-0" />
                          ) : undefined
                        }
                      >
                        {t("{count} {type}", { count: n, type })}
                      </Badge>
                    )
                  })}
                  {sittingTally.assignedCount > 0 && (
                    <Badge variant="secondary" size="pill">
                      {t("{count} given to somebody", { count: sittingTally.assignedCount })}
                    </Badge>
                  )}
                </div>
              )}
              {lastAct && (
                <div className="flex">
                  <Button variant="secondary" size="sm" disabled={busy} onClick={() => void undo()} className="gap-1">
                    <ArrowCounterClockwise className="size-3.5" />
                    {t("Undo the last one")}
                  </Button>
                </div>
              )}
            </div>
          }
          upcomingLabel={t("Still waiting")}
          nextLabel={t("next")}
          skipLabel={t("Skip")}
          onSkip={current ? () => skip(current) : undefined}
          upcoming={order.slice(1).map((w) => ({
            id: w.id,
            // THE NUMBER IN FRONT, AS THE CHIP — `QueueUpcoming.label` is a
            // node, so the tail of the queue can carry the same black lozenge
            // the card above it and the table beside it carry, instead of the
            // `T0412 · ` prefix it used to glue in front of the description.
            label: (
              <span className={REF_LEADS_NAME}>
                <RecordRef value={w.ref} />
                <span className="min-w-0 truncate">{richTextPlain(w.description)}</span>
              </span>
            ),
          }))}
          eyebrow={current && <TriageChips teamId={teamId} ticket={current} />}
          /* THE TITLE IS THE WAY IN — client, 2026-09-06: "when clicking in
             title - go to detail screen." It replaces the Open button that used
             to sit among the decisions (see the note below where it was).

             A REAL BUTTON, not a div with an onClick: this is the only route
             off the card now, so it has to be reachable by keyboard and
             announced as a control. `text-start` because the kit sets the title
             at the 24 step and a button would otherwise centre it; the type
             itself is left to `Queue`'s own `title` slot rather than restated
             here, so the heading looks identical whether or not it is
             clickable. */
          title={
            current && (
              <button
                type="button"
                onClick={() => onOpen(current.id)}
                className="cursor-pointer text-start hover:underline"
              >
                {ticketTitle(current)}
              </button>
            )
          }
          decisions={
            current && (
              <>
                {/* THE ONE DECISION THIS SCREEN EXISTS TO MAKE, and it says
                    what it does now (client ruling, 2026-09-06): Accept a
                    question, Assign an issue, Plan a request, Store an extra.
                    The word and the behaviour come from ONE place (`triageAct`)
                    precisely so they cannot come apart — a button that said
                    "Assign" and filed the ticket without asking is worse than
                    the single "Accept" it replaces.

                    IT USED TO BE THE ONE MANGO ON THE CARD, under the kit's own
                    §2.5 ("one brand fill per view") — the picker row below no
                    longer competed for it, which was the other half of the
                    same evening's ruling (record-picker.tsx's own header: the
                    chosen chip is black now, because mango meant "chosen" in
                    two places at once). R84, 16 Sep 2026, retires that whole
                    convention: "only mango buttons on the title level… the
                    others black." A queue card is not the title, so this is
                    the kit's black (`inverse`) now, same as the Undo button
                    below it — no colour is left to disambiguate a card's
                    "main" action from any other, and none is needed: rank on
                    a card was never carried by colour alone.

                    DISABLED WHILE A READINESS GAP STANDS, whichever verb it is
                    wearing: the DOOR refuses the move (shared/triage-
                    readiness.ts rides the model, not the route), so an enabled
                    button here would be a button that fails. */}
                {canTriage && (
                  <Button
                    variant="inverse"
                    size="sm"
                    disabled={busy || current.missing.length > 0}
                    title={current.missing.length > 0 ? gapsSentence(current) : undefined}
                    onClick={() =>
                      act.assigns
                        ? setPicker((p) => (p === "person" ? null : "person"))
                        : void accept(current)
                    }
                    className="gap-1"
                  >
                    <Check className="size-3.5" />
                    {act.label}
                  </Button>
                )}
                {canEdit && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => setPicker((p) => (p === "type" ? null : "type"))}
                    className="gap-1"
                  >
                    <Tag className="size-3.5" />
                    {t("Change category")}
                  </Button>
                )}
                {/* UNDO IS NOT HERE ANY MORE — client, 2026-09-06: "undo button on
                    top in toolbar, left to +", and "if there is nothing to undo,
                    do not have this undo button".

                    Both halves of that are one decision. It was drawn always and
                    disabled most of the time, on the reasoning that a control
                    appearing mid-sitting shifts the ones beside it — true, and
                    the wrong trade here: the decision row is the four moves the
                    sitting exists to make, and a permanently greyed fifth button
                    sitting among them is noise on every single card. In the
                    TOOLBAR it can come and go without moving anything the hand
                    is aiming at, because the toolbar is not where the hand is. */}
                {/* OPEN IS GONE FROM THE SITTING — client, 2026-09-06: "in
                    queue, remove the open button / when clicking in title - go
                    to detail screen."

                    It arrived here that morning ("I want to keep the Open
                    function, but not here, next to Skip") and took two attempts
                    to place, because the kit gives Skip its own `ms-auto` and
                    two `ms-auto` items SPLIT the free space rather than sitting
                    together. All of that is deleted rather than kept as
                    history: the title above is the affordance now, which is
                    where a reader already looks and already expects a record to
                    open, and a button whose job is "leave this card" competing
                    with Skip for the same corner was always one control too
                    many. Skip's own `ms-auto` is unopposed again, so the row
                    reverts to the kit's own arrangement with nothing to fix. */}
              </>
            )
          }
        >
          {current && (
            <>
              {/* HER WORDS ON THE LEFT, WHAT SHE ATTACHED ON THE RIGHT — the
                  client's own layout, and the reason the card stays short. A
                  screenshot stacked UNDER a paragraph pushes the decisions off
                  the bottom of a laptop screen, and the decisions are the
                  point. `sm:` because on a phone there is no second column to
                  have: the two stack, description first. */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                <p className="text-muted-foreground min-w-0 flex-1 text-sm whitespace-pre-line">
                  {richTextPlain(current.description)}
                </p>
                <TriageAttachments
                  attachments={attachmentsQ.data}
                  countLabel={t("What they attached")}
                />
              </div>
              {/* WHOSE IT IS, WHAT IT IS ABOUT, AND WHO ASKED — under the
                  words, not over them (client ruling, 2026-09-06, round nine).
                  THE DATE THAT USED TO BE HERE HAS MOVED UP into the chip line
                  (`TriageChips`), which is the same ruling read the other way:
                  the eyebrow is now the ticket's three FACTS — number, type,
                  date — and everything that is a RECORD is a link down here.
                  See `TriageMeta` for the whole of it. */}
              <TriageMeta teamId={teamId} ticket={current} />
              {/* THE PICKER OPENS ABOVE THE BUTTONS — client, 2026-09-06: "the
                  model to assign or recategorise, open it above the buttons
                  assign / change category."

                  It used to be the last item INSIDE the decision row, which put
                  it between Open and the kit's own Skip and pushed the two ways
                  out of the sitting apart. Here it is the last of the card's
                  CHILDREN, so the kit draws it above the decision row entirely:
                  the buttons never move, the row that opened stays next to the
                  button that opened it, and Open and Skip end up adjacent,
                  which is the other half of the same message. */}
              {pickerRow}
              {/* THE STRIP THAT USED TO SIT HERE IS GONE — client, 2026-09-06:
                  "the text that's now under the date … above the buttons that
                  say Open, Reply and Edit: remove all of this. However, I want
                  to keep the Open function, but not here. I want to have it
                  next to Skip."

                  What went: the readiness sentence naming the ticket's missing
                  fields, the "Fill it in" pencil beside it, Reply, and the
                  icon-only Edit. What stays, moved: Open, now in the sitting's
                  tail beside Skip, where the other ways OUT of the queue live.

                  THE CONSEQUENCE, WRITTEN DOWN RATHER THAN DISCOVERED LATER: an
                  incomplete ticket no longer says on the card that it is
                  incomplete, so it looks exactly like a complete one until you
                  open it. That is the client's call and it is coherent — Open is
                  one press away and the form is where three of the four gaps can
                  be filled anyway — but if she ever wants the warning back, the
                  cheap version is a mark on the chip whose fact is missing,
                  never this paragraph again. */}
            </>
          )}
        </Queue>
      )}
      <HelpFormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        draftKey={`help:triage:${editing?.id ?? "none"}`}
        teamId={teamId}
        helpTypeOptions={helpTypeOptions}
        initial={
          editing
            ? {
                titleEn: editing.titleEn ?? undefined,
                description: editing.description,
                helpType: editing.helpType ?? undefined,
                accountId: editing.accountId ?? undefined,
                appId: editing.appId ?? undefined,
                moduleId: editing.moduleId ?? undefined,
                raisedByContactId: editing.raisedByContactId ?? undefined,
              }
            : undefined
        }
        onSubmit={saveEdit}
        helpId={editing?.id}
        canAttach={canEdit}
      />
      {/* THE REPLY DIALOG IS GONE WITH ITS BUTTON. Removing Reply from the
          card (client, 2026-09-06) left this mounted and unreachable — nothing
          could open it — which is worse than deleting it: a control a person
          cannot reach is indistinguishable from one that is broken. Nothing is
          lost. The ticket's own screen carries a full reply thread of its own
          (`help-detail.tsx`, `onReply`), and Open is one press away in the
          sitting's tail, which is the whole reason she kept it. */}
    </>
  )

  /** Edit the ticket without leaving the queue. The SAME dialog and the SAME
   * door the ticket's own screen uses — triage was the one place in the app that
   * could see a request and not change it, which is what made the readiness rule
   * feel like a wall rather than a step. */
  async function saveEdit(input: {
    titleEn?: string
    description: string
    helpType?: string
    accountId?: string
    appId?: string
    moduleId?: string
    raisedByContactId?: string
  }) {
    if (!editing) return
    absorb(await contentApi.updateHelp({ id: editing.id, ...input }))
    toast.success(t("Ticket updated."))
  }

  /** Answer it without leaving the queue. The same door the ticket's own thread
   * posts through — this is a shorter route to it, not a second one. */
}

/** THE ONE DECISION THAT CAN BE TAKEN BACK, and both of its shapes.
 *
 * A discriminated union rather than a bag of optional fields, because the two
 * undos are two different door calls and nothing about them is shared: putting
 * an Accept back is a status move, putting a recategorisation back is an edit
 * that has to carry the ticket's own words with it (the edit door requires a
 * description and this is the only place the previous one is still known). */
type UndoableTriageAct =
  | { kind: "accept"; id: string }
  /** The recategorisation half carries the PAYLOAD that puts it back, not the
   * ingredients of one. `before` is exactly what `updateHelp` takes, so the undo
   * hands it over whole instead of naming three fields at the call site — the
   * shape `web/test/forms-forward-everything.test.ts` was written to keep, after
   * a hand-built ticket payload silently dropped `moduleId` for a fortnight. */
  | { kind: "type"; before: { id: string; description: string; helpType: string } }
