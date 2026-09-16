// THE STAGE PILL'S ICON, RESOLVED — the DOM half of `shared/app-stages.ts`'s
// own `icon` field.
//
// THAT FILE CANNOT DO THIS ITSELF. It is compiled by every worker (the team
// seed reads `APP_STAGES`), and `shared/ui/` is DOM-only — a worker's tsconfig
// excludes it outright (`--jsx` off), so even importing the kit's icon TYPES
// there fails (TS6142). So `AppStage.icon` is a plain string, the kit's own
// Phosphor export name (phosphor.dev, PascalCase — UI-CONVENTIONS' "no alias
// layer" rule), and this file — `web/`, DOM, `.tsx` — is where that string
// becomes a real glyph.
//
// EIGHT NAMED IMPORTS, NOT A NAMESPACE INDEX, for the same reason
// `shared/web/screen-engine/icon-map.ts` gives at length: `import * as
// KitIcons` and indexing it dynamically pins every one of the kit's 1,512
// exports in the bundle. This vocabulary is fixed in code (eight stages, never
// team-edited — `shared/app-stages.ts`'s own header), so there is no DATA-driven
// name to resolve at runtime and no case for that file's generated census
// either: eight names, hand-written once, the smallest shape that draws them.

import * as React from "react"

import { Archive, CheckCircle, Circle, Compass, Hammer, MagnifyingGlass, Sliders, TrendUp } from "@shared/ui/foundations/icons"

import { appStageIcon } from "@shared/app-stages"

/** Every icon a stage pill can draw, keyed by `AppStage.icon`'s own string —
 * verified by hand against the kit's generated art (shared/ui/foundations/
 * icons/*.svg) when these eight names were chosen, 16 Sep 2026. */
const APP_STAGE_ICON_COMPONENTS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Circle,
  MagnifyingGlass,
  Compass,
  Hammer,
  CheckCircle,
  Sliders,
  TrendUp,
  Archive,
}

/** The stage pill's icon, drawn — `null` for a stage the code has never met
 * (a retired name still sitting on an old app, or one a team invented), the
 * same "reads as itself, draws no glyph" answer `appStageMark` gives. */
export function AppStageGlyph({
  stage,
  size = 14,
  className,
}: {
  stage: string | null | undefined
  size?: number
  className?: string
}): React.ReactElement | null {
  const Icon = APP_STAGE_ICON_COMPONENTS[appStageIcon(stage)]
  return Icon ? <Icon size={size} className={className} /> : null
}
