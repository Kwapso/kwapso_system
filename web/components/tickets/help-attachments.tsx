"use client"

// WHAT SOMEBODY ATTACHED TO SHOW WHAT THEY MEAN (CHECKLIST 5.10) — several files
// and several links on one ticket, on the agency's side of the same list the
// client portal draws.
//
// THE PANEL ITSELF IS `records/record-attachments.tsx`, shared with the story's.
// This file is the ticket's half of that arrangement and nothing else: its door,
// its cache key, and the two sentences that name the record.
//
// NO `fix` IS PASSED, AND THAT IS THE POINT OF THIS FILE. A CLIENT MAY NEVER FIX
// SOMEBODY ELSE'S FILE — owner's ruling, 27 Aug 2026, asked as "may a client
// login rename or replace a file agency staff attached?" and answered in one
// word: "never." Not on `help:read`, not on any role a client login can hold.
// The story panel one record along DOES pass one, because its right is
// `work:edit`, which no client can reach. Same panel, and the right underneath
// it is the whole difference.
//
// AND IF IT IS EVER EXTENDED: the fence goes on the DOOR, not here. R21 was
// earned twice by exactly this — the agency gateway forwards `/api/content/*` by
// PREFIX and a client login is an ordinary team member, so a door the portal's
// allow-list withheld was being served to the same person at the other hostname.
// A `canEdit` that renders no button is not a fence; a fence is
// `refusePortalCaller` inside the handler. What a client may still do is
// unchanged: attach their own file, and see what they sent. The line is drawn on
// somebody ELSE'S file, never on their own.

import type { HelpAttachment } from "@shared/types"
import { content as contentApi } from "@/lib/api"
import { useLanguage } from "@shared/web/language"

import { RecordAttachments } from "@/components/records/record-attachments"
import { helpAttachmentsKey } from "@/lib/live-resources"

export function HelpAttachmentsPanel({
  ticketId,
  canEdit,
}: {
  ticketId: string
  /** `help:read` — the right that gates the doors. A person who can see a ticket
   * can show you what they mean, which is the same bar the reply box uses.
   *
   * READ THE HEADER BEFORE WIDENING THIS. `help:read` is a right a CLIENT LOGIN
   * holds, so this prop is true for a client, and "the right that gates the
   * doors" is a sentence about ADDING and REMOVING your own — not about fixing
   * anybody else's. The owner ruled "never" on that, 27 Aug 2026. */
  canEdit: boolean
}) {
  const { t } = useLanguage()
  return (
    <RecordAttachments<HelpAttachment>
      cacheKey={helpAttachmentsKey(ticketId)}
      load={() => contentApi.helpAttachments(ticketId)}
      canEdit={canEdit}
      add={(a) => contentApi.addHelpAttachment({ id: ticketId, ...a })}
      remove={(attachmentId) => contentApi.removeHelpAttachment(ticketId, attachmentId)}
      emptyTitle={t("Nothing attached to this ticket yet.")}
      removeTitle={(label) => t("Take {label} off this ticket?", { label })}
    />
  )
}
