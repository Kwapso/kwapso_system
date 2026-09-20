// THE FIELD WORD A CHOICE GROUP FILLS — the shared half of the "Where" column
// and filter the Choices screens draw. Aurora, 21 Sep 2026, verbatim (documents/
// UI-RULEBOOK.md K59): "everywhere where i edit choices we need to add a
// c[o]lumn as for where is th[a]t choice[]! for exmaple in settibsg s[t]icket:
// typ[e] (bug, etc) but i[n]eed to see that 'type'."
//
// A "Where" CELL reads "Tickets: Type" — the RECORD (a settings page's own
// title, already read where the group is edited — `web/components/screens/
// module-settings-screen.tsx`'s `MODULE_SETTINGS`, itself derived off this same
// file) beside the FIELD this module answers. The record half stays a WEB
// concern (a settings page's own title is not something `shared/` can compute
// without importing React); this file supplies only the field half, so
// `deep-link/shape.tsx` composes the two rather than either file inventing the
// other's answer.
//
// DERIVED FROM `storedWordColumns`/`VOCABULARY_HOMES` (shared/selectable-
// homes.ts), never a second list of groups: a "columns" group's field word
// comes from its own column NAME (`COLUMN_FIELD` below, one entry per column
// this app has ever stored a vocabulary's word on — the closed set
// `storedWordColumns` itself already enumerates); the four "labels" groups name
// their field by hand (`LABEL_FIELD`) because there is no column to read one
// off (the code owns those states — see `shared/selectable-homes.ts`'s own
// header); the six "unused" groups answer `null` — there is nothing here to
// point a Where cell at, and in practice the general Choices table never asks,
// because a group with no `MODULE_SETTINGS` vocabulary section (every "labels"
// and "unused" group) never reaches `shapeChoicesTable`'s rows in the first
// place (`settings-choices-panel.tsx`'s own `groupHome.has` filter).
//
// EVERY FIELD WORD BELOW ALREADY RENDERS THROUGH `t(...)` SOMEWHERE ELSE IN THE
// APP (a form field's own label — "Type", "Status", "Category", "Department",
// "Industry", "Country", "Kind", "Stage" all do today), so composing one here
// spends no new translation: R28/R33 are paid once, at the field's own form,
// and a dynamic `t(word)` over this closed, pre-catalogued set translates
// exactly the way `shapeChoicesTable` already trusts `t(home.title)` to (the
// Module cell's own long-standing shape).
//
// `workers/tenancy/test/selectable-where.test.ts` reads
// `workers/tenancy/src/team-schema/seed.ts`'s own three seeded vocabularies
// (`DEFAULT_SELECTABLE`, `INTERNAL_VOCABULARY`, `COMPANY_VOCABULARY`) and fails
// the build the day a newly seeded group has no entry here.

import { VOCABULARY_HOMES, storedWordColumns } from "./selectable-homes"

/** A stored column's own field word — the label a reader already sees on that
 * record's own form. Two columns can mean the same field (`help_type`/
 * `raised_as_type` are both "the ticket's Type" — one written at creation and
 * never touched again, `shared/selectable-homes.ts`'s own header explains why
 * there are two), which is why `selectableFieldWords` below dedupes rather than
 * returning one entry per column. */
const COLUMN_FIELD: Record<string, string> = {
  help_type: "Type",
  raised_as_type: "Type",
  story_type: "Type",
  sprint_type: "Type",
  category: "Category",
  department: "Department",
  industry: "Industry",
  country: "Country",
  stage: "Stage",
  kind: "Kind",
}

/** THE `"labels"` GROUPS' OWN FIELD WORD, named by hand because no column
 * exists to read one off. "Sprint status" carries "Phase status"'s own answer
 * — the identical field, kept only so a historical team's still-live rows
 * resolve too (`shared/selectable-homes.ts` keeps that key for the same
 * reason: two names, one column's worth of meaning, one after the other). */
const LABEL_FIELD: Record<string, string> = {
  "Ticket status": "Status",
  "Story status": "Status",
  "Phase status": "Status",
  "Sprint status": "Status",
}

/** The FIELD word(s) a group's values fill in, deduped — more than one only for
 * a group that means two DIFFERENT things on two different columns (nothing
 * does today; the return type says the honest thing rather than assume it
 * never will). `null` for a group that answers no question any form asks
 * (`"unused"` in `shared/selectable-homes.ts`).
 *
 * Throws for a group `VOCABULARY_HOMES` does not name at all — the same
 * refusal `storedWordColumns` itself already carries, one level up: an
 * unmapped selectable group is a data bug (a vocabulary nothing has ever said
 * where it lives), not a display one this function should paper over. */
export function selectableFieldWords(group: string): string[] | null {
  const home = Object.prototype.hasOwnProperty.call(VOCABULARY_HOMES, group)
    ? VOCABULARY_HOMES[group]
    : undefined
  if (home === undefined)
    throw new Error(`selectableFieldWords: "${group}" names no shared/selectable-homes.ts entry.`)
  if (home === "unused") return null
  if (home === "labels") {
    const field = LABEL_FIELD[group]
    if (!field) throw new Error(`selectableFieldWords: "${group}" is a labels group with no LABEL_FIELD entry.`)
    return [field]
  }
  const words = storedWordColumns(group).map(({ column }) => {
    const field = COLUMN_FIELD[column]
    if (!field)
      throw new Error(`selectableFieldWords: "${group}"'s column "${column}" names no COLUMN_FIELD entry.`)
    return field
  })
  return Array.from(new Set(words))
}
