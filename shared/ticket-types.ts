// THE FOUR KINDS OF TICKET — the one list, and the only place the number four
// is written down.
//
// THE RULING, 15 Sep 2026, the client's own words: *"Remove all other options.
// Just get rid of them, delete them completely. From staging and production."*
// A ticket is an Issue, a Question, an Extra or a piece of Feedback. There is no
// fifth kind and there is no way to add one.
//
// ── WHY THIS IS A LOCK AND EVERY OTHER VOCABULARY IS NOT ────────────────────
//
// Every other group in `selectable_data` is a STARTING vocabulary: the seed
// plants some words, a team adds its own on the Choices screen, and the app
// obeys whatever is there. `Ticket type` stops being one of those today. Three
// things in this product are keyed on these four words and cannot be keyed on an
// arbitrary list:
//
//   · THE COLOURS. `web/lib/type-colours.ts` maps a type to one of the four
//     chart series the client chose by name. A fifth word gets the neutral grey,
//     which reads on screen as "this one is broken".
//   · THE ORDER. She dictated it (issue, question, extra, feedback) and every
//     chart, tab strip and chip row reads her order. A word the order has never
//     heard of sorts to the end, which is a fifth column nobody ranked.
//   · FEEDBACK'S OWN RULE. It may only be raised while a Validation sprint is
//     running on the ticket's app (`workers/content/src/lib/help.ts`,
//     `refuseFeedbackOutsideValidation`). A rule about a WORD needs the word to
//     be a known quantity.
//
// RENAMING IS STILL ALLOWED, and that is not a hole in the lock. A team may call
// an Extra whatever it calls an Extra — `updateSelectable` carries every record
// with the rename (shared/selectable-homes.ts) — exactly as the locked Admin
// role may be retitled. What is refused is a FIFTH ROW: a new decision the app
// has no colour, no rank and no rule for. It stops the addition, not the wording.
//
// ── THE MARKS ───────────────────────────────────────────────────────────────
//
// A short word or an initial, never a pictograph (R66, and `optionalMark` is the
// door that holds it). Two letters where one would collide: `Q`uestion is alone
// on its letter, `IS`sue, `EX`tra and `F`eed`B`ack are not.

/** The dropdown GROUP these four live in. The literal `"Ticket type"` appears in
 * SQL, in `VOCABULARY_HOMES` and on three screens; this is the name the door,
 * the seed, the migration and the check all compare against, so a rename of the
 * group is one edit rather than a search. */
export const TICKET_TYPE_GROUP = "Ticket type"

/** THE FOUR, IN THE CLIENT'S OWN READING ORDER (2026-09-06: "it's always:
 * 1. issue 2. question 3. request 4. extra", with Request folded into Extra and
 * Feedback taking the fourth place on 15 Sep 2026).
 *
 * ORDER IS MEANINGFUL HERE and is not a tidy-up: `web/lib/type-colours.ts`
 * derives `TYPE_ORDER` from this array rather than restating it, so the charts,
 * the tab strip and the chip row cannot come to disagree with the seed about
 * which word comes first. The seed plants them in this order too, which costs
 * nothing and means a newborn team's Choices screen reads the way every chart
 * in the app does. */
export const TICKET_TYPES = [
  { value: "Issue", mark: "IS" },
  { value: "Question", mark: "Q" },
  { value: "Extra", mark: "EX" },
  { value: "Feedback", mark: "FB" },
] as const

/** Just the words, for the places that only need the list. */
export const TICKET_TYPE_WORDS: readonly string[] = TICKET_TYPES.map((t) => t.value)

/** THE ONE IDENTITY TEST — trim, lower-case, drop one trailing "s".
 *
 * THE SAME IDIOM `isScopedTicketType` USES (shared/types.ts), on purpose and not
 * by coincidence. `help.help_type` stores the team's OWN word, and a rule that
 * hard-matched the seeded spelling would stop matching the day somebody retyped
 * a value with a trailing space or as "Issues". Two idioms for "is this word
 * that word" in one product would be one too many. */
export function ticketTypeKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/s$/, "")
}

/** THE KIND WITH A CONDITION ON IT. Feedback may only be RAISED while a
 * Validation sprint is running on the ticket's own app — the client's ruling of
 * 15 Sep 2026. The door enforces it (`refuseFeedbackOutsideValidation`); the
 * ticket form withholds the chip for the same condition, and the door is the
 * rule, because the machine surface and the importer reach it with no picker.
 *
 * Matched through `ticketTypeKey` like every other word here, so a team that
 * renames the row keeps the rule — the rename carries the records AND this
 * test's subject with it. A team that renames it to something else entirely has
 * renamed the KIND, and the condition follows the row it is written about. */
export const TICKET_TYPE_FEEDBACK = "Feedback"

export function isFeedbackTicketType(value: string | null | undefined): boolean {
  if (!value) return false
  return ticketTypeKey(value) === ticketTypeKey(TICKET_TYPE_FEEDBACK)
}

/** THE SPRINT KIND THAT OPENS THE DOOR. A seeded `Sprint type` value
 * (`SPRINT_TYPE_CATALOGUE`, workers/tenancy/src/team-schema/seed.ts) and
 * therefore a team-editable word, read with the same tolerance as the four
 * above — `sprints.sprint_type` stores the word, not an id. */
export const VALIDATION_SPRINT_TYPE = "Validation"

export function isValidationSprintType(value: string | null | undefined): boolean {
  if (!value) return false
  return ticketTypeKey(value) === ticketTypeKey(VALIDATION_SPRINT_TYPE)
}

// ── THE ICON EACH TICKET TYPE CARRIES, COLOUR RETIRED ───────────────────────
//
// CLIENT RULING, 17 Sep 2026, verbatim: "I have changed my mind regarding
// chips. In a database where there are different columns, the one that gets
// the chip with the color is always the status. This means that for tickets,
// we need to find icons for the ticket type and assign colors to the
// status." Status already owns the colour on a ticket (`HELP_STATUS_DOT_TONE`,
// shared/status-tones.ts, D17); what changes here is TYPE, which drew a
// colour of its own (`web/lib/type-colours.ts`) since 2026-09-06. That map is
// retired from every chip, row, board card and picker a ticket's type
// reaches — the CHART series it also fed (the tickets dashboard's own bars
// and legends, a different domain from a record's chip) is the one reader
// left, because an aggregate chart's series colour is not the "chip with the
// color" her ruling is about.
//
// THE SAME CLOSED-FOUR SHAPE `shared/story-types.ts` ALREADY ARGUES FOR ITS
// OWN FIVE, so its header is not repeated here in full — a code map, not a
// column (`selectable_data` has no icon column and TICKET_TYPES above is
// already the LOCKED four, never a migration away from a fifth), kebab-case
// names resolved through `iconComponent()` on the web side (this file is
// read by every worker that touches a ticket, and no worker tsconfig allows
// JSX), and a team that renames a row past recognition draws the word alone
// — a missing icon is never a missing fact, the word beside it still says it.
//
// FOUR GLYPHS, HAND-CHOSEN AND VERIFIED AGAINST THE KIT'S OWN GENERATED
// EXPORTS (shared/ui/foundations/icons/*.svg — Bug.svg, Question.svg,
// PlusCircle.svg and ChatCircleText.svg all exist there): Issue reads as a
// defect, `Bug`; Question is literally itself, `Question`; Extra is
// something ADDED to the usual scope, `PlusCircle`; Feedback is a message
// coming back from the client, `ChatCircleText` — distinct from `ChatCircle`
// (no content mark) and `ChatCircleDots` (mid-typing), the two Phosphor
// siblings closest in shape, because a chip this small needs a silhouette
// that reads as "a note", not "a conversation in progress".
const TICKET_TYPE_ICONS = {
  issue: "bug",
  question: "question",
  extra: "plus-circle",
  feedback: "chat-circle-text",
} as const satisfies Record<string, string>

export type TicketTypeIconKey = keyof typeof TICKET_TYPE_ICONS

/** The four kebab-case glyph names themselves — the value side of the map,
 * for a caller (the census bait beside `shape.tsx`'s `choiceDetailsCell`)
 * that needs to name a glyph rather than a ticket type, the same shape
 * `StoryTypeIconName` takes for its own five. */
export type TicketTypeIconName = (typeof TICKET_TYPE_ICONS)[TicketTypeIconKey]

/** The glyph NAME (kebab-case, resolved to a component through
 * `iconComponent()` on the web side) for one ticket type's word, or null when
 * the team has renamed the row to something this map has never heard of, or
 * the ticket carries no type at all. Never throws, never guesses — the word
 * beside it always carries the meaning on its own, the same contract
 * `storyTypeIconName` (shared/story-types.ts) keeps for its own five. Keyed
 * through `ticketTypeKey`, the one "is this word that word" test this file
 * already uses for `isFeedbackTicketType`/`isValidationSprintType` above. */
export function ticketTypeIconName(value: string | null | undefined): string | null {
  const key = ticketTypeKey(value)
  return Object.hasOwn(TICKET_TYPE_ICONS, key) ? TICKET_TYPE_ICONS[key as TicketTypeIconKey] : null
}
