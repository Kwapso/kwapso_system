"use client"

// STORY DETAIL — one piece of work at /stories/<id>, as a tabbed record:
// Overview / Work logs / Files and links. Its history is not a fourth tab any
// more — it is reached from the ink footer's Latest activity column, on the
// client's 2026-09-06 ruling; web/components/records/activity-panel.tsx carries the
// ruling and the argument.
//
// A story row in the backlog opened NOTHING before this: the recipe registry
// pointed at a story-detail.tsx that had never been written, so tapping a story
// resolved to "that screen doesn't exist". It is the record the whole work
// engine converges on — the only place an assignee and a due date live, the
// thing time is logged against, and the thing whose closing note becomes what a
// client is eventually told — so it is also where the cross-links belong: up to
// its app, its sprint and the request it answers.
//
// Host-composed: the status STEPPER and the time logged against it are controls
// no engine block draws.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { toast } from "@shared/ui/components/sonner/sonner"
import { TabsView } from "@shared/web/screen-engine/tabs-view"
import { useRemembered } from "@shared/web/remembered"
import { Check, CheckSquare, PencilSimple } from "@shared/ui/foundations/icons"

import { StoryFormDialog, type StoryFormValues } from "@/components/work/story-form-dialog"
import { ReviewDialog, type ReviewFormValues } from "@/components/work/review-dialog"
import { MoscowChip, storyTypeChip, useStoryFormOptions } from "@/components/work/stories-screen"
import { STORY_STATUS_LABEL } from "@/components/work/work-panels"
import { storyStatusDotTone } from "@shared/status-tones"
import { WorkLogsPanel, workLogsTotalKey } from "@/components/work/work-logs-panel"
import { StoryAttachmentsPanel } from "@/components/work/story-attachments"
import { RecordTimerButton, useRecordTimerAction } from "@/components/shell/timer-bar"
import { OverviewList } from "@/components/records/overview-list"
import { TranslateAction, useHumanTranslation } from "@/components/records/translate-human-text"
import { ApiFailure, content as contentApi } from "@/lib/api"
import {
  RecordActionsMenu,
  RecordChipLink,
  RecordScreen,
  STICKY_TABS,
  RECORD_TABS_CONFIG,
  type RecordAction,
} from "@/components/records/record-chrome"
import { HeadActionsFoldMenu, HEAD_ACTIONS_ROW_CLASS, type HeadActionItem } from "@shared/web/head-actions"
import { MARK_GROUP, typeMark } from "@/lib/type-marks"
import { formatCount } from "@shared/web/format-count"
import { formatDate } from "@shared/web/format"
import { staffNameFromSnapshot } from "@shared/staff-name"
import { storiesKey, storyAttachmentsKey } from "@/lib/live-resources"
import { CONCEPT_ICON } from "@/lib/pages"
import { usePermissions } from "@/lib/perms"
import { useRecordActivity } from "@/lib/use-record-activity"
import { useRecordCounts } from "@/lib/use-record-counts"
import type { Story } from "@shared/types"
import { invalidate, useCached, useCachedValue } from "@shared/web/store"
import { useLanguage } from "@shared/web/language"
import { RichText } from "@shared/web/rich-text-view"
import { useSessionUserId } from "@/lib/use-active-team"

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
  const { t, lang } = useLanguage()
  const myUserId = useSessionUserId()
  // The backlog is PAGED, so a story reached by a deep link may sit past page
  // one — it is fetched by id and kept in its own cache key, exactly as the
  // knowledge base does for a source past its first page.
  const storyQ = useCached<Story | null>(`story:one:${storyId}`, () => contentApi.storyOne(storyId))
  const activity = useRecordActivity("stories", storyId)
  // The exact number of entries on THIS story, for the tab badge (R16), fetched
  // when the STORY opens rather than when the tab is clicked. It used to wait for
  // the WorkLogsPanel below to mount, and a panel does not mount until its tab is
  // active — so the badge was missing exactly when a reader needed it to decide
  // whether the tab was worth opening (shared/record-counts.ts). One exported key
  // function is still what keeps the panel's own refresh and this badge on the
  // same string.
  useRecordCounts("stories", storyId)
  const timeTotal = useCachedValue<number | null>(workLogsTotalKey("stories", storyId))
  // R16: the Files and links tab badges the door's exact COUNT(*), answered by
  // the counts read above when the STORY opens rather than when the tab is
  // clicked — a badge that is blank until you open the tab reads as an empty tab,
  // which is exactly the complaint this screen is being fixed for. `null` is the
  // third answer beside a number and an absence (the role may not read `work`),
  // and it renders as nothing, exactly as a zero does.
  const attachmentsTotal = useCachedValue<number | null>(`total:${storyAttachmentsKey(storyId)}`)

  const { can } = usePermissions(teamId)
  const canEdit = can("work", "update")
  // The timer asks for the right its own door asks for (`work:create`), not the
  // one that governs editing the story — a person who may log time but not
  // rewrite the work was being offered neither.
  const canLogTime = can("work", "create")
  /* THE TIMER, NORMALIZED — Aurora's ruling, 18 Sep 2026 ("h3, and aign the
   * menu to the chips"): at a narrow width, Start/Stop timer moves off its
   * own button and into the "…" menu beside Ready for review/Done/Edit.
   * `RecordTimerButton` (below, in `actions`) still draws the wide button
   * unchanged; this second, independent read of the SAME running-timers
   * cache (`useRecordTimerAction`, `@/components/shell/timer-bar`) is what
   * the fold's menu item is built from when the row is narrow — see
   * `shared/web/head-actions.tsx`'s own header, "TWO RENDERS OF THE SAME
   * ACTIONS, NOT ONE NODE PHYSICALLY MOVED".
   *
   * CALLED HERE, AHEAD OF THE THREE EARLY RETURNS BELOW — a hook cannot sit
   * after a conditional return the way `RecordTimerButton` itself, an
   * ordinary child component, safely can — so this reads `storyQ.data?.status`,
   * the same `story.status === "done"` gate `RecordTimerButton` reads below,
   * one optional-chain earlier than the guard that proves `story` non-null. */
  const timerAction = useRecordTimerAction({
    teamId,
    targetTable: "stories",
    targetId: storyId,
    canLog: canLogTime,
    disabled: storyQ.data?.status === "done",
  })
  // Precomputed with the outer `t`: `renderPanel` below names its own tab-item
  // parameter `t`, which would otherwise shadow the translation function right
  // where the footer's own note field needs it.
  const notePlaceholder = t("Add a note")

  // The open tab is remembered per record for as long as this document
  // lives (web/lib/nav-memory.ts) — leaving to another section and coming
  // back lands on the tab she was reading, and a miss lands on "overview".
  const [tab, setTab] = useRemembered("tab", "overview")
  const [editOpen, setEditOpen] = React.useState(false)
  const [reviewOpen, setReviewOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const options = useStoryFormOptions(teamId)
    // NEST, DON'T REPLACE. This used to strip the collection segment off the path
  // before the panels appended to it, so opening a related record from here
  // threw away the record you opened it FROM — a story reached from a client
  // landed on /stories/<id> with no way back to the client. The base is now this
  // record's own address, so a related record lands INSIDE it and the trail is
  // in the URL for the crumbs, the Back button and anybody you send it to.
  const host = { base: `${basePath}/${storyId}` }

  const refresh = React.useCallback(() => {
    invalidate(`story:one:${storyId}`)
    invalidate(storiesKey(teamId))
    invalidate(`activity:record:stories:${storyId}`)
  }, [storyId, teamId])

  // READ THIS STORY IN YOUR OWN LANGUAGE, if you ask. Everything on it somebody
  // typed goes in one array, so one press is one call. A hook, so it sits above
  // the three early returns below.
  const translation = useHumanTranslation(teamId, [
    storyQ.data?.title,
    storyQ.data?.detail,
    storyQ.data?.acceptanceCriteria,
    storyQ.data?.reviewNote,
    storyQ.data?.closingNote,
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
    })
    refresh()
    toast.success(t("Story updated."))
  }

  /** READY FOR REVIEW (CHECKLIST 6.9) — refused until every timer on this story
   * is stopped and an explanation is written. Both refusals live at the door, so
   * this panel only has to collect the words; the file is optional, which is
   * Aurora's ruling over "all three always" — plenty of work has nothing to show.
   */
  async function sendToReview(values: ReviewFormValues) {
    await contentApi.setStoryStatus(storyId, "in_review", undefined, {
      reviewNote: values.reviewNote,
      reviewFileUrl: values.reviewFileUrl || undefined,
      reviewFileName: values.reviewFileName || undefined,
    })
    refresh()
    toast.success(t("Sent for review."))
  }

  // THE CHROME STAYS, ONLY THE PANEL SPINS (RecordChrome's law 4) — rolled out
  // from the help-detail prototype (73414c58). Same shape: each branch below
  // still returns before the "ready" body, so no hook order changed.
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
  const story = storyQ.data
  if (!story)
    return (
      <RecordScreen
        title={t("Story")}
        state="empty"
        copy={{ emptyTitle: t("That story no longer exists."), emptyDescription: "" }}
      />
    )

  const overviewItems = [
    { label: t("Status"), value: STORY_STATUS_LABEL[story.status] },
    // THE ICON JOINS THE WORD HERE TOO (client ruling, 16 Sep 2026) — the
    // identical chip the List row and the Board card now draw
    // (`storyTypeChip`, stories-screen.tsx), so the record's own detail
    // screen cannot show a third idea of what a story's type looks like.
    { label: t("Type"), value: storyTypeChip(story.storyType) },
    // WHERE THIS WORK CAME FROM (client ruling, 15 Sep 2026) — beside Type,
    // the same overview list, so both halves of the ruling read together.
    { label: t("Category"), value: story.category },
    // MOSCOW (Aurora's ruling, 20 Sep 2026) — the same coloured tag the
    // backlog's own rows and cards draw, or a plain dash for the 3,677
    // pre-existing stories with none set.
    { label: t("Priority"), value: story.moscow ? <MoscowChip value={story.moscow} /> : "" },
    { label: t("Reference"), value: story.ref || "" },
    // R54: a story is agency work, so the assignee is one of ours.
    { label: t("Who's doing it"), value: staffNameFromSnapshot(story.assigneeName) || "Nobody yet" },
    // WHO REVIEWS IT, and ONLY when somebody has named one.
    //
    // `stories.reviewer_id`/`reviewer_name` have been settable through
    // `create_story` and `update_story` since the work engine shipped:
    // `memberOrThrow` resolves the person at the door, the INSERT and the UPDATE
    // both store them, `stories.ts` selects and maps them, `shared/types.ts`
    // types them, and the query grammar filters on them — and no screen on
    // either front door has ever shown the answer. Somebody could tell the
    // assistant "make Sam the reviewer on this story", get a yes, and there was
    // nowhere the name appeared afterwards.
    //
    // CONDITIONAL, WHICH IS THE DECISION HERE. CHECKLIST 6.10 is the product's
    // one ruling on the word: the Done button belongs to the APP'S TEAM LEAD,
    // refused at the door (`refuseDoneByAnybodyElse`, stories.ts), and it reads
    // nothing off this row. So a reviewer named here is who is expected to
    // LOOK at the work, never who is allowed to close it — and a row printing
    // "-" on every story would announce a concept the screens do not offer,
    // which is a second dead end pointing the other way. Zero of the 329
    // stories on staging carry a reviewer, so this row is invisible on the app
    // as it stands today and appears the moment the capability is used.
    //
    // NOTHING WAS REMOVED to achieve that. Whether a per-story reviewer is a
    // concept this product wants at all is a decision for the owner, not for a
    // review lane — the reachability fix is to show what is written.
    ...(story.reviewerName ? [{ label: t("Who reviews it"), value: story.reviewerName }] : []),
    // INHERITED, not typed. A story is due when the block it was sold inside is
    // due, so this is the SPRINT's end date — the story's own date field went on
    // 17 Aug 2026 rather than let two dates disagree about one promise. A story
    // with no sprint has no deadline to show, which is the honest answer.
    { label: t("Deadline"), value: formatDate(story.sprintEndsOn, lang) || "" },
    // The three fields somebody TYPED — the detail, what was done, and what the
    // client will be told — read through `of`, so the reader who pressed
    // Translate sees them in their own language and nobody else's row changed.
    // Then through RichText, because they are typed in an editor now: translate
    // first, render second, and the sanitizer runs on what comes back.
    {
      label: t("Detail"),
      value: story.detail ? <RichText html={translation.of(story.detail)} /> : "",
    },
    // ACCEPTANCE CRITERIA — Aurora's ruling, 20 Sep 2026: "same design as
    // Detail." Identical treatment, one row down: translated, then rendered
    // as rich text.
    {
      label: t("Acceptance criteria"),
      value: story.acceptanceCriteria ? <RichText html={translation.of(story.acceptanceCriteria)} /> : "",
    },
    {
      label: t("Processes it changes"),
      value: story.changesNoStep
        ? "None"
        : story.processIds.map((id) => options.processNames.get(id) ?? id).join(", ") || "",
    },
    { label: t("What was done"), value: translation.of(story.reviewNote) || "" },
    { label: t("What we'll tell them"), value: translation.of(story.closingNote) || "" },
    // The audit rows moved to the footer at the foot of the record (D7 /
    // CHECKLIST 11.3); the status is on the header band's own line.
  ]

  const tabsConfig = {
    ...RECORD_TABS_CONFIG,
    tabs: [
      { value: "overview", label: t("Overview"), icon: "info", badge: "", badgeVariant: "" as const },
      {
        // CHECKLIST 6.8: "a work logs tab on the story, and on every other detail
        // screen that captures time". The tab was already here and called Time;
        // Work logs is the word the glossary and the section both use now.
        value: "time",
        label: t("Time logs"),
        icon: CONCEPT_ICON.time,
        badge: formatCount(timeTotal),
        badgeVariant: "" as const,
      },
      // WHAT THE STORY SHOWS FOR ITSELF. The same words the ticket's own tab
      // uses, because it is the same collection one record along and a second
      // name for it would be a second thing for a reader to learn (R6/R34).
      {
        value: "files",
        label: t("Files and links"),
        icon: "paperclip",
        badge: formatCount(attachmentsTotal),
        badgeVariant: "" as const,
      },
      // NO ACTIVITY TAB (client, 2026-09-06 · 2026-09-07) — a story's history is
      // reached from the ink footer's Latest activity column now, and opens in a
      // slide-in off it. web/components/records/activity-panel.tsx carries the ruling.
    ],
  }

  /* B1 / CHECKLIST 11.2 — one primary, one secondary, and a menu. The act that
   * MOVES THE STORY FORWARD is the primary (ready for review, then done: only
   * ever one is offered, because they belong to different stages), the clock is
   * the secondary, and Edit goes into the three-dot menu. */
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

  /* THE FOLD — same shape as `help-detail.tsx`'s own ("h3, and aign the menu
   * to the chips"): below `shared/web/head-actions.tsx`'s own breakpoint,
   * the timer, Ready for review/Done and Edit all leave their standalone
   * controls and join the ONE "…" trigger that moves into the chip row.
   * Same order the wide row already draws them in — timer, the stage
   * button, then edit. */
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
            disabled: busy,
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

  return (
    <RecordScreen
      mark={typeMark(options.selectableValues, MARK_GROUP.story, story.storyType)}
      // NO EYEBROW — client ruling, 2026-09-03, verbatim: "I want you to remove
      // the eyebrow on the title on main screens. Remove that eyebrow, kill it."
      // The prop this line used to pass is deleted from `RecordScreen` itself
      // (record-chrome.tsx says why it had outlived the 2026-09-01 ruling that
      // took the eyebrow out of the full header); the breadcrumb above this
      // header is what names the record type now.
      // NO D4 RECORD NUMBER / COLLECTION LABEL ANY MORE — Aurora's own chip-
      // order ruling, 20 Sep 2026, verbatim: "on story detail, the chips in
      // order: id, status, type, app (underlined), sprint (id, underlined)."
      // The reference and the type word both MOVE into the chips row below
      // (its first and third members) rather than living twice — once above
      // the title through `recordNumber`/`collectionLabel`, once again as a
      // chip — which is what drawing both at once would do.
      //
      // THE FIVE CHIPS, IN HER OWN ORDER:
      //   1. id      — the story's own reference, the same mono badge every
      //                other list row leads with (`storyLead`, stories-
      //                screen.tsx).
      //   2. status  — WITH A COLOUR (client ruling, 2026-08-31: "the status
      //                scheme is not only for tickets … map colors").
      //   3. type    — the identical icon+word chip the backlog's own rows
      //                and cards draw (`storyTypeChip`).
      //   4. app     — underlined because it is a link (her own words), the
      //                cross-link this header carried nowhere until now.
      //   5. sprint  — underlined, the same link this header already drew
      //                one position later; "(id)" is UNDERSTOOD as "the
      //                nested link a story detail can carry" the way the
      //                app one now can, not a distinct id column — Sprint's
      //                own reference is not yet a field this record reads.
      chips={
        <>
          {story.ref && (
            <Badge variant="secondary" className="font-mono">
              {story.ref}
            </Badge>
          )}
          <Badge variant="status" dot={storyStatusDotTone(story.status)}>
            {STORY_STATUS_LABEL[story.status]}
          </Badge>
          {storyTypeChip(story.storyType)}
          {story.appId && story.appName ? (
            <RecordChipLink href={`${host.base}/apps/${story.appId}`}>
              <span className="underline">{story.appName}</span>
            </RecordChipLink>
          ) : null}
          {story.sprintId && story.sprintName ? (
            <RecordChipLink href={`${host.base}/sprints/${story.sprintId}`}>
              <span className="underline">{story.sprintName}</span>
            </RecordChipLink>
          ) : null}
          {/* THE FOLDED TRIGGER, ON THE CHIP ROW'S OWN LINE — same wiring as
              `help-detail.tsx`'s own ("aign the menu to the chips"). */}
          <HeadActionsFoldMenu items={foldedActions} label={t("More actions")} />
        </>
      }
      title={translation.of(story.title)}
      // CLIENT RULING, 2026-08-31, VERBATIM: "what is this 3rd component in
      // the title under the chips? kill everywhere. chips is the last
      // component of headers!" Overrides the D5 trim above, which had kept
      // assignee/deadline here — both are already rows in the Overview tab
      // (`overviewItems`: "Who's doing it", "Deadline"), so nothing is lost.
      // `status` maps to `RecordChrome`'s `meta`, which the kit draws right
      // under the chips row (`data-record-region="header"`) — exactly the
      // region the ruling forbids.
      actions={
        <div data-slot="head-actions-row" className={HEAD_ACTIONS_ROW_CLASS}>
          {/* START, AND STOP. It used to be a permanent "Start timer" that could
              not see the timer already running on this very story, so pressing it
              again asked the door a question it had to refuse. The shared control
              reads the same running-timers cache the header bar reads. */}
          <RecordTimerButton
            teamId={teamId}
            targetTable="stories"
            targetId={storyId}
            canLog={canLogTime}
            disabled={story.status === "done"}
          />
          {/* READY FOR REVIEW (CHECKLIST 6.9). Offered only while the work is
              actually in hand: a story nobody has started has nothing to explain,
              and one already in review or done has been explained. The panel
              collects the words; the door refuses if a timer is still running. */}
          {canEdit && (story.status === "open" || story.status === "in_progress") && (
            <Button disabled={busy} onClick={() => setReviewOpen(true)} className="gap-1">
              <CheckSquare className="size-3.5" />
              {t("Ready for review")}
            </Button>
          )}
          {/* ONE DONE BUTTON, TOP RIGHT (CHECKLIST 6.10). It appears only on a
              story that has been reviewed, so "done" stays downstream of somebody
              having looked. */}
          {canEdit && story.status === "in_review" && (
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
      // THE STAGE STEPPER AND THE APP/TICKET CROSS-LINKS ARE GONE — CLIENT
      // RULING, 2026-08-31, VERBATIM: "what is this 3rd component in the
      // title under the chips? kill everywhere. chips is the last component
      // of headers!" `headerExtra` maps to `RecordChrome`'s `hero` prop,
      // which the kit draws in its own `data-record-region="hero"` block —
      // directly under the header block that carries the chips, still above
      // the tab strip, so on the rendered page it reads as more content
      // under the pills exactly as the ruling describes. The stepper stops
      // being a text duplicate the moment it's a stepper, and the ruling
      // says so anyway: "it doesn't matter whether the information is a
      // duplicate or not." The app/ticket links are not shown anywhere else
      // on this screen (confirmed against `overviewItems`, which has no App
      // or Ticket row) — dropped from the header per this explicit ruling,
      // not carried anywhere else; a reader can still reach the app from the
      // Sprint the story links to, and the ticket from Tickets.
      // D7 / CHECKLIST 11.3 — who made it and when, now the kit's own ink
      // footer's Record column.
      audit={{
        createdByName: story.createdByName,
        createdAt: story.createdAt,
        editedByName: story.editedByName,
        updatedAt: story.updatedAt,
      }}
      activity={activity}
      onAddNote={can("work", "create") ? activity.addNote : undefined}
      notePlaceholder={notePlaceholder}
    >

      <TabsView
        className={STICKY_TABS}
        config={tabsConfig}
        value={tab}
        onValueChange={setTab}
        renderPanel={(t) => {
          if (t.value === "time")
            return (
              <WorkLogsPanel
                targetTable="stories"
                targetId={storyId}
                recordLabel={story.ref ? `${story.ref} · ${story.title}` : story.title}
                canEdit={canEdit}
                canLog={canLogTime}
                onActivityChanged={() => invalidate(`activity:record:stories:${storyId}`)}
              />
            )
          // `work:update`, which is what BOTH attachment doors gate on — not the
          // read right the ticket's panel takes, and not `canLogTime`. A button
          // drawn on a wider right is a button whose every press is a 403.
          if (t.value === "files")
            return <StoryAttachmentsPanel storyId={storyId} canEdit={canEdit} />
          return (
            <>
              {/* Above the fields it acts on, and out of the header's one-primary
                  -one-secondary-and-a-menu discipline — this is a thing somebody
                  presses while reading and presses back a moment later. */}
              <div className="flex justify-end">
                <TranslateAction translation={translation} />
              </div>
              <OverviewList items={overviewItems} />
            </>
          )
        }}
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
        // THE SIGNED-IN USER — only matters when `initial.assigneeId` below is
        // empty (an old story with no assignee on file): the form dialog falls
        // back to this rather than opening on the one state its picker can no
        // longer draw (16 Sep 2026 ruling killed the "Nobody" pill).
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
    </RecordScreen>
  )
}
