"use client"

// ANSWER A TICKET — the second and last thing in the product that emails a
// client (.plans/BUILD-1 §7). Through the shared FormShell (Law R4) with a
// per-session draft (Law R7).
//
// IT OPENS PRE-FILLED, and that is the whole point of the ticket's draft
// resolution: each story's closing note has been appended to it as the work
// finished, so the person answering is editing a paragraph rather than
// composing one at the end of a fortnight. What they send is what they edited —
// the door takes the words as an argument and never reads the draft itself,
// because a draft is our working text and a resolution is a sentence somebody
// chose to say.
//
// The button says what it does. There is no un-sending an email.

import * as React from "react"

import { DialogDescription, DialogTitle } from "@shared/ui/components/dialog/dialog"
import { Field } from "@shared/web/field"
import { Textarea } from "@shared/ui/components/textarea/textarea"
import { toast } from "@shared/ui/components/sonner/sonner"
import { PaperPlaneTilt } from "@shared/ui/foundations/icons"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"

import { ApiFailure } from "@/lib/api"
import { FormShellDialog, fieldSpacing } from "@shared/web/form-shell"
import { useFormDraft } from "@shared/web/use-form-draft"
import { useT } from "@shared/web/language"

export type ResolveFormValues = { resolution: string; attachmentIds: string[] }

const resolutionField = {
  ...defaultFieldConfig,
  label: "What we're telling them",
  required: true,
}

export function ResolveDialog({
  open,
  onOpenChange,
  draft,
  draftKey,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** the ticket's accumulated draft — each story's closing note, in order. */
  draft: string | null
  draftKey?: string
  onSubmit: (values: ResolveFormValues) => Promise<void>
}) {
  const t = useT()
  const [values, setValues, clearDraft] = useFormDraft(draftKey, { resolution: draft ?? "" }, open)
  const [attachmentIds, setAttachmentIds] = React.useState<string[]>([])
  const [busy, setBusy] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const ready = values.resolution.trim() !== "" && attachmentIds.length > 0

  const handleImageUpload = async (files: FileList) => {
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(t("Only images are accepted."))
          continue
        }
        // Upload logic would go here - using the same uploadReplyFile pattern
        // For now, this is a placeholder for the UI structure
      }
    } finally {
      setUploading(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    try {
      await onSubmit({ resolution: values.resolution.trim(), attachmentIds })
      clearDraft()
      setAttachmentIds([])
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't send that."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <FormShellDialog
      open={open}
      onOpenChange={onOpenChange}
      busy={busy || uploading}
      onSubmit={submit}
      title={<DialogTitle>{t("Answer this ticket")}</DialogTitle>}
      subtitle={
        <DialogDescription>
          {t("It resolves the ticket, joins the conversation, and goes to the client by email.")}
        </DialogDescription>
      }
      submit={{
        busy: busy || uploading,
        disabled: !ready,
        icon: <PaperPlaneTilt className="size-4" />,
      }}
    >
      <Field config={resolutionField} htmlFor="resolve-text" className={fieldSpacing}>
        <Textarea
          id="resolve-text"
          value={values.resolution}
          onChange={(e) => setValues((s) => ({ ...s, resolution: e.target.value }))}
          placeholder={t("What we did, in the words they'd use.")}
          disabled={busy || uploading}
          rows={6}
          autoFocus
        />
      </Field>
      <div className={fieldSpacing}>
        <label className="block text-sm font-medium">{t("Screenshot")}</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImageUpload(e.currentTarget.files!)}
          disabled={busy || uploading}
          className="block w-full text-sm"
        />
        {attachmentIds.length > 0 && (
          <p className="text-sm text-green-600 mt-2">
            {t("{count} image attached", { count: attachmentIds.length })}
          </p>
        )}
      </div>
    </FormShellDialog>
  )
}
