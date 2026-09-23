"use client"

// WHAT AN APP SHOWS FOR ITSELF (T3850) — the Files tab. The owner's ask: "I
// don't see any tab where I can store important files related to an app,
// sent by the client, a screenshot from a meeting, or a document of
// different logics, inside the app details screen." The client's own
// decision: a Files tab on every app, holding files AND links, and the
// client can see it in their portal (read-only there — see
// web-portal/components/impact-screen.tsx's own note on that default).
//
// THE PANEL ITSELF IS `records/record-attachments.tsx`, shared with the
// ticket's and the story's. This file is the app's half of that
// arrangement and nothing else: its door, its cache key, and the two
// sentences that name the record.
//
// `fix` IS PASSED — `processes:update` is a right no client login can hold
// (the write doors refuse a portal caller besides, at
// `workers/tenancy/src/routes/app-attachments.ts`), so the "may a client
// rename or replace a file agency staff attached?" question
// `record-attachments.tsx`'s own header raises never reaches a client here
// the way it does on a ticket.

import type { AppAttachment } from "@shared/types"
import { tenancy } from "@/lib/api"
import { useLanguage } from "@shared/web/language"

import { RecordAttachments } from "@/components/records/record-attachments"
import { appAttachmentsKey } from "@/lib/live-resources"

export function AppAttachmentsPanel({
  appId,
  canEdit,
}: {
  appId: string
  /** `processes:update` — the same right the app's own Edit action gates on. */
  canEdit: boolean
}) {
  const { t } = useLanguage()
  return (
    <RecordAttachments<AppAttachment>
      cacheKey={appAttachmentsKey(appId)}
      load={() => tenancy.appAttachments(appId)}
      canEdit={canEdit}
      add={(a) => tenancy.addAppAttachment({ id: appId, ...a })}
      remove={(attachmentId) => tenancy.removeAppAttachment(appId, attachmentId)}
      fix={(a) => tenancy.updateAppAttachment({ id: appId, ...a })}
      emptyTitle={t("Nothing attached to this app yet.")}
      removeTitle={(label) => t("Take {label} off this app?", { label })}
    />
  )
}
