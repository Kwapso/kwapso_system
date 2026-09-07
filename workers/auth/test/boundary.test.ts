import { describe, expect, it } from "vitest"

import { doorSource } from "./doors"

import { stripComments } from "@shared/rules/source-scan"

// THE UNAUTHENTICATED DOOR MUST NOT CRASH ON A WRONG-TYPED FIELD.
//
// `POST /api/auth/email/start` with `{"email": 123}` used to be a 500: the code
// read `body.email ?? ""` and handed a number to `.trim()`. Three things made
// that worse than an ordinary bug. It is reachable by ANYONE — no session, both
// public doors. It crashes BEFORE the send throttle runs, so none of the
// throttle's ceilings apply. And the worker's catch writes an `error_logs` row
// into the GLOBAL core database on every 500 — so a stranger in a loop is an
// unauthenticated write into the one database every team shares.
//
// TypeScript could never have caught it: `as { email?: string }` is a claim
// about a JSON body, not a fact. Only a runtime check is a check.
//
// The second half is why this is one test and not two. Auth's catch had no
// GuardError branch — every sibling worker maps refusals first, auth went
// straight to 500. So adding validation WITHOUT that branch would have turned
// each intended 400 into exactly the 500 the validation existed to prevent.

// The whole DOOR SURFACE, not one file: the handlers live under routes/ since
// 6 Sep 2026 and this assertion is about where a body field is validated, not
// about which module holds the handler. See test/doors.ts.
const SRC = doorSource()

/** Comment-stripped source: a rule satisfied by prose is not satisfied. The ONE
 * stripper (shared/rules/source-scan.ts) — this file used to carry its own, a
 * weaker one that left TRAILING comments standing, so a `// body.email` note at
 * the end of a line still read as a body field being used. */
const CODE = stripComments(SRC)

describe("auth validates at the boundary", () => {
  it("reads no request field without checking its type", () => {
    // EVERY use of a body field, not just the one shape the old bug had. An
    // earlier version of this test only looked for `body.x ?? ""`, and a cast
    // — `(body.email as string) ?? ""` — walked straight past it. So the rule
    // is positional: a body field may appear ONLY as the first argument to a
    // validator. Anything else is the field being trusted.
    //
    // ONE OTHER POSITION, and it is deliberately the narrowest widening this
    // rule could take. `imageFieldLimit(body.x)` is the CAP-CHOOSING half of the
    // very validator on the same line: a picture field carries either a data URL
    // (measured in bytes) or a stored path (measured in characters), so the
    // ceiling has to be read off the value's own shape, and the alternative is a
    // hand-written constant sitting beside a byte limit it does not reference —
    // which is precisely the 20,000-character prose cap that silently refused
    // every logo in the app for weeks. It is admitted ONLY for a field that ALSO
    // appears as a validator's first argument, so it cannot become a way to read
    // a field without validating it: on its own it is still an offender, and the
    // strictness this file was written for is untouched.
    const validated = new Set(
      [...CODE.matchAll(/(?:requireText|optionalText|queryText)\(\s*(body\.\w+)/g)].map((m) => m[1])
    )
    const raw: string[] = []
    for (const m of CODE.matchAll(/body\.\w+/g)) {
      const before = CODE.slice(Math.max(0, (m.index ?? 0) - 40), m.index).trimEnd()
      if (/(requireText|optionalText|queryText)\($/.test(before)) continue
      if (/imageFieldLimit\($/.test(before) && validated.has(m[0])) continue
      raw.push(m[0])
    }
    expect(
      raw,
      `these body fields are used without passing through a validator: ${raw.join(", ")}`
    ).toEqual([])
  })

  it("puts every body field through the one validation seam", () => {
    /* THE SEAM IS NAMED, NOT MEASURED IN CHARACTERS (2026-09-08).
     *
     * This was `/requireText[\s\S]{0,80}from "@shared\/workers\/validate"/` —
     * "the word `requireText` occurs within eighty characters of that import
     * path". Eighty was comfortable for `import { requireText, TEXT_LIMITS }
     * from "@shared/workers/validate"` and would stay comfortable for a while,
     * so this is not a fix for something about to break. It is a fix for a
     * check that was never asking the question:
     *
     *   · the window says nothing about WHICH import the word belongs to. Two
     *     import lines next to each other — `import { requireText } from
     *     "./local-shim"` above the shared one — satisfy it while auth
     *     validates through a local copy, which is exactly the drift the ONE
     *     seam exists to prevent;
     *   · and it is one named import away from failing while everything is
     *     correct, which teaches the next person that the window is the
     *     problem rather than that the rule was.
     *
     * So the import statements are read as statements, and the question asked
     * is the one that matters: is `requireText` a name auth got FROM the shared
     * validator? A namespace import (`import * as v from …`) answers it too. */
    const importedFrom = (module: string): Set<string> => {
      const names = new Set<string>()
      for (const m of CODE.matchAll(/import\s+([\s\S]*?)\s+from\s+"([^"]+)"/g)) {
        if (m[2] !== module) continue
        for (const n of m[1].replace(/[{}]/g, " ").split(","))
          names.add(n.trim().split(/\s+as\s+/).pop()?.trim() ?? "")
      }
      return names
    }
    const seam = importedFrom("@shared/workers/validate")
    expect(
      [...seam].length,
      "auth imports nothing at all from @shared/workers/validate — this derivation has gone blind, or the seam has moved"
    ).toBeGreaterThan(0)
    expect(
      seam.has("requireText"),
      `auth must get requireText FROM the shared validator; it imports [${[...seam].join(", ")}] from it. A local \`requireText\` is a second seam, and the second one is the one that drifts.`
    ).toBe(true)
    // Every door that reads a body must validate: email start, verify, and both
    // halves of the email change.
    const uses = (CODE.match(/requireText\(/g) ?? []).length
    expect(uses, "every body field auth reads must go through requireText").toBeGreaterThanOrEqual(6)
  })

  it("answers a refusal as a refusal, not as a crash", () => {
    const at = CODE.indexOf("} catch (e)")
    expect(at, "the central catch must exist").toBeGreaterThan(-1)
    const body = CODE.slice(at, at + 900)
    // THE BRANCH IS FIRST, and it answers with the refusal's own status.
    //
    // This used to match the one-line form `if (e instanceof GuardError) return
    // fail(` literally, and on 2026-09-05 the branch grew a body — a diagnosed
    // refusal (gating.ts's `detail`) now records the CAUSE before answering,
    // because 1,991 of 5,086 live rows recorded the sentence we showed the user
    // instead of the reason Google gave us. Matching the old shape would have
    // failed a change that keeps every property this test is about, which is why
    // the properties are asserted here rather than the punctuation.
    expect(body, "GuardError must be mapped BEFORE anything else").toMatch(
      /if \(e instanceof GuardError\)/
    )
    expect(body, "and the refusal must answer with its own status, code and message").toMatch(
      /return fail\(e\.status, e\.code, e\.message\)/
    )
    // And it must come first — a recordWorkerError above it would mean every
    // 400 still writes a row to the global database.
    const guardAt = body.indexOf("instanceof GuardError")
    const recordAt = body.indexOf("recordWorkerError")
    expect(guardAt, "the refusal branch must precede the crash recording").toBeLessThan(
      recordAt === -1 ? Number.MAX_SAFE_INTEGER : recordAt
    )
    // AN ORDINARY REFUSAL STILL WRITES NOTHING, which is the property the line
    // above was really defending. Any recording inside the GuardError branch is
    // gated on `e.detail`, and only a refusal that carries a diagnosis has one —
    // no permission gate in the codebase sets it. So a 400 is as silent as it
    // ever was, and a dead Google credential is not.
    const branch = body.slice(guardAt, body.indexOf("console.error"))
    if (branch.includes("recordWorkerError"))
      expect(
        branch.indexOf("e.detail"),
        "a recording inside the refusal branch must be gated on e.detail, or every 400 writes a row again"
      ).toBeLessThan(branch.indexOf("recordWorkerError"))
  })
})
