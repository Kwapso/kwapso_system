// WHERE AN APP HAS GOT TO — the eight stages, and the one thing each of them
// decides.
//
// They are not an enum. The eight names are seeded as ordinary values in the
// `App stage` dropdown group (SELECTABLE_GROUPS.appStage), so a team adds or
// retires one on the Dropdown values screen without a deploy — the same shape as
// the departments and the sprint types. What lives HERE is the part a dropdown
// row cannot carry on its own: the ORDER the agency reads them in, the icon each
// one draws, and whether a stage means the app is still being worked on or is
// put away.
//
// RULED AGAIN, 16 Sep 2026 (team migration 0097). The client's own words,
// verbatim: "the sprint types are: not started, audit (this is new), plan (the
// old blueprint), build (the old development), validation, refinements and
// enhancement (in this order). They will not have colors, but icons. Let's keep
// colors for status." SHE SAID "SPRINT TYPES" — the seven words she names are
// this file's own vocabulary, not `shared/selectable-homes.ts`'s "Sprint type"
// group: "Blueprint" and "Development" exist nowhere in `Sprint type`, seeded or
// live (confirmed against staging, 16 Sep 2026 — that group holds Planning,
// Iteration and the ten-row `SPRINT_TYPE_CATALOGUE`, none of them either word),
// and both are two of THIS file's eight stages. The coordinator's ruling, same
// day: apply her list here.
//
// SIX RENAMED IN PLACE OR NEW, AN EIGHTH KEPT AS SHE LEFT IT. Blueprint becomes
// Plan and Development becomes Build — her own parentheticals say so — Audit,
// Validation, Refinements and Enhancement are new or newly spelled; Documentation,
// Iteration, Maintenance and Completed are RETIRED (deactivated in the
// vocabulary, never deleted — an app already sitting in one keeps that exact
// word, see migration 0097's own header). `Archived` is not in her seven and
// nothing in the ruling touches it: `apps` carries no separate archive flag,
// only the generic `deactivated_at` every table gets, so putting a system away
// has only ever been this one stage — the coordinator's own instruction, "the
// client wants archive to remain the one manual state." It keeps its place,
// active, LAST.
//
// THE ORDER IS NOW STORED, NOT ONLY CODED. `selectable_data.position`
// (migration 0097) carries 1..8 for these rows, so a screen reading the team's
// own vocabulary draws this exact order without falling back to this array —
// R75's `ORDERED_OPTIONS_OK` entry for `app-form-dialog.tsx#stages` already
// named this a protected-order vocabulary before the column existed; the column
// is what that entry was describing.
//
// ICONS REPLACE THE DOT. Her ruling is explicit — "they will not have colors,
// but icons" — so `dotTone` is gone from this type and `appStageDotTone` is
// retired with it: nothing in this file assigns a colour to a stage any more.
// "Colors stay for status" is her own boundary and is untouched — a ticket's and
// a story's status pill, `shared/status-tones.ts`, reads nothing from here and
// never did.
//
// THE ACTIVE / INACTIVE SPLIT is one boolean per stage, and the default for a
// stage the code has never met is ACTIVE. A team that invents "Pilot" should see
// its apps beside the ones being worked on, not filed away in Inactive — the
// harm of the wrong guess is asymmetric, and an app nobody can find is worse than
// an app in the wrong group. THE SAME DEFAULT NOW ALSO CATCHES THE FOUR RETIRED
// NAMES for an app this migration did not rewrite (Documentation, Iteration and
// Maintenance read this way already, since none of the three was ever `closed`;
// an app still parked in `Completed` — the one retired name that WAS `closed`
// — reads as active until somebody moves it, a known, flagged side effect of
// the rename rather than a silent one).

/** `Badge`'s own six dot tones (`shared/ui/components/badge/badge.tsx`'s
 * `BadgeDot`), restated here rather than imported: this file is compiled by
 * both front doors AND every worker, and `shared/ui/` is DOM-only — a
 * worker's tsconfig excludes it outright (no `--jsx`), so even a type-only
 * import of a `.tsx` module fails there (TS6142). RETIRED FROM `AppStage`
 * ITSELF on 16 Sep 2026 (the ruling above: "they will not have colors, but
 * icons") but kept EXPORTED here — `shared/status-tones.ts`,
 * `web/components/records/record-calendar.tsx` and
 * `web/components/tickets/tickets-collection.tsx` all read a ticket's or a
 * story's own status tone off this type, and none of the three is this
 * change's to move. */
export type DotTone = "shipped" | "building" | "review" | "blocked" | "archived" | "done"

/** One stage: what it is called, the mark somebody recognises it by, the icon
 * it draws, and whether an app sitting in it is finished with. */
export type AppStage = {
  name: string
  /** the glyph the agency recognises it by — a TYPE MARK, never copy
   * (UI-CONVENTIONS §5): it sits where an icon sits and never inside a sentence.
   * A two-letter code, not a pictograph — client ruling, 2026-08-31: "there's an
   * emoji! i said no emojis", on the exact app-detail screen this glyph draws.
   * The legacy data carried an emoji per stage; this is the same one-glyph-
   * per-stage shape, with the glyph itself made of letters instead. Drawn on
   * an app's own mark (`AppMark`/`RecordMark`) — a different surface from the
   * stage PILL below, which the 16 Sep 2026 ruling moved onto an icon instead. */
  mark: string
  /** the stage pill's own icon — one of Phosphor's names (phosphor.dev), the
   * kit's own export name in `@shared/ui/foundations/icons`, PascalCase.
   * NEVER a colour: this file cannot import the kit itself (see the note
   * below), so the string is resolved to a real glyph in `web/lib/
   * app-stage-icon.tsx`, the one place both this array's order and its
   * component art have to agree. */
  icon: string
  /** true = the app is done or put away, so it belongs under Inactive */
  closed: boolean
}

// THIS FILE IS COMPILED BY BOTH FRONT DOORS AND EVERY WORKER
// (`workers/tenancy/src/team-schema/seed.ts` reads `APP_STAGES` for seed data),
// and `shared/ui/` is DOM-only — a worker's tsconfig excludes it outright (no
// `--jsx`), so even a type-only import of a `.tsx` module fails there (TS6142).
// That is why `icon` above is a plain string (the kit's own export name) and not
// a component reference, the same reason `mark` has always been a string here.

export const APP_STAGES: AppStage[] = [
  { name: "Not started", mark: "NS", icon: "Circle", closed: false },
  { name: "Audit", mark: "AU", icon: "MagnifyingGlass", closed: false },
  { name: "Plan", mark: "PL", icon: "Compass", closed: false },
  { name: "Build", mark: "BD", icon: "Hammer", closed: false },
  { name: "Validation", mark: "VL", icon: "CheckCircle", closed: false },
  { name: "Refinements", mark: "RF", icon: "Sliders", closed: false },
  { name: "Enhancement", mark: "EN", icon: "TrendUp", closed: false },
  { name: "Archived", mark: "AR", icon: "Archive", closed: true },
]

/** The stage a name refers to, or null for one a team invented itself — or one
 * migration 0097 retired (Documentation, Iteration, Maintenance, Completed,
 * Blueprint, Development): those read as an unmet name too, on purpose, see
 * this file's own header. */
export function appStage(name: string | null | undefined): AppStage | null {
  if (!name) return null
  return APP_STAGES.find((s) => s.name === name) ?? null
}

/** The mark for a stage, empty for one the code has never met. */
export function appStageMark(name: string | null | undefined): string {
  return appStage(name)?.mark ?? ""
}

/** The stage pill's icon name for a stage, empty for one the code has never
 * met — the same "reads as itself, draws no glyph" answer `appStageMark` gives.
 * Resolved to a real component in `web/lib/app-stage-icon.tsx`. */
export function appStageIcon(name: string | null | undefined): string {
  return appStage(name)?.icon ?? ""
}

/** Is an app in this stage still being worked on? A stage nobody has told us
 * about counts as active — see the note at the top of this file. */
export function appStageIsActive(name: string | null | undefined): boolean {
  return !(appStage(name)?.closed ?? false)
}

/** The word an app with no stage at all is grouped under. One string, so the
 * heading on the apps page and the label in a picker can never disagree. */
export const NO_STAGE = "No stage yet"
