// HOW A FACET CARRIES SEVERAL VALUES — one spelling, read by both sides.
//
// Aurora, 24 Sep 2026, validating the filter overlay: *"validated, but i shoudl
// be able to select multile for each filter type"*. A facet takes a SET now:
// three clients, two stages. Within one facet those values mean OR (client is
// Confia or Etzi Haus); across facets they still mean AND. That sentence has to
// survive a query string, a door's SQL and a browser's own narrowing, and the
// only way it survives all three is if exactly one file says how the set is
// written down.
//
// ── THE SPELLING IS THE TICKETS DOOR'S, BECAUSE IT ALREADY EXISTED ──────────
//
// `workers/content/src/routes/help.ts` has parsed a comma-separated `status`
// since the client's Open tab named three stages at once, and its own note
// already argued every property this file needs: one word is a set of one, so
// no existing caller changes; an unrecognised word is DROPPED rather than
// refused, because a mistyped stage is a filter that narrows to nothing, not a
// 400 that takes the page down; and a set that drops to empty is "the caller
// did not ask" rather than "no row may match", because `IN ()` is not valid
// SQL in SQLite and the two cases are indistinguishable from outside.
//
// So this file does not invent a format. It lifts the one already shipping,
// gives it the two properties that door never needed, and puts it where every
// other door and the browser can reach it.
//
// ── THE TWO PROPERTIES THE TICKETS DOOR NEVER NEEDED ────────────────────────
//
// ONE · A VALUE MAY CONTAIN THE SEPARATOR. `status` is a closed vocabulary of
// words with no commas in them, so a plain split was safe there and is not
// safe here. Two of the app's facets are OPEN vocabularies typed by the team
// itself — Country and ticket Type (`shared/selectable-groups.ts`) — and
// "Bonaire, Sint Eustatius and Saba" is a real country in ISO 3166. A plain
// comma join turns that one value into three that match nothing, silently, on
// the one screen a person would least expect it.
//
// SO EXACTLY TWO CHARACTERS ARE ESCAPED, AND NOTHING ELSE: the separator, and
// the escape character itself so that decoding is unambiguous. The first cut
// of this file reached for `encodeURIComponent`, on the reasoning that every
// value the app sends is "a ULID or a lowercase word" and would come back
// byte-identical. THAT WAS WRONG, and a test caught it within the hour: a
// knowledge compartment is `account:<id>`, and `encodeURIComponent` turns the
// colon into `%3A`. One word stopped being byte-identical to itself, which is
// the one promise this whole change rests on — every existing caller, every
// bookmark and the tickets door's own `status=ready` keep working precisely
// because a set of one is spelled exactly the way a single value always was.
// Escaping only what actually breaks the parse keeps that true, and it removes
// the `decodeURIComponent` throw on a malformed escape as a side effect,
// because the reader never meets an escape it did not write.
//
// TWO · A GUARD ON THE SIZE OF A REQUEST. Not a product limit: the door's own
// clause binds exactly ONE parameter whatever the selection holds
// (`inClause`, `shared/workers/filter-in.ts`, reads the set back through
// SQLite's `json_each`), so nothing here has to stand between a person and
// their eleventh pick. What is left is an untrusted string arriving off a
// query parameter, and a string is not allowed to be unbounded just because
// the SQL no longer cares: the cut sits far above every vocabulary this app
// has — the largest measured is 131 clients on staging — so the only thing it
// can ever truncate is a hand-made request, where truncating is the right
// answer and nobody's selection is being ignored.
//
// ── WHERE IT IS DECODED IS WHERE IT IS BOUND ────────────────────────────────
//
// `splitFacet` takes an ALREADY-VALIDATED string. The cap and the NUL strip
// belong at the boundary, on the `searchParams.get` itself, where R20's census
// looks for them — so every door reads `splitFacet(queryText(url.searchParams
// .get("country"), "Country"))` and nothing here is asked to be a validator.
// That is the same arrangement the tickets door already had between `queryText`
// and its own `.split(",")`, and it is why this change touches neither R20's
// list of recognised checkers nor R19's census of parameter names: the names
// and the checking position are exactly what they were, and only the VALUE's
// spelling grew.

/** THE MOST VALUES ONE FACET MAY CARRY — a guard on an untrusted string, not a
 * limit on what a person may tick. It is deliberately far above every
 * vocabulary in this app (131 clients is the largest measured), because the
 * door's clause costs one bound parameter whether the set holds one value or
 * five hundred: nothing here is standing between a reader and their eleventh
 * pick, and if it ever were, that would be a silent truncation and the wrong
 * shape. See the header. */
export const FACET_VALUES_CAP = 500

/** The separator. Named once so a reader of either side can find every use of
 * it, and so it can never be typed differently in two files. */
const SEP = ","

/**
 * SEVERAL VALUES, AS ONE PARAMETER. Percent-encoded per value, joined with a
 * comma. An empty set is `""`, which is the app's own long-standing spelling
 * for "this facet is off" and what every caller already treats as one.
 */
export function joinFacet(values: readonly string[]): string {
  return values
    .filter((v) => v !== "")
    .slice(0, FACET_VALUES_CAP)
    .map((v) => v.replace(/%/g, "%25").replace(/,/g, "%2C"))
    .join(SEP)
}

/**
 * THE SAME PARAMETER, READ BACK. Split, unescaped, trimmed, emptied of blanks,
 * de-duplicated in the order they were written, and cut to the ceiling.
 *
 * ONE PASS over the two escapes this file writes, so `%252C` reads back as the
 * literal `%2C` rather than as a comma — a second pass, or unescaping the two
 * in sequence, would turn an escaped escape into a separator. And a `%` that
 * was never an escape (a country typed "100%", a caller written before this
 * parameter learned to carry a set) matches neither and survives untouched,
 * which is what makes every pre-existing caller safe.
 */
export function splitFacet(raw: string | null | undefined): string[] {
  if (raw == null || raw === "") return []
  const out: string[] = []
  for (const part of raw.split(SEP)) {
    const value = part
      .trim()
      .replace(/%25|%2C/gi, (escape) => (escape.toUpperCase() === "%2C" ? "," : "%"))
      .trim()
    if (value === "" || out.includes(value)) continue
    out.push(value)
    if (out.length === FACET_VALUES_CAP) break
  }
  return out
}
