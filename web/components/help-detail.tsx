"use client"

// Ticket detail — one ticket as a tabbed record: a status STEPPER (the hero control)
// above Conversation / Overview tabs. Conversation = the chat (library
// TicketThread), Overview = audit metadata (OverviewList). The ticket's history
// (the GENERIC record-activity feed) is not a tab any more — it is reached from
// the ink footer's Latest activity column, on the client's 2026-09-06 ruling, and
// web/components/activity-panel.tsx carries that ruling and the argument. Edit +
// every status move are gated PURELY by help:edit. Replies echo instantly
// (optimistic) and reconcile with the server reply. Host-composed, like
// role-detail.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { toast } from "@shared/ui/components/sonner/sonner"
import { TabsView } from "@shared/web/screen-engine/tabs-view"
import { useRemembered } from "@shared/web/remembered"
import { TicketThread } from "@shared/ui/components/ticket-thread/ticket-thread"
import { TicketChips } from "@shared/web/ticket-chips"

// The old library's thread exported this; the kit's thread is messages-only,
// so the app owns the word now: who can be @mentioned.
type TicketMember = { id: string; name: string }

/** WHO YOU CAN TAG. Our own people, minus yourself. A client login is an
 * ordinary team member and used to be offered here, which would have put a "you
 * were mentioned" email in a client's inbox about our internal note — and the
 * portal has never offered mentions in the other direction, on purpose. The one
 * seam decides (lib/members).
 *
 * MODULE LEVEL, not a value computed inside the render, because the one caller
 * left runs FIVE SECONDS after the press and on the way out of a screen that may
 * have already returned early — see `sendReply` below. */
function mentionableTeamMembers(
  members: TeamMember[] | undefined,
  myUserId: string | null
): TicketMember[] {
  return assignableMembers(members).filter((m) => m.id !== myUserId)
}
import { TrayArrowUp, Archive, Checks, Translate, PencilSimple, PaperPlaneTilt } from "@shared/ui/foundations/icons"

import type {
  HelpMessage,
  HelpStakeholder,
  HelpTicket,
  SelectableValue,
  TeamMember,
} from "@shared/types"
// A VALUE, not a type — it must not ride the `import type` block above.
import { ticketTypeKeptForMigration } from "@shared/types"
import { ApiFailure, content, dataOps, tenancy } from "@/lib/api"
import type { HelpAccountFacet } from "@/lib/api/content"
import {
  RecordActionsMenu,
  RecordScreen,
  STICKY_TABS,
  RECORD_TABS_CONFIG,
  type RecordAction,
} from "@/components/record-chrome"
import { MARK_GROUP, markMap } from "@/lib/type-marks"
import { useFollowNewest } from "@shared/web/follow-newest"
import { formatRelative } from "@shared/web/format"
import { staffNameFromSnapshot } from "@shared/staff-name"
import { assignableMembers } from "@/lib/members"
import { usePermissions } from "@/lib/perms"
import { mergePage, invalidate, primeCache, useCached, useCachedValue } from "@shared/web/store"
import { formatCount } from "@shared/web/format-count"
import { recordActivityKey, useRecordActivity } from "@/lib/use-record-activity"
import { useRecordCounts } from "@/lib/use-record-counts"
import { HelpAttachmentsPanel } from "@/components/help-attachments"
import { HelpFormDialog } from "@/components/help-form-dialog"
import { HelpStakeholders } from "@/components/help-stakeholders"
import { InAppLink } from "@/components/in-app-link"
import { Swatch } from "@/components/record-picker"
import { ticketTypeColour } from "@/lib/type-colours"
import { ResolveDialog, type ResolveFormValues } from "@/components/resolve-dialog"
import { StoryFormDialog } from "@/components/story-form-dialog"
import { createStoryFrom, useStoryFormOptions } from "@/components/stories-screen"
import { StoriesPanel, sliceKey } from "@/components/work-panels"
import { TicketStages } from "@/components/ticket-stages"
import { WorkLogsPanel, workLogsTotalKey } from "@/components/work-logs-panel"
import { RecordTimerButton } from "@/components/timer-bar"
import { ReplyComposer, useReplySend } from "@/components/reply-composer"
import { OverviewList } from "@/components/overview-list"
import { TranslateAction, useHumanTranslation } from "@/components/translate-human-text"
import { helpAttachmentsKey, totalKey } from "@/lib/live-resources"
import { CONCEPT_ICON } from "@/lib/pages"
import { useLanguage } from "@shared/web/language"
import { ON_INVERSE_UNTIL_THE_KIT_RULES, RichText } from "@shared/web/rich-text-view"
import { richTextPlain } from "@shared/web/rich-text"
import { useConfirm } from "@shared/web/use-confirm"

export function HelpDetailScreen({
  teamId,
  helpId,
  myUserId,
  basePath,
}: {
  teamId: string
  helpId: string
  myUserId: string | null
  /** the tickets list in the URL form we arrived through (/tickets or
   * /t/<team>/tickets) — a cross-link off this record stays in that shape. */
  basePath: string
}) {
  const { t, lang } = useLanguage()

  const ticketsQ = useCached<HelpTicket[]>(`help:${teamId}`, () =>
    content.help().then((r) => r.tickets)
  )
  // TICKETS ARE THE GROWING COLLECTION (R14), SO THIS LIST IS A PAGE.
  //
  // THE OWNER, 26 Aug 2026, opening a ticket from Triage: "That ticket no longer
  // exists." It existed. It was ticket 1,030 of 1,820 in staging, and this line
  // was the whole of the lookup — a `find` over the newest fifty. Every ticket
  // past the cursor was unreachable by direct link, from the triage queue, from
  // an email button, from a bookmark, and the screen said the most alarming
  // thing it could: that the record was gone.
  //
  // The door has answered `?id` since paging landed, and says why in its own
  // comment ("One ticket by id is a LOOKUP, not a page"). `content.helpOne` was
  // written for it. Nothing had ever called either.
  //
  // Page one first, so a ticket that IS loaded paints with no round trip
  // (CACHING.md is cache-first), and the by-id read only when it is not — the
  // same shape meeting-detail and knowledge-detail already use. The `:one:` key
  // is registered in the live registry beside `help`, or a status change would
  // patch the list and leave this screen showing yesterday.
  const inPage = ticketsQ.data?.find((t) => t.id === helpId) ?? null
  const oneQ = useCached<HelpTicket | null>(
    ticketsQ.data !== undefined && !inPage ? `help:one:${helpId}` : null,
    () => content.helpOne(helpId)
  )
  const ticket = inPage ?? oneQ.data ?? null

  const repliesQ = useCached<HelpMessage[]>(`help-thread:${helpId}`, () =>
    content.helpThread(helpId).then((r) => {
      // R16: the badge shows the door's exact COUNT(*), never the (capped) list length.
      primeCache(`total:help-thread:${helpId}`, r.total)
      return r.replies
    })
  )
  const threadTotal = useCachedValue<number>(`total:help-thread:${helpId}`)
  const membersQ = useCached<TeamMember[]>(`members:${teamId}`, () =>
    tenancy.members().then((r) => r.members)
  )
  // The generic record feed (Law R5) + the exact server total its tab badges
  // (R8 for the place, R16 for the number — never the loaded page's length).
  const activity = useRecordActivity("help", helpId)
  // THE BADGES, BEFORE THE CLICK — the work written down against this request,
  // and what is attached to it. One bounded read of both totals when the ticket
  // opens; the rows behind each tab stay lazy (lib/use-record-counts).
  useRecordCounts("help", helpId)
  const selectableQ = useCached<SelectableValue[]>(`selectable:${teamId}`, () =>
    tenancy.selectable().then((r) => r.values)
  )
  const stakeholdersQ = useCached<HelpStakeholder[]>(`help-stakeholders:${helpId}`, () =>
    content.helpStakeholders(helpId).then((r) => r.stakeholders)
  )

  const stakeholderBadge = formatCount(stakeholdersQ.data?.length)
  const { can } = usePermissions(teamId)
  const canEdit = can("help", "edit") // single source — gates Edit, the stepper, and the thread's resolve
  // Logging time is `work:create` — the right the start/stop door itself gates
  // on, so the button offers exactly what the server would accept. It is WORK's
  // right and not the ticket's: answering a request and putting hours on the
  // team's timesheet are two different things a role may grant separately.
  const canLogTime = can("work", "create")
  // WRITING WORK DOWN IS THE WORK MODULE'S RIGHT, NOT THE TICKET'S. A person who
  // may read and answer requests is not necessarily a person who may put things
  // on the team's backlog, so the button on the Related stories tab asks the
  // right the STORY door itself gates on (`work:create`) rather than any `help:*`
  // right — the child's right, never the parent's. The door decides either way
  // (R10); this only decides whether we draw a button that would come back 403.
  const canWriteWork = can("work", "create")
  // THE TIME AGAINST THIS REQUEST. Reading it is `work:read` and correcting a row
  // is `work:edit` — the two rights those doors gate on, and neither of them is a
  // ticket right: answering a request and reading the team's timesheet are
  // different things a role may grant separately. A role without `work:read` sees
  // no tab at all rather than a tab that refuses.
  const canSeeTime = can("work", "read")
  const canEditTime = can("work", "edit")
  // R16: the door's exact COUNT(*) over this record's time, fetched by the panel
  // and read back here for the badge.
  const timeTotal = useCachedValue<number | null>(workLogsTotalKey("help", helpId))

  // The open tab is remembered per record for as long as this document
  // lives (web/lib/nav-memory.ts) — leaving to another section and coming
  // back lands on the tab she was reading, and a miss lands on "conversation".
  const [tab, setTab] = useRemembered("tab", "conversation")
  const [editing, setEditing] = React.useState(false)
  // NEW WORK AGAINST THIS REQUEST — and this is NOT "make it a story".
  //
  // CHECKLIST 3.10 took away three controls that CONVERTED a request into a
  // piece of work (the button on the title, the prompt after triage, and this
  // tab's create action), and the first two were right to go: a ticket never
  // becomes a story, it is answered by however many stories the work turns out
  // to need. The third was collateral damage. Writing a NEW story that ANSWERS
  // this request is a different act from turning the request into one, and it is
  // the act that gets a ticket to triaged: the stepper cannot move until there
  // is work booked against it, and until 18 Aug 2026 there was no way to book
  // any from the record you were standing on.
  //
  // So the distinction is this, and it is the reason the two must not be
  // re-merged: the ticket is UNCHANGED by this. Nothing about it is consumed,
  // renamed or replaced — a second story on the same request is as ordinary as
  // the first, which is precisely what a conversion could never express.
  const [storyOpen, setStoryOpen] = React.useState(false)
  const [resolving, setResolving] = React.useState(false)
  const [translating, setTranslating] = React.useState(false)
  const [statusBusy, setStatusBusy] = React.useState(false)
  // Archive is the one destructive act on this screen — one confirm dialog
  // (shared/web/use-confirm.tsx) rather than a hand-rolled one. Restoring stays
  // confirm-free, as the button beside it already says.
  const { busy: archiveBusy, ask: askArchive, run: runArchive, dialog: archiveDialog } = useConfirm()
  // R16: the Files and links tab badges the door's exact COUNT(*). `null` there
  // is the third answer beside a number and an absence — the role may not read
  // the module (R18) — and it renders as nothing, exactly as a zero does.
  const attachmentsTotal = useCachedValue<number | null>(`total:${helpAttachmentsKey(helpId)}`)
  // THE WORK ANSWERING THIS REQUEST. One story may answer many tickets and one
  // ticket may need many stories (the owner's ruling), so this is a collection
  // on the record rather than a field on it. Its exact total badges the tab.
  const storiesTotal = useCachedValue<number | null>(totalKey("stories-ticket", helpId))
    // NEST, DON'T REPLACE. This used to strip the collection segment off the path
  // before the panels appended to it, so opening a related record from here
  // threw away the record you opened it FROM — a story reached from a client
  // landed on /stories/<id> with no way back to the client. The base is now this
  // record's own address, so a related record lands INSIDE it and the trail is
  // in the URL for the crumbs, the Back button and anybody you send it to.
  const host = { base: `${basePath}/${helpId}` }
  // WHAT A STORY NEEDS TO BE WRITTEN AT ALL — the same four lists the backlog,
  // the sprint and the app hand this form. A hook, so it sits above the early
  // returns below; every list it reads is a cache another screen already holds.
  const options = useStoryFormOptions(teamId)

  // Land on the newest reply, and follow the one you just sent — the same
  // behaviour the client gets on their side of this same conversation, from the
  // same seam, so the two can't drift. It sits here, above the three early
  // returns below, because it is a hook.
  //
  // The optimistic echo makes this fire twice on a send (once for the local
  // `optimistic-…` row, once when the server's real id reconciles) and that is
  // correct — both are yours, so both follow.
  const replyRows = repliesQ.data ?? []
  const newestReply = replyRows[replyRows.length - 1]
  useFollowNewest(newestReply?.id ?? null, Boolean(myUserId) && newestReply?.authorId === myUserId)

  // THE RETIRED KIND IS NOT OFFERED HERE EITHER — the last picker that could
  // still put a ticket INTO it. Client, 2026-09-06: "keep the existing
  // requirements (we will use that later) but do not display them in tickets."
  //
  // Existing rows keep their word and stay readable; what must not happen is a
  // NEW one, or an existing ticket being MOVED into a kind the collection then
  // hides — which from her side would look exactly like the ticket vanishing.
  // The door refuses it as well (`refuseKeptForMigration`), so this is the
  // second of two fences rather than the only one; the picker exists so a
  // person is never offered a choice the door will reject.
  //
  // It still does not filter `active`, deliberately: that is a separate
  // question about the team's own vocabulary, and narrowing this dialog for a
  // reason nobody asked for is how a screen quietly loses an option.
  const helpTypeOptions = (selectableQ.data ?? [])
    .filter((v) => v.type === "Ticket type" && !ticketTypeKeptForMigration(v.value))
    .map((v) => v.value)

  // READ THIS CONVERSATION IN YOUR OWN LANGUAGE, if you ask. The whole screen's
  // human-typed words go in one array — the request AND every reply on it — so
  // one press is one call rather than one per paragraph. Nothing is written: the
  // ticket still says exactly what the client typed, and "Show original" puts it
  // straight back. A hook, so it sits above the three early returns below.
  const translation = useHumanTranslation(teamId, [
    ticket?.description,
    ...replyRows.map((r) => r.body),
  ])

  // THE FIVE-SECOND HOLD, HELD BY THE SCREEN AND NOT BY THE COMPOSER. It lives
  // above the tab strip on purpose: the strip unmounts the panel it is not
  // showing, so a hold owned by the composer would be flushed by a glance at
  // Related stories — and the client's ruling is that she can carry on reading
  // the ticket while it counts. Leaving the TICKET still sends it; leaving the
  // TAB is not leaving. A hook, so it sits above the three early returns below.
  const reply = useReplySend({ ticketId: helpId, onSend: sendReply })

  /** THE THREE ACTS THAT ARE LEFT. Everything else about this ticket's stage now
   * happens by itself — a sprint is picked, a timer starts, the last story
   * closes — so what a person can still DO is named rather than picked from a
   * dropdown of seven (CHECKLIST 5.2).
   *
   * `run` is the shape all three share: do it, say plainly if it was refused,
   * re-prime the list cache and the record's own history. */
  async function run(what: () => Promise<{ tickets: HelpTicket[] } | void>, done: string, fallback: string) {
    setStatusBusy(true)
    try {
      const r = await what()
      // Merge the page the door already returned — this used to prime and then
      // invalidate the SAME key one line later, so the fresh page was thrown
      // away and refetched (the ~1s rebuild, measured; round-two speed review).
      if (r && "tickets" in r) {
        mergePage(`help:${teamId}`, "id", r.tickets as unknown as Record<string, unknown>[])
        const extras = r as {
          byType?: Record<string, number>
          byStatus?: Record<string, number>
          byAccount?: HelpAccountFacet[]
        }
        if (extras.byType) primeCache(`help-by-type:${teamId}`, extras.byType)
        if (extras.byStatus) primeCache(`help-by-status:${teamId}`, extras.byStatus)
        if (extras.byAccount) primeCache(`help-by-account:${teamId}`, extras.byAccount)
      } else invalidate(`help:${teamId}`)
      invalidate(recordActivityKey("help", helpId))
      toast.success(done)
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : fallback)
    } finally {
      setStatusBusy(false)
    }
  }

  /** ANSWER IT AND TELL THEM (CHECKLIST 5.6 + 5.7). The door refuses without the
   * words, which is 5.6 stated where it can be enforced; the send goes to the
   * person who raised it and that client's main stakeholder, which is 5.7 and
   * Aurora's ts3 over the owner's "raiser only".
   *
   * A ticket already answered comes back `alreadyResolved` and emails nobody —
   * R17 is the send guard, so a second press is not a second answer. */
  async function resolve(values: ResolveFormValues) {
    const r = await content.resolveHelp(helpId, values.resolution)
    invalidate(`help:${teamId}`)
    invalidate(`help-thread:${helpId}`)
    invalidate(recordActivityKey("help", helpId))
    toast.success(r.alreadyResolved ? t("Already answered.") : t("Answered, and they've been told."))
  }

  /** THE WHOLE FORM, FORWARDED — never a hand-listed copy of it.
   *
   * THE OWNER, 26 Aug 2026: "there are some fields in many screens that don't
   * get saved in the edit screen. One example… the ticket modules are not
   * getting saved."
   *
   * This rebuilt the payload field by field, and `moduleId` was not among them.
   * The form offered the picker, the person chose a module, the door was ready
   * to write it — and this function quietly dropped it between the two. Nothing
   * errored, the toast said "Ticket updated", and the field came back as it was.
   *
   * TypeScript could not see it: a handler that accepts FEWER properties is
   * assignable to one that supplies more, so narrowing the parameter type hid
   * the omission rather than reporting it. The two other screens that open this
   * form pass their argument WHOLE (`{ id, ...input }`), which is why the same
   * edit saved from the tickets list and not from here.
   *
   * So it spreads. The door decides what it accepts; this is a courier. */
  async function editTicket(input: {
    titleEn?: string
    description: string
    helpType?: string
    // Naming the client on a ticket that has none. Once it has one the form
    // sends the SAME id back and the door leaves it where it is; it refuses a
    // DIFFERENT one, which is the case this field must never quietly cause.
    accountId?: string
    // These three are correctable, unlike the client: a request filed against
    // the wrong system, the wrong section of it, or a colleague who actually
    // raised it, are all ordinary mistakes.
    appId?: string
    moduleId?: string
    raisedByContactId?: string
  }) {
    const { tickets, byType, byStatus, byAccount } = await content.updateHelp({ id: helpId, ...input })
    // Merge, don't replace: priming the whole key with this first page threw
    // away rows scrolled in past it (same seam-fix as the collection's edit).
    mergePage(`help:${teamId}`, "id", tickets as unknown as Record<string, unknown>[])
    if (byType) primeCache(`help-by-type:${teamId}`, byType)
    if (byStatus) primeCache(`help-by-status:${teamId}`, byStatus)
    if (byAccount) primeCache(`help-by-account:${teamId}`, byAccount)
    invalidate(recordActivityKey("help", helpId))
    toast.success(t("Ticket updated."))
  }

  async function addStakeholder(userId: string) {
    const { stakeholders } = await content.addStakeholder(helpId, userId)
    primeCache(`help-stakeholders:${helpId}`, stakeholders)
    invalidate(recordActivityKey("help", helpId))
  }

  /** THE TWO SENDS, AND THEY ARE ONE FUNCTION ON PURPOSE.
   *
   * The client's ruling gives the composer two controls — a wordless send and
   * "Send and close" — and the artifact is explicit that they behave identically
   * for the five seconds before either of them happens: same delay, same toast,
   * same pending bubble, same Undo, same restored text. The ONLY differences are
   * the sentence the toast settles on and which door is called at zero. So they
   * are one function with one flag, rather than two that will drift.
   *
   * It is called by `ReplyComposer` only when the hold reaches zero (or is cut
   * short by her leaving), never on the press — nothing here happens during the
   * five seconds. `leaving` rides through to `fetch` as `keepalive`, which is
   * what lets the send outlive a tab that is closing.
   *
   * It returns the words the settling toast should say, because only this
   * function knows what the door answered — a "Send and close" on a ticket
   * somebody else already answered comes back `alreadyResolved` and emails
   * nobody (R17 is the send guard), and that is a different sentence.
   *
   * IT THROWS ON A REFUSAL rather than swallowing it: the composer catches it,
   * says so, and puts her words back in the field. A reply lost to a 500 is the
   * one outcome worse than a slow one. */
  async function sendReply(body: string, andClose: boolean, leaving: boolean): Promise<string> {
    // The mention list is read OUT OF the sent text by name-match against the
    // members we may tag, exactly as the kit composer's own call site did.
    //
    // Computed HERE rather than read off a value the render happened to leave
    // lying around: this runs five seconds after the press, and on the way out
    // of a screen that may already have returned early. A function that only
    // works when the component got as far as its happy path is a function that
    // throws on the one path this whole file exists to make reliable.
    const mentions = mentionableTeamMembers(membersQ.data, myUserId).filter((m) =>
      body.includes(`@${m.name}`)
    )
    const prev = repliesQ.data ?? []
    const optimistic: HelpMessage = {
      id: `optimistic-${Date.now()}`,
      ticketId: helpId,
      body,
      taggedUserIds: mentions.map((m) => m.id),
      isAgent: false,
      authorId: myUserId ?? "",
      authorName: "You",
      // The optimistic echo is always the signed-in staff member, so this is
      // never a contact (R54) — and "You" has no surname to lose either way.
      authorIsClient: false,
      createdAt: new Date().toISOString(),
    }
    // ~instant echo (WhatsApp-style). It takes over from the pending bubble at
    // the exact moment the bubble goes, so the message never blinks out of the
    // thread between the wait ending and the door answering.
    primeCache(`help-thread:${helpId}`, [...prev, optimistic])
    try {
      if (andClose) {
        // THE HOLE THIS FILLS. "Answer and close" on the title is offered only at
        // status `ready`, and `readyFlipForTicket` returns early on a ticket with
        // no stories — so a Question answered in one line had NO way to be closed
        // except Archive, which is not closing it, it is hiding it. This works at
        // every status, and it satisfies `/help/resolve` the honest way: the door
        // refuses without a resolution, and the reply she just typed IS the
        // resolution, sent as the `resolution` field. The door is unchanged.
        const r = await content.resolveHelp(helpId, body, leaving)
        invalidate(`help-thread:${helpId}`)
        invalidate(`help:${teamId}`)
        invalidate(recordActivityKey("help", helpId))
        return r.alreadyResolved ? t("Already answered.") : t("Answered, and they've been told.")
      }
      const { replies } = await content.replyHelp(
        helpId,
        body,
        mentions.map((m) => m.id),
        leaving
      )
      primeCache(`help-thread:${helpId}`, replies) // reconcile with server truth
      invalidate(`help:${teamId}`)
      return t("Sent.")
    } catch (err) {
      primeCache(`help-thread:${helpId}`, prev) // rollback the echo
      throw err
    }
  }

  /** PUT IT AWAY, or take it back out. The door has answered this since archive
   * shipped and no screen ever called it, so a ticket could be archived by the
   * assistant and then be unreachable by a person. Nothing is deleted: the
   * conversation and the history survive exactly as they were. Putting it away
   * asks first (it is the red half); taking it back out does not. */
  function archiveTicket() {
    askArchive({
      title: t("Archive this ticket?"),
      body: t("It stops showing in the everyday lists. The conversation and its history stay exactly as they are, and you can take it back out any time."),
      action: t("Archive"),
      run: () =>
        runArchive(
          async () => {
            const { tickets } = await content.archiveHelp(helpId, true)
            primeCache(`help:${teamId}`, tickets)
            invalidate(recordActivityKey("help", helpId))
          },
          t("Put away."),
          t("Couldn't archive the ticket.")
        ),
    })
  }

  async function restoreTicket() {
    setStatusBusy(true)
    try {
      const { tickets } = await content.archiveHelp(helpId, false)
      primeCache(`help:${teamId}`, tickets)
      invalidate(recordActivityKey("help", helpId))
      toast.success(t("Taken back out."))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't change that."))
    } finally {
      setStatusBusy(false)
    }
  }

  /** TRANSLATE AND SET IT. The door spends one unit of the team's AI allowance
   * and refunds it if nothing usable came back, so a failure here costs nothing
   * but the second it took. */
  async function translate() {
    setTranslating(true)
    try {
      await dataOps.translateTicket(helpId)
      invalidate(`help:${teamId}`)
      toast.success(t("Translated."))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't translate that."))
    } finally {
      setTranslating(false)
    }
  }

  // THE CHROME STAYS, ONLY THE PANEL SPINS (RecordChrome's law 4) — a prototype
  // of that wiring, on this screen only, per the plan agreed with the planner:
  // change RecordScreen's signature and this screen's guards, nothing wider,
  // and report before touching the other detail screens. Each branch below
  // still returns before the "ready" body (nothing after it assumes `ticket`),
  // so no hook order changed and no other guard moved.
  if (ticketsQ.error)
    return (
      <RecordScreen
        title={<Skeleton className="h-7 w-48" />}
        state="error"
        copy={{ errorTitle: t("Couldn't load the ticket.") }}
        errorAction={
          <Button variant="secondary" onClick={() => invalidate(`help:${teamId}`)}>
            {t("Try again")}
          </Button>
        }
      />
    )
  // …AND NOT WHILE THE BY-ID READ IS STILL GOING. "That ticket no longer exists"
  // is a claim, and a claim made before the only read that could disprove it has
  // answered is a lie that happens to be quick.
  if (ticketsQ.data === undefined || (!inPage && oneQ.data === undefined && !oneQ.error))
    return <RecordScreen title={<Skeleton className="h-7 w-48" />} state="loading" />
  if (!ticket)
    return (
      <RecordScreen
        title={t("Ticket")}
        state="empty"
        copy={{
          emptyTitle: t("That ticket no longer exists."),
          emptyDescription: "",
        }}
      />
    )

  const replies = (repliesQ.data ?? []).map((r) => ({
    id: r.id,
    // R54: a thread in the agency app has BOTH sides on it. A colleague is named
    // by their first name; a contact who replied about their own question keeps
    // their name whole. `authorIsClient` is the row's own answer — the same
    // `from_client` subselect the portal's redaction already runs.
    author: (r.authorIsClient ? r.authorName : staffNameFromSnapshot(r.authorName)) || "Member",
    time: formatRelative(r.createdAt, t, lang),
    // The reply as the reader asked for it: what was typed, or the translation
    // they pressed for. Never both, and never a stored rewrite of somebody's
    // words — `of` is a lookup, not a save.
    body: translation.of(r.body),
    aiDrafted: r.isAgent,
  }))

  const overviewItems = [
    { label: t("Type"), value: ticket.helpType || "General" },
    // WHICH SYSTEM, AND WHO ASKED (CHECKLIST 5.8 + 5.9). "Who asked" is not "who
    // typed": most of a client's history is written down on their behalf, so the
    // contact and the audit line below are two different people more often than
    // they are one.
    { label: t("App"), value: ticket.appName || "" },
    { label: t("Raised by"), value: ticket.raisedByContactName || "" },
    // BOTH TITLES, and the German one first when it is the original. 788 of the
    // requests arriving from the previous system exist ONLY in German (BUILD-1
    // §8), so "the title" is two fields here and the screen says so rather than
    // picking one and hoping.
    { label: t("Title"), value: ticket.titleDe || "" },
    { label: t("Title (English)"), value: ticket.titleEn || "" },
    { label: t("Raised from"), value: ticket.sourceScreen || "" },
    // The audit rows are NOT here any more: created-by and last-edited-by moved
    // to the footer at the foot of the record (D7 / CHECKLIST 11.3), where they
    // stop pushing the ticket's own facts below the fold.
    //
    // THE STATUS ROW USED TO SAY "the status is on the header band's own
    // line" — true while the header's chips were status/app/archived. Client
    // ruling, 2026-09-06 (see `RecordScreen`'s own `chips` comment above):
    // those three are gone, replaced by the same four-fact line the triage
    // card draws (ID/type/app/date), and status is not one of the four. So as
    // of this pass the ticket's STAGE is not shown anywhere on this screen —
    // written down rather than discovered later, because the old comment
    // would otherwise keep telling the next reader a true sentence about a
    // screen that no longer exists. Not re-added here on judgement: the
    // client asked for exactly four facts and nothing else, and where the
    // status goes next (back here as a row, or somewhere else) is hers to
    // decide, not a default this screen should reintroduce quietly.
    { label: t("Resolved"), value: ticket.resolvedAt ? formatRelative(ticket.resolvedAt, t, lang) : "" },
  ]


  const tabsConfig = {
    ...RECORD_TABS_CONFIG,
    tabs: [
      {
        value: "conversation",
        label: t("Conversation"),
        icon: "chat-teardrop-dots",
        badge: formatCount(threadTotal),
        badgeVariant: "" as const,
      },
      { value: "overview", label: t("Overview"), icon: "info", badge: "", badgeVariant: "" as const },
      {
        value: "stories",
        label: t("Related stories"),
        icon: CONCEPT_ICON.stories,
        badge: formatCount(storiesTotal),
        badgeVariant: "" as const,
      },
      // WORK LOGS, wherever time can be tracked (CHECKLIST 6.8). A ticket has
      // carried a start/stop timer in its own header since the work engine
      // shipped, and no screen showed what that timer had produced — so the hours
      // on a request could be logged and never read back on the record they were
      // logged against.
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
      {
        value: "files",
        label: t("Files and links"),
        icon: "paperclip",
        badge: formatCount(attachmentsTotal),
        badgeVariant: "" as const,
      },
      {
        value: "stakeholders",
        label: t("Stakeholders"),
        icon: "users",
        // The stakeholder set is COMPUTED in full (raiser + admins + mentions + adds),
        // not a capped table read — its size IS the true total, shown via the one seam.
        badge: stakeholderBadge,
        badgeVariant: "" as const,
      },
      /* NO ACTIVITY TAB. It was the last tab here for exactly one day. The
         client, 2026-09-06: "in all the screens across the app, Activity is
         always the last tab" — it had sat third, with Related stories, Work
         logs, Files and links and Stakeholders to its right, which made the
         ticket the one record where the log interrupted the record. Moving it
         to the end was the right answer to the question she was asking, and the
         SAME day she answered a bigger one: "I don't want to have activity as a
         tab anywhere but on the footer, on top of the dates. On the right
         column, on Latest Activity, I would like some view or expand or
         whatever, and this would open a slide-in with all the activity." A tab
         that is ABOUT the record rather than part of it does not belong at the
         end of the strip; it belongs off the strip. Ruled again 2026-09-07:
         "kill all old activity tabs." web/components/activity-panel.tsx carries
         the argument, and the feed itself is unchanged — see `activity` on
         `RecordScreen` below. */
    ],
  }

  /* ONE PRIMARY, ONE SECONDARY, AND A MENU (UI-RULEBOOK B1, CHECKLIST 11.2).
   *
   * This title carried six controls and was the worst case in the app. The
   * ranking picks the two that stay: the act that MOVES THE TICKET FORWARD is
   * the primary (confirming it, or answering it — only ever one of the two is
   * offered, because they belong to different stages), and the clock is the
   * secondary, because logging time is the thing somebody does on a ticket most
   * often that is not destructive.
   *
   * Translate, Edit and Archive go into the three-dot menu. None of them loses
   * its confirm or its colour by moving. */
  const overflow: RecordAction[] = [
    // GIVE THE TICKET AN ENGLISH TITLE, on one that has a German title and no
    // English one yet. It SETS the field rather than showing a preview (BUILD-1
    // §8): a preview is a thing one person reads once, and a set field is a
    // thing the whole team, the search and the assistant read afterwards. It
    // disappears the moment there is an English title, because there is then
    // nothing to ask for.
    //
    // IT IS NAMED FOR WHAT IT WRITES, not for what it does on the way, because
    // the conversation below now carries a Translate of its own that changes
    // nothing and belongs to one reader. Two buttons called "Translate", one
    // permanent and team-wide and one personal and temporary, is the kind of
    // thing somebody presses once and never trusts again.
    ...(canEdit && ticket.titleDe && !ticket.titleEn
      ? [
          {
            key: "translate",
            label: translating ? t("Translating…") : t("Set an English title"),
            icon: <Translate className="size-3.5" />,
            disabled: translating,
            onSelect: () => void translate(),
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
    // PUT IT AWAY. Available from any state (SCOPE ch.07), destructive in colour
    // because it takes the request out of the everyday lists, and reversible,
    // which the confirm-free restore says out loud.
    ...(canEdit
      ? [
          ticket.archivedAt
            ? {
                key: "unarchive",
                label: t("Take it back out"),
                icon: <TrayArrowUp className="size-3.5" />,
                disabled: statusBusy,
                onSelect: () => void restoreTicket(),
              }
            : {
                key: "archive",
                label: t("Archive"),
                icon: <Archive className="size-3.5" />,
                disabled: statusBusy || archiveBusy,
                destructive: true,
                onSelect: archiveTicket,
              },
        ]
      : []),
  ]

  const actions = (
    <>
      {/* THE CLIENT SAYS YES (CHECKLIST 5.13). Staff press it for the answer that
          arrives by phone; the client presses the same door in their own portal.
          It appears only while the request is actually waiting, and disappears
          the moment it is not, a control that can only be refused should not be
          a control. */}
      {ticket.status === "awaiting_validation" && (
        <Button
          disabled={statusBusy}
          onClick={() =>
            void run(
              () => content.validateHelp(helpId),
              "Confirmed, it's in the queue.",
              "Couldn't confirm that."
            )
          }
          className="shrink-0 gap-1"
        >
          <Checks className="size-3.5" />
          {t("They've confirmed it")}
        </Button>
      )}
      {/* ANSWER IT AND TELL THEM. Offered from READY onward, the stage that means
          every piece of work is done and only the telling is left, and never on a
          ticket already answered. The panel is where the words are written,
          because the door refuses without them (5.6). */}
      {canEdit && ticket.status === "ready" && (
        <Button disabled={statusBusy} onClick={() => setResolving(true)} className="shrink-0 gap-1">
          <PaperPlaneTilt className="size-3.5" />
          {t("Answer and close")}
        </Button>
      )}
      {/* THE CLOCK ON A REQUEST. Reading, triaging and resolving one is real work
          and BUILD-1 §5 is explicit that it is loggable against the request. */}
      <RecordTimerButton
        teamId={teamId}
        targetTable="help"
        targetId={helpId}
        canLog={canLogTime}
        disabled={ticket.status === "resolved"}
      />
      <RecordActionsMenu actions={overflow} />
    </>
  )

  return (
    <RecordScreen
      // NO MARK — client ruling, 2026-09-07, "for type, kill the emojis. this
      // is legacy. in current system we use colors." The square the header band
      // keeps for a glyph (G3) held the team's own emoji for this ticket's
      // kind, read off the Dropdown values screen. The kind is drawn by
      // `chips` below instead, as the coloured pill every other ticket surface
      // in the app already uses (`Swatch` + `ticketTypeColour`), so nothing
      // about this header stopped saying what kind of ticket it is.
      // `web/lib/type-marks.ts` carries the whole ruling and what it did NOT
      // touch (the stored glyphs, and the other record kinds).
      // NO EYEBROW — client ruling, 2026-09-03, verbatim: "I want you to remove
      // the eyebrow on the title on main screens. Remove that eyebrow, kill it."
      // The prop this line used to pass is deleted from `RecordScreen` itself
      // (record-chrome.tsx says why it had outlived the 2026-09-01 ruling that
      // took the eyebrow out of the full header); the breadcrumb above this
      // header is what names the record type now.
      // NO `recordNumber` HERE — client ruling, 2026-09-06, reading this screen
      // next to the triage card: "replicate the pills that we have on the view
      // outside. These are: ID, type, app, date. Remove the rest, and
      // everywhere else where tickets have pills, reuse this." The triage
      // card's own four-chip line is `TicketChips`
      // (`shared/web/ticket-chips.tsx`), and it draws the ID chip itself — so
      // handing the same ticket to BOTH `recordNumber` and `chips` would draw
      // the black lozenge twice. `chips` below carries the whole line as one
      // unit instead, ID included, which is also truer to the ask: she asked
      // to reuse THE LINE, not to keep splitting the ID out of it the way this
      // screen and `app-detail.tsx` split it for OTHER records that do not
      // have a client-approved chip line of their own.
      //
      // WHAT THIS REPLACES, so the removal is on the record: the status pill
      // (`Badge variant="status" dot={helpStatusDotTone(ticket.status)}`,
      // `STATUS_LABEL[ticket.status]`), the app pill (was `RecordChipLink`,
      // now folded into `TicketChips`' own app chip, which draws the exact
      // same fact through `InAppLink` instead), and the archived pill
      // (`Badge variant="status" dot="archived"`). None of the three is a
      // fact this line's four are — status and archived are STATE, which
      // change while everyone is looking at the record and were never part of
      // what the client asked to keep — and status is not shown anywhere else
      // on this screen (the Overview list's own comment used to say "the
      // status is on the header band's own line"; that line is now this one,
      // narrowed to what she asked for).
      chips={
        <TicketChips
          ticket={ticket}
          // THE SAME DOT THE TYPE PICKER DRAWS, from the same component and
          // the same map — see `shared/web/ticket-chips.tsx`'s header for why
          // this is a prop rather than an import.
          typeDot={<Swatch colour={ticketTypeColour(ticket.helpType)} />}
          appHref={ticket.appId ? `${host.base}/apps/${ticket.appId}` : undefined}
          AppLink={InAppLink}
        />
      }
      // The description is rich text now, and a TITLE is one line: the words,
      // without the markup they were typed with. The body renders formatted in
      // the conversation below, which is where a person reads it. Translated
      // FIRST, then flattened — a title has to say what the reader just chose.
      title={richTextPlain(translation.of(ticket.description))}
      // CLIENT RULING, 2026-08-31, VERBATIM: "what is this 3rd component in
      // the title under the chips? kill everywhere. chips is the last
      // component of headers!" Overrides the D5 trim above, which had kept
      // `raisedByContactName` here reasoning it wasn't shown anywhere else —
      // that reasoning no longer matters (the client's ruling drops the
      // information regardless of duplication), and in any case "Raised by"
      // is already a row in the Overview tab (this screen's own
      // `overviewItems`), so nothing is lost. `RecordChrome`'s `meta` slot
      // (record-chrome.tsx's `status` prop, confirmed via the kit's own
      // `data-record-region="header"` block) renders directly under the
      // chips row, which is exactly the region the ruling forbids — so
      // `status` is dropped rather than fed, on every record screen, not
      // only here.
      //
      // `headerExtra`'s stepper is dropped for the same reason: it maps to
      // `RecordChrome`'s `hero` prop, which the kit draws in its own
      // `data-record-region="hero"` block — the region directly under the
      // header block that carries the chips, still above the tab strip. On
      // the rendered page that reads as more content under the pills, which
      // is the ruling's own complaint, so it goes too rather than being read
      // as a technicality the ruling didn't quite reach.
      actions={actions}
      // D7 / CHECKLIST 11.3: who made it and who last touched it, now the
      // kit's own ink footer's Record column rather than five rows in the
      // middle of Overview.
      audit={{
        createdByName: ticket.raiserName,
        createdAt: ticket.createdAt,
        editedByName: ticket.editorName,
        updatedAt: ticket.updatedAt,
        // R54, and this is the ONE record detail in the app whose creator may be
        // a client: staff raise 220 of every 221 tickets on a contact's behalf,
        // but a contact raising their own question through the portal is the
        // whole point of the portal. The row already knows which, so the footer
        // is told rather than left to guess.
        createdByIsClient: ticket.raiserIsClient,
        editedByIsClient: ticket.editorIsClient,
      }}
      activity={activity}
      // THE STAGE STRIP, AT THE TOP OF THE ACTIVITY RAIL — the client asked to
      // read a ticket's stage history "in activity" ("closed on x, reopen on y,
      // closed again on z", 2026-09-06, "keep it in activity"). That placement
      // ruling never changed; what moved is where "in activity" IS. It was the
      // Activity tab, above the feed; the tab is gone (2026-09-06 · 2026-09-07)
      // and the slide-in off this footer's Latest activity column is the room
      // that replaced it, so the strip goes there — above the same feed it was
      // always written to sit above (ticket-stages.tsx's own header argues why
      // it belongs beside that feed and not instead of it: the feed cannot say
      // the SEQUENCE or the arithmetic, and this cannot say what was said).
      //
      // THE ONE RECORD TYPE THAT PASSES THIS. `activityHead` is a slot on
      // `RecordScreen` rather than something the rail knows about, because a
      // stage ladder is true of a ticket and of none of the other thirteen
      // details — the rail must not learn what a ticket is.
      activityHead={<TicketStages ticketId={helpId} />}
      onAddNote={can("help", "create") ? activity.addNote : undefined}
      notePlaceholder={t("Add a note")}
    >
      <TabsView
        className={STICKY_TABS}
        config={tabsConfig}
        value={tab}
        onValueChange={setTab}
        renderPanel={(panel) => {
          if (panel.value === "overview")
            return <OverviewList items={overviewItems} />
          /* NO ACTIVITY PANEL HERE, AND NO STAGE STRIP EITHER. This branch
             drew `<TicketStages>` above `<ActivityPanel>` while there was an
             Activity TAB to draw them in. There is not: the client killed the
             tab across the app (2026-09-06 · 2026-09-07) and both moved
             together into the slide-in off the footer's Latest activity
             column, which is where `activityHead` and `activity` (above) send
             them now. Neither was re-homed onto some other tab in between,
             which is the placement nobody asked for. */
          // A TAB ON THE TICKET WHERE MORE WORK CAN BE ADDED. One story may
          // answer many tickets and one ticket may need many stories, so this is
          // a collection with its own create action — and the button is the
          // create action the comment above it had been promising while handing
          // the panel no `onNew` at all. See the note on `storyOpen` for why
          // adding work here is not the "make it a story" that was removed.
          if (panel.value === "stories")
            return (
              <StoriesPanel
                marks={markMap(selectableQ.data, MARK_GROUP.story)}
                ownerKind="ticket"
                ownerId={helpId}
                filter={{ ticketId: helpId }}
                host={host}
                onNew={canWriteWork ? () => setStoryOpen(true) : undefined}
                emptyText={t("No work written down against this ticket yet.")}
              />
            )
          if (panel.value === "time")
            return (
              <WorkLogsPanel
                targetTable="help"
                targetId={helpId}
                recordLabel={[ticket.ref, richTextPlain(ticket.description)].filter(Boolean).join(" · ")}
                canEdit={canEditTime}
                canLog={canLogTime}
                onActivityChanged={() => invalidate(recordActivityKey("help", helpId))}
              />
            )
          if (panel.value === "files")
            // help:EDIT since the door tightened (e36b254) — read kept the
            // button visible and every press a 403.
            return <HelpAttachmentsPanel ticketId={helpId} canEdit={can("help", "edit")} />
          if (panel.value === "stakeholders")
            return (
              <HelpStakeholders
                stakeholders={stakeholdersQ.data ?? []}
                members={assignableMembers(membersQ.data)}
                canAdd={can("help", "read")}
                onAdd={addStakeholder}
              />
            )
          return (
            <>
              {/* READ IT IN YOUR OWN LANGUAGE — above the conversation, because
                  the conversation is what it acts on. Inline rather than in the
                  three-dot menu: this is a thing somebody presses while reading
                  and presses back a moment later, and it must not be hidden
                  behind a click for a person who cannot read the screen. */}
              <div className="flex justify-end">
                <TranslateAction translation={translation} />
              </div>
              {/* The kit's thread is messages + composer; the old library's
                  carried the ticket header, a status control and an @mention
                  autocomplete inside it. The header rides in the kit's `banner`
                  slot; the status controls stay off exactly as before (the one
                  way to answer this ticket is the panel on the title); and a
                  mention is now read OUT OF the sent text by name-match against
                  the same members list the autocomplete used to offer —
                  autocomplete itself needs a kit spec (logged for Aurora).
                  NO TYPE BADGE HERE ANY MORE — client ruling, 2026-09-06 (see
                  the header pills above): the type is already the first fact
                  in `TicketChips`, up in the record header, so a second badge
                  saying the same word again down here is exactly the kind of
                  duplicate pill she asked removed. `sourceScreen` stays — it is
                  not a pill, and it says something the chip line does not. */}
              <TicketThread
                banner={
                  ticket.sourceScreen ? (
                    <span className="text-muted-foreground text-sm">{ticket.sourceScreen}</span>
                  ) : undefined
                }
                messages={[
                  {
                    id: "description",
                    side: "theirs",
                    // The CONTACT this was raised for wins, whole — they are the
                    // person the question belongs to. Failing that it is whoever
                    // typed it, named by the R54 rule for their own population.
                    author:
                      ticket.raisedByContactName ||
                      (ticket.raiserIsClient
                        ? ticket.raiserName
                        : staffNameFromSnapshot(ticket.raiserName)) ||
                      undefined,
                    body: <RichText html={translation.of(ticket.description)} />,
                  },
                  /* A REPLY IS PROSE ON THE CHARCOAL FILL, AND PROSE HAS TO BE
                     TOLD. `side: "mine"` is the bubble the kit paints
                     `bg-surface-inverse text-ink-on-inverse` — correct, and
                     immediately overridden by the `ArticleBody` inside it,
                     which paints its own `--ink-secondary` and its own
                     `--foreground` on links and bold. The description above is
                     the same component on `bg-card` and needs nothing, which is
                     exactly why this went unnoticed: the two bodies are one
                     line apart and only one of them changed ground. The class
                     is the app holding the line until the kit rules on an
                     inverse register — rich-text-view.tsx carries the argument
                     and the measurement, and names what to delete when it
                     does. */
                  ...replies.map((r) => ({
                    id: r.id,
                    side: "mine" as const,
                    author: r.author,
                    authorMeta: r.aiDrafted ? t("AI drafted") : undefined,
                    time: r.time,
                    body:
                      typeof r.body === "string" ? (
                        <RichText html={r.body} className={ON_INVERSE_UNTIL_THE_KIT_RULES} />
                      ) : (
                        r.body
                      ),
                  })),
                ]}
                /* THE KIT'S COMPOSER IS OFF AND THE APP'S IS DRAWN BELOW IT.
                   The client ruled two sends on this composer — a wordless
                   paper plane and "Send and close" — and `TicketThread` holds
                   exactly one `<button type="submit">` with one `sendLabel`,
                   with no slot beside it. The kit is a pinned dependency (a
                   hand-edit under `shared/ui/` turns the build red), so the
                   second control is drawn app-side, out of the kit's own Button
                   and the kit's own glyph, in the same pill. The thread itself —
                   the bubbles, the sides, the receipts — is still entirely the
                   kit's. Logged for the kit's owner: `TicketThread` wants a
                   secondary send action and a wordless primary. */
                composer={false}
              />
              <ReplyComposer
                send={reply}
                /* CLOSING IS `help:edit` — the right `/help/resolve` itself
                   gates on — and there is nothing to close on a ticket that is
                   already answered, so the control is not drawn rather than
                   drawn and refused. Every OTHER status draws it, which is the
                   whole point: the title's "Answer and close" appears only at
                   `ready`, and a Question with no stories never reaches it. */
                canClose={canEdit && ticket.status !== "resolved"}
                answered={ticket.status === "resolved"}
              />
            </>
          )
        }}
      />

      {/* NEW WORK ON THIS REQUEST. The ticket rides in as `fixedTicket`: the
          request behind the work is a fact about where you are standing, not a
          question, so it is shown rather than offered and cannot be mistyped.
          The app is left as a question, because a request about one system is
          often answered by work on another.

          The story arrives ALREADY RELATED — that relation is the entire point,
          and it is what makes the list behind this dialog move. `createStoryFrom`
          drops the backlog and the sprints; the slice this record reads is
          dropped here, because it is the one cache that knows about this ticket.
          Everyone else's screen is patched by the publish the door already
          sends (R1/R15). */}
      <StoryFormDialog
          teamId={teamId}
        open={storyOpen}
        onOpenChange={setStoryOpen}
        sprints={options.sprints}
        apps={options.apps}
        fixedTicket={{
          // The same words the picker on this form would have shown, through the
          // same plain-text seam the header uses — a request written in rich text
          // must not arrive in the dialog wearing its markup.
          id: helpId,
          label: [ticket.ref, richTextPlain(ticket.description)].filter(Boolean).join(" · "),
        }}
        tickets={options.tickets}
        members={options.members}
        appStaff={options.appStaff}
        processes={options.processes}
        storyTypes={options.storyTypes}
        draftKey={`story:add:ticket:${helpId}`}
        onSubmit={async (v) => {
          // The id goes back so the dialog can hang the picked files on it —
          // see the note at the sprint's copy of this call. Discarding it drops
          // the file silently.
          const madeId = await createStoryFrom(teamId, { ...v, ticketId: helpId }, t)
          invalidate(sliceKey("stories-ticket", helpId))
          return madeId
        }}
      />

      <ResolveDialog
        open={resolving}
        onOpenChange={setResolving}
        draft={ticket.draftResolution}
        draftKey={`help:resolve:${helpId}`}
        onSubmit={resolve}
      />

      <HelpFormDialog
        open={editing}
        onOpenChange={setEditing}
        draftKey={`help:edit:${helpId}`}
        teamId={teamId}
        helpTypeOptions={helpTypeOptions}
        initial={{
          titleEn: ticket.titleEn,
          description: ticket.description,
          helpType: ticket.helpType,
          accountId: ticket.accountId,
          appId: ticket.appId,
          moduleId: ticket.moduleId,
          raisedByContactId: ticket.raisedByContactId,
        }}
        onSubmit={editTicket}
        helpId={helpId}
        canAttach={canEdit}
      />

      {archiveDialog}
    </RecordScreen>
  )
}
