"use client"

// FINDING A WAVE — the one search, filter and sort, wherever waves are listed.
//
// WHY THIS IS A FILE RATHER THAN A TOOLBAR ON THE WAVES PAGE. Waves are listed
// in two places and will be listed in more: the sidebar collection, and the
// client's own record. A screen that grew its own search box would give the
// second list a different vocabulary from the first — a different placeholder,
// a different sort, "Switched off" spelled two ways — which is the drift the
// glossary law exists to stop and which no law catches inside a component.
//
// CLIENT-SIDE, DELIBERATELY, AND THE REASON IS R14.
// A wave is something the agency SELLS. The collection grows at the speed of
// contracts, not of clicks, so the door reads it WHOLE under a hard cap and
// there is no page two to be wrong about. That makes filtering in the browser
// the honest shape here: everything that can match is already in front of us.
// The moment waves are paged (they are not, and would not be for years) this
// has to move to the door, for the reason paged-find.tsx spells out — a filter
// over page one answers "the open ones among the first fifty", which is a
// different and worse sentence.
//
// SELECTION IS A PURE FUNCTION so it can be tested without a screen, and the
// toolbar below is only the controls that feed it.

import * as React from "react"

import { cn } from "@shared/ui/lib/utils"
import { SearchInput } from "@shared/ui/components/search-input/search-input"
import { SortControl } from "@shared/ui/components/sort-control/sort-control"
import { ViewSwitch, type CollectionViewOption } from "@shared/ui/components/collection-frame/view-switch"
import { useFilterBar } from "@shared/web/screen-engine/filter-bar"
import type { FilterFacet } from "@shared/web/screen-engine/config"
import { RecordMark } from "@shared/web/record-mark"
import { PINNED_TOOLBAR } from "@shared/web/pinned-chrome"
import { NO_SORT_VIEW_VALUES, TOOLBAR_SEARCH_SLOT } from "@/components/deep-link/screen-bits"
import { sprintTypeName, type SprintTypeOption } from "@/components/work/sprint-form-dialog"
import { SprintTypeGlyph } from "@/lib/sprint-type-icon"
import { AppMark } from "@/components/apps/app-tiles"
import { sortedOptions } from "@shared/web/sorted-options"
import { useLanguage } from "@shared/web/language"
import type { Account, AppRow, Sprint } from "@shared/types"
import type { Wave } from "@shared/waves"

/** THE THREE BODIES the client's 2026-09-15 ruling ("i choose t3") named:
 * Timeline (T3 — one bar per wave, segmented by its sprints), Calendar
 * (waves and sprints on the month grid) and List (`RecordTable`, R80 shape).
 * WHICH OF THE THREE A TAB OFFERS is the caller's question, not this file's
 * — Active offers Timeline/Calendar, All offers all three — so `WaveFinder`
 * takes the live `views` array rather than hard-coding it (below). */
export type WaveView = "timeline" | "calendar" | "list"

/** What a wave can be ordered by. The words are the SCREEN's, not the column's. */
export type WaveOrder = "name" | "runs" | "sprints" | "client" | "newest"

export type WaveQuery = {
  q: string
  /** "" = every client */
  accountId: string
  /** "" = both · "on" · "off" */
  status: string
  /** "" = every kind. THE FACET WITH NO FIELD OF ITS OWN — a wave carries no
   * `sprintType` column (`shared/waves.ts`'s own Wave type has none; "a wave
   * is a wave", no kind), so this asks a different question than the other
   * two: whether ANY live sprint inside the wave carries this type, the
   * `EXISTS` the door computes (`workers/tenancy/src/lib/waves.ts#listWaves`)
   * and `selectWaves` below mirrors off the sprints already in hand — client
   * ruling, 16 Sep 2026: "I want, in Waves, the filter by sprint type." */
  sprintType: string
  /** "" = every app. CHEAP, UNLIKE `sprintType` ABOVE — `Wave.appId` is a
   * real column (team migration 0099), so this narrows with a plain
   * equality against the rows already in hand, never a sprint scan. */
  appId: string
  sortBy: WaveOrder
  dir: "asc" | "desc"
}

export const EMPTY_WAVE_QUERY: WaveQuery = {
  q: "",
  accountId: "",
  status: "",
  sprintType: "",
  appId: "",
  sortBy: "newest",
  dir: "desc",
}

/** Is anything actually being asked? Drives the "Clear all" control and the
 * empty state's wording — "nothing matched" and "nothing here yet" are two
 * different sentences and a screen that says the wrong one sends somebody
 * looking for a wave that was never sold. */
export function waveQueryIsActive(query: WaveQuery): boolean {
  return (
    query.q.trim() !== "" ||
    query.accountId !== "" ||
    query.status !== "" ||
    query.sprintType !== "" ||
    query.appId !== ""
  )
}

/** A number that sorts null-last in both directions: a wave with no sprints yet
 * has no dates, and that is an ordinary state rather than "the year zero". */
const dateKey = (d: string | null): number => (d ? Date.parse(d) : Number.NaN)

function compare(a: Wave, b: Wave, by: WaveOrder): number {
  if (by === "name") return a.name.localeCompare(b.name)
  if (by === "client") return (a.accountName ?? "").localeCompare(b.accountName ?? "")
  if (by === "sprints") return a.sprintCount - b.sprintCount
  if (by === "runs") {
    const x = dateKey(a.startsOn)
    const y = dateKey(b.startsOn)
    // Undated last whichever way the arrow points — see dateKey.
    if (Number.isNaN(x) && Number.isNaN(y)) return 0
    if (Number.isNaN(x)) return 1
    if (Number.isNaN(y)) return -1
    return x - y
  }
  return Date.parse(a.createdAt) - Date.parse(b.createdAt)
}

/** SEARCH, FILTER, SORT — in that order, over the whole bounded collection.
 *
 * `sprints` IS THE DOOR'S `EXISTS`, READ CLIENT-SIDE. The Sprint type facet
 * asks about a table this collection does not carry a column for (see
 * `WaveQuery.sprintType` above), so it cannot be answered off `rows` alone —
 * but the team's whole sprint list is already resident (`WaveCollection`'s
 * own `sprintsQ`, read for the T3 timeline), so this stays the same
 * "everything that can match is already in front of us" shape the file's own
 * header argues for the other two facets, rather than a second round trip
 * for a bounded collection that does not need one. Defaults to `[]` so a
 * caller that has not touched the sprint-type facet (every existing one)
 * needs no change. */
export function selectWaves(rows: Wave[], query: WaveQuery, sprints: Sprint[] = []): Wave[] {
  const needle = query.q.trim().toLowerCase()
  // Only a LIVE sprint counts — the same `deactivated_at IS NULL` the door's
  // own EXISTS carries (workers/tenancy/src/lib/waves.ts#listWaves).
  const wavesWithType = query.sprintType
    ? new Set(
        sprints
          .filter((s) => s.waveId && s.active && s.sprintType === query.sprintType)
          .map((s) => s.waveId as string)
      )
    : null
  const matched = rows.filter((w) => {
    if (query.accountId && w.accountId !== query.accountId) return false
    if (query.status === "on" && !w.active) return false
    if (query.status === "off" && w.active) return false
    if (wavesWithType && !wavesWithType.has(w.id)) return false
    if (query.appId && w.appId !== query.appId) return false
    if (!needle) return true
    // The client's name is searched too: "Hogo" is how somebody looks for the
    // package they sold Hogo, and it is on the row already.
    //
    // AND THE REFERENCE, since the wave's number went onto the row itself (the
    // black chip in front of the name, waves-screen.tsx). Waves are a BOUNDED
    // collection — the whole list is in the browser and the door takes no `q`
    // at all — so this filter IS the wave search, and a number a person can
    // read off a row and then not find is worse than one they never saw.
    return [w.name, w.ref ?? "", w.accountName ?? "", w.goal ?? ""].some((s) =>
      s.toLowerCase().includes(needle)
    )
  })
  const sorted = [...matched].sort((a, b) => compare(a, b, query.sortBy))
  // A sort with an undated tail keeps that tail at the bottom in both
  // directions, so reversing never promotes "we haven't planned this" to the top.
  if (query.dir === "desc") {
    if (query.sortBy !== "runs") return sorted.reverse()
    const dated = sorted.filter((w) => w.startsOn)
    const undated = sorted.filter((w) => !w.startsOn)
    return [...dated.reverse(), ...undated]
  }
  return sorted
}

export function WaveFinder({
  query,
  onChange,
  clients,
  /** Omit the client filter where the list is already one client's. */
  showClientFilter = true,
  /** THE TEAM'S OWN "Sprint type" VOCABULARY — the facet's options, A→Z
   * through the one chokepoint every `FilterFacet` on both front doors
   * renders through (R75's `filter-bar.tsx#optionsFor`), so this file
   * declares them in whatever order and never sorts them itself. */
  sprintTypes = [],
  /** EVERY APP ON THE TEAM — the App facet's options (task C, 16 Sep 2026:
   * "facet by app if cheap" — cheap here, since `Wave.appId` is a real
   * column). Defaults to `[]` so a caller that has not touched this facet
   * (none exist yet) needs no change; an empty list simply offers no App
   * facet at all (below), the same "nothing to filter by" shape every other
   * team-vocabulary facet in this file takes. */
  apps = [],
  resultCount,
  views,
  view,
  onViewChange,
  period,
  actions,
}: {
  query: WaveQuery
  onChange: (next: WaveQuery) => void
  clients: Account[]
  showClientFilter?: boolean
  sprintTypes?: SprintTypeOption[]
  apps?: AppRow[]
  resultCount?: number
  /** THE BODIES THIS TAB OFFERS — CH19's third toolbar zone ("search, then
   * filters, then view switcher, then actions pinned right", CH27.13), the
   * kit's own `ViewSwitch`. Active hands over two (`views`.length === 2);
   * All hands over three. `ViewSwitch` itself renders nothing for fewer than
   * two (view-switch.tsx's own state 7), so a tab that ever offered one body
   * would draw no switch at all rather than a caller having to remember to
   * withhold it. */
  views?: CollectionViewOption[]
  view?: WaveView
  onViewChange?: (view: WaveView) => void
  /** CH27.26's `‹ 6 months ›` — override 28 puts the stepper "between the
   * search field and the view switch". `GanttPeriodStepper` renders nothing
   * with no handlers and no label (its own state 7/10), so an idle List view
   * or a Timeline whose data fits inside six months passes nothing here and
   * this slot draws empty air rather than a control with nowhere to go. */
  period?: React.ReactNode
  /** THE ROW'S OWN ACTION BUTTONS ("Sell a wave"…), last in THIS toolbar's
   * first line — the same slot `<PagedFind>`'s own `actions` draws, so a
   * bare collection's toolbar and a paged one's read as the same control in
   * two places. No longer pushed to the far edge with `ml-auto` (client,
   * 2 Sep 2026: her reference artifact packs it as the last chip in the
   * same left-clustered row, not stretched open to the far side). Waves is
   * the one bounded, single-view collection whose search/sort/filter is a
   * component of its own rather than the frame's, so the button lives HERE,
   * beside search and sort, instead of in a row of its own above this one
   * (client ruling, 2026-08-31: an action button never gets a separate row
   * from the toolbar it belongs to). */
  actions?: React.ReactNode
}) {
  const { t, lang } = useLanguage()

  const facets: FilterFacet[] = [
    ...(showClientFilter
      ? [
          {
            field: "accountId",
            label: t("Account"),
            control: "select" as const,
            // No `searchable` flag here: a facet declares its OPTIONS and
            // nothing about how they are picked over (`FilterFacet`,
            // config.ts) — whether the panel offers a search field is one
            // decision in one place, `filter-bar.tsx`'s own `SEARCHABLE_PAST`
            // threshold, measured off this facet's own resolved option count.
            // This is the exact list that threshold exists for — an agency
            // with 131 clients on staging, more than the kit's own `Select`
            // (2026-09-02 through v1.2.26) could search, only scroll — the
            // kit's `CompactFacet` (v1.2.27) answers it now, and the toolbar's
            // own search box beside it is untouched.
            // EACH ONE WEARING ITS OWN FACE — client ruling, 2026-09-09:
            // "for accounts include icon in select components and filters".
            // `size="choice"` is the dense mark size the picker rows and the
            // tickets toolbar's own facets already use; drawn for EVERY option
            // and not only the ones with a logo, because `RecordMark` falls
            // through to the account's initial and only 48 of 134 accounts on
            // staging carry a picture — a mark that appeared only where the
            // data happened to be would leave two rows in three blank.
            options: clients.map((a) => ({
              value: a.id,
              label: a.name,
              mark: <RecordMark picture={a.logoUrl} name={a.name} size="choice" />,
            })),
          },
        ]
      : []),
    {
      field: "status",
      label: t("Status"),
      control: "select" as const,
      options: [
        { value: "on", label: t("On") },
        { value: "off", label: t("Switched off") },
      ],
    },
    // SPRINT TYPE — client ruling, 16 Sep 2026: "I want, in Waves, the filter
    // by sprint type." A wave carries no `sprintType` of its own (see
    // `WaveQuery.sprintType`'s own header above), so this facet's match is
    // resolved in `selectWaves`, off the sprints already in hand, the same
    // `EXISTS` shape the door computes for a caller that is not this screen.
    // Offered only where the team actually has a vocabulary to filter by —
    // `useSprintTypes` never returns empty (it falls back to three generic
    // words), so this is never blank, but a team with no real vocabulary at
    // all still gets a working facet rather than one hidden and one shown.
    // ORDERED, NOT A→Z (R75's facet escape hatch, `FilterFacet.ordered` —
    // config.ts) — `sprintTypes` (`useSprintTypes`) is already the team's
    // own `position`-ordered vocabulary (the same client ruling, 16 Sep
    // 2026, "in that order"), the identical shape `apps-screen.tsx#stage`
    // is registered for. Registered in `FACET_ORDER_OK`
    // (shared/rules/registry.ts). ICON, NOT MARK, on each option — client
    // ruling, 16 Sep 2026: "they will not have colors, but icons." `label`
    // is the plain word (`sprintTypeName`, never `sprintTypeLabel`'s own
    // `mark` prefix, which this facet's own `mark` slot now carries as a
    // real element instead).
    { field: "sprintType", label: t("Sprint type"), control: "select" as const, ordered: true,
      options: sprintTypes.map((o) => ({
        value: o.value,
        label: sprintTypeName(o, lang),
        mark: <SprintTypeGlyph type={o.value} />,
      })),
    },
    // APP — task C, 16 Sep 2026: "facet by app if cheap." `Wave.appId` is a
    // real column (team migration 0099), so this narrows the loaded rows
    // with a plain equality (`selectWaves`, above) rather than a sprint
    // scan. Offered only where the team actually has apps to filter by — an
    // empty list draws no facet at all, never an empty one.
    ...(apps.length > 0
      ? [
          {
            field: "appId",
            label: t("App"),
            control: "select" as const,
            // EACH ONE WEARING ITS OWN FACE — the same "for accounts include
            // icon in select components and filters" ruling the Account
            // facet above already answers, read for an app's own mark
            // instead of a company's.
            options: sortedOptions(apps, lang, (a) => a.name).map((a) => ({
              value: a.id,
              label: a.name,
              mark: <AppMark app={a} size="choice" />,
            })),
          },
        ]
      : []),
  ]

  const { pill: filterPill, panel: filterPanel } = useFilterBar({
    facets,
    values: { accountId: query.accountId, status: query.status, sprintType: query.sprintType, appId: query.appId },
    // Empty on purpose: every facet carries its own options, so there is
    // nothing for the bar to derive from the rows on screen — and a client
    // whose only wave is filtered out must not vanish from the filter.
    data: [],
    onChange: (field, value) => onChange({ ...query, [field]: value }),
    onClearFacets: () =>
      onChange({ ...EMPTY_WAVE_QUERY, q: query.q, sortBy: query.sortBy, dir: query.dir }),
    resultCount,
  })

  // ONE ROW, ALWAYS (client ruling, 2026-09-01 — the toolbar spec Aurora
  // approved that night, which supersedes this file's own earlier reasoning
  // below). The filter bar used to be drawn as this row's own sibling BELOW
  // it — the same shape her Apps screenshot caught: search+sort(+actions) on
  // one line, the filter chips stranded on a second, disconnected one. The
  // CONTROL is a flex item of this one row now, the same technique the kit's
  // OWN toolbar uses for its `filters` slot (`shared/ui/components/
  // collection-frame/collection-frame.tsx`). What is NOT in the row is its
  // open panel, and that is a different question with a different answer —
  // see the column below.
  // ONE CONTAINER, GROWING — CLIENT RULING, 2026-09-03, MIRRORING THE FIX
  // `ToolbarRow` (screen-bits.tsx) ALREADY CARRIES. Verbatim: "what this is
  // doing is creating a new card underneath... it kind of creates a second
  // toolbar... merge this with the main toolbar so that it's one single
  // background or container, more like expand behaviour rather than
  // open-a-new-one behaviour." This track used to carry its own
  // `rounded-pill bg-background` unconditionally, with the panel one `gap-2`
  // below it as a second sibling — two same-toned boxes with air between
  // them, exactly the "second toolbar" she is naming. The fix is the same one
  // `ToolbarRow` carries: the fill and the radius move to the OUTER column,
  // chosen by `Boolean(filterPanel)` (R31 — two radii, never a third, never
  // both at once), and the track keeps only its own padding/gap. No gap
  // between the track and the panel either.
  const filterPanelOpen = Boolean(filterPanel)
  return (
    // ── THE PIN — R63, CLIENT RULING 2026-09-10: "on scroll down, i also want
    // the toolbar to be on top all time visible. everywhere." The identical
    // two-box shape `<ToolbarRow>` carries, and this component is the honest
    // hand-copy of that row (`TOOLBAR_CONTROL_OWNERS` says so in as many
    // words), so it takes the change at the same time rather than being the
    // one collection screen in the app whose toolbar still scrolls away.
    //
    // `bg-surface-panel`, NOT `--surface-raised`: this row's own fill, three
    // lines below, and for the reason written there — its single call site
    // always draws it inside a `<CollectionCard>`. The band this box paints has
    // to be the tone the rows behind it stand on or it reads as a hole.
    // The pill's trailing `--toolbar-content-gap` (R49) sits INSIDE this flex
    // column and is therefore painted; nothing about R49 moved.
    <div data-slot="toolbar-row-pin" className={cn(PINNED_TOOLBAR, "w-full")}>
      <div
        data-slot="toolbar-row-column"
        className={cn(
          // THE FILL MATCHES THE CARD IT SITS IN — the same latent mismatch
          // `ToolbarRow` (screen-bits.tsx) carried and was fixed out of
          // (client, dark mode, Apps screen: "should be same as background of
          // content body"). This component's own single call site
          // (waves-screen.tsx) always draws it inside `<CollectionCard>`,
          // which paints `bg-surface-panel` — not `bg-background` (the page
          // ground, coincidentally the same colour as a CARD only in light
          // mode) and not `--surface-raised` either (`ToolbarRow`'s own fix,
          // right for a row sitting directly on `ScreenShell`'s pane, which
          // this row never does).
          "flex w-full min-w-0 flex-col bg-surface-panel",
          filterPanelOpen ? "rounded-[var(--radius)]" : "rounded-pill",
          // THE GAP TO WHATEVER COMES NEXT — R49's `--toolbar-content-gap`
          // (web/app/globals.css), the same token `<ToolbarRow>`
          // (screen-bits.tsx) pays as its own trailing margin. This component
          // is the one other toolbar row in the app (a bounded, single-view
          // collection's own search/filter/sort, never the frame's), and it
          // used to leave the gap to its ONE call site instead: waves-screen.tsx
          // wrapped it in a bare `<div className="mb-4">` — 16px, not the
          // token's 20px, and invisible to R49's own census, which only walks
          // literal `<ToolbarRow>` call sites and cannot see a wrapper around a
          // component it does not know by name. Paid here instead, the same way
          // `ToolbarRow` owns its own margin, so the wrapper div is gone from
          // the one place that grew it.
          "mb-[var(--toolbar-content-gap)]"
        )}
      >
        <div
          data-slot="toolbar-row-track"
          // ONE ROW, ALWAYS — FOR REAL THIS TIME (client, 16 Sep 2026, over a
          // screenshot: "the container looks broken", the "+" and the view
          // switch spilling out past the pill's own right edge). The comment
          // above already claimed "one row, always"; the class here did not
          // keep the promise — `flex-wrap` let the trailing controls drop to
          // a second line the moment the lane ran out of room, and this
          // column's radius is `rounded-pill` when collapsed (below), a
          // capsule computed off the box's own HEIGHT. A one-line box reads
          // as a normal pill; a two-line one reads as a much MORE rounded
          // pill wrapped around a taller box, and the wrapped second line
          // sat close enough to that exaggerated curve to look clipped by
          // it — exactly the "broken rounded box" in her screenshot.
          //
          // THE FIX IS THE KIT'S OWN SHAPE (`ToolbarRow`,
          // shared/ui/components/toolbar-row/toolbar-row.tsx): `flex-nowrap`
          // on the track, a SCROLLING LANE around search/filters/sort/period
          // (`min-w-0 flex-1 overflow-x-auto` — `min-w-0` is load-bearing,
          // without it the lane cannot shrink below its content and the
          // PAGE scrolls sideways instead), and the action group pinned
          // OUTSIDE the lane with `ms-auto shrink-0` so the "+" is never the
          // thing that gives. Nothing wraps, so the pill's radius is always
          // computed against a single-line height, at every width — the kit
          // draws the exact same lane for the identical reason
          // (toolbar-row.tsx's own "ONE ROW AT EVERY WIDTH").
          className="flex w-full flex-nowrap items-center gap-2 py-1.5 pe-1.5 ps-4"
        >
          <div
            data-slot="toolbar-row-lane"
            className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto"
          >
            {/* THE ONLY GROWING SLOT — client, 2 Sep 2026, "cluster to the right!!!!
                like in your atifact": the reference artifact's search element is
                `flex: 1 1 auto`, not a fixed width, so it grows to push the filter
                pill/sort/period after it to the track's far edge instead of sitting
                immediately after a narrow box.

                THE FLOOR IS THE ROW'S, AND IT IS ON THE FIELD — `TOOLBAR_SEARCH_SLOT`
                (screen-bits.tsx), the one string `<ToolbarRow>` and `<PagedFind>` also
                wear. This file is a hand-written second copy of the row
                (`TOOLBAR_CONTROL_OWNERS` pins the divergence, R53), so a guarantee the
                row makes and this copy does not is exactly the drift that registry
                exists to keep readable. */}
            <div className={TOOLBAR_SEARCH_SLOT}>
              <SearchInput
                value={query.q}
                onChange={(e) => onChange({ ...query, q: e.currentTarget.value })}
                // THE SEARCH CLEARS ITSELF. It used to be cleared by the filter row's
                // "Clear all", which was one control quietly owning two questions; the
                // kit's bar says "Clear filters" and now means only that.
                onClear={() => onChange({ ...query, q: "" })}
                placeholder={t("Search waves…")}
                className="w-full"
              />
            </div>
            {/* NO WRAPPING BOX AROUND THE PILL — `filterPill` renders inline as a
                normal flex child (wrapping itself in a non-growing box internally),
                and its open PANEL is the separate `filterPanel` value, rendered
                into the column below rather than into this row — the split
                `useFilterBar` itself returns (v1.2.27). The pill says a COUNT and
                never the filters themselves — client, 2026-09-02: "when activce
                filters, do not display them in the toolbar. only a count niside
                the filter pill". See `filter-bar.tsx`'s own header for the full
                account. */}
            {filterPill}
            {/* R78 — CALENDAR VIEWS CARRY NO SORT, extended to Timeline
                (2026-09-15: "the timeline is time-ordered too"). `<ToolbarRow>`
                suppresses its own `<SortControl>` centrally off
                `NO_SORT_VIEW_VALUES` (screen-bits.tsx); this file is a
                registered hand-copy of that row (`TOOLBAR_CONTROL_OWNERS`,
                R53) and makes the identical promise itself, off the same set,
                rather than a second copy of the three-value list. Sort stays
                on List — a flat, orderable body, unlike a time-axis grid. */}
            {view && NO_SORT_VIEW_VALUES.has(view) ? null : (
              <SortControl
                options={[
                  { value: "newest", label: t("Newest first") },
                  { value: "name", label: t("Name") },
                  { value: "client", label: t("Account") },
                  { value: "runs", label: t("When it runs") },
                  { value: "sprints", label: t("Sprints inside it") },
                ]}
                value={query.sortBy}
                onValueChange={(by) => onChange({ ...query, sortBy: by as WaveOrder })}
                direction={query.dir}
                onDirectionChange={(dir) => onChange({ ...query, dir })}
                label={t("Sort by")}
                hideLabel
              />
            )}
            {period}
            {views && views.length > 1 && view && onViewChange ? (
              <ViewSwitch
                views={views}
                value={view}
                onValueChange={(v) => onViewChange(v as WaveView)}
                label={t("View")}
              />
            ) : null}
          </div>
          {/* OUTSIDE THE LANE, ON PURPOSE — the same placement the kit's own
              `ToolbarRow` gives its `actions` slot, so the "+" is never the
              control that scrolls out of sight or wraps to a second line. */}
          {actions ? (
            <div data-slot="toolbar-row-actions" className="ms-auto flex shrink-0 flex-nowrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
        {filterPanel}
      </div>
    </div>
  )
}
