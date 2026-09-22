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
//     Deadline, Description, Effort, the dark footer band last;
//   · the priority chip renders and no status chip does;
//   · Start sits left of Done in the actions row;
//   · Done is disabled, with "Stop the timer first." (R99's mirror), while a
//     timer runs on the task;
//   · Delete lives in the "…" menu.
//
// AMENDED 22 Sep 2026 — Aurora, verbatim, reading the sheet back: "on slide
// in detail pages, the ... button must be aligned with title, not with
// pills. priority is already a chip, remove it from above deadline.
// assigned to needs a background, same description, same deadline.
// description and deadline same design. bring the pencil icon out of the
// ..., next to it. if no time logged yet, hide that component. when time
// logged, as i said before, i want to see the avatar in each row." So:
//
//   · the title row holds the title, the Edit pencil (its own icon button)
//     and the "…" menu, in that order, never the chips row;
//   · the "…" menu carries only Delete now — Edit left it;
//   · no Priority fact row renders anywhere (the title row's own chip is
//     enough);
//   · Assigned to, Deadline and Description each draw as one of three
//     matching `TicketSidePanel` cards;
//   · the Effort section (the shared `EffortCard`, another lane's own empty/
//     avatar behaviour, unmodified here) is absent when the task carries no
//     logged time.
//
// AMENDED AGAIN 22 Sep 2026 — Aurora, verbatim, reading the three-card
// version back: "great work. however merge assigned to details and deadline
// in the same container together (in this order)." So the three separate
// `TicketSidePanel` cards above are now ONE card, holding, in this order,
// the Assigned to eyebrow tile, Details (the description, renamed off
// "Description"), then Deadline — the kit's own `Separator` between each
// part, no nested cards. The `task-assignee-card`/`task-deadline-card`/
// `task-description-card` slots are gone; the merged card is
// `task-details-card`, with `task-assignee-part`/`task-details-part`/
// `task-deadline-part` inside it, in that order.

import * as React from "react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { invalidate, primeCache } from "@shared/web/store"
import { RememberedScreen } from "@shared/web/remembered"
import { BASE_RECIPES } from "@/lib/screens"
import { TasksScreen } from "@/components/work/tasks-screen"
import { recordTimeKey, recordTimeSummaryKey } from "@/lib/live-resources"
import { useScreenActions } from "@/lib/use-screen-actions"
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
      // THE DEFECT THIS FILE'S OWN "reacts to a start/stop/done mutation"
      // describe blocks were written for: a live proof found Done staying
      // enabled after Start, Reopen not appearing after Done, and the Effort
      // card not appearing after a Stop, all until a full reload. Mutating
      // `door.tasks`/`door.timers`/`door.workLogs` BY REASSIGNMENT (never in
      // place) here, the same way a real fetch hands back a brand-new array —
      // mutating in place would let a stale cached reference pass React's
      // `Object.is` check and hide the very bug these tests exist to catch.
      setTaskDone: async (id: string, done: boolean) => {
        door.tasks = (door.tasks as { id: string; status: string }[]).map((x) =>
          x.id === id ? { ...x, status: done ? "done" : "open" } : x
        )
        const openTotal = (door.tasks as { status: string }[]).filter((x) => x.status !== "done").length
        return {
          tasks: door.tasks,
          openTotal,
          allTotal: door.tasks.length,
          overdueTotal: 0,
          plannedTotal: 0,
          upcomingTotal: 0,
          completedTotal: 0,
          calendarTotal: 0,
          dueTodayTotal: 0,
          dueTodayDone: 0,
        }
      },
      startTimer: async (targetTable: string, targetId: string) => {
        const startedAt = new Date().toISOString()
        const timerId = `timer-${targetTable}-${targetId}`
        door.timers = [
          ...(door.timers as unknown[]),
          { id: timerId, targetTable, targetId, targetLabel: null, targetRef: null, userId: "u1", startedAt, elapsedSeconds: 0, runaway: false },
        ]
        door.workLogs = [
          ...(door.workLogs as unknown[]),
          {
            id: timerId,
            targetTable,
            targetId,
            targetLabel: null,
            targetRef: null,
            userId: "u1",
            userName: "Ana",
            kind: null,
            note: null,
            startedAt,
            endedAt: null,
            seconds: 0,
            discarded: false,
            accountId: null,
          },
        ]
        return { timers: door.timers }
      },
      stopTimer: async (id: string) => {
        door.timers = (door.timers as { id: string }[]).filter((t) => t.id !== id)
        door.workLogs = (door.workLogs as { id: string; startedAt: string }[]).map((l) =>
          l.id === id ? { ...l, endedAt: new Date().toISOString(), seconds: 300 } : l
        )
        return { timers: door.timers }
      },
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

/** THE SAME HARNESS, WIRED TO THE REAL `onAction` DISPATCH — `Harness` above
 * stubs `onAction` to nothing, which is right for every test that never fires
 * "tasks.done", and wrong for the ones below that need to prove the sheet
 * updates once the real write lands. `deep-link-screen.tsx`'s own "tasks.done"
 * arm, reproduced verbatim: `runAction("tasks.done", { id, done: String(done) })`
 * off `ctx.record?.status !== "Done"`. */
function LiveHarness({
  teamId,
  tasks,
  initialOpenTaskId,
}: {
  teamId: string
  tasks: Task[]
  initialOpenTaskId?: string
}) {
  const [openTaskId, setOpenTaskId] = React.useState<string | null>(initialOpenTaskId ?? null)
  const { runAction } = useScreenActions(teamId)
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
        onAction={(actionId, ctx) => {
          if (actionId === "tasks.done") {
            const done = ctx.record?.status !== "Done"
            void runAction("tasks.done", { id: ctx.id ?? "", done: String(done) })
          }
        }}
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

// DEFECT (live proof): a Start/Stop/Done mutation resolved and the sheet kept
// showing the state from before it — Done stayed enabled after Start, Reopen
// never appeared after Done, and the Effort card never appeared after the
// first Stop, until a full page reload. All three are the same shape: a
// cache key the mutation's own invalidation missed, or a read this sheet (or
// the shared `EffortCard`) was not actually subscribed to.
describe("the sheet reacts to a start/stop/done mutation in the same page load, no reload", () => {
  afterEach(() => {
    door.timers = []
  })

  it("disables Done as soon as the Start mutation resolves", async () => {
    // SAVED AND RESTORED — the mock's own `startTimer` (this file's `@/lib/api`
    // mock) appends a running log to `door.workLogs`, and a later test in this
    // file counts that same array (`carries the record count beside the
    // Effort title`); left unrestored, this test would permanently grow the
    // shared fixture by one row.
    const savedLogs = door.workLogs
    try {
      const teamId = warmTeam([TASK])
      render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
      await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
      const actionsRow = document.querySelector('[data-slot="task-sheet-actions"]') as HTMLElement

      const startButton = within(actionsRow)
        .getAllByRole("button")
        .find((b) => b.textContent?.includes("Start")) as HTMLButtonElement
      expect(startButton, "the sheet must render a Start button before a timer runs").toBeTruthy()
      fireEvent.click(startButton)

      await waitFor(() => {
        const doneButton = within(actionsRow)
          .getAllByRole("button")
          .find((b) => b.textContent?.includes("Done")) as HTMLButtonElement | undefined
        expect(doneButton, "Done must still render, disabled, once Start resolves").toBeTruthy()
        expect(doneButton!.disabled).toBe(true)
      })
    } finally {
      door.workLogs = savedLogs
    }
  })

  it("shows the Effort card once the first Stop resolves, no reload", async () => {
    const savedLogs = door.workLogs
    door.workLogs = []
    // A FRESH RECORD-TIME SLICE — the same reason the "no time logged" test
    // above invalidates it first: these keys carry no teamId (target table +
    // id only, R56), so an earlier test's cached log for t1 would otherwise
    // leak into this one.
    invalidate(recordTimeKey("tasks", "t1"))
    invalidate(recordTimeSummaryKey("tasks", "t1"))
    try {
      const teamId = warmTeam([TASK])
      render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
      await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
      const sheet = document.querySelector('[data-slot="task-sheet-scroll"]') as HTMLElement
      const actionsRow = document.querySelector('[data-slot="task-sheet-actions"]') as HTMLElement

      // NO LOGGED TIME YET — the card draws nothing at all (its own rule,
      // effort-card.tsx).
      await waitFor(() => expect(within(sheet).queryByText("Effort")).toBeNull())

      const startButton = within(actionsRow)
        .getAllByRole("button")
        .find((b) => b.textContent?.includes("Start")) as HTMLButtonElement
      fireEvent.click(startButton)

      // STOP — the same button, now reading "Stop timer".
      const stopButton = await waitFor(() => {
        const b = within(actionsRow)
          .getAllByRole("button")
          .find((btn) => btn.textContent?.includes("Stop"))
        expect(b, "the Start button must flip to Stop once the timer is running").toBeTruthy()
        return b as HTMLButtonElement
      })
      fireEvent.click(stopButton)

      // THE EFFORT CARD APPEARS — one settled row, no remount, no reload.
      await waitFor(() => expect(within(sheet).queryByText("Effort")).toBeTruthy())
    } finally {
      door.workLogs = savedLogs
    }
  })

  // THE STAGING PROOF, REPRODUCED IN jsdom — a Playwright run against a
  // FRESH task found (a) Done still enabled with no tooltip immediately
  // after Start, (b) the Effort card's count and row landing but its stat
  // tiles not, at settle time, after Stop, and (c) a fresh navigation right
  // after Stop still finding the log "running". Read against the code:
  // (a) was real staleness — `refreshTimers` (timer-bar.tsx) only
  // INVALIDATED `runningTimersKey`, which drops the cache and schedules a
  // refetch but paints nothing until that refetch's own round trip lands, a
  // full second wait after the door that started the timer had already
  // answered with the fresh list. Fixed by priming that key with the
  // mutation's own `{ timers }` response instead. (b) does not reproduce on
  // a TASK: `EffortCard` only draws its three stat tiles when its caller
  // hands it a `metrics` prop, and `task-sheet.tsx` never does — a task has
  // no cycle-time clock and no status-event trail (this file's own header,
  // and effort-card.tsx's), so "0 of 3 tiles" is the permanent, correct
  // state for a task, not a race — asserted below as an explicit negative
  // rather than reproduced as a defect. (c) could not be reproduced from
  // the code: `stop`'s own request is awaited before the next line runs,
  // and nothing remounts the Start/Stop button between click and response
  // — the most likely account is the proof navigating away before that
  // await had resolved.
  it("Start disables Done with the tooltip once the door resolves, then Stop lands the Effort card's count and row (no stat tiles — a task has none)", async () => {
    const savedLogs = door.workLogs
    door.workLogs = []
    invalidate(recordTimeKey("tasks", "t1"))
    invalidate(recordTimeSummaryKey("tasks", "t1"))
    try {
      const teamId = warmTeam([TASK])
      render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
      await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
      const sheet = document.querySelector('[data-slot="task-sheet-scroll"]') as HTMLElement
      const actionsRow = document.querySelector('[data-slot="task-sheet-actions"]') as HTMLElement

      const startButton = within(actionsRow)
        .getAllByRole("button")
        .find((b) => b.textContent?.includes("Start")) as HTMLButtonElement
      fireEvent.click(startButton)

      // DONE DISABLED, ONCE THE DOOR RESOLVES — `findBy`/`waitFor`, never a
      // sleep: this is exactly the assertion the staging proof's clause (a)
      // ran too early for.
      const doneButton = await waitFor(() => {
        const b = within(actionsRow)
          .getAllByRole("button")
          .find((btn) => btn.textContent?.includes("Done")) as HTMLButtonElement | undefined
        expect(b, "Done must still render, disabled, once Start resolves").toBeTruthy()
        expect(b!.disabled).toBe(true)
        return b as HTMLButtonElement
      })
      // THE TOOLTIP TRIGGER — Radix mounts `TooltipContent` only once opened
      // (hover/focus), which jsdom cannot drive reliably (this file's own
      // "disabled Done button's own tooltip" test, source-proven for the
      // same reason); the wiring itself is provable here: the disabled
      // button sits inside a real `TooltipTrigger`.
      expect(doneButton.closest('[data-slot="task-sheet-actions"]')?.querySelector("[data-state]")).toBeTruthy()

      const stopButton = await waitFor(() => {
        const b = within(actionsRow)
          .getAllByRole("button")
          .find((btn) => btn.textContent?.includes("Stop"))
        expect(b, "the Start button must flip to Stop once the timer is running").toBeTruthy()
        return b as HTMLButtonElement
      })
      fireEvent.click(stopButton)

      // THE EFFORT CARD'S COUNT AND ROW LAND TOGETHER, no reload — clause
      // (b)'s count/row half, which the proof found correct.
      const heading = await within(sheet).findByText("Effort")
      await waitFor(() => expect(heading.closest("h3")?.textContent).toBe("Effort1"))
      const list = document.querySelector('[data-slot="effort-log-rows"]') as HTMLElement
      expect(list, "the row list is drawn").toBeTruthy()
      expect(within(list).getByText(/Ana/)).toBeTruthy()

      // NO STAT TILES — a task carries neither a cycle-time clock nor a
      // status-event trail, so `EffortCard` never receives `metrics` for
      // one and draws none, forever, not only "at settle time".
      expect(within(sheet).queryByText("Cycle time")).toBeNull()
      expect(within(sheet).queryByText("Effort hours")).toBeNull()
      expect(within(sheet).queryByText("Flow efficiency")).toBeNull()

      // DONE RE-ENABLES ONCE THE STOP MUTATION RESOLVES — the timer this
      // task's own clock was named on is gone, so R99 no longer refuses it.
      await waitFor(() => {
        const b = within(actionsRow)
          .getAllByRole("button")
          .find((btn) => btn.textContent?.includes("Done")) as HTMLButtonElement | undefined
        expect(b, "Done must render again once Stop resolves").toBeTruthy()
        expect(b!.disabled).toBe(false)
      })
    } finally {
      door.workLogs = savedLogs
    }
  })
})

describe("Done flips to Reopen once the mutation resolves, no reload", () => {
  it("marks the task done and shows Reopen in its place", async () => {
    const teamId = warmTeam([TASK])
    render(<LiveHarness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
    const actionsRow = document.querySelector('[data-slot="task-sheet-actions"]') as HTMLElement

    const doneButton = within(actionsRow)
      .getAllByRole("button")
      .find((b) => b.textContent?.includes("Done")) as HTMLButtonElement
    expect(doneButton.disabled).toBe(false)
    fireEvent.click(doneButton)

    await waitFor(() => {
      const reopenButton = within(actionsRow)
        .getAllByRole("button")
        .find((b) => b.textContent?.includes("Reopen"))
      expect(reopenButton, "Reopen must render once the done mutation resolves, no reload").toBeTruthy()
    })
    // AND DONE IS GONE — a ticked task is a record of something that
    // happened, not a button to press twice.
    expect(within(actionsRow).queryByRole("button", { name: /^Done$/ })).toBeNull()
  })
})

describe("Delete lives in the \"…\" menu, alone", () => {
  it("opens on the trigger and lists Delete, never Edit", async () => {
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
    const titleRow = document.querySelector('[data-slot="task-sheet-title-row"]') as HTMLElement
    const trigger = within(titleRow).getByRole("button", { name: "More actions" })
    fireEvent.pointerDown(trigger, { button: 0, pointerId: 1 })
    fireEvent.pointerUp(trigger, { button: 0, pointerId: 1 })
    fireEvent.click(trigger)
    const deleteItem = await waitFor(() => screen.getByRole("menuitem", { name: "Delete" }))
    expect(deleteItem.className).toMatch(/text-destructive/)
    expect(screen.queryByRole("menuitem", { name: "Edit" })).toBeNull()
  })
})

describe("the title row holds the title, the pencil and the More button (Aurora, 22 Sep 2026)", () => {
  it("the \"…\" button sits beside the title, not the priority chip above it", async () => {
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
    const titleRow = document.querySelector('[data-slot="task-sheet-title-row"]') as HTMLElement
    const heading = within(titleRow).getByRole("heading", { level: 2 })
    const editButton = within(titleRow).getByRole("button", { name: "Edit" })
    const moreButton = within(titleRow).getByRole("button", { name: "More actions" })
    // The priority chip sits above this line — the "…" and the pencil must
    // come AFTER the title in DOM order, on its own row, never beside the
    // chip.
    expect(heading.compareDocumentPosition(editButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(editButton.compareDocumentPosition(moreButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("the pencil opens the same edit form the old menu item used to", async () => {
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
    const titleRow = document.querySelector('[data-slot="task-sheet-title-row"]') as HTMLElement
    fireEvent.click(within(titleRow).getByRole("button", { name: "Edit" }))
    expect(await screen.findByDisplayValue(TASK.title)).toBeTruthy()
  })
})

describe("the order of sections, top to bottom", () => {
  it("title row, Start/Done, the merged Assigned to/Details/Deadline card, Effort, then the footer band, last", async () => {
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })

    const sheet = document.querySelector('[data-slot="task-sheet-scroll"]') as HTMLElement
    const titleRow = document.querySelector('[data-slot="task-sheet-title-row"]') as HTMLElement
    const actionsRow = document.querySelector('[data-slot="task-sheet-actions"]') as HTMLElement
    const detailsCard = document.querySelector('[data-slot="task-details-card"]') as HTMLElement
    // The Effort card's own title (`EmptyGatedPanel`) only draws once the
    // card's own work-log read settles, so this one waits.
    const effortHeading = await within(sheet).findByText("Effort")
    const footerBand = document.querySelector('[data-record-region="footer"]') as HTMLElement

    for (const el of [titleRow, actionsRow, detailsCard, effortHeading, footerBand]) {
      expect(el, "every section must be on the page").toBeTruthy()
    }

    const order = [titleRow, actionsRow, detailsCard, effortHeading, footerBand]
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

  it("no Priority fact row renders — the title row's own chip is enough (Aurora, 22 Sep 2026)", async () => {
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
    const sheet = document.querySelector('[data-slot="task-sheet-scroll"]') as HTMLElement
    // The priority WORD ("Important") still shows, in the title row's own
    // chip — only the fact row's own "Priority" LABEL is gone.
    expect(within(sheet).queryByText("Priority")).toBeNull()
  })

  it("Assigned to, Details and Deadline merge into ONE section, in that order, no card at all (Aurora, 22 Sep 2026)", async () => {
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })

    const detailsCard = document.querySelector('[data-slot="task-details-card"]') as HTMLElement
    expect(detailsCard, "the merged section must render").toBeTruthy()

    // NO CARD AT ALL — Aurora, 22 Sep 2026, reading the artifact back: "On
    // this screen, the whole 'Assigned to', details, and deadline should not
    // have a background." Supersedes the "one Card only" shape this test
    // used to prove the same day, before that second ruling landed.
    expect(detailsCard.getAttribute("data-variant")).toBeNull()
    const cards = detailsCard.querySelectorAll('[data-slot="card"]')
    expect(cards.length, "no card anywhere inside the merged section").toBe(0)

    const assigneePartEl = document.querySelector('[data-slot="task-assignee-part"]') as HTMLElement
    const detailsPartEl = document.querySelector('[data-slot="task-details-part"]') as HTMLElement
    const deadlinePartEl = document.querySelector('[data-slot="task-deadline-part"]') as HTMLElement

    for (const el of [assigneePartEl, detailsPartEl, deadlinePartEl]) {
      expect(el, "every part must render inside the merged card").toBeTruthy()
      expect(detailsCard.contains(el), "every part must sit inside the merged card").toBe(true)
    }

    // In order: Assigned to, then Details, then Deadline.
    expect(assigneePartEl.compareDocumentPosition(detailsPartEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(detailsPartEl.compareDocumentPosition(deadlinePartEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    // Assigned to's own eyebrow tile already carries the "Assigned to" word
    // (its own chip label) — no second, separate heading repeats it.
    expect(within(assigneePartEl).getAllByText("Assigned to").length).toBeGreaterThan(0)
    expect(within(detailsPartEl).getByText("Details")).toBeTruthy()
    expect(within(deadlinePartEl).getByText("Deadline")).toBeTruthy()

    // Separated by the kit's own Separator, not a second Card edge.
    const separators = detailsCard.querySelectorAll('[data-slot="separator"]')
    expect(separators.length, "one Separator between each of the three parts").toBe(2)
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

  // THE STRIPE REGISTER — Aurora, 22 Sep 2026: "the latest activity always
  // has to be at the very bottom, and also make it a stripe, not a
  // container." Kit v1.2.151 landed `RecordDetail`'s own `footerRegister`
  // prop, so `RecordFooterBand`'s `stripe` (record-chrome.tsx) now forwards
  // `footerRegister="stripe"` to the kit instead of carrying an app-side
  // descendant selector for the radius — the kit's own footer Card draws
  // `rounded-none` itself once it is told which register it is in.
  it("the footer band forwards the stripe register to the kit and is pushed to the bottom via mt-auto", async () => {
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
    const scroller = document.querySelector('[data-slot="task-sheet-scroll"]') as HTMLElement
    const inner = scroller.firstElementChild as HTMLElement
    // The scroller's own real child is the min-h-full column this sheet
    // pushes short content out to fill, so the band's own mt-auto has
    // somewhere to push against.
    expect(inner.className).toContain("min-h-full")
    const bandWrapper = inner.lastElementChild as HTMLElement
    expect(bandWrapper.className).toContain("mt-auto")
    // No app-side order class remains on the wrapper — the kit owns the
    // radius and the order now, not a descendant selector reaching into it.
    expect(bandWrapper.className).not.toContain("rounded-none")
    expect(bandWrapper.className).not.toContain("order-1")
    expect(bandWrapper.className).not.toContain("order-2")
    // The kit's own footer Card carries `rounded-none` directly — proof
    // `footerRegister="stripe"` reached `RecordDetail`, not a class this
    // wrapper reaches in from outside.
    const footerCard = document.querySelector('[data-record-region="footer"]') as HTMLElement
    expect(footerCard, "the kit's own footer card must render").toBeTruthy()
    expect(footerCard.className).toContain("rounded-none")
    expect(footerCard.className).not.toContain("-mx-[var(--pane-inset-x")
    // The call site's own padding cancel — `-mx-6 -mb-6`, matching the
    // scroller's own `px-6 py-6` — so the band reaches every edge of the
    // sheet rather than sitting inset inside that padding.
    expect(bandWrapper.className).toContain("-mx-6")
    expect(bandWrapper.className).toContain("-mb-6")
  })

  // ONE COLUMN, RECORD FIRST, LATEST ACTIVITY LAST — Aurora, the same
  // ruling: "in any kind of screen that requires that the footer displays
  // only one column instead of two, put the record on top and the latest
  // activity on the bottom." The kit's own DOM order is still Latest
  // activity, then Record (`record-detail.tsx`'s own reading order); since
  // v1.2.151 the kit itself reorders visually via CSS `order` on each
  // region once it is told `footerRegister="stripe"` — there is no
  // app-side order class left to assert on the wrapper, so this proves the
  // order classes straight on the kit's own region elements.
  it("the kit orders Record before Latest activity, with no app-side order class and the kit's own DOM order unchanged", async () => {
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
    const scroller = document.querySelector('[data-slot="task-sheet-scroll"]') as HTMLElement
    const inner = scroller.firstElementChild as HTMLElement
    const bandWrapper = inner.lastElementChild as HTMLElement
    expect(bandWrapper.className).not.toContain("[&_[data-record-region=footer-activity]]:order-2")
    expect(bandWrapper.className).not.toContain("[&_[data-record-region=footer-record]]:order-1")
    const activityRegion = document.querySelector('[data-record-region="footer-activity"]') as HTMLElement
    const recordRegion = document.querySelector('[data-record-region="footer-record"]') as HTMLElement
    expect(activityRegion, "the kit still renders its Latest activity column").toBeTruthy()
    expect(recordRegion, "the kit still renders its Record column").toBeTruthy()
    // The order classes now sit directly on the kit's own region elements.
    expect(activityRegion.className).toContain("order-2")
    expect(recordRegion.className).toContain("order-1")
    // The kit's own DOM order is untouched — Latest activity's region still
    // precedes Record's in the document, exactly as `record-detail.tsx`
    // renders it; only the CSS `order` (asserted above) reads the other way.
    expect(
      activityRegion.compareDocumentPosition(recordRegion) & Node.DOCUMENT_POSITION_FOLLOWING,
      "DOM order is unchanged — the kit renders activity before record"
    ).toBeTruthy()
  })
})

// THE EFFORT SECTION IS THE SHARED `EffortCard` NOW — same card the story
// page and the ticket page draw, no separate `WorkLogsPanel` mount and no
// "Work logs" wrapper heading of this file's own (see task-sheet.tsx's own
// header for the swap).
describe("the Effort section draws the shared EffortCard", () => {
  it("carries the record count beside the Effort title", async () => {
    const teamId = warmTeam([TASK])
    render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
    await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
    const sheet = document.querySelector('[data-slot="task-sheet-scroll"]') as HTMLElement
    const heading = await within(sheet).findByText("Effort")
    // The record count sits beside the title, inside the same `<h3>` — one WORK_LOG
    // fixture row — the same `<h3>{title}{count}</h3>` shape
    // `help-stakeholders.tsx`'s own "Stakeholders 4" register renders
    // through (`TicketSidePanel`).
    expect(heading.closest("h3")?.textContent).toBe("Effort1")
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
    const list = document.querySelector('[data-slot="effort-log-rows"]')
    expect(list, "the row list is drawn").toBeTruthy()
    const row = list!.querySelector('[role="listitem"]')
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

// EFFORT IS HIDDEN ENTIRELY WHEN THE TASK HAS NO TIME LOGGED — Aurora, 22 Sep
// 2026, this file's own header: "if no time logged yet, hide that
// component." The hiding is `EffortCard`'s OWN job (another lane's change,
// `web/components/work/effort-card.tsx`, not touched here) — the sheet just
// mounts the card exactly as it always has. This test proves the SHEET
// carries no trace of the card once it has nothing to show, whichever file
// ends up making that true.
describe("the Effort section is absent when the task has no time logged", () => {
  it("draws neither the 'Effort' title nor an empty-state card", async () => {
    const savedLogs = door.workLogs
    door.workLogs = []
    // EVERY OTHER TEST IN THIS FILE OPENS THE SAME TASK (`t1`), and
    // `EffortCard`'s own read keys (`recordTimeKey`/`recordTimeSummaryKey`)
    // carry no teamId — target table + target id only (R56, one door). So a
    // fresh `teamId` from `warmTeam` is not enough here: without this, the
    // card would resolve the SHARED cache entry an earlier test already
    // filled with Ana's one log, never noticing `door.workLogs` changed.
    invalidate(recordTimeKey("tasks", "t1"))
    invalidate(recordTimeSummaryKey("tasks", "t1"))
    try {
      const teamId = warmTeam([TASK])
      render(<Harness teamId={teamId} tasks={[TASK]} initialOpenTaskId="t1" />)
      await screen.findByRole("heading", { level: 2, name: "File the quarterly VAT return" })
      const sheet = document.querySelector('[data-slot="task-sheet-scroll"]') as HTMLElement
      // Give the card's own work-log read a turn to settle before asserting
      // its absence — the same wait every other Effort test in this file
      // gives it to assert its PRESENCE.
      await waitFor(() => {
        expect(within(sheet).queryByText("Effort")).toBeNull()
        expect(within(sheet).queryByText("No time logged yet.")).toBeNull()
      })
    } finally {
      door.workLogs = savedLogs
    }
  })
})
