// THE THROTTLE IS ONLY REAL IF THE BINDING IS DEPLOYED — and nothing else can tell.
//
// EARNED BY ITS OWN FIX, on the day that fix shipped. `guardMaintenance`
// (src/index.ts) refuses more than twelve maintenance calls a minute from one
// address, and it FAILS OPEN when `env.MAINTENANCE_LIMIT` is absent — deliberately,
// because a limiter that cannot answer must not become an outage, and because the
// code has to survive the window between a deploy and its binding.
//
// That correct decision has a consequence nobody could see: **the code cannot
// distinguish "the binding is not deployed yet" from "somebody deleted it".**
// Measured 6 Sep 2026 by deleting the `ratelimits` block from both environments —
// the gateway suite passed 84/84, `tsc` passed, and the throttle guarding eight
// `x-admin-key` doors on the public internet became a silent no-op. A green build,
// and the control gone.
//
// The suite beside this one proves the LOGIC by injecting a limiter directly. That
// is the right way to test a decision, and it says nothing whatever about whether
// the deployment provides one. Two different questions; this file is the second.
//
// BOTH ENVIRONMENTS, SEPARATELY, and that is the whole reason this is not a grep.
// `MAINTENANCE_LIMIT` appearing ONCE in the file satisfies any naive search while
// staging — or production — carries no limiter at all. Wrangler environments do
// not inherit a parent's bindings (the same trap `shell-routing.test.ts` records
// for `assets.run_worker_first`), so a block present at the top level and missing
// under `env.staging` is exactly the shape that would ship. The file is split at
// the `"env"` key and each half is asked on its own.
//
// DELIBERATELY NARROW: one named binding, the one holding a control that shipped
// today. A general "every binding a worker reads is declared" census is a bigger
// law and a different day's work — this is the guard for the hole that is open now.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"

const GATEWAY = join(__dirname, "..")
const BINDING = "MAINTENANCE_LIMIT"

/** The config, comments removed — a jsonc file whose reasoning mentions a binding
 * must not thereby prove the binding exists. `health-names-are-real.test.ts`
 * records this being got wrong twice: a law that reads source off the disk reads
 * the prose too. */
const config = stripComments(readFileSync(join(GATEWAY, "wrangler.jsonc"), "utf8"))

/** The file in two halves at the `"env"` key: everything before it is the
 * TOP-LEVEL scope, which for this worker is PRODUCTION (the worker is literally
 * named "kwapso"); everything after is the named environments, of which staging
 * is the only one. Crude on purpose — a real jsonc parse would be more precise
 * and would also let a nested `"env"` inside some future block move the split
 * silently. The `it` below asserts the split actually happened. */
const envAt = config.indexOf('"env"')
const production = envAt > 0 ? config.slice(0, envAt) : ""
const environments = envAt > 0 ? config.slice(envAt) : ""

describe("the maintenance throttle's limiter is actually deployed", () => {
  it("the split found both scopes — the canary", () => {
    // Without this, a renamed or removed `"env"` key leaves both halves empty and
    // every assertion below passes over nothing at all. That is the failure this
    // whole file exists to guard against, one level up, and it would be the most
    // embarrassing possible way to lose it.
    expect(envAt, 'the config has no "env" key — this census cannot see staging').toBeGreaterThan(0)
    expect(production.length, "the production scope parsed empty").toBeGreaterThan(200)
    expect(environments.length, "the environments scope parsed empty").toBeGreaterThan(200)
    expect(production, "…and the split must not put the staging worker in the production half").not.toContain(
      "kwapso-staging"
    )
  })

  it(`declares ${BINDING} in PRODUCTION`, () => {
    expect(
      production,
      `workers/gateway/wrangler.jsonc does not bind ${BINDING} at the top level. guardMaintenance fails OPEN when it is absent, so the maintenance doors — migrate-teams, create-team, move-module, db-sizes and the four on data-ops — are published to the public internet with no throttle and no record, and every test still passes.`
    ).toContain(BINDING)
  })

  it(`declares ${BINDING} in STAGING`, () => {
    expect(
      environments,
      `workers/gateway/wrangler.jsonc does not bind ${BINDING} under env.staging. Wrangler environments do NOT inherit the parent's bindings, so a top-level block alone leaves staging unthrottled — and staging is where the maintenance doors are actually exercised.`
    ).toContain(BINDING)
  })

  it("…and the code still reads it, so the binding is not decoration", () => {
    // The other direction of the same hole: a declared binding nothing consults is
    // as dead as an undeclared one, and reads as a control in both the config and
    // the review.
    const source = stripComments(readFileSync(join(GATEWAY, "src", "index.ts"), "utf8"))
    expect(
      source,
      `${BINDING} is declared but src/index.ts never reads env.${BINDING} — the throttle is wired to nothing`
    ).toContain(`env.${BINDING}`)
  })
})
