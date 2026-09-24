// Collection data operations — the pure, testable logic behind every collection.
// Given rows + a CollectionConfig (+ the live search text and page), it applies,
// in order: the total `limit` → `filter` rules → search → sort → pagination, and
// returns the current page plus the totals the UI needs. Keeping this here (not
// inside a component) means it's deterministic and unit-tested.

import { type CollectionConfig, evaluateRules, type Rule } from "./config"
import { splitFacet } from "@shared/facet-list"
import { parseRange } from "./range"

export interface CollectionSlice<T> {
  /** Rows for the current page (what you render). */
  visible: T[]
  /** All rows after limit + filter + search + sort, before pagination. */
  filtered: T[]
  /** filtered.length — drives the "Showing X of Y" count. */
  total: number
  /** Number of pages. */
  pageCount: number
  /** The current page, clamped into range. */
  page: number
}

/** Derive the distinct, sorted values of a field from the data — used by the
 * filter bar when a facet doesn't declare its own `options`. Pure + testable. */
export function facetOptions<T>(
  data: T[],
  field: string
): { value: string; label: string }[] {
  const seen = new Set<string>()
  const out: { value: string; label: string }[] = []
  for (const row of data) {
    const raw = (row as Record<string, unknown>)[field]
    if (raw == null || raw === "") continue
    const v = String(raw)
    if (!seen.has(v)) {
      seen.add(v)
      out.push({ value: v, label: v })
    }
  }
  return out.sort((a, b) => a.label.localeCompare(b.label))
}

export function selectRows<T>(
  data: T[],
  config: CollectionConfig,
  opts: {
    query?: string
    searchKeys?: (keyof T)[]
    page?: number
    /** User-facing facet selections: { field: chosenValue }. Each becomes an
     * `is` Rule ANDed with the builder `filter` in the SAME filter step. */
    facetValues?: Record<string, string>
  } = {}
): CollectionSlice<T> {
  const { query = "", searchKeys = [], page = 0, facetValues = {} } = opts
  const get = (row: T, key: PropertyKey) =>
    (row as Record<PropertyKey, unknown>)[key]

  // 1) cap the TOTAL number of rows
  let rows = config.limit != null ? data.slice(0, config.limit) : data.slice()

  // 2) filter: builder rules + user-facet rules, ANDed, via the SAME engine.
  // A `control:"range"` facet carries "min..max" and compiles to INCLUSIVE
  // gte/lte rules; every other facet is a plain `is`. The facet's control is
  // looked up (not guessed from the value's shape) so a string field that
  // happens to contain ".." is still matched exactly.
  const facetRules: Rule[] = Object.entries(facetValues)
    .filter(([, v]) => v != null && v !== "")
    .flatMap(([field, value]): Rule[] => {
      const facet = config.filterFacets?.find((f) => f.field === field)
      // A SET IS NOT A RULE HERE — see `facetMatches` below. Only the range
      // facet still compiles to rules, because its two bounds are genuinely an
      // AND of two comparisons over one field.
      if (facet?.control !== "range") return []
      const { min, max } = parseRange(value)
      const out: Rule[] = []
      if (min != null)
        out.push({ source: "row", field, op: "gte", value: String(min) })
      if (max != null)
        out.push({ source: "row", field, op: "lte", value: String(max) })
      return out
    })
  const allFilters: Rule[] = [...(config.filter ?? []), ...facetRules]
  if (allFilters.length > 0) {
    rows = rows.filter((row) =>
      evaluateRules(allFilters, {
        row: row as Record<string, unknown>,
        user: {},
        app: {},
      })
    )
  }

  /* ── SEVERAL VALUES IN ONE FACET MEAN OR; TWO FACETS MEAN AND ─────────────
     Aurora, 24 Sep 2026: "i shoudl be able to select multile for each filter
     type". The browser's own narrowing has to say the same sentence the doors
     now say in SQL (`inClause`, shared/workers/filter-in.ts), or the same
     collection would answer two different questions depending on whether it
     pages.

     IT IS NOT A `Rule`, AND THAT IS THE WHOLE REASON THIS IS A SEPARATE PASS.
     `Rule` is the app's own visibility grammar — it is also what a recipe's
     builder filters, a screen's visibility conditions and the process map's
     own conditions are written in, and `evaluateRules` ANDs the list it is
     given. Teaching it an `isOneOf` operator would widen a type four other
     features read, to express something only a facet needs. So the facet
     narrowing is its own predicate, ANDed with whatever the rules already
     decided, and the OR lives inside one facet where it belongs.

     AN EMPTY SET NARROWS NOTHING, the same answer `inClause` gives for the
     same reason: "named no value" and "did not ask" are one state. */
  const setFacets = Object.entries(facetValues).filter(([field, value]) => {
    if (value == null || value === "") return false
    return config.filterFacets?.find((f) => f.field === field)?.control !== "range"
  })
  if (setFacets.length > 0) {
    rows = rows.filter((row) =>
      setFacets.every(([field, value]) => {
        const wanted = splitFacet(value)
        if (wanted.length === 0) return true
        return wanted.includes(String(get(row, field) ?? ""))
      })
    )
  }

  // 3) free-text search over the named keys
  const q = query.trim().toLowerCase()
  if (config.searchable && q && searchKeys.length > 0) {
    rows = rows.filter((row) =>
      searchKeys.some((k) =>
        String(get(row, k) ?? "")
          .toLowerCase()
          .includes(q)
      )
    )
  }

  // 4) sort by a column (numbers compare numerically, else locale string compare)
  if (config.sortBy) {
    const dir = config.sortDir === "desc" ? -1 : 1
    rows = rows.slice().sort((a, b) => {
      const av = get(a, config.sortBy)
      const bv = get(b, config.sortBy)
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === "number" && typeof bv === "number")
        return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }

  const filtered = rows
  const per = config.itemsPerPage ?? filtered.length
  const pageCount = per > 0 ? Math.max(1, Math.ceil(filtered.length / per)) : 1
  const current = Math.min(Math.max(page, 0), pageCount - 1)
  const visible = config.itemsPerPage
    ? filtered.slice(current * per, current * per + per)
    : filtered

  return { visible, filtered, total: filtered.length, pageCount, page: current }
}
