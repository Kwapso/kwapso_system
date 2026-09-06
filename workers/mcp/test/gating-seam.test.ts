// R10 (widened) — the EXTERNAL machine surface gets its own gating seam. The other
// workers gate writes with requireRight (their gating-seam suites); the mcp worker's
// writes are IDENTITY-gated instead — a bearer token (verified per request) or the
// signed-in session user — so this suite asserts every non-GET route opens with
// token/user verification. Reads handler source off disk (rules-test style) so no
// ungated door can ship on this surface either.
//
// WHAT CHANGED ON 6 SEP 2026, and why it is the point of the file. This suite used
// to parse the worker's `switch` with a regex of its own, because mcp had no ROUTES
// table and no routes/ directory — its doors were `case` arms and its gates were
// verifyToken/requireUser rather than requireRight. Both halves of that excuse are
// gone: the worker now declares a ROUTES table and exports its handlers from
// routes/, so the SHARED scanner reads this surface exactly as it reads the other
// five. What stays local is the only thing that was ever genuinely local — the gate
// VOCABULARY (this surface asks who you are, never what your role allows) and the
// three assertions below about ORDER and failure mode, which no generic scan knows
// to make. The comment stripping was already shared; now the walk is too.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { gatingSeam } from "@shared/rules/seam-scan"
import { stripComments } from "@shared/rules/source-scan"
import { ROUTES } from "../src/index"

const SRC = join(__dirname, "..", "src")

/** THE GATES ON THIS SURFACE. Not a permission question — an identity one.
 * `verifyToken` proves a bearer token is live and unrevoked; `requireUser`
 * proves a session cookie belongs to a signed-in person. The leading boundary
 * is load-bearing for the same reason it is in the shared GATE_RE: without it a
 * `skipVerifyToken(` would read as a gate. */
const MCP_GATES =
  /(?<![A-Za-z0-9_$.])(?:verifyToken|requireUser)\s*(?:<[^(<>]*>)?\s*\(/

gatingSeam({
  name: "mcp",
  routes: ROUTES,
  src: SRC,
  minRoutes: 4,
  // Every write here is caller-private bookkeeping or a forward to a door that
  // publishes for itself — see the note on the ROUTES table. The tripwire still
  // demands a populated table with a non-GET route in it.
  requiresMutation: false,
  gates: MCP_GATES,
})

/* The three questions a generic scan cannot ask, kept beside the surface they
 * are about. Each reads the handler's own source off disk. */

const read = (rel: string) => readFileSync(join(SRC, rel), "utf8")

/** The body of a top-level `export async function <name>(` in a routes module. */
function fnBody(rel: string, name: string): string {
  const src = read(rel)
  const start = src.indexOf(`export async function ${name}(`)
  expect(start, `handler ${name} must exist in mcp/src/${rel}`).toBeGreaterThan(-1)
  const next = src.indexOf("\nexport async function ", start + 1)
  return stripComments(src.slice(start, next === -1 ? undefined : next))
}

describe("gating-seam (mcp): the order and the failure mode, not just the presence", () => {
  it("the /mcp door verifies the bearer BEFORE reading the request body", () => {
    const body = fnBody("routes/mcp.ts", "handleMcp")
    const verifyAt = body.indexOf("verifyToken(")
    const parseAt = body.indexOf("request.json")
    expect(verifyAt, "handleMcp must verify the token").toBeGreaterThan(-1)
    expect(parseAt, "handleMcp parses the JSON-RPC body").toBeGreaterThan(-1)
    // An unauthenticated caller must cost a hash lookup at most — never a parse.
    expect(verifyAt).toBeLessThan(parseAt)
  })

  it("requireUser fails closed (throws when signed out)", () => {
    const body = fnBody("routes/tokens.ts", "requireUser")
    expect(body).toContain('GuardError(401, "signed_out"')
  })

  // The only unauthenticated route is the health check, and it is deliberately
  // OUTSIDE the ROUTES table (a probe that must answer while a binding is
  // missing cannot be dispatched through machinery that needs those bindings).
  // So the assertion is the stronger one: every route IN the table verifies its
  // caller, GET included — which the shared seam, scanning non-GETs only, does
  // not say. `GET /api/mcp/tokens` hands back a person's own tokens.
  it("every route in the table verifies its caller — reads included", () => {
    for (const [route, def] of Object.entries(ROUTES)) {
      const rel = route === "POST /mcp" ? "routes/mcp.ts" : "routes/tokens.ts"
      const body = fnBody(rel, def.handler.name)
      expect(
        MCP_GATES.test(body),
        `${route} (${def.handler.name}) must verify its caller — only the health probe is open, and it is not in this table`
      ).toBe(true)
    }
  })

  it("the health door is open, and is the ONLY door outside the table", () => {
    const index = stripComments(read("index.ts"))
    const early = index.slice(0, index.indexOf("const def = ROUTES[route]"))
    expect(early).toContain("GET /api/mcp/health")
    // Anything else answered before the table lookup would be an ungated door
    // this suite never sees. One route literal above the dispatch, no more.
    expect((early.match(/route === "/g) ?? []).length, "only the health probe may answer above the table").toBe(1)
  })
})
