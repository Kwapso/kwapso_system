"use client"

// EDIT STAKEHOLDERS, FROM THE TAB ITSELF (T3849) — the client's own ask: "for a
// first-time user, give the option to add or edit stakeholders of an existing
// app inside the Stakeholders tab of that app," today only reachable through
// the app's whole edit form. This is a second, narrower door onto the same
// two fields (`stakeholderContactIds` + `mainStakeholderContactId`), through
// the SAME save door the form already uses (`tenancy.updateApp`) — no worker
// change, because the door only touches a field it is sent (`savePeople`,
// `workers/tenancy/src/routes/processes.ts`).
//
// SCOPED TO THE CLIENT'S SIDE ONLY — the default this lane picked, noted in
// its report: our own people (`staffUserIds`/`leadUserId`) stay on the app's
// edit form, the same as its stage, logo and cost. Asking this door to also
// touch our side would have meant fetching `members` and re-deciding a lead a
// second time, for a tab the client asked about her OWN contacts.
//
// `name` RIDES ALONG UNCHANGED because the door requires it on every update
// (`requireText`) — every other field is sent-or-absent (R20's patch rule),
// so leaving them out of this body touches nothing but the two lists below.

import * as React from "react"

import { DialogTitle } from "@shared/ui/components/dialog/dialog"
import { toast } from "@shared/ui/components/sonner/sonner"
import { FormShellDialog } from "@shared/web/form-shell"
import type { Language } from "@shared/i18n"
import { useT } from "@shared/web/language"

import { ApiFailure, tenancy } from "@/lib/api"
import { AppStakeholdersFields } from "@/components/apps/app-stakeholders-fields"

export function AppStakeholdersSheet({
  open,
  onOpenChange,
  appId,
  appName,
  lang,
  contacts,
  initialStakeholderContactIds,
  initialMainStakeholderContactId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  appId: string
  /** required on every `updateApp` call (R20) — carried through unchanged. */
  appName: string
  lang: Language
  contacts: { id: string; name: string }[]
  initialStakeholderContactIds: string[]
  /** "" when nobody is the main one */
  initialMainStakeholderContactId: string
  onSaved: () => void
}) {
  const t = useT()
  const [ids, setIds] = React.useState<string[]>(initialStakeholderContactIds)
  const [mainId, setMainId] = React.useState<string>(initialMainStakeholderContactId)
  const [busy, setBusy] = React.useState(false)

  // NO DRAFT (R7 is for typed prose left half-finished; a tick-list re-reads
  // the record's own current state every time it opens, the same way a
  // confirm dialog does). Reset to what the record actually holds each time
  // the sheet opens, so a save on one app and a reopen on another never
  // carries the first app's ticks in.
  React.useEffect(() => {
    if (!open) return
    setIds(initialStakeholderContactIds)
    setMainId(initialMainStakeholderContactId)
  }, [open, initialStakeholderContactIds, initialMainStakeholderContactId])

  const mainHolder = ids.includes(mainId) ? mainId : ""

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await tenancy.updateApp({
        id: appId,
        name: appName,
        stakeholderContactIds: ids,
        mainStakeholderContactId: mainHolder || null,
      })
      onSaved()
      onOpenChange(false)
      toast.success(t("Stakeholders updated."))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't save that."))
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
      title={<DialogTitle>{t("Edit stakeholders")}</DialogTitle>}
      submit={{ busy }}
    >
      <AppStakeholdersFields
        contacts={contacts}
        lang={lang}
        busy={busy}
        stakeholderContactIds={ids}
        onStakeholderContactIdsChange={setIds}
        mainStakeholderContactId={mainHolder}
        onMainStakeholderContactIdChange={setMainId}
      />
    </FormShellDialog>
  )
}
