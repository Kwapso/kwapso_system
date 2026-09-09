// THE ONE RULE THAT LETS A BROWSER PUT STRAIGHT TO A BUCKET, AND THE FOUR WAYS
// IT COULD QUIETLY BE WIDER THAN IT NEEDS TO BE.
//
// A CORS rule opens nothing on its own — R2 still refuses any request without a
// valid signature, and the signature the presign door mints covers one key, one
// method, one label, one length and a five-minute deadline. What the rule
// decides is which ORIGINS may ask at all, and for which METHODS. That is a
// small decision with a large blast radius if it drifts: `*` plus `GET` would
// make every object in the bucket readable cross-origin by any page on the
// internet, and nobody would see a symptom.
//
// So `scripts/r2-cors.mjs` derives its answer rather than carrying one, and this
// suite re-derives BOTH halves independently, the way `r2-lifecycle.test.ts`
// does beside it:
//
//   · the BUCKETS — the script reads the content worker's vars; this reads the
//     `UPLOAD_TARGETS` table's own `bucketVar` set, which is the list of buckets
//     the presign door can actually sign against. A bucket with a rule and no
//     target is a widening nobody asked for; a target whose bucket has no rule
//     is the fast path silently never running.
//   · the ORIGIN — the script reads `PUBLIC_APP_URL`; this asserts it is the
//     AGENCY door's origin for that environment and that the PORTAL's is not in
//     the list, because a client login never reaches the presign door
//     (`refusePortalCaller`) and therefore has no PUT to make.
//
// And it pins the narrowness itself: PUT only, never `*`, and no read method.

import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { corsRules, corsTargets, contentVars, CORS_MAX_AGE_SECONDS } from "../../../scripts/r2-cors.mjs"
import { UPLOAD_TARGETS } from "../../content/src/lib/upload-targets"

const ROOT = join(__dirname, "..", "..", "..")
const ENVIRONMENTS = ["staging", "production"] as const

type Rule = { allowed: { origins: string[]; methods: string[]; headers: string[] }; maxAgeSeconds: number }

/** The `.mjs` script has no types, and its `vars` reader answers "whatever the
 * config said". Named here so the assertions read as the questions they are. */
const varsFor = (env: string): Record<string, string | undefined> =>
  contentVars(env, ROOT) as Record<string, string | undefined>

describe("R2 CORS is exactly the buckets the presign door can sign against", () => {
  it.each(ENVIRONMENTS)("%s: the rule set covers those buckets and no others", (env) => {
    const vars = varsFor(env)
    // The independent oracle: the bucket VARS the upload table names, resolved
    // through the same environment's config. Not the script's own list.
    const wanted = [...new Set(Object.values(UPLOAD_TARGETS).map((t) => vars[t.bucketVar]))].sort()
    expect(wanted.length, "the upload table must name at least one bucket var the config resolves").toBeGreaterThan(0)
    expect(wanted.every(Boolean), `an UPLOAD_TARGETS bucketVar is not in the content worker's ${env} vars`).toBe(true)
    expect((corsTargets(env, ROOT) as { buckets: string[] }).buckets).toEqual(wanted)
  })

  it.each(ENVIRONMENTS)("%s: the origin is the agency front door, and not the portal's", (env) => {
    const vars = varsFor(env)
    const { origin } = corsTargets(env, ROOT) as { origin: string }
    expect(origin).toBe(vars.PUBLIC_APP_URL)
    expect(origin.startsWith("https://"), "a signed PUT is made from an https page").toBe(true)
    // The portal's own origin, if this environment names one, must NOT be
    // allowed: `postPresignUpload` refuses a portal caller at the door, so an
    // allowance for that origin would be a permission for a request that can
    // never legitimately be made.
    const portal = vars.PUBLIC_PORTAL_URL
    if (portal) expect((corsRules(origin) as Rule[])[0].allowed.origins).not.toContain(portal)
  })
})

describe("the rule is as narrow as the thing it enables", () => {
  const rules = corsRules("https://example.test") as Rule[]

  it("is one rule, one origin, and never a wildcard", () => {
    expect(rules).toHaveLength(1)
    expect(rules[0].allowed.origins).toEqual(["https://example.test"])
    expect(rules[0].allowed.origins).not.toContain("*")
  })

  it("allows PUT and NOTHING that can read or remove an object", () => {
    // Objects are read back through `/media/*` on the gateway, which is where
    // the ownership proof and the edge cache live. A GET allowance here would
    // route around both, cross-origin, for anyone holding a key.
    expect(rules[0].allowed.methods).toEqual(["PUT"])
    for (const forbidden of ["GET", "HEAD", "POST", "DELETE"])
      expect(rules[0].allowed.methods, `${forbidden} is not part of a direct upload`).not.toContain(forbidden)
  })

  it("allows only the header the browser sets by hand and the signature covers", () => {
    // `Content-Length` is browser-owned — a page cannot set it, so it needs no
    // allowance — and `Content-Type` is the one the signature pins.
    expect(rules[0].allowed.headers).toEqual(["Content-Type"])
    expect(rules[0].maxAgeSeconds).toBe(CORS_MAX_AGE_SECONDS)
  })
})
