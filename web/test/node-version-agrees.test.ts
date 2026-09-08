// THE THREE PLACES A NODE VERSION IS DECLARED MUST AGREE.
//
// `package.json`'s `engines.node` is what the project SAYS it needs, `.nvmrc`
// is what a developer's shell picks up, and `.github/workflows/ci.yml` is what
// the only machine that checks anything actually runs. Nothing read all three
// until today, so they were free to drift apart in silence — and silence is the
// whole failure, because each one is individually plausible.
//
// EARNED 8 SEP 2026, AND THE SHAPE IS WORTH KEEPING. A test began importing
// `node:sqlite`. That built-in exists on Node 24 and does not exist on Node 22:
// Vite builds its externalise list from the RUNNING Node, so on 24 it is left
// alone and on 22 it is not recognised, Vite tries to bundle a built-in, and the
// suite fails to load. Every laptop here was on 24. The repo declared 22. CI
// honoured the declaration and went red.
//
// So `npm run check` was green on three machines while CI failed four commits
// in a row, and both were correct — they were running different gates. The only
// signal was a GitHub email, and the owner's words for it were "these fuck-all
// emails. I don't even know what it means."
//
// A version is a DECISION. It may be raised deliberately, in all three files at
// once, which is exactly what this test forces.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const major = (s: string): string => (s.match(/(\d+)/)?.[1] ?? "")

describe("the declared Node version is one decision, not three", () => {
  it("engines.node, .nvmrc and the CI workflow name the same major", () => {
    const engines = major(
      String(JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).engines?.node ?? "")
    )
    const nvmrc = major(readFileSync(join(ROOT, ".nvmrc"), "utf8"))
    const ci = major(
      readFileSync(join(ROOT, ".github", "workflows", "ci.yml"), "utf8").match(
        /node-version:\s*(\S+)/
      )?.[1] ?? ""
    )
    expect(engines, "package.json engines.node must name a major").not.toBe("")
    expect(
      { nvmrc, ci },
      "raise the version in all three files or in none — CI is the only gate that is not your laptop"
    ).toEqual({ nvmrc: engines, ci: engines })
  })

  it("and the Node actually running is not older than the one declared", () => {
    // A developer on an older Node passes every check locally and cannot
    // reproduce CI. Fail here instead, where the sentence says why.
    const engines = major(
      String(JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).engines?.node ?? "")
    )
    const running = major(process.version)
    expect(
      Number(running) >= Number(engines),
      `this Node is v${running}; the project declares >=${engines}. Switch with \`nvm use\`.`
    ).toBe(true)
  })
})
