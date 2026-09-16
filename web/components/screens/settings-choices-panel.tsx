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
// three named columns, and `SelectableScreen` drew grouped lists and chip
// walls (`GroupValues`/`ChipWall`) with inline rename and mark editing — a
// shape this summary view does not want. What is genuinely shared — the
// fetch, the cache key, and the door's own idea of what a value IS — is
// shared; what differs is the PRESENTATION, and `RecordTable`
// (web/components/records/record-table.tsx) is the library's own answer for
// exactly that shape (Contacts, Tickets, Tasks, Meetings),
//
// ── EDITING AN EXISTING VALUE, 15 SEP 2026 ───────────────────────────────────
//
// THIS PARAGRAPH USED TO SAY renaming a value "already has a home on each
// module's own page" — true the day it was written, when the module page
// still narrowed `SelectableScreen` (its own inline rename/protect/deactivate
// row menu). Task B retired that mounting: BOTH scopes of this table now draw
// the identical row, so a reader who may act on a value gets exactly one door
// to do it from, whichever scope they are looking at. `web/test/
// reachable-screens.test.ts`'s `doors-have-controls` census is what caught the
// gap Task B's first pass left — `POST /api/tenancy/selectable/update`
// (rename), `/active` (deactivate/reactivate) and `/default` (protect) each
// went from "called by `SelectableScreen`'s row menu" to "called by nothing a
// person can click" the moment that mounting was retired, three doors with a
// working server side and no UI. `valueActions` below (same shape
// `selectable-screen.tsx` used to build, `RecordActionsMenu`'s own contract)
// and `RenameValueDialog` (a small `FormShellDialog`, the create dialog's own
// shape read backwards — prefilled rather than blank) are what put the three
// doors back behind a control, on an "actions" column zipped onto
// `shapeChoicesTable`'s own rows by index (the two arrays are the same
// `.map` in the same order, so a row and its actions can never point at the
// wrong record).
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
//
// ── `scope`, THE ONE MODULE-SETTINGS ALLOWED EDIT HERE, 15 SEP 2026 ─────────
//
// Task B's ruling: the per-module Choices section
// (`module-settings-screen.tsx`'s `choices` panel, narrowed today by
// `SelectableScope`) drew a DIFFERENT editor — `SelectableScreen`'s grouped
// lists and chip walls — one day after this table shipped as the general
// one. That is a second editor for one concern, exactly what this file's own
// header already refuses ("IT IS A NEW COMPONENT, NOT A THIRD MOUNTING… what
// differs is the PRESENTATION"), and `module-settings-screen.tsx`'s own
// long-standing header comment says it in the client's own words: *"the
// choices: yes, this would survive, but not as a general thing, but inside
// each module"* — narrowed, never forked.
//
// `scope` is the narrowing, and it is OPTIONAL for the same reason
// `SelectableScope` was: absent, this is the whole-team table
// (`settings-screen.tsx`'s mounting, unchanged); present, it is ONE module's
// own share of it (`module-settings-screen.tsx`'s `choices` panel, one call
// per page rather than one per vocabulary SECTION — a scoped `segment`
// already covers every vocabulary section that page owns, the same walk
// `modulesWithChoices` below already does for the general table).
//
// THREE THINGS NARROW WITH IT, and none of them is a second derivation:
//
//   • `modulesWithChoices` — filtered to the one page naming `scope.segment`,
//     so `groupHome` (built from it, unchanged below) and `rows` (filtered
//     through `groupHome`, unchanged below) narrow for free.
//   • THE MODULE COLUMN AND ITS FILTER FACET — both name which module a
//     value belongs to, which is the one fact a scoped page's own tab strip
//     already says (module-settings-screen.tsx's "Choices" tab lives on
//     THAT module's own page). Drawing it a second time on every row is the
//     same redundancy `selectable-screen.tsx`'s own group label already
//     self-exempts against ("a group label only where there is more than
//     one group" — here, a module column only where there is more than one
//     module to tell apart).
//   • THE ADD DIALOG'S FIRST STEP — see `SelectableFormDialog`'s own header,
//     "ONE COMPONENT, TWO STARTING POINTS". A `scope` resolves to exactly
//     one `ChoiceModuleOption`, so the module is never in doubt and asking
//     for it would be a picker with one answer — the exact control R36/R70
//     stand against, a step that decides nothing. Handing the dialog that
//     module's own `types` (its free-text-with-datalist shape, unchanged
//     since before this table existed) skips the step outright rather than
//     pre-filling a `<Select>` the reader would still have to press.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Input } from "@shared/ui/components/input/input"
import { DialogTitle } from "@shared/ui/components/dialog/dialog"
import { PencilSimple, Plus, Power, Shield, ShieldSlash } from "@shared/ui/foundations/icons"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import { CollectionCreateActionProvider } from "@shared/web/screen-engine/collection-frame"
import { Field } from "@shared/web/field"
import { FormShellDialog, fieldSpacing } from "@shared/web/form-shell"
import { defaultCollectionConfig, defaultFieldConfig, type CollectionConfig } from "@shared/web/screen-engine/config"
import { useConfirm } from "@shared/web/use-confirm"
import { useLanguage } from "@shared/web/language"
import { primeCache, useCached } from "@shared/web/store"
import { toast } from "@shared/ui/components/sonner/sonner"

import { NoAccess } from "@/components/deep-link/screen-bits"
import { shapeChoicesTable, type ChoiceGroupHome } from "@/components/deep-link/shape"
import { moduleSettingsIndex } from "@/components/screens/module-settings-screen"
import { RecordActionsMenu, type RecordAction } from "@/components/records/record-chrome"
import { RecordTable, type TableColumn } from "@/components/records/record-table"
import { SelectableFormDialog, type ChoiceModuleOption } from "@/components/choices/selectable-form-dialog"
import { ApiFailure, tenancy } from "@/lib/api"
import type { Can } from "@/lib/perms"
import type { SelectableValue } from "@shared/types"

const renameValueField = { ...defaultFieldConfig, label: "Value", required: true }
const renameMarkField = {
  ...defaultFieldConfig,
  label: "Mark",
  required: false,
}

/** THE RENAME DIALOG — `SelectableFormDialog`'s own create shape, read
 * backwards: one text field, prefilled rather than blank, submitting to
 * `updateSelectable` rather than `createSelectable`. See this file's header,
 * "EDITING AN EXISTING VALUE", for why this exists at all.
 *
 * `target` DOUBLES AS `open`: a rename dialog needs a value to prefill from
 * or it has nothing to show, so there is no state this component could be in
 * with a target and `open: false`, or `open: true` and no target — the two
 * booleans `SelectableFormDialog` keeps apart (`open` + `draftKey`-cleared)
 * collapse to one question here on purpose. */
function RenameValueDialog({
  target,
  onOpenChange,
  onSubmit,
}: {
  target: SelectableValue | null
  onOpenChange: (open: boolean) => void
  onSubmit: (id: string, value: string, mark: string) => Promise<void>
}) {
  const { t } = useLanguage()
  const [value, setValue] = React.useState(target?.value ?? "")
  const [mark, setMark] = React.useState(target?.mark ?? "")
  const [busy, setBusy] = React.useState(false)
  // RESEEDED FROM THE TARGET, NOT ONCE AT MOUNT — a menu press on a SECOND
  // row while this dialog is still mounted (closed, `target` about to change)
  // must not show the first row's stale draft for one frame.
  React.useEffect(() => {
    if (target) {
      setValue(target.value)
      setMark(target.mark ?? "")
    }
  }, [target])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!target || !value.trim() || busy) return
    setBusy(true)
    try {
      await onSubmit(target.id, value.trim(), mark.trim())
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't rename that value."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <FormShellDialog
      open={target !== null}
      onOpenChange={onOpenChange}
      busy={busy}
      onSubmit={submit}
      title={<DialogTitle>{t("Rename")}</DialogTitle>}
      submit={{ busy, disabled: !value.trim() }}
    >
      <Field config={renameValueField} htmlFor="rename-value" className={fieldSpacing}>
        <Input
          id="rename-value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={busy}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
      </Field>
      <Field config={renameMarkField} htmlFor="rename-mark" className={fieldSpacing}>
        <Input
          id="rename-mark"
          value={mark}
          onChange={(e) => setMark(e.target.value)}
          placeholder={t("A short word or initial")}
          maxLength={4}
          disabled={busy}
        />
      </Field>
    </FormShellDialog>
  )
}

export function SettingsChoicesPanel({
  teamId,
  can,
  scope,
}: {
  teamId: string
  can: Can
  /** ABSENT for the whole-team table (Settings › Choices); present for one
   * module's own narrowed mounting (`module-settings-screen.tsx`'s `choices`
   * panel) — see this file's header, "`scope`, THE ONE MODULE-SETTINGS
   * ALLOWED EDIT HERE". `segment` is the same word `MODULE_SETTINGS` and
   * `TEAM_SECTIONS` both answer to. */
  scope?: {
    segment: string
    /** THE IMPORT DOOR, CARRIED THROUGH — `SelectableScreen`'s own scoped
     * mounting drew this beside "New value" (client ruling quoted in that
     * file's header: "each module's settings page gets its own import and
     * export for its own groups"). `CollectionCreateAction.secondary` is
     * where the kit-panel path already draws an import act — on the
     * GENUINELY-empty body (composition 27.21's own two-button shape),
     * which is where a module's Choices section most needs it: a page with
     * no values yet is exactly the moment "or import a list" matters.
     * Absent draws nothing, same as every other `secondary` caller.
     *
     * EXPORT CSV DID NOT CARRY OVER, AND THAT IS RECORDED RATHER THAN
     * SILENTLY DROPPED. `SelectableScreen`'s scoped toolbar drew an
     * always-visible "Export CSV" `<a href>` beside "New value" once the
     * section held a row (`tenancy.selectableExportHref`); this table's
     * `useKitPanel` frame has no always-visible actions slot beyond the one
     * create button (`CollectionCreateActionProvider`'s `action`) — its
     * `secondary` only ever reaches the GENUINELY-empty composition. A
     * module settings page that wants Export CSV back needs either a second
     * slot upstream in the kit frame or a bespoke toolbar action beside this
     * table, neither of which is "extend with a scope prop" — flagged in
     * the lane report rather than decided here. */
    onImport?: () => void
  }
}) {
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
  const modulesWithChoices = index
    .filter(({ sections }) => sections.some((s) => s.kind === "vocabulary"))
    // THE NARROWING — see this file's header. A `scope` names ONE page's own
    // segment; everything below (`groupHome`, `rows`, the Module column and
    // its facet, the dialog's module step) is built off this filtered list
    // rather than asking `scope` a second time.
    .filter(({ page }) => !scope || page.segment === scope.segment)

  // WHETHER THIS READER MAY ADD A VALUE AT ALL — the same right the create
  // door gates (`selectable_data:create`, `postCreateSelectable`), asked once,
  // here, the same way `SelectableScreen` asks it for its own "New value".
  const canCreate = can("selectable_data", "create")
  // RENAME / PROTECT and DEACTIVATE, the two other rights `valueActions`
  // below gates on — the same two `SelectableScreen`'s own row menu asked.
  const canEdit = can("selectable_data", "update")
  const canDelete = can("selectable_data", "delete")

  // THE RENAME DIALOG'S OWN TARGET — `null` means closed. A value rather than
  // a boolean because the dialog prefills from it (`RenameValueDialog`,
  // below).
  const [renaming, setRenaming] = React.useState<SelectableValue | null>(null)
  // Deactivating is the red half (same shape as `SelectableScreen`'s own
  // `setActive`); reactivating and protecting/unprotecting are confirm-free.
  const { ask: askDeactivate, run: runActive, dialog: deactivateDialog } = useConfirm()

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

  /** Protect a value, or take the protection off — `SelectableScreen`'s own
   * `setDefault`, unchanged. Confirm-free either direction: protecting is
   * never destructive, and unprotecting only lifts a refusal, it does not by
   * itself deactivate anything. */
  async function setDefault(v: SelectableValue, next: boolean) {
    try {
      const { values: next2 } = await tenancy.setSelectableDefault(v.id, next)
      primeCache(`selectable:${teamId}`, next2)
      toast.success(next ? t("Protected.") : t("No longer protected."))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't change that."))
    }
  }

  /** Deactivate / reactivate one value — `SelectableScreen`'s own
   * `setActive`, unchanged: deactivating asks first (the red half), a value
   * a team leans on stays visible either way, and it drops out of the
   * pickers rather than being deleted. */
  function setActive(v: SelectableValue, next: boolean) {
    if (!next) {
      askDeactivate({
        title: t('Deactivate "{value}"?', { value: v.value }),
        body: t("It drops out of the pickers everywhere it's offered. Anything already using it keeps it, and you can turn it back on any time."),
        action: t("Deactivate"),
        run: () =>
          runActive(
            () => tenancy.setSelectableActive(v.id, false).then(({ values: list }) => primeCache(`selectable:${teamId}`, list)),
            t('Deactivated "{value}".', { value: v.value }),
            t("Couldn't update that value.")
          ),
      })
      return
    }
    void runActive(
      () => tenancy.setSelectableActive(v.id, true).then(({ values: list }) => primeCache(`selectable:${teamId}`, list)),
      t('Activated "{value}".', { value: v.value }),
      t("Couldn't update that value.")
    )
  }

  /** WHAT A READER MAY DO TO ONE VALUE — the same shape
   * `selectable-screen.tsx`'s own `valueActions` built (this file's header,
   * "EDITING AN EXISTING VALUE"): Rename when active and `canEdit`, Protect/
   * Unprotect when `canEdit`, Deactivate/Activate when `canDelete` and not
   * protected (the door refuses a protected value's deactivation either way —
   * R17's idempotent predicate is the real defence — this is so nobody is
   * offered a button that cannot work). */
  function valueActions(v: SelectableValue): RecordAction[] {
    return [
      ...(v.active && canEdit
        ? [
            {
              key: "rename",
              label: t("Rename"),
              icon: <PencilSimple className="size-3.5" />,
              onSelect: () => setRenaming(v),
            },
          ]
        : []),
      ...(canEdit
        ? [
            v.isDefault
              ? {
                  key: "undefault",
                  label: t("Stop protecting it"),
                  icon: <ShieldSlash className="size-3.5" />,
                  onSelect: () => void setDefault(v, false),
                }
              : {
                  key: "default",
                  label: t("Protect it"),
                  icon: <Shield className="size-3.5" />,
                  onSelect: () => void setDefault(v, true),
                },
          ]
        : []),
      ...(canDelete && !v.isDefault
        ? [
            v.active
              ? {
                  key: "deactivate",
                  label: t("Deactivate"),
                  icon: <Power className="size-3.5" />,
                  destructive: true,
                  onSelect: () => void setActive(v, false),
                }
              : {
                  key: "activate",
                  label: t("Activate"),
                  icon: <Power className="size-3.5" />,
                  onSelect: () => void setActive(v, true),
                },
          ]
        : []),
    ]
  }

  // THE ACTIONS COLUMN'S CELLS, ZIPPED ONTO `shapeChoicesTable`'s OWN ROWS BY
  // INDEX — see this file's header. `rows` and `data.rows` are the same
  // `.map`, in the same order, over the same array, so `rows[i]` is always
  // the raw value `data.rows[i]` was shaped from.
  const tableRows = (data.rows ?? []).map((row, i) => ({
    ...row,
    actions: <RecordActionsMenu tone="row" actions={valueActions(rows[i])} />,
  }))

  // THE MODULE COLUMN — DROPPED UNDER `scope`. See this file's header: a
  // scoped mounting narrows `modulesWithChoices` to exactly one page, whose
  // own tab strip already names it, so the column would say the same word on
  // every row.
  const columns: TableColumn[] = [
    { key: "value", label: t("Value"), sort: "value", searchKey: "valueText", sortKey: (r) => r.valueText },
    ...(scope
      ? []
      : [
          {
            key: "module",
            label: t("Module"),
            sort: "module",
            searchKey: "moduleText",
            sortKey: (r) => r.moduleText,
            defaultDir: "asc",
          } satisfies TableColumn,
        ]),
    // THE DETAILS COLUMN — client ruling, 16 Sep 2026 evening: "add … an
    // in-between column with details or info or whatever, and include this
    // from each case." `shapeChoicesTable` (deep-link/shape.tsx) is what
    // decides what a row's own type carries; this column only draws the
    // cell it already built. No `sort`/`searchKey` — the same shape the
    // `actions` column below takes, and for the same reason: the cell is a
    // decoration (an icon, a dot, a duration), never a fact this table
    // orders or searches by. R82: value + module + details + status +
    // actions is five columns, one under the six-column ceiling.
    { key: "details", label: t("Details") },
    {
      key: "status",
      label: t("Status"),
      sort: "status",
      searchKey: "statusText",
      sortKey: (r) => r.statusText,
      defaultDir: "asc",
    },
    // NO `label`/`sort` — an actions column is a control, never a fact to
    // order the table by (the same shape `record-table.tsx`'s OWN built-in
    // `actions` slot draws, used instead of that slot because its fixed
    // labels cannot say "Activate" on one row and "Deactivate" on the next —
    // see this file's header).
    { key: "actions", label: "" },
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
    // SCOPED WORDING MATCHES `SelectableScreen`'s OWN, the editor this
    // mounting replaces — "values" is what a reader who came from a
    // module's own settings page was already calling them.
    searchPlaceholder: scope ? t("Search values…") : t("Search choices…"),
    emptyText: scope ? t("No values yet.") : t("No choices match what you're looking for."),
    userFilter: true,
    filterFacets: [
      // THE MODULE FACET — DROPPED UNDER `scope`, same reason as the column
      // above: filtering by module on a page that already IS one module.
      ...(scope
        ? []
        : [
            {
              field: "moduleSegment",
              label: t("Module"),
              control: "select" as const,
              options: modulesWithChoices.map(({ page }) => ({ value: page.segment, label: t(page.title) })),
            },
          ]),
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

  // THE DIALOG'S FIRST STEP — see this file's header. A `scope` resolves
  // `moduleOptions` to exactly one entry (the filter above guarantees it),
  // so the module is handed to the dialog as `types` — its free-text,
  // module-already-known shape — rather than `modules`, which would ask a
  // question with one answer.
  const scopedModule = scope ? moduleOptions[0] : undefined

  return (
    <>
      <CollectionCreateActionProvider
        action={
          canCreate
            ? {
                label: scope ? t("New value") : t("New choice"),
                icon: <Plus className="size-4" />,
                onCreate: () => setAddOpen(true),
                ...(scope?.onImport ? { secondary: { label: t("Import CSV"), onClick: scope.onImport } } : {}),
              }
            : null
        }
      >
        <RecordTable columns={columns} rows={tableRows} config={config} useKitPanel />
        {canCreate && (
          <SelectableFormDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            {...(scopedModule ? { types: scopedModule.types } : { modules: moduleOptions })}
            onSubmit={addValue}
            draftKey={`selectable-add:${teamId}:${scope?.segment ?? "choices"}`}
          />
        )}
      </CollectionCreateActionProvider>
      <RenameValueDialog
        target={renaming}
        onOpenChange={(open) => !open && setRenaming(null)}
        onSubmit={async (id, value, mark) => {
          const { values: next } = await tenancy.updateSelectable(id, value, mark)
          primeCache(`selectable:${teamId}`, next)
          setRenaming(null)
          toast.success(t("Renamed."))
        }}
      />
      {deactivateDialog}
    </>
  )
}
