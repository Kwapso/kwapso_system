// THE SPRINT TYPE PILL'S ICON, RESOLVED — the DOM half of `shared/
// sprint-types.ts`'s own `icon` field. App stage drew its own eight this same
// way once, in a small resolver file of its own, before its 16 Sep 2026
// correction moved the icon vocabulary here and that resolver was deleted —
// this file is the one that survived the correction, for the vocabulary the
// icons actually belong to.
//
// THAT FILE CANNOT DO THIS ITSELF. It is compiled by every worker (the team
// seed reads `SPRINT_TYPES`), and `shared/ui/` is DOM-only — a worker's
// tsconfig excludes it outright (`--jsx` off), so even importing the kit's
// icon TYPES there fails (TS6142). So `SprintTypeArt.icon` is a plain
// string, the kit's own Phosphor export name (phosphor.dev, PascalCase), and
// this file — `web/`, DOM, `.tsx` — is where that string becomes a real
// glyph.
//
// SEVEN NAMED IMPORTS, NOT A NAMESPACE INDEX: `import * as KitIcons` and
// indexing it dynamically pins every one of the kit's 1,512 exports in the
// bundle. This vocabulary's ICONS are fixed in code (never team-edited — the
// words are, the glyphs are not), so there is no data-driven name to resolve
// at runtime.

import * as React from "react"

import {
  Circle,
  MagnifyingGlass,
  Compass,
  Hammer,
  CheckCircle,
  Sliders,
  TrendUp,
  Rocket,
  Heartbeat,
} from "@shared/ui/foundations/icons"

import { phaseTypeIcon } from "@shared/sprint-types"

/** Every icon a phase type pill can draw, keyed by `PhaseTypeArt.icon`'s own
 * string. `Circle`/`TrendUp` are kept even though "Not started"/"Enhancement"
 * dropped out of `PHASE_TYPES` (Aurora's 20 Sep 2026 Wave-lifecycle reorder,
 * `shared/sprint-types.ts`) — a pre-existing phase can still carry either
 * word (deactivate, never delete, the 0094 pattern), and this map's only job
 * is to draw a glyph for whatever string it is handed. `Rocket`/`Heartbeat`
 * are the two new words, Deploy and Hypercare. */
const PHASE_TYPE_ICON_COMPONENTS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Circle,
  MagnifyingGlass,
  Compass,
  Hammer,
  CheckCircle,
  Sliders,
  TrendUp,
  Rocket,
  Heartbeat,
}

/** WHETHER `SprintTypeGlyph` WOULD DRAW ANYTHING — a call site that hands the
 * glyph into `Badge`'s own `icon` prop (R39/18 Sep 2026's leading-mark-gap
 * ruling) needs this BEFORE rendering: `icon`'s wrapper span is drawn
 * whenever the prop is not `undefined`, so handing in a `SprintTypeGlyph`
 * that itself resolves to `null` (a retired or team-coined type) would still
 * pay the leading-mark gap for an empty slot. This is the same emptiness
 * `SprintTypeGlyph` itself checks, exported so a caller can ask first. */
export function sprintTypeHasGlyph(type: string | null | undefined): boolean {
  return phaseTypeIcon(type) in PHASE_TYPE_ICON_COMPONENTS
}

/** The phase type pill's icon, drawn — `null` for a type the code has never
 * met (a team's own word, or one migration retired), the same "reads as
 * itself, draws no glyph" answer every retired-word lookup in this app
 * gives. Named `SprintTypeGlyph` still — routes/permission keys/component
 * names stay as they are unless a person reads them (Aurora's own ruling)
 * and every call site already imports this name. */
export function SprintTypeGlyph({
  type,
  size = 14,
  className,
}: {
  type: string | null | undefined
  size?: number
  className?: string
}): React.ReactElement | null {
  const Icon = PHASE_TYPE_ICON_COMPONENTS[phaseTypeIcon(type)]
  return Icon ? <Icon size={size} className={className} /> : null
}
