// THE APP RESTRICTION IS A CONTROL, SO EVERY DOOR IT APPLIES TO MUST CARRY IT.
//
// `portal_users.app_restriction` narrows one client contact to named systems
// inside their own company. `account-scope.ts` records that this control SHIPPED
// AS A LIE ONCE ALREADY — "a control that lies is worse than a missing one" —
// and was made real on 19 Aug 2026. It was made real door by door, and three
// doors were missed: `appModulesWhere` and `listSavings`, both on the client
// portal's own allow-list, and `processOrThrow`, the by-id read whose LIST
// sibling had carried the clause from the start.
//
// WHY NOTHING CAUGHT IT. `app-restriction-is-real.test.ts` tests what
// `appScopeClause` RETURNS for a given scope. That is the helper's behaviour, and
// it is a different sentence from "every door uses it" — the exact distinction
// R20 draws when it says the query half needed a CALL-SITE census of its own
// even though `queryText`'s behaviour was already locked. R21 and the portal
// fence suite are both blind to this dimension by construction: they ask about
// the ACCOUNT fence, and an app restriction lives inside one account.
//
// So this is the call-site census. It is deliberately SHAPED, not counted: a
// bare "there are five" would go green if somebody added a sixth site and
// removed a real one on the same day. What it asserts is that every function in
// this module which fences by ACCOUNT on a table carrying `app_id` also fences by
// APP — derived from the source, so a sixth door is judged the day it is written.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { appScopeClause, type AccountScope } from "@shared/workers/account-scope"

const SRC = join(__dirname, "..", "src", "lib", "processes.ts")
const source = readFileSync(SRC, "utf8")

/** Every `export`ed or plain `function NAME(...) { … }` body in the file, keyed
 * by name — the same slice-to-the-next-declaration walk the seam scanners use. */
function functions(src: string): Map<string, string> {
  const out = new Map<string, string>()
  const starts = [...src.matchAll(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/g)]
  starts.forEach((m, i) =>
    out.set(m[1], src.slice(m.index as number, starts[i + 1]?.index ?? src.length))
  )
  return out
}

/** The columns that ARE an app id, as this module spells them. A read fencing on
 * one of these is a read about apps, whatever the function is called. */
const APP_COLUMNS = /\b(?:[a-z]\.)?app_id\b|appScopeClause\(scope, "id"\)/

describe("app-fence census: a client's app restriction reaches every door it should", () => {
  const fns = functions(source)

  it("the census is alive (a blind walk would pass everything below)", () => {
    expect(fns.size, "no functions parsed out of processes.ts").toBeGreaterThan(20)
    expect(
      [...fns.values()].filter((b) => b.includes("appScopeClause(")).length,
      "no function in this module fences by app — the walk has gone blind, or the fence was deleted wholesale"
    ).toBeGreaterThanOrEqual(5)
  })

  it("every account-fenced read of an app-shaped table also fences by app", () => {
    const offenders: string[] = []
    for (const [name, body] of fns) {
      // Only the reads that already fence by ACCOUNT — a helper that takes no
      // scope is not a door and is not this law's business.
      if (!body.includes("accountScopeClause(")) continue
      // …and only those that actually touch an app id. A read on a table with no
      // `app_id` cannot be narrowed by an app restriction and must not be
      // dragged in here, or the law becomes noise somebody silences.
      if (!APP_COLUMNS.test(body)) continue
      if (!body.includes("appScopeClause(")) offenders.push(name)
    }
    expect(
      offenders,
      `these reads fence a client login by ACCOUNT but not by APP, so a contact restricted to named systems still reads the ones they were restricted away from: ${offenders.join(", ")}`
    ).toEqual([])
  })

  it("…and every app fence is ANDed in, never left computed-and-unused", () => {
    // The failure the R21 review found in its own instrument: calling the fence
    // function proves nothing if its `.sql` never reaches a WHERE. Cheap here,
    // because every call site in this module binds it to `apps`.
    const offenders: string[] = []
    for (const [name, body] of fns) {
      if (!body.includes("appScopeClause(")) continue
      // THE BINDING NAME IS DERIVED, not assumed. It was written as a literal
      // `apps.sql` first and that was wrong twice over: `listSavings` had to
      // rename its binding to `appFence` (an unrelated `apps` Map already lived
      // in that scope), at which point the census would have reported a fence
      // that was correctly ANDed in as missing — a false RED that teaches people
      // to loosen the check. A law that dictates a variable name is a law about
      // spelling.
      const bound = /const\s+(\w+)\s*=\s*appScopeClause\(/.exec(body)?.[1]
      if (!bound) {
        offenders.push(`${name} (appScopeClause called without binding its result)`)
        continue
      }
      // The clause must be READ back out — spread into a where(...) list or
      // pushed into one — and its params must reach the bind array.
      if (!new RegExp(`\\b${bound}\\.sql\\b`).test(body)) offenders.push(`${name} (clause never used)`)
      else if (!new RegExp(`\\b${bound}\\.params\\b`).test(body))
        offenders.push(`${name} (params never bound)`)
    }
    expect(
      offenders,
      `an app fence that is computed and not ANDed into the statement is a control that lies — the shape this module was fixed for once already: ${offenders.join(", ")}`
    ).toEqual([])
  })

  it("the helper still narrows a restricted client and leaves everyone else alone", () => {
    // The behavioural half, kept beside the census so a reader sees both halves
    // of the same law in one file.
    const restricted = { kind: "portal", appIds: ["A1", "A2"] } as unknown as AccountScope
    const unrestricted = { kind: "portal", appIds: null } as unknown as AccountScope
    const staff = { kind: "staff" } as AccountScope
    expect(appScopeClause(restricted, "p.app_id").sql).toContain("p.app_id IN")
    expect(appScopeClause(unrestricted, "p.app_id").sql).toBe("")
    expect(appScopeClause(staff, "p.app_id").sql).toBe("")
  })
})
