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

import { Circle, MagnifyingGlass, Compass, Hammer, CheckCircle, Sliders, TrendUp } from "@shared/ui/foundations/icons"

import { sprintTypeIcon } from "@shared/sprint-types"

/** Every icon a sprint type pill can draw, keyed by `SprintTypeArt.icon`'s
 * own string, verified by hand against the kit's generated art, 16 Sep 2026. */
const SPRINT_TYPE_ICON_COMPONENTS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Circle,
  MagnifyingGlass,
  Compass,
  Hammer,
  CheckCircle,
  Sliders,
  TrendUp,
}

/** The sprint type pill's icon, drawn — `null` for a type the code has never
 * met (a team's own word, or one migration 0098 retired), the same
 * "reads as itself, draws no glyph" answer every retired-word lookup in this
 * app gives. */
export function SprintTypeGlyph({
  type,
  size = 14,
  className,
}: {
  type: string | null | undefined
  size?: number
  className?: string
}): React.ReactElement | null {
  const Icon = SPRINT_TYPE_ICON_COMPONENTS[sprintTypeIcon(type)]
  return Icon ? <Icon size={size} className={className} /> : null
}
