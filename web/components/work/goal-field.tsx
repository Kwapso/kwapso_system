"use client"

// THE "CONTRIBUTES TO THE GOAL" FIELD - PARKED, 21 Sep 2026.
//
// Aurora's ruling, verbatim: "Remove the goal from the stories. I don't even
// know what that is, but remove it." The data and the door stay exactly as
// they were (`Story.contributesToGoal`, `stories.contributes_to_goal`,
// `create_story`/`update_story` still accept `contributesToGoal` — documented
// as parked in documents/MCP.md) - this is the STORY FORM's own surface, the
// checkbox that let somebody SET the flag once a phase was chosen, pulled out
// of `story-form-dialog.tsx` into this file of its own and unmounted
// (`PARKED["work/goal-field"]`, `shared/rules/registry.ts`) so the app's own
// orphan-components census proves it draws nothing while paused.
//
// Delete this line and re-wire `<GoalField>` back into the form (a single
// Field block, `shape="group"`, right where the sprint picker hands off to
// it, shown only once `values.sprintId` is set) the day she asks for it back
// - nothing here needs to change to do that; only the import and the JSX
// call site do.

import * as React from "react"

import { Checkbox } from "@shared/ui/components/checkbox/checkbox"
import { Label } from "@shared/ui/components/label/label"
import { Field } from "@shared/web/field"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"

export const goalField = { ...defaultFieldConfig, label: "Goal", required: false }

export function GoalField({
  checked,
  onCheckedChange,
  disabled,
  className,
  t,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  t: (s: string) => string
}): React.ReactNode {
  return (
    <Field config={goalField} shape="group" htmlFor="story-contributes-to-goal" className={className}>
      <div className="flex items-center gap-2">
        <Checkbox
          id="story-contributes-to-goal"
          checked={checked}
          onCheckedChange={(c) => onCheckedChange(c === true)}
          disabled={disabled}
        />
        <Label htmlFor="story-contributes-to-goal" className="text-sm font-normal">
          {t("Contributes to the phase's goal")}
        </Label>
      </div>
    </Field>
  )
}
