"use client"

// TASKS — the agency's own admin, and beside it what we are waiting on clients
// for. Two collections on one screen, and the pairing is the point: they are the
// same shape and opposite audiences, so showing them together is what stops
// somebody raising the wrong one. "Ours to do" is the list; "waiting on them" is
// the panel under it, which is the only place in the agency app that writes a row
// a client will read — so its button says so.
//
// A to-do gets no section of its own for the same reason meeting purposes get
// none: it is the other half of one idea, and a rail that lists both halves reads
// as two ideas.
//
// ── THE TAB STRIP, REDESIGNED 2026-09-15 ────────────────────────────────────
//
// The client's ruling, verbatim: "For tasks in tab 'Overdue', I want the board
// view by priority. This would be the secondary view. The main view would be a
// table, and this is my tasks. This is my overdue tasks. Put the table, and the
// columns would be: Task / Priority (has a color here) / Deadline / Department /
// Account / App / Whatever you think relevant. Filters by priority, by
// department. For the tab 'Completed', I want the view table only. Kill the tabs
// 'List' and 'Calendar' and replace them with a new tab called 'Planned' or
// something like this. You choose the word. Here, I would like a table view to
// be the main one, and then, as a secondary option, a board by priority and a
// calendar by deadline. Also kill upcoming."
//
// THREE TABS, PLUS A FOURTH FOR WHOEVER MAY SEE EVERYONE'S — Overdue, Planned,
// Completed and (gated) Everyone's, each a SERVER view (R14/R16): the list is
// capped/paged, so sieving loaded rows for the overdue ones would show "the
// overdue among the newest N" under a badge counting all of them.
//
// PLANNED, DEFINED PRECISELY (the word is this file's choice; the client asked
// for "Planned or something like this"): every OPEN task that is NOT overdue,
// whether or not it has a deadline at all — the exact complement of Overdue
// among the open ones. It is NOT the old "Upcoming" view (dated, not yet due):
// an undated open task belongs on Planned and never belonged on Upcoming, which
// is why the door grew a new view (`planned`, `shared/types.ts`'s `TASK_VIEWS`,
// `workers/content/src/lib/tasks.ts`'s `viewClause`) rather than relabelling the
// old one. `upcoming` and `calendar` stay defined on the door — R38's by-id
// lookup and other consumers still use `all`, and deleting a door vocabulary
// nothing else asked to lose is a bigger, riskier change than this pass makes —
// they simply have no tab pointing at them any more.
//
// EACH TAB OFFERS ITS OWN VIEWS, through the toolbar's `view` slot (R53) rather
// than a fixed body per tab: Overdue is Table (default) + Board by priority;
// Planned is Table (default) + Board by priority + Calendar by deadline;
// Completed is Table only; Everyone's is Table (default) + Board by priority,
// the same pair Overdue offers. All views within one tab read the SAME loaded
// page — search and the priority/department filters narrow it once, and every
// view draws from the narrowed result, so switching Table→Board keeps what you
// typed.
//
// ONE TOOLBAR PER TAB (R48/R50/R53/R63), never a second row beside it: search,
// then the priority/department filters, then the view switch, then "New task" —
// exactly the row `<ToolbarRow>` already draws for every other collection in
// the app. SORT IS EXEMPTED (`TOOLBAR_SORT_EXEMPT`, keyed to this component):
// the Table view orders by its own column headers, the Board's order is the
// grouping itself, and the Calendar's order is the day a task falls on — none
// of the four tabs' views has a second question a sort control could answer.
//
// THE BOARD IS EDITABLE. `content.updateTask` already exists and replaces the
// two ticks (`important`/`urgent`) that derive `priority` — the same door the
// edit form writes through — so a drop is not a gap to leave read-only (contrast
// the tickets board, whose stages are flipped by OTHER events and would be
// undone by the next one to touch the ticket). Dragging a card sends the task's
// whole current shape back with the two ticks set for the column it landed in;
// see `movePriority` below. Gated on `work:update`, same as every other task
// edit — on Everyone's too, where it means correcting somebody ELSE's task.
//
// "THIS IS MY TASKS" — AND THE FOURTH TAB IS EVERYONE'S. Overdue/Planned/
// Completed all narrow to the caller's own tasks unless they hold
// `all_tasks:read` — a DOOR decision (`getTasks`,
// workers/content/src/routes/todos.ts), unchanged by this pass. The fourth tab
// is that SAME status-agnostic `all` view the six-tab strip used to draw as
// "All tasks" — not retired, RENAMED: the client's separate ruling ("replace
// the tab 'All' with 'Everyone's'") reads as a rename, not a deletion, once the
// tab is read as the team-wide counterpart to the first three MINE ones rather
// than as a sixth, now-redundant status filter. It is shown only when
// `seesEveryones` (`all_tasks:read`) is true — a caller without the right
// cannot narrow past their own name at the door anyway, so a tab that would
// answer identically to Overdue+Planned+Completed combined is not offered. On
// this one tab the two-word ruling and the door's own narrowing finally name
// the same thing, which is why it is the one case where the WORD "Everyone's"
// belongs on a tab rather than only in the progress strip's caption ("these
// are the tasks assigned to you — seeing everyone's is a separate access
// right", unchanged, and still the sentence every OTHER tab relies on).

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Badge } from "@shared/ui/components/badge/badge"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { toast } from "@shared/ui/components/sonner/sonner"
import { KpiProgress } from "@shared/ui/components/kpi-progress/kpi-progress"
import { SearchInput } from "@shared/ui/components/search-input/search-input"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import { Kanban, type KanbanColumn, type KanbanMove } from "@shared/ui/components/kanban/kanban"
import {
  ListBullets,
  Kanban as KanbanGlyph,
  CalendarBlank,
} from "@shared/ui/foundations/icons"
import type {
  ScreenActionContext,
  ScreenIntent,
} from "@shared/web/screen-engine/screen-renderer"
import type { ScreenRecipe, ScreenRights } from "@shared/web/screen-engine/recipe"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import { type CollectionConfig, type FilterFacet } from "@shared/web/screen-engine/config"
import { useFilterBar } from "@shared/web/screen-engine/filter-bar"
import { ClipboardText } from "@shared/ui/foundations/icons"

import { defaultTabsConfig } from "@shared/web/screen-engine/tabs-view"

import { CollectionHeading } from "@/components/records/collection-heading"
import { ModuleSettingsGear } from "@/components/screens/module-settings-screen"
import { CountedAbove } from "@/components/records/counted-tabs"
import { RecordCalendar, type CalendarEntry } from "@/components/records/record-calendar"
import {
  RecordTable,
  visibleActions,
  type TableColumn,
  type TableRowData,
} from "@/components/records/record-table"
import {
  SectionWithCreate,
  AddButton,
  ToolbarRow,
  type ToolbarViewSlot,
} from "@/components/deep-link/screen-bits"
import { TaskFormDialog, type TaskFormValues } from "@/components/work/task-form-dialog"
import { useTaskFormOptions } from "@/lib/use-task-form-options"
import { TodoFormDialog, type TodoFormValues } from "@/components/work/todo-form-dialog"
import { TodosPanel } from "@/components/work/work-panels"
import { content as contentApi } from "@/lib/api"
import { LoadMore } from "@/components/records/load-more"
import { usePermissions } from "@/lib/perms"
import { listFetch, tasksKey, todosKey, type TaskView } from "@/lib/live-resources"
import { field, translateFields, withDataDrivenCollection } from "@/lib/screens"
import { departmentGlyph, PRIORITY_DOT_TONE } from "@shared/departments"
import { TASK_VIEWS, type Task } from "@shared/types"
import { formatCount } from "@shared/web/format-count"
import { formatDate } from "@shared/web/format"
import { staffNameFromSnapshot } from "@shared/staff-name"
import { RecordMark } from "@shared/web/record-mark"
import { invalidate, useCached } from "@shared/web/store"
import { useLanguage } from "@shared/web/language"
import { useRemembered } from "@shared/web/remembered"
import type { Language } from "@shared/i18n"

/** THE FOUR PRIORITY LEVELS, IN WORDS — literal `t("…")` calls rather than a
 * `t(PRIORITY_LABEL[level])` lookup, for the exact reason the tickets board's
 * own `COLUMN` map is written the same way (tickets-collection.tsx's
 * `OpenBoard`): a dynamic key looks up words the catalogue does not hold
 * (R28's extraction walk only sees literal `t("…")` positions), so
 * `PRIORITY_LABEL`'s own English strings would ship in English to every reader
 * who chose a different language. Same four words `PRIORITY_LABEL`
 * (shared/departments.ts) names, spelled out here so each is a real catalogue
 * entry. */
function priorityWord(t: (s: string) => string, level: 1 | 2 | 3 | 4): string {
  if (level === 1) return t("Whenever")
  if (level === 2) return t("Urgent")
  if (level === 3) return t("Important")
  return t("Do it now")
}

/** THE APP'S OWN PRIORITY ORDER — highest first, reading the way the door's
 * own default sort already does (`TASK_SORTS.priority`,
 * workers/content/src/lib/tasks.ts: "most important-and-urgent first"). The
 * board's columns and the priority filter's options both read this list, so
 * neither can silently disagree with the other about which end is "worse". */
const PRIORITY_ORDER: readonly (1 | 2 | 3 | 4)[] = [4, 3, 2, 1]

/** THE PRIORITY CHIP — the client's own words, "Priority (has a color here)".
 * Nothing in the app had ever coloured a task's priority before this (see
 * `PRIORITY_DOT_TONE`'s own header): the shaped row used to fold the plain word
 * into a summary sentence and nothing else read it. `Badge variant="status"
 * dot={…}` is the exact seam a task's own record screen already colours its
 * Open/Done chip through (task-detail.tsx) — reused, not invented. */
function PriorityChip({ level, t }: { level: 1 | 2 | 3 | 4; t: (s: string) => string }) {
  return (
    <Badge variant="status" dot={PRIORITY_DOT_TONE[level]}>
      {priorityWord(t, level)}
    </Badge>
  )
}

/** One task, as a row. Every column any view needs is on it, so the shaping is
 * a single pass rather than a per-view reshaping that could disagree about
 * what a task is. `priority` carries the RAW level (1-4) rather than a
 * formatted string now — it is a real column with its own coloured chip
 * (`RENDER_AS`, below), not text folded into a sentence. */
function shapeTasks(tasks: Task[], lang: Language) {
  return {
    rows: tasks.map((t) => {
      const mark = departmentGlyph(t.department)
      return {
        id: t.id,
        // THE DEPARTMENT'S GLYPH IN THE SLOT (R35). It was already computed one
        // line up and spent entirely on the `department` COLUMN — concatenated
        // into that word, which is a pictograph inside a sentence, and invisible
        // on the list view where the column is not shown at all.
        mark: <RecordMark mark={mark || null} name={t.title} />,
        // NO REFERENCE PREFIX — the 2026-08-31 ruling puts a task in the same
        // no-reference category as a process, a role or a dropdown value.
        name: t.title,
        // THE RAW LEVEL — see this function's own header. `RENDER_AS.priority`
        // draws the chip; `SORT_AS.priority` needs no `sortKey` any more
        // because the cell itself is the number now.
        priority: t.priority,
        // The department's own mark leads its name, in the colour the agency
        // already chose for it. A word a team invented itself has no mark and
        // simply reads as itself.
        department: t.department ? `${mark} ${t.department}`.trim() : "—",
        app: t.appName ?? "—",
        client: t.accountName ?? "—",
        // R54: a task is ours, so its assignee is named by first name.
        assignee: staffNameFromSnapshot(t.assigneeName) || "Nobody yet",
        // THE TWO DATE COLUMNS, WARM AND COMPARED ON THE RAW INSTANT.
        //
        // The cell is the same locale-formatted date the summary line has
        // always used; the table compares `dueOn`/`completedAt` beside it
        // (`SORT_AS`, below) rather than re-parsing the words on screen, which
        // would answer differently in each of the four languages this app
        // ships.
        deadline: t.dueOn ? formatDate(t.dueOn, lang) : "—",
        closed: t.completedAt ? formatDate(t.completedAt, lang) : "—",
        // ── THE RAW FACTS, RIDING BESIDE THE SHAPED CELLS ──────────────────
        // Carried here rather than re-parsed out of the cell — see `SORT_AS`.
        dueOn: t.dueOn ?? null,
        completedAt: t.completedAt ?? null,
        // The department's WORD, without the pictograph the cell leads with —
        // sorting the shaped cell would sort by the glyph instead.
        departmentName: t.department ?? "",
      }
    }),
  }
}

/** THE TABLE'S SEVEN COLUMNS — the client's own list, verbatim: "Task /
 * Priority (has a color here) / Deadline / Department / Account / App /
 * Whatever you think relevant" — plus "Who has it" (Assignee), which exists
 * on the row and is genuinely relevant the moment a reader holds
 * `all_tasks:read` and is looking at more than their own name. STATUS is
 * deliberately NOT a column: every tab is already a status scope
 * (Overdue/Planned show only open tasks, Completed only done ones, Everyone's
 * the same open/done split Overdue+Planned+Completed already are, per tab —
 * see `columns` below), so a Status column would read the same word down
 * every row of whichever tab is open — a column that carries no information
 * is furniture, not "whatever is relevant".
 *
 * ONE SET FOR THE THREE "MINE" TABS, not the old EVERYDAY/COMPLETED split —
 * the client asked for one table shape ("the columns would be…") and the
 * split used to exist only because Completed wanted Important/Urgent as their
 * own booleans; the Priority chip already carries both, so the split bought
 * nothing this table doesn't already say. Completed gets ONE column more
 * (Closed), appended rather than folded in, because "when it was finished" is
 * a question only that tab's rows can honestly answer. Everyone's reorders
 * rather than adds — see `EVERYONE_COLUMNS` below. */
const TASK_COLUMNS = [
  field("name", "Task"),
  field("priority", "Priority"),
  field("deadline", "Deadline"),
  field("department", "Department"),
  field("client", "Account"),
  field("app", "App"),
  field("assignee", "Who has it"),
]
const COMPLETED_COLUMNS = [...TASK_COLUMNS, field("closed", "Closed")]
/** EVERYONE'S OWN ORDER — the coordinator's follow-up ruling: "same columns
 * plus Assignee prominent." Same seven fields, ASSIGNEE MOVED second (right
 * after Task, ahead of Priority) rather than a bespoke eighth column: on the
 * three MINE tabs "who has it" is a fact about the reader themselves and
 * belongs at the quiet end of the row; the moment a tab shows everyone's
 * tasks together, "whose is this" is the first question a scan actually asks,
 * so it reads first. */
const EVERYONE_COLUMNS = [
  field("name", "Task"),
  field("assignee", "Who has it"),
  field("priority", "Priority"),
  field("deadline", "Deadline"),
  field("department", "Department"),
  field("client", "Account"),
  field("app", "App"),
]

/** WHAT EACH COLUMN ACTUALLY IS, where it is not a word — see `record-table.tsx`'s
 * `SortType` note for the long version. A column absent from here compares its
 * own text, which stays correct for `name`, `app`, `client` and `assignee`. */
const SORT_AS: Record<string, Pick<TableColumn, "sortType" | "sortKey">> = {
  priority: { sortType: "number" },
  deadline: { sortType: "date", sortKey: (row: TableRowData) => row.dueOn },
  closed: { sortType: "date", sortKey: (row: TableRowData) => row.completedAt },
  department: { sortType: "text", sortKey: (row: TableRowData) => row.departmentName },
}

/** THE THREE "MINE" TABS, in the client's own order. Written as data so the
 * strip, the fetch key and the badge cannot fall out of step with each other. */
const TASK_TABS: { value: TaskView; label: string; icon: string }[] = [
  { value: "overdue", label: "Overdue", icon: "warning" },
  { value: "planned", label: "Planned", icon: "clipboard-text" },
  { value: "completed", label: "Completed", icon: "check" },
]

/** THE FOURTH TAB — the door's status-agnostic `all` view, LAST in the strip
 * and shown only to a reader who holds `all_tasks:read` (`seesEveryones`,
 * below). Kept out of `TASK_TABS` itself rather than folded in with a
 * `hidden` flag: whether it appears is a PERMISSION question this component
 * answers once, at the one place it builds the strip, not a property every
 * consumer of `TASK_TABS` would have to filter for itself. */
const EVERYONE_TAB: { value: TaskView; label: string; icon: string } = {
  value: "all",
  label: "Everyone's",
  icon: "users-three",
}

/** A tab's own sub-view — the toolbar's `view` slot draws these, R53's
 * config shape. `revive` refuses a remembered value the tab no longer offers
 * (Completed only ever offered "table"; Overdue never offered "calendar"),
 * landing on the tab's own default instead of an error or a blank body. */
type OverdueView = "table" | "board"
type PlannedView = "table" | "board" | "calendar"
/** Everyone's own sub-view — the same pair Overdue offers (Table + Board by
 * priority), so a reader who has learned one tab's switch has learned the
 * other's too. */
type EveryoneView = "table" | "board"

export function TasksScreen({
  teamId,
  recipe,
  rights,
  total,
  canCreate,
  counts,
  view,
  onViewChange,
  myUserId,
  canRaiseTodo,
  canCancelTodo,
  onAction,
  onIntent,
}: {
  teamId: string
  recipe: ScreenRecipe
  rights: ScreenRights
  /** the exact server total of the OPEN pile (R16) — never a loaded list's length */
  total: number | undefined
  /** the other tabs' exact totals, plus the progress bar's pair */
  counts: {
    all: number | undefined
    overdue: number | undefined
    /** ARRIVED 2026-09-15 — the redesigned tab strip's own badge. */
    planned: number | undefined
    upcoming: number | undefined
    completed: number | undefined
    calendar: number | undefined
    dueToday: number | undefined
    dueTodayDone: number | undefined
  }
  /** which pile is showing — a SERVER view, owned by the host so the reads can
   * key off it (see useScreenData) */
  view: TaskView
  onViewChange: (v: TaskView) => void
  /** whoever is signed in — the assignee a new task defaults to */
  myUserId: string | null
  canCreate: boolean
  canRaiseTodo: boolean
  canCancelTodo: boolean
  onAction: (actionId: string, ctx: ScreenActionContext) => void
  onIntent: (intent: ScreenIntent) => void
}) {
  const { t, lang } = useLanguage()
  const tasksQ = useCached<Task[]>(tasksKey(teamId, view), () => listFetch.tasks(teamId, view))
  const options = useTaskFormOptions(teamId)
  // WHOSE LIST THIS IS (4.9). The DOOR decides — a caller without
  // `all_tasks:read` is narrowed to their own name there, and every count above
  // comes back narrowed with it. This only says so, because a list that is
  // quietly shorter than a colleague's is the kind of thing people work around
  // for months rather than ask about. The same shape as 8.11: the door withholds,
  // the screen explains.
  const seesEveryones = usePermissions(teamId).can("all_tasks", "read")
  // THE STRIP ITSELF — three tabs, or four for a reader who may see everyone's.
  // Computed once, here, rather than gated at every place `TASK_TABS` would
  // otherwise have been read (the folder strip's own config and nowhere else
  // today, but a second call site is exactly how this kind of gate drifts).
  const taskTabs = seesEveryones ? [...TASK_TABS, EVERYONE_TAB] : TASK_TABS
  // WHO MAY DRAG A CARD — the board's own write is `content.updateTask`, the
  // same door the edit form uses, so the same right gates both.
  const canEditTasks = usePermissions(teamId).can("work", "update")
  const [taskOpen, setTaskOpen] = React.useState(false)
  const [todoOpen, setTodoOpen] = React.useState(false)

  // EACH MULTI-VIEW TAB REMEMBERS ITS OWN SUB-VIEW (`useRemembered`, the same
  // seam meetings-screen.tsx's own List/Calendar switch and the tickets
  // toolbar's Open/Ready switches read) — THREE SLOTS, not one keyed by tab,
  // because Overdue/Planned/Everyone's offer different bodies (see
  // `useRemembered`'s own doc on why tickets-collection.tsx keeps
  // `openView`/`readyView` apart rather than folding them into one).
  const [overdueView, setOverdueView] = useRemembered<OverdueView>(
    "task-overdue-view",
    "table",
    (r) => (r === "table" || r === "board" ? r : undefined)
  )
  const [plannedView, setPlannedView] = useRemembered<PlannedView>(
    "task-planned-view",
    "table",
    (r) => (r === "table" || r === "board" || r === "calendar" ? r : undefined)
  )
  const [everyoneView, setEveryoneView] = useRemembered<EveryoneView>(
    "task-everyone-view",
    "table",
    (r) => (r === "table" || r === "board" ? r : undefined)
  )
  const subView: OverdueView | PlannedView | "table" =
    view === "overdue" ? overdueView : view === "planned" ? plannedView : view === "all" ? everyoneView : "table"

  // THE TOOLBAR'S OWN SEARCH AND FACETS — bounded, in the browser, over
  // whichever tab's page is loaded (the exact shape the table's search already
  // took through the kit panel before this pass, and the Calendar tab's own
  // search took by hand). ONE state for the three tabs, because only the
  // active tab's toolbar ever reads or writes it — the same simplification
  // `apps-screen.tsx` makes for its own Active/Inactive split.
  const [query, setQuery] = React.useState("")
  const [facetValues, setFacetValues] = React.useState<Record<string, string>>({})

  async function addTask(values: TaskFormValues) {
    await contentApi.createTask({
      title: values.title,
      detail: values.detail || undefined,
      dueOn: values.dueOn ? new Date(values.dueOn).toISOString() : undefined,
      assigneeId: values.assigneeId || undefined,
      department: values.department || undefined,
      appId: values.appId || undefined,
      accountId: values.accountId || undefined,
      important: values.important,
      urgent: values.urgent,
      fileDataUrl: values.fileDataUrl || undefined,
      fileName: values.fileName || undefined,
    })
    // A new task belongs in SEVERAL piles and only one of them is on screen.
    for (const v of TASK_VIEWS) invalidate(tasksKey(teamId, v))
    toast.success(t("Task added."))
  }

  async function raiseTodo(values: TodoFormValues) {
    await contentApi.raiseTodo({
      accountId: values.accountId,
      title: values.title,
      detail: values.detail || undefined,
      dueOn: values.dueOn ? new Date(values.dueOn).toISOString() : undefined,
    })
    invalidate(todosKey(teamId))
    toast.success(t("Asked, and emailed to them."))
  }

  // THE BOARD'S OWN WRITE — a drop sends the task's WHOLE current shape back
  // through `updateTask` (whose contract REPLACES every field, exactly as the
  // edit form's own submit does) with the two ticks set for the column it
  // landed in. Reading every other field off the row it already holds rather
  // than asking the door again: the row on screen IS the record, since this
  // collection has no by-id read faster than the one already in the cache.
  async function movePriority(move: KanbanMove) {
    const toLevel = Number(move.toColumnId) as 1 | 2 | 3 | 4
    const current = (tasksQ.data ?? []).find((r) => r.id === move.cardId)
    if (!current || current.priority === toLevel) return
    try {
      await contentApi.updateTask({
        id: current.id,
        title: current.title,
        detail: current.detail || undefined,
        dueOn: current.dueOn || undefined,
        assigneeId: current.assigneeId || undefined,
        accountId: current.accountId || undefined,
        appId: current.appId || undefined,
        department: current.department || undefined,
        important: toLevel === 3 || toLevel === 4,
        urgent: toLevel === 2 || toLevel === 4,
      })
      for (const v of TASK_VIEWS) invalidate(tasksKey(teamId, v))
    } catch {
      toast.error(t("Couldn't update that value."))
    }
  }

  // R16: the badge on every tab is an exact server count, all nine numbers out
  // of the ONE read that fetched whichever pile is showing.
  const openBadge = formatCount(total)
  const badges: Record<TaskView, string> = {
    overdue: formatCount(counts.overdue),
    open: openBadge,
    planned: formatCount(counts.planned),
    calendar: formatCount(counts.calendar),
    completed: formatCount(counts.completed),
    upcoming: formatCount(counts.upcoming),
    all: formatCount(counts.all),
  }

  // TODAY'S TASKS, above the strip so it is on every tab rather than one of them:
  // how many of the things due today or earlier are done, out of how many there
  // are. It is deliberately not "due today" — Friday's unfinished job is still
  // today's problem, and a bar that forgot it every midnight would flatter us.
  const dueToday = counts.dueToday ?? 0
  const doneToday = counts.dueTodayDone ?? 0
  const progressBar = (
    /* THE WHOLE STRIP TAKES PAPER — R67, and the shape of the fix is the
       decision. This is a `<section>` with NO heading at all (it is named by
       `aria-label`), so the 2026-09-11 census reached it only because that
       amendment dropped the heading requirement — and the tempting fix, reading
       the `<KpiProgress>` label as a title and the caption under it as a
       subtitle, would have been wrong twice over: the bar is a MEASUREMENT, not
       a name, and the caption says who the number counts rather than what the
       section is. So neither is a title block being moved inside a container.
       The strip is one unit and it stands on one sheet, above the tab strip,
       which is where it already sat on every tab.
       `--surface-panel` and not `bg-card`: in light `--card` IS `--background`
       (#FFFEF9 both), so a card here would have measured contrast 1.000 against
       the page. Soft paper measures 1.103 light and 1.079 dark. */
    <section
      className="flex flex-col gap-2 rounded-[var(--radius)] bg-surface-panel p-4"
      aria-label={t("Today's tasks")}
    >
      <KpiProgress
        label={t("Today's tasks")}
        value={
          dueToday === 0
            ? t("Nothing due today or before.")
            : t("{done} / {due} done", { done: doneToday, due: dueToday })
        }
        percent={dueToday === 0 ? 100 : Math.round((doneToday / dueToday) * 100)}
      />
      {!seesEveryones && (
        <p className="text-muted-foreground text-xs">
          {t("These are the tasks assigned to you. Seeing everyone's is a separate access right.")}
        </p>
      )}
    </section>
  )

  // KEPT MOUNTED THROUGH THE LOAD (2026-09-03 audit — "nine screens blank
  // their entire toolbar while loading"): the tab strip and this tab's own
  // `ToolbarRow` stay on screen; only the ROWS region below swaps to a
  // skeleton, never a false "genuinely empty" flash from an empty `[]` default.
  //
  // COMPUTED HERE, ABOVE THE ERROR RETURN BELOW, so `useFilterBar` (a HOOK) can
  // be called unconditionally alongside every other hook in this component —
  // the same discipline `apps-screen.tsx`/`collection-frame.tsx` keep for their
  // own `useFilterBar` call: a hook cannot skip renders the way a component can,
  // and a call site after an early return is a conditional hook count waiting
  // for the day the error branch actually fires.
  const tasksLoading = tasksQ.data === undefined
  const rawRows = tasksQ.data ?? []

  // THE SEARCH AND THE TWO FACETS, narrowing the loaded page ONCE, ahead of
  // every view — Table, Board and Calendar all read `filteredRows` rather than
  // re-asking the same two questions three different ways.
  const needle = query.trim().toLowerCase()
  let filteredRows = needle ? rawRows.filter((r) => r.title.toLowerCase().includes(needle)) : rawRows
  if (facetValues.priority) filteredRows = filteredRows.filter((r) => String(r.priority) === facetValues.priority)
  if (facetValues.department) filteredRows = filteredRows.filter((r) => (r.department ?? "") === facetValues.department)

  // THE TWO FACETS — client ruling: "Filters by priority, by department."
  // Priority's four options are the app's own SCALE (`PRIORITY_ORDER`), a
  // "Compact→Regular→Large" shape R75's own registry names as the kind of
  // list that must not be reordered — but the row this app's filter panel
  // draws through (`useFilterBar`'s `optionsFor`, shared/web/screen-engine/
  // filter-bar.tsx) sorts EVERY facet's options A→Z unconditionally, with no
  // per-facet escape hatch at that seam (R75's own `ORDERED_OPTIONS_OK` is for
  // a DIFFERENT chokepoint — a hand-rolled `<Select>` a screen builds itself —
  // and widening the shared seam is out of this screen's file list). So the
  // FILTER MENU reads alphabetically ("Do it now" · "Important" · "Urgent" ·
  // "Whenever") while the TABLE COLUMN and the BOARD COLUMNS both read the
  // true 4→1 order — a known, accepted consequence of R75 rather than a bug,
  // and cheap to correct centrally if the seam ever grows the escape hatch.
  // Department's options are the team's own active vocabulary
  // (`useTaskFormOptions`'s own `departments`, the same list the task form's
  // picker already offers) rather than derived from the loaded page, so a
  // department with no CURRENT task still offers to filter by it — no
  // different from any other closed-vocabulary facet in the app.
  const facets: FilterFacet[] = [
    {
      field: "priority",
      label: t("Priority"),
      control: "select",
      options: PRIORITY_ORDER.map((p) => ({ value: String(p), label: priorityWord(t, p) })),
    },
    {
      field: "department",
      label: t("Department"),
      control: "select",
      options: options.departments.map((d) => ({ value: d, label: d })),
    },
  ]
  // CALLED UNCONDITIONALLY, ABOVE EVERY EARLY RETURN — same discipline
  // `apps-screen.tsx`/`collection-frame.tsx` keep for their own `useFilterBar`
  // calls: a hook cannot skip renders the way a component can.
  const { pill: filterPill, panel: filterPanel } = useFilterBar({
    facets,
    values: facetValues,
    data: rawRows,
    onChange: (fld, value) =>
      setFacetValues((prev) => {
        const next = { ...prev }
        if (value === "") delete next[fld]
        else next[fld] = value
        return next
      }),
    onClearFacets: () => setFacetValues({}),
    resultCount: filteredRows.length,
  })

  if (tasksQ.error)
    return (
      <ShapeStateBody
        shape="collectionScreen"
        state="error"
        copy={{ errorTitle: t("Couldn't load the tasks.") }}
        action={
          <Button variant="secondary" onClick={() => tasksQ.refresh()}>
            {t("Try again")}
          </Button>
        }
      />
    )

  const data = shapeTasks(filteredRows, lang)
  const columns =
    view === "completed" ? COMPLETED_COLUMNS : view === "all" ? EVERYONE_COLUMNS : TASK_COLUMNS
  // A TABLE, not a two-line list, and that is what makes the four priority
  // levels distinct: each is its own sortable, filterable column rather than
  // the fourth clause of a summary sentence nobody reads to the end of.
  const tableRecipeBase = withDataDrivenCollection(
    // TRANSLATED HERE, because `resolveRecipe` translated the recipe before this
    // screen got it and these columns are the host's own — spread on afterwards,
    // they had never been through the pass, so every heading in this table
    // rendered in English whatever language the reader chose.
    { ...recipe, display: "table" as const, fields: translateFields(columns, t) },
    data.rows
  )
  // THE OUTER TOOLBAR IS THE ONE CONTROL SURFACE — its search/filters already
  // narrowed `filteredRows` above, so the engine's OWN copies are switched off
  // (`apps-screen.tsx`'s own `listRecipe`, the identical move): a second,
  // disconnected search box under this one would be the shape R53 exists to
  // stop. `showHeader` (collection-frame.tsx) draws nothing at all once title,
  // count, search, filters and sort are all false/empty — this table is then
  // ONLY the rows and their header-click sort, `RecordTable`'s own.
  const tableRecipe: ScreenRecipe = tableRecipeBase.collection
    ? {
        ...tableRecipeBase,
        collection: {
          ...tableRecipeBase.collection,
          searchable: false,
          userFilter: false,
          sortable: false,
          showCount: false,
        },
      }
    : tableRecipeBase
  // BOUNDED TO THE LOADED PAGE (R14): the headers order what is here and order
  // ALL of it — no `order` prop, `RecordTable` owns the answer through its own
  // column-header clicks, exactly as before this pass.
  const tableColumns: TableColumn[] = tableRecipe.fields.map((f) => ({
    key: f.column,
    label: f.field.label,
    sort: f.column,
    ...SORT_AS[f.column],
    ...(f.column === "priority"
      ? { render: (value: unknown) => <PriorityChip level={value as 1 | 2 | 3 | 4} t={t} /> }
      : {}),
  }))

  // THE BOARD — priority order, 4→1 (see `PRIORITY_ORDER`'s own note). No
  // `count`: unlike the tickets board, there is no door-side grouped count per
  // priority to fall back to when resting (only per-VIEW totals exist), so
  // every column always reads the cards it is actually holding — a smaller,
  // honest claim rather than a resting number that could disagree with a
  // narrowed one.
  const boardCard = (r: Task) => ({
    id: r.id,
    title: r.title,
    description:
      [r.accountName, r.dueOn ? t("due {date}", { date: formatDate(r.dueOn, lang) }) : null]
        .filter(Boolean)
        .join(" · ") || undefined,
  })
  const boardColumns: KanbanColumn[] = PRIORITY_ORDER.map((p) => ({
    id: String(p),
    title: priorityWord(t, p),
    cards: filteredRows.filter((r) => r.priority === p).map(boardCard),
    emptyLabel: t("Nothing at this stage."),
  }))

  // THE CALENDAR (Planned only) — the host's own (record-calendar.tsx), fed
  // `filteredRows` narrowed further to the ones with a date. GENUINELY EMPTY
  // (R50) reads the TAB's own RAW page, never the search-narrowed one — the
  // same distinction the old Calendar tab drew (`hasDueDated`).
  const hasDueDated = rawRows.some((r) => r.dueOn)
  const calendarEntries: CalendarEntry[] = filteredRows
    .filter((r) => r.dueOn)
    .map((r) => ({
      id: r.id,
      day: (r.dueOn as string).slice(0, 10),
      // NO REFERENCE PREFIX — see the same note on the list row above.
      title: r.title,
      accent: r.department ?? "",
      detail: [priorityWord(t, r.priority), staffNameFromSnapshot(r.assigneeName)] // R54
        .filter(Boolean)
        .join(" · "),
    }))

  // THE VIEW SLOT — R53's config, built by the toolbar itself. Completed
  // offers one body and still passes one (kit v1.2.60 draws a static label
  // rather than nothing, matching every other collection in the app that
  // genuinely has only one view), so the toolbar never loses its right-hand
  // element on the one tab that has nothing to switch.
  const tableViewOption = { value: "table", label: t("Table"), icon: <ListBullets className="size-4" /> }
  const boardViewOption = { value: "board", label: t("Board"), icon: <KanbanGlyph className="size-4" /> }
  const calendarViewOption = {
    value: "calendar",
    label: t("Calendar"),
    icon: <CalendarBlank className="size-4" />,
  }
  const viewSlot: ToolbarViewSlot =
    view === "overdue"
      ? {
          views: [tableViewOption, boardViewOption],
          value: overdueView,
          onValueChange: (v) => setOverdueView(v === "board" ? "board" : "table"),
        }
      : view === "planned"
        ? {
            views: [tableViewOption, boardViewOption, calendarViewOption],
            value: plannedView,
            onValueChange: (v) =>
              setPlannedView(v === "board" ? "board" : v === "calendar" ? "calendar" : "table"),
          }
        : view === "all"
          ? {
              // THE SAME PAIR OVERDUE OFFERS — a reader who has learned one
              // switch has learned the other's too (this file's own header).
              views: [tableViewOption, boardViewOption],
              value: everyoneView,
              onValueChange: (v) => setEveryoneView(v === "board" ? "board" : "table"),
            }
          : { views: [tableViewOption], value: "table", onValueChange: () => {} }

  // THIS TAB'S OWN "GENUINELY EMPTY" (R50) — the calendar sub-view asks a
  // narrower question (has anything here got a date at all) than the other two
  // (does this pile hold any row at all).
  const rawEmpty = subView === "calendar" ? !hasDueDated : rawRows.length === 0
  const toolbarEmpty = !tasksLoading && rawEmpty

  const toolbar = (
    <ToolbarRow
      empty={toolbarEmpty}
      search={
        (tasksLoading || !rawEmpty) && (
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            placeholder={t("Search tasks…")}
            className="w-full"
          />
        )
      }
      filters={(tasksLoading || !rawEmpty) && filterPill}
      toolbarPanel={(tasksLoading || !rawEmpty) && filterPanel}
      view={(tasksLoading || !rawEmpty) && viewSlot}
      actions={canCreate && <AddButton label={t("New task")} onClick={() => setTaskOpen(true)} />}
    />
  )

  const body = tasksLoading ? (
    // ROWS ONLY — the toolbar above is already real.
    <Skeleton variant="list" lines={4} />
  ) : rawEmpty ? (
    // GENUINELY EMPTY — the collection empty title is the same one for every
    // tab and sub-view on purpose: "nothing on our own list" is true whether
    // the pile in question is overdue, planned or completed, and three tabs
    // sharing one honest sentence beats three invented ones that each need
    // their own translation.
    <CollectionEmptyState
      title={
        subView === "calendar" ? t("No tasks with a deadline yet.") : t("Nothing on our own list.")
      }
      onCreate={canCreate ? () => setTaskOpen(true) : undefined}
    />
  ) : filteredRows.length === 0 ? (
    // NARROWED TO NOTHING (R62) — same register, minus the button.
    <CollectionEmptyState filtered title={t("Nothing on our own list.")} />
  ) : subView === "board" ? (
    <Kanban
      columnWidth="max(18rem, calc((100% - 3 * var(--space-2h)) / 4))"
      columns={boardColumns}
      onMove={canEditTasks ? movePriority : undefined}
      onCardSelect={(card) => onIntent({ kind: "open", module: "tasks", id: card.id })}
      label={t("Tasks by priority")}
    />
  ) : subView === "calendar" ? (
    <RecordCalendar
      entries={calendarEntries}
      onOpen={(id) => onIntent({ kind: "open", module: "tasks", id })}
      emptyText={t("No tasks match your search.")}
    />
  ) : (
    <RecordTable
      columns={tableColumns}
      rows={data.rows}
      config={tableRecipe.collection as CollectionConfig}
      actions={visibleActions(tableRecipe, rights, onAction)}
      onRowClick={(row) => onIntent({ kind: "open", module: "tasks", id: String(row.id) })}
      useKitPanel
    />
  )

  return (
    <CountedAbove active={openBadge !== ""}>
    <div className="flex flex-col gap-6">
      {/* R16: the count lives in ONE place. The strip below badges all three
          tabs, so the heading stands down through the arbitration context
          rather than saying the same number twice. */}
      {/* THE MODULE'S OWN DOOR INTO ITS SETTINGS (R61) — the departments a task
          is filed under. In the heading's `action` slot and never the toolbar:
          `<ToolbarRow>` draws nothing at all on an empty collection (R50), which
          is exactly when somebody goes looking for the words. The gear draws
          itself or nothing — it asks `visibleModuleSettings` for both the page
          and the reader's right, so there is no permission spelled here. */}
      <CollectionHeading sectionKey="tasks" total={total} action={<ModuleSettingsGear teamId={teamId} segment="tasks" />} />

      <SectionWithCreate
        show={canCreate}
        label={t("New task")}
        icon="plus"
        onCreate={() => setTaskOpen(true)}
        // The progress bar SUMMARISES the collection, so it sits above the card
        // and outside it.
        aboveCard={progressBar}
        // THE TABS ARE THE CARD'S OWN TAB STRIP, drawn flush against the card
        // the way `FolderTabStrip` always has. TABS ALONE (client ruling,
        // 2026-08-31) — the toolbar below carries every control and action.
        folderTabs={{
          config: {
            ...defaultTabsConfig,
            tabs: taskTabs.map((tab) => ({
              value: tab.value,
              label: t(tab.label),
              icon: tab.icon,
              badge: badges[tab.value],
              badgeVariant: "" as const,
            })),
          },
          value: view,
          onValueChange: (v) => onViewChange(v as TaskView),
        }}
        // NEVER THE KIT PANEL NOW — every tab draws its own `<ToolbarRow>`
        // (search/filters/view/actions all this screen's own), so
        // `CollectionCard` boxes it exactly as it already boxed the old
        // Calendar tab's bespoke body.
        useKitPanel={false}
      >
        <div className="flex flex-col">
          {toolbar}
          {body}
          {/* R14 — HOW PAGE TWO IS REACHED, on every sub-view: they all read the
              SAME loaded page (`tasksKey(teamId, view)`), so one cursor serves
              the Table, the Board and the Calendar alike. Withdrawn while the
              collection is genuinely or narrowedly empty — nothing to page
              through under either register. */}
          {!tasksLoading && !rawEmpty && filteredRows.length > 0 && (
            <LoadMore
              listKey={tasksKey(teamId, view)}
              label={t("Load more tasks")}
              fetchPage={(cursor) =>
                contentApi.tasks(view, cursor).then((r) => ({ rows: r.tasks, nextCursor: r.nextCursor }))
              }
            />
          )}
        </div>
      </SectionWithCreate>

      {/* R14: BOUNDED, not paged — admin is ticked off as fast as it arrives. */}

      <section className="flex flex-col gap-2">
        <h2 className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
          <ClipboardText className="size-3.5" />
          {t("Waiting on clients")}
        </h2>
        <TodosPanel
          teamId={teamId}
          canCancel={canCancelTodo}
          onNew={canRaiseTodo ? () => setTodoOpen(true) : undefined}
          onOpenTicket={(id) => onIntent({ kind: "open", module: "tickets", id })}
        />
      </section>

      <TaskFormDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        draftKey={`task:add:${teamId}`}
        teamId={teamId}
        members={options.members}
        apps={options.apps}
        accounts={options.accounts}
        departments={options.departments}
        defaultAssigneeId={myUserId ?? ""}
        onSubmit={addTask}
      />
      <TodoFormDialog
        open={todoOpen}
        onOpenChange={setTodoOpen}
        draftKey={`todo:add:${teamId}`}
        onSubmit={raiseTodo}
      />
    </div>
    </CountedAbove>
  )
}
