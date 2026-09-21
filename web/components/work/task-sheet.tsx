"use client"

// THE TASK SLIDE-IN — Aurora's decision, verbatim, 21 Sep 2026: "implement the
// slide-in design for tasks, only 1 change: the start button on the left and
// the done on the right (keep done yellow). remove the status chip and
// replace for priority chip." Built off the side-by-side proposal at
// task-slide-in-design.html, one screen, no tabs, everything that used to be
// Overview + Work logs reading top to bottom in a single scroller — the same
// shape `web/components/tickets/reply-edit-sheet.tsx` and
// `web/components/work/story-build-notes-sheet.tsx` already use for a sheet
// over a record, except this one is a READ view (with a Start/Done head, not
// a Save), so it is built straight on the kit's own `Sheet`/`SheetContent`
// rather than `FormShellDialog` (that wrapper's Cancel/Submit footer has no
// job here).
//
// REPLACES `task-detail.tsx`, RATHER THAN REDIRECTING TO IT. The old
// tabbed full-page detail screen is deleted outright: `/t/<teamId>/tasks/<id>`
// now renders the SAME task list (`renderCollection`, deep-link/module-
// content.tsx) with this sheet open over it, driven by the URL's own record
// id — a deep link still opens the sheet, it just no longer leaves the list
// behind to do it. See that file's own header for the registry/test fallout
// this retirement carried (STORED_FILES, the head-actions census, R86's
// PriorityChip key).
//
// ONE "…" MENU, NOT A RESPONSIVE FOLD. `task-detail.tsx` carried two
// definitions of its own head actions (a wide persistent row plus a narrow
// `HeadActionsFoldMenu`, `shared/web/head-actions.tsx`) because a bespoke
// detail screen can be read at any pane width. A sheet cannot: it is a fixed
// `clamp(26.25rem,34vw,40rem)` column (the same width `FormShellDialog`
// already settled on, 2026-08-31's own note), so there is only ever one
// shape to draw — Start and Done stand on their own, and Delete lives in one
// `RecordActionsMenu`, always visible, never folded.
//
// THE "…" MENU SITS ON THE TITLE ROW NOW, NOT THE CHIPS ROW — Aurora's
// ruling, 22 Sep 2026, verbatim: "on slide in detail pages, the ... button
// must be aligned with title, not with pills." And Edit is OUT of that menu
// entirely, its own icon button (`size="icon"`, R98) beside the "…", same
// ruling: "bring the pencil icon out of the ..., next to it." The menu keeps
// only Delete.
//
// THE PRIORITY CHIP REPLACES STATUS IN THE TITLE ROW, on Aurora's own words
// above. `PriorityChip` is DEFINED HERE (moved off `tasks-screen.tsx`, which
// now imports it back) so this file has no dependency on that one — the
// board/table/week views there already draw the identical chip through the
// same import, never a second copy.
//
// THE SHEET SCROLLS AS ONE REGION (R91's own sheet exception) — chip row,
// title, Start/Done, Assigned to, Deadline, Description, Effort and the dark
// footer band all sit inside the one scrolling body, the same shape the
// design proposal drew (nothing pinned inside the sheet itself, only the
// sheet's OWN edge is fixed against the viewport). Assigned to, Deadline and
// Description are three cards of ONE design now (Aurora, 22 Sep 2026), the
// same `TicketSidePanel` shape the ticket's own side panels draw — see this
// file's own body for the account.
//
// EFFORT IS THE SHARED `EffortCard` NOW (web/components/work/effort-card.tsx)
// — the same card the story page and the ticket page draw (title "Effort"
// with the hours count beside it, per-log rows with faces, load-more, no add
// button), swapped in for the `WorkLogsPanel` read-only stand-in this sheet
// carried until it landed. A task has no metrics door of its own (no cycle-
// time clock, no status-event trail — those are a story's and a ticket's own
// "done" moments), so `metrics` is left off the call entirely: `EffortCard`'s
// own three-line grid (Cycle time / Effort / Flow efficiency) does not draw
// at all, rather than three placeholder sentences for a concept a task does
// not have, and the title's own hour count falls back to the card's own
// generic `workLogSummary` read instead of a caller-supplied figure (see that
// file's own header for the reasoning).

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"
import { CardTitle } from "@shared/ui/components/card/card"
import { Sheet, SheetContent, SheetTitle } from "@shared/ui/components/sheet/sheet"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/components/tooltip/tooltip"
import { Check, ArrowUUpLeft, PencilSimple, Trash } from "@shared/ui/foundations/icons"

import { RecordActionsMenu, RecordFooterBand, type RecordAction } from "@/components/records/record-chrome"
import { OverviewList } from "@/components/records/overview-list"
import { RecordTimerButton } from "@/components/shell/timer-bar"
import { TicketSidePanel } from "@/components/tickets/ticket-detail-body"
import { EffortCard } from "@/components/work/effort-card"
import { TaskFormDialog, type TaskFormValues } from "@/components/work/task-form-dialog"
import { useTaskFormOptions } from "@/lib/use-task-form-options"
import { usePermissions } from "@/lib/perms"
import { useRecordActivity } from "@/lib/use-record-activity"
import { useSessionUserId } from "@/lib/use-active-team"
import { content, tenancy } from "@/lib/api"
import { listFetch, tasksKey, totalKey, runningTimersKey } from "@/lib/live-resources"
import type { ScreenActionContext } from "@shared/web/screen-engine/screen-renderer"
import { useConfirm } from "@shared/web/use-confirm"
import { clampRecordHeading } from "@shared/web/record-heading"
import { fileTypeIcon } from "@shared/web/screen-engine/file-type-icon"
import { formatDate } from "@shared/web/format"
import { invalidate, mergePage, primeCache, removeFromPage, useCached } from "@shared/web/store"
import { nameInitials } from "@/lib/identity"
import { PersonCard } from "@shared/web/person-card"
import { RichText } from "@shared/web/rich-text-view"
import { safeHref } from "@shared/web/rich-text"
import { staffNameFromSnapshot } from "@shared/staff-name"
import { toast } from "@shared/ui/components/sonner/sonner"
import { useLanguage } from "@shared/web/language"
import { PRIORITY_DOT_TONE } from "@shared/departments"
import { TASK_VIEWS, type RunningTimer, type Task, type TeamMember } from "@shared/types"

/** THE FOUR PRIORITY LEVELS, IN WORDS — literal `t("…")` calls, the same
 * reason `tasks-screen.tsx`'s own (now-moved) copy of this gave: a dynamic
 * key looks up words the catalogue's extraction walk never sees (R28 only
 * reads literal `t("…")` positions), so `PRIORITY_LABEL`'s English strings
 * would ship untranslated. Exported so `tasks-screen.tsx` reads the one copy
 * back rather than keeping its own. */
export function priorityWord(t: (s: string) => string, level: 1 | 2 | 3 | 4): string {
  if (level === 1) return t("Whenever")
  if (level === 2) return t("Urgent")
  if (level === 3) return t("Important")
  return t("Do it now")
}

/** THE PRIORITY CHIP — "Priority (has a color here)", the client's own
 * words. `Badge variant="status" dot={…}` is the exact seam a task's status
 * chip used to colour itself through; K19a's own four tones
 * (`PRIORITY_DOT_TONE`) are the reason this is allowed to be a coloured chip
 * at all (R86's one named exception besides status itself,
 * `COLOURED_CHIP_OK["web/components/work/task-sheet.tsx#PriorityChip"]`).
 * MOVED HERE 21 Sep 2026 off `tasks-screen.tsx` — this sheet's own title row
 * needed it first, and a caller in the OTHER file importing it back is a
 * cleaner dependency than this file reaching into that one (which itself now
 * needs to mount `<TaskSheet>`, so the reverse direction would be circular). */
export function PriorityChip({ level, t }: { level: 1 | 2 | 3 | 4; t: (s: string) => string }) {
  return (
    <Badge variant="status" dot={PRIORITY_DOT_TONE[level]}>
      {priorityWord(t, level)}
    </Badge>
  )
}

// THE SHEET'S OWN SCROLLING BODY — R91's named overlay exception
// (`NO_NESTED_SCROLL_EXEMPT["web/components/work/task-sheet.tsx#min-h-0
// flex-1 overflow-y-auto overscroll-contain px-6 py-6"]`, this class list
// verbatim, at BOTH its call sites below — written inline rather than
// hoisted into a shared constant, on purpose: the census reads the literal
// class-list string sitting inside a `className={…}` JSX attribute, so a
// name that only resolves back to it through a variable reference would
// read as clean to a check that never resolves identifiers, which is
// exactly the kind of accidental evasion this file does not want to be an
// example of. Everything from the chip row to the dark footer band lives
// inside it; nothing in this sheet is pinned.

export function TaskSheet({
  teamId,
  taskId,
  open,
  onOpenChange,
  onAction,
}: {
  teamId: string
  /** `null` while nothing is open — the sheet still mounts (so its own close
   * animation can play), reading whatever task it last held. */
  taskId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** THE SAME DISPATCH `TasksScreen` ALREADY HOLDS — `tasks.done` is not a
   * write this sheet owns; the host (`deep-link-screen.tsx`'s `onAction`)
   * does, exactly as it always has for the tick. Forwarded straight through
   * rather than rebuilt, so there is one definition of what marking a task
   * done means, not two. */
  onAction: (actionId: string, ctx: ScreenActionContext) => void
}) {
  const { t, lang } = useLanguage()
  const myUserId = useSessionUserId()
  const { can } = usePermissions(teamId)
  const canEdit = can("work", "update")
  const canLogTime = can("work", "create")

  // THE LAST REAL TASK THIS SHEET HELD — the same "remember through the close
  // transition" shape `reply-edit-sheet.tsx`'s own `last`/`r` pair takes, so
  // the sheet's content does not blank out mid-close while it slides away.
  const [lastId, setLastId] = React.useState<string | null>(taskId)
  React.useEffect(() => {
    if (taskId) setLastId(taskId)
  }, [taskId])
  const id = taskId ?? lastId

  // THE "ALL" TASKS LIST — the same cache key `use-screen-data.ts`'s own
  // `tasksAllQ` already reads whenever a task record id is in the URL, so
  // this is a second CALLER of that key, never a second door (the store
  // dedupes by key, CACHING.md). Reading it here (rather than threading a
  // `tasksAllQ` prop down through `TasksScreen`) keeps this file self-
  // contained: a task can be opened by id from a row that is only in the
  // CURRENTLY selected view's own loaded page, and this list carries every
  // task regardless of which tab the list is showing.
  const tasksAllQ = useCached<Task[]>(id ? tasksKey(teamId, "all") : null, () => listFetch.tasks(teamId, "all"))
  const task = (tasksAllQ.data ?? []).find((r) => r.id === id) ?? null
  const loading = !!id && tasksAllQ.data === undefined

  const runningTimersQ = useCached<RunningTimer[]>(id ? runningTimersKey(teamId) : null, () =>
    content.runningTimers().then((r) => r.timers)
  )
  const timerRunningOnThis = (runningTimersQ.data ?? []).some(
    (x) => x.targetTable === "tasks" && x.targetId === id
  )

  // THE TEAM'S OWN LOGINS — for the Effort card's per-row face (R35/R90),
  // `memberFace(members, userId)`. Same `members:<teamId>` key
  // `story-detail.tsx`/`help-detail.tsx` already read for the identical
  // reason (R56: one door, dedupe by key), not gated on `canEdit` — a
  // read-only login still sees whose time is whose.
  const membersQ = useCached<TeamMember[]>(id ? `members:${teamId}` : null, () =>
    tenancy.members().then((r) => r.members)
  )

  const activity = useRecordActivity("tasks", id)
  const options = useTaskFormOptions(canEdit ? teamId : null)
  const [editing, setEditing] = React.useState(false)
  const { ask: askDelete, run: runDelete, dialog: deleteDialog } = useConfirm()

  if (!id) return null
  const done = task?.status === "done"

  function toggleDone() {
    if (!task) return
    onAction("tasks.done", { id: task.id, record: { id: task.id, status: task.status === "done" ? "Done" : "Open" } })
  }

  function confirmDeleteTask() {
    if (!task) return
    const taskId2 = task.id
    askDelete({
      title: t("Delete this task?"),
      body: t(
        "It stops showing on every list. Nothing is deleted: the task and its history stay exactly as they are."
      ),
      action: t("Delete"),
      run: () =>
        runDelete(
          async () => {
            const r = await content.deleteTask(taskId2)
            for (const view of TASK_VIEWS) removeFromPage(tasksKey(teamId, view), "id", taskId2)
            primeCache(totalKey("tasks", teamId), r.openTotal)
            primeCache(totalKey("tasks-all", teamId), r.allTotal)
            primeCache(totalKey("tasks-overdue", teamId), r.overdueTotal)
            primeCache(totalKey("tasks-planned", teamId), r.plannedTotal)
            primeCache(totalKey("tasks-upcoming", teamId), r.upcomingTotal)
            primeCache(totalKey("tasks-completed", teamId), r.completedTotal)
            primeCache(totalKey("tasks-calendar", teamId), r.calendarTotal)
            primeCache(totalKey("tasks-due-today", teamId), r.dueTodayTotal)
            primeCache(totalKey("tasks-due-today-done", teamId), r.dueTodayDone)
            invalidate(`activity:record:tasks:${taskId2}`)
            onOpenChange(false)
          },
          t("Task deleted."),
          t("Couldn't delete that task.")
        ),
    })
  }

  // DELETE ONLY — Edit left this menu 22 Sep 2026 (Aurora's ruling, this
  // file's own header) for its own icon button beside the "…" on the title
  // row.
  const actions: RecordAction[] = canEdit
    ? [
        {
          key: "delete",
          label: t("Delete"),
          icon: <Trash className="size-3.5" />,
          destructive: true,
          onSelect: confirmDeleteTask,
        },
      ]
    : []

  const assigneeName = task ? staffNameFromSnapshot(task.assigneeName) : null
  const FileGlyph = task ? fileTypeIcon(task.fileName) : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showClose={false}
        className="w-[clamp(26.25rem,34vw,40rem)] max-w-[min(100%,40rem)] p-0"
      >
        <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius)]">
          {loading || !task ? (
            <div data-slot="task-sheet-scroll" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
              {/* Radix wants a Title registered somewhere in the content even
                  while the record is still loading — sr-only, said again
                  visibly once the real title renders below. */}
              <SheetTitle className="sr-only">{t("Task")}</SheetTitle>
              <Skeleton variant="list" lines={6} />
            </div>
          ) : (
            <div data-slot="task-sheet-scroll" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
              <div className="flex flex-col gap-6">
                {/* TITLE ROW — priority chip, never status (Aurora, 21 Sep
                    2026), on its own line; the title, the Edit pencil and
                    the "…" menu share the line below it, the pencil and menu
                    aligned WITH THE TITLE, never with the chip (Aurora, 22
                    Sep 2026, this file's own header). Always visible, no
                    fold — this sheet has no width to fold at. */}
                <div className="flex flex-col gap-3" data-slot="task-sheet-title-row">
                  <div className="flex items-center gap-2">
                    <PriorityChip level={task.priority} t={t} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <SheetTitle className="min-w-0 flex-1 text-2xl font-bold text-foreground">
                      {clampRecordHeading(task.title)}
                    </SheetTitle>
                    <div className="flex shrink-0 items-center gap-2">
                      {/* A DONE task has no edit door (task-detail.tsx's own
                          reasoning: "a ticked task is a record of something
                          that happened"). */}
                      {canEdit && !done && (
                        <Button
                          variant="secondary"
                          size="icon"
                          aria-label={t("Edit")}
                          onClick={() => setEditing(true)}
                        >
                          <PencilSimple className="size-4" />
                        </Button>
                      )}
                      <RecordActionsMenu actions={actions} />
                    </div>
                  </div>
                </div>

                {/* START, LEFT — DONE, RIGHT (mango). Aurora, 21 Sep 2026,
                    the one change over the proposal: "the start button on
                    the left and the done on the right (keep done yellow)." */}
                <div className="flex flex-wrap gap-3" data-slot="task-sheet-actions">
                  <RecordTimerButton
                    teamId={teamId}
                    targetTable="tasks"
                    targetId={task.id}
                    canLog={canLogTime}
                    disabled={done}
                  />
                  {/* R99 — no record closes while its own clock runs.
                      Mirrors the door's own refusal (`setTaskDone`,
                      workers/content/src/lib/tasks.ts). */}
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
                      <Button variant={done ? "secondary" : "default"} onClick={toggleDone} className="gap-1">
                        {done ? <ArrowUUpLeft className="size-3.5" /> : <Check className="size-3.5" />}
                        {done ? t("Reopen") : t("Done")}
                      </Button>
                    )
                  )}
                </div>

                {/* ASSIGNED TO, DESCRIPTION AND DEADLINE — three sections of
                    ONE design (Aurora, 22 Sep 2026, this file's own header:
                    "assigned to needs a background, same description, same
                    deadline" / "description and deadline same design"): each
                    a kit `Card` standing on the panel background, a small
                    title, the content — the exact `TicketSidePanel` shape
                    the ticket's own side panels already draw
                    (`ticket-detail-body.tsx`), reused rather than
                    reinvented, the same seam `story-detail.tsx` and
                    `help-stakeholders.tsx` already stand on. */}

                {/* ASSIGNED TO — read-only: editing the assignee is the
                    form's own field now (`task-form-dialog.tsx`), reached
                    through the pencil above. It keeps its own eyebrow tile
                    (the Stakeholders-style `PersonCard`,
                    `help-stakeholders.tsx`'s `StakeholderTile`) inside the
                    card, Aurora's own words. */}
                <div data-slot="task-assignee-card">
                  <TicketSidePanel title={t("Assigned to")}>
                    <PersonCard
                      orientation="horizontal"
                      size="row"
                      mark={nameInitials(assigneeName ?? "")}
                      markName={assigneeName ?? undefined}
                      chip={<span className="text-micro text-muted-foreground uppercase">{t("Assigned to")}</span>}
                      title={
                        <CardTitle className="text-sm">
                          {assigneeName || t("Nobody yet.")}
                        </CardTitle>
                      }
                    />
                  </TicketSidePanel>
                </div>

                {/* DEADLINE — its own card now, the priority fact row it
                    used to sit beside is GONE (the title row's own priority
                    chip already says it, Aurora: "priority is already a
                    chip, remove it from above deadline"). */}
                <div data-slot="task-deadline-card">
                  <TicketSidePanel title={t("Deadline")}>
                    <p className="text-sm text-foreground">
                      {task.dueOn ? formatDate(task.dueOn, lang) : t("No deadline set.")}
                    </p>
                  </TicketSidePanel>
                </div>

                {/* THE FILE — when the task carries one. R40 pins its render
                    to THIS file now that task-detail.tsx is gone. Not one of
                    the three named cards, so it keeps the plain
                    `OverviewList` fact-row shape it always had. */}
                {task.fileUrl && (
                  <OverviewList
                    items={[
                      {
                        id: "file",
                        label: t("File"),
                        value: (
                          <a
                            href={safeHref(task.fileUrl) ?? undefined}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-primary flex w-fit max-w-full flex-wrap items-center gap-2 underline-offset-2 hover:underline"
                          >
                            {FileGlyph && <FileGlyph className="size-4 shrink-0" />}
                            <span className="min-w-0 truncate">{task.fileName || t("Open the file")}</span>
                          </a>
                        ),
                      },
                    ]}
                  />
                )}

                {/* DESCRIPTION — the third of the three matching cards. */}
                {task.detail && (
                  <div data-slot="task-description-card">
                    <TicketSidePanel title={t("Description")}>
                      <RichText html={task.detail} />
                    </TicketSidePanel>
                  </div>
                )}

                {/* EFFORT — see this file's own header, "EFFORT IS THE
                    SHARED `EffortCard` NOW". Its own title ("Effort", the
                    hours count beside it) and its own card draw both, so
                    nothing wraps it here. */}
                <EffortCard targetTable="tasks" targetId={task.id} canEdit={canEdit} members={membersQ.data} />

                {/* THE DARK FOOTER BAND — Latest activity + Record, the same
                    kit composition every other record's own footer draws
                    through (`record-chrome.tsx`'s `RecordFooterBand`), the
                    very last thing in the sheet's own scroller. */}
                <RecordFooterBand
                  audit={{ createdByName: task.createdByName, createdAt: task.createdAt }}
                  activity={activity}
                  onAddNote={can("work", "create") ? activity.addNote : undefined}
                  notePlaceholder={t("Add a note")}
                />
              </div>
            </div>
          )}
        </div>
      </SheetContent>

      {task && (
        <TaskFormDialog
          open={editing}
          onOpenChange={setEditing}
          draftKey={`task:edit:${task.id}`}
          teamId={teamId}
          members={options.members}
          apps={options.apps}
          accounts={options.accounts}
          departments={options.departments}
          defaultAssigneeId={myUserId ?? ""}
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
              id: task.id,
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
            mergePage(tasksKey(teamId, "all"), "id", tasks as unknown as Record<string, unknown>[])
            invalidate(`activity:record:tasks:${task.id}`)
            toast.success(t("Task updated."))
          }}
        />
      )}
      {deleteDialog}
    </Sheet>
  )
}
