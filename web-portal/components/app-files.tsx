"use client"

// IMPORTANT MATERIAL ABOUT ONE OF THEIR SYSTEMS (T3850) — the owner's ask: "I
// don't see any tab where I can store important files related to an app,
// sent by the client, a screenshot from a meeting, or a document of
// different logics, inside the app details screen." The client's own
// decision: a Files tab on every app, and the client can see it in their
// portal.
//
// READ-ONLY, DELIBERATELY. The client's decision said "can see it," not "can
// add to it" — unlike a ticket, where a client attaching their own
// screenshot IS the conversation (`ticket-attachments.tsx`'s own header).
// An app is the agency's own record of what we built them; every write door
// (`workers/tenancy/src/routes/app-attachments.ts`) refuses a portal caller
// at the door besides (R21), so there is no add/remove act this screen could
// ever legitimately offer.
//
// SAME ROW SHAPE AS `ticket-attachments.tsx`, minus the two buttons under it
// and the remove control on each row — kept as its own small file rather
// than a shared one, matching that file's own header on why the portal
// keeps its attachment rendering separate from the agency's
// (`web/lib/attachments.ts`): "two front doors, one seam underneath [safeHref],
// two policies on top of it."
//
// LAZY, LIKE THE PROCESS CONVERSATION ONE ACCORDION LEVEL UP
// (`impact-screen.tsx`'s own `ProcessConversation`) — `open` is whether this
// app's own accordion item is expanded, so a client with six systems does
// not pay for six file lists before opening one.

import { fileTypeIcon } from "@shared/web/screen-engine/file-type-icon"
import { LinkSimple } from "@shared/ui/foundations/icons"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"

import type { AppAttachment } from "@shared/types"
import { AttachmentPreview, hasPreview } from "@shared/web/attachment-preview"
import { formatRelative } from "@shared/web/format"
import { useLanguage } from "@shared/web/language"
import { safeHref } from "@shared/web/rich-text"
import { useCached } from "@shared/web/store"
import { appFiles } from "@/lib/api"

/** "2.4 MB", "812 KB" — the ticket panel's own spelling, copied rather than
 * shared: see this file's own header on why the portal keeps its own. */
function fileSize(bytes: number | null): string | null {
  if (bytes === null || bytes <= 0) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Plainly the web, or a path this front door itself serves — the same
 * refusal `ticket-attachments.tsx`'s own `isFollowable` states and for the
 * identical reason: a link is data, and `javascript:…` in an `href` on a
 * page a client already trusts is stored XSS. */
function isFollowable(url: string): boolean {
  return (/^https?:\/\//i.test(url) || url.startsWith("/")) && safeHref(url) !== undefined
}

export function AppFiles({ appId, open }: { appId: string; open: boolean }) {
  const { t, lang } = useLanguage()
  const listQ = useCached<AppAttachment[]>(open ? `portal:app-files:${appId}` : null, () =>
    appFiles.list(appId).then((r) => r.attachments)
  )
  if (!open) return null
  const attachments = listQ.data ?? []

  if (listQ.loading && !listQ.data) return <Skeleton className="h-16 w-full rounded-[var(--radius)]" />

  if (attachments.length === 0)
    return <p className="text-muted-foreground text-sm">{t("Nothing filed against this app yet.")}</p>

  return (
    <ul className="flex flex-col gap-2">
      {attachments.map((a) => {
        const size = a.kind === "file" ? fileSize(a.sizeBytes) : null
        const Glyph = a.kind === "file" ? fileTypeIcon(a.label) : LinkSimple
        const meta = [a.addedByName, formatRelative(a.createdAt, t, lang), size].filter(Boolean).join(" · ")
        return (
          <li
            key={a.id}
            className="flex items-start gap-2 rounded-[var(--radius)] bg-surface-panel p-4 [--badge-quiet-fill:var(--surface-raised)]"
          >
            <Glyph className="text-muted-foreground size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              {isFollowable(a.url) ? (
                <a
                  href={safeHref(a.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate underline-offset-4 hover:underline"
                >
                  {a.label}
                </a>
              ) : (
                <>
                  <p className="truncate">{a.label}</p>
                  <p className="text-muted-foreground truncate text-xs">{a.url}</p>
                </>
              )}
              <p className="text-muted-foreground truncate text-xs">{meta}</p>
              {hasPreview(a.kind, a.contentType) && (
                <div className="mt-2">
                  <AttachmentPreview kind={a.kind} url={a.url} contentType={a.contentType} />
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
