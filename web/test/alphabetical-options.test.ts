// @vitest-environment node
//
// A pure source scan: it reads files and looks at their text, never touches a
// DOM (sections-stand-on-paper.test.ts's own reason for the same directive).
//
// ─────────────────────────────────────────────────────────────────────────────
// R75 — THE OPTIONS A PERSON PICKS FROM ARE A→Z, IN THEIR OWN LANGUAGE.
// ─────────────────────────────────────────────────────────────────────────────
//
// THE CLIENT, 2026-09-14, over Settings › Automations' own Module filter:
//
//   "In settings, automations, make sure that in the sort component, in the
//    modules component, you sort it A to Z. This here, but everywhere in the
//    app, make it a law."
//
// A CHOICE a control offers — a filter facet's options, a `<Select>`'s items,
// a picker's list — is not a collection row (those carry their own sort
// control, R53's `<SortControl>`); it is presented alphabetically, comparing
// the LABEL a person reads, locale-aware (`shared/web/sorted-options.ts`'s
// `sortedOptions()`, `localeCompare(lang)` against the app's CURRENT
// language).
//
// THREE CLAUSES, only the second one derived off the whole disk:
//
//   i.   THE CENTRAL FACET GUARD — `filter-bar.tsx`'s own `optionsFor` is the
//        ONE render chokepoint every `FilterFacet` on both front doors passes
//        through (declared options or derived from the rows, gated or
//        narrowed). Sorting its result once, there, is what fixes the
//        client's own named example — Settings › Automations' and Settings ›
//        Choices' Module and Status filters — without a second line at
//        either screen's own `filterFacets` declaration.
//   ii.  THE PICKER CENSUS — every hand-rolled `<Select>`/`<SelectItem>` list
//        built by `.map()`, and every picker `options={…}` prop built the
//        same way, across `web/`, `web-portal/` and `shared/web/`. POSITIONAL,
//        the same shape R20 and R74 already use: the array immediately
//        feeding that `.map()` must itself open with `sortedOptions(` (a
//        trailing `.filter(...)` after it still counts — filtering a sorted
//        list keeps it sorted), or the file is named in `ORDERED_OPTIONS_OK`
//        (shared/rules/registry.ts) keyed `path#subject`, `subject` being the
//        identifier the offending `.map()` actually reads.
//   iii. ONE NAMED BLIND SPOT — `roles-matrix.tsx`'s own module rows
//        (`moduleColumns`) build a kit-specific row config, never a
//        `<SelectItem>`, so clause ii's regex cannot see it. Read directly,
//        the same move R74 makes for Home's own import tile.
//
// WHAT THIS LAW DELIBERATELY DOES NOT TOUCH, and why that is a scope decision
// rather than a gap: `CollectionConfig.sortOptions` / `COLLECTION_SORTS`
// (WHICH FIELD to sort a collection BY — "Newest first", "Priority order")
// never appears in either census above, because neither is built by a
// `.map()` feeding a `<SelectItem>`/`options=` at the point this law reads —
// they are typed out by hand, one line per option, exactly because their
// landing order is a designed sequence (`web/lib/collection-sorts.ts`'s own
// header: dates newest-first, tickets' drag-rank first per SCOPE ch.07). See
// RULES.md's R75 row for the full argument.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { FACET_ORDER_OK, ORDERED_OPTIONS_OK } from "@shared/rules/registry"

const HERE = dirname(fileURLToPath(import.meta.url)) // web/test
const ROOT = join(HERE, "..", "..") // repo root
const WEB = join(ROOT, "web")
const WEB_PORTAL = join(ROOT, "web-portal")
const SHARED_WEB = join(ROOT, "shared", "web")

const read = (p: string) => readFileSync(p, "utf8")

/** Given the FULL (stripped-comments) source of a file and the index of the
 * `.` that opens a `.map(` call, decide whether the expression it is chained
 * off already opens with `sortedOptions(` — walking back over zero or more
 * trailing `.something(...)` segments (a `.filter(...)` after the sort, most
 * often) — and return the SUBJECT a reader would recognise: the name of the
 * `sortedOptions(` call when compliant, or the innermost identifier the
 * `.map()` actually reads when it is not (what an `ORDERED_OPTIONS_OK` entry
 * is keyed on). */
function analyzeMapReceiver(before: string): { compliant: boolean; subject: string } {
  let s = before.trimEnd()
  for (;;) {
    s = s.trimEnd() // a chained call often opens on its own line ( .filter(...) )
    if (!s.endsWith(")")) break
    let depth = 0
    let i = s.length - 1
    for (; i >= 0; i--) {
      if (s[i] === ")") depth++
      else if (s[i] === "(") {
        depth--
        if (depth === 0) break
      }
    }
    if (i < 0) break // unbalanced — bail rather than guess
    let j = i
    while (j > 0 && /[A-Za-z0-9_$]/.test(s[j - 1])) j--
    const name = s.slice(j, i)
    if (name === "sortedOptions") return { compliant: true, subject: name }
    if (j > 0 && s[j - 1] === ".") {
      // a chained call after the sort (.filter(...), most often) — strip it
      // and keep looking further back for the sortedOptions( root.
      s = s.slice(0, j - 1)
      continue
    }
    // a bare call that is not `.foo(...)` and not `sortedOptions(...)` — this
    // IS the receiver (e.g. a helper returning an array outright).
    return { compliant: false, subject: name || s.slice(Math.max(0, i - 40), i) }
  }
  const m = /([A-Za-z0-9_$]+)\s*$/.exec(s)
  return { compliant: false, subject: m ? m[1] : s.slice(-40) }
}

type Candidate = { rel: string; subject: string; compliant: boolean }

describe("RULES — R75, the options a person picks from are A→Z", () => {
  it("alphabetical-options: the central facet seam sorts every FilterFacet's options", () => {
    const src = stripComments(read(join(SHARED_WEB, "screen-engine", "filter-bar.tsx")))
    expect(
      src,
      "R75 — filter-bar.tsx must import sortedOptions from @shared/web/sorted-options: the one render chokepoint every FilterFacet on both front doors passes through is where this law's first half is enforced"
    ).toMatch(/import\s*\{\s*sortedOptions\s*\}\s*from\s*"@shared\/web\/sorted-options"/)
    expect(
      src,
      'R75 — filter-bar.tsx\'s `facetOptionList` must read `f.ordered ? optionsFor(f) : sortedOptions(optionsFor(f), lang)` — ' +
        "every facet is alphabetical by default (sorting the result of `optionsFor`, which already carries the " +
        "declared/derived and gated/narrowed logic) without touching a single `filterFacets` declaration, and the ONLY " +
        "way out is `FilterFacet.ordered` (config.ts), a flag a facet declaration sets and pairs with a reasoned line " +
        "in `FACET_ORDER_OK` (shared/rules/registry.ts) — the sibling escape hatch to `ORDERED_OPTIONS_OK` below, for a " +
        "facet rather than a hand-rolled picker."
    ).toMatch(/const facetOptionList = f\.ordered \? optionsFor\(f\) : sortedOptions\(optionsFor\(f\), lang\)/)
  })

  it("alphabetical-options: roles-matrix.tsx's own module rows are named directly", () => {
    const src = stripComments(read(join(WEB, "components", "team", "roles-matrix.tsx")))
    expect(
      src,
      "R75 — roles-matrix.tsx's moduleColumns must open with sortedOptions(sheets[0]?.perms.modules …) — this list builds a kit row config rather than a <SelectItem>, so it is invisible to the derived census below and is read directly instead, the same move R74 makes for Home's own import tile"
    ).toMatch(/sortedOptions\(sheets\[0\]\?\.perms\.modules/)
  })

  it("alphabetical-options: every FilterFacet.ordered flag is registered in FACET_ORDER_OK, both ways", () => {
    // POSITIONAL, the same shape the picker census below uses: a `FilterFacet`
    // declaration in this codebase is written as one object literal on one
    // line (`{ field: "…", label: …, control: …, ordered: true }`), so
    // `field:\s*"([^"]+)"` on the SAME LINE as `ordered:\s*true` is read as
    // the pair a `FACET_ORDER_OK` entry names. A facet declared instead as a
    // multi-line literal would not be found here — the same honestly-scoped
    // limitation clause iii above states for roles-matrix.tsx, read for this
    // law's other escape hatch.
    const declared: { rel: string; field: string }[] = []
    let filesScanned = 0
    for (const f of sourceFiles([WEB, WEB_PORTAL, SHARED_WEB], {
      extensions: [".tsx"],
      relativeTo: ROOT,
      skipTests: true,
    })) {
      filesScanned++
      const src = stripComments(f.source)
      for (const line of src.split("\n")) {
        if (!/\bordered\s*:\s*true\b/.test(line)) continue
        const m = /\bfield\s*:\s*"([^"]+)"/.exec(line)
        if (m) declared.push({ rel: f.rel, field: m[1] })
      }
    }
    expect(
      filesScanned,
      "R75 — the FilterFacet.ordered census walked no files at all. The scan is blind — fix it before trusting the result"
    ).toBeGreaterThan(50)

    const usedKeys = new Set<string>()
    const offenders: string[] = []
    for (const d of declared) {
      const key = `${d.rel}#${d.field}`
      if (key in FACET_ORDER_OK) usedKeys.add(key)
      else
        offenders.push(
          `${key}: FilterFacet.ordered is set with no matching line in FACET_ORDER_OK (shared/rules/registry.ts) — ` +
            `name "${key}" there with the real reason this facet's order is not alphabetical, or remove the flag`
        )
    }
    expect(
      offenders,
      `R75 — every FilterFacet.ordered flag is registered, with a reason:\n  ${offenders.join("\n  ")}`
    ).toEqual([])

    const stale = Object.keys(FACET_ORDER_OK).filter((k) => !usedKeys.has(k))
    expect(
      stale,
      `these FACET_ORDER_OK entries match no ordered: true facet any more — the flag was removed, or the entry's key ` +
        `no longer matches the declaration — delete the entry:\n  ${stale.join("\n  ")}`
    ).toEqual([])
  })

  it("alphabetical-options: every hand-rolled option list is sorted, or named in ORDERED_OPTIONS_OK", () => {
    const SELECT_MAP = /\.map\(\(([^)]*)\)\s*=>\s*\(?\s*<SelectItem\b/g

    const candidates: Candidate[] = []
    let filesScanned = 0

    for (const f of sourceFiles([WEB, WEB_PORTAL, SHARED_WEB], {
      extensions: [".tsx"],
      relativeTo: ROOT,
      skipTests: true,
    })) {
      filesScanned++
      const src = stripComments(f.source)

      // ── A · A `.map()` whose arrow returns a <SelectItem> directly ───────
      for (const m of src.matchAll(SELECT_MAP)) {
        const mapAt = m.index ?? -1
        if (mapAt < 0) continue
        const before = src.slice(Math.max(0, mapAt - 3000), mapAt)
        const { compliant, subject } = analyzeMapReceiver(before)
        candidates.push({ rel: f.rel, subject, compliant })
      }

      // ── B · an `options={…}` prop whose value is built by `.map()` ───────
      let from = 0
      for (;;) {
        const at = src.indexOf("options={", from)
        if (at === -1) break
        const valueStart = at + "options={".length
        let i = valueStart
        let depth = 1
        while (i < src.length && depth > 0) {
          if (src[i] === "{") depth++
          else if (src[i] === "}") depth--
          i++
        }
        const valueEnd = i - 1 // position of the matching '}'
        from = i
        const value = src.slice(valueStart, valueEnd)
        const mapRel = value.indexOf(".map(")
        if (mapRel === -1) continue
        const mapAt = valueStart + mapRel
        const before = src.slice(Math.max(0, mapAt - 3000), mapAt)
        const { compliant, subject } = analyzeMapReceiver(before)
        candidates.push({ rel: f.rel, subject, compliant })
      }
    }

    // THE BLINDNESS TRIPWIRE. A scan that walked no files, or found no
    // candidate at all, agrees with a scan that found only compliant ones —
    // fix it before trusting the result (same discipline as every other
    // census in this file).
    expect(
      filesScanned,
      "R75 — the option-list census walked no files at all. The scan is blind (a moved root, a broken sourceFiles call) — fix it before trusting the result"
    ).toBeGreaterThan(50)
    expect(
      candidates.length,
      "R75 — the option-list census found NO hand-rolled <SelectItem>/options={} .map() at all. Either the app stopped building option lists by hand (unlikely) or the two regexes above no longer match the app's own shape — fix the scan before trusting it"
    ).toBeGreaterThan(5)
    expect(
      candidates.some((c) => c.compliant),
      "R75 — the option-list census found NO compliant (sortedOptions-wrapped) site at all, on a codebase this law has already fixed sites in — the scan is blind"
    ).toBe(true)

    const usedKeys = new Set<string>()
    const offenders: string[] = []
    for (const c of candidates) {
      if (c.compliant) continue
      const key = `${c.rel}#${c.subject}`
      if (key in ORDERED_OPTIONS_OK) {
        usedKeys.add(key)
        continue
      }
      offenders.push(
        `${key}: a hand-rolled option list not wrapped in sortedOptions(…) — wrap the array feeding this .map() ` +
          `in sortedOptions(ARRAY, lang[, labelOf]), or name "${key}" in ORDERED_OPTIONS_OK with the real reason its order is not alphabetical`
      )
    }
    expect(
      offenders,
      `R75 — every option a control offers is A→Z, or named as an ordered exception:\n  ${offenders.join("\n  ")}`
    ).toEqual([])

    const stale = Object.keys(ORDERED_OPTIONS_OK).filter((k) => !usedKeys.has(k))
    expect(
      stale,
      `these ORDERED_OPTIONS_OK entries match no unsorted option list any more — the site now opens with sortedOptions(, or was deleted — delete the entry:\n  ${stale.join("\n  ")}`
    ).toEqual([])
  })
})
