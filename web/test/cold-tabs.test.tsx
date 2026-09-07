// THE TABS THAT BYPASS THE ENGINE — what a brand-new team sees on them.
//
// cold-account.test.tsx draws six recipe collections through `ScreenRenderer`
// with zero rows, which is the path every RECIPE collection takes — and it is
// exactly why the 2026-09-06 cold walk still found a bare line: Sprints'
// Overview tab (the one a new team lands on), Sprints' Calendar tab, Tasks'
// Calendar tab and Meetings' Calendar tab are host-composed bodies (a grouped
// list, three month grids) that never touch `CollectionFrame`, so the engine's
// own empty state never reaches them. Each said something true ("No sprints
// yet.", "Nothing due this month.") and offered nothing to press.
//
// The owner's ruling, 2026-09-07: "there should be empty states for
// everything." So every one of these tabs is rendered here as the REAL screen,
// with the team's caches warm and empty, and asked the two questions a new
// team's screen answers: what does it say, and is there something to press.
//
// THE CANARY IS THE ONE-ROW RENDER, and it is not optional. "Nothing in it" is
// exactly what a broken render looks like — a hook that threw, a mock that
// never resolved — so each tab is drawn a second time with a single row, which
// must then show that row and NOT the empty register.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { primeCache } from "@shared/web/store"
import { appsKey, meetingsKey, meetingsMonthKey, sprintsKey, tasksKey, totalKey } from "@/lib/live-resources"
import { BASE_RECIPES } from "@/lib/screens"
import { MeetingsScreen } from "@/components/meetings/meetings-screen"
import { SprintsScreen } from "@/components/work/sprints-screen"
import { TasksScreen } from "@/components/work/tasks-screen"
import type { Meeting, Sprint, Task } from "@shared/types"

// The screens mount their create dialogs, which reach the router; every cached
// read revalidates on mount and must be answered with the same rows it was
// primed with, or the list under test is quietly replaced mid-assertion.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))
const { door } = vi.hoisted(() => ({
  door: { sprints: [] as unknown[], tasks: [] as unknown[], meetings: [] as unknown[] },
}))
vi.mock("@/lib/api", () => ({
  ApiFailure: class extends Error {},
  content: {
    sprints: async () => ({ sprints: door.sprints, total: door.sprints.length }),
    tasks: async () => ({
      tasks: door.tasks,
      openTotal: 0,
      allTotal: 0,
      overdueTotal: 0,
      upcomingTotal: 0,
      completedTotal: 0,
      calendarTotal: door.tasks.length,
      dueTodayTotal: 0,
      dueTodayDone: 0,
    }),
    todos: async () => ({ todos: [], total: 0 }),
    meetings: async () => ({ meetings: door.meetings, total: door.meetings.length, nextCursor: null }),
    meetingPurposes: async () => ({ purposes: [], total: 0 }),
  },
  tenancy: {
    members: async () => ({ members: [] }),
    apps: async () => ({ apps: [], total: 0 }),
    accounts: async () => ({ accounts: [], total: 0, entityTotal: 0, individualTotal: 0, nextCursor: null }),
    selectable: async () => ({ values: [], total: 0 }),
    myPermissions: async () => ({ permissions: {} }),
  },
}))
// The task form's options hook reaches the tenancy door by its own path.
vi.mock("@/lib/api/tenancy", () => ({
  tenancy: {
    members: async () => ({ members: [] }),
    accounts: async () => ({ accounts: [], total: 0, entityTotal: 0, individualTotal: 0, nextCursor: null }),
    selectable: async () => ({ values: [], total: 0 }),
  },
}))

afterEach(cleanup)

const ADD_THE_FIRST = /Add the first/

/** Switch a tab the way a person does. The kit's tab strip is Radix Tabs,
 * which activates on MOUSEDOWN (its own `onMouseDown` handler), so a bare
 * `click` leaves `aria-selected` where it was and every assertion after it
 * would be about the tab that was already showing. */
function pickTab(name: RegExp) {
  const tab = screen.getByRole("tab", { name })
  fireEvent.mouseDown(tab, { button: 0 })
  fireEvent.click(tab)
  expect(tab.getAttribute("aria-selected"), `the ${name} tab did not become the selected one`).toBe("true")
}

/** Every cached read a bare team's Sprints/Tasks/Meetings screens open with,
 * primed warm so the first paint is the one under test. */
let n = 0
function coldTeam(): string {
  const teamId = `cold-${++n}`
  primeCache(`selectable:${teamId}`, [])
  primeCache(`members:${teamId}`, [])
  primeCache(appsKey(teamId), [])
  primeCache(`accounts:${teamId}`, [])
  primeCache(`purposes:${teamId}`, [])
  return teamId
}

/* ----------------------------------- sprints ------------------------------- */

const ONE_SPRINT = {
  id: "s1",
  ref: "S-1",
  name: "Launch the portal",
  goal: null,
  sprintType: null,
  accountId: null,
  accountName: null,
  appId: null,
  appName: null,
  waveId: null,
  waveName: null,
  startsOn: "2026-09-01",
  endsOn: "2026-09-14",
  soldPriceCents: 0,
  currency: null,
  completedAt: null,
  active: true,
  storyCount: 0,
  openStoryCount: 0,
  createdAt: "2026-09-01T00:00:00.000Z",
  createdByName: null,
} as Sprint

function renderSprints(sprints: Sprint[], canCreate = true) {
  const teamId = coldTeam()
  door.sprints = sprints
  primeCache(sprintsKey(teamId), sprints)
  primeCache(totalKey("sprints", teamId), sprints.length)
  return render(
    <SprintsScreen
      teamId={teamId}
      recipe={BASE_RECIPES["sprints.list"]}
      rights={{ work: { read: true, create: canCreate } } as never}
      total={sprints.length}
      canCreate={canCreate}
      onAction={() => {}}
      onIntent={() => {}}
    />
  )
}

describe("Sprints — the tab a new team lands on, and the calendar beside it", () => {
  it("Overview names the first act on a team with no sprints", async () => {
    renderSprints([])
    expect(await screen.findByText("No sprints yet.")).toBeTruthy()
    expect(screen.getByRole("button", { name: ADD_THE_FIRST })).toBeTruthy()
  })

  it("Overview draws no button for a role that cannot start one (TEN STATES #10)", async () => {
    renderSprints([], false)
    expect(await screen.findByText("No sprints yet.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: ADD_THE_FIRST })).toBeNull()
  })

  it("Calendar says the same thing rather than an empty month grid", async () => {
    renderSprints([])
    await screen.findByRole("tab", { name: /Calendar/ })
    pickTab(/Calendar/)
    expect(await screen.findByText("No sprints yet.")).toBeTruthy()
    expect(screen.getByRole("button", { name: ADD_THE_FIRST })).toBeTruthy()
    expect(screen.queryByText("No sprints start this month.")).toBeNull()
  })

  it("CANARY: one sprint draws that sprint on both tabs and no empty register", async () => {
    renderSprints([ONE_SPRINT])
    expect(await screen.findByText(/Launch the portal/)).toBeTruthy()
    expect(screen.queryByText("No sprints yet.")).toBeNull()
    expect(screen.queryByRole("button", { name: ADD_THE_FIRST })).toBeNull()
    pickTab(/Calendar/)
    // The grid, with its own month navigation, not the register.
    expect(await screen.findByRole("button", { name: /next month/i })).toBeTruthy()
    expect(screen.queryByText("No sprints yet.")).toBeNull()
    expect(screen.queryByRole("button", { name: ADD_THE_FIRST })).toBeNull()
  })
})

/* ------------------------------------ tasks -------------------------------- */

const ONE_DATED_TASK = {
  id: "t1",
  ref: null,
  title: "Send the visuals",
  detail: null,
  assigneeId: "u1",
  assigneeName: "Bea",
  dueOn: "2026-09-21T00:00:00.000Z",
  status: "open",
  completedAt: null,
  accountId: null,
  accountName: null,
  important: false,
  urgent: false,
  priority: 1,
  department: "Design",
} as unknown as Task

function renderTasksCalendar(tasks: Task[]) {
  const teamId = coldTeam()
  door.tasks = tasks
  primeCache(tasksKey(teamId, "calendar"), tasks)
  return render(
    <TasksScreen
      teamId={teamId}
      recipe={BASE_RECIPES["tasks.list"]}
      rights={{ work: { read: true, create: true } } as never}
      total={0}
      counts={{
        all: 0,
        overdue: 0,
        upcoming: 0,
        completed: 0,
        calendar: tasks.length,
        dueToday: 0,
        dueTodayDone: 0,
      }}
      view="calendar"
      onViewChange={() => {}}
      myUserId="u1"
      canCreate
      canRaiseTodo={false}
      canCancelTodo={false}
      onAction={() => {}}
      onIntent={() => {}}
    />
  )
}

describe("Tasks — the Calendar tab on a team with nothing dated", () => {
  it("names the first act instead of drawing a month with nothing in it", async () => {
    renderTasksCalendar([])
    expect(await screen.findByText("No tasks with a deadline yet.")).toBeTruthy()
    expect(screen.getByRole("button", { name: ADD_THE_FIRST })).toBeTruthy()
    expect(screen.queryByText("Nothing due this month.")).toBeNull()
  })

  it("CANARY: one dated task draws the grid, not the register", async () => {
    renderTasksCalendar([ONE_DATED_TASK])
    // The month grid is on screen the moment its navigation is — the task's
    // own square depends on which month the grid opens on, the grid does not.
    expect(await screen.findByRole("button", { name: /next month/i })).toBeTruthy()
    expect(screen.queryByText("No tasks with a deadline yet.")).toBeNull()
    expect(screen.queryByRole("button", { name: ADD_THE_FIRST })).toBeNull()
  })
})

/* ---------------------------------- meetings ------------------------------- */

const ONE_MEETING = {
  id: "m1",
  ref: null,
  title: "Kickoff with Marianne",
  accountId: null,
  accountName: null,
  appId: null,
  appName: null,
  purposeId: null,
  purposeName: null,
  agenda: null,
  notes: null,
  location: null,
  startsAt: "2026-09-10T09:00:00.000Z",
  endsAt: null,
  googleEventUrl: null,
  active: true,
  createdAt: "2026-09-01T00:00:00.000Z",
} as unknown as Meeting

function renderMeetingsCalendar(meetings: Meeting[]) {
  const teamId = coldTeam()
  door.meetings = meetings
  primeCache(meetingsKey(teamId), meetings)
  primeCache(meetingsKey(teamId, "week"), meetings)
  primeCache(totalKey("meetings", teamId), meetings.length)
  primeCache(totalKey("meetings-week", teamId), meetings.length)
  render(
    <MeetingsScreen
      teamId={teamId}
      recipe={BASE_RECIPES["meetings.list"]}
      rights={{ meetings: { read: true, create: true } } as never}
      total={meetings.length}
      purposeCount={0}
      canCreate
      canReadPurposes={false}
      onPurposes={() => {}}
      onImport={() => {}}
      onAction={() => {}}
      onIntent={() => {}}
    />
  )
  return teamId
}

describe("Meetings — the Calendar tab on a team with no meetings", () => {
  it("names both acts (add, import) instead of an empty month", async () => {
    renderMeetingsCalendar([])
    await screen.findByRole("tab", { name: /Calendar/ })
    pickTab(/Calendar/)
    expect(await screen.findByText("Nothing in Meetings yet.")).toBeTruthy()
    expect(screen.getByRole("button", { name: ADD_THE_FIRST })).toBeTruthy()
    expect(screen.getByRole("button", { name: /Import a list/ })).toBeTruthy()
    expect(screen.queryByText("Nothing in Meetings this month.")).toBeNull()
  })

  it("CANARY: one meeting draws the grid, not the register", async () => {
    const teamId = renderMeetingsCalendar([ONE_MEETING])
    // The grid asks the door for the month it opens on; the same one row.
    primeCache(meetingsMonthKey(teamId, "2026-09"), [ONE_MEETING])
    await screen.findByRole("tab", { name: /Calendar/ })
    pickTab(/Calendar/)
    expect(await screen.findByRole("button", { name: /next month/i })).toBeTruthy()
    expect(screen.queryByText("Nothing in Meetings yet.")).toBeNull()
    expect(screen.queryByRole("button", { name: ADD_THE_FIRST })).toBeNull()
  })
})
