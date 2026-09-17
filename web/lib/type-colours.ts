// THE COLOUR A TICKET TYPE IS KNOWN BY — NARROWED TO THE DASHBOARD'S CHART
// SERIES, 17 Sep 2026. Client ruling, verbatim: "I have changed my mind
// regarding chips. In a database where there are different columns, the one
// that gets the chip with the color is always the status. This means that
// for tickets, we need to find icons for the ticket type and assign colors
// to the status." `ticketTypeColour` no longer draws a CHIP anywhere — the
// list's Type cell, the board cards, `TicketChips` (shared/web/ticket-chips.tsx),
// the type picker's own option dot, `work-panels.tsx`'s linked-ticket chip
// and the portal's ticket rows all read `ticketTypeIconName`
// (shared/ticket-types.ts) instead, the same icon-map pattern
// `storyTypeIconName` already stands for stories. What is LEFT reading this
// file is `tickets-dashboard.tsx`: a chart's series colour is not the "chip
// with the color" her ruling names — a bar, a legend swatch and a node on a
// relationship map are an AGGREGATE view over many tickets at once, the exact
// domain `type-colours.ts`'s own closing section below ("the four are the
// chart series") already argued this map into, and retiring it there too
// would leave four bars on a graph with no way to tell them apart. This file
// stays for exactly that reader; it is deleted only once the dashboard reads
// nothing from it either.
//
// THE WORDS THEMSELVES ARE NOT DECIDED HERE. `TICKET_TYPES`
// (shared/ticket-types.ts) is the one list of the four, and this file supplies
// what that list cannot: a colour, and the order the client reads them in.
//
// WHY IT IS A MAP IN CODE AND THE GLYPH IS NOT. `type-marks.ts` refuses to hold
// a table on purpose: a mark lives on the `selectable_data` row beside the word
// it marks, so a team renames a type or picks a new two-letter code on the
// Choices screen and is obeyed without a deploy. That is the better shape and it
// is not available here — `selectable_data` has four meaningful columns (`type`,
// `value`, `is_default`, `mark`) and none of them is a colour, so a per-team
// colour would be a migration, a form field and a colour picker before it could
// be a dot. The client ruled FOUR colours for FOUR words in the eighth design
// round; those four words are the ones the base seeds
// (`workers/tenancy/src/team-schema/seed.ts`), so a map keyed on them is exactly
// as correct as the data is, and nothing else in the product needs it to be
// per-team yet. If a team ever wants its own, this file is the one place that
// changes and the column is the change.
//
// ── THE RULING, AND HOW IT IS SPELT (R32) ───────────────────────────────────
//
// The client named her own brand colours: Issue is poppy, Question is orange,
// Request is lavender, Extra is sky. REQUEST WAS FOLDED INTO EXTRA ON 15 SEP
// 2026 and FEEDBACK took its place — and its colour, lavender, because a slot
// falling vacant in a four-colour set is the one moment a fifth colour would
// have had to be invented. Those four ARE tokens — `--kw-poppy`,
// `--kw-orange`, `--kw-lavender`, `--kw-sky` — and writing them here would pass
// R32's grep, which forbids a hex literal and a Tailwind ramp and nothing else.
// It would still be the wrong spelling, for two reasons the kit states itself:
//
//   1 · THE RAW PALETTE IS NOT CONSUMED DIRECTLY. The kit's own token map
//       (`shared/ui/foundations/tokens/token-mapping.md` §L) lists `--kw-*` under
//       "additive tokens … Never consumed directly": they are the pigments the
//       semantic tokens are mixed from, not names a screen says. R32's own
//       sentence agrees from the other side — "what a colour MEANS has a token …
//       and a mark comes from the chart series."
//   2 · THE RAW PALETTE HAS NO DARK HALF, AND THE SERIES DOES. `tokens.css`
//       re-points `--chart-3` at `--kw-poppy-lift` on a dark card because poppy
//       measures 4.05 against one; sky, lavender and orange measure 7.68, 6.65
//       and 6.88 and are deliberately NOT lifted. A dot written as
//       `var(--kw-poppy)` is the un-lifted pigment on both papers — a colour
//       decision this file would be making by accident, against a number the kit
//       already measured.
//
// SO THE FOUR ARE THE CHART SERIES, and today the series IS the client's four
// colours, exactly (`shared/ui/foundations/tokens/tokens.css`):
//
//     --chart-1  var(--kw-sky)        #89BCE6   Extra
//     --chart-3  var(--kw-poppy)      #E94A32   Issue      (lifts on dark)
//     --chart-4  var(--kw-lavender)   #B1A3CF   Feedback   (was Request's)
//     --chart-5  var(--kw-orange)     #F7953E   Question
//
// `--chart-2` (forest) is the one series member with no ticket type, which is
// why the numbers below are not 1-2-3-4: they are the four pigments the client
// chose, named the way the design system names them, and not a re-numbering to
// make the list look tidy.
//
// THE ONE COUPLING THIS BUYS, said out loud rather than discovered later:
// `tokens.css` flags a future chart re-tune as likely, and a re-tune that moved
// `--chart-4` off lavender would move Feedback's dot with it. `process-map.tsx`
// already writes the mirror-image note about the same risk (it takes `--info`
// rather than `--chart-1` for "this step is new", because that mark is a STATUS
// and a status has its own token). A ticket type is not a status and has no
// semantic token of its own — `--destructive` means blocked, not "Issue", and
// `--warning` means warning, not "Question" — so the series is the only honest
// home. If the series moves, this file is the place the four rulings are
// re-checked, which is precisely why they live in one file rather than four.
//
// ── AND THE FIFTH COLOUR, WHICH IS NOT ONE ──────────────────────────────────
//
// The four words are now the ONLY four (`shared/ticket-types.ts`, the owner's
// ruling of 15 Sep 2026), and migration 0093 carried every team to them — so a
// word this map does not know is no longer a vocabulary row anywhere. It is
// still possible on a RECORD: a ticket raised last March under "General", a word
// a team typed before the lock, a ticket with no type at all. None of those is
// enumerated here and none is special-cased — they read the neutral, and the
// WORD beside the dot carries the meaning on its own. That is `type-marks.ts`'s
// own third condition, in colour, and it is why deleting a vocabulary row can
// never orphan the history that already says the word.
//
// ── WHY THE DOT IS NEVER ALONE ──────────────────────────────────────────────
//
// `tokens.css` measures its own set honestly: forest and poppy differ in
// luminance by a ratio of 1.00 and lavender and orange by 1.03, so in greyscale,
// in print, or to a reader with a colour-vision deficiency each of those pairs
// is ONE mark. Its conclusion — "a series in this system needs a direct label, a
// pattern or a shape as well as its colour" — is a charting rule rather than a
// token, and it is this file's obligation to pass on: every caller draws the
// TYPE'S OWN WORD beside the dot. A dot on its own would be a colour nobody can
// read, four times over.

import { TICKET_TYPES, ticketTypeKey } from "@shared/ticket-types"

/** The token a ticket type's dot is filled with, keyed by the seeded word in
 * lower case so a team that capitalises differently still lands on its colour.
 *
 * A CSS COLOUR VALUE, not a Tailwind class, and the difference is deliberate:
 * this is the one form a chart series, an SVG fill and a `<span>`'s background
 * can all read (`relationship-map.tsx` already holds `var(--chart-1)` in exactly
 * this shape for exactly that reason), and a class would tie the answer to one
 * of the three. */
const TYPE_COLOUR: Record<TicketTypeKey, string> = {
  issue: "var(--chart-3)",
  question: "var(--chart-5)",
  extra: "var(--chart-1)",
  feedback: "var(--chart-4)",
}

/** The neutral — a word this map does not know, and a ticket with no type at
 * all. Tertiary ink rather than a fifth colour: the point of the neutral is that
 * it is NOT one of the four, and a grey that flips with the palette is the one
 * fill that stays legible on both papers without a decision. */
export const NEUTRAL_TYPE_COLOUR = "var(--ink-tertiary)"

/** The colour for one ticket type — always a real value, never null.
 *
 * NEVER NULL is the whole contract. A caller that had to handle "no colour"
 * would draw the dot conditionally, and a card with a dot on four rows and none
 * on the fifth reads as the broken one — the same argument `RecordMark` makes
 * about a record with no picture. An unknown type gets the neutral, which is an
 * answer rather than an absence. */
export function ticketTypeColour(value: string | null | undefined): string {
  if (!value) return NEUTRAL_TYPE_COLOUR
  return TYPE_COLOUR[ticketTypeKey(value) as TicketTypeKey] ?? NEUTRAL_TYPE_COLOUR
}

/* ══════════════════════════════════════════════════════════════════════════
   THE ORDER THE FOUR ARE ALWAYS READ IN.
   ══════════════════════════════════════════════════════════════════════════

   CLIENT RULING, 2026-09-06, verbatim: "the order: for all the graphs, it's
   always: 1. issue 2. question 3. request 4. extra. Sort it accordingly in
   which app. Also put it in this order in the open work, and also put it in
   this order in how long a ticket takes to close."

   REQUEST LEFT THE VOCABULARY ON 15 SEP 2026, folded into Extra, and FEEDBACK
   took the fourth place. Her sentence is unchanged in the only way that matters
   — issue leads, question follows, and the two kinds that are somebody asking
   for MORE come after the two that are somebody STUCK.

   It is not alphabetical, it is not by count, and it is not the order the door
   happened to return — it is the order she reads her own work in, and a chart
   whose columns reorder themselves as the numbers move is a chart nobody can
   compare week to week.

   IT IS NO LONGER A LIST TYPED HERE, and that is the 15 Sep change worth
   noticing. The seed planted one order, this file declared another, and keeping
   two hand-written lists of the same four words in step was nobody's job — which
   is how a five-word vocabulary came to ship under a four-column dashboard on
   6 Sep. `TICKET_TYPES` (shared/ticket-types.ts) is the one list now: the seed
   plants it, migration 0093 carries every existing team to it, the door refuses
   a fifth, and this derives her order from it by position.

   KEYED ON THE SAME IDENTITY THE COLOUR IS — `ticketTypeKey`, the product's one
   "is this word that word" test, which `ticketTypeColour` above also uses.
   The two must agree by construction: an order keyed one way and a colour keyed
   another would put a word in the first column wearing the neutral grey.

   AND A WORD THIS LIST HAS NEVER HEARD STILL RENDERS. It sorts to the END, in
   the order it arrived in — a ticket raised years ago under a word the
   vocabulary no longer holds, a kind that only exists on imported tickets. It is
   the same ruling `ticketTypeColour` makes one function up (an unknown word gets
   the neutral rather than being special-cased or refused) and the same one the
   dashboard's own `types` memo makes (a kind that only exists on historical
   tickets is APPENDED rather than dropped, because a bar it owns would
   otherwise vanish from a chart whose total still counts it). A type that
   disappeared from a chart because nobody had ranked it is exactly the silent
   subtraction this whole screen is built to avoid. */
const TYPE_ORDER = TICKET_TYPES.map((t) => ticketTypeKey(t.value))

/** The key of one of the four, so `TYPE_COLOUR` is total over them by
 * construction: adding a word to `TICKET_TYPES` without giving it a colour does
 * not compile, which is the cheapest possible version of the check that would
 * otherwise have to be written. */
type TicketTypeKey = ReturnType<typeof ticketTypeKey>

/** Where a ticket type sits in the client's fixed order — 0-based, and the
 * length of the list (i.e. after all four) for a word the order has never
 * heard of, including a ticket with no type at all. Never negative: a caller
 * sorting on this can add nothing and subtract nothing. */
function ticketTypeRank(value: string | null | undefined): number {
  if (!value) return TYPE_ORDER.length
  const at = TYPE_ORDER.indexOf(ticketTypeKey(value))
  return at === -1 ? TYPE_ORDER.length : at
}

/** The client's order, applied to whatever words a caller is holding.
 *
 * A COPY, and a STABLE sort. The copy is because callers hand this arrays they
 * did not build (`helpTypeOptions` is a cache the screen shares with its
 * siblings, and sorting it in place would reorder the create dialog's picker
 * from a chart). The stability is what makes the unknown tail honest: every
 * word this order has never heard of scores the same rank, so they keep the
 * order they arrived in — the team's own vocabulary order, then anything found
 * only on historical rows — rather than being shuffled by an engine's tie-break. */
export function orderTicketTypes(values: readonly string[]): string[] {
  return [...values].sort((a, b) => ticketTypeRank(a) - ticketTypeRank(b))
}
