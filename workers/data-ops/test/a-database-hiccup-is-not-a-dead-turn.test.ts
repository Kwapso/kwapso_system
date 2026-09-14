// A DATABASE HICCUP IS NOT A DEAD TURN.
//
// 14 Sep 2026, 09:39:49 on staging: the owner's nine-part question was in its
// third segment, twenty-eight steps and every result saved, when the core
// database answered one credit call with
//
//     D1_ERROR: Internal error in D1 DB storage caused object to be reset; reference = h8l1…
//
// and the panel said "The assistant had trouble just now". Nothing was wrong
// with the question, the model, or the code around it — a storage object was
// reset for well under a second. The REST door had retried one wording of this
// since August; the native binding, which the credit path uses, retried none.
//
// This pins the signature against the three REAL wordings, refuses the ones
// that are our own fault, and proves the credit claim survives one blip.
import { describe, expect, it, vi } from "vitest"
import { consumeAiUnit } from "@shared/workers/credits"
import { D1_NATIVE_ATTEMPTS, isD1Transient, retryTransient } from "@shared/workers/d1-transient"

const TRANSIENT = [
  "internal error; reference = abc123",
  "D1_ERROR: internal error; reference = vf4c1",
  "D1_ERROR: Internal error in D1 DB storage caused object to be reset; reference = h8l1nat3u8985dmjd3lum8if",
  "Cloudflare D1 API failed: D1_ERROR: Internal error in D1 DB storage caused object to be reset; reference = x",
]
const OURS = [
  "D1_ERROR: no such column: can_edit at offset 29: SQLITE_ERROR",
  "D1_ERROR: no such table: agent_usage",
  "D1_ERROR: UNIQUE constraint failed: agent_usage.team_id, agent_usage.period",
  "cloud_key_rejected: the Cloudflare D1 token was refused",
]

describe("a database hiccup is not a dead turn", () => {
  it("the signature matches every wording D1 has used for 'ask again', and none of ours", () => {
    for (const m of TRANSIENT) expect(isD1Transient(new Error(m)), m).toBe(true)
    for (const m of OURS) expect(isD1Transient(new Error(m)), m).toBe(false)
  })

  it("retries a transient, succeeds on the next try, and re-throws anything else at once", async () => {
    vi.useFakeTimers()
    try {
      let calls = 0
      const p = retryTransient(async () => {
        calls++
        if (calls === 1) throw new Error(TRANSIENT[2]!)
        return "fine"
      })
      await vi.runAllTimersAsync()
      expect(await p).toBe("fine")
      expect(calls).toBe(2)

      let ours = 0
      await expect(
        retryTransient(async () => {
          ours++
          throw new Error(OURS[0]!)
        })
      ).rejects.toThrow(/no such column/)
      expect(ours, "our own mistake is never retried").toBe(1)

      let always = 0
      const gone = retryTransient(async () => {
        always++
        throw new Error(TRANSIENT[1]!)
      })
      // Attach the handler BEFORE the clock runs, or the rejection is unhandled.
      const settled = gone.then(
        () => "resolved",
        (e: Error) => e.message
      )
      await vi.runAllTimersAsync()
      expect(await settled).toMatch(/internal error; reference = vf4c1/)
      expect(always).toBe(D1_NATIVE_ATTEMPTS)
    } finally {
      vi.useRealTimers()
    }
  })

  it("the credit claim survives one blip — the turn keeps its step", async () => {
    vi.useFakeTimers()
    try {
      let runs = 0
      const stmt = {
        bind: () => stmt,
        run: async () => {
          runs++
          if (runs === 1) throw new Error(TRANSIENT[2]!)
          return { meta: { changes: 1 } }
        },
        first: async () => ({ used: 3, balance: 0 }),
      }
      const env = { DB: { prepare: () => stmt }, AGENT_FREE_DAILY: "2000" } as never
      const p = consumeAiUnit(env, "team1")
      await vi.runAllTimersAsync()
      const c = await p
      expect(c.ok).toBe(true)
      expect(c.source).toBe("free")
      expect(runs).toBe(2)
    } finally {
      vi.useRealTimers()
    }
  })
})
