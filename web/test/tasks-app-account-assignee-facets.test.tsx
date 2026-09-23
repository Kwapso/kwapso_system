// T3846 — "a filter option inside tasks would be good, where I can filter my
// tasks." The Filter control already existed (Priority + Department), reachable
// on every tab, so the ticket was really about the FACETS on offer: nobody
// narrows their own list by priority or department, they narrow by which app
// or client it is for. This locks the three facets that answer the actual ask
// — App and Account on every tab, Assignee narrowing the Everyone's tab alone
// (the three MINE tabs are already narrowed to the caller's own name at the
// door, `seesEveryones` — a picker offering only their own name is a control
// with nothing to control, the same reasoning `work-logs-panel.tsx`'s own
// "Logged by" filter states for a set of one) — and that all three narrow the
// loaded page directly (client-side, the same seam Priority/Department already
// use), never a new door request.

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { primeCache } from "@shared/web/store"
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
    tasks: async () => {
      return {
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
      }
    },
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

/** WHAT JSDOM HAS NOT GOT — the identical shim
 * `stories-backlog-status-facet.test.tsx` carries for the same reason: without
 * it the facet's own trigger never opens. */
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

let team = 0
function warmTeam(tasks: Task[]): string {
  const teamId = `facet-team-${++team}`
  door.tasks = tasks
  for (const v of ["overdue", "planned", "completed", "all"] as TaskViewName[]) primeCache(tasksKey(teamId, v), tasks)
  primeCache(`my-perms:${teamId}`, { work: { read: true }, all_tasks: { read: true } })
  primeCache(`members:${teamId}`, [])
  primeCache(`accounts:${teamId}`, [])
  primeCache(`selectable:${teamId}`, [])
  return teamId
}

function renderTasks(tasks: Task[], view: TaskViewName = "overdue") {
  const teamId = warmTeam(tasks)
  return render(
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

/** Open the facet panel and choose one of a facet's words — the identical
 * choreography `stories-backlog-status-facet.test.tsx` uses. */
async function pick(label: string, option: string) {
  if (screen.queryAllByRole("group", { name: label }).length === 0)
    fireEvent.click(screen.getByRole("button", { name: /^Filter/ }))
  const facet = await screen.findByRole("group", { name: label })
  fireEvent.click(within(facet).getByRole("button"))
  const listbox = await screen.findByRole("listbox")
  await waitFor(() => expect(within(listbox).getAllByRole("option").length).toBeGreaterThan(0))
  fireEvent.click(within(listbox).getByRole("option", { name: option }))
}

describe("Tasks: the Filter control is reachable on every tab (T3846 root cause)", () => {
  it.each(["overdue", "planned", "completed", "all"] as TaskViewName[])(
    "shows a Filter button on the %s tab",
    async (view) => {
      renderTasks([task({ id: "t1", title: "Alpha", priority: 1 })], view)
      await screen.findByText("Alpha")
      expect(screen.getByRole("button", { name: /^Filter/ })).toBeTruthy()
    }
  )
})

describe("Tasks: the App/Account facets narrow the loaded page, client-side", () => {
  it("picking an app leaves only that app's tasks on screen", async () => {
    renderTasks([
      task({ id: "t1", title: "Alpha", priority: 1, appId: "a1", appName: "FluClinic" }),
      task({ id: "t2", title: "Beta", priority: 2, appId: "a2", appName: "Ontime Fuhrpark" }),
    ])
    await screen.findByText("Alpha")

    await pick("App", "FluClinic")

    await waitFor(() => expect(screen.queryByText("Beta")).toBeNull())
    expect(screen.getByText("Alpha")).toBeTruthy()
  })

  it("picking an account leaves only that account's tasks on screen", async () => {
    renderTasks([
      task({ id: "t1", title: "Alpha", priority: 1, accountId: "c1", accountName: "Bergman S.A." }),
      task({ id: "t2", title: "Beta", priority: 2, accountId: "c2", accountName: "Confia" }),
    ])
    await screen.findByText("Alpha")

    await pick("Account", "Bergman S.A.")

    await waitFor(() => expect(screen.queryByText("Beta")).toBeNull())
    expect(screen.getByText("Alpha")).toBeTruthy()
  })

  it("offers the App facet's options alphabetically (R75)", async () => {
    renderTasks([
      task({ id: "t1", title: "Alpha", priority: 1, appId: "a1", appName: "Zeta app" }),
      task({ id: "t2", title: "Beta", priority: 2, appId: "a2", appName: "Alpha app" }),
    ])
    await screen.findByText("Alpha")
    fireEvent.click(screen.getByRole("button", { name: /^Filter/ }))
    const facet = await screen.findByRole("group", { name: "App" })
    fireEvent.click(within(facet).getByRole("button"))
    const listbox = await screen.findByRole("listbox")
    await waitFor(() => expect(within(listbox).getAllByRole("option").length).toBeGreaterThan(0))
    const labels = within(listbox)
      .getAllByRole("option")
      .map((el) => el.textContent?.trim() ?? "")
    // The panel's own leading "clear this facet" option comes first, and
    // each option's own text carries the RecordMark's initial-letter
    // placeholder ahead of the word (no picture on either fixture app), so
    // this reads the WORD each option ends with rather than the raw string.
    expect(labels.slice(1).map((l) => l.endsWith("Alpha app"))).toEqual([true, false])
    expect(labels.slice(1).map((l) => l.endsWith("Zeta app"))).toEqual([false, true])
  })
})

describe("Tasks: the Assignee facet narrows the Everyone's tab alone", () => {
  it("does not offer an Assigned-to facet on Overdue", async () => {
    renderTasks([task({ id: "t1", title: "Alpha", priority: 1 })], "overdue")
    await screen.findByText("Alpha")
    fireEvent.click(screen.getByRole("button", { name: /^Filter/ }))
    expect(screen.queryAllByRole("group", { name: "Assigned to" }).length).toBe(0)
  })

  it("offers Assigned to on Everyone's, and picking one narrows the table", async () => {
    renderTasks(
      [
        task({ id: "t1", title: "Alpha", priority: 1, assigneeId: "u1", assigneeName: "Ana" }),
        task({ id: "t2", title: "Beta", priority: 2, assigneeId: "u2", assigneeName: "Bruno" }),
      ],
      "all"
    )
    await screen.findByText("Alpha")

    await pick("Assigned to", "Ana")

    await waitFor(() => expect(screen.queryByText("Beta")).toBeNull())
    expect(screen.getByText("Alpha")).toBeTruthy()
  })
})
