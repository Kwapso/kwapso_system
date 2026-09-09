// R14, THE SEARCH HALF — a paged collection's search box reaches past the cursor.
//
// The law's own check (bounded-lists, in rules.test.ts) proves a growing
// collection PAGES and that a client can reach page two. It says nothing about
// the search box on top of that list, and that box was the same bug wearing
// different clothes: the library frame filters the array it holds, so on a paged
// screen typing a name searched the loaded fifty and answered "nothing" about
// everything past the cursor — under an exact badge (R16) counting all of it.
// Reported from staging as "it only searches on loaded screen".
//
// So, for every GROWING collection with a list screen (data — read off
// GROWING_COLLECTIONS, never hand-listed here):
//
//   1. its DOOR parses `q`, so there is something honest to ask;
//   2. its recipe does NOT leave the frame's own search box on, so the screen
//      cannot ship two boxes where one of them lies;
//   3. its screen wires a <PagedFind> to that collection's own cache key — the
//      same "the control and the key are one control" test bounded-lists makes
//      of <LoadMore>, and for the same reason: a file mentioning both strings
//      somewhere proves nothing.
//
// And one seam check: the FILTERED total renders through `formatSearchTotal` in
// exactly one place. A collection total and a filtered total are different
// numbers with different rules (only the second may end in "+"), so a screen
// computing its own would be the beginning of two answers to one question.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { FIND_NARROWING_OK, GROWING_COLLECTIONS } from "@shared/rules/registry"
import { BASE_RECIPES } from "../lib/screens"

const HERE = dirname(fileURLToPath(import.meta.url)) // web/test
const WEB = join(HERE, "..")
const ROOT = join(WEB, "..")
const read = (p: string) => readFileSync(p, "utf8")
const componentFiles = () => sourceFiles(join(WEB, "components"), { extensions: [".tsx"] }).map((f) => f.path)

/** The collections this file governs: the growing ones that have a LIST SCREEN.
 * (The activity feeds and the work logs page too, but they are read inside a
 * record's tab / a panel rather than through a searchable list recipe.) */
const SEARCHABLE = Object.entries(GROWING_COLLECTIONS).filter(([, c]) => c.listRecipe)

describe("paged-search (R14, the search half): a paged list searches the whole collection", () => {
  it("finds the collections to check (a blind scan reports all clear exactly like a passing one)", () => {
    expect(SEARCHABLE.length).toBeGreaterThanOrEqual(6)
  })

  for (const [name, c] of SEARCHABLE) {
    it(`${name}: its door parses q, its recipe leaves the frame's box off, its screen wires a find bar`, () => {
      // 1 — the door can be asked.
      expect(
        read(join(ROOT, c.routes)),
        `${name} pages (${c.why}) but its door parses no "q" — there is nothing for a search box to ask`
      ).toContain('searchParams.get("q")')

      // 2 — the frame's own (in-memory, page-one) box is off.
      const recipe = BASE_RECIPES[c.listRecipe as string]
      expect(recipe, `${name}: recipe ${c.listRecipe} must exist`).toBeDefined()
      expect(
        recipe.collection?.searchable,
        `${name} is paged, so the frame's own search box must stay off — it filters the loaded prefix, which is a search that quietly answers "no" about everything past the cursor`
      ).toBe(false)

      // 3 — …and the screen wires a find bar to THIS collection's key.
      // The window starts AT the tag — `<PagedFind<Account>` carries a generic, so
      // "up to the first `>`" would stop inside the type argument. `listKey` is
      // the bar's first prop by convention, so 300 characters is the bar's own
      // props and not the screen around it.
      const wired = componentFiles().some((f) =>
        [...read(f).matchAll(/<PagedFind[\s\S]{0,300}/g)].some((m) => m[0].includes(c.webKey))
      )
      expect(
        wired,
        `${name}'s door can be searched but no screen asks it — a <PagedFind> whose listKey is built from ${c.webKey}`
      ).toBe(true)
    })
  }

  // THE COUNT AND THE LIST ARE ONE ANSWER (R16 meets the search half).
  //
  // A find bar asks the door and renders the door's own exact total beside the
  // rows it got back — "1 meetings match". If the screen then narrows those rows
  // in the browser, the number and the list are answering two different
  // questions, and the screen says "1 meetings match" over "Nothing matched."
  // That is what the meetings list shipped: it asked for the whole meetings list (`view: "all"`,
  // correctly) and then kept only this week's rows out of the answer.
  //
  // Derived from the binding, not from a list of screens: every find-bar screen
  // names its rows in the same line (`const rows = found.active ? found.rows :
  // …`), so the check follows that name and demands that any narrowing of it
  // stands down while a find is active. A resting screen may filter as much as
  // it likes — nothing is counting it.
  //
  // ── AND IT ASSERTS THE CALL, NOT THE CHARACTERS (2026-09-07) ──────────────
  //
  // This check spent its first weeks matching the LITERAL `${name}.filter(` and
  // reading the guard off the PHYSICAL LINE the match sat on. Both halves were
  // defeated by the same keystroke — a newline:
  //
  //     cards: rows              ← the matcher never sees `rows.filter(`
  //       .filter((r) => …)         and the "line" it would read the guard off
  //                                 is `.filter((r) => …)`, which contains
  //                                 neither the guard nor the binding's name.
  //
  // It was not passing because the screen was clean. It was passing because of
  // where somebody had pressed return, and `tickets-collection.tsx` carried a
  // paragraph instructing the next reader to KEEP the chain broken so this
  // suite would stay green — a law bending the code it polices, which is the
  // wrong way round. Both are gone: the matcher tolerates whitespace before the
  // dot, and the guard is read off the whole CHAIN (walking back over
  // continuation lines to the expression's head) rather than off one line of
  // it. So the only two ways past this check now are the two honest ones —
  // guard the filter with `found.active`, or write down in
  // FIND_NARROWING_OK why the call is a partition rather than a narrowing.
  it("no screen re-filters the rows a find bar gave it while a find is running", () => {
    const bindings = /const (\w+) = found\.active \? found\.rows/g
    let inspected = 0
    const offenders: string[] = []
    /** Every pin that fired, so a pin that fires for nothing can go red below. */
    const claimed = new Set<string>()

    /** The head of the expression this call hangs off: from the match, walk back
     * over any lines that are pure continuations (`.foo(…)`, `?.foo(…)`) so a
     * chain written across four lines reads as the one expression it is. */
    const chainHead = (src: string, at: number): string => {
      const lineAt = (i: number) => src.slice(i, src.indexOf("\n", i) === -1 ? src.length : src.indexOf("\n", i))
      let start = src.lastIndexOf("\n", at - 1) + 1
      while (start > 0 && /^\s*\??\./.test(lineAt(start))) start = src.lastIndexOf("\n", start - 2) + 1
      return src.slice(start, at)
    }

    /** WHAT A `.filter(` IS HANGING OFF — walked backwards from the dot.
     *
     * Anchoring on the NAME (`rows.filter(`) is what this check used to do, and
     * it reads only the plainest spelling of the thing it forbids. Three
     * ordinary ways of writing the same narrowing walk straight past a
     * name-anchored matcher, and one of them is what a defensive developer
     * writes FIRST:
     *
     *     rows?.filter(…)          the optional chain
     *     (rows ?? []).filter(…)   the default
     *     rows                     the line break — the 2026-09-07 defect
     *       .filter(…)
     *
     * So the receiver is read instead: from the dot, back over the whitespace
     * and any `?`, then back over ONE primary expression — a balanced `(…)` /
     * `[…]` with whatever identifier precedes it, or a bare identifier chain.
     * A receiver that NAMES the find bar's rows is a narrowing of the find
     * bar's rows however it was spelled. */
    const receiverAt = (src: string, dot: number): number => {
      let i = dot
      while (i > 0 && /\s/.test(src[i - 1])) i--
      if (src[i - 1] === "?") i--
      while (i > 0 && /\s/.test(src[i - 1])) i--
      if (src[i - 1] === ")" || src[i - 1] === "]") {
        const open = src[i - 1] === ")" ? "(" : "["
        const close = src[i - 1]
        let depth = 0
        i--
        for (; i >= 0; i--) {
          if (src[i] === close) depth++
          else if (src[i] === open && --depth === 0) break
        }
      }
      while (i > 0 && /[\w$.?]/.test(src[i - 1])) i--
      return i
    }

    /** The call, from its receiver to its closing paren, whitespace collapsed —
     * `rows.filter((r) => r.status === stage)`. This is what a
     * FIND_NARROWING_OK key names, so a pin excuses ONE call and not every
     * `.filter(` that file will ever hold, and it names the call rather than
     * one particular way of laying it out. */
    const callText = (src: string, from: number, argsOpen: number): string => {
      let depth = 0
      let i = argsOpen
      for (; i < src.length; i++) {
        if (src[i] === "(") depth++
        else if (src[i] === ")" && --depth === 0) break
      }
      return src
        .slice(from, i + 1)
        .replace(/\s+/g, " ")
        .replace(/\s*\.\s*/g, ".")
        .trim()
    }

    for (const f of componentFiles()) {
      const rel = f.replace(`${ROOT}/`, "")
      const src = stripComments(read(f))
      for (const bind of src.matchAll(bindings)) {
        inspected++
        const named = new RegExp(`\\b${bind[1]}\\b`)
        for (const hit of src.matchAll(/\.\s*filter\s*\(/g)) {
          const from = receiverAt(src, hit.index)
          const receiver = src.slice(from, hit.index)
          if (!named.test(receiver)) continue
          // A FILTER OVER A PROJECTION IS NOT A FILTER OVER THE ROWS. Once the
          // chain has been through `.map(`/`.flatMap(` the values in hand are
          // no longer tickets — `rows.map((w) => w.helpType).filter(Boolean)`
          // builds a Type MENU and drops no row from anything a person is
          // counting. The order matters and is the whole distinction:
          // `rows.filter(…).map(…)` has fewer rows in it and IS caught.
          if (/\.\s*(?:map|flatMap)\s*\(/.test(receiver.slice(receiver.search(named)))) continue
          if (chainHead(src, from).includes("found.active")) continue
          const key = `${rel}::${callText(src, from, hit.index + hit[0].length - 1)}`
          if (key in FIND_NARROWING_OK) claimed.add(key)
          else offenders.push(key)
        }
      }
    }
    // A derivation that matches nothing reports all clear exactly like a passing
    // one — the failure this whole file was written about, one level up.
    expect(inspected, "no find-bar screen was inspected — the binding scan has gone blind").toBeGreaterThanOrEqual(5)
    expect(
      offenders,
      "these screens narrow the door's own answer in the browser, under the door's own exact count (R16) — " +
        "guard the filter with `!found.active`, ask the door the narrower question in the first place, or — " +
        "if the call is a PARTITION that drops no row — pin it in FIND_NARROWING_OK with the reason:\n  " +
        offenders.join("\n  ")
    ).toEqual([])
    // THE RATCHET. A pin that no longer names a real call is a record of what
    // this screen used to do, and it is exactly the shape of thing that rots
    // into permission nobody re-read.
    const stale = Object.keys(FIND_NARROWING_OK).filter((k) => !claimed.has(k))
    expect(
      stale,
      `these FIND_NARROWING_OK pins match no call under a find-bar binding any more — delete them:\n  ${stale.join("\n  ")}`
    ).toEqual([])
  })

  it("the filtered total has ONE renderer, and it is the seam allowed to end in a +", () => {
    const users = componentFiles().filter((f) => read(f).includes("formatSearchTotal"))
    expect(
      users.map((f) => f.replace(`${ROOT}/`, "")),
      "formatSearchTotal is the filtered-total seam — the find bar renders it, and nothing else should hand-roll a second one beside it"
    ).toEqual([join(WEB, "components", "records", "paged-find.tsx").replace(`${ROOT}/`, "")])
  })
})
