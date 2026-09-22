"use client"

// THE KNOWLEDGE COLLECTION'S OWN SCREEN — split out of collection-content.tsx's
// pure module switch, the same move that file's own header already documents
// for accounts/contacts/inputs/tasks/tickets/processes/stories/waves: that
// switch is deliberately pure ("no state, no effects"), and the kind-tab
// strip below needs a live sidecar read for its own badges (R16), which only
// a real component can hold hooks for — a module branch that only sometimes
// runs cannot call one without breaking React's own ordering rule the moment
// somebody navigates from Knowledge to any other module in the same mounted
// tree.
//
// THE RULING THIS FILE BUILDS. The client, 17 Sep 2026, verbatim, from a
// consultation: "Knowledge page K2 by kind." Tabs = All, then one tab per
// source KIND the data actually has, each with its own exact count. The Kind
// facet leaves the toolbar — the strip replaces it — compartment/active,
// search, sort and Gallery · Shape all stay exactly as K36 (amended the same
// day) left them.
//
// A SECOND SCOPE, THE SAME COMPONENT (17 Sep 2026). The client's other ruling
// the same day, on the app record: "replicate what we have in the general
// knowledge. This should just be a gallery with all the knowledge we have
// about this, with a toolbar that I can search and filter, [...] and a button
// to ask about this." So this file no longer draws ONE screen — it draws ONE
// GALLERY (the card grid of `KnowledgeSourceCard`, the toolbar's search +
// filter + sort, the R62 empty register and the Ask button), parameterised by
// `scope`: the whole team's base (unchanged from K2, below) or one app's own
// slice of it. One seam, no duplicated JSX — every prop that differs between
// the two is resolved ONCE, near the top of the function, and the
// `<PagedFind>` tree itself is written once and read by both.
//
// WHAT THE APP SCOPE DROPS, ON PURPOSE, and why each is a real subtraction
// rather than an oversight: the kind-TAB STRIP (K2's own shape) becomes a
// plain `kind` facet — a nested record tab has no URL segment of its own to
// deep-link a tab onto (`go`/`sectionPath` are the team screen's, not a
// tab's), and a facet asks the identical question of the identical door. The
// compartment facet is gone too — an app's own material is filed under
// whichever client owns the app, which is one thing to say, not a list to
// pick from. The List · Shape view switch, the Google sync button and the
// settings gear are the team's own furniture (a whole-base picture, a
// personal sweep, a module's settings) and have no reading scoped to one
// app. And there is no "Add a source" / "Upload a file" action here: the
// client's own words named a gallery, a toolbar and an Ask button — not a
// fourth thing to author from a tab that was never asked to grow one.
//
// A THIRD SCOPE, THE SAME COMPONENT AGAIN (22 Sep 2026). Aurora's ruling on
// the ACCOUNT record's own Knowledge tab, verbatim: "on accounst/knoweledge,
// 1. tehres too much blank space begfore teh content 2. replicate how it
// looks in main knowelegde, search, button to ask, preview the content,
// filters by type.. etc." — then, over both hosts: "same for knowelegde
// inside apps." Before this, the account record's Knowledge tab was not a
// thinner GALLERY at all, it mounted `<AskTheAssistant>` alone (account-
// detail.tsx) — no toolbar, no cards, no filters — which is the "too much
// blank space" she measured: the panel painted a small ask box and then
// bare page ground the rest of the way down to the record's own footer band,
// because nothing else was ever drawn there. "account" scope closes that gap
// the identical way "app" did: the same gallery, the same `<PagedFind>` tree,
// narrowed to this account's own compartment (`compartment: account:<id>`,
// the exact string the team scope's own "Filed under" facet already builds
// and the door's `sourcesWhere` already matches) rather than to an `appId`.
//
// ASK MOVES INTO THE TOOLBAR (the same 22 Sep ruling): "in knoweledge when
// isnide app or acount, make ask a button in the toolbar." Both record hosts
// used to float Ask in a standalone row ABOVE `<PagedFind>`, on purpose
// (R50 — the row stands the whole toolbar down on a collection with zero
// rows, and Ask is exactly what a person reaches for then). That reasoning
// still holds for the ONE case it was written for — a truly empty, unsearched
// record — so the standalone row survives for exactly that state; the moment
// there IS a toolbar (any source at all, kind or type narrowed or not), Ask
// now rides inside it, in `<PagedFind>`'s own `actions` slot (R53's own
// right-hand slot), never mango (R84 — this tab has no title component of its
// own to be the one legal home for that).

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import { CardGrid } from "@shared/ui/components/card-grid/card-grid"
import { Graph, ListBullets, Sparkle, UploadSimple } from "@shared/ui/foundations/icons"
import { defaultTabsConfig } from "@shared/web/screen-engine/tabs-view"
import { formatCount } from "@shared/web/format-count"
import { invalidate, primeCache, useCached, useCachedValue } from "@shared/web/store"
import type { ScreenIntent } from "@shared/web/screen-engine/screen-renderer"
import type { Account, KnowledgeSource } from "@shared/types"

import { LoadError, AddButton, CollectionCard } from "@/components/deep-link/screen-bits"
import { CollectionHeading } from "@/components/records/collection-heading"
import { CountedAbove } from "@/components/records/counted-tabs"
import { ModuleSettingsGear } from "@/components/screens/module-settings-screen"
import { KnowledgeShape } from "@/components/knowledge/knowledge-shape"
import { KnowledgeSourceCard } from "@/components/knowledge/knowledge-source-card"
import { definitionPreview } from "@/components/knowledge/glossary-list"
import { KNOWLEDGE_KIND, KNOWLEDGE_KIND_ICON } from "@/components/deep-link/shape"
import { LoadMore } from "@/components/records/load-more"
import { PagedFind, invalidateFindsOf } from "@/components/records/paged-find"
import { COLLECTION_SORTS, translatedSorts } from "@/lib/collection-sorts"
import { accountFacetOption, translatedFacets } from "@/lib/collection-filters"
import { content as contentApi } from "@/lib/api"
import { knowledgeByKindKey, knowledgeKey, totalKey } from "@/lib/live-resources"
import { sliceKey } from "@/components/work/work-panels"
import { GoogleSyncButton } from "@/components/knowledge/google-sync"
import { openNewAgentTab, pickAgentTabScope } from "@/lib/agent-conversation-tabs"
import { setAgentOpen } from "@/lib/agent-open"
import type { Can } from "@/lib/perms"

type Translate = (english: string) => string

/** THE KNOWLEDGE GALLERY'S CARD FLOOR — reused, not re-measured: the same
 * 12rem `GALLERY_MIN_CARD` (accounts-screen.tsx) and `MIN_CARD`
 * (members-gallery.tsx) already carry, because `KnowledgeSourceCard` shrank
 * (client, 17 Sep 2026) to the same class of cell theirs is — a mark, a
 * title, one chip, one line. Passed to `CardGrid`'s `fluid` mode below. */
const KNOWLEDGE_CARD_MIN = "12rem"

/** ONE ACCOUNT'S OWN COMPARTMENT — the exact string the door's own
 * `accountCompartment()` builds (workers/content/src/lib/knowledge.ts) and
 * the team scope's "Filed under" facet already spells inline, a few dozen
 * lines below (`value: \`account:${a.id}\``). Named here rather than left a
 * third inline template literal, now that the account scope's own resting
 * read and its `<PagedFind>` narrowing both need the identical string. */
function accountCompartment(accountId: string): string {
  return `account:${accountId}`
}

/** WHICH SLICE OF THE BASE THIS INSTANCE DRAWS — the team's whole collection
 * (K2, the general Knowledge screen, fed by `collection-content.tsx`'s own
 * `ctx`) or one app's own material (the app record's Knowledge tab, which has
 * no such orchestrator and reads for itself, the same way every other
 * app-record collection does — `work-panels.tsx`'s `sliceKey`). */
export type KnowledgeGalleryScope =
  | {
      kind: "team"
      teamId: string
      go: (path: string, q?: Record<string, string>) => void
      sectionPath: string
      /** `ctx.query.tab` — "all" (the default) or one source kind. Anything
       * the strip does not currently badge (an unrecognised value, or a kind
       * that has dropped to zero since the link was made) falls through to
       * "all" below. */
      tab: string | undefined
      onIntent: (intent: ScreenIntent) => void
      knowledgeQ: { data: KnowledgeSource[] | undefined; error: unknown }
      knowledgeShapeQ: { data: Omit<React.ComponentProps<typeof KnowledgeShape>, "teamId"> | undefined }
      accountsQ: { data: Account[] | undefined }
      // WIDENED FROM `{ id: string; name: string }[]` — R35, the account
      // wearing its own face on the "Filed under" facet below. The door
      // behind this cache key was never the problem: `companiesQ`
      // (use-screen-data.ts) already reads `tenancy.accounts({ type:
      // "entity" })`, which returns the SAME `Account` rows `accountsQ`
      // does, `logoUrl` included — this screen's own prop type was the one
      // place that threw the picture away before the compartment facet ever
      // saw it. `Account` rather than a second bespoke shape, for the same
      // reason `accountsQ` above already is one: one type, not a narrower
      // echo of it per call site.
      companiesQ: { data: Account[] | undefined }
      /** the exact server total (R16) — every source, whatever kind, whatever
       * compartment. What the "All" tab badges. */
      total: number | undefined
      knowledgeView: string
      setKnowledgeView: (v: string) => void
    }
  | {
      kind: "app"
      teamId: string
      appId: string
      /** the app's own name — folded into the empty state and into the Ask
       * button's conversation label, the identical convention
       * `ask-the-assistant.tsx` used for "About {context}: …". */
      appName: string
      onIntent: (intent: ScreenIntent) => void
    }
  | {
      kind: "account"
      teamId: string
      accountId: string
      /** the account's own name — folded into the empty state and into the
       * Ask button's conversation label, the identical convention the "app"
       * scope above already uses. */
      accountName: string
      onIntent: (intent: ScreenIntent) => void
    }

export function KnowledgeScreen({ scope, t, can }: { scope: KnowledgeGalleryScope; t: Translate; can: Can }) {
  const teamId = scope.teamId
  const isApp = scope.kind === "app"
  const isAccount = scope.kind === "account"
  // EITHER RECORD HOST — the two scopes that hang this gallery off one
  // record's own tab rather than off the team's whole Knowledge screen. Every
  // place below that used to ask "is this the app scope" and mean "is this a
  // nested record tab" now asks this instead; the few spots that are truly
  // app-only (the "app" `AgentTabScope`'s own id-narrowed Ask, below) still
  // branch on `isApp` by itself.
  const isRecordHost = isApp || isAccount

  // THE RECORD TAB'S OWN READ. A nested record tab has no `collection-content.tsx`
  // orchestrator feeding it a pre-fetched `knowledgeQ` the way the team screen
  // is fed (below) — so this asks the door itself, over the SAME `sliceKey`
  // seam `work-panels.tsx` gives every other record-hosted collection
  // (sprints, stories, tickets…), which is what makes this list live (R15,
  // `live-resources.ts`'s `knowledge` entry carries both `"knowledge-app-of:"`
  // and `"knowledge-account-of:"` in its own `slicePrefix`) and countable
  // (R16) the same way its siblings already are. `null` on the team branch —
  // never fetched, never cached under a key nobody reads.
  //
  // TWO FILTERS, NEVER ONE MERGED SHAPE — an app narrows by `SourceFilters.appId`
  // (a source's own `app_id` column or its `apps` array), an account narrows by
  // `SourceFilters.compartment` (`account:<id>`, the exact string the team
  // scope's "Filed under" facet already builds below and the door's
  // `sourcesWhere` already matches) — two different columns, so the branch
  // stays explicit rather than one filter object pretending to be the other's.
  const recordKey = isApp
    ? sliceKey("knowledge-app", scope.appId)
    : isAccount
      ? sliceKey("knowledge-account", scope.accountId)
      : null
  const recordKnowledgeQ = useCached<KnowledgeSource[]>(recordKey, () =>
    contentApi
      .knowledge(
        isApp ? { appId: scope.appId } : { compartment: accountCompartment(isAccount ? scope.accountId : "") }
      )
      .then((r) => {
        if (isApp) primeCache(totalKey("knowledge-app", scope.appId), r.total)
        else if (isAccount) primeCache(totalKey("knowledge-account", scope.accountId), r.total)
        return r.sources
      })
  )
  const recordTotal = useCachedValue<number | null>(
    isApp ? totalKey("knowledge-app", scope.appId) : isAccount ? totalKey("knowledge-account", scope.accountId) : null
  )

  // THE TAB STRIP'S OWN BADGES (R16 — one count per tab from the door, never
  // a client-side count of a page). `countSourceKinds`
  // (workers/content/src/lib/knowledge.ts) rides every knowledge list read as
  // a sidecar, the identical shape `countTicketFacets` gives the ticket
  // sub-tab strip's `byType`/`byStatus`: primed by the resting read
  // (live-resources.ts's `listFetch.knowledge`) and re-primed by this
  // screen's own `<PagedFind>` fetch below on every search/facet/tab change,
  // so a badge always answers the question the toolbar is currently asking.
  // TEAM ONLY — the app scope draws no kind-tab strip (its own header above
  // says why), so nothing here ever reads this sidecar for it.
  //
  // HOISTED ABOVE the loading/error early returns below (17 Sep 2026 hygiene
  // pass) — a hook called only once `knowledgeQ` has settled changes this
  // component's hook count between renders, the exact React #310 crash class
  // web/test/hooks-order.test.ts exists to catch.
  const byKind = useCachedValue<Record<string, number>>(knowledgeByKindKey(teamId)) ?? {}

  // THE GLOSSARY'S OWN SEED, the first time the tab is opened on a team that
  // has none yet. HOISTED HERE, beside `byKind` and for the identical reason
  // (its own comment above): every value this reads (`scope.tab`, `scope.kind`,
  // `can`, `teamId`) is safe before the loading/error returns below, so the
  // hook itself never has to be.
  //
  // GUARDED BY A REF, NOT BY "is it empty". The door
  // (`POST /api/content/knowledge/glossary/seed`) is idempotent on its own
  // (matched by word, workers/content/src/lib/knowledge.ts's own
  // `seedGlossaryEntries`), so asking twice costs nothing but a wasted round
  // trip; the ref is only what stops this effect asking every render while
  // the tab stays open. Reset per team, so switching teams can seed the next
  // one.
  // `scope.tab` only exists on the "team" variant of `KnowledgeGalleryScope`
  // (the app scope draws no tab strip at all, this file's own header says
  // why), read into a plain, always-defined local so both the effect body
  // and its own dependency array below can name it without narrowing.
  const scopeTab = scope.kind === "team" ? scope.tab : undefined
  const seededGlossaryFor = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (scopeTab !== "glossary") return
    if (!teamId || !can("knowledge", "create")) return
    if (seededGlossaryFor.current === teamId) return
    seededGlossaryFor.current = teamId
    contentApi
      .seedGlossary()
      .then((r) => {
        // THE BUG THIS GUARDS: `fixed={{ kind: "glossary" }}` a few lines below
        // makes `<PagedFind>`'s own `active` TRUE the whole time this tab is
        // open (paged-find.tsx's own `T3654` note — any non-empty `fixed`
        // folds into `query`, so `active` never falls back to the resting
        // read here). That means the rows on screen always come from the
        // FOUND cache, `find:${knowledgeKey(teamId)}:kind=glossary`, never
        // from `knowledgeKey(teamId)` itself — so invalidating only the plain
        // list key left the tab reading its own pre-seed (empty) answer for
        // the rest of the session, on a team whose door had just written 54
        // rows. `invalidateFindsOf` is the exact seam `paged-find.tsx` built
        // for this shape; call it beside the plain invalidate (kept for the
        // "All"/other tabs' own resting reads and for `restingEmpty`, which
        // still read off `knowledgeKey(teamId)` directly).
        if (r.created > 0) {
          invalidate(knowledgeKey(teamId))
          invalidateFindsOf(knowledgeKey(teamId))
        }
      })
      .catch(() => {
        // A failed seed is silent and retryable: leaving the ref cleared means
        // the next time this tab is opened (or this effect re-runs) it simply
        // tries again, same as if it had never run.
        if (seededGlossaryFor.current === teamId) seededGlossaryFor.current = null
      })
  }, [scopeTab, teamId, can])

  const knowledgeQ = scope.kind === "team" ? scope.knowledgeQ : recordKnowledgeQ
  if (knowledgeQ.error) return <LoadError what="the knowledge base" />
  if (knowledgeQ.data === undefined) return <Skeleton variant="list" lines={4} />
  // THE ACCOUNT a source is filed under — the list says "Bergman S.A.", never
  // `account:01J…`, and (R35, client ruling 2026-09-09: "for accounts include
  // icon in select components and filters") wears its own face on the
  // compartment facet below. `accountsQ` is gated to the accounts/contacts
  // screens, so it is empty on THIS one; `companiesQ` asks the door directly.
  // Merged with whatever `accountsQ` happens to already hold. THE WHOLE ROW,
  // not just the name — `logoUrl` rides along for free now that this
  // screen's own `companiesQ` prop type carries it (see its own note above).
  // TEAM ONLY — the app scope offers no compartment facet, so it never needs
  // these rows.
  const accountsFiledUnder =
    scope.kind === "team"
      ? new Map([
          ...(scope.accountsQ.data ?? []).map((a) => [a.id, a] as const),
          ...(scope.companiesQ.data ?? []).map((a) => [a.id, a] as const),
        ])
      : new Map<string, Account>()
  const loadedSources = knowledgeQ.data
  const canCreateKnowledge = scope.kind === "team" && can("knowledge", "create")

  // ONE TAB PER SOURCE KIND THE DATA ACTUALLY HAS — her own words. A kind
  // with zero sources today draws no tab; `KNOWLEDGE_KIND`'s own declaration
  // order (shape.tsx) gives a stable order to filter down from, never the
  // order sources happen to load in. TEAM ONLY.
  //
  // "glossary" IS EXCLUDED HERE ON PURPOSE. Every other kind's tab is allowed
  // to not exist until a source of it does; the Glossary tab is the one place
  // that would be a chicken-and-egg trap, nothing can BECOME the first
  // glossary word until the tab that seeds them can be opened. So it is drawn
  // by hand, always, just below "All", never derived from a count that starts
  // at zero (kindTabsSpreadAt in web/test/knowledge-kind-tabs.test.tsx notes
  // the same reason).
  const kindTabs = Object.keys(KNOWLEDGE_KIND)
    .filter((k) => k !== "glossary" && (byKind[k] ?? 0) > 0)
    .map((k) => ({
      value: k,
      label: KNOWLEDGE_KIND[k] ?? k,
      icon: KNOWLEDGE_KIND_ICON[k] ?? "file",
      badge: formatCount(byKind[k]),
      badgeVariant: "" as const,
    }))
  const total = scope.kind === "team" ? scope.total : (recordTotal ?? undefined)
  const allBadge = formatCount(total)
  const knowledgeTabs = [
    { value: "all", label: t("All"), icon: "asterisk", badge: allBadge, badgeVariant: "" as const },
    {
      value: "glossary",
      label: t("Glossary"),
      icon: KNOWLEDGE_KIND_ICON.glossary ?? "book-open-text",
      badge: formatCount(byKind.glossary),
      badgeVariant: "" as const,
    },
    ...kindTabs,
  ]
  // "ALL" IS DEFAULT — a tab value that no longer badges anything (an
  // unrecognised `?tab=`, or a kind whose last source just left) falls
  // through to it rather than to a tab the strip cannot draw. "glossary" is
  // the one tab value ALWAYS accepted even at a zero count, for the reason
  // `kindTabs`'s own filter above gives.
  const activeTab =
    scope.kind === "team" && scope.tab && (scope.tab === "glossary" || byKind[scope.tab]) ? scope.tab : "all"
  // "app" NEVER SHOWS THE SHAPE VIEW — the whole-base picture answers a
  // different question ("where is the knowledge, and where is there none")
  // than one app's own tab ever asks (this file's own header says the rest).
  const knowledgeView = scope.kind === "team" ? scope.knowledgeView : "list"
  // THE GLOSSARY TAB DEFAULTS TO ALPHABETICAL. "Title" (KNOWLEDGE_SORTS.title)
  // is the natural reading order there, still an ordinary SortControl (R53) a
  // person can leave for "recently changed" like every other tab. Named here,
  // not inline on <PagedFind> below, so the tag's own props stay short.
  const knowledgeDefaultSort =
    scope.kind === "team" && activeTab === "glossary" ? "title" : COLLECTION_SORTS.knowledge.defaultSort

  const listKey = isApp
    ? sliceKey("knowledge-app", scope.appId)
    : isAccount
      ? sliceKey("knowledge-account", scope.accountId)
      : knowledgeKey(teamId)

  function openAskConversation() {
    const id = openNewAgentTab()
    // NO TAB LABEL PASSED ANY MORE — `pickAgentTabScope`'s own header
    // (web/lib/agent-conversation-tabs.ts) has the reversal: the scope's
    // name is not the conversation's title, so this only ever hands over
    // what the FIRST-MESSAGE PREFIX needs (`recordLabel`/`scopeId`); the tab
    // reads "New" until `agent-panel.tsx`'s `handleSend` titles it off the
    // question actually asked.
    //
    // "app" CARRIES A STRUCTURED ID (`scopeId`) — the one record kind the
    // retrieval door can narrow BY exactly (`ask_knowledge`'s own `appId`).
    // "account" HAS NO SUCH DOOR PARAMETER, so it rides the same "record"
    // scope the generic in-panel picker already uses for every other kind of
    // record — a name folded into the first message's own prose ("About the
    // account {name}: …"), the identical mechanism `ask-the-assistant.tsx`
    // already used on this exact tab before this change, and the one
    // `agent-panel.tsx`'s own comment on `handleSend` names as how an
    // ordinary record-scoped question already resolves an account's
    // compartment today. Adding a second structured, id-narrowed scope for
    // accounts (mirroring "app") is real, further work — it would need a new
    // `accountId` parameter on the retrieval door and the tool schema wired
    // through R19/R22/R27 — and is out of this change's own scope, which is
    // the record-hosted GALLERY, not the retrieval door.
    if (isApp) pickAgentTabScope(id, "app", scope.appName, scope.appId)
    else if (isAccount) pickAgentTabScope(id, "record", scope.accountName)
    else pickAgentTabScope(id, "knowledge")
    setAgentOpen(true)
  }

  if (isRecordHost)
    return (
      <div className="flex flex-col gap-4">
        {/* THE ASK BUTTON'S OUTER FALLBACK — the one case R50 leaves it no
            home inside `<PagedFind>`: a truly empty, unsearched record (that
            row stands its WHOLE toolbar down at zero rows, actions slot
            included, and asking is exactly what a person reaches for then).
            The moment there IS a toolbar (any source at all), this wrapper
            draws nothing and Ask lives in the toolbar's own `actions` slot
            below instead — her ruling, 22 Sep 2026: "make ask a button in
            the toolbar." Never mango (R84) — this tab has no title
            component of its own to be the one legal home for that, so the
            button reads `variant="inverse"` in both homes. */}
        {loadedSources.length === 0 && (
          <div className="flex justify-end">
            <Button variant="inverse" className="gap-1" onClick={openAskConversation}>
              <Sparkle className="size-4" aria-hidden />
              {t("Ask")}
            </Button>
          </div>
        )}
        {renderGallery()}
      </div>
    )

  return (
    // R16's ARBITRATION — the tab strip now carries the exact count "All"
    // badges, so `CollectionHeading`'s own `total` stands down rather than
    // showing the same number twice (the identical shape accounts-screen.tsx
    // uses for its own Active/Inactive/All strip, one collection over).
    <CountedAbove active={allBadge !== ""}>
      {/* --heading-strip-gap (web/app/globals.css) - see accounts-screen.tsx's
          identical note; Aurora, 22 Sep 2026. Scoped to THIS branch (the team
          collection, which carries the kind-tab strip below) - the app-scope
          branch above draws no tabs and is untouched. */}
      <div className="flex flex-col gap-[var(--heading-strip-gap)]">
        {/* THE TITLE LINE — R84: the mango Ask button is the one legal home for
            a mango button, so it (and Sync, and the gear last — her own words,
            "the gear should be on the very far right") lives inside
            CollectionHeading's own `action` prop. */}
        <CollectionHeading sectionKey="knowledge"
          total={total}
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {/* A fresh conversation, scoped straight to the knowledge base —
                  the scope picker already offers that scope
                  (`AgentTabScope`, agent-conversation-tabs.ts) — through the
                  same tab-store door the assistant's own "+" uses, then
                  opened; the panel's own open effect hands focus to the
                  composer the moment it becomes visible. */}
              <Button variant="default" className="gap-1" onClick={openAskConversation}>
                <Sparkle className="size-4" aria-hidden />
                {t("Ask")}
              </Button>
              <GoogleSyncButton
                teamId={teamId}
                scope="knowledge"
                describe={false}
                onSynced={() => invalidate(knowledgeKey(teamId))}
              />
              <ModuleSettingsGear teamId={teamId ?? null} segment="knowledge" />
            </div>
          }
        />
        {renderGallery()}
      </div>
    </CountedAbove>
  )

  // THE GALLERY ITSELF — a nested, HOISTED function declaration (not a `const`)
  // so both branches above can call it despite it being written below them:
  // `<CollectionHeading>` (R84's one legal mango home) has to lead the team
  // branch's own JSX in the SOURCE, not only on screen — web/test/
  // knowledge-head.test.tsx reads this file off disk and checks the head ends
  // where `<PagedFind>` begins, which only holds if the tag is textually AFTER
  // `<CollectionHeading>`. One `<PagedFind>` tree, written once, called twice.
  function renderGallery() {
    return (
    <>
      {/* THE LIST IS AN ARCHIVE — it pages (R14) and carries the kind-tab
          strip (K2 by kind, team only), compartment/active facets (team
          only), search, sort and the List · Shape switch (team only). The
          strip PINS for free (R77) — `renderFolderTabs` is the one place a
          `tabs` prop ever draws, and every host of it already wears
          `STICKY_FOLDER_TABS`. */}
      <PagedFind<KnowledgeSource>
        sorts={translatedSorts("knowledge", t)}
        defaultSort={knowledgeDefaultSort}
        restingEmpty={loadedSources.length === 0}
        listKey={listKey}
        fixed={
          isApp
            ? { appId: scope.appId }
            : isAccount
              ? { compartment: accountCompartment(scope.accountId) }
              : activeTab === "all"
                ? undefined
                : { kind: activeTab }
        }
        fetchPage={(query, cursor) =>
          contentApi.knowledge({ ...query, cursor }).then((r) => {
            if (scope.kind === "team") primeCache(knowledgeByKindKey(teamId), r.byKind)
            else if (isApp) primeCache(totalKey("knowledge-app", scope.appId), r.total)
            else if (isAccount) primeCache(totalKey("knowledge-account", scope.accountId), r.total)
            return { rows: r.sources, nextCursor: r.nextCursor, total: r.total }
          })
        }
        placeholder={t("Search sources…")}
        matches={{
          none: t("No sources match"),
          one: t("1 source matches"),
          many: t("{count} sources match"),
        }}
        facets={
          scope.kind === "team"
            ? translatedFacets("knowledge", t, {
                // EACH ACCOUNT WEARS ITS OWN FACE (R35, client 18 Sep 2026) —
                // `accountFacetOption` (collection-filters.ts) says why and
                // how. "The agency" names no record and carries no mark.
                compartment: [
                  { value: "agency", label: t("The agency") },
                  ...[...accountsFiledUnder.values()].map((a) => ({
                    ...accountFacetOption(a),
                    value: `account:${a.id}`,
                  })),
                ],
              }).filter((f) => f.field !== "kind")
            : translatedFacets("knowledge", t, {}).filter((f) => f.field !== "compartment")
        }
        view={
          scope.kind === "team"
            ? {
                views: [
                  { value: "list", label: t("List"), icon: <ListBullets className="size-4" /> },
                  { value: "shape", label: t("Shape"), icon: <Graph className="size-4" /> },
                ],
                value: knowledgeView,
                onValueChange: (v: string) => scope.setKnowledgeView(v === "shape" ? "shape" : "list"),
              }
            : undefined
        }
        tabs={
          scope.kind === "team"
            ? {
                config: { ...defaultTabsConfig, tabs: knowledgeTabs },
                value: activeTab,
                onValueChange: (v) => scope.go(scope.sectionPath, v === "all" ? {} : { tab: v }),
              }
            : undefined
        }
        actions={() =>
          // ASK, INSIDE THE TOOLBAR NOW (22 Sep 2026 ruling, this file's own
          // header says the rest) — the whole reason `isRecordHost` exists:
          // this slot only ever draws once the standalone fallback above has
          // already stood down (`loadedSources.length > 0`), so Ask is never
          // offered twice. `variant="inverse"`, same reasoning as the
          // fallback's own button — R84's one legal mango home is a screen's
          // own title component, and this tab draws no title of its own.
          isRecordHost ? (
            <Button variant="inverse" className="gap-1" onClick={openAskConversation}>
              <Sparkle className="size-4" aria-hidden />
              {t("Ask")}
            </Button>
          ) : !canCreateKnowledge ? null : scope.kind === "team" && activeTab === "glossary" ? (
            <AddButton
              label={t("Add a word")}
              onClick={() => scope.go(scope.sectionPath, { tab: "glossary", panel: "add", module: "knowledge-glossary" })}
            />
          ) : (
            <>
              <Button
                variant="secondary"
                className="gap-1"
                onClick={() => scope.kind === "team" && scope.go(scope.sectionPath, { panel: "add", module: "knowledge-file" })}
              >
                <UploadSimple className="size-4" />
                {t("Upload a file")}
              </Button>
              <AddButton
                label={t("Add a source")}
                onClick={() => scope.kind === "team" && scope.go(scope.sectionPath, { panel: "add", module: "knowledge" })}
              />
            </>
          )
        }
        // THE NESTED CARD — the app scope's own toolbar and rows read as ONE
        // panel, the identical wrapper every other app-record collection uses
        // (`work-panels.tsx`'s `PagedPanelBody`). The team screen already
        // wrapped itself the same way.
        wrap={(inner) => <CollectionCard>{inner}</CollectionCard>}
      >
        {(found) => {
          // THE PICTURE IS THE WHOLE BASE, so it stands outside the paged
          // rows — the switch that chose it is a slot on this row (R53).
          // TEAM ONLY: the app scope never sets `knowledgeView` to "shape"
          // (it draws no switch to set it with).
          if (scope.kind === "team" && knowledgeView === "shape") {
            if (!scope.knowledgeShapeQ.data) return <Skeleton variant="list" lines={4} />
            return <KnowledgeShape teamId={teamId} {...scope.knowledgeShapeQ.data} />
          }
          const rows = found.active ? found.rows : loadedSources
          if (rows === null) return <Skeleton variant="list" lines={4} />
          // THE GLOSSARY'S OWN SHAPE, THE SAME CARD AND GRID AS "ALL". Aurora,
          // on this tab's own dl/dt/dd rows, verbatim, 21 Sep 2026: "But why
          // did you invent this new design? Why don't you use the kind of
          // square card, same as in all?" `KnowledgeSourceCard` is the exact
          // component the "All" tab's own `<CardGrid>` maps below, the word as
          // its title, the definition preview (`definitionPreview`,
          // glossary-list.tsx) as its one body line in place of "Last edited",
          // and the SAME card actions "All" offers: none drawn on the cell
          // itself, the whole card is the one press target. For a glossary
          // word that press opens the identical correction dialog the row's
          // own pencil used to (`?panel=edit&module=knowledge-glossary`),
          // which is "edit stays"; no deactivate control exists on this card,
          // or ever did, so her earlier ruling ("disable the off button, only
          // edit") holds without anything here re-asking the question.
          // NEVER RE-FILTERED WHILE A FIND IS RUNNING (R14): `found.rows` is
          // already the door's own answer to `fixed={{kind:"glossary"}}`
          // above, kind and all, so narrowing it again in the browser would
          // be asking the exact question R14's own law forbids. Only the
          // RESTING branch (`!found.active`) needs the kind filter, because
          // `loadedSources` there is the WHOLE base, unlike every other tab's
          // own resting branch, which never narrows by kind at all.
          if (scope.kind === "team" && activeTab === "glossary") {
            const glossaryRows = found.active ? rows : rows.filter((s) => s.kind === "glossary")
            return (
              <>
                {glossaryRows.length === 0 ? (
                  <CollectionEmptyState
                    title={t("Nothing in the glossary yet.")}
                    description={t(
                      "The words this team uses, and what each one means. Add one, and the assistant can answer from it too."
                    )}
                    filtered={found.active}
                    onCreate={
                      canCreateKnowledge
                        ? () => scope.go(scope.sectionPath, { tab: "glossary", panel: "add", module: "knowledge-glossary" })
                        : undefined
                    }
                  />
                ) : (
                  <CardGrid fluid minItemWidth={KNOWLEDGE_CARD_MIN} label={t("Glossary")}>
                    {glossaryRows.map((source) => (
                      <KnowledgeSourceCard
                        key={source.id}
                        source={source}
                        preview={definitionPreview(source)}
                        onOpen={() =>
                          scope.go(scope.sectionPath, {
                            tab: "glossary",
                            panel: "edit",
                            module: "knowledge-glossary",
                            id: source.id,
                          })
                        }
                      />
                    ))}
                  </CardGrid>
                )}
                <LoadMore
                  listKey={found.listKey ?? listKey}
                  label={t("Load more words")}
                  fetchPage={found.fetchPage}
                />
              </>
            )
          }
          return (
            <>
              {rows.length === 0 ? (
                <CollectionEmptyState
                  title={
                    isApp
                      ? t("Nothing filed under this app yet.")
                      : isAccount
                        ? t("Nothing filed under this account yet.")
                        : t("Nothing in the knowledge base yet.")
                  }
                  description={
                    isApp
                      ? t(
                          "Everything the assistant knows about this app will show up here: its tickets, process maps and meetings, and anything filed against it by hand."
                        )
                      : isAccount
                        ? t(
                            "Everything the assistant knows about this account will show up here: its tickets, meetings and sprints, and anything filed against it by hand."
                          )
                        : t(
                            "This is everything the assistant is allowed to read. Add a note or a file, and it can start answering from it."
                          )
                  }
                  filtered={found.active}
                  onCreate={
                    canCreateKnowledge && scope.kind === "team"
                      ? () => scope.go(scope.sectionPath, { panel: "add", module: "knowledge" })
                      : undefined
                  }
                />
              ) : (
                <CardGrid fluid minItemWidth={KNOWLEDGE_CARD_MIN} label={t("Sources")}>
                  {rows.map((source) => (
                    <KnowledgeSourceCard
                      key={source.id}
                      source={source}
                      onOpen={() => scope.onIntent?.({ kind: "open", module: "knowledge", id: source.id })}
                    />
                  ))}
                </CardGrid>
              )}
              {/* R14: one source per ticket, per article, per account, plus every
                  note anybody writes — the list pages. */}
              <LoadMore
                listKey={found.listKey ?? listKey}
                label={t("Load more sources")}
                fetchPage={found.fetchPage}
              />
            </>
          )
        }}
      </PagedFind>
    </>
    )
  }
}
