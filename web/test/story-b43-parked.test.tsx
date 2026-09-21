// B43 IS PARKED, IN PART. Aurora's rulings, 21 Sep 2026 (documents/UI-RULEBOOK.md):
// "Remove the goal from the stories. I don't even know what that is, but
// remove it." (later restated, verbatim, over this file's own PARKED shape:
// "not parked, kill it", the flag is gone, not paused) and, over the Build
// notes sheet, "use the already existing component to upload images. Do not
// invent anything new. Also, don't show that there's nothing attached."
//
// THE GOAL FLAG IS DELETED, NOT PARKED. `Story.contributesToGoal`, the
// `stories.contributes_to_goal` column (team migration 0114) and the
// `create_story`/`update_story` fields are all gone; this file no longer
// pins anything about it. What remains here is `work/story-attachments.tsx`,
// a different shape, not paused, SUPERSEDED on its one call site by the
// kit's own `FileUpload`, parked through the app's own PARKED mechanism
// (`shared/rules/registry.ts`, `web/test/orphan-components.test.ts`) for a
// structural reason: a real, tested component with no mount left.

import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import * as React from "react"

import { sourceFiles } from "@shared/rules/source-scan"
import { PARKED } from "@shared/rules/registry"
import { StoryFormDialog } from "@/components/work/story-form-dialog"
import { StoryAttachmentsPanel } from "@/components/work/story-attachments"

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

describe("work/story-attachments is named in PARKED and mounted nowhere", () => {
  const files = ["components", "app", "lib"].flatMap((d) => sourceFiles(join(WEB, d), { extensions: [".ts", ".tsx"] }))
  const sources = files.map((f) => f.source)
  const imported = new Set<string>()
  for (const src of sources) for (const m of src.matchAll(/from\s+"([^"]+)"/g)) imported.add(m[1])
  const importedPaths = [...imported].map((s) => s.replace(/\.(ts|tsx)$/, ""))
  const mounted = (rel: string) => importedPaths.some((p) => p === rel || p.endsWith("/" + rel))

  it.each(["work/story-attachments"])("%s is in PARKED, with a real reason, and nothing imports it", (rel) => {
    expect(PARKED[rel], `${rel} is missing from PARKED`).toBeTruthy()
    expect(PARKED[rel]!.length).toBeGreaterThan(30)
    expect(mounted(rel), `${rel} is imported somewhere - it is not parked`).toBe(false)
  })
})

describe("the story form draws no Category control while derived", () => {
  it("renders the form with no category pills", () => {
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
        }}
      />
    )
    expect(screen.queryByLabelText("Category")).toBeNull()
    expect(screen.queryByRole("button", { name: "Enabler" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Client-requested" })).toBeNull()
  })
})

describe("the build notes sheet carries no trace of the retired attachments widget", () => {
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

describe("parked, not dead - the moved-out surface still works when called directly", () => {
  it("StoryAttachmentsPanel still mounts over a real story id", () => {
    expect(() => render(<StoryAttachmentsPanel storyId="story-1" canEdit />)).not.toThrow()
  })
})
