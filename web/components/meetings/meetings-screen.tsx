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
// AND IT IS WHERE MEETING PURPOSES ARE REACHED FROM. The taxonomy of why we meet
// used to sit under the Delivery method page; that page went on 17 Aug 2026 with
// its programmes folded onto the sprint type, and a purpose belongs beside the
// meetings list rather than on a rail of its own — it is the vocabulary behind this
// screen, not a second destination.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { defaultTabsConfig } from "@shared/web/screen-engine/tabs-view"
import { useRemembered } from "@shared/web/remembered"
import { toast } from "@shared/ui/components/sonner/sonner"
import { CalendarBlank, Plus, Rows, Table as TableViewIcon, UploadSimple } from "@shared/ui/foundations/icons"
import { type ScreenActionContext, type ScreenIntent } from "@shared/web/screen-engine/screen-renderer"
import { CollectionCreateActionProvider, CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import type { ScreenRecipe, ScreenRights } from "@shared/web/screen-engine/recipe"
import type { CollectionConfig } from "@shared/web/screen-engine/config"

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
import { RecordTable, visibleActions, type TableColumn } from "@/components/records/record-table"
import { RecordMark } from "@shared/web/record-mark"
import { shapeMeetingsList } from "@/components/deep-link/shape"
import { content as contentApi, tenancy } from "@/lib/api"
import { appsKey, listFetch, meetingsKey, meetingsMonthKey, totalKey } from "@/lib/live-resources"
import { field, translateFields, withDataDrivenCollection } from "@/lib/screens"
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


/** WHAT "TABLE" SHOWS, ON EVERY TAB THAT OFFERS IT (ruling, 2026-09-15) — one
 * definition rather than "All"'s own six columns plus two tabs still drawing a
 * two-line list. SEVEN COLUMNS, named in her own order: Name/Title, Date, Time,
 * Meeting type, Department, Attendees, Account.
 *
 * WHAT CHANGED FROM THE OLD SIX. `App` and `Where` are gone — this table is no
 * longer the "far more columns" 9.1 asked for on "All" alone, it is the one
 * table every tab reaches, and her list for it names neither. `Status` is gone
 * with them, for the reason `COLUMN_SORT` below already recorded: the door has
 * no order for it and never did. `When` split into `Date` and `Time`, because a
 * table a person reads across wants the two separately rather than one string
 * carrying both. `Meeting type` is `purpose` under its new name (the glossary
 * rename this lane hands over verbatim; the field key stays `purposeId` /
 * `purpose` everywhere in code — only the label a reader sees changed).
 * `Department` and `Attendees` are new: the first off the meeting's own type
 * (`MeetingPurpose.department`, already read for the picker below — no door
 * change, a client-side lookup), the second off `googleGuests`, which every
 * meeting row already carries (MEETING_COLS) and needed no plumbing either. */
const TABLE_COLUMNS = [
  field("name", "Meeting"),
  field("when", "Date"),
  field("time", "Time"),
  field("purpose", "Meeting type"),
  field("department", "Department"),
  field("attendees", "Attendees"),
  // THE ACCOUNT, WEARING ITS OWN FACE (R35, client ruling 2026-09-15: "add the
  // logos to account and app … identify everywhere else where it makes
  // sense"). `accountCell`, NOT `client` — `shapeMeetingsList` keeps `client`
  // as plain text because the calendar view's own detail line
  // (`MeetingsMonthCalendar` above) reads it with `String(r.client ?? "")`,
  // and a React node there would print "[object Object]". `accountCell` is
  // the SAME fact, shaped as a node, for this column alone.
  field("accountCell", "Account"),
]

/** WHAT THE DOOR CALLS EACH OF THOSE COLUMNS.
 *
 * The meetings list PAGES, so a column header orders it at the door or it does not order
 * it at all — arranging the fifty rows in the browser under a badge counting 254
 * is the lie `<PagedFind>` exists to stop, one control along (SEARCH.md § *The
 * third question*). So a header sends a NAME out of `MEETING_SORTS`, and the
 * columns the door has no name for — Time, Meeting type, Department, Attendees —
 * draw a plain header. A header that cannot order is honest; one that looks
 * like it can and does not is the defect this whole lane is about.
 *
 * Hand-paired because it is a translation between two vocabularies (a shaped
 * row's column, and the door's menu name); the DIRECTION is not, it is read off
 * `COLLECTION_SORTS` so a header cannot land differently from the picker above
 * it offering the same order. */
const COLUMN_SORT: Record<string, string> = {
  name: "title",
  when: "when",
  accountCell: "client",
}

/** …AND THE PAIRING IS CHECKED AGAINST THE MENU, not trusted. The meetings menu
 * is `when | title | client | added` (collection-sorts.ts, whose own comment
 * records that a Status option "went with the status: sorting by when a meeting
 * IS is already sorting by whether it has happened") — so a name the menu does
 * not offer produces NO `sort`, and the column draws a plain header. A header
 * that cannot order is honest; one that looks like it can and does not is the
 * defect this whole lane is about.
 *
 * `defaultDir` comes off the same lookup, so a header can never land in a
 * different direction from the picker above it offering the same order — that
 * is why the option object is found once and read twice. */
const TABLE_COLUMN_HEADERS: TableColumn[] = TABLE_COLUMNS.map((f) => {
  const option = COLLECTION_SORTS.meetings.options.find((o) => o.value === COLUMN_SORT[f.column])
  return {
    key: f.column,
    label: f.field.label,
    sort: option?.value,
    defaultDir: option?.defaultDir,
    // `accountCell` HOLDS A NODE (the mark + name span above), not plain
    // text — `client` is the sibling row key `shapeMeetingsList` keeps as a
    // string for exactly this: `CollectionFrame`'s free-text match reads
    // `String(row[key])` (record-table.tsx's own `searchKey` doc), and a
    // node there is `"[object Object]"`. Inert on this PAGED table today
    // (the door owns the search, same as every other column here), and
    // still declared for the reason `record-table.tsx` gives one column
    // over: a column left unset is silently unsearchable the day this table
    // stops being paged, rather than visibly correct now.
    searchKey: f.column === "accountCell" ? "client" : undefined,
    // NO `sortType`/`sortKey` ON ANY OF THESE, and their absence is the
    // statement: every order this table can be put in is the DOOR's (the
    // `order={found.order}` at the render below). A browser-side comparison
    // declared here would arrange the fifty rows in hand under a badge counting
    // the whole meetings list — the lie `<PagedFind>` exists to stop, and worse
    // than the alphabetical dates it would be fixing.
  }
})

/* ── THE STRIP AND THE VIEWS, 2026-09-09 → 2026-09-15 ────────────────────────
 *
 * THE FIRST RULING, 2026-09-09, in her own words: *"tabs for meetings: this
 * week, mine, all"*. Told that this would delete the Calendar tab and that
 * "Mine" did not exist, she answered both at once: *"i was in the room, and
 * calendar as a view"*. That gave This week · Mine · All, every tab read as a
 * list or a month grid through one shared view slot. SUPERSEDED BELOW — kept
 * here for the history, not for the shape.
 *
 * THE RULING THAT REPLACES IT, 2026-09-15, verbatim: *"In meetings, the tabs
 * that I would like are: This week / Mine / and: Replace 'All' with
 * 'Everyone's'. The views I want in 'This week' are: Agenda chronological
 * (this is only for mine, unless I say so, and it's always filtered to mine).
 * Same goes for tasks and meetings. Again, on 'This week', I want the views:
 * Agenda / Calendar / Table. On the 'Mine' tab, this shows all of my meetings,
 * past and present. I also want the views: Calendar / Table. On 'Everyone's',
 * I want the views: Table / Calendar."*
 *
 * FOUR CHANGES, not one.
 *
 * 1 · THE THIRD TAB IS RENAMED, NOT REBUILT. "All" became "Everyone's" on its
 *     label only — `view=all` is unchanged on the wire, so nothing downstream
 *     of the door had to learn a new word.
 *
 * 2 · "THIS WEEK" IS NOW ALWAYS MINE. It used to be the agency's whole week;
 *     this ruling folds Mine's own attendance predicate into it PERMANENTLY —
 *     the tab reads mine-this-week, never the agency's this-week, on every
 *     body it can be read in. The door answers a new combined view,
 *     `view=mine-week` (`workers/content/src/lib/meetings.ts`'s own `whereFor`
 *     carries the rule and what it costs). Plain `week` stays, unchanged and
 *     un-mine'd, because `routes/insights.ts`'s own dashboard tile still asks
 *     for the agency's whole week and is not this screen.
 *
 * 3 · EACH TAB NOW OFFERS ITS OWN BODIES, not one switch shared by all three:
 *     This week is Agenda / Calendar / Table; Mine is Calendar / Table;
 *     Everyone's is Table / Calendar — the FIRST named in each case is that
 *     tab's own default (her ordering, read literally). Remembered PER TAB
 *     (`meeting-view-week` / `meeting-view-mine` / `meeting-view-all`) rather
 *     than in one slot, because switching tabs must never strand a reader on a
 *     body their new tab does not even offer.
 *
 * 4 · "LIST" IS GONE, AND "TABLE" IS WHAT IT BECAME. She asked for Table, not
 *     List — so the two-line list this screen used to draw through the
 *     library engine (`ScreenRenderer`) is retired outright, and every tab
 *     that offers a Table draws the SAME seven-column `RecordTable`
 *     (Name/Title, Date, Time, Meeting type, Department, Attendees, Account),
 *     the pattern `record-table.tsx` already gives every other screen, rather
 *     than the "All" table standing alone beside two tabs still drawing the
 *     old two-line list.
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
    // own `shapeMeetingsList` appends to the list/table row, unwrapped there
    // too (a template literal, not a sentence of its own for `t` to
    // translate).
    title: (
      <span className="flex min-w-0 flex-col">
        <span className="min-w-0 truncate">{m.active ? m.title : `${m.title} (cancelled)`}</span>
        {m.purposeName ? (
          <span className="text-muted-foreground min-w-0 truncate text-xs">{m.purposeName}</span>
        ) : null}
      </span>
    ),
    who: m.googleGuests?.length ? m.googleGuests.map((g) => g.name || g.email).join(", ") : undefined,
  }))
  return <RecordAgenda entries={entries} onOpen={onOpen} emptyText={emptyText} />
}

export function MeetingsScreen({
  teamId,
  recipe,
  rights,
  total,
  purposeCount,
  canCreate,
  canReadPurposes,
  onPurposes,
  onImport,
  onAction,
  onIntent,
}: {
  teamId: string
  recipe: ScreenRecipe
  rights: ScreenRights
  /** the exact server total (R16) — never the loaded page's length */
  total: number | undefined
  /** the exact server total of the MEETING PURPOSES, for the link below */
  purposeCount: number | undefined
  canCreate: boolean
  /** `delivery:read` — the right the purposes screen itself gates on. */
  canReadPurposes: boolean
  onPurposes: () => void
  /** THE CONTEXTUAL "IMPORT CSV" JUMP — see the identical note on
   * `StoriesScreen`'s own `onImport`. `meetings` is the other of the two
   * declared import targets that had no button anywhere in either front door:
   * a new team arriving with two years of their diary in a spreadsheet had a
   * working, gated, tested importer for it and no way to find it. */
  onImport?: () => void
  onAction: (actionId: string, ctx: ScreenActionContext) => void
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
  // The purposes are read whenever this screen can offer them at all — the form
  // picker needs them, and so does the count on the link below.
  const purposesQ = useCached<MeetingPurpose[]>(canCreate || canReadPurposes ? `purposes:${teamId}` : null, () =>
    listFetch.purposes(teamId)
  )
  const [open, setOpen] = React.useState(false)
  // THE THREE TABS (client ruling, 2026-09-09, renamed 2026-09-15 — the block
  // above this component carries her words both times). This week is past AND
  // upcoming, because "this week" is the week somebody is in rather than the
  // days left of it, and — since 2026-09-15 — always MINE; Mine is every
  // meeting this person was in the room for, past and present; and Everyone's
  // shows the agency's whole list, with far more columns on its Table.
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
  const [weekMode, setWeekMode] = useRemembered<"agenda" | "calendar" | "table">(
    "meeting-view-week",
    "agenda",
    (r) => (r === "agenda" || r === "calendar" || r === "table" ? r : undefined)
  )
  const [mineMode, setMineMode] = useRemembered<"calendar" | "table">("meeting-view-mine", "calendar", (r) =>
    r === "calendar" || r === "table" ? r : undefined
  )
  const [allMode, setAllMode] = useRemembered<"table" | "calendar">("meeting-view-all", "table", (r) =>
    r === "table" || r === "calendar" ? r : undefined
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
   * This week: Agenda, Calendar, Table; Mine: Calendar, Table; Everyone's:
   * Table, Calendar. `onValueChange` writes to whichever of the three
   * remembered slots this tab owns, never the other two, so switching tabs
   * cannot cross-contaminate a choice made on a different one. */
  const viewSlot: ToolbarViewSlot = {
    views:
      tab === "week"
        ? [
            { value: "agenda", label: t("Agenda"), icon: <Rows className="size-4" /> },
            { value: "calendar", label: t("Calendar"), icon: <CalendarBlank className="size-4" /> },
            { value: "table", label: t("Table"), icon: <TableViewIcon className="size-4" /> },
          ]
        : tab === "mine"
          ? [
              { value: "calendar", label: t("Calendar"), icon: <CalendarBlank className="size-4" /> },
              { value: "table", label: t("Table"), icon: <TableViewIcon className="size-4" /> },
            ]
          : [
              { value: "table", label: t("Table"), icon: <TableViewIcon className="size-4" /> },
              { value: "calendar", label: t("Calendar"), icon: <CalendarBlank className="size-4" /> },
            ],
    value: mode,
    onValueChange: (v: string) => {
      if (tab === "week") setWeekMode(v === "calendar" ? "calendar" : v === "table" ? "table" : "agenda")
      else if (tab === "mine") setMineMode(v === "table" ? "table" : "calendar")
      else setAllMode(v === "calendar" ? "calendar" : "table")
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
        // `actions` slot, exactly where Accounts' own New/Import/Export and
        // Tickets' own "Raise ticket" now sit.
        actions={() => (
          <>
            {/* IMPORT KEEPS ITS WORD (B4: import and export are rare,
                consequential and not guessable from a glyph) — the same
                button, in the same slot, as Accounts' own. Gated on the
                create right the importer itself demands for this target. */}
            {canCreate && onImport && (
              <Button variant="secondary" onClick={onImport} className="gap-1">
                <UploadSimple className="size-4" />
                {t("Import CSV")}
              </Button>
            )}
            {canCreate ? <AddButton label={t("New meeting")} onClick={() => setOpen(true)} /> : null}
          </>
        )}
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
          const data = shapeMeetingsList(shown, lang)
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
          // THE TABLE, ON EVERY TAB THAT OFFERS ONE (ruling, 2026-09-15 — the
          // header block above carries her words). One column set now, not
          // "All"'s own six beside two tabs still drawing a two-line list —
          // `TABLE_COLUMNS` at the top of this file says what changed and why.
          // `department`/`attendees` are NOT on the shaped row `shapeMeetingsList`
          // returns (that shaper is also read by the calendar view above, which
          // has no use for either), so they are joined on here rather than
          // added to a shaper two other bodies do not need.
          //
          // DEPARTMENT COMES OFF THE PURPOSE, client-side — `purposesQ` (read
          // above for the create form's own picker) already carries
          // `MeetingPurpose.department`, so this is a lookup over a cache this
          // screen was already paying for, never a door change. A meeting whose
          // reader cannot see purposes at all (`purposesQ.data` unset) or that
          // carries no type says "—", same as the picker beside it.
          //
          // ATTENDEES NEEDED NO NEW PLUMBING EITHER — `googleGuests` rides
          // every meeting row already (`MEETING_COLS`, workers/content/src/lib/
          // meetings.ts), because the door's own `q` search has matched against
          // it for months. A meeting typed in rather than synced carries none,
          // and says so rather than guessing at who was in the room.
          const departmentByPurpose = new Map((purposesQ.data ?? []).map((p) => [p.id, p.department]))
          const byId = new Map(shown.map((m) => [String(m.id), m]))
          // TYPED EXPLICITLY (not inferred) — `RecordTable` is generic over its
          // `rows` element type, and an inferred literal (just the three keys
          // this map adds) would lose the spread's `id` for `onRowClick` and
          // `refColumn` below, which read it off the SAME row object.
          const tableRows: Record<string, unknown>[] = (data.rows ?? []).map((row) => {
            const m = byId.get(String(row.id))
            return {
              ...row,
              time: m ? formatTime(m.startsAt, lang) : "",
              department: (m?.purposeId ? departmentByPurpose.get(m.purposeId) : null) ?? "—",
              attendees:
                m && m.googleGuests?.length ? m.googleGuests.map((g) => g.name || g.email).join(", ") : "—",
            }
          })
          // The display is decided BEFORE the collection is tuned, so the tuner
          // can see it is drawing a table (whose column headers are its own sort
          // control) and stand its picker down — see tasks-screen for the whole
          // sentence.
          // TRANSLATED HERE: these columns are the host's own, spread on AFTER
          // resolveRecipe translated the recipe, so they had never been through
          // the pass and every heading rendered in English whatever language the
          // reader chose.
          //
          // …AND THE EMPTY SENTENCE IS THE TAB'S, not one recipe's fallback —
          // `found.emptyText` ("Nothing matched.") still wins mid-search;
          // otherwise every tab's own Table gets that tab's own honest word
          // (`tabEmpty`), the same one the Agenda and Calendar bodies below get,
          // so the three bodies of one tab can never disagree about what an
          // empty answer means (2026-09-03 audit made exactly this correction
          // for the week, and it now applies to all three tabs' Tables alike).
          const tableRecipe = withDataDrivenCollection(
            { ...recipe, display: "table" as const, fields: translateFields(TABLE_COLUMNS, t) },
            tableRows,
            found.emptyText ?? tabEmpty
          )
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
                      // …AND THE IMPORT ACT WITH IT, so the genuinely-empty
                      // body offers "Import a list" beside "Add the first"
                      // (CollectionEmptyState). A brand-new team with a
                      // spreadsheet of their diary should not have to find
                      // the toolbar button that is not drawn while the
                      // collection is empty.
                      secondary: onImport ? { label: t("Import CSV"), onClick: onImport } : undefined,
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
                // gets the same two acts regardless of which tab or body they
                // land on rather than only on the Calendar, which is what this
                // gate used to be fenced to.
                <CollectionEmptyState
                  title={t("Nothing in Meetings yet.")}
                  onCreate={canCreate ? () => setOpen(true) : undefined}
                  onImport={canCreate && onImport ? onImport : undefined}
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
              ) : (
                // TABLE — THE MEETINGS LIST PAGES, so its headers ask the DOOR —
                // `found.order` is the same handle the picker above the table
                // holds, so the two controls are one question and the answer
                // spans the whole meetings list instead of the fifty rows in
                // the browser. The picker stays because it names orders that
                // are not columns ("Recently added"); the headers cover the
                // ones that are. ONE DEFINITION drawn by all three tabs now —
                // `TABLE_COLUMNS`/`tableRows` above say what it shows and where
                // Department and Attendees come from.
                //
                // No `useKitPanel`: `CollectionCard` above (drawn by `wrap`) is
                // the ONE box now — Accounts and Tickets dropped it the same day
                // for the same reason ("the broken combination", screen-bits.tsx's
                // own doc on `CollectionCard`).
                <RecordTable
                  columns={TABLE_COLUMN_HEADERS}
                  rows={tableRows}
                  // THE NUMBER IN FRONT OF THE MEETING, not an eighth column.
                  // The `Reference` column was cut from this table on purpose
                  // ("already rides the record's own eyebrow (D4)", above) and
                  // that ruling stands — a column of identical black lozenges
                  // is furniture. What it left behind was a meeting whose
                  // number appeared on its own screen and on no list you could
                  // find it from, which is the client's September instruction
                  // read the other way round: the ID leads the title.
                  refColumn="ref"
                  config={tableRecipe.collection as CollectionConfig}
                  order={found.order}
                  actions={visibleActions(tableRecipe, rights, onAction)}
                  onRowClick={(row) =>
                    onIntent({ kind: "open", module: "meetings", id: String(row.id) })
                  }
                  /* R62 — the DOOR above owns this search, so the table cannot see
                     the narrowing from inside and its own query is always empty. A
                     term that matched nothing read as "this collection is empty" and
                     drew "Add the first" over rows the term was hiding. */
                  narrowedOutside={found.active}
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

      {/* WHY WE MEET, one level down. A link rather than a nav line: the types
          are the vocabulary this screen picks from, and a rail that lists both a
          page and the words behind it reads as two ideas. R16: the number is the
          door's exact total through the ONE seam, and an unloaded total renders
          nothing rather than a "0" that reads as "there are none".
          "MEETING TYPES", NOT "MEETING PURPOSES" — the glossary rename this
          lane hands over (`shared/glossary.ts`, "Meeting purpose" → "Meeting
          type"); the label is the only thing that moved, every prop and
          identifier below it (`purposeId`, `purposeCount`, `canReadPurposes`,
          `onPurposes`, `purposesQ`, `MeetingPurpose`) stays exactly as named. */}
      {canReadPurposes ? (
        <Button
          type="button"
          variant="ghost"
          onClick={onPurposes}
          /* `ghost` IS this quiet tertiary action: `--ink-tertiary` is
             `--muted-foreground` and its hover is the ink going to full, which
             is what was hand-written here. The overrides are the box only (a
             quiet text action occupies none) plus the hover underline `ghost`
             does not carry and this line always has. NOT the weight: a
             `font-normal` here measured 300, not the 400 it was replacing,
             because `--font-weight-normal` is 300 in this palette — so the
             neutralising class made it lighter than either side. The kit's own
             control weight (500) stands instead. */
          className="h-auto w-fit p-0 underline-offset-4 hover:underline"
        >
          {t("Meeting types")}
          {formatCount(purposeCount) ? ` (${formatCount(purposeCount)})` : ""}
        </Button>
      ) : null}

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
        appOptions={(appsQ.data ?? []).filter((a) => a.active).map((a) => ({ id: a.id, name: a.name }))}
        purposeOptions={(purposesQ.data ?? []).filter((p) => p.active).map((p) => ({ id: p.id, name: p.name }))}
        onSubmit={add}
      />
    </div>
    </CountedAbove>
  )
}
