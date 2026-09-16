// STRIPPING A PICTOGRAPH OUT OF RECORD TEXT — never refusing it.
//
// `shared/workers/validate.ts`'s own `optionalMark` already refuses a
// pictograph outright (R66), and that is the right answer for a MARK field —
// a dropdown value's type glyph, an app section's icon — because the glyph
// IS the whole value and there is nothing left to keep if it is wrong.
//
// A meeting's TITLE is a different shape of problem. It arrives from Google
// Calendar, typed by somebody on the other end of an invitation this app
// never gated, and it usually carries real words around the emoji — "Kickoff
// 🚀 call", never just "🚀". Refusing the sync would leave the row unsynced
// forever (Google never asks this app whether its own subject line is
// acceptable); the honest fix is to remove the glyph and keep the words.
//
// THE CLIENT'S RULING, 16 Sep 2026, verbatim: "Once again, kill the emojis.
// Also, when they're in the name, just remove them, please." — read together
// with her earlier ones on R66 ("i said no emojis. why are there still
// emojis? kill them!", "kill emojis!!!"), this is the SAME instruction aimed
// at a field R66 never reached: a title is prose, not a vocabulary mark, so
// `shared/i18n-strings.json`'s walk and the seeded-vocabulary census that
// enforce R66 both correctly leave it alone — it needed its own seam.
//
// WHY A SEPARATE FILE FROM `shared/workers/validate.ts` RATHER THAN A SHARED
// IMPORT. That file pulls in `GuardError`/`shared/workers/gating.ts` for its
// own refusal shape — worker-request machinery a browser bundle has no
// business carrying for the sake of reusing one regex. This module is read by
// BOTH sides: the ingest normalisation in `workers/content/src/lib/meetings.ts`
// (`titleOf`) and the display-time clean-up for a row synced before this
// ruling shipped (`web/components/deep-link/shape.tsx`'s `shapeMeetingsList`),
// so it stays a plain, dependency-free module — the same reason
// `shared/workers/mojibake.ts`'s `mendMojibake` (this function's usual
// companion at the same ingest call site) carries none either.
//
// THE CLASSIFICATION IS THE SAME ONE `optionalMark`'s `EMOJI_PATTERN` uses,
// kept as its own small constant here rather than imported, for the reason
// above. `\p{Extended_Pictographic}` is the pictograph itself,
// `\p{Regional_Indicator}` is a flag's own two-letter pair, and the ZWJ /
// variation-selector-16 / combining-keycap combiners are what stitch a
// multi-code-point emoji — a skin tone, a flag, a joined sequence, a keycap
// digit — into one glyph. Matched on the Unicode PROPERTY rather than a
// fixed code-point table, so a future emoji release needs no registry update
// here (`shared/workers/validate.ts`'s own comment has the fuller argument).
const PICTOGRAPH_COMBINERS = String.fromCharCode(0x200d, 0xfe0f, 0x20e3)
const PICTOGRAPH_PATTERN = new RegExp(
  `\\p{Extended_Pictographic}|\\p{Regional_Indicator}|[${PICTOGRAPH_COMBINERS}]`,
  "gu"
)

/** Remove every emoji/pictograph from `text`, then collapse the doubled (or
 * wider) space each removal usually leaves behind — "Kickoff 🚀 call"
 * becomes "Kickoff call", never "Kickoff  call" — and trim the ends.
 *
 * `null`/`undefined` pass straight through, the same contract `mendMojibake`
 * carries, so a caller can hand this a nullable column without a branch of
 * its own and the two can be composed directly:
 * `stripPictographs(mendMojibake(event.summary))`.
 *
 * A title that was ONLY a pictograph ("🚀") comes back an empty string, on
 * purpose — the caller's own "nothing was said" fallback (`titleOf`'s own
 * "A meeting with no title") is the one place that decides what an empty
 * title becomes, and this function has no opinion on it. */
export function stripPictographs<T extends string | null | undefined>(text: T): T {
  if (typeof text !== "string") return text
  return text.replace(PICTOGRAPH_PATTERN, "").replace(/ {2,}/g, " ").trim() as T
}
