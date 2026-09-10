"use client"

// The assistant's history view: the caller's past conversations, tap one to
// reopen it (works across devices — the list is server-side, so a chat started
// on the laptop is here on the phone). Self-contained: lazily loads each open
// so a just-run turn's thread shows at the top.

import * as React from "react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@shared/ui/components/sheet/sheet"
import { ScrollArea } from "@shared/ui/components/scroll-area/scroll-area"
import { Clamp } from "@shared/ui/components/clamp/clamp"

import type { AgentThread } from "@shared/types"
import { dataOps } from "@/lib/api"
import { formatActivityWhen } from "@shared/web/format"
import { useT } from "@shared/web/language"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"

export function AgentHistoryDialog({
  open,
  onOpenChange,
  busy,
  currentThreadId,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  busy: boolean
  currentThreadId?: string
  onPick: (threadId: string) => void
}) {
  const t = useT()
  const [threads, setThreads] = React.useState<AgentThread[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    setError(false)
    dataOps
      .agentThreads()
      .then((r) => alive && setThreads(r.threads))
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [open])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* A PICKER IS A SLIDE-IN. Client ruling, 2026-09-09, over a screenshot
          of the "New access token" dialog: "This should be a slide-in, like
          all the other screens. The only ones that are overlays are the
          warnings, such as archive or delete, and so on." Law R59.

          THIS IS A PICKER AND NOT A VIEWER, WHICH IS THE WHOLE CLASSIFICATION
          AND IS WORTH SAYING OUT LOUD, because the two look alike from the
          outside: both are a scrolling list of rows in a modal. The
          discriminator is `onPick` — every row here is a `<button>` whose
          press CHOOSES this thread and reopens it. Nothing on this screen is
          for reading; the list exists to be selected from. That puts it on
          the form side of her line, beside `role-picker-dialog.tsx` and the
          record picker, both of which are drawers.

          ITS SIBLING BEHIND THE NEXT BADGE IS DELIBERATELY NOT CHANGED.
          `agent-usage-dialog.tsx` is the same shape — a scrolling list in a
          modal, opened from the same assistant chrome — and it has no
          `onPick`: you read where the credits went and you close it. It is
          neither a form nor a warning, so it is one of the two surfaces
          referred back to the client rather than sorted into a bucket she
          did not draw, and it stays a centred overlay with a reasoned
          `CENTRED_DIALOG_OK` line until she rules. The pair is the clearest
          statement of the line this app now draws.

          No `SheetFooter`: there is no commit control. A press IS the
          commit, and it closes the panel. The list is `SheetContent`'s one
          non-slot child and takes the drawer's scrolling body treatment —
          which is also why the `ScrollArea`'s own `max-h-80` goes: an
          arbitrary 320px cap made sense inside a centred modal that had to
          leave the viewport room, and inside a full-height drawer it would
          strand the list in the top third of the panel. */}
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{t("Your conversations")}</SheetTitle>
          <SheetDescription>{t("Pick up any chat where you left off, on any device.")}</SheetDescription>
        </SheetHeader>
        {loading ? (
          <p className="text-muted-foreground py-6 text-center text-sm">{t("Loading…")}</p>
        ) : error ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {t("Couldn't load your conversations. Try again.")}
          </p>
        ) : threads && threads.length > 0 ? (
          <ScrollArea className="h-full">
            <ul className="flex flex-col gap-1 pr-3">
              {threads.map((thread) => (
                <li key={thread.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false)
                      onPick(thread.id)
                    }}
                    disabled={busy}
                    className="hover:bg-muted flex w-full flex-col items-start gap-1 rounded-[var(--radius)] p-2 text-left disabled:text-ink-disabled"
                  >
                    <Clamp lines={1} collapsible={false} className="text-sm font-medium">
                      {thread.id === currentThreadId
                        ? t("{title} · current", { title: thread.title || t("Conversation") })
                        : thread.title || t("Conversation")}
                    </Clamp>
                    <span className="text-muted-foreground text-xs">
                      {formatActivityWhen(thread.lastMessageAt ?? thread.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : (
          // The kit's register (27.21), like every other empty collection on
          // both front doors (owner ruling, 2026-09-07). No act: the first
          // conversation starts in the box this dialog opened from.
          <CollectionEmptyState title={t("No conversations yet.")} />
        )}
      </SheetContent>
    </Sheet>
  )
}
