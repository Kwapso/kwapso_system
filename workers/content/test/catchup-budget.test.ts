// BUILD-5 §G1 (16 Sep 2026) — A PERSON ASKING A QUESTION MUST NEVER WAIT FOR
// THE SWEEP.
//
// Measured against a base still deep in the rebuild's backlog (BUILD-5 §C): a
// single retrieval-only question took 95 SECONDS, because `getKnowledgeAsk`
// awaited `catchUp` in full before answering, and `catchUp` sweeps up to
// CATCH_UP_PER_KIND rows across EVERY kind synchronously. Freshness is the
// cron's job every fifteen minutes; the owner chose accuracy over speed, but
// 95 seconds is unusable, and an answer from a base one tick stale is still
// accurate and cited.
//
// `catchUpWithBudget` is the fix: race the real catch-up against a small time
// budget, answer with whatever is already there once the budget is spent, and
// — the part a bare timeout would get wrong — never ABANDON the work. It
// keeps running after the response, handed to `afterResponse` (the same
// waitUntil seam every other best-effort errand in this worker uses), so the
// cursors still advance for the next question exactly as a cron tick would.
//
// `run` is injected (defaults to the real `catchUp`) so this suite proves the
// race/defer behaviour in isolation from the sweep engine itself, which
// knowledge-catchup-records.test.ts already covers on its own terms — a
// same-module mock of `catchUp` could not intercept catchUpWithBudget's own
// internal call to it anyway (ESM bindings, not a seam).

import { beforeEach, describe, expect, it, vi } from "vitest"

const { afterResponse } = vi.hoisted(() => ({ afterResponse: vi.fn() }))
vi.mock("@shared/workers/parallel", () => ({ afterResponse }))

vi.useFakeTimers()

import { catchUpWithBudget, CATCHUP_BUDGET_MS } from "../src/lib/knowledge-ingest"

const request = new Request("https://example.test/api/content/knowledge/ask?q=hi")
const env = {} as never
const cfg = {} as never
const guard = { databaseId: "db", teamId: "t", userId: "u" } as never

describe("catchUpWithBudget — a person's question never waits for the sweep", () => {
  beforeEach(() => {
    afterResponse.mockClear()
  })

  it("has a real, small default budget — a couple of seconds, not a minute", () => {
    expect(CATCHUP_BUDGET_MS).toBeGreaterThan(0)
    expect(CATCHUP_BUDGET_MS).toBeLessThanOrEqual(5_000)
  })

  it("resolves as soon as a FAST catch-up finishes, well under the budget", async () => {
    let resolveWork: (n: number) => void = () => {}
    const work = new Promise<number>((resolve) => { resolveWork = resolve })

    const p = catchUpWithBudget(request, env, cfg, guard, { budgetMs: 2_000, run: () => work })
    resolveWork(3) // the sweep finishes almost instantly — the ordinary, steady-state case
    await vi.advanceTimersByTimeAsync(0)
    await expect(p).resolves.toBeUndefined()

    // The (already-settled) work is still handed to afterResponse — cheap and
    // correct either way, and it is what makes "was the background seam used
    // at all" provable without racing on wall-clock time.
    expect(afterResponse).toHaveBeenCalledTimes(1)
    expect(afterResponse.mock.calls[0][0]).toBe(request)
  })

  it("gives up waiting at the budget when catch-up is SLOW, and answers anyway", async () => {
    let resolveWork: (n: number) => void = () => {}
    const work = new Promise<number>((resolve) => { resolveWork = resolve })

    const p = catchUpWithBudget(request, env, cfg, guard, { budgetMs: 2_000, run: () => work })

    // Just under the budget: still waiting.
    await vi.advanceTimersByTimeAsync(1_900)
    let settled = false
    p.then(() => { settled = true })
    await Promise.resolve()
    expect(settled).toBe(false)

    // Past the budget: the door proceeds without the sweep finishing.
    await vi.advanceTimersByTimeAsync(200)
    await expect(p).resolves.toBeUndefined()

    // The still-pending work was NOT abandoned — it was handed off to run in
    // the background, which is the whole difference between a budget and a
    // bare "give up" that loses the cursor advance.
    expect(afterResponse).toHaveBeenCalledTimes(1)
    expect(afterResponse.mock.calls[0][1]).toBe(work)

    // Finishing the real work later must not throw unhandled — the caller
    // (afterResponse, mocked here) owns it now.
    resolveWork(9)
    await vi.runAllTimersAsync()
  })

  it("never waits longer than the budget even if catch-up never resolves at all", async () => {
    const work = new Promise<number>(() => {}) // never settles — a genuinely stuck lane

    const p = catchUpWithBudget(request, env, cfg, guard, { budgetMs: 2_000, run: () => work })
    await vi.advanceTimersByTimeAsync(2_000)
    await expect(p).resolves.toBeUndefined()
    expect(afterResponse).toHaveBeenCalledTimes(1)
  })

  it("defaults to CATCHUP_BUDGET_MS when no budget is given", async () => {
    let resolveWork: (n: number) => void = () => {}
    const work = new Promise<number>((resolve) => { resolveWork = resolve })

    const p = catchUpWithBudget(request, env, cfg, guard, { run: () => work })
    await vi.advanceTimersByTimeAsync(CATCHUP_BUDGET_MS - 100)
    let settled = false
    p.then(() => { settled = true })
    await Promise.resolve()
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(200)
    await expect(p).resolves.toBeUndefined()
    resolveWork(1)
  })
})
