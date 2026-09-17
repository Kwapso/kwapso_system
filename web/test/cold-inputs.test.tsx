// THE INPUTS SCREEN — three server tabs, no Mine tab, and the account facet
// asking the door.
//
// Task C, 15 Sep 2026 (documents/UI-RULEBOOK.md K25): the client's own
// ruling put what we are waiting on a client for on its own sidebar page,
// third in the Accounts group, with three tabs — Waiting, Overdue, Received
// — and no fourth "Mine" tab (an input is owed BY a client, so nobody on
// staff owns one the way they own a task).
//
// ── WHY THESE ASSERTIONS AND NOT OTHERS (contacts-are-a-table.test.tsx's own
// reasoning, one screen along) ──────────────────────────────────────────────
//
//   1. THE TAB ORDER AND THEIR BADGES. Three server views, each with its own
//      exact count (R16) — a badge read off the loaded page rather than the
//      counts prop would agree by coincidence on a cold render and disagree
//      the moment a search narrowed the rows under it.
//   2. WHICH VIEW REACHES THE DOOR. `view` is a FIXED param on every
//      question `<PagedFind>` asks (`fixed={{ view }}`), so switching tabs
//      must change the door's own `view=` and never just re-filter page one.
//   3. THE COLUMN ORDER AND THE BLANK CELLS. Input, Account, Contact, Due,
//      Waiting, Received on — left to right — and "Waiting" is blank on
//      Received while "Received on" is blank on Waiting/Overdue, which is
//      exactly the kind of thing a screenshot review misses and a DOM read
//      does not.
//   4. THE EMPTY STATE'S OWN CREATE BUTTON is offered on Waiting/Overdue and
//      withheld on Received — there is nothing to "ask for" on a pile of
//      things that have already come back.

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Todo } from "@shared/types"

// The create dialog (TodoFormDialog) reaches the router the same way every
// other form dialog in the app does; every cached read revalidates on mount
// too. Same mock cold-tabs.test.tsx carries for the identical reason.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

/** Every question this screen puts to the to-do door, in order. */
const asked: Record<string, string | undefined>[] = []

/** A faithful-enough fake of the real translator for THIS test's purpose —
 * proving what the screen ASKS and DRAWS, not exercising the translation
 * engine (the same stub knowledge-create-outcome.test.ts uses). */
const t = (english: string, vars?: Record<string, unknown>) =>
  vars ? english.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? "")) : english

let door: Todo[] = []
let counts = { waiting: 0, overdue: 0, received: 0 }

vi.mock("@/lib/api", () => ({
  ApiFailure: class extends Error {},
  content: {
    todos: async (opts: Record<string, string> = {}) => {
      asked.push({ ...opts })
      const view = opts.view ?? "waiting"
      const rows = door.filter((r) =>
        view === "received" ? r.completedAt != null : r.completedAt == null
      )
      return {
        todos: rows,
        total: view === "received" ? counts.received : view === "overdue" ? counts.overdue : counts.waiting,
        hasMore: false,
        nextCursor: null,
        openTotal: counts.waiting + counts.overdue,
        doneTotal: counts.received,
        allTotal: counts.waiting + counts.overdue + counts.received,
        waitingTotal: counts.waiting,
        overdueTotal: counts.overdue,
        receivedTotal: counts.received,
      }
    },
    raiseTodo: async () => ({ todos: [], openTotal: 0, doneTotal: 0, allTotal: 0 }),
    completeTodo: async () => ({ todo: door[0] }),
  },
  // The App field's own bounded read (F15, `AccountAppPicker`) — the create
  // dialog this screen opens asks for the team's apps the moment it mounts,
  // same as every other screen `listFetch.apps` backs.
  tenancy: {
    apps: async () => ({ apps: [], total: 0 }),
  },
}))

import { InputsScreen } from "@/components/accounts/inputs-screen"
import { BASE_RECIPES } from "@/lib/screens"
import { clearCache } from "@shared/web/store"

const ONE_WAITING: Todo = {
  id: "td1",
  ref: "BERG-I0001",
  title: "Send us your brand logo as an SVG",
  detail: null,
  dueOn: "2026-09-20",
  completedAt: null,
  completedByName: null,
  completedByIsClient: false,
  fileUrl: null,
  fileName: null,
  cancelled: false,
  accountId: "a1",
  accountName: "Bergman S.A.",
  accountLogoUrl: null,
  appId: null,
  appName: null,
  appLogoUrl: null,
  assignedContactId: null,
  assignedContactName: null,
  ticketId: null,
  createdAt: "2026-09-14T00:00:00.000Z",
}

const ONE_RECEIVED: Todo = {
  ...ONE_WAITING,
  id: "td2",
  ref: "BERG-I0002",
  title: "Upload Q3 brand guidelines PDF",
  completedAt: "2026-09-15T00:00:00.000Z",
  completedByName: "Lars Bergman",
  completedByIsClient: true,
}

let team = 0
function draw(view: "waiting" | "overdue" | "received" = "waiting") {
  const onViewChange = vi.fn()
  render(
    <InputsScreen
      teamId={`team-${++team}`}
      t={t}
      lang="en"
      recipe={BASE_RECIPES["tasks.list"]}
      inputsQ={{ data: [], error: undefined }}
      total={view === "waiting" ? counts.waiting : view === "overdue" ? counts.overdue : counts.received}
      counts={counts}
      view={view}
      onViewChange={onViewChange}
      canCreate
      canUpdate
    />
  )
  return { onViewChange }
}

const tabNames = () => screen.getAllByRole("tab").map((el) => el.textContent ?? "")
const headers = () => Array.from(document.querySelectorAll("thead th")).map((th) => th.textContent?.trim() ?? "")

beforeEach(() => {
  asked.length = 0
  door = []
  counts = { waiting: 0, overdue: 0, received: 0 }
  clearCache()
})
afterEach(cleanup)

describe("Inputs — the three tabs, no Mine tab", () => {
  it("draws Waiting, Overdue, Received, in that order", async () => {
    door = [ONE_WAITING]
    counts = { waiting: 1, overdue: 0, received: 0 }
    draw()
    await waitFor(() => expect(asked.length).toBeGreaterThan(0))
    expect(tabNames().map((n) => n.replace(/\d+$/, ""))).toEqual(["Waiting", "Overdue", "Received"])
    // No fourth tab — an input has no "Everyone's"/"Mine" split.
    expect(screen.queryAllByRole("tab")).toHaveLength(3)
  })

  it("badges each tab with the counts PROP, never the loaded page's length", async () => {
    door = [ONE_WAITING]
    counts = { waiting: 12, overdue: 3, received: 47 }
    draw()
    await waitFor(() => expect(asked.length).toBeGreaterThan(0))
    const tabs = tabNames()
    expect(tabs[0]).toContain("12")
    expect(tabs[1]).toContain("3")
    expect(tabs[2]).toContain("47")
  })

  it("switching tabs asks the DOOR for that view, never a client-side filter", async () => {
    door = [ONE_WAITING]
    counts = { waiting: 1, overdue: 0, received: 0 }
    draw("overdue")
    await waitFor(() => expect(asked.length).toBeGreaterThan(0))
    expect(
      asked.every((q) => q.view === "overdue"),
      "the fixed `view` rides every question this screen asks, cold or searched"
    ).toBe(true)
  })

  it("CANARY: one waiting input draws its row, with Input, Account, Contact, Due, Waiting, Received on — in that order", async () => {
    door = [ONE_WAITING]
    counts = { waiting: 1, overdue: 0, received: 0 }
    draw()
    await waitFor(() => expect(screen.queryByText(/Send us your brand logo/)).toBeTruthy())
    // The trailing "" is RecordTable's own ⋯ actions column, drawn because
    // this tab offers "Mark received" — real furniture, not a seventh field.
    expect(headers()).toEqual(["Input", "Account", "Contact", "Due", "Waiting", "Received on", ""])
  })

  it("Waiting/Overdue rows carry no Contact (a to-do names no one before it is completed) and no Received on", async () => {
    door = [ONE_WAITING]
    counts = { waiting: 1, overdue: 0, received: 0 }
    draw()
    await waitFor(() => expect(screen.queryByText(/Send us your brand logo/)).toBeTruthy())
    const row = Array.from(document.querySelectorAll("tbody tr")).find((tr) =>
      tr.textContent?.includes("Send us your brand logo")
    )
    const cells = Array.from(row?.querySelectorAll("td") ?? []).map((td) => td.textContent?.trim() ?? "")
    // Input, Account, Contact, Due, Waiting, Received on
    expect(cells[2], "no contact before completion").toBe("—")
    expect(cells[5], "no received date on an open row").toBe("—")
  })

  it("a Received row names its own Contact and Received on date, and carries no Waiting badge", async () => {
    door = [ONE_RECEIVED]
    counts = { waiting: 0, overdue: 0, received: 1 }
    draw("received")
    await waitFor(() => expect(screen.queryByText(/Upload Q3 brand guidelines/)).toBeTruthy())
    const row = Array.from(document.querySelectorAll("tbody tr")).find((tr) =>
      tr.textContent?.includes("Upload Q3 brand guidelines")
    )
    const cells = Array.from(row?.querySelectorAll("td") ?? []).map((td) => td.textContent?.trim() ?? "")
    expect(cells[2], "the client's own name, R54").toBe("Lars Bergman")
    expect(cells[4], "waiting stops once it has been received").toBe("")
    expect(cells[5], "the received date").not.toBe("—")
  })

  it("the Waiting badge is orange regardless of days waited, Overdue stays red — client ruling, 16 Sep 2026 evening: \"For inputs waiting, let's use orange\"", async () => {
    // A row waiting two days and a row waiting three weeks: before this
    // ruling the badge graded quiet-then-amber at the seven-day mark, which
    // is exactly the split this test proves is gone.
    const recentlyRaised: Todo = { ...ONE_WAITING, createdAt: new Date(Date.now() - 2 * 86400000).toISOString() }
    const longWaiting: Todo = {
      ...ONE_WAITING,
      id: "td3",
      ref: "BERG-I0003",
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    }

    door = [recentlyRaised]
    counts = { waiting: 1, overdue: 0, received: 0 }
    draw("waiting")
    await waitFor(() => expect(screen.queryByText(/Send us your brand logo/)).toBeTruthy())
    let row = Array.from(document.querySelectorAll("tbody tr")).find((tr) =>
      tr.textContent?.includes("Send us your brand logo")
    )
    expect(
      row?.querySelector('[data-slot="badge"]')?.className,
      "under a week, still orange, not the old quiet grey"
    ).toContain("bg-warning")

    cleanup()
    door = [longWaiting]
    draw("waiting")
    await waitFor(() => expect(screen.queryByText(/Send us your brand logo/)).toBeTruthy())
    row = Array.from(document.querySelectorAll("tbody tr")).find((tr) =>
      tr.textContent?.includes("Send us your brand logo")
    )
    expect(row?.querySelector('[data-slot="badge"]')?.className, "past a week, still orange").toContain(
      "bg-warning"
    )

    cleanup()
    door = [recentlyRaised]
    draw("overdue")
    await waitFor(() => expect(screen.queryByText(/Send us your brand logo/)).toBeTruthy())
    row = Array.from(document.querySelectorAll("tbody tr")).find((tr) =>
      tr.textContent?.includes("Send us your brand logo")
    )
    expect(row?.querySelector('[data-slot="badge"]')?.className, "Overdue stays red").toContain("bg-destructive")
  })

  it("a genuinely empty Waiting tab offers the create act; Received offers none", async () => {
    door = []
    counts = { waiting: 0, overdue: 0, received: 0 }
    draw("waiting")
    expect(await screen.findByText("Nothing outstanding with a client.")).toBeTruthy()
    expect(screen.getByRole("button", { name: /Add the first/i })).toBeTruthy()

    cleanup()
    draw("received")
    expect(await screen.findByText("Nothing has come back from a client yet.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Add the first/i })).toBeNull()
  })
})
