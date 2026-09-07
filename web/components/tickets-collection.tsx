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
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { SearchInput } from "@shared/ui/components/search-input/search-input"
import { defaultTabsConfig, renderFolderTabs } from "@shared/web/screen-engine/tabs-view"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import { useRemembered } from "@shared/web/remembered"
import { Button } from "@shared/ui/components/button/button"
import { toast } from "@shared/ui/components/sonner/sonner"
import { type ScreenIntent } from "@shared/web/screen-engine/screen-renderer"
import { Badge } from "@shared/ui/components/badge/badge"
import { Card } from "@shared/ui/components/card/card"
import { Queue } from "@shared/ui/components/queue/queue"
/* THE BOARD AND THE SPLIT — the kit's own, vendored, and both adopted in this
   pass (their `KIT_COMPONENT_EXEMPT` lines were deleted by the same commit —
   R46's rot-check refuses an exemption for a part that is reached). Neither is
   drawn app-side: `OpenBoard` and `ReadySplit` below supply rows and a pane. */
import { Kanban, type KanbanColumnDot } from "@shared/ui/components/kanban/kanban"
import { Split } from "@shared/ui/components/split/split"
/* THE LIST VIEW'S TABLE, composed from the kit's own primitives rather than
   drawn through `RecordTable` — the reason is written out at the `triageView
   === "list"` branch below, and it is R16's: `RecordTable` brings
   `CollectionFrame`, which brings a second search box and a second count onto a
   screen that already has one of each. */
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/ui/components/table/table"
import {
  ArrowCounterClockwise,
  Cards,
  Kanban as KanbanGlyph,
  ListBullets,
  Check,
  Paperclip,
  SquareSplitHorizontal,
  Tag,
} from "@shared/ui/foundations/icons"
import { AttachmentPreview, hasPreview } from "@shared/web/attachment-preview"
import { useFilterBar } from "@shared/web/screen-engine/filter-bar"
import type { FilterFacet, SortOption } from "@shared/web/screen-engine/config"

import { RecordRef, REF_LEADS_NAME } from "@shared/web/record-ref"
import { TicketChips, ticketTitle, type TicketChipFacts } from "@shared/web/ticket-chips"
import { CollectionHeading } from "@/components/collection-heading"
import { CountedAbove } from "@/components/counted-tabs"
import { InAppLink } from "@/components/in-app-link"
import { LoadMore } from "@/components/load-more"
import { PagedFind } from "@/components/paged-find"
import { COLLECTION_SORTS, translatedSorts } from "@/lib/collection-sorts"
import { translatedFacets } from "@/lib/collection-filters"
import {
  AddButton,
  CollectionCard,
  EmptyLine,
  ToolbarRow,
  type ToolbarViewSlot,
} from "@/components/deep-link/screen-bits"
import { TriageStrip } from "@/components/triage-strip"
import { TicketsDashboard } from "@/components/tickets-dashboard"
import { CONCEPT_ICON } from "@/lib/pages"
import { tenancy } from "@/lib/api/tenancy"
import { ApiFailure, content as contentApi } from "@/lib/api"
import type { HelpAccountFacet, TriageWaiting } from "@/lib/api/content"
import { AppMark } from "@/components/app-tiles"
import { RecordPicker, Swatch, type PickerOption } from "@/components/record-picker"
import { assignableMembers, staffedOn } from "@/lib/members"
import { orderTicketTypes, ticketTypeColour } from "@/lib/type-colours"
import { HELP_STATUS } from "@/components/deep-link/shape"
import { RecordMark } from "@shared/web/record-mark"
import { helpStatusDotTone, waitingDotTone } from "@shared/status-tones"
import type { DotTone } from "@shared/app-stages"
import type { TriageGap } from "@shared/triage-readiness"
import { staffNameFromSnapshot } from "@shared/staff-name"
import { HelpFormDialog } from "@/components/help-form-dialog"
import {
  accountsKey,
  appsKey,
  helpAttachmentsKey,
  helpByAccountKey,
  helpFacetFilter,
  helpFacetKey,
  helpKey,
  helpTabFacets,
  listFetch,
  OPEN_FACET,
  totalKey,
  triageKey,
  WAITING_FACET,
  type HelpFacet,
} from "@/lib/live-resources"
import { formatCount } from "@shared/web/format-count"
import { formatDate } from "@shared/web/format"
import { primeCache, invalidate,
  mergePage, useCached, useCachedValue } from "@shared/web/store"
import { useLanguage, useT } from "@shared/web/language"
import { OPEN_TAB_STATUSES, ticketTypeKeptForMigration } from "@shared/types"
import type {
  Account,
  AppRow,
  HelpAttachment,
  HelpTicket,
  TeamMember,
} from "@shared/types"
import { richTextPlain } from "@shared/web/rich-text"

/* ══════════════════════════════════════════════════════════════════════════
   THE STRIP, AND THE DEFECT ITS NEW SHAPE EXPOSED — client rulings, 2026-09-06.

   HER WORDS, IN THE ORDER SHE GAVE THEM:
     "the tab order for tickets: 1. dashboard 2. triage 3. open (status, when
      triaged but not solved) 4. closed 5. all"
     "add new tab: waiting (this is when we are waiting sth from the customer)"
     "add another tab: ready / will do split view and list / between triage and
      open"
     "Open → triaged + scheduled + in_progress + waiting"

   SO THE STRIP IS: Dashboard · Triage · Ready · Open · Waiting · Closed · All.
   It is ODD BY LIFECYCLE and RIGHT BY WORKLOAD, which is worth saying out loud
   because the next person to read it will want to "fix" the order: `ready` is a
   LATER stage than the three `open` covers (every story is closed on a Ready
   ticket; an Open one is still being worked), so a taxonomy would put Ready
   after Open. A tab strip is not a taxonomy. Ready and Triage are the two piles
   that need HER personally — one is unread and one is written-but-unsent — and
   they sit together at the front where the work starts. Open, Waiting and
   Closed are the piles that are somebody else's move.

   ── THE DEFECT THIS FIXED ────────────────────────────────────────────────

   `READY` — the token `status:ready` — was LABELLED "Open" until today, with a
   comment saying the token stayed put "because that is the STATUS the door
   stores and renaming it would be a migration for a label". The token was fine.
   The LABEL was wrong, and wrong in the most expensive direction: the tab a
   person read as "Open" showed exactly the tickets that now have a Ready tab of
   their own — finished work waiting to be sent — and showed NONE of the work
   actually under way. Every `triaged`, `scheduled` and `in_progress` ticket in
   the team was reachable only through All. The tab was not empty and not broken,
   so nothing ever said so.

   Both tabs exist now, each labelled what it is, and `OPEN_FACET` names the
   three stages that were unreachable.
   ══════════════════════════════════════════════════════════════════════════ */

/** WORK THAT IS FINISHED AND UNSENT. One status, and the one tab whose whole
 * point is that somebody has to do something about it today.
 *
 * A SUBSET OF OPEN SINCE 2026-09-07 ("in open, include status ready"), which is
 * the same relationship Waiting has always had and needs no code here: the
 * token is unchanged, the door is unchanged, and what moved is what OPEN means
 * (shared/types.ts). Ready keeps its own tab because it is the pile that needs
 * one person TODAY; Open now contains it because it is unfinished work. */
const READY: HelpFacet = "status:ready"
/** WORK UNDER WAY — the stages `OPEN_TAB_STATUSES` names, in one tab, and the
 * reason `helpFacetFilter` grew a set grammar (`web/lib/live-resources.ts`) and
 * the door grew a `status IN (…)` clause (`workers/content/src/lib/help.ts`).
 * Built from that array rather than spelled here, so the tab, its cache key,
 * its query, its badge, the Status facet's options and the board's own columns
 * are one fact written once — which is what let the client's 2026-09-07 ruling
 * ("in open, include status ready") be a single-line edit in `shared/types.ts`
 * with nothing on this screen able to disagree with it. */
const OPEN = OPEN_FACET
/** …AND THE PART OF OPEN THAT IS NOT MOVING. Derived at the door from the
 * ticket's own conversation, never stored — `waitingClause` in
 * workers/content/src/lib/help.ts carries the whole derivation, what was
 * verified about `portal_users`, the ruling on `is_agent` and the known drift.
 *
 * A SUBSET OF OPEN, NOT A SIBLING OF IT, and a reader will meet the same ticket
 * under both tabs. That is the design: Open is "what is under way" and Waiting
 * is "the part of it where the client owes us an answer", so the overlap is the
 * information. Nothing is double-counted, because nothing adds these two badges
 * together — each is its own exact `COUNT(*)` of its own question. */
const WAITING = WAITING_FACET
const CLOSED: HelpFacet = "status:resolved"
const TRIAGE: HelpFacet = "triage"
const ALL: HelpFacet = "all"
/** THE ONE OTHER NON-NARROWING TAB, following Triage's own precedent (the
 * file header, "THE REDESIGN, 2026-08-31"): a different screen wearing the
 * same strip, not a filter of the list. `helpFacetFilter` already returns `{}`
 * for any value it doesn't recognise, so this needs no change there — only
 * the render switch below and the `narrowed` check needed to know about it. */
const DASHBOARD: HelpFacet = "dashboard"

/** A STAGE'S TONE, AS A FILL THE FACET'S SWATCH CAN TAKE.
 *
 * `helpStatusDotTone` (shared/status-tones.ts) answers "which of the kit's six
 * dot tones is this stage" and `Badge` turns that into a Tailwind class of its
 * own (`DOT_FILL`, badge.tsx). The Status facet does not draw a `Badge` — a
 * badge carries the word, and inside a facet option the word is already there —
 * so it needs the same six answers as a CSS colour value, which is the one form
 * `<Swatch>` takes (and the same shape `type-colours.ts` hands back for exactly
 * this reason: one value an inline style, an SVG fill and a chart series can
 * all read).
 *
 * A `Record<DotTone, …>` RATHER THAN AN INTERPOLATED `var(--dot-${tone})`, and
 * that is the whole point of writing it out: a seventh tone added to the kit
 * fails this file's own type check instead of rendering a swatch filled with an
 * undefined custom property, which paints nothing and looks like a missing dot.
 * It is the same argument `status-tones.ts` makes about typing its own map as a
 * `Record<HelpStatus, …>` instead of a function with a fallback.
 *
 * R32-CLEAN: every value is a token the kit defines, never a hex and never a
 * Tailwind ramp. The two greens are genuinely one colour (`--dot-shipped` and
 * `--dot-done` both resolve to the forest — badge.tsx's own note), which is a
 * NAMING split rather than a palette one and is why the closed/finished pair is
 * still distinguishable here only by its word. That is fine and is the house
 * rule rather than a defect: the mark never carries the meaning alone. */
const DOT_TONE_FILL: Record<DotTone, string> = {
  shipped: "var(--dot-shipped)",
  building: "var(--dot-building)",
  review: "var(--dot-review)",
  blocked: "var(--dot-blocked)",
  archived: "var(--dot-archived)",
  done: "var(--dot-done)",
}

/* ══════════════════════════════════════════════════════════════════════════
   THE LIST TOOLBAR'S FILTERS, FOR WHICHEVER TAB IS OPEN.

   ── THE CLIENT'S RULING, 2026-09-07 ──────────────────────────────────────

     "On open, I want, instead of the current filters, client, app, type, and
      status. On waiting, client, app, and type. On closed client app type. On
      all client app type status. On triage client up and type."

   Triage is the queue and has its own vocabulary two functions down
   (`triageFacets`); this is the five paged tabs, and it holds NO LIST OF THEM.
   WHICH facets a tab may ask is `helpTabFacets`' rule
   (web/lib/live-resources.ts), computed from the tab TOKEN — a facet is offered
   only where the tab spans more than one value of its field, and a DERIVED tab
   (Waiting, whose status clause is scaffolding borrowed from Open so its
   predicate has a pile to run over) offers no Status. The whole ruling and the
   reasoning behind it are written out there. Read it before changing anything
   here.

   ── A FUNCTION, AND NOT AN EXPRESSION INSIDE THE COMPONENT ────────────────

   It was written inline first and moved out for the reason `triageFacets` gives
   for living up here rather than inside the card it draws: a facet vocabulary
   that lives inside the thing it decorates cannot be checked, and cannot be
   shared by a second body over the same collection. Both apply. The rule this
   applies is the one thing on this screen that MUST NOT be got wrong quietly —
   an over-offered facet looks exactly like a correctly-offered one — so
   `web/test/tab-facets.test.tsx` drives this function directly over every token
   on the strip, which it could not do while this was six statements in the
   middle of a render.

   It also keeps the `<PagedFind>` tag short: `facets-ask-the-door`
   (web/test/rules.test.ts) reads a fixed window after that tag, and four option
   lists spelled out inside it would push the `...query` the same census has to
   see out the far end.

   ── A FACET A TAB MAY NOT ASK IS HANDED AN EMPTY OPTION LIST ──────────────

   …which is the one mechanism rather than a second `if` per facet:
   `translatedFacets` already drops a facet whose options came back empty — the
   rule it has always applied to a row-backed facet on a screen holding no rows
   — so "this tab does not offer Status" and "there is nothing to offer" take
   the identical, already-tested path. Nothing here re-implements the
   subtraction. `view` (Archived) is not one of the four and is not touched: it
   comes straight off `COLLECTION_FILTERS.help` as the closed vocabulary it has
   always been, on every tab.
   ══════════════════════════════════════════════════════════════════════════ */
export function ticketFacets({
  facet,
  t,
  clients,
  accounts,
  apps,
  helpTypeOptions,
}: {
  /** the tab token the strip is on — the ONLY thing that decides which of the
   * four may be asked */
  facet: HelpFacet
  t: (english: string) => string
  /** THE DOOR'S OWN PER-CLIENT TALLY over the whole collection, never the
   * accounts cache — see the call site for the R14 reasoning in full. */
  clients: HelpAccountFacet[]
  /** the accounts we happen to hold, by id. A FACE lookup and nothing else. */
  accounts: Map<string, Account>
  /** the team's own systems — a BOUNDED read, so this list is the answer */
  apps: AppRow[]
  /** the team's live `Ticket type` values */
  helpTypeOptions: string[]
}): FilterFacet[] {
  const tabFacets = helpTabFacets(facet)
  return translatedFacets("help", t, {
    // CLIENT — the door's own whole-collection tally. The block beside
    // `byAccount` at the call site below carries the R14 reasoning for why this
    // is not the accounts cache. The face comes from the accounts page when
    // this client happens to be on it, and from the name's own initial when it
    // does not; `A client` is the fallback WORD for a row whose account has
    // somehow lost its name, the same shape the app uses everywhere it draws a
    // client it cannot name.
    accountId: tabFacets.accountId
      ? clients
          .map((a) => {
            const known = accounts.get(a.accountId)
            const label = a.accountName ?? t("A client")
            return {
              value: a.accountId,
              label,
              mark: (
                <RecordMark
                  picture={known?.logoUrl ?? null}
                  name={label}
                  size="choice"
                  fit={known?.accountType === "individual" ? "cover" : "contain"}
                />
              ),
            }
          })
          .sort((a, b) => a.label.localeCompare(b.label))
      : [],
    // APP — the bounded apps list, each option wearing the app's own `AppMark`
    // (the client, 2026-09-06: "on filter app i wanna see the icon of the app").
    // `choice` is the dense mark size the picker's own option rows use, which is
    // exactly this context.
    appId: tabFacets.appId
      ? apps
          .map((a) => ({ value: a.id, label: a.name, mark: <AppMark app={a} size="choice" /> }))
          .sort((a, b) => a.label.localeCompare(b.label))
      : [],
    // TYPE — the TEAM'S OWN `Ticket type` words, in the client's fixed reading
    // order (`orderTicketTypes`: issue, question, request, extra, then anything
    // this order has never heard of, in the order it arrived). Each wears the
    // colour ruled for it, through the same `Swatch` + `ticketTypeColour` pair
    // the rows, the chips and the triage picker draw — so the dot a person
    // filters by and the dot they read back are one object.
    //
    // THE WORDS ARE NOT TRANSLATED and the field's label is: `helpType` is a
    // dropdown value a team typed itself, so it is DATA rather than copy, and
    // `t()` would be looking a sentence up that is not in the catalogue (R28's
    // own distinction; `triageFacets` below says the same about the same list).
    //
    // AND THE RETIRED KIND IS SUBTRACTED AGAIN HERE. `helpTypeOptions` already
    // excludes it (use-screen-data.ts), the door already refuses to answer about
    // it and already refuses to create one — this is the fourth fence and it is
    // deliberate, exactly as `help-detail.tsx`'s own type picker filters a list
    // that was already filtered. The cost is one call; the failure it prevents
    // is a filter offering a word whose rows the door has excluded from both the
    // list AND its count, which reads as an empty collection rather than as an
    // impossible question.
    helpType: tabFacets.helpType
      ? orderTicketTypes(helpTypeOptions)
          .filter((v) => !ticketTypeKeptForMigration(v))
          .map((v) => ({ value: v, label: v, mark: <Swatch colour={ticketTypeColour(v)} /> }))
      : [],
    // STATUS — the CLOSED, server-owned vocabulary, sliced to exactly what this
    // tab can contain, and never taken off the page. `helpTabFacets` hands back
    // the words themselves for that reason: on Open it is the three stages
    // `OPEN_TAB_STATUSES` names and nothing else, so "Resolved" — a stage that
    // tab cannot hold — is not offered, and on All it is all seven.
    //
    // THE WORDS ARE THE AGENCY'S OWN (`HELP_STATUS`, deep-link/shape.tsx), which
    // is where every other agency-side rendering of a ticket's stage takes them
    // from. NOT the portal's `STATUS_WORDS` ("With us", "Almost there"): those
    // are the CLIENT's words for the same seven stages and R21's account fence
    // is the reason the two files never import each other. Reusing the agency's
    // map also means this control adds no new English sentence to translate —
    // all seven are already catalogued and answered in all three languages.
    //
    // THE MARK IS THE STAGE'S OWN TONE, through `helpStatusDotTone`
    // (shared/status-tones.ts) — the same six-tone vocabulary the ticket's own
    // status chip is filled from, so the dot in this menu and the dot on the
    // record are one ruling. Drawn with the same `<Swatch>` the Type facet uses
    // rather than a `<Badge>`: a badge would put a second copy of the word
    // inside the option beside the option's own label.
    status: tabFacets.statuses.map((s) => ({
      value: s,
      label: t(HELP_STATUS[s]),
      mark: <Swatch colour={DOT_TONE_FILL[helpStatusDotTone(s)]} />,
    })),
  })
}

/* ══════════════════════════════════════════════════════════════════════════
   THE TRIAGE QUEUE'S OWN VOCABULARY — the four things a person can ask of the
   pile, written HERE rather than inside `TriageQueue` for one stated reason.

   THE CLIENT HAS SAID A LIST VIEW IS COMING ("a list view will be added
   later"). A queue and a list are two BODIES over one collection asking the
   same four questions — what does it say, what kind is it, which system is it
   about, and in what order do I read it — and the moment those questions live
   inside the component that draws the CARD, the list gets its own copy of them
   and the two drift. That is not a hypothetical here: it is precisely what
   R53's own history is a record of (eleven toolbars, eight of them putting the
   same control in the wrong slot, because nothing shared the answer).

   So the NARROWING and the FACET VOCABULARY are functions over rows, the SORT
   is a table, and `TriageQueue` below is one consumer of them. A list view is a
   second consumer and changes none of this — which is the whole test of whether
   these belong here.
   ══════════════════════════════════════════════════════════════════════════ */

/** WHAT ORDER THE PILE IS READ IN (R53's `sort` slot, client ruling 2026-09-06:
 * the queue's toolbar gets "sort by raised").
 *
 * ONE OPTION, AND THAT IS THE ANSWER RATHER THAN A STUB. `ToolbarSortSlot`'s own
 * doc says so — "a single-option control is legitimate and common here: the
 * FIELD is fixed and the DIRECTION is the live question" — and on this
 * collection it is the only honest menu there is. The rows are what has been
 * sitting unread; the one fact every one of them has, and the one this screen
 * exists to be about, is how long it has been sitting. There is no `title` to
 * order by (most of these tickets have none — `ticketTitle` falls back to the
 * first line of the body), no rank, and no status (they are all `new`, which is
 * what put them in this list).
 *
 * THIS REPLACES AN EXEMPTION RATHER THAN SITTING BESIDE ONE. `TriageQueue` was
 * in `TOOLBAR_SORT_EXEMPT` until today, with the reason "a queue, and reordering
 * it is the one thing a queue is not — the rows are what has been sitting unread
 * longest first, which is the whole claim the screen makes." That argument was
 * right about a FREE reorder and is not right about this control: the field is
 * pinned to `raised`, so the only thing the reader can do is read the same pile
 * from the other end. Oldest-first is still where it lands (`defaultDir: "asc"`),
 * and that is still the claim the screen makes. The exemption is deleted in the
 * same commit, because a pin whose sentence has stopped being true is worse than
 * no pin at all (R53's rot check enforces exactly that).
 *
 * THE LABEL IS THE CLIENT'S OWN WORD. `collection-sorts.ts` asks for labels that
 * say what the ORDER is rather than naming a column ("Newest first", never
 * "created_at desc") — a rule about MENUS, where a bare column name leaves the
 * reader guessing which way it points. A one-option control has an arrow beside
 * it saying exactly that, and the card below already says "raised 10 June 2025"
 * in the same word, so "Raised" names the thing both halves of the screen call
 * it rather than inventing a second phrase for one field. */
const TRIAGE_SORTS: SortOption[] = [{ value: "raised", label: "Raised", defaultDir: "asc" }]

/** WHAT THE TOOLBAR MAY NARROW BY, derived from the rows themselves.
 *
 * BY CLIENT, BY APP AND BY TYPE — client ruling, 2026-09-07: "On triage client
 * up and type" ("up" is "app"; she was typing fast). CLIENT IS NEW HERE and it
 * REVERSES an argument written one day earlier, which is worth leaving on the
 * record rather than quietly deleting: this function used to say client was
 * deliberately left out because "the pile is small … and a third select on a
 * row that also carries a search box, a sort chip and a create button is a
 * toolbar that wraps on a laptop before it has been asked anything". That was a
 * guess about her screen dressed as a design principle, and she has now said
 * what she wants on hers. The wrapping worry was also answered by a change
 * nobody made for this reason: the facets live in the filter PANEL, a second
 * row that opens under the whole toolbar (filter-bar.tsx, client ruling
 * 2026-09-02), so a third select does not lengthen the track at all.
 *
 * AND NO STATUS, which is the same rule the list tabs are held to and not a
 * separate decision: every row in this queue is `status = 'new'` — that is what
 * put it in the queue (`needsTriage`, workers/content/src/lib/triage.ts) — so a
 * Status facet here would offer exactly one word. See `helpTabFacets`
 * (web/lib/live-resources.ts) for the ruling written out in full.
 *
 * THE OPTIONS COME OFF THE ROWS, AND HERE THAT IS THE WHOLE COLLECTION. The
 * same derivation would be wrong on the list below — it PAGES, so page one's
 * clients are not the team's clients — and it is right here because the triage
 * door is a BOUNDED read that hands back the entire queue in one answer (no
 * cursor, no `hasMore`). The rows in hand ARE the collection, so a menu built
 * from them can neither truncate nor go stale against the pile it narrows.
 *
 * DERIVED FROM THE WHOLE COLLECTION, NEVER FROM WHAT IS ALREADY NARROWED, which
 * is the rule `filter-bar.tsx` states about its own defaults and `apps-screen`
 * repeats at its call site: options taken off the filtered set VANISH as you
 * filter, so picking "Issue" would empty the App menu and there would be no way
 * back except clearing. Handed `rows` — the door's whole answer — for that
 * reason, and it is the caller's job to keep passing the unnarrowed list.
 *
 * THE APP'S LABEL IS THE ROW'S OWN `appName` (R35, and the reason the triage
 * door was widened today): resolving `appId` against the apps cache this screen
 * happens to hold would have been the page-one bug in a dropdown — a facet that
 * quietly says "A client" for every app past the window. The name rides the row
 * now, so the words in this menu and the words on the card are one answer.
 *
 * A FACET WITH NOTHING TO OFFER IS NOT DRAWN, the same subtraction
 * `translatedFacets` makes for the paged screens: a select whose only content is
 * its own placeholder is a control that cannot do anything, and `useFilterBar`
 * counts it toward the pill's number all the same. */
/* THE FACETS WEAR THE SAME MARKS THE RECORDS DO — client, 2026-09-06: "in
   filter type i want to see the colored dot / on filter app i wanna see the
   icon of the app."

   `FacetOption.mark` is a NODE the caller draws, not a colour or an icon name,
   for the same reason `ticket-chips.tsx` takes its dot and its link as props:
   the facet machinery lives in `shared/web/`, which both front doors read, and
   `ticketTypeColour` / `AppMark` are `web/`-only. The kit needed no change —
   its own facet control already types a label as a node.

   THE MARK NEVER CARRIES THE MEANING. It rides beside the word and is hidden
   from assistive tech; the word stays the whole accessible name, and search
   still matches the word. Two people who both see "no dot" is a design that has
   already failed for one of them.

   `apps` arrives as the full rows rather than the names the tickets carry,
   because a mark is drawn from the app's own stage and logo — a ticket row
   knows an `appId` and a name and nothing that could be drawn. */
export function triageFacets(
  rows: TriageWaiting[],
  t: (english: string) => string,
  apps: AppRow[]
): FilterFacet[] {
  /* THE KINDS IN THE PILE, IN THE CLIENT'S OWN FIXED ORDER — issue, question,
     request, extra, then any word that order has never heard of, in the order
     it arrived (`orderTicketTypes`, web/lib/type-colours.ts, where the ruling
     lives beside the colours it is keyed the same way as). It sorted
     alphabetically until 2026-09-07, which put Extra first and was invisible
     while this was the only Type menu on the screen; the list tabs' toolbar has
     one now, and two Type menus in two different orders on one screen is the
     kind of drift the client has twice told us to stop.
     AND THE RETIRED KIND IS SUBTRACTED, though it cannot be here: `needsTriage`
     already excludes it at the door, so this is a second fence over an empty
     set. It is written anyway because the test that proves this menu never
     offers that word should be able to prove it of THIS function rather than of
     a door two workers away — and because the day somebody widens the triage
     door, the fence is already standing. */
  const types = orderTicketTypes([
    ...new Set(rows.map((w) => w.helpType).filter((v): v is string => Boolean(v))),
  ])
    .filter((v) => !ticketTypeKeptForMigration(v))
    .map((v) => ({ value: v, label: v, mark: <Swatch colour={ticketTypeColour(v)} /> }))
  // BY ID, LABELLED BY NAME. A Map rather than a Set of ids plus a second
  // lookup: one pass, and an app whose rows disagree about its name (they
  // cannot — the name comes from one subselect) would still produce one option.
  const appsSeen = new Map<string, string>()
  for (const w of rows) if (w.appId) appsSeen.set(w.appId, w.appName ?? t("An app"))
  const appRows = new Map(apps.map((a) => [a.id, a]))
  const appOptions = [...appsSeen]
    .map(([value, label]) => {
      const row = appRows.get(value)
      // `choice` is the dense mark size — the one `record-picker` draws in its
      // own option rows, which is exactly this context. An app the ticket names
      // but the apps list does not hold (archived, or not yet arrived) keeps its
      // word and simply has no mark, rather than the option vanishing.
      return { value, label, mark: row ? <AppMark app={row} size="choice" /> : undefined }
    })
    .sort((a, b) => a.label.localeCompare(b.label))
  /* THE CLIENT, WEARING ITS OWN FACE — and every fact it needs is already ON
     THE ROW. `needsTriage` resolves `accountName` and `accountLogo` at the door
     for precisely this reason (its own note, and R35's): `accounts` PAGES, so a
     menu that looked a client up in the accounts cache this screen holds would
     have gone blank on the fifty-first client. The list tab below has the same
     problem and solves it differently, because it has a different answer
     available (the door's grouped tally) — here the row already carries the
     name, so nothing has to be resolved at all.
     A Map by id for the same reason the apps one is: one pass, and one option
     per client however many of its tickets are in the pile.
     THE SHAPE IS A SQUARE with the logo contained, which is what a CLIENT wears
     everywhere in this app (`shape.tsx`'s accounts list carries the ruling: one
     list, one column, and two shapes in it read as two kinds of record). The
     crop a sole trader's photograph needs is not available here — the triage
     row carries a name and a logo and not the account TYPE — so the contain is
     unconditional, which letterboxes a face rather than cropping one. That is
     the safe direction of the two: a whole picture in the wrong box beats a
     cropped one, and the WORD beside it is the name either way. */
  const accountsSeen = new Map<string, { label: string; logo: string | null }>()
  for (const w of rows)
    if (w.accountId)
      accountsSeen.set(w.accountId, { label: w.accountName ?? t("A client"), logo: w.accountLogo })
  const accountOptions = [...accountsSeen]
    .map(([value, { label, logo }]) => ({
      value,
      label,
      mark: <RecordMark picture={logo} name={label} size="choice" />,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
  return [
    // HER ORDER, and the same order the list tabs' toolbar reads in
    // (`COLLECTION_FILTERS.help`): client, app, type. One screen, one reading
    // order, whichever tab a person is standing on.
    { field: "accountId", label: t("Client"), control: "select" as const, options: accountOptions },
    { field: "appId", label: t("App"), control: "select" as const, options: appOptions },
    // The TEAM'S OWN WORDS, unwrapped — `helpType` is a `Ticket type` dropdown
    // value a team typed itself, so it is data rather than copy and `t()` would
    // be looking up a sentence that is not in the catalogue (R28's own
    // distinction; the tab strip above passes these same words as labels for
    // exactly this reason). The FIELD's label is copy and is translated.
    { field: "helpType", label: t("Type"), control: "select" as const, options: types },
  ].filter((f) => f.options.length > 0)
}

/** THE PILE, NARROWED — the search box and the two facets, in one function so a
 * list view cannot answer the same question differently from the card.
 *
 * SEARCH LOOKS AT THE REFERENCE AND THE WORDS, which are the two facts a person
 * has to hand when they come looking for a specific ticket ("where did 1513
 * go?", "the one about the invoice export"). Not the client's name and not the
 * app's: those are what the FACETS are for, and a search box that also matched
 * them would make the facets look broken (typing an app's name would return
 * rows the App filter would not).
 *
 * EVERY NARROWING IS AND-ed, and each one is skipped when it was not asked —
 * an unset facet contributes nothing rather than matching `undefined`, which is
 * the difference between "no filter" and "rows whose app is missing". */
function narrowTriage(
  // NOT CALLED `rows`, and that is a real constraint rather than taste. R14's
  // search census (`web/test/paged-search.test.ts`) binds on the shape every
  // find-bar screen writes — `const rows = found.active ? found.rows` — and
  // then fails the build on any `.filter(` on THAT NAME anywhere in the same
  // FILE (whitespace and line breaks included), because a screen that
  // re-narrows the door's own answer under the door's own exact count is R16's
  // exact defect. The census is file-wide because the rows travel: this
  // function's caller could hand a paged list to a helper and the helper would
  // be doing the narrowing. This file holds such a screen (the ticket list
  // above), so the name is spoken for; `waiting` is what the triage door calls
  // this list anyway — and this list is a BOUNDED read, which is what makes
  // narrowing it here honest (see the note inside).
  waiting: TriageWaiting[],
  ask: { query: string; accountId?: string; helpType?: string; appId?: string }
): TriageWaiting[] {
  const q = ask.query.trim().toLowerCase()
  return waiting.filter((w) => {
    if (q && !(w.ref ?? "").toLowerCase().includes(q) && !richTextPlain(w.description).toLowerCase().includes(q))
      return false
    // NARROWED IN THE BROWSER, AND THAT IS HONEST HERE AND NOWHERE ELSE ON THIS
    // SCREEN. The triage door is a BOUNDED read — the whole queue arrives in
    // one answer, with no cursor — so filtering it filters the collection
    // rather than a page of it, and the count above it (`matching.length`) is a
    // count of the same thing. The list tabs below page, so every one of their
    // facets is a DOOR parameter instead; the difference is not a style, it is
    // whether the number and the rows are answering one question (R16).
    if (ask.accountId && w.accountId !== ask.accountId) return false
    if (ask.helpType && w.helpType !== ask.helpType) return false
    if (ask.appId && w.appId !== ask.appId) return false
    return true
  })
}

/** WHAT THE PRIMARY BUTTON SAYS, AND WHETHER IT ASKS FOR A PERSON FIRST — the
 * client's ruling of 2026-09-06, round nine, in one place.
 *
 * ── THE RULING, VERBATIM WHERE IT MATTERS ──────────────────────────────────
 *
 * The button used to say "Accept" on all four kinds, and opened the people row
 * on an Issue only. Two things were wrong with that and she named both.
 *
 * FIRST, the missing capability: "I'm missing the functionality when I accept a
 * request that I assign it." A REQUEST is work somebody has to pick up, exactly
 * as an Issue is; the queue was accepting it and leaving it belonging to
 * nobody. So Request now takes the identical path as Issue — the people row
 * opens, and choosing somebody puts them on the ticket and marks it triaged in
 * one motion (`accept(w, assignTo)`). The BEHAVIOUR of those two is now the
 * same code, not two branches that happen to agree.
 *
 * SECOND, the word: one verb for four different acts told the reader nothing
 * about what was about to happen. So each kind says what it does —
 *
 *   Question → "Accept"  files it to its tab; nobody is assigned, because a
 *                        question is answered later by whoever is free.
 *   Issue    → "Assign"  opens the people row. Somebody has to pick it up.
 *   Request  → "Plan"    opens the people row. Same act as Issue.
 *   Extra    → "Store"   put away for later. Nobody assigned, and — this is the
 *                        client's own scope line for this pass — an Extra does
 *                        NOTHING to the client in this version: no validation
 *                        request, no portal state, no mail. It is `accept`,
 *                        unchanged, exactly as Question is.
 *
 * "PLAN" IS HER PICK OUT OF A LIST OF ALTERNATIVES and it is shipped as ruled.
 * It is the one word here that names a different act from the one the button
 * performs: Assign and Plan run the same handler and open the same people row,
 * so a reader who takes "Plan" to mean scheduling — a date, a sprint, an order
 * of work — will be handed a list of colleagues instead. Flagged rather than
 * quietly substituted; the client chose the word off a list and the word is
 * hers to change.
 *
 * ── MATCHED ON THE WORD, WHICH IS THE ONLY THING THERE IS TO MATCH ─────────
 *
 * `Ticket type` is the team's own editable vocabulary (the Dropdown values
 * screen), so there is no enum and no id here — only the word somebody typed.
 * Lower-cased with a trailing "s" forgiven, which is the technique
 * `isScopedTicketType` (shared/types.ts) already uses on this very
 * field and for this very reason: a rule that hard-matched the seeded spelling
 * would stop firing the day somebody typed "Issues".
 *
 * ANYTHING ELSE FALLS BACK TO "Accept" AND ASKS FOR NOBODY, which covers the
 * retiring "Requirements" and "General", a word a team typed itself, and a
 * ticket with no type at all. The same shape `type-colours.ts` keeps for the
 * same vocabulary: the four the client named are answered, and the fifth word
 * gets the neutral rather than being special-cased or refused. */
function triageAct(
  helpType: string | null | undefined,
  t: (english: string) => string
): { label: string; assigns: boolean } {
  switch ((helpType ?? "").trim().toLowerCase().replace(/s$/, "")) {
    case "issue":
      return { label: t("Assign"), assigns: true }
    case "request":
      return { label: t("Plan"), assigns: true }
    case "extra":
      return { label: t("Store"), assigns: false }
    default:
      return { label: t("Accept"), assigns: false }
  }
}

/* THE RECIPE, THE RIGHTS AND `onAction` ARE GONE FROM THIS SIGNATURE (2026-09-06),
   and that is a real subtraction rather than tidying, so it is written down.

   This screen used to draw its rows through the engine — `shapeHelpList` into
   `withDataDrivenCollection` into `<ScreenRenderer>` — which is why the host
   handed over `tickets.list`, the caller's rights and the engine's action
   dispatcher. The client has now ruled that every row tab draws the TABLE the
   triage list draws ("do the list view exactly the same as we have it in the
   Triage list"), so the renderer has no body left to render here, and three
   props whose only consumer was that renderer were being passed for nothing.

   NOTHING WAS DECIDED BY THEM THAT IS NOT DECIDED NOW. `ticketsListRecipe`
   (web/lib/screens.ts) carries `actions: []` — there has never been a row action
   on this collection for `onAction` to dispatch — and the gate it declares
   (`help:read`) is the same gate the DOOR applies to every read this screen
   makes. The recipe itself stays exactly where it is: it is still the ticket
   collection's declaration, still what R14's paging census and R48's toolbar
   census read, and still what the deep-link host resolves when a ticket is
   opened. It is simply no longer this screen's list renderer.

   WHAT THE ENGINE DID DRAW AND SOMETHING ELSE HAD TO PICK UP: the zero state's
   sentence and its create button. Both are handled at the branch below, and the
   comment there says how. */
export function TicketsCollection({
  teamId,
  helpTypeOptions,
  totals,
  can,
  onCreate,
  onIntent,
}: {
  teamId: string
  /** the team's live `Ticket type` values — the tab strip is built from these */
  helpTypeOptions: string[]
  totals: { help?: number }
  can: (module: string, right: "read" | "create" | "edit" | "delete") => boolean
  onCreate: () => void
  onIntent: (intent: ScreenIntent) => void
}) {
  // STILL `useT` AND NOT `useLanguage`, which is worth a line because it was
  // nearly changed: every date on this screen is drawn by a component that reads
  // the reader's language for itself (`TicketRowsTable`, `ReadySplit`,
  // `TriageChips`), so the host needs the dictionary and never the locale.
  const t = useT()
  // Which type of ticket she was looking at, remembered with the rest of the
  // screen — the sub-tab is as much "where she was" as the search box under it.
  /* THE DEFAULT TAB IS THE FIRST TAB, NOT A NAMED ONE — client, 2026-09-06:
     "by default, each time I load the page, if there's no selected tab in
     memory, the tab that is loaded is the one to the left. I'm saying this
     because now every time I refresh the ticket, I go to All, but actually I
     should go to Triage."

     It said `ALL`, written when All WAS the first tab. Triage moved to the
     front earlier today and the default stayed where it was, so a refresh
     landed two tabs away from the one she had just asked to lead.

     `TRIAGE` IS SPELLED HERE BUT THE RULE IS POSITIONAL, and the two must not
     drift again: the strip below is a literal array and its first entry is
     Triage, so this constant and that position are one fact written twice.
     Deriving it from the array is not available — the strip is built further
     down this component, out of data this line runs before — so the array's
     own comment now carries the other half of the pair. If the order changes
     again, this line changes with it, and the test that would have caught it
     is worth more than the comment: filed as a follow-up rather than pretended
     to be solved here. */
  const [facet, setFacet] = useRemembered<HelpFacet>("ticket-facet", DASHBOARD)
  /* WHICH BODY EACH OF THE TWO MULTI-VIEW TABS IS SHOWING.
   *
   * TWO PIECES OF STATE, NOT ONE KEYED BY TAB, and that is `useRemembered`'s own
   * contract rather than a style choice: it reads its slot ONCE, at mount ("the
   * host owns the address; while this screen is up, the screen owns the value"),
   * so a key built out of `facet` would be read for whichever tab happened to be
   * open on the first render and never again. Two hooks, both unconditional,
   * both remembered under their own name.
   *
   * REMEMBERED RATHER THAN PLAIN STATE, which is `ViewSwitch`'s own rule: a view
   * is a PERSON'S preference, per person and never in a store a colleague
   * shares. Scoped per tab so choosing the board on Open does not decide
   * anything on Ready — they are two different questions about two different
   * piles.
   *
   * THE FIVE OTHER ROW TABS HOLD NO STATE AT ALL. They have one body, so there
   * is nothing to remember; `viewSlot` hands the kit a single view and the kit
   * draws its name. */
  const [openView, setOpenView] = useRemembered<"list" | "board">("ticket-open-view", "list")
  const [readyView, setReadyView] = useRemembered<"list" | "split">("ticket-ready-view", "list")
  // TRIAGE'S OWN SEARCH lives INSIDE `TriageQueue` now (R50): the toolbar
  // above it has to answer "is the queue empty" to know whether to draw
  // itself at all, and only `TriageQueue` — which fetches the queue — ever
  // knows that. See its own header comment.

  /* THE TEAM'S OWN GLYPH PER TICKET KIND IS GONE FROM THIS SCREEN — client
     ruling, 2026-09-07, over a screenshot of the Type column: *"for type, kill
     the emojis. this is legacy. in current system we use colors"*.
     THE STORED VALUES ARE UNTOUCHED. A `mark` still sits on every `Ticket type`
     row in `selectable_data`, a team can still edit it on the Dropdown values
     screen, and every other record kind still draws its own (`MARK_GROUP.story`
     and `MARK_GROUP.sprint` — stories, sprints and their panels). This is a
     DISPLAY ruling about one record type, so nothing was migrated and nothing
     was deleted; what was removed is the READ. `MARK_GROUP.ticket` is gone from
     `web/lib/type-marks.ts` with it, which is what makes this structural rather
     than a habit: there is no longer a group name a future screen could look a
     ticket's glyph up under, so the ruling cannot be undone by somebody
     re-adding one call.
     WHAT CARRIES THE KIND NOW is the colour, and it always did — `Swatch` +
     `ticketTypeColour` (web/lib/type-colours.ts) on the row's pill, the chip
     line, the picker option and the Type facet, one map so a kind's colour
     cannot be decided twice. Her own earlier sentence for the same cell: "Type
     with the colors, same as we have with the chips."
     THE WHOLE `selectable:` READ WENT WITH IT rather than being left standing:
     the vocabulary was fetched on this screen for the glyphs and for nothing
     else, so keeping it would be a door call per visit feeding nothing. The
     type WORDS the toolbar and the create dialog need arrive as
     `helpTypeOptions` from the host, as they always have. */
  /* ── WHERE THE TOOLBAR'S FOUR FACETS GET THEIR OPTIONS ────────────────────
     Client, App, Type, Status — the client's own four, 2026-09-07. WHICH tabs
     may ask each of them is `helpTabFacets`' rule (web/lib/live-resources.ts,
     where it is written out in full); this block is the other half of the
     question, and it is a separate decision per facet because each one has a
     different trap.

     THE TRAP IS ALWAYS THE SAME SHAPE AND IT IS R14/R16's: this list PAGES, so
     an option list derived from the rows in hand describes the newest fifty
     tickets under a count describing all of them. Page one's clients are not
     the team's clients. Every facet below therefore has to say where its whole
     answer comes from, and none of them may be "the rows on screen".

     APPS — BOUNDED, so the list IS the answer. `listFetch.apps` primes an exact
     total and parks no cursor: a team's own systems are a collection that grows
     at the speed of contracts, not of use, and it is not in
     `GROWING_COLLECTIONS`. Read unconditionally the way Processes' own `appId`
     facet reads the identical key (processes-screen.tsx), because narrowing by
     app is a READ act anyone who can open this screen may perform. Shared cache
     key, so `TriageQueue` below and this toolbar are one fetch.

     CLIENTS — GROWING, and this is the facet that was WRONG until today. It
     read `tenancy.accounts()`, which is page ONE of a `GROWING_COLLECTIONS`
     list, with a comment admitting it ("filed as a known gap"). It is not a gap
     any more and it did not need a searched facet control to fix: the DOOR
     already answers this exact question. `countTicketFacets`
     (workers/content/src/lib/help.ts) groups the WHOLE ticket collection by
     client on every ticket read — one row per client, with the client's own
     name resolved server-side — and `listFetch.help`/`helpFacet` have primed it
     into `helpByAccountKey` since 28 Aug 2026 with nothing reading it. So the
     Client menu is now the door's own grouped tally, which is the whole
     collection by construction and cannot truncate.

     THREE PROPERTIES OF THAT TALLY WORTH SAYING OUT LOUD, because each one
     could otherwise read as a bug later:
       · IT IS THE SAME LIST ON EVERY TAB. `countTicketFacets` deliberately
         counts with the kind and stage facets turned OFF, so opening Closed
         does not shrink the Client menu to the clients with closed tickets.
       · IT DOES NOT NARROW AS YOU FILTER, which is the rule `filter-bar.tsx`
         states about its own defaults: it is primed only by the RESTING reads
         (`listFetch.*`), never by `<PagedFind>`'s `fetchPage`, which calls the
         raw API and primes nothing. Picking a client therefore cannot empty the
         menu you picked it from.
       · IT HOLDS ONLY CLIENTS THAT HAVE A TICKET, and that is the right set for
         a filter rather than a subtraction: an option that can only ever return
         an empty list is the control-with-nothing-to-control this whole pass is
         about. The agency's own tickets carry no client at all and are excluded
         at the door (`account_id IS NOT NULL`), which is honest — `accountId`
         takes an id, so there is no "none of them" to send it.

     `accountsQ` STAYS, and only as a FACE. The tally carries a name and no
     logo, so the accounts cache is read for the picture and the account type
     (a sole trader's photo is cropped, a company's wordmark is contained —
     `record-mark.tsx`'s own rule, and `shape.tsx` draws the accounts list the
     same way). A client past page one still gets a mark, because `RecordMark`
     falls back to the initial of the name the DOOR sent: every option wears
     one, some wear a better one. A menu with a face on four rows and nothing on
     the fifth reads as the broken row, which is `ticketTypeColour`'s own
     never-null argument in another medium.

     MODULES ARE GONE. The client named the APP as the level she filters at, and
     `modulesQ` existed for nothing else on this screen. */
  const accountsQ = useCached<Account[]>(accountsKey(teamId), () =>
    tenancy.accounts().then((r) => r.accounts)
  )
  const appsQ = useCached<AppRow[]>(appsKey(teamId), () => listFetch.apps(teamId))
  const byAccount = useCachedValue<HelpAccountFacet[]>(helpByAccountKey(teamId))
  /** The accounts we happen to hold, by id — a FACE lookup and nothing else.
   * Never the option list itself: that is `byAccount` above, and the difference
   * between the two is the whole of R14 on this control. */
  const accountRows = new Map((accountsQ.data ?? []).map((a) => [a.id, a]))
  // THE RESTING CACHE — always the LIVE list now that Archived has moved off a
  // tab and onto the toolbar's Filter (see the header comment). It never holds
  // archived rows: those are an ACTIVE question, asked through `<PagedFind>`'s
  // own `facets` below exactly the way a search or a sort already is, so they
  // land in that find's own cache key rather than a resting one here.
  const allQ = useCached<HelpTicket[]>(helpKey(teamId, "all"), () => listFetch.help(teamId))
  // …and ONE more for whichever sub-tab is open. DASHBOARD is excluded for the
  // same reason TRIAGE is: neither narrows the list, both swap in a different
  // screen, so neither should open a facet read of its own.
  const narrowed = facet !== ALL && facet !== TRIAGE && facet !== DASHBOARD
  const facetQ = useCached<HelpTicket[]>(
    narrowed ? helpFacetKey(teamId, "all", facet) : null,
    () => listFetch.helpFacet(teamId, "all", facet)
  )
  // R16: every badge on the strip is the door's own grouped COUNT(*), primed by
  // whichever ticket read ran last and counted over the list IGNORING the stage
  // facet — so opening "Closed" does not make every other badge read zero.
  //
  // `help-by-type` is still PRIMED below (the door keeps sending it, and the
  // triage tally reads its own per-type counts from the rows in hand) but no
  // longer read here: the per-type tabs it fed were retired with the client's
  // 2026-09-06 ordering, and type became a filter rather than a tab.
  const byStatus = useCachedValue<Record<string, number>>(`help-by-status:${teamId}`)

  const scopedQ = narrowed ? facetQ : allQ
  // 2026-09-03 audit — named short so PagedFind's own tag below (a fixed
  // window this file's `facets-ask-the-door` census reads) stays inside it.
  const scopedLoading = scopedQ.data === undefined
  const scopedRows = scopedQ.data ?? []
  // The list key is written out at BOTH call sites below rather than held in a
  // variable: the paging and search checks read the JSX and look for the key the
  // door's own page lands in (`helpKey(`), which is the honest thing to look for
  // — a variable could be anything by the time it reaches the prop.
  const facetTotal = useCachedValue<number>(
    totalKey(`help-facet:all:${facet}`, teamId)
  )
  /* THE OPEN BOARD'S FIFTH COLUMN, AND WHY IT IS A READ RATHER THAN A FILTER.
     Client, 2026-09-07: "in open, include status ready and waiting". `ready` is
     a STATUS and joined `OPEN_TAB_STATUSES` (shared/types.ts), so it costs
     nothing here — the Open tab already asks the door for it and the rows
     arrive in `scopedQ`. `waiting` is not a status and never becomes one: it is
     derived at the door from the ticket's own conversation (`waitingClause`,
     workers/content/src/lib/help.ts) and no row in `scopedQ` carries a flag
     saying so, so there is nothing in the browser to filter on. The column is
     fed by the door's own answer to its own question instead.
     THE SAME CACHE KEY THE WAITING TAB RESTS ON, deliberately: opening the
     board and then the Waiting tab is one read, the live registry keeps one
     entry current, and the tab and the column can never disagree about who is
     waiting. `listFetch.helpFacet` primes this read's exact `total` into
     `help-facet:all:waiting`, which is what the column's number reads — never
     `waitingRows.length`, which is page one (R14/R16).
     CONDITIONAL, so a reader who never opens the board never pays for it:
     `useCached` with a null key fetches nothing. */
  const onOpenBoard = facet === OPEN && openView === "board"
  const waitingQ = useCached<HelpTicket[]>(
    onOpenBoard ? helpFacetKey(teamId, "all", WAITING) : null,
    () => listFetch.helpFacet(teamId, "all", WAITING)
  )
  const waitingTotal = useCachedValue<number>(totalKey(`help-facet:all:${WAITING}`, teamId))
  const scopeTotal = totals.help
  const shownTotal = narrowed ? facetTotal : scopeTotal

  // THE ONE STRIP LEFT (2026-08-31's redesign — see the file header). TRIAGE
  // FIRST since 2026-09-06, then Ready, then a tab per live ticket type, then
  // Closed, then All, then the Dashboard. Archived used to be a second strip
  // above this one; it is a toolbar Filter now (`COLLECTION_FILTERS.help`,
  // below), because it narrows a different, ORTHOGONAL question — a ticket's
  // stage in the archive, not its kind or lifecycle stage.
  //
  // WHY TRIAGE MOVED FROM LAST TO FIRST (client ruling, round eight). It was on
  // the end because it was written last and because it is not a filter of this
  // list — true, and neither of those is a reason about the person reading the
  // screen. Triage is the FIRST thing done to a ticket and, for the one person
  // who does it, the only reason to open Tickets at all: "one person does the
  // triage (me), and it's just seeing the tickets and seeing that they are in
  // the right category." A strip is read left to right in the order the work
  // happens, and the work happens here first. Ready — the pile somebody should
  // act on — keeps its place at the head of the NARROWING tabs, which is the
  // sentence that argument was originally about.
  const tabsConfig = {
    ...defaultTabsConfig,
    // Tickets is a collection on a main screen, and this is now its ONLY
    // strip — the one shape a tab strip draws anywhere in the app since
    // v1.2.28 (Tasks, Sprints, Apps, Accounts included; tabs-view.tsx's own
    // header has the ruling). Inherited rather than spelled: `defaultTabsConfig`
    // already is it.
    tabs: [
      /* THE CLIENT'S ORDER, 2026-09-06: dashboard, triage, open, closed, all.
         It reads as a working day rather than as a taxonomy — where the work is
         coming from, what has not been sorted, what is sorted and running, what
         is finished, and everything.

         THE PER-TYPE TABS ARE GONE. Issue / Question / Request / Extra each had
         a tab here; none is in her list of five. Triage is now where a type is
         decided, so a strip of type tabs beside it offered the same
         categorisation twice, in a place that could not change it. Type is
         still a FILTER — the toolbar's facets are built from the rows
         themselves — so nothing became unreachable, it stopped being a tab.

         FIRST IS LOAD-BEARING: `useRemembered`'s default below names whichever
         tab leads, on her rule that a page with nothing remembered opens the
         tab on the left. `web/test/default-tab-is-first.test.ts` compares the
         two off the disk, so moving this entry without moving the default is a
         red test rather than a surprise on refresh. */
      { value: DASHBOARD, label: t("Dashboard"), icon: CONCEPT_ICON.dashboard, badge: "", badgeVariant: "" as const },
      // The one tab whose idea has a concept icon of its own. No badge, and
      // that is R16 rather than an omission: this tab is not a narrower slice
      // of the collection counted above it, so a number here would be the same
      // collection counted twice. The dashboard above carries none for the
      // identical reason.
      /* THE BADGE IS THE QUEUE'S DEPTH — client, 2026-09-06: "on tab triage
         show number of pending".

         This carried `badge: ""` with an R16 argument: a tab that is not a
         narrower slice of the collection counted above must not show a number,
         or the same collection is counted twice. That argument still holds for
         the DASHBOARD tab beside it, which is a view of everything. It does not
         hold here. `status = 'new'` is a real, narrower subset — the tickets
         nobody has sorted yet — and it is the one number on this strip that
         says how much work is waiting for HER specifically. It is the same
         predicate the triage queue itself selects on (`triage.ts`), so the tab
         and the queue cannot disagree about what is pending. */
      { value: TRIAGE, label: t("Triage"), icon: CONCEPT_ICON.triage, badge: formatCount(byStatus?.new), badgeVariant: "" as const },
      /* READY — "every story closed, nobody has sent it yet", and the tab that
         used to wear the word "Open". See the block at the top of this file for
         what that mislabelling cost: this tab was the ONLY way to `status:ready`
         and there was no way at all to the three stages beside it. */
      { value: READY, label: t("Ready"), icon: CONCEPT_ICON.ready, badge: formatCount(byStatus?.ready), badgeVariant: "" as const },
      /* OPEN — THREE stages, and therefore a badge that ADDS UP three of the
         door's own grouped counts. That sum is still R16-clean and it is worth
         saying why, because "adding two numbers" is exactly what R16 usually
         forbids: `byStatus` is one grouped `COUNT(*)` over the WHOLE collection
         (`countTicketFacets`, counted with the stage facet deliberately turned
         off), so each term is an exact, disjoint count of one status. A ticket
         is in exactly one status, so no row is counted twice and none is missed.
         What R16 forbids is a number taken off a LOADED PAGE, and none of these
         is. */
      {
        value: OPEN,
        label: t("Open"),
        icon: CONCEPT_ICON.open,
        badge: formatCount(OPEN_TAB_STATUSES.reduce((n, st) => n + (byStatus?.[st] ?? 0), 0)),
        badgeVariant: "" as const,
      },
      /* WAITING — NO BADGE, and that is R16 rather than an omission.
         Every other number on this strip is one of the door's own grouped
         tallies, primed by whichever ticket read ran last; Waiting is not a
         status, so `byStatus` has no term for it and there is nothing here to
         read. The only honest number would be a count the door took under the
         waiting predicate itself, and the response shape that would carry it
         (`web/lib/api/content.ts`) belongs to another lane this pass may not
         edit — so rather than compute a plausible number in the browser, which
         is precisely the failure R16 exists for, this tab shows none. It is not
         countless: OPEN the tab and `CollectionHeading` above shows the door's
         exact total for it, the same way it does for every other narrowing.
         DELETE THIS COMMENT and badge it the day the ticket read carries a
         waiting tally. */
      { value: WAITING, label: t("Waiting"), icon: CONCEPT_ICON.waiting, badge: "", badgeVariant: "" as const },
      { value: CLOSED, label: t("Closed"), icon: CONCEPT_ICON.closed, badge: formatCount(byStatus?.resolved), badgeVariant: "" as const },
      { value: ALL, label: t("All"), icon: "", badge: formatCount(scopeTotal), badgeVariant: "" as const },
    ],
  }

  const canCreateTicket = can("help", "create")
  /** "RAISE TICKET", WRITTEN ONCE FOR EVERY BODY THIS SCREEN HAS.
   *
   * The list draws its toolbar through `<PagedFind>` and the Dashboard tab
   * draws its own `<ToolbarRow>` (`tickets-dashboard.tsx`), and until 6 Sep 2026
   * only the first of the two had a create button in it — the client's own
   * report: "on the dashboard, I'm missing the full toolbar." The fix is this
   * node rather than a second `<AddButton>` on the dashboard: one permission
   * check, one label, one glyph, so "the same button on every tab" is a fact
   * about one expression instead of a claim about two. Triage's own row is the
   * third body and builds its own, one component away, because `TriageQueue`
   * owns whether it draws at all (R50) and takes `canCreateTicket`/`onCreate`
   * rather than a node. */
  const raiseTicket = canCreateTicket ? (
    <AddButton label={t("Raise ticket")} onClick={onCreate} />
  ) : null

  /** WHICH BODIES THIS TAB OFFERS, AND WHICH ONE IS ON — one function, so the
   * five single-body tabs are provably identical rather than five call sites
   * that happen to agree.
   *
   * LIST IS ALWAYS FIRST AND ALWAYS THE DEFAULT — client, 2026-09-06: "for all
   * of them (except dashboard) start with list view, we will add more views
   * later." So the second body is an addition to the row rather than a
   * replacement of it, and a person who never touches this control sees the same
   * table on every tab.
   *
   * OPEN GETS THE BOARD — "for the tab open, I want the view list and Kanban -
   * columns are status" — and READY GETS THE SPLIT — "will do split view and
   * list". Both are the kit's own components; see `OpenBoard` and `ReadySplit`
   * below for what each one does and does not do.
   *
   * NOT MEMO-ISED. It builds two or three small objects per render and is read
   * once; a `useMemo` here would cost a dependency array to keep honest and buy
   * nothing (the same argument `peopleFor` in `TriageQueue` makes about its own
   * unwrapping). */
  const viewSlot: ToolbarViewSlot = (() => {
    const list = { value: "list", label: t("List"), icon: <ListBullets className="size-4" /> }
    if (facet === OPEN)
      return {
        views: [list, { value: "board", label: t("Board"), icon: <KanbanGlyph className="size-4" /> }],
        value: openView,
        onValueChange: (v: string) => setOpenView(v === "board" ? "board" : "list"),
      }
    if (facet === READY)
      return {
        views: [
          list,
          { value: "split", label: t("Split"), icon: <SquareSplitHorizontal className="size-4" /> },
        ],
        value: readyView,
        onValueChange: (v: string) => setReadyView(v === "split" ? "split" : "list"),
      }
    // ONE VIEW, AND THE KIT SAYS SO RATHER THAN THE ROW LOSING ITS LAST
    // ELEMENT. The handler is written out as a no-op with its reason rather than
    // omitted — `ToolbarViewSlot` requires one, the static label is not a
    // control and can never call it, and a handler that quietly did something
    // else would be worse than one that plainly does nothing.
    return { views: [list], value: "list", onValueChange: () => {} }
  })()

  /** THE TOOLBAR'S FILTERS FOR THE TAB THAT IS OPEN — see `ticketFacets`. */
  const helpFacets = ticketFacets({
    facet,
    t,
    clients: byAccount ?? [],
    accounts: accountRows,
    apps: appsQ.data ?? [],
    helpTypeOptions,
  })

  return (
    <CountedAbove active={formatCount(totals.help) !== ""}>
      <div className="flex flex-col gap-6">
        <CollectionHeading sectionKey="tickets" total={shownTotal} />
        {/* ONE STRIP, DRAWN THROUGH THE ONE SEAM — the client's 2026-08-31
            rulings, both on this exact screen: "there can never be 2 rows of
            tabs … just never", "toolbar must be inside of card background",
            and — once "Raise ticket" had moved to share the tab row — "never
            align the button with the tabs … that button belongs in the right
            of the toolbar, part of the toolbar". So the strip carries nothing
            but the tabs.

            IT GOES THROUGH `renderFolderTabs` NOW, 2026-09-03, and that is the
            whole of this screen's share of the client's spacing ruling ("go and
            uniform that … don't hard-code page by page, but rather you change
            the rule and you apply it everywhere"). This was the fourth
            collection strip in the app and the only one drawing its own bare
            `<TabsView>`: `SectionWithCreate`'s `folderTabs` slot (apps,
            sprints, tasks) and `PagedFind`'s `tabs` (accounts, contacts,
            meetings, and this screen's own rows below) both go through
            `renderFolderTabs`, which is where the sticky rule and the
            tab-to-content gap live. Drawing its own strip meant Tickets was
            the one main screen whose tabs did NOT pin on scroll, and the one
            place a fourth copy of the gap would have had to be written by
            hand. Same three arguments, one seam, and the difference disappears
            rather than being maintained. */}
        <div className="flex flex-col">
          {renderFolderTabs({ config: tabsConfig, value: facet, onValueChange: (v) => setFacet(v as HelpFacet) })}

          {facet === TRIAGE ? (
            <CollectionCard>
              {/* THE TOOLBAR, WITH ITS OWN SEARCH — CLIENT RULING, 2026-09-03,
                  SUPERSEDING THE "BUTTON ONLY" NOTE THIS USED TO CARRY. Triage
                  still has no `<PagedFind>` to share a search box with (it is
                  a small, whole-team-fetched queue, not a paged door read) —
                  but "no shared box" is a reason to draw its own, not a
                  reason to draw none, and "Raise ticket" still lives below
                  the tabs rather than beside them (client ruling, 2026-08-31).
                  DRAWN BY `TriageQueue` ITSELF NOW, NOT HERE (R50, 2026-09-03
                  second pass) — this component only ever knows whether the
                  reader is ON triage, never whether the queue they'd be
                  searching has anything in it, so the toolbar used to render
                  regardless, a lone "Raise ticket" pill above an empty queue
                  and no message at all for whoever was not on duty this week.
                  `TriageQueue` fetches the queue, so it is the one place that
                  can answer "is it empty" honestly — see its own header. */}
              <TriageQueue
                teamId={teamId}
                canTriage={can("help", "edit")}
                canEdit={can("help", "edit")}
                helpTypeOptions={helpTypeOptions}
                canCreateTicket={canCreateTicket}
                onCreate={onCreate}
                // The engine's open intent carries a URL SEGMENT, not a permission
                // module — its only consumer builds an address out of it
                // (deep-link-screen.tsx). Everywhere else in the app the two words
                // are the same string, so passing `help` here looked right and
                // produced `/help/<id>`, which is not a route: triage's Open button
                // answered 404 for as long as the tab has existed. `tickets` is the
                // segment; MODULE_PERMISSION is where it becomes `help` again.
                onOpen={(id) => onIntent({ kind: "open", module: "tickets", id })}
              />
            </CollectionCard>
          ) : facet === DASHBOARD ? (
            /* THE DASHBOARD — the Monday screen, and its own component
               (`tickets-dashboard.tsx`) rather than more of this file.

               WHAT IT REPLACED, 2026-09-06: two borrowed cards, `TicketsByAccountCard`
               and `TicketStagesCard`, both reading OTHER screens' cache keys
               (`help-by-account` off the ticket list, the pulse off Home) and
               between them answering two of the questions the approved design
               asks. Everything on the tab is now one door read of its own
               (`content.helpDashboard`) — which is what makes the toolbar's two
               filters possible at all: a facet has to reach a WHERE clause,
               and two cards reading two other screens' caches have no WHERE to
               reach. The two cards still exist and are still drawn where they
               belong: `TicketStagesCard` on Home's band, beside the hours.

               STILL NOT INSIDE A `CollectionCard`, AND NOW ITS TOOLBAR SAYS SO
               OUT LOUD (`standsOn`, below). Every other branch here is one card
               holding one collection; this branch is five panels and its own
               toolbar, and wrapping THEM in a sixth card would put a card
               inside a card — CLAUDE.md's own `useKitPanel` note calls that
               the broken combination. That reasoning is untouched: the panels
               are still bare on the shell's own pane and always will be.

               WHAT CHANGED, 7 Sep 2026 ("the toolbar in dashboard needs some
               kind of container 😕 … the most similar possible to the in-card
               toolbars!"): the argument above was read as covering the TOOLBAR
               too, and it never did. A toolbar is not a collection, so a card
               around one holds no rows and nests nothing. What the missing card
               cost was not decoration — `<ToolbarRow>` paints its own well in
               `--surface-raised` and `ScreenShell`'s pane is `--surface-raised`,
               so on THIS branch alone the well measured 1.000:1 against its
               ground in both palettes while the Triage branch above, inside a
               `CollectionCard`, measured 1.103:1 light / 1.111:1 dark. Same
               component, same fill, two different grounds. The dashboard draws
               its own furniture, and one piece of it is now a card around its
               toolbar — never around its panels. */
            <TicketsDashboard
              teamId={teamId}
              helpTypeOptions={helpTypeOptions}
              // THE ONE FACT ONLY THIS HOST KNOWS: there is no card under the
              // dashboard here, so its toolbar has to bring one. The app
              // record's Tickets tab says nothing and gets the default,
              // because `RecordChrome` already puts soft paper under it — see
              // `standsOn`'s own doc for the measurements on both hosts.
              standsOn="screen"
              // R50's own question, asked of the WHOLE collection: `totals.help`
              // is the door's exact COUNT(*) of the everyday list, before this
              // tab's own two filters narrow anything. A dashboard filtered to a
              // client with no tickets is an empty ANSWER, not an empty
              // collection, and its toolbar must stay put so the reader can
              // filter their way back out.
              ticketTotal={totals.help}
              // THE SAME BUTTON THE LIST TAB DRAWS, in the same slot of the same
              // row shape — see `raiseTicket` above for why it is one node
              // rather than two call sites that happen to agree today.
              actions={raiseTicket}
            />
          ) : scopedQ.error ? (
            <CollectionCard>
              <ShapeStateBody
                shape="collectionScreen"
                state="error"
                copy={{ errorTitle: t("Couldn't load the tickets.") }}
                action={
                  <Button variant="secondary" onClick={() => scopedQ.refresh()}>
                    {t("Try again")}
                  </Button>
                }
              />
            </CollectionCard>
          ) : (
            // WAS A THIRD BRANCH HERE, "scopedQ.data === undefined ?
            // CollectionCard+Skeleton" (2026-09-03 audit — "nine screens
            // blank their entire toolbar while loading"): that unmounted the
            // whole PagedFind toolbar (search/sort/filters/"Raise ticket")
            // while the tab strip above it stayed — so the search box and
            // the create button still popped into existence only once the
            // read resolved. Fixed the shared way: `restingLoading` below
            // keeps PagedFind's own chrome mounted, and `children`'s
            // `rows === null` check (already there for the search's own
            // loading state) is what draws the skeleton now.
            <PagedFind<HelpTicket>
              listKey={narrowed ? helpFacetKey(teamId, "all", facet) : helpKey(teamId, "all")}
              placeholder={t("Search tickets…")}
              matches={{
                none: t("No tickets match"),
                one: t("1 ticket matches"),
                many: t("{count} tickets match"),
              }}
              sorts={translatedSorts("help", t)}
              defaultSort={COLLECTION_SORTS.help.defaultSort}
              // R50 — whichever tab is open, `scopedQ` is its own resting read
              // (the "all" list, or the sub-tab's own facet read), so this is
              // the one honest "is THIS tab's collection empty" answer.
              restingEmpty={scopedRows.length === 0}
              restingLoading={scopedLoading}
              /* CLIENT, APP, TYPE, STATUS (+ the Archived view) — built above
                 as `helpFacets`, per tab, by the rule in `helpTabFacets`.

                 THE STATUS FACET AND THE TAB STRIP BOTH REACH `status`, AND
                 THAT IS COMPOSITION RATHER THAN THE TWO-CONTROLS-ON-ONE-FIELD
                 CLUTTER THIS PROP USED TO WARN ABOUT. The old note was right
                 for the old shape: a free Status select beside a strip of stage
                 tabs is two controls answering the same question from two
                 places, and the client's own word for that was "the Accounts
                 tab is a bit confusing". What is drawn now is a control that
                 narrows WITHIN the tab and can only offer stages the tab
                 already contains — three on Open, seven on All, none anywhere
                 else. The spread order below is what makes that true rather
                 than a hope: the tab's own narrowing goes in first and the
                 person's question goes over the top, so picking "Scheduled" on
                 the Open tab asks the door for scheduled tickets and never for
                 the three the tab would otherwise have sent. */
              facets={helpFacets}
              /* THE VIEW SELECTOR, ON EVERY ROW TAB — client, 2026-09-06:
                 "For the tabs Open, Closed, and All, do the list view exactly
                 the same as we have it in the Triage list, and put the view
                 selector. Even if currently there is only one view, the table
                 one."

                 SO IT IS PASSED EVEN WHERE THERE IS ONE BODY, and that is a
                 change of behaviour rather than a decoration. Until kit v1.2.60
                 `ViewSwitch` drew nothing below TWO views, which is the property
                 R53 leans on to leave `view` out of its exemption registry; the
                 kit now draws a single view as a STATIC LABEL wearing the same
                 pill (`ToolbarViewSlot`'s own doc carries the client ruling and
                 the date). A toolbar that keeps its right-hand element on some
                 tabs and loses it on others is the variation she has twice told
                 us to stop — so Waiting, Closed and All say "List" in the slot
                 rather than leaving a hole in the row.

                 ONE HELPER RATHER THAN A TERNARY AT THE PROP, because two of the
                 seven tabs have a second body and the other five must be
                 provably identical: `viewSlot` below is the only place that
                 decides, so "every row tab draws this control" is a fact about
                 one function instead of a claim about five call sites. */
              view={viewSlot}
              // "RAISE TICKET", AT THE RIGHT OF THE TOOLBAR — PagedFind's own
              // `actions` slot (client ruling, 2026-08-31). No Export/Import
              // beside it: unlike Accounts, tickets has no export or import
              // door (a ticket is a raised conversation, not an importable
              // record — AGENTIC-IMPORT.md), so there is nothing else to draw.
              actions={() => raiseTicket}
              // The tab strip's own kind/stage narrowing is NOT `fixed`, and the
              // difference matters: `fixed` makes a find ACTIVE unconditionally,
              // and this strip is already in `listKey` above — passing it here
              // too would move the RESTING screen into a `find:` cache key the
              // live registry does not patch (R15), for no gain. The Archived
              // filter above has no such cost: untouched, a facet contributes
              // nothing to `query`, so the resting cache stays exactly as live
              // as it was before this toolbar could ask it anything.
              fetchPage={(query, cursor) =>
                contentApi
                  .help({
                    // The strip's own choice, then whatever the toolbar is
                    // asking (search, sort, the Archived filter) spread whole
                    // over it: `listQuery` forwards every key, so a narrowing
                    // cannot be lost between these controls and the door.
                    scope: "all",
                    view: "live",
                    ...helpFacetFilter(facet),
                    ...query,
                    cursor,
                  })
                  .then((r) => ({ rows: r.tickets, nextCursor: r.nextCursor, total: r.total }))
              }
              // THE ONE CARD — toolbar, then rows — the same join Accounts draws
              // (`collection-content.tsx`'s own `wrap`): zero gap to the tab row
              // above, which is this component's own flex column rather than a
              // second `gap-*` here.
              wrap={(inner) => <CollectionCard>{inner}</CollectionCard>}
            >
              {(found) => {
                const rows = found.active ? found.rows : scopedQ.data
                if (rows === null || rows === undefined) return <Skeleton variant="list" lines={4} />
                const openTicket = (id: string) => onIntent({ kind: "open", module: "tickets", id })
                return (
                  <div className="flex flex-col gap-4">
                    {/* ARCHIVED IS A QUESTION NOW, not a screen this component
                        sits on — so this band reads the ACTIVE question (the same
                        `queryString` the Accounts export href narrows by) rather
                        than a second copy of the toolbar's own state.

                        It used to ride `ScreenRenderer`'s `band` slot; the
                        renderer is gone from this branch (see the table below for
                        why) and the sentence is not, so it is drawn here, above
                        the body, exactly where the band was. */}
                    {found.queryString.includes("view=archived") && (
                      <Text as="p" size="sm" tone="secondary">
                        {t(
                          "Archived tickets keep their history and stay searchable. They don't count toward the figures above."
                        )}
                      </Text>
                    )}
                    {rows.length === 0 ? (
                      /* THE ZERO STATE, DRAWN HERE RATHER THAN BY THE ENGINE.
                         `withDataDrivenCollection` used to hand the recipe an
                         `emptyText` and `CollectionCreateActionProvider` used to
                         publish "Raise ticket" down into the renderer's own empty
                         panel. Neither survives the move to the shared table, and
                         neither is lost: the SENTENCE is `found.emptyText` when
                         somebody has asked something and the collection's own
                         line otherwise, and the BUTTON is already on screen —
                         `raiseTicket` sits in the toolbar directly above this,
                         which is where the client ruled it belongs ("that button
                         belongs in the right of the toolbar, part of the
                         toolbar"). Publishing a second copy of it into an empty
                         panel would have been the same act offered twice. */
                      <EmptyLine concept="tickets">
                        {found.emptyText ?? t("No tickets here yet.")}
                      </EmptyLine>
                    ) : facet === OPEN && openView === "board" ? (
                      <OpenBoard
                        teamId={teamId}
                        rows={rows}
                        counts={byStatus}
                        waitingRows={waitingQ.data}
                        waitingTotal={waitingTotal}
                        narrowed={found.active}
                        onOpen={openTicket}
                      />
                    ) : facet === READY && readyView === "split" ? (
                      <ReadySplit teamId={teamId} rows={rows} onOpen={openTicket} />
                    ) : (
                      <TicketRowsTable rows={rows} onOpen={openTicket} label={t("Tickets")} />
                    )}
                    <LoadMore
                      listKey={
                        found.listKey ??
                        (narrowed ? helpFacetKey(teamId, "all", facet) : helpKey(teamId, "all"))
                      }
                      label={t("Load more tickets")}
                      fetchPage={found.fetchPage}
                    />
                  </div>
                )
              }}
            </PagedFind>
          )}
        </div>

        {/* THE ONE PANEL THAT IS NOT THE LIST, and it is UNDER it now. WHOSE
            WEEK IT IS was written above the list because "it is the sentence a
            person needs before they look, and a page they have to go and open
            is a page nobody opens" (BUILD-1 §6). The person came for the list,
            so the list comes first and this is a scroll away, which the owner
            explicitly asked people to be happy to do. Nothing is hidden,
            nothing is conditional on who is reading.

            WHERE THE WORK IS SITTING used to render here too (N2's original
            complaint: a reader crossed FIVE blocks — a duty band, a stage
            chart, the tab strip, the search bar and an action row — before
            reaching the list itself). It moved to the Dashboard tab
            (2026-09-01, alongside the new Tickets-by-client chart): a chart
            about the whole pipeline is a screen's worth of its own, the same
            argument that already gave Triage's queue a tab rather than a
            panel here, so it is absent on Dashboard's own tab (a screen does
            not repeat its own reason for being one) and on Triage's, same as
            before. */}
        {facet !== TRIAGE && facet !== DASHBOARD && (
          <TriageStrip teamId={teamId} canSetDuty={can("help", "edit")} />
        )}
      </div>
    </CountedAbove>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   THE SHARED TICKET TABLE, AND THE TWO SECOND BODIES BESIDE IT.

   All three are drawn HERE, in the screen that owns the tab strip, rather than
   in files of their own: each is a BODY of one collection, they read the same
   rows and the same four facts, and splitting them across three files is how
   two of them end up disagreeing about what a ticket is called. That is not
   hypothetical — it is exactly the split `ticketTitle` was written to close (see
   `shared/web/ticket-chips.tsx`).
   ══════════════════════════════════════════════════════════════════════════ */

/** THE FOUR FACTS A TICKET SHOWS IN A ROW, AND NOTHING ELSE.
 *
 * A STRUCTURAL TYPE, ON PURPOSE. The two row shapes this screen holds —
 * `HelpTicket` (the paged collection) and `TriageWaiting` (the queue's own,
 * widened door read) — are different objects that happen to answer the same
 * seven questions, and neither is a subset of the other. Naming the QUESTIONS
 * rather than either row lets one table serve both without a mapper in between,
 * and a row shape that stops answering one of them is a compile error at the
 * call site rather than a hole in a cell. */
type TicketFace = {
  id: string
  ref: string | null
  helpType: string | null
  appName: string | null
  createdAt: string
  titleDe: string | null
  titleEn: string | null
  description: string
}

/** ONE TABLE FOR EVERY TAB THAT SHOWS ROWS — client, 2026-09-06: "For the tabs
 * Open, Closed, and All, do the list view exactly the same as we have it in the
 * Triage list."
 *
 * ── WHAT MOVED, AND WHY IT IS A LIFT RATHER THAN A COPY ────────────────────
 *
 * This table was written INSIDE the triage branch a few hours before the strip
 * grew four more row tabs. Copying it five times would have been five chances
 * for the black id chip, the coloured dot, the em-dash for a missing app and the
 * date format to drift apart on one screen — and the ticket collection has
 * already paid that bill once, in the two different names one ticket had on two
 * of its own tables (`ticketTitle`'s header). So it is a component, and the
 * triage branch is one of its callers.
 *
 * EVERY DESIGN RULING THE TRIAGE TABLE CARRIED IS KEPT WORD FOR WORD, because
 * they were rulings about a TICKET ROW and not about triage: the four columns in
 * her order (Title · Type · App · Raised), the black `variant="inverse"` chip
 * leading the title ("put the ID before the title to the left, with the usual
 * black chip design"), the coloured dot from `ticketTypeColour` ("Type with the
 * colors, same as we have with the chips"), plain non-sorting headers, no hover
 * on the header row ("when I hover over the title row, there should be no
 * action"), and "Raised" rather than "Date" for the last column ("i choose
 * raised"). Their full arguments are on the individual cells below.
 *
 * ── THE ORDER IS THE CALLER'S, AND THE HEADERS STAY PLAIN ──────────────────
 *
 * Not one column header sorts, and that is now true for a second reason as well
 * as the first. On triage the order comes from the toolbar's own pinned sort;
 * on every other tab it is the DOOR's (`<PagedFind>`'s `sorts`, spanning the
 * whole collection rather than the page in hand — R14). Either way a clickable
 * header would be a second control answering a question something else has
 * already answered, and on the paged tabs it would be worse than that: it could
 * only reorder the fifty rows loaded, under a count of them all.
 *
 * ── THE DECIDE COLUMN IS OPTIONAL, AND IT IS THE ONLY DIFFERENCE ───────────
 *
 * Triage adds a fifth column carrying the verb for that row's kind, and a strip
 * that opens beneath the row when the verb needs a person. Nothing else does —
 * a ticket on Open or Closed is not waiting for a decision this screen can make.
 * Passing the column in rather than branching on a `variant` keeps this file
 * from knowing what triage is: it draws a header, a cell and an optional strip,
 * and the caller decides what goes in them. */
function TicketRowsTable<T extends TicketFace>({
  rows,
  onOpen,
  label,
  decide,
}: {
  rows: readonly T[]
  onOpen: (id: string) => void
  /** The table's own accessible name, for a reader who arrives out of context. */
  label: string
  decide?: {
    /** The column's header. Say what the cells DO, or pass "" to leave it
     * announced-only — triage passes "" for the reason it always did. */
    header: string
    cell: (row: T) => React.ReactNode
    /** A full-width strip beneath this row, when this row is mid-decision. */
    strip?: (row: T) => React.ReactNode
  }
}) {
  const { t, lang } = useLanguage()
  const columns = decide ? 5 : 4
  return (
    <Table
      // The kit's own specimen width for a table that knows its column count.
      // Below it the container scrolls on the inline axis rather than crushing
      // the title column — the kit's stated mobile answer, and the reason it
      // never restacks a table into cards.
      minWidth="42rem"
      aria-label={label}
    >
      <TableHeader>
        {/* NO HOVER ON THE HEADER — client: "when I hover over the title row,
            there should be no action." `TableRow` carries the kit's row wash
            unconditionally, because on a body row that wash is the affordance
            saying "this opens". On the header it is a lie: the header does
            nothing, and these columns deliberately do not sort. A surface that
            lights under the pointer and then refuses the click is read as broken
            rather than as inert. */}
        <TableRow className="hover:bg-transparent">
          <TableHead>{t("Title")}</TableHead>
          <TableHead>{t("Type")}</TableHead>
          <TableHead>{t("App")}</TableHead>
          <TableHead>{t("Raised")}</TableHead>
          {decide && (
            // NO HEADER OVER THE ACTIONS when the caller passes none — client,
            // asked directly: "no header". Every other header names what the
            // cells beneath it CONTAIN, and this column's cells do not contain a
            // fact, they contain a move. `sr-only` text keeps the column
            // announced to a screen reader, which reads headers to say which
            // cell it is in.
            <TableHead>
              <span className="sr-only">{decide.header || t("Decide")}</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((w) => (
          <React.Fragment key={w.id}>
            <TableRow onClick={() => onOpen(w.id)} className="cursor-pointer">
              <TableCell>
                {/* THE NUMBER LEADS THE TITLE — client: "put the ID before the
                    title to the left, with the usual black chip design."
                    `RecordRef` (shared/web/record-ref.tsx) IS that chip, and
                    since 7 Sep 2026 it is the ONLY thing in either front door
                    that draws one: this cell used to spell the badge out itself
                    and three other surfaces spelled the identical lozenge out
                    beside it, agreeing by copy-paste. `REF_LEADS_NAME` is the
                    row that puts it in front — the "before the title to the
                    left" half of her sentence, held as one string rather than
                    as a shape each call site remembers. Both the absent case (a
                    ticket with no number draws nothing) and `shrink-0` (a long
                    title truncates and the number never does, because an id
                    with its tail cut off is not useless, it is WRONG) live
                    inside the component now. */}
                <span className={REF_LEADS_NAME}>
                  <RecordRef value={w.ref} />
                  {/* THE KIT'S OWN ANSWER TO "the whole row navigates" (GAPS-D
                      TBL-5): the call site puts a `Button variant="link"` in the
                      first cell and that control owns the press. So the mouse
                      gets the whole row, the keyboard and a screen reader get a
                      real focusable control with the row's own name as its
                      label, and neither is a second-class way in. It stops the
                      click propagating so one press is never two `onOpen` calls.

                      `variant="link"` is not a box (no height, no padding), so
                      it inherits the cell's own type rather than drawing a
                      control inside a row; `block` plus a measure is what lets a
                      long title end in an ellipsis instead of pushing the other
                      three columns off the screen. */}
                  <Button
                    variant="link"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpen(w.id)
                    }}
                    className="block max-w-[32rem] truncate text-start"
                  >
                    {ticketTitle(w)}
                  </Button>
                </span>
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-2">
                  {/* THE PILL IS THE WHOLE CELL NOW — client, 2026-09-07, over a
                      screenshot of this exact column: "for type, kill the
                      emojis. this is legacy. in current system we use colors."

                      WHAT STOOD HERE was the team's own glyph for the kind, read
                      off the `Ticket type` dropdown value through `markMap` and
                      drawn beside the pill. The stored glyphs are untouched (see
                      the note beside the facets above); the READ is gone, and
                      with it the argument this comment used to make — that
                      dropping it "would have quietly deleted a capability nobody
                      asked to lose". Somebody asked. A pictograph in front of a
                      coloured pill was two marks for one fact, and the ruling
                      picks the one the rest of the app already uses.

                      THE SAME DOT, FROM THE SAME COMPONENT AND THE SAME MAP as
                      the triage card's chips and the type picker draw — client:
                      "Type with the colors, same as we have with the chips."
                      `Swatch` + `ticketTypeColour` rather than a second lozenge
                      that agrees with them today: the whole reason
                      `lib/type-colours.ts` is one file is that a type's colour
                      cannot be decided twice.

                      A TYPE THE TICKET DOES NOT HAVE STILL GETS ITS PILL, saying
                      so with an em dash: a column with a pill on four rows and a
                      hole on the fifth reads as the broken row rather than the
                      untyped one. */}
                  <Badge variant="secondary" size="pill">
                    <Swatch colour={ticketTypeColour(w.helpType)} />
                    {w.helpType ?? "—"}
                  </Badge>
                </span>
              </TableCell>
              {/* THE TWO QUIET COLUMNS, as her reference draws them: the facts,
                  in secondary ink, so the title and the coloured pill are what
                  the eye lands on going down the page. An em dash for an absent
                  app — a blank cell looks like a rendering fault rather than a
                  missing answer.

                  THE APP IS TEXT, NOT A LINK, AND THAT IS R37-SHAPED: a link
                  inside a row whose whole job is to open the TICKET gives one
                  row two destinations, and the one a click lands on becomes a
                  matter of pixels. Nothing is lost — the app is a FACET in the
                  toolbar above, and the ticket's own screen is one row-click
                  away with the app link on it. */}
              <TableCell className="text-muted-foreground">{w.appName ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground tabular-nums whitespace-nowrap">
                {/* THE SAME DATE THE CARD'S CHIP SHOWS, through the same shared
                    formatter and the reader's own language, so one ticket cannot
                    carry two spellings of one day across two views of one
                    collection. */}
                {formatDate(w.createdAt, lang)}
              </TableCell>
              {decide && (
                <TableCell className="text-end whitespace-nowrap">{decide.cell(w)}</TableCell>
              )}
            </TableRow>
            {/* THE STRIP, BENEATH ITS OWN ROW — the client picked L3 over a panel
                and a dialog, knowing it pushes the rows below it down: "L3".

                A ROW OF THE TABLE, not a floating box over it: a `colSpan` cell
                keeps it inside the grid, so it cannot drift out of alignment
                with the row it belongs to, and a screen reader meets it in the
                reading order immediately after that row rather than somewhere
                else in the document. */}
            {decide?.strip?.(w) && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns} className="bg-surface-quiet">
                  {decide.strip(w)}
                </TableCell>
              </TableRow>
            )}
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  )
}

/** THE OPEN TAB'S SECOND BODY — client, 2026-09-06: "for the tab open, I want
 * the view list and Kanban - columns are status".
 *
 * ── IT IS READ-ONLY IN THIS PASS, AND IT LOOKS IT ─────────────────────────
 *
 * SAID PLAINLY BECAUSE A BOARD THAT LOOKS DRAGGABLE AND IS NOT IS WORSE THAN NO
 * BOARD. The kit makes that a property of the API rather than a promise this
 * file has to keep: `Kanban` is handed no `onMove`, and its own doc states what
 * that means — "no card is draggable, no card takes the move keys, and no drop
 * target lights up. A control that silently does nothing is worse than no
 * control." So there is no lifted card, no drop wash and no keyboard move to
 * discover; a card OPENS the ticket, which is the one thing this board does.
 *
 * WHY NOT WIRE THE DRAG NOW. The door exists — `content.setHelpStatus` is the
 * same idempotent, publishing write the triage queue's Undo already uses — so
 * this is a decision rather than a gap, and it turns on two things a pass that
 * is redrawing a tab strip should not decide by itself:
 *
 *   1 · A DROP WOULD BE A LIFECYCLE MOVE MADE BY GEOMETRY. These stages are
 *       not free-form columns a person owns: `scheduled` is flipped when work
 *       lands in a sprint, `in_progress` when a timer starts and `ready` when
 *       the last story on the ticket closes, by `lib/ready-flip`
 *       (shared/types.ts's `HELP_STATUSES` says so status by status). Dragging
 *       a card into "In progress" would assert that a timer is running when
 *       none is, and the flip that owns that column would move it back the next
 *       time anything touched the ticket. A board that undoes your drag an hour
 *       later is a board nobody trusts twice.
 *       AND THE FIFTH COLUMN COULD NOT ACCEPT A DROP AT ALL, which is the
 *       cleanest statement of why this board stays read-only: "waiting" is not
 *       a status, so there is no field a drop into it could write. Nothing
 *       makes a ticket waiting except the client not having replied yet.
 *   2 · THE BOARD IS A PAGE, NOT THE COLLECTION. The list pages (R14), so the
 *       cards are the fifty rows in hand while the column counts below are the
 *       door's exact `COUNT(*)` — honest as a READING (the count says how many
 *       there really are) and dishonest the moment a drag makes the two disagree
 *       until a refetch lands.
 *
 * Both are answerable; neither is answerable here. Filed as the next pass on
 * this tab rather than shipped half-done.
 *
 * ── WHAT THE COLUMNS AND THE CARDS CARRY ──────────────────────────────────
 *
 * THE FIRST FOUR COLUMNS ARE `OPEN_TAB_STATUSES`, the same closed vocabulary
 * the Open facet sends to the door — so the board cannot show a stage column
 * the tab does not contain, and a stage added to that list appears here without
 * an edit. That property is what settled 2026-09-07's ruling ("in open, include
 * status ready and waiting"): `ready` was added to the ARRAY rather than to
 * this board, so the tab's list, its badge, its Status facet and this board all
 * moved together. A `ready` column over a tab whose list refused to show ready
 * tickets would have been a column counting rows the screen denies, which is
 * R16's founding defect wearing a board's clothes.
 *
 * THE FIFTH IS NOT A STAGE AT ALL — see the column itself, below. It is the
 * waiting PREDICATE, fed by its own door read, and its cards are repeats of
 * cards in the four beside it. Nothing on this screen adds the five together.
 *
 * THE COUNT UNDER EACH HEAD IS THE DOOR'S, not `cards.length` — but only while
 * the toolbar is RESTING, and that condition is the whole R16 argument.
 *
 * `byStatus` is one grouped `COUNT(*)` the door takes over the live collection,
 * so at rest a column showing eight cards and saying 41 is telling the truth
 * twice rather than contradicting itself: the cards are page one, the number is
 * how many there are, and the line under the board says which is which. That is
 * exactly the case the kit's own `count` prop documents ("pass one where the
 * column is paged and the total is larger than what is on screen").
 *
 * THE MOMENT SOMEBODY SEARCHES OR SETS A FACET IT STOPS BEING TRUE. `byStatus`
 * is primed by the RESTING ticket read and carries none of the toolbar's
 * narrowing, so a searched board would put an un-narrowed 41 over three matching
 * cards — a number and a set of rows answering two different questions, which is
 * R16's founding defect in the quietest form it takes. So when anything is being
 * asked the column hands the kit no `count` at all and it falls back to the
 * cards it is holding, which is a smaller claim and a true one. The footnote
 * changes with it, because a reader has to be told which of the two they are
 * looking at.
 *
 * THE CARDS CARRY THE SHARED CHIPS, `TicketChips` through this screen's own
 * `TriageChips` wrapper, which is the client's standing ruling about every
 * ticket surface in the app: "replicate the pills that we have on the view
 * outside. These are: ID, type, app, date … and everywhere else where tickets
 * have pills, reuse this." A fifth way of drawing a ticket's four facts is
 * precisely what that ruling exists to prevent.
 *
 * WITH ONE FACT MOVED, NOT DROPPED (2026-09-07, "lets put the date below title
 * as simole tex"): the board asks that line to leave its date chip out and
 * draws the date under the title instead, in the kit card's own quiet caption
 * slot. All four facts are still on the card and all four are still drawn by
 * the shared component's rules — see `boardCard` below for the whole argument,
 * and `shared/web/ticket-chips.tsx` for why it is one boolean rather than a
 * board-flavoured copy of the chip line. */
function OpenBoard({
  teamId,
  rows,
  counts,
  waitingRows,
  waitingTotal,
  narrowed,
  onOpen,
}: {
  teamId: string
  rows: readonly HelpTicket[]
  /** the door's own grouped tally per status — never `cards.length` */
  counts: Record<string, number> | undefined
  /** THE FIFTH COLUMN'S OWN PAGE. Not a slice of `rows`: waiting is DERIVED at
   * the door from the ticket's conversation and no row carries a flag for it,
   * so this is the door's own answer to its own question, read through the same
   * facet cache the Waiting TAB rests on. Undefined while it is in flight. */
  waitingRows: readonly HelpTicket[] | undefined
  /** …and that read's own exact `total`. Never `waitingRows.length` (R16: the
   * facet read is page one) and never a term of `counts`, which groups by
   * status and has no term for a predicate. */
  waitingTotal: number | undefined
  /** is the toolbar asking anything? `counts` is the RESTING collection's tally
   * and answers a different question the moment it is. See the header. */
  narrowed: boolean
  onOpen: (id: string) => void
}) {
  /* `useLanguage` RATHER THAN `useT`, from 2026-09-07: the cards now carry a
     date of their own under the title (see `boardCard` below) and `formatDate`
     takes the reader's own language explicitly — ruling 07, never the runtime's
     ambient locale. This is the same swap the list view made for the same
     reason two components down, and the same one it made back when the date
     lived in the chips. */
  const { t, lang } = useLanguage()
  /** THE STAGES IN THE READER'S OWN LANGUAGE. THE DOT IS NOT HERE — it is one
   * function call below, and 2026-09-07 is the day that stopped being a detail.
   *
   * WRITTEN OUT AS LITERALS INSIDE THE COMPONENT rather than read off
   * `HELP_STATUS` (web/components/deep-link/shape.tsx). That map is a copy TABLE
   * whose keys are database words, so none of its values is an extracted
   * position (R28's `property` position only looks at named copy props) — a
   * `t(HELP_STATUS[s])` here would look up keys the catalogue does not hold and
   * hand every non-English reader the English word, silently, on a screen that
   * looks finished. Each `t("…")` literal is a catalogue entry.
   *
   * A `Record` OVER `OPEN_TAB_STATUSES` RATHER THAN A LOOKUP WITH A FALLBACK,
   * and 2026-09-07 is what that bought: `ready` joined the Open tab (shared/
   * types.ts says why) and this map failed its own type check until the fourth
   * entry was written, instead of the board quietly drawing a fourth column
   * with no name.
   *
   * ── THE DOT USED TO BE THE FIFTH VALUE IN THIS MAP, AND IT WAS WRONG ──────
   *
   * CLIENT, 2026-09-07, over this exact board, verbatim: *"grerat but status
   * (th header) have no color associated."* She is not asking for a brighter
   * shade. She is reading a column head whose dot is not the colour this app
   * gives that status, on a screen that shows her the right one six inches
   * above: the Status FILTER on this same tab draws each stage's swatch through
   * `helpStatusDotTone` (see `DOT_TONE_FILL` and `helpFacets` at the top of this
   * file), so "Triaged" was a BLUE dot in the filter menu and a GREY one on the
   * column head of the tickets it selects. One stage, two colours, one screen.
   *
   * THE PARAGRAPH THAT USED TO STAND HERE CLAIMED OTHERWISE — "Taken from that
   * file's reading rather than re-decided here, because a stage's colour cannot
   * be chosen twice" — and then wrote four literals that were the tiering of
   * `shared/status-tones.ts` shifted one rung DOWN: `triaged` was `archived`
   * where that file says `review`, `scheduled` was `review` where that file says
   * `building`. A comment promising a single source is not a single source. It
   * is replaced rather than deleted because the promise was right and only the
   * spelling was wrong: the answer is now READ, so it cannot drift again and no
   * comment has to be believed.
   *
   * WHAT THE FIVE COLUMNS NOW WEAR, and it is `status-tones.ts`'s tiering
   * verbatim: `triaged` is `review` (blue — somebody has read it and is looking
   * at it), `scheduled` and `in_progress` are both `building` (charcoal, "in
   * build / with us" in the kit's own token comment — booked in and being worked
   * on are the same tier of the same lifecycle), `ready` is `done` (green — every
   * story closed, only the sending left) and Waiting is `blocked`.
   *
   * TWO COLUMNS SHARE A COLOUR AND THAT IS THE ANSWER, NOT A DEFECT LEFT IN.
   * `scheduled` and `in_progress` are one tone because the app rules they are
   * one tier, and the fix for two neighbours wearing charcoal is emphatically
   * NOT to give this board its own private shade for one of them — that is
   * precisely the second decision the client's complaint is about. The kit
   * already rules the case: the dot never carries the state alone, and the name
   * in words is beside it. It is the same situation the six tones have with
   * their two greens (`--dot-shipped` and `--dot-done` are one colour, named
   * twice), which `DOT_TONE_FILL`'s own note at the top of this file spells out.
   * If four distinct colours across five columns is not enough for her, the
   * vocabulary is the kit's and the fix is a kit release, not a literal here. */
  const COLUMN: Record<(typeof OPEN_TAB_STATUSES)[number], { title: string }> = {
    triaged: { title: t("Triaged") },
    scheduled: { title: t("Scheduled") },
    in_progress: { title: t("In progress") },
    ready: { title: t("Ready") },
  }
  /** ONE CARD, BUILT ONCE, FOR BOTH KINDS OF COLUMN.
   *
   * The four stage columns and the Waiting column are fed by two different
   * reads (see the fifth column's own note below) and used to spell their card
   * out twice, identically. That was survivable while a card was an id, a title
   * and a chip line; 2026-09-07 gave it a fourth part, and a fourth part
   * written twice is the drift this whole screen's chip ruling exists to
   * prevent, in miniature — the same ticket drawn two ways depending on which
   * column you happened to find it in, and a waiting ticket is drawn in BOTH.
   *
   * THE DATE MOVES OUT OF THE CHIPS AND UNDER THE TITLE — client, 2026-09-07:
   * *"lets put the date below title as simole tex"*. So `TriageChips` is asked
   * to leave its fourth chip out (`omitDate`, and `shared/web/ticket-chips.tsx`
   * carries the argument for why that is a subtraction rather than a fork), and
   * the kit's own `description` slot takes the date instead — a `text-micro`
   * line in `--ink-tertiary` under the title, which IS this app's quiet caption
   * treatment and is drawn by the kit rather than styled here.
   *
   * THE WORDS ARE "raised {date}", WHICH IS HER OWN PHRASING FOR THIS EXACT
   * POSITION rather than a new sentence. The chip that is being retired here
   * carried that sentence as its accessible name only, because she ruled about
   * the CHIP that it should "not say raised on date, but only date" — a word
   * that needs explaining in a row scanned at speed is one word too many. A
   * caption line under a title is not that row: it is where the sentence lived
   * before it became a chip at all (`shared/web/ticket-chips.tsx` records it as
   * "what an older layout said under the description, word for word"), it is
   * already in the catalogue so nothing new needs translating, and it means the
   * line a screen reader hears is the one it heard from the chip's label
   * instead of a bare date with nothing saying which date it is.
   *
   * AND IT GOES THROUGH `formatDate` LIKE EVERY OTHER DATE ON A SCREEN
   * (R-law: no screen shows a raw timestamp; `web/test/dates-are-formatted.test.ts`
   * reads this file off disk to make sure). */
  const boardCard = (r: HelpTicket) => ({
    id: r.id,
    title: ticketTitle(r),
    badges: <TriageChips teamId={teamId} ticket={r} omitDate />,
    description: t("raised {date}", { date: formatDate(r.createdAt, lang) }),
  })
  return (
    <Kanban
      /* USE ALL THE WIDTH THERE IS — client, 2026-09-07: "with this 5 columns,
         use all width available in screen".
         WHAT WAS ACTUALLY CONSTRAINING IT WAS NOT A MAX-WIDTH. There is none on
         the path: `app-shell.tsx`'s one page container is `max-w-none` (R29,
         and `PAGE_WIDTH_OWNER` pins that string), `CollectionCard` is a plain
         `Card` with `p-4` and sets no measure, and the kit's `ScreenShell` card
         is `flex-1` inside the ground's gutter. The board already had the whole
         screen. What it did with it was the problem: the kit lays its columns
         out as a scrolling flex row of `w-[var(--kw-kanban-col)] shrink-0`
         items at a default 18rem, so three columns used 54rem of a 2,000px
         display and five columns overflowed a laptop into a horizontal
         scroller. Fixed-width columns do not grow and do not shrink.
         SO THE FIX IS THE KIT'S OWN PROP, not a negative margin and not a
         wrapper: `columnWidth` is spent straight into that custom property, so
         a fluid value makes the five columns SHARE the row. `100%` resolves
         against the flex container's content box — the card's inside — and the
         four gaps are the kit's own `--space-2h`, subtracted so five columns
         land exactly on the edge instead of one column past it.
         `max(18rem, …)` IS THE FLOOR AND IT IS THE KIT'S OWN NUMBER (`.kw-laws`,
         "the kit's own smallest stated column minimum"). Below about 90rem of
         card the columns stop shrinking and the board scrolls, which is what
         the kit's inline-axis rule already says should happen — a five-column
         board squeezed to 10rem a column is the "80px each" render CH27.24
         forbids. Above it they stretch to the edge, which is what she asked
         for. Below 45rem the kit switches to its own single-stage picker and
         this value is not used at all. */
      columnWidth="max(18rem, calc((100% - 4 * var(--space-2h)) / 5))"
      columns={[
        ...OPEN_TAB_STATUSES.map((stage) => ({
          id: stage,
          title: COLUMN[stage].title,
          /* THE STAGE'S OWN TONE, READ — never a literal written here. See the
             `COLUMN` note above for the client ruling this closes and for the
             two colours the same stage used to have on this one screen. The six
             values `helpStatusDotTone` returns ARE the kit's six `dot` names
             (`DotTone` in shared/app-stages.ts is the same union, restated there
             because a worker cannot import a `.tsx`), so this satisfies
             `KanbanColumnDot` structurally and a seventh tone in the kit would
             fail here rather than paint nothing. */
          dot: helpStatusDotTone(stage) satisfies KanbanColumnDot,
          count: narrowed ? undefined : counts?.[stage],
          /* A PARTITION, NOT A NARROWING, and the difference is the whole of
             R16 on this screen. Two censuses forbid a paged screen from
             narrowing the door's own loaded rows in the browser
             (`web/test/paged-search.test.ts`, the law; and
             `web/test/tab-facets.test.tsx`, this screen's own suite). Bucketing
             page one into five columns is not that: a ticket has exactly one
             status, every status in `OPEN_TAB_STATUSES` is drawn, so no loaded
             card is dropped — and the moment the toolbar is asking anything,
             every column stops quoting the door's count and falls back to the
             cards it is holding (`narrowed`, above).

             THIS USED TO BE WRITTEN ACROSS THREE LINES ON PURPOSE, because the
             censuses matched the literal `rows.filter(` and a newline walked
             past them. That is a law bending the code it polices, and it went
             the other way on 2026-09-07: both matchers tolerate the whitespace
             now, and the exception is DATA with this reason attached
             (`FIND_NARROWING_OK`, shared/rules/registry.ts) rather than a
             keystroke nobody could see. Lay this call out however reads best. */
          cards: rows.filter((r) => r.status === stage).map(boardCard),
          emptyLabel: t("Nothing at this stage."),
        })),
        /* THE FIFTH COLUMN, AND IT IS NOT A `GROUP BY status` BUCKET — client,
           2026-09-07: "in open, include status ready and waiting / add them
           after". `ready` IS a status and joined `OPEN_TAB_STATUSES` above, so
           it needed no clause of its own. `waiting` is not one and never will
           be: it is a PREDICATE over the ticket's conversation, derived at the
           door on every read (`waitingClause`, workers/content/src/lib/help.ts
           — "we spoke last and nobody has answered"), stored nowhere.
           THREE CONSEQUENCES, EACH DECIDED RATHER THAN INHERITED:
           1 · THE CARDS COME FROM A SECOND READ. `rows` is the Open page and
               carries no waiting flag, so filtering it in the browser is not
               merely wrong-by-paging (R14) — it is impossible. This column is
               fed by the door's own answer to `{status: …, waiting: "only"}`,
               the identical read the Waiting TAB rests on, so the tab and the
               column cannot disagree about who is waiting.
           2 · A CARD APPEARS TWICE, ON PURPOSE, and this is the decision worth
               reading twice. A waiting ticket is also `triaged`/`scheduled`/
               `in_progress`/`ready`, so it is drawn in its stage column AND
               here. Waiting is not a later stage a ticket MOVES to — it is a
               property of a ticket that is sitting in one — so "waiting wins"
               would take a ticket out of the stage it is genuinely in and make
               the four stage columns lie about the work. The overlap IS the
               information, which is the same sentence `waitingClause` and the
               `WAITING` tab constant above already make about the tabs.
           3 · NOTHING SUMS THE COLUMNS, so the repetition costs no total. The
               kit adds nothing up (`footnoteMeta`, its only summary, is the
               caller's and is deliberately not passed). Each column's number is
               its own exact server `COUNT(*)` of its own question: the four
               stages are disjoint terms of one `GROUP BY`, and this one is the
               waiting read's own `total`. The Open TAB's badge stays the sum of
               the four stages ONLY, so the collection is still counted exactly
               once on this screen (R16). The footnote says all of this in the
               reader's own words, because a fifth column beside four is read as
               a fifth bucket unless something says otherwise.
           THE DOT IS READ, NOT WRITTEN, EVEN THOUGH THIS COLUMN IS NOT A
           STATUS — and that is the sharpest form of the 2026-09-07 ruling
           ("status (th header) have no color associated"). `waiting` has no row
           in `helpStatusDotTone` because it is a predicate, so the honest
           question is not "which of the six do I like here" but "what colour
           does this app give the state where the client owes us an answer" —
           and `shared/status-tones.ts`, the file that owns what a status colour
           MEANS, now answers it directly through `waitingDotTone()`. It
           resolves to `blocked`, the tier that file defines as "stuck on
           somebody OUTSIDE the team", which is this column's own sentence.
           IT USED TO ASK `helpStatusDotTone("awaiting_validation")`, AND THE
           CHANGE IS NOT COSMETIC. Borrowing a STAGE's tone to paint a PREDICATE
           kept the right property — the colour was asked for rather than typed,
           so a re-tone moved this column without an edit — by the wrong route,
           and the route stopped existing when the client retired that stage on
           7 Sep 2026. Hard-coding `"blocked"` here would have dropped the
           property with the bug; a named seam keeps both, and waiting now owns
           its colour instead of borrowing one.
           IT IS NOT A FILTER. No card in this column is read by status at all —
           they come from the door's waiting predicate, below.
           NO COUNT WHILE THE TOOLBAR IS ASKING, for the reason the four stage
           columns give: the waiting read is a RESTING one and carries none of
           the toolbar's narrowing, so a searched board would put an
           un-narrowed total over the cards that matched. */
        {
          id: WAITING,
          title: t("Waiting"),
          dot: waitingDotTone() satisfies KanbanColumnDot,
          count: narrowed ? undefined : waitingTotal,
          cards: (waitingRows ?? []).map(boardCard),
          emptyLabel: t("Nothing is waiting on a client."),
        },
      ]}
      // A CARD OPENS THE TICKET, and that is the board's only act. The kit makes
      // a card a target only when this is passed, so the affordance and the
      // behaviour are one decision.
      onCardSelect={(card) => onOpen(card.id)}
      // THE LINE UNDER THE BOARD. The kit draws "Dragging a card moves the
      // record…" there by default and says in its own doc that the words are the
      // caller's, "because 'writes a log line' is an application promise this
      // component cannot keep on its own". This board keeps no such promise, so
      // it says what is true instead: what the numbers mean, and that a card
      // opens rather than moves.
      /* THE LINE UNDER THE BOARD, AND THE WAITING COLUMN IS WHY IT CHANGED.
         Both sentences now say that the last column REPEATS cards from the four
         before it. That is not politeness: five columns side by side are read
         as five buckets, and a reader who adds them up gets a number larger
         than the tab's own badge. Saying it here is the honest fix — the
         alternative was to pull waiting tickets out of their stage columns,
         which would make the four stages lie about the work (see the column
         itself for that decision). */
      footnote={
        narrowed
          ? t(
              "Cards are the tickets that matched, as far as they have loaded. Waiting repeats cards from the stages before it. Click a card to open the ticket."
            )
          : t(
              "Each of the first four columns counts every open ticket at that stage. Waiting repeats those same tickets — the ones where a client owes us an answer — so the columns don't add up to the total. Click a card to open the ticket."
            )
      }
      emptyColumnLabel={t("Nothing at this stage.")}
    />
  )
}

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
function ReadySplit({
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
function TriageQueue({
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
    client: t("a client"),
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

  /** THE TEAM'S OWN TICKET TYPES, each with the colour the client ruled for it
   * — one map, `lib/type-colours.ts`, read by this row and by anything that
   * draws a type after it. A word that map does not know (the retiring
   * "Requirements" and "General", or one a team typed itself) gets the neutral
   * rather than being left off: the vocabulary is the TEAM'S, and a picker that
   * offered only the four the client named would be this screen quietly
   * deciding what a ticket may be. */
  const typeOptions: PickerOption[] = helpTypeOptions.map((v) => ({
    value: v,
    label: v,
    swatch: ticketTypeColour(v),
  }))

  /** WHO IS ON THE TICKET'S APP, falling back to everybody who can be given
   * work — `staffedOn`'s own fail-open, shared with the story form (see
   * `lib/members.ts`). The fallback is not a nicety here: Accept on an Issue
   * cannot proceed without somebody to pick, so an empty list would be a dead
   * end on exactly the apps whose staffing has not been filled in yet. */
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
    staffedOn(assignableMembers(membersQ.data), appStaff, appId).map((m) => ({
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
      <div className="flex flex-col gap-1">
        <EmptyLine concept="triage">{t("Nothing waiting.")}</EmptyLine>
        <p className="text-muted-foreground text-sm">
          {view.onDuty?.userName
            ? // R54: whoever is on triage is one of ours.
              t("No new tickets to sort. {name} is on triage this week.", {
                name: staffNameFromSnapshot(view.onDuty.userName),
              })
            : t("No new tickets to sort. Nobody is on triage this week.")}
        </p>
      </div>
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

                     `inverse` is the loudest tone that is NOT the brand: mango
                     is spoken for by the create button beside it and by Accept
                     on the card, and the kit rules one brand fill per view. It
                     also suits what the control does — it appears only after a
                     decision, and it takes that decision back. If it reads too
                     heavy in use, `secondary` is one word away. */
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
        <EmptyLine concept="triage">{t("Nothing in the triage queue matches what you asked for.")}</EmptyLine>
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
                  {sittingTally.byType.map(([type, n]) => (
                    <Badge key={type} variant="secondary" size="pill">
                      <Swatch colour={ticketTypeColour(type)} />
                      {t("{count} {type}", { count: n, type })}
                    </Badge>
                  ))}
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

                    IT IS STILL THE ONE MANGO ON THE CARD. The kit rules one per
                    view and this is it; the picker row below no longer competes
                    for it, which is the other half of the same evening's ruling
                    (record-picker.tsx's own header: the chosen chip is black
                    now, because mango meant "chosen" in two places at once).

                    DISABLED WHILE A READINESS GAP STANDS, whichever verb it is
                    wearing: the DOOR refuses the move (shared/triage-
                    readiness.ts rides the model, not the route), so an enabled
                    button here would be a button that fails. */}
                {canTriage && (
                  <Button
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

/* WHAT THE TICKET IS CALLED — NOT HERE ANY MORE.
 *
 * `ticketTitle` lived in this file and read `titleEn || titleDe || the first
 * line of the body`, which was the right answer; the ticket COLLECTION'S own
 * table, one tab away, named every row by the description alone. One ticket,
 * two names, on one screen. It moved to `shared/web/ticket-chips.tsx` on
 * 2026-09-06 — the file the client already ruled owns a ticket's face — and
 * `shapeHelpList` (web/components/deep-link/shape.tsx) reads the same function
 * now. Its header carries the three steps and why that order.
 *
 * The move was forced by the same pass that made it worth making: the triage
 * table became the table EVERY row tab draws (`TicketRowsTable` above), so one
 * component over one collection would otherwise have had to pick one of the two
 * answers silently. */

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
 * screen, `web/components/help-detail.tsx`, among them) supplies its own the
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
function TriageChips({
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

/** THE FOUR RECORDS A TICKET POINTS AT — the author, the client, the app and the
 * section — under the words, each wearing its own face, each a link.
 *
 * ══ WHY THIS IS ONE COMPONENT AND NOT FOUR LINES ON THE CARD ════════════════
 *
 * The client is still choosing between three presentations of this block, and
 * said so. So the BLOCK is the unit: the card hands over a ticket and a team,
 * this decides what the four rows ARE (which of them exist, what each one's face
 * is, where each one goes), and the return statement below is the only thing a
 * layout change touches. Swapping the tinted band for a stacked list, a
 * two-column grid or a run of inline chips is one edit in one place, and none of
 * the four destinations, faces or absence rules move with it.
 *
 * ══ THEY ARE LINKS, AND THAT IS R37 RATHER THAN A PREFERENCE ════════════════
 *
 * She asked for links explicitly ("she wants to navigate from them"), and the
 * law decides HOW: the whole post-auth app is one shell that mounts once, so a
 * bare `<a href="/t/…">` throws the document away, re-runs every module from
 * nothing, destroys the warm cache and any running agent, and replays the boot
 * animation — the fault the owner reported on "Manage dropdowns" in exactly
 * those words. `<InAppLink>` is a REAL anchor (middle-click, copy-address and
 * screen readers all still work) with only the plain left click intercepted into
 * `softNavigate`. There is no second way to write this and the census in
 * `web/test/shell-nav.test.ts` reads every component off disk to keep it that
 * way.
 *
 * ══ AND THEY CARRY THEIR FACES, RESOLVED BY THE DOOR (R35) ══════════════════
 *
 * Every one of the four arrives on the triage row already named and already
 * pictured — the client's logo and the author's avatar rode it before today, the
 * app's `logo_url` and the section's emoji were added to `needsTriage` for this
 * block (`workers/content/src/lib/triage.ts` carries the reasoning). NOTHING
 * HERE RESOLVES AN ID. That is not neatness: `accounts` is a paged collection, so
 * a card that looked a client up in the cache this screen holds would have gone
 * blank on the fifty-first client — the bug `record-picker.tsx`'s header is a
 * monument to — and the same trap is one growth spurt away for apps.
 *
 * ══ WHERE EACH ONE GOES, INCLUDING THE AWKWARD ONE ══════════════════════════
 *
 *   AUTHOR   `/accounts/<contactId>`. A contact is a row of the SAME `accounts`
 *            table a company is (SCOPE ch.03) — there is no contacts table, and
 *            `deep-link-screen.tsx`'s own open-intent rewrites `contacts` to
 *            `accounts` for this exact reason. Never a second `/contacts/<id>`
 *            address for a record that already has one.
 *   CLIENT   `/accounts/<accountId>`. The same door, the other kind of row.
 *   APP      `/apps/<appId>`.
 *   SECTION  `/apps/<appId>?tab=modules` — AND THIS ONE IS WORTH READING. A
 *            module has no address of its own anywhere in this product: no
 *            segment in `TEAM_SECTIONS`, no detail recipe, no branch in
 *            `module-content.tsx`, and `relationship-map.tsx` deliberately omits
 *            `app_modules` from its `RECORD_PATH` because a module is a division
 *            OF an app rather than a record with a screen. Two ways to honour
 *            "make it a link": invent `/modules/<id>` and the screen behind it —
 *            a feature nobody asked for, on the strength of one chip — or send
 *            the reader to the one place the module actually is, which is its
 *            app's Modules tab. The tab was not addressable either, so it was
 *            given an address (`app-detail.tsx`, the same six lines
 *            `account-detail.tsx` already uses for `?tab=organisation`). The
 *            module and the app therefore land on the same RECORD and different
 *            TABS, which is the honest picture of what a module is.
 *
 * A ROW WITH NO NAME IS NOT DRAWN, and each absence is ordinary rather than an
 * error: a ticket raised by the agency has no client, one nobody has attributed
 * has no author, a ticket about no app has neither app nor section. Three of
 * those four are readiness gaps, so the card already says out loud why it cannot
 * move — a placeholder here would be the same complaint twice. AND A ROW WITH A
 * NAME BUT NOWHERE TO GO IS DRAWN WITHOUT A LINK rather than dropped: `href` is
 * nullable for the one shape that can occur, a section on a ticket whose app id
 * is missing, where there is genuinely no destination. Losing the fact would be
 * worse than losing the link. */
function TriageMeta({ teamId, ticket }: { teamId: string; ticket: TriageWaiting }) {
  const t = useT()
  /** THE FOUR, DECIDED ONCE. Everything a presentation could want to know is
   * settled here — whether the row exists, what it is called, what its face is,
   * which box that face wears and where it goes — so the JSX below is pure
   * layout and a different layout inherits all of it. `shape` is the one that
   * is easy to get wrong twice: a person in their own right is a CIRCLE and
   * everything else is a rounded square, which is `record-mark.tsx`'s rule and
   * not this file's to restate per row. */
  /* ONE ROW NOW, NOT FOUR — client, 2026-09-06: "at the bottom, in the quiet
     style, just the author with the avatar."

     The client, the app and the module were all here for one round and have
     gone three different ways. The APP moved UP into the eyebrow as a chip, the
     client and the module are simply not on this card any more: they live on
     the ticket, one press of Open away. That is a real subtraction and it is
     hers — the card is scanned forty times a sitting, and every item on it is
     a thing the eye has to reject before it reaches the words the customer
     wrote.

     KEPT AS AN ARRAY OF ONE rather than collapsed into a single node, because
     the shape is what made swapping presentations a one-edit job last round and
     the client has moved this block three times in two days. A second row costs
     one object here, not a rewrite of the render. */
  const rows = [
    ticket.raisedByContactName && {
      key: "author",
      label: t("Raised by"),
      name: ticket.raisedByContactName,
      picture: ticket.raisedByContactLogo,
      mark: null,
      shape: "round" as const,
      path: ticket.raisedByContactId ? `accounts/${ticket.raisedByContactId}` : null,
    },
  ].filter(Boolean) as {
    key: string
    label: string
    name: string
    picture: string | null
    mark: string | null
    shape: "round" | "square"
    path: string | null
  }[]

  return (
    // ── THE DEFAULT PRESENTATION: A TINTED BAND ──────────────────────────────
    // One quiet band under the words, the four rows reading left to right in the
    // order the client named them, thin rules between. `bg-surface-quiet` is a
    // real tone step off the card the queue draws on (and has a dark half of its
    // own), which is what makes this read as a footer to the description rather
    // than as more description. R31: the box radius, the only one a box may
    // take. `flex-wrap` because on a phone four faces and four names do not fit
    // on one line and a horizontally scrolling band is worse than a wrapped one.
    // THE TINT IS GONE WITH THE OTHER THREE ROWS. A band earned its ground
    // when it held four facts that needed separating from the description; one
    // byline does not, and a second quiet block would now sit directly above the
    // picker's own well — two tinted grounds stacked, which is the defect the
    // band was drawn to avoid in the first place. Quiet style, as asked: small,
    // muted, no fill of its own.
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {rows.map((r, i) => (
        <React.Fragment key={r.key}>
          {/* THE THIN RULE, and it is a FILL rather than a border — the same 1px
              tick `record-picker.tsx`'s own divider draws, for the same reason
              (BUILD-A-SCREEN.md §6.1: separation is a fill or an inset shadow,
              never a CSS border). `aria-hidden` because the grouping it marks is
              visual; each row already carries its own label in words. */}
          {i > 0 && <span aria-hidden className="bg-border h-5 w-px shrink-0" />}
          <span className="flex min-w-0 items-center gap-1.5 text-xs">
            {/* WHAT KIND OF THING THIS IS, in words rather than by position.
                Four faces in a row with no labels is a puzzle: an app's logo and
                a client's logo are the same shape, and on the tickets where both
                are wordmarks they are the same KIND of picture too. */}
            <span className="text-muted-foreground">{r.label}</span>
            {/* NO FACE HERE — client, 2026-09-06: "author inside the card is
                no icon." The byline is one linked name under the words now, and
                a 20px round picture beside it was the last decoration on a card
                she has spent a day stripping: the client went, the module went,
                the readiness sentence went, Reply and Edit went. R35 ("a record
                is known by its picture") is not broken by this — it governs
                where a record is OFFERED or LISTED, and this is a byline, not a
                choice. The picker that offers people still draws every face,
                which is where telling two colleagues apart actually matters.

                `picture`/`mark`/`shape` stay on the row above rather than being
                deleted with the element: they are what a different presentation
                would need, and this block has moved three times in two days. */}
            {r.path ? (
              // THE TEAM PREFIX IS COMPOSED HERE, IN A TEMPLATE LITERAL, and
              // that is R20's render-side census rather than a style choice
              // (`web/test/rich-text.test.ts`): every URL bound to an anchor in
              // either front door must be a literal we wrote, an inline
              // `safeHref(…)`, or a named exemption. Handing the attribute a
              // field off a row object is none of those, and it is refused for a
              // good reason — a URL arriving from an object is a URL a reviewer
              // cannot see the origin of. So the row above carries the
              // RECORD-RELATIVE address (`accounts/<id>`, a fixed segment and an
              // id) and the shell prefix is written where the anchor is.
              // `InAppLink` puts the whole thing through `safeHref` again on the
              // way to the DOM, which is its own seam and not this file's to
              // repeat.
              //
              // AND THAT CENSUS READS RAW SOURCE, comments included — so this
              // paragraph may not spell the attribute-plus-brace shape it is
              // about, or it reports itself. Learned here, the ordinary way.
              <InAppLink
                href={`/t/${teamId}/${r.path}`}
                className="text-foreground truncate underline-offset-2 hover:underline"
              >
                {r.name}
              </InAppLink>
            ) : (
              // NO DESTINATION, SO NO LINK — never a dead anchor. See the
              // header: this is the section-without-an-app case, and the fact
              // is worth more than the affordance.
              <span className="text-foreground truncate">{r.name}</span>
            )}
          </span>
        </React.Fragment>
      ))}
    </div>
  )
}

/** WHAT THEY ATTACHED, to the RIGHT of the words — the half of the client's
 * horizontal split that keeps the card short.
 *
 * IT DRAWS NOTHING AT ALL WHEN THERE IS NOTHING, including while the read is in
 * flight: an empty column with a heading over it on the ninety per cent of
 * tickets that carry no file would be a promise the card cannot keep, and a
 * skeleton in the same place would make every card jump as its answer landed.
 * The description simply takes the whole width, which is the layout a ticket
 * with no attachment wants anyway.
 *
 * PICTURES ONLY, and everything else as a named line. `AttachmentPreview` (the
 * shared seam both this and the ticket's own screen draw through) returns null
 * for a link and for any file that is not a renderable image, so a PDF or a
 * spreadsheet would leave a labelled gap — hence `hasPreview` deciding here
 * which of the two shapes each row takes. Both go through `safeHref`/`safeSrc`
 * inside those seams, which is R20's render-side twin and not this file's to
 * repeat. */
function TriageAttachments({
  attachments,
  countLabel,
}: {
  attachments: HelpAttachment[] | undefined
  countLabel: string
}) {
  if (!attachments || attachments.length === 0) return null
  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:w-48 sm:shrink-0">
      <span className="text-muted-foreground text-micro uppercase">{countLabel}</span>
      <div className="flex flex-col gap-2">
        {attachments.map((a) =>
          hasPreview(a.kind, a.contentType) ? (
            <AttachmentPreview key={a.id} kind={a.kind} url={a.url} contentType={a.contentType} />
          ) : (
            <span key={a.id} className="text-muted-foreground flex items-center gap-1 truncate text-xs">
              <Paperclip aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">{a.label}</span>
            </span>
          )
        )}
      </div>
    </div>
  )
}
