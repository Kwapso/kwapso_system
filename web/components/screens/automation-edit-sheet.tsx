"use client"

// THE AUTOMATION'S OWN EDITOR — Name, Description, Status. R59's Sheet
// (through `FormShellDialog`/`FormShell`), the same shape every other form
// in the app slides in on, reached from `ModuleAutomations`' table by
// pressing a row (there is no detail SCREEN for an automation to navigate
// to, so the press opens this directly — the same convention Contacts,
// Tasks and Meetings use to reach a record's editor, read onto a row that
// has nowhere else to go).
//
// ── NAME AND DESCRIPTION ARE A TEAM OVERRIDE, STATUS IS NOT ─────────────────
//
// `a.title`/`a.description` are CODE — English, translated at the read. The
// input here shows the RESOLVED word as its PLACEHOLDER (the code default,
// translated) and the STORED OVERRIDE, if any, as its value: an empty field
// therefore means "use the app's own words", the identical "absence is the
// default" discipline the on/off switch already holds one field over
// (`shared/automations.ts`'s header). Saving with both fields blank clears
// any override back to the default rather than storing two empty strings.
//
// Status is not part of that form at all — it is a live `<Switch>` (or, on a
// Protected row, a fact with no control), flipped through the same
// `setAutomation` door and cache-prime `ModuleAutomations` used before this
// redesign, so a second admin watching the table sees it move (R1/R15) and
// the switch stays idempotent (R17: the door's own predicate, unchanged).
//
// ── R70, MOVED HERE ───────────────────────────────────────────────────────
//
// The Protected badge and its reason — and the working `<Switch>` beside a
// switchable row — used to render inline in `module-automations.tsx`'s own
// `<li>`. They render here now, because "the reason moves into the sheet" is
// the redesign's own shape, and R70's law is unchanged by where the two
// guarded branches below live: the mark may never appear without the
// reason, from ONE guard, so no later edit can leave the badge standing on
// its own. `web/test/automations.test.ts` reads this file for exactly that
// pair now, in place of the file this used to be part of.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { DialogDescription, DialogTitle } from "@shared/ui/components/dialog/dialog"
import { Field } from "@shared/web/field"
import { FormShellDialog, fieldSpacing } from "@shared/web/form-shell"
import { Input } from "@shared/ui/components/input/input"
import { Switch } from "@shared/ui/components/switch/switch"
import { Textarea } from "@shared/ui/components/textarea/textarea"
import { Text } from "@shared/ui/components/typography/typography"
import { toast } from "@shared/ui/components/sonner/sonner"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"
import { useFormDraft } from "@shared/web/use-form-draft"
import { useT } from "@shared/web/language"

import { ApiFailure, tenancy } from "@/lib/api"
import { automationOverride, automationStatus, type Automation } from "@shared/automations"

type FormValues = { title: string; description: string }
const EMPTY: FormValues = { title: "", description: "" }

export function AutomationEditSheet({
  open,
  onOpenChange,
  teamId,
  automation,
  settings,
  mayChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  /** The row this sheet edits, or `null` while there is none to show — the
   * caller clears this only after `onOpenChange(false)`, so the fields do
   * not blank out mid-close. */
  automation: Automation | null
  /** This row's own segment's parsed stored blob — read once by the caller
   * for every row it draws (R56: one door, read once) and handed down
   * rather than re-fetched here. */
  settings: unknown
  mayChange: boolean
}) {
  const t = useT()

  // REMEMBER THE LAST REAL ROW through the close transition, so `open` can
  // fall to `false` (starting the Sheet's own exit animation) a render
  // before `automation` falls to `null` without the fields blanking first.
  const [last, setLast] = React.useState<Automation | null>(automation)
  React.useEffect(() => {
    if (automation) setLast(automation)
  }, [automation])
  const a = automation ?? last

  const override = a ? automationOverride(settings, a.key) : null
  const status = a ? automationStatus(a, settings) : "on"

  const [values, setValues, clearDraft] = useFormDraft<FormValues>(
    a ? `automation:edit:${teamId}:${a.key}` : undefined,
    a ? { title: override?.title ?? "", description: override?.description ?? "" } : EMPTY,
    open
  )
  const [busy, setBusy] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!a) return
    setBusy(true)
    try {
      await tenancy.setAutomationOverride(a.key, values.title.trim(), values.description.trim())
      clearDraft()
      onOpenChange(false)
      toast.success(t("Saved."))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't save that."))
    } finally {
      setBusy(false)
    }
  }

  async function flip(on: boolean) {
    if (!a) return
    setBusy(true)
    try {
      await tenancy.setAutomation(a.key, on)
      toast.success(on ? t("Switched on.") : t("Switched off."))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't change that. Try again."))
    } finally {
      setBusy(false)
    }
  }

  if (!a) return null

  return (
    <FormShellDialog
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      onSubmit={submit}
      title={<DialogTitle>{override?.title ?? t(a.title)}</DialogTitle>}
      subtitle={<DialogDescription>{override?.description ?? t(a.description)}</DialogDescription>}
      submit={{ busy, disabled: !mayChange }}
    >
      <Field config={{ ...defaultFieldConfig, label: t("Name") }} htmlFor="automation-title" className={fieldSpacing}>
        <Input
          id="automation-title"
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          placeholder={t(a.title)}
          disabled={busy || !mayChange}
          autoFocus
        />
      </Field>
      <Field
        config={{ ...defaultFieldConfig, label: t("Description") }}
        htmlFor="automation-description"
        className={fieldSpacing}
      >
        <Textarea
          id="automation-description"
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          placeholder={t(a.description)}
          disabled={busy || !mayChange}
          rows={3}
        />
      </Field>
      <Field config={{ ...defaultFieldConfig, label: t("Status") }} htmlFor="automation-status" className={fieldSpacing}>
        {!a.switchable && a.helpText ? (
          <div className="flex flex-col gap-1">
            <Badge variant="secondary" className="w-fit shrink-0">
              {t("Protected")}
            </Badge>
            <Text className="text-muted-foreground">{t(a.helpText)}</Text>
          </div>
        ) : null}
        {a.switchable ? (
          <div className="flex items-center gap-2">
            <Switch
              id="automation-status"
              checked={status === "on"}
              aria-label={t(a.title)}
              disabled={!mayChange || busy}
              onCheckedChange={(v: boolean) => void flip(v)}
            />
            <Text>{status === "on" ? t("Active") : t("Inactive")}</Text>
          </div>
        ) : null}
      </Field>
    </FormShellDialog>
  )
}
