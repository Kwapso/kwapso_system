"use client"

// ONE MODULE'S AUTOMATIONS, ON ITS OWN SETTINGS PAGE — AND EVERY MODULE'S,
// TOGETHER, ON SETTINGS › AUTOMATIONS.
//
// ── THE CLIENT'S RULING, 2026-09-14 ─────────────────────────────────────────
//
// Shown the shipped list-of-cards version and the Contacts table beside it:
//
//   *"I use the list component exactly the same as we have in tickets. The
//    columns would be: 1. Name 2. Module: include the icon of the module
//    3. Status: protected, active, archived, or inactive, however you
//    prefer. This switch on and off: maybe we would need an edit button
//    that opens a slide-in, and we can edit name, description, and status.
//    However, if it's protected, you cannot make it unprotected, so editing
//    the status would be marking it as active or as inactive."*
//
// "The list component" is `RecordTable` (web/components/records/record-
// table.tsx) — the same sortable table Tickets and the Choices tab
// (settings-choices-panel.tsx) draw through, never a hand-rolled strip (R3).
// "However you prefer" on the vocabulary: **Protected · Active · Inactive**,
// never "archived" — nothing archives an automation, and Choices settled on
// the identical three words the same day for the identical reason
// (deep-link/shape.tsx's own header). ONE DERIVATION: `automationStatus()`
// (shared/automations.ts) is still the only place "is this row protected /
// on / off" is decided; this file only spells the three words over it.
//
// ── THE SHEET REPLACES THE INLINE ROW ───────────────────────────────────────
//
// Every row used to draw its own switch or its own Protected badge+reason
// inline. The client asked for an EDIT SHEET instead — Name, Description,
// Status — so that work moved to `AutomationEditSheet`
// (automation-edit-sheet.tsx). R70's own requirement — the "Protected" mark
// can never render without the reason beside it, from ONE guard — moved with
// it, and `web/test/automations.test.ts` reads it there.
//
// ── AND THEN THE SHEET GREW A DETAIL FACE, 2026-09-15 ───────────────────────
//
// A row press used to open the edit form directly. The client's next ruling
// changed that: *"When I click on Automation, it should open on the detail
// page, so just the name, the description, the module, and the cheapest
// status. On the top next to the header… put the button to edit, which
// should then show the edit screen on the same slide in."* So the sheet is
// now TWO faces sharing one open state — see `automation-edit-sheet.tsx`'s
// own header for the split, the status chip's colour derivation
// (`AUTOMATION_STATUS_DOT`, imported here for the table's own column below —
// a dot since the client's 16 Sep 2026 follow-up, see that file's own
// header for the full account), and why a Protected row's reason is now one
// press further than R70's own text once promised (the file that owns that
// trade-off, not this one).
//
// ── WHY IT IS A TABLE AND NOT A SECTION ANY MORE ────────────────────────────
//
// `ModuleSettingsSection.kind === "automations"` is unchanged; only the body
// this component draws for it moved from a hand-rolled `<ul>` of cards to
// `RecordTable`. The REGISTRY (`shared/automations.ts`) still ships in the
// code, like the base recipes: what exists, what it does, whether it can be
// switched, and why not. The DOOR (`GET /api/tenancy/config/automations`)
// still answers only with this team's overrides of it — the switch AND, as
// of this redesign, a team's own name/description for a row (shared/
// automations.ts's "A TEAM'S OWN WORDS" note) — so an absent answer is every
// automation on with the code's own words, a failed read is the same, and a
// team that has never opened this page sees exactly what the code says.
//
// ── THE GATE, AND WHY IT IS NOT ASKED HERE TWICE ────────────────────────────
//
// Whether this component is DRAWN AT ALL is `visibleModuleSettings`'s
// answer, one file over, and R61 holds that to exactly one `can(` in the
// host. Whether a ROW CAN BE EDITED is a second and different question —
// `teams:update`, the same right the door gates on — and it is asked here,
// once, and handed down to the sheet as `mayChange` rather than re-derived
// there. Reading is open to any member the module's own gate lets through,
// because her ruling is visibility and "what does this software do without
// me asking" must not be behind the right to change it.
//
// ── NO `title` PROP ANY MORE ─────────────────────────────────────────────────
//
// Both mountings sit under a tab already spelling the word "Automations" —
// the Settings › Automations tab, and (since the two-tabs ruling of
// 2026-09-11) the per-module settings page's own Automations tab
// (module-settings-screen.tsx). A heading repeating that word a second time
// inside the box is the exact shape R72 was earned by ("stop putting
// subtitles unless I ask"), so neither mounting draws one; `RecordTable`'s
// kit panel (`useKitPanel`) never asks for a title in the first place.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { defaultCollectionConfig, type CollectionConfig } from "@shared/web/screen-engine/config"
import { Icon } from "@shared/web/screen-engine/icon"
import { useT } from "@shared/web/language"
import { useCached } from "@shared/web/store"

import { CONCEPT_ICON } from "@/lib/pages"
import { usePermissions } from "@/lib/perms"
import { tenancy } from "@/lib/api"
import { RecordTable, type TableColumn, type TableRowData } from "@/components/records/record-table"
import { AutomationEditSheet, AUTOMATION_STATUS_DOT } from "@/components/screens/automation-edit-sheet"
import {
  AUTOMATIONS,
  automationOverride,
  automationStatus,
  type AutomationStatus,
} from "@shared/automations"

/** ONE MODULE, OR EVERY MODULE THIS READER MAY SEE — the same split
 * `SelectableScope` drew for Choices, until the day its unscoped mounting was
 * retired. An automation is never created here, only switched or renamed,
 * and the registry (`shared/automations.ts`) is the one list either mounting
 * reads.
 *
 * BOTH VARIANTS NOW CARRY A `title` PER MODULE — the module's own translated
 * display name (page.title, "Tickets", "Time", …), never the section word
 * "Automations". The Module COLUMN draws on every row of BOTH mountings
 * (the client's own three-column list, unconditionally), so a module-scoped
 * page needs its module's name exactly as much as the unscoped one does; a
 * single `title?: string` special-cased per mounting was the old shape, and
 * would have meant one scope reading `scope.title` and the other reading a
 * lookup table for the identical fact. */
export type AutomationsScope =
  | { kind: "module"; segment: string; title: string }
  | {
      kind: "all"
      /** Every module (segment + its own, already-translated settings-page
       * title) whose automations this reader may see, in the order
       * `moduleSettingsIndex` returns them. */
      modules: { segment: string; title: string }[]
    }

type AutomationRow = TableRowData & {
  id: string
  name: string
  module: React.ReactNode
  moduleText: string
  moduleSegment: string
  status: React.ReactNode
  statusText: string
  statusState: AutomationStatus
}

export function ModuleAutomations({ teamId, scope }: { teamId: string; scope: AutomationsScope }) {
  const t = useT()
  const { can } = usePermissions(teamId)
  // The same right the door gates the write on. A reader without it sees
  // every row and every state, and cannot open a row for editing — which is
  // the honest shape of "visibility" for somebody who may not change the
  // team's settings.
  const mayChange = can("teams", "update")

  const settingsQ = useCached<Record<string, string>>(`automations:${teamId}`, () =>
    tenancy.automationSettings().then((r) => r.automations)
  )

  // THE SEGMENTS THIS MOUNTING COVERS — one, scoped to a module's own
  // settings page, or every module `scope.modules` names, the Settings ›
  // Automations tab's own answer.
  const segments = scope.kind === "module" ? [scope.segment] : scope.modules.map((m) => m.segment)
  const rows = AUTOMATIONS.filter((a) => segments.includes(a.segment))
  const moduleTitle = (segment: string): string =>
    scope.kind === "module" ? scope.title : (scope.modules.find((m) => m.segment === segment)?.title ?? segment)

  // THE STORED BLOB, READ PER ROW'S OWN SEGMENT — a scoped mounting has
  // exactly one and the Settings tab's unscoped one may hold several.
  // `automations:${teamId}` already carries every segment's own overrides in
  // the one door read above (`settingsQ`), so this is a local re-slice of
  // what is already in memory and costs no second door (R56). A blob this
  // app's own door cannot have written is read as the DEFAULT rather than a
  // guess — the same answer the worker gives, because a screen and a worker
  // disagreeing about what a stored blob means is worse than either answer
  // on its own.
  const storedFor = React.useCallback(
    (segment: string): unknown => {
      const raw = settingsQ.data?.[segment]
      if (!raw) return {}
      try {
        const parsed: unknown = JSON.parse(raw)
        return typeof parsed === "object" && parsed !== null ? parsed : {}
      } catch {
        return {}
      }
    },
    [settingsQ.data]
  )

  const STATUS_LABEL: Record<AutomationStatus, string> = {
    on: t("Active"),
    off: t("Inactive"),
    protected: t("Protected"),
  }

  // THE ROWS, SHAPED ONCE — the same move `shapeChoicesTable`
  // (deep-link/shape.tsx) makes for the sibling Choices table: a plain
  // string cell where there is nothing to draw beside the word (Name), a
  // node + its own search/sort text where there is (Module, Status).
  const data: AutomationRow[] = rows.map((a) => {
    const settings = storedFor(a.segment)
    const status = automationStatus(a, settings)
    const override = automationOverride(settings, a.key)
    const name = override?.title ?? t(a.title)
    const statusWord = STATUS_LABEL[status]
    return {
      id: a.key,
      name,
      module: (
        <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
          <Icon
            name={CONCEPT_ICON[a.segment as keyof typeof CONCEPT_ICON] ?? CONCEPT_ICON.settings}
            className="text-muted-foreground size-4 shrink-0"
          />
          <span className="min-w-0 truncate">{moduleTitle(a.segment)}</span>
        </span>
      ),
      moduleText: moduleTitle(a.segment),
      moduleSegment: a.segment,
      // A DOT PER STATUS — the client's third ruling on this chip, 16 Sep
      // 2026, verbatim: "let's change the full color pill to also be a dot.
      // Inactive gets gray, and active gets green." (Same evening: "All dots
      // are always solid, not rings.") Two rulings earlier this cell drew a
      // filled pill; this one replaces it with a dot, styled by
      // `AUTOMATION_STATUS_DOT` (automation-edit-sheet.tsx, which this sheet's
      // own detail head imports the same constant from). `AUTOMATION_STATUS_DOT`
      // (automation-edit-sheet.tsx, which this sheet's own detail head
      // imports the same constant from) is the one derivation: `shipped`
      // (green) for Active, `archived` (grey) for Inactive — both her exact
      // words — and, since 22 Sep 2026, `review` (blue, `--info`) for
      // Protected, her own ruling that day ("protected status make it color
      // blue instead of black") over the earlier `building` (charcoal)
      // guess; that file's own header carries the full account. The Choices
      // table's own badge (deep-link/shape.tsx) reads this SAME map now too
      // (17 Sep 2026, "Dots like everywhere else" retired the older, separate
      // `AUTOMATION_STATUS_VARIANT` filled pill there), so all three readers
      // — this list, the detail sheet, and Choices — agree automatically.
      status: <Badge variant="status" dot={AUTOMATION_STATUS_DOT[status]}>{statusWord}</Badge>,
      statusText: statusWord,
      statusState: status,
    }
  })

  // WHICH STATUSES ACTUALLY APPEAR ON THIS PAGE — never a typed list of
  // three words, so a page where every row happens to be Protected offers no
  // dead Active/Inactive option, and a page with only one state present
  // draws no facet at all worth narrowing.
  const statesPresent = new Set(data.map((r) => r.statusState))

  const columns: TableColumn[] = [
    { key: "name", label: t("Name"), sort: "name", defaultDir: "asc" },
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
    searchPlaceholder: t("Search automations…"),
    emptyText: t("No automations match what you're looking for."),
    userFilter: true,
    filterFacets: [
      // THE MODULE FILTER — the Settings › Automations tab's own question
      // (client, 2026-09-14: "filtered by module and by status"). Absent on
      // a scoped mounting: one module is not a choice.
      ...(scope.kind === "all"
        ? [
            {
              field: "moduleSegment",
              label: t("Module"),
              control: "select" as const,
              options: scope.modules
                .filter((m) => data.some((r) => r.moduleSegment === m.segment))
                .map((m) => ({ value: m.segment, label: m.title })),
            },
          ]
        : []),
      // Offered only where more than one state is actually present — a
      // filter that could only ever pick every row decides nothing (R36's
      // own argument, read onto a facet instead of a switch).
      ...(statesPresent.size > 1
        ? [
            {
              field: "statusState",
              label: t("Status"),
              control: "select" as const,
              options: (["protected", "on", "off"] as AutomationStatus[])
                .filter((s) => statesPresent.has(s))
                .map((s) => ({ value: s, label: STATUS_LABEL[s] })),
            },
          ]
        : []),
    ],
    // THE TABLE'S OWN HEADERS ARE THE SORT CONTROL (record-table.tsx) — the
    // same resolution `settings-choices-panel.tsx` reached for its own
    // table: no `SortControl` drawn beside it, which would be a second
    // control for one question (R53).
    sortable: false,
    sortOptions: [],
  }

  // THE SHEET — one at a time, keyed by the row pressed. `editingKey` rather
  // than the automation itself, so the row that opens it is looked up fresh
  // off `rows`/`storedFor` on every render instead of the sheet holding a
  // snapshot that can drift from a switch flipped elsewhere while it is open
  // (R1: this screen is a listener, and the sheet should be too).
  const [editingKey, setEditingKey] = React.useState<string | null>(null)
  const editing = editingKey ? (rows.find((a) => a.key === editingKey) ?? null) : null

  return (
    <>
      <RecordTable
        columns={columns}
        rows={data}
        config={config}
        useKitPanel
        // R67 — THIS TABLE GENUINELY STANDS ON PAPER, no class needed to say
        // so any more. `useKitPanel` hands the row to the KIT's own
        // `CollectionFrame` (aliased `KitCollectionFrame` in
        // `shared/web/screen-engine/collection-frame.tsx`), whose
        // `data-slot="collection-frame-panel"` div carries `bg-surface-panel`
        // UNCONDITIONALLY, in `collectionPanelVariants`'s own base classes
        // (`shared/ui/components/collection-frame/collection-frame.tsx`) —
        // never gated by `tone`. A REDUNDANT `className="…bg-surface-panel"`
        // used to sit here for exactly one reason: R67's census resolved a
        // referenced component by its own declared name and could not cross
        // this app's `KitCollectionFrame` import ALIAS back to the kit's real
        // `CollectionFrame`, so this genuinely-contained table read as bare.
        // `test/sections-stand-on-paper.test.ts`'s amendment 8 (2026-09-14)
        // fixed the alias blindness — declarations now resolve one hop
        // through an import binding, aliased or not — so the census sees the
        // kit's own panel directly and the duplicate class is gone.
        // PRESSING A ROW OPENS THE SHEET — the app's own convention for
        // reaching a record's editor (contacts-screen.tsx, tasks-screen.tsx,
        // meetings-screen.tsx all open on a row press), read onto an
        // automation the only way it can be: there is no detail SCREEN for
        // one to navigate to, so the press opens the panel directly rather
        // than a page that does not exist. IT OPENS ON THE DETAIL FACE, NOT
        // THE EDIT FORM — client ruling, 2026-09-15: "When I click on
        // Automation, it should open on the detail page… put the button to
        // edit, which should then show the edit screen on the same slide
        // in." `AutomationEditSheet` (automation-edit-sheet.tsx) owns that
        // split now; this file only decides WHICH row, same as before. A
        // Protected row's reason (R70) is now one press further than it
        // used to be — see that file's own header for why.
        onRowClick={(row) => setEditingKey(row.id as string)}
      />
      <AutomationEditSheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditingKey(null)
        }}
        teamId={teamId}
        automation={editing}
        settings={editing ? storedFor(editing.segment) : {}}
        mayChange={mayChange}
        // ALREADY IN MEMORY (R56) — `moduleTitle` above is this same
        // component's own lookup, read once per row when the table was
        // shaped; the sheet knows nothing of `AutomationsScope` and is
        // handed the answer rather than re-deriving it.
        moduleTitle={editing ? moduleTitle(editing.segment) : ""}
      />
    </>
  )
}
