"use client"

// LOGS — the destination a log never had, and, since 23 Sep 2026, two tabs.
//
// A row of time is what every figure in this app is eventually built on, and
// until this page there was nowhere to go and look at one. The list lived in a
// panel at the FOOT of the Stories page, under the backlog, and a story's Logs
// section showed the few logged against that story. Both are the right place for
// what they do — a Start button belongs beside the work, and a story's hours
// belong on the story — and neither is where a person goes to find "the time I
// logged". A tester with 115 entries reported she could not find any of it.
//
// ── AURORA'S RULINGS, 23 SEP 2026, VERBATIM ────────────────────────────────
//
//   1. "tabs: dahsbaord, entries."
//   2. "word is logs only"
//   3. "kind of work is what its related to"
//   4. "implement everything you suggested for dashboard - exclude running now.
//      add toolbar w filters by person, account."
//
// EXACTLY TWO TABS, Dashboard first and default — her standing rule, the same
// place Tickets' and Accounts' own Dashboard tabs hold on their strips
// (`web/test/default-tab-is-first.test.ts` is the same sentence about the
// ticket strip). Entries is the timesheet that was the whole screen until
// today, unchanged in its rows and gaining the two filters beside it.
//
// THE SCREEN IS STILL THIN. The timesheet is one panel that already existed and
// already followed the rules; the dashboard is one component and one door read.
// Its recipe would be a list of rows whose only control is a correction dialog,
// which is a screen the engine has no block for — the same reason the story
// detail is host-composed.
//
// ── THE TWO TOOLBARS ────────────────────────────────────────────────────────
//
// ONE PER TAB, because each narrows its own body and the two bodies are not the
// same shape. Entries' toolbar is `<PagedFind>`'s own, which it has always
// drawn — search, facets, sort and "Log time" — and the account facet simply
// joins the three already there. The Dashboard's is a `<ToolbarRow>` carrying
// the two filters and nothing else: there is no search box because there is
// nothing on that tab for a browser to sieve, and no sort because a set of
// grouped pictures has no row order to offer. Both are reasoned, named lines in
// `TOOLBAR_EXEMPT` and `TOOLBAR_SORT_EXEMPT` rather than silent omissions
// (R48/R53), and the row's own `empty` is DERIVED from the collection's exact
// server count (R50) rather than hardcoded.

import * as React from "react"

import { useFilterBar } from "@shared/web/screen-engine/filter-bar"
import { renderFolderTabs, defaultTabsConfig } from "@shared/web/screen-engine/tabs-view"
import { RecordMark } from "@shared/web/record-mark"
import { useT } from "@shared/web/language"
import type { Language } from "@shared/i18n"
import type { ScreenQuery } from "@shared/web/screen-engine/recipe"

import { ModuleSettingsGear } from "@/components/screens/module-settings-screen"
import { CollectionHeading } from "@/components/records/collection-heading"
import { ToolbarRow } from "@/components/deep-link/screen-bits"
import { LogsDashboard } from "@/components/work/logs-dashboard"
import { TimePanel } from "@/components/work/time-panel"
import { translatedFacets } from "@/lib/collection-filters"
import { CONCEPT_ICON } from "@/lib/pages"
import { useAccountNames } from "@/lib/account-names"
import { useAssignableMembers } from "@/lib/members"

/** The two tabs, and the one that leads. `dashboard` is the default, so a press
 * back onto it drops `tab` from the address entirely — the same "the default tab
 * has no query param" shape Accounts' own strip keeps. */
const DASHBOARD = "dashboard"
const ENTRIES = "entries"

export function TimeScreen({
  teamId,
  total,
  canCreate,
  canEdit,
  tab,
  go,
  sectionPath,
  lang,
}: {
  teamId: string
  /** the exact server ROW total (R16) — never the loaded page's length, which on
   * a paged list is just "50" for ever. The HOURS are a different number, and
   * the panel says that one itself. */
  total: number | undefined
  canCreate: boolean
  canEdit: boolean
  /** the address's own `tab`, so a link into either tab opens on it */
  tab: string | undefined
  go: (path: string, q?: ScreenQuery) => void
  sectionPath: string
  lang: Language
}) {
  const t = useT()
  const logsTab = tab === ENTRIES ? ENTRIES : DASHBOARD

  // WHO MAY HAVE LOGGED IT — the team's own staff. Never a client login:
  // `useAssignableMembers` already drops one, which agrees with the door
  // refusing a client login outright (R21). The SAME cached read the Entries
  // tab's own panel already makes (R56: one door, one key).
  const members = useAssignableMembers(teamId)
  // WHOSE WORK IT WAS — the account names, through the app's own shared seam
  // rather than the paged accounts list's page one, which would silently drop
  // any client past the first fifty (that file's own header carries the bug
  // this exists to prevent).
  const accountNames = useAccountNames(teamId)

  const personOptions = members.map((m) => ({
    value: m.id,
    label: m.name,
    // R35/R90 — a record offered to be chosen carries its own face.
    mark: <RecordMark picture={m.photo} name={m.name} shape="round" />,
  }))
  const accountOptions = [...accountNames]
    .map(([id, name]) => ({
      value: id,
      label: name,
      mark: <RecordMark picture={null} name={name} shape="square" />,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, lang))

  /** THE DASHBOARD'S OWN TWO FILTERS. Declared through the shared facet table
   * (`web/lib/collection-filters.ts`), the same declaration the Entries tab
   * reads, and narrowed here to the two Aurora named — the target-type and
   * period facets belong to the list of rows, not to a tab whose donut IS the
   * target-type split. */
  const dashboardFacets = translatedFacets("workLogs", t, {
    userId: personOptions,
    accountId: accountOptions,
  }).filter((f) => f.field === "userId" || f.field === "accountId")

  const [dashboardValues, setDashboardValues] = React.useState<Record<string, string>>({})

  // CALLED UNCONDITIONALLY, above the branch — the node it returns is a plain
  // value either tab can use or ignore, never a hook called inside one branch
  // only. THE OVERLAY ITSELF IS THE SHARED SEAM'S (`useFilterBar`) and is
  // untouched here: this file DECLARES facets and reads back values, exactly as
  // `<PagedFind>` does one file over.
  const filterBar = useFilterBar({
    facets: dashboardFacets,
    values: dashboardValues,
    // Empty on purpose: both facets above carry their own options, so there is
    // nothing for the bar to derive from rows on screen.
    data: [],
    onChange: (field: string, value: string) =>
      setDashboardValues((prev) => {
        const next = { ...prev }
        if (value === "") delete next[field]
        else next[field] = value
        return next
      }),
    onClearFacets: () => setDashboardValues({}),
  })

  const tabs = [
    /* DASHBOARD, FIRST AND DEFAULT — her standing rule, the same place the
       Tickets and Accounts strips already hold it. NO BADGE, for the identical
       R16 reason every other Dashboard tab in this app carries none: it is not
       a narrower slice of the collection counted on the tab beside it, it is a
       view of all of it. The icon is `CONCEPT_ICON.dashboard`, the one glyph
       this app draws for "a collection's own summary view". */
    {
      value: DASHBOARD,
      label: t("Dashboard"),
      icon: CONCEPT_ICON.dashboard,
      badge: "",
      badgeVariant: "" as const,
    },
    /* ENTRIES — the timesheet. NO BADGE either, and that is R16 rather than an
       omission: this is a SIDEBAR page whose heading already draws the door's
       exact COUNT(*) through the one `formatCount` seam, and a count said in
       two places is two chances to disagree. The strip's two tabs are two
       BODIES over the same collection, not two narrower slices of it, so
       neither has a number of its own to report. */
    {
      value: ENTRIES,
      label: t("Entries"),
      icon: CONCEPT_ICON.time,
      badge: "",
      badgeVariant: "" as const,
    },
  ]

  return (
    <div className="flex flex-col gap-[var(--heading-strip-gap)]">
      {/* THE GEAR (R61) — this module's quick access to its own settings page.
          `ModuleSettingsGear` draws itself or nothing. R16: a sidebar page has
          no tab BADGE to stand down to — see the strip below — so the count
          stays here, and it is the door's exact COUNT(*). */}
      <CollectionHeading sectionKey="time" total={total} action={<ModuleSettingsGear teamId={teamId} segment="time" />} />
      <div className="flex flex-col">
        {renderFolderTabs({
          config: { ...defaultTabsConfig, tabs },
          value: logsTab,
          onValueChange: (v) => go(sectionPath, v === DASHBOARD ? {} : { tab: v }),
        })}
        {logsTab === DASHBOARD ? (
          <div className="flex flex-col gap-[var(--toolbar-lead-gap)]">
            {/* HER TOOLBAR, TWO FILTERS, NOTHING ELSE. `empty` is DERIVED from
                the collection's own exact server count (R50) — a team with no
                time logged at all gets no row, and the dashboard below it draws
                its own honest empty state. */}
            <ToolbarRow
              empty={total === 0}
              filters={dashboardFacets.length > 0 ? filterBar : undefined}
            />
            <LogsDashboard
              teamId={teamId}
              lang={lang}
              filter={{ userId: dashboardValues.userId, accountId: dashboardValues.accountId }}
              faceOf={(userId) => {
                const m = members.find((p) => p.id === userId)
                return { picture: m?.photo ?? null, name: m?.name ?? null }
              }}
            />
          </div>
        ) : (
          <TimePanel
            teamId={teamId}
            canCreate={canCreate}
            canEdit={canEdit}
            personOptions={personOptions}
            accountOptions={accountOptions}
          />
        )}
      </div>
    </div>
  )
}
