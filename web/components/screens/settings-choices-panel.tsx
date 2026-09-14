"use client"

// THE CHOICES TAB — every choice value in the system, together, as a table.
//
// The client, 14 Sep 2026, pointing at the Contacts table as the visual
// reference: *"create a tab in settings with choices where we see all the
// choices together, and use it in this view: the value itself · module with
// the icon · status: active, inactive, and are protected."*
//
// ── ONE SEAM, NOT A SECOND LIST ──────────────────────────────────────────────
//
// Every choice value already renders through `SelectableScreen`
// (`web/components/choices/selectable-screen.tsx`), narrowed to one module's
// own groups (`scope`). This panel reads the SAME data through the SAME door
// and the SAME cache key — `tenancy.selectable()` primed under
// `selectable:<teamId>`, exactly what `SelectableScreen` itself opens — so an
// edit made on a module's own settings page is seen here live (R56: a
// component asks a door once) and there is no second read to fall out of step
// with the first.
//
// IT IS A NEW COMPONENT, NOT A THIRD MOUNTING OF `SelectableScreen`, and that
// is a real answer rather than an omission: the client asked for a TABLE with
// three named columns, and `SelectableScreen` draws grouped lists and chip
// walls (`GroupValues`/`ChipWall`) with inline rename, mark editing and an add
// dialog — a shape this summary view does not want (there is no `scope` to
// narrow it to, no single group's "New value" to offer, and editing already
// has a home on each module's own page, which is where R61 put it on
// purpose). What is genuinely shared — the fetch, the cache key, and the
// door's own idea of what a value IS — is shared; what differs is the
// PRESENTATION, and `RecordTable` (web/components/records/record-table.tsx)
// is the library's own answer for exactly that shape (Contacts, Tickets,
// Tasks, Meetings), never a hand-rolled strip (R3).
//
// ── THE GATE — R61 (iii), REUSED RATHER THAN RESTATED ───────────────────────
//
// A system-wide list must show only the choices of modules this reader may
// see, and it gets that from the one expression that already answers it:
// `moduleSettingsIndex(can)` IS `visibleModuleSettings` asked once per module
// (module-settings-screen.tsx's own doc). This file calls no `can(` of its
// own — `can` only ever travels through as a value, handed in from
// `settings-screen.tsx`'s one `usePermissions(teamId)` call, the same
// reference every other panel on that tab reads. A reader who may see tickets
// but not the team's vocabulary gets the identical answer here that the
// Modules tab and the gear already give: no row, not a row that opens and
// refuses them.
//
// ── THE MODULE COLUMN, DERIVED, NOT TYPED TWICE ──────────────────────────────
//
// `groupHome` below is built by walking `moduleSettingsIndex(can)`'s own
// vocabulary sections — the SAME table `shared/selectable-homes.ts` already
// resolved into `MODULE_SETTINGS`, read back through the one function that
// already answers "which modules may this reader see, and what do they own".
// A group with no module in that table (the three `"labels"` groups and the
// six `"unused"` ones — `shared/selectable-homes.ts`'s own header has the
// census) is exactly the set the 11 Sep 2026 ruling already excluded from
// every settings surface ("labels are not in settings… no exclude them"), so
// leaving them out here is not a narrowing this file invents, it is the
// existing rule read once more.
//
// ── STATUS: ACTIVE, INACTIVE, AND PROTECTED — READ, NOT ASSUMED ─────────────
//
// `active`/`inactive` is a switch; `isDefault` ("Protected") is a SEPARATE
// flag, provably independent of it — `setSelectableDefault`
// (workers/tenancy/src/lib/selectable.ts) writes `is_default` with no guard on
// `deactivated_at`, so a value can be protected while inactive (deactivate it
// first, while it is not yet protected, then protect it — both doors allow
// that in sequence). A three-way filter (Active / Inactive / Protected) would
// therefore lie the moment a row is both, so the Status FILTER stays the two
// mutually exclusive states and Protected rides the STATUS COLUMN as its own
// badge — see `shapeChoicesTable`'s own header (deep-link/shape.tsx) for the
// column itself. Protected still gets its own place in the TOOLBAR, below —
// a third, independent facet beside Module and Status rather than a third
// option folded into Status itself.
//
// ── THE TOOLBAR (R48/R53) ────────────────────────────────────────────────────
//
// `RecordTable` → `CollectionFrame`'s own kit panel draws the search box
// (R48's default) and the sort control is the table's own column headers
// (R53's "a table already has its control" — no `SortControl` drawn beside
// it, which would be a second control for one question). THREE filters, not
// two: MODULE (which settings page a group belongs to), STATUS
// (active/inactive), and PROTECTED (yes/no) as its OWN facet — the client's
// own words leave no room to drop it: *"Status: active, inactive, and are
// protected"*, about this very screen, and separately, *"also in automations
// filters everywhere, add filter to protected"*, where "everywhere" is
// blanket. An earlier pass here reasoned Protected out of the toolbar
// entirely; that reasoning was wrong on the facts and is replaced by this
// paragraph rather than left standing beside the facet it argued against.
//
// Protected is NOT folded into the Status facet as a third option, on
// purpose — that would make two independent questions look mutually
// exclusive, exactly the mistake `shapeChoicesTable`'s own header
// (deep-link/shape.tsx) already proves against for the STATUS COLUMN:
// `isDefault` ("Protected") is a flag independent of `deactivated_at`
// (active/inactive), so a value can be Protected AND Inactive at once — a
// three-way Status facet would force a reader to pick one and hide the
// other. So Status stays the two mutually exclusive states it always was,
// and Protected rides as a THIRD, independent facet beside it, reading the
// same `protectedState` field `shapeChoicesTable` derives off the identical
// `v.isDefault` the STATUS COLUMN's own badge already reads — one flag, one
// source of truth, asked by two different parts of this screen.
//
// This is the OPPOSITE shape from the Automations toolbar on purpose:
// `automationStatus()` (shared/automations.ts) returns "protected" as one of
// three MUTUALLY EXCLUSIVE values ("protected" | "off" | "on") because an
// automation's protection genuinely replaces its on/off state there — a
// protected automation cannot independently be on or off in the data. A
// choice value carries no such constraint: it is protected AND active, or
// protected AND inactive, or neither. Do not "unify" these two toolbars —
// they encode two different facts about their rows, one mutually exclusive,
// one not, and each filter shape is the honest one for its own data.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import { defaultCollectionConfig, type CollectionConfig } from "@shared/web/screen-engine/config"
import { useLanguage } from "@shared/web/language"
import { useCached } from "@shared/web/store"

import { NoAccess } from "@/components/deep-link/screen-bits"
import { shapeChoicesTable, type ChoiceGroupHome } from "@/components/deep-link/shape"
import { moduleSettingsIndex } from "@/components/screens/module-settings-screen"
import { RecordTable, type TableColumn } from "@/components/records/record-table"
import { tenancy } from "@/lib/api"
import type { Can } from "@/lib/perms"
import type { SelectableValue } from "@shared/types"

export function SettingsChoicesPanel({ teamId, can }: { teamId: string; can: Can }) {
  const { t, lang } = useLanguage()

  // THE SAME CACHE KEY `SelectableScreen` OPENS — see this file's header.
  const valuesQ = useCached<SelectableValue[]>(`selectable:${teamId}`, () =>
    tenancy.selectable().then((r) => r.values)
  )

  // ── THE ONE GATE, REUSED ────────────────────────────────────────────────
  // `moduleSettingsIndex(can)` is `visibleModuleSettings` asked once per
  // module (R61). No `can(` of its own is written anywhere in this file.
  const index = moduleSettingsIndex(can)
  const modulesWithChoices = index.filter(({ sections }) =>
    sections.some((s) => s.kind === "vocabulary")
  )

  // NOTHING THIS READER MAY SET, ANYWHERE — the same refusal the Modules tab
  // and a module's own settings page give (`NoAccess`, "You don't have
  // access to this, or it doesn't exist"), on the same inset, for the same
  // reason: telling "no module has vocabulary" apart from "you may not see
  // any of them" would disclose which modules this team has configured.
  if (modulesWithChoices.length === 0)
    return (
      <div className="rounded-[var(--radius)] bg-surface-panel p-6 lg:p-[var(--space-7)]">
        <NoAccess />
      </div>
    )

  // THE MODULE DERIVATION — off `MODULE_SETTINGS` through the index above,
  // never a second map (this file's header). A value whose group names no
  // module here (a `"labels"`/`"unused"` group — shared/selectable-homes.ts)
  // is filtered out below, exactly as it already is on every module settings
  // page and on the Modules tab.
  const groupHome = new Map<string, ChoiceGroupHome>()
  for (const { page, sections } of modulesWithChoices) {
    for (const s of sections) {
      if (s.kind !== "vocabulary") continue
      for (const type of s.types) groupHome.set(type, { segment: page.segment, title: page.title, colour: s.colour })
    }
  }

  if (valuesQ.error)
    return (
      <ShapeStateBody
        shape="recordChrome"
        state="error"
        copy={{ errorTitle: t("Couldn't load the choices.") }}
        action={
          <Button variant="secondary" onClick={() => valuesQ.refresh()}>
            {t("Try again")}
          </Button>
        }
      />
    )
  if (valuesQ.data === undefined) return <Skeleton variant="list" lines={4} />

  const rows = valuesQ.data.filter((v) => groupHome.has(v.type))
  const data = shapeChoicesTable(rows, groupHome, lang)

  const columns: TableColumn[] = [
    { key: "value", label: t("Value"), sort: "value", searchKey: "valueText", sortKey: (r) => r.valueText },
    {
      key: "module",
      label: t("Module"),
      sort: "module",
      searchKey: "moduleText",
      sortKey: (r) => r.moduleText,
      defaultDir: "asc",
    },
    {
      key: "status",
      label: t("Status"),
      sort: "status",
      searchKey: "statusText",
      sortKey: (r) => r.statusText,
      defaultDir: "asc",
    },
  ]

  const config: CollectionConfig = {
    ...defaultCollectionConfig,
    searchPlaceholder: t("Search choices…"),
    emptyText: t("No choices match what you're looking for."),
    userFilter: true,
    filterFacets: [
      {
        field: "moduleSegment",
        label: t("Module"),
        control: "select",
        options: modulesWithChoices.map(({ page }) => ({ value: page.segment, label: t(page.title) })),
      },
      {
        field: "activeState",
        label: t("Status"),
        control: "select",
        options: [
          { value: "active", label: t("Active") },
          { value: "inactive", label: t("Inactive") },
        ],
      },
      // ITS OWN FACET, NOT A THIRD STATUS OPTION — see this file's header.
      // `protectedState` is `shapeChoicesTable`'s own field (deep-link/shape.tsx),
      // read off the identical `v.isDefault` the STATUS COLUMN's badge already
      // reads, so this asks the one flag a second way rather than inventing one.
      {
        field: "protectedState",
        label: t("Protected"),
        control: "select",
        options: [
          { value: "yes", label: t("Yes") },
          { value: "no", label: t("No") },
        ],
      },
    ],
    // THE TABLE'S OWN HEADERS ARE THE SORT CONTROL (record-table.tsx) — a
    // picker beside them would be a second control for one question, exactly
    // the case `frameSortOptions` (web/lib/screens.ts) already carves out for
    // every recipe-driven table.
    sortable: false,
    sortOptions: [],
  }

  return <RecordTable columns={columns} rows={data.rows ?? []} config={config} useKitPanel />
}
