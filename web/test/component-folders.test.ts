// THE COMPONENT TAXONOMY IS A LAW, NOT A HABIT.
//
// `web/components` was 148 flat files until 7 Sep 2026. The fold gave it one
// folder per MODULE or per KIND — and left the arrangement enforced by nobody,
// in a repo with fifty-two machine-checked laws. A convention nothing checks is
// a convention that survives exactly as long as the person who remembers it: the
// next component dropped at the top level would have been green, and the one
// after it would have made "the top level is empty" untrue for good.
//
// The taxonomy also has TWO AXES, which is why the words matter as much as the
// check. `home-screen.tsx` sits in `screens/` and `tickets-screen.tsx` in
// `tickets/`; `collection-heading.tsx` in `records/` and `collection-content.tsx`
// in `deep-link/`. Both pairs are right, and neither is guessable — a newcomer
// has to READ the rule. So the rule is written down once, in
// `web/components/README.md`, and this check DERIVES the permitted set from that
// file rather than holding a second copy of the list. A folder somebody adds
// without describing it goes red; a description of a folder nobody has goes red
// too. The doc and the law cannot disagree, because there is only one of them.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { sourceFiles } from "@shared/rules/source-scan"

const HERE = dirname(fileURLToPath(import.meta.url))
const COMPONENTS = join(HERE, "..", "components")
const README = join(COMPONENTS, "README.md")

/** The folders the README describes — one per table row, in either table. */
function describedFolders(): Map<string, string> {
  const md = readFileSync(README, "utf8")
  const rows = [...md.matchAll(/^\|\s*`([a-z0-9-]+)\/`\s*\|\s*([^|]+?)\s*\|\s*$/gm)]
  return new Map(rows.map((m) => [m[1], m[2]]))
}

/** The taxonomy as the walk sees it: a component either sits in a folder (its
 * `rel` carries a slash) or it is loose at the top (it does not). Read through
 * the one walker every law reads source through, so this check and the laws it
 * protects can never be looking at two different sets of files. */
function onDisk(): { dirs: string[]; files: string[] } {
  const walked = sourceFiles(COMPONENTS, { extensions: [".ts", ".tsx"] })
  const dirs = new Set<string>()
  const files: string[] = []
  for (const f of walked) {
    const cut = f.rel.indexOf("/")
    if (cut === -1) files.push(f.rel)
    else dirs.add(f.rel.slice(0, cut))
  }
  return { dirs: [...dirs].sort(), files: files.sort() }
}

describe("web/components is one folder per module or kind", () => {
  it("the README describes folders at all (the check must not go blind)", () => {
    // A parse that silently matched nothing would pass every assertion below by
    // having nothing to compare. This is the sentinel that says it read the file.
    expect(describedFolders().size, "no table rows parsed out of the README").toBeGreaterThan(10)
  })

  it("nothing sits loose at the top level", () => {
    const loose = onDisk().files
    expect(
      loose,
      `these components sit at the top of web/components — move each into its module's ` +
        `folder, or into the kind folder that fits (web/components/README.md): ${loose.join(", ")}`
    ).toEqual([])
  })

  it("every folder on disk is one the README describes", () => {
    const described = describedFolders()
    const undescribed = onDisk().dirs.filter((d) => !described.has(d))
    expect(
      undescribed,
      `these folders are not in web/components/README.md — add a row saying what belongs ` +
        `there, so the next person can guess right: ${undescribed.join(", ")}`
    ).toEqual([])
  })

  it("every folder the README describes still exists (no rotting rows)", () => {
    const dirs = new Set(onDisk().dirs)
    const gone = [...describedFolders().keys()].filter((d) => !dirs.has(d))
    expect(
      gone,
      `web/components/README.md describes folders that are not there — delete the rows: ${gone.join(", ")}`
    ).toEqual([])
  })

  it("every row says something a person can act on", () => {
    for (const [folder, why] of describedFolders())
      expect(
        why.length,
        `web/components/${folder} needs a real sentence saying what belongs in it`
      ).toBeGreaterThan(30)
  })
})
