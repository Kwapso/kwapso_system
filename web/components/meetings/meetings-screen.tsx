"use client"

// THE MEETINGS LIST — every conversation we have had or are about to have, newest first.
//
// ONE COLLECTION, PAGED (R14). A meeting is an event: the rows accumulate with
// ordinary use and none is ever curated away, because a cancelled call in March
// is still the answer to "didn't we speak in March?". So the door hands back a
// page and a cursor, and Load more appends — the same shape Tickets and the
// knowledge base have.
//
// The heading carries the exact server COUNT(*) (R16) because a sidebar page has
// no tab strip to badge; the arbitration context makes sure only one of the two
// ever renders it.
//
// MEETING TYPES ARE NO LONGER REACHED FROM HERE — the client's ruling, 16 Sep
// 2026, verbatim: *"On the main meetings screen at the bottom, there are
// meeting types, but this should not be there because this is already on the
// meeting settings, so remove it from there."* The link this screen used to
// draw at its own foot (labelled "Meeting types", redirecting to Settings ›
// Meetings › Choices since Task C, 15 Sep 2026) is deleted along with the
// `onPurposes`/`canReadPurposes`/`purposeCount` props that fed it — the
// destination is unchanged and still the ONLY door
// (`SECTION_HOSTED_ELSEWHERE.purposes`, shared/rules/registry.ts): Settings ›
// Meetings › Choices, `MeetingTypesPanel`. This screen no longer links to it,
// on purpose — a capability living in exactly one place, not zero.
//
// THE 16 SEP 2026 RULINGS, verbatim, on top of everything below: *"Also, the
// list view on meetings is completely wrong. I want it exactly like the one
// in tickets. What you did is something different. Once again, kill the
// emojis. Also, when they're in the name, just remove them, please."* Three
// changes: (1) the List body is `RecordTable` in the tickets shape now, never
// `shared/web/list-compat.tsx`'s `List` — see the row-shape comment further
// down; (2) a meeting title arriving from Google Calendar has every
// emoji/pictograph stripped at ingest (`workers/content/src/lib/meetings.ts`,
// `google-read.ts`) and again at display for rows already stored, so a title
// synced before this ruling is clean the next time it renders, not only the
// next time it syncs; (3) the Meeting types block above is gone, per the
// paragraph just above this one.
//
// THE EVENING RULINGS, 15 SEP 2026 — the SAME day the AM rebuild below swapped
// this screen's two-line List for a seven-column Table on every tab, itself
// superseded the next day by the 16 Sep ruling above. Three changes, read
// verbatim at "THE STRIP AND THE VIEWS" further down:
//
//   1 · TABLE IS GONE, AND LIST IS WHAT IT BECAME — her own words, tested a
//       few hours after the AM rebuild shipped: "On meetings this week,
//       replace the view table for list." / "On meetings, mine: replace
//       table for list. Same in everyone's." Every tab now offers List instead
//       of Table: This week is Agenda · Calendar · List, Mine is Calendar ·
//       List, Everyone's is List · Calendar — the same three-tabs-three-lists
//       shape the AM rebuild set up, one word swapped in each. STILL the
//       shape a day later — only what "List" DRAWS changed, 16 Sep 2026.
//
//   2 · THE IMPORT BUTTON IS GONE FROM THIS SCREEN — "On meetings, kill the
//       import." The toolbar's "Import CSV" button, the empty state's
//       secondary "Import a list" act and the `onImport` prop that fed both are
//       removed outright. The import DOOR is not: `/t/<teamId>/import/meetings`
//       still resolves, still reachable from Home's own generic "Import" tile
//       (`IMPORT_TARGET_LABEL.meetings`, web/components/deep-link/crumbs.ts) —
//       only the shortcut from this screen is gone.
//
//   3 · WEEK JOINS AS A VIEW, beside Calendar on every tab, now that the week
//       lane's `RecordWeek` (web/components/records/record-week.tsx) has
//       landed — each card carrying the meeting's start time. See "THE STRIP
//       AND THE VIEWS" further down for the exact per-tab order.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { defaultTabsConfig } from "@shared/web/screen-engine/tabs-view"
import { useRemembered } from "@shared/web/remembered"
import { toast } from "@shared/ui/components/sonner/sonner"
import { CalendarBlank, Columns, ListBullets, Plus, Rows } from "@shared/ui/foundations/icons"
import { type ScreenIntent } from "@shared/web/screen-engine/screen-renderer"
import { CollectionCreateActionProvider, CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"

import { ModuleSettingsGear } from "@/components/screens/module-settings-screen"
import { CollectionHeading } from "@/components/records/collection-heading"
import { GoogleSyncButton } from "@/components/knowledge/google-sync"
import { CountedAbove } from "@/components/records/counted-tabs"
import { AddButton, CollectionCard, type ToolbarViewSlot } from "@/components/deep-link/screen-bits"
import { LoadMore } from "@/components/records/load-more"
import { PagedFind } from "@/components/records/paged-find"
import { COLLECTION_SORTS, translatedSorts } from "@/lib/collection-sorts"
import { translatedFacets } from "@/lib/collection-filters"
import { MeetingFormDialog, type MeetingFormValues } from "@/components/meetings/meeting-form-dialog"
import { RecordCalendar, RecordAgenda, type CalendarEntry, type AgendaEntry } from "@/components/records/record-calendar"
import { RecordWeek } from "@/components/records/record-week"
import { RecordMark } from "@shared/web/record-mark"
import { RecordTable, type TableColumn } from "@/components/records/record-table"
import { defaultCollectionConfig, type CollectionConfig } from "@shared/web/screen-engine/config"
import { stripPictographs } from "@shared/text-clean"
import { shapeMeetingsList } from "@/components/deep-link/shape"
import { content as contentApi, tenancy } from "@/lib/api"
import { appsKey, listFetch, meetingsKey, meetingsMonthKey, totalKey } from "@/lib/live-resources"
import { usePermissions } from "@/lib/perms"
import { useGoogleCatchUp } from "@/lib/use-google-catch-up"
import type { Account, AppRow, Meeting, MeetingPurpose } from "@shared/types"
import { invalidate, useCached, useCachedValue } from "@shared/web/store"
import { formatCount } from "@shared/web/format-count"
import { formatDate, formatTime } from "@shared/web/format"
import { useLanguage } from "@shared/web/language"
import type { Language } from "@shared/i18n"

/* THE "EARLIER NOT LOADED" NOTICE IS GONE, and its absence is the fix.
 *
 * It said: "Earlier meetings haven't been loaded yet, so this month may not be
 * the whole of it", under a calendar drawing whatever the paged prefix happened
 * to hold. That was an honest apology for a real limitation — and the limitation
 * has been removed rather than explained. The calendar asks the DOOR for the
 * month it is showing (`meetingsMonthKey` / `listFetch.meetingsMonth`), so the
 * month on screen IS the whole of it and the sentence would now be false.
 *
 * A caveat left standing over a screen that no longer needs one teaches a person
 * to distrust a correct answer, which costs more than the sentence ever bought.
 */


/** WHAT "LIST" SHOWED HERE, 15 SEP (evening) → 16 SEP 2026 — one two-line row
 * per meeting, built off `shown` and drawn through `shared/web/list-compat.tsx`'s
 * `List`. GONE, and not kept dark: the client's own words on it, 16 Sep 2026,
 * verbatim — *"the list view on meetings is completely wrong. I want it
 * exactly like the one in tickets. What you did is something different."*
 *
 * WHAT "LIST" SHOWS NOW, on every tab that offers it: `RecordTable`
 * (`web/components/records/record-table.tsx`) in the tickets shape — the
 * flush, hairline table every screen but Tickets' own bespoke
 * `TicketRowsTable` draws through since R80/K22 (`documents/UI-RULEBOOK.md`).
 * Six columns, her own list: Name, Date, Time, Type (the meeting's own
 * Phosphor icon + word, `shapeMeetingsList`'s `purposeCell`), Attendees
 * (faces, then a `+N` count past three), Account (`accountCell` — a mark and
 * a name, the same split `shapeAccountsList` draws for its own table). No
 * column carries a `sort` — SORT STAYS IN THE TOOLBAR, the one
 * `<SortControl>` this screen has ever had, R78 already withdrawing it on
 * Calendar/Week/Agenda — matching Tickets' own `TicketRowsTable`, whose
 * headers "deliberately do not sort" (that file's own comment). `when`/`time`
 * are both formatted cells with no comparator anywhere, so both carry a
 * reasoned `DOOR_ORDERED` line in
 * `web/test/sorted-columns-declare-their-type.test.ts` rather than a
 * `sortType` that would claim a comparison nobody runs. */

/* ── THE STRIP AND THE VIEWS, 2026-09-09 → 2026-09-15 (evening) ──────────────
 *
 * THE FIRST RULING, 2026-09-09, in her own words: *"tabs for meetings: this
 * week, mine, all"*. Told that this would delete the Calendar tab and that
 * "Mine" did not exist, she answered both at once: *"i was in the room, and
 * calendar as a view"*. That gave This week · Mine · All, every tab read as a
 * list or a month grid through one shared view slot. SUPERSEDED BELOW — kept
 * here for the history, not for the shape.
 *
 * THE SECOND RULING, 2026-09-15 (AM), verbatim: *"In meetings, the tabs that I
 * would like are: This week / Mine / and: Replace 'All' with 'Everyone's'.
 * The views I want in 'This week' are: Agenda chronological (this is only for
 * mine, unless I say so, and it's always filtered to mine). Same goes for
 * tasks and meetings. Again, on 'This week', I want the views: Agenda /
 * Calendar / Table. On the 'Mine' tab, this shows all of my meetings, past
 * and present. I also want the views: Calendar / Table. On 'Everyone's', I
 * want the views: Table / Calendar."*
 *
 * FOUR CHANGES, not one.
 *
 * 1 · THE THIRD TAB IS RENAMED, NOT REBUILT. "All" became "Everyone's" on its
 *     label only — `view=all` is unchanged on the wire, so nothing downstream
 *     of the door had to learn a new word. STILL TRUE.
 *
 * 2 · "THIS WEEK" IS NOW ALWAYS MINE. It used to be the agency's whole week;
 *     this ruling folds Mine's own attendance predicate into it PERMANENTLY —
 *     the tab reads mine-this-week, never the agency's this-week, on every
 *     body it can be read in. The door answers a new combined view,
 *     `view=mine-week` (`workers/content/src/lib/meetings.ts`'s own `whereFor`
 *     carries the rule and what it costs). Plain `week` stays, unchanged and
 *     un-mine'd, because `routes/insights.ts`'s own dashboard tile still asks
 *     for the agency's whole week and is not this screen. STILL TRUE.
 *
 * 3 · EACH TAB OFFERS ITS OWN BODIES, not one switch shared by all three —
 *     remembered PER TAB (`meeting-view-week` / `meeting-view-mine` /
 *     `meeting-view-all`) rather than in one slot, because switching tabs
 *     must never strand a reader on a body their new tab does not even offer.
 *     STILL TRUE; the OPTION LISTS themselves changed a few hours later, point
 *     4 below.
 *
 * 4 · "LIST" WAS RETIRED IN FAVOUR OF TABLE — for a few hours. She asked for
 *     Table, not List, so the two-line list this screen used to draw through
 *     the library engine (`ScreenRenderer`) was retired outright, and every
 *     tab that offered a Table drew the SAME seven-column `RecordTable`
 *     (Name/Title, Date, Time, Meeting type, Department, Attendees, Account).
 *     SUPERSEDED BELOW, the same evening — kept here for the history.
 *
 * THE THIRD RULING, 2026-09-15 (evening), tested a few hours after the AM
 * rebuild shipped, verbatim: *"On meetings this week, replace the view table
 * for list."* / *"On meetings, mine: replace table for list. Same in
 * everyone's."* TABLE IS GONE, and List is what it became a second time —
 * every tab that offered Table now offers List instead, in the exact same
 * slot her AM ruling gave it (first-named is still that tab's own default):
 * This week is Agenda / Calendar / List; Mine is Calendar / List; Everyone's
 * is List / Calendar. THE SLOT NAME STOOD, ONLY WHAT IT DRAWS MOVED AGAIN THE
 * NEXT DAY — 16 Sep 2026, the header block above carries her words in full:
 * `List` is `RecordTable` in the tickets shape now (R80/K22), never
 * `shared/web/list-compat.tsx`'s `List`, which drew a two-line row for
 * exactly one day.
 *

 * ALONGSIDE IT, THE SAME EVENING: *"On meetings, kill the import."* The
 * toolbar's "Import CSV" button, the empty state's "Import a list" act and
 * the `onImport` prop that fed both are gone from this screen — the import
 * DOOR is not: `/t/<teamId>/import/meetings` still resolves, reachable from
 * Home's own generic "Import" tile.
 *
 * "AGENDA" IS THE KIT'S OWN `Agenda` (shared/ui/components/agenda/agenda.tsx,
 * CH19 view 10) — day headings over a time column — never a hand-rolled
 * grouped list: it already exists, so drawing a second one would be a second
 * answer to a settled drawing. Its row is three slots (time / title / who);
 * Meeting type has no fourth column of its own, so it rides inside the title
 * as a quiet second line, and Attendees is the "who".
 *
 * THE VIEW SLOT STAYS `ToolbarViewSlot` — a CONFIG, never a node — the pattern
 * Tickets' `viewSlot` (`tickets-collection.tsx`) set and this file followed on
 * 2026-09-09; only WHICH views it lists now depends on the open tab.
 *
 * WEEK, WIRED — the fourth ruling, once the week lane's `RecordWeek`
 * (`web/components/records/record-week.tsx`) landed: beside Calendar on
 * every tab, each card carrying the meeting's start time
 * (`CalendarEntry.time`). This week: Agenda / Calendar / Week / List; Mine:
 * Calendar / Week / List; Everyone's: List / Calendar / Week. `MeetingsWeek`
 * (below `MeetingsAgenda`) builds the rows and says why it reads `shown`
 * directly rather than a dedicated week-scoped door read.
 */

/** THE CALENDAR VIEW'S OWN MONTH READ — its own component, and not a `const`
 * inside `<PagedFind>`'s `children`, because `children` there is a plain
 * render-prop CALLBACK rather than a component (paged-find.tsx's own header
 * explains why it has to stay one), and a hook cannot live inside one: it would
 * be attributed to `PagedFind`'s own fiber rather than this screen's, which
 * happens to work only for as long as the same hooks fire in the same order
 * every render — exactly the kind of accident this codebase does not ship. A
 * real, capitalised component gives `useCached` a fiber of its own.
 *
 * THE MONTH ITSELF is its own read for the reason `meetingsMonthKey` explains at
 * length: the meetings list pages newest-first, so the month on screen is very
 * often not in the page in hand at all. `null` until the calendar reports (it
 * does so on mount), so the first render asks for nothing rather than guessing.
 *
 * AND NOW NARROWED — `narrowing` is the meetings list's own search box +
 * facets (`q`, `accountId`, `purposeId`), the exact same question `<PagedFind>`
 * is already asking of the whole meetings list, forwarded onto this door call
 * too. Before this the toolbar above the grid was real and visibly did
 * nothing: typing a name narrowed the list and the table and left the grid
 * drawing the whole month regardless, because this read had never been told
 * what was typed. */
function MeetingsMonthCalendar({
  teamId,
  narrowing,
  emptyText,
  onOpen,
}: {
  teamId: string
  /** `{}` when nothing is being asked — the door then answers the whole month,
   * exactly as before this existed. */
  narrowing: Record<string, string>
  /** "Nothing matched." while a search is on and it answers nothing at all,
   * anywhere — the list/table views' own `found.emptyText`, so all three tabs
   * say the identical sentence about a failed search. `undefined` the rest of
   * the time, so the grid's own "nothing this month" keeps saying that. */
  emptyText?: string
  onOpen: (id: string) => void
}) {
  const { t, lang } = useLanguage()
  const [calendarMonth, setCalendarMonth] = React.useState<string | null>(null)
  const monthQ = useCached<Meeting[]>(
    calendarMonth ? meetingsMonthKey(teamId, calendarMonth, narrowing) : null,
    () => listFetch.meetingsMonth(teamId, calendarMonth as string, narrowing)
  )
  // THE CALENDAR'S OWN ROWS — the month (and question) the door answered for,
  // shaped the same way the list is so a meeting reads identically in both.
  const monthRows = monthQ.data ?? []
  const monthShaped = shapeMeetingsList(monthRows, lang)
  const startsAtById = new Map(monthRows.map((m) => [m.id, m.startsAt]))
  const calendarEntries: CalendarEntry[] = (monthShaped.rows ?? []).map((r) => ({
    id: String(r.id),
    day: String(r.startsOn ?? ""),
    title: String(r.name ?? ""),
    accent: String(r.state ?? ""),
    detail: [formatTime(startsAtById.get(String(r.id)), lang), String(r.client ?? "")]
      .filter(Boolean)
      .join(" · "),
  }))
  return (
    <RecordCalendar
      entries={calendarEntries}
      onOpen={onOpen}
      emptyText={
        monthQ.data === undefined
          ? t("Reading this month…")
          : (emptyText ?? t("Nothing in Meetings this month."))
      }
      onMonthChange={setCalendarMonth}
    />
  )
}

/** THE AGENDA — This week's own default body (ruling, 2026-09-15): the week's
 * meetings, chronological, grouped by day. Drawn through `RecordAgenda`
 * (web/components/records/record-calendar.tsx) rather than the kit's own
 * `Agenda` directly — the "ONE CALENDAR" law (`web/test/rules.test.ts`'s
 * `one-calendar`) requires every screen that wants that kit component to reach
 * it through that one host file, so a record on it is never a picture with no
 * click (UI-GAPS #22). This file only SHAPES the rows into `AgendaEntry[]`;
 * the grouping, the day headings, "Today" and the open-wiring are that file's.
 *
 * DOES NO FILTERING OF ITS OWN. `rows` is whatever `weekQ` (view=mine-week)
 * already answered — always this reader's own week, never the agency's — so
 * this component only shapes what it is handed; the same separation
 * `MeetingsMonthCalendar` above keeps between the door's question and the
 * grid's own drawing.
 *
 * THE KIT ROW IS THREE SLOTS (time / title / who), and the client asked for
 * four facts (day headings, time, title, type, attendees). Meeting type has no
 * column of its own, so it rides inside `title` as a quiet second line — the
 * same move `record-calendar.tsx`'s own month agenda makes to carry its accent
 * dot — and Attendees is `who`. A meeting with no guest list (typed in, not
 * synced) says nothing there rather than inventing a name to fill the slot. */
function MeetingsAgenda({
  rows,
  lang,
  onOpen,
  emptyText,
}: {
  rows: Meeting[]
  lang: Language
  onOpen: (id: string) => void
  emptyText: string
}) {
  const entries: AgendaEntry[] = rows.map((m) => ({
    id: m.id,
    day: m.startsAt.slice(0, 10),
    time: formatTime(m.startsAt, lang),
    dateTime: m.startsAt,
    // A CANCELLED meeting still says so here — the same word `shape.tsx`'s
    // own `shapeMeetingsList` appends to the calendar's title and to the
    // List body's `name`/`nameText`, unwrapped there too (a template
    // literal, not a sentence of its own for `t` to translate). AND THE SAME
    // STRIP — a synced title's pictograph is removed at display here too
    // (16 Sep 2026 ruling, `stripPictographs`'s own header), the same one
    // `shapeMeetingsList` runs before building its own `name`.
    title: (
      <span className="flex min-w-0 flex-col">
        <span className="min-w-0 truncate">
          {m.active ? stripPictographs(m.title) : `${stripPictographs(m.title)} (cancelled)`}
        </span>
        {m.purposeName ? (
          <span className="text-muted-foreground min-w-0 truncate text-xs">{m.purposeName}</span>
        ) : null}
      </span>
    ),
    who: m.googleGuests?.length ? m.googleGuests.map((g) => g.name || g.email).join(", ") : undefined,
  }))
  return <RecordAgenda entries={entries} onOpen={onOpen} emptyText={emptyText} />
}

/** WEEK — the fourth ruling, once the week lane's own `RecordWeek`
 * (web/components/records/record-week.tsx) landed: a view beside Calendar on
 * every tab, each card carrying the meeting's start time as its eyebrow
 * (`CalendarEntry.time`, that file's own contract — the SAME extension point
 * `MeetingsMonthCalendar`'s own entries above leave unset, because the month
 * grid has no eyebrow to carry it in).
 *
 * READS `shown` DIRECTLY, the same choice `MeetingsAgenda` makes and for the
 * same reason: this screen has no week-scoped door (`listFetch.meetingsMonth`
 * is the one scoped read it owns, built for the Calendar view specifically),
 * and building one is a bigger decision than wiring a view. On This week,
 * `shown` already IS the open week's own rows (`weekQ`, `view=mine-week`), so
 * `RecordWeek` draws it correctly; on Mine and Everyone's it draws whichever
 * page is loaded, exactly the same bound the List/Table view above it has
 * always drawn under — pressing `RecordWeek`'s own Prev/Next steps outside
 * that page shows an empty week rather than fetching further out, the same
 * gap Calendar's own month grid had until `MeetingsMonthCalendar` was built
 * for it specifically. Not fixed here on purpose — flagged, the same way
 * that gap once was, rather than silently building a second scoped read this
 * ruling never asked for. */
function MeetingsWeek({
  rows,
  lang,
  onOpen,
}: {
  rows: Meeting[]
  lang: Language
  onOpen: (id: string) => void
}) {
  const entries: CalendarEntry[] = rows.map((m) => {
    const title = stripPictographs(m.title)
    return {
      id: m.id,
      day: m.startsAt.slice(0, 10),
      // A CANCELLED meeting still says so — the same suffix `MeetingsAgenda`
      // and this screen's own List/Table rows both append, over the same
      // stripped title (16 Sep 2026 ruling, `stripPictographs`'s own header).
      title: m.active ? title : `${title} (cancelled)`,
      time: formatTime(m.startsAt, lang),
    }
  })
  return <RecordWeek entries={entries} onSelect={(entry) => onOpen(entry.id)} />
}

/** ONE SHAPED MEETING ROW, read by the List body's own `RecordTable`
 * (`shapeMeetingsList`'s own contract, `web/components/deep-link/shape.tsx`).
 * The `Record<string, unknown>` intersection is what lets `RecordTable`'s own
 * `T extends TableRowData` accept it without a second, looser cast at the
 * call site — the same shape `ShapedAccountRow` gives `accounts-screen.tsx`
 * one file over. */
type ShapedMeetingRow = Record<string, unknown> & {
  id: string
  name: string
  nameText: string
  when: string
  time: string
  purposeCell: React.ReactNode
  attendeesCell: React.ReactNode
  accountCell: React.ReactNode
  ref: string | null | undefined
}

/** THE TABLE'S SIX COLUMNS, in her own order (16 Sep 2026 ruling, the header
 * block above carries her words in full): "I want it exactly like the one in
 * tickets" — Name, Date, Time, Type, Attendees, Account.
 *
 * NO COLUMN CARRIES A `sort`. SORT STAYS IN THE TOOLBAR — the one
 * `<SortControl>` this screen has ever had (`translatedSorts("meetings", t)`
 * above), matching Tickets' own `TicketRowsTable`, whose headers
 * "deliberately do not sort" (that file's own comment) — a plain header here
 * is the honest one, not a second, disagreeing order control bolted onto a
 * table whose rows the door already arranged.
 *
 * `when`/`time` are still both formatted cells with nothing comparing them —
 * `web/test/sorted-columns-declare-their-type.test.ts`'s own `DOOR_ORDERED`
 * carries the reasoned line for each, because that census reads every column
 * key in a `<RecordTable` file against every formatted shaper cell of the
 * same name, whether or not the column is clickable. */
function meetingsTableColumns(t: (english: string) => string): TableColumn[] {
  return [
    { key: "name", label: t("Name"), searchKey: "nameText" },
    { key: "when", label: t("Date") },
    { key: "time", label: t("Time") },
    {
      key: "purposeCell",
      label: t("Type"),
      searchKey: "purpose",
      render: (v) => (v == null ? "—" : undefined),
    },
    {
      key: "attendeesCell",
      label: t("Attendees"),
      searchKey: "attendeesText",
      render: (v) => (v == null ? "—" : undefined),
    },
    { key: "accountCell", label: t("Account"), searchKey: "client" },
  ]
}

export function MeetingsScreen({
  teamId,
  total,
  canCreate,
  onIntent,
}: {
  teamId: string
  /** the exact server total (R16) — never the loaded page's length */
  total: number | undefined
  canCreate: boolean
  // NO `onImport` ANY MORE — the client's ruling, 2026-09-15 evening: "On
  // meetings, kill the import." This screen's own toolbar button, the empty
  // state's "Import a list" act and the prop that fed both are gone; the
  // import DOOR itself is untouched (`/t/<teamId>/import/meetings`, reachable
  // from Home's own generic "Import" tile) — see the header block above.
  //
  // NO `purposeCount`/`canReadPurposes`/`onPurposes` ANY MORE EITHER — the
  // client's ruling, 16 Sep 2026: "On the main meetings screen at the bottom,
  // there are meeting types, but this should not be there because this is
  // already on the meeting settings, so remove it from there." This screen's
  // own "Meeting types" link is gone with the three props that fed it; the
  // destination (Settings › Meetings › Choices, `MeetingTypesPanel`) is
  // unchanged and is now the ONLY door — see the header block above.
  onIntent: (intent: ScreenIntent) => void
}) {
  const { t, lang } = useLanguage()
  const meetingsQ = useCached<Meeting[]>(meetingsKey(teamId), () => listFetch.meetings(teamId))
  // The two pickers the form needs. Both are read only when the dialog can be
  // opened at all — a person who cannot create a meeting has no use for either.
  const accountsQ = useCached<Account[]>(canCreate ? `accounts:${teamId}` : null, () =>
    tenancy.accounts().then((r) => r.accounts)
  )
  // WHICH SYSTEM A MEETING WAS ABOUT. Same condition as the accounts above, and
  // out of the SAME bounded cache the apps page holds — an agency has tens of
  // apps, so the picker costs nothing anybody has not already paid.
  const appsQ = useCached<AppRow[]>(canCreate ? appsKey(teamId) : null, () => listFetch.apps(teamId))
  // THE PURPOSES ARE READ ONLY FOR THE CREATE FORM'S OWN PICKER NOW — the
  // "Meeting types" link's own count read (`canReadPurposes`) is gone with
  // the link itself (16 Sep 2026 ruling, the header block above).
  const purposesQ = useCached<MeetingPurpose[]>(canCreate ? `purposes:${teamId}` : null, () =>
    listFetch.purposes(teamId)
  )
  const [open, setOpen] = React.useState(false)
  // THE THREE TABS (client ruling, 2026-09-09, renamed 2026-09-15 — the block
  // above this component carries her words both times). This week is past AND
  // upcoming, because "this week" is the week somebody is in rather than the
  // days left of it, and — since 2026-09-15 — always MINE; Mine is every
  // meeting this person was in the room for, past and present; and Everyone's
  // shows the agency's whole list, defaulting to List (ruling, 2026-09-15
  // evening — Table stood here for a few hours, see the header block above).
  //
  // A NEW SLOT NAME (`meeting-tab`, not `view`) because the VALUES changed: the
  // old slot could be holding "calendar", which is no longer a tab and would
  // strand a returning reader on a strip with nothing selected. Remembered with
  // the screen — see web/lib/nav-memory.ts.
  //
  // `revive` IS THE GUARD, and it is the shape `useRemembered` documents for
  // exactly this: a remembered value is data about a world that has moved, so
  // anything that is not one of the three tabs lands on the default instead of
  // selecting nothing. The VALUE stored is still `"week" | "mine" | "all"` —
  // the 2026-09-15 rename only touched the THIRD tab's label, never its door
  // value (see the header block above), so no revive change was needed for it.
  const [tab, setTab] = useRemembered<"week" | "mine" | "all">("meeting-tab", "week", (r) =>
    r === "week" || r === "mine" || r === "all" ? r : undefined
  )
  // …AND THE BODY, ONE CHOICE PER TAB (ruling, 2026-09-15 — see the header
  // block above). A single shared slot could not survive the redesign: the
  // three tabs no longer offer the same bodies, so "the last body somebody
  // picked" is meaningless without knowing which tab they picked it ON. Each
  // default is the FIRST view she named for that tab, the same rule the old
  // single slot followed ("start with list view", 2026-09-06) generalised to
  // three slots instead of one.
  const [weekMode, setWeekMode] = useRemembered<"agenda" | "calendar" | "week" | "list">(
    "meeting-view-week",
    "agenda",
    (r) => (r === "agenda" || r === "calendar" || r === "week" || r === "list" ? r : undefined)
  )
  const [mineMode, setMineMode] = useRemembered<"calendar" | "week" | "list">(
    "meeting-view-mine",
    "calendar",
    (r) => (r === "calendar" || r === "week" || r === "list" ? r : undefined)
  )
  const [allMode, setAllMode] = useRemembered<"list" | "calendar" | "week">(
    "meeting-view-all",
    "list",
    (r) => (r === "list" || r === "calendar" || r === "week" ? r : undefined)
  )
  const mode = tab === "week" ? weekMode : tab === "mine" ? mineMode : allMode
  const weekTotal = useCachedValue<number>(totalKey("meetings-week", teamId))
  // MINE'S OWN EXACT COUNT (R16), primed by the read below out of the same
  // response whose rows the tab shows — the door counted the question it listed.
  const mineTotal = useCachedValue<number>(totalKey("meetings-mine", teamId))
  // THIS WEEK IS ITS OWN READ (19 Aug 2026), AND NOW MINE'S OWN QUESTION TOO
  // (2026-09-15) — the door's week, not a browser filter over the meetings
  // list's newest page. The comment that used to sit on that filter argued the
  // week was inside page one for any agency that had not held fifty meetings
  // since Monday; the meetings list is ordered by start time DESCENDING, so
  // page one is the furthest-out FUTURE, and once repeating calendar entries
  // were swept in it ran from June 2027 to August 2027 with nothing of this week
  // in it. Badge 11, list empty. A client-side filter underneath a server
  // COUNT(*) is the arrangement R16 exists to forbid, and the search box on this
  // very screen had already been moved to the door for that reason.
  //
  // `view=mine-week` (not plain `week`) BECAUSE THE TAB IS ALWAYS MINE NOW —
  // her ruling, verbatim, on the Agenda view: "it's always filtered to mine".
  // The header block above says why that is a fifth door VIEW rather than a
  // second predicate bolted on in the browser: `whereFor`
  // (workers/content/src/lib/meetings.ts) already treats `week` and `mine` as
  // two independent clauses over the SAME filter object, so the combined
  // question is one more named literal, not a new shape.
  //
  // It costs one extra read while this tab is showing, and there is no way round
  // it: the week's rows are genuinely not in the page the meetings list hands back.
  // Only while it is showing — the other two tabs read their own lists.
  //
  // WHICH LIST THE RESTING SCREEN IS STANDING ON, as an argument rather than as
  // a second name for the key: `meetingsKey(teamId, weekView)` is written out at
  // the cursor sidecar, the find bar and both Load more buttons, because R14's
  // and R15's checks read the control's OWN props for this collection's key —
  // and they are right to. A const holding the resolved key satisfies a
  // reader and nothing
  // else; the four censuses went red on it within one run.
  const weekView = tab === "week" ? ("mine-week" as const) : undefined
  const weekQ = useCached<Meeting[]>(weekView ? meetingsKey(teamId, weekView) : null, () =>
    listFetch.meetings(teamId, "mine-week")
  )
  // MINE IS ITS OWN READ, FOR THE WEEK'S OWN REASON AND ONE MORE.
  //
  // The reason above applies unchanged: the meetings list is ordered by start
  // time DESCENDING and it PAGES, so page one is the furthest-out FUTURE — the
  // meetings a person actually sat in are scattered through two years of history
  // and are not in it. Narrowing the loaded page would give a list that
  // disagreed with its own badge, which is the fault `weekQ` was written to fix.
  //
  // AND IT IS NOT GATED ON THE TAB, where the week's read is. The badge on a tab
  // nobody has opened still has to be exact (R16), and unlike the week — whose
  // total rides the main response as `weekTotal` — there is no `mineTotal` on
  // the wire: that count is a full scan of the meetings table (a LIKE over a
  // JSON blob cannot use an index), so putting it on every meetings response
  // would charge every search and every Load more for a number one tab away.
  // routes/meetings.ts states the trade in full. So this read pays it once, on
  // arrival, and its own `total` IS the badge.
  //
  // IT ASKS THE SAME DOOR THE TWO READS ABOVE ASK, and now through the same
  // receiver: R56's census groups by the FETCHER's receiver, so while this read
  // spelled `contentApi.meetings` itself it was a second id for one door. The
  // reasoned line for this component (`TWO_READS_ONE_DOOR`) says why the
  // collection and the week are two questions; Mine is a third of exactly that
  // kind — a slice the door resolves and the browser cannot — and it now sits
  // beside them in `listFetch.meetings`, which is where its key, its total and
  // its cursor sidecar live too (R14/R16).
  const mineQ = useCached<Meeting[]>(meetingsKey(teamId, "mine"), () =>
    listFetch.meetings(teamId, "mine")
  )
  // 9.7 — the repeating entries. `ahead` is the instances beyond the four-week
  // horizon: shown, never stored, because one that far out can still be moved or
  // called off in Google before it happens.
  const [ahead, setAhead] = React.useState<{ eventId: string; title: string; startsAt: string }[]>([])
  // HAS THE WALK OVER THE WHOLE CALENDAR FINISHED? Null until somebody presses,
  // because the honest thing to say before the first press is nothing.
  const [caughtUp, setCaughtUp] = React.useState<boolean | null>(null)
  const { can } = usePermissions(teamId)

  // FRESHNESS ON ARRIVAL (the owner's "a way to sync more often to make it feel
  // instantaneous"). The shell already does this once when the app opens; a
  // person who walks here two hours later was reading a two-hour-old answer on a
  // screen that looks live. The hook's own header explains why calling it from a
  // dozen screens is cheap: the five-minute floor is the DOOR's, so an extra
  // mount is a round trip answered out of the last sweep, never an extra call to
  // Google.
  useGoogleCatchUp(teamId, can)


  async function add(values: MeetingFormValues) {
    await contentApi.createMeeting({
      title: values.title,
      startsAt: values.startsAt,
      endsAt: values.endsAt || undefined,
      accountId: values.accountId || undefined,
      appId: values.appId || undefined,
      purposeId: values.purposeId || undefined,
      location: values.location || undefined,
      agenda: values.agenda || undefined,
      notes: values.notes || undefined,
    })
    invalidate(meetingsKey(teamId))
    invalidate(meetingsKey(teamId, "mine-week"))
    // …AND MINE, because a meeting you just wrote down is one you were in: the
    // door's fallback puts a typed-in meeting with no guest list into its
    // creator's Mine (lib/meetings.ts), so leaving this out would show the new
    // row on two tabs out of three.
    invalidate(meetingsKey(teamId, "mine"))
    toast.success(t("It's in Meetings."))
  }

  // ANY OF THE THREE READS FAILING IS THE SAME SENTENCE — whichever list this
  // tab is standing on, what the reader could not get is the meetings.
  if (meetingsQ.error || weekQ.error || mineQ.error)
    return (
      <ShapeStateBody
        shape="collectionScreen"
        state="error"
        copy={{ errorTitle: t("Couldn't load the meetings.") }}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              meetingsQ.refresh()
              weekQ.refresh()
              mineQ.refresh()
            }}
          >
            {t("Try again")}
          </Button>
        }
      />
    )
  if (meetingsQ.data === undefined) return <Skeleton variant="list" lines={4} />
  const loaded = meetingsQ.data
  const weekRows = weekQ.data
  const mineRows = mineQ.data

  /** WHAT AN EMPTY TAB SAYS — one sentence per tab, decided once so the list
   * body and the month grid can never say two different things about the same
   * empty answer. Each one is about the QUESTION the tab asks: a quiet week is
   * not "nothing in Meetings yet", and neither is a person who was in no
   * meetings, and the collection-wide sentence under either would be a
   * whole-history claim a seven-day tab has no business making (2026-09-03
   * audit made exactly that correction for the week). */
  const tabEmpty =
    tab === "week"
      ? t("Nothing in Meetings this week.")
      : tab === "mine"
        ? t("Nothing in Meetings you were in.")
        : t("Nothing in Meetings yet.")
  // THE SAME THREE SENTENCES, UNTRANSLATED — the List body's own `RecordTable`
  // wraps its rows in `CollectionFrame` (record-table.tsx), whose zero-row
  // register calls `t(config.emptyText)` ITSELF (`collection-frame.tsx`), the
  // same seam `withDataDrivenCollection` feeds an untranslated recipe sentence
  // through on every other paged table (accounts-screen.tsx, inputs-screen.tsx).
  // Handing it the already-translated `tabEmpty` above would ask `t()` to
  // resolve a catalogue entry keyed on its own output — a lookup nothing wrote
  // a translation for, so `t()`'s own English fallback would show even to a
  // German reader. Kept as a second ternary rather than reused, on purpose:
  // R28's extraction script reads a literal string inside `t("…")`, never a
  // variable, so the same three sentences have to be spelled twice for the one
  // call site that must NOT translate them itself.
  const tabEmptyRaw =
    tab === "week"
      ? "Nothing in Meetings this week."
      : tab === "mine"
        ? "Nothing in Meetings you were in."
        : "Nothing in Meetings yet."

  /** THE BODY SWITCH — WHICH BODIES DEPENDS ON THE TAB (ruling, 2026-09-15 —
   * the header block above carries her words). A CONFIG and never a node,
   * which is the shape `PagedFind` takes and R53 requires, so this row's fixed
   * slot order (search → filters → sort → view → actions) places it and no
   * call site can put it somewhere else. The pattern is Tickets' own
   * `viewSlot` — read that one before changing this one; there is deliberately
   * only one of these in the app.
   *
   * THE OPTIONS ARE THE TAB'S OWN LIST, in her order (first = default, already
   * enforced by `weekMode`/`mineMode`/`allMode`'s own initial values above) —
   * This week: Agenda, Calendar, Week, List; Mine: Calendar, Week, List;
   * Everyone's: List, Calendar, Week — Week beside Calendar on every tab, the
   * fourth ruling, once the week lane's `RecordWeek` landed (`MeetingsWeek`
   * above says how its rows are built). `onValueChange` writes to whichever
   * of the three remembered slots this tab owns, never the other two, so
   * switching tabs cannot cross-contaminate a choice made on a different
   * one. */
  const viewSlot: ToolbarViewSlot = {
    views:
      tab === "week"
        ? [
            { value: "agenda", label: t("Agenda"), icon: <Rows className="size-4" /> },
            { value: "calendar", label: t("Calendar"), icon: <CalendarBlank className="size-4" /> },
            { value: "week", label: t("Week"), icon: <Columns className="size-4" /> },
            { value: "list", label: t("List"), icon: <ListBullets className="size-4" /> },
          ]
        : tab === "mine"
          ? [
              { value: "calendar", label: t("Calendar"), icon: <CalendarBlank className="size-4" /> },
              { value: "week", label: t("Week"), icon: <Columns className="size-4" /> },
              { value: "list", label: t("List"), icon: <ListBullets className="size-4" /> },
            ]
          : [
              { value: "list", label: t("List"), icon: <ListBullets className="size-4" /> },
              { value: "calendar", label: t("Calendar"), icon: <CalendarBlank className="size-4" /> },
              { value: "week", label: t("Week"), icon: <Columns className="size-4" /> },
            ],
    value: mode,
    onValueChange: (v: string) => {
      if (tab === "week")
        setWeekMode(v === "calendar" ? "calendar" : v === "week" ? "week" : v === "list" ? "list" : "agenda")
      else if (tab === "mine") setMineMode(v === "week" ? "week" : v === "list" ? "list" : "calendar")
      else setAllMode(v === "calendar" ? "calendar" : v === "week" ? "week" : "list")
    },
  }

  return (
    <CountedAbove active>
    <div className="flex flex-col gap-6">
      {/* R16: the strip below badges two exact server counts, so the heading
          stands down through the arbitration context rather than saying a
          number twice. */}
      {/* THE GEAR (R61) — the transcript capture and the billable time it
          writes are listed on this module's own settings page (R70). */}
      <CollectionHeading sectionKey="meetings" total={total} action={<ModuleSettingsGear teamId={teamId} segment="meetings" />} />

      {/* R14's other half: the meetings list pages, and the meeting somebody digs for is
          the OLD one — so the search box is answered by the door, over the whole
          meetings list rather than the page in the browser. */}
      {/* WHICH LIST THE RESTING SCREEN IS STANDING ON — written out at both
          controls rather than hoisted into a const, for the reason `weekView`'s
          own note gives: R14's and R15's censuses read the control's OWN props
          for this collection's key, and a const holding the resolved key
          satisfies a reader and nothing else. This note sits ABOVE the tag
          because `paged-search`'s census reads the first 300 characters after
          `<PagedFind` looking for `meetingsKey(` — a comment between the two
          pushes the key out of its window. */}
      <PagedFind<Meeting>
        listKey={tab === "mine" ? meetingsKey(teamId, "mine") : meetingsKey(teamId, weekView)}
        placeholder={t("Search meetings…")}
        matches={{
          none: t("No meetings match"),
          one: t("1 meeting matches"),
          many: t("{count} meetings match"),
        }}
        sorts={translatedSorts("meetings", t)}
        defaultSort={COLLECTION_SORTS.meetings.defaultSort}
        // R50 — the resting (unfiltered, `view: "all"`) read's own row count.
        restingEmpty={loaded.length === 0}
        // THE MEETINGS LIST'S FILTERS, asked of the door. They were the frame's until
        // 18 Aug 2026 — so "who we met" narrowed the fifty most recent meetings
        // and said nothing about the two years behind them, which is the exact
        // objection the comment above makes about the search box.
        //
        // The two picker-backed ones are filled from the caches this screen
        // already reads for its form, so they appear for whoever can see those
        // lists and are DROPPED rather than drawn empty for whoever cannot — the
        // same rule the bounded recipes follow about a facet with no options.
        facets={translatedFacets("meetings", t, {
          // THE ACCOUNT, WEARING ITS OWN FACE — client ruling, 2026-09-09: "for
          // accounts include icon in select components and filters". The
          // tickets toolbar's own Account facet has drawn one since 2026-09-07
          // and this one drew a word, so the same record was a picture on one
          // screen's filter and a bare name on the next.
          //
          // `size="choice"` is the dense mark size every picker option and every
          // other marked facet uses — the same one the app facet beside it on
          // the tickets toolbar takes — so nothing here decides a new size.
          //
          // AND IT IS DRAWN FOR EVERY ROW, never only for the rows that have a
          // logo: `RecordMark` falls through to the account's own initial on
          // `bg-muted`, which is the deliberate placeholder rather than an empty
          // box. That matters more here than anywhere: on staging only 48 of 134
          // accounts carry a picture, so the fallback IS the common case and a
          // mark drawn only where the data happened to be would be a ragged
          // column of two thirds nothing.
          accountId: (accountsQ.data ?? []).map((a) => ({
            value: a.id,
            label: a.name,
            mark: <RecordMark picture={a.logoUrl} name={a.name} size="choice" />,
          })),
          purposeId: (purposesQ.data ?? [])
            .filter((pp) => pp.active)
            .map((pp) => ({ value: pp.id, label: pp.name })),
        })}
        fetchPage={(query, cursor) =>
          contentApi
            .meetings({
              // THE QUESTION ITSELF, spread whole and FIRST: `listQuery`
              // forwards every key, so a filter cannot be lost on the way to
              // the door and `view` below (never present in `query` — no
              // facet in `translatedFacets("meetings", …)` is named `view`)
              // cannot be shadowed by it either.
              ...query,
              cursor,
              // WHICH LIST THIS PAGE COMES OUT OF, and it is two questions
              // wearing one function.
              //
              // A FIND searches the WHOLE meetings list and outranks the tab —
              // the meeting somebody digs for is the old one, and a search
              // fenced to seven days would find almost nothing. That is the
              // long-standing behaviour and it is unchanged. It is set here
              // rather than in `fixed` because `fixed` makes a find ACTIVE, and
              // the resting screen would then read a `find:` cache key the live
              // registry does not patch (R15).
              //
              // AT REST this same function is `found.fetchPage`, and its only
              // caller is <LoadMore> — page two of the list ON SCREEN. That
              // list is the TAB's, so a hard `view: "all"` here appended the
              // whole agency's meetings into the tab's own cache key. Latent
              // while This week was the only narrowed tab (a week rarely fills
              // a fifty-row page, so the cursor sidecar was usually null and
              // the button never drew); not latent for Mine, where a person
              // with two years of calls pages immediately. Caught adding Mine,
              // 2026-09-09, and fixed for both.
              //
              // `Object.keys(query).length` IS the distinction rather than a
              // second flag: `active` in paged-find.tsx is that exact
              // expression, so this cannot drift from what the control means by
              // "something is being asked". And `tab === "week" ? "mine-week" :
              // tab` translates the strip's OWN value into the door's
              // (2026-09-15, header block above) — `tab` itself is never
              // renamed, only the word sent on the wire.
              view: Object.keys(query).length > 0 ? "all" : tab === "week" ? "mine-week" : tab,
            })
            .then((r) => ({ rows: r.meetings, nextCursor: r.nextCursor, total: r.total }))
        }
        // THE CANONICAL SHAPE (client ruling, 2026-08-31 — Accounts and Tickets
        // both moved to this the same day, then all three corrected the same
        // day once the action shared the tabs' row: "never align the button
        // with the tabs — that button belongs in the right of the toolbar,
        // part of the toolbar"): a `FolderTabStrip`, not a bare node — it sits
        // directly above the toolbar's own card (`wrap` below) with zero gap,
        // the same join Tickets draws, so it reads as attached rather than
        // floating above a search box on the base background. (The strip
        // draws the one line shape now, v1.2.28 — see tabs-view.tsx's header —
        // the zero-gap join is unchanged, it was never about the folder SHAPE,
        // only about there being no button beside it.) `tabs` carries nothing
        // but the tabs BY TYPE now; "New meeting" moved to `actions`, at the
        // right of the toolbar itself.
        tabs={{
          config: {
            ...defaultTabsConfig,
            tabs: [
              {
                value: "week",
                label: t("This week"),
                icon: "chat",
                badge: formatCount(weekTotal),
                badgeVariant: "" as const,
              },
              {
                // MINE, WHERE CALENDAR USED TO BE. Not a rename: the Calendar
                // tab became the VIEW switch on the right of this same toolbar
                // (`view` below), so nothing was deleted — the client asked for
                // both in one sentence, *"i was in the room, and calendar as a
                // view"*, 2026-09-09.
                //
                // The badge is the door's own count of THIS question, from the
                // read that fetched the rows (R16). `user` is the call site's
                // own glyph: `TAB_ICONS` has no `mine`, deliberately, because
                // this is the only strip in the app with one.
                value: "mine",
                label: t("Mine"),
                icon: "user",
                badge: formatCount(mineTotal),
                badgeVariant: "" as const,
              },
              {
                // "EVERYONE'S", WHERE "ALL" USED TO READ — label only (ruling,
                // 2026-09-15, the header block above carries her words). The
                // VALUE stays `"all"`: it is what `useRemembered` has stored for
                // every returning reader, what `whereFor` compares against, and
                // what R19's machine-parity census derived off this door's own
                // source — renaming it would touch all three for a change that
                // is a label, nothing else.
                value: "all",
                label: t("Everyone's"),
                icon: "list",
                badge: formatCount(total),
                badgeVariant: "" as const,
              },
            ],
          },
          value: tab,
          onValueChange: (v) => setTab(v as "week" | "mine" | "all"),
        }}
        // CALENDAR, AS A VIEW OF WHICHEVER TAB IS OPEN — see `viewSlot` above.
        view={viewSlot}
        // "NEW MEETING", AT THE RIGHT OF THE TOOLBAR — PagedFind's own
        // `actions` slot. NO "Import CSV" BESIDE IT ANY MORE (client ruling,
        // 2026-09-15 evening: "On meetings, kill the import.") — see the
        // header block above for what stayed reachable.
        actions={() => (canCreate ? <AddButton label={t("New meeting")} onClick={() => setOpen(true)} /> : null)}
        // THE ONE CARD — toolbar, then rows — the same join Accounts and
        // Tickets draw (`collection-content.tsx`'s and `tickets-collection.tsx`'s
        // own `wrap`): zero gap to the tab row above, which is this file's own
        // `tabs` slot rather than a second `gap-*` here.
        wrap={(inner) => <CollectionCard>{inner}</CollectionCard>}
      >
        {(found) => {
          // WHICH ROWS THIS TAB IS SHOWING. A find answers over the whole meetings list
          // and outranks the tab; otherwise the week reads the week's own list
          // and the other two read the meetings list. `undefined` is "not back yet",
          // which the line below draws as the skeleton rather than as "none".
          const rows = found.active
            ? found.rows
            : tab === "week"
              ? (weekRows ?? null)
              : tab === "mine"
                ? (mineRows ?? null)
                : loaded
          if (rows === null) return <Skeleton variant="list" lines={4} />
          // NOTHING IS NARROWED HERE. The week used to be, and the badge above
          // it disagreed for as long as it was: see the note on `weekQ`. Every
          // row on screen now came back from the door answering the question
          // this tab asks, which is the same door the count came from (R16).
          const shown = rows
          // THE CALENDAR'S OWN NARROWING — `found.query` is the exact question
          // the search box + facets above are asking (paged-find.tsx's own
          // `Found.query`), minus `sort`/`dir`: a calendar square does not
          // order, the day it falls on does, so there is nothing for a sort to
          // change there. Forwarded to the month-scoped door read inside
          // `MeetingsMonthCalendar` below — see that component's own header for
          // why the read has to live in a component of its own rather than
          // here.
          const monthNarrowing: Record<string, string> = {}
          for (const [field, value] of Object.entries(found.query)) {
            if (field === "sort" || field === "dir") continue
            monthNarrowing[field] = value
          }
          // …AND THE TAB RIDES IT TOO, which is what makes the calendar a VIEW
          // rather than a fourth tab wearing a different hat. The grid draws the
          // month INTERSECTED with whichever question the strip is asking: This
          // week on a calendar is this week's days filled in and the rest of the
          // month blank; Mine on a calendar is the month with only the meetings
          // this person sat in. `listFetch.meetingsMonth` opens its door call
          // with `view: "all"` and spreads this AFTER it, so the tab wins — and
          // `meetingsMonthKey` folds every narrowing key into the cache key, so
          // three tabs reading the same month are three entries and cannot show
          // each other's rows.
          //
          // "mine-week" (not the tab's own stored "week") for the SAME reason
          // `fetchPage`'s own `view:` line translates it (see that note): the
          // door has no plain `week` that is also mine, and This week is
          // always mine now (ruling, 2026-09-15). Written out here too rather
          // than read off a shared const, for `weekView`'s own reason — a
          // resolved-key const satisfies a reader and not a census.
          monthNarrowing.view = tab === "week" ? "mine-week" : tab
          // THE TABLE'S OWN ROWS, ON EVERY TAB THAT OFFERS ONE (16 Sep 2026
          // ruling, the header block above carries her words in full). Built
          // through `shapeMeetingsList` now, not a second shaper reading
          // `shown` by hand — its `when`/`purposeCell`/`accountCell` fields
          // exist for exactly this table (that function's own header: "TABLE
          // COLUMNS, not facets… read by the table and by nothing else").
          const tableRows = shapeMeetingsList(shown, lang).rows as unknown as ShapedMeetingRow[]
          // THE TABLE'S OWN CHROME — R14: the door above (`<PagedFind>`) owns
          // the search and the sort, so `searchable`/`sortable` stay off and
          // `RecordTable`'s own in-memory match never runs (the same
          // "inert on a paged collection" shape `accounts-screen.tsx`'s
          // gallery states in full one file over). `showCount: false` is R16:
          // `CollectionHeading` above already carries the one exact count.
          // `emptyText` is the tab's own RAW sentence — see `tabEmptyRaw`'s
          // own header for why it is not `tabEmpty`.
          const tableConfig: CollectionConfig = {
            ...defaultCollectionConfig,
            searchable: false,
            sortable: false,
            showCount: false,
            emptyText: tabEmptyRaw,
          }
          return (
            // THE SAME ACTION, PUBLISHED DOWNWARDS (screen-bits.tsx's own
            // `SectionWithCreate` does this identically) — the create button now
            // lives in the toolbar above; the engine's zero-state still needs to
            // name the next act.
            <CollectionCreateActionProvider
              action={
                canCreate
                  ? {
                      label: t("New meeting"),
                      icon: <Plus className="size-4" />,
                      onCreate: () => setOpen(true),
                      // NO SECONDARY IMPORT ACT ANY MORE — the client's
                      // ruling, 2026-09-15 evening: "On meetings, kill the
                      // import." See the header block above for what stayed
                      // reachable.
                    }
                  : null
              }
            >
              {!found.active && total === 0 ? (
                // GENUINELY EMPTY — the door's exact COUNT(*) (R16) says the
                // team has no meetings at all, and nothing is being asked.
                // NONE OF THE THREE BODIES TOUCHES `CollectionFrame` any more
                // (2026-09-15 retired the engine-drawn list that used to —
                // see the header block above), so none of them reads the
                // create action published above on its own. Said directly
                // here instead, once, ahead of the mode switch, so a new team
                // gets the same act regardless of which tab or body they land
                // on rather than only on the Calendar, which is what this
                // gate used to be fenced to.
                <CollectionEmptyState
                  title={t("Nothing in Meetings yet.")}
                  onCreate={canCreate ? () => setOpen(true) : undefined}
                />
              ) : mode === "calendar" ? (
                // NO `unloaded` SENTENCE ANY MORE. It said "earlier meetings
                // haven't been loaded yet, so this month may not be the whole
                // of it", which was true of a grid reading the paged prefix and
                // is now false: the month on screen IS the whole of it, asked
                // of the door. Leaving it would be an apology for a fault that
                // no longer exists, which teaches a person to distrust a
                // correct screen.
                //
                // NARROWED BY THE SAME SEARCH BOX, now — `monthNarrowing` is
                // `found.query` forwarded straight through (see the note above).
                // `found.active` decides whether "Nothing matched." (the exact
                // sentence the list/table views already show for a failed
                // search, `found.emptyText`) can override the grid's own
                // "nothing this month" — a search with no hits anywhere is a
                // different sentence from a month that is simply empty.
                <MeetingsMonthCalendar
                  teamId={teamId}
                  narrowing={monthNarrowing}
                  // WHOSE SENTENCE AN EMPTY GRID GETS, in three cases rather
                  // than the two it used to have. A failed search still says
                  // "Nothing matched." everywhere. A narrowed TAB now says its
                  // own sentence — the identical one its list body says, so the
                  // two views of one question cannot disagree — because the grid
                  // is genuinely showing a month INTERSECTED with the tab, and
                  // "Nothing in Meetings this month." would be false about a
                  // month that is full of everybody else's meetings. Only
                  // Everyone's, which narrows nothing, keeps the grid's own
                  // month sentence.
                  emptyText={found.active ? found.emptyText : tab === "all" ? undefined : tabEmpty}
                  onOpen={(id) => onIntent({ kind: "open", module: "meetings", id })}
                />
              ) : mode === "agenda" ? (
                // THIS WEEK'S OWN DEFAULT (ruling, 2026-09-15) — `shown` is
                // already the mine-this-week rows the tab reads at rest, or
                // whatever `found` narrowed them to mid-search; `MeetingsAgenda`
                // only groups and draws what it is handed, exactly the
                // separation `MeetingsMonthCalendar` above keeps.
                <MeetingsAgenda
                  rows={shown}
                  lang={lang}
                  onOpen={(id) => onIntent({ kind: "open", module: "meetings", id })}
                  emptyText={found.emptyText ?? tabEmpty}
                />
              ) : mode === "week" ? (
                // WEEK — beside Calendar on every tab (the fourth ruling,
                // once the week lane's `RecordWeek` landed). `MeetingsWeek`
                // above says why it reads `shown` directly, the same choice
                // Agenda makes one branch up.
                <MeetingsWeek
                  rows={shown}
                  lang={lang}
                  onOpen={(id) => onIntent({ kind: "open", module: "meetings", id })}
                />
              ) : (
                // LIST — ON EVERY TAB THAT OFFERS ONE (16 Sep 2026 ruling, the
                // header block above carries her words in full). `RecordTable`
                // in the tickets shape (R80/K22) now, ONE ROW SHAPE drawn by
                // all three tabs — `tableRows`/`tableConfig`/
                // `meetingsTableColumns` above say what it shows.
                //
                // No `useKitPanel`: `CollectionCard` above (drawn by `wrap`)
                // is the ONE box already — Accounts and Tickets both draw
                // their own table the identical way, one file over
                // (`accounts-screen.tsx`, `tickets-collection.tsx`'s own
                // `TicketRowsTable`), for the same reason ("the broken
                // combination", screen-bits.tsx's own doc on
                // `CollectionCard`).
                //
                // `order={found.order}` is inert today — no column below
                // carries a `sort`, so `record-table.tsx`'s own `ordered()` is
                // never reached — and is passed anyway, the same way every
                // other paged `<RecordTable>` in the app is wired, so the door
                // stays the one thing that can ever own this table's order.
                //
                // `narrowedOutside={found.active}`: the door above owns this
                // search (R14), so the table cannot see the narrowing from
                // inside and its own query is always empty — without this a
                // search that matched nothing would read as "this collection
                // is empty" and offer "Add the first" over rows the term was
                // only hiding.
                <RecordTable
                  columns={meetingsTableColumns(t)}
                  rows={tableRows}
                  // THE NUMBER IN FRONT OF THE NAME, the same black chip
                  // every other collection leads with (Tickets'
                  // `TicketRowsTable`, Accounts' table one file over) — never
                  // a seventh column of its own.
                  refColumn="ref"
                  config={tableConfig}
                  order={found.order}
                  narrowedOutside={found.active}
                  onRowClick={(row) =>
                    onIntent({ kind: "open", module: "meetings", id: String(row.id) })
                  }
                  rowPath={(row) => `/t/${teamId}/meetings/${String(row.id)}`}
                  rowLabel={(row) => String(row.nameText ?? row.id)}
                />
              )}

              {/* R14: the heading counts the WHOLE meetings list, so the list under it has to be
                  able to reach all of it — page one, then Load more.
                  NOT ON THE CALENDAR, because the calendar carries its own: the
                  grid knows which month you are reading and can offer the button
                  on exactly the months that need it, beside the sentence saying
                  why. Two of the same button on one screen is one too many. */}
              {mode !== "calendar" && (
                <LoadMore
                  listKey={
                    found.listKey ??
                    (tab === "mine" ? meetingsKey(teamId, "mine") : meetingsKey(teamId, weekView))
                  }
                  fetchPage={found.fetchPage}
                  label={t("Load more meetings")}
                />
              )}
            </CollectionCreateActionProvider>
          )
        }}
      </PagedFind>

      {/* BRINGING GOOGLE IN — ONE CONTROL, ONE SENTENCE, ONE FRAME.
       *
       * THE OWNER, 26 Aug 2026, looking at this corner of the screen: "it is very
       * cluttered everywhere. At the bottom near this 'Bring it in' button, there
       * is too much text. Not well done."
       *
       * He was right, and it was not a typography problem. There were TWO buttons
       * a few pixels apart doing two different things with two different labels
       * ("Bring in the calendar", "Bring it in"), each with its own status line,
       * plus a caption, plus a walk-progress sentence — six pieces of text
       * sprayed across the full width of a 1600px page, none of them framed.
       *
       * There is one act here as far as a person is concerned: bring in what
       * Google knows. The shared control has always been able to do both halves
       * (`scope="both"`), and the only reason this screen kept its own was that
       * the calendar sweep's answer carries two facts this screen shows — how far
       * back the walk has got, and which entries are still beyond the horizon.
       * `onCalendarResult` hands those over, so the second button is gone.
       *
       * The FRAME belongs to the screen and not to the control: on the knowledge
       * heading band the same control is an inline toolbar item, and a bordered
       * card there would be wrong. Here it is the foot of a list, so it gets a
       * card. */}
      {canCreate && (
        <div className="flex flex-col gap-3 rounded-[var(--radius)] bg-surface-panel p-4">
          <GoogleSyncButton
            teamId={teamId}
            scope="both"
            onCalendarResult={(r) => {
              setAhead(r.ahead)
              setCaughtUp(r.caughtUp)
            }}
            onSynced={() => {
              invalidate(meetingsKey(teamId))
              invalidate(meetingsKey(teamId, "mine-week"))
              // …AND MINE. A calendar sweep is the single biggest source of new
              // rows in this person's Mine — every entry it brings in carries
              // the guest list that decides the tab.
              invalidate(meetingsKey(teamId, "mine"))
            }}
          />
          {/* HOW FAR BACK IT HAS GOT. Only after a press, and only while there is
              more: a line that always said something would be furniture, and one
              that never said anything would leave somebody believing their whole
              history was in after the first press. */}
          {caughtUp === false && (
            <p className="text-muted-foreground text-xs">
              {t("Still reading your older meetings, press again to go further back.")}
            </p>
          )}
          {ahead.length > 0 && (
            <div className="flex flex-col gap-2 shadow-[var(--hairline-over)] pt-3">
              {/* NOT RECORDS YET, AND SAID SO. The live window reaches four weeks
                  ahead; these are further out. The walk will reach them too,
                  which is why the sentence says "yet". */}
              <p className="text-muted-foreground text-xs">
                {t("Further out, and not records yet, each becomes one four weeks before it happens.")}
              </p>
              <ul className="flex flex-col gap-1">
                {ahead.map((a) => (
                  <li key={a.eventId} className="text-muted-foreground flex flex-wrap gap-2 text-sm">
                    <span className="min-w-0 truncate">{a.title}</span>
                    <span className="tabular-nums">{formatDate(a.startsAt, lang)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* "WHY WE MEET" USED TO BE ONE LEVEL DOWN, HERE — a "Meeting types" link
          to Settings › Meetings › Choices, since Task C moved the editor there
          on 15 Sep 2026. GONE, 16 Sep 2026, the client's own ruling verbatim:
          "On the main meetings screen at the bottom, there are meeting types,
          but this should not be there because this is already on the meeting
          settings, so remove it from there." The destination did not move —
          `SECTION_HOSTED_ELSEWHERE.purposes` (shared/rules/registry.ts) still
          names Settings › Meetings › Choices as meeting types' one door — only
          this screen's own shortcut to it is gone, along with the
          `purposeCount`/`canReadPurposes`/`onPurposes` props that fed it (see
          this file's own header block and `MeetingsScreen`'s prop list). */}

      <MeetingFormDialog
        open={open}
        onOpenChange={setOpen}
        draftKey={`meeting:add:${teamId}`}
        teamId={teamId}
        // THE WHOLE ROW, NOT A COPY OF TWO OF ITS FIELDS. `PickableRecord`
        // (web/lib/pickable.ts) is deliberately the loosest shape that carries a
        // face, and an `Account` structurally satisfies it — so the `.map((a) =>
        // ({ id, name }))` that used to sit here was the exact line that type
        // exists to end, dropping `logoUrl` one hop before the picker that draws
        // it. Client ruling, 2026-09-09: accounts wear their icon in selects.
        accountOptions={(accountsQ.data ?? []).filter((a) => a.active)}
        // THE WHOLE ROW HERE TOO, so `AccountAppPicker` can narrow by
        // `accountId` (ruling 2, 16 Sep 2026) — the `.map((a) => ({ id, name }))`
        // this used to read dropped it one hop before the picker could.
        appOptions={(appsQ.data ?? []).filter((a) => a.active)}
        purposeOptions={(purposesQ.data ?? []).filter((p) => p.active).map((p) => ({ id: p.id, name: p.name }))}
        onSubmit={add}
      />
    </div>
    </CountedAbove>
  )
}
