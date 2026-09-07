// CONFIG PARSING — two bugs of one family, in opposite directions, both invisible
// until someone deliberately chooses the boundary value (which is exactly when it
// matters):
//
//   Number(env.X) || DEFAULT   →  a deliberate 0 becomes the DEFAULT.
//                                 Set the AI allowance to zero, silently grant 50/day.
//   Number(env.X)              →  unset becomes 0.
//                                 A team cap that refuses every account its first team.
//
// So every numeric env var goes through ONE parse, and this file both tests that
// parse at the boundaries and scans the workers so the raw spellings can't return.

import { readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { numberVar } from "@shared/workers/limits"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")

function serverSources(): [string, string][] {
  const dirs = [
    join(ROOT, "shared", "workers"),
    ...readdirSync(join(ROOT, "workers"), { withFileTypes: true })
      .filter((w) => w.isDirectory())
      .map((w) => join(ROOT, "workers", w.name, "src")),
  ]
  return sourceFiles(dirs, { extensions: [".ts"], relativeTo: ROOT }).map((f) => [f.rel, f.source])
}

describe("numeric env vars parse at the boundaries", () => {
  it("honours a deliberate ZERO — the value someone sets to mean 'none'", () => {
    expect(numberVar("0", 25), "0 must mean 0, not 'fall back to 25'").toBe(0)
    expect(numberVar(" 0 ", 25)).toBe(0)
  })

  it("falls back when the var is UNSET or empty — never to 0", () => {
    expect(numberVar(undefined, 5), "unset must be the fallback, not 0").toBe(5)
    expect(numberVar("", 5)).toBe(5)
    expect(numberVar("   ", 5)).toBe(5)
  })

  it("falls back on nonsense rather than propagating NaN", () => {
    expect(numberVar("lots", 5)).toBe(5)
    expect(numberVar("12abc", 5)).toBe(5)
  })

  it("passes ordinary values through, including negatives", () => {
    expect(numberVar("50", 25)).toBe(50)
    expect(numberVar("-1", 25), "a negative is a real choice, not an error").toBe(-1)
  })

  // The scan: neither raw spelling may come back anywhere on the server side.
  it("no worker reads a numeric env var without the one parse", () => {
    const offenders: string[] = []
    /** The POSITIVE CONTROL, gathered on the same pass as the offenders and
     * through the same walk: every place a numeric var goes through the seam
     * correctly. See the two floors below for why it is collected at all. */
    const correct: string[] = []
    for (const [path, src] of serverSources()) {
      const code = stripComments(src)
      for (const m of code.matchAll(/(?:Number|parseInt|parseFloat)\s*\(\s*env\.(\w+)/g))
        offenders.push(`${path} → ${m[0].trim()}… (use numberVar(env.${m[1]}, DEFAULT))`)
      for (const m of code.matchAll(/numberVar\(\s*env\.(\w+)/g)) correct.push(`${path} → ${m[1]}`)
    }

    /* TWO FLOORS, BECAUSE "NOTHING FOUND" IS THIS CHECK'S PASSING ANSWER.
     *
     * `serverSources()` is a DIRECTORY WALK — `shared/workers/` plus a
     * `readdirSync` of `workers/` — and neither of those is a path this file
     * would notice losing. A worker folder renamed, `src/` moved a level, the
     * shared seam relocated: the walk returns fewer files, or none, the
     * offender list is empty, and the suite reports all clear in precisely the
     * words it uses when the code is right. That is the whole failure mode of a
     * census whose pass condition is an empty list.
     *
     * The FILE COUNT catches the walk collapsing. Eight workers plus
     * shared/workers today: 195 `.ts` files between them, measured. 120 is a
     * floor with a quarter of the tree's worth of room to move and no room to
     * disappear.
     *
     * The POSITIVE CONTROL catches the subtler half — a walk that still finds
     * files but no longer finds the SUBJECT. There are numeric env vars in this
     * codebase and they go through `numberVar`; if the scan can see none of
     * them, then whatever it is reading is not the server, and the regex above
     * is being asked about the wrong text. SIX today (the AI allowance, the
     * team cap and the ceilings around them); three is the floor, so the app
     * may retire half of them before anybody has to think about this line. */
    const scanned = serverSources()
    expect(
      scanned.length,
      "the server walk came back nearly empty — a worker directory moved and this census is looking at nothing"
    ).toBeGreaterThan(120)
    expect(
      correct.length,
      `the scan can see no numeric env var going through numberVar at all (found ${scanned.length} files) — ` +
        "so it cannot be trusted to see one that does not"
    ).toBeGreaterThanOrEqual(3)

    expect(
      offenders,
      `a numeric env var parsed by hand — 0 and unset both go wrong: ${offenders.join("; ")}`
    ).toEqual([])
  })
})
