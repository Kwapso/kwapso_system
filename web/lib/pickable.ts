// A RECORD SOMEBODY CAN CHOOSE, AND ITS FACE (R35).
//
// Seventeen prop declarations across nine dialogs said `{ id: string; name:
// string }[]`, and every one of them was handed rows that carried a logo, a
// photo or a glyph. The type dropped the picture before the component saw it —
// so the picker could not have drawn it even if somebody had thought to, and
// nobody could tell from the call site that anything was missing.
//
// THAT IS THE FAILURE THIS FILE EXISTS TO END, and it is worth naming precisely
// because it is not forgetfulness. A field that is not carried cannot be
// forgotten later; it is already gone, silently, at a line nobody reads. Widening
// one shared type is what makes the omission visible at every call site at once,
// which is the same argument `RecordMark` makes about thirteen implementations
// of a placeholder.
//
// It is deliberately the LOOSEST shape that still carries a face: the doors
// return `Account`, `AppRow` and `TeamMember`, all of which structurally satisfy
// this, so no caller has to map anything. Optional, because a meeting purpose
// and a role genuinely have no picture and must stay pickable.

/** A record a picker can offer: what a door stores, what a person reads, and the
 * picture it is known by. */
export type PickableRecord = {
  id: string
  name: string
  /** the stored path to its own logo or photo, if it has one */
  logoUrl?: string | null
}

/** One picker option built from a record — the shape nine dialogs were writing
 * out by hand, minus the line that lost the picture.
 *
 * `shape` is left to the caller rather than guessed here: this cannot tell a
 * sole trader from a company, and getting it wrong is a face in a square. */
export function asOption(r: PickableRecord) {
  return { value: r.id, label: r.name, picture: r.logoUrl ?? null }
}

/** AN ACCOUNT, AS AN OPTION — client ruling, 2026-09-09: *"for accounts include
 * icon in select components and filters"*.
 *
 * `asOption` above already carried the logo, and for accounts that was not
 * enough, because of a number: on staging **48 of 134 accounts hold a picture at
 * all** — 17 of 24 companies, but only 31 of 110 individuals (counted live,
 * 2026-09-09; `scripts/glide-visuals.mjs` wrote every one of them and nothing
 * has added a logo since). Both `RecordPicker` render sites draw a mark only
 * `if (picture || mark || face)`, so an account list built from `asOption` alone
 * would have drawn a face on the seventeen companies and NOTHING on the other
 * two rows in three — a ragged column where a picture is a fact about the data
 * rather than about the kind of record, which is exactly the failure
 * `PickerOption.face`'s own header calls "a card with a dot on four rows and
 * none on the fifth reads as the broken one", and the failure the ticket form's
 * APP picker used this same flag to fix on 2026-09-07.
 *
 * So `face: true` is the whole point of this function existing beside
 * `asOption`: an account ALWAYS wears a mark, and where it has no picture that
 * mark is its own initial on `bg-muted`, at the same size, in the same slot —
 * the deliberate placeholder `record-mark.tsx` exists to make the common case
 * of, not the empty box that reads as a row which failed to load.
 *
 * `shape: "square"` for R31/`record-mark.tsx`'s ruling: a client is a rounded
 * square whether it is a company or a sole trader, because both sit in one
 * column of one list and two shapes there read as two kinds of record. It is
 * said HERE rather than left to the caller — `asOption`'s own note says shape is
 * the caller's because it "cannot tell a sole trader from a company", which was
 * the right caution while the two had different boxes and is a distinction this
 * app no longer draws.
 *
 * NOT FOLDED INTO `asOption`. That one is the loosest shape that carries a face
 * and is handed roles, meeting purposes and process versions — records with no
 * picture and no identity, which `face` would give a column of grey letters to. */
export function accountOption(r: PickableRecord) {
  return { ...asOption(r), shape: "square" as const, face: true }
}
