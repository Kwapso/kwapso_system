// THE MOSCOW FACET AND SORT - PARKED, 21 Sep 2026.
//
// Aurora's ruling, verbatim: "pause everything to do with moscow, but remind
// me at later stages." The data stays (`Story.moscow`, `MOSCOW_VALUES`,
// `shared/types.ts`) - this is the stories screen's own TOOLBAR surface,
// filtering and ordering the backlog by priority, pulled out of `stories-
// screen.tsx` into this file of its own and unmounted
// (`PARKED["work/moscow-filters"]`, `shared/rules/registry.ts`) so the app's
// own orphan-components census proves it draws nothing while paused. Both
// were always answered IN THE BROWSER, over the loaded page - neither is a
// door-side filter, so there is no server plumbing to pause alongside them.
//
// Delete this line and re-wire both exports back into `stories-screen.tsx`
// (`storySortOptions`'s own array, the `facets` array, and `compareStories`'
// own `"moscow"` branch) the day she asks for MoSCoW back.

import type { FilterFacet, SortOption } from "@shared/web/screen-engine/config"
import { MOSCOW_VALUES, type MoscowValue, type Story } from "@shared/types"

/** MUST < SHOULD < COULD < WON'T, so ascending reads highest-priority-first - * the order the four words are always said in, not the alphabet. A story
 * with none set sorts after all four, in either direction. */
export const MOSCOW_RANK: Record<MoscowValue, number> = { Must: 0, Should: 1, Could: 2, "Won't": 3 }

/** THE TOOLBAR'S OWN MOSCOW SORT OPTION (Aurora's ruling, 20 Sep 2026: "let
 * users … sort the backlog by it") - Must first descending, the priority
 * order itself. */
export function moscowSortOption(t: (s: string) => string): SortOption {
  return { value: "moscow", label: t("Priority"), defaultDir: "asc" }
}

/** THE MOSCOW FILTER FACET (Aurora's ruling, 20 Sep 2026) - the fixed four
 * words, never a live vocabulary read (`MOSCOW_VALUES`, shared/types.ts). */
export function moscowFacet(t: (s: string) => string): FilterFacet {
  return {
    field: "moscow",
    label: t("Priority"),
    control: "select",
    options: MOSCOW_VALUES.map((v) => ({ value: v, label: v })),
  }
}

/** THE COMPARATOR - Must, then Should, then Could, then Won't; a story with
 * none set sorts last either direction. */
export function compareStoriesByMoscow(a: Story, b: Story, dir: "asc" | "desc"): number {
  const rank = (s: Story) => (s.moscow ? MOSCOW_RANK[s.moscow] : 4)
  const primary = rank(a) - rank(b)
  return dir === "asc" ? primary : -primary
}
