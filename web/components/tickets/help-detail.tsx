"use client"

// Ticket detail — one ticket, ONE PAGE, NO TABS (V1, client ruling 17 Sep
// 2026: "I want to see, on one single screen with no tabs, the content of
// tickets: the stages, the kind of conversation with the customer, related
// stories, work logs, stakeholders … We currently, in our legacy system,
// have it on one page, and it's very practical. We don't want to change
// that.") A status STEPPER (the hero control, `<TicketStages>`) sits above a
// two-column body (`TicketDetailBody`, ./ticket-detail-body.tsx): the
// conversation (library TicketThread) on the left, Related stories / Work
// logs / Stakeholders stacked on the right. Files moved to the ⋯ menu, as a
// slide-in; the ticket's history (the GENERIC record-activity feed) was
// never a tab — it is reached from the ink footer's Latest activity column,
// on the client's 2026-09-06 ruling, and web/components/records/activity-panel.tsx
// carries that ruling and the argument. Edit + every status move are gated
// PURELY by help:update. Replies echo instantly (optimistic) and reconcile
// with the server reply. Host-composed, like role-detail.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Badge } from "@shared/ui/components/badge/badge"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { toast } from "@shared/ui/components/sonner/sonner"
import { EdgePanel } from "@shared/ui/components/edge-panel/edge-panel"
import { TicketThread } from "@shared/ui/components/ticket-thread/ticket-thread"
import { TicketChips, ticketTitle } from "@shared/web/ticket-chips"
import { RecordRef } from "@shared/web/record-ref"

// The old library's thread exported this; the kit's thread is messages-only,
// so the app owns the word now: who can be @mentioned.
type TicketMember = { id: string; name: string }
import {
  TrayArrowUp,
  Archive,
  Translate,
  PencilSimple,
  CheckCircle,
  Paperclip,
} from "@shared/ui/foundations/icons"

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

import type {
  HelpMessage,
  HelpStakeholder,
  HelpStatus,
  HelpTicket,
  SelectableValue,
  Story,
  TeamMember,
  WorkLogSummary,
} from "@shared/types"
import { helpStatusDotTone, storyStatusDotTone } from "@shared/status-tones"
import { storyTypeIconName } from "@shared/story-types"
// A VALUE, not a type — it must not ride the `import type` block above.
import { ApiFailure, content, dataOps, tenancy } from "@/lib/api"
import {
  RecordActionsMenu,
  RecordScreen,
  type RecordAction,
} from "@/components/records/record-chrome"
import { useFollowNewest } from "@shared/web/follow-newest"
import { formatRelative } from "@shared/web/format"
import { staffNameFromSnapshot } from "@shared/staff-name"
import { assignableMembers } from "@/lib/members"
import { usePermissions } from "@/lib/perms"
import { mergePage, invalidate, primeCache, useCached, useCachedValue } from "@shared/web/store"
import { formatCount } from "@shared/web/format-count"
import { recordActivityKey, useRecordActivity } from "@/lib/use-record-activity"
import { useRecordCounts } from "@/lib/use-record-counts"
import { HelpAttachmentsPanel } from "@/components/tickets/help-attachments"
import { HelpFormDialog } from "@/components/tickets/help-form-dialog"
import { HelpStakeholders } from "@/components/tickets/help-stakeholders"
import { InAppLink } from "@/components/shell/in-app-link"
import { ticketTypeIconName } from "@shared/ticket-types"
import { Icon } from "@shared/web/screen-engine/icon"
import { ResolveDialog, type ResolveFormValues } from "@/components/tickets/resolve-dialog"
import { StoryFormDialog } from "@/components/work/story-form-dialog"
import { createStoryFrom, useStoryFormOptions } from "@/components/work/stories-screen"
import { sliceKey, STORY_STATUS_LABEL } from "@/components/work/work-panels"
import { invalidateFindsOf } from "@/components/records/paged-find"
import { TicketStages } from "@/components/tickets/ticket-stages"
import { WorkLogsPanel } from "@/components/work/work-logs-panel"
import { RecordTimerButton } from "@/components/shell/timer-bar"
import { ReplyComposer, useReplySend } from "@/components/tickets/reply-composer"
import { TranslateAction, useHumanTranslation } from "@/components/records/translate-human-text"
import { recordTimeSummaryKey, totalKey } from "@/lib/live-resources"
import { useLanguage } from "@shared/web/language"
import { ON_INVERSE_UNTIL_THE_KIT_RULES, RichText } from "@shared/web/rich-text-view"
import { richTextPlain } from "@shared/web/rich-text"
import { useConfirm } from "@shared/web/use-confirm"
import { TICKET_TYPE_GROUP } from "@shared/ticket-types"
import {
  TicketConversationPanel,
  TicketDetailBody,
  TicketSidePanel,
  TICKET_PANEL_ANCHOR,
  type TicketPanelName,
} from "@/components/tickets/ticket-detail-body"

/** WHAT A RETIRED `?tab=` VALUE NOW SCROLLS TO. `conversation`/`overview`
 * have no panel of their own to jump past (the head IS the top of the
 * page); `overview` resolves to Stakeholders, the panel its facts used to
 * sit under — the facts themselves are gone as of 17 Sep 2026 (see the note
 * beside the panel's own JSX, below, for which of them now render nowhere on
 * this page), but the SCROLL TARGET a stale link points at is still a real
 * panel on the page, so it still resolves rather than landing on nothing.
 * `files` is handled separately, above this table, because it opens the ⋯
 * menu's sheet rather than scrolling. */
const DEEP_LINK_TICKET_PANEL: Partial<Record<string, TicketPanelName>> = {
  conversation: "conversation",
  overview: "stakeholders",
  stories: "stories",
  time: "time",
  stakeholders: "stakeholders",
}

/** THE STATUS WORD FOR THE TITLE'S OWN CHIP — client ruling, 17 Sep 2026,
 * verbatim: "Add the status chip with the color after the ID on the title."
 * (Read beside R86, the SAME day's ruling: "the one that gets the chip with
 * the color is always the status.")
 *
 * SIX LITERAL WORDS, KEYED BY DATABASE VALUES — the identical shape
 * `ticket-stages.tsx`'s own retired `stageLabel` used and for the same
 * reason its comment gave: the app's other status map (`HELP_STATUS`,
 * web/components/deep-link/shape.tsx) is keyed by DATABASE words, so
 * `t(HELP_STATUS[s])` would look up keys the catalogue does not hold.
 *
 * NO NEW TRANSLATION DEBT — every one of these six sentences is already in
 * the catalogue: `ticket-stages.tsx` asks the identical `t("New")`,
 * `t("Triaged")`, `t("Scheduled")`, `t("In progress")`, `t("Ready")`,
 * `t("Resolved")` for its own rungs. R28 tracks the STRING, not the call
 * site, so a second position asking for a sentence that already exists adds
 * nothing to R44's ceiling — only R33's "every position sits inside a
 * `t(...)` call" applies here, and it does. */
function helpStatusLabel(status: HelpStatus, t: (s: string) => string): string {
  switch (status) {
    case "new":
      return t("New")
    case "triaged":
      return t("Triaged")
    case "scheduled":
      return t("Scheduled")
    case "in_progress":
      return t("In progress")
    case "ready":
      return t("Ready")
    case "resolved":
      return t("Resolved")
  }
}

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
  // (CACHING.md is cache-first) — but the by-id read never WAITS for the list
  // to say so. It used to be gated on `ticketsQ.data !== undefined`, which
  // means on a cold deep link to a ticket past the cursor the only read that
  // could find it did not even START until an unrelated list request came
  // back: two round trips in series for one record (round_trip_review,
  // 2026-09-10). `!inPage` alone is the same test on whatever the list
  // already has — true immediately on a cold render, since `inPage` is `null`
  // before `ticketsQ` has answered — so the two reads now run together, the
  // same shape knowledge-detail.tsx already uses. The `:one:` key is
  // registered in the live registry beside `help`, or a status change would
  // patch the list and leave this screen showing yesterday.
  const inPage = ticketsQ.data?.find((t) => t.id === helpId) ?? null
  const oneQ = useCached<HelpTicket | null>(!inPage ? `help:one:${helpId}` : null, () =>
    content.helpOne(helpId)
  )
  const ticket = inPage ?? oneQ.data ?? null

  const repliesQ = useCached<HelpMessage[]>(`help-thread:${helpId}`, () =>
    content.helpThread(helpId).then((r) => {
      // R16: the door's exact COUNT(*), never the (capped) list length. No
      // screen reads this back any more — the Conversation tab's own badge
      // went with the strip — but `total:help-thread:<id>` is still a live
      // key (web/lib/live-resources.ts), so it stays primed for R15 rather
      // than going stale the day something reads it again.
      primeCache(`total:help-thread:${helpId}`, r.total)
      return r.replies
    })
  )
  // THE SECONDARY HALF, ONCE THE RECORD IS IN HAND. Everything below this line
  // is a picker, a badge or a panel BESIDE the record rather than the record —
  // and until 7 Sep 2026 every one of them left the browser in front of it
  // (censused by web/test/cold-screen-hops.test.tsx: a ticket cost thirteen
  // requests before a person could read one sentence).
  //
  // `have` is the DETERMINISTIC gate shared/web/after-paint.ts asks callers to
  // prefer over its own scheduler — "a secondary panel that needs the record
  // anyway should key on the record being in hand … exact, needs no scheduler,
  // and cannot be flaky". Every read below is about THIS record or about the
  // form that edits it, so every one of them has that dependency already.
  const have = ticket !== null
  const membersQ = useCached<TeamMember[]>(have ? `members:${teamId}` : null, () =>
    tenancy.members().then((r) => r.members)
  )
  // The generic record feed (Law R5) + the exact server total its tab badges
  // (R8 for the place, R16 for the number — never the loaded page's length).
  const activity = useRecordActivity("help", have ? helpId : null)
  // THE BADGES, BEFORE THE CLICK — the work written down against this request,
  // and what is attached to it. One bounded read of both totals once the ticket
  // is readable; the rows behind each tab stay lazy (lib/use-record-counts).
  useRecordCounts("help", have ? helpId : null)
  const selectableQ = useCached<SelectableValue[]>(have ? `selectable:${teamId}` : null, () =>
    tenancy.selectable().then((r) => r.values)
  )
  const stakeholdersQ = useCached<HelpStakeholder[]>(have ? `help-stakeholders:${helpId}` : null, () =>
    content.helpStakeholders(helpId).then((r) => r.stakeholders)
  )

  const stakeholderBadge = formatCount(stakeholdersQ.data?.length)
  const { can } = usePermissions(teamId)
  const canEdit = can("help", "update") // single source — gates Edit, the stepper, and the thread's resolve
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
  // is `work:update` — the two rights those doors gate on, and neither of them is a
  // ticket right: answering a request and reading the team's timesheet are
  // different things a role may grant separately. A role without `work:read` sees
  // no tab at all rather than a tab that refuses.
  const canSeeTime = can("work", "read")
  const canEditTime = can("work", "update")
  // TOTAL HOURS, FOR THE WORK LOGS PANEL'S OWN TITLE (V1: "total hours in the
  // title"). Same cache key `<WorkLogsPanel>` reads internally
  // (`recordTimeSummaryKey`, R56 — one door, once, however many components
  // ask), so this costs nothing extra: the panel's own read and this one
  // dedupe to a single request.
  //
  // GATED ON `have`, LIKE EVERY OTHER SECONDARY PANEL BELOW THE RECORD
  // (membersQ, activity, selectableQ, stakeholdersQ, above) — the DETERMINISTIC
  // gate `shared/web/after-paint.ts` asks a caller to prefer over its own
  // scheduler: this panel needs the record anyway, so it keys on the record
  // being in hand rather than firing beside the record's own read and costing
  // the cold-path budget (`web/test/cold-screen-hops.test.tsx`,
  // `MAX_REQUESTS_BEFORE_FIRST_PAINT`) a request nobody is waiting on yet.
  const workSummaryQ = useCached<WorkLogSummary>(
    have && canSeeTime ? recordTimeSummaryKey("help", helpId) : null,
    () => content.workLogSummary({ targetTable: "help", targetId: helpId })
  )
  const workHoursLabel =
    workSummaryQ.data && workSummaryQ.data.totalSeconds > 0
      ? t("{hours}h", { hours: Math.round((workSummaryQ.data.totalSeconds / 3600) * 10) / 10 })
      : ""

  const [editing, setEditing] = React.useState(false)
  // THE FILES SHEET — B19's own pattern, one slide-in reached from the ⋯ menu
  // (`overflow` below), since Files left the tab strip with everything else.
  const [filesOpen, setFilesOpen] = React.useState(false)
  /* `storiesSheetOpen` STOOD HERE — the flag that opened the FULL
   * `<StoriesPanel>` behind a "Show all" link, because the on-page preview
   * was capped. CLIENT RULING, 17 Sep 2026, reading the deployed page back:
   * "Remove 'Show All' because you need to show them all." The preview is
   * uncapped now (`storiesPreviewQ`, below, rendered whole rather than
   * sliced) and there is no separate sheet left to open — the "New story"
   * action that lived inside that sheet (`<StoriesPanel>`'s own `onNew`)
   * moved to a plain button on the panel's own title row instead, still
   * opening the SAME `<StoryFormDialog>` below (`storyOpen`). */
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
  // THE WORK ANSWERING THIS REQUEST. One story may answer many tickets and one
  // ticket may need many stories (the owner's ruling), so this is a collection
  // on the record rather than a field on it. Its exact total titles the panel
  // (R16) — the same seam the old tab's badge read.
  const storiesTotal = useCachedValue<number | null>(totalKey("stories-ticket", helpId))
  // EVERY RELATED STORY, UNCAPPED. V1 shipped this "capped to the first N
  // with a 'Show all' link"; CLIENT RULING, 17 Sep 2026, reading the deployed
  // page back, verbatim: "In the section 'Related Stories' … Remove 'Show
  // All' because you need to show them all." So the cap and the sheet behind
  // "Show all" are both gone — the panel now renders the WHOLE of
  // `storiesPreviewQ.data`, below — but the READ is unchanged: this is still
  // the one bounded, PAGED read (R14) `<StoriesPanel>` itself would key its
  // own cache on (`sliceKey`/`totalKey` are the exact pair it primes), so
  // showing every row costs no second door call and no unbounded list — the
  // bound is the door's own page size, not a client-side slice on top of it.
  //
  // GATED ON `have`, THE SAME DETERMINISTIC GATE `workSummaryQ` USES ABOVE —
  // this panel needs the record anyway, so it costs nothing on the cold path
  // (`web/test/cold-screen-hops.test.tsx`) and everything once the record is
  // actually on screen.
  const storiesPreviewQ = useCached<Story[]>(have ? sliceKey("stories-ticket", helpId) : null, () =>
    content.stories({ ticketId: helpId, view: "all" }).then((r) => {
      primeCache(totalKey("stories-ticket", helpId), r.total)
      return r.stories
    })
  )
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

  // ?tab= STILL RESOLVES — IT JUST SCROLLS NOW. The strip this used to switch
  // is gone, so a link built while it existed (the rail, a bookmark, anyone
  // who typed `?tab=stories`) must still land somewhere real rather than on a
  // 404 of the mind. `conversation`/`overview` land on the head (nothing to
  // scroll past); `stories`/`time`/`stakeholders` scroll to that panel's own
  // anchor (`TICKET_PANEL_ANCHOR`, ticket-detail-body.tsx); `files` opens the
  // sheet the ⋯ menu now holds it behind, since there is no panel left to
  // scroll to. Read off `window.location.search` directly rather than a
  // prop threaded down from the shell — this screen owns no query-string
  // wiring of its own, and the shell's `?tab=` plumbing is for the SCREEN
  // it hosts choosing between collections (accounts' companies/contacts),
  // never for a record's own retired tab strip.
  //
  // A REF, NOT A DEPENDENCY ON `ticket`, because `ticket` gets a fresh
  // reference on every cache patch (an edit, a reply) and this must fire
  // ONCE — the moment the real panels exist in the DOM, not on every
  // re-render after that. It waits for `ticket` because the anchors this
  // scrolls to are inside the "ready" branch below; before that the screen
  // is still a skeleton and there is nothing to find.
  const deepLinkHandled = React.useRef(false)
  React.useEffect(() => {
    if (deepLinkHandled.current || !ticket || typeof window === "undefined") return
    const requested = new URLSearchParams(window.location.search).get("tab")
    if (!requested) return
    deepLinkHandled.current = true
    if (requested === "files") {
      setFilesOpen(true)
      return
    }
    const panel = DEEP_LINK_TICKET_PANEL[requested]
    if (!panel) return
    document.getElementById(TICKET_PANEL_ANCHOR[panel])?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }, [ticket])

  // A SUBTRACTION OF THE RETIRED KIND STOOD HERE — the last picker that could
  // still put a ticket INTO it, held shut for the client's ruling of 6 Sep 2026
  // ("keep the existing requirements … but do not display them in tickets").
  // THAT SUBTRACTION WENT ON 15 SEP 2026 with the kind it named: the vocabulary
  // is four words and every one of them may be picked (`shared/ticket-types.ts`
  // carries the owner's ruling). ONE kind still has a condition on it — Feedback
  // needs a Validation sprint running on the ticket's app — and that is decided
  // in the form dialog this list is handed to, against the app it knows about,
  // rather than here where there is no app in view.
  //
  // It still does not filter `active`, deliberately: that is a separate
  // question about the team's own vocabulary, and narrowing this dialog for a
  // reason nobody asked for is how a screen quietly loses an option.
  const helpTypeOptions = (selectableQ.data ?? [])
    .filter((v) => v.type === TICKET_TYPE_GROUP)
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

  // THE FIVE-SECOND HOLD, HELD BY THE SCREEN AND NOT BY THE COMPOSER. It USED
  // to live above the tab strip for exactly this reason: the strip unmounted
  // the panel it was not showing, so a hold owned by the composer would have
  // been flushed by a glance at Related stories. There is no strip left to
  // unmount anything — every panel this screen draws is mounted together now
  // (V1, 17 Sep 2026) — but the hold stays exactly where it was: the client's
  // ruling is that she can carry on reading the ticket while it counts, and a
  // hold scoped to the screen rather than to one panel is what makes that true
  // regardless of what a panel does or does not do to its own children. A
  // hook, so it sits above the three early returns below.
  const reply = useReplySend({ ticketId: helpId, onSend: sendReply })
  /* `run` WAS HERE — the shared shape for "do it, say plainly if it was
   * refused, re-prime the list cache and the record's own history", written for
   * THREE acts a person could still perform on a ticket by hand.
   *
   * Its last caller was the "They've confirmed it" button, and both went when
   * the client retired `awaiting_validation` on 7 Sep 2026 (shared/types.ts,
   * `HELP_STATUSES`). The two surviving acts on this screen — archiving and
   * answering — each carry their own handler below and always did, because each
   * does something `run` never modelled: archiving asks for a confirmation
   * first, and answering has to collect the words the door refuses without. */


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

  /** THE ORDINARY SEND. B0294/T3657, 16 Sep 2026, retired this function's other
   * half: it used to carry a second flag for "Send and close", called from a
   * button that sat right beside plain Send on this same composer row — "too
   * easy to hit by accident". That flag and the button that set it are both
   * gone; closing a ticket now happens only through the title's "Answer and
   * close", which opens `ResolveDialog` and calls `resolve()` below — a
   * separate, unhurried seam with its own words, not this five-second hold.
   * This function is left with exactly what its name says.
   *
   * It is called by `ReplyComposer` only when the hold reaches zero (or is cut
   * short by her leaving), never on the press — nothing here happens during the
   * five seconds. `leaving` rides through to `fetch` as `keepalive`, which is
   * what lets the send outlive a tab that is closing.
   *
   * It returns the words the settling toast should say, because only this
   * function knows what the door answered.
   *
   * IT THROWS ON A REFUSAL rather than swallowing it: the composer catches it,
   * says so, and puts her words back in the field. A reply lost to a 500 is the
   * one outcome worse than a slow one. */
  async function sendReply(body: string, leaving: boolean): Promise<string> {
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
  // EITHER READ FAILING IS A FAILURE TO LOAD — and until 2026-09-10 only the
  // LIST's was. The by-id read is the one that can find a ticket past the
  // cursor, so on a cold deep link it is often the ONLY read that could have
  // answered; when it failed, this branch did not fire, the loading gate below
  // let go (it carried `!oneQ.error`), and the screen said "That ticket no
  // longer exists." A dropped connection is not a deletion, and that sentence
  // is exactly the lie the comment below warns about, made one step later.
  // `meeting-detail.tsx` had the same two queries and no `oneQ` term at all,
  // so it hung on a skeleton for ever instead — two spellings of one bug, which
  // is why `web/test/detail-error-states.test.ts` now censuses the shape.
  // `!inPage` IS LOAD-BEARING, and the first draft of this guard did not have
  // it: `ticketsQ.error || oneQ.error` blanked a screen that was ALREADY
  // HOLDING the ticket, because the list had it and the by-id read had failed
  // for its own reasons. An error about a read you did not need is not an error
  // the person has. `story-born-on-a-ticket.test.tsx` caught it in the gate.
  // Try again drops BOTH keys: which one failed is not the person's business.
  if (ticketsQ.error || (!inPage && oneQ.error))
    return (
      <RecordScreen
        title={<Skeleton className="h-7 w-48" />}
        state="error"
        copy={{ errorTitle: t("Couldn't load the ticket.") }}
        errorAction={
          <Button
            variant="secondary"
            onClick={() => {
              invalidate(`help:${teamId}`)
              invalidate(`help:one:${helpId}`)
            }}
          >
            {t("Try again")}
          </Button>
        }
      />
    )
  // NOT WHILE THE BY-ID READ IS STILL GOING. "That ticket no longer exists" is a
  // claim, and a claim made before the only read that could disprove it has
  // answered is a lie that happens to be quick. This used to also wait on
  // `ticketsQ.data === undefined` — the list resolving — even once `oneQ` had
  // already answered, which is exactly the round trip the comment above this
  // block now avoids: waiting here for the list too would spend it back.
  if (!inPage && oneQ.data === undefined)
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

  /* `overviewItems`/`<OverviewList>` STOOD HERE — the fact rows below the
   * Stakeholders panel's own pills (Type, App, Raised by, Raised on, Title,
   * Title (English), Raised from, Screen recording, Resolved). CLIENT
   * RULING, 17 Sep 2026, reading the deployed V1 page back, verbatim: "Remove
   * all of this from stakeholders '… Type Issue App Kwapso System Raised by
   * Max Mustermann Raised on Sep 16, 2026 (1 days ago) Title Title (English)
   * Ticket and story titles Raised from Screen recording Resolved'." REMOVED,
   * not re-homed — read this note before assuming a fact moved somewhere.
   *
   *   · TYPE and APP still show, unchanged, as the header's own chips
   *     (`TicketChips`, above) — nothing lost.
   *   · RESOLVED still shows, when the door has a recorded span for it, as
   *     the "resolved" rung's own date on the stage ladder (`<TicketStages>`,
   *     `headerExtra` below) — the same underlying moment, a different seam.
   *   · RAISED BY, RAISED ON, RAISED FROM and the TITLE TRANSLATION (the
   *     ticket's OTHER title — titleDe when the head shows titleEn, or vice
   *     versa, whichever `ticketTitle` did not pick) NOW RENDER NOWHERE ON
   *     THIS PAGE. Flagged here rather than silently dropped so it is a
   *     decision the client makes, not one this screen made for her.
   *   · SCREEN RECORDING (the `screenRecordingLink` a person can attach to a
   *     request) also renders nowhere now — it was not named in her quote
   *     above, and it is worth saying anyway: it was the one row on this
   *     list with a real control (an "Open the recording" link), not only
   *     text, and it is now unreachable rather than merely unlabelled.
   */


  /* THE TAB STRIP IS GONE — CLIENT RULING, 17 SEP 2026, VERBATIM: "I want to
     see, on one single screen with no tabs, the content of tickets: the
     stages, the kind of conversation with the customer, related stories,
     work logs, stakeholders. We currently, in our legacy system, have it on
     one page, and it's very practical. We don't want to change that." And
     her pick, the decision page (https://claude.ai/artifact/34udsj1HpzcojN15Sq97tt):
     "For ticket 1 page, I choose to implement it v1."

     WHAT STOOD HERE was a six-tab `TabsView` config — Conversation, Overview,
     Related stories, Work logs, Files and links, Stakeholders — read by the
     `<TabsView>` this file no longer renders (`RECORD_TABS_SINGLE_PANEL`
     ["help-detail"], shared/rules/registry.ts, carries R2's own exemption
     for a bespoke detail with no strip). Every panel it named is still
     drawn; none of it was deleted, only re-homed:
       · Conversation  → `TicketConversationPanel`, below, in the body.
       · Overview      → folded into a fact list inside the Stakeholders
                          panel — she named five things, not six, and
                          Overview was never one of them. THAT FACT LIST WAS
                          ITSELF REMOVED ON 17 SEP 2026, reading the deployed
                          page back: see the note beside the Stakeholders
                          panel's own JSX, below, for which facts now render
                          nowhere on this page.
       · Related stories → every related story, uncapped, in the panel
                          itself (17 Sep 2026: "Remove 'Show All' because you
                          need to show them all" — see `storiesPreviewQ`'s
                          own comment, above).
       · Work logs     → `<WorkLogsPanel>`, unchanged, inside its own panel.
       · Files and links → B19's own pattern: the ⋯ menu (`overflow`,
                          below), opened as a sheet.
       · Stakeholders  → `<HelpStakeholders>`, unchanged, inside its own
                          panel, with the Overview facts under it.
     Activity was never a tab (retired 2026-09-06 · 2026-09-07) and is
     unaffected: it still opens from the footer's Latest activity eyebrow,
     through `activity` on `RecordScreen` below. */

  /* B0294/T3657 — "the close button needs to move to the top." CLOSING IS
   * `help:update`, the right `/help/resolve` itself gates on, and there is
   * nothing to close on a ticket already answered — so the control is not
   * drawn rather than drawn and refused. ONE EXPRESSION, read by the top
   * button below AND (until 16 Sep 2026) by the bottom composer's own
   * "Send and close" — now removed, so this is its only reader, but it keeps
   * the name because it is still the seam: whatever "closeable" means on this
   * screen is decided once, here. */
  const canClose = canEdit && ticket.status !== "resolved"

  /* THE ENABLE GATE. The client's ruling, 17 Sep 2026, verbatim: "reduce to
   * close and make it only available, but still visible at all times, only
   * when the latest answer is from our side." So `canClose` above still
   * decides whether the button is DRAWN (every open status, gated on the
   * right); this decides whether it is CLICKABLE.
   *
   * `newestReply` (above, by `useFollowNewest`) is the thread's own last
   * word, and `authorIsClient` is the door's answer to who wrote it — the
   * same R54 flag `replies` below reads to pick a bubble's side and a name.
   * No reply at all reads as the client having said the last word too: the
   * only thing on the thread so far is the request itself, and nothing has
   * been answered back yet. */
  const latestIsOurs = newestReply != null && newestReply.authorIsClient === false

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
    // EDIT LEFT THE MENU, 17 Sep 2026 — client ruling, reading the deployed
    // page: "The edit button: put it outside, just the pen." It is now the
    // standalone `PencilSimple` icon button in the title's own actions row
    // (`actions`, below), beside Close/the timer/the ⋯ trigger — never inside
    // it. Nothing else moved: Translate, Files and links and Archive/Restore
    // are still exactly where they were.
    // FILES AND LINKS — B19's own pattern, the ⋯ menu opening the panel as a
    // sheet, "the way other records do." Left the tab strip with everything
    // else the strip used to hold; unconditional, exactly as the tab was —
    // VIEWING is `help:read` (the right that put a reader on this screen at
    // all), and `HelpAttachmentsPanel`'s own `canEdit` is the narrower right
    // that gates attaching/removing, asked separately below.
    {
      key: "files",
      label: t("Files and links"),
      icon: <Paperclip className="size-3.5" />,
      onSelect: () => setFilesOpen(true),
    },
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
      {/* "THEY'VE CONFIRMED IT" WAS HERE (CHECKLIST 5.13, retired 7 Sep 2026).
          Staff pressed it for the answer that arrived by phone; the client
          pressed the same door in their own portal. It went with the
          `awaiting_validation` stage it moved a ticket out of — the client
          retired that stage, so nothing waits for a go-ahead any more and an
          extra goes into the queue the moment it is raised (shared/types.ts,
          `HELP_STATUSES`). The rule the old note stated still governs the two
          buttons below it: a control that can only be refused should not be a
          control. */}
      {/* ANSWER IT AND TELL THEM. B0294/T3657, 16 Sep 2026: "Send and close
          button too easy to hit by accident … the close button needs to move
          to the top." It used to be offered from READY onward only — the
          bottom composer's own "Send and close" covered every earlier status
          instead, sitting right beside plain Send where a stray click could
          reach it. That second control is gone (see `ReplyComposer` below);
          this is now the ONLY way to close a ticket, so it is offered at
          every status `canClose` allows — the same expression the bottom
          button used to gate on, moved up rather than duplicated. The panel
          is where the words are written, because the door refuses without
          them (5.6). */}
      {/* CLOSE. Client ruling, 17 Sep 2026, verbatim: "reduce to close and
          make it only available, but still visible at all times, only when
          the latest answer is from our side. Make it mango. And put a more
          appropriate icon for closing." Three changes off the same control:
          the label shortens from "Answer and close" to "Close" (the words
          in the panel behind it, unchanged, are still what the door
          requires — 5.6); the button is disabled rather than withheld when
          `latestIsOurs` (above) says the client wrote the last word, so it
          stays where the eye expects it instead of shifting the row; and the
          icon is `CheckCircle`, the kit's own "resolved" mark — not `X`,
          which reads as dismiss rather than done.

          MANGO, NOT BLACK, per the SAME client ruling — a reversal of the
          16 Sep 2026 one that first put this button here in black. That
          ruling read "only mango buttons on the title level" as excluding
          this control because, on the PAGE, it sits under the tab strip, in
          the panel body. It does not: this whole block is the `actions`
          variable, handed whole to `RecordScreen`'s own `actions` prop below
          — R84's own title component, by name — so on the SOURCE, which is
          what the census reads, it was always inside the title. `variant`
          left off is `Button`'s own default, which is mango
          (`web/test/mango-title-only.test.ts`, "omitted"). */}
      {canClose && (
        <Button disabled={statusBusy || !latestIsOurs} onClick={() => setResolving(true)} className="shrink-0 gap-1">
          <CheckCircle className="size-3.5" />
          {t("Close")}
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
      {/* EDIT, STANDALONE — client ruling, 17 Sep 2026, verbatim: "The edit
          button: put it outside, just the pen." It left the ⋯ menu (see
          `overflow`'s own comment above) for an icon-only button right here,
          in the title's actions row, opening the same edit sheet the menu
          item used to. `PencilSimple` is the kit's own edit glyph
          (CLAUDE.md's action-icon mapping); `aria-label` carries the word a
          screen reader needs since an icon-only control draws no text of its
          own.

          NOT MANGO. `canClose` above already claims the one primary/mango
          slot this title row is allowed (R84, B1 — "at most one primary and
          one secondary"); `variant="inverse"` is the kit's own black fill,
          the same one every other title-row control that is not the primary
          action wears. */}
      {canEdit && (
        <Button
          variant="inverse"
          size="icon"
          onClick={() => setEditing(true)}
          aria-label={t("Edit")}
          className="shrink-0"
        >
          <PencilSimple aria-hidden="true" focusable="false" />
        </Button>
      )}
      <RecordActionsMenu actions={overflow} />
    </>
  )

  return (
    <RecordScreen
      // NO MARK — client ruling, 2026-09-07, "for type, kill the emojis. this
      // is legacy. in current system we use colors." The square the header band
      // keeps for a glyph (G3) held the team's own emoji for this ticket's
      // kind, read off the Dropdown values screen. The kind is drawn by
      // `chips` below instead, as the pill every other ticket surface in the
      // app draws (`ticketTypeIconName`, @shared/ticket-types — an icon, not a
      // colour, since the client's 17 Sep 2026 ruling: "the one that gets the
      // chip with the color is always the status … for tickets, we need to
      // find icons for the ticket type"), so nothing about this header
      // stopped saying what kind of ticket it is.
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
          // THE STATUS CHIP, AFTER THE ID — client ruling, 17 Sep 2026:
          // "Add the status chip with the color after the ID on the title."
          // `Badge variant="status" dot={helpStatusDotTone(ticket.status)}`
          // is the app's one status-chip shape (R86, `status-owns-the-chip`)
          // — the colour lives in the dot, never the fill, and this is the
          // only categorical field on this row that may be coloured at all.
          statusDot={
            <Badge variant="status" dot={helpStatusDotTone(ticket.status)}>
              {helpStatusLabel(ticket.status, t)}
            </Badge>
          }
          // THE SAME ICON THE TYPE PICKER DRAWS, from the same map — see
          // `shared/web/ticket-chips.tsx`'s header for why this is a prop
          // rather than an import.
          typeDot={
            ticketTypeIconName(ticket.helpType) ? (
              <Icon
                name={ticketTypeIconName(ticket.helpType)!}
                className="text-muted-foreground size-3.5 shrink-0"
              />
            ) : undefined
          }
          appHref={ticket.appId ? `${host.base}/apps/${ticket.appId}` : undefined}
          AppLink={InAppLink}
        />
      }
      // B0302/T3661 — THE SAME TITLE SEAM THE COLLECTION ROW USES
      // (`ticketTitle`, shared/web/ticket-chips.tsx, fixed there 6 Sep 2026):
      // titleEn, then titleDe, and the description only as the last resort —
      // a ticket raised through this app almost always HAS a title, and this
      // head was showing the body underneath it instead. The description is
      // rich text and a TITLE is one line, so that fallback branch alone still
      // flattens the markup; translated FIRST, then flattened, exactly as
      // before — a title has to say what the reader just chose, on the one
      // branch that is theirs to read in their own language. `titleEn`/
      // `titleDe` are the ticket's own fixed words and are never run through
      // the reader's toggle.
      title={ticketTitle(ticket, translation.of)}
      // CLIENT RULING, 2026-08-31, VERBATIM: "what is this 3rd component in
      // the title under the chips? kill everywhere. chips is the last
      // component of headers!" Overrides the D5 trim above, which had kept
      // `raisedByContactName` here reasoning it wasn't shown anywhere else —
      // that reasoning no longer matters (the client's ruling drops the
      // information regardless of duplication). "Raised by" WAS also a row
      // in the Stakeholders panel's own fact list at the time this comment
      // was written; that fact list was itself removed on 17 Sep 2026 (see
      // the note beside the panel's own JSX, below), so "Raised by" is now
      // absent from BOTH places rather than merely not duplicated —
      // deliberately, on the client's own ruling, not a regression this
      // comment failed to notice. `RecordChrome`'s `meta` slot
      // (record-chrome.tsx's `status` prop, confirmed via the kit's own
      // `data-record-region="header"` block) renders directly under the
      // chips row, which is exactly the region the ruling forbids — so
      // `status` is dropped rather than fed, on every record screen, not
      // only here.
      //
      // `headerExtra`'s stepper WAS dropped for the same reason, from
      // 2026-08-31 to 2026-09-17: it maps to `RecordChrome`'s `hero` prop,
      // the region directly under the header block that carries the chips —
      // above the tab strip that stood here that day — reading as more
      // content under the pills, which was the ruling's own complaint. THE
      // CLIENT HAS SINCE NAMED THIS EXACT REGION FOR THE STAGE LADDER
      // SPECIFICALLY (17 Sep 2026, "put the status progress checkpoints on
      // top of the tabs") — see `headerExtra`'s own comment below for the
      // ruling and why it stands beside this one rather than overriding it:
      // this paragraph is still why NOTHING ELSE goes in `hero` on this
      // screen, tab strip or no tab strip (the strip itself went the same
      // day, in the change this file's header now describes).
      actions={actions}
      /* THE LADDER, ABOVE THE TABS — CLIENT RULING, 17 SEP 2026, VERBATIM:
         "In ticket detail, put the status progress checkpoints on top of the
         tabs. I already told you this." Below the head, full width, on every
         tab — which is exactly `RecordScreen`'s `headerExtra` slot
         (record-chrome.tsx: "Anything the module wants under the identity
         row"), forwarded straight into the kit's own `hero` region
         (`RecordChrome`'s chapter-23 "stage hero, above the strip" —
         `data-record-region="hero"`, a sibling rendered by `RecordDetail`
         BEFORE its tab strip, never inside `children`/`panel`). The slot
         already existed; nothing in record-chrome.tsx changed.

         THIS REVERSES THE 2026-09-09 PLACEMENT, NOT THE 2026-08-31 RULING IT
         WAS READING. `ticket-stages.tsx`'s own header (still there, kept for
         the history) explains why the ladder was drawn inside the
         Conversation tab instead: this region was read as forbidden by "what
         is this 3rd component in the title under the chips? kill everywhere"
         (2026-08-31) — a ruling about an unwanted THIRD element crowding the
         chips row. That reading cost three repeated asks ("i still do not see
         the ticket status rail!!") because the tab placement answered "is it
         on the ticket" and not "is it on top of the tabs, always visible" —
         her 2026-09-06 commission's own words. The new ruling names the exact
         region she meant, so it stands.

         BARE ON THE PAGE GROUND, BY A LATER, MORE SPECIFIC RULING — CLIENT
         REFINEMENT, SAME DAY: "In Tasks, the Today's Task Progress view
         should have no container behind it, and this is exactly the
         position for reference that I want the ticket progress to be." A
         first pass here wrapped `TicketStages` in `bg-card`, reasoning from
         R67 (`sections-stand-on-paper`) that a titled section may not stand
         on this deliberately transparent head band undressed — right as a
         DEFAULT, and overridden for this one control by her own named
         reference. `TicketStages` draws no fill of its own now; the
         exemption is filed where R67 keeps its debts,
         `UNCONTAINED_SECTION_OK` in shared/rules/registry.ts, in her words,
         the same shape the Tasks progress line's own entry uses. */
      headerExtra={<TicketStages ticketId={helpId} status={ticket.status} />}
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
      // STILL NO `activityHead` — AND THE STAGE LADDER IS STILL NOT IN THE
      // RAIL, for the same reason as always: a component you open a drawer to
      // find cannot answer "I want to have visibility of all the steps"
      // (2026-09-06). It moved twice since (the slide-in, then the
      // Conversation tab, this file's own history) and is now on `headerExtra`
      // above — see that prop's own comment for the 17 Sep 2026 ruling that
      // put it there.
      //
      // AND IT IS NOT ALSO LEFT HERE. One fact drawn in two places is how the
      // two drift, and the rail is not losing the history: every status move is
      // already a row in the feed the rail opens, in prose, one sentence each
      // ("Alaap set T-0412 to in progress"), which is precisely the "closed on
      // x, reopen on y, closed again on z" the "keep it in activity" ruling was
      // about. That ruling is satisfied by the feed, not by a second copy of
      // the ladder above it.
      onAddNote={can("help", "create") ? activity.addNote : undefined}
      notePlaceholder={t("Add a note")}
    >
      <TicketDetailBody
        conversation={
          <TicketConversationPanel
            thread={
              <>
                {/* READ IT IN YOUR OWN LANGUAGE — above the conversation,
                    because the conversation is what it acts on. Inline rather
                    than in the three-dot menu: this is a thing somebody
                    presses while reading and presses back a moment later, and
                    it must not be hidden behind a click for a person who
                    cannot read the screen. It scrolls WITH the thread now —
                    there is no separate tab panel above it any more, only the
                    card the thread itself stands on. */}
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
                     paper plane, alone now (B0294/T3657 removed the bottom
                     "Send and close" — see `ReplyComposer`) — and
                     `TicketThread` holds exactly one `<button type="submit">`
                     with one `sendLabel`, with no slot beside it. The kit is a
                     pinned dependency (a hand-edit under `shared/ui/` turns
                     the build red), so the app draws its own composer below,
                     out of the kit's own Button and the kit's own glyph, in
                     the same pill. The thread itself — the bubbles, the
                     sides, the receipts — is still entirely the kit's. */
                  composer={false}
                />
              </>
            }
            composer={<ReplyComposer send={reply} answered={ticket.status === "resolved"} />}
          />
        }
        stories={
          // EVERY ROW, NO "Show all" — client ruling, 17 Sep 2026, verbatim:
          // "In the section 'Related Stories' … Remove 'Show All' because
          // you need to show them all." No `action` slot any more — there is
          // nothing left behind a link to open. Writing a NEW story against
          // this ticket still has its own door (`storyOpen`/
          // `<StoryFormDialog>`, below); it used to live inside the sheet
          // "Show all" opened (`<StoriesPanel>`'s own `onNew`) and now sits
          // as a plain button on this panel's title row instead.
          <TicketSidePanel
            title={t("Related stories")}
            count={formatCount(storiesTotal)}
            action={
              canWriteWork ? (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto shrink-0 p-0 text-xs"
                  onClick={() => setStoryOpen(true)}
                >
                  {t("New story")}
                </Button>
              ) : undefined
            }
          >
            {storiesPreviewQ.data === undefined ? (
              <Skeleton variant="list" lines={2} />
            ) : storiesPreviewQ.data.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t("No work written down against this ticket yet.")}
              </p>
            ) : (
              <ul className="flex min-w-0 flex-col gap-2">
                {storiesPreviewQ.data.map((s) => {
                  // THE STORY TYPE, AS A CHIP WITH ITS ICON (K26) — the same
                  // closed, five-entry glyph map every other story surface
                  // reads (`storyTypeIconName`, @shared/story-types), never a
                  // colour: R86 reserves the one coloured chip for STATUS.
                  const typeIconName = storyTypeIconName(s.storyType)
                  return (
                    <li key={s.id} className="flex min-w-0 flex-wrap items-center gap-2">
                      <RecordRef value={s.ref} />
                      <InAppLink
                        href={`${host.base}/stories/${s.id}`}
                        className="min-w-0 flex-1 basis-[12rem] truncate text-sm"
                      >
                        {s.title}
                      </InAppLink>
                      <Badge variant="secondary" size="pill" className="shrink-0">
                        {typeIconName ? (
                          <Icon name={typeIconName} className="size-3.5 shrink-0" />
                        ) : null}
                        {s.storyType ?? "—"}
                      </Badge>
                      {/* THE STATUS, AS THE ONE COLOURED CHIP (R86) — a dot,
                          never a fill: `variant="status" dot={…}` is the
                          app's one status-chip shape. */}
                      <Badge variant="status" dot={storyStatusDotTone(s.status)} className="shrink-0">
                        {t(STORY_STATUS_LABEL[s.status])}
                      </Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </TicketSidePanel>
        }
        time={
          // WORK LOGS, wherever time can be tracked (CHECKLIST 6.8) — gated on
          // `work:read`, the right the door itself gates on, exactly as the
          // tab was: a role without it sees no panel at all rather than one
          // that refuses.
          canSeeTime ? (
            <TicketSidePanel title={t("Work logs")} count={workHoursLabel}>
              <WorkLogsPanel
                targetTable="help"
                targetId={helpId}
                recordLabel={[ticket.ref, richTextPlain(ticket.description)].filter(Boolean).join(" · ")}
                canEdit={canEditTime}
                canLog={canLogTime}
                onActivityChanged={() => invalidate(recordActivityKey("help", helpId))}
              />
            </TicketSidePanel>
          ) : null
        }
        stakeholders={
          // FACES + NAMES ONLY — client ruling, 17 Sep 2026, reading the
          // deployed V1 page back (help-stakeholders.tsx's own header carries
          // the verbatim quote). The picker moved into the edit sheet
          // (`<HelpFormDialog>`'s own `stakeholders`/`loopMembers`/
          // `onAddStakeholder` props, below); the fact list that used to sit
          // under the pills (`overviewItems`, above) is REMOVED, not
          // re-homed — see that comment's own header for which of its facts
          // now render nowhere else on this page.
          <TicketSidePanel title={t("Stakeholders")} count={stakeholderBadge}>
            <HelpStakeholders stakeholders={stakeholdersQ.data ?? []} />
          </TicketSidePanel>
        }
      />

      {/* THE FULL RELATED-STORIES SLIDE-IN, BEHIND "Show all", STOOD HERE —
          `<StoriesPanel>`'s own EdgePanel. CLIENT RULING, 17 Sep 2026: "Remove
          'Show All' because you need to show them all." The panel on the page
          now renders every row itself (`stories`, above), so there is no
          second, fuller list behind a click any more — and "New story" moved
          onto that panel's own title row, still opening the identical
          `<StoryFormDialog>` below (`storyOpen`). */}

      {/* FILES AND LINKS, BEHIND THE ⋯ MENU — B19's own pattern, "the way
          other records do": a sheet, not a tab. `help:EDIT` since the door
          tightened (e36b254) — read kept the button visible and every press
          a 403. */}
      <EdgePanel
        open={filesOpen}
        onClose={() => setFilesOpen(false)}
        title={t("Files and links")}
        closeLabel={t("Close")}
      >
        <HelpAttachmentsPanel ticketId={helpId} canEdit={can("help", "update")} />
      </EdgePanel>

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
        categories={options.categories}
        draftKey={`story:add:ticket:${helpId}`}
        defaultAssigneeId={myUserId ?? ""}
        onSubmit={async (v) => {
          // The id goes back so the dialog can hang the picked files on it —
          // see the note at the sprint's copy of this call. Discarding it drops
          // the file silently.
          const madeId = await createStoryFrom(teamId, { ...v, ticketId: helpId }, t)
          invalidate(sliceKey("stories-ticket", helpId))
          // T3654 — the resting key alone is not what this panel reads from;
          // see invalidateFindsOf's own header (paged-find.tsx).
          invalidateFindsOf(sliceKey("stories-ticket", helpId))
          // T3652 — the story is also filed against whichever app the form's
          // own (editable, since there is no `fixedApp` here) App field named.
          // Nothing else in this dialog's cache touches that app's own Stories
          // tab, so a story raised from here sat correctly in the door and
          // never patched the one screen a person would check it against.
          if (v.appId) {
            invalidate(sliceKey("stories-app", v.appId))
            invalidateFindsOf(sliceKey("stories-app", v.appId)) // T3654
          }
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
        // WHO TO KEEP IN THE LOOP — moved here from the page's own
        // Stakeholders panel (client ruling, 17 Sep 2026; see
        // `help-stakeholders.tsx`'s own header and `loopField`'s comment in
        // help-form-dialog.tsx for the quote and the R81 reasoning). Same
        // data, same door (`addStakeholder`), the page never called it
        // through this form's own `onSubmit`.
        stakeholders={stakeholdersQ.data ?? []}
        loopMembers={assignableMembers(membersQ.data)}
        canAddToLoop={can("help", "read")}
        onAddStakeholder={addStakeholder}
      />

      {archiveDialog}
    </RecordScreen>
  )
}
