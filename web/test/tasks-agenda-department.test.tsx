// THE TASK'S DEPARTMENT, ON ITS AGENDA ENTRY — Aurora, 23 Sep 2026, verbatim:
// "tasks agenda view - show department".
//
// WHICH SCREEN THAT IS. The Tasks screen offers List, Board, Calendar and Week;
// nothing on it is labelled "Agenda". "The agenda" is HER OWN NAME for the week
// board — `record-week.tsx`'s own header quotes her choosing it: "For the agenda
// [the week design], I love your designs. I will go with W4, Monday to Friday,
// plus weekend folded." So this locks the WEEK card, and the "+N more" day list
// behind it, plus the same fact on the month grid's own day reading, so the two
// date views can never disagree about a task's department.
//
// WHY IT WAS MISSING AT ALL, WHICH IS WHAT THIS FILE REALLY GUARDS. The
// department was never absent from the screen's own shaping: `weekDetail`
// (tasks-screen.tsx) has answered "the task's department, and nothing else"
// since the client's ruling of 16 Sep 2026, and `weekEntries` has handed it over
// as `CalendarEntry.detail` ever since. `RecordWeek`'s own `EntryCard` simply
// read `time`, `dotTone` and `title` off the entry and ignored `detail`, so the
// line was computed on every render and dropped on the floor — a defect no
// static census in this repo could see, because every source it would read says
// the right thing. Hence a RENDER: the only oracle that can tell a value that is
// passed from a value that is drawn.
//
// THE NO-DEPARTMENT CASE IS HALF THE LAW. A task with no department draws
// NOTHING — not "None", not a placeholder dash, not a reserved blank line — the
// same silence the card already keeps about a missing time and a missing face
// (`record-week.tsx`'s own header). A placeholder word would be the defect this
// clause exists to catch, so it is asserted rather than assumed.

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { primeCache } from "@shared/web/store"
import { RememberedScreen } from "@shared/web/remembered"
import { departmentGlyph } from "@shared/departments"
import { tasksKey } from "@/lib/live-resources"
import { BASE_RECIPES } from "@/lib/screens"
import { TasksScreen } from "@/components/work/tasks-screen"
import type { Task, TaskViewName } from "@shared/types"

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
      allTotal: door.tasks.length,
      overdueTotal: door.tasks.length,
      plannedTotal: door.tasks.length,
      upcomingTotal: 0,
      completedTotal: door.tasks.length,
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
vi.mock("@/lib/api/tenancy", () => ({
  tenancy: {
    members: async () => ({ members: [] }),
    accounts: async () => ({ accounts: [], total: 0, entityTotal: 0, individualTotal: 0, nextCursor: null }),
    selectable: async () => ({ values: [], total: 0 }),
  },
}))

/** The same jsdom shims the sibling Tasks suites carry — without them the
 * screen's own controls never mount. */
beforeAll(() => {
  Object.assign(window.HTMLElement.prototype, {
    scrollIntoView: () => {},
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
    setPointerCapture: () => {},
  })
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

afterEach(cleanup)

const pad = (n: number) => String(n).padStart(2, "0")
/** TODAY, LOCAL — never `toISOString()`, which is UTC and would place a task on
 * the wrong side of midnight (and therefore in a different week) for a reader
 * east of Greenwich, exactly as `record-week.tsx`'s own `dayKeyOf` says. The
 * week board opens on the week holding today, so this is the one date that is
 * always on screen whenever this test runs. */
function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

let team = 0
/** The Tasks screen, opened straight onto the WEEK board — `useRemembered`'s
 * own slot (`task-planned-view`, tasks-screen.tsx) fed through the host's
 * memory, which is how the app itself puts a reader back on the view they left
 * on. Clicking the view switch would test the kit's toggle, not this. */
function renderAgenda(tasks: Task[], sub: "week" | "calendar" = "week", view: TaskViewName = "planned") {
  const teamId = `agenda-team-${++team}`
  door.tasks = tasks
  for (const v of ["overdue", "planned", "completed", "all"] as TaskViewName[])
    primeCache(tasksKey(teamId, v), tasks)
  primeCache(`my-perms:${teamId}`, { work: { read: true }, all_tasks: { read: true } })
  primeCache(`members:${teamId}`, [])
  primeCache(`accounts:${teamId}`, [])
  primeCache(`selectable:${teamId}`, [])
  return render(
    <RememberedScreen
      memory={{
        read: (slot) => (slot === "task-planned-view" ? sub : undefined),
        write: () => {},
      }}
    >
      <TasksScreen
        teamId={teamId}
        recipe={BASE_RECIPES["tasks.list"]}
        rights={{ work: { read: true } } as never}
        total={tasks.length}
        counts={{
          all: tasks.length,
          overdue: tasks.length,
          planned: tasks.length,
          upcoming: undefined,
          completed: tasks.length,
          calendar: undefined,
          dueToday: undefined,
          dueTodayDone: undefined,
        }}
        view={view}
        onViewChange={() => {}}
        myUserId="u1"
        canCreate
        onAction={() => {}}
        onIntent={() => {}}
      />
    </RememberedScreen>
  )
}

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

/** What the card must say, spelled by the app's own seam rather than typed out
 * here: the department's mark then its name (`departmentGlyph`,
 * shared/departments.ts), which is the identical string the board card's own
 * chip carries. A test that hard-coded "⟨⟩ Production" would keep passing if
 * the two ever drifted apart, which is the one thing it is here to catch. */
function departmentLine(name: string): string {
  return [departmentGlyph(name), name].filter(Boolean).join(" ")
}

describe("Tasks · the agenda (week) entry shows the task's department", () => {
  it("draws the department under the title, marked the way the board chip marks it", async () => {
    renderAgenda([
      task({ id: "t1", title: "Rewrite the onboarding mail", priority: 3, dueOn: today(), department: "Production" }),
    ])

    // The card itself is on screen first — otherwise an assertion about its
    // second line would pass against an empty week for the wrong reason.
    await waitFor(() => expect(screen.getAllByText("Rewrite the onboarding mail").length).toBeGreaterThan(0))

    // getAllBy…, not getBy…: the desktop grid and the phone day pager are both
    // in the DOM (a CSS breakpoint hides one, jsdom paints neither), so the
    // line legitimately appears twice — the narrow reading included, which is
    // the width this had to be checked at.
    expect(screen.getAllByText(departmentLine("Production")).length).toBeGreaterThan(0)
  })

  it("clips rather than widens: the line truncates and every box above it may shrink", async () => {
    renderAgenda([
      task({
        id: "t1",
        // A department long enough to be wider than a week column at any
        // width this app draws — the narrow reading is the one that breaks.
        title: "Quarterly handover",
        priority: 3,
        dueOn: today(),
        department: "Production and Delivery Operations",
      }),
    ])
    await waitFor(() => expect(screen.getAllByText("Quarterly handover").length).toBeGreaterThan(0))

    const line = screen.getAllByText("Production and Delivery Operations")[0]
    // `truncate` is overflow-hidden + nowrap + ellipsis: the word ENDS inside
    // the card instead of pushing its edge out, exactly as the title beside it
    // already does.
    expect(line.className).toContain("truncate")

    // AND THE CHAIN ABOVE IT CAN ACTUALLY SHRINK. `truncate` alone is not
    // enough inside flex: a flex item's automatic minimum size is its content,
    // so one un-shrinkable ancestor and the card grows instead of clipping —
    // the exact failure that makes a "clipped" complaint reappear at the
    // narrow width. Every box from the line up to the card says `min-w-0`, and
    // the day columns themselves are `minmax(0,1fr)` tracks.
    let node: HTMLElement | null = line.parentElement
    let shrinkable = 0
    while (node && node.getAttribute("data-slot") !== "card") {
      if (node.className.includes("min-w-0")) shrinkable += 1
      node = node.parentElement
    }
    expect(node?.getAttribute("data-slot")).toBe("card")
    expect(node?.className).toContain("min-w-0")
    expect(shrinkable).toBeGreaterThan(0)
  })

  it("a department a team invented itself reads as itself, with no mark", async () => {
    renderAgenda([
      task({ id: "t1", title: "Chase the invoice", priority: 2, dueOn: today(), department: "Legal" }),
    ])
    await waitFor(() => expect(screen.getAllByText("Chase the invoice").length).toBeGreaterThan(0))
    expect(departmentGlyph("Legal")).toBe("")
    expect(screen.getAllByText("Legal").length).toBeGreaterThan(0)
  })

  it("a task with NO department draws no second line at all — no placeholder word", async () => {
    renderAgenda([task({ id: "t1", title: "Call the printer", priority: 1, dueOn: today(), department: null })])

    await waitFor(() => expect(screen.getAllByText("Call the printer").length).toBeGreaterThan(0))

    // READ THE CARD ITSELF, not the screen: the page around it legitimately
    // says plenty of other words, and a placeholder is only a defect INSIDE the
    // entry. The whole card says the title and nothing else — so "None", "No
    // department", a dash or a reserved blank line all fail this one line,
    // without the test having to guess which placeholder somebody would reach
    // for.
    const card = screen.getAllByText("Call the printer")[0].closest("button")
    expect(card).not.toBeNull()
    expect(card?.textContent?.trim()).toBe("Call the printer")
  })

  it("one task's department never leaks onto another card", async () => {
    renderAgenda([
      task({ id: "t1", title: "Ship the release", priority: 4, dueOn: today(), department: "Production" }),
      task({ id: "t2", title: "Book the room", priority: 1, dueOn: today(), department: null }),
    ])

    await waitFor(() => expect(screen.getAllByText("Book the room").length).toBeGreaterThan(0))

    // Exactly as many department lines as there are tasks carrying one — the
    // undated-second-line bug would show up here as a second copy.
    const marked = screen.getAllByText(departmentLine("Production"))
    expect(marked.length).toBe(screen.getAllByText("Ship the release").length)
  })
})

// THE OTHER DATE VIEW, so the two can never disagree. The month grid's square
// has no room for a second line and never claimed to — but the DAY behind it
// does: the "+N more" dialog is the same day read as a list, and it said the
// priority and the assignee while the week board beside it said the department.
// `calendarEntries` (tasks-screen.tsx) carries the identical `weekDetail`
// string now, so the two views name one task's department the same way or this
// fails.
describe("Tasks · the month view's own day list names the department too", () => {
  it("carries it into the +N more day list, after the priority and the assignee", async () => {
    const day = today()
    renderAgenda(
      [
        task({ id: "t1", title: "Alpha", priority: 4, dueOn: day, department: "Production" }),
        task({ id: "t2", title: "Beta", priority: 3, dueOn: day }),
        task({ id: "t3", title: "Gamma", priority: 2, dueOn: day }),
        task({ id: "t4", title: "Delta", priority: 1, dueOn: day }),
      ],
      "calendar"
    )

    // FOUR on one day against the grid's own cap of three, so the square draws
    // the overflow chip this dialog is opened from.
    const more = await screen.findByText(/\+1 more/)
    fireEvent.click(more)

    const dialog = await screen.findByRole("dialog")
    await waitFor(() => expect(within(dialog).getAllByText("Alpha").length).toBeGreaterThan(0))

    // One line, three facts, in the screen's own order — the department last.
    const line = within(dialog).getByText(new RegExp(`Do it now.*Ana.*${departmentLine("Production")}`))
    expect(line).toBeTruthy()

    // And the three tasks with no department keep the two facts they had, with
    // nothing standing in for the third.
    expect(within(dialog).getByText("Important · Ana")).toBeTruthy()
  })
})
