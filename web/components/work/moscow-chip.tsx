"use client"

// THE MOSCOW PRIORITY CHIP - PARKED, 21 Sep 2026.
//
// Aurora's ruling, verbatim: "pause everything to do with moscow, but remind
// me at later stages." The data stays (`Story.moscow`, `MOSCOW_VALUES`,
// `shared/types.ts`) - this is the TAG a story row, a board card and the
// record's own Overview row used to draw for it, pulled out of `stories-
// screen.tsx` into this file of its own and unmounted
// (`PARKED["work/moscow-chip"]`, `shared/rules/registry.ts`) so the app's own
// orphan-components census proves it draws nothing while paused.
//
// Delete this line and re-wire `<MoscowChip>` back into `stories-screen.tsx`
// (the board card's own badge row, `shapeStories`' `moscow` cell) and
// `story-detail.tsx` (the Overview "Priority" row) the day she asks for
// MoSCoW back.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import type { AppStageDotTone } from "@shared/app-stages"
import type { MoscowValue } from "@shared/types"

/** THE MOSCOW TAG'S OWN COLOUR (Aurora's ruling, 20 Sep 2026: "Must poppy,
 * Should orange, Could blue, Won't grey - as a proposal"). `red` is this
 * app's own poppy (`--dot-red` resolves to `--destructive`, which IS
 * `--kw-poppy` - `shared/ui/foundations/tokens/tokens.css`); `archived` is
 * the existing muted grey a "not going to happen" state already wears
 * elsewhere in this app, reused rather than a new tone invented for one
 * word. */
const MOSCOW_DOT_TONE: Record<MoscowValue, AppStageDotTone> = {
  Must: "red",
  Should: "orange",
  Could: "blue",
  "Won't": "archived",
}

/** THE MOSCOW TAG - a colour per rank, the client's ruling above, drawn the
 * identical `Badge variant="status" dot={…}` shape `tasks-screen.tsx`'s own
 * `PriorityChip` takes for the one other coloured-by-priority field this
 * app carries. */
export function MoscowChip({ value }: { value: MoscowValue }): React.ReactNode {
  return (
    <Badge variant="status" dot={MOSCOW_DOT_TONE[value]}>
      {value}
    </Badge>
  )
}
