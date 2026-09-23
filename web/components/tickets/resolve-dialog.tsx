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
//
// T3658/B0295, 23 Sep 2026 — A SCREENSHOT IS REQUIRED BEFORE THIS DOOR WILL
// CLOSE THE TICKET (`postResolveHelp`, workers/content). This dialog's own
// picker is the SAME "pick, upload immediately, tile" shape the reply
// composer's own tile grid already draws (`reply-composer.tsx`'s
// `AttachSlot`/`addFiles`/`removeAttachment`, kit `FileUpload` "Option B") —
// uploaded through the identical seam (`uploadFile`/`removeUploadedFile`,
// handed down from `help-detail.tsx`'s own `uploadReplyFile`/`removeReplyFile`,
// `content.addHelpAttachment` underneath), never a second idea of what
// "attach a file to this ticket" means, and R41-honest: a picked file is
// either uploaded and its id sent, or its tile shows the refusal — nothing is
// picked and then silently dropped.

import * as React from "react"

import { DialogDescription, DialogTitle } from "@shared/ui/components/dialog/dialog"
import { Field } from "@shared/web/field"
import { Textarea } from "@shared/ui/components/textarea/textarea"
import { Button } from "@shared/ui/components/button/button"
import { FileUpload, type FileUploadItem } from "@shared/ui/components/file-upload/file-upload"
import { toast } from "@shared/ui/components/sonner/sonner"
import { PaperPlaneTilt } from "@shared/ui/foundations/icons"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"
import { pickedFileId, storedFileToUploadItem, usePickedFileItems } from "@shared/web/upload-items"

import { ApiFailure } from "@/lib/api"
import { FormShellDialog, fieldSpacing } from "@shared/web/form-shell"
import { useFormDraft } from "@shared/web/use-form-draft"
import { useT } from "@shared/web/language"
import type { HelpMessageAttachment } from "@shared/types"

export type ResolveFormValues = { resolution: string; attachmentIds: string[] }

const resolutionField = {
  ...defaultFieldConfig,
  label: "What we're telling them",
  required: true,
}

const screenshotField = {
  ...defaultFieldConfig,
  label: "Screenshot",
  required: true,
}

/** ONE PICKED SCREENSHOT, from "just chosen" to "sent" — the same shape
 * `reply-composer.tsx`'s own `AttachSlot` takes, narrowed to this dialog's
 * one concern. Uploaded the instant it is picked (R41: the ticket already
 * exists, so there is nowhere for the bytes to wait). */
type ImageSlot =
  | { key: string; status: "uploading" | "error"; file: File; message?: string }
  | { key: string; status: "done"; attachment: HelpMessageAttachment }

export function ResolveDialog({
  open,
  onOpenChange,
  draft,
  draftKey,
  onSubmit,
  uploadFile,
  removeUploadedFile,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** the ticket's accumulated draft — each story's closing note, in order. */
  draft: string | null
  draftKey?: string
  onSubmit: (values: ResolveFormValues) => Promise<void>
  /** THE SAME UPLOAD SEAM the reply composer's own tile grid uses
   * (`uploadReplyFile`, help-detail.tsx — `content.addHelpAttachment`
   * underneath, `kind: "file"`), handed down rather than called here
   * directly so this dialog carries no second idea of what "attach a file
   * to this ticket" means. */
  uploadFile: (file: File) => Promise<HelpMessageAttachment>
  /** TAKE A STAGED FILE BACK OFF, best-effort — the same shape
   * `removeReplyFile` already takes. */
  removeUploadedFile: (attachmentId: string) => Promise<void>
}) {
  const t = useT()
  const [values, setValues, clearDraft] = useFormDraft(draftKey, { resolution: draft ?? "" }, open)
  const [slots, setSlots] = React.useState<ImageSlot[]>([])
  const [busy, setBusy] = React.useState(false)
  // SEQUENTIAL, never parallel — the same reasoning `reply-composer.tsx`'s
  // own `uploadChain` states: two uploads racing on this ticket would answer
  // with two "whole list" responses in an order the wire does not guarantee,
  // and "the newest row on the list I got back" is how a slot learns its own
  // attachment id.
  const uploadChain = React.useRef<Promise<void>>(Promise.resolve())
  const fileInput = React.useRef<HTMLInputElement | null>(null)

  const attachBusy = slots.some((s) => s.status === "uploading")
  const doneAttachments = slots.filter((s): s is Extract<ImageSlot, { status: "done" }> => s.status === "done")
  const ready = values.resolution.trim() !== "" && doneAttachments.length > 0 && !attachBusy

  function addFiles(files: File[]) {
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(t("Only images are accepted."))
        continue
      }
      const key = pickedFileId(file)
      setSlots((prev) => [...prev, { key, status: "uploading", file }])
      uploadChain.current = uploadChain.current
        .then(() => uploadFile(file))
        .then((attachment) => {
          setSlots((prev) => prev.map((s) => (s.key === key ? { key, status: "done", attachment } : s)))
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : t("Couldn't attach that.")
          setSlots((prev) => prev.map((s) => (s.key === key ? { key, status: "error", file, message } : s)))
          toast.error(message)
        })
    }
  }

  function removeSlot(key: string) {
    setSlots((prev) => {
      const slot = prev.find((s) => s.key === key)
      // A `done` tile's row is already on the ticket; an `uploading`/`error`
      // tile has no row yet, so removing it is simply forgetting the `File`.
      if (slot?.status === "done") void removeUploadedFile(slot.attachment.id).catch(() => {})
      return prev.filter((s) => s.key !== key)
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    try {
      await onSubmit({ resolution: values.resolution.trim(), attachmentIds: doneAttachments.map((s) => s.attachment.id) })
      clearDraft()
      setSlots([])
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't send that."))
    } finally {
      setBusy(false)
    }
  }

  const pendingSlots = slots.filter((s): s is Extract<ImageSlot, { status: "uploading" | "error" }> => s.status !== "done")
  const pendingItems = usePickedFileItems(pendingSlots.map((s) => s.file))
  const tiles: FileUploadItem[] = slots.map((s) => {
    if (s.status === "done")
      return storedFileToUploadItem({
        id: s.key,
        name: s.attachment.name,
        href: s.attachment.href,
        mime: s.attachment.mime,
        size: s.attachment.size,
      })
    const idx = pendingSlots.findIndex((p) => p.key === s.key)
    return { ...pendingItems[idx], id: s.key, status: s.status, error: s.status === "error" ? s.message : undefined }
  })

  return (
    <FormShellDialog
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      onSubmit={submit}
      title={<DialogTitle>{t("Answer this ticket")}</DialogTitle>}
      subtitle={
        <DialogDescription>
          {t("It resolves the ticket, joins the conversation, and goes to the client by email.")}
        </DialogDescription>
      }
      submit={{
        busy: busy || attachBusy,
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
          disabled={busy}
          rows={6}
          autoFocus
        />
      </Field>

      <Field config={screenshotField} className={fieldSpacing}>
        {tiles.length > 0 ? (
          <FileUpload
            files={tiles}
            onFilesSelected={addFiles}
            onRemove={removeSlot}
            removeLabel={t("Remove")}
            addLabel={t("Add")}
            accept="image/*"
            multiple
          />
        ) : (
          <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()} disabled={busy}>
            {t("Add a screenshot")}
          </Button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            if (files.length) addFiles(files)
            // Cleared so picking the SAME file twice in a row still fires
            // `onChange` — a native input only changes on a DIFFERENT value.
            e.target.value = ""
          }}
        />
      </Field>
    </FormShellDialog>
  )
}
