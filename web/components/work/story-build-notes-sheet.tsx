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
// words). `StoryAttachmentsPanel` (`work/story-attachments.tsx`) is the
// existing, tested list-and-upload UI for that door — reused here rather
// than a second, bespoke picker, so a picked file is uploaded, listed and
// removable through the one path the app already proves (R41). The story
// detail page's own read-mode Build notes panel (`story-detail.tsx`) then
// renders whichever of those attachments are pictures inline, under the
// prose, the same `hasPreview`/`AttachmentPreview` pair the ticket thread's
// own message media well already draws with.
//
// THE DOOR IS THE STORY UPDATE DOOR, NOT A FIELD OF ITS OWN — `buildNotes`
// rides `POST /api/content/stories/update` like every other field that door
// reads, and that door REPLACES EVERY FIELD IT READS (`updateStory`'s own
// doc, workers/content/src/lib/stories.ts), so this sheet spreads the
// story's own CURRENT shape and overrides only `buildNotes` — the identical
// pattern `work-panels.tsx`'s `toggleContributesToGoal` already takes for
// the same reason (a field-by-field call is a field the next door addition
// gets silently dropped from).

import * as React from "react"

import { DialogTitle } from "@shared/ui/components/dialog/dialog"
import { Notes } from "@shared/web/notes-editor/notes-editor"
import { Field } from "@shared/web/field"
import { FormShellDialog, fieldSpacing } from "@shared/web/form-shell"
import { toast } from "@shared/ui/components/sonner/sonner"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"
import { useLanguage } from "@shared/web/language"

import type { Story } from "@shared/types"
import { ApiFailure, content as contentApi } from "@/lib/api"
import { StoryAttachmentsPanel } from "@/components/work/story-attachments"

const notesField = { ...defaultFieldConfig, label: "Build notes", required: false }

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
      submit={{ busy }}
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
      {/* IMAGES, THE SAME DOOR THE STORY'S OWN FILES-AND-LINKS TAB ALREADY
          USED — see this file's own header. The story already exists by the
          time this sheet can open, so nothing here is deferred (R41's own
          distinction: a CREATE dialog defers, an EDIT surface does not). */}
      <StoryAttachmentsPanel storyId={story.id} canEdit />
    </FormShellDialog>
  )
}
