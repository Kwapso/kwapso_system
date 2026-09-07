// THE RUNNING TOTAL REACHES THE PERSON WHO GRANTS IT.
//
// `agent_credits.lifetime_granted` was incremented on every top-up from the day
// the table shipped and read by NOTHING — not a screen, not a door, not a
// script. Its own schema comment said "total ever granted (for admin view)" and
// DATA-MODEL.md repeated the promise; the admin view was never built. A column
// written on every grant and read by nobody is the purest shape of a dead end,
// and a comment promising a screen that does not exist is the half that keeps
// it invisible, because it reads like a plan rather than a gap.
//
// It is NOT decoration: a balance is spent down, so the moment a team has used
// its credits nothing anywhere can say how much they were ever given. The
// reader it always needed is the operator running the top-up, so the grant
// answers with both numbers.
//
// TWO HALVES, because either one alone can rot. The lib must actually READ the
// column back (a `SELECT balance` that forgot it would return a plausible zero
// forever), and the door must actually SAY it — a route that computes the
// number and drops it on the floor is the same dead end one hop later.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"
import { grantCredits } from "@shared/workers/credits"

/** A D1 stub that records the statements it was given and answers the read with
 * the row a real database would hold after the upsert above it. Shaped like the
 * real binding — `prepare().bind().run()` and `.first()` — so this proves the
 * lib's own call, not an agreement between two stubs. */
function stubDb(row: { balance: number; lifetime_granted: number } | null) {
  const statements: string[] = []
  const DB = {
    prepare(sql: string) {
      statements.push(sql)
      return {
        bind: () => ({
          run: async () => ({ meta: { changes: 1 } }),
          first: async () => row,
        }),
      }
    },
  }
  return { env: { DB } as never, statements }
}

describe("agent_credits.lifetime_granted has a reader", () => {
  it("grantCredits reads the running total back and returns it beside the balance", async () => {
    const { env, statements } = stubDb({ balance: 120, lifetime_granted: 500 })
    const out = await grantCredits(env, "01JTEAM", 20)
    expect(out).toEqual({ balance: 120, lifetimeGranted: 500 })
    // The SELECT must ASK for the column. A read that only fetched `balance`
    // would let the function return a confident, permanent 0 for the other half.
    const select = statements.find((s) => /^\s*SELECT/i.test(s))
    expect(select, "the grant must read the row back after the upsert").toBeDefined()
    expect(select, "the read-back must ask for lifetime_granted, not just balance").toMatch(
      /lifetime_granted/
    )
  })

  it("answers honestly when the row is missing rather than inventing a total", async () => {
    const { env } = stubDb(null)
    expect(await grantCredits(env, "01JTEAM", 20)).toEqual({ balance: 0, lifetimeGranted: 0 })
  })

  it("the grant door puts it in the answer — the operator is the reader", () => {
    // POSITIONAL, and comments stripped: this file's own prose says
    // "lifetimeGranted" a dozen times, and so does the route's. What must be
    // true is that the handler's `json(...)` literal carries the field.
    const route = stripComments(
      readFileSync(join(__dirname, "../src/routes/agent.ts"), "utf8")
    )
    const at = route.indexOf("export async function postGrantCredits")
    expect(at, "postGrantCredits must exist").toBeGreaterThan(-1)
    const body = route.slice(at, at + 1200)
    expect(
      body,
      "the grant handler must destructure lifetimeGranted from grantCredits — a returned number nobody takes is the same dead end one hop on"
    ).toMatch(/lifetimeGranted\s*\}\s*=\s*await\s+grantCredits/)
    expect(
      body,
      "the grant handler's json() must carry lifetimeGranted, or the running total reaches nobody again"
    ).toMatch(/return\s+json\(\{[^}]*lifetimeGranted[^}]*\}\)/)
  })
})
