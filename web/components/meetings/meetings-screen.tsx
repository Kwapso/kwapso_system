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
import { CalendarBlank, ListBullets, Plus, UploadSimple } from "@shared/ui/foundations/icons"
import {
  ScreenRenderer,
  type ScreenActionContext,
  type ScreenIntent,
} from "@shared/web/screen-engine/screen-renderer"
import { CollectionCreateActionProvider, CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import type { ScreenRecipe, ScreenRights } from "@shared/web/screen-engine/recipe"
import type { CollectionConfig } from "@shared/web/screen-engine/config"

import { CollectionHeading } from "@/components/records/collection-heading"
import { GoogleSyncButton } from "@/components/knowledge/google-sync"
import { CountedAbove } from "@/components/records/counted-tabs"
import { AddButton, CollectionCard, type ToolbarViewSlot } from "@/components/deep-link/screen-bits"
import { LoadMore } from "@/components/records/load-more"
import { PagedFind } from "@/components/records/paged-find"
import { COLLECTION_SORTS, translatedSorts } from "@/lib/collection-sorts"
import { translatedFacets } from "@/lib/collection-filters"
import { MeetingFormDialog, type MeetingFormValues } from "@/components/meetings/meeting-form-dialog"
import { RecordCalendar, type CalendarEntry } from "@/components/records/record-calendar"
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


/** WHAT "ALL" SHOWS (CHECKLIST 9.1: "all, with far more columns"). The two-field
 * list is for scanning; this is the one somebody reads across.
 *
 * SIX COLUMNS, NOT NINE. "Every fact a meeting row can state" was the brief and
 * nine columns was the result — the widest table in either front door, against
 * N1's table budget of six. A table's column header does the labelling, which is
 * why it gets six where a list row gets four; past that the row stops being
 * scannable and becomes something you read, which is what the record is for.
 *
 * The three that went: `Why we met` and `Notes` are prose, and prose in a table
 * cell is a truncated sentence nobody can read either way; `Reference` already
 * rides the record's own eyebrow (D4), so it was the same string in two places.
 * All three are on the meeting, one click from the row they were crowding. */
const ALL_COLUMNS = [
  field("name", "Meeting"),
  field("when", "When"),
  field("client", "Account"),
  field("app", "App"),
  field("where", "Where"),
  field("state", "Status"),
]

/** WHAT THE DOOR CALLS EACH OF THOSE COLUMNS.
 *
 * The meetings list PAGES, so a column header orders it at the door or it does not order
 * it at all — arranging the fifty rows in the browser under a badge counting 254
 * is the lie `<PagedFind>` exists to stop, one control along (SEARCH.md § *The
 * third question*). So a header sends a NAME out of `MEETING_SORTS`, and the two
 * columns the door has no name for — App and Where — draw a plain header. A
 * header that cannot order is honest; one that looks like it can and does not is
 * the defect this whole lane is about.
 *
 * Hand-paired because it is a translation between two vocabularies (a shaped
 * row's column, and the door's menu name); the DIRECTION is not, it is read off
 * `COLLECTION_SORTS` so a header cannot land differently from the picker above
 * it offering the same order. */
const COLUMN_SORT: Record<string, string> = {
  name: "title",
  when: "when",
  client: "client",
  state: "status",
}

/** …AND THE PAIRING IS CHECKED AGAINST THE MENU, not trusted.
 *
 * `state: "status"` above is a name the door does not have. The meetings menu is
 * `when | title | client | added` (collection-sorts.ts, whose own comment
 * records that a Status option "went with the status: sorting by when a meeting
 * IS is already sorting by whether it has happened") — so the Status header was
 * a live-looking control sending an order nothing answers, which is the exact
 * defect the paragraph above says this table must not ship. It survived because
 * a hand-written pair has nobody to disagree with.
 *
 * So a name the menu does not offer produces NO `sort`, and the column draws a
 * plain header beside App and Where. The line stays in the map deliberately: it
 * records that somebody wanted Status ordered, and the day the door grows a
 * `status` option the header lights up on its own with no second edit here.
 *
 * `defaultDir` comes off the same lookup, so a header can never land in a
 * different direction from the picker above it offering the same order — that
 * is why the option object is found once and read twice. */
const ALL_COLUMN_HEADERS: TableColumn[] = ALL_COLUMNS.map((f) => {
  const option = COLLECTION_SORTS.meetings.options.find((o) => o.value === COLUMN_SORT[f.column])
  return {
    key: f.column,
    label: f.field.label,
    sort: option?.value,
    defaultDir: option?.defaultDir,
    // NO `sortType`/`sortKey` ON ANY OF THESE, and their absence is the
    // statement: every order this table can be put in is the DOOR's (the
    // `order={found.order}` at the render below). A browser-side comparison
    // declared here would arrange the fifty rows in hand under a badge counting
    // the whole meetings list — the lie `<PagedFind>` exists to stop, and worse
    // than the alphabetical dates it would be fixing.
  }
})

/* ── THE STRIP AND THE VIEW SWITCH, 2026-09-09 ──────────────────────────────
 *
 * THE CLIENT'S RULING, in her own words: *"tabs for meetings: this week, mine,
 * all"*. Told that this would delete the Calendar tab and that "Mine" did not
 * exist, she answered both at once: *"i was in the room, and calendar as a
 * view"*.
 *
 * So two changes, and only one of them is a rename.
 *
 * 1 · THE STRIP IS THIS WEEK · MINE · ALL. It was This week · Calendar · All.
 *     "Mine" means I WAS IN THE ROOM — attendance, not authorship — and it is
 *     answered by the DOOR (`view=mine`), because attendance lives in a JSON
 *     mirror column no browser filter can reach and a badge over a filtered page
 *     is the exact arrangement R16 forbids. `workers/content/src/lib/meetings.ts`
 *     carries the whole rule, the fallback for a meeting nobody synced, and what
 *     the scan costs.
 *
 * 2 · CALENDAR IS A VIEW, NOT A TAB — and it was not deleted, which is the half
 *     worth recording. Any tab can now be read as a list or as a month grid,
 *     through the toolbar's own view slot, so "my meetings, on a calendar" and
 *     "this week, on a calendar" are questions the screen can now be asked and
 *     could not be before. The pattern is Tickets' (`tickets-collection.tsx`'s
 *     `viewSlot`), followed rather than reinvented: a `ToolbarViewSlot` config
 *     handed to the row, never a node, so R53's fixed slot order places it.
 *
 * THE TWO ARE REMEMBERED SEPARATELY (`meeting-tab`, `meeting-view`) because they
 * are two independent choices now: switching to Mine must not throw away the
 * fact that somebody is reading in a calendar.
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
  // THE THREE TABS (client ruling, 2026-09-09 — the block above this component
  // carries her words). This week is past AND upcoming, because "this week" is
  // the week somebody is in rather than the days left of it; Mine is the ones
  // this person was in the room for; and All shows far more columns, which is
  // what makes it worth being a tab of its own at all.
  //
  // A NEW SLOT NAME (`meeting-tab`, not `view`) because the VALUES changed: the
  // old slot could be holding "calendar", which is no longer a tab and would
  // strand a returning reader on a strip with nothing selected. Remembered with
  // the screen — see web/lib/nav-memory.ts.
  //
  // `revive` IS THE GUARD, and it is the shape `useRemembered` documents for
  // exactly this: a remembered value is data about a world that has moved, so
  // anything that is not one of the three tabs lands on the default instead of
  // selecting nothing. The rename alone would have been enough today; the
  // revive is what makes the NEXT change to this strip safe.
  const [tab, setTab] = useRemembered<"week" | "mine" | "all">("meeting-tab", "week", (r) =>
    r === "week" || r === "mine" || r === "all" ? r : undefined
  )
  // …AND THE BODY, WHICH IS NOW A SEPARATE CHOICE. Every tab can be read either
  // way; list first and list by default, which is the client's own rule for
  // every view switch in the app ("for all of them (except dashboard) start with
  // list view", 2026-09-06).
  const [mode, setMode] = useRemembered<"list" | "calendar">("meeting-view", "list", (r) =>
    r === "list" || r === "calendar" ? r : undefined
  )
  const weekTotal = useCachedValue<number>(totalKey("meetings-week", teamId))
  // MINE'S OWN EXACT COUNT (R16), primed by the read below out of the same
  // response whose rows the tab shows — the door counted the question it listed.
  const mineTotal = useCachedValue<number>(totalKey("meetings-mine", teamId))
  // THIS WEEK IS ITS OWN READ (19 Aug 2026) — the door's week, not a browser
  // filter over the meetings list's newest page. The comment that used to sit on that
  // filter argued the week was inside page one for any agency that had not held
  // fifty meetings since Monday; the meetings list is ordered by start time DESCENDING,
  // so page one is the furthest-out FUTURE, and once repeating calendar entries
  // were swept in it ran from June 2027 to August 2027 with nothing of this week
  // in it. Badge 11, list empty. A client-side filter underneath a server
  // COUNT(*) is the arrangement R16 exists to forbid, and the search box on this
  // very screen had already been moved to the door for that reason.
  //
  // It costs one extra read while this tab is showing, and there is no way round
  // it: the week's rows are genuinely not in the page the meetings list hands back.
  // Only while it is showing — the other two views read the meetings list itself.
  //
  // WHICH LIST THE RESTING SCREEN IS STANDING ON, as an argument rather than as
  // a second name for the key: `meetingsKey(teamId, weekView)` is written out at
  // the cursor sidecar, the find bar and both Load more buttons, because R14's
  // and R15's checks read the control's OWN props for this collection's key —
  // and they are right to. A const holding the resolved key satisfies a
  // reader and nothing
  // else; the four censuses went red on it within one run.
  const weekView = tab === "week" ? ("week" as const) : undefined
  const weekQ = useCached<Meeting[]>(weekView ? meetingsKey(teamId, weekView) : null, () =>
    listFetch.meetings(teamId, "week")
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
    invalidate(meetingsKey(teamId, "week"))
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

  /** THE BODY SWITCH — list or month grid, on every tab (client ruling,
   * 2026-09-09: *"calendar as a view"*). A CONFIG and never a node, which is the
   * shape `PagedFind` takes and R53 requires, so this row's fixed slot order
   * (search → filters → sort → view → actions) places it and no call site can
   * put it somewhere else. The pattern is Tickets' own `viewSlot` — read that
   * one before changing this one; there is deliberately only one of these in the
   * app. */
  const viewSlot: ToolbarViewSlot = {
    views: [
      { value: "list", label: t("List"), icon: <ListBullets className="size-4" /> },
      { value: "calendar", label: t("Calendar"), icon: <CalendarBlank className="size-4" /> },
    ],
    value: mode,
    onValueChange: (v: string) => setMode(v === "calendar" ? "calendar" : "list"),
  }

  return (
    <CountedAbove active>
    <div className="flex flex-col gap-6">
      {/* R16: the strip below badges two exact server counts, so the heading
          stands down through the arbitration context rather than saying a
          number twice. */}
      <CollectionHeading sectionKey="meetings" total={total} />

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
              // "something is being asked".
              view: Object.keys(query).length > 0 ? "all" : tab,
              // …then the question itself, spread whole: `listQuery` forwards
              // every key, so a filter cannot be lost on the way to the door.
              ...query,
              cursor,
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
                value: "all",
                label: t("All"),
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
          // "all" is written out rather than left to that default on purpose: it
          // makes the key say which question it answered, so the day that
          // fetcher's own default changes this screen does not silently change
          // with it.
          monthNarrowing.view = tab
          // ALL shows far more columns (9.1). The other two TABS stay the
          // two-line list a person scans, which is the rulebook's own rule about
          // a table being for scanning and a list for reading. (It is a property
          // of the tab, not of the body: the calendar view is a month grid on
          // all three, because a grid has no columns to widen.)
          // The display is decided BEFORE the collection is tuned, so the tuner
          // can see it is drawing a table (whose column headers are its own sort
          // control) and stand its picker down — see tasks-screen for the whole
          // sentence.
          // TRANSLATED HERE: these columns are the host's own, spread on AFTER
          // resolveRecipe translated the recipe, so they had never been through
          // the pass and every heading rendered in English whatever language the
          // reader chose.
          const tableRecipe = withDataDrivenCollection(
            { ...recipe, display: "table" as const, fields: translateFields(ALL_COLUMNS, t) },
            data.rows ?? [],
            found.emptyText
          )
          // `listRecipe` IS DRAWN FOR THE WEEK AND MINE TABS in list mode (the
          // calendar view and the All tab each draw their own renderer), so
          // leaving its `emptyText` to `withDataDrivenCollection`'s own
          // fallback meant a genuinely quiet week fell through to the
          // COLLECTION's empty sentence — "Nothing in Meetings yet."
          // (screens.ts's `meetingsListRecipe`), the whole-history claim,
          // under a tab that only ever asks about seven days of it (2026-09-03
          // audit). `found.emptyText` ("Nothing matched.") still wins
          // mid-search; only the genuinely-empty tab gets its own honest word,
          // the same shape the calendar view's own
          // "Nothing in Meetings this month." already has.
          // …AND THE SENTENCE IS THE TAB'S, not the week's. It was hard-coded to
          // the week because the week was the only tab this recipe ever drew;
          // Mine draws it now too, and "Nothing in Meetings this week." under an
          // empty Mine would be a true sentence about the wrong question.
          // `found.emptyText` ("Nothing matched.") still wins mid-search.
          const listRecipe = withDataDrivenCollection(recipe, data.rows ?? [], found.emptyText ?? tabEmpty)
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
              {mode === "calendar" && !found.active && total === 0 ? (
                // GENUINELY EMPTY — the door's exact COUNT(*) (R16) says the
                // team has no meetings at all, and nothing is being asked.
                // The week and list tabs reach the engine's own register
                // through `ScreenRenderer`/`RecordTable`, which read the
                // create action published above; this grid never touches
                // `CollectionFrame`, so a new team was shown a month with
                // "Nothing in Meetings this month." under it — true, and no
                // help. The same two acts the provider above carries, said
                // directly, so all three tabs offer the same thing.
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
                  // month that is full of everybody else's meetings. Only All,
                  // which narrows nothing, keeps the grid's own month sentence.
                  emptyText={found.active ? found.emptyText : tab === "all" ? undefined : tabEmpty}
                  onOpen={(id) => onIntent({ kind: "open", module: "meetings", id })}
                />
              ) : tab === "all" ? (
                // THE MEETINGS LIST PAGES, so its headers ask the DOOR — `found.order`
                // is the same handle the picker above the table holds, so the
                // two controls are one question and the answer spans the whole
                // meetings list instead of the fifty rows in the browser. The picker
                // stays because it names orders that are not columns ("Recently
                // added"); the headers cover the ones that are.
                //
                // No `useKitPanel`: `CollectionCard` above (drawn by `wrap`) is
                // the ONE box now — Accounts and Tickets dropped it the same day
                // for the same reason ("the broken combination", screen-bits.tsx's
                // own doc on `CollectionCard`).
                <RecordTable
                  columns={ALL_COLUMN_HEADERS}
                  rows={data.rows ?? []}
                  // THE NUMBER IN FRONT OF THE MEETING, not a seventh column.
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
                />
              ) : (
                <ScreenRenderer
                  recipe={listRecipe}
                  data={data}
                  rights={rights}
                  onAction={onAction}
                  onIntent={onIntent}
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
              invalidate(meetingsKey(teamId, "week"))
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

      {/* WHY WE MEET, one level down. A link rather than a nav line: the purposes
          are the vocabulary this screen picks from, and a rail that lists both a
          page and the words behind it reads as two ideas. R16: the number is the
          door's exact total through the ONE seam, and an unloaded total renders
          nothing rather than a "0" that reads as "there are none". */}
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
          {t("Meeting purposes")}
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
