"use client"

// THE AGENCY'S OWN HOUSEKEEPING, as screens — the two list pages behind the
// Brand library and (until 15 Sep 2026) the standalone Meeting purposes
// screen, plus (since 15 Sep 2026) the meeting-types CHOICES adapter that
// replaced its nav entry.
//
// Its own file, so the deep-link collection switch stays a switch — the same
// reason processes-screen.tsx exists. Everything below is the standard
// arrangement said twice rather than abstracted into one loop, and that is
// deliberate: R16 (ii) requires each collection to render a
// `<CollectionHeading sectionKey="…">` naming its own section, so a generic
// component parameterised by key would satisfy nobody reading it and nothing
// checking it. Two short, obvious blocks beat one clever one.
//
// ── MEETING TYPES, AS A CHOICE — TASK C, 15 SEP 2026 ─────────────────────────
//
// The client's ruling: *"For meetings, purpose is a choice component, so make
// sure you move it inside meetings, settings, choices. And maybe you find
// another word for 'purposes.' … Maybe just 'type.' I don't know, you
// choose."* "Meeting type" is the word (glossary.ts's own `meetingType` entry
// carries the reasoning); DB table/column names and API paths stay
// `meeting_purposes` / `/api/content/delivery/purposes` — no migration.
//
// `MeetingTypesPanel` below, mounted from `module-settings-screen.tsx`'s
// `meetings` page, is the "smallest adapter" the task asks for rather than a
// reuse of `SettingsChoicesPanel`: that editor is hard-wired to
// `selectable_data`'s `SelectableValue` shape (a door, a cache key, a create
// signature of `type`/`value`/`mark`), and `meeting_purposes` is a DIFFERENT
// table with a different shape — `shared/types.ts`'s own `MeetingPurpose`
// header says why: *"the one legacy lookup that could not become a dropdown
// value, because it carries a department."* Reusing that editor would mean
// forging a fake `selectable_data` row for a table it never reads. What IS
// reused is the DESIGN — a `RecordTable` (no emoji, no hand-rolled toggle,
// one filled create circle) and the SAME live cache key the rest of the app
// already reads (`purposesKey`, `web/lib/live-resources.ts`) — so a row added
// here is the identical live patch the meeting form's own picker and the
// (now unreachable from nav) standalone screen both see, R56 unbroken.

import * as React from "react"

import {
  ScreenRenderer,
  type ScreenActionContext,
  type ScreenIntent,
} from "@shared/web/screen-engine/screen-renderer"
import type { ScreenRecipe, ScreenRights } from "@shared/web/screen-engine/recipe"

import { Badge } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"
import { Input } from "@shared/ui/components/input/input"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { toast } from "@shared/ui/components/sonner/sonner"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import { DialogDescription, DialogTitle } from "@shared/ui/components/dialog/dialog"
import { Plus } from "@shared/ui/foundations/icons"
import { Icon } from "@shared/web/screen-engine/icon"
import { REF_LEADS_NAME } from "@shared/web/record-ref"
import { Field } from "@shared/web/field"
import { FormShellDialog, fieldSpacing } from "@shared/web/form-shell"
import { defaultFieldConfig, defaultCollectionConfig, type CollectionConfig } from "@shared/web/screen-engine/config"
import { useFormDraft } from "@shared/web/use-form-draft"
import { useConfirm } from "@shared/web/use-confirm"
import { primeCache, useCached } from "@shared/web/store"

import { CollectionHeading } from "@/components/records/collection-heading"
import { ModuleSettingsGear } from "@/components/screens/module-settings-screen"
// THE SAME STATUS→DOT DERIVATION CHOICES NOW USES (coordinator's own
// ruling, 15 Sep 2026, moved from a filled pill to a dot by the client's own
// ruling, 17 Sep 2026: "Dots like everywhere else.") — imported rather than
// copied a third time, the same reasoning `deep-link/shape.tsx`'s own
// `shapeChoicesTable` carries.
import { AUTOMATION_STATUS_DOT } from "@/components/screens/automation-edit-sheet"
import { SectionWithCreate } from "@/components/deep-link/screen-bits"
import { shapeBrandList, shapePurposesList } from "@/components/deep-link/shape"
import { RecordTable, type TableColumn } from "@/components/records/record-table"
import { CollectionCreateActionProvider } from "@shared/web/screen-engine/collection-frame"
import { withDataDrivenCollection } from "@/lib/screens"
import { purposesKey } from "@/lib/live-resources"
import { ApiFailure, content as contentApi, tenancy } from "@/lib/api"
import type { Can } from "@/lib/perms"
import type { BrandAsset, MeetingPurpose, SelectableValue } from "@shared/types"
import { useT } from "@shared/web/language"

/** Everything one of these screens needs from the host. The same bundle twice,
 * because they are the same screen twice. */
type InternalScreenProps<T> = {
  rows: T[]
  recipe: ScreenRecipe
  rights: ScreenRights
  total: number | undefined
  canCreate: boolean
  /** where the create button's `?panel=add` lands (the current section path). */
  onCreate: () => void
  /** the contextual "Import CSV" jump, when the caller may import. */
  onImport?: () => void
  /** the full-field CSV export door — export needs READ, which seeing this
   * screen already implies. */
  exportHref: string
  onAction: (actionId: string, ctx: ScreenActionContext) => void
  onIntent: (intent: ScreenIntent) => void
}

/** The shared body: heading with the exact server count, then the collection
 * with its create / import / export row. Takes already-shaped rows so each
 * caller keeps its own shaper (they read differently and that is the point). */
function InternalCollection({
  createLabel,
  data,
  recipe,
  rights,
  canCreate,
  onCreate,
  onImport,
  exportHref,
  onAction,
  onIntent,
  heading,
}: {
  createLabel: string
  data: ReturnType<typeof shapeBrandList>
  heading: React.ReactNode
} & Omit<InternalScreenProps<never>, "rows" | "total">) {
  const t = useT()
  const tuned = withDataDrivenCollection(recipe, data.rows ?? [])
  return (
    <div className="flex flex-col gap-6">
      {heading}
      <SectionWithCreate
        show={canCreate}
        label={createLabel}
        icon="plus"
        secondary={onImport ? { show: canCreate, label: t("Import CSV"), onClick: onImport } : undefined}
        download={{ show: (data.rows?.length ?? 0) > 0, label: t("Export CSV"), href: exportHref }}
        // R50 — nothing at all in the toolbar over a collection with no rows in
        // it, import included. The act is still published to the empty body
        // below (`CollectionEmptyState`'s "Import a list"), which is where a
        // brand-new team should meet it; this only stops the same button being
        // drawn twice on the one screen that has nothing else on it.
        empty={(data.rows?.length ?? 0) === 0}
        onCreate={onCreate}
        useKitPanel
      >
        <ScreenRenderer
          recipe={tuned}
          data={data}
          rights={rights}
          onAction={onAction}
          onIntent={onIntent}
          useKitPanel
        />
      </SectionWithCreate>
    </div>
  )
}

/** THE BRAND LIBRARY, and the one of the two that has settings.
 *
 * `teamId` IS ITS OWN PROP RATHER THAN A FIELD ON `InternalScreenProps`, because
 * the bundle above is "the same screen twice" and this is the half where the two
 * stop being the same: a brand asset's CATEGORY is stored on
 * `brand_assets.category` (`shared/selectable-homes.ts`), so this module owns a
 * vocabulary and Meeting types does not. Putting the prop on the shared type
 * would hand `PurposesScreen` a value it has nothing to do with. */
export function BrandLibraryScreen(
  props: InternalScreenProps<BrandAsset> & { teamId: string | null }
) {
  const { rows, teamId, ...rest } = props
  return (
    <InternalCollection
      {...rest}
      createLabel="New asset"
      data={shapeBrandList(rows)}
      heading={
        /* THE MODULE'S OWN DOOR INTO ITS SETTINGS (R61) — the categories the
           library is shelved by. In the heading's `action` slot and never the
           toolbar: `SectionWithCreate` below draws nothing at all over an empty
           collection (R50), which is exactly when the shelves matter. */
        /* ONE LINE, and R16's own census is why: it looks for the literal
           `<CollectionHeading sectionKey="brand"` to prove this collection
           names itself, and a prettier break after the tag makes that substring
           vanish while the screen renders identically. */
        <CollectionHeading sectionKey="brand" total={props.total} action={<ModuleSettingsGear teamId={teamId} segment="brand" />} />
      }
    />
  )
}

export function PurposesScreen(props: InternalScreenProps<MeetingPurpose>) {
  const { rows, ...rest } = props
  return (
    <InternalCollection
      {...rest}
      createLabel="New meeting type"
      data={shapePurposesList(rows)}
      heading={<CollectionHeading sectionKey="purposes" total={props.total} />}
    />
  )
}

const meetingTypeNameField = { ...defaultFieldConfig, label: "Name", required: true }
const meetingTypeDepartmentField = { ...defaultFieldConfig, label: "Department", required: false }

/** The create form for one meeting type — value + department, the task's own
 * words. Modelled on `SelectableFormDialog`'s free-text shape (a pick-or-create
 * datalist over the existing "Department" group) rather than reusing that
 * component outright: this dialog's submit signature is `(name, department)`
 * against `meeting_purposes`, not `(type, value, mark)` against
 * `selectable_data`, and forcing one shape to pretend to be the other is
 * exactly the kind of second-guessed abstraction CLAUDE.md's "smallest shape"
 * rule warns against. */
function MeetingTypeFormDialog({
  open,
  onOpenChange,
  departments,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Existing "Department" values (active, current team), offered as a
   * pick-or-create datalist. */
  departments: string[]
  onSubmit: (name: string, department: string) => Promise<void>
}) {
  const t = useT()
  const [values, setValues, clearDraft] = useFormDraft(
    "meeting-type-add",
    { name: "", department: "" },
    open
  )
  const [busy, setBusy] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.name.trim()) return
    setBusy(true)
    try {
      await onSubmit(values.name.trim(), values.department.trim())
      clearDraft()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't add that meeting type."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <FormShellDialog
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      onSubmit={submit}
      title={<DialogTitle>{t("New meeting type")}</DialogTitle>}
      subtitle={
        <DialogDescription>
          {t("What a meeting is about, and the department it belongs to.")}
        </DialogDescription>
      }
      submit={{ busy, disabled: !values.name.trim(), icon: <Plus className="size-4" /> }}
    >
      <Field config={meetingTypeNameField} htmlFor="meeting-type-name" className={fieldSpacing}>
        <Input
          id="meeting-type-name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder={t("e.g. Kickoff")}
          disabled={busy}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
      </Field>
      <Field config={meetingTypeDepartmentField} htmlFor="meeting-type-department" className={fieldSpacing}>
        <Input
          id="meeting-type-department"
          list="meeting-type-departments"
          value={values.department}
          onChange={(e) => setValues((v) => ({ ...v, department: e.target.value }))}
          placeholder={t("e.g. Production")}
          disabled={busy}
        />
        <datalist id="meeting-type-departments">
          {departments.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      </Field>
    </FormShellDialog>
  )
}

/** THE MEETING-TYPES CHOICES EDITOR — see this file's header, "MEETING TYPES,
 * AS A CHOICE". Mounted once, from `module-settings-screen.tsx`'s `meetings`
 * page's `choices` section. Self-contained like `SettingsChoicesPanel` (reads
 * its own data, gates its own create act) rather than threading rows down
 * from a host, because there is exactly one caller and the alternative is a
 * prop for every field this component already knows how to fetch. */
export function MeetingTypesPanel({
  teamId,
  can,
  onImport,
}: {
  teamId: string
  can: Can
  /** THE IMPORT DOOR, THIS PAGE'S OWN — `meeting_purposes` has a real CSV
   * import target (`workers/data-ops/src/lib/targets.ts`), the client's
   * ruling applies here too ("each module's settings page gets its own
   * import and export for its own groups"), and the caller (module-settings-
   * screen.tsx) is what knows the wizard's address. Drawn on the
   * GENUINELY-empty body only (`CollectionCreateAction.secondary`, the same
   * seam `SettingsChoicesPanel`'s own `scope.onImport` reaches — see that
   * file's header for why Export CSV does not have an equivalent slot). */
  onImport?: () => void
}) {
  const t = useT()
  const [addOpen, setAddOpen] = React.useState(false)

  // THE SAME KEY EVERY OTHER READER OF THIS TABLE OPENS (R56) — the meeting
  // form's own picker, and the (now unreachable from nav, still live if
  // visited directly) standalone screen above.
  const purposesQ = useCached<MeetingPurpose[]>(purposesKey(teamId), () =>
    contentApi.meetingPurposes().then((r) => r.purposes)
  )
  // THE "Department" GROUP, off the SAME `selectable:<teamId>` cache key
  // every other Department picker in the app already opens
  // (`use-screen-data.ts`'s own `departmentOptions`) — never a second fetch
  // for one group.
  const selectableQ = useCached<SelectableValue[]>(`selectable:${teamId}`, () =>
    tenancy.selectable().then((r) => r.values)
  )
  const departments = (selectableQ.data ?? [])
    .filter((v) => v.type === "Department" && v.active)
    .map((v) => v.value)
    .sort()

  const canCreate = can("delivery", "create")

  // Deactivating is the red half (same shape as Choices' own `setActive`);
  // reactivating is confirm-free.
  const { ask: askDeactivate, run: runActive, dialog: deactivateDialog } = useConfirm()

  if (purposesQ.error)
    return (
      <ShapeStateBody
        shape="recordChrome"
        state="error"
        copy={{ errorTitle: t("Couldn't load the meeting types.") }}
        action={
          <Button variant="secondary" onClick={() => purposesQ.refresh()}>
            {t("Try again")}
          </Button>
        }
      />
    )
  if (purposesQ.data === undefined) return <Skeleton variant="list" lines={4} />

  function setActive(p: MeetingPurpose, next: boolean) {
    if (!next) {
      askDeactivate({
        title: t('Deactivate "{name}"?', { name: p.name }),
        body: t("It drops out of the meeting form's picker. Meetings already using it keep it, and you can turn it back on any time."),
        action: t("Deactivate"),
        run: () =>
          runActive(
            () =>
              contentApi
                .setMeetingPurposeActive(p.id, false)
                .then(({ purposes: list }) => primeCache(purposesKey(teamId), list)),
            t('Deactivated "{name}".', { name: p.name }),
            t("Couldn't update that meeting type.")
          ),
      })
      return
    }
    void runActive(
      () =>
        contentApi
          .setMeetingPurposeActive(p.id, true)
          .then(({ purposes: list }) => primeCache(purposesKey(teamId), list)),
      t('Activated "{name}".', { name: p.name }),
      t("Couldn't update that meeting type.")
    )
  }

  // THE STATUS CHIP IS THE TOGGLE, the same idiom `ValueChip` used on the old
  // Choices screen: a two-way status (no "protected" concept on a meeting
  // type — `MeetingPurpose` carries no `isDefault`), coloured through the
  // SAME `AUTOMATION_STATUS_DOT` map Choices now uses (coordinator ruling,
  // 15 Sep 2026: "same word → same colour, both palettes"; moved from a
  // fill to a dot by the client's 17 Sep 2026 ruling, "Dots like everywhere
  // else").
  const rows = purposesQ.data.map((p) => {
    const statusWord = p.active ? t("Active") : t("Inactive")
    return {
      id: p.id,
      // THE TYPE'S OWN ICON, beside the name — same idiom as `shapeChoicesTable`'s
      // value cell (deep-link/shape.tsx): an `Icon` when the row carries one,
      // the bare word otherwise. `nameText` rides beside it for search/sort,
      // the same shape the `status` column below already takes.
      name: p.icon ? (
        <span className={REF_LEADS_NAME}>
          <Icon name={p.icon} className="text-muted-foreground size-4 shrink-0" />
          <span className="min-w-0 truncate">{p.name}</span>
        </span>
      ) : (
        p.name
      ),
      nameText: p.name,
      department: p.department ?? "",
      status: (
        <button
          type="button"
          className="cursor-pointer"
          onClick={() => setActive(p, !p.active)}
          aria-label={`${p.name}, ${statusWord}`}
        >
          <Badge variant="status" dot={AUTOMATION_STATUS_DOT[p.active ? "on" : "off"]}>
            {statusWord}
          </Badge>
        </button>
      ),
      statusText: statusWord,
      // THE FACET'S OWN PLAIN FIELD (`shapeChoicesTable`'s own pattern,
      // deep-link/shape.tsx) — a stable key rather than the translated
      // display word, so a filter still matches after a language switch.
      statusState: p.active ? "active" : "inactive",
    }
  })

  const columns: TableColumn[] = [
    { key: "name", label: t("Name"), sort: "name", searchKey: "nameText", sortKey: (r) => r.nameText },
    { key: "department", label: t("Department"), sort: "department" },
    { key: "status", label: t("Status"), sort: "status", searchKey: "statusText", sortKey: (r) => r.statusText, defaultDir: "asc" },
  ]

  async function addValue(name: string, department: string) {
    const { purposes: next } = await contentApi.createMeetingPurpose({
      name,
      department: department || null,
    })
    primeCache(purposesKey(teamId), next)
    toast.success(t('Added "{name}".', { name }))
  }

  const config: CollectionConfig = {
    ...defaultCollectionConfig,
    searchPlaceholder: t("Search meeting types…"),
    emptyText: t("No meeting types yet."),
    userFilter: true,
    filterFacets: [
      {
        field: "statusState",
        label: t("Status"),
        control: "select",
        options: [
          { value: "active", label: t("Active") },
          { value: "inactive", label: t("Inactive") },
        ],
      },
    ],
    // THE TABLE'S OWN HEADERS ARE THE SORT CONTROL — same reasoning as
    // `SettingsChoicesPanel`'s identical line.
    sortable: false,
    sortOptions: [],
  }

  return (
    <>
      <CollectionCreateActionProvider
        action={
          canCreate
            ? {
                label: t("New meeting type"),
                icon: <Plus className="size-4" />,
                onCreate: () => setAddOpen(true),
                ...(onImport ? { secondary: { label: t("Import CSV"), onClick: onImport } } : {}),
              }
            : null
        }
      >
        <RecordTable columns={columns} rows={rows} config={config} useKitPanel />
        {canCreate && (
          <MeetingTypeFormDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            departments={departments}
            onSubmit={addValue}
          />
        )}
      </CollectionCreateActionProvider>
      {deactivateDialog}
    </>
  )
}
