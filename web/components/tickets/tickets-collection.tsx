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

import { Text } from "@shared/ui/components/typography/typography"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { defaultTabsConfig, renderFolderTabs } from "@shared/web/screen-engine/tabs-view"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import { useRemembered } from "@shared/web/remembered"
import { Button } from "@shared/ui/components/button/button"
import { type ScreenIntent } from "@shared/web/screen-engine/screen-renderer"
import { Badge } from "@shared/ui/components/badge/badge"
/* THE BOARD AND THE SPLIT — the kit's own, vendored, and both adopted in this
   pass (their `KIT_COMPONENT_EXEMPT` lines were deleted by the same commit —
   R46's rot-check refuses an exemption for a part that is reached). Neither is
   drawn app-side: `OpenBoard` and `ReadySplit` below supply rows and a pane. */
/* `KanbanColumnDot` USED TO BE IMPORTED BESIDE IT, for the tone each column
   head wore. The client took the colour off the column heads on 2026-09-09 (the
   ruling is written out at `COLUMN` below), the kit's `dot` prop is optional and
   is simply not passed any more, so the type has nothing left to constrain. */
import { Kanban } from "@shared/ui/components/kanban/kanban"
/* THE LIST VIEW'S TABLE, composed from the kit's own primitives rather than
   drawn through `RecordTable` — the reason is written out at the `triageView
   === "list"` branch below, and it is R16's: `RecordTable` brings
   `CollectionFrame`, which brings a second search box and a second count onto a
   screen that already has one of each. */
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@shared/ui/components/table/table"
import { Kanban as KanbanGlyph, ListBullets, SquareSplitHorizontal } from "@shared/ui/foundations/icons"
import type { FilterFacet, SortOption } from "@shared/web/screen-engine/config"

import { RecordRef } from "@shared/web/record-ref"
import { ticketTitle } from "@shared/web/ticket-chips"
import { applyClickGesture, clickGesture, rowOpenHandlers } from "@/lib/row-open"
import { CollectionHeading } from "@/components/records/collection-heading"
import { CountedAbove } from "@/components/records/counted-tabs"
import { ModuleSettingsGear } from "@/components/screens/module-settings-screen"
import { LoadMore } from "@/components/records/load-more"
import { PagedFind } from "@/components/records/paged-find"
// THE LABELS ONLY. The collection's DEFAULT sort used to be read here too and
// is not any more: which order a tab opens in is a per-tab answer now
// (`helpTabSorts`), and a screen holding both would be two places deciding one
// thing — with the tab's answer silently losing on whichever prop forgot.
import { translatedSorts } from "@/lib/collection-sorts"
import { translatedFacets } from "@/lib/collection-filters"
import { AddButton, CollectionCard, CollectionEmptyBody, type ToolbarViewSlot } from "@/components/deep-link/screen-bits"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import { TriageStrip } from "@/components/tickets/triage-strip"
import { TicketsDashboard } from "@/components/tickets/tickets-dashboard"
import { CONCEPT_ICON } from "@/lib/pages"
import { tenancy } from "@/lib/api/tenancy"
import { content as contentApi } from "@/lib/api"
import type { HelpAccountFacet, TriageWaiting } from "@/lib/api/content"
import { AppMark } from "@/components/apps/app-tiles"
import { Swatch } from "@/components/records/record-picker"
import { orderTicketTypes } from "@/lib/type-colours"
import { ticketTypeIconName } from "@shared/ticket-types"
import { Icon } from "@shared/web/screen-engine/icon"
import { HELP_STATUS } from "@/components/deep-link/shape"
import { RecordMark } from "@shared/web/record-mark"
// R54 — the "Raised by" column's own trim, the same one `work-panels.tsx`'s
// identical column already applies to a colleague's stored snapshot.
import { staffNameFromSnapshot } from "@shared/staff-name"
/* ONE READER OF THIS FILE LEFT, AND IT IS THE STATUS FILTER. `helpStatusDotTone`
   still fills the swatch on each option of the Status facet below (`DOT_TONE_FILL`
   + `helpFacets`), which is a menu of STATUSES and is untouched by the 2026-09-09
   ruling — she took the colour off the board's COLUMN HEADS, not off the app's
   idea of what a status colour is. `waitingDotTone` came with it until that day
   and is gone from `shared/status-tones.ts` entirely: the board's Waiting column
   was its only caller, and an export nobody imports is a contract nobody agreed
   to (web/test/dead-exports.test.ts). */
import { helpStatusDotTone } from "@shared/status-tones"
import type { AppStageDotTone } from "@shared/app-stages"
import { accountsKey, appsKey, helpByAccountKey, helpFacetFilter, helpFacetKey, helpKey, helpTabColumns, helpTabFacets, helpTabOrder, helpTabSorts, listFetch, TICKET_COLUMN_ORDER, TICKET_COLUMNS_DEFAULT, OPEN_FACET, totalKey, WAITING_FACET, type HelpFacet, type TicketColumn } from "@/lib/live-resources"
import { formatCount } from "@shared/web/format-count"
import { formatDate } from "@shared/web/format"
import { useCached, useCachedValue } from "@shared/web/store"
import { useLanguage, useT } from "@shared/web/language"
import type { Language, Vars } from "@shared/i18n"
import { HELP_STATUSES, OPEN_TAB_STATUSES } from "@shared/types"
import type { Account, AppRow, HelpStatus, HelpTicket, TeamMember } from "@shared/types"
import { richTextPlain } from "@shared/web/rich-text"
import { TriageChips } from "@/components/tickets/triage-chips"
import { ReadySplit } from "@/components/tickets/ready-split"
import { TriageQueue } from "@/components/tickets/triage-queue"

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
 * `helpStatusDotTone` (shared/status-tones.ts) answers "which of the kit's ten
 * dot tones is this stage" (six lifecycle + four widened, since the 17 Sep
 * 2026 ruling) and `Badge` turns that into a Tailwind class of its
 * own (`DOT_FILL`, badge.tsx). The Status facet does not draw a `Badge` — a
 * badge carries the word, and inside a facet option the word is already there —
 * so it needs the same answers as a CSS colour value, which is the one form
 * `<Swatch>` takes (and the same shape `type-colours.ts` hands back for exactly
 * this reason: one value an inline style, an SVG fill and a chart series can
 * all read).
 *
 * A `Record<AppStageDotTone, …>` RATHER THAN AN INTERPOLATED
 * `var(--dot-${tone})`, and that is the whole point of writing it out: a
 * seventh tone added to the kit fails this file's own type check instead of
 * rendering a swatch filled with an undefined custom property, which paints
 * nothing and looks like a missing dot. It is the same argument
 * `status-tones.ts` makes about typing its own map as a `Record<HelpStatus,
 * …>` instead of a function with a fallback. WIDENED PAST THE ORIGINAL SIX,
 * 17 Sep 2026 — `helpStatusDotTone` now reaches the same four extra tones
 * `shared/app-stages.ts` uses for App stage (`AppStageDotTone`), because a
 * ticket's own stages do too ("triaged orange … ready blue … scheduled
 * purple").
 *
 * R32-CLEAN: every value is a token the kit defines, never a hex and never a
 * Tailwind ramp. The two greens are genuinely one colour (`--dot-shipped` and
 * `--dot-done` both resolve to the forest — badge.tsx's own note), which is a
 * NAMING split rather than a palette one and is why the closed/finished pair is
 * still distinguishable here only by its word. That is fine and is the house
 * rule rather than a defect: the mark never carries the meaning alone. */
const DOT_TONE_FILL: Record<AppStageDotTone, string> = {
  shipped: "var(--dot-shipped)",
  building: "var(--dot-building)",
  review: "var(--dot-review)",
  blocked: "var(--dot-blocked)",
  archived: "var(--dot-archived)",
  done: "var(--dot-done)",
  red: "var(--dot-red)",
  orange: "var(--dot-orange)",
  purple: "var(--dot-purple)",
  blue: "var(--dot-blue)",
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
            const label = a.accountName ?? t("An account")
            return {
              value: a.accountId,
              label,
              // FILL, NEVER FIT (R60, client 2026-09-09). This used to read the
              // account's TYPE to decide the crop — a sole trader's photograph
              // cropped, a company's wordmark contained — which is why `known`
              // was looked up at all. The ruling removed that choice from the
              // product, so the lookup is now only for the LOGO, and an account
              // this screen's page-one cache has never heard of falls through to
              // its own initial exactly as it always did.
              mark: <RecordMark picture={known?.logoUrl ?? null} name={label} size="choice" />,
            }
          })
          .sort((a, b) => a.label.localeCompare(b.label))
      : [],
    // APP — the bounded apps list, each option wearing the app's own `AppMark`
    // (the client, 2026-09-06: "on filter app i wanna see the icon of the app").
    // `choice` is the dense mark size the picker's own option rows use, which is
    // exactly this context.
    //
    // AND EACH ONE CARRIES WHOSE IT IS — client ruling, 2026-09-09, on a
    // screenshot of THIS control: "filter the apps by selected client!"
    // `within` is the app row's own `accountId` passed straight through, never
    // a second idea of which apps are whose, and the narrowing itself happens
    // once in `useFilterBar` (the declaration is on `COLLECTION_FILTERS.help`'s
    // `appId`; both carry the ruling in full). Three things follow from it and
    // none of them is decided here: the list narrows to the chosen client's
    // apps, the control says "Choose an account first." until there is one, and a
    // stranded app clears itself when the client moves.
    //
    // WHY THE BROWSER'S OWN LIST IS THE HONEST SOURCE, and this is the R14
    // question asked properly rather than waved at. The apps door narrows by
    // exactly this column when it is asked to (`GET /api/tenancy/apps?accountId=`
    // → `appsWhere`, workers/tenancy/src/lib/processes.ts), so the door's
    // answer and this filter's answer are the same expression over the same
    // field. What makes filtering in hand equal to asking is that `apps` is
    // BOUNDED and read WHOLE — "an app is a whole built system, and an agency
    // has tens of them, not thousands" (`listApps`' own header) — so the rows
    // the browser holds ARE the collection, not a page of it. That is precisely
    // the property the Client facet beside this one does NOT have, which is why
    // it reads the door's grouped tally instead of the accounts cache. Two
    // controls, two sources, one rule: ask whoever holds the whole answer.
    // A second door read per client pick would buy nothing and cost R56.
    appId: tabFacets.appId
      ? apps
          .map((a) => ({
            value: a.id,
            label: a.name,
            mark: <AppMark app={a} size="choice" />,
            within: a.accountId,
          }))
          .sort((a, b) => a.label.localeCompare(b.label))
      : [],
    // TYPE — the TEAM'S OWN `Ticket type` words, in the client's fixed reading
    // order (`orderTicketTypes`: issue, question, request, extra, then anything
    // this order has never heard of, in the order it arrived). Each wears the
    // ICON ruled for it (client, 17 Sep 2026: colour is the status's alone now,
    // ticket type gets an icon), through the same `ticketTypeIconName` +
    // `iconComponent()` pair the rows, the chips and the triage picker draw —
    // so the glyph a person filters by and the glyph they read back are one
    // object.
    //
    // THE WORDS ARE NOT TRANSLATED and the field's label is: `helpType` is a
    // dropdown value a team typed itself, so it is DATA rather than copy, and
    // `t()` would be looking a sentence up that is not in the catalogue (R28's
    // own distinction; `triageFacets` below says the same about the same list).
    //
    // AND THE RETIRED KIND IS SUBTRACTED AGAIN HERE. `helpTypeOptions` already
    // excludes it (use-screen-data.ts), the door already refuses to answer about
    // it and already refuses to create one — this is the fourth fence and it is
    // A SECOND SUBTRACTION OF THE RETIRED KIND STOOD ON THIS LIST — deliberate
    // belt-and-braces over a list that was already filtered, because a facet
    // offering a word whose rows the door had excluded reads as an empty
    // collection rather than as an impossible question. It went on 15 Sep 2026
    // with the kind (`shared/ticket-types.ts`): every word the team's vocabulary
    // now holds is a word the door will answer about.
    helpType: tabFacets.helpType
      ? orderTicketTypes(helpTypeOptions).map((v) => {
          const iconName = ticketTypeIconName(v)
          return {
            value: v,
            label: v,
            mark: iconName ? <Icon name={iconName} className="text-muted-foreground size-3.5 shrink-0" /> : undefined,
          }
        })
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
export const TRIAGE_SORTS: SortOption[] = [{ value: "raised", label: "Raised", defaultDir: "asc" }]

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
 * quietly says "An account" for every app past the window. The name rides the row
 * now, so the words in this menu and the words on the card are one answer.
 *
 * A FACET WITH NOTHING TO OFFER IS NOT DRAWN, the same subtraction
 * `translatedFacets` makes for the paged screens: a select whose only content is
 * its own placeholder is a control that cannot do anything, and `useFilterBar`
 * counts it toward the pill's number all the same. */
/* THE FACETS WEAR THE SAME MARKS THE RECORDS DO — client, 2026-09-06: "in
   filter type i want to see the colored dot / on filter app i wanna see the
   icon of the app." SUPERSEDED FOR TYPE, 17 Sep 2026: "the one that gets the
   chip with the color is always the status … for tickets, we need to find
   icons for the ticket type" — so the Type facet's mark is `ticketTypeIconName`
   now, not a dot; the App facet's own icon mark is untouched, it was never a
   colour to begin with.

   `FacetOption.mark` is a NODE the caller draws, not a colour or an icon name,
   for the same reason `ticket-chips.tsx` takes its dot and its link as props:
   the facet machinery lives in `shared/web/`, which both front doors read, and
   `ticketTypeIconName` / `AppMark` are `web/`-only. The kit needed no change —
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
     it arrived (`orderTicketTypes`, web/lib/type-colours.ts, where the order
     still lives even though the colours beside it no longer draw here). It sorted
     alphabetically until 2026-09-07, which put Extra first and was invisible
     while this was the only Type menu on the screen; the list tabs' toolbar has
     one now, and two Type menus in two different orders on one screen is the
     kind of drift the client has twice told us to stop.
     A SECOND FENCE AGAINST THE RETIRED KIND stood here over an empty set, and
     went with the kind on 15 Sep 2026 (`shared/ticket-types.ts`). These options
     are built from the WORDS ON THE CARDS, so a ticket filed years ago under a
     word the vocabulary no longer holds still gets its own entry here — which is
     the right answer for a menu whose job is to narrow the rows in front of
     somebody, and the same ruling `orderTicketTypes` makes about a word its
     order has never heard of. */
  const types = orderTicketTypes([
    ...new Set(rows.map((w) => w.helpType).filter((v): v is string => Boolean(v))),
  ]).map((v) => {
    const iconName = ticketTypeIconName(v)
    return { value: v, label: v, mark: iconName ? <Icon name={iconName} className="text-muted-foreground size-3.5 shrink-0" /> : undefined }
  })
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
      //
      // AND WHOSE IT IS, so this menu narrows to the chosen client exactly as
      // the list tabs' own App menu does (client ruling, 2026-09-09 — the
      // declaration and the whole argument are on `COLLECTION_FILTERS.help`'s
      // `appId`; the narrowing is `useFilterBar`'s). It is the APP'S OWN
      // `accountId` here too, not the client on the ticket the app turned up
      // on, and that is the point: this is one screen with two tabs, and an App
      // control that narrowed by one rule on Triage and another on Open would
      // be the drift the client has twice told us to stop — two Type menus in
      // two different orders on this exact screen is the fault that ordering
      // note three functions up exists to record.
      //
      // AN APP THE APPS LIST DOES NOT HOLD IS "OWNED BY NOBODY" (`null`), which
      // means it is offered under EVERY client rather than under none. Same
      // direction of failure as the missing mark above: an option we cannot
      // fully describe keeps its place instead of disappearing, because the
      // rows behind it are real and a filter that cannot reach them is worse
      // than one that offers a word without a picture.
      return {
        value,
        label,
        mark: row ? <AppMark app={row} size="choice" /> : undefined,
        within: row?.accountId ?? null,
      }
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
     THE SHAPE IS A SQUARE, which is what a CLIENT wears everywhere in this app
     (`shape.tsx`'s accounts list carries the ruling: one list, one column, and
     two shapes in it read as two kinds of record).
     AND THE FIT IS NO LONGER A QUESTION HERE, which retired the awkwardest half
     of this note. It used to read: the crop a sole trader's photograph needs is
     not available on this row — a triage row carries a name and a logo and not
     the account TYPE — so the contain is unconditional, letterboxing a face
     rather than cropping one, on the reasoning that a whole picture in the wrong
     box beats a cropped one. R60 (client, 2026-09-09: "everywhere for images: do
     fill, not fit!") makes every picture fill its box, so this row and the list
     tab's own facet now draw the identical mark from the identical two facts,
     and the type it could not see is a type nothing needs. */
  const accountsSeen = new Map<string, { label: string; logo: string | null }>()
  for (const w of rows)
    if (w.accountId)
      accountsSeen.set(w.accountId, { label: w.accountName ?? t("An account"), logo: w.accountLogo })
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
    { field: "accountId", label: t("Account"), control: "select" as const, options: accountOptions },
    // APP HANGS OFF CLIENT — the same declaration the list tabs make through
    // `COLLECTION_FILTERS.help`, written out here because this queue builds its
    // facets from the rows rather than from that table. Same field, same
    // sentence, same behaviour; `useFilterBar` is the one thing that acts on it.
    {
      field: "appId",
      label: t("App"),
      control: "select" as const,
      options: appOptions,
      dependsOn: { field: "accountId", emptyText: t("Choose an account first.") },
    },
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
export function narrowTriage(
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
 *   Extra    → "Accept"  same word and the same act as Question. An Extra
 *                        does NOTHING to the client in this version: no
 *                        validation request, no portal state, no mail. It is
 *                        `accept`, unchanged.
 *
 * EXTRA STOPPED SAYING "Store" ON 20 SEP 2026. Her ruling on the triage list
 * view, verbatim: "remove the store button." The word named the whole of what
 * it did honestly ("put away for later", nothing else happens) and that
 * honesty was the problem: a button that files a decision and acts on
 * nothing beyond that is not a decision a reader can tell apart from
 * "Accept" by anything but the label. It is dropped here rather than
 * disabled, so an Extra now takes the identical path as a Question — one
 * fewer word for the same act, not a fifth kind of nothing.
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
 * ANYTHING ELSE FALLS BACK TO "Accept" AND ASKS FOR NOBODY, which covers a word
 * this app no longer has a kind for ("General", or one a team typed before the
 * group was locked at four on 15 Sep 2026) and a ticket with no type at all. The
 * same shape `type-colours.ts` keeps for the same vocabulary: the four are
 * answered, and anything else gets the neutral rather than being special-cased
 * or refused. */
export function triageAct(
  helpType: string | null | undefined,
  t: (english: string) => string
): { label: string; assigns: boolean } {
  switch ((helpType ?? "").trim().toLowerCase().replace(/s$/, "")) {
    case "issue":
      return { label: t("Assign"), assigns: true }
    case "request":
      return { label: t("Plan"), assigns: true }
    default:
      return { label: t("Accept"), assigns: false }
  }
}

/** THE TRIAGE DECISION'S OWN TWO DOOR CALLS, SHARED — Aurora's ruling, 20 Sep
 * 2026, verbatim: "when ticket is in status triage, also in main screen the
 * visible buttons should change: same as in queue." The ticket detail head
 * (`help-detail.tsx`) now offers the identical decision the queue's own row
 * does while a ticket sits at `new`, and "identical" has to mean the same
 * two door calls, not two hand-written copies that could quietly drift the
 * day one of them changes. Assign first, when a person is named, so nobody
 * is left triaged-and-unowned if the second call fails — `TriageQueue.accept`'s
 * own ordering, unchanged, just named so a second caller can reuse it.
 *
 * CALLERS OWN THEIR OWN BUSY STATE, CACHE ABSORPTION AND TOAST. This is only
 * the two doors: `TriageQueue` folds the result into its sitting's own
 * bookkeeping (`decided`/`assigned`/`skipped`); the detail head folds it into
 * the single ticket's own caches instead. Neither belongs here. */
export async function acceptTriagedTicket(id: string, assignTo?: string) {
  if (assignTo) await contentApi.addStakeholder(id, assignTo)
  return contentApi.triageRead(id)
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
  can: (module: string, right: "read" | "create" | "update" | "delete") => boolean
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
  /* WHICH BODY EACH OF THE THREE MULTI-VIEW TABS IS SHOWING — Open and Ready
   * from the start, All since 17 Sep 2026 (see the third hook's own note,
   * just below).
   *
   * ONE PIECE OF STATE PER TAB, NOT ONE KEYED BY ALL OF THEM, and that is
   * `useRemembered`'s own contract rather than a style choice: it reads its
   * slot ONCE, at mount ("the host owns the address; while this screen is up,
   * the screen owns the value"), so a key built out of `facet` would be read
   * for whichever tab happened to be open on the first render and never
   * again. Three hooks, all unconditional, each remembered under its own
   * name.
   *
   * REMEMBERED RATHER THAN PLAIN STATE, which is `ViewSwitch`'s own rule: a view
   * is a PERSON'S preference, per person and never in a store a colleague
   * shares. Scoped per tab so choosing the board on Open does not decide
   * anything on Ready or All — three different questions about three
   * different piles.
   *
   * THE TWO OTHER ROW TABS (WAITING, CLOSED) HOLD NO STATE AT ALL. They have
   * one body, so there is nothing to remember; `viewSlot` hands the kit a
   * single view and the kit draws its name. */
  const [openView, setOpenView] = useRemembered<"list" | "board">("ticket-open-view", "list")
  const [readyView, setReadyView] = useRemembered<"list" | "split">("ticket-ready-view", "list")
  /** ALL GETS A BOARD TOO — client, 17 Sep 2026: "Also add this board view by
   * status in general tickets, all." A third piece of remembered state, for
   * the identical reason the two above are two and not one: `useRemembered`
   * reads its slot once at mount, so a key built from `facet` would freeze on
   * whichever tab happened to be open first. See `AllBoard`'s own header for
   * what the board draws and why it needs none of Open's fifth-column
   * machinery. */
  const [allView, setAllView] = useRemembered<"list" | "board">("ticket-all-view", "list")
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
     WHAT CARRIED THE KIND FROM 2026-09-07 WAS THE COLOUR — `Swatch` +
     `ticketTypeColour` (web/lib/type-colours.ts) on the row's pill, the chip
     line, the picker option and the Type facet, one map so a kind's colour
     could not be decided twice. Her own sentence for that cell then: "Type
     with the colors, same as we have with the chips." SUPERSEDED, 17 Sep
     2026: "the one that gets the chip with the color is always the status …
     for tickets, we need to find icons for the ticket type." What carries the
     kind now is an ICON, through the identical single-map shape —
     `ticketTypeIconName` (shared/ticket-types.ts) resolved via
     `iconComponent()` — on the same four surfaces, so a kind's glyph still
     cannot be decided twice.
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
  /** THE STAFF RAISER'S FACE (R35, client ruling 18 Sep 2026: "on column
   * raised by i am missing the avatar") — the team's own members cache, the
   * same key `AppTicketsPanel` (work-panels.tsx) and `TriageQueue` already
   * hold (`members:<teamId>`, R56: one door, one key), read HERE too so the
   * top-level list's own `TicketRowsTable` call below can resolve a staff
   * raiser's picture through `memberFace` instead of drawing only their
   * initial. This cache was never read on this screen before today — the
   * app tab resolved it locally and the top-level list simply did not. */
  const membersQ = useCached<TeamMember[]>(`members:${teamId}`, () =>
    tenancy.members().then((r) => r.members)
  )
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
    // ALL GETS THE BOARD TOO — client, 17 Sep 2026. Same shape as Open's
    // branch above, a different pair of states, because `useRemembered`'s own
    // rule (see its declaration) is one hook per tab that has something to
    // remember.
    if (facet === ALL)
      return {
        views: [list, { value: "board", label: t("Board"), icon: <KanbanGlyph className="size-4" /> }],
        value: allView,
        onValueChange: (v: string) => setAllView(v === "board" ? "board" : "list"),
      }
    // ONE VIEW, AND THE KIT SAYS SO RATHER THAN THE ROW LOSING ITS LAST
    // ELEMENT. The handler is written out as a no-op with its reason rather than
    // omitted — `ToolbarViewSlot` requires one, the static label is not a
    // control and can never call it, and a handler that quietly did something
    // else would be worse than one that plainly does nothing.
    return { views: [list], value: "list", onValueChange: () => {} }
  })()

  /* THE TOOLBAR'S ORDER CONTROL FOR THE TAB THAT IS OPEN — client, 2026-09-09:
     "in closed tickets, I want to be able to sort by created date and closed
     date only. Remove the rest."

     PER TAB BY THE SAME RULE THE FACETS TAKE, and settled in the same place for
     the same reason: `helpTabSorts` (web/lib/live-resources.ts) reads the tab
     TOKEN and is driven directly by a test, which a control set spelled inside
     a render can never be. Its whole argument — including why `closed` is the
     one name DERIVED (a tab pinned to the resolved stage) rather than dictated
     — is written out there. Read it before changing anything here.

     A FILTER OVER THE COLLECTION'S OWN OPTIONS, NOT A SECOND LIST OF THEM: the
     labels stay the ones `translatedSorts` already put through the reader's
     language (R28), and this can only SUBTRACT. A tab cannot invent a sort the
     door has never heard of, because there is nothing here to invent one from.

     WHAT THE CONTROL DRAWS ON CLOSED: two options — a real choice, so the
     ordinary chip. Neither the empty case nor the one-option case arises from
     her ruling (two names are two), and if a later one ever cut it to one, the
     chip should go rather than shrink: `showSort` in paged-find.tsx already
     withdraws it at zero. That is deliberately the OPPOSITE of `ViewSwitch`'s
     ruling one slot along, where a lone view draws a static label — a view pill
     names WHERE YOU ARE among places you could be, so it still says something
     alone; a sort names an ACT, and "Newest first" beside no alternative is a
     fact about the list that the list is already showing.

     COMPUTED HERE AND NOT AT THE PROP, for the reason `ticketFacets` gives just
     below: `facets-ask-the-door` and `paged-sort` both read a FIXED window
     after the `<PagedFind>` tag, and an argument this long inside it would push
     the props those censuses have to see out the far end. */
  const tabSorts = helpTabSorts(facet)
  const sortOptions = translatedSorts("help", t).filter((o) => tabSorts.options.includes(o.value))

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
        {/* THE GEAR — *"on each module, we have a settings gear"* (client,
            2026-09-09), top right of the screen, icon only. It goes in the
            heading's own `action` slot and NOT in the toolbar, because
            `<ToolbarRow>` draws nothing at all on an empty collection (R50) and
            a team with no tickets yet is precisely when somebody goes looking
            for the ticket types. `ModuleSettingsGear` draws itself or nothing —
            it asks the settings page's own gate rather than repeating it here,
            so a reader who may see tickets but not the team's vocabulary is
            never offered a door that would refuse them.

            ONE LINE, AND IT HAS TO STAY ONE LINE. `rules.test.ts`'s R16 ii
            census asks whether any component file CONTAINS the literal
            `<CollectionHeading sectionKey="tickets"` — a substring, not a
            parse — so breaking these props across lines makes the Tickets
            screen read as a collection with no heading at all and turns
            `counted-collections` red. Proved on 2026-09-09 by doing exactly
            that. */}
        <CollectionHeading sectionKey="tickets" total={shownTotal} action={<ModuleSettingsGear teamId={teamId} segment="tickets" />} />
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
          {/* `tight` — Aurora, 21 Sep 2026: "on tickets, reduce space above
              and under toolbar to 10px." The strip's own trailing gap (R63
              part 3, 20px) was stacking on top of the card's 10px lead
              (R83 ruling 7) for 30px total above the toolbar; `tight` drops
              the strip's own half to zero so only the ruled 10px remains.
              Scoped to this one call site (`FolderTabStrip.tight`,
              shared/web/screen-engine/tabs-view.tsx) — every other
              `renderFolderTabs` host keeps the ordinary 20px. Covers board
              and split for free: both render inside this same strip. */}
          {renderFolderTabs({
            config: tabsConfig,
            value: facet,
            onValueChange: (v) => setFacet(v as HelpFacet),
            tight: true,
          })}

          {facet === TRIAGE ? (
            <CollectionCard surface="plain">
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
                canTriage={can("help", "update")}
                canEdit={can("help", "update")}
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
               (`content.helpDashboard`). The two cards still exist and are
               still drawn where they belong: `TicketStagesCard` on Home's
               band, beside the hours.

               STILL NOT INSIDE A `CollectionCard`. Every other branch here is
               one card holding one collection; this branch is five panels of
               its own, and wrapping THEM in a sixth card would put a card
               inside a card — CLAUDE.md's own `useKitPanel` note calls that
               the broken combination. The panels are bare on the shell's own
               pane and always will be.

               NO TOOLBAR AT ALL ANY MORE — client ruling, 17 Sep 2026:
               "Remove the toolbar from the tickets dashboard." It carried a
               search box (7 Sep 2026: "still missing full toolbar!"), two
               facets and a create button; the whole row is gone with this
               ruling, `<TicketsDashboard>` no longer accepts `standsOn`,
               `viewSlot` or `actions` (nothing left to draw them into), and
               every OTHER tab on this strip keeps its own toolbar — this is
               a named, reasoned exception (UI-RULEBOOK.md K37), not a rule
               change. */
            <TicketsDashboard
              teamId={teamId}
              helpTypeOptions={helpTypeOptions}
              // R50's own question, asked of the WHOLE collection: `totals.help`
              // is the door's exact COUNT(*) of the everyday list. A team with
              // no tickets at all draws one welcoming sentence and nothing else.
              ticketTotal={totals.help}
            />
          ) : scopedQ.error ? (
            <CollectionCard surface="plain">
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
              // PER TAB — built above as `sortOptions`; the rule is `helpTabSorts`.
              sorts={sortOptions}
              defaultSort={tabSorts.defaultSort}
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
                    // …then the tab's own resting ORDER (`helpTabOrder`, and
                    // its header says why it is not a key in the filter above).
                    ...helpTabOrder(facet),
                    ...query,
                    cursor,
                  })
                  .then((r) => ({ rows: r.tickets, nextCursor: r.nextCursor, total: r.total }))
              }
              // THE ONE CARD — toolbar, then rows — the same join Accounts draws
              // (`collection-content.tsx`'s own `wrap`): zero gap to the tab row
              // above, which is this component's own flex column rather than a
              // second `gap-*` here.
              wrap={(inner) => <CollectionCard surface="plain">{inner}</CollectionCard>}
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
                      /* R62, 2026-09-09 — ONE REGISTER FOR BOTH ZEROS. This
                         was an `EmptyLine`: one grey line with a glyph, on the
                         app's busiest collection, while every panel beside it
                         drew the full register. `filtered` picks the words —
                         "Nothing matched." mid-search, the collection's own
                         line at rest — and it withdraws the create action, which
                         is why none is handed over here either way: the BUTTON
                         is already on screen, `raiseTicket` in the toolbar
                         directly above this, which is where the client ruled it
                         belongs ("that button belongs in the right of the
                         toolbar, part of the toolbar"). */
                      /* CollectionEmptyBody (screen-bits.tsx) gives this its
                         own paper on the plain frame this PagedFind's `wrap`
                         draws above (line ~1604) — a no-op on any boxed
                         CollectionCard, which is already paper. The toolbar
                         above is OUTSIDE this wrapper, so it stays flush on
                         the page either way. */
                      <CollectionEmptyBody>
                        <CollectionEmptyState
                          filtered={found.active}
                          title={t("No tickets here yet.")}
                        />
                      </CollectionEmptyBody>
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
                    ) : facet === ALL && allView === "board" ? (
                      // "Also add this board view by status in general
                      // tickets, all" — the SAME `byStatus` read the strip's
                      // own badges use above, so this board's numbers can
                      // never disagree with the tab strip they sit under.
                      <AllBoard
                        teamId={teamId}
                        rows={rows}
                        counts={byStatus}
                        narrowed={found.active}
                        onOpen={openTicket}
                      />
                    ) : (
                      // WHICH COLUMNS THIS TAB SHOWS — `helpTabColumns`, the
                      // rule beside the facets' and the sorts' (client,
                      // 2026-09-09: "ID, created date, closed date. Remove the
                      // rest," about Closed). Every other tab gets the four she
                      // ruled on 2026-09-06 and this call site does not know
                      // which is which.
                      <TicketRowsTable
                        rows={rows}
                        onOpen={openTicket}
                        label={t("Tickets")}
                        teamId={teamId}
                        columns={helpTabColumns(facet)}
                        members={membersQ.data}
                      />
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
          <TriageStrip teamId={teamId} canSetDuty={can("help", "update")} />
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
export type TicketFace = {
  id: string
  ref: string | null
  helpType: string | null
  appName: string | null
  /** THE APP'S OWN FACE (R35, client ruling 2026-09-15: "add the logos to
   * account and app … identify everywhere else where it makes sense") — the
   * App column's leading mark. Named `appLogo`, not `appLogoUrl`: it is the
   * same field `TriageWaiting` already carries (`workers/content/src/lib/
   * triage.ts` resolves it at the door, same reasoning as `accountLogo`
   * beside it there), and `HelpTicket` now resolves the identical column
   * (`TICKET_COLS`, `workers/content/src/lib/help.ts`) so both real row
   * shapes this generic table draws answer to one name rather than two. */
  appLogo: string | null
  createdAt: string
  titleDe: string | null
  titleEn: string | null
  description: string
  /** WHEN IT WAS CLOSED, and the ONE optional fact on this type.
   *
   * Optional because the two row shapes genuinely differ about it rather than
   * because one of them forgot: `HelpTicket` carries `resolvedAt` on every row,
   * and `TriageWaiting` — the queue's own door read — cannot, because a ticket
   * in triage has not been triaged, let alone closed. Requiring it here would
   * mean widening the triage door with a column that is NULL by definition and
   * that nothing on that screen draws, which is a write with no reader.
   *
   * What keeps it from being a hole is that the CLOSED column is not a choice a
   * call site makes: `helpTabColumns` (web/lib/live-resources.ts) hands it out
   * only for a tab pinned to the `resolved` stage, and the only body that draws
   * such a tab is the paged one, whose rows are `HelpTicket`. The cell draws an
   * em dash if it ever arrives empty, so an unexpected absence reads as a
   * missing answer rather than as a broken row — the same treatment `appName`
   * already gets one line up. */
  resolvedAt?: string | null
  /** WHO CLOSED IT — client ruling, 20 Sep 2026: "on tickets tab 'Closed,'
   * before 'Closed on' add 'Closed by.'" `HelpTicket` already carries this:
   * `resolverId`/`resolverName` are read back off `help.resolver_id`/
   * `help.resolver_name` (`shared/types.ts`'s own header on the pair — the
   * columns had existed since the resolve write was built and simply were
   * never selected until "a 'Resolved by' column" was first anticipated),
   * stamped by `setStatus` on every resolve and cleared on every reopen
   * (R17), so nothing in `workers/content` needed widening for this ruling —
   * the fact was already on the wire, unread by any screen.
   *
   * OPTIONAL FOR THE SAME REASON `resolvedAt` ABOVE IS: `TriageWaiting`
   * cannot yet have been resolved, so there is no resolver to ask about. */
  resolverId?: string | null
  resolverName?: string | null
  /** WHO RAISED IT (18 Sep 2026: "raised separate by and date! not in one
   * together") — the `raisedBy` column's face+name. TWO SHAPES, because the
   * two row types this table draws answer "who raised it" two different ways
   * and neither is a subset of the other:
   *
   *   • `HelpTicket` carries `raiserId`/`raiserName`/`raiserIsClient` — the
   *     actor whose login created the row, R54-trimmed to a first name for a
   *     colleague and named in full for a client contact
   *     (`app-tickets-are-a-table.test.tsx` already proves this pair on the
   *     app tab's own identical column).
   *   • `TriageWaiting`, the queue's own door read, carries BOTH now (added
   *     20 Sep 2026): `raiserId`/`raiserName`/`raiserIsClient`, the same actor
   *     pair `HelpTicket` carries, AND `raisedByContactName`/
   *     `raisedByContactLogo`, the client contact the ticket is FOR, which is
   *     the fact the triage card already shows as "who asked"
   *     (`workers/content/src/lib/triage.ts`). It needed both: the majority of
   *     tickets are staff-raised with no client contact at all (SCOPE ch.07),
   *     and the cell rendered empty for every one of them until the actor
   *     joined the row.
   *
   * Both optional on `TicketFace` (a caller with neither still type-checks),
   * and the cell prefers the actor when it is there and falls back to the
   * contact, see the cell's own comment below. */
  raiserId?: string | null
  raiserName?: string | null
  raiserIsClient?: boolean
  raisedByContactName?: string | null
  raisedByContactLogo?: string | null
}

/** THE STAFF RAISER'S FACE (R35) — ONE RESOLVER, client ruling 18 Sep 2026:
 * "on column raised by i am missing the avatar." `HelpTicket` carries
 * `raiserId`/`raiserName` for a colleague but no picture — a person's face
 * lives in the team's GLOBAL core DB, never the team's own (R47's own
 * finding, the identical reason `resolverId` beside it has none either) — so
 * it is resolved here, client-side, against the team's own members cache
 * every staff picker in this app already holds (`members:<teamId>`, the same
 * key `TEAM_RESOURCES.members` names). A client contact draws through the
 * OTHER half of `TicketFace`'s own pair instead (`raisedByContactLogo`,
 * resolved by the door already — see the cell below), so this is only ever
 * asked about a staff `raiserId`.
 *
 * THE SAME FUNCTION, EVERYWHERE A STAFF RAISER'S FACE IS DRAWN — the top-level
 * list and the triage queue both draw through `TicketRowsTable` below, which
 * takes `members` as a prop and calls this; the app record's own Tickets tab
 * (`AppTicketsPanel`, work-panels.tsx) draws a different table over the same
 * `HelpTicket` rows and calls this too, rather than keeping the second, local
 * `memberAvatar` it used to carry — one seam instead of two that happened to
 * agree. `undefined` members (still loading) and an id the cache does not
 * hold both fall through to `undefined`, which `RecordMark` already reads as
 * "no picture, draw the initial." */
export function memberFace(
  members: TeamMember[] | undefined,
  userId: string | null | undefined
): string | null | undefined {
  if (!userId) return undefined
  return members?.find((m) => m.userId === userId)?.imageUrl
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
 * black chip design"), the type's own glyph from `ticketTypeIconName` (the
 * colour her 2026-09-07 "Type with the colors" ruling drew here was retired
 * 17 Sep 2026, superseded by "for tickets, we need to find icons for the
 * ticket type" — see the cell below for both quotes in full), plain non-sorting headers, no hover
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
export function TicketRowsTable<T extends TicketFace>({
  rows,
  onOpen,
  label,
  teamId,
  columns = TICKET_COLUMNS_DEFAULT,
  decide,
  members,
}: {
  rows: readonly T[]
  onOpen: (id: string) => void
  /** The table's own accessible name, for a reader who arrives out of context. */
  label: string
  /** WHO'S TEAM — needed for exactly one thing: a cmd/ctrl-click or a
   * middle-click on a row must open the ticket BESIDE the active tab
   * (`rowOpenHandlers`, `web/lib/row-open.ts`), the same gesture every real
   * `<InAppLink>` already honours (17 Sep 2026 ruling). `onOpen` only ever
   * takes an id and always lands in the SAME tab (`onIntent`'s "open" case,
   * `deep-link-screen.tsx`, calls `go()` — no click event reaches it, so it
   * cannot know a modifier was held) — this row is the one place that DOES
   * see the raw click, so it is the one place a second address, built
   * straight from `teamId` + the row's own id, is worth computing. Client,
   * 17 Sep 2026: "the command that I'm clicking is not opening a new tab." */
  teamId: string
  /** WHICH FACTS THIS TAB SHOWS, and in which order — client, 2026-09-09: "ID,
   * created date, closed date. Remove the rest," about the Closed tab.
   *
   * A PROP RATHER THAN A BRANCH ON THE TAB, for the reason `decide` gives one
   * paragraph down: this file draws a header and a cell per name and does not
   * know what "Closed" is. WHICH names a tab may pass is `helpTabColumns`
   * (web/lib/live-resources.ts), beside the rule that already decides the same
   * question for the toolbar's filters, and it is tested there rather than
   * asserted here. The default is the four she ruled on 2026-09-06 (Title ·
   * Type · App · Raised) and is read from the same file, so "every other tab is
   * unchanged" is one constant rather than a claim about call sites.
   *
   * SHE REVISED THE CLOSED SET LATER THE SAME DAY — "columns for close: title
   * (with id), type, app, raised closed" — which is the four above plus the
   * closing date. Nothing in this file changed for it except the loss of the
   * `ref` column that her first reading had needed; the number is back inside
   * the title cell, where it has been on every other tab all along. */
  columns?: readonly TicketColumn[]
  decide?: {
    /** The column's header. Say what the cells DO, or pass "" to leave it
     * announced-only — triage passes "" for the reason it always did. */
    header: string
    cell: (row: T) => React.ReactNode
    /** A full-width strip beneath this row, when this row is mid-decision. */
    strip?: (row: T) => React.ReactNode
  }
  /** THE TEAM'S OWN MEMBERS CACHE — a FACE lookup for a staff raiser and
   * nothing else (see `memberFace`'s own header, one function up). Optional:
   * the triage queue draws through this same table and its rows never carry
   * a `raiserId` at all (`TicketFace`'s own header), so a caller with nothing
   * to resolve passes nothing rather than fetching a cache it never reads. */
  members?: TeamMember[]
}) {
  const { t, lang } = useLanguage()
  const span = columns.length + (decide ? 1 : 0)
  /** A CLICK ON ONE TICKET — see `teamId`'s own doc above for why this exists
   * at all. A PLAIN click still calls `onOpen(id)` unchanged, same tab, same
   * dispatch. Cmd/ctrl-click or a middle-click opens `/t/<teamId>/tickets/<id>`
   * beside the active tab instead — the identical address form
   * `RaisedByRow` (`tickets-dashboard.tsx`) already hands `InAppLink`, which
   * this app's own trail machinery treats as the SAME record whichever URL
   * form it arrives by (`sectionOf`, `web/lib/nav-memory.ts`).
   *
   * THROUGH THE ONE SEAM NOW (`rowOpenHandlers`, web/lib/row-open.ts) rather
   * than a hand-rolled pair this file kept to itself — the same helper
   * `RecordTable`'s own row now goes through, so a cmd/ctrl-click or a
   * middle-click means the same thing on every table in the app. Built per
   * row: the address and the label are the row's own. */
  function rowHandlers(w: T) {
    return rowOpenHandlers(`/t/${teamId}/tickets/${w.id}`, ticketTitle(w), () => onOpen(w.id))
  }
  /** WHAT EACH COLUMN IS CALLED. One map rather than a header spelled at the
   * point it is drawn, so a tab that shows three of these and a tab that shows
   * four cannot end up calling one fact two things. "Raised" rather than "Date"
   * for the created column is the client's own pick ("i choose raised"); the ID
   * column's word is the one she used in the ruling that created it. */
  const HEADING: Record<TicketColumn, string> = {
    id: t("ID"),
    title: t("Title"),
    type: t("Type"),
    app: t("App"),
    // "Raised by" (who) and "Raised" (when) — two columns, 18 Sep 2026: "raised
    // separate by and date! not in one together." Both strings already exist
    // in the catalogue, fully translated, from the ticket detail's own
    // (since-retired) "Raised by"/"Raised on" fact row — reused rather than
    // respelled, and `created` keeps the exact word it already drew ("Raised")
    // rather than growing an "on" this ruling never asked for.
    raisedBy: t("Raised by"),
    created: t("Raised"),
    // "CLOSED BY" — client ruling, 20 Sep 2026: "on tickets tab 'Closed,'
    // before 'Closed on' add 'Closed by.'" The column that used to draw the
    // date alone now folds the resolver's own face+name above it (see the
    // cell's own header for the R82 column-budget reasoning), so the header
    // takes the wider name — the same move `AppTicketsPanel`'s identical
    // table (work-panels.tsx) already made on 18 Sep 2026 when its own
    // "Resolved date" column folded under "Resolved by". NOT YET IN THE
    // CATALOGUE (R28): "Closed by" is a new English sentence — `npm run
    // lang` must extract and seed it (`shared/i18n-seed.ts`) before this
    // ships, the same as any other new copy.
    closed: t("Closed by"),
  }
  return (
    <Table
      // The kit's own specimen width for a table that knows its column count.
      // Below it the container scrolls on the inline axis rather than crushing
      // the title column — the kit's stated mobile answer, and the reason it
      // never restacks a table into cards.
      //
      // IT FOLLOWS THE COLUMN COUNT. 42rem is the kit's own four-column
      // specimen, and it was a constant while there was only one shape. The
      // Closed tab is the four plus a second date (client, 2026-09-09, her
      // revised set), so it asks for the specimen plus that column's own width
      // rather than squeezing six more rem out of the title — a reference and a
      // date may not truncate, so the title is the only thing that CAN give,
      // and it is the one column somebody is reading.
      //
      // (It briefly went the other way: her first reading of the same day left
      // this tab with three narrow columns and no title at all, and this line
      // dropped to 28rem for it. That shape is gone.)
      //
      // THE THRESHOLD MOVED FROM 4 TO 5 ON 17 SEP 2026, the day `id` joined
      // `TICKET_COLUMNS_DEFAULT`: every ordinary tab now carries five columns
      // rather than four, and a chip-wide ID column costs far less room than
      // the date column the original threshold was measured against. Widening
      // every tab to 48rem for a column that narrow would be asking for space
      // the row does not need; the six-column Closed tab is still the one that
      // earns it.
      minWidth={columns.length > 5 ? "48rem" : "42rem"}
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
          {/* THE HEADER AND THE ROW ARE PUT IN ORDER BY THE SAME LIST, which is
              what stops a three-column tab from labelling its cells wrong. The
              cells below are written out in `TICKET_COLUMN_ORDER`'s order and
              each one is gated on the SAME `columns.includes`, so `columns` is a
              SET the caller passes and never a sequence: two places cannot
              disagree about the order because only one of them decides it. */}
          {TICKET_COLUMN_ORDER.filter((c) => columns.includes(c)).map((c) => (
            <TableHead key={c}>{HEADING[c]}</TableHead>
          ))}
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
        {rows.map((w) => {
          const handlers = rowHandlers(w)
          return (
          <React.Fragment key={w.id}>
            <TableRow
              onClick={handlers.onClick}
              onAuxClick={handlers.onAuxClick}
              className="cursor-pointer"
            >
              {/* THE ID COLUMN — client, 17 Sep 2026, over this exact table:
                  "add the header ID for the ID." The chip is unchanged (the
                  same `RecordRef`, the ONE component that draws one anywhere
                  in either front door — `web/test/one-black-chip.test.ts`),
                  it simply sits under a header of its own now instead of
                  sharing the Title header with the name beside it. See
                  `TICKET_COLUMN_ORDER`'s own header comment
                  (web/lib/live-resources.ts) for the fuller history: a `ref`
                  column existed for a day in early September, was retired in
                  favour of leading the title cell, and is restored — on her
                  own later, more specific ruling over this table — as a
                  header rather than a fold back into the name. `shrink-0` is
                  kept: a long id should never lose its tail to the column's
                  own width. */}
              {columns.includes("id") && (
                <TableCell>
                  <RecordRef value={w.ref} />
                </TableCell>
              )}
              {/* THE TITLE COLUMN, ON ITS OWN NOW — client, 17 Sep 2026: "move
                  the ticket on top of the ticket." Read together with the ID
                  ruling beside it (both sentences, one review), this is the
                  other half of it: the ticket's NAME leads its own cell,
                  first and alone, rather than sitting to the right of the
                  black chip inside a cell the two used to share. Nothing is
                  stacked beneath it — every other fact this row carries
                  (type, app, when it was raised, when it closed) already has
                  its own column, and drawing a second line here would say one
                  of them twice, which is the exact drift `TicketChips`'
                  own header (shared/web/ticket-chips.tsx) argues against for
                  the identical row. If a future ruling asks for a second line
                  under the title, it is a new fact this row does not carry
                  elsewhere — never a repeat of a column already on screen. */}
              {columns.includes("title") && (
                <TableCell>
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
                      columns off the screen. */}
                  <Button
                    variant="link"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlers.onClick(e)
                    }}
                    onAuxClick={(e) => {
                      e.stopPropagation()
                      handlers.onAuxClick(e)
                    }}
                    className="block max-w-[32rem] truncate text-start"
                  >
                    {ticketTitle(w)}
                  </Button>
                </TableCell>
              )}
              {columns.includes("type") && (
                <TableCell>
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

                      THE SAME GLYPH, FROM THE SAME MAP as the triage card's
                      chips and the type picker draw — client, 17 Sep 2026,
                      superseding the sentence above: "the one that gets the
                      chip with the color is always the status … for tickets,
                      we need to find icons for the ticket type." `Icon` +
                      `ticketTypeIconName` (shared/ticket-types.ts) rather than
                      a second resolution that agrees with it today: the whole
                      reason that map is one file is that a type's icon cannot
                      be decided twice. Status, not type, keeps the dot
                      (`shared/status-tones.ts`, D17).

                      A TYPE THE TICKET DOES NOT HAVE STILL GETS ITS PILL, saying
                      so with an em dash: a column with a pill on four rows and a
                      hole on the fifth reads as the broken row rather than the
                      untyped one.

                      THE GLYPH RIDES BADGE'S OWN `icon` SLOT, NOT A PLAIN CHILD
                      — client ruling, 18 Sep 2026 ("all chips / pills" need the
                      leading-mark gap "wether its a dot or an icno"), and
                      `badge.tsx`'s own header names this exact cell as the call
                      site the ruling was written about. Handing the glyph in as
                      a bare JSX child (the old shape) is what this file's own
                      census (`web/test/chips-are-badges.test.ts`) now refuses
                      everywhere but here; the `icon` prop is what keeps it a
                      real Badge. */}
                  <Badge
                    variant="secondary"
                    size="pill"
                    icon={
                      ticketTypeIconName(w.helpType) ? (
                        // NO FORCED COLOUR (client ruling, 18 Sep 2026: "type
                        // icon is still gray"). The kit's own `secondary`
                        // Badge already draws `text-foreground` (black, not
                        // `text-ink-secondary`) and `Badge`'s own `icon` slot
                        // renders a caller's node AS-IS — so a
                        // `text-muted-foreground` class here was the one
                        // thing still forcing grey over the kit's own fix.
                        // Removed rather than repainted: the glyph now
                        // inherits `currentColor` from the pill exactly as
                        // the label beside it does.
                        <Icon name={ticketTypeIconName(w.helpType)!} className="size-3.5 shrink-0" />
                      ) : undefined
                    }
                  >
                    {w.helpType ?? null}
                  </Badge>
                </TableCell>
              )}
              {/* THE QUIET COLUMNS — app, and the two dates below it — as her
                  reference draws them: the facts, in secondary ink, so the title
                  and the coloured pill are what the eye lands on going down the
                  page. ("The two" while there were two; the Closed tab has a
                  third and no title above it, which is the one tab where the
                  quiet ink is the whole row.) An em dash for an absent app — a
                  blank cell looks like a rendering fault rather than a missing
                  answer.

                  THE APP IS TEXT, NOT A LINK, AND THAT IS R37-SHAPED: a link
                  inside a row whose whole job is to open the TICKET gives one
                  row two destinations, and the one a click lands on becomes a
                  matter of pixels. Nothing is lost — the app is a FACET in the
                  toolbar above, and the ticket's own screen is one row-click
                  away with the app link on it. */}
              {columns.includes("app") && (
                <TableCell className="text-muted-foreground">
                  {/* THE APP, WEARING ITS OWN FACE (R35, client ruling
                      2026-09-15) — the same mark+name node every other
                      account/app cell in the app now draws
                      (`shapeAccountsList`, `shapeMeetingsList`). Still text,
                      not a link (R37-shaped — see the note above this
                      column): the whole row's own click opens the TICKET,
                      and a second destination inside it is the mistake this
                      column already refuses. An absent app still says so
                      with an em dash, drawn by the mark's own initial tile
                      falling back to "?" rather than a blank box. */}
                  <span className="flex items-center gap-2">
                    {/* `choice` — a table row's face fits the text line
                        (client ruling, 18 Sep 2026: "when avatar/icon on
                        list view, make the avatar smaller. should not be
                        the cause of more height to the overall row"). */}
                    {w.appName ? (
                      <RecordMark picture={w.appLogo} name={w.appName} size="choice" />
                    ) : null}
                    <span className="min-w-0 truncate">{w.appName ?? ""}</span>
                  </span>
                </TableCell>
              )}
              {/* WHO RAISED IT — 18 Sep 2026: "raised separate by and date!
                  not in one together." Its own column now, ahead of the date
                  beside it (`created`, below): a `HelpTicket` row (every tab
                  but the top-level queue) names the ACTOR who raised it,
                  R54-trimmed exactly as the app tab's identical column is
                  (`app-tickets-are-a-table.test.tsx`); a `TriageWaiting` row
                  (the queue) carries no such actor and falls back to the
                  client CONTACT the ticket is for — the same fact the triage
                  card already calls "who asked" and never trims (a contact is
                  never staff). Neither ever both: `TicketFace`'s own header
                  says why the two shapes cannot collapse into one.

                  A SECOND LINE UNDER THIS NAME, CARRYING THE RAISED DATE, LIVED
                  HERE FOR TWO DAYS. Her ruling, 20 Sep 2026: "on tickets triage
                  list view remove the date from under the raised by person (we
                  have an own column for that!)" — the `created` column beside
                  this one already carries the same date, so the second line
                  was one fact said twice on the one call site that asked for
                  it (`TriageQueue`'s own list view). The column stays; only
                  the extra line goes. */}
              {columns.includes("raisedBy") && (
                <TableCell className="text-muted-foreground">
                  {w.raiserName ? (
                    <span className="flex items-center gap-2">
                      {/* THE STAFF RAISER'S FACE (R35) — `memberFace`, one
                          function up: `HelpTicket` carries no picture for
                          `raiserId`, so it is resolved against the members
                          cache this table's caller passes in. A CLIENT login
                          raising their own ticket also has `raiserId` (an
                          ordinary team member, `w.raiserIsClient`), and the
                          same lookup finds their face too — the members
                          cache holds every login on the team, not staff
                          alone. */}
                      <RecordMark
                        picture={memberFace(members, w.raiserId)}
                        name={w.raiserName}
                        shape="round"
                        size="choice"
                      />
                      <span className="min-w-0 truncate">
                        {w.raiserIsClient ? w.raiserName : staffNameFromSnapshot(w.raiserName)}
                      </span>
                    </span>
                  ) : w.raisedByContactName ? (
                    <span className="flex items-center gap-2">
                      <RecordMark
                        picture={w.raisedByContactLogo}
                        name={w.raisedByContactName}
                        shape="round"
                        size="choice"
                      />
                      <span className="min-w-0 truncate">{w.raisedByContactName}</span>
                    </span>
                  ) : null}
                </TableCell>
              )}
              {columns.includes("created") && (
                <TableCell className="text-muted-foreground tabular-nums whitespace-nowrap">
                  {/* THE SAME DATE THE CARD'S CHIP SHOWS, through the same shared
                      formatter and the reader's own language, so one ticket cannot
                      carry two spellings of one day across two views of one
                      collection. WHO raised it moved to its own column, above
                      (18 Sep 2026); this cell is the date alone now, same as
                      it always was. */}
                  {formatDate(w.createdAt, lang)}
                </TableCell>
              )}
              {/* THE DAY IT WAS CLOSED, AND WHO CLOSED IT — client, 2026-09-09
                  for the date, and 20 Sep 2026 for the name: "on tickets tab
                  'Closed,' before 'Closed on' add 'Closed by.'" Same ink, same
                  formatter and same language as the Raised column beside it,
                  because they are two spellings of one kind of fact and a
                  reader compares them going across the row.

                  FOLDED INTO THIS ONE CELL RATHER THAN GIVEN A COLUMN OF ITS
                  OWN, and that is R82 rather than a preference: the Closed tab
                  already sits at the six-column ceiling (id, title, type,
                  raisedBy, created, closed — `app` was already dropped for
                  `raisedBy` on 18 Sep 2026, `helpTabColumns`'s own header has
                  that reasoning), and R82's own prescription for a fact that
                  arrives once a table is already at the ceiling is "fold the
                  extra fact onto an existing column's own second line" — the
                  identical technique this table's `raisedBy` cell now uses for
                  the date beside it, one column over. So "Closed by" reads
                  literally BEFORE "Closed on" here: the resolver's face and
                  name on the first line, the date beneath it.

                  THE FACE AND THE TRIM ARE THE RAISER CELL'S OWN (R35/R54):
                  `memberFace` against the same members cache, and
                  `staffNameFromSnapshot` — a resolver is always staff (closing
                  a ticket is a staff action; SCOPE ch.06), never a client
                  contact, so there is no second shape to draw here the way the
                  raiser cell needs one.

                  THIS COLUMN ONLY EVER APPEARS ON A TAB PINNED TO THE
                  `resolved` STAGE, and that is the whole reason either fact can
                  be trusted: a reopen NULLs `resolved_at`/`resolver_id`/
                  `resolver_name` together (the owner's ruling of 2026-09-06 —
                  the closure survives in the activity trail, "closed on x,
                  reopen on y, closed again on z"), so anywhere an open ticket
                  could appear this cell would say "never closed" about a
                  ticket that has been closed twice. `helpTabColumns` is what
                  makes that a rule rather than a call site being careful. The em
                  dash is the same treatment the App column gets: if one ever
                  does arrive empty it reads as a missing answer, not a broken
                  row. */}
              {columns.includes("closed") && (
                <TableCell className="text-muted-foreground">
                  {w.resolvedAt ? (
                    <span className="flex flex-col gap-0.5">
                      {w.resolverName && (
                        <span className="flex items-center gap-2">
                          <RecordMark
                            picture={memberFace(members, w.resolverId)}
                            name={w.resolverName}
                            shape="round"
                            size="choice"
                          />
                          <span className="min-w-0 truncate">
                            {staffNameFromSnapshot(w.resolverName)}
                          </span>
                        </span>
                      )}
                      {/* THE DATE ALONE, AT FULL SIZE, WHEN THERE IS NO NAME TO
                          SIT UNDER — a ticket resolved before `resolver_id`/
                          `resolver_name` existed on the row (pre-migration)
                          carries a `resolvedAt` with no resolver. Shrinking it
                          to a "second line" size in that case would read as a
                          typo rather than as a fact this row genuinely lacks. */}
                      <span
                        className={
                          w.resolverName ? "text-xs tabular-nums whitespace-nowrap" : "tabular-nums whitespace-nowrap"
                        }
                      >
                        {formatDate(w.resolvedAt, lang)}
                      </span>
                    </span>
                  ) : null}
                </TableCell>
              )}
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
                <TableCell colSpan={span} className="bg-surface-quiet">
                  {decide.strip(w)}
                </TableCell>
              </TableRow>
            )}
          </React.Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}

/** EVERY TICKET STAGE'S BOARD-COLUMN TITLE, ALL SIX — one map, read by every
 * board in the app (`OpenBoard` and `AllBoard` below, and the app record's own
 * board, `AppTicketsBoard` in `web/components/work/work-panels.tsx`) — EXPORTED
 * for that third caller, the "board view by status" the client asked for
 * twice in one ruling, 17 Sep 2026: "In Tickets inside the app, I want a board
 * view by status. Also add this board view by status in general tickets,
 * all." Written as `t("…")` LITERALS rather than read off
 * `HELP_STATUS` (web/components/deep-link/shape.tsx): that map is a copy
 * TABLE keyed by a database word, so none of its values is an extracted
 * position (R28's `property` position only looks at named copy props) — a
 * `t(HELP_STATUS[s])` would look up keys the catalogue never extracted and
 * hand every non-English reader the English word, silently. A `Record` over
 * `HELP_STATUSES` rather than a lookup with a fallback, for the same reason
 * `OpenBoard`'s own four-entry version used to argue: a seventh stage added to
 * the vocabulary fails this file's own type check instead of a board quietly
 * growing a column with no name.
 *
 * THIS MAP NAMES ONLY THE TITLE, NEVER THE DOT — a stage's colour comes from
 * `helpStatusDotTone` (shared/status-tones.ts), the one function every ticket
 * surface reads for it, so a board's own `dot:` line calls that directly
 * rather than this map growing a second column of tones to keep in step with
 * it. `OpenBoard`'s own header carries the full ruling history: no dot from
 * 2026-09-09, the dot back from 21 Sep 2026 ("bring abck the color on t stage
 * in board view", UI-RULEBOOK.md L43) — and both readings of that history
 * apply identically to every caller of this map. */
export function ticketStatusColumnTitles(t: (s: string, vars?: Vars) => string): Record<HelpStatus, { title: string }> {
  return {
    new: { title: t("New") },
    triaged: { title: t("Triaged") },
    scheduled: { title: t("Scheduled") },
    in_progress: { title: t("In progress") },
    ready: { title: t("Ready") },
    resolved: { title: t("Resolved") },
  }
}

/** ONE CARD, FOR EVERY BOARD IN THIS FILE — lifted out of `OpenBoard` (which
 * used to build it inline) the day a second board needed the identical one.
 * See `OpenBoard`'s own header for the ruling behind every part of it: the
 * shared chips (`TriageChips`), and the date that moved out of them and under
 * the title as plain text, twice, ending with "Remove the 'Raised On' chip
 * from the QE view" (17 Sep 2026). */
export function ticketBoardCard(teamId: string, t: (s: string, vars?: Vars) => string, lang: Language) {
  return (r: HelpTicket) => ({
    id: r.id,
    title: ticketTitle(r),
    badges: <TriageChips teamId={teamId} ticket={r} />,
    description: t("raised {date}", { date: formatDate(r.createdAt, lang) }),
  })
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
 * outside … and everywhere else where tickets have pills, reuse this." A
 * fifth way of drawing a ticket's own facts is precisely what that ruling
 * exists to prevent.
 *
 * THE DATE MOVED, TWICE. First out of the chip row and under the title
 * (2026-09-07, "lets put the date below title as simole tex"): the chip line
 * left its date chip out and the board drew the date itself, in the kit
 * card's own quiet caption slot. Then, 17 Sep 2026, the CHIP half of that
 * split retired everywhere ("Remove the 'Raised On' chip from the QE view"),
 * so today there is nothing left for a board card to omit — the caption
 * below the title is simply the one place this card still says when the
 * ticket was raised; see `boardCard` below. */
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
  /** THE STAGES IN THE READER'S OWN LANGUAGE, AND THAT IS ALL A COLUMN HEAD
   * CARRIES NOW — the name in words and the quiet count. THERE IS NO DOT
   * ANYWHERE ON THIS BOARD'S HEADS, and 2026-09-09 is the day that became the
   * whole answer rather than a question about which shade.
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
   * ── THE DOT IS GONE, AND SHE ASKED FOR IT TWICE ─────────────────────────
   *
   * CLIENT, 2026-09-09, over this exact board on staging, verbatim: *"remove the
   * color from the status header!"* and, in the same review, *"column header
   * should have no color"*. That is a ruling about the OBJECT, not about the
   * shade on it: there is no dot to re-tone, because she is not asking for a
   * different one. The kit's `dot` is optional (`dot?: KanbanColumnDot`,
   * shared/ui/components/kanban/kanban.tsx, and both places that draw it are
   * gated on `!== undefined`), so the whole of obeying her is not passing it.
   *
   * WHAT USED TO STAND HERE, AND WHY IT IS REPLACED RATHER THAN DELETED. On
   * 2026-09-07 she said *"grerat but status (th header) have no color
   * associated"*, and this file read that as a complaint about WHICH colour: the
   * Status FILTER six inches above draws each stage's swatch through
   * `helpStatusDotTone`, and the column heads had four hand-written literals a
   * rung off that file's tiering, so "Triaged" was blue in the menu and grey on
   * the head of the tickets it selects. The fix that day made the head READ the
   * same seam as the filter, and a long paragraph here defended the result —
   * `triaged` is `review`, `scheduled` and `in_progress` share `building`,
   * `ready` is `done`, Waiting is `blocked` — including a closing line saying
   * that if four colours across five columns were not enough for her, "the fix
   * is a kit release, not a literal here".
   *
   * She was reporting the ABSENCE she wanted, not a mismatch. Two days later she
   * said the same thing in the imperative, twice, which is how a person repeats
   * an instruction that was answered with something else. The 2026-09-07 reading
   * was not perverse — one stage wearing two colours on one screen is a real
   * defect and it is genuinely fixed — but the ruling it was serving never asked
   * for a corrected dot, and this paragraph exists so nobody restores one by
   * finding the old argument and thinking it is still live. IT IS NOT. A column
   * head on this board carries no colour.
   *
   * THE FILTER KEEPS ITS SWATCHES, and that is not the ruling half-applied. She
   * is reading a BOARD: five heads across the top of a screen, each a word and a
   * number, where a coloured dot is decoration on a label that already says
   * everything. The Status facet is a MENU OF STATUSES, where the swatch is the
   * legend that teaches the colours the ticket chips and the charts use — a
   * different object answering a different question, and she has never asked
   * about it. `helpStatusDotTone` is therefore still read, once, at `helpFacets`.
   *
   * AND NOTHING ON THE BOARD ASKS FOR A TONE ANY MORE, so `waitingDotTone()` —
   * added on 2026-09-07 so the fifth column would stop borrowing the tone of the
   * stage the client had just retired — lost its only caller and has been deleted
   * from `shared/status-tones.ts` with it. Leaving it there would be a public
   * name nobody names (web/test/dead-exports.test.ts), which is the seam left
   * half-wired rather than the seam left honest. The MEANING it carried is not
   * lost and was never a colour: `waitingClause` (workers/content/src/lib/help.ts)
   * is what decides who is waiting, and the column below says so in words.
   *
   * ── AND THE DOT RETURNS, 21 SEP 2026 — THE 09-09 RULING IS OVERRULED ─────
   *
   * Aurora, reviewing the deployed tickets module, verbatim: *"bring abck the
   * color on t stage in board view"* (UI-RULEBOOK.md L43's "her review of the
   * live tickets pages" list). This is a ruling about THE STAGE, her own word,
   * and it reverses the 2026-09-09 one two paragraphs above rather than
   * refining it — "the status header should have no color" is precisely the
   * sentence this new one contradicts. The whole essay above stays, because
   * the next reader needs the full account of why the dot was removed AND
   * that the removal is no longer the standing rule, not a trimmed history
   * that looks like nothing ever changed.
   *
   * THE FOUR STAGE COLUMNS below carry `dot: helpStatusDotTone(stage)` again
   * — the identical seam the 2026-09-07 pass first wired and the 2026-09-09
   * one un-wired, so "Triaged" is orange on the Status filter, the ticket's
   * own chip and this column head all at once, never a second table. THE
   * WAITING COLUMN (the fifth, below) stays dot-less: it is a PREDICATE, not
   * a stage, and her sentence named the stage — see that column's own note
   * for the argument, otherwise unchanged by this reversal. */
  // READ OFF THE SHARED SIX rather than a four-entry literal of its own since
  // 17 Sep 2026, the day `AllBoard` below needed the identical titles for the
  // other two stages — one map, `ticketStatusColumnTitles` above, so "Ready"
  // cannot read one word on this board and a different one on that one.
  const COLUMN = ticketStatusColumnTitles(t)
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
   * *"lets put the date below title as simole tex"*. `TriageChips` used to be
   * asked to leave its fourth chip out (`omitDate`) for exactly this reason;
   * the chip itself is retired everywhere now (client, 17 Sep 2026: "Remove
   * the 'Raised On' chip from the QE view"), so `omitDate` is gone with it
   * and this caption is simply the one place a ticket's date still shows on
   * the board — a `text-micro` line in `--ink-tertiary` under the title,
   * which IS this app's quiet caption treatment and is drawn by the kit
   * rather than styled here.
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
   * reads this file off disk to make sure).
   *
   * LIFTED INTO `ticketBoardCard` ABOVE, 17 Sep 2026, the same day this
   * function's four-entry `COLUMN` moved to the shared six — see that
   * function's own header. */
  const boardCard = ticketBoardCard(teamId, t, lang)
  /* ONE GRAMMAR NOW, THROUGH THE KIT'S OWN THIRD ARGUMENT — the identical fix
     `AppTicketsBoard` (work-panels.tsx) already carried: `onCardSelect={(card)
     => onOpen(card.id)}` reads only the card and never the click, so a
     cmd/ctrl-click, a middle-click or a cmd/ctrl+shift-click on THIS BOARD's
     own card opened the ticket IN PLACE every time, whatever modifier was
     held — diagnosed live, 18 Sep 2026, on the Open tab's own board (this
     component), through a capture-phase event log + a React-fiber read of the
     card's bound `onCardSelect` (confirmed `e=>i(e.id)` in the deployed
     bundle) + a `history.pushState`/localStorage trace showing the "beside"
     branch of `applyClickGesture` never ran. `Kanban` forwards the real event
     as a third argument on every one of a card's three triggers (a left
     click, a middle/`auxclick`, and Enter/Space — kanban.tsx, v1.2.113,
     `KanbanCardSelectEvent`), so the same seam every other row in the app
     already reads (`clickGesture`/`applyClickGesture`, web/lib/row-open.ts)
     is read straight off it here too. The path is built exactly as
     `TicketRowsTable`'s own row does two functions up in this file —
     `/t/<teamId>/tickets/<id>`, unconditionally, never the clean top-level
     form: `openBeside` only ever needs an address to open BESIDE the tab
     already open, and the team-scoped form is always valid wherever this
     screen is reached from. */
  const handleCardSelect = (
    card: { id: string },
    _column: unknown,
    event: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
  ) => {
    // A KEYBOARD ACTIVATION (Enter/Space) CARRIES NO `button` AT ALL — see
    // `AppTicketsBoard`'s own identical guard for the full argument.
    if (!("button" in event)) {
      onOpen(card.id)
      return
    }
    const gesture = clickGesture(event)
    if (gesture === null) return
    if (gesture !== "same") event.preventDefault()
    const row = rows.find((r) => r.id === card.id)
    applyClickGesture(
      gesture,
      `/t/${teamId}/tickets/${card.id}`,
      row ? ticketTitle(row) : card.id,
      () => onOpen(card.id)
    )
  }
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
          /* THE DOT IS BACK — Aurora's ruling, 21 Sep 2026, verbatim, reviewing
             the deployed tickets module: "bring abck the color on t stage in
             board view" (UI-RULEBOOK.md L43). This REVERSES the 2026-09-09
             ruling this comment used to carry ("remove the color from the
             status header!" / "column header should have no color") — read
             `COLUMN` above for that ruling's own long account, kept for the
             record rather than deleted, since the next reader needs to know it
             was live and is no longer.
             ONE TONE, NOT A SECOND TABLE — `helpStatusDotTone` is the exact
             function the ticket's own chip reads (`Badge variant="status"
             dot={helpStatusDotTone(ticket.status)}`, help-detail.tsx) and the
             Status filter six inches above this board already reads
             (`helpFacets`), so a stage can never wear one colour on its chip
             and a different one on this column head. */
          dot: helpStatusDotTone(stage),
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
           STILL NO DOT ON THIS HEAD, EVEN AFTER THE 21 SEP 2026 REVERSAL
           ABOVE. Aurora's later ruling ("bring abck the color on t stage in
           board view", UI-RULEBOOK.md L43) restored `dot` on the four STAGE
           columns above, in the exact word she used — a stage — and this
           column is deliberately not one: it is a PREDICATE over a ticket
           already sitting in one of those four stages, the whole argument this
           paragraph makes below. Nothing in her 21 Sep review named Waiting,
           and the reason a colour would have been misleading here on
           2026-09-09 is unchanged by a ruling about stage colour returning —
           the FOOTNOTE under the board is still what says this column repeats
           cards from the four before it, in words, and a reader who needs that
           sentence is not served by a poppy dot instead of it. If she asks for
           one here too, it is a new, separate ruling to record, not an
           extension of this one.
           WHAT WENT WITH IT. Until 2026-09-09 this line read
           `dot: waitingDotTone()` — a named seam added on 2026-09-07 so the
           column would stop borrowing the tone of `awaiting_validation`, a stage
           the client had just retired. The seam was right for the question it
           answered and the question is no longer asked, so the function is
           deleted rather than left exported for nobody
           (web/test/dead-exports.test.ts). Nothing about WAITING moved: it is
           still a predicate the door derives on every read (`waitingClause`,
           workers/content/src/lib/help.ts), it is still the identical read the
           Waiting TAB rests on, and it is still said in words here and in the
           footnote — which is where it was always carried.
           IT IS NOT A FILTER. No card in this column is read by status at all —
           they come from the door's waiting predicate, below.
           NO COUNT WHILE THE TOOLBAR IS ASKING, for the reason the four stage
           columns give: the waiting read is a RESTING one and carries none of
           the toolbar's narrowing, so a searched board would put an
           un-narrowed total over the cards that matched. */
        {
          id: WAITING,
          title: t("Waiting"),
          count: narrowed ? undefined : waitingTotal,
          cards: (waitingRows ?? []).map(boardCard),
          emptyLabel: t("Nothing is waiting on a client."),
        },
      ]}
      // A CARD OPENS THE TICKET, and that is the board's only act. The kit makes
      // a card a target only when this is passed, so the affordance and the
      // behaviour are one decision. `handleCardSelect`, not a bare
      // `(card) => onOpen(card.id)` — see its own note above.
      onCardSelect={handleCardSelect}
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
              "Each of the first four columns counts every open ticket at that stage. Waiting repeats those same tickets, the ones where a client owes us an answer, so the columns don't add up to the total. Click a card to open the ticket."
            )
      }
      emptyColumnLabel={t("Nothing at this stage.")}
    />
  )
}

/** THE ALL TAB'S SECOND BODY — client, 17 Sep 2026, verbatim: "In Tickets
 * inside the app, I want a board view by status. Also add this board view by
 * status in general tickets, all." The second half of that sentence is this
 * function: `OpenBoard` above already answers "a board grouped by status" for
 * the Open tab's own three-plus-one stages; All needs the same idea over
 * EVERY live stage, because unlike Open it holds a ticket in any of them.
 *
 * ── REUSED, NOT REBUILT ─────────────────────────────────────────────────
 *
 * The kit's `Kanban` composition is the one this app has already adopted
 * (`OpenBoard`'s own header — R46's exemption for it was deleted the day it
 * was reached for real), so this is the SAME component with a wider `columns`
 * array, never a hand-rolled board. `ticketStatusColumnTitles` and
 * `ticketBoardCard` (above) are the two pieces `OpenBoard` used to build
 * inline for itself; both are shared now so a stage's name and a card's shape
 * can never read one way on one board and another way on the other.
 *
 * ── READ-ONLY, FOR THE SAME REASON — AND EXACTLY THE SAME REASON ──────────
 *
 * No `onMove`, no drag, one act (a card opens the ticket): `OpenBoard`'s own
 * header states the two questions a draggable board would have to answer
 * (which move is a lifecycle move made by geometry, and which count is
 * honest under a page) and this board answers neither of them any more
 * cheaply than that one does — it holds MORE stages, not fewer decisions.
 *
 * ── SIX COLUMNS, NOT FIVE, AND NO FIFTH "WAITING" COLUMN ───────────────────
 *
 * `HELP_STATUSES` (shared/types.ts) is the whole live vocabulary — new,
 * triaged, scheduled, in_progress, ready, resolved — so this board is a
 * PARTITION of the All tab exactly the way `OpenBoard`'s four stage columns
 * partition the Open tab: every ticket has exactly one status, every status
 * gets a column, nothing is dropped and nothing repeats. That is also why
 * there is no sixth "Waiting" column here the way there is a fifth one on
 * Open: Waiting is a PREDICATE over a ticket that is already sitting in one
 * of these six stages (`waitingClause`, workers/content/src/lib/help.ts), and
 * a predicate column only earns its keep once, on the tab that is actually
 * ABOUT triage workload. Adding it here would repeat a card a second time on
 * a board whose whole point is "one ticket, one column" — the client asked
 * for "a board view by status," not a second copy of Open's five-column one.
 *
 * ── COUNTS ARE THE SAME `byStatus` READ THE STRIP ALREADY HOLDS ───────────
 *
 * `counts` is `byStatus` — the one grouped `COUNT(*)` the tab strip's own
 * Triage/Ready/Open/Closed badges already read (built above this component) —
 * so a sixth caller of that read costs nothing new and can never disagree
 * with the numbers on the strip above it. Exactly `OpenBoard`'s own R16
 * argument: an exact count while the toolbar RESTS, and a fall back to the
 * cards actually on screen (`rows.filter(...).length`, implicitly, through
 * the kit's own default) the moment anything is asked — `narrowed` decides
 * which, the identical prop `OpenBoard` takes for the identical reason. */
function AllBoard({
  teamId,
  rows,
  counts,
  narrowed,
  onOpen,
}: {
  teamId: string
  rows: readonly HelpTicket[]
  /** the door's own grouped tally per status, over the WHOLE collection —
   * never `cards.length`. See the header above for why every stage reads it. */
  counts: Record<string, number> | undefined
  /** is the toolbar asking anything? See `OpenBoard`'s identical prop. */
  narrowed: boolean
  onOpen: (id: string) => void
}) {
  const { t, lang } = useLanguage()
  const COLUMN = ticketStatusColumnTitles(t)
  const boardCard = ticketBoardCard(teamId, t, lang)
  // ONE GRAMMAR NOW — the identical fix `OpenBoard` carries above, for the
  // identical reason: see that component's own note for the full account.
  const handleCardSelect = (
    card: { id: string },
    _column: unknown,
    event: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (!("button" in event)) {
      onOpen(card.id)
      return
    }
    const gesture = clickGesture(event)
    if (gesture === null) return
    if (gesture !== "same") event.preventDefault()
    const row = rows.find((r) => r.id === card.id)
    applyClickGesture(
      gesture,
      `/t/${teamId}/tickets/${card.id}`,
      row ? ticketTitle(row) : card.id,
      () => onOpen(card.id)
    )
  }
  return (
    <Kanban
      // SIX COLUMNS SHARE THE ROW, the same fluid formula `OpenBoard` uses for
      // its five — see that component's own note for why this is the kit's
      // `columnWidth` prop and not a wrapper or a negative margin. One gap
      // fewer term than five columns would need, one column wider a floor.
      columnWidth="max(18rem, calc((100% - 5 * var(--space-2h)) / 6))"
      columns={HELP_STATUSES.map((stage) => ({
        id: stage,
        title: COLUMN[stage].title,
        // THE DOT IS BACK — the same 21 Sep 2026 reversal `OpenBoard` carries
        // ("bring abck the color on t stage in board view", UI-RULEBOOK.md
        // L43; `OpenBoard`'s own header has the full account), and it did not
        // narrow when a second board joined the file. `helpStatusDotTone` is
        // the one function every ticket surface reads for a stage's colour —
        // the chip, the filter, and now both boards.
        dot: helpStatusDotTone(stage),
        count: narrowed ? undefined : counts?.[stage],
        // A PARTITION OF THE WHOLE LIVE VOCABULARY, not a narrowing — see the
        // header above. `OpenBoard`'s own `FIND_NARROWING_OK` exemption for
        // this exact shape of `rows.filter(` covers this call too (both
        // matchers tolerate the multi-line layout; shared/rules/registry.ts).
        cards: rows.filter((r) => r.status === stage).map(boardCard),
        emptyLabel: t("Nothing at this stage."),
      }))}
      onCardSelect={handleCardSelect}
      footnote={
        narrowed
          ? t("Cards are the tickets that matched, as far as they have loaded. Click a card to open the ticket.")
          : t(
              "Each column counts every ticket at that stage. Every ticket is in exactly one. Click a card to open the ticket."
            )
      }
      emptyColumnLabel={t("Nothing at this stage.")}
    />
  )
}

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

