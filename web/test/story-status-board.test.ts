// THE LIST AND THE BOARD, BOTH READING `storyStatusWord` NOW - Aurora's
// ruling, 21 Sep 2026: "Backlog, To Do: nono, to do means its scheduled in
// an active phase." `shapeStories` (the List's own row shaper) and
// `storyBelongsOnKanbanColumn` (the board's own column predicate), both
// exported from `stories-screen.tsx` for exactly this pinning - the same
// split `waves-timeline.test.ts` already takes over `waves-screen.tsx`'s row
// shapers, pure functions over plain data rather than a rendered screen.
//
// THE BOARD DECISION, SAID OUT LOUD HERE TOO: `stories-screen.tsx`'s own
// board (`KANBAN_STATUSES`) has no Backlog column - never did - so an open
// story outside an active phase is simply left off the board, the same way
// a done story already is. `work-panels.tsx` never had a stories BOARD at
// all (List only, through `PagedPanelBody`), so there was no second board
// decision to make there - only its own facet (below) needed the two-choice
// split.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { shapeStories, storyBelongsOnKanbanColumn } from "@/components/work/stories-screen"
import type { Story } from "@shared/types"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const TODAY = new Date().toISOString().slice(0, 10)

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(y!, (m ?? 1) - 1, (d ?? 1) + n)
  const pad = (v: number) => String(v).padStart(2, "0")
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

function story(partial: Partial<Story> & { id: string; title: string }): Story {
  return {
    ref: null,
    detail: null,
    status: "open",
    ticketId: null,
    ticketRef: null,
    sprintId: null,
    sprintName: null,
    appId: null,
    appName: null,
    appAssigneeId: null,
    processId: null,
    stepKey: null,
    changesNoStep: true,
    processIds: [],
    assigneeId: null,
    assigneeName: null,
    reviewerId: null,
    reviewerName: null,
    startsOn: null,
    dueOn: null,
    sprintEndsOn: null,
    sprintStartsOn: null,
    closedAt: null,
    closingNote: null,
    rank: null,
    storyType: "Feature",
    category: "Client-requested",
    acceptanceCriteria: null,
    buildNotes: null,
    moscow: null,
    reviewNote: null,
    reviewFileUrl: null,
    reviewFileName: null,
    accountId: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: null,
    createdByName: null,
    editedByName: null,
    ...partial,
  }
}

describe("shapeStories - the List's own status cell", () => {
  it("an open story in an active phase reads 'To Do'", () => {
    const s = story({
      id: "s1",
      title: "Build the thing",
      sprintId: "sp1",
      sprintStartsOn: addDays(TODAY, -5),
      sprintEndsOn: addDays(TODAY, 5),
    })
    const data = shapeStories([s], new Map(), "en")
    expect(data.rows[0]!.status).toBe("To Do")
  })

  it("an open story with no phase reads 'Backlog'", () => {
    const s = story({ id: "s2", title: "Someday" })
    const data = shapeStories([s], new Map(), "en")
    expect(data.rows[0]!.status).toBe("Backlog")
  })

  it("an open story in a FUTURE phase reads 'Backlog', not 'To Do'", () => {
    const s = story({
      id: "s3",
      title: "Not yet",
      sprintId: "sp2",
      sprintStartsOn: addDays(TODAY, 10),
      sprintEndsOn: addDays(TODAY, 20),
    })
    const data = shapeStories([s], new Map(), "en")
    expect(data.rows[0]!.status).toBe("Backlog")
  })

  it("an open story in a COMPLETED phase reads 'Backlog'", () => {
    const s = story({
      id: "s4",
      title: "Missed the window",
      sprintId: "sp3",
      sprintStartsOn: addDays(TODAY, -20),
      sprintEndsOn: addDays(TODAY, -10),
    })
    const data = shapeStories([s], new Map(), "en")
    expect(data.rows[0]!.status).toBe("Backlog")
  })

  it("the other three statuses are unaffected by the phase", () => {
    const s = story({ id: "s5", title: "Under way", status: "in_progress" })
    expect(shapeStories([s], new Map(), "en").rows[0]!.status).toBe("In progress")
  })
})

describe("storyBelongsOnKanbanColumn - the board's own three columns", () => {
  it("an open story in an active phase belongs in the To Do column", () => {
    const s = story({
      id: "s1",
      title: "x",
      sprintId: "sp1",
      sprintStartsOn: addDays(TODAY, -5),
      sprintEndsOn: addDays(TODAY, 5),
    })
    expect(storyBelongsOnKanbanColumn(s, "open")).toBe(true)
  })

  it("an open story with no phase does NOT belong on the board at all - no Backlog column exists", () => {
    const s = story({ id: "s2", title: "x" })
    expect(storyBelongsOnKanbanColumn(s, "open")).toBe(false)
    expect(storyBelongsOnKanbanColumn(s, "in_progress")).toBe(false)
    expect(storyBelongsOnKanbanColumn(s, "in_review")).toBe(false)
  })

  it("an open story in a future phase does not belong in To Do either", () => {
    const s = story({
      id: "s3",
      title: "x",
      sprintId: "sp2",
      sprintStartsOn: addDays(TODAY, 10),
      sprintEndsOn: addDays(TODAY, 20),
    })
    expect(storyBelongsOnKanbanColumn(s, "open")).toBe(false)
  })

  it("in_progress and in_review never ask the phase question", () => {
    const inProgress = story({ id: "s4", title: "x", status: "in_progress" })
    const inReview = story({ id: "s5", title: "x", status: "in_review" })
    expect(storyBelongsOnKanbanColumn(inProgress, "in_progress")).toBe(true)
    expect(storyBelongsOnKanbanColumn(inReview, "in_review")).toBe(true)
  })

  it("a story of the wrong status never matches a column it does not belong to", () => {
    const s = story({ id: "s6", title: "x", status: "done" })
    expect(storyBelongsOnKanbanColumn(s, "open")).toBe(false)
    expect(storyBelongsOnKanbanColumn(s, "in_progress")).toBe(false)
    expect(storyBelongsOnKanbanColumn(s, "in_review")).toBe(false)
  })
})

describe("work-panels.tsx's own StoriesPanel facet - Backlog and To Do as two choices over one stored status", () => {
  it("offers five values: backlog/to_do (virtual) plus the three untouched statuses", () => {
    const src = readFileSync(join(ROOT, "web", "components", "work", "work-panels.tsx"), "utf8")
    const at = src.indexOf('field: "status"')
    expect(at, "the StoriesPanel's own status facet").toBeGreaterThan(-1)
    const block = src.slice(at, at + 700)
    expect(block).toMatch(/value:\s*"backlog"/)
    expect(block).toMatch(/value:\s*"to_do"/)
    expect(block).toMatch(/value:\s*"in_progress"/)
    expect(block).toMatch(/value:\s*"in_review"/)
    expect(block).toMatch(/value:\s*"done"/)
    // Neither virtual word is a stored status this door ever writes.
    expect(block).not.toMatch(/value:\s*"open"/)
  })
})
