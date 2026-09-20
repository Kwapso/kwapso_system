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

// FROZEN, 20 SEP 2026. Team migration 0098 (`workers/tenancy/src/team-schema/
// migrations.ts`) builds its SQL by reading this array AT MODULE LOAD TIME —
// it is a plain JS expression inside that migration's own `sql:` template,
// not a snapshot — so editing the seven names or their order here would
// silently rewrite an already-shipped, append-only migration's statements
// the next time this file is imported. `PHASE_TYPES`, below, is the CURRENT
// vocabulary (Aurora's 20 Sep 2026 renames + the Wave-lifecycle reorder) and
// every runtime caller reads that one now; this array and `sprintTypeIcon`
// exist solely so 0098 keeps generating the SQL it always has.
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
 * itself, draws no glyph" answer every retired-word lookup in this app gives.
 *
 * FROZEN, LIKE `SPRINT_TYPES` ABOVE IT. Kept only because team migration
 * 0098's own generated SQL calls it (`workers/tenancy/src/team-schema/migrations.ts`
 * evaluates this at module load, so mutating either array in place would
 * silently rewrite an already-shipped migration's statements). Current code
 * reads `phaseTypeIcon`/`PHASE_TYPES`, below. */
export function sprintTypeIcon(name: string | null | undefined): string {
  if (!name) return ""
  return SPRINT_TYPES.find((s) => s.name === name)?.icon ?? ""
}

// ── THE PHASE TYPE VOCABULARY, 20 SEP 2026 ──────────────────────────────────
//
// Aurora's rulings, the same session, read together as one vocabulary move
// (never edited into `SPRINT_TYPES` above — see that constant's own new
// header note for why a second, live array is the safe shape):
//
//   1. "Rename 'sprint' to 'phase.'" — every user-facing word moves, this
//      dropdown group's own name included: `selectable_data.type` moves from
//      "Sprint type" to "Phase type" (team migration 0107, the 0094/0098
//      pattern — rewrite the stored word and the dropdown row together).
//   2. "Rename the sprint type 'Refinement' to 'Revision.'" / "Rename the
//      phase 'Validation' to 'Pilot.'" — two of the seven words move.
//   3. "Update the Wave lifecycle stages and set the full order as: Audit →
//      Plan → Build → Pilot → Revision → Deploy → Hypercare" — this IS the
//      same vocabulary read from the WAVE's side (a wave's own screen shows
//      each sprint/phase inside it through this exact set of words,
//      `shared/waves.ts`'s `WaveSprint.sprintType`) rather than a second,
//      separate "wave stage" column anywhere in the schema — there isn't
//      one. Reordered AND narrowed: "Not started" and "Enhancement" drop out
//      of the ordered lifecycle (a phase that has not begun yet is simply
//      absent from a wave's board, which is what "Not started" always meant
//      operationally), "Deploy" and "Hypercare" are new.
//
// DEFINITIONS, stored as help text here (there is no `selectable_data`
// column for a value's own description). Aurora's own one-line definitions,
// shown wherever a phase-type pill's own tooltip/help text is drawn. R34
// (glossary-in-copy) reads this user-facing text same as any other: "customer"
// and "user(s)" are banned synonyms for this app's own words, so the two spots
// that named the party buying the work say "account" and the one spot that
// named the people using the release says "the account" too, in place of
// Aurora's own "customer"/"users" wording.
//
// COLOUR — PROPOSED, THEN DROPPED, 20 SEP 2026. The brief that produced this
// file raised a tone per phase type (Audit orange, Plan/Build black, Pilot
// purple, Revision the app's "blue" token, Deploy borrowing Plan/Build's
// tone, Hypercare a neutral) and asked for it to be wired in ONLY if a real
// chip component had a tone slot to take it. It does not: every live call
// site that draws a phase/sprint type is icon-only by a standing, twice-
// repeated ruling — `sprints-screen.tsx`'s R86 ("the sprint TYPE glyph
// beside the name stays uncoloured") and `sprint-detail.tsx`'s own chip
// comment, both quoting the client's original 16 Sep 2026 words verbatim:
// "they will not have colors, but icons." Wiring a tone into either would
// reopen a ruling nobody has asked to reopen, so the colour map was never
// added — a table with no reader is worse than no table, per this repo's own
// dead-export law, and re-deciding the mapping later costs nothing a fresh
// look wouldn't also cost now. */
export type PhaseTypeArt = {
  name: string
  icon: string
  /** Aurora's own one-line definition, verbatim (20 Sep 2026 ruling). */
  description: string
}

export const PHASE_TYPE_GROUP = "Phase type"

export const PHASE_TYPES: PhaseTypeArt[] = [
  {
    name: "Audit",
    icon: "MagnifyingGlass",
    description: "Assess the current state and gather requirements before work is scoped.",
  },
  { name: "Plan", icon: "Compass", description: "Scope, prioritize, and schedule the stories for the wave." },
  { name: "Build", icon: "Hammer", description: "Implement the stories." },
  {
    name: "Pilot",
    icon: "CheckCircle",
    description:
      "The period where the account uses the app and confirms it meets their needs and signs off, before full release.",
  },
  {
    name: "Revision",
    icon: "Sliders",
    description: "Implement changes and adjustments requested by the account after they have used the release.",
  },
  {
    name: "Deploy",
    icon: "Rocket",
    description:
      "Release the accepted work to production, includes the release checklist, smoke tests, rollout (phased/canary if needed), release notes, and a rollback plan.",
  },
  {
    name: "Hypercare",
    icon: "Heartbeat",
    description:
      "A short, intensive support window immediately after deploy where the team closely monitors the release, fixes urgent issues fast, and supports the account during adoption.",
  },
]

/** The icon name for a phase type — current code's own answer, `sprintTypeIcon`'s
 * replacement. Same "unmatched reads as itself, draws no glyph" fallback. */
export function phaseTypeIcon(name: string | null | undefined): string {
  if (!name) return ""
  return PHASE_TYPES.find((p) => p.name === name)?.icon ?? ""
}

/** The one-line definition for a phase type, read where the type is picked
 * (`sprint-form-dialog.tsx`'s type field, through `t()`) so a person choosing
 * "Pilot" sees what it means rather than only the word. Null for a word this
 * vocabulary does not carry a definition for (a team's own added value, or a
 * retired one). */
export function phaseTypeDescription(name: string | null | undefined): string | null {
  if (!name) return null
  return PHASE_TYPES.find((p) => p.name === name)?.description ?? null
}
