"use client"

// THE HISTORY TAB'S OWN BODY — V2 from the artifact, "grouped by last used":
// https://claude.ai/code/artifact/8d4b7c6e-639d-4776-a3d9-337ae7e957d5,
// Section 2, "History — the layout". The client's own words, 15 Sep 2026 (see
// web/lib/agent-conversation-tabs.ts for the full quote): "I like the history
// rail tab. Put it before the plus tab... when I click on one, it would open
// in a tab. What I want it to include is a topic and the date on which it was
// created and the date on which it was last used." A second ruling, later
// the same day, picked the layout by name: "For the assistant, implement V2
// grouped by last used." Row shape and group labels are taken from that
// section verbatim — search on top, four day-buckets (Today / Yesterday /
// Last week / Earlier), newest last-used first within each.
//
// DRAWN IN THE TAB'S OWN BODY, NOT A DIALOG — Laws R59/R67, the identical
// move `agent-scope-picker.tsx` already makes for the fresh-tab picker:
// `agent-panel.tsx` renders this in place of the ordinary transcript while
// the pinned clock tab (`agent-tab-strip.tsx`) is the active one, rather than
// opening anything over it. It stands on the panel's own paper (R67) and
// carries no heading of its own (R72) — the tab itself already says
// "History" through its `sr-only` label.
//
// IT REPLACES `agent-history-dialog.tsx` OUTRIGHT, not beside it — the same
// caller (`agent-panel.tsx`) had exactly one launcher for that sheet (a
// "Past conversations" button in the panel's own title row), and the pinned
// clock tab is now that launcher. Two ways to reach one list is the same
// "one-mango" problem this file's neighbours already argue against for a
// second "new chat" control, so the dialog and its button are retired
// together, not left as a redundant second door.
//
// THE SEARCH BOX FILTERS THE LOADED LIST, CLIENT-SIDE. R14's own sentence —
// "the search box on a paged list is the same sentence [as the list]: it must
// ask the door instead" — governs a GROWING collection read through
// `pagedJson`. `listThreads` (workers/data-ops/src/lib/threads.ts) is
// CAPPED, not paged: one `LIMIT`, no cursor, so there is only ever one page
// in front of this box and filtering the array already in hand answers
// exactly the same question the door would.
//
// "CREATED" AND "LAST USED" ARE BOTH ON THE DOOR ALREADY, NO MIGRATION
// NEEDED. `AgentThread` (shared/types.ts) has carried `createdAt` and
// `lastMessageAt` since before this tab existed — `listThreads`'s own SQL
// already orders by `COALESCE(last_message_at, created_at) DESC`, which is
// also the exact fallback this file uses for a thread with no messages sent
// yet (the moment right after `createThread`, where the two columns hold the
// same instant).

import * as React from "react"

import { SearchInput } from "@shared/ui/components/search-input/search-input"
import { Clamp } from "@shared/ui/components/clamp/clamp"

import type { AgentThread } from "@shared/types"
import { dataOps } from "@/lib/api"
import { formatDate } from "@shared/web/format"
import { useLanguage, useT } from "@shared/web/language"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"

export type HistoryBucket = "today" | "yesterday" | "week" | "earlier"

/** The reader's OWN calendar day, never UTC — the same reasoning
 * `shared/web/format.ts`'s date-only pair (`dateFromYMD`/`ymdFromDate`)
 * gives for building off local parts rather than `toISOString()`: the
 * instant is stored, but "today" is a fact about the READER's clock, and
 * reading it through UTC lands on the wrong side of midnight for about a
 * third of the world at any given moment. */
function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Which of the four buckets a moment falls in, measured against `now` —
 * `now` is a parameter rather than read inside so the function stays pure
 * and provable (this is exactly the shape `web/test/agent-conversation-
 * tabs.test.ts`'s siblings already test the store with). A moment that
 * reads as being in the FUTURE (`diffDays` negative — clock skew, a stale
 * cache) reads as "today" rather than throwing it into "Earlier", the
 * conservative side to be wrong on: `agent-scope-picker.tsx`'s own header
 * argues the identical case for "This record" hiding rather than guessing. */
export function historyDayBucket(iso: string, now: Date): HistoryBucket {
  const diffDays = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000)
  if (diffDays <= 0) return "today"
  if (diffDays === 1) return "yesterday"
  if (diffDays <= 7) return "week"
  return "earlier"
}

/** Partition an already-ordered list into contiguous day-buckets — a stable
 * grouping pass, never a re-sort. `listThreads`' own `ORDER BY
 * COALESCE(last_message_at, created_at) DESC` and `historyDayBucket`'s own
 * key (`th.lastMessageAt ?? th.createdAt`, the identical fallback) are the
 * SAME field read the SAME way, so the bucket a row falls into is monotone
 * in the list's own order: every "today" row precedes every "yesterday" row,
 * which precedes every "week" row, which precedes every "earlier" row.
 * Filtering the input (the search box, below) can only remove rows, never
 * reorder them, so that monotonicity — and with it, one contiguous run per
 * bucket — survives a search untouched. */
export function groupThreadsByLastUsed(
  threads: AgentThread[],
  now: Date
): { bucket: HistoryBucket; rows: AgentThread[] }[] {
  const groups: { bucket: HistoryBucket; rows: AgentThread[] }[] = []
  for (const th of threads) {
    const bucket = historyDayBucket(th.lastMessageAt ?? th.createdAt, now)
    const last = groups[groups.length - 1]
    if (last && last.bucket === bucket) last.rows.push(th)
    else groups.push({ bucket, rows: [th] })
  }
  return groups
}

export function AgentHistoryTab({
  open,
  busy,
  onPick,
}: {
  /** Whether the History tab is the one showing — the fetch trigger, same
   * shape `agent-history-dialog.tsx` gave its own `open` before this tab
   * replaced it: refetch on every open, so a thread started elsewhere (a
   * different device, a different tab in this same strip) shows up. */
  open: boolean
  busy: boolean
  /** A row was pressed — the thread's id and its own topic (its title, or
   * the same "Conversation" fallback the row itself shows), so the caller
   * can open it as a conversation tab titled the same thing the row said. */
  onPick: (threadId: string, topic: string) => void
}) {
  const t = useT()
  const { lang } = useLanguage()
  const [threads, setThreads] = React.useState<AgentThread[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(false)
  const [query, setQuery] = React.useState("")

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

  // UNMOUNTED WHILE CLOSED, LIKE THE PICKER. `agent-panel.tsx` only renders
  // this component while the clock tab is active, so `!open` is here purely
  // as a defensive early return against the one render between a prop flip
  // and this component actually unmounting — it never draws a "closed" state
  // of its own.
  if (!open) return null

  const topicOf = (th: AgentThread) => th.title || t("Conversation")
  const q = query.trim().toLowerCase()
  const rows = q ? (threads ?? []).filter((th) => topicOf(th).toLowerCase().includes(q)) : (threads ?? [])
  const groups = groupThreadsByLastUsed(rows, new Date())

  const GROUP_LABEL: Record<HistoryBucket, string> = {
    today: t("Today"),
    yesterday: t("Yesterday"),
    week: t("Last week"),
    earlier: t("Earlier"),
  }

  return (
    // NO `px-4 pb-4` HERE — this renders inside `agent-panel.tsx`'s own
    // `agent-chat-host` wrapper, which already sets that inset for every
    // tab body (the ordinary transcript included); repeating it here would
    // double the gutter the same way `agent-scope-picker.tsx`'s own `px-4`
    // does today, which is a pre-existing gap in that file, not a pattern
    // this one should copy.
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 py-2">
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          placeholder={t("Search conversations…")}
          aria-label={t("Search conversations…")}
          className="w-full"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-muted-foreground py-6 text-center text-sm">{t("Loading…")}</p>
        ) : error ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {t("Couldn't load your conversations. Try again.")}
          </p>
        ) : rows.length === 0 ? (
          // The kit's register (27.21), same one `agent-history-dialog.tsx`
          // drew for its own resting-empty state — one sentence, no create
          // act (the first conversation starts from the "+" tab, not here).
          // `filtered` withdraws that sentence for the kit's own "Nothing
          // matched." the moment a search narrows a non-empty list to zero.
          <CollectionEmptyState
            title={t("No conversations yet.")}
            filtered={q.length > 0}
            onClearFilters={() => setQuery("")}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <div key={group.bucket} className="flex flex-col gap-1">
                <span className="text-micro font-[var(--font-weight-medium)] uppercase text-ink-tertiary px-2">
                  {GROUP_LABEL[group.bucket]}
                </span>
                <ul className="flex flex-col gap-1">
                  {group.rows.map((th) => (
                    <li key={th.id}>
                      <button
                        type="button"
                        onClick={() => onPick(th.id, topicOf(th))}
                        disabled={busy}
                        className="hover:bg-muted flex w-full items-center justify-between gap-3 rounded-[var(--radius)] p-2 text-left disabled:text-ink-disabled"
                      >
                        <Clamp lines={1} collapsible={false} className="text-sm font-medium">
                          {topicOf(th)}
                        </Clamp>
                        <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
                          {t("Created {created} · Last used {lastUsed}", {
                            created: formatDate(th.createdAt, lang),
                            lastUsed: formatDate(th.lastMessageAt ?? th.createdAt, lang),
                          })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
