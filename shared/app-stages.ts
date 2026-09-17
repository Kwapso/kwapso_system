// WHERE AN APP HAS GOT TO — the eight stages, and the one thing each of them
// decides.
//
// They are not an enum. The eight names are seeded as ordinary values in the
// `App stage` dropdown group (SELECTABLE_GROUPS.appStage), so a team adds or
// retires one on the Dropdown values screen without a deploy — the same shape as
// the departments and the sprint types. What lives HERE is the part a dropdown
// row cannot carry on its own: the ORDER the agency reads them in, the dot
// colour each one draws, and whether a stage means the app is still being
// worked on or is put away.
//
// RULED, 16 Sep 2026 (team migration 0097), MISREAD, CORRECTED THE SAME DAY.
// The client's ruling, verbatim: "the sprint types are: not started, audit
// (this is new), plan (the old blueprint), build (the old development),
// validation, refinements and enhancement (in this order). They will not have
// colors, but icons. Let's keep colors for status." The first pass read this
// onto App stage (Blueprint → Plan, Development → Build, five new/renamed) —
// she SAID "sprint types," and the two words she named happened to be two of
// this file's eight stages that day, which is what made the misread possible.
// Her own correction, same day, verbatim: "No, no, no, no, no. You got this
// completely wrong. These are the sprint types... status has a color. It's the
// sprint types that have an icon. You got that wrong. Hold this until we
// define what the status is from the apps." The seven-word, seven-icon
// vocabulary moved to Sprint type instead (team migration 0098,
// `shared/sprint-types.ts`, where the fuller account of the correction lives).
//
// THIS FILE'S OWN EIGHT WORDS AND THEIR ORDER STAND EXACTLY AS 0097 LEFT
// THEM — that half of the migration was never in question, only which
// vocabulary its icon belonged to. Blueprint → Plan and Development → Build
// stay renamed; Documentation, Iteration, Maintenance and Completed stay
// RETIRED (deactivated, never deleted — an app already sitting in one keeps
// that exact word); Archived keeps its place, active, LAST, the one manual
// "put away" state.
//
// APP STATUS ITSELF IS HELD. Her correction closed with "hold this until we
// define what the status is from the apps" — so these eight words are NOT a
// fresh, considered answer to "what is an app's status," only the set 0097
// happened to leave behind. A new ruling on what app status means, and how
// many stages it has, is still owed; documents/UI-RULEBOOK.md K28 says so for
// the next reader. Until then this file keeps the 0097 shape unchanged.
//
// THE ORDER IS STORED, NOT ONLY CODED. `selectable_data.position`
// (migration 0097) carries 1..8 for these rows, so a screen reading the team's
// own vocabulary draws this exact order without falling back to this array —
// R75's `ORDERED_OPTIONS_OK` entry for `app-form-dialog.tsx#stages` already
// named this a protected-order vocabulary before the column existed; the column
// is what that entry was describing.
//
// THE DOT COMES BACK — "status has a color." `dotTone` returns to this type,
// widened past `Badge`'s own six lifecycle tones (`DotTone`, below) to also
// reach the four PRIORITY tones (`PriorityTone`, `shared/departments.ts`) —
// the same combined union `record-calendar.tsx`'s own `EntryDotTone` already
// takes, for the identical reason: the kit's closed palette (R32) draws
// exactly SEVEN distinct hues total across all ten named tones (`shipped`
// and `done` are one hex twice-named, `blocked` and `red` are a second,
// `review` and `blue` are a third — `shared/ui/foundations/tokens/
// tokens.css`'s own `--dot-*` definitions), and eight stages cannot each take
// a hue the palette does not have. `Refinements` and `Enhancement` are the one
// pair that shares an actual pixel (`shipped`/`done`, both `--kw-forest`) —
// every other stage below takes a hue none of its seven siblings wears. This
// is the honest ceiling of the palette today, not a gap in this file; a ninth
// distinct hue is a kit change, out of this file's authority, and the app
// status HOLD above is exactly the moment to raise it if the fresh definition
// wants one.
//
// ARCHIVED KEEPS THE `archived` TONE — the one pairing that was never in
// question (the grey, muted dot every other put-away record in this app
// already wears) — and `Build` keeps the `building` tone its own name already
// carries.
//
// RE-RULED AGAIN, 17 Sep 2026 — "audit orange, refinements blue, validaton
// purple, plan & buid black … charcoal never means in progress." Plan now
// shares `Build`'s own `building` tone (both read as "black" in her words),
// which is a DELIBERATE pairing rather than the "maximum spread, no two
// stages share one" rule this paragraph used to state — that rule is retired
// as of this ruling. Every other stage still takes a hue none of its
// siblings wears: read the mapping in the array below, not this paragraph.
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

/** `Badge`'s own six LIFECYCLE dot tones (`shared/ui/components/badge/
 * badge.tsx`'s `BadgeDot`), restated here rather than imported: this file is
 * compiled by both front doors AND every worker, and `shared/ui/` is
 * DOM-only — a worker's tsconfig excludes it outright (no `--jsx`), so even a
 * type-only import of a `.tsx` module fails there (TS6142). Read by
 * `shared/status-tones.ts`, `web/components/records/record-calendar.tsx` and
 * `web/components/tickets/tickets-collection.tsx` for a ticket's or a story's
 * own status tone, and by `AppStage.dotTone` below (widened to
 * `AppStageDotTone`, since eight stages need more than six names). */
export type DotTone = "shipped" | "building" | "review" | "blocked" | "archived" | "done"

/** THE FOUR PRIORITY TONES, THE OTHER HALF OF THE KIT'S TEN — `PriorityTone`
 * (`shared/departments.ts`), restated in this type's own union rather than
 * imported as a second name, so `AppStageDotTone` reads as one closed list
 * rather than a cross-file union a caller has to chase. Never bolted onto
 * `DotTone` itself: two files hold an EXHAUSTIVE `Record<DotTone, …>` over
 * the app-stage six (`record-week.tsx`'s `DOT_FILL`, `tickets-collection.tsx`'s
 * `DOT_TONE_FILL`), and widening `DotTone` would silently demand four more
 * entries in both, neither of which has anything to do with an app's stage —
 * `shared/departments.ts`'s own header makes this exact argument for
 * `PriorityTone`, and `record-calendar.tsx`'s `EntryDotTone` is the same
 * combined shape, for a calendar entry instead of a stage. */
export type AppStageDotTone = DotTone | "red" | "orange" | "purple" | "blue"

/** One stage: what it is called, the mark somebody recognises it by, the
 * dot colour its pill draws, and whether an app sitting in it is finished
 * with. */
export type AppStage = {
  name: string
  /** the glyph the agency recognises it by — a TYPE MARK, never copy
   * (UI-CONVENTIONS §5): it sits where an icon sits and never inside a sentence.
   * A two-letter code, not a pictograph — client ruling, 2026-08-31: "there's an
   * emoji! i said no emojis", on the exact app-detail screen this glyph draws.
   * The legacy data carried an emoji per stage; this is the same one-glyph-
   * per-stage shape, with the glyph itself made of letters instead. Drawn on
   * an app's own mark (`AppMark`/`RecordMark`), a different surface from the
   * stage PILL below. */
  mark: string
  /** the stage pill's own dot — "status has a color," her own words, 16 Sep
   * 2026. One of the kit's ten named tones (`AppStageDotTone`, above); this
   * file cannot import the kit itself (see the note below `AppStage`), so a
   * caller hands the string straight to `Badge`'s own `dot` prop, which
   * accepts the identical ten names structurally. NO TWO STAGES SHARE ONE
   * except `Refinements`/`Enhancement` — the file header above explains why
   * that one pair is the palette's honest ceiling, not an oversight. */
  dotTone: AppStageDotTone
  /** true = the app is done or put away, so it belongs under Inactive */
  closed: boolean
}

// THIS FILE IS COMPILED BY BOTH FRONT DOORS AND EVERY WORKER
// (`workers/tenancy/src/team-schema/seed.ts` reads `APP_STAGES` for seed data),
// and `shared/ui/` is DOM-only — a worker's tsconfig excludes it outright (no
// `--jsx`), so even a type-only import of a `.tsx` module fails there (TS6142).
// That is why `mark` and `dotTone` above are plain strings, never a component
// or a colour token reference.

// RE-RULED, 17 Sep 2026, VERBATIM: "audit orange, refinements blue, validaton
// purple, plan & buid black … charcoal never means in progress." `building`
// is renamed in MEANING here, not in spelling: it is still the token this
// file and the kit call `building` (`--dot-building`, `var(--foreground)` —
// literal ink, #1A1918 in light mode, paper in dark), and it is what she
// means by "black". Everywhere this file or its neighbours said "charcoal"
// for that tone, the word is "black" now; the CSS custom property and the
// `DotTone` union member keep their names unchanged; only the ENGLISH gloss
// moves. Two stages now draw it — Plan and Build — which is new: until today
// every stage in this array drew a hue none of its seven siblings wore
// (the paragraph above this array used to say so in full). That claim no
// longer holds and is corrected below rather than left to rot.
export const APP_STAGES: AppStage[] = [
  { name: "Not started", mark: "NS", dotTone: "blocked", closed: false },
  { name: "Audit", mark: "AU", dotTone: "orange", closed: false },
  { name: "Plan", mark: "PL", dotTone: "building", closed: false },
  { name: "Build", mark: "BD", dotTone: "building", closed: false },
  { name: "Validation", mark: "VL", dotTone: "purple", closed: false },
  { name: "Refinements", mark: "RF", dotTone: "blue", closed: false },
  { name: "Enhancement", mark: "EN", dotTone: "done", closed: false },
  { name: "Archived", mark: "AR", dotTone: "archived", closed: true },
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

/** The stage pill's dot tone for a stage — `undefined` (no dot) for one the
 * code has never met, the same "reads as itself, draws no glyph" answer
 * `appStageMark` gives. Hand straight to `Badge`'s own `dot` prop. */
export function appStageDotTone(name: string | null | undefined): AppStageDotTone | undefined {
  return appStage(name)?.dotTone
}

/** Is an app in this stage still being worked on? A stage nobody has told us
 * about counts as active — see the note at the top of this file. */
export function appStageIsActive(name: string | null | undefined): boolean {
  return !(appStage(name)?.closed ?? false)
}

/** The word an app with no stage at all is grouped under. One string, so the
 * heading on the apps page and the label in a picker can never disagree. */
export const NO_STAGE = "No stage yet"
