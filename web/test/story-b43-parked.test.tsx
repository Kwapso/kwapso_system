// B43 IS PARKED, IN PART — Aurora's rulings, 21 Sep 2026 (documents/UI-RULEBOOK.md):
// "Remove the goal from the stories. I don't even know what that is, but
// remove it." and, over the Build notes sheet, "use the already existing
// component to upload images. Do not invent anything new. Also, don't show
// that there's nothing attached."
//
// THE DATA AND THE DOORS STAY for the goal flag (`Story.contributesToGoal`,
// `create_story`/`update_story` still accept it, documented as parked in
// documents/MCP.md) — this file pins that every UI surface this lane could
// touch draws nothing while paused, through the app's own PARKED mechanism
// (`shared/rules/registry.ts`, `web/test/orphan-components.test.ts`): each
// surface moved to its own file under `web/components/work/` and nothing
// imports it any more. `work/story-attachments.tsx` is a different shape —
// not paused, SUPERSEDED on its one call site by the kit's own `FileUpload`
// — parked for the same structural reason (a real, tested component with no
// mount left).

import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import * as React from "react"

import { sourceFiles } from "@shared/rules/source-scan"
import { PARKED } from "@shared/rules/registry"
import { StoryFormDialog } from "@/components/work/story-form-dialog"
import { GoalField } from "@/components/work/goal-field"
import { useGoalToggle, GoalRowToggle } from "@/components/work/goal-row-toggle"
import { GoalBadge } from "@/components/work/goal-badge"
import { StoryAttachmentsPanel } from "@/components/work/story-attachments"
import type { Story } from "@shared/types"

vi.mock("@/lib/api", () => ({
  ApiFailure: class extends Error {},
  content: {
    updateStory: vi.fn(async () => ({})),
    storyAttachments: vi.fn(async () => ({ attachments: [], total: 0 })),
  },
}))

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
    sprintId: "sprint-1",
    sprintName: "Phase one",
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
    category: "Enabler",
    acceptanceCriteria: null,
    buildNotes: null,
    moscow: null,
    contributesToGoal: false,
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

describe("the goal surfaces and story-attachments are named in PARKED and mounted nowhere", () => {
  const files = ["components", "app", "lib"].flatMap((d) => sourceFiles(join(WEB, d), { extensions: [".ts", ".tsx"] }))
  const sources = files.map((f) => f.source)
  const imported = new Set<string>()
  for (const src of sources) for (const m of src.matchAll(/from\s+"([^"]+)"/g)) imported.add(m[1])
  const importedPaths = [...imported].map((s) => s.replace(/\.(ts|tsx)$/, ""))
  const mounted = (rel: string) => importedPaths.some((p) => p === rel || p.endsWith("/" + rel))

  it.each(["work/goal-field", "work/goal-row-toggle", "work/goal-badge", "work/story-attachments"])(
    "%s is in PARKED, with a real reason, and nothing imports it",
    (rel) => {
      expect(PARKED[rel], `${rel} is missing from PARKED`).toBeTruthy()
      expect(PARKED[rel]!.length).toBeGreaterThan(30)
      expect(mounted(rel), `${rel} is imported somewhere - it is not parked`).toBe(false)
    }
  )
})

describe("the story form draws no Goal checkbox and no Category control while parked/derived", () => {
  it("renders the form with no 'Contributes to the phase's goal' text and no category pills", () => {
    render(
      <StoryFormDialog
        open
        onOpenChange={() => {}}
        teamId="team-1"
        sprints={[{ id: "sprint-1", name: "Phase one", mark: "Active", appId: null }]}
        apps={[]}
        tickets={[]}
        members={[]}
        appStaff={new Map()}
        processes={[]}
        storyTypes={["Feature"]}
        categories={["Client-requested", "Enabler"]}
        draftKey="story:add:b43-test"
        onSubmit={vi.fn(async () => {})}
        initial={{
          title: "A story",
          detail: "",
          sprintId: "sprint-1",
          appId: "",
          ticketId: "",
          assigneeId: "",
          storyType: "Feature",
          processIds: [],
          changesNoStep: true,
          acceptanceCriteria: "",
          moscow: "",
          contributesToGoal: false,
        }}
      />
    )
    expect(screen.queryByText("Contributes to the phase's goal")).toBeNull()
    expect(screen.queryByLabelText("Category")).toBeNull()
    expect(screen.queryByRole("button", { name: "Enabler" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Client-requested" })).toBeNull()
  })
})

describe("the story rows and the build notes sheet carry no trace of the retired controls", () => {
  it("work-panels.tsx no longer wires the goal toggle inline", () => {
    const src = sourceFiles(join(WEB, "components", "work"), { extensions: [".tsx"] }).find(
      (f) => f.rel === "work-panels.tsx"
    )!.source
    expect(src).not.toMatch(/toggleContributesToGoal/)
    expect(src).not.toMatch(/pendingGoal/)
  })

  it("story-build-notes-sheet.tsx draws the kit's FileUpload, never StoryAttachmentsPanel or a 'nothing attached' line", () => {
    const src = sourceFiles(join(WEB, "components", "work"), { extensions: [".tsx"] }).find(
      (f) => f.rel === "story-build-notes-sheet.tsx"
    )!.source
    expect(src).toMatch(/<FileUpload/)
    // The header prose is allowed to NAME the retired shape in explanation
    // (`` `<StoryAttachmentsPanel>` ``, the old "Nothing attached yet." empty
    // title, both quoted for the record); what must be gone is an actual JSX
    // call site rendering the panel, or an `emptyTitle`/rendered sentence
    // saying nothing is attached.
    expect(src).not.toMatch(/<StoryAttachmentsPanel\s+storyId/)
    expect(src).not.toMatch(/emptyTitle/)
  })
})

describe("parked, not dead - every moved-out surface still works when called directly", () => {
  it("GoalField still renders the checkbox and label", () => {
    render(<GoalField checked={false} onCheckedChange={() => {}} t={(s) => s} />)
    expect(screen.getByText("Contributes to the phase's goal")).toBeTruthy()
    expect(screen.getByRole("checkbox")).toBeTruthy()
  })

  it("useGoalToggle/GoalRowToggle still answer the same question over a real story", () => {
    const s = story({ id: "s1", title: "A story", contributesToGoal: false })
    function Harness() {
      const { pendingGoal, toggleContributesToGoal } = useGoalToggle(() => {}, (t) => t)
      return (
        <GoalRowToggle
          story={s}
          checked={pendingGoal[s.id] ?? s.contributesToGoal}
          onCheckedChange={(c) => void toggleContributesToGoal(s, c)}
          t={(t) => t}
        />
      )
    }
    render(<Harness />)
    expect(screen.getByText("Contributes to the phase's goal")).toBeTruthy()
    expect(screen.getByRole("checkbox")).toBeTruthy()
  })

  it("GoalBadge still renders its icon with an accessible label", () => {
    render(<GoalBadge t={(s) => s} />)
    expect(screen.getByLabelText("Contributes to the phase's goal")).toBeTruthy()
  })

  it("StoryAttachmentsPanel still mounts over a real story id", () => {
    expect(() => render(<StoryAttachmentsPanel storyId="story-1" canEdit />)).not.toThrow()
  })
})
