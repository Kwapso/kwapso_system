"use client"

// THE MOSCOW PRIORITY FIELD - PARKED, 21 Sep 2026.
//
// Aurora's ruling, verbatim: "pause everything to do with moscow, but remind
// me at later stages." The data and the doors stay exactly as they were
// (`Story.moscow`, `MOSCOW_VALUES`, `shared/types.ts`; `create_story`/
// `update_story` still accept the field) - this is the STORY FORM's own
// surface, the segmented control that lets somebody SET the priority, pulled
// out of `story-form-dialog.tsx` into this file of its own and unmounted
// (`PARKED["work/moscow-field"]`, `shared/rules/registry.ts`) so the app's
// own orphan-components census proves it draws nothing while paused.
//
// Delete this line and re-wire `<MoscowField>` back into the form (a single
// Field block, `shape="group"`, right where the assignee picker used to hand
// off to it) the day she asks for MoSCoW back - nothing here needs to change
// to do that; only the import and the JSX call site do.

import * as React from "react"

import { ToggleGroup, ToggleGroupItem } from "@shared/ui/components/toggle-group/toggle-group"
import { Field } from "@shared/web/field"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"
import { MOSCOW_VALUES } from "@shared/types"

export const moscowField = { ...defaultFieldConfig, label: "Priority", required: false }

export function MoscowField({
  value,
  onValueChange,
  disabled,
  className,
  t,
}: {
  value: string
  onValueChange: (v: string) => void
  disabled?: boolean
  className?: string
  t: (s: string) => string
}): React.ReactNode {
  return (
    <Field config={moscowField} shape="group" htmlFor="story-moscow" className={className}>
      <ToggleGroup
        id="story-moscow"
        type="single"
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        aria-label={t("Priority")}
      >
        {MOSCOW_VALUES.map((v) => (
          <ToggleGroupItem key={v} value={v} disabled={disabled}>
            {v}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  )
}
