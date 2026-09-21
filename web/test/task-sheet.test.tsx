// THE TASK SLIDE-IN — Aurora's decision, verbatim, 21 Sep 2026: "implement
// the slide-in design for tasks, only 1 change: the start button on the left
// and the done on the right (keep done yellow). remove the status chip and
// replace for priority chip." Proves the sheet over a real render of
// `TasksScreen` (the same host `tasks-sort.test.tsx` already renders), the
// way `ticket-detail-no-tabs.test.tsx` proves the ticket's own one-page body:
//
//   · a row click opens the sheet (`onIntent({kind:"open",…})` → the URL's
//     own `openTaskId`, the same address a deep link arrives on);
//   · a deep link (the sheet already open on mount, no click at all) opens it
//     too;
//   · the section order top to bottom: title row, Start/Done, Assigned to,
//     Priority/Deadline, Description, Work logs, the dark footer band last;
//   · the priority chip renders and no status chip does;
//   · Start sits left of Done in the actions row;
//   · Done is disabled, with "Stop the timer first." (R99's mirror), while a
//     timer runs on the task;
//   · Delete lives in the "…" menu.

import * as React from "react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { primeCache } from "@shared/web/store"
import { RememberedScreen } from "@shared/web/remembered"
import { BASE_RECIPES } from "@/lib/screens"
import { TasksScreen } from "@/components/work/tasks-screen"
import type { Task, TeamMember, WorkLog } from "@shared/types"

const ROOT = join(__dirname, "..", "..")

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: () => {}, error: () => {}, info: () => {} },
  Toaster: () => null,
}))

// `RecordActionsMenu`'s dropdown and `RecordTimerButton`'s tooltip both ride
// Radix primitives that read these during open/close — jsdom has none of
// them. The same polyfill `head-actions-fold.test.tsx` carries for the
// identical reason.
Object.assign(window.HTMLElement.prototype, {
  scrollIntoView: () => {},
  hasPointerCapture: () => false,
  releasePointerCapture: () => {},
  setPointerCapture: () => {},
})
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

const door = vi.hoisted(() => ({
  tasks: [] as unknown[],
  timers: [] as unknown[],
  // THE TASK'S OWN EFFORT — `EffortCard` reads both through the same generic
  // `workLogs`/`workLogSummary` doors `WorkLogsPanel` already used, and its
  // per-row face through `tenancy.members()` below (`memberFace`,
  // tickets-collection.tsx) — the same trio `story-detail.test.tsx` mocks for
  // the identical card.
  workLogs: [] as unknown[],
  members: [] as unknown[],
}))

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    content: {
      ...actual.content,
      tasks: async () => ({
        tasks: door.tasks,
        openTotal: door.tasks.length,
        allTotal: door.tasks.length,
        overdueTotal: door.tasks.length,
        plannedTotal: 0,
        upcomingTotal: 0,
        completedTotal: 0,
        calendarTotal: 0,
        dueTodayTotal: 0,
        dueTodayDone: 0,
      }),
      todos: async () => ({ todos: [], total: 0 }),
      runningTimers: async () => ({ timers: door.timers }),
      workLogs: async () => ({
        logs: door.workLogs,
        total: door.workLogs.length,
        totalSeconds: (door.workLogs as { seconds: number }[]).reduce((sum, l) => sum + l.seconds, 0),
        nextCursor: null,
        hasMore: false,
      }),
      workLogSummary: async () => ({
        total: door.workLogs.length,
        totalCapped: false,
        totalSeconds: (door.workLogs as { seconds: number }[]).reduce((sum, l) => sum + l.seconds, 0),
        peopleTotal: new Set((door.workLogs as { userId: string }[]).map((l) => l.userId)).size,
        people: [],
        kinds: [],
        weeks: [],
      }),
      deleteTask: async () => ({
        openTotal: 0,
        allTotal: 0,
        overdueTotal: 0,
        plannedTotal: 0,
        upcomingTotal: 0,
        completedTotal: 0,
        calendarTotal: 0,
        dueTodayTotal: 0,
        dueTodayDone: 0,
      }),
      updateTask: async () => ({ tasks: [] }),
    },
    tenancy: {
      ...actual.tenancy,
      members: async () => ({ members: door.members }),
      apps: async () => ({ apps: [], total: 0 }),
      accounts: async () => ({ accounts: [], total: 0, entityTotal: 0, individualTotal: 0, nextCursor: null }),
      selectable: async () => ({ values: [], total: 0 }),
      myPermissions: async () => ({
        permissions: { work: { read: true, create: true, update: true }, all_tasks: { read: true } },
      }),
      recordActivity: async () => ({ activity: [], total: 0, nextCursor: null, hasMore: false }),
    },
  }
})
// The task form's options hook reaches the tenancy door by its own path
// (`use-task-form-options.ts` imports `@/lib/api/tenancy` directly) — the
// same second mock `tasks-sort.test.tsx` carries for the identical reason.
vi.mock("@/lib/api/tenancy", () => ({
  tenancy: {
    members: async () => ({ members: [] }),
    accounts: async () => ({ accounts: [], total: 0, entityTotal: 0, individualTotal: 0, nextCursor: null }),
    selectable: async () => ({ values: [], total: 0 }),
  },
}))

afterEach(cleanup)

let team = 0
function warmTeam(tasks: Task[]): string {
  const teamId = `team-${++team}`
  door.tasks = tasks
  primeCache(`my-perms:${teamId}`, { work: { read: true, create: true, update: true }, all_tasks: { read: true } })
  // THE SAME `members:<teamId>` KEY THE EFFORT CARD'S OWN `membersQ` READS
  // (R56 — one door, dedupe by key), so a row's face resolves off the same
  // cache the task form's options hook already primed here.
  primeCache(`members:${teamId}`, door.members)
  primeCache(`accounts:${teamId}`, [])
  primeCache(`selectable:${teamId}`, [])
  return teamId
}

function task(partial: Partial<Task> & { id: string; title: string; priority: 1 | 2 | 3 | 4 }): Task {
  return {
    ref: null,
    detail: "<p>Pull the figures and file it.</p>",
    assigneeId: "u1",
    assigneeName: "Ana",
    dueOn: "2026-09-30T00:00:00.000Z",
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
    createdByName: "Dana Reyes",
    ...partial,
  }
}

/** The controlled host every real deep link drives `TasksScreen` through —
 * an `openTaskId` prop synced off `onIntent`'s own "open" (a row/board card),
 * and `go` clearing it back to `null` (closing), the identical shape
 * `deep-link-screen.tsx` + `collection-content.tsx` wire it in the real app. */
function Harness({
  teamId,
  tasks,
  initialOpenTaskId,
}: {
  teamId: string
  tasks: Task[]
  initialOpenTaskId?: string
}) {
  const [openTaskId, setOpenTaskId] = React.useState<string | null>(initialOpenTaskId ?? null)
  const memory: Record<string, unknown> = { "task-overdue-view": "table" }
  return (
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
        onIntent={(intent) => {
          if (intent.kind === "open") setOpenTaskId(intent.id)
        }}
        openTaskId={openTaskId}
        basePath="/t/team-1/tasks"
        go={() => setOpenTaskId(null)}
      />
    </RememberedScreen>
  )
}

const TASK = task({
  id: "t1",
  title: "File the quarterly VAT return",
  priority: 3,
})

// THE TASK'S OWN EFFORT — one row of time, Ana's own (the task's assignee,
// `TASK.assigneeId`), so the Effort card's title carries a real hour count
// and its own row draws a real face — the same shape `story-detail.test.tsx`
// mocks for the identical card (`WORK_LOG`/`MEMBER_WITH_FACE` there).
const WORK_LOG: WorkLog = {
  id: "wl1",
  targetTable: "tasks",
  targetId: "t1",
  targetLabel: TASK.title,
  targetRef: null,
  userId: "u1",
  userName: "Ana",
  kind: null,
  note: null,
  startedAt: "2026-09-20T09:00:00.000Z",
  endedAt: "2026-09-20T10:30:00.000Z",
  seconds: 5400,
  billable: true,
  discarded: false,
  accountId: null,
}

// ANA'S OWN FACE — matched to `WORK_LOG.userId` through `memberFace`
// (tickets-collection.tsx), the same lookup the row's `<RecordMark>` reads.
const MEMBER_WITH_FACE: TeamMember = {
  userId: "u1",
  email: "ana@kwapso.com",
  firstName: "Ana",
  lastName: "Reyes",
  imageUrl: "https://kwapso.example/ana.png",
  roleId: "role-1",
  roleTitle: "Staff",
  isYou: false,
  isAdmin: false,
  isClient: false,
} as unknown as TeamMember

door.workLogs = [WORK_LOG]
door.members = [MEMBER_WITH_FACE]

describe("the task slide-in opens", () => {
  it("from a click on the row", async () => {
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} />)
    fireEvent.click(await screen.findByText("File the quarterly VAT return"))
    // The sheet's own title, an <h2> — a second copy of the same words also
    // sits in the table row behind it, so this scopes to the heading.
    expect(await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })).toBeTruthy()
  })

  it("from a deep link — already open on mount, no click at all", async () => {
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    expect(await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })).toBeTruthy()
  })
})

describe("the sheet draws a priority chip, never a status chip", () => {
  it("shows the priority word and no Open/Done chip", async () => {
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
    const titleRow = document.querySelector('[data-slot="task-sheet-title-row"]') as HTMLElement
    expect(titleRow, "the sheet renders its own title row").toBeTruthy()
    // Priority 3 = "Important" (PRIORITY_LABEL, shared/departments.ts).
    expect(within(titleRow).getByText("Important")).toBeTruthy()
    // No status word anywhere on the sheet's own scroller.
    const sheet = document.querySelector('[data-slot="task-sheet-scroll"]') as HTMLElement
    expect(within(sheet).queryByText("Open")).toBeNull()
  })
})

describe("Start sits left of Done", () => {
  it("the actions row's own two buttons read Start then Done, in that DOM order", async () => {
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
    const actionsRow = document.querySelector('[data-slot="task-sheet-actions"]') as HTMLElement
    expect(actionsRow, "the sheet renders its own actions row").toBeTruthy()
    const labels = Array.from(actionsRow.querySelectorAll("button")).map((b) => b.textContent)
    expect(labels[0]).toContain("Start")
    expect(labels[1]).toContain("Done")
  })
})

describe("Done refuses while the task's own timer runs (R99's mirror)", () => {
  it("disables the Done button while a running timer names this task", async () => {
    door.timers = [{ id: "timer-1", targetTable: "tasks", targetId: "t1", userId: "u1" }]
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
    const actionsRow = document.querySelector('[data-slot="task-sheet-actions"]') as HTMLElement
    await waitFor(() => {
      const doneButton = within(actionsRow)
        .getAllByRole("button")
        .find((b) => b.textContent?.includes("Done")) as HTMLButtonElement | undefined
      expect(doneButton).toBeTruthy()
      expect(doneButton!.disabled).toBe(true)
    })
    door.timers = []
  })

  it("the disabled Done button's own tooltip says 'Stop the timer first.' (source-proven — Radix mounts a tooltip's content only once opened, which jsdom cannot drive reliably)", () => {
    const src = readFileSync(join(ROOT, "web", "components", "work", "task-sheet.tsx"), "utf8")
    expect(src).toMatch(/timerRunningOnThis[\s\S]{0,80}<Tooltip>/)
    expect(src).toContain('<TooltipContent>{t("Stop the timer first.")}</TooltipContent>')
  })
})

describe("Delete lives in the \"…\" menu", () => {
  it("opens on the trigger and lists Edit and Delete", async () => {
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
    const titleRow = document.querySelector('[data-slot="task-sheet-title-row"]') as HTMLElement
    const trigger = within(titleRow).getByRole("button", { name: "More actions" })
    fireEvent.pointerDown(trigger, { button: 0, pointerId: 1 })
    fireEvent.pointerUp(trigger, { button: 0, pointerId: 1 })
    fireEvent.click(trigger)
    expect(await waitFor(() => screen.getByRole("menuitem", { name: "Edit" }))).toBeTruthy()
    const deleteItem = screen.getByRole("menuitem", { name: "Delete" })
    expect(deleteItem.className).toMatch(/text-destructive/)
  })
})

describe("the order of sections, top to bottom", () => {
  it("title row, Start/Done, Assigned to, Priority, Deadline, Description, Effort, then the footer band, last", async () => {
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })

    // Scoped to the sheet's own scroller — TasksScreen's toolbar (behind the
    // sheet) carries its own "Priority" sort/filter option text, which a
    // page-wide text query would collide with.
    const sheet = document.querySelector('[data-slot="task-sheet-scroll"]') as HTMLElement
    const titleRow = document.querySelector('[data-slot="task-sheet-title-row"]') as HTMLElement
    const actionsRow = document.querySelector('[data-slot="task-sheet-actions"]') as HTMLElement
    const assigneeCard = document.querySelector('[data-slot="task-assignee-card"]') as HTMLElement
    const priorityLabel = within(sheet).getByText("Priority")
    const deadlineLabel = within(sheet).getByText("Deadline")
    const descriptionHeading = within(sheet).getByText("Description")
    // The Effort card's own title (`EmptyGatedPanel`) only draws once the
    // card's own work-log read settles, so this one waits.
    const effortHeading = await within(sheet).findByText("Effort")
    const footerBand = document.querySelector('[data-record-region="footer"]') as HTMLElement

    for (const el of [titleRow, actionsRow, assigneeCard, priorityLabel, deadlineLabel, descriptionHeading, effortHeading, footerBand]) {
      expect(el, "every section must be on the page").toBeTruthy()
    }

    const order = [titleRow, actionsRow, assigneeCard, priorityLabel, deadlineLabel, descriptionHeading, effortHeading, footerBand]
    for (let i = 0; i < order.length - 1; i++) {
      const a = order[i] as HTMLElement
      const b = order[i + 1] as HTMLElement
      const position = a.compareDocumentPosition(b)
      expect(
        position & Node.DOCUMENT_POSITION_FOLLOWING,
        `element ${i} must come before element ${i + 1}`
      ).toBeTruthy()
    }
  })

  it("the footer band is the sheet's own last element", async () => {
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
    const footerBand = document.querySelector('[data-record-region="footer"]') as HTMLElement
    const scroller = document.querySelector('[data-slot="task-sheet-scroll"]') as HTMLElement
    const inner = scroller.firstElementChild as HTMLElement
    expect(inner.lastElementChild?.contains(footerBand), "the footer band must be the scroller's own last child").toBe(true)
  })
})

// THE EFFORT SECTION IS THE SHARED `EffortCard` NOW — same card the story
// page and the ticket page draw, no separate `WorkLogsPanel` mount and no
// "Work logs" wrapper heading of this file's own (see task-sheet.tsx's own
// header for the swap).
describe("the Effort section draws the shared EffortCard", () => {
  it("the title reads 'Effort' with the total hours beside it (5400s = 1.5h)", async () => {
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
    const sheet = document.querySelector('[data-slot="task-sheet-scroll"]') as HTMLElement
    const heading = await within(sheet).findByText("Effort")
    // The hour count sits beside the title, inside the same `<h3>` — a task
    // has no metrics door of its own, so this figure comes off the card's
    // own generic `workLogSummary` read rather than a caller-supplied one
    // (this file's own header for the reason).
    expect(within(heading.closest("h3") as HTMLElement).getByText("1.5h")).toBeTruthy()
  })

  it("no Cycle time / Flow efficiency grid draws — a task has neither concept", async () => {
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
    const sheet = document.querySelector('[data-slot="task-sheet-scroll"]') as HTMLElement
    await within(sheet).findByText("Effort")
    expect(within(sheet).queryByText("Cycle time")).toBeNull()
    expect(within(sheet).queryByText("Flow efficiency")).toBeNull()
  })

  it("draws Ana's own row, with her face, name, date and duration", async () => {
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
    await screen.findByText("Effort")

    // Scoped off `document`, not the render `container` — the sheet's
    // content renders through a Radix portal (`ticket-detail-no-tabs.test.tsx`
    // and this file's own "order of sections" test do the same).
    const list = document.querySelector('ul[class*="divide-y"]')
    expect(list, "the row list is drawn").toBeTruthy()
    const row = list!.querySelector("li")
    expect(row).toBeTruthy()
    expect(row!.textContent).toContain("Ana")
    expect(row!.textContent).toContain("2026-09-20")
    expect(row!.textContent).toContain("1h 30m")
    // THE FACE — `RecordMark` draws the member's own photo once `memberFace`
    // resolves it off `userId`, an <img>, never a broken or empty box.
    const face = row!.querySelector("img")
    expect(face).toBeTruthy()
    expect(face!.getAttribute("src")).toBe(MEMBER_WITH_FACE.imageUrl)
  })

  it("carries no add button — the header's own Start/Stop timer is the one way a new row is written", async () => {
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
    const sheet = document.querySelector('[data-slot="task-sheet-scroll"]') as HTMLElement
    await within(sheet).findByText("Effort")
    // `WorkLogsPanel`'s own toolbar drew a "Log time" pill; the card this
    // sheet mounts now has no toolbar and no such door at all.
    expect(within(sheet).queryByText("Log time")).toBeNull()
    expect(within(sheet).queryByRole("button", { name: /log time/i })).toBeNull()
  })
})
