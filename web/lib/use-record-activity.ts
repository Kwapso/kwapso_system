"use client"

// The ONE web-side read of a RECORD's activity — the client half of Law R5's
// generic (table, id) path: any module's history with no per-module code. It
// carries THREE things because the door already returns all three, and splitting
// them is what let them drift:
//
//   • the rows — page one of the feed, cache-first + live (the live registry's
//     `deps` invalidate this key when the record changes, and the refetch
//     re-primes the total and the cursor below in the same round-trip);
//   • the TOTAL — the exact server COUNT(*) of that record's history, which the
//     Activity TAB badges (R8 says the tab carries the count, R16 says the
//     number is a server total through `formatCount`). The feed is PAGED, so
//     the loaded rows' length is a ceiling, not a total — a record with 200
//     events would badge "50" forever;
//   • the CURSOR — parked in the sidecar <LoadMore> reads, plus the one fetcher
//     that spends it (R14). Without it the badge above told the truth about a
//     feed with no way to reach the other 93 rows: an exact count of what the
//     screen refuses to show is worse than no count at all.

import { ApiFailure, tenancy } from "@/lib/api"
import { nameInitials } from "@/lib/identity"
import { cursorKey } from "@/lib/live-resources"
import { toast } from "@shared/ui/components/sonner/sonner"
import { formatRelative } from "@shared/web/format"
import { useLanguage } from "@shared/web/language"
import { primeCache, useCached, useCachedValue } from "@shared/web/store"
import { describeWithStaffName, staffNameFromSnapshot } from "@shared/staff-name"
import type { ActivityItem } from "@shared/types"

/** One activity row, dressed for the library ActivityFeed. Every record detail
 * wrote this same four-line map out for itself — same fields, same date format —
 * which is four places to change the day a feed row grows a field.
 *
 * `initials` rides here rather than being recomputed at each of the two
 * consumers (the record footer's Latest-activity column, the Activity tab's
 * own feed) — the SAME generic-activity-path law (R5) that keeps this one
 * fetch shared keeps its derived display fields shared too, so a mark that
 * renders blank in one place can't happen while the other gets it right.
 *
 * `timestamp` is `formatRelative` — "2d ago", falling back to an absolute date
 * past a week — the SAME treatment the record footer's own audit column
 * already used one field over (`recordAuditEntries`, record-chrome.tsx). Both
 * consumers used to run this through `formatActivityWhen` instead (a raw,
 * sortable "2026-08-13 13:16"), which is a table-column format and reads as
 * a bug sitting next to a relative phrase — the client's own words, "look at
 * the format of the dates! so wrong / i want them all like now the ones on
 * record." `dateTime` rides alongside it, the raw ISO, for the kit's `<time
 * datetime>` attribute — a human string needs its machine value paired with
 * it, not thrown away. */
export type ActivityFeedRow = {
  id: string
  description: string
  actor: string | undefined
  initials: string
  timestamp: string
  dateTime: string
}

/** The cache key holding one record's activity rows. The same key the live
 * registry names in its `deps`, so a change to the record refreshes its feed. */
export function recordActivityKey(table: string, id: string): string {
  return `activity:record:${table}:${id}`
}

/** One record's activity: its rows (the loaded pages), the exact server total the
 * Activity tab badges, and what <LoadMore> needs to fetch the next page — the
 * list's own key plus the ONE fetcher that spends the cursor. `total` is
 * undefined until the first load lands — which `formatCount` renders as nothing,
 * never a "0" that reads as "no history".
 *
 * A later page appends rows and NEVER touches the total: the count is the whole
 * history's, not the loaded prefix's, so it must not move as you load more. */
/**
 * `table` / `id` may be NULL, and that is not a convenience — it is what lets
 * the deep-link host read a record's history at all. The host resolves every
 * module's data in ONE hook (use-screen-data), above a render switch full of
 * early returns, so it cannot call this conditionally from inside a branch. A
 * null pair keys the read to null, which fetches nothing and returns the same
 * empty shape a first render sees.
 */
export function useRecordActivity(
  table: string | null,
  id: string | null
): {
  rows: ActivityItem[]
  /** The same rows, ready to hand straight to the library ActivityFeed. */
  items: ActivityFeedRow[]
  total: number | undefined
  /** The first page is still in flight — `useCached`'s own `loading`, which
   * goes false the moment that first request SETTLES, success or failure.
   * Deliberately not "`rows` is empty" (a record can genuinely have no
   * history) and not "`query.data` is `undefined`" either — that stays
   * `undefined` forever on a failed first load, which would keep `loading`
   * true and bury the error behind an eternal spinner instead of surfacing
   * it. `ActivityPanel` forwards this straight to the kit's `ActivityFeed`
   * `loading` prop: conflating any of these was the whole bug, a still-
   * loading or failed feed drawing the same "No activity yet." as a feed
   * that is genuinely empty. */
  loading: boolean
  error: unknown
  listKey: string
  fetchPage: (cursor: string) => Promise<{ rows: ActivityItem[]; nextCursor: string | null }>
  /**
   * Add a note to this record — CH27.8's add-a-note field on the kit's ink
   * footer (`RecordScreen`'s `onAddNote`), which draws only when a caller
   * passes this at all. Synchronous, matching the kit's own `(value: string)
   * => void` contract (it clears the field on Enter before any request could
   * have returned); the request runs in the background and toasts on either
   * end.
   *
   * NO explicit cache-priming here, on purpose: the door publishes the SAME
   * resource+id every real edit on this record already does, and that
   * resource's own `TEAM_RESOURCES` entry (web/lib/live-resources.ts) already
   * lists this record's `activity:record:<table>:<id>` key among its deps —
   * the live-sync ping every other note, reply or edit on this record already
   * rides refreshes this one too, with no new listener code (R15).
   */
  addNote: (note: string) => void
} {
  const { t, lang } = useLanguage()
  // NULL UNTIL THE RECORD IS IN HAND, and that is the caller's job rather than
  // this hook's. A record's history is a TAB nobody has pressed, and censused
  // 7 Sep 2026 it was in front of the record on every record screen but
  // processes — so the three screens that were doing that now pass null until
  // they have the record, which is the DETERMINISTIC gate after-paint.ts's own
  // doc asks for ("keys on the record being in hand … exact, needs no
  // scheduler, and cannot be flaky") rather than the scheduler itself.
  const on = Boolean(table && id)
  const key = recordActivityKey(table ?? "", id ?? "")
  const query = useCached<ActivityItem[]>(on ? key : null, () =>
    tenancy.recordActivity(table as string, id as string).then((r) => {
      primeCache(`total:${key}`, r.total)
      primeCache(cursorKey(key), r.nextCursor)
      return r.activity
    })
  )
  const rows = query.data ?? []
  return {
    rows,
    items: rows.map((a) => ({
      id: a.id,
      // R54 — AND THIS IS THE HALF THAT IS ACTUALLY VISIBLE. The kit's
      // ActivityFeed draws `actor` only as an avatar's accessible name; the line
      // a person READS is this sentence, which the worker composed with the
      // actor's full name inside it. Shortening `actor` alone would have changed
      // nothing on screen. `describeWithStaffName` rewrites it against the row's
      // OWN actor snapshot — an exact prefix, never prose parsing — so it fixes
      // history as well as everything written from today.
      description: a.actorIsClient
        ? a.description
        : describeWithStaffName(a.description, a.actorName),
      // `|| undefined`, NOT `?? undefined`. `staffNameFromSnapshot` answers ""
      // for a row with no actor (a system write), and "" is not "no actor" here:
      // the kit draws this field as `aria-label={item.actor}` on the avatar
      // fallback (shared/ui/components/activity-feed/activity-feed.tsx), and an
      // EMPTY aria-label is worse than an absent one — it overrides the initials
      // underneath it with nothing, so a screen reader announces an unnamed
      // element instead of the "?" mark. `??` only catches null/undefined and
      // let the empty string straight through.
      actor: (a.actorIsClient ? a.actorName : staffNameFromSnapshot(a.actorName)) || undefined,
      // The MARK keeps both letters. An initial is not a name (R35), so "AK" is
      // not the thing the ruling is about, and one-lettering every avatar in the
      // app would be a design change nobody asked for.
      initials: nameInitials(a.actorName),
      timestamp: formatRelative(a.createdAt, t, lang),
      dateTime: a.createdAt,
    })),
    total: useCachedValue<number>(on ? `total:${key}` : null),
    loading: query.loading,
    error: query.error,
    listKey: key,
    fetchPage: (cursor: string) =>
      tenancy
        .recordActivity(table as string, id as string, cursor)
        .then((r) => ({ rows: r.activity, nextCursor: r.nextCursor })),
    addNote: (note: string) => {
      if (!table || !id) return
      tenancy.addNote(table, id, note).then(
        () => toast.success(t("Note added.")),
        (err: unknown) =>
          toast.error(err instanceof ApiFailure ? err.message : t("Couldn't add the note. Try again."))
      )
    },
  }
}
