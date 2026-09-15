// TASKS, REDESIGNED A SECOND TIME THE SAME DAY (2026-09-15) — the client's
// follow-up ruling over the freshly-shipped Overdue/Planned/Completed/
// Everyone's strip, pinned here because `table-header-sorts.test.tsx` (which
// used to hold Tasks' own header-sort tests) now proves the OPPOSITE claim for
// this screen: the headers do NOT move the rows any more, on purpose. Six
// separate claims, each earned by a sentence of hers:
//
//   1. "add the sort to the toolbar and add sort by task priority and
//      deadline... make sure you remove it from the headers" — no column
//      header is a button, and the toolbar carries the order instead.
//   2. "the default sort is always by priority... and after that, the
//      deadline. I mean, within the same priority" — priority 4→1, ties
//      broken by deadline ascending, undated last.
//   3. "On overdue tasks, it's only mine... remove the column 'Who has it'" —
//      dropped from the three MINE tabs, kept on Everyone's.
//   4. "add the logos to account and app" — the Account/App cells carry a
//      face beside the word.
//   5. "there is also one [add button] underneath... the correct one is in
//      the toolbar" — exactly one create control renders.
//   6. "on the board view... I want to see the color of this priority, and
//      the sort inside should be by deadline. On the top, the earliest
//      deadline" / "when empty, don't show anything at this stage" — the
//      board's own, FIXED order and its silent empty column.
//
// THE TOOLBAR'S OWN FIELD PICKER IS NEVER OPENED HERE, deliberately, the same
// discipline `sort-asks-the-door.test.tsx` states for its own sort control:
// "the picker is a Radix popover over cmdk, and a test that fights a portal
// proves less about this component than it does about jsdom." Claim 2 (the
// default) and claim 6 (the board) are provable without it — the board's
// sub-view is reached the same way `cold-tabs.test.tsx` reaches Planned's
// Calendar, by priming the REMEMBERED choice directly rather than clicking a
// combobox.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { primeCache } from "@shared/web/store"
import { RememberedScreen } from "@shared/web/remembered"
import { tasksKey } from "@/lib/live-resources"
import { BASE_RECIPES } from "@/lib/screens"
import { TasksScreen } from "@/components/work/tasks-screen"
import type { Task } from "@shared/types"

// Every cached read revalidates on mount, and the screen mounts a create
// dialog that reaches the router — both have to answer for the screen to
// stay rendered on the fixture it was primed with (the same shape
// `cold-tabs.test.tsx` and the deleted Tasks half of `table-header-sorts.
// test.tsx` both kept).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))
const { door } = vi.hoisted(() => ({ door: { tasks: [] as unknown[] } }))
vi.mock("@/lib/api", () => ({
  ApiFailure: class extends Error {},
  content: {
    tasks: async () => ({
      tasks: door.tasks,
      openTotal: door.tasks.length,
      allTotal: 0,
      overdueTotal: 0,
      plannedTotal: 0,
      upcomingTotal: 0,
      completedTotal: 0,
      calendarTotal: 0,
      dueTodayTotal: 0,
      dueTodayDone: 0,
    }),
    todos: async () => ({ todos: [], total: 0 }),
  },
  tenancy: {
    members: async () => ({ members: [] }),
    apps: async () => ({ apps: [], total: 0 }),
    accounts: async () => ({ accounts: [], total: 0, entityTotal: 0, individualTotal: 0, nextCursor: null }),
    selectable: async () => ({ values: [], total: 0 }),
    myPermissions: async () => ({ permissions: { work: { read: true }, all_tasks: { read: true } } }),
  },
}))
// The task form's options hook reaches the tenancy door by its own path
// (`use-task-form-options.ts` imports `@/lib/api/tenancy` directly).
vi.mock("@/lib/api/tenancy", () => ({
  tenancy: {
    members: async () => ({ members: [] }),
    accounts: async () => ({ accounts: [], total: 0, entityTotal: 0, individualTotal: 0, nextCursor: null }),
    selectable: async () => ({ values: [], total: 0 }),
  },
}))

afterEach(cleanup)

let team = 0
/** A team with the caches every render needs already warm — the task list
 * itself, and the four empty pickers the create dialog and the filter facets
 * ask for, so the first paint is the one under test. */
function warmTeam(tasks: Task[]): string {
  const teamId = `team-${++team}`
  door.tasks = tasks
  primeCache(tasksKey(teamId, "overdue"), tasks)
  primeCache(`my-perms:${teamId}`, { work: { read: true }, all_tasks: { read: true } })
  primeCache(`members:${teamId}`, [])
  primeCache(`accounts:${teamId}`, [])
  primeCache(`selectable:${teamId}`, [])
  return teamId
}

/** The Overdue tab, TABLE subview by default — the toolbar's own default
 * FLIPPED to Board on 2026-09-15's third pass (the client: "the default view
 * on tasks overdue is board", `overdueView`'s own note, tasks-screen.tsx),
 * but most of what this file pins (the toolbar's sort order, the header
 * census, the logo cells, the single add button) is a claim about the TABLE,
 * not about which sub-view a cold reader lands on — that is
 * `cold-tabs.test.tsx`'s own claim to prove, not this file's to re-litigate
 * at every call site. So `"task-overdue-view": "table"` is primed here,
 * UNCONDITIONALLY, before any override the caller hands in — the identical
 * "priming the REMEMBERED choice directly" shape this file's own header
 * already describes for reaching the board, just defaulted the other way
 * now that the app's own default is not the table any more. A caller that
 * wants the board (`renderOverdueBoard`, below) still overrides it. */
function renderOverdue(tasks: Task[], remembered: Record<string, unknown> = {}) {
  const teamId = warmTeam(tasks)
  const memory: Record<string, unknown> = { "task-overdue-view": "table", ...remembered }
  return render(
    <RememberedScreen
      memory={{ read: (slot) => memory[slot], write: (slot, value) => void (memory[slot] = value) }}
    >
      <TasksScreen
        teamId={teamId}
        recipe={BASE_RECIPES["tasks.list"]}
        rights={{ work: { read: true } } as never}
        total={tasks.length}
        counts={{
          all: undefined,
          overdue: tasks.length,
          planned: undefined,
          upcoming: undefined,
          completed: undefined,
          calendar: undefined,
          dueToday: undefined,
          dueTodayDone: undefined,
        }}
        view="overdue"
        onViewChange={() => {}}
        myUserId="u1"
        canCreate
        onAction={() => {}}
        onIntent={() => {}}
      />
    </RememberedScreen>
  )
}

/** The first cell of every rendered table row, in the order they are painted. */
const rowOrder = () =>
  Array.from(document.querySelectorAll("tbody tr")).map((tr) => tr.querySelector("td")?.textContent ?? "")

function task(partial: Partial<Task> & { id: string; title: string; priority: 1 | 2 | 3 | 4 }): Task {
  return {
    ref: null,
    detail: null,
    assigneeId: "u1",
    assigneeName: "Ana",
    dueOn: null,
    status: "open",
    completedAt: null,
    accountId: null,
    accountName: null,
    accountLogoUrl: null,
    important: partial.priority === 3 || partial.priority === 4,
    urgent: partial.priority === 2 || partial.priority === 4,
    department: null,
    appId: null,
    appName: null,
    appLogoUrl: null,
    fileUrl: null,
    fileName: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    createdByName: null,
    ...partial,
  }
}

describe("Tasks: the toolbar's default order — priority first, deadline breaks the tie", () => {
  // Two priority-4 rows (deadlines a week apart), one priority-4 row with no
  // deadline at all, a priority-2 and a priority-1 row. The client's own
  // sentence: "top priority on top, and after that, the deadline... within
  // the same priority" — so the expected order is 4/soonest, 4/later,
  // 4/undated, 2, 1.
  const TASKS = [
    task({ id: "t1", title: "Later four", priority: 4, dueOn: "2026-09-25T00:00:00.000Z" }),
    task({ id: "t2", title: "Soonest four", priority: 4, dueOn: "2026-09-18T00:00:00.000Z" }),
    task({ id: "t3", title: "Undated four", priority: 4, dueOn: null }),
    task({ id: "t4", title: "The two", priority: 2, dueOn: "2026-09-10T00:00:00.000Z" }),
    task({ id: "t5", title: "The one", priority: 1, dueOn: "2026-09-01T00:00:00.000Z" }),
  ]

  it("opens priority 4→1, ties inside a priority broken by soonest deadline, undated last", () => {
    renderOverdue(TASKS)
    expect(rowOrder().map((r) => r.replace(/ .*/, ""))).toEqual([
      "Soonest",
      "Later",
      "Undated",
      "The", // "The two" (priority 2)
      "The", // "The one" (priority 1)
    ])
  })

  it("flipping the direction reverses the PRIMARY key only — the tie-break does not invert with it", () => {
    renderOverdue(TASKS)
    fireEvent.click(screen.getByRole("button", { name: /sort direction/i }))
    // Priority ascending now (1 → 4), but WITHIN priority 4 the three rows
    // keep the identical soonest-first, undated-last order — a comparator
    // that reversed the tie-break too would put "Undated four" first.
    expect(rowOrder().map((r) => r.replace(/ .*/, ""))).toEqual([
      "The", // "The one" (1)
      "The", // "The two" (2)
      "Soonest",
      "Later",
      "Undated",
    ])
  })
})

describe("Tasks: the table headers no longer sort (2026-09-15)", () => {
  const TASKS = [
    task({ id: "t1", title: "Alpha", priority: 3, dueOn: "2026-09-20T00:00:00.000Z" }),
    task({ id: "t2", title: "Beta", priority: 2, dueOn: "2026-09-10T00:00:00.000Z" }),
  ]

  it("draws every header as plain text, none of them a clickable control", () => {
    renderOverdue(TASKS)
    // "Priority" also names the TOOLBAR's own sort control value now (a
    // separate, deliberate place the word appears), so the headers are read
    // by their own tag rather than by `screen.getByText` alone.
    const headCells = Array.from(document.querySelectorAll("th")).map((th) => th.textContent ?? "")
    for (const label of ["Task", "Priority", "Deadline", "Department", "Account", "App"]) {
      expect(
        screen.queryByRole("button", { name: new RegExp(`^${label}`) }),
        `${label} still draws a sort button`
      ).toBeNull()
      expect(
        headCells.some((c) => c === label),
        `${label} should still be a plain <th> heading`
      ).toBe(true)
    }
    // No header claims an active order either.
    expect(document.querySelector("th[aria-sort]")).toBeNull()
  })

  it("drops 'Who has it' from the three MINE tabs", () => {
    renderOverdue(TASKS)
    expect(screen.queryByText("Who has it")).toBeNull()
  })
})

describe("Tasks: one add button, not two (2026-09-15)", () => {
  it("the toolbar's own AddButton is the only create control on a non-empty table", () => {
    renderOverdue([task({ id: "t1", title: "Alpha", priority: 1 })])
    expect(screen.getAllByRole("button", { name: /New task/i }).length).toBe(1)
  })
})

describe("Tasks: the Account/App cells carry a logo beside the name (2026-09-15)", () => {
  it("still reads the account and app names, now beside a RecordMark", () => {
    renderOverdue([
      task({
        id: "t1",
        title: "Alpha",
        priority: 1,
        accountName: "Bergman S.A.",
        accountLogoUrl: "https://example.test/bergman.png",
        appName: "FluClinic",
        appLogoUrl: null,
      }),
    ])
    expect(screen.getByText("Bergman S.A.")).toBeTruthy()
    expect(screen.getByText("FluClinic")).toBeTruthy()
  })
})

describe("Tasks: the board's own fixed order and its silent empty column (2026-09-15)", () => {
  // ALL priority 4, so the board's grouping cannot itself explain the order —
  // only the fixed deadline-ascending, undated-last rule inside the column can.
  const TASKS = [
    task({ id: "t1", title: "Zulu", priority: 4, dueOn: "2026-09-25T00:00:00.000Z" }),
    task({ id: "t2", title: "Alpha", priority: 4, dueOn: "2026-09-18T00:00:00.000Z" }),
    task({ id: "t3", title: "Mike", priority: 4, dueOn: null }),
  ]

  function renderOverdueBoard(tasks: Task[]) {
    return renderOverdue(tasks, { "task-overdue-view": "board" })
  }

  it("sorts the cards inside a column by deadline ascending, undated last — regardless of the toolbar's own sort", () => {
    renderOverdueBoard(TASKS)
    const cards = Array.from(document.querySelectorAll('[data-slot="kanban-card"]')).map(
      (el) => el.textContent ?? ""
    )
    const at = (needle: string) => cards.findIndex((c) => c.includes(needle))
    expect(at("Alpha")).toBeGreaterThanOrEqual(0)
    expect(at("Alpha")).toBeLessThan(at("Zulu"))
    expect(at("Zulu")).toBeLessThan(at("Mike"))
  })

  it("colours the priority-4 column head with the priority's own dot tone", () => {
    renderOverdueBoard(TASKS)
    // `PRIORITY_DOT_TONE[4]` is "red" (shared/departments.ts, client ruling
    // 2026-09-15: "4: keep the red") — the same tone the table's own chip
    // and the calendar's own dot read. Priority 4 no longer borrows
    // App Stage's "blocked".
    expect(document.querySelector('[class*="dot-red"]')).toBeTruthy()
  })

  it("shows an empty priority column with no placeholder sentence at all", () => {
    // Every task above is priority 4, so priority 3 (Important) is empty.
    renderOverdueBoard(TASKS)
    expect(screen.queryByText(/Nothing at this stage/i)).toBeNull()
    expect(screen.queryByText(/Nothing on this priority/i)).toBeNull()
    // The column HEAD survives even though its body is silent.
    expect(screen.getByText("Important")).toBeTruthy()
  })
})
