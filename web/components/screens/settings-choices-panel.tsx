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
// walls (`GroupValues`/`ChipWall`) with inline RENAME and mark editing — a
// shape this summary view does not want (there is no `scope` to narrow
// renaming to, and editing an EXISTING value already has a home on each
// module's own page, which is where R61 put it on purpose). What is
// genuinely shared — the fetch, the cache key, and the door's own idea of
// what a value IS — is shared; what differs is the PRESENTATION, and
// `RecordTable` (web/components/records/record-table.tsx) is the library's
// own answer for exactly that shape (Contacts, Tickets, Tasks, Meetings),
// never a hand-rolled strip (R3).
//
// ── THE CREATE ACT — ONE FORM, TWO STARTING POINTS ───────────────────────────
//
// The client, 14 Sep 2026, the same session: *"in settings choices, of
// course, we need the add button. When it opens, I should be able to select
// the module and, once I have selected the module, enter the value. We're
// missing this on the general settings, but I think also in each detailed
// setting."* The SECOND half was already answered — `SelectableScreen` has
// carried its own "New value" button and `SelectableFormDialog` since before
// this panel existed, module already known, nothing to change there. The
// FIRST half is this screen's own gap, closed here: the toolbar's `+`
// (`CollectionCreateActionProvider`, the app's one seam for a collection's
// create act — R48/R50/R53, the same pinned-right icon-only mango every
// other collection wears) opens `SelectableFormDialog` in its OTHER shape —
// `modules` rather than `types` — which asks for the MODULE FIRST (built off
// the identical `moduleSettingsIndex` walk the Module COLUMN and FILTER
// below already read, never a second list) and only then reveals the value
// field, disabled until a module resolves a group for it to belong to (the
// create door needs a type — `postCreateSelectable`,
// workers/tenancy/src/routes/selectable.ts — same door `SelectableScreen`
// already calls through, R10/R1/R15/R20 unchanged). `SelectableFormDialog`'s
// own header carries the rest of the shape (the closed Group picker for the
// two modules that own more than one vocabulary).
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
// ── STATUS: PROTECTED · ACTIVE · INACTIVE — ONE THREE-WAY WORD ──────────────
//
// The client's ruling, 14 Sep 2026, the same sentence that killed the mark
// (see `shapeChoicesTable`'s own header, deep-link/shape.tsx): *"the status:
// if it's protected, it's always active. So you don't need to put active
// protected, just protected."* THIS PARAGRAPH USED TO ARGUE THE OPPOSITE —
// that `isDefault` ("Protected") was provably independent of `active`/
// `inactive` because `setSelectableDefault` wrote `is_default` with no guard
// on `deactivated_at`, so Status had to stay two mutually exclusive states
// with Protected riding as a THIRD, independent toolbar facet. That gap is
// CLOSED NOW, at the door: protecting a value reactivates it in the same
// idempotent UPDATE (workers/tenancy/src/lib/selectable.ts, R17), and
// `0088`'s migration reactivated every row that was already both. So
// "protected" truly implies "active" going forward, and a THREE-WAY filter
// no longer risks lying the way the paragraph above worried about — there is
// no row a Protected/Inactive combination could hide, because the database
// cannot produce one any more. Status is ONE facet (`statusState`, the same
// field `shapeChoicesTable`'s STATUS COLUMN derives), three mutually
// exclusive values: Protected, Active, Inactive.
//
// THE SEPARATE PROTECTED YES/NO FACET IS GONE, and this is the one thing
// worth a reader not re-adding without reading this paragraph first: with the
// invariant enforced, "Protected" and "Active" are no longer independent
// questions — every Protected row IS an Active row, so a second facet asking
// "is it protected?" beside a Status facet that already offers "Protected" as
// one of its three options would let a reader combine them into a filter
// state ("Active" + "Protected: No") that can never match a real row, which
// is worse than redundant, it is actively misleading. The client's own
// separate ruling that put Protected in "automations filters everywhere" is
// unaffected — automations HAVE ALWAYS drawn Protected as a mutually
// exclusive third state (`automationStatus()`, shared/automations.ts,
// "protected" | "off" | "on") — so this screen finally matches that shape
// instead of standing apart from it, which the paragraph this replaced argued
// for on the (now false) premise that a choice value's two flags could
// disagree.
//
// ── THE TOOLBAR (R48/R53) ────────────────────────────────────────────────────
//
// `RecordTable` → `CollectionFrame`'s own kit panel draws the search box
// (R48's default) and the sort control is the table's own column headers
// (R53's "a table already has its control" — no `SortControl` drawn beside
// it, which would be a second control for one question). TWO filters: MODULE
// (which settings page a group belongs to) and the one three-way STATUS facet
// above.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Plus } from "@shared/ui/foundations/icons"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import { CollectionCreateActionProvider } from "@shared/web/screen-engine/collection-frame"
import { defaultCollectionConfig, type CollectionConfig } from "@shared/web/screen-engine/config"
import { useLanguage } from "@shared/web/language"
import { primeCache, useCached } from "@shared/web/store"
import { toast } from "@shared/ui/components/sonner/sonner"

import { NoAccess } from "@/components/deep-link/screen-bits"
import { shapeChoicesTable, type ChoiceGroupHome } from "@/components/deep-link/shape"
import { moduleSettingsIndex } from "@/components/screens/module-settings-screen"
import { RecordTable, type TableColumn } from "@/components/records/record-table"
import { SelectableFormDialog, type ChoiceModuleOption } from "@/components/choices/selectable-form-dialog"
import { tenancy } from "@/lib/api"
import type { Can } from "@/lib/perms"
import type { SelectableValue } from "@shared/types"

export function SettingsChoicesPanel({ teamId, can }: { teamId: string; can: Can }) {
  const { t, lang } = useLanguage()
  const [addOpen, setAddOpen] = React.useState(false)

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

  // WHETHER THIS READER MAY ADD A VALUE AT ALL — the same right the create
  // door gates (`selectable_data:create`, `postCreateSelectable`), asked once,
  // here, the same way `SelectableScreen` asks it for its own "New value".
  const canCreate = can("selectable_data", "create")

  // ── THE MODULE PICKER'S OWN OPTIONS, DERIVED — never a second list ──────
  // Built off the SAME walk that builds `groupHome` below (`modulesWithChoices`
  // × its own vocabulary sections), narrowed to sections that can actually
  // grow (`create: true` — `ModuleSettingsSection.colour`'s own sibling flag).
  // A module with no creatable vocabulary today never happens (every section
  // reaching this screen is `create: true`), but the filter is here so a
  // future `create: false` vocabulary — one whose words the app owns, like
  // the retired Ticket status page — does not silently gain an Add button
  // this screen never meant to offer it.
  const moduleOptions: ChoiceModuleOption[] = modulesWithChoices
    .map(({ page, sections }) => ({
      segment: page.segment,
      title: page.title,
      types: sections
        .filter((s): s is Extract<typeof s, { kind: "vocabulary" }> => s.kind === "vocabulary" && s.create)
        .flatMap((s) => s.types),
    }))
    .filter((m) => m.types.length > 0)

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

  // Create — the dialog calls this; it throws on failure so the dialog
  // surfaces the reason and stays open, and closes itself on success. Same
  // shape as `SelectableScreen`'s own `addValue`, same cache key primed
  // (`selectable:${teamId}`, this file's header), so a value added here is
  // the identical live patch a module's own settings page would have made.
  async function addValue(type: string, value: string, mark: string) {
    const { values: next } = await tenancy.createSelectable(type, value, mark || undefined)
    primeCache(`selectable:${teamId}`, next)
    // SAME UNTRANSLATED SHAPE `SelectableScreen`'s own `addValue` already
    // uses for this exact toast — matching the existing convention rather
    // than inventing a second one for the identical sentence.
    toast.success(`Added "${value}".`)
  }

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
      // ONE THREE-WAY FACET — see this file's header for why the separate
      // Protected yes/no facet that used to stand beside this is gone:
      // "protected" now implies "active", so Protected is a mutually
      // exclusive third STATE rather than an independent question.
      // `statusState` is `shapeChoicesTable`'s own field (deep-link/shape.tsx),
      // the same derivation the STATUS COLUMN's badge reads.
      {
        field: "statusState",
        label: t("Status"),
        control: "select",
        options: [
          { value: "protected", label: t("Protected") },
          { value: "active", label: t("Active") },
          { value: "inactive", label: t("Inactive") },
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

  return (
    <CollectionCreateActionProvider
      action={canCreate ? { label: t("New choice"), icon: <Plus className="size-4" />, onCreate: () => setAddOpen(true) } : null}
    >
      <RecordTable columns={columns} rows={data.rows ?? []} config={config} useKitPanel />
      {canCreate && (
        <SelectableFormDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          modules={moduleOptions}
          onSubmit={addValue}
          draftKey={`selectable-add:${teamId}:choices`}
        />
      )}
    </CollectionCreateActionProvider>
  )
}
