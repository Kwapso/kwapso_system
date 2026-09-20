import { TITLE_MAX_CHARS } from "./types"

/** THE ELLIPSIS CHARACTER R87 I1 PROMISES: one glyph (U+2026), never three
 * dots, so a title clamped here reads identically to a `clampRecordHeading`
 * truncation elsewhere in the app. */
const ELLIPSIS = "…"

/** How close to the cut a space has to be before it wins over a hard,
 * mid-word cut, Aurora's own number, 21 Sep 2026. */
const WORD_BOUNDARY_WINDOW = 12

/** CLAMPS A TITLE THAT ARRIVED ALREADY WRITTEN: R87's I1 amendment, dated
 * 21 Sep 2026: "imported knowledge titles are clamped on import at 50,
 * imported ticket and story titles stay whole." `TITLE_MAX_CHARS`
 * (`shared/types.ts`) is the FORM's ceiling, the 51st character never
 * types, and `requireText`/`optionalText` refuse a typed title past it so
 * the person shortens it themselves. This is the OTHER seam: every writer
 * that hands a knowledge source's `title` column a string nobody typed,
 * a file's own name, a mirrored ticket/story/account/app/.../row, a Google
 * Drive/Gmail/Calendar/Chat item, a seeded glossary word, clamps it here
 * on the way in instead of either rejecting it or storing it long.
 *
 * Keeps the first `max - 1` characters and appends a single ellipsis
 * character so the cut is visible at a glance. When a space sits within the
 * last `WORD_BOUNDARY_WINDOW` characters of that slice, the cut lands on the
 * space instead, never mid-word, and any trailing space either cut leaves
 * behind is trimmed before the ellipsis is appended. A title already at or
 * under the cap is returned unchanged, byte for byte. */
export function clampTitle(title: string, max: number = TITLE_MAX_CHARS): string {
  if (title.length <= max) return title

  const keepLength = max - 1
  let cut = title.slice(0, keepLength)

  const windowStart = Math.max(0, cut.length - WORD_BOUNDARY_WINDOW)
  const lastSpace = cut.lastIndexOf(" ")
  if (lastSpace >= windowStart) cut = cut.slice(0, lastSpace)

  cut = cut.replace(/ +$/, "")

  return cut + ELLIPSIS
}
