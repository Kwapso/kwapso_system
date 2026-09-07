"use client"

// WHAT A STORY SHOWS FOR ITSELF, ON THE STORY'S OWN SCREEN — the files and links
// somebody put up to say "come and look at this".
//
// THE BUG THIS EXISTS FOR (owner, 27 Aug 2026): he attached two screenshots while
// editing a story, the form showed their names, the save succeeded — and the
// files were never visible again anywhere. Nothing was lost: the door answered
// 200, the objects are in the bucket, the rows are in `story_attachments`, and
// `GET /api/content/stories/attachments` returns them correctly. The WRITE half
// was built and the READ half never was. `story-detail.tsx` contained no mention
// of an attachment, and the read door's only caller in the whole app was the
// review dialog — a screen you reach by pressing "Ready for review", which is not
// where anybody goes to look at a screenshot.
//
// THE PANEL ITSELF IS `records/record-attachments.tsx`, shared with the ticket's.
// This file is the story's half of that arrangement: its door, its cache key,
// and the two sentences that name the record.
//
// IT PASSES A `fix`, AND THE TICKET'S PANEL DOES NOT. Attaching and removing were
// both built and the middle was not, so somebody who put up the wrong document
// could only take it off and put another one on — two acts, two lines of
// history, and a moment where the story carried neither. The pencil renames; the
// replace swaps a file's bytes or a link's address for the right ones. Which of
// the three the door does is decided by what the body carries, so one call
// covers all three. A ticket gets none of it: its door gates on `help:read`,
// which a client login holds, and the owner ruled "never" on a client fixing
// somebody else's file. A story is OURS, and its doors gate on `work:edit`.

import type { StoryAttachment } from "@shared/types"
import { content as contentApi } from "@/lib/api"
import { useLanguage } from "@shared/web/language"

import { RecordAttachments } from "@/components/records/record-attachments"
import { storyAttachmentsKey } from "@/lib/live-resources"

export function StoryAttachmentsPanel({
  storyId,
  canEdit,
}: {
  storyId: string
  /** `work:edit` — the right BOTH write doors ask for. See the header: the ticket
   * panel's wider `read` would be wrong here, and drawing a button the door
   * refuses is the failure this parameter is named after. */
  canEdit: boolean
}) {
  const { t } = useLanguage()
  return (
    <RecordAttachments<StoryAttachment>
      cacheKey={storyAttachmentsKey(storyId)}
      load={() => contentApi.storyAttachments(storyId)}
      canEdit={canEdit}
      add={(a) => contentApi.addStoryAttachment({ id: storyId, ...a })}
      remove={(attachmentId) => contentApi.removeStoryAttachment(storyId, attachmentId)}
      fix={(a) => contentApi.updateStoryAttachment({ id: storyId, ...a })}
      emptyTitle={t("Nothing attached yet.")}
      removeTitle={(label) => t("Take {label} off this story?", { label })}
    />
  )
}
