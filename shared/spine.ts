// THE APP'S BACKGROUND — ink or paper. Client ruling D3 puts both in
// Settings · Appearance; this file is the twin of shared/scale.ts: the
// allow-list a door validates against, and the fallback an unset or
// unrecognised value reads as.
//
// ── MANGO IS RETIRED, 22 SEP 2026 ───────────────────────────────────────────
//
// The client, ruling on the Appearance settings redesign: "reduce backgorund
// options to only balck or paper (rmoeve mango)." Three options become two —
// `mango` is no longer a choice ANYONE can make from here on, the same shape
// the ink/paper → `quiet` cut took on 2026-09-02 and the reversal below
// describes at length. `Spine` and `SPINE_VALUES` are `"ink" | "paper"` now.
//
// THIS IS THE SAME SITUATION THE `quiet` PARAGRAPH BELOW ALREADY WORKED
// THROUGH, READ THE OTHER WAY ROUND — so it gets the same answer, not a new
// one invented for the occasion. `quiet` taught this file two things worth
// re-using rather than re-deriving: (1) a value REMOVED from `SPINE_VALUES`
// needs no migration mapping of its own — `isSpine` already says no and
// `toSpine` already falls through to `DEFAULT_SPINE`, which is the whole
// mechanism, built once; and (2) "a bad or missing value costs a person their
// preferred rail; it can never cost them a screen" does not bend for WHY the
// value stopped being legal. A row that already holds `"mango"` — and there
// are such rows, `mango` having been the shipped default for three weeks —
// is not a broken row the day this ships: `isSpine("mango")` reads false,
// `toSpine("mango")` reads `DEFAULT_SPINE`, and the person sees a real rail
// rather than an error or a blank window. What they lose is the one they
// picked (or landed on), which is real and is the same honest cost `quiet`'s
// own paragraph already named — not a new kind of loss this reversal invents.
//
// NO SPECIAL-CASE MAPPING FOR `"mango"` EITHER, for the identical reason
// `quiet` got none: the fallback already exists, already does the right
// thing, and a second mapping table nobody asked for is exactly the kind of
// code a future reader has to prove is still needed. The door
// (workers/auth/src/index.ts's `spine` handler) only ever WRITES a value in
// `SPINE_VALUES`, so from the moment this ships nobody can put a fresh
// `"mango"` into a row — the only way one exists from here on is a row this
// old, read by `toSpine`, same as `quiet`.
//
// DEFAULT_SPINE MOVES TO `"paper"` — AND HAD TO, NOT A PREFERENCE. `mango`
// was the fallback for null/undefined/garbage since the client's 2026-09-02
// ruling below ("default spine to mango…"); it cannot go on being the
// fallback once it is not a `Spine` at all — a constant typed `Spine` cannot
// hold a value outside `SPINE_VALUES`, and the whole point of this file is
// that the allow-list and the fallback can never disagree. So a real choice
// was needed between the two survivors, and it is `"paper"`, for the same
// reason the argument recorded below (§ "THE ARGUMENT THAT WAS MADE") gave
// for it the first time: `web/components/shell/app-shell.tsx` painted a
// paper rail before the spine was ever a choice at all, so paper is the
// least surprising place for EITHER a person who never chose (null/undefined)
// or a person whose choice just stopped existing (a stored `"mango"`) to
// land — nobody who reads "the rail changed under me" today is being moved
// to somewhere new, they are being moved back to where the app always stood
// before mango was offered. `"ink"` was the other candidate and was not
// picked: it is the bigger visual jump for someone who never deliberately
// chose dark, which is exactly the swap the paper-default argument below was
// written to avoid the first time this file had the debate.
//
// THIS IS A SEPARATE DECISION FROM "MANGO WAS ONCE THE FALLBACK", not a
// re-litigation of the 2026-09-02 ruling under a new name. That ruling was
// about the WEIGHT of a client's own brand on the rail a nobody-has-chosen
// person sees, and it stands, recorded in full below, as the record of a
// decision that was taken once with the cost in view. This is a narrower,
// mechanical fact: the option that ruling picked no longer exists, so the
// constant that named it cannot go on naming it, and paper is what is left
// once the argument that used to lose (§ below) is asked again with only two
// candidates instead of three.
//
// EVERYTHING ELSE PERSISTING A SPINE reads through `toSpine`/`isSpine` and
// therefore needed no separate migration of its own: `db/core/0028_user_spine.sql`
// carries no CHECK constraint (by design — see its own comment) so a stored
// `"mango"` row is untouched data, resolved to `"paper"` only at READ time,
// the same way a `"quiet"` row always was; `shared/web/spine-section.tsx`'s
// three option arrays lose their `mango` entries (the cards this file's
// allow-list feeds); and `shared/web/appearance-pill-group.tsx`'s
// `SpineSwatch` narrows its own `spine` prop type to match.
//
// ═════════════════════════════ THE OLDER RECORD ═════════════════════════════
// (kept below, unedited except for this banner, for the reasoning it still
// carries about defaults, nulls and the door — read it for THAT, not for how
// many options exist today, which the paragraphs above now answer.)
//
// THREE, CUT TO TWO, THEN REVERSED BACK TO THREE — all inside 24 hours.
// v1.2.28 (2026-09-02) cut `ink` and `paper` to one muted rail, `quiet`, the
// same day the client ruled "default spine to mango, but everyone can change
// it during the onboarding or anytime at settings" (kept below in full — that
// half of the ruling is untouched by any of this). The client then reversed
// the CUT, verbatim, 2026-09-03: "you know, i changed my mind. i want to go
// back to the 3 options (sorry)" — and said why, which matters more than the
// count: "my goal is that in light i can choose to have a 'dark' background
// option". Appearance and Background are independent: Appearance decides
// whether the app is light or dark, Background decides the colour behind
// everything, and Ink is how a person running a LIGHT-themed app gets a dark
// window. `quiet` could never be that — it was one muted rail, not "dark
// regardless of theme" — so it is gone again and `ink`/`paper` are back,
// unchanged from before v1.2.28. (`SPINE_VALUES`/`Spine` are `"ink" | "paper"`
// as of the 22 Sep 2026 mango retirement above — the sentence that used to
// stand here, naming a third value, is the thing that just changed.)
//
// THE ink/paper → quiet MIGRATION IN `toSpine` IS DELETED HERE, NOT KEPT
// DORMANT — said out loud because a two-line mapping that once solved a real
// problem is exactly the kind of thing a future reader re-adds "to be safe"
// without knowing the problem it solved no longer exists. It existed for one
// reason only: v1.2.28 REMOVED `ink` and `paper` as choices, so a person who
// had picked either needed to land somewhere real, explicitly and by name,
// rather than falling through to the unrelated mango default. That reason is
// gone — `ink` and `paper` are ordinary choices again — so anyone who chose
// one simply keeps exactly what they chose; a migration that forced them onto
// `quiet` would now be actively wrong, moving a person who has always run ink
// the moment this ships.
//
// A ROW STILL HOLDING `"quiet"` FROM THAT WINDOW (v1.2.28–v1.2.29,
// 2026-09-02 to 2026-09-03) IS NOT A THIRD RETIRED VALUE THAT NEEDS ITS OWN
// MAPPING. `quiet` is simply absent from `SPINE_VALUES` now, so
// `isSpine("quiet")` is false and `toSpine` falls through to its ordinary
// catch-all, DEFAULT_SPINE. Nobody who saved it in that window sees an error
// or a blank screen — they see the fallback, exactly like anyone else with a
// value this build does not recognise. That costs them the rail they picked
// yesterday, which is real, but it is not a broken row: the same discipline
// as "a bad or missing value costs a person their preferred rail; it can
// never cost them a screen" that the rest of this file rests on. And the door
// (workers/auth/src/index.ts's `spine` handler) only ever WRITES a value in
// `SPINE_VALUES`, so nobody can put a fresh `"quiet"` into a row from here on.
//
// MANGO WAS THE FALLBACK for null, undefined, or genuine garbage, from
// 2026-09-02 until the 22 Sep 2026 retirement above moved it to `"paper"` —
// that earlier half of the ruling did not itself move on 2026-09-02; only the
// EXISTENCE of the option it named did, on 22 Sep 2026, which is what forced
// the fallback to move with it. The argument that used to run the other way
// (paper as the fallback, so a person who never opened Settings keeps the
// rail they always had) is kept below rather than deleted, because a default
// that has now changed TWICE is exactly the thing the next reader arrives
// suspicious about, and because it is, word for word, the argument that WON
// the second time.
//
// THE ARGUMENT THAT WAS MADE, in the words it was made in: paper is the
// fallback, not the kit's own `screen-shell.tsx` default of mango (override
// 56); `web/components/shell/app-shell.tsx` has painted a paper rail since before
// the spine was a choice at all, and a person who has never opened Settings
// must keep seeing exactly the rail they always had — switching everyone to
// mango the day this shipped would be a redesign nobody asked for, wearing a
// bug fix's clothes.
//
// THE CLIENT OVERRULED IT, 2026-09-02, verbatim: "default spine to mango, but
// everyone can change it during the onboarding or anytime at settings". So the
// value was mango from that ruling until 22 Sep 2026. The argument was not
// wrong about the mechanism — every person who has never chosen did see a
// different rail than they saw the day before — the client simply weighed
// that against having her own brand on the rail by default and decided which
// one she wanted. That was a product decision and it was hers; this file
// records that it was taken with the cost in view rather than by nobody
// noticing. The 22 Sep 2026 ruling that retired mango outright did not
// re-open that weighing — it removed one side of it from the board entirely.
//
// AND THE SECOND HALF OF THE 2026-09-02 RULING SURVIVES UNTOUCHED: mango was
// never the only rail a person COULD have, and now it is not a rail at all —
// the choice was always offered on the onboarding screen itself
// (web/app/onboarding/page.tsx) and changed at any time in Settings ·
// Appearance (shared/web/spine-section.tsx), and both still offer exactly the
// two rails this file allows.
//
// THE DIVERGENCE FROM THE KIT: this file deliberately disagreed with
// `screen-shell.tsx`'s own `spine="mango"` default from 2026-09-02 onward
// (that vendored default is the kit's own concern, unreachable from here);
// it disagrees again now, on the same axis, for the same structural reason —
// `app-shell.tsx` still names the spine explicitly rather than letting the
// shell default, because the rail must paint what THIS person chose (or the
// fallback), never what the shell would have guessed.
//
// NULL IS A REAL ANSWER, same discipline as `language` and `scale`: "this
// person has never chosen" is kept distinct from a deliberate choice of
// paper, and no CHECK constraint on the column for the same reason those two
// carry none — the allow-list lives here, the door validates against it, and
// an unrecognised value falls back rather than throws (db/core/0028_user_spine.sql).

export type Spine = "ink" | "paper"

export const SPINE_VALUES: readonly Spine[] = ["ink", "paper"]

export const DEFAULT_SPINE: Spine = "paper"

/** Is this a spine kwapso offers TODAY? The door's allow-list. Neither
 * `quiet` nor `mango` is here on purpose — see the header — a stored row can
 * still hold either, from the windows each was the only or a legal choice;
 * `toSpine` is where that gets resolved (to the ordinary fallback, not a
 * special mapping). */
export function isSpine(value: unknown): value is Spine {
  return typeof value === "string" && (SPINE_VALUES as readonly string[]).includes(value)
}

/** The spine a stored value means. No retired-value migration any more — see
 * the header for why the old ink/paper → quiet mapping was deleted rather
 * than extended to cover `quiet`, and why the same discipline applies to a
 * stored `mango` row now. Anything not in `SPINE_VALUES`, including a
 * `quiet` row from the one day it was legal, a `mango` row from the three
 * weeks it was the default, or missing, falls back to paper (the 22 Sep 2026
 * mango retirement's own choice of fallback — see the header). A bad or
 * missing value costs a person their preferred rail; it can never cost them
 * a screen. */
export function toSpine(value: string | null | undefined): Spine {
  return isSpine(value) ? value : DEFAULT_SPINE
}
