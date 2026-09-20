"use client"

// THE STORY ROW'S "CONTRIBUTES TO THE GOAL" TOGGLE - PARKED, 21 Sep 2026.
//
// Aurora's ruling, verbatim: "Remove the goal from the stories. I don't even
// know what that is, but remove it." The data and the door stay exactly as
// they were (`Story.contributesToGoal`, `stories.contributes_to_goal`,
// `create_story`/`update_story` still accept `contributesToGoal` — documented
// as parked in documents/MCP.md) - this is the STORY ROW's own surface (a
// phase's own board, `StoriesPanel`, `work-panels.tsx`), the checkbox that
// let somebody flip the flag straight from the row, pulled out into this file
// of its own and unmounted (`PARKED["work/goal-row-toggle"]`,
// `shared/rules/registry.ts`) so the app's own orphan-components census
// proves it draws nothing while paused.
//
// Delete this line and re-wire `useGoalToggle`/`<GoalRowToggle>` back into
// `StoriesPanel` (`ownerKind === "sprint"` row, right where the checkbox used
// to sit between the story's name and its Done badge) the day she asks for it
// back - nothing here needs to change to do that; only the import and the two
// call sites (the hook and the JSX) do.

import * as React from "react"

import { Checkbox } from "@shared/ui/components/checkbox/checkbox"
import { Label } from "@shared/ui/components/label/label"
import { toast } from "@shared/ui/components/sonner/sonner"

import { ApiFailure, content as contentApi } from "@/lib/api"
import type { Story } from "@shared/types"

/** One row list's own pending overrides + the write that flips one story's
 * flag. `updateStory` REPLACES every field it reads (the door's own doc), so
 * the call carries the story's whole existing shape back — the override
 * paints the flipped state at once and is put back on a refusal so the box
 * never lies about what is saved. */
export function useGoalToggle(refresh: () => void, t: (s: string) => string) {
  const [pendingGoal, setPendingGoal] = React.useState<Record<string, boolean>>({})

  async function toggleContributesToGoal(s: Story, checked: boolean): Promise<void> {
    setPendingGoal((m) => ({ ...m, [s.id]: checked }))
    try {
      await contentApi.updateStory({
        ...s,
        detail: s.detail || undefined,
        ticketId: s.ticketId || undefined,
        sprintId: s.sprintId || undefined,
        appId: s.appId || undefined,
        processId: s.processId || undefined,
        stepKey: s.stepKey || undefined,
        assigneeId: s.assigneeId || undefined,
        reviewerId: s.reviewerId || undefined,
        startsOn: s.startsOn || undefined,
        dueOn: s.dueOn || undefined,
        accountId: s.accountId || undefined,
        storyType: s.storyType || "",
        acceptanceCriteria: s.acceptanceCriteria || undefined,
        buildNotes: s.buildNotes || undefined,
        moscow: s.moscow || undefined,
        contributesToGoal: checked,
      })
      refresh()
    } catch (err) {
      setPendingGoal((m) => ({ ...m, [s.id]: s.contributesToGoal }))
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't change that story."))
    }
  }

  return { pendingGoal, toggleContributesToGoal }
}

export function GoalRowToggle({
  story,
  checked,
  onCheckedChange,
  t,
}: {
  story: Story
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  t: (s: string) => string
}): React.ReactNode {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={`story-goal-${story.id}`}
        checked={checked}
        onCheckedChange={(c) => onCheckedChange(c === true)}
      />
      <Label htmlFor={`story-goal-${story.id}`} className="text-muted-foreground text-xs font-normal">
        {t("Contributes to the phase's goal")}
      </Label>
    </div>
  )
}
