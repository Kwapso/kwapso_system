// THE SPRINT TYPE VOCABULARY — Not started, Audit, Plan, Build, Validation,
// Refinements, Enhancement, in that order, and the icon each one draws.
//
// RULED 16 Sep 2026, MISREAD THE SAME DAY, CORRECTED THE SAME DAY. The
// client's ruling, verbatim: "the sprint types are: not started, audit (this
// is new), plan (the old blueprint), build (the old development), validation,
// refinements and enhancement (in this order). They will not have colors, but
// icons. Let's keep colors for status." The first pass read this onto
// `shared/app-stages.ts` (team migration 0097) — she said "sprint types," and
// the words she named ("Blueprint," "Development") happened to match two App
// stage values that day, which is what made the misread possible. Her own
// correction, same day: "No, no, no, no, no. You got this completely wrong.
// These are the sprint types... status has a color. It's the sprint types
// that have an icon. You got that wrong. Hold this until we define what the
// status is from the apps." Team migration 0098 moves this exact seven-word,
// seven-icon vocabulary onto the "Sprint type" dropdown group, where it
// belongs; 0097's App stage rename stands untouched (the eight stages, same
// order, same words) and its pill goes back to a coloured dot — the app's own
// status definition is HELD pending a fresh ruling (documents/
// UI-RULEBOOK.md K28).
//
// SAME SEVEN WORDS AND ICONS AS THE FIRST SEVEN APP STAGES — an artefact of
// the ruling being read onto the wrong vocabulary first, not a shared one:
// `Sprint type` and `App stage` are two different dropdown groups
// (`shared/selectable-groups.ts` / `shared/app-stages.ts`), each edited on
// its own Dropdown values screen, and nothing here joins them. A team may
// rename or retire either one independently.
//
// NOT AN ENUM. The seven names are seeded as ordinary values in the
// `Sprint type` dropdown group (a team's own business, not one of
// `SELECTABLE_GROUPS`'s code-named ones — `shared/selectable-groups.ts`'s own
// header explains the distinction), so a team adds or retires one on the
// Dropdown values screen without a deploy — the same shape `shared/
// app-stages.ts` and `shared/departments.ts` already take. What lives HERE is
// the part a dropdown row cannot carry: the ORDER (mirrored in
// `selectable_data.position`, team migration 0098, set 1..7) and the icon
// each one draws.
//
// ICONS, NEVER A COLOUR. `shared/ui/foundations/icons`, PascalCase, Phosphor's
// own names (phosphor.dev) — the client's own words, "they will not have
// colors, but icons." Plain strings rather than component references: this
// file is compiled by every worker (the team seed reads `SPRINT_TYPES`) and
// `shared/ui/` is DOM-only, so even a type-only import of a `.tsx` module
// fails there (TS6142) — the same reason `shared/app-stages.ts`'s own `mark`
// field is a plain string, resolved to a real glyph on the web side
// (`web/lib/sprint-type-icon.tsx`).

/** One sprint type: what it is called, and the icon its pill draws. */
export type SprintTypeArt = {
  name: string
  /** one of Phosphor's names (phosphor.dev), the kit's own export name in
   * `@shared/ui/foundations/icons`, PascalCase — resolved to a real glyph in
   * `web/lib/sprint-type-icon.tsx`. Verified by hand against the kit's
   * generated art (shared/ui/foundations/icons/*.svg) when these seven names
   * were chosen, 16 Sep 2026 — the identical seven `shared/app-stages.ts`
   * verified the same day, for the reason this file's own header gives. */
  icon: string
}

export const SPRINT_TYPES: SprintTypeArt[] = [
  { name: "Not started", icon: "Circle" },
  { name: "Audit", icon: "MagnifyingGlass" },
  { name: "Plan", icon: "Compass" },
  { name: "Build", icon: "Hammer" },
  { name: "Validation", icon: "CheckCircle" },
  { name: "Refinements", icon: "Sliders" },
  { name: "Enhancement", icon: "TrendUp" },
]

/** The icon name for a sprint type, empty for one the code has never met (a
 * team's own word, or one migration 0098 retired) — the same "reads as
 * itself, draws no glyph" answer every retired-word lookup in this app gives. */
export function sprintTypeIcon(name: string | null | undefined): string {
  if (!name) return ""
  return SPRINT_TYPES.find((s) => s.name === name)?.icon ?? ""
}
