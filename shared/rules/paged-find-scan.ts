// THE ONE "IS THIS <PagedFind> WIRED TO THAT CACHE KEY" ANSWER — read by
// paged-search.test.ts, paged-sort.test.ts and rules.test.ts's own
// facets-ask-the-door (R14's search/sort/filter halves), all three of which
// prove the same underlying fact: a `<PagedFind>` tag's `listKey` traces back
// to a GROWING_COLLECTIONS entry's own `webKey` (`helpKey(`, `knowledgeKey(`,
// …), never merely that the file mentions both strings somewhere (the R14
// blind spot each of those three files' own header names).
//
// A TEST module, like seam-scan.ts and source-scan.ts beside it. Nothing in
// any worker's src/ or either front end's app/ imports it.
//
// WHY THIS EXISTS AS ITS OWN FILE, 22 Sep 2026. All three call sites used to
// answer the question the same, narrower way: take a fixed-size window of
// text starting at `<PagedFind` and check whether it CONTAINS the webKey
// literal. That is exactly right when a screen writes `listKey={knowledgeKey(teamId)}`
// (or a two-way ternary) inline on the tag — and exactly wrong the day a
// screen's `listKey` is read by more than one mount point (a record-hosted
// knowledge tab and the whole-team gallery sharing one `<PagedFind>` shape,
// `knowledge-screen.tsx`'s own third scope) and gets hoisted to a single
// `const listKey = …` above the JSX so every mount reads the same value —
// exactly what that file's own comment says the hoist is FOR ("not inline on
// <PagedFind> below, so the tag's own props stay short"). The literal
// `knowledgeKey(` then sits thousands of characters above the tag, outside
// every window all three suites used, and a screen that was correctly wired
// read as unwired.
//
// THE FIX IS ONE LEVEL OF INDIRECTION, NEVER MORE. `wiredToKey` still demands
// the webKey appear literally in the window FIRST — the common, inline case,
// unchanged. Only when that fails does it read the window's own `listKey={…}`
// expression, take the trailing bare identifier off it (`found.listKey ??
// listKey` → `listKey` — the fallback a `<PagedFind>` reads once a find is
// resting, `paged-find.tsx`'s own shape), and require a `const` of that exact
// name, DECLARED IN THE SAME FILE, whose own initializer contains the webKey
// within a bounded distance. A name that resolves to nothing, or resolves to a
// declaration that never mentions the webKey, still fails — the census still
// refuses "a file mentioning both strings", it now also refuses to be fooled
// by an identifier that merely happens to be named `listKey`.

/** The trailing bare identifier in a `listKey={…}` expression — the value a
 * `<PagedFind>` actually uses once `found.listKey` (present only while a find
 * bar is active) is absent, and the whole expression when there is no `??`. */
function listKeyFallbackIdent(windowText: string): string | undefined {
  const m = /listKey=\{([^}]*)\}/.exec(windowText)
  if (!m) return undefined
  const idents = m[1].match(/[A-Za-z_$][\w$]*/g)
  return idents?.[idents.length - 1]
}

/** Does `windowText` (a `<PagedFind…` slice) trace back to `webKey` — inline,
 * or through the one `const NAME = …webKey…` indirection described above? */
export function pagedFindWiredTo(fileSource: string, windowText: string, webKey: string): boolean {
  if (windowText.includes(webKey)) return true
  const name = listKeyFallbackIdent(windowText)
  if (!name) return false
  const decl = new RegExp(`\\bconst\\s+${name}\\b[^=]*=`).exec(fileSource)
  if (!decl) return false
  const from = decl.index + decl[0].length
  // Bounded, not "to the next const": a ternary/ternary-chain assignment runs
  // a few lines at most, and an unbounded read risks crossing into a second,
  // unrelated declaration of the same common name (`listKey`) further down
  // the file and crediting it for wiring it never did.
  return fileSource.slice(from, from + 1000).includes(webKey)
}
