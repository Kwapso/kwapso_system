"use client"

// PROCESS MAPS — the sidebar page: what the work saved, and every map it came
// from.
//
// The VALUE comes first on purpose. The list of maps is how the team maintains
// the numbers; the number is why anybody maintains them. Putting the drill-down
// above the list means the first thing a person sees when they open this page is
// the sentence they will say to a client, with the App → Process → Step trail
// under it that answers the next question.
//
// The screen owns its own create dialog rather than routing through the host's
// ?panel machinery, the way the dropdown-values screen does: a map needs the
// list of apps to be created at all, and that is this screen's data.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { toast } from "@shared/ui/components/sonner/sonner"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import {
  ScreenRenderer,
  type ScreenActionContext,
  type ScreenIntent,
} from "@shared/web/screen-engine/screen-renderer"
import type { ScreenRecipe, ScreenRights } from "@shared/web/screen-engine/recipe"

import { CollectionHeading } from "@/components/records/collection-heading"
import { RecordMark } from "@shared/web/record-mark"
import { LoadMore } from "@/components/records/load-more"
import { PagedFind } from "@/components/records/paged-find"
import { COLLECTION_SORTS, translatedSorts } from "@/lib/collection-sorts"
import { translatedFacets } from "@/lib/collection-filters"
import { AddButton, CollectionCard } from "@/components/deep-link/screen-bits"
import { CollectionCreateActionProvider } from "@shared/web/screen-engine/collection-frame"
import { AppFormDialog, type AppFormValues } from "@/components/apps/app-form-dialog"
import { useAssignableMembers } from "@/lib/members"
import { useSessionUserId } from "@/lib/use-active-team"
import { ProcessFormDialog, type ProcessFormValues } from "@/components/process/process-form-dialog"
import { ImpactPanel } from "@/components/process/impact-panel"
import { ApiFailure, tenancy } from "@/lib/api"
import { accountsKey, appsKey, listFetch, processesKey, impactKey } from "@/lib/live-resources"
import { withDataDrivenCollection } from "@/lib/screens"
import type { Account, AppRow, ProcessSummary } from "@shared/types"
import type { SavingsView } from "@shared/workers/savings"
import { invalidate, useCached } from "@shared/web/store"
import { useT } from "@shared/web/language"

/** One map, as a row. The summary line is what you'd read out loud: which app it
 * belongs to, how many steps it has now, and how many versions it has been
 * through. */
function shapeProcessesList(processes: ProcessSummary[]) {
  return {
    rows: processes.map((p) => ({
      id: p.id,
      // The system it runs inside, as a picture (R35).
      mark: <RecordMark name={p.appName ?? p.name} />,
      // Archived maps stay visible (archive-never-delete), flagged like retired
      // roles and articles are.
      name: p.active ? p.name : `${p.name} (archived)`,
      detail:
        [
          p.appName,
          `${p.stepCount} step${p.stepCount === 1 ? "" : "s"}`,
          p.versionCount > 1 ? `version ${p.versionCount}` : "baseline only",
        ]
          .filter(Boolean)
          .join(" · ") || "",
    })),
  }
}

export function ProcessesScreen({
  teamId,
  recipe,
  rights,
  total,
  canCreate,
  onAction,
  onIntent,
}: {
  teamId: string
  recipe: ScreenRecipe
  rights: ScreenRights
  /** the exact server total (R16) — never the loaded page's length */
  total: number | undefined
  canCreate: boolean
  onAction: (actionId: string, ctx: ScreenActionContext) => void
  onIntent: (intent: ScreenIntent) => void
}) {
  const t = useT()
  // Who can be put on an app (8.10), for the record-an-app dialog below.
  const members = useAssignableMembers(teamId)
  // THE SIGNED-IN USER, preselected as staff (and lead) on a new app — client
  // ruling, 15 Sep 2026: "always put the user preselected by default."
  const myUserId = useSessionUserId()
  // Page one, and its next cursor parked in the sidecar <LoadMore> reads (R14).
  // The same fetcher primes the exact `total:` sidecar the heading badges (R16).
  const processesQ = useCached<ProcessSummary[]>(processesKey(teamId), () =>
    listFetch.processes(teamId)
  )
  const valueQ = useCached<SavingsView>(impactKey(teamId), () => tenancy.impact())
  const appsQ = useCached<AppRow[]>(appsKey(teamId), () => tenancy.apps().then((r) => r.apps))

  // The accounts an app can belong to. Page one is plenty for a picker, and it
  // is the SAME cache the accounts screen holds — opening this page adds no
  // round-trip for a team that has already been there.
  const accountsQ = useCached<Account[]>(accountsKey(teamId), () => listFetch.accounts(teamId))

  const [addOpen, setAddOpen] = React.useState(false)
  const [appOpen, setAppOpen] = React.useState(false)

  async function create(values: ProcessFormValues) {
    try {
      await tenancy.createProcess({
        appId: values.appId,
        name: values.name,
        description: values.description || undefined,
        baselineLabel: values.baselineLabel || undefined,
        // The form has always asked; now it is also sent. Without it the map
        // is born with no role, and no role means no rate means no money.
        roleName: values.roleName || undefined,
      })
      invalidate(processesKey(teamId))
      invalidate(impactKey(teamId))
      toast.success(t("Process mapped."))
    } catch (err) {
      throw err instanceof ApiFailure ? err : new Error("Couldn't map that process.")
    }
  }

  async function createApp(values: AppFormValues) {
    await tenancy.createApp({
      name: values.name,
      accountId: values.accountId || undefined,
      url: values.url || undefined,
      stage: values.stage || undefined,
      logoUrl: values.logoUrl || undefined,
      toolCostCentsPerMonth: values.toolCostCentsPerMonth,
    })
    invalidate(appsKey(teamId))
    invalidate(impactKey(teamId))
    toast.success(t("App recorded."))
  }

  if (processesQ.error)
    return (
      <ShapeStateBody
        shape="collectionScreen"
        state="error"
        copy={{ errorTitle: t("Couldn't load the processes.") }}
        action={
          <Button variant="secondary" onClick={() => processesQ.refresh()}>
            {t("Try again")}
          </Button>
        }
      />
    )
  // WAS A WHOLE-SCREEN EARLY RETURN (2026-09-03 audit — "nine screens blank
  // their entire toolbar while loading"): unmounted the heading and the
  // whole PagedFind toolbar (search/sort/filters) along with the rows.
  // Fixed the shared way: PagedFind's own `restingLoading` prop (below)
  // keeps its chrome mounted through the load, and `loaded` here defaults to
  // `[]` so the rows-region check inside `children` (`rows === null`) is what
  // swaps to a skeleton instead.
  const processesLoading = processesQ.data === undefined
  const loaded = processesQ.data ?? []
  const apps = (appsQ.data ?? []).filter((a) => a.active).map((a) => ({ id: a.id, name: a.name }))

  return (
    <div className="flex flex-col gap-6">
      {/* R16: the count lives in the heading (a sidebar page has no tab strip to
          badge), and it is the door's exact COUNT(*) — never the loaded page's
          length, which on a paged list is just "50" forever. */}
      <CollectionHeading sectionKey="processes" total={total} />

      {/* R14's other half: maps are kept rather than replaced, and the oldest is
          the one a client asks about — so the search box is answered by the door
          rather than by filtering the page the browser happens to hold. */}
      <PagedFind<ProcessSummary>
        listKey={processesKey(teamId)}
        placeholder={t("Search processes…")}
        matches={{
          none: t("No processes match"),
          one: t("1 process matches"),
          many: t("{count} processes match"),
        }}
        sorts={translatedSorts("processes", t)}
        defaultSort={COLLECTION_SORTS.processes.defaultSort}
        // R50 — the resting read's own row count, before any find.
        restingEmpty={loaded.length === 0}
        // 2026-09-03 audit — the resting read's OWN loading state, so
        // `restingEmpty` (true off the `[]` default above) cannot suppress
        // the toolbar before the read has actually answered.
        restingLoading={processesLoading}
        // …and so are the filters. `app` and `archived` were the frame's until
        // 18 Aug 2026, which meant picking an app narrowed the fifty maps in
        // hand — under a badge counting every one of them. `appId` is the door's
        // parameter (the frame's said `app`, the app's NAME, which is the
        // substitution the whole class of fault is made of).
        facets={translatedFacets("processes", t, {
          appId: apps.map((a) => ({ value: a.id, label: a.name })),
        })}
        fetchPage={(query, cursor) =>
          tenancy
            .processes({ ...query, cursor })
            .then((r) => ({ rows: r.processes, nextCursor: r.nextCursor, total: r.total }))
        }
        // THE CREATE DOOR — this toolbar's own `actions` slot (R50/R84),
        // never a second row above it. Live audit, 21 Sep 2026: this screen
        // used to publish the create act through `SectionWithCreate` while
        // ALSO rendering the recipe engine's own `useKitPanel` chrome, which
        // draws its OWN toolbar (with its own copy of the "+" button) below
        // this one — two toolbars stacked, ~126px of empty white before the
        // first row. `<PagedFind>`'s own `restingEmpty` already withdraws
        // this WHOLE row the moment the collection holds no rows, so a
        // genuinely-empty team never reaches this closure — only
        // `CollectionCreateActionProvider` below does, and a map needs an
        // app to belong to, so this door only ever draws once at least one
        // app already exists.
        actions={() => (canCreate ? <AddButton label={t("Map a process")} onClick={() => setAddOpen(true)} /> : null)}
        // THE ONE CARD — toolbar, then rows, the same join every other
        // `<PagedFind>` call site draws (contacts-screen.tsx, meetings-screen.tsx).
        wrap={(inner) => <CollectionCard>{inner}</CollectionCard>}
      >
        {(found) => {
          // `processesLoading ? null : loaded` — the resting read is still on
          // its way, so this reads as "not back yet" the same way a find's
          // own `found.rows` does, and the skeleton below is drawn for
          // exactly that reason rather than for a `[]` that would otherwise
          // look like a genuinely empty collection.
          const rows = found.active ? found.rows : processesLoading ? null : loaded
          if (rows === null) return <Skeleton variant="list" lines={4} />
          const data = shapeProcessesList(rows)
          // R62 — see stories-screen.tsx's identical note: the frame owns
          // both zeros' words now, chosen by `narrowedOutside` below.
          const listRecipe = withDataDrivenCollection(recipe, data.rows)
          return (
            // R88 — THE EMPTY REGISTER'S ONE DOOR. A map lives inside an app,
            // so a team with zero apps cannot be offered "Map a process" at
            // all — this publishes "Record an app" in its place, the same
            // word and handler the toolbar's own `actions` above never draws
            // in that state (zero apps means zero processes too, so
            // `<PagedFind>`'s `restingEmpty` has already withdrawn the
            // toolbar). Once an app exists this reverts to the ordinary
            // "Map a process" act — the two are never both on offer.
            <CollectionCreateActionProvider
              action={
                !canCreate
                  ? null
                  : apps.length > 0
                    ? { label: t("Map a process"), onCreate: () => setAddOpen(true) }
                    : { label: t("Record an app"), onCreate: () => setAppOpen(true) }
              }
            >
              <ScreenRenderer
                recipe={listRecipe}
                data={data}
                rights={rights}
                onAction={onAction}
                onIntent={onIntent}
                /* R62 — the door above owns the search. */
                narrowedOutside={found.active}
              />

              {/* R14: every app of every client grows maps, and none is ever deleted —
                  the list pages. */}
              <LoadMore
                listKey={found.listKey ?? processesKey(teamId)}
                label={t("Load more processes")}
                fetchPage={found.fetchPage}
              />
            </CollectionCreateActionProvider>
          )
        }}
      </PagedFind>

      {/* WHAT THE MAPS ADD UP TO — under them, not over them. `ImpactPanel` is a
          headline, R25's caption and a three-level accordion, and it sat between
          the heading and the search box: four blocks before the first process on
          a screen called Processes (N2). The person came for the list. It is the
          SUM of the rows above it, so it reads better after them anyway, and it
          is one scroll away rather than a click — which is the trade the owner
          asked for when he said people should be happy to scroll. */}
      <ImpactPanel view={valueQ.data} />

      <AppFormDialog
        members={members}
        open={appOpen}
        onOpenChange={setAppOpen}
        teamId={teamId}
        accounts={(accountsQ.data ?? [])
          .filter((a) => a.active && a.accountType === "entity")
          .map((a) => ({ id: a.id, name: a.name }))}
        draftKey={`app:add:${teamId}`}
        defaultStaffUserId={myUserId ?? ""}
        onSubmit={createApp}
      />

      <ProcessFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        apps={apps}
        draftKey={`process:add:${teamId}`}
        onSubmit={create}
      />
    </div>
  )
}
