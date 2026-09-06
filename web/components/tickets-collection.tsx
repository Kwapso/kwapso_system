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
import { SearchInput } from "@shared/ui/components/search-input/search-input"
import { defaultTabsConfig, renderFolderTabs } from "@shared/web/screen-engine/tabs-view"
import { CollectionCreateActionProvider } from "@shared/web/screen-engine/collection-frame"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import { useRemembered } from "@shared/web/remembered"
import { Button } from "@shared/ui/components/button/button"
import { toast } from "@shared/ui/components/sonner/sonner"
import { ScreenRenderer, type ScreenActionContext, type ScreenIntent } from "@shared/web/screen-engine/screen-renderer"
import type { ScreenRecipe, ScreenRights } from "@shared/web/screen-engine/recipe"
import { Badge } from "@shared/ui/components/badge/badge"
import { Queue } from "@shared/ui/components/queue/queue"
import {
  ArrowCounterClockwise,
  ArrowUpRight,
  Check,
  Paperclip,
  PencilSimple,
  Plus,
  PaperPlaneTilt,
  Tag,
  Warning,
} from "@shared/ui/foundations/icons"
import { AttachmentPreview, hasPreview } from "@shared/web/attachment-preview"
import { RecordMark } from "@shared/web/record-mark"

import { CollectionHeading } from "@/components/collection-heading"
import { CountedAbove } from "@/components/counted-tabs"
import { LoadMore } from "@/components/load-more"
import { PagedFind } from "@/components/paged-find"
import { COLLECTION_SORTS, translatedSorts } from "@/lib/collection-sorts"
import { translatedFacets } from "@/lib/collection-filters"
import { AddButton, CollectionCard, EmptyLine, ToolbarRow } from "@/components/deep-link/screen-bits"
import { TriageStrip } from "@/components/triage-strip"
import { TicketStagesCard, TicketsByAccountCard } from "@/components/pulse"
import { CONCEPT_ICON } from "@/lib/pages"
import { tenancy } from "@/lib/api/tenancy"
import { MARK_GROUP, markMap } from "@/lib/type-marks"
import { shapeHelpList } from "@/components/deep-link/shape"
import { ApiFailure, content as contentApi } from "@/lib/api"
import type { HelpAccountFacet, TriageWaiting } from "@/lib/api/content"
import { RecordPicker, Swatch, type PickerOption } from "@/components/record-picker"
import { assignableMembers, staffedOn } from "@/lib/members"
import { ticketTypeColour } from "@/lib/type-colours"
import type { TriageGap } from "@shared/triage-readiness"
import { HelpFormDialog } from "@/components/help-form-dialog"
import { TriageReplyDialog } from "@/components/triage-reply-dialog"
import {
  accountsKey,
  appModulesKey,
  appsKey,
  helpAttachmentsKey,
  helpFacetFilter,
  helpFacetKey,
  helpKey,
  listFetch,
  totalKey,
  triageKey,
  type HelpFacet,
} from "@/lib/live-resources"
import { withDataDrivenCollection } from "@/lib/screens"
import { formatCount } from "@shared/web/format-count"
import { formatDate } from "@shared/web/format"
import { primeCache, invalidate,
  mergePage, useCached, useCachedValue } from "@shared/web/store"
import { useLanguage, useT } from "@shared/web/language"
import type {
  Account,
  AppModule,
  AppRow,
  HelpAttachment,
  HelpTicket,
  SelectableValue,
  TeamMember,
} from "@shared/types"
import { richTextPlain } from "@shared/web/rich-text"

/** The two facets that are STAGES rather than kinds, and the tab each one is.
 * Named here so the strip's shape is readable in one place: Ready first because
 * it is the pile somebody should act on, Closed last because it is the pile
 * nobody should. */
const READY: HelpFacet = "status:ready"
const CLOSED: HelpFacet = "status:resolved"
const TRIAGE: HelpFacet = "triage"
const ALL: HelpFacet = "all"
/** THE ONE OTHER NON-NARROWING TAB, following Triage's own precedent (the
 * file header, "THE REDESIGN, 2026-08-31"): a different screen wearing the
 * same strip, not a filter of the list. `helpFacetFilter` already returns `{}`
 * for any value it doesn't recognise, so this needs no change there — only
 * the render switch below and the `narrowed` check needed to know about it. */
const DASHBOARD: HelpFacet = "dashboard"

export function TicketsCollection({
  teamId,
  recipe,
  rights,
  helpTypeOptions,
  totals,
  can,
  onCreate,
  onAction,
  onIntent,
}: {
  teamId: string
  recipe: ScreenRecipe
  rights: ScreenRights
  /** the team's live `Ticket type` values — the tab strip is built from these */
  helpTypeOptions: string[]
  totals: { help?: number }
  can: (module: string, right: "read" | "create" | "edit" | "delete") => boolean
  onCreate: () => void
  onAction: (actionId: string, ctx: ScreenActionContext) => void
  onIntent: (intent: ScreenIntent) => void
}) {
  const t = useT()
  // Which type of ticket she was looking at, remembered with the rest of the
  // screen — the sub-tab is as much "where she was" as the search box under it.
  const [facet, setFacet] = useRemembered<HelpFacet>("ticket-facet", ALL)
  // TRIAGE'S OWN SEARCH lives INSIDE `TriageQueue` now (R50): the toolbar
  // above it has to answer "is the queue empty" to know whether to draw
  // itself at all, and only `TriageQueue` — which fetches the queue — ever
  // knows that. See its own header comment.

  // The team's own glyphs, scanned once for the whole strip rather than once
  // per tab. The vocabulary is a cache this screen's siblings already hold and
  // the live registry keeps current, so an emoji edited on the Dropdown values
  // screen repaints these tabs on the next ping.
  const selectableQ = useCached<SelectableValue[]>(`selectable:${teamId}`, () =>
    tenancy.selectable().then((r) => r.values)
  )
  const ticketMarks = markMap(selectableQ.data, MARK_GROUP.ticket)
  // THE TWO NEW TOOLBAR FACETS (Client, Module) — read unconditionally, like
  // Processes' own `appId` facet reads `appsKey` (processes-screen.tsx), because
  // narrowing by either is a READ act available to anyone who can see this
  // screen at all, not something gated behind creating a ticket. Modules are a
  // BOUNDED, whole-team read (help-form-dialog.tsx reads the identical
  // `appModulesKey` the same way, for the same reason: "a team's systems, not a
  // feed"). Accounts is the one with a real caveat: `tenancy.accounts()` is
  // page ONE of a GROWING_COLLECTIONS list (R14) — exactly the defect
  // help-form-dialog.tsx's own account picker was rewritten off of ("offered
  // the newest fifty companies and had no opinion about the rest"). This facet
  // inherits that same limitation rather than fixing it: a live, searched
  // facet option list is a capability no facet control in this app has today
  // (shared/web/screen-engine/filter-bar.tsx's own header says the async
  // option-provider was removed as dead code, and — since 2 Sep 2026 — that a
  // facet is a compact `Select`, which scrolls and type-aheads but does not
  // search; re-adding a searched one is outside this fix's remit). Filed as a
  // known gap rather than silently shipped as if it were complete.
  const accountsQ = useCached<Account[]>(accountsKey(teamId), () =>
    tenancy.accounts().then((r) => r.accounts)
  )
  const modulesQ = useCached<AppModule[]>(appModulesKey(teamId), () =>
    tenancy.appModules().then((r) => r.modules)
  )
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
  // whichever ticket read ran last and counted over the list IGNORING the kind
  // and stage facets — so opening "Questions" does not make every other badge
  // read zero.
  const byType = useCachedValue<Record<string, number>>(`help-by-type:${teamId}`)
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
      // The one tab on this strip whose idea has a concept icon of its own. The
      // KIND tabs beside it carry the team's own type MARKS, which `TabsView`
      // takes as a NODE; Triage's own idea has a CONCEPT icon, which the same
      // prop resolves as a lucide NAME — so the two kinds of mark sit on one
      // strip without either being written into a LABEL, the one shape
      // UI-CONVENTIONS §5 refuses. No badge, and that is R16 rather than an
      // omission: this tab is not a narrower slice of the collection counted
      // above it, so a number here would be the same collection counted twice.
      { value: TRIAGE, label: t("Triage"), icon: CONCEPT_ICON.triage, badge: "", badgeVariant: "" as const },
      { value: READY, label: t("Ready"), icon: "", badge: formatCount(byStatus?.ready), badgeVariant: "" as const },
      // THE TEAM'S OWN MARK, at last. `TabItem.icon` took a lucide NAME until
      // library v0.11.0 and drew nothing for a pictograph, so ⚠️ beside Issue and
      // ❓ beside Question were stored on the dropdown row and rendered on no tab
      // — the owner edited an emoji and watched it change nowhere. It is a NODE
      // now, and the glyph comes from the vocabulary rather than from a map here,
      // so a team that renames a type or picks a new emoji is obeyed without a
      // deploy. A type with no mark passes "" and the tab is the word alone,
      // exactly as before.
      ...helpTypeOptions.map((v) => ({
        value: `type:${v}`,
        label: v,
        icon: ticketMarks.get(v) ?? "",
        badge: formatCount(byType?.[v]),
        badgeVariant: "" as const,
      })),
      { value: CLOSED, label: t("Closed"), icon: "", badge: formatCount(byStatus?.resolved), badgeVariant: "" as const },
      { value: ALL, label: t("All"), icon: "", badge: formatCount(scopeTotal), badgeVariant: "" as const },
      // THE OTHER NON-NARROWING TAB (2026-09-01, beside Triage at the head of
      // the strip): the dashboard — which client is generating the most work,
      // and where the tickets are sitting. No badge, for the same reason
      // Triage carries none — it is not a count of a narrower slice of THIS
      // list, so a number here would be R16's exact violation (a collection's
      // count shown more than once).
      { value: DASHBOARD, label: t("Dashboard"), icon: CONCEPT_ICON.dashboard, badge: "", badgeVariant: "" as const },
    ],
  }

  const canCreateTicket = can("help", "create")

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
            /* THE DASHBOARD (2026-09-01) — two charts and no numbers (R16: a
               tab strip badge and a stat tile would both be counting the same
               collection twice). Tickets by client is the door's own
               `byAccount` facet, never drawn before tonight; Where the
               tickets are sitting is `TicketStagesCard`, MOVED here from
               below the list (see the note there) rather than duplicated. */
            <CollectionCard>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TicketsByAccountCard teamId={teamId} />
                <TicketStagesCard teamId={teamId} />
              </div>
            </CollectionCard>
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
              // CLIENT, MODULE, ARCHIVED — the toolbar spec Aurora approved
              // overnight (2026-09-01) names Client and Module as the ticket
              // screen's own worked example of "real filter facet chips"; the
              // Status select the old frame drew is still gone (the tab strip
              // above still narrows kind/stage AT THE DOOR — spread into
              // `fetchPage` below, NOT through `facets`, so there are never two
              // controls asking the same field — "the Accounts tab is a bit
              // confusing"). All three are rows/options `COLLECTION_FILTERS.help`
              // now declares; Client and Module are filled in from the accounts
              // and modules this screen reads above, Archived is the closed
              // `view` vocabulary it always was.
              facets={translatedFacets("help", t, {
                accountId: (accountsQ.data ?? [])
                  .filter((a) => a.active)
                  .map((a) => ({ value: a.id, label: a.name })),
                moduleId: (modulesQ.data ?? [])
                  .filter((m) => m.active)
                  .map((m) => ({ value: m.id, label: `${m.appName} · ${m.name}` })),
              })}
              // "RAISE TICKET", AT THE RIGHT OF THE TOOLBAR — PagedFind's own
              // `actions` slot (client ruling, 2026-08-31). No Export/Import
              // beside it: unlike Accounts, tickets has no export or import
              // door (a ticket is a raised conversation, not an importable
              // record — AGENTIC-IMPORT.md), so there is nothing else to draw.
              actions={() => (canCreateTicket ? <AddButton label={t("Raise ticket")} onClick={onCreate} /> : null)}
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
                const data = shapeHelpList(rows, ticketMarks)
                const listRecipe = withDataDrivenCollection(recipe, data.rows ?? [], found.emptyText)
                return (
                  // THE SAME ACTION, PUBLISHED DOWNWARDS (screen-bits.tsx's own
                  // `SectionWithCreate` does this identically) — the create
                  // button now lives in the toolbar above; the engine's
                  // zero-state still needs to name the next act.
                  <CollectionCreateActionProvider
                    action={
                      canCreateTicket
                        ? { label: t("Raise ticket"), icon: <Plus className="size-4" />, onCreate }
                        : null
                    }
                  >
                    {/* No `useKitPanel`: `CollectionCard` above (drawn by `wrap`)
                        is the ONE box now — Accounts dropped it for the same
                        reason the same day ("the broken combination",
                        screen-bits.tsx's own doc on `CollectionCard`). */}
                    <ScreenRenderer
                      recipe={listRecipe}
                      data={data}
                      rights={rights}
                      onAction={onAction}
                      onIntent={onIntent}
                      band={
                        // ARCHIVED IS A QUESTION NOW, not a screen this
                        // component sits on — so this band reads the ACTIVE
                        // question (the same `queryString` the Accounts export
                        // href narrows by) rather than a second copy of the
                        // toolbar's own state.
                        found.queryString.includes("view=archived") ? (
                          <Text as="p" size="sm" tone="secondary">
                            {t(
                              "Archived tickets keep their history and stay searchable. They don't count toward the figures above."
                            )}
                          </Text>
                        ) : undefined
                      }
                    />
                    <LoadMore
                      listKey={
                        found.listKey ??
                        (narrowed ? helpFacetKey(teamId, "all", facet) : helpKey(teamId, "all"))
                      }
                      label={t("Load more tickets")}
                      fetchPage={found.fetchPage}
                    />
                  </CollectionCreateActionProvider>
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
  const { t, lang } = useLanguage()
  const triageQ = useCached(triageKey(teamId), () => contentApi.triage())
  const [busy, setBusy] = React.useState(false)
  const [editing, setEditing] = React.useState<TriageWaiting | null>(null)
  const [replying, setReplying] = React.useState<TriageWaiting | null>(null)
  // THE QUEUE'S OWN SEARCH — moved in from the parent (R50, 2026-09-03 second
  // pass): the toolbar this narrows and the row count that gates it now live
  // in the same component, so "never toolbar on empty collection" can be
  // answered honestly instead of drawn unconditionally one component up from
  // the fetch that actually knows.
  const [query, setQuery] = React.useState("")

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
  /** Tickets settled in this sitting. They leave the front of the order the
   * instant Accept returns, rather than when the door's next answer lands —
   * without this the card would sit on a ticket it had just triaged for as long
   * as the refetch takes. They stay in `total`, because the denominator is how
   * big the sitting was. */
  const [decided, setDecided] = React.useState<string[]>([])
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
  const narrowed = query.trim() !== ""
  const q = query.trim().toLowerCase()
  // The toolbar's search, applied — the ticket's reference and its own words
  // are the two facts on the card, so a query narrows by either.
  const matching = (view?.waiting ?? []).filter(
    (w) =>
      !narrowed ||
      (w.ref ?? "").toLowerCase().includes(q) ||
      richTextPlain(w.description).toLowerCase().includes(q)
  )
  const undecided = matching.filter((w) => !decided.includes(w.id))
  // THE RING (the kit's own word for it): what is still in hand, in the door's
  // own oldest-first order, then whatever has been passed over, in the order it
  // was passed over. `filter` + `map` rather than a sort, because "the order the
  // door gave me, with these moved to the end" is not a comparison between two
  // tickets and writing it as one would invite somebody to add a second key.
  const order = [
    ...undecided.filter((w) => !skipped.includes(w.id)),
    ...skipped
      .map((id) => undecided.find((w) => w.id === id))
      .filter((w): w is TriageWaiting => w !== undefined),
  ]
  const current = order[0]
  const total = undecided.length + decided.length
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
  const peopleOptions: PickerOption[] = staffedOn(
    assignableMembers(membersQ.data),
    appStaff,
    current?.appId
  ).map((m) => ({ value: m.id, label: m.name, picture: m.photo, shape: "round" as const }))

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
          ? t("{name} is on triage this week, so the queue is theirs.", {
              name: view.onDuty.userName,
            })
          : t("Nobody is on triage this week.")}
      </p>
    )
  if (view.waiting.length === 0)
    return <EmptyLine concept="triage">{t("Nothing has been sitting unread. ")}</EmptyLine>

  // ── THE CARD IN HAND ────────────────────────────────────────────────────
  // Everything below is one ticket's worth, in the order the client drew it:
  // the chips, the title, her words beside what she attached, the date, and the
  // decisions. `current` is undefined only once the sitting is finished, which
  // is the kit's `done` register rather than a branch here.
  const gapsSentence = (w: TriageWaiting) =>
    t("Needs {gaps} before it can be triaged", { gaps: w.missing.map((g) => GAP_WORD[g]).join(", ") })

  // AN ISSUE ASKS WHO IS PICKING IT UP; the other three do not. Matched on the
  // WORD, case-insensitively and with a trailing "s" forgiven, which is the
  // technique `ticketTypeWaitsForValidation` (shared/types.ts) already uses on
  // this very field and for the same reason: `Ticket type` is the team's own
  // editable vocabulary, so a rule that hard-matched the seeded spelling would
  // stop firing the day somebody typed "Issues".
  const isIssue = (current?.helpType ?? "").trim().toLowerCase().replace(/s$/, "") === "issue"

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
          note={t("Picking somebody puts them on the ticket and marks it triaged, in one go.")}
          searchPlaceholder={t("Who is picking this up?")}
          emptyText={t("Nobody on this team can be given work yet.")}
          disabled={busy}
        />
      )}
    </div>
  )

  return (
    <>
      <ToolbarRow
        // Reached this line only past both genuinely-empty returns above, so
        // the queue always has at least one waiting row here.
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
        actions={canCreateTicket && <AddButton label={t("Raise ticket")} onClick={onCreate} />}
      />
      {!current && narrowed && decided.length === 0 ? (
        // The ordinary "your search matched nothing" case — the toolbar above
        // stays up so it can be cleared or changed, exactly as `narrowed` does
        // everywhere else in the app. Distinct from the kit's `done` register
        // below, which is a sitting somebody FINISHED.
        <EmptyLine concept="triage">{t("No entries in the triage queue match your search.")}</EmptyLine>
      ) : (
        <Queue
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
          doneLabel={t("Nothing left to sort")}
          doneBody={t("You have been through everything that was waiting.")}
          upcomingLabel={t("Still waiting")}
          nextLabel={t("next")}
          skipLabel={t("Skip")}
          onSkip={current ? () => skip(current) : undefined}
          upcoming={order.slice(1).map((w) => ({
            id: w.id,
            label: [w.ref, richTextPlain(w.description)].filter(Boolean).join(" · "),
          }))}
          eyebrow={current && <TriageChips ticket={current} />}
          title={current && ticketTitle(current)}
          decisions={
            current && (
              <>
                {/* ACCEPT — the one mango on the card, because it is the
                    decision this whole screen exists to make. Disabled while a
                    readiness gap stands: the DOOR refuses the move
                    (shared/triage-readiness.ts rides the model, not the route),
                    so an enabled button here would be a button that fails. */}
                {canTriage && (
                  <Button
                    size="sm"
                    disabled={busy || current.missing.length > 0}
                    title={current.missing.length > 0 ? gapsSentence(current) : undefined}
                    onClick={() =>
                      isIssue
                        ? setPicker((p) => (p === "person" ? null : "person"))
                        : void accept(current)
                    }
                    className="gap-1"
                  >
                    <Check className="size-3.5" />
                    {t("Accept")}
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
                {/* UNDO IS ALWAYS DRAWN AND USUALLY DISABLED, rather than
                    appearing once there is something to take back: a control
                    that arrives mid-sitting moves the two beside it, which is
                    the same complaint the picker row above is shaped around. */}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy || !lastAct}
                  onClick={() => void undo()}
                  className="gap-1"
                >
                  <ArrowCounterClockwise className="size-3.5" />
                  {t("Undo")}
                </Button>
                {pickerRow}
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
              {/* THE DATE, SMALL AND TABULAR — the client's own "raised 10 June
                  2025", and NO reference on this line: the number is already in
                  the black chip above, and saying it twice on one card was the
                  thing she struck. `tabular-nums` is what "monospaced" means
                  everywhere else in this app (the kit's own eyebrow uses it for
                  exactly this line); a second font family would be a type
                  decision nobody has taken. */}
              <p className="text-muted-foreground text-micro tabular-nums">
                {t("raised {date}", { date: formatDate(current.createdAt, lang) })}
              </p>
              {/* WHY IT CANNOT MOVE, said on the card, with the way to fix it
                  beside it. A ticket used to sit here with a button that would
                  fail and no explanation — the owner asked for a pre-triage
                  state, and what was actually missing was never a state but a
                  REASON. The pencil is here rather than in the footer because
                  the footer is the four decisions the client named, and because
                  an edit belongs beside the sentence that says why it is needed:
                  three of the four gaps (a client, an app, who raised it) can
                  only be filled on the form. */}
              {current.missing.length > 0 && (
                <p
                  // `--warning-strong` is the kit's own "the warning WORD"
                  // token, and it resolves to PRIMARY INK rather than orange on
                  // purpose: tokens.css measures the orange FILL at 2.23:1 as
                  // text and rules it out for exactly this use. So the sentence
                  // reads louder than the muted grey around it without
                  // inventing a colour the kit has already refused.
                  className="text-warning-strong flex flex-wrap items-center gap-2 text-xs"
                >
                  <Warning aria-hidden className="size-3.5 shrink-0" />
                  {gapsSentence(current)}
                  {canEdit && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditing(current)}
                      aria-label={t("Edit")}
                      className="gap-1"
                    >
                      <PencilSimple className="size-3.5" />
                      {t("Fill it in")}
                    </Button>
                  )}
                </p>
              )}
              {/* THE WAYS OUT, and they are not decisions — which is why they
                  are here and not in the footer. Open leaves the queue for the
                  ticket's own screen; Reply answers it. The client's ruling is
                  that triage SORTS and does not resolve, so Reply is on the card
                  as a way out of the sitting rather than as one of its moves. */}
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => onOpen(current.id)} className="gap-1">
                  <ArrowUpRight className="size-3.5" />
                  {t("Open")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setReplying(current)} className="gap-1">
                  <PaperPlaneTilt className="size-3.5" />
                  {t("Reply")}
                </Button>
                {canEdit && current.missing.length === 0 && (
                  // ICON-ONLY (client ruling, 2026-08-31: "edit, only the pencil
                  // icon"). It carries its label when a gap is standing, above,
                  // because there it is the way OUT of a refusal.
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(current)}
                    aria-label={t("Edit")}
                  >
                    <PencilSimple className="size-3.5" />
                  </Button>
                )}
              </div>
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
      <TriageReplyDialog
        open={replying !== null}
        onOpenChange={(o) => !o && setReplying(null)}
        draftKey={`help:triage-reply:${replying?.id ?? "none"}`}
        onSubmit={sendReply}
      />
    </>
  )

  /** Edit the ticket without leaving the queue. The SAME dialog and the SAME
   * door the ticket's own screen uses — triage was the one place in the app that
   * could see a request and not change it, which is what made the readiness rule
   * feel like a wall rather than a step. */
  async function saveEdit(input: {
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
  async function sendReply(body: string) {
    if (!replying) return
    await contentApi.replyHelp(replying.id, body)
    // A reply re-sorts one ticket to the top; the row-level live ping the door
    // publishes patches that. The full-list refetch here paid the whole
    // five-read rebuild to move one row.
    toast.success(t("Reply sent."))
  }
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

/** WHAT THE TICKET IS CALLED, on a card that has room for a name.
 *
 * BOTH TITLES, in one order, with a last resort — the same three-step answer
 * `help-detail.tsx` gives and the ticket LIST has always given, so one ticket
 * cannot be called two things on two screens. English first because the app's
 * own language is English and a translation SETS `titleEn` while leaving the
 * German the person wrote; German second because 788 tickets out of Glide have
 * only that; and the description's first line last, because a ticket raised
 * through this app has no title at all — `shapeHelpList` in `deep-link/shape.tsx`
 * names every row in the ticket collection exactly that way.
 *
 * THAT LAST CASE REPEATS THE FIRST LINE OF THE BODY BELOW IT, and that is the
 * right trade rather than an oversight: the alternative is a card whose biggest
 * text is empty, and the repetition is visibly a truncation of the paragraph
 * under it rather than a second fact. */
function ticketTitle(w: TriageWaiting): string {
  const plain = richTextPlain(w.description)
  return w.titleEn?.trim() || w.titleDe?.trim() || (plain.length > 80 ? `${plain.slice(0, 80)}…` : plain)
}

/** THE CHIP LINE — the four facts the client named, in the order she named
 * them: the number, the type, the client, and the person who asked.
 *
 * IT SITS IN THE KIT'S `eyebrow`, which is the slot drawn for precisely this
 * ("#1513 · raised 10 June 2025", per the kit's own note on it) — except that
 * the date has moved to its own line under the description on the client's
 * ruling, so what is left here is the identity of the ticket rather than its
 * age.
 *
 * THE NUMBER IS A BLACK CHIP because she asked for one, and `variant="inverse"`
 * is the kit's word for it: charcoal fill, off-beige label, and it FLIPS with
 * the palette — so "black chip" is still the loudest thing on the card in dark
 * mode, where an actual black would disappear into the paper. R32 is satisfied
 * by construction: the fill is a token pair the kit owns, and this file names no
 * colour at all.
 *
 * A TICKET WITH NO NUMBER DRAWS NO CHIP. `ref` is null on a ticket whose client
 * has no reference code yet (`HelpTicket.ref` says so), and an empty black
 * lozenge is worse than nothing.
 *
 * THE CLIENT AND THE RAISER CARRY THEIR OWN FACES (R35), resolved by the DOOR
 * and not looked up here — see `TriageWaiting`'s own note on why (the accounts
 * cache a screen holds is page one of a growing list). The raiser is `round`
 * because a contact is a person in their own right; the client is a square,
 * because a company is not. */
function TriageChips({ ticket }: { ticket: TriageWaiting }) {
  return (
    // `flex` inside the kit's own `<span>`: an inline-level parent whose child
    // is a block-level flex row is legal here because both are spans, and the
    // kit's line already carries the type treatment these chips override.
    <span className="flex flex-wrap items-center gap-2">
      {ticket.ref && (
        // NOT A BUTTON, though it was for about ten minutes. `Badge` takes no
        // `asChild` (the kit's own signature), and making the number clickable
        // would have meant either a hand-rolled lozenge — a second black chip in
        // the system, R32/R31's exact drift — or an upstream change to a
        // vendored file this repo may not edit. Open is a control of its own on
        // the card below, so nothing is unreachable; the number is a fact here,
        // which is what the client asked it to be.
        <Badge variant="inverse" size="pill">
          {ticket.ref}
        </Badge>
      )}
      <Badge variant="secondary" size="pill">
        {/* THE SAME DOT THE PICKER ROW DRAWS, from the same component and the
            same map — so the colour a person clicks and the colour they read
            back afterwards cannot be two different objects that happen to
            agree today. */}
        <Swatch colour={ticketTypeColour(ticket.helpType)} />
        {/* A TYPE THE TICKET DOES NOT HAVE STILL GETS A CHIP, saying so. The
            missing type is one of the four readiness gaps and the card already
            explains it below; an absent chip here would leave a hole where three
            other cards have a fact. */}
        {ticket.helpType ?? "—"}
      </Badge>
      {ticket.accountName && (
        <Badge variant="secondary" size="pill">
          <RecordMark picture={ticket.accountLogo} name={ticket.accountName} size="choice" />
          {ticket.accountName}
        </Badge>
      )}
      {ticket.raisedByContactName && (
        <Badge variant="secondary" size="pill">
          <RecordMark
            picture={ticket.raisedByContactLogo}
            name={ticket.raisedByContactName}
            shape="round"
            size="choice"
          />
          {ticket.raisedByContactName}
        </Badge>
      )}
    </span>
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
