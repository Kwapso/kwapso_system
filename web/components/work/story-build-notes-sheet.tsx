"use client"

// THE BUILD NOTES SHEET — Aurora's ruling, verbatim, 21 Sep 2026: "call it
// build notes" (what was built, and how, the story detail's third
// left-column section) plus her design review the same round: a slide-in
// sheet, built like `reply-edit-sheet.tsx` — a title row, the rich text
// editor, Cancel and Save at the foot — opened from the empty state's single
// door (R88, "Write the build notes") while nothing is written, and from the
// pencil beside the rendered prose once something is.
//
// THE SAME EDITOR THE STORY'S OWN Detail/Acceptance criteria FIELDS USE —
// `Notes` (`shared/web/notes-editor`), never a second rich-text control.
//
// IMAGES RIDE THE SAME ATTACHMENT MECHANISM THE STORY'S OWN FILES-AND-LINKS
// TAB ALREADY USED — `story_attachments` (`workers/content/src/lib/
// story-attachments.ts`), itself "one table along" from `help_attachments`,
// the reply body's own mechanism (that file's own header says so in as many
// words). See the "IMAGES, THROUGH THE KIT'S OWN DROP ZONE" note below for
// which CONTROL draws it — that moved on 21 Sep 2026. The story detail
// page's own read-mode Build notes panel (`story-detail.tsx`) renders
// whichever of those attachments are pictures inline, under the prose, the
// same `hasPreview`/`AttachmentPreview` pair the ticket thread's own message
// media well already draws with.
//
// THE DOOR IS THE STORY UPDATE DOOR, NOT A FIELD OF ITS OWN — `buildNotes`
// rides `POST /api/content/stories/update` like every other field that door
// reads, and that door REPLACES EVERY FIELD IT READS (`updateStory`'s own
// doc, workers/content/src/lib/stories.ts), so this sheet spreads the
// story's own CURRENT shape and overrides only `buildNotes` — the identical
// pattern `work-panels.tsx`'s `toggleContributesToGoal` already takes for
// the same reason (a field-by-field call is a field the next door addition
// gets silently dropped from).
//
// IMAGES, THROUGH THE KIT'S OWN DROP ZONE — Aurora's ruling, 21 Sep 2026,
// verbatim: "On build nodes, use the already existing component to upload
// images. Do not invent anything new. Also, don't show that there's nothing
// attached." `<StoryAttachmentsPanel>` (`work/story-attachments.tsx`, over
// `records/record-attachments.tsx`, unmounted here and PARKED,
// `PARKED["work/story-attachments"]`, `shared/rules/registry.ts`) drew its
// OWN hand-built upload widget and an "Nothing attached yet." empty line —
// exactly the two things this ruling refuses. `FileUpload`
// (`@shared/ui/components/file-upload/file-upload`) is the kit's one drop
// zone, the SAME component `reply-composer.tsx`'s Paperclip and
// `reply-edit-sheet.tsx`'s own Attachments field already draw through, and
// its own empty state ("Drop files here" / "Choose a file") is not a
// "nothing attached" sentence, it is an instruction. Uploads happen on pick,
// straight through `story_attachments` (the SAME door
// `story-form-dialog.tsx`'s own file field and `story-detail.tsx`'s inline
// preview already read — one table, one cache key, `storyAttachmentsKey`),
// never deferred (R41's own distinction: the story already exists by the
// time this sheet opens).

import * as React from "react"

import { DialogTitle } from "@shared/ui/components/dialog/dialog"
import { Notes } from "@shared/web/notes-editor/notes-editor"
import { Field } from "@shared/web/field"
import { FileUpload, type FileUploadItem } from "@shared/ui/components/file-upload/file-upload"
import { FormShellDialog, fieldSpacing } from "@shared/web/form-shell"
import { toast } from "@shared/ui/components/sonner/sonner"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"
import { readFileAsDataUrl } from "@shared/web/file"
import { storedFileToUploadItem } from "@shared/web/upload-items"
import { primeCache, useCached } from "@shared/web/store"
import { useLanguage } from "@shared/web/language"

import type { Story, StoryAttachment } from "@shared/types"
import { ApiFailure, content as contentApi } from "@/lib/api"
import { storyAttachmentsKey } from "@/lib/live-resources"

const notesField = { ...defaultFieldConfig, label: "Build notes", required: false }
// "ADD IMAGES INLINE" is the empty Build notes panel's own subtitle
// (story-detail.tsx) — this is that promise's control.
const imagesField = { ...defaultFieldConfig, label: "Images", required: false }

export function StoryBuildNotesSheet({
  open,
  onOpenChange,
  story,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The story this sheet edits — the WHOLE record, spread on Save so every
   * other field the update door reads survives this one field's own edit. */
  story: Story
  onSaved: (buildNotes: string | null) => void
}) {
  const { t } = useLanguage()
  const [html, setHtml] = React.useState(story.buildNotes ?? "")
  const [busy, setBusy] = React.useState(false)
  /** A pick in flight — separate from `busy` (the form's own submit), the
   * same split `story-form-dialog.tsx`'s own `uploading` flag takes over the
   * identical door. */
  const [uploading, setUploading] = React.useState(false)

  // RESEED ON EVERY DIFFERENT STORY — the same inactive-to-active edge
  // `reply-edit-sheet.tsx` reads off its own reply id, so a previous story's
  // draft (if this sheet ever outlives the record it opened for) never
  // leaks into the next one.
  const lastIdRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (story.id !== lastIdRef.current) {
      lastIdRef.current = story.id
      setHtml(story.buildNotes ?? "")
    }
  }, [story.id, story.buildNotes])

  // THE STORY'S OWN IMAGES — the SAME `story_attachments` cache key
  // `story-detail.tsx`'s own inline preview and `story-form-dialog.tsx`'s
  // own file field both read (`storyAttachmentsKey`), so a picture added
  // here shows on the record the moment this sheet closes.
  const attachedQ = useCached<StoryAttachment[]>(storyAttachmentsKey(story.id), () =>
    contentApi.storyAttachments(story.id).then((r) => {
      primeCache(`total:${storyAttachmentsKey(story.id)}`, r.total)
      return r.attachments
    })
  )
  const fileTiles: FileUploadItem[] = (attachedQ.data ?? [])
    .filter((a) => a.kind === "file")
    .map((a) => storedFileToUploadItem({ id: a.id, name: a.label, href: a.url, mime: a.contentType, size: a.sizeBytes }))

  function keepAttached(r: { attachments: StoryAttachment[]; total: number }) {
    primeCache(storyAttachmentsKey(story.id), r.attachments)
    primeCache(`total:${storyAttachmentsKey(story.id)}`, r.total)
  }

  /** ONE FILE AT A TIME, uploaded the moment it is picked — the story
   * already exists by the time this sheet can open, so there is nothing to
   * defer (R41). A failure here names the file and never closes the sheet
   * under someone mid-edit. */
  async function addFiles(files: File[]) {
    setUploading(true)
    try {
      for (const file of files) {
        try {
          keepAttached(
            await contentApi.addStoryAttachment({
              id: story.id,
              kind: "file",
              label: file.name,
              fileDataUrl: await readFileAsDataUrl(file),
            })
          )
        } catch (err) {
          toast.error(err instanceof ApiFailure ? err.message : t("Couldn't attach that."))
        }
      }
    } finally {
      setUploading(false)
    }
  }

  async function removeFile(attachmentId: string) {
    try {
      keepAttached(await contentApi.removeStoryAttachment(story.id, attachmentId))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't take that off."))
    }
  }

  async function save() {
    setBusy(true)
    try {
      // THE STORY'S OWN SHAPE, SPREAD — `work-panels.tsx`'s own
      // `toggleContributesToGoal` takes the identical shape for the identical
      // reason: `updateStory` replaces every field it reads, so a field named
      // by hand here is a field the door's next addition silently drops.
      await contentApi.updateStory({
        ...story,
        detail: story.detail || undefined,
        ticketId: story.ticketId || undefined,
        sprintId: story.sprintId || undefined,
        appId: story.appId || undefined,
        processId: story.processId || undefined,
        stepKey: story.stepKey || undefined,
        assigneeId: story.assigneeId || undefined,
        reviewerId: story.reviewerId || undefined,
        startsOn: story.startsOn || undefined,
        dueOn: story.dueOn || undefined,
        accountId: story.accountId || undefined,
        storyType: story.storyType || "",
        acceptanceCriteria: story.acceptanceCriteria || undefined,
        moscow: story.moscow || undefined,
        contributesToGoal: story.contributesToGoal,
        buildNotes: html || undefined,
      })
      onSaved(html || null)
      toast.success(t("Saved."))
      onOpenChange(false)
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
      title={<DialogTitle>{t("Build notes")}</DialogTitle>}
      submit={{ busy, disabled: uploading }}
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <Field config={notesField} htmlFor="story-build-notes" className={fieldSpacing}>
        <Notes
          id="story-build-notes"
          // THE NAME A SCREEN READER READS — the identical seam
          // `story-form-dialog.tsx`'s own Detail/Acceptance criteria fields
          // already take: the kit `Field` clones `htmlFor` onto the editable
          // `div`, which cannot carry a `<label for>` (that attribute binds
          // only to a labelable control), so the words ride `aria-label`
          // instead, off the same config `Field` already shows on screen.
          aria-label={t(notesField.label)}
          defaultValue={story.buildNotes ?? ""}
          onChange={setHtml}
          placeholder={t("Write what was built, and how…")}
          disabled={busy}
        />
      </Field>
      {/* IMAGES, THROUGH THE KIT'S OWN DROP ZONE — see this file's own
          header (Aurora's ruling, 21 Sep 2026: the existing component, never
          a "nothing attached" line). The story already exists by the time
          this sheet can open, so nothing here is deferred (R41's own
          distinction: a CREATE dialog defers, an EDIT surface does not). */}
      <Field config={imagesField} htmlFor="story-build-notes-files" className={fieldSpacing}>
        <FileUpload
          multiple
          files={fileTiles}
          onFilesSelected={(files) => void addFiles(files)}
          onRemove={(id) => void removeFile(id)}
          removeLabel={t("Take it off")}
          className={busy || uploading ? "pointer-events-none opacity-60" : undefined}
        />
      </Field>
    </FormShellDialog>
  )
}
