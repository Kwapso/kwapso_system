// MOSCOW IS PARKED - Aurora's ruling, 21 Sep 2026, verbatim: "pause
// everything to do with moscow, but remind me at later stages."
//
// THE DATA AND THE DOORS STAY (`Story.moscow`, `MOSCOW_VALUES`,
// `shared/types.ts`; `create_story`/`update_story` still accept the field) - // this file pins that every UI SURFACE draws nothing while paused, through
// the app's own PARKED mechanism (`shared/rules/registry.ts`,
// `web/test/orphan-components.test.ts`): each surface moved to its own file
// under `web/components/work/` and nothing imports it any more.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { sourceFiles } from "@shared/rules/source-scan"
import { PARKED } from "@shared/rules/registry"
import { StoryFormDialog } from "@/components/work/story-form-dialog"
import { shapeStories } from "@/components/work/stories-screen"
import { MoscowChip } from "@/components/work/moscow-chip"
import { MoscowField } from "@/components/work/moscow-field"
import { moscowFacet, moscowSortOption, compareStoriesByMoscow } from "@/components/work/moscow-filters"
import type { Story } from "@shared/types"

vi.mock("@/lib/api", () => ({ ApiFailure: class extends Error {} }))

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const WEB = join(ROOT, "web")

function story(over: Partial<Story> & { id: string; title: string }): Story {
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
    moscow: "Must",
    reviewNote: null,
    reviewFileUrl: null,
    reviewFileName: null,
    accountId: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: null,
    createdByName: null,
    editedByName: null,
    ...over,
  }
}

describe("the three MoSCoW surfaces are named in PARKED and mounted nowhere", () => {
  const files = ["components", "app", "lib"].flatMap((d) =>
    sourceFiles(join(WEB, d), { extensions: [".ts", ".tsx"] })
  )
  const sources = files.map((f) => f.source)
  const imported = new Set<string>()
  for (const src of sources) for (const m of src.matchAll(/from\s+"([^"]+)"/g)) imported.add(m[1])
  const importedPaths = [...imported].map((s) => s.replace(/\.(ts|tsx)$/, ""))
  const mounted = (rel: string) => importedPaths.some((p) => p === rel || p.endsWith("/" + rel))

  it.each(["work/moscow-chip", "work/moscow-field", "work/moscow-filters"])(
    "%s is in PARKED, with a real reason, and nothing imports it",
    (rel) => {
      expect(PARKED[rel], `${rel} is missing from PARKED`).toBeTruthy()
      expect(PARKED[rel]!.length).toBeGreaterThan(30)
      expect(mounted(rel), `${rel} is imported somewhere - it is not parked`).toBe(false)
    }
  )
})

describe("the story form draws no Priority control while parked", () => {
  it("renders the form with no MoSCoW segmented control and no 'Priority' label", () => {
    render(
      <StoryFormDialog
        open
        onOpenChange={() => {}}
        teamId="team-1"
        sprints={[]}
        apps={[]}
        tickets={[]}
        members={[]}
        appStaff={new Map()}
        processes={[]}
        storyTypes={["Feature"]}
        categories={["Client-requested", "Internal"]}
        draftKey="story:add:parked-test"
        onSubmit={vi.fn(async () => {})}
      />
    )
    expect(screen.queryByText("Priority")).toBeNull()
    expect(screen.queryByText("Must")).toBeNull()
    expect(screen.queryByText("Should")).toBeNull()
    expect(screen.queryByText("Could")).toBeNull()
    expect(screen.queryByText("Won't")).toBeNull()
  })
})

describe("the backlog's own row and facet/sort vocabulary carry no MoSCoW trace", () => {
  it("shapeStories drops the moscow field entirely, even for a story that has one", () => {
    const s = story({ id: "s1", title: "Has a priority set" })
    const data = shapeStories([s], new Map(), "en")
    expect("moscow" in data.rows[0]!).toBe(false)
  })

  it("stories-screen.tsx's own toolbar carries neither the moscow facet nor the moscow sort option", () => {
    const src = readFileSync(join(WEB, "components", "work", "stories-screen.tsx"), "utf8")
    expect(src).not.toMatch(/field:\s*"moscow"/)
    expect(src).not.toMatch(/value:\s*"moscow"/)
    expect(src).not.toMatch(/<MoscowChip/)
  })

  it("story-detail.tsx draws no Priority row and imports no MoscowChip", () => {
    const src = readFileSync(join(WEB, "components", "work", "story-detail.tsx"), "utf8")
    expect(src).not.toMatch(/MoscowChip/)
  })
})

describe("parked, not dead - every moved-out surface still works when called directly", () => {
  it("MoscowChip still renders the tag", () => {
    const { container } = render(<MoscowChip value="Must" />)
    expect(container.textContent).toBe("Must")
  })

  it("MoscowField still renders the segmented control", () => {
    render(<MoscowField value="" onValueChange={() => {}} t={(s) => s} />)
    expect(screen.getByText("Must")).toBeTruthy()
    expect(screen.getByText("Won't")).toBeTruthy()
  })

  it("moscowFacet/moscowSortOption/compareStoriesByMoscow still answer the same questions", () => {
    const facet = moscowFacet((s) => s)
    expect(facet.field).toBe("moscow")
    expect(facet.options?.map((o) => o.value)).toEqual(["Must", "Should", "Could", "Won't"])
    expect(moscowSortOption((s) => s).value).toBe("moscow")
    const must = story({ id: "a", title: "a", moscow: "Must" })
    const wont = story({ id: "b", title: "b", moscow: "Won't" })
    expect(compareStoriesByMoscow(must, wont, "asc")).toBeLessThan(0)
  })
})
