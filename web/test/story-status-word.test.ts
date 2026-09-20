// AN OPEN STORY'S OWN WORD - Aurora's ruling, 21 Sep 2026, verbatim: "Backlog,
// To Do: nono, to do means its scheduled in an active phase." `shared/
// story-status-word.ts`'s own `storyStatusWord`/`openStoryWord`/
// `storyInActivePhase` are the ONE seam every screen that draws an open
// story's status word now asks - the List, the story detail chip, the kanban
// board, and the facet - pinned here at the source.

import { describe, expect, it } from "vitest"

import { openStoryWord, storyInActivePhase, storyStatusWord } from "@shared/story-status-word"

const TODAY = "2026-09-21"

describe("storyInActivePhase - the one test both the word and the board column ask", () => {
  it("no phase at all: never active", () => {
    expect(storyInActivePhase(null, TODAY)).toBe(false)
    expect(storyInActivePhase(undefined, TODAY)).toBe(false)
  })

  it("a phase whose dates contain today: active", () => {
    expect(storyInActivePhase({ startsOn: "2026-09-15", endsOn: "2026-09-30" }, TODAY)).toBe(true)
  })

  it("a future phase: not active", () => {
    expect(storyInActivePhase({ startsOn: "2026-10-01", endsOn: "2026-10-15" }, TODAY)).toBe(false)
  })

  it("a phase that has already ended: not active", () => {
    expect(storyInActivePhase({ startsOn: "2026-08-01", endsOn: "2026-08-15" }, TODAY)).toBe(false)
  })

  it("a started phase with no end date yet: active", () => {
    expect(storyInActivePhase({ startsOn: "2026-09-01", endsOn: null }, TODAY)).toBe(true)
  })
})

describe("openStoryWord - 'To Do' in an active phase, 'Backlog' otherwise", () => {
  it("no phase: Backlog", () => {
    expect(openStoryWord(null, TODAY)).toBe("Backlog")
  })

  it("a future phase: Backlog, never To Do", () => {
    expect(openStoryWord({ startsOn: "2026-10-01", endsOn: "2026-10-15" }, TODAY)).toBe("Backlog")
  })

  it("a completed phase: Backlog", () => {
    expect(openStoryWord({ startsOn: "2026-08-01", endsOn: "2026-08-15" }, TODAY)).toBe("Backlog")
  })

  it("an active phase: To Do", () => {
    expect(openStoryWord({ startsOn: "2026-09-01", endsOn: "2026-09-30" }, TODAY)).toBe("To Do")
  })
})

describe("storyStatusWord - the one call every screen makes for a story's status word", () => {
  it("open, active phase: To Do", () => {
    expect(storyStatusWord("open", { startsOn: "2026-09-01", endsOn: "2026-09-30" }, TODAY)).toBe("To Do")
  })

  it("open, no phase: Backlog", () => {
    expect(storyStatusWord("open", null, TODAY)).toBe("Backlog")
  })

  it("open, future phase: Backlog", () => {
    expect(storyStatusWord("open", { startsOn: "2026-10-01", endsOn: "2026-10-10" }, TODAY)).toBe("Backlog")
  })

  it("the other three statuses never ask the phase question", () => {
    expect(storyStatusWord("in_progress", null, TODAY)).toBe("In progress")
    expect(storyStatusWord("in_review", null, TODAY)).toBe("In review")
    expect(storyStatusWord("done", null, TODAY)).toBe("Done")
    // Even WITH an active phase in hand, the word is fixed for these three - // the phase question is only ever asked for `open`.
    expect(storyStatusWord("done", { startsOn: "2026-09-01", endsOn: "2026-09-30" }, TODAY)).toBe("Done")
  })
})
