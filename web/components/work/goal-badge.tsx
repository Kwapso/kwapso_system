"use client"

// THE STORY LIST'S "CONTRIBUTES TO THE GOAL" BADGE - PARKED, 21 Sep 2026.
//
// Aurora's ruling, verbatim: "Remove the goal from the stories. I don't even
// know what that is, but remove it." The data and the door stay exactly as
// they were (`Story.contributesToGoal`, `stories.contributes_to_goal`,
// `create_story`/`update_story` still accept `contributesToGoal` — documented
// as parked in documents/MCP.md) - this is the STORY LIST's own surface (the
// backlog board card, `stories-screen.tsx`'s `boardCard`), the small icon
// that showed a story carried the flag, pulled out into this file of its own
// and unmounted (`PARKED["work/goal-badge"]`, `shared/rules/registry.ts`) so
// the app's own orphan-components census proves it draws nothing while
// paused.
//
// Delete this line and re-wire `<GoalBadge>` back into `boardCard`'s own
// badge row (right after the app-name badge, only when `s.contributesToGoal`
// is true) the day she asks for it back - nothing here needs to change to do
// that; only the import and the JSX call site do.

import * as React from "react"

import { Target } from "@shared/ui/foundations/icons"

export function GoalBadge({ t }: { t: (s: string) => string }): React.ReactNode {
  return (
    <span title={t("Contributes to the phase's goal")} aria-label={t("Contributes to the phase's goal")}>
      <Target className="size-3.5 text-muted-foreground" />
    </span>
  )
}
