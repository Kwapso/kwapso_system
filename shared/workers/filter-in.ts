// A FACET THAT CARRIES A SET, AS SQL — the one clause every door builds it with.
//
// Aurora, 24 Sep 2026: *"i shoudl be able to select multile for each filter
// type"*. Within one facet several values mean OR; across facets they still
// mean AND. In SQL that is one `IN (…)` per facet, ANDed with the rest of the
// WHERE — which is what `statusClause` (`workers/content/src/lib/help.ts`) has
// been doing since the tickets Open tab named three stages at once.
//
// THIS FILE IS THAT CLAUSE, LIFTED, because five more doors now need it and a
// second hand-rolled copy is where the two would start to disagree. Its own
// note already argued the two properties that matter and they are kept
// verbatim in behaviour:
//
//   · AN EMPTY SET NARROWS NOTHING rather than matching nothing. `IN ()` is not
//     valid SQL in SQLite, and "the caller named no value" is indistinguishable
//     from "the caller did not ask", so an empty array is the same answer as
//     `undefined`.
//   · ONE VALUE IS A SET OF ONE. `IN (?)` and `= ?` select the same rows, so a
//     door that grew this clause did not change what any existing caller gets
//     back — which is why the parameter names did not change either, and why
//     R19's census of what a door parses (`searchParams.get("x")`) and R22's of
//     what it reads off a body are both untouched by the whole change.
//
// WHY IT DOES NOT ALSO DE-DUPLICATE OR CAP. `splitFacet` (`shared/facet-list.ts`)
// already did both, at the boundary, where the untrusted string was. A second
// cap here would be a second number to keep in step with `FACET_VALUES_CAP`,
// and a clause that silently repaired its own input would hide a door that
// forgot to parse through the boundary at all.
//
// ── ONE BOUND PARAMETER, WHATEVER THE SELECTION — AND THAT IS THE POINT ─────
//
// The first cut of this file wrote `IN (?, ?, …)`, one placeholder per value,
// which is how `statusClause` does it and is correct THERE: the route keeps
// only `HELP_STATUSES` members, so that list cannot exceed six whatever a
// caller sends. A FACET has no such ceiling. Its vocabulary is a team's own
// accounts, apps and people — 131 clients on staging alone — and two facets
// each carrying a long selection cross D1's hundred-parameter limit between
// them without either one looking unreasonable.
//
// That is not a degradation, it is a 500 at the door: `workers/content/test/
// d1-parameter-cap.test.ts` exists because exactly this shape shipped once and
// made a whole door answer "Something went wrong on our side" for every team
// with more than a hundred chunks. And the alternative — capping what a person
// may select — fails the same reader differently: a filter that quietly
// ignores the eleventh client they ticked is worse than one that refuses,
// because nothing on screen says the answer is partial.
//
// So the clause binds exactly ONE parameter: a JSON array, read back by
// SQLite's own `json_each`. `column IN (SELECT value FROM json_each(?))`
// selects the same rows as `IN (?, ?, …)`, stays an indexable equality on
// `column`, and its parameter count is 1 for one value and 1 for five hundred.
// JSON1 is compiled into D1 and into `node:sqlite`, which is what every worker
// suite here runs against, so the two agree.
//
// `FACET_VALUES_CAP` SURVIVES AND CHANGED JOB. It is no longer a product limit
// standing between a person and their eleventh pick — it is a guard on the
// SIZE OF A REQUEST, sitting far above every vocabulary this app has (the
// largest measured is 131), so the only thing it can cut is a hand-made
// request, where cutting is the right answer and nobody's selection is being
// ignored. `shared/facet-list.ts` carries that reasoning at the constant.

/**
 * `column IN (SELECT value FROM json_each(?))`, or nothing at all.
 *
 * ONE parameter, always, whatever the selection holds — see the header for why
 * that is the whole design and not an optimisation. It comes back as a
 * single-element array so a door splices it into its own params exactly as it
 * splices the clause into its WHERE, which is how every door here already
 * assembles a query.
 */
export function inClause(
  column: string,
  values: readonly string[] | undefined | null
): { sql: string; params: string[] } {
  if (!values || values.length === 0) return { sql: "", params: [] }
  return {
    sql: `${column} IN (SELECT value FROM json_each(?))`,
    params: [JSON.stringify([...values])],
  }
}

/**
 * A YES/NO FACET THAT MAY BE ASKED FOR BOTH — and both is the same as neither.
 *
 * Status (active / inactive), Archived (live / archived): a two-word vocabulary
 * where a multi-select control can legitimately land on the whole set. Asking
 * for every word a facet has is asking for no narrowing, so it collapses to
 * `undefined` rather than to a clause that is always true — a door that takes
 * "both" as a filter would spend a scan saying nothing, and the count beside it
 * would report a narrowing that is not one.
 *
 * Returns the single word when exactly one is chosen, and `undefined` for none,
 * both, or anything outside the pair.
 */
export function oneOfPair<T extends string>(
  values: readonly string[] | undefined | null,
  pair: readonly [T, T]
): T | undefined {
  if (!values) return undefined
  const kept = pair.filter((word) => values.includes(word))
  return kept.length === 1 ? kept[0] : undefined
}
