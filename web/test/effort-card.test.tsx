// THE SHARED EFFORT CARD (web/components/work/effort-card.tsx) — the card
// the task sheet, the story page and the ticket page all draw. A live proof,
// 21 Sep 2026, found it rendering no stat tiles when the only work log on a
// record rounds to "0" — a 3 second timer. Read the card's own tile branch
// (`{metrics && (<div>…3 tiles…</div>)}`) and the metrics door's own nulls
// (`StoryMetrics`/`TicketMetrics`, shared/types.ts): once at least one
// record exists, the tiles must always render, with "0m"/"0h" figures where
// a value is a real small number and "Not started"/"No time log" words where
// the door has nothing to report (`cycleTimeSeconds`/`flowEfficiency` null).

import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { clearCache } from "@shared/web/store"
import type { WorkLog } from "@shared/types"
import { EmptyGatedPanel } from "@/components/deep-link/screen-bits"

const api = vi.hoisted(() => ({
  workLogs: [] as unknown[],
}))

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    content: {
      ...actual.content,
      workLogs: async () => ({
        logs: api.workLogs,
        total: api.workLogs.length,
        totalSeconds: 0,
        nextCursor: null,
        hasMore: false,
      }),
    },
  }
})

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: () => {}, error: () => {} },
  Toaster: () => null,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

import { EffortCard } from "@/components/work/effort-card"

afterEach(cleanup)
beforeEach(() => {
  clearCache()
})

// A 3 SECOND STOPPED TIMER — the live proof's own scenario. `seconds: 3`
// rounds to "0m" through `durationLabel` (Math.round(3/60) === 0), which is
// exactly the value the bug hid behind.
const SHORT_LOG: WorkLog = {
  id: "wl-short",
  targetTable: "stories",
  targetId: "s1",
  targetLabel: "A story",
  targetRef: "B001",
  userId: "u1",
  userName: "Priya",
  kind: null,
  note: null,
  startedAt: "2026-09-21T09:00:00.000Z",
  endedAt: "2026-09-21T09:00:03.000Z",
  seconds: 3,
  discarded: false,
  accountId: null,
}

// THE PLAIN SURFACE, APP WIDE (rulebook L43, 21 Sep 2026) — `EmptyGatedPanel`
// defaults to plain now. The two cases below used to read the other way round
// (boxed was the default and plain was the tickets-only opt-in); the ruling
// swapped them, so the DEFAULT case asserts the plain drawing and `boxed`
// survives as the opposite decision a call site spells and
// `PAPER_ON_PURPOSE` names. R88's own header-drop-when-empty guard is
// unchanged by either surface.
describe("EmptyGatedPanel — surface", () => {
  it("boxed (spelled at the call site) carries data-variant=\"default\" and p-4 on its content", () => {
    render(
      <EmptyGatedPanel title="Related stories" empty={false} surface="boxed">
        <div>row</div>
      </EmptyGatedPanel>
    )
    const card = screen.getByText("Related stories").closest('[data-slot="card"]') as HTMLElement
    expect(card.getAttribute("data-variant")).toBe("default")
    expect(card.getAttribute("data-surface")).toBeNull()
    const content = card.querySelector('[data-slot="card-content"]') as HTMLElement
    expect(content.className).toContain("p-4")
  })

  it("plain (the default, no prop at all) carries data-variant=\"plain\", data-surface=\"plain\", and no p-4 on its content", () => {
    render(
      <EmptyGatedPanel title="Related stories" empty={false}>
        <div>row</div>
      </EmptyGatedPanel>
    )
    const card = screen.getByText("Related stories").closest('[data-slot="card"]') as HTMLElement
    expect(card.getAttribute("data-variant")).toBe("plain")
    expect(card.getAttribute("data-surface")).toBe("plain")
    const content = card.querySelector('[data-slot="card-content"]') as HTMLElement
    expect(content.className).not.toContain("p-4")
  })

  it("R88 still drops the whole header when empty, on the plain default too", () => {
    render(
      <EmptyGatedPanel title="Related stories" empty>
        <div>empty state</div>
      </EmptyGatedPanel>
    )
    expect(screen.queryByText("Related stories")).toBeNull()
    expect(screen.getByText("empty state")).toBeTruthy()
  })
})

describe("a 3 second log — the tiles always render once a record exists", () => {
  it("shows real, non-blank figures — '0h' effort, near-zero cycle time, a real percentage — never nothing", async () => {
    api.workLogs = [SHORT_LOG]
    render(
      <EffortCard
        targetTable="stories"
        targetId="s1"
        canEdit={false}
        members={[]}
        metrics={{ cycleTimeSeconds: 3, effortSeconds: 3, flowEfficiency: 100 }}
      />
    )
    expect(await screen.findByText("Cycle time")).toBeTruthy()
    expect(await screen.findByText("Effort hours")).toBeTruthy()
    expect(await screen.findByText("Flow efficiency")).toBeTruthy()
    // The rounded-to-zero figures — "0h" on both the Cycle time and the
    // Effort hours tiles (3 seconds rounds to 0 hours either way), not a
    // blank tile.
    expect(screen.getAllByText("0h").length).toBe(2)
    expect(screen.getByText("100%")).toBeTruthy()
    // The per-row duration — "0m", not a blank string.
    expect(screen.getByText("0m")).toBeTruthy()
  })

  it("shows 'Not started' / 'No time log' words, never a blank tile, when the metrics door itself has nulls", async () => {
    api.workLogs = [SHORT_LOG]
    render(
      <EffortCard
        targetTable="stories"
        targetId="s1"
        canEdit={false}
        members={[]}
        metrics={{ cycleTimeSeconds: null, effortSeconds: 0, flowEfficiency: null }}
      />
    )
    expect(await screen.findByText("Cycle time")).toBeTruthy()
    expect(screen.getByText("Not started")).toBeTruthy()
    expect(screen.getByText("No time log")).toBeTruthy()
    // Effort hours is never null on the type (StoryMetrics/TicketMetrics) —
    // it always draws a real figure, "0h" here.
    expect(screen.getByText("0h")).toBeTruthy()
  })

  it("draws the row's own '0m' duration even with no metrics door at all (a task)", async () => {
    api.workLogs = [SHORT_LOG]
    render(<EffortCard targetTable="tasks" targetId="s1" canEdit={false} members={[]} />)
    // No tile grid at all for a task — no metrics concept, documented in
    // this file's own header (unchanged by this fix) — but the row itself,
    // and the record it belongs to, are never hidden.
    expect(await screen.findByText("Effort")).toBeTruthy()
    expect(screen.queryByText("Cycle time")).toBeNull()
    expect(screen.getByText("0m")).toBeTruthy()
  })

  it("never renders the card at all when the record has no time logged (unchanged)", async () => {
    api.workLogs = []
    render(
      <EffortCard
        targetTable="stories"
        targetId="s1"
        canEdit={false}
        members={[]}
        metrics={{ cycleTimeSeconds: null, effortSeconds: 0, flowEfficiency: null }}
      />
    )
    // Give the list read a turn to settle before asserting absence.
    await waitFor(() => {
      expect(screen.queryByText("Effort")).toBeNull()
      expect(screen.queryByText("Cycle time")).toBeNull()
    })
  })

  // PLAIN BY DEFAULT, NO PROP AT ALL — rulebook L43 went app wide on 21 Sep
  // 2026 and `EmptyGatedPanel`'s own default is `"plain"`. This assertion used
  // to pass `surface="plain"` and prove the card FORWARDED it; the forwarding
  // prop had exactly one caller, which passed the value that is now the
  // default, so it was retired with the experiment. What is worth asserting
  // now is that the card draws no box when nobody says anything — which is
  // the whole of the ruling from this component's point of view.
  it("draws its shell plain with no surface prop at all", async () => {
    api.workLogs = [SHORT_LOG]
    render(
      <EffortCard
        targetTable="stories"
        targetId="s1"
        canEdit={false}
        members={[]}
        metrics={{ cycleTimeSeconds: 3, effortSeconds: 3, flowEfficiency: 100 }}
      />
    )
    const card = (await screen.findByText("Effort")).closest('[data-slot="card"]') as HTMLElement
    expect(card.getAttribute("data-variant")).toBe("plain")
    expect(card.getAttribute("data-surface")).toBe("plain")
  })

  // BUBBLED TO THE CALLER — the same shape `WorkLogsPanel`'s own
  // `onEmptyChange` already takes, read by a plain-surface side column to
  // keep its own separator off a section that rendered nothing (see
  // ticket-detail-body.tsx's `timeEmpty`).
  it("calls onEmptyChange(true) once it has confirmed zero rows, and never renders the card", async () => {
    api.workLogs = []
    const onEmptyChange = vi.fn()
    render(
      <EffortCard
        targetTable="stories"
        targetId="s1"
        canEdit={false}
        members={[]}
        metrics={{ cycleTimeSeconds: null, effortSeconds: 0, flowEfficiency: null }}
        onEmptyChange={onEmptyChange}
      />
    )
    await waitFor(() => {
      expect(onEmptyChange).toHaveBeenCalledWith(true)
    })
    expect(screen.queryByText("Effort")).toBeNull()
  })

  it("calls onEmptyChange(false) once a record exists", async () => {
    api.workLogs = [SHORT_LOG]
    const onEmptyChange = vi.fn()
    render(
      <EffortCard
        targetTable="stories"
        targetId="s1"
        canEdit={false}
        members={[]}
        metrics={{ cycleTimeSeconds: 3, effortSeconds: 3, flowEfficiency: 100 }}
        onEmptyChange={onEmptyChange}
      />
    )
    await waitFor(() => {
      expect(onEmptyChange).toHaveBeenCalledWith(false)
    })
  })
})

// THE VALIDATED ARTIFACT'S OWN EFFORT MOCK — Aurora, 22 Sep 2026, verbatim:
// "Fifth screenshot. That's definitely not what you showed me on the
// artifact... What's wrong is the alignment and margin in the metrics cards,
// and that the rows below should not have a background." Read against
// `${SCRATCH}/no-containers-exploration.html`'s own `.mk-stats`/`.mk-tile`
// (a full-width, 16px-gapped row of three tiles) and `.mk-row` (no fill,
// padding:6px 0, flush left).
describe("the tile grid and the log rows match the validated artifact", () => {
  it("spans the section's full width, three columns, gap-4 (16px, the mock's own figure)", async () => {
    api.workLogs = [SHORT_LOG]
    render(
      <EffortCard
        targetTable="stories"
        targetId="s1"
        canEdit={false}
        members={[]}
        metrics={{ cycleTimeSeconds: 3, effortSeconds: 3, flowEfficiency: 100 }}
      />
    )
    const cycleLabel = await screen.findByText("Cycle time")
    const grid = cycleLabel.closest(".grid") as HTMLElement
    expect(grid, "the three tiles sit in one grid").toBeTruthy()
    expect(grid.className).toContain("sm:grid-cols-3")
    expect(grid.className).toContain("gap-[var(--space-4)]")
    // No leading/trailing margin of the grid's own — its left edge is
    // whatever the section's own (unpadded) flow gives it, the same edge
    // the "Effort" title stands on.
    expect(grid.className).not.toMatch(/\bm[lxt]?-/)
  })

  it("draws the three tiles' own paper (Card default) — only the log rows below lose their fill", async () => {
    api.workLogs = [SHORT_LOG]
    render(
      <EffortCard
        targetTable="stories"
        targetId="s1"
        canEdit={false}
        members={[]}
        metrics={{ cycleTimeSeconds: 3, effortSeconds: 3, flowEfficiency: 100 }}
      />
    )
    const cycleLabel = await screen.findByText("Cycle time")
    const tile = cycleLabel.closest('[data-slot="card"]') as HTMLElement
    expect(tile, "the tile keeps its own kit Card").toBeTruthy()
    expect(tile.getAttribute("data-variant")).toBe("default")
  })

  it("draws the log rows with no fill and no rounded/divide-y border utility — a plain list", async () => {
    api.workLogs = [SHORT_LOG]
    render(
      <EffortCard
        targetTable="stories"
        targetId="s1"
        canEdit={false}
        members={[]}
        metrics={{ cycleTimeSeconds: 3, effortSeconds: 3, flowEfficiency: 100 }}
      />
    )
    const list = await screen.findByRole("list", { name: "Effort" })
    expect(list.getAttribute("data-slot")).toBe("effort-log-rows")
    expect(list.className).not.toContain("bg-surface-panel")
    expect(list.className).not.toContain("rounded")
    expect(list.className).not.toContain("divide-y")
    expect(list.className).not.toContain("divide-border")
    const row = within(list).getByRole("listitem")
    const rowContent = row.firstElementChild as HTMLElement
    expect(rowContent, "the row's own interactive/plain wrapper").toBeTruthy()
    // No fill — the specific background the old list drew is gone, and
    // nothing has replaced it.
    expect(rowContent.className).not.toContain("bg-surface-panel")
    // No horizontal inset either — the same left edge as the title and the
    // tiles above it, the mock's own alignment. `py-2` (vertical rhythm)
    // stays; only the `px-3` this row used to carry is gone.
    expect(rowContent.className).not.toMatch(/\bpx-3\b/)
    expect(rowContent.className).toContain("py-2")
  })

  it("separates rows with exactly one kit Separator between them, never above the first or below the last", async () => {
    const SECOND_LOG: WorkLog = { ...SHORT_LOG, id: "wl-second", userId: "u2", userName: "Deniz" }
    api.workLogs = [SHORT_LOG, SECOND_LOG]
    render(
      <EffortCard
        targetTable="stories"
        targetId="s1"
        canEdit={false}
        members={[]}
        metrics={{ cycleTimeSeconds: 3, effortSeconds: 3, flowEfficiency: 100 }}
      />
    )
    const list = await screen.findByRole("list", { name: "Effort" })
    const children = Array.from(list.children)
    expect(children.map((c) => c.getAttribute("data-slot") === "separator" || c.getAttribute("role") === "separator")).toEqual([
      false,
      true,
      false,
    ])
    const rows = within(list).getAllByRole("listitem")
    expect(rows.length).toBe(2)
  })

  it("a single row draws no Separator at all", async () => {
    api.workLogs = [SHORT_LOG]
    render(
      <EffortCard
        targetTable="stories"
        targetId="s1"
        canEdit={false}
        members={[]}
        metrics={{ cycleTimeSeconds: 3, effortSeconds: 3, flowEfficiency: 100 }}
      />
    )
    const list = await screen.findByRole("list", { name: "Effort" })
    expect(list.querySelector('[data-slot="separator"]')).toBeNull()
  })
})
