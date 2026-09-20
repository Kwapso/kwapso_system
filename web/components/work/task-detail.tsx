"use client"

// TASK DETAIL — one piece of the agency's own admin, as a tabbed record:
// Overview / Work logs. Its history is not a third tab any more — it is reached
// from the ink footer's Latest activity column, on the client's 2026-09-06
// ruling; web/components/records/activity-panel.tsx carries the ruling and the argument.
//
// IT USED TO BE A RECIPE, and the note that made it one was true when it was
// written: a task is "a title, a date and a tick", and there was no control on it
// the engine had no block for. That stopped being true on 18 Aug 2026. The owner
// asked for a work logs tab wherever time is tracked, `tasks` has been a work-log
// target since work logs shipped, and a tab whose panel is a list plus three
// charts is exactly the thing no recipe block draws. The engine kept the record
// for as long as it could describe it, which is the deal — a recipe is not a
// prize a screen keeps after it has outgrown one.
//
// WHAT CARRIES OVER UNCHANGED: the same fields the description block showed, the
// same tick-and-untick door through the same `onAction` seam the recipe used, and
// the same generic (table, id) activity feed (R5) — which is still read here, for
// the footer's Latest activity column and its note field. The timer on the header is the
// one the recipe already had, moved from the `above` slot to where a record's
// secondary action belongs.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { TabsView } from "@shared/web/screen-engine/tabs-view"
import { useRemembered } from "@shared/web/remembered"
import { Check, ArrowUUpLeft, PencilSimple, Timer, Trash } from "@shared/ui/foundations/icons"
import { EditPenButton } from "@shared/web/edit-pen-button"
import { fileTypeIcon } from "@shared/web/screen-engine/file-type-icon"
import { useConfirm } from "@shared/web/use-confirm"
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/components/tooltip/tooltip"

import { TaskFormDialog, type TaskFormValues } from "@/components/work/task-form-dialog"
import { OverviewList } from "@/components/records/overview-list"
import { RecordScreen, STICKY_TABS, RECORD_TABS_CONFIG } from "@/components/records/record-chrome"
import { HeadActionsFoldMenu, HEAD_ACTIONS_ROW_CLASS, type HeadActionItem } from "@shared/web/head-actions"
import { RecordTimerButton, useRecordTimerAction } from "@/components/shell/timer-bar"
import { WorkLogsPanel, workLogsTotalKey } from "@/components/work/work-logs-panel"
import { CONCEPT_ICON } from "@/lib/pages"
import { content } from "@/lib/api"
import { tasksKey, totalKey, runningTimersKey } from "@/lib/live-resources"
import { useTaskFormOptions } from "@/lib/use-task-form-options"
import { usePermissions } from "@/lib/perms"
import { useRecordActivity } from "@/lib/use-record-activity"
import { useRecordCounts } from "@/lib/use-record-counts"
import { TASK_VIEWS, type RunningTimer, type Task } from "@shared/types"
import { RecordMark } from "@shared/web/record-mark"
import { formatCount } from "@shared/web/format-count"
import { formatDate } from "@shared/web/format"
import { staffNameFromSnapshot } from "@shared/staff-name"
import { RichText } from "@shared/web/rich-text-view"
import { safeHref } from "@shared/web/rich-text"
import { toast } from "@shared/ui/components/sonner/sonner"
import { invalidate, mergePage, primeCache, removeFromPage, useCached, useCachedValue } from "@shared/web/store"
import { useLanguage } from "@shared/web/language"
import { useSessionUserId } from "@/lib/use-active-team"

export function TaskDetailScreen({
  teamId,
  taskId,
  /** The ALL list, not the open one — ticking a task off takes it out of the open
   * collection, so a detail read out of that would answer "that record no longer
   * exists" the instant you used the button on it. Handed in by the host, which
   * already holds it. */
  task,
  loading,
  /** The recipe's own action seam, unchanged: the host owns the write AND the
   * direction (it reads the current status and flips it), so the tick behaves
   * identically to the way it did as `tasks.done`. */
  onToggleDone,
}: {
  teamId: string
  taskId: string
  task: Task | null
  loading: boolean
  onToggleDone: () => void
}) {
  const { t, lang } = useLanguage()
  const myUserId = useSessionUserId()
  const { can } = usePermissions(teamId)
  const canEdit = can("work", "update")
  // The clock asks for the right its own door asks for (`work:create`).
  const canLogTime = can("work", "create")
  /* THE TIMER, NORMALIZED — Aurora's ruling, 18 Sep 2026 ("h3, and aign the
   * menu to the chips"): at a narrow width, Start/Stop timer moves off its
   * own button and into the "…" menu beside Edit/Tick it off. `RecordTimerButton`
   * (below, in `actions`) still draws the wide button unchanged; this second,
   * independent read of the SAME running-timers cache (`useRecordTimerAction`,
   * `@/components/shell/timer-bar`) is what the fold's menu item is built
   * from when the row is narrow — see `shared/web/head-actions.tsx`'s own
   * header, "TWO RENDERS OF THE SAME ACTIONS, NOT ONE NODE PHYSICALLY MOVED".
   *
   * CALLED HERE, AHEAD OF THE TWO EARLY RETURNS BELOW — a hook cannot sit
   * after a conditional return the way `RecordTimerButton` itself, an
   * ordinary child component, safely can — so this reads `task?.status`,
   * the same `done` gate `RecordTimerButton` reads below, computed one
   * optional-chain earlier than the guard that proves `task` non-null. */
  const timerAction = useRecordTimerAction({
    teamId,
    targetTable: "tasks",
    targetId: taskId,
    canLog: canLogTime,
    disabled: task?.status === "done",
    // "START", THE LOGS RAIL'S OWN GLYPH (Aurora's 21 Sep 2026 ruling, beside
    // the mango Done). Every other caller of this shared hook (the ticket
    // head, the story head) leaves both off and keeps the file's own
    // "Start timer" / Play — a per-caller widening, not a rename.
    startLabel: t("Start"),
    startIcon: <Timer className="size-3.5" />,
  })
  // WHETHER THIS TASK'S OWN CLOCK IS RUNNING — the door refuses to close a
  // task while one is (Aurora's 21 Sep 2026 ruling: "cannot mark anything as
  // closed... if there's an active time log running", lib/tasks.ts's
  // `setTaskDone`), so the button says so rather than the person finding out
  // from a toast. Reads the SAME cache key `useRecordTimerAction` above
  // already reads — one request in the air, never two (shared/web/store.ts).
  const runningTimersQ = useCached<RunningTimer[]>(runningTimersKey(teamId), () =>
    content.runningTimers().then((r) => r.timers)
  )
  const timerRunningOnThis = (runningTimersQ.data ?? []).some(
    (x) => x.targetTable === "tasks" && x.targetId === taskId
  )
  const canSeeTime = can("work", "read")
  const activity = useRecordActivity("tasks", taskId)
  // The Time badge, counted when the TASK opens rather than when its tab is
  // clicked — a badge that arrives with the panel is a badge that is missing
  // exactly when it is being read (shared/record-counts.ts).
  useRecordCounts("tasks", taskId)
  const timeTotal = useCachedValue<number | null>(workLogsTotalKey("tasks", taskId))
  // The open tab is remembered per record for as long as this document
  // lives (web/lib/nav-memory.ts) — leaving to another section and coming
  // back lands on the tab she was reading, and a miss lands on "overview".
  const [tab, setTab] = useRemembered("tab", "overview")
  // CORRECTING THE TASK. The pickers come from the same hook the create form
  // uses, so the two forms cannot offer different clients or a different
  // department list; they are read only when this person could open the form at
  // all, the rule every other detail's pickers follow.
  const [editing, setEditing] = React.useState(false)
  const options = useTaskFormOptions(canEdit ? teamId : null)
  // THE DELETE HALF of Aurora's 21 Sep 2026 ruling on this head's own "…"
  // menu. Same `useConfirm` pattern every other destructive action on a
  // bespoke record screen already shares (shared/web/use-confirm.tsx) —
  // called here, ahead of the two early returns below, for the same reason
  // `timerAction` is: a hook cannot sit after a conditional return.
  const { ask: askDelete, run: runDelete, dialog: deleteDialog } = useConfirm()

  // THE CHROME STAYS, ONLY THE PANEL SPINS (RecordChrome's law 4) — rolled out
  // from the help-detail prototype (73414c58). No error branch here: this
  // component is host-fed (`task`/`loading` are props, not this file's own
  // query), and the host exposes no failure state to forward — only loading
  // and "the record does not exist", so only those two are migrated.
  if (loading) return <RecordScreen title={<Skeleton className="h-7 w-48" />} state="loading" />
  if (!task)
    return (
      <RecordScreen
        title={t("Task")}
        state="empty"
        copy={{ emptyTitle: t("That record no longer exists."), emptyDescription: "" }}
      />
    )

  const done = task.status === "done"
  const FileGlyph = fileTypeIcon(task.fileName)

  /** TAKE IT OFF THE LIST — Aurora's 21 Sep 2026 ruling, verbatim: "i need
   * delete actino for tasks on the ... button." NOTHING IS DELETED (team
   * migration 0113, CONVENTIONS.md's deactivate-never-delete): the row and
   * its history stay exactly where they are, the door only stops it
   * appearing on every view and every one of their counts — which is why the
   * record vanishing from THIS SCREEN is the confirmation, not a second
   * message pretending to be one: `task` is sourced from the team's ALL
   * list (`tasksAllQ`, web/lib/use-screen-data.ts), spliced directly below,
   * and this component's own `!task` branch above already reads "that
   * record no longer exists" for exactly that state. */
  function confirmDeleteTask() {
    askDelete({
      title: t("Delete this task?"),
      body: t(
        "It stops showing on every list. Nothing is deleted: the task and its history stay exactly as they are."
      ),
      action: t("Delete"),
      run: () =>
        runDelete(
          async () => {
            const r = await content.deleteTask(taskId)
            // EVERY VIEW, not only the one this screen happened to be
            // reading — a task deleted from its own detail page could have
            // been sitting on any of the seven tabs (overdue, planned, a
            // dated Calendar row…), and `removeFromPage` is a no-op on a
            // view nobody has loaded (shared/web/store.ts).
            for (const view of TASK_VIEWS) removeFromPage(tasksKey(teamId, view), "id", taskId)
            // THE SAME NINE BADGES `tasks.done` PRIMES (web/lib/
            // use-screen-actions.ts) — this reply carries all nine because
            // `deleteTask` reads `withFacets = true`, and a delete can move
            // any of them, not only open/all.
            primeCache(totalKey("tasks", teamId), r.openTotal)
            primeCache(totalKey("tasks-all", teamId), r.allTotal)
            primeCache(totalKey("tasks-overdue", teamId), r.overdueTotal)
            primeCache(totalKey("tasks-planned", teamId), r.plannedTotal)
            primeCache(totalKey("tasks-upcoming", teamId), r.upcomingTotal)
            primeCache(totalKey("tasks-completed", teamId), r.completedTotal)
            primeCache(totalKey("tasks-calendar", teamId), r.calendarTotal)
            primeCache(totalKey("tasks-due-today", teamId), r.dueTodayTotal)
            primeCache(totalKey("tasks-due-today-done", teamId), r.dueTodayDone)
            invalidate(`activity:record:tasks:${taskId}`)
          },
          t("Task deleted."),
          t("Couldn't delete that task.")
        ),
    })
  }

  /* THE FOLD — same shape as `help-detail.tsx`'s own ("h3, and aign the menu
   * to the chips"): below `shared/web/head-actions.tsx`'s own breakpoint,
   * Done/Reopen, the timer and Edit all leave their standalone controls and
   * join the ONE "…" trigger that moves into the chip row, PLUS Delete,
   * which never had a standalone button of its own. Same order the wide row
   * draws its three in — the tick-off, then the timer, then edit — with
   * Delete last, red, and pushed below a separator by the menu itself. This
   * head had no overflow menu at all before this fold: the "…" trigger only
   * exists below the breakpoint. */
  const foldedActions: HeadActionItem[] = [
    // THE MAIN HEAD ACTION, FIRST — Aurora's 21 Sep 2026 ruling: the tick-off
    // is "the main buton", so it leads the row (and this menu) rather than
    // following Edit, the way the ticket head's own primary action leads its
    // row (shared/web/head-actions.tsx, help-detail.tsx).
    ...(canEdit
      ? [
          {
            key: "toggleDone",
            label: done ? t("Reopen") : t("Done"),
            icon: done ? <ArrowUUpLeft className="size-3.5" /> : <Check className="size-3.5" />,
            onSelect: onToggleDone,
            // Same reason the wide row's own Done button shows disabled — the
            // door refuses the close outright while the clock is running.
            disabled: !done && timerRunningOnThis,
          },
        ]
      : []),
    ...(timerAction ? [timerAction] : []),
    ...(canEdit && !done
      ? [
          {
            key: "edit",
            label: t("Edit"),
            icon: <PencilSimple className="size-3.5" />,
            onSelect: () => setEditing(true),
          },
        ]
      : []),
    // DELETE — Aurora's 21 Sep 2026 ruling, the same right Edit and the tick
    // already gate on (`canEdit` is `work:update`, the door `deleteTask`
    // gates on too). Red, and pushed below a separator by
    // `HeadActionsFoldMenu` itself (its own `destructive` grouping).
    ...(canEdit
      ? [
          {
            key: "delete",
            label: t("Delete"),
            icon: <Trash className="size-3.5" />,
            destructive: true,
            onSelect: confirmDeleteTask,
          },
        ]
      : []),
  ]
  const overviewItems = [
    { label: t("Status"), value: done ? t("Done") : t("Open") },
    // R54: a task is assigned to one of ours.
      { label: t("Who has it"), value: staffNameFromSnapshot(task.assigneeName) || t("Nobody yet") },
    // DEADLINE, the same word the tasks table, the sort control and the form
    // all use for this column (CHECKLIST 2.5). It read "Due" here, which is a
    // second word for one fact on the record whose table says the first.
    { label: t("Deadline"), value: task.dueOn ? formatDate(task.dueOn, lang) : "" },
    // A React node, not a string: a rich-text body renders as the formatting
    // somebody typed rather than as its own tags.
    { label: t("Detail"), value: task.detail ? <RichText html={task.detail} /> : "" },
    // THE ONE THING ATTACHED TO IT — the photo of the letter, the form to file.
    //
    // `tasks.file_url` has been written since the day the door shipped: the
    // create route caps the bytes, puts them in the AGENCY's own bucket and
    // stores `/media/internal/<key>` on the row. Nothing in either front door
    // ever read it back — a census of `.fileUrl` reads across web/ and
    // web-portal/ returned zero hits for a task, and the only mention of
    // `fileName` on this screen was the empty string the edit form opens with.
    // So a colleague photographed the letter, attached it, and the record went
    // on saying no file existed.
    //
    // NO NEW RIGHT IS ASKED FOR, and that is a decision rather than an omission.
    // The file is set at CREATE (`work:create`) and no door removes or replaces
    // it, so there is no button here to gate — and the row you are already
    // reading arrived through `work:read`. Inventing a check would hide the file
    // from somebody the door had already handed it to.
    ...(task.fileUrl
      ? [
          {
            label: t("File"),
            value: (
              <a
                // Through the seam, like every other file on a screen — the same
                // treatment knowledge-detail.tsx and staff-panel.tsx give theirs.
                href={safeHref(task.fileUrl) ?? undefined}
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary flex w-fit max-w-full flex-wrap items-center gap-2 underline-offset-2 hover:underline"
              >
                <FileGlyph className="size-4 shrink-0" />
                <span className="min-w-0 truncate">{task.fileName || t("Open the file")}</span>
              </a>
            ),
          },
        ]
      : []),
  ]

  const tabsConfig = {
    ...RECORD_TABS_CONFIG,
    tabs: [
      { value: "overview", label: t("Overview"), icon: "info", badge: "", badgeVariant: "" as const },
      // WORK LOGS, wherever time is tracked (CHECKLIST 6.8). Forty minutes on the
      // quarterly VAT return costs the agency what forty minutes of delivery
      // costs, which is why `tasks` has been a work-log target all along — and
      // why a task that could be timed and never showed the hours was a
      // capability the code had and no screen finished.
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
      // NO ACTIVITY TAB (client, 2026-09-06 · 2026-09-07) — a task's history is
      // reached from the ink footer's Latest activity column now, and opens in a
      // slide-in off it. web/components/records/activity-panel.tsx carries the ruling.
    ],
  }

  return (
    <RecordScreen
      // A DELIBERATE MARK, NEVER AN EMPTY SLOT. This record has no picture and
      // its type carries no glyph, so the square holds the record's own initial —
      // the same box, the same size, the same slot every other record uses
      // (shared/web/record-mark.tsx). Before this, four of the eleven record
      // screens opened with a bare title while the other seven led with a mark,
      // which is the drift a reader feels and never reports.
      leading={<RecordMark name={task.title} size="band" />}
      // NO EYEBROW — client ruling, 2026-09-03, verbatim: "I want you to remove
      // the eyebrow on the title on main screens. Remove that eyebrow, kill it."
      // The prop this line used to pass is deleted from `RecordScreen` itself
      // (record-chrome.tsx says why it had outlived the 2026-09-01 ruling that
      // took the eyebrow out of the full header); the breadcrumb above this
      // header is what names the record type now.
      // NO third, parent-container pill: a task is "our own internal admin,
      // not for an account's delivery" (glossary), so it has none to point at.
      // NO `recordNumber` — the 2026-08-31 ruling puts a task in the same
      // category as a process, a role or a dropdown value: agency-internal
      // admin nobody quotes, so it mints no reference at all (`task.ref` is
      // always null going forward; a handful of pre-ruling rows may still
      // carry the old, never-shown "K####" and are not worth a black chip
      // either).
      // NO `collectionLabel` — client correction, 2026-08-31, verbatim:
      // "now it also show 'meeting' as a tag! thats not a tg but the eyebrow
      // remember. not only for meetings, but everywhere." This used to repeat
      // `t("Task")` a second time as a chip, directly under the eyebrow that
      // already says it.
      // THE SECOND PILL, WITH A COLOUR (client ruling, 2026-08-31: "the status
      // scheme is not only for tickets … map colors"). A task's only two
      // states are open and done — `archived` for "not done yet" (the
      // "Not started" tier every other lifecycle in the app reads this way),
      // `shipped` once ticked (closed, successfully).
      chips={
        <>
          <Badge variant="status" dot={done ? "shipped" : "archived"}>
            {done ? t("Done") : t("Open")}
          </Badge>
          {/* THE FOLDED TRIGGER, ON THE CHIP ROW'S OWN LINE — same wiring as
              `help-detail.tsx`'s own ("aign the menu to the chips"). */}
          <HeadActionsFoldMenu items={foldedActions} label={t("More actions")} />
        </>
      }
      title={task.title}
      // THE ASSIGNEE LINE IS GONE — CLIENT RULING, 2026-08-31, VERBATIM:
      // "what is this 3rd component in the title under the chips? kill
      // everywhere. chips is the last component of headers!" `status`
      // mapped to `RecordChrome`'s `meta`, drawn directly under the chips
      // row (`data-record-region="header"`). Not lost: it's already a row
      // in the Overview tab (`overviewItems`: "Who has it").
      actions={
        <div data-slot="head-actions-row" className={HEAD_ACTIONS_ROW_CLASS}>
          {/* THE MAIN HEAD ACTION, FIRST — Aurora's 21 Sep 2026 ruling,
              verbatim: "in task the main buton is mark as odne, tick it
              off. finde shorter alr¡ternative for the word, and make the
              button mango." "Done" is the same one word the story and
              ticket states already use (the glossary's own word, R34); the
              kit `Button`'s DEFAULT variant is the mango primary (R84 — this
              is `RecordScreen`'s own `actions` slot), so leaving `variant`
              off IS "make the button mango". Once done it reads "Reopen" as
              a secondary, the same two directions the door has always taken,
              still no confirm: nothing is lost either way. DISABLED, WITH A
              REASON, WHILE THIS TASK'S OWN CLOCK RUNS — Aurora's ruling the
              same day: "cannot mark anything as closed... if there's an
              active time log running" (`setTaskDone`, lib/tasks.ts, answers
              409 either way; this is the screen saying so before the click
              rather than after). Same `Tooltip`-around-a-disabled-`Button`
              shape story-detail.tsx's own "Done" already uses for its build-
              notes-required case. */}
          {canEdit && !done && timerRunningOnThis ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button disabled className="gap-1">
                    <Check className="size-3.5" />
                    {t("Done")}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{t("Stop the timer first.")}</TooltipContent>
            </Tooltip>
          ) : (
            canEdit && (
              <Button variant={done ? "secondary" : "default"} onClick={onToggleDone} className="gap-1">
                {done ? <ArrowUUpLeft className="size-3.5" /> : <Check className="size-3.5" />}
                {done ? t("Reopen") : t("Done")}
              </Button>
            )
          )}
          {/* A task that is already ticked off has nothing left to time. */}
          <RecordTimerButton
            teamId={teamId}
            targetTable="tasks"
            targetId={taskId}
            canLog={canLogTime}
            disabled={done}
            startLabel={t("Start")}
            startIcon={<Timer className="size-3.5" />}
          />
          {/* CORRECT IT. There was no edit door at all until 19 Aug 2026, so this
              button had nothing to open: a task could be written and ticked and
              nothing else, and the two ticks the priority score is derived from
              were fixed at the moment somebody typed it. A ticked task is a
              record of something that happened — the door refuses one, and the
              button stands down rather than opening a form that will be
              rejected. */}
          {/* ICON-ONLY (client ruling, 2026-08-31: "edit, only the pencil
              icon") — the same `size="icon"` + `aria-label` shape every other
              standalone Edit control in this app already draws (RecordActionsMenu's
              own trigger, work-logs-panel.tsx, time-panel.tsx). */}
          {canEdit && !done && <EditPenButton onClick={() => setEditing(true)} label={t("Edit")} />}
        </div>
      }
      // D7 / CHECKLIST 11.3 — who made it and when, now the kit's own ink
      // footer's Record column.
      audit={{ createdByName: task.createdByName, createdAt: task.createdAt }}
      activity={activity}
      onAddNote={can("work", "create") ? activity.addNote : undefined}
      notePlaceholder={t("Add a note")}
    >
      <TabsView
        className={STICKY_TABS}
        config={tabsConfig}
        value={tab}
        onValueChange={setTab}
        renderPanel={(panel) => {
          if (panel.value === "time")
            return (
              <WorkLogsPanel
                targetTable="tasks"
                targetId={taskId}
                recordLabel={task.title}
                canEdit={canEdit}
                canLog={canLogTime}
                onActivityChanged={() => invalidate(`activity:record:tasks:${taskId}`)}
              />
            )
          return <OverviewList items={overviewItems} />
        }}
      />

      <TaskFormDialog
        open={editing}
        onOpenChange={setEditing}
        draftKey={`task:edit:${taskId}`}
        teamId={teamId}
        members={options.members}
        apps={options.apps}
        accounts={options.accounts}
        departments={options.departments}
        // THE SIGNED-IN USER — not the stored assignee. Only matters when
        // `initial.assigneeId` below is empty (an old task with no assignee
        // on file): the form dialog falls back to this rather than opening
        // on the one state its picker can no longer draw (16 Sep 2026 ruling).
        defaultAssigneeId={myUserId ?? ""}
        // THE TASK AS IT STANDS. The door replaces every field with what arrives,
        // so the form has to open holding the whole task — a blank form would
        // clear the four fields nobody touched.
        initial={{
          title: task.title,
          detail: task.detail ?? "",
          dueOn: task.dueOn ?? "",
          assigneeId: task.assigneeId ?? "",
          department: task.department ?? "",
          appId: task.appId ?? "",
          accountId: task.accountId ?? "",
          important: task.important,
          urgent: task.urgent,
          fileDataUrl: "",
          fileName: "",
        }}
        onSubmit={async (values: TaskFormValues) => {
          const { tasks } = await content.updateTask({
            id: taskId,
            title: values.title,
            detail: values.detail || undefined,
            dueOn: values.dueOn || undefined,
            assigneeId: values.assigneeId || undefined,
            accountId: values.accountId || undefined,
            appId: values.appId || undefined,
            department: values.department || undefined,
            important: values.important,
            urgent: values.urgent,
          })
          mergePage(tasksKey(teamId), "id", tasks as unknown as Record<string, unknown>[])
          invalidate(`activity:record:tasks:${taskId}`)
          toast.success(t("Task updated."))
        }}
      />
      {deleteDialog}
    </RecordScreen>
  )
}
