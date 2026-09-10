"use client"

// ONE MEETING, as a tabbed record: Notes / Overview (plus Guests and Work logs
// where the meeting has them). Its history is not a tab any more — it is
// reached from the ink footer's Latest activity column, on the client's
// 2026-09-06 ruling; web/components/records/activity-panel.tsx carries the ruling and
// the argument.
//
// NOTES IS THE FIRST TAB, not Overview, and that is the whole argument for this
// module existing. Somebody opening a meeting from six months ago is not looking
// for who created the row — they are looking for what was agreed. The agenda sits
// above the notes because that is the order the two were written in.
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
// AND THE TRANSCRIPT SITS UNDER THE NOTES, not in a tab of its own, because the
// agenda, the notes and what was actually said are the same question asked three
// ways and a person reads them in that order.

import * as React from "react"

import { cn } from "@shared/ui/lib/utils"
import { Button, buttonVariants } from "@shared/ui/components/button/button"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { Spinner } from "@shared/ui/components/spinner/spinner"
import { toast } from "@shared/ui/components/sonner/sonner"
import { TabsView } from "@shared/web/screen-engine/tabs-view"
import { useRemembered } from "@shared/web/remembered"
import { Notes } from "@shared/web/notes-editor/notes-editor"
import { Badge } from "@shared/ui/components/badge/badge"
import { ArrowSquareOut, FileText, PencilSimple, Power, Video } from "@shared/ui/foundations/icons"

import type { Account, AppRow, Meeting, MeetingPersonLink, MeetingPurpose } from "@shared/types"
import { MeetingFormDialog, type MeetingFormValues } from "@/components/meetings/meeting-form-dialog"
import { ConnectionsPanel } from "@/components/records/connections-panel"
import { OverviewList } from "@/components/records/overview-list"
import { WorkLogsPanel, workLogsTotalKey } from "@/components/work/work-logs-panel"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import { TranslateAction, useHumanTranslation } from "@/components/records/translate-human-text"
import { useConfirm } from "@shared/web/use-confirm"
import { ApiFailure, content, tenancy } from "@/lib/api"
import {
  RecordActionsMenu,
  RecordChipLink,
  RecordScreen,
  STICKY_TABS,
  RECORD_TABS_CONFIG,
  type RecordAction,
} from "@/components/records/record-chrome"
import { appsKey, listFetch, meetingPeopleKey, meetingsKey, meetingTranscriptKey, recordMapKey } from "@/lib/live-resources"
import { CONCEPT_ICON } from "@/lib/pages"
import { usePermissions } from "@/lib/perms"
import { RecordMark } from "@shared/web/record-mark"
import { formatCount } from "@shared/web/format-count"
import { formatDateTime, toLocalInput } from "@shared/web/format"
import { RichText } from "@shared/web/rich-text-view"
import { invalidate, primeCache, useCached, useCachedValue } from "@shared/web/store"
import { recordActivityKey, useRecordActivity } from "@/lib/use-record-activity"
import { useRecordCounts } from "@/lib/use-record-counts"
// Every URL bound to an attribute goes through the seam, Google's included —
// see the note in google-source-dialog.tsx for why "it came from Google" is not
// a reason to skip it.
import { richTextValue, safeHref, safeSrc } from "@shared/web/rich-text"
import { useLanguage } from "@shared/web/language"

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

  const { can } = usePermissions(teamId)
  const canEdit = can("meetings", "edit")
  const canCancel = can("meetings", "delete")
  // Reading the transcript reaches the caller's own Drive and calendar with the
  // caller's own token, so the door asks for `google:read` on top of this
  // module's `edit`. This only decides whether the action is worth offering.
  //
  // It used to ask for `google:edit` plus a "Calendar on your behalf" switch,
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
  const canEditTime = can("work", "edit")
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
  const purposesQ = useCached<MeetingPurpose[]>(have && canEdit ? `purposes:${teamId}` : null, () =>
    listFetch.purposes(teamId)
  )

  // The open tab is remembered per record for as long as this document
  // lives (web/lib/nav-memory.ts) — leaving to another section and coming
  // back lands on the tab she was reading, and a miss lands on "notes".
  const [tab, setTab] = useRemembered("tab", "notes")
  const [editing, setEditing] = React.useState(false)
  const [busy, setBusy] = React.useState<"held" | "active" | "calendar" | "transcript" | "notes" | null>(null)
  // 9.6 — the notes are an OPEN FIELD on this screen until the meeting is held or
  // closed, and only on the edit page afterwards. The draft lives here rather
  // than in the form so a person can type straight into the record, which is
  // what "open field" means and what the edit dialog was getting in the way of.
  const [notesDraft, setNotesDraft] = React.useState<string | null>(null)

  // READ THE WRITE-UP IN YOUR OWN LANGUAGE, if you ask. The agenda and the notes
  // are the two things on a meeting a person typed; they go in one array, so one
  // press is one call. A hook, so it sits above the early returns below.
  const translation = useHumanTranslation(teamId, [item?.agenda, item?.notes])

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
      notes: values.notes || null,
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

  /** 9.6 — the notes, saved from the record itself. It goes through the ordinary
   * edit door with every one of the meeting's own values beside the new notes,
   * because that door REPLACES what it is given: sending the notes alone would
   * quietly blank the title. */
  async function saveNotes(now: Meeting, notes: string) {
    setBusy("notes")
    try {
      const { meeting } = await content.updateMeeting({
        id: meetingId,
        title: now.title,
        startsAt: now.startsAt,
        endsAt: now.endsAt,
        accountId: now.accountId,
        appId: now.appId,
        purposeId: now.purposeId,
        location: now.location,
        agenda: now.agenda,
        notes: richTextValue(notes) || null,
      })
      patchLists(meeting)
      setNotesDraft(null)
      toast.success(t("Notes saved."))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't save the notes."))
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

  const overviewItems = [
    { label: t("Who it is with"), value: item.accountName ?? "Nobody, it is ours" },
    { label: t("Which app"), value: item.appName ?? "—" },
    { label: t("Why we are meeting"), value: item.purposeName ?? "—" },
    { label: t("When"), value: formatDateTime(item.startsAt, lang) },
    { label: t("Until"), value: item.endsAt ? formatDateTime(item.endsAt, lang) : "—" },
    { label: t("Where"), value: item.location ?? "—" },
    { label: t("Reference"), value: item.ref ?? "—" },
    {
      label: t("In your calendar"),
      // Said as a fact rather than as a link: the entry lives in the person's own
      // Google, and whether THIS reader can see it depends on whose connection
      // pushed it.
      value: item.googleEventId ? "Yes" : "Not yet",
    },
    // The audit rows moved to the record footer (D7 / CHECKLIST 11.3).
  ]

  const tabsConfig = {
    ...RECORD_TABS_CONFIG,
    tabs: [
      { value: "notes", label: t("Agenda & notes"), icon: "note-pencil", badge: "", badgeVariant: "" as const },
      // ONLY WHEN THERE IS ONE. A meeting nobody put in a calendar has nothing
      // to show here, and an empty tab is a promise the record cannot keep.
      ...(item.googleEventId
        ? [
            {
              value: "calendar",
              label: t("In the calendar"),
              icon: "calendar",
              // NO BADGE, and the rule caught this rather than a reviewer: the
              // mirrored guest list is CAPPED by the calendar read that produced
              // it, so its length is a ceiling and not a count (R16). An
              // invitation with sixty people on it would badge fifty, which is
              // the one number that is certainly wrong. The tab lists them, and
              // a list you can see the end of does not need a number on it.
              badge: "",
              badgeVariant: "" as const,
            },
          ]
        : []),
      { value: "overview", label: t("Overview"), icon: "info", badge: "", badgeVariant: "" as const },
      // WORK LOGS, wherever time is tracked (CHECKLIST 6.8). The transcript import
      // has written a row of time against every meeting it read since Meetings
      // shipped, and nothing on the meeting itself showed it.
      ...(canSeeTime
        ? [
            {
              value: "time",
              label: t("Work logs"),
              icon: CONCEPT_ICON.time,
              badge: formatCount(timeTotal),
              badgeVariant: "" as const,
            },
          ]
        : []),
      // WHAT THIS CALL IS CONNECTED TO (owner, 9 Sep 2026: "yes ofc"). Offered on
      // every meeting: the badge is R16's exact count through the one seam, which
      // renders NOTHING at zero, so a call with no connections shows a plain word
      // and not a "0" — and the panel then says why in the kit's own register.
      {
        value: "map",
        label: t("Connections"),
        icon: "network",
        badge: formatCount(mapQ.data?.total ?? 0),
        badgeVariant: "" as const,
      },
      // NO ACTIVITY TAB (client, 2026-09-06 · 2026-09-07) — a meeting's history
      // is reached from the ink footer's Latest activity column now, and opens in
      // a slide-in off it. web/components/records/activity-panel.tsx carries the ruling.
    ],
  }

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
                    title: t("Cancel {title}?", { title: item.title }),
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

  return (
    <RecordScreen
      // A DELIBERATE MARK, NEVER AN EMPTY SLOT. This record has no picture and
      // its type carries no glyph, so the square holds the record's own initial —
      // the same box, the same size, the same slot every other record uses
      // (shared/web/record-mark.tsx). Before this, four of the eleven record
      // screens opened with a bare title while the other seven led with a mark,
      // which is the drift a reader feels and never reports.
      leading={<RecordMark name={item.title} size="band" />}
      // NO EYEBROW — client ruling, 2026-09-03, verbatim: "I want you to remove
      // the eyebrow on the title on main screens. Remove that eyebrow, kill it."
      // The prop this line used to pass is deleted from `RecordScreen` itself
      // (record-chrome.tsx says why it had outlived the 2026-09-01 ruling that
      // took the eyebrow out of the full header); the breadcrumb above this
      // header is what names the record type now.
      recordNumber={item.ref || undefined}
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
      chips={
        <>
          {!item.active && (
            <Badge variant="status" dot="archived">
              {t("Cancelled")}
            </Badge>
          )}
          {item.appId && item.appName && (
            <RecordChipLink href={`${host.base}/apps/${item.appId}`}>
              {item.appName}
            </RecordChipLink>
          )}
          {item.accountId && item.accountName && (
            <RecordChipLink href={`${host.base}/accounts/${item.accountId}`}>
              {item.accountName}
            </RecordChipLink>
          )}
        </>
      }
      title={item.title}
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
        <>
          {/* ICON-ONLY (client ruling, 2026-08-31: "edit, only the pencil icon"). */}
          {canEdit && (
            <Button size="icon" onClick={() => setEditing(true)} aria-label={t("Edit")}>
              <PencilSimple className="size-3.5" />
            </Button>
          )}
          <RecordActionsMenu actions={overflow} />
        </>
      }
      // D7 / CHECKLIST 11.3 — who made it and when, now the kit's own ink
      // footer's Record column.
      audit={{
        createdByName: item.creatorName,
        createdAt: item.createdAt,
        editedByName: item.editorName,
        updatedAt: item.updatedAt,
      }}
      activity={activity}
      onAddNote={can("meetings", "create") ? activity.addNote : undefined}
      notePlaceholder={t("Add a note")}
    >
      <TabsView
        className={STICKY_TABS}
        config={tabsConfig}
        value={tab}
        onValueChange={setTab}
        // NAMED `panel`, not `t` — the shadowing bit once. Everything a person
        // reads on this screen goes through the translate function called `t`
        // (R28), and a panel renderer that takes the same letter silently turns
        // every sentence inside it into a call on a tab object.
        renderPanel={(panel) => {
          if (panel.value === "overview")
            return <OverviewList items={overviewItems} />
          if (panel.value === "map")
            return (
              <ConnectionsPanel
                teamId={teamId}
                read={mapQ}
                // THE EMPTY CASE IS THE COMMON ONE HERE and it is written rather
                // than defaulted — 268 of 460 live meetings have no account, no
                // app, no purpose and no artefacts (staging, 9 Sep 2026), so the
                // majority of readers meet this sentence rather than the picture.
                // It names WHAT is missing and does not guess WHY: an artefact
                // reaches a call only when Google itself said which event it
                // belongs to, and Google says nothing on most of them — but the
                // same blank also covers a call with no client and no purpose,
                // so a sentence blaming Google would be wrong half the time.
                emptyTitle={t("Nothing is filed against this call yet.")}
                emptyDescription={t(
                  "Emails, chat logs and transcripts join a call when Google says which event they belong to. The account, the system and the reason we met show here too, once they are set."
                )}
                refusedText={t("This meeting doesn't have a map to draw.")}
              />
            )
          if (panel.value === "time")
            return (
              <WorkLogsPanel
                targetTable="meetings"
                targetId={meetingId}
                recordLabel={item.title}
                canEdit={canEditTime}
                // Read-only on a meeting — the comment beside `canSeeTime` above
                // says why the hours here are written by the transcript rather
                // than by hand.
                canLog={false}
                onActivityChanged={() => invalidate(recordActivityKey("meetings", meetingId))}
              />
            )
          if (panel.value === "calendar")
            return (
              <CalendarPanel
                meeting={item}
                links={peopleQ.data ?? null}
                loadingLinks={peopleQ.data === undefined && item.googleGuests.length > 0}
              />
            )
          return (
            <div className="flex flex-col gap-6">
              {/* Above the two things somebody typed, and out of the header's
                  one-primary-one-secondary-and-a-menu discipline. */}
              <div className="flex justify-end">
                <TranslateAction translation={translation} />
              </div>
              <section className="flex flex-col gap-2">
                <h2 className="text-muted-foreground text-sm font-medium">{t("Agenda")}</h2>
                {item.agenda ? (
                  <RichText html={translation.of(item.agenda)} />
                ) : (
                  <p className="text-muted-foreground text-sm">{t("Nothing written down yet.")}</p>
                )}
              </section>
              {/* THE NOTES ARE AN OPEN FIELD (9.6). Somebody types into the
                  record while the conversation is still happening, and keeps
                  typing afterwards — the write-up IS the afterwards.
                  IT USED TO CLOSE once the meeting was ticked held, on the theory
                  that the writing-up was then done. Nothing could know that, and
                  the field shut on exactly the people it was built for. A
                  cancelled meeting is still read-only, because that is the
                  module's delete rather than a guess about a person.
                  The AGENDA is never editable here — it is set beforehand, on
                  the edit page, which is the other half of the same rule. */}
              <section className="flex flex-col gap-2">
                {/* The heading IS the editor's label — `aria-labelledby` below
                    points at this id. The only editor on either front door that
                    sits outside a `Field`, so it is the only one whose name has
                    to be borrowed from the words already on the screen rather
                    than from a field config. A static id is safe here: this
                    screen resolves ONE meeting (`item` above), never a list. */}
                <h2
                  id="meeting-notes-heading"
                  className="text-muted-foreground text-sm font-medium"
                >
                  {t("Notes")}
                </h2>
                {canEdit && item.active ? (
                  <>
                    {/* Uncontrolled, and keyed on the row's ID — which does NOT
                        change when a colleague saves the same meeting, so their
                        save never re-seeds under what you are typing. That is
                        the owner's ruling (2026-09-07; web/test/last-save-wins.
                        test.tsx locks the same rule for every form): the row
                        takes their save, the editor keeps yours, and whoever
                        saves last is what the record says. This comment used to
                        claim the opposite; the key never did it. */}
                    <Notes
                      key={item.id}
                      aria-labelledby="meeting-notes-heading"
                      // Only while the NOTES are saving. `busy` on this screen
                      // names which action is in flight, and a rename or a
                      // status move happening elsewhere is no reason to take
                      // the caret out of a paragraph somebody is mid-sentence
                      // in — the loss this guards against is a save that has
                      // already read the value it is posting.
                      disabled={busy === "notes"}
                      defaultValue={item.notes ?? ""}
                      onChange={(html) => setNotesDraft(html)}
                      placeholder={t("Type as you go, this is the part worth keeping.")}
                      className="min-h-40"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        disabled={busy !== null || notesDraft === null}
                        onClick={() => void saveNotes(item, notesDraft ?? "")}
                        className="gap-1"
                      >
                        {busy === "notes" ? <Spinner /> : null}
                        {t("Save notes")}
                      </Button>
                    </div>
                  </>
                ) : item.notes ? (
                  <RichText html={translation.of(item.notes)} />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {t("Nothing written up yet, the notes are the part worth keeping.")}
                  </p>
                )}
              </section>
              {/* WHAT WAS ACTUALLY SAID. Third, under the agenda and the notes,
                  because that is the order the three were written in and the
                  order a person reads them: what we meant to cover, what we took
                  down, and then the record of the whole thing.
                  It is a SEPARATE READ (a transcript is up to a megabyte and
                  a page of meetings is fifty), and it is scrollable rather than
                  laid out down the page: an hour of talking is a very long
                  column, and a record whose other tabs are a scroll away is a
                  record nobody uses. */}
              {item.transcriptCapturedAt && (
                <section className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-muted-foreground text-sm font-medium">{t("What was said")}</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* HOW WE KNOW THIS IS THE RIGHT TRANSCRIPT. The three
                          hunts do not prove the same thing — one is a fact
                          Google recorded against this entry, the other two are
                          matches — so the record says which one found it rather
                          than presenting all three as equally certain. */}
                      <Badge variant="secondary" className="text-badge">
                        {FOUND_BY[item.transcriptFoundBy ?? ""] ?? t("Found in Google")}
                      </Badge>
                      {/* AND WHETHER THE WORDS ARE ANSWERABLE, which is a
                          different fact from having fetched them and was shown
                          nowhere. The sweep indexes a captured transcript within
                          the quarter hour, so "not yet" is a real and temporary
                          state rather than a failure — it says so. */}
                      <Badge
                        variant={item.knowledgeIndexedAt ? "secondary" : "outline"}
                        className="text-badge"
                      >
                        {item.knowledgeIndexedAt
                          ? t("In the knowledge base")
                          : t("Not in the knowledge base yet")}
                      </Badge>
                      {item.transcriptUrl && (
                        <a
                          href={safeHref(item.transcriptUrl)}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                        >
                          <ArrowSquareOut className="size-3" aria-hidden /> {t("Open the document")}
                        </a>
                      )}
                    </div>
                  </div>
                  {transcriptQ.data === undefined ? (
                    <Skeleton variant="list" lines={3} />
                  ) : transcriptQ.data.text ? (
                    <>
                      <div className="max-h-96 overflow-y-auto rounded-[var(--radius)] bg-surface-panel p-3">
                        <p className="text-sm whitespace-pre-wrap">{transcriptQ.data.text}</p>
                      </div>
                      {/* NEVER SILENTLY TRIMMED. A transcript longer than one
                          row may hold is cut and says so, in the same words a
                          knowledge file uses. */}
                      {transcriptQ.data.note && (
                        <p className="text-muted-foreground text-xs">{transcriptQ.data.note}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {t("The document was found but we couldn't read any words out of it. Open it in Google to read it there.")}
                    </p>
                  )}
                </section>
              )}
            </div>
          )
        }}
      />

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
        appOptions={(appsQ.data ?? []).filter((a) => a.active).map((a) => ({ id: a.id, name: a.name }))}
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
          notes: item.notes ?? "",
        }}
        onSubmit={save}
      />

      {confirmDialog}
    </RecordScreen>
  )
}

/* ───────────────────── THE CALENDAR EVENT, ORGANISED ────────────────────────
 *
 * Everything below is Google's fact about this meeting, mirrored onto the row by
 * the calendar sweep. It is a tab of its own rather than more lines on Overview
 * because it is a different KIND of fact — Overview is what one of us decided,
 * this is what Google is telling us — and because it carries a stamp saying when
 * it was last true, which nothing on Overview needs.
 *
 * THE ORDER IS THE ORDER SOMEBODY NEEDS IT IN. The two things a person opens a
 * meeting to DO are at the top (join it, open it in their calendar); who is
 * coming is next, because it is the question the rest of the tab exists to
 * answer; and the facts that rarely change — where, which zone, how often it
 * repeats — sit under them.
 */

/** WHICH HUNT FOUND THE TRANSCRIPT, in words. The three do not prove the same
 * thing, and a record that said only "transcript" would be presenting a name
 * match with the same confidence as a file Google itself filed against this
 * entry. */
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

function CalendarPanel({
  meeting,
  links,
  loadingLinks,
}: {
  meeting: Meeting
  links: MeetingPersonLink[] | null
  loadingLinks: boolean
}) {
  const { t, lang } = useLanguage()
  const linkFor = new Map((links ?? []).map((l) => [l.email, l]))
  // ROOMS ARE NOT STAKEHOLDERS. Google puts meeting rooms on the same attendee
  // list as people, and a room shown as a stakeholder is a stakeholder nobody
  // can ring — so they are separated rather than dropped, because "which room"
  // is a real fact about a meeting.
  const people = meeting.googleGuests.filter((g) => !g.resource)
  const rooms = meeting.googleGuests.filter((g) => g.resource)

  return (
    <div className="flex flex-col gap-6">
      {/* THE TWO THINGS A PERSON CAME HERE TO DO. The owner asked for the first
          of them by name: "there should be a calendar link, like a link that I
          can open the meeting within my calendar." */}
      <div className="flex flex-wrap gap-2">
        {meeting.googleJoinUrl && (
          <a
            href={safeHref(meeting.googleJoinUrl)}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(buttonVariants({ size: "sm" }), "gap-1")}
          >
            <Video className="size-3.5" aria-hidden /> {t("Join the call")}
          </a>
        )}
        {meeting.googleEventUrl && (
          <a
            href={safeHref(meeting.googleEventUrl)}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "gap-1")}
          >
            <ArrowSquareOut className="size-3.5" aria-hidden /> {t("Open in Google Calendar")}
          </a>
        )}
      </div>

      {/* WHO IS COMING — the "stakeholders" the owner asked for, and the reason
          this tab is worth having. An address that matches one of our own people
          or a contact on one of our accounts is shown as that RECORD; everybody
          else is shown as themselves, which is the honest answer for most people
          on most invitations. */}
      <section className="flex flex-col gap-2">
        <h2 className="text-muted-foreground text-sm font-medium">{t("Who was invited")}</h2>
        {people.length === 0 ? (
          // The kit's register (27.21) rather than a bare line — owner ruling,
          // 2026-09-07. No act: the invitation is Google's, edited there.
          <div className="rounded-[var(--radius)] bg-surface-panel px-4">
            <CollectionEmptyState title={t("Nobody else is on the invitation.")} />
          </div>
        ) : (
          <div className="flex flex-col rounded-[var(--radius)] bg-surface-panel">
            {people.map((g) => {
              const known = linkFor.get(g.email)
              return (
                <div
                  key={g.email}
                  // A row rule inside one panel: an inset hairline, not a
                  // border (kit §2.7 — web/test/kit-conformance.test.ts).
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 p-3 text-sm shadow-[var(--hairline-under)] last:shadow-none"
                >
                  <span className="font-medium">{g.name || g.email}</span>
                  {g.name && <span className="text-muted-foreground text-xs">{g.email}</span>}
                  {g.organizer && (
                    <Badge variant="secondary" className="text-badge">
                      {t("Organiser")}
                    </Badge>
                  )}
                  {g.optional && (
                    <Badge variant="secondary" className="text-badge">
                      {t("Optional")}
                    </Badge>
                  )}
                  {/* WHO THEY ARE TO US. Two different badges because they are
                      two different relationships, and somebody can be neither —
                      which is what an empty row here honestly says. */}
                  {known?.memberName && (
                    <Badge variant="secondary" className="text-badge">
                      {t("One of us")}
                    </Badge>
                  )}
                  {known?.accountName && (
                    <Badge variant="secondary" className="text-badge">
                      {known.accountName}
                    </Badge>
                  )}
                  {loadingLinks && !known && (
                    <span className="text-muted-foreground text-badge">…</span>
                  )}
                  <span className="text-muted-foreground ml-auto text-xs">
                    {RESPONSE[g.response] ?? g.response}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* FILES HANGING OFF THE ENTRY — the agenda doc, the deck, and the one this
          whole lane turns on: the transcript Google Meet files here once the call
          is over. Each carries Google's own icon for its type, which is a static
          unauthenticated link and therefore the one piece of Drive chrome that
          can go straight into a page. */}
      {meeting.googleAttachments.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-muted-foreground text-sm font-medium">{t("Attached to the entry")}</h2>
          <div className="flex flex-col rounded-[var(--radius)] bg-surface-panel">
            {meeting.googleAttachments.map((a) => (
              <a
                key={a.fileId || a.url || a.title}
                href={safeHref(a.url)}
                target="_blank"
                rel="noreferrer noopener"
                // The attachment rows' rule, the same inset hairline as the
                // invitee rows above (kit §2.7).
                className="hover:bg-muted/50 flex items-center gap-2 p-3 text-sm shadow-[var(--hairline-under)] last:shadow-none"
              >
                {a.iconUrl && (
                  <img src={safeSrc(a.iconUrl)} alt="" width={16} height={16} className="shrink-0" />
                )}
                <span className="min-w-0 flex-1 truncate">{a.title || a.fileId}</span>
                <ArrowSquareOut className="text-muted-foreground size-3 shrink-0" aria-hidden />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* THE FACTS THAT RARELY CHANGE. An OverviewList so it reads exactly like
          the tab beside it — the shape of a record's facts should not depend on
          which tab they are on. */}
      <OverviewList
        items={[
          { label: t("Where"), value: meeting.location ?? "—" },
          {
            label: t("Time zone"),
            // AN HOUR IS NOT A FACT WITHOUT ONE. The same stamp read in two
            // places is two different meetings to the people reading it.
            value: meeting.googleTimeZone ?? "—",
          },
          { label: t("Organiser"), value: meeting.googleOrganizer ?? "—" },
          {
            label: t("Repeats"),
            // Google's own RRULE is not a sentence anybody reads, so it is shown
            // as a yes with the rule beside it rather than as the rule alone.
            value: meeting.googleRecurrence ?? (meeting.recurringEventId ? "Yes, one of a series" : "No"),
          },
          {
            label: t("In Google"),
            value:
              meeting.googleStatus === "cancelled"
                ? "Called off"
                : meeting.googleStatus === "tentative"
                  ? "Not confirmed"
                  : meeting.googleStatus === "confirmed"
                    ? "Confirmed"
                    : "—",
          },
          {
            label: t("Rooms"),
            value: rooms.length ? rooms.map((r) => r.name || r.email).join(", ") : "—",
          },
        ]}
      />

      {/* WHEN THIS WAS LAST TRUE. A mirror that does not say how old it is is a
          mirror somebody will one day trust over the thing it reflects. */}
      <p className="text-muted-foreground text-xs">
        {meeting.googleSyncedAt
          ? `${t("Read from your calendar")} ${formatDateTime(meeting.googleSyncedAt, lang)}`
          : t("This hasn't been read from a calendar yet.")}
      </p>
    </div>
  )
}
