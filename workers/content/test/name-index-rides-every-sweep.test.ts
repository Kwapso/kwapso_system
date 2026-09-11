// THE ROUTER'S NAME LIST MUST BE REBUILT WHEREVER THE SWEEP RUNS — and the
// tick that runs on its own was the one that never did it.
//
// `accountsNamedIn` does not read the `accounts` table. It reads
// `knowledge_names`, and only `rebuildNameIndex` carries one into the other.
// `postKnowledgeSync` calls it, with a comment saying the sweep "keeps
// `accountsNamedIn`'s router current" — true of that door, and the door is
// pressed by a person. The SCHEDULED sweep, the only one that happens without
// anybody, ran `sweepAll` and `revisitUnhealthySources` and never touched the
// name index.
//
// So a client created, renamed, deactivated, or given a declared alternate
// spelling (`alt_names`, 0083, the c-misspell row) was invisible to the router
// until somebody happened to press "bring it up to date" in the app. Measured on
// staging 11 Sep 2026: `alt_names` seeded on two accounts, `knowledge_names` sat
// at 184 rows across several cron ticks and did not move.
//
// The failure has no symptom. The question still answers — it just answers
// without narrowing to the client the person named, which reads as an ordinary
// broad answer and never as a bug.
//
// A SOURCE CENSUS, not a mock. A stubbed `env` would prove that a handler we
// wrote calls a function we wrote, which is the shape this repo has been bitten
// by (see NOTE-a-mock-cannot-fail-the-way-the-real-thing-fails.md). What is
// actually at stake is whether BOTH entrances do it, and that is a fact about
// the source.

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const HERE = join(__dirname, "..", "src")

/** The body of a named function, from its declaration to the next one at column
 * zero. Crude on purpose: it must not accept a call that sits in a DIFFERENT
 * function in the same file, which is exactly the mistake being locked. */
function bodyOf(file: string, declaration: string): string {
  const src = readFileSync(join(HERE, file), "utf8")
  const at = src.indexOf(declaration)
  expect(at, `${file} no longer declares ${declaration}`).toBeGreaterThan(-1)
  const rest = src.slice(at + declaration.length)
  const end = rest.search(/\n(export |async function |function |\})/)
  return rest.slice(0, end === -1 ? rest.length : end)
}

describe("the name index rides every sweep", () => {
  it("the door that a person presses rebuilds it", () => {
    expect(bodyOf("routes/knowledge.ts", "export async function postKnowledgeSync(")).toContain(
      "rebuildNameIndex("
    )
  })

  it("the cron that nobody presses rebuilds it too", () => {
    const scheduled = bodyOf("index.ts", "async scheduled(")
    expect(scheduled).toContain("sweepAll(")
    // The canary: if this file ever stops finding the sweep it is reading the
    // wrong block, and the assertion below would pass for the wrong reason.
    expect(scheduled).toContain("rebuildNameIndex(")
  })
})
