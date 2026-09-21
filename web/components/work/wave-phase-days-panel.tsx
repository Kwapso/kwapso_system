"use client"

// WAVE PHASE-DAYS SETTINGS, how many days each phase type gets on this wave.
// Aurora's ruling, 20 Sep 2026, verbatim: "on waves i am missing the settings
// (we'l adjust the duration of pahses in days)." Seven rows, one per
// `PHASE_TYPES` name (shared/sprint-types.ts, the Wave-lifecycle order: Audit,
// Plan, Build, Pilot, Revision, Deploy, Hypercare), each drawing that type's
// own icon and a number-of-days field, with Save and Cancel underneath.
//
// WORKING DAYS, NEVER CALENDAR ONES. Her very next ruling, 21 Sep 2026,
// verbatim: "mind you, all of this is Monday to Friday, so when I say 5,
// it's actually a full week, but I, of course, don't count the weekends."
// The unit beside each field reads "working days" rather than plain "days"
// now, and one line under the seven rows says what that means in full, so
// nobody reads a "5" here and expects a calendar week rather than a working
// one. `shared/working-days.ts` carries the one arithmetic this settles.
//
// READ-ONLY WITHOUT THE WAVE UPDATE RIGHT. `wave-detail.tsx` passes `canEdit`
// down from its own `can("work", "update")`, the same gate its Edit/Switch off
// actions already use; this panel adds no gate of its own, it only draws
// disabled fields and hides the Save/Cancel row when the caller cannot write.
//
// THE WORD FOR EACH TYPE is resolved through the team's own live vocabulary
// (`useSprintTypes`/`sprintTypeName`, sprint-form-dialog.tsx), the same seam
// every other phase/sprint-type label in the app reads, a "curated word
// carried over from the delivery catalogue, not a translation seam" (that
// file's own header), because a team may rename the value on the Dropdown
// values screen. `PHASE_TYPES` itself only supplies the ORDER, the icon and
// the fixed key the days are stored against.
//
// A SLIDE-IN NOW, NOT A SECTION ON THE OVERVIEW TAB. Aurora, on the wave's
// phase days, 21 Sep 2026, verbatim: "missing the settings button in waves to
// adjust that!!!" She could not find this panel sitting under "Expected
// length" on the Overview tab. It now opens from a gear button in the wave
// head's own actions row (`wave-detail.tsx`, beside the "…" overflow trigger,
// the same fold `shared/web/head-actions.tsx` gives every other multi-control
// head), through `WavePhaseDaysSheet` below, the app's own slide-in sheet
// pattern (`web/components/tickets/reply-edit-sheet.tsx`), titled "Settings".
// This component itself draws no Card and no "Settings" heading of its own
// any more: the sheet's own `SheetTitle` says that once, and a second
// "Settings" label directly under it would be the same word twice on one
// screen. What is left here, the seven rows, the explainer line, Save and
// Cancel, is exactly what used to sit inside the Card, now the sheet's own
// scrolling body (`shared/ui/components/sheet/sheet.tsx`'s own rule: a
// `SheetContent` child that carries no `sheet-*` slot of its own already gets
// the drawer's 24px inset and its scroll, so nothing here has to ask for
// either).

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Input } from "@shared/ui/components/input/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@shared/ui/components/sheet/sheet"

import { sprintTypeName, useSprintTypes } from "@/components/work/sprint-form-dialog"
import { SprintTypeGlyph } from "@/lib/sprint-type-icon"
import { PHASE_TYPES } from "@shared/sprint-types"
import type { WavePhaseDay } from "@shared/waves"
import { useLanguage } from "@shared/web/language"

/** The draft, keyed by phase type name, as the seven number inputs hold it,
 * strings, because a field mid-edit ("" or "1" typed toward "15") is not yet
 * a number and should not be forced to be one before Save is pressed. */
type Draft = Record<string, string>

function draftFrom(phaseDays: WavePhaseDay[]): Draft {
  const byType = new Map(phaseDays.map((p) => [p.phaseType, p.days]))
  return Object.fromEntries(PHASE_TYPES.map((p) => [p.name, String(byType.get(p.name) ?? "")]))
}

export function WavePhaseDaysPanel({
  teamId,
  phaseDays,
  canEdit,
  busy,
  onSave,
}: {
  teamId: string
  phaseDays: WavePhaseDay[]
  /** Whoever holds the wave update right, `wave-detail.tsx`'s own `canEdit`. */
  canEdit: boolean
  busy: boolean
  onSave: (rows: { phaseType: string; days: number }[]) => Promise<void>
}) {
  const { t, lang } = useLanguage()
  const sprintTypes = useSprintTypes(teamId)
  const byType = new Map(phaseDays.map((p) => [p.phaseType, p.days]))

  const nameFor = (phaseType: string): string => {
    const option = sprintTypes.find((o) => o.value === phaseType)
    return option ? sprintTypeName(option, lang) : phaseType
  }

  const [draft, setDraft] = React.useState<Draft>(() => draftFrom(phaseDays))

  // A fresh read (the save landed, or another tab changed it) replaces the
  // draft with what the wave now answers with, the same "server truth wins"
  // every other record form on this screen already takes.
  React.useEffect(() => {
    setDraft(draftFrom(phaseDays))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseDays])

  const dirty = PHASE_TYPES.some((p) => String(byType.get(p.name) ?? "") !== (draft[p.name] ?? ""))

  const cancel = () => setDraft(draftFrom(phaseDays))

  const save = async () => {
    const changed = PHASE_TYPES.map((p) => ({ phaseType: p.name, days: Number(draft[p.name]) })).filter(
      (row) => Number.isFinite(row.days) && row.days !== byType.get(row.phaseType)
    )
    if (changed.length === 0) return
    await onSave(changed)
  }

  return (
    <div data-slot="wave-phase-days-panel" className="flex flex-col gap-4">
      <ul className="divide-border divide-y">
        {PHASE_TYPES.map((p) => (
          <li key={p.name} className="flex items-center justify-between gap-3 py-2">
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <SprintTypeGlyph type={p.name} className="text-muted-foreground shrink-0" />
              <span className="truncate">{nameFor(p.name)}</span>
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <Input
                type="number"
                min={1}
                max={365}
                inputMode="numeric"
                value={draft[p.name] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [p.name]: e.target.value }))}
                disabled={busy || !canEdit}
                className="w-20"
                aria-label={nameFor(p.name)}
              />
              <span className="text-muted-foreground text-sm">{t("working days")}</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-caption">
        {t("Monday to Friday, weekends are not counted")}
      </p>
      {canEdit && (
        // R98 — a form foot's buttons are the kit's default height, never `sm`.
        <div className="flex justify-end gap-2">
          <Button variant="ghost" disabled={busy || !dirty} onClick={cancel}>
            {t("Cancel")}
          </Button>
          <Button variant="inverse" disabled={busy || !dirty} onClick={() => void save()}>
            {t("Save")}
          </Button>
        </div>
      )}
    </div>
  )
}

/** THE SLIDE-IN ITSELF. The gear button's own door (`wave-detail.tsx`'s head
 * actions row) opens this, never the panel above directly. Same wrapper shape
 * `reply-edit-sheet.tsx` draws (`Sheet`/`SheetContent`, `side="right"`, the
 * kit's own drawer), simplified because this panel keeps its own Save/Cancel
 * row rather than a `<form>` submit: there is no second footer to reconcile
 * against the panel's own, and `FormShellDialog`'s single-submit-button shape
 * would have forced exactly that collision. `SheetHeader`/`SheetTitle` are the
 * ONLY thing this wrapper draws; the panel supplies everything under it. */
export function WavePhaseDaysSheet({
  open,
  onOpenChange,
  teamId,
  phaseDays,
  canEdit,
  busy,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  phaseDays: WavePhaseDay[]
  canEdit: boolean
  busy: boolean
  onSave: (rows: { phaseType: string; days: number }[]) => Promise<void>
}) {
  const t = useLanguage().t
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        // A save in flight is not dismissable — the same rule
        // `FormShellDialog`'s own `close()` enforces (form-shell.tsx).
        if (busy) return
        onOpenChange(o)
      }}
    >
      <SheetContent side="right" className="w-[clamp(26.25rem,34vw,40rem)] max-w-[min(100%,40rem)]">
        <SheetHeader>
          <SheetTitle>{t("Settings")}</SheetTitle>
        </SheetHeader>
        <div>
          <WavePhaseDaysPanel teamId={teamId} phaseDays={phaseDays} canEdit={canEdit} busy={busy} onSave={onSave} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
