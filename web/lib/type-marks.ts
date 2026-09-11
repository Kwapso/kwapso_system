// THE TYPE MARK, LOOKED UP — one glyph per record type, read off the team's own
// dropdown values (UI-CONVENTIONS §5, amended 17 Aug 2026; UI-RULEBOOK G2).
//
// The fourth condition a type mark has to meet is that it is SET AS DATA rather
// than written into a component, so there is no map in this file: the glyph lives
// on the `selectable_data` row beside the word it marks, and a team changes it on
// the Dropdown values screen without a deploy. The starting glyphs are seeded in
// workers/tenancy/src/team-schema.ts, where every other starting vocabulary is.
//
// This is the read side, and it is deliberately forgiving. A team that has
// retired a type, typed a word of its own, or cleared a glyph gets no mark and
// the WORD carries the meaning on its own — which is condition three, and the
// reason a missing mark is never a missing fact.

import type { SelectableValue } from "@shared/types"

/** The groups a record type can come from. Written out so a caller cannot pass a
 * group that carries no marks and quietly get nothing back for ever. */
export const MARK_GROUP = {
  /* NO `ticket` HERE, AND ITS ABSENCE IS THE RULING — client, 2026-09-07, over
   * a screenshot of the ticket list's Type column: *"for type, kill the emojis.
   * this is legacy. in current system we use colors"*. She is describing the
   * app's own history: the design kit stopped shipping pictographs after her
   * 2026-08-31 ruling ("i said no emojis. why are there still emojis? kill
   * them!"), and these survived it because they are the TEAM'S DATA rather than
   * the kit's art — a `mark` on a `Ticket type` row in `selectable_data`, set
   * on the Dropdown values screen.
   *
   * THE DATA IS UNTOUCHED. Not one row was migrated, cleared or deprecated; a
   * team can still edit those glyphs and `Ticket type` is still an ordinary
   * vocabulary group. What was retired is the READ, on every surface that drew
   * a ticket's kind: the list's Type cell and the Ready split pane
   * (tickets-collection.tsx), the ticket's own header band (help-detail.tsx)
   * and an app's Tickets panel (app-detail.tsx). The colour is the mark now —
   * `Swatch` + `ticketTypeColour`, web/lib/type-colours.ts — which is what her
   * "we use colors" names and what the type facet, the picker option and the
   * chip line have drawn all along.
   *
   * WHY THE KEY IS DELETED RATHER THAN LEFT UNUSED. A display ruling that lives
   * as a habit ("don't call this one") is undone by the next person who needs a
   * glyph and finds the group sitting here. With the key gone there is no group
   * name to look a ticket's mark up under, and `MarkGroup` is a closed union —
   * so a screen that tries fails its own type check rather than quietly
   * shipping the emoji back. Restoring it is a deliberate act with a ruling
   * behind it, which is the only way it should come back.
   *
   * THE OTHER THREE GROUPS ARE UNAFFECTED and still draw their glyphs: stories
   * (stories-screen.tsx, sprint-detail.tsx, help-detail.tsx's story panel,
   * app-detail.tsx) and sprints (app-detail.tsx). The sprint STATUS labels were
   * a third at the time this was written and are no longer read at all — see the
   * block below this one. Her
   * ruling names tickets and stops there, so this stops there too. */
  story: "Story type",
  sprint: "Sprint type",
  /* NO `sprintStatus` HERE EITHER, SINCE 11 SEP 2026, and its absence is a
   * different argument from the one above — that one is a display ruling, this
   * one is a broken join.
   *
   * It named `"Sprint status"`, a `"labels"` group: a sprint's state is DERIVED
   * from its dates (`sprintState`, web/components/work/sprints-screen.tsx), so
   * the table has no status column and those rows stored nothing at all. They
   * carried a display word nothing ever read, and a MARK that ONE expression
   * read — `markMap(…, MARK_GROUP.sprintStatus)` — looked up by the row's own
   * WORD against `STATE_HEADING`, a constant in that file. So the join key was a
   * word a person could retype on a dropdown screen and a word the code spells,
   * and nothing held the two together: renaming "Coming up" dropped the glyph
   * off the sprint board silently and changed nothing a person could see,
   * because the heading is `t(STATE_HEADING[state])` and never came from the
   * row. A setting where one half works and the other half quietly breaks it is
   * a tripwire, not a setting.
   *
   * THE GLYPHS MOVED TO CODE, beside the words they key off (`STATE_MARK`, same
   * file, same three values the seed shipped). With this key deleted there is no
   * group name to look a sprint state's mark up under and `MarkGroup` is a
   * closed union, so a screen that tries fails its own type check — the same
   * reason the `ticket` key above is deleted rather than left unused. */
} as const

export type MarkGroup = (typeof MARK_GROUP)[keyof typeof MARK_GROUP]

/** The mark for one value in one group, or null. `value` is the word stored on
 * the record ("Question", "Fix", "Implementation"). */
export function typeMark(
  values: SelectableValue[] | undefined,
  group: MarkGroup,
  value: string | null | undefined
): string | null {
  if (!value) return null
  // ACTIVE ROWS ONLY. `Ticket type` in the live data holds ELEVEN rows for five
  // live words — retired duplicates of Bug, Extra, Feedback and Question, left by
  // a seed whose duplicate guard only ever checked live rows. So "the row with
  // this value" is not one row, and an unfiltered find answers from whichever
  // came first: a retired row with no glyph, hiding the live one that has one.
  const row = values?.find((v) => v.type === group && v.value === value && v.active)
  return row?.mark || null
}

/** Every mark in one group, keyed by its word — for a screen that renders a
 * whole collection and would otherwise scan the vocabulary once per row. */
export function markMap(
  values: SelectableValue[] | undefined,
  group: MarkGroup
): Map<string, string> {
  const out = new Map<string, string>()
  for (const v of values ?? []) {
    // Active only, for the reason `typeMark` gives — and last-write-wins here
    // would be the same coin flip in a different shape.
    if (v.type === group && v.active && v.mark) out.set(v.value, v.mark)
  }
  return out
}

