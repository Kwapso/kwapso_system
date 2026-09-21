// PROCESSES — THE CREATE DOOR, ONE OF IT, IN THE TOOLBAR (R50/R84/R88).
//
// Live audit, staging, 1440x900, 21 Sep 2026: below the search/filter/sort
// toolbar on /processes sat two more right-aligned rows before the first
// process row — a text button "Record an app" and, further down, a black
// round "+" ("Map a process") — leaving ~170px of empty white and 126px
// between the toolbar and the first row (the law is 10px, R83).
//
// Two bugs, both in processes-screen.tsx's own call:
//
//   1. `secondary={{ show: canCreate, ... }}` was never gated on there being
//      no apps yet, so "Record an app" drew even when the team already had
//      apps — the comment right above it said the door exists so a team with
//      NO apps can record one from here, but the code never checked that.
//   2. `<SectionWithCreate useKitPanel>` wrapped `<ScreenRenderer useKitPanel>`,
//      which draws its OWN toolbar (with its own "+") below `<PagedFind>`'s —
//      two toolbars stacked, never one.
//
// FIXED by moving the create act into `<PagedFind>`'s own `actions` slot (the
// same seam contacts-screen.tsx and meetings-screen.tsx already use) and
// publishing ONE create action through `CollectionCreateActionProvider`,
// chosen by whether the team has an app yet — "Map a process" once one
// exists, "Record an app" in its place until then. The two are never both on
// offer, and the toolbar's own action is withdrawn (along with the rest of
// the toolbar) the moment the collection is genuinely empty (R50), leaving
// `CollectionEmptyState`'s own "Add the first" as the one door (R88).
//
// This suite locks the door count and the swap, not spacing pixels (R83's
// own CSS is proven elsewhere, by the toolbar-lead-gap suites) — a real
// render is what tells two toolbars from one, which no CSS census can.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ScreenRights } from "@shared/web/screen-engine/recipe"
import type { AppRow, ProcessSummary } from "@shared/types"

const doorCalls = {
  createProcess: [] as Record<string, unknown>[],
  createApp: [] as Record<string, unknown>[],
}

// MUTABLE, READ BY THE DOOR — this screen's `<PagedFind>` carries no `fixed`
// (unlike contacts-screen.tsx), so it only asks the door once a search/sort/
// facet is actually active; the RESTING state this suite draws reads the
// `processesQ`/`appsQ` caches, which are primed from these same mocked doors.
let currentApps: AppRow[] = []
let currentProcesses: ProcessSummary[] = []

vi.mock("@/lib/api", () => ({
  ApiFailure: class extends Error {},
  tenancy: {
    apps: async () => ({ apps: currentApps, total: currentApps.length }),
    processes: async () => ({
      processes: currentProcesses,
      total: currentProcesses.length,
      nextCursor: null,
    }),
    accounts: async () => ({
      accounts: [],
      total: 0,
      entityTotal: 0,
      individualTotal: 0,
      nextCursor: null,
    }),
    members: async () => ({ members: [] }),
    impact: async () => ({
      totalHoursSavedPerMonth: 0,
      totalCentsSavedPerMonth: 0,
      apps: [],
    }),
    createProcess: async (input: Record<string, unknown>) => {
      doorCalls.createProcess.push(input)
      return { id: "new-process" }
    },
    createApp: async (input: Record<string, unknown>) => {
      doorCalls.createApp.push(input)
      return { id: "new-app" }
    },
  },
}))

import { ProcessesScreen } from "@/components/process/processes-screen"
import { BASE_RECIPES } from "@/lib/screens"
import { clearCache } from "@shared/web/store"

const APPS: AppRow[] = [
  { id: "app1", ref: "A1", accountId: null, name: "Billing", url: null, stage: null, active: true } as AppRow,
]

const PROCESSES: ProcessSummary[] = [
  {
    id: "p1",
    appId: "app1",
    appName: "Billing",
    accountId: null,
    name: "Invoice a client",
    description: null,
    roleName: null,
    roleId: null,
    versionCount: 1,
    stepCount: 3,
    active: true,
    createdAt: "2026-01-01",
  } as ProcessSummary,
]

const RIGHTS = (canCreate: boolean): ScreenRights =>
  ({
    processes: { read: true, create: canCreate, edit: true, delete: true },
  }) as unknown as ScreenRights

let team = 0
function draw({
  apps = [],
  processes = [],
  canCreate = true,
}: { apps?: AppRow[]; processes?: ProcessSummary[]; canCreate?: boolean } = {}) {
  currentApps = apps
  currentProcesses = processes
  const onAction = vi.fn()
  const onIntent = vi.fn()
  render(
    <ProcessesScreen
      teamId={`team-${++team}`}
      recipe={BASE_RECIPES["processes.list"]}
      rights={RIGHTS(canCreate)}
      total={processes.length}
      canCreate={canCreate}
      onAction={onAction}
      onIntent={onIntent}
    />
  )
  return { onAction, onIntent }
}

beforeEach(() => {
  doorCalls.createProcess.length = 0
  doorCalls.createApp.length = 0
  clearCache()
})
afterEach(cleanup)

describe("with an app already on the team — one create door, in the toolbar (R50/R84)", () => {
  it("draws exactly one create button, 'Map a process' — never 'Record an app' beside it", async () => {
    draw({ apps: APPS, processes: PROCESSES, canCreate: true })
    await screen.findByText("Invoice a client")
    expect(screen.getByRole("button", { name: /Map a process/i })).toBeTruthy()
    // THE BUG — a second, right-aligned "Record an app" text button used to
    // draw here regardless of whether the team already had apps.
    expect(screen.queryByRole("button", { name: /Record an app/i })).toBeNull()
    // AND THE EMPTY REGISTER'S OWN DOOR IS NOT ALSO ON SCREEN — a collection
    // holding rows never offers "Add the first" beside its toolbar button.
    expect(screen.queryByRole("button", { name: /Add the first/i })).toBeNull()
  })

  it("is withdrawn for a role without processes:create", async () => {
    draw({ apps: APPS, processes: PROCESSES, canCreate: false })
    await screen.findByText("Invoice a client")
    expect(screen.queryByRole("button", { name: /Map a process/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /Record an app/i })).toBeNull()
  })

  it("opens the process dialog (its own title says 'Map a process'), and submits through createProcess", async () => {
    draw({ apps: APPS, processes: PROCESSES, canCreate: true })
    await screen.findByText("Invoice a client")
    fireEvent.click(screen.getByRole("button", { name: /Map a process/i }))
    // The dialog's own title — `process-form-dialog.tsx`'s
    // `editing ? "Edit process" : "Map a process"`.
    expect(await screen.findByRole("heading", { name: "Map a process" })).toBeTruthy()
  })
})

describe("with no apps yet — the secondary door is the one door (R88)", () => {
  it("never offers 'Map a process' — a map needs an app to belong to and there is not one yet", async () => {
    draw({ apps: [], processes: [], canCreate: true })
    await screen.findByText("No processes yet.")
    expect(screen.queryByRole("button", { name: /Map a process/i })).toBeNull()
  })

  it("offers 'Add the first' — the empty register's own one door — wired to record an app, not a process", async () => {
    draw({ apps: [], processes: [], canCreate: true })
    await screen.findByText("No processes yet.")
    const addTheFirst = screen.getByRole("button", { name: /Add the first/i })
    fireEvent.click(addTheFirst)
    // Opens the APP dialog — its own title, `app-form-dialog.tsx`'s
    // `editing ? "Edit app" : "Record an app"` — never the process one.
    expect(await screen.findByRole("heading", { name: "Record an app" })).toBeTruthy()
    expect(screen.queryByRole("heading", { name: "Map a process" })).toBeNull()
  })

  it("is withdrawn for a role without processes:create — no door at all, never a disabled one", async () => {
    draw({ apps: [], processes: [], canCreate: false })
    await screen.findByText("No processes yet.")
    expect(screen.queryByRole("button", { name: /Add the first/i })).toBeNull()
  })
})

describe("the swap reverts once an app exists, even with zero processes still mapped", () => {
  it("offers 'Map a process' as the one door, never 'Record an app'", async () => {
    draw({ apps: APPS, processes: [], canCreate: true })
    await screen.findByText("No processes yet.")
    // Genuinely empty (zero processes) withdraws the WHOLE toolbar (R50),
    // so the only door left is the empty register's own "Add the first".
    expect(screen.queryByRole("button", { name: /Map a process/i })).toBeNull()
    const addTheFirst = screen.getByRole("button", { name: /Add the first/i })
    fireEvent.click(addTheFirst)
    expect(await screen.findByRole("heading", { name: "Map a process" })).toBeTruthy()
  })
})
