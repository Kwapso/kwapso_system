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

import * as React from "react"

import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import { CardGrid } from "@shared/ui/components/card-grid/card-grid"
import { Button } from "@shared/ui/components/button/button"
import { Graph, ListBullets, Sparkle, UploadSimple } from "@shared/ui/foundations/icons"
import { defaultTabsConfig } from "@shared/web/screen-engine/tabs-view"
import { formatCount } from "@shared/web/format-count"
import { invalidate, primeCache, useCachedValue } from "@shared/web/store"
import type { ScreenIntent } from "@shared/web/screen-engine/screen-renderer"
import type { Account, KnowledgeSource } from "@shared/types"

import { LoadError, AddButton, CollectionCard } from "@/components/deep-link/screen-bits"
import { CollectionHeading } from "@/components/records/collection-heading"
import { CountedAbove } from "@/components/records/counted-tabs"
import { ModuleSettingsGear } from "@/components/screens/module-settings-screen"
import { KnowledgeShape } from "@/components/knowledge/knowledge-shape"
import { KnowledgeSourceCard } from "@/components/knowledge/knowledge-source-card"
import { KNOWLEDGE_KIND, KNOWLEDGE_KIND_ICON } from "@/components/deep-link/shape"
import { LoadMore } from "@/components/records/load-more"
import { PagedFind } from "@/components/records/paged-find"
import { COLLECTION_SORTS, translatedSorts } from "@/lib/collection-sorts"
import { translatedFacets } from "@/lib/collection-filters"
import { content as contentApi } from "@/lib/api"
import { knowledgeByKindKey, knowledgeKey } from "@/lib/live-resources"
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

export function KnowledgeScreen({
  teamId,
  t,
  go,
  sectionPath,
  tab,
  can,
  onIntent,
  knowledgeQ,
  knowledgeShapeQ,
  accountsQ,
  companiesQ,
  total,
  knowledgeView,
  setKnowledgeView,
}: {
  teamId: string
  t: Translate
  go: (path: string, q?: Record<string, string>) => void
  sectionPath: string
  /** `ctx.query.tab` — "all" (the default) or one source kind. Anything the
   * strip does not currently badge (an unrecognised value, or a kind that has
   * dropped to zero since the link was made) falls through to "all" below. */
  tab: string | undefined
  can: Can
  onIntent: (intent: ScreenIntent) => void
  knowledgeQ: { data: KnowledgeSource[] | undefined; error: unknown }
  knowledgeShapeQ: { data: Omit<React.ComponentProps<typeof KnowledgeShape>, "teamId"> | undefined }
  accountsQ: { data: Account[] | undefined }
  companiesQ: { data: { id: string; name: string }[] | undefined }
  /** the exact server total (R16) — every source, whatever kind, whatever
   * compartment. What the "All" tab badges. */
  total: number | undefined
  knowledgeView: string
  setKnowledgeView: (v: string) => void
}) {
  // THE TAB STRIP'S OWN BADGES (R16 — one count per tab from the door, never
  // a client-side count of a page). `countSourceKinds`
  // (workers/content/src/lib/knowledge.ts) rides every knowledge list read as
  // a sidecar, the identical shape `countTicketFacets` gives the ticket
  // sub-tab strip's `byType`/`byStatus`: primed by the resting read
  // (live-resources.ts's `listFetch.knowledge`) and re-primed by this
  // screen's own `<PagedFind>` fetch below on every search/facet/tab change,
  // so a badge always answers the question the toolbar is currently asking.
  //
  // HOISTED ABOVE the loading/error early returns below (17 Sep 2026 hygiene
  // pass) — a hook called only once `knowledgeQ` has settled changes this
  // component's hook count between renders, the exact React #310 crash class
  // web/test/hooks-order.test.ts exists to catch.
  const byKind = useCachedValue<Record<string, number>>(knowledgeByKindKey(teamId)) ?? {}

  if (knowledgeQ.error) return <LoadError what="the knowledge base" />
  if (knowledgeQ.data === undefined) return <Skeleton variant="list" lines={4} />
  // The account NAMES a source is filed under — the list says "Bergman S.A.",
  // never `account:01J…`. `accountsQ` is gated to the accounts/contacts
  // screens, so it is empty on THIS one; `companiesQ` asks the door directly.
  // Merged with whatever `accountsQ` happens to already hold.
  const names = new Map([
    ...(accountsQ.data ?? []).map((a) => [a.id, a.name] as const),
    ...(companiesQ.data ?? []).map((a) => [a.id, a.name] as const),
  ])
  const loadedSources = knowledgeQ.data
  const canCreateKnowledge = can("knowledge", "create")

  // ONE TAB PER SOURCE KIND THE DATA ACTUALLY HAS — her own words. A kind
  // with zero sources today draws no tab; `KNOWLEDGE_KIND`'s own declaration
  // order (shape.tsx) gives a stable order to filter down from, never the
  // order sources happen to load in.
  const kindTabs = Object.keys(KNOWLEDGE_KIND)
    .filter((k) => (byKind[k] ?? 0) > 0)
    .map((k) => ({
      value: k,
      label: KNOWLEDGE_KIND[k] ?? k,
      icon: KNOWLEDGE_KIND_ICON[k] ?? "file",
      badge: formatCount(byKind[k]),
      badgeVariant: "" as const,
    }))
  const allBadge = formatCount(total)
  const knowledgeTabs = [
    { value: "all", label: t("All"), icon: "asterisk", badge: allBadge, badgeVariant: "" as const },
    ...kindTabs,
  ]
  // "ALL" IS DEFAULT — a tab value that no longer badges anything (an
  // unrecognised `?tab=`, or a kind whose last source just left) falls
  // through to it rather than to a tab the strip cannot draw.
  const activeTab = tab && byKind[tab] ? tab : "all"

  return (
    // R16's ARBITRATION — the tab strip now carries the exact count "All"
    // badges, so `CollectionHeading`'s own `total` stands down rather than
    // showing the same number twice (the identical shape accounts-screen.tsx
    // uses for its own Active/Inactive/All strip, one collection over).
    <CountedAbove active={allBadge !== ""}>
      <div className="flex flex-col gap-4">
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
              <Button
                variant="default"
                className="gap-1"
                onClick={() => {
                  const id = openNewAgentTab()
                  pickAgentTabScope(id, "knowledge", t("Knowledge"))
                  setAgentOpen(true)
                }}
              >
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
        {/* THE LIST IS AN ARCHIVE — it pages (R14) and carries the kind-tab
            strip (K2 by kind, above), compartment/active facets, search,
            sort and the List · Shape switch. The strip PINS for free
            (R77) — `renderFolderTabs` is the one place a `tabs` prop ever
            draws, and every host of it already wears `STICKY_FOLDER_TABS`. */}
        <PagedFind<KnowledgeSource>
          sorts={translatedSorts("knowledge", t)}
          defaultSort={COLLECTION_SORTS.knowledge.defaultSort}
          // R50 — the resting read's own row count.
          restingEmpty={loadedSources.length === 0}
          listKey={knowledgeKey(teamId)}
          view={{
            views: [
              { value: "list", label: t("List"), icon: <ListBullets className="size-4" /> },
              { value: "shape", label: t("Shape"), icon: <Graph className="size-4" /> },
            ],
            value: knowledgeView,
            onValueChange: (v: string) => setKnowledgeView(v === "shape" ? "shape" : "list"),
          }}
          placeholder={t("Search sources…")}
          matches={{
            none: t("No sources match"),
            one: t("1 source matches"),
            many: t("{count} sources match"),
          }}
          // THE KIND FACET IS GONE, THE TABS REPLACE IT — her own ruling. Only
          // `compartment` and `active` stay on the toolbar; both are rows/a
          // closed vocabulary the door still narrows by underneath whichever
          // tab is open.
          facets={translatedFacets("knowledge", t, {
            compartment: [
              { value: "agency", label: t("The agency") },
              ...[...names].map(([id, name]) => ({ value: `account:${id}`, label: name })),
            ],
          }).filter((f) => f.field !== "kind")}
          tabs={{
            config: { ...defaultTabsConfig, tabs: knowledgeTabs },
            value: activeTab,
            // "all" IS DEFAULT, so a press back onto it omits `tab` from the
            // URL entirely.
            onValueChange: (v) => go(sectionPath, v === "all" ? {} : { tab: v }),
          }}
          fixed={activeTab === "all" ? undefined : { kind: activeTab }}
          fetchPage={(query, cursor) =>
            contentApi.knowledge({ ...query, cursor }).then((r) => {
              // RE-PRIME THE STRIP'S OWN BADGES on every search/facet/tab
              // fetch, not only the resting one — the identical shape the
              // ticket sub-tab strip's `helpFacet` fetcher takes for
              // `help-by-type`/`help-by-status`, so a badge never answers a
              // question the toolbar has since moved on from.
              primeCache(knowledgeByKindKey(teamId), r.byKind)
              return { rows: r.sources, nextCursor: r.nextCursor, total: r.total }
            })
          }
          actions={() =>
            canCreateKnowledge ? (
              <>
                <Button
                  variant="secondary"
                  className="gap-1"
                  onClick={() => go(sectionPath, { panel: "add", module: "knowledge-file" })}
                >
                  <UploadSimple className="size-4" />
                  {t("Upload a file")}
                </Button>
                <AddButton
                  label={t("Add a source")}
                  onClick={() => go(sectionPath, { panel: "add", module: "knowledge" })}
                />
              </>
            ) : null
          }
          wrap={(inner) => <CollectionCard>{inner}</CollectionCard>}
        >
          {(found) => {
            // THE PICTURE IS THE WHOLE BASE, so it stands outside the paged
            // rows — the switch that chose it is a slot on this row (R53).
            if (knowledgeView === "shape") {
              if (!knowledgeShapeQ.data) return <Skeleton variant="list" lines={4} />
              return <KnowledgeShape teamId={teamId} {...knowledgeShapeQ.data} />
            }
            const rows = found.active ? found.rows : loadedSources
            if (rows === null) return <Skeleton variant="list" lines={4} />
            return (
              <>
                {rows.length === 0 ? (
                  <CollectionEmptyState
                    title={t("Nothing in the knowledge base yet.")}
                    description={t(
                      "This is everything the assistant is allowed to read. Add a note or a file, and it can start answering from it."
                    )}
                    filtered={found.active}
                    onCreate={canCreateKnowledge ? () => go(sectionPath, { panel: "add", module: "knowledge" }) : undefined}
                  />
                ) : (
                  <CardGrid fluid minItemWidth={KNOWLEDGE_CARD_MIN} label={t("Sources")}>
                    {rows.map((source) => (
                      <KnowledgeSourceCard
                        key={source.id}
                        source={source}
                        onOpen={() => onIntent?.({ kind: "open", module: "knowledge", id: source.id })}
                      />
                    ))}
                  </CardGrid>
                )}
                {/* R14: one source per ticket, per article, per account, plus every
                    note anybody writes — the list pages. */}
                <LoadMore
                  listKey={found.listKey ?? knowledgeKey(teamId)}
                  label={t("Load more sources")}
                  fetchPage={found.fetchPage}
                />
              </>
            )
          }}
        </PagedFind>
      </div>
    </CountedAbove>
  )
}
