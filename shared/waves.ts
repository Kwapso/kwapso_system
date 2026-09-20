// A WAVE — what a client BOUGHT: a package of sprints.
//
// The owner's own example is the whole definition: "Alex sells Hogo a package —
// he maps their processes, builds two automations, they test it, he trains them.
// Three weeks later he sells a second, identical package." That is TWO waves,
// and they are told apart by their NAME and their DATES, never by a kind.
//
// THREE RULINGS ARE BUILT INTO THIS SHAPE, and each of them is a decision that
// was made once and must not be re-made by whoever writes the next screen:
//
//   • THERE IS NO PRICE ON A WAVE, and nothing here reaches the internal rate
//     card or the account rate card. The owner ruled the money out of the first
//     version four separate times — "leave the whole internal_rates and
//     account_rates out of V1… This is a fix decision" — which is why the `waves`
//     table has no price column for a field here to mirror. R24 forbids an
//     internal number reaching the client's side at all, so the safe shape is
//     the one that cannot carry one.
//
//   • THE DATES ARE DERIVED FROM THE SPRINTS AND STORED. `startsOn` is the
//     earliest start of the live sprints in the wave and `endsOn` the latest
//     end, recalculated whenever a sprint is added, moved or removed — never
//     computed per row on a read, because a list of waves would then be a
//     sub-query per row for a number that changes a handful of times a year.
//
//   • BOTH DATES ARE NULLABLE, and that is a real state rather than a gap: a
//     wave is sold before anybody plans the sprints inside it, so a wave with no
//     sprints has no dates and is perfectly ordinary.
//
// The shapes live here rather than beside the SQL for the same reason every
// other record's do: the workers produce them and both front doors read them, so
// one master copy is the only way the two halves cannot drift.

/** ONE WAVE, as the tenancy worker lists it. */
export type Wave = {
  id: string
  /** THE NUMBER A PERSON READS OFF THE HEADER'S BLACK CHIP — "W1", team-wide,
   * minted the moment the wave is sold (shared/workers/refs.ts). New as of the
   * 2026-08-31 ruling: a wave never carried one before. Null on every wave
   * sold before that migration landed. */
  ref: string | null
  /** The client who bought it. A wave always belongs to one. */
  accountId: string
  accountName: string | null
  name: string
  /** THE SYSTEM IT COVERS — client ruling, 16 Sep 2026: "I want the name of
   * the app." Team migration 0099. Null is ordinary: a wave can be sold
   * before anybody decides which app it covers, or its sprints can touch more
   * than one, and neither is a gap to fill in a hurry. Settable at create and
   * edit (`createWave`/`updateWave`, `workers/tenancy/src/lib/waves.ts`);
   * backfilled once, on existing waves, from the one app every LIVE sprint in
   * the wave agreed on, if there was exactly one. */
  appId: string | null
  appName: string | null
  /** The app's own logo, read alongside for the timeline's left column (an
   * `AppMark`-shaped face) — never derived from `appId` a second time on the
   * client. Null is ordinary: most apps carry no logo, and the mark falls
   * back to the stage tile the same way `AppMark` already does everywhere
   * else a `Wave` is not involved. */
  appLogoUrl: string | null
  /** What the package is for, in the team's own words. */
  goal: string | null
  /** DERIVED from the sprints inside it and STORED — see the header. Null until
   * a sprint with dates is put in the wave. */
  startsOn: string | null
  endsOn: string | null
  /** How many live sprints are in it. Read in the same statement as the row, so
   * a list of waves is one round trip rather than one per wave. */
  sprintCount: number
  /** Deactivate, never delete — a switched-off wave is still the package a
   * two-year-old sprint was sold inside. */
  active: boolean
  createdAt: string
  createdByName: string | null
  updatedAt: string | null
  editedByName: string | null
}

/** A SPRINT, as a wave's screen shows it: enough to name it, date it and say
 * whether it is still live. Never the sprint's price — that is the work engine's
 * record to show, on the sprint's own screen. */
export type WaveSprint = {
  id: string
  waveId: string | null
  accountId: string | null
  /** THE SPRINT'S OWN REFERENCE — `S0012`, minted team-wide by
   * `shared/workers/refs.ts`. Here because a sprint nested on a wave's screen
   * is still a sprint's FACE (R35) and wears the same black chip in front of
   * its name that it wears in the sprints collection; without it the wave was
   * the one screen where you could see a sprint and not say which one out loud.
   * Null on a sprint with no client, like every other kind's. */
  ref: string | null
  name: string
  /** THE ICON + WORD PILL wave-detail.tsx draws beside each row — no colour
   * (client ruling, 16 Sep 2026: "they will not have colors, but icons"),
   * resolved through `shared/sprint-types.ts` / `web/lib/sprint-type-icon.tsx`.
   * Null is ordinary: a sprint can carry no type. */
  sprintType: string | null
  startsOn: string | null
  endsOn: string | null
  active: boolean
}

/** TWO SPRINTS IN ONE WAVE WHOSE DATES OVERLAP.
 *
 * A WARNING, NEVER A REFUSAL. Aurora's ruling, and it is about what really
 * happens rather than what would be tidy: "warn, but we can save it (it can
 * happen…)". Two sprints of one package genuinely can run over each other — a
 * build that slips into the week the training was booked for — and a door that
 * refused the save would leave the team unable to record the truth. So the write
 * lands, the response carries this, and the screen says it out loud. */
export type WaveOverlap = {
  firstId: string
  firstName: string
  secondId: string
  secondName: string
}

/** ONE PHASE TYPE'S DURATION ON THIS WAVE, IN DAYS. Aurora's ruling, 20 Sep
 * 2026, verbatim: "on waves i am missing the settings (we'l adjust the
 * duration of pahses in days)." Set on the wave's own Settings panel
 * (web/components/work/wave-detail.tsx) by whoever holds the wave update
 * right. `getWave` (workers/tenancy/src/lib/waves.ts) always answers with
 * exactly seven of these, one per `PHASE_TYPES` name, filling in
 * `PHASE_DAY_DEFAULTS` below wherever the wave carries no row of its own. */
export type WavePhaseDay = {
  phaseType: string
  days: number
}

/** THE PLACEHOLDER DEFAULT, PER PHASE TYPE, A NEW WAVE STARTS FROM. Round
 * numbers Aurora named as a starting point on the same ruling, hers to
 * adjust per wave on the Settings panel; never written to a row until she
 * does, so a wave born today carries none of these as real rows at all.
 * Keyed by `PhaseTypeArt.name` (`shared/sprint-types.ts`'s `PHASE_TYPES`). */
export const PHASE_DAY_DEFAULTS: Record<string, number> = {
  Audit: 5,
  Plan: 5,
  Build: 20,
  Pilot: 10,
  Revision: 10,
  Deploy: 3,
  Hypercare: 10,
}
