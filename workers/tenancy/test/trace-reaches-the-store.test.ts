// THE TWO BEST-EFFORT HOPS THAT WROTE THEIR FAILURES UNDER A NAME NOBODY GAVE.
//
// `publishChange` and `sendBrandedEmail` both learned to record a swallowed
// failure in `error_logs` — which was the right fix and left one thing out. The
// row went in with NO `requestId`, so `logError` minted a fresh ULID for it, and
// the live-layer ping that did not go out and the email that did not send could
// not be joined to the click that triggered them. `db/core/0020` exists exactly
// so that one failing click is one query; these were the two seams it could not
// reach.
//
// WHY IT RIDES `env` AND NOT THE SIGNATURE. There are 186 `publishChange` call
// sites and four `sendBrandedEmail` ones, and neither takes a `Request`. A new
// parameter would be 190 chances to forget it; widening the TYPE reaches all of
// them without one call site changing — the same argument `DB` and `DEFER`
// already make in `RealtimeEnv`, and the memory `per-request-state-rides-cfg-or-env`.
//
// FOUR THINGS HAVE TO HOLD, and the last one is the one that makes the other
// three worth anything:
//   1. the id reaches the durable ROW (`error_logs.request_id`);
//   2. the id reaches the WIRE, so the worker on the other end joins too;
//   3. an env WITHOUT it behaves exactly as it did before — a cron, a lib called
//      directly, a test — because a seam that needs a new field is a seam that
//      breaks a hundred old callers;
//   4. every dispatcher actually SETS it. Without this the three above are a
//      seam nobody feeds: `env.TRACE` is `undefined` in production, every row
//      goes back to a fresh ULID, and all three tests pass.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"

import { sendBrandedEmail } from "@shared/workers/notify"
import { publishChange } from "@shared/workers/realtime"

const ROOT = join(__dirname, "..", "..", "..")

/** The bind arguments `logError`'s INSERT takes, in order — the row as the
 * database receives it. `request_id` is the tenth (index 9); it is read
 * positionally rather than by name because the statement is positional, which is
 * also why the source column (index 2) is asserted beside it as a canary: a
 * shifted argument list would otherwise read as a missing id. */
function store() {
  const rows: { source: string; message: string; requestId: unknown }[] = []
  return {
    rows,
    DB: {
      prepare: () => ({
        bind: (...a: unknown[]) => ({
          run: async () => {
            rows.push({ source: String(a[2]), message: String(a[4]), requestId: a[9] })
            return { meta: { changes: 1 } }
          },
        }),
      }),
    },
  }
}

/** A binding that always refuses, recording what it was handed. Failure is the
 * only path on which either seam writes a row at all. */
function refusing() {
  const calls: { url: string; init: { headers?: Record<string, string> } }[] = []
  return {
    calls,
    fetch: async (url: string, init: { headers?: Record<string, string> }) => {
      calls.push({ url, init })
      return new Response("no", { status: 500 })
    },
  }
}

describe("publishChange records its failure under THIS request's name", () => {
  it("puts the request id in the error row", async () => {
    const s = store()
    const rt = refusing()
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {})
    await publishChange({ REALTIME: rt, DB: s.DB, TRACE: "req-abc" } as never, "team1", "help", "h1", "edit")
    quiet.mockRestore()
    expect(s.rows.length, "a failed ping still leaves a durable row").toBe(1)
    expect(s.rows[0].source, "the positional read is still pointing at the right columns").toBe("realtime-publish")
    expect(s.rows[0].requestId).toBe("req-abc")
  })

  it("and on the console line, so the tail and the store filter alike", async () => {
    const s = store()
    const rt = refusing()
    const said: unknown[][] = []
    const quiet = vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => void said.push(a))
    await publishChange({ REALTIME: rt, DB: s.DB, TRACE: "req-abc" } as never, "team1", "help", "h1", "edit")
    quiet.mockRestore()
    expect(said.flat(), "the live tail and error_logs are one store only if one key filters both").toContain("req-abc")
  })

  it("puts the same name on the wire, so realtime's own rows join", async () => {
    const s = store()
    const rt = refusing()
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {})
    await publishChange({ REALTIME: rt, DB: s.DB, TRACE: "req-abc" } as never, "team1", "help", "h1", "edit")
    quiet.mockRestore()
    expect(rt.calls[0].init.headers?.["x-request-id"]).toBe("req-abc")
  })

  it("without one, behaves exactly as before — the row still lands, unnamed", async () => {
    const s = store()
    const rt = refusing()
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {})
    await publishChange({ REALTIME: rt, DB: s.DB } as never, "team1", "help", "h1", "edit")
    quiet.mockRestore()
    expect(s.rows.length, "a caller with no TRACE must not lose its record").toBe(1)
    expect(s.rows[0].requestId).toBeNull()
    expect(rt.calls[0].init.headers?.["x-request-id"], "and sends no empty header").toBeUndefined()
  })
})

describe("sendBrandedEmail records its failure under THIS request's name", () => {
  const content = { heading: "h", intro: "i" }

  it("puts the request id in the error row", async () => {
    const s = store()
    const auth = refusing()
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {})
    const ok = await sendBrandedEmail({ AUTH: auth, DB: s.DB, TRACE: "req-xyz" } as never, "a@b.c", "Subj", content)
    quiet.mockRestore()
    expect(ok, "the fixture must be on the failure path").toBe(false)
    expect(s.rows.length).toBe(1)
    expect(s.rows[0].source).toBe("email-send")
    expect(s.rows[0].requestId).toBe("req-xyz")
  })

  it("and on the console line, so the tail and the store filter alike", async () => {
    const s = store()
    const auth = refusing()
    const said: unknown[][] = []
    const quiet = vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => void said.push(a))
    await sendBrandedEmail({ AUTH: auth, DB: s.DB, TRACE: "req-xyz" } as never, "a@b.c", "Subj", content)
    quiet.mockRestore()
    expect(said.flat()).toContain("req-xyz")
  })

  it("puts the same name on the wire, so auth's own rows join", async () => {
    const s = store()
    const auth = refusing()
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {})
    await sendBrandedEmail({ AUTH: auth, DB: s.DB, TRACE: "req-xyz" } as never, "a@b.c", "Subj", content)
    quiet.mockRestore()
    expect(auth.calls[0].init.headers?.["x-request-id"]).toBe("req-xyz")
  })

  it("without one, behaves exactly as before", async () => {
    const s = store()
    const auth = refusing()
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {})
    await sendBrandedEmail({ AUTH: auth, DB: s.DB } as never, "a@b.c", "Subj", content)
    quiet.mockRestore()
    expect(s.rows.length).toBe(1)
    expect(s.rows[0].requestId).toBeNull()
    expect(auth.calls[0].init.headers?.["x-request-id"]).toBeUndefined()
  })
})

// ── AND THE HALF THAT MAKES THE OTHER SIX WORTH ANYTHING ─────────────────────
//
// Everything above proves the seams USE `env.TRACE`. Nothing above proves
// anybody ever puts one there — and a seam nobody feeds is `undefined` in
// production with a green suite over it. That is the same shape as
// `deferrerFor`'s silent-drop hole (`deferred-side-work.test.ts`) and the same
// answer: census the dispatchers off the DISK.
//
// DERIVED, never listed: the census is every per-request shallow copy of `env`
// in a worker's own `index.ts` — the expression the four publishing workers
// already build for `DEFER`. A fifth worker that starts publishing builds one
// too, and is judged the day it does.
describe("every dispatcher hands its handler THIS request's name", () => {
  /** The `{ ...env, … }` expression each worker's dispatcher passes to its
   * handler, found by its `DEFER: deferrerFor(request)` — the field that makes
   * it a per-request copy rather than any other object literal. */
  function perRequestEnvCopies(): { worker: string; expr: string }[] {
    const out: { worker: string; expr: string }[] = []
    for (const worker of ["auth", "tenancy", "content", "data-ops", "mcp", "realtime"]) {
      const path = join(ROOT, "workers", worker, "src", "index.ts")
      let src: string
      try {
        src = readFileSync(path, "utf8")
      } catch {
        continue
      }
      for (const m of src.matchAll(/\{\s*\.\.\.env,[^{}]*\}/g)) {
        if (m[0].includes("DEFER: deferrerFor(request)")) out.push({ worker, expr: m[0] })
      }
    }
    return out
  }

  it("the census can still see them — it cannot go quiet", () => {
    // The four workers that publish or mail: auth, tenancy, content, data-ops.
    // If this collapses, every expectation below is vacuous.
    const found = perRequestEnvCopies()
    expect(
      [...new Set(found.map((f) => f.worker))].sort(),
      "the per-request env copies moved or changed shape — re-point this census, do not lower it"
    ).toEqual(["auth", "content", "data-ops", "tenancy"])
  })

  // AND THE UNATTENDED HALF. A cron has no request, so no dispatcher builds it a
  // copy — the tick builds its own, carrying `tickId` instead of a request id
  // (error-log.ts: "a tick carries an id that SAYS it is a tick"). Two crons
  // publish or mail: content's knowledge sweep and tenancy's nightly. Without
  // this the seams above are fed on a click and starved on a schedule, which is
  // precisely where nobody is watching.
  it("and so does every cron that publishes or mails", () => {
    const missing: string[] = []
    let found = 0
    for (const worker of ["content", "tenancy"]) {
      const src = readFileSync(join(ROOT, "workers", worker, "src", "index.ts"), "utf8")
      // The tick id this worker mints, and the copy that should carry it.
      if (!/const tick = tickId\(/.test(src)) {
        missing.push(`${worker}: no tickId — did the cron move? re-point this census`)
        continue
      }
      found++
      if (!/\{\s*\.\.\.env,\s*TRACE: tick\s*\}/.test(src))
        missing.push(`${worker}: mints a tick id but never puts it on an env for the seams to read`)
    }
    expect(found, "the census found no crons at all — it cannot go quiet").toBe(2)
    expect(missing, missing.join("\n")).toEqual([])
  })

  it("each of them sets TRACE off the request's own header", () => {
    const missing = perRequestEnvCopies()
      .filter((f) => !/TRACE:\s*requestId\(request\)/.test(f.expr))
      .map((f) => `${f.worker}: ${f.expr}`)
    expect(
      missing,
      "a dispatcher that copies env for the request but does not name the request leaves " +
        "publishChange and sendBrandedEmail writing their failures under a fresh ULID:\n" +
        missing.join("\n")
    ).toEqual([])
  })
})
