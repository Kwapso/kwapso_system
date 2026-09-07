"use client"

// ONE DROPDOWN VALUE, AS A RECORD: its own fields, and its history off the ink
// footer's Latest activity column.
//
// WHY IT EXISTS. `selectable_data` has been writing activity rows since the day
// it shipped — created, renamed, made a default, deactivated, reactivated, four
// `logActivity` calls in workers/tenancy/src/lib/selectable.ts — and there was
// nowhere to read them. The manager screen is a vocabulary: a flat list of words
// under their group, with a rename box and a row menu. So every one of those
// sentences was written to a feed no screen opened, and "who retired this ticket
// type, and when" was a question the database could answer and the app could
// not. That reason is unchanged; only the PLACE the answer is read has moved.
//
// THE ACTIVITY TAB IS GONE — CLIENT RULING, 2026-09-06, verbatim: "I don't want
// to have activity as a tab anywhere but on the footer, on top of the dates. On
// the right column, on Latest Activity, I would like some view or expand or
// whatever, and this would open a slide-in with all the activity", restated
// 2026-09-07 as "record activity — implement 'A · in the eyebrow row' across the
// app. kill all old activity tabs." The history is reached from the footer's own
// Latest activity column now (`RecordScreen`'s `activity` prop, below), which
// every detail in the app already draws; the feed and its fetch are untouched.
//
// AND THIS IS THE ONE SCREEN THE REMOVAL LEFT WITH A SINGLE TAB, so it has no
// strip at all. A tab strip is a choice between faces of one record; with one
// face there is no choice to offer, and a lone trigger under a full-width
// underline is exactly the furniture this header has had killed off it three
// times already (the eyebrow, the repeated type chip, the meta line). It is NOT
// the tickets collection's "the view selector is shown even with one view"
// (client, 2026-09-06): that control says other views exist and names which one
// you are in, so it earns its place at one; a lone tab says only the word
// already written above the panel it opens. The Overview panel is rendered
// directly.
//
// IT READS ONE ROW, NOT THE LIST. `selectableOne` is a single `WHERE id = ?`
// (one D1 round trip); the vocabulary list is a capped read plus an exact
// COUNT(*) (three). Reading the list and finding the row in JavaScript is the
// shape help-detail.tsx still has, and it costs five round trips to answer a
// question about one row — on a cold deep link that is the whole wait before
// first paint. The live layer patches this key by id (web/lib/live-resources.ts
// `selectable_data`), so a teammate's rename moves the open record without a
// refetch, which is the same guarantee the list already had.

import * as React from "react"

import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { Badge } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"

import { OverviewList } from "@/components/overview-list"
import { RecordScreen } from "@/components/record-chrome"
import { tenancy } from "@/lib/api"
import { selectableOneKey } from "@/lib/live-resources"
import { useRecordActivity } from "@/lib/use-record-activity"
import type { SelectableValue } from "@shared/types"
import { RecordMark } from "@shared/web/record-mark"
import { invalidate, useCached } from "@shared/web/store"
import { useT } from "@shared/web/language"

export function SelectableDetailScreen({ teamId, valueId }: { teamId: string; valueId: string }) {
  const t = useT()
  // Keyed by TEAM as well as row: switching teams must not hand the new team a
  // record read under the old one's fence, and the id alone cannot say which
  // team it was read for.
  const valueQ = useCached<SelectableValue | null>(selectableOneKey(teamId, valueId), () =>
    tenancy.selectableOne(valueId)
  )
  // STILL READ, WITH NO TAB TO READ IT IN. The footer's Latest activity column
  // is fed from this same hook (`RecordScreen`'s `activity` prop below), and so
  // is the slide-in the client asked for off that column — removing the tab
  // removed a PLACE, never the fetch. No remembered tab any more either: this
  // screen has one panel, so there is nothing to remember (web/lib/nav-memory.ts
  // simply never records a slot for it).
  const activity = useRecordActivity("selectable_data", valueId)

  const value = valueQ.data ?? null
  // A FAILED READ SAYS SO. `data` stays undefined when the fetch REJECTS as well
  // as when it has not answered yet, so a screen that only checks `undefined`
  // shows its loading skeleton for ever on any error — which is exactly what
  // shipped: one wrong column name in the door's SQL, a 500 on every call, and a
  // screen that span quietly instead of reporting it. The error is checked
  // FIRST, because "we asked and it went wrong" is a different sentence from
  // "we are still asking".
  // THE CHROME STAYS, ONLY THE PANEL SPINS (RecordChrome's law 4) — part of
  // the rollout from help-detail (73414c58). The error register also gets an
  // actual retry now: this used to be the one screen that told a reader to
  // refresh the page by hand rather than offering a button that does it.
  if (valueQ.error)
    return (
      <RecordScreen
        title={<Skeleton className="h-7 w-48" />}
        state="error"
        copy={{
          errorTitle: t("That didn't load."),
          errorDescription: t("Try again, and tell us if it keeps happening."),
        }}
        errorAction={
          <Button
            variant="secondary"
            onClick={() => invalidate(selectableOneKey(teamId, valueId))}
          >
            {t("Try again")}
          </Button>
        }
      />
    )
  if (valueQ.data === undefined)
    return <RecordScreen title={<Skeleton className="h-7 w-48" />} state="loading" />
  if (!value)
    return (
      <RecordScreen
        title={t("Dropdown value")}
        state="empty"
        copy={{ emptyTitle: t("That record no longer exists."), emptyDescription: "" }}
      />
    )

  // ALL FOUR ENRICHMENTS ARE OPTIONAL AND NULL ON MOST ROWS (shared/types.ts) —
  // a dropdown value is a label first. An empty string is what OverviewList
  // renders as "nothing here", so an unset field reads as blank rather than as
  // the word "null", and the row stays on the list so the shape of the record is
  // the same whichever value you opened.
  const overviewItems = [
    { label: t("Group"), value: value.type },
    { label: t("Option"), value: value.value },
    { label: t("Status"), value: value.active ? t("Active") : t("Inactive") },
    { label: t("One of the defaults"), value: value.isDefault ? t("Yes") : t("No") },
    { label: t("Emoji"), value: value.mark ?? "" },
    { label: t("German label"), value: value.nameDe ?? "" },
    { label: t("Description"), value: value.description ?? "" },
    {
      label: t("Standard days"),
      value: value.standardDays == null ? "" : String(value.standardDays),
    },
  ]

  return (
    <RecordScreen
      // R35 — the record's own face. A value's mark IS its face where it has
      // one (it is the glyph this very screen sets), and the initial stands in
      // where it has none, which is the same square in the same slot either way.
      leading={<RecordMark name={value.value} mark={value.mark} size="band" />}
      // NO EYEBROW — client ruling, 2026-09-03, verbatim: "I want you to remove
      // the eyebrow on the title on main screens. Remove that eyebrow, kill it."
      // The prop this line used to pass is deleted from `RecordScreen` itself
      // (record-chrome.tsx says why it had outlived the 2026-09-01 ruling that
      // took the eyebrow out of the full header); the breadcrumb above this
      // header is what names the record type now.
      // NO `collectionLabel` — client correction, 2026-08-31, verbatim:
      // "now it also show 'meeting' as a tag! thats not a tg but the eyebrow
      // remember. not only for meetings, but everywhere." This used to repeat
      // `t("Dropdown value")` a second time as a chip, directly under the
      // eyebrow that already says it.
      // THE SECOND PILL, WITH A COLOUR (client ruling, 2026-08-31: "the status
      // scheme is not only for tickets … map colors"). A dropdown value's
      // only two states are active and switched off — the account/wave/
      // process pattern: `archived` while inactive, wordless while active.
      // `value.type` is a classification, not a status, so it stays the
      // kit's plain, uncoloured `Badge`.
      chips={
        <>
          {!value.active && (
            <Badge variant="status" dot="archived">
              {t("Inactive")}
            </Badge>
          )}
          {value.type ? <Badge>{value.type}</Badge> : null}
        </>
      }
      title={value.value}
      // "DEFAULT" IS GONE FROM THIS LINE — CLIENT RULING, 2026-08-31,
      // VERBATIM: "what is this 3rd component in the title under the chips?
      // kill everywhere. chips is the last component of headers!" `status`
      // mapped to `RecordChrome`'s `meta`, drawn directly under the chips
      // row (`data-record-region="header"`). Not lost: it's already a row
      // in the Overview tab (`overviewItems`: "One of the defaults").
      // D7 / CHECKLIST 11.3 — who made it and when, now the kit's own ink
      // footer's Record column. Read by the single-row door only, which is
      // why the list screen has never shown it and this screen can.
      audit={{ createdByName: value.createdByName, createdAt: value.createdAt }}
      activity={activity}
    >
      <OverviewList items={overviewItems} />
    </RecordScreen>
  )
}
