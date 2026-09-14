// R74 — IMPORT OPENS ITS OWN TAB, IT NEVER REDIRECTS THE ONE YOU WERE IN.
//
// The client, testing Import, 2026-09-14: "make sure that it opens as a new solo
// tab on the breadcrumbs, because now it redirects. In the places where we have
// import, make sure that's what it does." `openInNewTab` (web/lib/nav.ts) is the
// one seam every import dispatch must go through instead of a plain
// `go`/`softNavigate` — see that file's own header for the "why" (a solo tab is
// a one-entry `visitTrail` call, and the model already had the capability).
//
// THE CENSUS IS POSITIONAL, like R20's body-field walk: it does not ask "does
// this file mention openInNewTab anywhere", it asks "which FUNCTION is the
// import-wizard address itself sitting inside the parentheses of" — a call
// written tomorrow (a new import target, a new collection) is held to this
// without anybody adding it to a list, the same discipline R37's in-app-anchors
// census (shell-nav.test.ts) stands on.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { IMPORT_TAB_EXEMPT } from "@shared/rules/registry"

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, "..")

/** A call to `go(`, `softNavigate(` or `openInNewTab(` whose first argument is a
 * template literal — captured whole so the census can read BOTH which function
 * carried it and what address it named, the same pairing R20's own positional
 * proof needs. `\s*` (matches a newline too) between the paren and the backtick
 * is what keeps a wrapped call like:
 *
 *   openInNewTab(
 *     `/t/${teamId}/import/stories`,
 *     ...
 *   )
 *
 * readable — these are three-argument JSX event handlers, not one-liners. */
const DISPATCH = /\b(go|softNavigate|openInNewTab)\(\s*`([^`]*)`/g

/** Is this template literal actually the import wizard's own address —
 * `/t/<teamId>/import`, with or without a target and a query string — and not
 * some OTHER path that merely contains the five letters "import" (a door call
 * like `/api/data-ops/import/sample` is never wrapped in one of these three
 * navigators to begin with, so it never reaches this predicate, but the anchor
 * still keeps the match honest rather than a bare `.includes("import")`). */
function targetsImportWizard(target: string): boolean {
  return /^\/t\/\$\{[^}]+\}\/import(\/|\?|$)/.test(target)
}

describe("import-opens-a-tab: every import dispatch opens its own tab (R74)", () => {
  it("import-opens-a-tab: no go()/softNavigate() targets the import wizard directly", () => {
    const files = sourceFiles(join(WEB, "components"), { extensions: [".tsx", ".ts"] })
    expect(files.length, "the component census found nothing — it has gone blind").toBeGreaterThan(50)

    const offenders: string[] = []
    const stillCarriesADispatch = new Set<string>()

    for (const { rel, source } of files) {
      const src = stripComments(source)
      for (const m of src.matchAll(DISPATCH)) {
        const fn = m[1]
        const target = m[2]
        if (!targetsImportWizard(target)) continue
        if (fn === "openInNewTab") continue
        stillCarriesADispatch.add(rel)
        if (IMPORT_TAB_EXEMPT[rel]) continue
        offenders.push(`${rel} → ${fn}(\`${target}\`…) — this must open through openInNewTab(), not ${fn}()`)
      }
    }

    expect(
      offenders,
      "every navigation to the import wizard must open through openInNewTab() (web/lib/nav.ts) as its own " +
        "fronted tab, never redirect the tab the reader was already standing in (the client's ruling, " +
        `2026-09-14). Offenders:\n${offenders.join("\n")}`
    ).toEqual([])

    // ROT-CHECK, THE OTHER DIRECTION. A line in IMPORT_TAB_EXEMPT naming a file
    // that no longer carries a non-seam import dispatch has outlived its
    // subject — the same "the list can only shrink" every other _EXEMPT table
    // in shared/rules/registry.ts is held to (R73).
    for (const rel of Object.keys(IMPORT_TAB_EXEMPT))
      expect(
        stillCarriesADispatch.has(rel),
        `IMPORT_TAB_EXEMPT names ${rel} but it carries no import-wizard dispatch outside openInNewTab any ` +
          "more — delete the line."
      ).toBe(true)
  })

  // THE ONE SHAPE THE CENSUS ABOVE CANNOT SEE. Home's "Bring a spreadsheet in"
  // tile (components/screens/home-screen.tsx) dispatches through a shared
  // `onItemClick` handler common to all three "Start here" steps, where the
  // import address is a `.href` FIELD compared against the clicked item's id —
  // never the direct argument of a navigator call — so DISPATCH above never
  // matches it (a positional census can only see a position). It gets its own
  // line instead, read straight off the file, proving the exact guard exists
  // rather than merely that some call to openInNewTab does, somewhere.
  it("import-opens-a-tab: Home's own import tile opens through the seam too", () => {
    const src = stripComments(readFileSync(join(WEB, "components/screens/home-screen.tsx"), "utf8"))
    expect(
      /item\.id\s*===\s*`\/t\/\$\{teamId\}\/import`\s*\?\s*openInNewTab\(\s*item\.id/.test(src),
      'home-screen.tsx\'s "Bring a spreadsheet in" tile must open the import wizard through openInNewTab(item.id, …), ' +
        "not the plain softNavigate(item.id) every other Start-here step uses."
    ).toBe(true)
  })
})
