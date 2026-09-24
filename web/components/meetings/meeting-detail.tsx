"use client"

// ONE MEETING, ON ONE PAGE — no tabs. Aurora, 23 Sep 2026, verbatim:
// *"meetings: implement the one page, love how you did it."*
//
// THE CHASSIS IS THE TICKET'S AND THE STORY'S, NOT A THIRD ONE.
// `<RecordScreen panelVisible={false} footerVisible={false}>` draws the head
// alone, `<RecordDetailBody>` draws the two columns, and `<ScreenFooterSlot>`
// carries the dark band to the pane's own bottom edge. Every one of those
// three is a proved piece with nine rounds of live-injection behind it (R89 —
// `ticket-detail-body.tsx`'s own header has the account, and
// `record-detail-body.tsx` is the extraction of it), so nothing about the
// footer's position is re-derived here. A meeting is the fourth record to
// stand on it, after a ticket, a story and a knowledge source.
//
// THE REGIONS, in her order:
//
//   HEAD        chips (id, status, department, app, account), title, the
//               start time as subtitle, and the actions: Join (while the
//               meeting is still to come), Google Calendar, the edit pen and
//               the overflow menu.
//   MAIN        Agenda, inline-editable until the end passes; then what was
//               actually said, faded rather than boxed.
//   SIDE        Attendees, Location (in person only), Time log, Connections.
//   FOOTER      the kit's ink band: Latest activity, and who made this and
//               when.
//
// WHAT IS NOT HERE, AND WHY. The DETAILS section is struck at her own ruling
// ("do not include section details (its unecessry)") and the calendar tab's
// list of Google facts goes with it — they were the same section under two
// names. Every one of those fields is still on the row and still mirrored by
// the sweep; this is a screen deciding what it shows.
//
// AND SO IS "ATTACHED TO THE ENTRY", 24 Sep 2026. It was kept for one round on
// a flagged judgement — the files hanging off a calendar entry had no other
// door in this app — and she was asked directly and struck it: "kill that
// completely". Same shape as Notes: `meetings.google_attachments_json` is
// untouched, the sweep still rewrites it on every pass, and the door still
// maps it into `Meeting.googleAttachments`, which nothing on either front door
// now draws.
//
// WHAT A PERSON CAN STILL REACH, so the cost of that is written down where the
// next reader meets it rather than in a chat log:
//   · THE TRANSCRIPT, always — "What was said" carries its own "Open the
//     document" link, and on most meetings the transcript IS one of those
//     attachments (`transcriptFoundBy: "attachment"` means it was found on the
//     entry's own attachment list).
//   · ANY ATTACHED FILE THE KNOWLEDGE SWEEP HAS INGESTED, through CONNECTIONS.
//     A Drive file swept into the knowledge base carries the calendar event's
//     id, and `record-map.ts` joins `knowledge_sources.event_id` to
//     `meetings.google_event_id` under the relation "came out of" — so it is a
//     node on this record's own map, with a link.
//   · EVERYTHING ELSE, one click away, through the GOOGLE CALENDAR button in
//     this record's own title: the entry itself lists its attachments. That is
//     the honest answer for a file nobody has swept — a Drive doc in a folder
//     the team never shared, or a non-Drive URL — which is the one class that
//     genuinely lost its in-app route.
// Nothing is lost from the DATA either way: the list is still on the row, so
// restoring the section is a render, not a re-sync.
//
// THE AGENDA LEADS, and that is the whole argument for this module existing.
// Somebody opening a meeting from six months ago is not looking for who
// created the row — they are looking for what was meant to be covered and what
// was actually said. Its history is reached from the ink footer's Latest
// activity column, on the client's 2026-09-06 ruling;
// web/components/records/activity-panel.tsx carries that ruling and its argument.
//
// ── NOTES ARE GONE FROM THIS SCREEN, 23 SEP 2026 ────────────────────────────
//
// Aurora, verbatim: *"on meetings: rmeove notes (we have transcript for
// that)"*. A UI removal, NOT a data one: `meetings.notes` is still a column
// on every team database, every row that holds text still holds it, the
// update door still reads and writes the field, and the knowledge-base sweep
// still ingests it (`workers/content/src/lib/knowledge-ingest.ts`). What is
// gone is the open field, its Save button, its heading and the word "notes"
// from this record's first tab.
//
// WHICH IS WHY `save()` BELOW STILL SENDS `notes`. The update door REPLACES
// what it is given (`updateMeeting`, workers/content/src/lib/meetings.ts) —
// so a form that no longer carries the field would have wiped what is stored
// the first time anybody edited a meeting. It sends `item.notes` straight
// back, unchanged, which is the same move `saveAgenda` makes for every other
// field it is not touching.
//
// ── THE AGENDA IS THE OPEN FIELD NOW, AND ONLY UNTIL THE MEETING ENDS ───────
//
// Aurora, same round, verbatim: *"for meeting: agenda as open field shoudl
// only be befor eor during meeting. when end is in the past can only be
// edited on edit screen"*. `agendaIsOpenField` below is that sentence as one
// expression, with the clock passed IN rather than read, so the boundary can
// be tested a minute either side of it. The old rule this replaces was the
// other way round — the NOTES were the open field and the agenda was never
// editable here — which is the pair of sentences the 9.6 comments used to
// carry.
//
// ONE TITLE STYLE FOR EVERY RECORD SECTION (R108), 22 Sep 2026: Agenda,
// Notes, What was said, Who was invited and Attached to the entry all used
// to read `text-muted-foreground text-sm font-medium`, a shape of their own
// rather than the eyebrow `TicketSidePanel`'s own fix gave the ticket and
// story pages (`text-micro text-muted-foreground uppercase`,
// `web/components/tickets/ticket-detail-body.tsx`). Same class list now,
// every one of the five.
//
// NOTHING HERE REACHES OUTSIDE THIS APP ANY MORE. There was an "Add to my
// calendar" button; the calendar is one-way as of 18 August 2026, so a meeting
// arranged here stays here and a meeting arranged in Google arrives here on the
// next sweep with its guests, its join link and its attachments. Reading the
// transcript is the one action left that talks to Google, and it only reads.
//
// AND THERE IS A FOURTH TAB: the calendar event itself. The owner asked for the
// link that opens the meeting in Google Calendar and for "location, stakeholders,
// or any other calendar data or metadata… pulled in and organised correctly", and
// this is where organised correctly lands. It is a TAB rather than more rows on
// Overview because it is a different KIND of fact: everything on Overview is
// something one of us decided, and everything here is something Google is telling
// us, with a stamp saying when it last did.
//
// THE STAKEHOLDERS ARE TWO READS DELIBERATELY. Who was invited and what they
// answered is on the meeting row, mirrored by the sweep; which of those addresses
// belongs to a colleague or a client is asked separately, because that second
// fact has a different lifetime — a contact added next week should light up on a
// meeting held last week, and a link frozen at sync time never would.
//
// AND THE TRANSCRIPT SITS UNDER THE AGENDA, not in a tab of its own, because
// what we meant to cover and what was actually said are the same question
// asked twice and a person reads them in that order. It used to be three —
// agenda, notes, transcript — and the middle one is what her 23 Sep ruling
// removed, on the grounds that the transcript already IS the write-up.
//
// ── TWO BUTTONS MOVED UP TO THE TITLE, 23 SEP 2026 ──────────────────────────
//
// Aurora, same round, verbatim: *"meetings detail: button join (rename to
// only join) move it to title, also move Google Calendar (rename it to only
// this) to title"*. "Join the call" and "Open in Google Calendar" used to sit
// at the top of the CALENDAR tab (`CalendarPanel`, below) — one tab away from
// a person who opened the meeting to join it. They now read exactly "Join"
// and "Google Calendar" and render in `actions`, which is the title's own
// row: `RecordScreen` (record-chrome.tsx) hands that node to the kit's
// `Title` as `[data-slot=title-actions]` and wears `RECORD_TITLE_TREATMENT`
// (R52, shared/web/record-heading.tsx) — the 80%/shrink-0 split that keeps a
// long name from pushing the buttons onto a second line — while `Title`'s own
// row is `items-center` (R100), so the buttons sit on the middle of the
// title's own line box. Nothing here positions anything by hand, which is the
// point of both laws.

import * as React from "react"

import { cn } from "@shared/ui/lib/utils"
import { Button, buttonVariants } from "@shared/ui/components/button/button"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { Spinner } from "@shared/ui/components/spinner/spinner"
import { toast } from "@shared/ui/components/sonner/sonner"
// NO `TabsView` AND NO `useRemembered` ANY MORE — this record has no tab strip
// to draw and therefore no open tab to remember (23 Sep 2026, the one-page
// ruling; this file's own header).
import { Notes } from "@shared/web/notes-editor/notes-editor"
import { Badge } from "@shared/ui/components/badge/badge"
import { ArrowSquareOut, FileText, PencilSimple, Power, Video } from "@shared/ui/foundations/icons"
import { EditPenButton } from "@shared/web/edit-pen-button"

import type { Account, AppRow, Meeting, MeetingPersonLink, MeetingPurpose, TeamMember } from "@shared/types"
import { MeetingFormDialog, type MeetingFormValues } from "@/components/meetings/meeting-form-dialog"
import { ConnectionsPanel } from "@/components/records/connections-panel"
// NO `OverviewList` — the Details section is struck (Aurora, 23 Sep 2026: "do
// not include section details (its unecessry)"), and with it the Google-facts
// list the calendar tab drew through the same component.
import { WorkLogsPanel, workLogsTotalKey } from "@/components/work/work-logs-panel"
import { RecordDetailBody } from "@/components/records/record-detail-body"
import { ScreenFooterSlot } from "@/components/shell/footer-slot"
import { TicketSidePanel } from "@/components/tickets/ticket-detail-body"
import { EmptyGatedPanel } from "@/components/deep-link/screen-bits"
import { PersonCard } from "@shared/web/person-card"
// The one seam that turns a user id into a staff photograph, against the
// members cache — never a second lookup of our own (R111, R35).
import { memberFace } from "@/components/tickets/tickets-collection"
import { orderChips } from "@shared/web/chip-order"
import { RecordRef } from "@shared/web/record-ref"
import { departmentGlyph } from "@shared/departments"
import { nameInitials } from "@/lib/identity"
import { TranslateAction, useHumanTranslation } from "@/components/records/translate-human-text"
import { useConfirm } from "@shared/web/use-confirm"
import { ApiFailure, content, tenancy } from "@/lib/api"
import {
  RecordActionsMenu,
  RecordChipLink,
  RecordFooterBand,
  RecordScreen,
  type RecordAction,
} from "@/components/records/record-chrome"
import { HeadActionsFoldMenu, HEAD_ACTIONS_ROW_CLASS, type HeadActionItem } from "@shared/web/head-actions"
import { appsKey, listFetch, meetingPeopleKey, meetingsKey, meetingTranscriptKey, recordMapKey } from "@/lib/live-resources"
// NO `CONCEPT_ICON` — it named the Work logs TAB's own glyph, and there is
// no tab strip on this record any more (23 Sep 2026).
import { usePermissions } from "@/lib/perms"
import { RecordMark } from "@shared/web/record-mark"
import { stripPictographs } from "@shared/text-clean"
import { formatCount } from "@shared/web/format-count"
import { formatDateTime, toLocalInput } from "@shared/web/format"
import { RichText } from "@shared/web/rich-text-view"
import { invalidate, primeCache, useCached, useCachedValue } from "@shared/web/store"
import { recordActivityKey, useRecordActivity } from "@/lib/use-record-activity"
import { useRecordCounts } from "@/lib/use-record-counts"
// Every URL bound to an attribute goes through the seam, Google's included —
// see the note in google-source-dialog.tsx for why "it came from Google" is not
// a reason to skip it.
// NO `safeSrc` — its one reader here was the attachment row's own Google file
// icon, and the attachments section is removed (24 Sep 2026, her "kill that
// completely"). `safeHref` stays: the transcript link, the two title links and
// the Maps link all go through it.
import { richTextValue, safeHref } from "@shared/web/rich-text"
import { useLanguage } from "@shared/web/language"

/** WHEN THE MEETING IS OVER, in milliseconds — the instant the agenda stops
 * being an open field.
 *
 * `endsAt` IS NULLABLE and most meetings in this base carry one; where it is
 * absent the START is the end. That is a judgement and it is written here
 * rather than guessed at the call site: a meeting with no stated finish has
 * exactly one moment on the record, and treating that moment as the boundary
 * keeps the rule "before or during" true of the only time anybody wrote down.
 * The alternative — leaving such a meeting editable for ever — would make the
 * ruling depend on a field nobody is required to fill.
 *
 * A DATE THAT WILL NOT PARSE falls through to the start for the same reason
 * `record-week.tsx`'s own `parseLocalDay` falls through to today: a broken
 * stamp must not decide a permission. */
export function meetingEndMs(m: Pick<Meeting, "startsAt" | "endsAt">): number {
  const end = m.endsAt ? Date.parse(m.endsAt) : Number.NaN
  return Number.isFinite(end) ? end : Date.parse(m.startsAt)
}

/** IS THE AGENDA AN OPEN FIELD RIGHT NOW? Aurora's ruling, 23 Sep 2026,
 * verbatim: *"for meeting: agenda as open field shoudl only be befor eor
 * during meeting. when end is in the past can only be edited on edit screen"*.
 *
 * THE BOUNDARY IS EXACT AND IT IS `<`: the field is open while `now` is
 * STRICTLY BEFORE the end, so the meeting's own end instant is already past
 * ("when end is in the past" — at the end it is no longer before it). A minute
 * either side of that instant is what `web/test/meetings-rulings.test.tsx`
 * pins.
 *
 * THE CLOCK IS A PARAMETER, NEVER `Date.now()` READ IN HERE. A rule about time
 * that reads the real clock is a rule nothing can test at its own edge, and
 * this one has an edge by construction. The screen passes the clock it read
 * once per render; a test passes the two instants that matter.
 *
 * A CANCELLED MEETING IS CLOSED whatever the clock says — that is the
 * module's own delete, the same sentence the notes field used to carry before
 * it was removed, and it outranks the time. */
export function agendaIsOpenField(
  m: Pick<Meeting, "startsAt" | "endsAt" | "active">,
  nowMs: number
): boolean {
  if (!m.active) return false
  return !meetingHasEnded(m, nowMs)
}

/** HAS THE MEETING FINISHED? The same instant `agendaIsOpenField` turns on,
 * named on its own because a SECOND ruling now depends on it and the two must
 * not drift into two ideas of when a meeting is over.
 *
 * Aurora, 23 Sep 2026, on the one-page design: the JOIN button disappears once
 * the meeting is over — a dead Join on a March meeting is noise, and a link
 * that opens a call nobody is in is worse than no link, because a person
 * presses it before they read the date. GOOGLE CALENDAR STAYS, because it
 * still opens something real: the entry, with its guests and its history, for
 * as long as the calendar keeps it.
 *
 * `>=`, THE EXACT COMPLEMENT of `agendaIsOpenField`'s own `<`: at the end
 * instant the meeting HAS ended, which is the same boundary her agenda ruling
 * draws ("when end is in the past") read from the other side. One expression,
 * so a test at the edge proves both.
 *
 * IT SAYS NOTHING ABOUT `active`. A CANCELLED meeting has not "ended" — it was
 * called off — and the two facts are answered separately on purpose: the
 * agenda closes on either, and Join is a question about the CLOCK. A cancelled
 * meeting still in the future keeps whatever link Google still holds, exactly
 * as its calendar entry does. */
export function meetingHasEnded(m: Pick<Meeting, "startsAt" | "endsAt">, nowMs: number): boolean {
  return nowMs >= meetingEndMs(m)
}

/** THE AGENDA, AS THE SCREEN DRAWS IT — an open field before and during the
 * meeting, a read of what is written afterwards.
 *
 * ITS OWN COMPONENT, and not eleven lines inside the panel renderer, for one
 * reason: `now` has to arrive from outside for the boundary above to be
 * testable at its own edge, and a boolean threaded into the middle of a
 * 400-line render is a boolean nothing can mount on its own. This can be
 * rendered with a clock a minute before the end and a clock a minute after it,
 * which is exactly what the ruling is about.
 *
 * WHEN IT IS CLOSED there is still a door: the Edit pen in the title opens
 * `MeetingFormDialog`, whose Agenda field is untouched — "can only be edited
 * on edit screen" is the other half of her sentence, and it needed no code,
 * only this field to stop offering itself. */
export function MeetingAgendaSection({
  meeting,
  now,
  canEdit,
  busy,
  html,
  onSave,
}: {
  meeting: Pick<Meeting, "id" | "startsAt" | "endsAt" | "active" | "agenda">
  /** the clock, read ONCE by the caller — see `agendaIsOpenField` for why it
   *  is never read in here */
  now: number
  canEdit: boolean
  /** true while this section's own save is in flight */
  busy: boolean
  /** the agenda as it should READ — the caller's own translation seam has
   *  already been through it (`useHumanTranslation`) */
  html: string
  onSave: (html: string) => void
}) {
  const { t } = useLanguage()
  const [draft, setDraft] = React.useState<string | null>(null)
  const open = canEdit && agendaIsOpenField(meeting, now)
  return (
    <section className="flex flex-col gap-2">
      {/* The heading IS the editor's label — `aria-labelledby` below points at
          this id. A static id is safe: this screen resolves ONE meeting, never
          a list. R108: the same eyebrow register every other record section
          on this page wears. */}
      <h2 id="meeting-agenda-heading" className="text-micro text-muted-foreground uppercase">
        {t("Agenda")}
      </h2>
      {open ? (
        <>
          {/* Uncontrolled, keyed on the row's ID — which does NOT change when
              a colleague saves the same meeting, so their save never re-seeds
              under what you are typing (the owner's ruling, 2026-09-07;
              web/test/last-save-wins.test.tsx locks the same rule for every
              form). */}
          <Notes
            key={meeting.id}
            aria-labelledby="meeting-agenda-heading"
            disabled={busy}
            defaultValue={meeting.agenda ?? ""}
            onChange={(next) => setDraft(next)}
            placeholder={t("What we mean to cover.")}
            className="min-h-40"
          />
          <div className="flex justify-end">
            {/* BLACK, NOT MANGO — R84: mango lives only in a title component,
                and this is a record SECTION's own save. The notes editor this
                replaces carried no `variant` at all (mango, `Button`'s own
                default) and passed the census only by accident: it was written
                INSIDE `<TabsView renderPanel={…}>`, a JSX attribute initializer
                nested under `<RecordScreen>`, and the census walks ancestors
                through exactly that. Pulling this section out into a component
                of its own — which is what makes its own clock injectable —
                took the accidental ancestor away and the census said so on the
                first run. `inverse` is the kit's charcoal, what R84 asks every
                button off the title to be. */}
            <Button
              variant="inverse"
              size="sm"
              disabled={busy || draft === null}
              onClick={() => onSave(draft ?? "")}
              className="gap-1"
            >
              {busy ? <Spinner /> : null}
              {t("Save agenda")}
            </Button>
          </div>
        </>
      ) : meeting.agenda ? (
        <RichText html={html} />
      ) : (
        <p className="text-muted-foreground text-sm">{t("Nothing written down yet.")}</p>
      )}
    </section>
  )
}

/** IS THIS A PLACE, OR A LINK SOMEBODY PASTED? `meetings.location` is ONE
 * free-text column mirrored straight off Google's `event.location`
 * (`workers/content/src/lib/meetings.ts`'s sweep), and people put three
 * different kinds of thing in it: a room, a street address, and a video link.
 * The third is the one that would put a pin on a city, so it is subtracted
 * here rather than trusted.
 *
 * A URL IS NOT AN ADDRESS. `google_join_url` already catches Meet AND anything
 * Google filed under `conferenceData` — a Zoom link parked there is the join
 * link (`google-api.ts`'s own `joinUrl`) — but a Zoom or Teams URL TYPED into
 * the calendar's Location field is not in `conferenceData` at all, so it
 * arrives here as ordinary text. `URL` parsing is the whole test: anything the
 * browser reads as an absolute URL is a way to join, not a place to go. */
function locationIsAPlace(location: string | null | undefined): boolean {
  const text = (location ?? "").trim()
  if (!text) return false
  try {
    // A bare "Berlin" throws; "https://zoom.us/j/1" and "zoommtg://…" do not.
    new URL(text)
    return false
  } catch {
    return true
  }
}

/** IN PERSON — the brief's own test, verbatim: "the meeting has an address and
 * nothing to join", plus the URL guard above.
 *
 * WHAT THIS PAIR ACTUALLY SEPARATES, AND WHAT IT DOES NOT — measured off the
 * ingest rather than assumed, and reported rather than hidden:
 *
 *   · A GOOGLE MEET call usually carries NO location at all (the link lives in
 *     `hangoutLink`/`conferenceData`, never the Location field), so it fails
 *     the first half and is correctly not in person.
 *   · A ROOM BOOKING carries the room's own name in Location, which is a
 *     place, and normally no join link. Correct.
 *   · A PASTED VIDEO LINK in Location with no `conferenceData` would have read
 *     as in person on the pair alone. `locationIsAPlace` is what stops it.
 *   · A HYBRID meeting — a real room AND a Meet link — reads as NOT in person,
 *     because it has something to join. That is the brief's own rule applied
 *     honestly, and it is the case worth her word: the room is real and the
 *     section will not draw.
 *   · A STRONGER SIGNAL EXISTS AND IS DELIBERATELY NOT USED HERE. Google marks
 *     a booked room as a RESOURCE attendee (`MeetingGuest.resource`, the same
 *     flag the Attendees list subtracts), which is proof of a physical room in
 *     a way free text never is. Using it would change the hybrid answer above,
 *     which is a ruling rather than a refactor, so it is flagged instead of
 *     taken. */
export function meetingIsInPerson(
  m: Pick<Meeting, "location" | "googleJoinUrl">
): boolean {
  return locationIsAPlace(m.location) && !m.googleJoinUrl
}

/** WHERE IT IS — the in-person section, under Attendees. Aurora chose VIEW
 * TWO, the small map thumbnail: a map with a pin, the place name and address
 * under it, and a link out to Maps.
 *
 * ── WHAT IS BUILT TODAY, AND WHY THE THUMBNAIL IS NOT ────────────────────────
 *
 * This is VIEW ONE — the place name, the address lines and the way out — and
 * the brief asks for exactly that first: "there is no Google Maps key on
 * staging yet… That fallback is not an error state and must not look like one.
 * It is the normal appearance until keys exist, so build and test it first."
 * So nothing here reads as a failure: no warning tone, no "could not load", no
 * empty plate. It is an address, said plainly, with a link.
 *
 * THE THUMBNAIL IS NOT INVENTED HERE, AND THE GAP IS NAMED. Two things are
 * missing and neither can be closed from this file:
 *
 *   1 · THE CONFIG DOOR CANNOT SERVE A STATIC IMAGE. `getMapsConfig`
 *       (`workers/tenancy/src/routes/maps-config.ts`) composes ONE url — the
 *       Maps JAVASCRIPT API script (`maps.googleapis.com/maps/api/js`) — and
 *       returns `{ scriptUrl }`. A static thumbnail is a different endpoint
 *       (`/maps/api/staticmap`) with its own parameters, and that door does not
 *       build it. Reaching the key by pulling it back out of `scriptUrl` in the
 *       browser is exactly what that door's own comment forbids ("the browser
 *       receives the finished URL rather than assembling one from a bare value
 *       anywhere in the front end's own source"), and widening the door is not
 *       this lane's to do. WHAT IS MISSING, precisely: a second composed url on
 *       the same response — the same `GOOGLE_MAPS_BROWSER_KEY` class of
 *       credential, never `GOOGLE_MAPS_GEOCODE_KEY` — built server-side from a
 *       centre, a zoom, a size and a marker the caller passes.
 *
 *   2 · A MEETING HAS NO COORDINATES, AND FREE TEXT MUST NOT BE HANDED TO A
 *       PIN. `meetings.location` is one unvalidated string; the meetings table
 *       carries no lat/lng and there is no geocode step on this record (the
 *       accounts lane's own geocoding stopped at an unminted migration —
 *       `web/components/accounts/account-map.ts`'s header). Handing that string
 *       to `staticmap?center=` makes GOOGLE guess, and Google answers a bad
 *       guess with a confident map of somewhere — a pin on the wrong city,
 *       which is the one outcome the brief rules out. So: NO PIN WITHOUT
 *       COORDINATES. When the door and a resolved position both exist, the
 *       thumbnail draws; until either is missing, this view is what shows, and
 *       it is not an error.
 *
 * THE SPLIT INTO A NAME AND ITS ADDRESS LINES is the one thing this file does
 * decide, and it decides it from the text rather than from a second column:
 * an address written the way people write one puts the place first and the
 * street after a comma ("Studio 4, Oranienstr. 12, Berlin"). First part is the
 * name, the rest are the lines. No comma means one line and no name, which is
 * the honest reading of "Berlin-3-Kreuzberg (8)". */
export function MeetingLocationSection({
  meeting,
}: {
  meeting: Pick<Meeting, "location" | "googleJoinUrl">
}) {
  const { t } = useLanguage()
  if (!meetingIsInPerson(meeting)) return null
  const text = (meeting.location ?? "").trim()
  const parts = text.split(",").map((x) => x.trim()).filter(Boolean)
  const name = parts.length > 1 ? parts[0] : null
  const lines = parts.length > 1 ? parts.slice(1) : parts
  // THE WAY OUT, AND IT NEEDS NO KEY. Maps' own documented url form for a
  // search — no credential, no quota, and it works on a phone by opening the
  // Maps app. A LINK is not a PIN: handing the same free text to a search box
  // lets a person read the result and judge it, which is exactly what a
  // rendered pin would take away from them.
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`
  return (
    <TicketSidePanel title={t("Location")}>
      <div data-slot="meeting-location" className="flex flex-col gap-1">
        {name && <p className="text-sm font-[var(--font-weight-medium)]">{name}</p>}
        {lines.map((line) => (
          <p key={line} className="text-muted-foreground text-sm">
            {line}
          </p>
        ))}
        <a
          href={safeHref(mapsUrl)}
          target="_blank"
          rel="noreferrer noopener"
          className="text-muted-foreground hover:text-foreground mt-1 inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
        >
          <ArrowSquareOut className="size-3" aria-hidden /> {t("Open in Maps")}
        </a>
      </div>
    </TicketSidePanel>
  )
}

/** WHAT WAS ACTUALLY SAID — the transcript, FADED rather than boxed.
 *
 * AURORA CHOSE THE FADE OVER A SCROLLING BOX, 23 Sep 2026, on the one-page
 * design: it fades out at roughly ten lines with the document one click away,
 * so the page stays one screen. What it replaces is a `max-h-96 overflow-y-
 * auto` well, sanctioned under R91 on 21 Sep ("a transcript flowing into the
 * page would bury everything else on the record") — her new ruling answers the
 * same worry a different way, so that exemption is deleted from
 * `NO_NESTED_SCROLL_EXEMPT` rather than left pinned to a shape nothing draws.
 * There is no scroller here at all now: `overflow-hidden` CLIPS, it does not
 * scroll, so this section is outside R91's subject entirely rather than
 * excused from it.
 *
 * TEN LINES, ARITHMETIC RATHER THAN A GUESS: `--text-sm` is 0.875rem with a
 * 1.45 line height (shared/ui/foundations/tokens/tokens.css), so ten lines is
 * 0.875 × 1.45 × 10 = 12.6875rem. `12.7rem` is that, rounded up by a hair so a
 * tenth line is never clipped mid-stroke by a rounding error.
 *
 * THE FADE IS A TOKEN, NEVER A COLOUR (R32): `var(--background)` is the page's
 * own ground in both themes, so the text dissolves into whatever it is
 * standing on rather than into a grey somebody picked. `aria-hidden` and
 * `pointer-events-none`, because it is a gradient over words and not a thing
 * to read or to click.
 *
 * THE WORDS ARE ALL STILL IN THE DOM — the clip is visual. A screen reader
 * reads the whole transcript, and a find-in-page still matches past the tenth
 * line. The fade is what a sighted reader sees, not what the page contains. */
export function MeetingTranscriptSection({
  meeting,
  read,
}: {
  meeting: Pick<Meeting, "transcriptCapturedAt" | "transcriptFoundBy" | "transcriptUrl" | "knowledgeIndexedAt">
  /** the caller's own `useCached` value — `undefined` while it is in flight */
  read: { text: string; note: string | null; url: string | null } | undefined
}) {
  const { t } = useLanguage()
  if (!meeting.transcriptCapturedAt) return null
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-micro text-muted-foreground uppercase">{t("What was said")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {/* HOW WE KNOW THIS IS THE RIGHT TRANSCRIPT. The three hunts do not
              prove the same thing — one is a fact Google recorded against this
              entry, the other two are matches — so the record says which one
              found it rather than presenting all three as equally certain. */}
          <Badge variant="secondary" className="text-badge">
            {FOUND_BY[meeting.transcriptFoundBy ?? ""] ?? t("Found in Google")}
          </Badge>
          {/* AND WHETHER THE WORDS ARE ANSWERABLE, which is a different fact
              from having fetched them. The sweep indexes a captured transcript
              within the quarter hour, so "not yet" is real and temporary. */}
          <Badge variant={meeting.knowledgeIndexedAt ? "secondary" : "outline"} className="text-badge">
            {meeting.knowledgeIndexedAt
              ? t("In the knowledge base")
              : t("Not in the knowledge base yet")}
          </Badge>
          {/* THE DOCUMENT, ONE CLICK AWAY — the other half of her fade ruling:
              the page shows the opening and the whole thing is one press from
              here, rather than a second scrolling region on the record. */}
          {meeting.transcriptUrl && (
            <a
              href={safeHref(meeting.transcriptUrl)}
              target="_blank"
              rel="noreferrer noopener"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
            >
              <ArrowSquareOut className="size-3" aria-hidden /> {t("Open the document")}
            </a>
          )}
        </div>
      </div>
      {read === undefined ? (
        <Skeleton variant="list" lines={3} />
      ) : read.text ? (
        <>
          <div data-slot="transcript-fade" className="relative max-h-[12.7rem] overflow-hidden">
            <p className="text-sm whitespace-pre-wrap">{read.text}</p>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(to_bottom,transparent,var(--background))]"
            />
          </div>
          {/* NEVER SILENTLY TRIMMED. A transcript longer than one row may hold
              is cut at the DOOR and says so, in the same words a knowledge file
              uses — a different fact from this section's own visual fade. */}
          {read.note && <p className="text-muted-foreground text-xs">{read.note}</p>}
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          {t("The document was found but we couldn't read any words out of it. Open it in Google to read it there.")}
        </p>
      )}
    </section>
  )
}

export function MeetingDetailScreen({
  teamId,
  meetingId,
  basePath,
}: {
  teamId: string
  meetingId: string
  /** the meetings collection in the URL form we arrived through — the same
   * `sectionPath` every other cross-linking record's screen already takes
   * (app-detail.tsx, sprint-detail.tsx, …), so `RecordChipLink` below can
   * build a real href rather than a hand-rolled one. */
  basePath: string
}) {
  const { t, lang } = useLanguage()
  const meetingsQ = useCached<Meeting[]>(meetingsKey(teamId), () => listFetch.meetings(teamId))
  // The list is a PAGE (R14), so the record may not be in it — a link straight to
  // a meeting the loaded prefix doesn't reach must still open. The by-id read
  // used to wait for the list to say so first (`meetingsQ.data !== undefined`),
  // which on a cold deep link past the cursor meant two round trips in series
  // for the one read that could actually find the meeting
  // (round_trip_review, 2026-09-10). `!inPage` alone asks the same question of
  // whatever the list already has — true from the first cold render, since
  // `inPage` is `null` before `meetingsQ` has answered — so both reads start
  // together instead.
  const inPage = meetingsQ.data?.find((m) => m.id === meetingId) ?? null
  const oneQ = useCached<Meeting | null>(!inPage ? `meeting:one:${meetingId}` : null, () =>
    content.meetingOne(meetingId)
  )
  const item = inPage ?? oneQ.data ?? null
  // THE SECONDARY HALF, ONCE THE RECORD IS IN HAND — a picker, a badge or a
  // panel BESIDE the record rather than the record, and until 7 Sep 2026 every
  // one of them left the browser in front of it (web/test/cold-screen-hops.test.tsx
  // censused this screen before a person could read it).
  //
  // `have` is the DETERMINISTIC gate shared/web/after-paint.ts asks callers to
  // prefer over its own scheduler — "exact, needs no scheduler, and cannot be
  // flaky". Every read below is about THIS record or the form that edits it, so
  // every one of them has that dependency already.
  const have = item !== null
  const host = { base: `${basePath}/${meetingId}` }

  // The generic record feed (R5) + the exact server total its tab badges (R8 for
  // the place, R16 for the number — never the loaded page's length).
  const activity = useRecordActivity("meetings", have ? meetingId : null)

  // THE TWO READS THE LIST NEVER MAKES. Both are keyed off this meeting and both
  // are asked only when there is something to ask about: a meeting that was never
  // in a calendar has no guests to resolve, and one with nothing captured has no
  // words to fetch. Their keys hang off the meetings live registry entry, so a
  // ping about this row drops them with it.
  const peopleQ = useCached<MeetingPersonLink[]>(
    item?.googleGuests.length ? meetingPeopleKey(meetingId) : null,
    () => content.meetingPeople(meetingId).then((r) => r.links)
  )
  const transcriptQ = useCached<{ text: string; note: string | null; url: string | null }>(
    item?.transcriptCapturedAt ? meetingTranscriptKey(meetingId) : null,
    () => content.meetingTranscript(meetingId)
  )

  /* THE TEAM'S OWN PEOPLE, FOR THE ATTENDEES' FACES — R111 (a photograph always
   * beats initials), the free half of that law on this screen.
   *
   * `meetingPeople` already tells us WHICH addresses on a calendar invitation
   * are one of us (`memberUserId`) and which belong to a client's contact
   * (`accountId`), because the chips beside each name have said so since this
   * screen was built. What that door does NOT carry back is a picture. For a
   * COLLEAGUE it does not have to: `memberUserId` is a real user id, and every
   * other screen in the app resolves a staff face by looking exactly that id up
   * in this cache (`memberFace`, tickets-collection.tsx). So this is a lookup,
   * not a door change.
   *
   * THE SAME CACHE KEY EVERY OTHER SCREEN READS (R56): `members:<teamId>` is
   * what `help-detail.tsx`, the task form options and the screen engine all
   * ask for, so a reader with a ticket open in another pane pays for this list
   * once rather than twice.
   *
   * ONLY ONCE THERE IS SOMEBODY TO RESOLVE. A meeting nobody was invited to has
   * no faces to draw, so it buys nothing and is not asked for. */
  const membersQ = useCached<TeamMember[]>(
    item?.googleGuests.length ? `members:${teamId}` : null,
    () => tenancy.members().then((r) => r.members)
  )

  const { can } = usePermissions(teamId)
  const canEdit = can("meetings", "update")
  const canCancel = can("meetings", "delete")
  // Reading the transcript reaches the caller's own Drive and calendar with the
  // caller's own token, so the door asks for `google:read` on top of this
  // module's `edit`. This only decides whether the action is worth offering.
  //
  // It used to ask for `google:update` plus a "Calendar on your behalf" switch,
  // because the same menu also pushed a meeting INTO a calendar. Nothing pushes
  // any more, so demanding a write right to READ a transcript would be gating a
  // read behind a capability the app no longer has.
  const canReadGoogle = can("google", "read")
  // THE TIME A MEETING TOOK. `meetings` is one of the four things a work log
  // may hang off (WORK_LOG_TARGETS), and this is the hours a conversation cost
  // — written by the transcript import rather than by a person, which is why
  // the tab reads and never offers to add one: a hand-typed row here would not
  // carry the marker the transcript writer puts on meeting time, so it would
  // sit outside the "with or without meeting time" filter the Work logs page
  // narrows by (9.3) — right in the total and quietly wrong in the split.
  // Correcting a row is still offered, because a wrong figure is worse.
  const canSeeTime = can("work", "read")
  const canEditTime = can("work", "update")
  // Counted when the MEETING opens rather than when the tab is clicked, for the
  // reason shared/record-counts.ts gives: a badge that only arrives with the
  // panel is blank exactly when somebody is deciding whether to open it.
  useRecordCounts("meetings", have ? meetingId : null)
  const timeTotal = useCachedValue<number | null>(workLogsTotalKey("meetings", meetingId))

  // WHAT THIS CALL IS CONNECTED TO — the record map, read when the MEETING opens
  // rather than when the tab is clicked, for the same reason `useRecordCounts`
  // above gives: the badge is counted off this read (R16), and a badge that only
  // arrives with the panel is blank exactly when somebody is deciding whether to
  // open it.
  //
  // THE EDGE THAT MADE THIS WORTH DRAWING is the one a knowledge source carries:
  // an artefact says which Google calendar event it came out of, so a call now
  // gathers the email, the chat log and the transcript about that same half-hour
  // — none of which is a row in this database, and none of which had a
  // neighbourhood at all before (workers/content/src/lib/record-map.ts).
  //
  // It also draws the edges a meeting has always had: the client, the system and
  // why we met. So the tab is offered on EVERY meeting rather than gated on the
  // Google event id — measured on staging 9 Sep 2026, 192 of 460 live meetings
  // have at least one edge, and 148 of those have no artefacts at all and are
  // reached only through the account/app/purpose lines. Gating on the event id
  // would have hidden a real map from most of the meetings that have one.
  const mapQ = useCached(have ? recordMapKey("meetings", meetingId) : null, () =>
    content.recordMap("meetings", meetingId)
  )

  const accountsQ = useCached<Account[]>(have && canEdit ? `accounts:${teamId}` : null, () =>
    tenancy.accounts().then((r) => r.accounts)
  )
  // WHICH SYSTEM A MEETING WAS ABOUT. Read on the same condition as the accounts
  // above, and out of the SAME bounded cache the apps page holds — an agency has
  // tens of apps, so the picker costs nothing anybody has not already paid.
  const appsQ = useCached<AppRow[]>(have && canEdit ? appsKey(teamId) : null, () =>
    listFetch.apps(teamId)
  )
  // READ FOR EVERY READER NOW, NOT ONLY AN EDITOR — the DEPARTMENT chip is
  // derived from it (Aurora, 23 Sep 2026: "for meetings: chips id, department,
  // app/account (with link)"). A meeting carries no department of its own: the
  // word lives on the meeting's PURPOSE (`MeetingPurpose.department`,
  // shared/types.ts), which is a settled taxonomy somebody curates once a year,
  // so the chip is a LOOKUP rather than a new column on the row. It used to be
  // gated `have && canEdit`, because the edit dialog's picker was its only
  // reader; a chip a reader cannot see because they cannot edit would be a
  // fact hidden by the wrong permission.
  const purposesQ = useCached<MeetingPurpose[]>(have ? `purposes:${teamId}` : null, () =>
    listFetch.purposes(teamId)
  )

  // The open tab is remembered per record for as long as this document
  // lives (web/lib/nav-memory.ts) — leaving to another section and coming
  // back lands on the tab she was reading, and a miss lands on "agenda".
  // NO REMEMBERED TAB ANY MORE. This screen had a `"tab"` slot from the day it
  // was built, renamed `"notes"` → `"agenda"` earlier the same day and given a
  // revive guard so a stored value could not strand the strip. The ONE-PAGE
  // ruling retires the slot outright: there is no strip, so there is nothing to
  // remember and nothing a stale value could select. `web/lib/nav-memory.ts`
  // drops an address nobody reads on its own.
  const [editing, setEditing] = React.useState(false)
  const [busy, setBusy] = React.useState<"held" | "active" | "calendar" | "transcript" | "agenda" | null>(null)

  // THE CLOCK, READ ONCE PER RENDER, and handed DOWN — never read inside the
  // rule that uses it (`agendaIsOpenField`, above this component, says why).
  // It is deliberately not state and there is no timer re-reading it: a person
  // sitting on a meeting's page as it ends sees the field close on their next
  // interaction, which is the same granularity every other clock-derived
  // sentence in this app already has (`shapeMeetingsList`'s own Past/Upcoming
  // is the identical read).
  const now = Date.now()

  // READ THE WRITE-UP IN YOUR OWN LANGUAGE, if you ask. The agenda is the one
  // thing left on a meeting a person typed (the notes are gone from this
  // screen, 23 Sep 2026 — this file's own header), so the array it goes in
  // holds one item. A hook, so it sits above the early returns below.
  const translation = useHumanTranslation(teamId, [item?.agenda])

  function patchLists(next: Meeting | null) {
    if (!next) return
    primeCache(`meeting:one:${meetingId}`, next)
    const cur = meetingsQ.data
    if (cur) primeCache(meetingsKey(teamId), cur.map((m) => (m.id === meetingId ? next : m)))
    // The footer's Latest activity rows AND the total come from one fetcher, so
    // dropping the key re-primes both.
    invalidate(recordActivityKey("meetings", meetingId))
  }

  async function save(values: MeetingFormValues) {
    const { meeting } = await content.updateMeeting({
      id: meetingId,
      title: values.title,
      startsAt: values.startsAt,
      endsAt: values.endsAt || null,
      accountId: values.accountId || null,
      appId: values.appId || null,
      purposeId: values.purposeId || null,
      location: values.location || null,
      agenda: values.agenda || null,
      // NOT `values.notes` — THE FORM NO LONGER HAS ONE (23 Sep 2026, this
      // file's own header). This door REPLACES what it is given, so sending
      // nothing here would blank whatever is stored. The row's own value goes
      // straight back, unchanged.
      notes: item?.notes ?? null,
    })
    patchLists(meeting)
    toast.success(t("Meeting updated."))
  }

  /** 9.2, IN ONE PRESS. Reading the transcript writes a row of time for each of
   * our own people who was in the room. The door does all of that; this reports
   * what it did, including the honest nothing. */
  async function readTranscript() {
    setBusy("transcript")
    try {
      const r = await content.readMeetingTranscript(meetingId)
      patchLists(r.meeting)
      if (!r.captured) toast.info(r.note ?? t("Nothing to read yet."))
      else
        toast.success(
          r.logsWritten > 0
            ? `Transcript read, and ${r.logsWritten} ${
                r.logsWritten === 1 ? "person's" : "people's"
              } time was logged.`
            : t("Transcript read.")
        )
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't read the transcript."))
    } finally {
      setBusy(null)
    }
  }

  /** THE AGENDA, saved from the record itself — the open field, before and
   * during the meeting (`agendaIsOpenField`, above). It goes through the
   * ordinary edit door with every one of the meeting's own values beside the
   * new agenda, because that door REPLACES what it is given: sending the
   * agenda alone would quietly blank the title — and, since 23 Sep 2026, the
   * NOTES too, which no screen can type into any more and which nothing may
   * therefore wipe on a person's behalf. */
  async function saveAgenda(row: Meeting, agenda: string) {
    setBusy("agenda")
    try {
      const { meeting } = await content.updateMeeting({
        id: meetingId,
        title: row.title,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        accountId: row.accountId,
        appId: row.appId,
        purposeId: row.purposeId,
        location: row.location,
        agenda: richTextValue(agenda) || null,
        notes: row.notes,
      })
      patchLists(meeting)
      toast.success(t("Agenda saved."))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't save the agenda."))
    } finally {
      setBusy(null)
    }
  }

  // THE CANCEL CONFIRM — client feedback, 2026-08-31, verbatim: "i was able to
  // cancel a meeting without confirming." Every other destructive action in
  // the app already asks first through this one shared dialog
  // (shared/web/use-confirm.tsx); this screen's own "Cancel it" was a bare
  // `setActive(false)` with no ask step at all, the one gap that ruling
  // found. `refresh` invalidates rather than patches — the same shape
  // app-detail.tsx's and account-detail.tsx's own archive/restore pairs use,
  // so a fourth screen following this pattern reads the same way.
  const refresh = React.useCallback(() => {
    invalidate(meetingsKey(teamId))
    invalidate(`meeting:one:${meetingId}`)
    invalidate(recordActivityKey("meetings", meetingId))
  }, [meetingId, teamId])
  const { busy: confirmBusy, ask, run, dialog: confirmDialog } = useConfirm(refresh)

  // THE CHROME STAYS, ONLY THE PANEL SPINS (RecordChrome's law 4) — part of
  // the rollout from help-detail (73414c58).
  // EITHER READ FAILING IS A FAILURE TO LOAD. See help-detail.tsx for the whole
  // story: this screen carried the other half of it, with no `oneQ` term
  // anywhere, so a failed by-id read left `oneQ.data` undefined for ever and the
  // gate below held the loading skeleton on screen with nothing coming. A
  // spinner that never resolves is the one state a person cannot act on.
  if (meetingsQ.error || (!inPage && oneQ.error))
    return (
      <RecordScreen
        title={<Skeleton className="h-7 w-48" />}
        state="error"
        copy={{ errorTitle: t("Couldn't load the meeting.") }}
        errorAction={
          <Button
            variant="secondary"
            onClick={() => {
              invalidate(meetingsKey(teamId))
              invalidate(`meeting:one:${meetingId}`)
            }}
          >
            {t("Try again")}
          </Button>
        }
      />
    )
  // Not while the by-id read is still going, for the same reason help-detail.tsx
  // gives: this used to also wait on `meetingsQ.data === undefined` even once
  // `oneQ` had already answered — waiting on the list here would spend back the
  // round trip removed above.
  if (!item && oneQ.data === undefined && !inPage)
    return <RecordScreen title={<Skeleton className="h-7 w-48" />} state="loading" />
  if (!item)
    return (
      <RecordScreen
        title={t("Meeting")}
        state="empty"
        copy={{ emptyTitle: t("That meeting doesn't exist."), emptyDescription: "" }}
      />
    )

  // THE DISPLAY-TIME STRIP — the client's ruling, 16 Sep 2026: "kill the
  // emojis. Also, when they're in the name, just remove them, please." A row
  // synced from Google before this ruling shipped is still stored with
  // whatever pictograph its invitation carried
  // (`workers/content/src/lib/meetings.ts`'s `titleOf` only strips at INGEST,
  // for every sync from now on) — this is the other half, so it reads clean
  // here the next time anybody opens it rather than only the next time it
  // re-syncs. EVERY READ-ONLY display of the title below uses this, never
  // `item.title` directly; the edit form's own `initial.title` and the
  // agenda-save door's own `title: row.title` (this file's write paths,
  // which simply echo the record back to the update door unchanged)
  // are deliberately untouched — this is the display half only.
  const cleanTitle = stripPictographs(item.title)

  /* THE DEPARTMENT, DERIVED — Aurora, 23 Sep 2026, verbatim: "for meetings:
   * chips id, department, app/account (with link)".
   *
   * A MEETING HAS NO DEPARTMENT OF ITS OWN and is not getting one. The word
   * lives on the meeting's PURPOSE (`MeetingPurpose.department`,
   * shared/types.ts, "pick-or-created into the 'Department' dropdown group"),
   * which is a settled taxonomy somebody curates once a year, and the meeting
   * already points at it through `purposeId`. So this is a LOOKUP in the
   * purposes cache this screen already holds, not a column, not a JOIN on the
   * door, and not a second copy of the word that could drift from the taxonomy
   * the day somebody re-files a purpose.
   *
   * A MEETING WITH NO PURPOSE SIMPLY HAS NO DEPARTMENT CHIP — her own sentence.
   * So does a meeting whose purpose carries no department (most of them do not),
   * and so does one read before the purposes cache has answered: `undefined`
   * here draws nothing rather than a placeholder that would pop in a beat later.
   */
  const department =
    (item.purposeId ? purposesQ.data?.find((x) => x.id === item.purposeId)?.department : null) || null

  /* B1 / CHECKLIST 11.2 — this title carried five, then three. Edit is the
   * everyday act, so it is the only button; reading the transcript and calling
   * the meeting off go into the menu, the second of them still red.
   *
   * TWO ACTIONS LEFT WITH THE CALENDAR'S WRITE HALF: "Mark held" (the status is
   * retired — the start time says whether a meeting has happened) and "Add to my
   * calendar" (kwapso reads calendars and never writes them). */
  const overflow: RecordAction[] = [
    // 9.2 — reading the transcript logs everybody's time. Offered only once the
    // meeting has a calendar entry (there is nowhere else to look) and only while
    // nothing has been read yet.
    ...(canEdit && canReadGoogle && item.active && item.googleEventId && !item.transcriptCapturedAt
      ? [
          {
            key: "transcript",
            label: t("Read the transcript"),
            icon: <FileText className="size-3.5" />,
            disabled: busy !== null,
            onSelect: readTranscript,
          },
        ]
      : []),
    ...(canCancel
      ? [
          item.active
            ? {
                key: "active",
                label: t("Cancel it"),
                icon: <Power className="size-3.5" />,
                disabled: busy !== null || confirmBusy,
                destructive: true,
                // ASK FIRST — see the "THE CANCEL CONFIRM" note above `useConfirm`.
                // Honest, specific copy: it comes out of Meetings, nothing is lost.
                onSelect: () =>
                  ask({
                    title: t("Cancel {title}?", { title: cleanTitle }),
                    body: t(
                      "It comes out of Meetings. The record and its notes stay exactly where they are, and you can put it back any time."
                    ),
                    action: t("Cancel it"),
                    run: () =>
                      run(
                        () => content.setMeetingActive(meetingId, false),
                        t("Cancelled, the record and its notes are kept."),
                        t("Couldn't cancel the meeting.")
                      ),
                  }),
              }
            : {
                key: "active",
                label: t("Put it back"),
                icon: <Power className="size-3.5" />,
                disabled: busy !== null || confirmBusy,
                // A REVERSAL, NOT A DESTRUCTIVE ACT — no ask, same as
                // app-detail.tsx's own restoreApp.
                onSelect: () =>
                  void run(
                    () => content.setMeetingActive(meetingId, true),
                    t("Back in Meetings."),
                    t("Couldn't restore the meeting.")
                  ),
              },
        ]
      : []),
  ]

  /* THE FOLD — same shape as `help-detail.tsx`'s own ("h3, and aign the menu
   * to the chips"): below `shared/web/head-actions.tsx`'s own breakpoint,
   * Edit leaves its standalone pen and joins `overflow` inside the ONE "…"
   * trigger that moves into the chip row. Same order the wide row already
   * draws them in — edit, then whatever already lived in the menu. */
  const foldedActions: HeadActionItem[] = [
    // THE TWO OUTBOUND LINKS FOLD TOO (23 Sep 2026). Below the fold's
    // breakpoint the wide row is `hidden` and this menu is all there is, so a
    // pair of buttons that only existed in the wide row would simply vanish on
    // a narrow pane — the exact failure `HEAD_ACTIONS_ROW_CLASS`'s own inverse
    // pair exists to prevent. A menu item is a callback rather than an anchor,
    // so these open the same URL through the same `safeHref` seam.
    // …AND IT DISAPPEARS FROM THE FOLD ON THE SAME CLOCK. A button that is
    // gone from the wide row and still in the narrow menu is the same dead
    // Join, reachable only on a phone.
    ...(item.googleJoinUrl && !meetingHasEnded(item, now)
      ? [
          {
            key: "join",
            label: t("Join"),
            icon: <Video className="size-3.5" />,
            onSelect: () => window.open(safeHref(item.googleJoinUrl ?? ""), "_blank", "noreferrer,noopener"),
          },
        ]
      : []),
    ...(item.googleEventUrl
      ? [
          {
            key: "google-calendar",
            label: t("Google Calendar"),
            icon: <ArrowSquareOut className="size-3.5" />,
            onSelect: () =>
              window.open(safeHref(item.googleEventUrl ?? ""), "_blank", "noreferrer,noopener"),
          },
        ]
      : []),
    ...(canEdit
      ? [
          {
            key: "edit",
            label: t("Edit"),
            icon: <PencilSimple className="size-3.5" />,
            onSelect: () => setEditing(true),
          },
        ]
      : []),
    ...overflow,
  ]

  /* WHO WAS IN THE ROOM, AND WHAT IS NOT A PERSON. Google puts meeting ROOMS
   * on the same attendee list as people, and a room shown as an attendee is an
   * attendee nobody can ring — the identical subtraction this screen's own
   * calendar tab made before it was retired, and the one the meetings table's
   * Attendees column and the week view's own faces both make. */
  const attendees = item.googleGuests.filter((g) => !g.resource)
  // (The rooms themselves are not drawn anywhere on the one page — the Google
  // facts list that used to show them is struck with Details. `resource` is
  // still read here, as the subtraction above, and named again in
  // `meetingIsInPerson`'s own note as the stronger in-person signal this lane
  // deliberately did not take.)
  /* WHO THEY ARE TO US — a second read, deliberately (this screen's own header
   * says why: a contact added next week should light up on a meeting held last
   * week). Keyed by address, so a guest we recognise can say so. */
  const linkFor = new Map((peopleQ.data ?? []).map((l) => [l.email, l]))

  /* ══ THE MAIN COLUMN ═════════════════════════════════════════════════════
   *
   * Agenda, then what was said. Two sections, in the order a person reads
   * them: what we meant to cover, and then the record of the whole thing.
   * Everything a meeting keeps that somebody typed or Google captured is
   * here; everything ABOUT the meeting is a chip or a side panel. */
  const mainColumn = (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Above the one thing somebody typed, and out of the header's
          one-primary-one-secondary-and-a-menu discipline. */}
      <div className="flex justify-end">
        <TranslateAction translation={translation} />
      </div>
      {/* THE AGENDA IS THE OPEN FIELD (23 Sep 2026), and only until the
          meeting ends — `MeetingAgendaSection` holds the drawing and
          `agendaIsOpenField` holds the rule. `now` is read ONCE, at the top of
          this render, and passed down: the rule never reads a clock itself,
          which is the whole reason its own boundary can be tested a minute
          either side. */}
      <MeetingAgendaSection
        meeting={item}
        now={now}
        canEdit={canEdit}
        busy={busy === "agenda"}
        html={translation.of(item.agenda ?? "")}
        onSave={(html) => void saveAgenda(item, html)}
      />
      <MeetingTranscriptSection
        meeting={item}
        read={transcriptQ.data}
      />
    </div>
  )

  /* ══ THE SIDE COLUMN ═════════════════════════════════════════════════════
   *
   * Attendees, Location (in person only), Time log, Connections — her own
   * order, 23 Sep 2026, with Location slotted where she asked for it ("under
   * Attendees").
   *
   * NO DETAILS SECTION. Her ruling, verbatim: "do not include section details
   * (its unecessry)". The facts it held are either already in the chips (the
   * app, the account, the department), in the title and subtitle (what it is
   * about, when), or on the edit screen (where, why we are meeting). The
   * calendar tab's own list of Google facts — time zone, organiser, repeats,
   * rooms, last synced — goes with it for the same reason: it was the same
   * kind of section under a different name. */
  const attendeesPanel = (
    <EmptyGatedPanel
      // HER WORD, SETTLED: "attendees". This section was "Who was invited" on
      // the retired calendar tab; one noun now, the one she chose.
      title={t("Attendees")}
      count={formatCount(attendees.length)}
      // R88 — an empty section drops its whole header, count and all, and says
      // the one honest sentence instead. `googleGuests` is a MIRROR, so "empty"
      // here is a settled fact the moment the record is in hand; there is no
      // second read to wait on.
      empty={attendees.length === 0}
    >
      {/* R104 — a group of people inside a record section is bare `PersonCard`
          chips under the section's own title, never a card each and never a
          card around the group. The identical shape the ticket's own "On the
          loop" row draws (`help-stakeholders.tsx`), reached through the same
          component, so a face is the same size and the same circle on both.
          A guest we recognise wears their own photograph; everybody else
          wears their initials, which is `RecordMark`'s own fallback. */}
      <div className="flex flex-wrap gap-3">
        {attendees.map((g) => {
          const known = linkFor.get(g.email)
          const name = g.name || g.email
          return (
            <PersonCard
              key={g.email}
              orientation="horizontal"
              size="choice"
              // A COLLEAGUE WEARS THEIR OWN PHOTOGRAPH (R111). `memberUserId`
              // comes off the link this screen already resolves for the chip
              // below, and `memberFace` turns it into a picture against the
              // members cache — the identical resolution every other staff
              // face in the app goes through. A guest we do not recognise, or
              // a CLIENT CONTACT, resolves to `undefined`, which `RecordMark`
              // already reads as "no picture, draw the initial".
              //
              // THE CLIENT'S OWN PHOTOGRAPH IS THE HALF THAT IS NOT HERE, and
              // it is a door change rather than an oversight:
              // `MeetingPersonLink` (shared/types.ts) carries the account's id
              // and name and NO contact id and no logo, so there is nothing to
              // resolve a contact's face through from this side. Recorded in
              // `PHOTO_UNREACHABLE` (web/test/photo-beats-initials.test.ts)
              // against exactly this call site.
              picture={memberFace(membersQ.data, known?.memberUserId)}
              // WHOSE FACE THIS IS, AND IT IS SET WHETHER OR NOT THERE IS ONE
              // TO GREY. Aurora, 23 Sep 2026: "external photos (from contacts)
              // gray scale. keep staff nirmal." A guest linked to a CLIENT's
              // account is from outside; one linked to a member of this team
              // is not; and a guest we recognise as neither is an address on
              // an invitation, which we cannot call either way, so it takes
              // the colour default rather than a guess.
              //
              // THE FACT REACHES THE MARK EVEN WITH NO PICTURE, on purpose.
              // Today `external` only changes a photograph (the kit greys the
              // image and leaves an initials tile alone, because a tile is
              // already the quietest thing on the screen — `RecordMark`'s own
              // note). If an outside person's TILE is later given its own
              // quieter paper, every mark on this list already carries the
              // fact it would key off, and this section needs no second pass.
              external={Boolean(known?.accountId)}
              mark={nameInitials(name)}
              markName={name}
              title={<span className="text-sm">{name}</span>}
              chip={
                known?.memberName ? (
                  <span className="text-micro text-muted-foreground uppercase">{t("One of us")}</span>
                ) : known?.accountName ? (
                  <span className="text-micro text-muted-foreground uppercase">{known.accountName}</span>
                ) : g.organizer ? (
                  <span className="text-micro text-muted-foreground uppercase">{t("Organiser")}</span>
                ) : undefined
              }
              // WHAT THEY ANSWERED, in the words a person uses — Google's own
              // `needsAction` is machine for "they have not replied", which is
              // the single most useful thing on a guest list.
              secondary={
                <span className="text-muted-foreground text-xs">
                  {RESPONSE[g.response] ?? g.response}
                </span>
              }
            />
          )
        })}
      </div>
    </EmptyGatedPanel>
  )

  /* "LOGS", NOT "TIME LOG" — Aurora, 23 Sep 2026, verbatim: "word is logs
   * only". That REVERSES B0386 of 22 Sep ("Time log"), and hers is the later
   * ruling. This was the LAST occurrence left in the app: the rail, the Home
   * tile, the Effort card's own section title and the glossary term were all
   * moved by the logs lane, which could not reach this file because another
   * lane owns `web/components/meetings/**`.
   *
   * `"Work logs"` IS NOT COMING BACK EITHER. It is gone from the whole app and
   * its seed row is pruned; `web/test/logs-dashboard.test.tsx` fails on either
   * retired word reappearing in any user-visible sentence. */
  const logsPanel = (
    <TicketSidePanel title={t("Logs")} count={formatCount(timeTotal)}>
      <WorkLogsPanel
        targetTable="meetings"
        targetId={meetingId}
        recordLabel={cleanTitle}
        canEdit={canEditTime}
        // Read-only on a meeting — the comment beside `canSeeTime` above says
        // why the hours here are written by the transcript rather than by hand.
        canLog={false}
        // NO ENTRIES TILE (Aurora, 23 Sep 2026, verbatim: "for time log do not
        // show the kpi card entries count"). Hours logged and Members on it
        // stay; the count of rows does not deserve a card of its own, which is
        // the same sentence R97 already makes about every other count in the
        // app. The panel's own default keeps the tile for every other caller.
        showEntriesTile={false}
        onActivityChanged={() => invalidate(recordActivityKey("meetings", meetingId))}
      />
    </TicketSidePanel>
  )

  /* CONNECTIONS DISAPPEARS WHEN IT IS EMPTY — Aurora, 23 Sep 2026, the same
   * behaviour the ticket's own Related stories already has. It used to be a TAB
   * with a badge, so an empty one still cost a word on the strip and a
   * paragraph explaining itself; on a one-page record an explanation of an
   * absence is a section about nothing. Measured: 268 of 460 live meetings have
   * no account, no app, no purpose and no artefacts (staging, 9 Sep 2026), so on
   * the majority of records this section is simply not there.
   *
   * ── "EMPTY" IS NOT "FAILED", AND THE FIRST VERSION OF THIS GATE CONFLATED
   * THEM ──────────────────────────────────────────────────────────────────────
   *
   * This read `(mapQ.data?.total ?? 0) > 0`, full stop. `mapQ.data` is
   * `undefined` in THREE different situations and that expression answers
   * "hide it" to all three: the read has not come back yet, the read FAILED,
   * and the read was REFUSED. So a meeting whose map door 500s drew nothing at
   * all — no sentence, no retry, no trace — which is the "everything working
   * except the last step" shape (R40's own words) this repo keeps being bitten
   * by, and it is worse than the tab it replaced: the tab at least existed to
   * be clicked. `meeting-connections-tab.test.tsx` caught it, which is exactly
   * what that suite is for.
   *
   * SO THE GATE ASKS THE HONEST QUESTION. The section is drawn when there is
   * something to show OR when something went wrong, and withheld only on a
   * read that came back and genuinely said zero. `ConnectionsPanel` already
   * knows how to say both failures in the screen's own words (a retry for a
   * transient one, a plain sentence for a permanent refusal) — it was never
   * being given the chance.
   *
   * LOADING IS STILL SILENT, and deliberately so: `data` undefined with no
   * `error` is a read in flight, and a section that appears and then vanishes
   * a beat later is its own small bug. That is the same "confirmed empty,
   * never merely loading" rule `EmptyGatedPanel`'s own `empty` prop
   * documents. */
  const connectionsFailed = mapQ.error !== undefined && mapQ.error !== null
  const connectionsPanel =
    (mapQ.data?.total ?? 0) > 0 || connectionsFailed ? (
      <TicketSidePanel
        title={t("Connections")}
        // R16/R97 — the exact server total, beside the title, through the one
        // `formatCount` seam, which renders NOTHING at zero. On a failed read
        // there is no number to say, and it says none.
        count={formatCount(mapQ.data?.total ?? 0)}
      >
        <ConnectionsPanel
          teamId={teamId}
          read={mapQ}
          // Reached only when the read itself came back EMPTY, which this gate
          // no longer draws — kept because the component requires it, and a
          // sentence that exists is better than one invented at the moment it
          // is needed.
          emptyTitle={t("Nothing is filed against this call yet.")}
          refusedText={t("This meeting doesn't have a map to draw.")}
        />
      </TicketSidePanel>
    ) : null

  const sideColumn = (
    <>
      {attendeesPanel}
      {/* WHERE IT IS — under Attendees, her own placement, and only when the
          meeting is in person (`meetingIsInPerson`). The component decides
          that itself and renders nothing otherwise, so this line is
          unconditional and the rule lives in one place. */}
      <MeetingLocationSection meeting={item} />
      {/* `work:read` — the same right the retired Work logs TAB was gated on
          (`canSeeTime`). A reader without it sees no section at all rather
          than an empty one. */}
      {canSeeTime ? logsPanel : null}
      {connectionsPanel}
    </>
  )

  /* NO OUTER PANEL CARD AND NO TAB STRIP — the one-page ruling (Aurora, 23 Sep
   * 2026: "meetings: implement the one page, love how you did it"), on the
   * SAME chassis a ticket and a story already stand on rather than a third
   * hand-built one. `<RecordScreen panelVisible={false}>` draws the head
   * alone; `RecordDetail`'s own panel region never even reads `content` once
   * that is false, so the body has to be a SIBLING of this call, not its
   * children. `footerVisible={false}` turns off the kit's own copy of the
   * band, which region order would otherwise draw straight under the head and
   * ABOVE the body; `<ScreenFooterSlot>` below portals the real one outside
   * the shell's padded stack, which is the only place it can sit on the pane's
   * own bottom edge (R89, nine rounds — `ticket-detail-body.tsx`'s own header
   * carries the whole account, and `RecordDetailBody` is the extraction of it,
   * so none of it is re-derived here). */
  return (
    <>
    <RecordScreen
      // A DELIBERATE MARK, NEVER AN EMPTY SLOT. This record has no picture and
      // its type carries no glyph, so the square holds the record's own initial —
      // the same box, the same size, the same slot every other record uses
      // (shared/web/record-mark.tsx). Before this, four of the eleven record
      // screens opened with a bare title while the other seven led with a mark,
      // which is the drift a reader feels and never reports.
      leading={<RecordMark name={cleanTitle} size="band" />}
      // NO EYEBROW — client ruling, 2026-09-03, verbatim: "I want you to remove
      // the eyebrow on the title on main screens. Remove that eyebrow, kill it."
      // The prop this line used to pass is deleted from `RecordScreen` itself
      // (record-chrome.tsx says why it had outlived the 2026-09-01 ruling that
      // took the eyebrow out of the full header); the breadcrumb above this
      // header is what names the record type now.
      // NO `recordNumber` — the reference is the FIRST CHIP now (her 23 Sep
      // chip order), drawn through `RecordRef` in the row above. Leaving this
      // prop would print the same id twice on one head, which is the exact
      // drift her own "chips is the last component of headers!" ruling ended.
      // NO `collectionLabel` — client correction, 2026-08-31, verbatim: "now
      // it also show 'meeting' as a tag! thats not a tg but the eyebrow
      // remember. not only for meetings, but everywhere." This used to repeat
      // `t("Meeting")` a second time as a chip, directly under the eyebrow
      // that already says it — the same word, twice, one screen. The eyebrow
      // alone carries the type now; role/wave/process/task/contact-detail.tsx
      // carried the identical mistake and lost the same line for the same
      // reason.
      // THE PARENT CHIPS, ORDER RULED BY THE CLIENT (2026-08-31, verbatim):
      // "meeting parent is app, and customer in chips by this order. is app
      // is empty then only customer." What it DOES have is up to two
      // parents, and the app (when there is one) always leads: a meeting
      // about one of our systems is that system's meeting first and the
      // client's second, and a meeting with no app skips straight to the one
      // chip it does have rather than rendering an empty slot for the other.
      //
      // CANCELLED IS NOW A CHIP, NOT A LINE UNDER THE CHIPS — client ruling,
      // 2026-08-31, verbatim: "what is this 3rd component in the title under
      // the chips? kill everywhere. chips is the last component of headers!"
      // This used to be the screen's `status` prop (`RecordChrome`'s `meta`,
      // drawn directly under the chips row) on the theory that "a meeting
      // carries no status chip at all" — that theory was true while the only
      // candidate fact was the app/account, already said as chips, but
      // Cancelled is exactly the kind of state every other record spells as
      // a coloured dot (`archived` while account/process/wave are put away,
      // `Inactive` on a role), so it leads the row the same way.
      // THE CHIP ROW, IN HER OWN ORDER — Aurora, 23 Sep 2026, verbatim: "for
      // meetings: chips id, department, app/account (with link)". Built
      // through `orderChips` (R94, shared/web/chip-order.ts) rather than a
      // hand-written JSX sequence, so the order is a property of the DATA:
      // each chip says what KIND it is and the seam decides where it lands.
      //
      // HOW HER FIVE WORDS MAP ONTO R94's FIVE KINDS. `id` is the black
      // reference chip (R96, `RecordRef`); `status` is Cancelled, which she
      // did not name because it is only ever there on a called-off meeting
      // and R94 already fixes its place — second, the slot every other record
      // gives it; `type` is the DEPARTMENT, the third slot, which is exactly
      // where she asked for it; and the two parents are the app and the
      // account, in the order her 2026-08-31 ruling already set ("meeting
      // parent is app, and customer in chips by this order").
      //
      // THE REFERENCE MOVED OUT OF `recordNumber` AND INTO THE ROW. It used to
      // ride `RecordScreen`'s own `recordNumber` prop, which draws it beside
      // the title rather than as a chip; her order names it as the FIRST CHIP,
      // so it is one now — the same move `story-detail.tsx` made on her
      // 20 Sep chip-order ruling, through the same `RecordRef` register so the
      // id chip stays black everywhere (R96).
      //
      // BOTH PARENTS ARE UNDERLINED ("with link") — the same treatment the
      // story page gives its own app and phase chips.
      chips={
        <>
          {orderChips([
            {
              kind: "id",
              node: item.ref ? <RecordRef key="id" value={item.ref} /> : null,
            },
            {
              kind: "status",
              node: !item.active ? (
                <Badge key="status" variant="status" dot="archived">
                  {t("Cancelled")}
                </Badge>
              ) : null,
            },
            {
              // THE DEPARTMENT, AND IT IS NOT COLOURED. R86: in any collection
              // the ONE coloured chip is the record's status, and this row
              // already has that chip. `departmentGlyph` (shared/departments.ts)
              // is the mark that keeps it from being bare text (R93 — a visual
              // rides beside the word), the identical shape the Tasks board
              // chip already draws (`boardChip`, tasks-screen.tsx), so one
              // concept wears one face in both places.
              kind: "type",
              node: department ? (
                <Badge key="department" variant="secondary" size="pill">
                  {[departmentGlyph(department), department].filter(Boolean).join(" ")}
                </Badge>
              ) : null,
            },
            {
              kind: "mainParent",
              node:
                item.appId && item.appName ? (
                  <RecordChipLink key="app" href={`${host.base}/apps/${item.appId}`}>
                    <span className="underline">{item.appName}</span>
                  </RecordChipLink>
                ) : null,
            },
            {
              kind: "secondaryParent",
              node:
                item.accountId && item.accountName ? (
                  <RecordChipLink key="account" href={`${host.base}/accounts/${item.accountId}`}>
                    <span className="underline">{item.accountName}</span>
                  </RecordChipLink>
                ) : null,
            },
          ])}
          {/* THE FOLDED TRIGGER, ON THE CHIP ROW'S OWN LINE — same wiring as
              `help-detail.tsx`'s own ("aign the menu to the chips"). */}
          <HeadActionsFoldMenu items={foldedActions} label={t("More actions")} />
        </>
      }
      title={cleanTitle}
      // THE SUBTITLE — client ruling, 2026-08-31, verbatim: "some titles may
      // have 'subtitles'. place it directly under the title and on top of
      // the pills. f.e. in a meeting, the time." An earlier header-cleanup
      // pass had folded this into `status` (below the chips) on the theory
      // that it was redundant with the Overview tab's own "When" row — it
      // isn't a duplicate of any CHIP, and the client wants exactly this fact
      // in exactly this position, so it moves up into the new slot rather
      // than staying where a trim pass had left it.
      subtitle={formatDateTime(item.startsAt, lang)}
      actions={
        <div data-slot="head-actions-row" className={HEAD_ACTIONS_ROW_CLASS}>
          {/* JOIN, AND GOOGLE CALENDAR — Aurora, 23 Sep 2026, verbatim:
              "meetings detail: button join (rename to only join) move it to
              title, also move Google Calendar (rename it to only this) to
              title". They used to open the Calendar TAB (`CalendarPanel`
              below), one click away from a person who came here to join.

              THE LAW THEY OBEY IS R52, and they obey it by being HERE rather
              than by carrying a class: `actions` is the node `RecordScreen`
              hands the kit's `Title` (record-chrome.tsx), rendered as
              `[data-slot=title-actions]` inside `Title`'s own row, and that
              row is `items-center` (R100) so a button's centre lands on the
              title's own centre. `RECORD_TITLE_TREATMENT`
              (shared/web/record-heading.tsx), which `RecordScreen` already
              wears, is what keeps a long meeting name from pushing them onto
              a second line underneath. Nothing is positioned by hand.

              ANCHORS, NOT BUTTONS, because they LEAVE the app — `buttonVariants`
              is how this codebase dresses a real `<a>` as a control
              (`CalendarPanel` below drew the same pair the same way). No
              `size`: R98 wants a page head at the kit's own default height,
              which is also `EditPenButton`'s `size="icon"` beside them.
              `secondary` on both, never mango: the title row's one primary
              colour is not something two outbound links should claim. */}
          {/* JOIN DISAPPEARS ONCE THE MEETING IS OVER (Aurora, 23 Sep 2026) —
              `meetingHasEnded`, the same boundary the agenda's own open-field
              rule turns on, read from the other side, with the SAME injected
              clock. Google Calendar below is deliberately NOT gated: it still
              opens something real. */}
          {item.googleJoinUrl && !meetingHasEnded(item, now) && (
            <a
              href={safeHref(item.googleJoinUrl)}
              target="_blank"
              rel="noreferrer noopener"
              className={cn(buttonVariants({ variant: "secondary" }), "gap-1")}
            >
              <Video className="size-3.5" aria-hidden /> {t("Join")}
            </a>
          )}
          {item.googleEventUrl && (
            <a
              href={safeHref(item.googleEventUrl)}
              target="_blank"
              rel="noreferrer noopener"
              className={cn(buttonVariants({ variant: "secondary" }), "gap-1")}
            >
              <ArrowSquareOut className="size-3.5" aria-hidden /> {t("Google Calendar")}
            </a>
          )}
          {/* NEVER BLACK OR MANGO (client ruling, 18 Sep 2026: "edit button
              is never black (even when it's only one)") — this button had
              carried NO `variant` at all, which is `Button`'s own default,
              mango, one of the two colours her ruling names. `EditPenButton`
              is the one shared, always-quiet answer now. */}
          {canEdit && <EditPenButton onClick={() => setEditing(true)} label={t("Edit")} />}
          <RecordActionsMenu actions={overflow} />
        </div>
      }
      panelVisible={false}
      footerVisible={false}
    />
      <RecordDetailBody dataSlot="meeting-detail-body" main={mainColumn} side={sideColumn} />

      {/* THE BAND, THROUGH THE SHELL'S OWN FOOTER SLOT — the same call
          `story-detail.tsx` and `knowledge-detail.tsx` make, with the same
          four audit fields this screen already passed (D7 / CHECKLIST 11.3:
          who made it and when) and the same Latest activity column. It is a
          SECOND `RecordDetail` call under the hood (`RecordFooterBand`,
          record-chrome.tsx), footer props only, which is why the one above
          carries `footerVisible={false}`: two copies of one band on one page
          is the exact defect that construction exists to prevent. */}
      <ScreenFooterSlot>
        <RecordFooterBand
          audit={{
            createdByName: item.creatorName,
            createdAt: item.createdAt,
            editedByName: item.editorName,
            updatedAt: item.updatedAt,
          }}
          activity={activity}
          onAddNote={can("meetings", "create") ? activity.addNote : undefined}
          notePlaceholder={t("Add a note")}
        />
      </ScreenFooterSlot>
      <MeetingFormDialog
        open={editing}
        onOpenChange={setEditing}
        draftKey={`meeting:edit:${meetingId}`}
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
        initial={{
          appId: item.appId ?? "",
          title: item.title,
          startsAt: toLocalInput(item.startsAt),
          endsAt: toLocalInput(item.endsAt),
          accountId: item.accountId ?? "",
          purposeId: item.purposeId ?? "",
          location: item.location ?? "",
          agenda: item.agenda ?? "",
          // NO `notes` — the form no longer carries the field (23 Sep 2026).
          // `save()` above is what keeps the stored value alive across an
          // edit, by sending the row's own back unchanged.
        }}
        onSubmit={save}
      />

      {confirmDialog}
    </>
  )
}

/* ──────── WHAT GOOGLE TELLS US, AND WHERE IT WENT ON THE ONE PAGE ──────────
 *
 * `CalendarPanel` IS DELETED (23 Sep 2026, the one-page ruling). It was the
 * fourth tab — everything Google mirrors onto this row, drawn as its own
 * screen — and with the strip gone each of its four blocks had to be placed
 * or struck, never silently carried:
 *
 *   · JOIN and OPEN IN GOOGLE CALENDAR moved UP into the title's own actions
 *     earlier the same day, at her own ruling, and Join now disappears once
 *     the meeting is over (`meetingHasEnded`).
 *   · WHO WAS INVITED became the side column's ATTENDEES section — her word,
 *     settled — drawn as `PersonCard` chips (R104) instead of a row list.
 *   · ATTACHED TO THE ENTRY was kept for one round, under the transcript, as a
 *     flagged judgement — it was the only route in the app to a calendar
 *     entry's own Drive files. Aurora struck it on 24 Sep 2026, asked
 *     directly: "kill that completely". A UI removal only: the list still
 *     rides the row (`meetings.google_attachments_json`, rewritten by every
 *     sweep) and the door still hands it back.
 *   · THE FACTS THAT RARELY CHANGE — where, time zone, organiser, repeats,
 *     rooms, and the "read from your calendar" stamp — are STRUCK, with the
 *     Details section they were a second copy of ("do not include section
 *     details (its unecessry)"). Where comes back on its own terms as the
 *     LOCATION section, for an in-person meeting only.
 *
 * Nothing is lost from the ROW: every one of those fields is still read,
 * still mirrored by the sweep and still on the record. This is a screen
 * deciding what it shows, not a door dropping what it carries. */

const FOUND_BY: Record<string, string> = {
  attachment: "On the calendar entry",
  drive: "In a shared folder",
  mail: "From a Google notice",
}

/** What each guest ANSWERED, in the words a person uses. Google's own four are
 * `accepted`, `declined`, `tentative` and `needsAction`, and the last of those
 * is the one worth translating hardest: "needsAction" is machine for "they have
 * not replied", which is the single most useful thing on a guest list. */
const RESPONSE: Record<string, string> = {
  accepted: "Coming",
  declined: "Not coming",
  tentative: "Maybe",
  needsAction: "No reply yet",
}
