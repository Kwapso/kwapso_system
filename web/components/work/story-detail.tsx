"use client"

// STORY DETAIL — one piece of work at /stories/<id>, ONE PAGE, NO TABS.
// Aurora's design review, 21 Sep 2026, over
// /private/tmp/.../story-detail-design.html: "a story is what we do, built
// the way the ticket already is" — the ticket's own one-page shape
// (`ticket-detail-body.tsx`, client ruling 17 Sep 2026: "I want to see, on
// one single screen with no tabs..."), mirrored here rather than re-decided.
// Her two verbatim rulings this round: "call it build notes" (the third
// left-column section — Detail, Acceptance criteria, Build notes — is named
// exactly that, never "Solution", the design mockup's own recommended word)
// and "yes, canont be marked as don if thats not filled in, its required"
// (Done refuses a story with empty build notes; see the head action below
// and `refuseUndocumented`, workers/content/src/lib/stories.ts, the door's
// own copy of the same rule this button only mirrors).
//
// THE SHAPE: `RecordDetailBody` (`@/components/records/record-detail-body`,
// extracted FROM `ticket-detail-body.tsx` for exactly this page — that
// file's own header carries the whole R89 account this page inherits by
// construction rather than by copying nine rounds of live-injection proof a
// second time). Left column, in order: Detail, Acceptance criteria, Build
// notes. Right column, in order: Assigned to (`AssignedToCard`,
// `help-stakeholders.tsx` — the ticket's own card, reused whole, not
// reimplemented: "the story gets the same card"), Related tickets, Related
// stories, Phase and wave, Effort, Metrics. No Stakeholders panel — a story
// has none. The dark band (`RecordFooterBand`) is last, exactly as the
// ticket mounts it.
//
// Host-composed: the head actions (timer, edit, Ready for review, Done) are
// controls no engine block draws.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { toast } from "@shared/ui/components/sonner/sonner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/components/tooltip/tooltip"
import { RecordRef } from "@shared/web/record-ref"
import { orderChips } from "@shared/web/chip-order"
import { Check, CheckSquare, PencilSimple } from "@shared/ui/foundations/icons"

import { StoryFormDialog, type StoryFormValues } from "@/components/work/story-form-dialog"
import { ReviewDialog, type ReviewFormValues } from "@/components/work/review-dialog"
import { storyTypeChip, useStoryFormOptions } from "@/components/work/stories-screen"
import { storyStatusDotTone } from "@shared/status-tones"
import { storyStatusWord } from "@shared/story-status-word"
import { WorkLogsPanel } from "@/components/work/work-logs-panel"
import { StoryBuildNotesSheet } from "@/components/work/story-build-notes-sheet"
import { AssignedToCard } from "@/components/tickets/help-stakeholders"
import { RecordTimerButton, useRecordTimerAction } from "@/components/shell/timer-bar"
import { TranslateAction, useHumanTranslation } from "@/components/records/translate-human-text"
import { ApiFailure, content as contentApi, tenancy } from "@/lib/api"
import {
  RecordActionsMenu,
  RecordChipLink,
  RecordFooterBand,
  RecordScreen,
  type RecordAction,
} from "@/components/records/record-chrome"
import { RecordDetailBody } from "@/components/records/record-detail-body"
import { TicketSidePanel } from "@/components/tickets/ticket-detail-body"
import { AddButton, EmptyGatedPanel } from "@/components/deep-link/screen-bits"
import { EditPenButton } from "@shared/web/edit-pen-button"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import { HeadActionsFoldMenu, HEAD_ACTIONS_ROW_CLASS, type HeadActionItem } from "@shared/web/head-actions"
import { formatCount } from "@shared/web/format-count"
import { assignableMembers } from "@/lib/members"
import { sliceKey } from "@/components/work/work-panels"
import { ticketStatusCell } from "@/components/deep-link/shape"
import { ticketTitle } from "@shared/web/ticket-chips"
import { storyAttachmentsKey } from "@/lib/live-resources"
import { hasPreview, AttachmentPreview } from "@shared/web/attachment-preview"
import { usePermissions } from "@/lib/perms"
import { useRecordActivity } from "@/lib/use-record-activity"
import { useRecordCounts } from "@/lib/use-record-counts"
import type { HelpTicket, Story, StoryAttachment, StoryMetrics } from "@shared/types"
import { invalidate, useCached } from "@shared/web/store"
import { useLanguage } from "@shared/web/language"
import { RichText } from "@shared/web/rich-text-view"
import { useSessionUserId } from "@/lib/use-active-team"

/** ONE FRIENDLY STRING FOR A SECONDS COUNT — "3.5h", "0h". `WorkLogsPanel`'s
 * own Numbers stat draws the identical rounding (`round(seconds/3600*10)/10`),
 * kept local rather than shared: two call sites is not yet a seam. */
function hoursLabel(seconds: number): string {
  const hours = Math.round((seconds / 3600) * 10) / 10
  return `${hours}h`
}

/** CYCLE TIME, AS A SENTENCE A PERSON READS AT A GLANCE — "2d 3h", "6h",
 * never a bare decimal. Days first because the design mockup itself reads
 * that way ("2d 3h, first work log to Done"), and a story's own cycle is
 * ordinarily measured in days, not fractions of an hour. */
function cycleTimeLabel(seconds: number): string {
  const totalHours = Math.round(seconds / 3600)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  return `${hours}h`
}

export function StoryDetailScreen({
  teamId,
  storyId,
  basePath,
}: {
  teamId: string
  storyId: string
  /** the stories list in the URL form we arrived through */
  basePath: string
}) {
  const { t } = useLanguage()
  const myUserId = useSessionUserId()
  // The backlog is PAGED, so a story reached by a deep link may sit past page
  // one — it is fetched by id and kept in its own cache key, exactly as the
  // knowledge base does for a source past its first page.
  const storyQ = useCached<Story | null>(`story:one:${storyId}`, () => contentApi.storyOne(storyId))
  const activity = useRecordActivity("stories", storyId)
  // The exact number of work-log entries on THIS story, for the Effort
  // panel's own count (R16), fetched when the STORY opens.
  useRecordCounts("stories", storyId)

  const { can } = usePermissions(teamId)
  const canEdit = can("work", "update")
  const canLogTime = can("work", "create")
  const timerAction = useRecordTimerAction({
    teamId,
    targetTable: "stories",
    targetId: storyId,
    canLog: canLogTime,
    disabled: storyQ.data?.status === "done",
  })

  const [editOpen, setEditOpen] = React.useState(false)
  const [reviewOpen, setReviewOpen] = React.useState(false)
  const [buildNotesOpen, setBuildNotesOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  // R88 — THE EFFORT PANEL'S OWN TITLE ROW, drawn by `EmptyGatedPanel`
  // outside `WorkLogsPanel` itself (that component's own doc says why), the
  // identical `workLogAddRef`/`workLogsEmpty` pair `help-detail.tsx` already
  // wires for the ticket page.
  const workLogAddRef = React.useRef<(() => void) | null>(null)
  const [workLogsEmpty, setWorkLogsEmpty] = React.useState(false)
  const options = useStoryFormOptions(teamId)
  // NEST, DON'T REPLACE — the identical note ticket-detail-body.tsx and this
  // file's own earlier version both carry: a related record lands INSIDE
  // this one's own address, so the trail stays in the URL.
  const host = { base: `${basePath}/${storyId}` }

  const story = storyQ.data ?? null
  const have = story !== null

  // STAFF FACES, FOR THE ASSIGNED TO CARD'S OWN SELECT — agency only
  // (`web/lib/members.ts`), the exact seam the ticket's own card reads.
  const membersQ = useCached(have ? `members:${teamId}` : null, () => tenancy.members().then((r) => r.members))

  // THE TICKET THIS STORY WAS BORN ON — the same by-id cache key
  // `help-detail.tsx` itself reads (`help:one:<id>`), so the two pages never
  // hold two different copies of one ticket.
  const ticketId = story?.ticketId ?? null
  const ticketQ = useCached<HelpTicket | null>(ticketId ? `help:one:${ticketId}` : null, () =>
    contentApi.helpOne(ticketId as string)
  )

  // SIBLING STORIES ON THE SAME TICKET — the identical cache key
  // `help-detail.tsx`'s own Related stories panel already reads
  // (`sliceKey("stories-ticket", <ticketId>)`), so opening a story from the
  // ticket page and opening its sibling from here share one list.
  const siblingStoriesQ = useCached<Story[]>(ticketId ? sliceKey("stories-ticket", ticketId) : null, () =>
    contentApi.stories({ ticketId: ticketId as string, view: "all" }).then((r) => r.stories)
  )
  const relatedStories = (siblingStoriesQ.data ?? []).filter((s) => s.id !== storyId)

  // THE PHASE'S OWN WAVE — a story already carries its phase's name
  // (`sprintName`) and dates; the WAVE it sits inside is one field further,
  // read off the phase record itself.
  const sprintId = story?.sprintId ?? null
  const sprintQ = useCached(sprintId ? `sprint:one:${sprintId}` : null, () => contentApi.sprintOne(sprintId as string))

  // THE THREE METRICS FIGURES — `getStoryMetrics`
  // (workers/content/src/lib/stories.ts), a door of its own rather than a
  // column on the story read (that function's own doc says why). Refreshed
  // alongside everything else `refresh()` re-reads.
  const metricsQ = useCached<StoryMetrics>(have ? `story:metrics:${storyId}` : null, () =>
    contentApi.storyMetrics(storyId)
  )

  // THE STORY'S OWN IMAGES — the same `story_attachments` door the Build
  // notes sheet's own picker writes through (`story-build-notes-sheet.tsx`'s
  // header says why it is this table and not a second one), read here so
  // the rendered panel can show whichever of them are pictures inline,
  // under the prose.
  const attachmentsQ = useCached<StoryAttachment[]>(have ? storyAttachmentsKey(storyId) : null, () =>
    contentApi.storyAttachments(storyId).then((r) => r.attachments)
  )
  const buildNotesImages = (attachmentsQ.data ?? []).filter(
    (a) => a.kind === "file" && hasPreview("file", a.contentType)
  )

  const refresh = React.useCallback(() => {
    invalidate(`story:one:${storyId}`)
    invalidate(`stories:${teamId}`)
    invalidate(`activity:record:stories:${storyId}`)
    invalidate(`story:metrics:${storyId}`)
  }, [storyId, teamId])

  // READ THIS STORY IN YOUR OWN LANGUAGE, if you ask — every human-typed
  // field goes in one array, buildNotes included now, so one press is one
  // call. A hook, so it sits above the three early returns below.
  const translation = useHumanTranslation(teamId, [
    story?.title,
    story?.detail,
    story?.acceptanceCriteria,
    story?.buildNotes,
    story?.reviewNote,
    story?.closingNote,
  ])

  /** Run a write, say plainly if it was refused, and re-read. */
  async function run(what: () => Promise<unknown>, done: string, fallback: string) {
    setBusy(true)
    try {
      await what()
      refresh()
      toast.success(done)
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : fallback)
    } finally {
      setBusy(false)
    }
  }

  async function save(values: StoryFormValues) {
    await contentApi.updateStory({
      id: storyId,
      title: values.title,
      storyType: values.storyType,
      category: values.category,
      detail: values.detail || undefined,
      sprintId: values.sprintId || undefined,
      appId: values.appId || undefined,
      ticketId: values.ticketId || undefined,
      assigneeId: values.assigneeId || undefined,
      processIds: values.processIds,
      changesNoStep: values.changesNoStep,
      acceptanceCriteria: values.acceptanceCriteria || undefined,
      moscow: values.moscow || undefined,
      contributesToGoal: values.contributesToGoal,
      // THE FORM NEVER TOUCHES buildNotes — its own sheet does — so it is
      // spread from the CURRENT record here, the same "replace every field,
      // spread the one you did not just change" shape the build notes sheet
      // itself takes, in the other direction.
      buildNotes: story?.buildNotes || undefined,
    })
    refresh()
    toast.success(t("Story updated."))
  }

  /** THE ASSIGNED TO CARD'S OWN DOOR — spreads the story's current shape
   * (the update door replaces every field it reads) and overrides only the
   * assignee. `null` clears it back to inherited: `updateStory`'s own
   * `optionalText` already treats a missing and a null `assigneeId`
   * identically (unlike the ticket door, which needs a separate raw-wire
   * check for exactly this — see `help-stakeholders.tsx`'s own note), so no
   * second seam is needed here. */
  async function changeAssignee(newAssigneeId: string | null): Promise<void> {
    if (!story) return
    try {
      await contentApi.updateStory({
        ...story,
        detail: story.detail || undefined,
        ticketId: story.ticketId || undefined,
        sprintId: story.sprintId || undefined,
        appId: story.appId || undefined,
        processId: story.processId || undefined,
        stepKey: story.stepKey || undefined,
        reviewerId: story.reviewerId || undefined,
        startsOn: story.startsOn || undefined,
        dueOn: story.dueOn || undefined,
        accountId: story.accountId || undefined,
        storyType: story.storyType || "",
        acceptanceCriteria: story.acceptanceCriteria || undefined,
        buildNotes: story.buildNotes || undefined,
        moscow: story.moscow || undefined,
        contributesToGoal: story.contributesToGoal,
        assigneeId: newAssigneeId ?? undefined,
      })
      refresh()
      toast.success(t("Story updated."))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't change that story."))
    }
  }

  /** READY FOR REVIEW (CHECKLIST 6.9) — refused until every timer on this
   * story is stopped and an explanation is written. */
  async function sendToReview(values: ReviewFormValues) {
    await contentApi.setStoryStatus(storyId, "in_review", undefined, {
      reviewNote: values.reviewNote,
      reviewFileUrl: values.reviewFileUrl || undefined,
      reviewFileName: values.reviewFileName || undefined,
    })
    refresh()
    toast.success(t("Sent for review."))
  }

  // THE CHROME STAYS, ONLY THE PANEL SPINS (RecordChrome's law 4).
  if (storyQ.error)
    return (
      <RecordScreen
        title={<Skeleton className="h-7 w-48" />}
        state="error"
        copy={{ errorTitle: t("Couldn't load the story.") }}
        errorAction={
          <Button variant="secondary" onClick={() => invalidate(`story:one:${storyId}`)}>
            {t("Try again")}
          </Button>
        }
      />
    )
  if (storyQ.data === undefined)
    return <RecordScreen title={<Skeleton className="h-7 w-48" />} state="loading" />
  if (!story)
    return (
      <RecordScreen
        title={t("Story")}
        state="empty"
        copy={{ emptyTitle: t("That story no longer exists."), emptyDescription: "" }}
      />
    )

  // THE DONE RULE, MIRRORED — the door refuses a `done` move while
  // `buildNotes` is empty (`refuseUndocumented`, workers/content/src/lib/
  // stories.ts); this button only reads the same fact back, R17's own "the
  // door decides, the button mirrors it" split.
  const buildNotesMissing = !story.buildNotes || !story.buildNotes.trim()
  const doneReason = buildNotesMissing ? t("Write the build notes before marking it done.") : undefined

  const overflow: RecordAction[] = canEdit
    ? [
        {
          key: "edit",
          label: t("Edit"),
          icon: <PencilSimple className="size-3.5" />,
          onSelect: () => setEditOpen(true),
        },
      ]
    : []

  const foldedActions: HeadActionItem[] = [
    ...(timerAction ? [timerAction] : []),
    ...(canEdit && (story.status === "open" || story.status === "in_progress")
      ? [
          {
            key: "readyForReview",
            label: t("Ready for review"),
            icon: <CheckSquare className="size-3.5" />,
            disabled: busy,
            onSelect: () => setReviewOpen(true),
          },
        ]
      : []),
    ...(canEdit && story.status === "in_review"
      ? [
          {
            key: "done",
            label: t("Done"),
            icon: <Check className="size-3.5" />,
            disabled: busy || buildNotesMissing,
            onSelect: () =>
              void run(
                () => contentApi.setStoryStatus(storyId, "done", story.closingNote ?? undefined),
                "Done.",
                "Couldn't close that story."
              ),
          },
        ]
      : []),
    ...overflow,
  ]

  // THE LEFT COLUMN — Detail, Acceptance criteria, Build notes, in that
  // order (Aurora's design review). Each its own `TicketSidePanel` Card —
  // that component is purely generic despite its name (a title row, room
  // for a count/action, `role="group"` children), reused rather than a
  // second, near-identical wrapper.
  const detailPanel = (
    <TicketSidePanel title={t("Detail")}>
      {story.detail ? (
        <RichText html={translation.of(story.detail)} />
      ) : (
        <p className="text-muted-foreground text-sm">{t("Nothing written yet.")}</p>
      )}
    </TicketSidePanel>
  )

  const acceptancePanel = (
    <TicketSidePanel title={t("Acceptance criteria")}>
      {story.acceptanceCriteria ? (
        <RichText html={translation.of(story.acceptanceCriteria)} />
      ) : (
        <p className="text-muted-foreground text-sm">{t("Nothing written yet.")}</p>
      )}
    </TicketSidePanel>
  )

  // BUILD NOTES — R88's own single door while empty: no title row at all,
  // `EmptyGatedPanel`'s `empty` prop drops it, and the one "Write the build
  // notes" button is the whole panel. Once written, the pencil (not a
  // second create button) reopens the identical sheet.
  const buildNotesPanel = (
    <EmptyGatedPanel
      title={t("Build notes")}
      empty={buildNotesMissing}
      action={
        !buildNotesMissing ? (
          <EditPenButton onClick={() => setBuildNotesOpen(true)} label={t("Edit the build notes")} />
        ) : undefined
      }
    >
      {buildNotesMissing ? (
        <CollectionEmptyState
          title={t("What was built, and how.")}
          description={t("Add images inline.")}
          onCreate={canEdit ? () => setBuildNotesOpen(true) : undefined}
          createLabel={t("Write the build notes")}
        />
      ) : (
        <>
          <RichText html={translation.of(story.buildNotes ?? "")} />
          {buildNotesImages.length > 0 && (
            <div className="flex flex-col gap-2">
              {buildNotesImages.map((a) => (
                <AttachmentPreview key={a.id} kind="file" url={a.url} contentType={a.contentType} />
              ))}
            </div>
          )}
        </>
      )}
    </EmptyGatedPanel>
  )

  const mainColumn = (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Above the fields it acts on, the same position the old tabbed
          Overview gave it — a thing somebody presses while reading and
          presses back a moment later. */}
      <div className="flex justify-end">
        <TranslateAction translation={translation} />
      </div>
      {detailPanel}
      {acceptancePanel}
      {buildNotesPanel}
    </div>
  )

  // THE RIGHT COLUMN — Assigned to, Related tickets, Related stories, Phase
  // and wave, Effort, Metrics, in that order.
  const assignedToPanel = (
    <AssignedToCard
      assigneeId={story.assigneeId}
      assigneeName={story.assigneeName}
      appId={story.appId}
      appName={story.appName}
      appAssigneeId={story.appAssigneeId}
      members={assignableMembers(membersQ.data)}
      canEditAssignee={canEdit}
      onChangeAssignee={changeAssignee}
    />
  )

  const ticket = ticketQ.data
  const relatedTicketsPanel = (
    <TicketSidePanel title={t("Related tickets")} count={ticket ? formatCount(1) : formatCount(0)}>
      {ticket ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm">{ticketTitle(ticket)}</span>
          {/* R94 (chip-order): id then status, through the one shared seam,
              even on a list row rather than a record's own head. */}
          {orderChips([
            { kind: "id", node: <RecordRef key="id" value={ticket.ref} /> },
            { kind: "status", node: ticketStatusCell(ticket.status, t) },
          ])}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{t("No related tickets.")}</p>
      )}
    </TicketSidePanel>
  )

  const relatedStoriesPanel = (
    <TicketSidePanel title={t("Related stories")} count={formatCount(relatedStories.length)}>
      {relatedStories.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("No related stories.")}</p>
      ) : (
        relatedStories.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm">{s.title}</span>
            {/* R94 (chip-order): id, status, type. */}
            {orderChips([
              { kind: "id", node: <RecordRef key="id" value={s.ref} /> },
              {
                kind: "status",
                node: (
                  <Badge key="status" variant="status" dot={storyStatusDotTone(s.status)}>
                    {storyStatusWord(s.status, { startsOn: s.sprintStartsOn, endsOn: s.sprintEndsOn })}
                  </Badge>
                ),
              },
              { kind: "type", node: storyTypeChip(s.storyType) as React.ReactElement | null },
            ])}
          </div>
        ))
      )}
    </TicketSidePanel>
  )

  const phaseAndWavePanel = (
    <TicketSidePanel title={t("Phase and wave")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-sm">{t("Phase")}</span>
        {story.sprintId && story.sprintName ? (
          <RecordChipLink href={`${host.base}/sprints/${story.sprintId}`}>{story.sprintName}</RecordChipLink>
        ) : (
          <span className="text-muted-foreground text-sm">{t("None")}</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-sm">{t("Wave")}</span>
        <span className="text-sm">{sprintQ.data?.waveName || t("None")}</span>
      </div>
    </TicketSidePanel>
  )

  // EFFORT — `WorkLogsPanel` draws no title of its own (its own doc:
  // "handed to whoever draws the title row ABOVE this panel"); the ticket
  // page's own `EmptyGatedPanel` wrapping (`help-detail.tsx`) is the pattern
  // reused here whole, R88's single door: empty, the header and its "+"
  // both drop, and the panel's own `CollectionEmptyState` is the one way in.
  const effortPanel = (
    <EmptyGatedPanel
      title={t("Effort")}
      empty={workLogsEmpty}
      action={
        canLogTime ? (
          <AddButton label={t("Log time")} onClick={() => workLogAddRef.current?.()} empty={workLogsEmpty} />
        ) : undefined
      }
    >
      <WorkLogsPanel
        targetTable="stories"
        targetId={storyId}
        recordLabel={story.ref ? `${story.ref} · ${story.title}` : story.title}
        canEdit={canEdit}
        canLog={canLogTime}
        showAddButton={false}
        addTrigger={workLogAddRef}
        onEmptyChange={setWorkLogsEmpty}
        onActivityChanged={() => {
          invalidate(`activity:record:stories:${storyId}`)
          invalidate(`story:metrics:${storyId}`)
        }}
      />
    </EmptyGatedPanel>
  )

  const metrics = metricsQ.data
  const metricsPanel = (
    <TicketSidePanel title={t("Metrics")}>
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs uppercase">{t("Cycle time")}</span>
          <span className="font-mono text-sm font-semibold">
            {metrics && metrics.cycleTimeSeconds !== null
              ? cycleTimeLabel(metrics.cycleTimeSeconds)
              : t("Not started")}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs uppercase">{t("Effort")}</span>
          <span className="font-mono text-sm font-semibold">{hoursLabel(metrics?.effortSeconds ?? 0)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs uppercase">{t("Flow efficiency")}</span>
          <span className="font-mono text-sm font-semibold">
            {metrics && metrics.flowEfficiency !== null
              ? `${Math.round(metrics.flowEfficiency)}%`
              : t("No time log")}
          </span>
        </div>
      </div>
    </TicketSidePanel>
  )

  const sideColumn = (
    <>
      {assignedToPanel}
      {relatedTicketsPanel}
      {relatedStoriesPanel}
      {phaseAndWavePanel}
      {effortPanel}
      {metricsPanel}
    </>
  )

  // NO OUTER PANEL CARD — the same ruling `ticket-detail-body.tsx`'s own
  // header quotes ("remove the 'overall' container, make each thing its own
  // container"). `<RecordScreen panelVisible={false}>` draws the head only;
  // `RecordDetail`'s own panel region never even reads `content` once
  // `panelVisible` is false (that prop's own doc comment, record-chrome.tsx),
  // so the body has to be a SIBLING of `<RecordScreen>`, not its children —
  // exactly `help-detail.tsx`'s own shape for `<TicketDetailBody>`.
  return (
    <>
    <RecordScreen
      // NO D4 RECORD NUMBER / COLLECTION LABEL — Aurora's own chip-order
      // ruling, 20 Sep 2026: the reference and the type word both move into
      // the chips row instead of living twice.
      chips={
        <>
          {/* R94 (chip-order): id, status, type, main parent (app),
              secondary parent (phase). */}
          {orderChips([
            { kind: "id", node: <RecordRef key="id" value={story.ref} /> },
            {
              kind: "status",
              node: (
                <Badge key="status" variant="status" dot={storyStatusDotTone(story.status)}>
                  {storyStatusWord(story.status, { startsOn: story.sprintStartsOn, endsOn: story.sprintEndsOn })}
                </Badge>
              ),
            },
            {
              kind: "type",
              node: storyTypeChip(story.storyType) as React.ReactElement | null,
            },
            {
              kind: "mainParent",
              node:
                story.appId && story.appName ? (
                  <RecordChipLink key="app" href={`${host.base}/apps/${story.appId}`}>
                    <span className="underline">{story.appName}</span>
                  </RecordChipLink>
                ) : null,
            },
            {
              kind: "secondaryParent",
              node:
                story.sprintId && story.sprintName ? (
                  <RecordChipLink key="sprint" href={`${host.base}/sprints/${story.sprintId}`}>
                    <span className="underline">{story.sprintName}</span>
                  </RecordChipLink>
                ) : null,
            },
          ])}
          <HeadActionsFoldMenu items={foldedActions} label={t("More actions")} />
        </>
      }
      title={translation.of(story.title)}
      actions={
        <div data-slot="head-actions-row" className={HEAD_ACTIONS_ROW_CLASS}>
          <RecordTimerButton
            teamId={teamId}
            targetTable="stories"
            targetId={storyId}
            canLog={canLogTime}
            disabled={story.status === "done"}
          />
          {canEdit && (story.status === "open" || story.status === "in_progress") && (
            <Button disabled={busy} onClick={() => setReviewOpen(true)} className="gap-1">
              <CheckSquare className="size-3.5" />
              {t("Ready for review")}
            </Button>
          )}
          {canEdit && story.status === "in_review" && doneReason && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button disabled className="gap-1">
                    <Check className="size-3.5" />
                    {t("Done")}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{doneReason}</TooltipContent>
            </Tooltip>
          )}
          {canEdit && story.status === "in_review" && !doneReason && (
            <Button
              disabled={busy}
              onClick={() =>
                void run(
                  () => contentApi.setStoryStatus(storyId, "done", story.closingNote ?? undefined),
                  "Done.",
                  "Couldn't close that story."
                )
              }
              className="gap-1"
            >
              <Check className="size-3.5" />
              {t("Done")}
            </Button>
          )}
          <RecordActionsMenu actions={overflow} />
        </div>
      }
      panelVisible={false}
      footerVisible={false}
    />
      <RecordDetailBody
        main={mainColumn}
        side={sideColumn}
        footer={
          <RecordFooterBand
            audit={{
              createdByName: story.createdByName,
              createdAt: story.createdAt,
              editedByName: story.editedByName,
              updatedAt: story.updatedAt,
            }}
            activity={activity}
            onAddNote={can("work", "create") ? activity.addNote : undefined}
            notePlaceholder={t("Add a note")}
          />
        }
      />

      <StoryFormDialog
        teamId={teamId}
        open={editOpen}
        onOpenChange={setEditOpen}
        sprints={options.sprints}
        apps={options.apps}
        tickets={options.tickets}
        members={options.members}
        appStaff={options.appStaff}
        processes={options.processes}
        storyTypes={options.storyTypes}
        categories={options.categories}
        storyId={story.id}
        defaultAssigneeId={myUserId ?? ""}
        initial={{
          title: story.title,
          detail: story.detail ?? "",
          sprintId: story.sprintId ?? "",
          appId: story.appId ?? "",
          ticketId: story.ticketId ?? "",
          assigneeId: story.assigneeId ?? "",
          storyType: story.storyType ?? "",
          category: story.category,
          processIds: story.processIds,
          changesNoStep: story.changesNoStep,
          acceptanceCriteria: story.acceptanceCriteria ?? "",
          moscow: story.moscow ?? "",
          contributesToGoal: story.contributesToGoal,
        }}
        draftKey={`story:edit:${storyId}`}
        onSubmit={save}
      />
      <ReviewDialog
        storyId={storyId}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        draftKey={`story:review:${storyId}`}
        initial={{
          reviewNote: story.reviewNote ?? "",
          reviewFileUrl: story.reviewFileUrl ?? "",
          reviewFileName: story.reviewFileName ?? "",
        }}
        onSubmit={sendToReview}
      />
      <StoryBuildNotesSheet
        open={buildNotesOpen}
        onOpenChange={setBuildNotesOpen}
        story={story}
        onSaved={() => {
          refresh()
          invalidate(storyAttachmentsKey(storyId))
        }}
      />
    </>
  )
}
