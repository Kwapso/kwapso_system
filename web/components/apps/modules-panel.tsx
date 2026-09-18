"use client"

// THE SECTIONS OF AN APP (Aurora, 19 Aug 2026: "please implement MODULES under
// apps, so i can group all the tickets I am creating in an organized way").
//
// WHAT A MODULE IS, and it is not a process. An APP has modules — the parts the
// software is divided into, Settings, Documents, Tasks — and a ticket names the
// one it is about, which is what makes a pile of tickets a list somebody can
// read. An ACCOUNT has processes, which are ways of WORKING and carry the times
// every saving is subtracted from. Two trees, meeting only on the app, and the
// reason both exist is that "which screen is broken" and "how does this job get
// done" are different questions.
//
// A GALLERY NOW, NOT ROWS — the client's ruling, 17 Sep 2026, verbatim:
// "Inside an app, the tabs module: I want it to look exactly like the
// settings modules, this kind of gallery with the icons. When I add a
// module, I should be able to select an icon for it." This used to read "ROWS
// AND NOT CARDS" (K9 — a card grid needs a picture, and a module had none):
// it has one now, the module's own `icon` (an new field, team migration
// 0104), and the SAME `GalleryCard` (web/components/records/gallery-card.tsx)
// Settings › Modules renders — one component, not a second hand-copy of that
// wall's JSX. The icon picker is `IconPicker`
// (web/components/records/icon-picker.tsx), reused by the add/edit form's own
// `moduleFields()` (internal-record-dialog.tsx).
//
// IT ASKS FOR EVERY MODULE, NOT THIS APP'S. One read, one cache key, filtered
// here: the ticket form needs whichever app was just chosen and re-fetching on
// every change of a dropdown is a spinner where a list should be. It is a
// bounded read either way (APP_MODULE_CAP), and holding it whole is what lets a
// rename reach this list, the ticket form and the ticket filter at once through
// the ordinary row-level live path (R15).
//
// THE DOOR GATES; THIS ONLY DECIDES WHAT TO DRAW. Add and edit sit behind
// `processes:create` / `:update` and switching one off behind `:delete` — the same
// rights that let somebody record the app itself, because a section of a system
// is part of the record of that system.
//
// THE NAME FIELD CAPS AT TITLE_MAX_CHARS (R87, 18 Sep 2026) — a module's name
// draws in the same one-line gallery card title every other title clamps to,
// so `moduleFields()`'s "Name" (web/components/team/internal-record-dialog.tsx,
// the shared form both the add and edit dialogs below render through) carries
// `titleCap: true`, which wires the live counter and the input's own
// `maxLength`; the door refuses the same 50 positionally
// (`workers/tenancy/src/routes/processes.ts`'s `postCreateAppModule` /
// `postUpdateAppModule`). This panel itself renders neither the field nor the
// door, so nothing here changed — the cap is a property of the RECORD, not of
// this particular screen onto it.

import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@shared/ui/components/alert-dialog/alert-dialog"
import { Badge } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"
import { CardGrid } from "@shared/ui/components/card-grid/card-grid"
import { SearchInput } from "@shared/ui/components/search-input/search-input"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { toast } from "@shared/ui/components/sonner/sonner"
import { Power } from "@shared/ui/foundations/icons"
import { EditPenButton } from "@shared/web/edit-pen-button"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"

import { AddButton, CollectionCard, ToolbarRow } from "@/components/deep-link/screen-bits"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import { GalleryCard } from "@/components/records/gallery-card"
import { InternalRecordDialog, moduleFields, type InternalRecordValues } from "@/components/team/internal-record-dialog"
import { ApiFailure, tenancy } from "@/lib/api"
import { appModulesKey, totalKey } from "@/lib/live-resources"
import { usePermissions } from "@/lib/perms"
import type { AppModule } from "@shared/types"
import { DEFAULT_MODULE_ICON } from "@shared/module-icons"
import { useT } from "@shared/web/language"
import { primeCache, useCached } from "@shared/web/store"

// SAME FLOOR AS SETTINGS › MODULES (settings-screen.tsx's own `MIN_MODULE_CARD`)
// — this cell carries the identical content (an icon, a title, an actions
// row), so it needs the identical room. Each gallery wall in this app keeps
// its own copy of this constant (members-gallery.tsx's `MIN_CARD` is the same
// pattern, a different number for a different cell) rather than importing one
// screen's local constant into another module's component.
const MIN_MODULE_CARD = "16rem"

export function ModulesPanel({ teamId, appId }: { teamId: string; appId: string }) {
  const t = useT()
  const q = useCached<AppModule[]>(appModulesKey(teamId), () =>
    tenancy.appModules().then((r) => r.modules)
  )

  const { can } = usePermissions(teamId)
  const canCreate = can("processes", "create")
  const canEdit = can("processes", "update")
  const canSwitchOff = can("processes", "delete")

  const [addOpen, setAddOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<AppModule | null>(null)
  const [switching, setSwitching] = React.useState<AppModule | null>(null)
  const [query, setQuery] = React.useState("")
  // No status filter here — the door already excludes an archived module (the
  // comment above), so every row in `modules` is active and a filter that can
  // never show a second value would be a control with nothing to control.
  const [sort, setSort] = React.useState<{ by: "name" | "ticketCount"; dir: "asc" | "desc" }>({
    by: "name",
    dir: "asc",
  })

  // THIS APP'S, out of the team's. Archived ones are excluded by the door, so
  // what is here is what a ticket can still be filed against.
  const modules = React.useMemo(
    () => (q.data ?? []).filter((m) => m.appId === appId),
    [q.data, appId]
  )

  const shownModules = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    const dirMul = sort.dir === "desc" ? -1 : 1
    return modules
      .filter(
        (m) =>
          needle === "" ||
          m.name.toLowerCase().includes(needle) ||
          (m.description ?? "").toLowerCase().includes(needle)
      )
      .sort((a, b) =>
        sort.by === "ticketCount"
          ? (a.ticketCount - b.ticketCount) * dirMul
          : a.name.localeCompare(b.name) * dirMul
      )
  }, [modules, query, sort])

  // THE TAB BADGE, primed from the read this panel already makes (R16). It is an
  // exact number rather than a page length, because the read is bounded and
  // whole: there is no page two to be missing from it.
  React.useEffect(() => {
    if (q.data) primeCache(totalKey("modules-app", appId), modules.length)
  }, [q.data, modules.length, appId])

  async function save(values: InternalRecordValues, id?: string): Promise<void> {
    const input = {
      name: String(values.name ?? "").trim(),
      mark: String(values.mark ?? "").trim(),
      // THE GALLERY CARD'S OWN ICON — an empty picker value is "nothing chosen
      // yet" (draws DEFAULT_MODULE_ICON on the card) rather than a name to send;
      // the door treats "" identically to omitting the field.
      icon: String(values.icon ?? "").trim(),
      nameDe: String(values.nameDe ?? "").trim(),
      description: String(values.description ?? "").trim(),
      benefit: String(values.benefit ?? "").trim(),
    }
    if (id) await tenancy.updateAppModule({ id, ...input })
    else await tenancy.createAppModule({ appId, ...input })
  }

  // A FAILED READ SAYS SO. Without this, the rows fall back to `[]` and the
  // empty state renders as if the app genuinely had no modules — inviting a
  // duplicate create on top of whatever is actually there once the fetch
  // recovers (client-org-panel.tsx carries the same guard).
  if (q.error)
    return (
      <ShapeStateBody
        shape="recordChrome"
        state="error"
        copy={{ errorTitle: t("That didn't load. Refresh the page, and tell us if it keeps happening.") }}
        action={
          <Button variant="secondary" onClick={() => q.refresh()}>
            {t("Try again")}
          </Button>
        }
      />
    )

  if (q.loading && !q.data)
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-[var(--radius)]" />
        ))}
      </div>
    )

  return (
    <>
      {/* THE NESTED CARD — client, 17 Sep 2026, over the app's Tickets tab,
          the same "wall of cards on the page" shape this gallery draws:
          "there is still the space between the point and the type missing,
          and also they are missing the background card." The record's own
          outer chrome already stands on one shared card (see
          `work-panels.tsx`'s `PagedPanelBody` and `deliverables-panel.tsx`
          for the full citation); a collection nested in a tab needs its OWN,
          the way `SprintsPanel`/`AppsPanel` already draw theirs
          (`CollectionFrame useKitPanel`). The dialogs below stay OUTSIDE
          this card — an overlay portals off the page ground rather than
          standing on any card (R67's own ACT/overlay reasoning). */}
      <CollectionCard>
      <ToolbarRow
        empty={modules.length === 0}
        search={
          modules.length > 0 && (
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search modules…")}
              className="flex-1"
              aria-label={t("Search modules")}
            />
          )
        }
        // OUT OF `search` AND INTO ITS OWN SLOT (R53, 2026-09-06) — see
        // screen-bits.tsx's `ToolbarSortSlot` for the client ruling behind the
        // move. The control was drawn inside the row's one GROWING box beside
        // the search field; the row builds it in its own non-growing box now,
        // in the same place on every collection toolbar in the app.
        sort={
          modules.length > 0 && {
            options: [
              { value: "name", label: t("Name") },
              { value: "ticketCount", label: t("Open tickets") },
            ],
            value: sort.by,
            onValueChange: (by: string) => setSort({ by: by as typeof sort.by, dir: "asc" }),
            direction: sort.dir,
            onDirectionChange: (dir: "asc" | "desc") => setSort((s) => ({ ...s, dir })),
          }
        }
        actions={canCreate && <AddButton onClick={() => setAddOpen(true)} label={t("Add module")} />}
      />

      {/* R62 — ONE REGISTER, BOTH ZEROS. Client, 2026-09-09: "the empty
          because of filters hosul look the same as empty collection but the add
          button." This was a three-way chain drawing the full register at rest
          and a bare grey line when the search narrowed it to nothing; it is one
          call now, and `filtered` withdraws the create action itself.
          No `app_modules` import target — a module names a section of a system
          somebody already knows, not a list somebody holds in a spreadsheet. */}
      {shownModules.length === 0 ? (
        <CollectionEmptyState
          filtered={modules.length > 0}
          title={t("No modules yet.")}
          description={t("Add the sections this app is divided into, so tickets can say which one they are about.")}
          onCreate={canCreate ? () => setAddOpen(true) : undefined}
        />
      ) : (
        // THE SAME CARD SETTINGS › MODULES RENDERS (`GalleryCard`,
        // web/components/records/gallery-card.tsx) — client's ruling, 17 Sep
        // 2026: "I want it to look exactly like the settings modules, this
        // kind of gallery with the icons." No `href`: a module has no page of
        // its own to open, so edit and switch off live in `actions` instead.
        // The open-ticket count is `topBadge`, in the SAME wrapper `<span>`
        // as the title (R65/R72 — see the component's own header for why that
        // structurally can never read as a subtitle).
        <CardGrid fluid minItemWidth={MIN_MODULE_CARD} label={t("Modules")}>
          {shownModules.map((m) => (
            <GalleryCard
              key={m.id}
              icon={m.icon ?? DEFAULT_MODULE_ICON}
              title={m.name}
              topBadge={
                m.ticketCount > 0 ? (
                  <Badge variant="secondary">
                    {m.ticketCount} {m.ticketCount === 1 ? t("open ticket") : t("open tickets")}
                  </Badge>
                ) : undefined
              }
              actions={
                <div className="flex items-center gap-1">
                  {/* ICON-ONLY, on every width now (client ruling, 2026-08-31:
                      "edit, only the pencil icon") — no more `sm:not-sr-only`
                      reveal. */}
                  {canEdit ? <EditPenButton onClick={() => setEditing(m)} label={t("Edit")} /> : null}
                  {canSwitchOff ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSwitching(m)}
                      className="text-destructive"
                      aria-label={t("Switch off")}
                    >
                      <Power className="size-3.5" aria-hidden />
                    </Button>
                  ) : null}
                </div>
              }
            />
          ))}
        </CardGrid>
      )}
      </CollectionCard>

      <InternalRecordDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        fields={moduleFields()}
        title={t("Add a module")}
        subtitle={t("A section of this app, like Settings or Documents. Tickets say which one they are about.")}
        draftKey={`module-new:${appId}`}
        onSubmit={async (values) => {
          await save(values)
          setAddOpen(false)
        }}
      />

      <InternalRecordDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        fields={moduleFields()}
        title={t("Edit this module")}
        subtitle={t("Renaming it updates every ticket filed against it.")}
        initial={
          editing
            ? {
                name: editing.name,
                mark: editing.mark ?? "",
                icon: editing.icon ?? "",
                nameDe: editing.nameDe ?? "",
                description: editing.description ?? "",
                benefit: editing.benefit ?? "",
              }
            : undefined
        }
        draftKey={editing ? `module-edit:${editing.id}` : undefined}
        onSubmit={async (values) => {
          if (editing) await save(values, editing.id)
          setEditing(null)
        }}
      />

      {/* SWITCHING OFF IS NOT DELETING, and the sentence says so — the tickets
          already filed against it keep naming it and still read correctly; it
          simply stops being offered on the form. */}
      <AlertDialog open={switching !== null} onOpenChange={(open) => !open && setSwitching(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Switch off this module?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "It stops being offered when somebody files a ticket. Every ticket already filed against it keeps it, and nothing is deleted."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Keep it")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const target = switching
                setSwitching(null)
                if (!target) return
                try {
                  await tenancy.setAppModuleActive(target.id, false)
                } catch (err) {
                  toast.error(err instanceof ApiFailure ? err.message : t("Couldn't switch that module off."))
                }
              }}
            >
              {t("Switch it off")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
