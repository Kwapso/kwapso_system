// THE GOLDEN PATH CANNOT FALL BEHIND THE LAW-BOOK.
//
// `BUILD-A-MODULE.md` is the document somebody follows end to end to add a team
// module, and it ends with a promise: "a module that ships without these turns
// the build red." That promise is only worth anything while the list is the whole
// list. On 5 Sep 2026 it named twenty of fifty-one, and the thirty-one it did not
// name were, almost exactly, the ones added since it was written — which is to
// say the ones a NEW module is most likely to trip over. Following the document
// produced a red build the reader then debugged one law at a time: R28/R33 first
// (any label they wrote was a sentence the catalogue did not have), then R36
// (a `TEAM_MODULES` key offers four permission boxes and something has to decide
// them), then R48/R50, R39, R40/R41, R21.
//
// Nothing detected that, because a document going stale is not a behaviour and no
// test in this repo read the golden path at all. This is the check that makes the
// list self-maintaining: EVERY id in the registry must be named in the file. A
// law added tomorrow turns the build red until the golden path names it.
//
// Deliberately no exemption list. A law a new module can safely not know about is
// a category this repo does not have — RULES.md's own framing is that these are
// the conditions of shipping — so an escape hatch here would only ever be used to
// avoid writing one sentence.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { RULES_REGISTRY } from "@shared/rules/registry"

const ROOT = join(__dirname, "..", "..")

const goldenPath = () => readFileSync(join(ROOT, "documents", "BUILD-A-MODULE.md"), "utf8")

/** Every R-number the document names, however it names it — a heading, a
 * checklist line, a parenthesis. The question is whether a reader following this
 * page is TOLD about the law, not where.
 *
 * `\d{1,2}` UNTIL 21 SEP 2026, WHEN R100 MINTED THE FIRST THREE-DIGIT LAW. A
 * capped digit count is exactly the silent-rot shape this file's own header
 * warns about elsewhere in this repo ("a green check may measure nothing"):
 * the day the ninety-ninth law's successor landed, this extraction would have
 * gone on reporting a clean pass forever, having quietly stopped being able to
 * SEE the one id most likely to be missing from a document written before it
 * existed. `doc-claims.test.ts`'s own equivalent extraction already reads
 * `\bR\d+\b`, unbounded, for the same "the other direction" check — this
 * matches it rather than inventing a second cap that could drift from it
 * again at R1000. */
const named = () => new Set([...goldenPath().matchAll(/\bR\d+\b/g)].map((m) => m[0]))

describe("BUILD-A-MODULE.md names every law in the registry", () => {
  it("the registry and the document are both being read", () => {
    // THE CANARY. This is a set difference, and a set difference against an empty
    // set is empty — a registry that failed to import, or a document that failed
    // to load, would both report a clean pass.
    expect(RULES_REGISTRY.length, "expected the law registry to hold laws").toBeGreaterThan(40)
    expect(named().size, "expected the golden path to name laws").toBeGreaterThan(20)
  })

  it("no law is missing from the golden path", () => {
    const missing = RULES_REGISTRY.map((r) => r.id).filter((id) => !named().has(id))
    expect(
      missing,
      "these laws are enforced by the build and BUILD-A-MODULE.md does not mention them, so somebody " +
        "following it end to end meets them as failures rather than as instructions. Add each to the " +
        `checklist (one line naming the law and what a module owes it): ${missing.join(", ")}`
    ).toEqual([])
  })

  it("names no law the registry does not have", () => {
    // The other direction, so the document can only shrink honestly. An R-number
    // for a law that was retired is worse than a missing one: it sends a reader
    // looking for a check that is not there.
    const ids = new Set(RULES_REGISTRY.map((r) => r.id))
    const invented = [...named()].filter((id) => !ids.has(id))
    expect(
      invented,
      `BUILD-A-MODULE.md names ${invented.join(", ")}, which shared/rules/registry.ts does not define`
    ).toEqual([])
  })
})
