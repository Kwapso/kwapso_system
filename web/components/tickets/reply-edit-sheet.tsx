"use client"

// THE REPLY EDIT SHEET, Aurora's 20 Sep 2026 ruling on the chat message
// menu, verbatim: "make the avatar as big as this button. open the edit as
// slide in. can edit text and date and attachments." The kit's own inline
// textarea (`TicketThread`'s `onEdit`) can hold only the message body, never
// the three fields this ruling asks for, so the Edit row now calls
// `onEditRequest` instead (kit v1.2.143) and this sheet is what it opens
// (`help-detail.tsx`'s own `TicketThread` call site).
//
// SAVE SENDS ONLY WHAT CHANGED. The update door (POST /api/content/help/
// reply/update) takes every field optional and only writes what it is given
// (workers/content/src/routes/help.ts), so this sheet mirrors that at the
// wire: `body`, `createdAt` and the attachment add/remove lists are each
// left off the call when nothing moved, rather than resent unchanged.
//
// CANCEL CLOSES WITHOUT A CALL. `FormShellDialog` wires its own Cancel
// button, the backdrop and Escape to the same `onOpenChange(false)` path, and
// none of the three calls the door, the removed-attachment marks below are
// plain client state until Save, so closing the sheet simply drops them.
//
// ATTACHMENTS, THE SAME SHAPE THE COMPOSER USES. A new file is staged the
// moment it is picked (`content.addHelpAttachment`, the SAME door
// `reply-composer.tsx`'s own Paperclip calls), unlinked to any reply until
// Save sends its id in `attachments.add`. An EXISTING file (already on this
// reply) is never deleted here: removing one only marks it, and the mark
// travels in `attachments.remove` on Save, the door is what deactivates it
// (`updateReply`, lib/help.ts). A newly staged file removed before Save is
// discarded outright (`content.removeHelpAttachment`), the same best-effort
// take-it-back-off the composer's own discard path uses.

import * as React from "react"

import { DialogTitle } from "@shared/ui/components/dialog/dialog"
import { DatePicker } from "@shared/ui/components/date-picker/date-picker"
import { Field } from "@shared/web/field"
import { FileUpload, type FileUploadItem } from "@shared/ui/components/file-upload/file-upload"
import { FormShellDialog, fieldSpacing } from "@shared/web/form-shell"
import { Textarea } from "@shared/ui/components/textarea/textarea"
import { toast } from "@shared/ui/components/sonner/sonner"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"
import { readFileAsDataUrl } from "@shared/web/file"
import { toLocalInput, toMoment } from "@shared/web/format"
import { storedFileToUploadItem } from "@shared/web/upload-items"
import { useLanguage } from "@shared/web/language"

import type { HelpMessage } from "@shared/types"
import { ApiFailure, content } from "@/lib/api"

// "Reply text", not "Message": the composer's own text field
// (reply-composer.tsx) already carries `aria-label="Message"`, and this
// sheet can be open at the same time it exists in the DOM, so a shared name
// would make both unreachable by role + accessible name at once.
const textField = { ...defaultFieldConfig, label: "Reply text", required: true }
const dateField = { ...defaultFieldConfig, label: "Sent at", required: true }
const filesField = { ...defaultFieldConfig, label: "Attachments", required: false }

/** A file newly staged during THIS edit session, already uploaded and
 * unlinked to the ticket (`content.addHelpAttachment`'s own answer), waiting
 * on Save to claim it (`attachments.add`) or on Cancel to be quietly
 * abandoned where it sits. */
type StagedFile = { id: string; name: string; href: string; mime: string | null; size: number | null }

export function ReplyEditSheet({
  open,
  onOpenChange,
  ticketId,
  reply,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketId: string
  /** The reply this sheet edits, or `null` while there is none, the caller
   * clears this only after `onOpenChange(false)`, the same "remember the last
   * real row through the close transition" shape `automation-edit-sheet.tsx`
   * uses, so the fields do not blank out mid-close. */
  reply: HelpMessage | null
  onSaved: (replies: HelpMessage[]) => void
}) {
  const { t, lang } = useLanguage()

  const [last, setLast] = React.useState<HelpMessage | null>(reply)
  React.useEffect(() => {
    if (reply) setLast(reply)
  }, [reply])
  const r = reply ?? last

  const [body, setBody] = React.useState("")
  const [when, setWhen] = React.useState("")
  const [removedIds, setRemovedIds] = React.useState<Set<string>>(new Set())
  const [staged, setStaged] = React.useState<StagedFile[]>([])
  const [uploading, setUploading] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  // RESEED ON EVERY DIFFERENT REPLY, the same inactive-to-active edge
  // `useFormDraft` reads elsewhere, a fresh id means a fresh edit, so the
  // marks and the staged files from a PREVIOUS reply's edit never survive
  // into this one.
  const lastIdRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (r && r.id !== lastIdRef.current) {
      lastIdRef.current = r.id
      setBody(r.body)
      setWhen(toLocalInput(r.createdAt))
      setRemovedIds(new Set())
      setStaged([])
    }
  }, [r])

  const existing = (r?.attachments ?? []).filter((a) => !removedIds.has(a.id))
  const tiles: FileUploadItem[] = [
    ...existing.map((a) => storedFileToUploadItem({ id: a.id, name: a.name, href: a.href, mime: a.mime, size: a.size })),
    ...staged.map((s) => storedFileToUploadItem({ id: s.id, name: s.name, href: s.href, mime: s.mime, size: s.size })),
  ]
  const stagedIds = new Set(staged.map((s) => s.id))

  async function addFiles(files: File[]) {
    if (!r) return
    setUploading(true)
    try {
      for (const file of files) {
        const uploaded = await content.addHelpAttachment({
          id: ticketId,
          kind: "file",
          label: file.name,
          fileDataUrl: await readFileAsDataUrl(file),
        })
        const created = uploaded.attachments[uploaded.attachments.length - 1]
        if (!created) continue
        setStaged((prev) => [
          ...prev,
          { id: created.id, name: created.label, href: created.url, mime: created.contentType, size: created.sizeBytes },
        ])
      }
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't attach that."))
    } finally {
      setUploading(false)
    }
  }

  function removeFile(id: string) {
    if (stagedIds.has(id)) {
      setStaged((prev) => prev.filter((s) => s.id !== id))
      // BEST-EFFORT: the same "the row keeps its history, this is the row
      // leaving the LIST" register `removeReplyFile` (help-detail.tsx) already
      // stands on, a newly staged file has no reply to protect, so it is
      // taken back off the ticket outright rather than left orphaned.
      void content.removeHelpAttachment(ticketId, id).catch(() => {})
      return
    }
    // AN EXISTING FILE: MARKED, NEVER CALLED HERE. Save carries the mark in
    // `attachments.remove`; Cancel simply drops this state.
    setRemovedIds((prev) => new Set(prev).add(id))
  }

  async function save() {
    if (!r) return
    const trimmedBody = body.trim()
    const nextCreatedAt = when ? toMoment(when) : ""
    const changes: {
      body?: string
      createdAt?: string
      attachments?: { add?: string[]; remove?: string[] }
    } = {}
    if (trimmedBody && trimmedBody !== r.body) changes.body = trimmedBody
    if (nextCreatedAt && nextCreatedAt !== r.createdAt) changes.createdAt = nextCreatedAt
    const add = staged.map((s) => s.id)
    const remove = [...removedIds]
    if (add.length || remove.length) changes.attachments = { add, remove }

    if (!changes.body && !changes.createdAt && !changes.attachments) {
      onOpenChange(false)
      return
    }

    setBusy(true)
    try {
      const { replies } = await content.updateHelpReply(r.id, changes)
      onSaved(replies)
      toast.success(t("Saved."))
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't save that reply."))
    } finally {
      setBusy(false)
    }
  }

  if (!r) return null

  return (
    <FormShellDialog
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      title={<DialogTitle>{t("Edit reply")}</DialogTitle>}
      submit={{ busy, disabled: uploading }}
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <Field config={textField} htmlFor="reply-edit-body" className={fieldSpacing}>
        <Textarea
          id="reply-edit-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={busy}
          rows={5}
          autoFocus
        />
      </Field>
      <Field config={dateField} htmlFor="reply-edit-when" className={fieldSpacing}>
        <DatePicker
          id="reply-edit-when"
          mode="datetime"
          locale={lang}
          value={when ? new Date(when) : null}
          onValueChange={(d) => setWhen(d ? toLocalInput(d.toISOString()) : "")}
          max={new Date()}
          disabled={busy}
        />
      </Field>
      <Field config={filesField} htmlFor="reply-edit-files" className={fieldSpacing}>
        <FileUpload
          files={tiles}
          onFilesSelected={addFiles}
          onRemove={removeFile}
          removeLabel={t("Remove")}
          addLabel={t("Add")}
          multiple
        />
      </Field>
    </FormShellDialog>
  )
}
