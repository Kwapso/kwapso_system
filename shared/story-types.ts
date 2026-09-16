// THE ICON EACH STORY TYPE CARRIES — client ruling, 16 Sep 2026, verbatim:
// "Assign an icon to each type."
//
// A CODE MAP, NOT A COLUMN. `selectable_data` — the table `Story type` lives
// on (shared/selectable-homes.ts) — has no icon column today, and the five
// words this maps are the PROTECTED set team migration `0094_story_type_and_
// category` planted (`is_default = 1` on Data/Tech/Bug/Feature/Change, Fix
// deactivated — documents/UI-RULEBOOK.md K26). A team may still RENAME any of
// the five on the Choices screen — renaming a protected row is allowed,
// `shared/ticket-types.ts`'s own header says why for its identical four — but
// may neither add a sixth nor remove one of these. A closed, hand-curated five
// is the same shape `shared/meeting-icons.ts` already argues for its own
// closed eight: a migration is what widens FIVE, never a value this map has
// to guess at, so a column and a migration would buy nothing a team could not
// already do by renaming.
//
// KEYED THE SAME FORGIVING WAY `ticketTypeKey` IS (shared/ticket-types.ts) —
// trim, lower-case, drop one trailing "s" — so a team that retypes "Bug" as
// "bugs" still gets its glyph. A team that renames the row to a word of its
// own gets no icon back for it (an unmatched key returns null): the exact
// fallback `web/lib/type-marks.ts`'s own third condition already accepts for
// a text mark — a missing icon is never a missing fact, because the WORD
// still carries it.
//
// KEBAB-CASE ICON NAMES, NOT COMPONENTS — the same shape `shared/meeting-
// icons.ts` carries (its own header explains why: the app's own storage
// convention for an icon named by data, `kitExportName` Pascals it on the way
// to the kit). NO React import here on purpose: this file sits beside
// `shared/ticket-types.ts` and `shared/meeting-icons.ts`, both plain data with
// no React import, and unlike those two this one IS imported by every worker
// that reads a story (shared/ files are compiled by the workers' own
// tsconfigs, none of which allow JSX) — so a component import here would drag
// a `.tsx` tree into six Cloudflare Workers to read five words. The web side
// resolves a name to a component through the existing seam,
// `iconComponent()` (shared/web/screen-engine/icon.tsx), the same door
// `Icon`/`RecordPicker` already use for every other icon named by data.
//
// Every name below is one of the kit's own Phosphor exports (fill weight,
// shared/ui/foundations/icons), verified by hand against the kit's generated
// exports (`ArrowsClockwise.svg`, `Bug.svg`, `Database.svg`, `Sparkle.svg`,
// `Wrench.svg` all exist there) — the same verification `meeting-icons.ts`
// records for its own eight.
//
// WHY NOT `pencil-simple` FOR CHANGE, THE OBVIOUS FIRST REACH (and the task's
// own suggestion). CLAUDE.md's action-icon table fixes `PencilSimple` as
// "edit", and `story-detail.tsx`'s own overflow menu draws exactly that glyph
// for its Edit action — on the SAME screen a Change-type chip would sit,
// a few pixels away. `arrows-clockwise` reads as "something here is being
// changed" without also meaning "click to edit", and it costs no new import:
// `web/components/knowledge/google-sync.tsx` already draws it for a sync in
// flight, a different concept in a different corner of the app, so there is
// no collision in practice either.

/** THE FIVE, KEYED BY THE SEEDED SPELLING LOWER-CASED, to the kit's own
 * kebab-case name for the glyph. Not exported as a vocabulary of its own —
 * `storyTypes` (the live "Story type" rows) is still the one list a screen
 * reads, from `useStoryFormOptions`; this is only the glyph half. */
export const STORY_TYPE_ICONS = {
  data: "database",
  tech: "wrench",
  bug: "bug",
  feature: "sparkle",
  change: "arrows-clockwise",
} as const satisfies Record<string, string>

export type StoryType = keyof typeof STORY_TYPE_ICONS

/** The five kebab-case glyph names themselves — the value side of the map,
 * for a caller (the census bait beside `stories-screen.tsx`'s `storyTypeChip`)
 * that needs to name a glyph rather than a story type. */
export type StoryTypeIconName = (typeof STORY_TYPE_ICONS)[StoryType]

/** Whether a lower-cased, singularised word names one of the five protected
 * story types — the same test `isMeetingTypeIcon` runs for its own closed
 * vocabulary, read here off the KEY side of the map rather than the value
 * side (a story type's word, not its glyph, is the thing a team can rename). */
function isStoryType(value: string): value is StoryType {
  return Object.hasOwn(STORY_TYPE_ICONS, value)
}

/** THE SAME "IS THIS WORD THAT WORD" TEST `ticketTypeKey` uses
 * (shared/ticket-types.ts): trim, lower-case, drop one trailing "s". */
function storyTypeKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/s$/, "")
}

/** The glyph NAME (kebab-case, resolved to a component through
 * `iconComponent()` on the web side) for one story type's word, or null when
 * the team has renamed the row to something this map has never heard of, or
 * the story carries no type at all. Never throws, never guesses — the word
 * beside it always carries the meaning on its own (`type-marks.ts`'s own
 * third condition, read for an icon instead of a text mark). */
export function storyTypeIconName(value: string | null | undefined): string | null {
  const key = storyTypeKey(value)
  return isStoryType(key) ? STORY_TYPE_ICONS[key] : null
}
