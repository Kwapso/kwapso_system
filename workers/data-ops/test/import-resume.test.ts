// AN IMPORT THAT DIED CAN BE PICKED UP — and picking it up must not become a
// second way to run it twice.
//
// `import-idempotency.test.ts` beside this one locks the claim that makes a
// FIRST run safe: planned → running, atomically, before a single row is
// written. This locks the second way in, which is the one that could undo it.
// The two failures are opposite and both real:
//
//   • NO RESUME (what shipped until 6 Sep 2026): a run that died left its rows
//     written, its batch stuck on `running` for ever, and the only way forward
//     was to send the file again — which writes every finished row a SECOND
//     time. Up to 8,000 duplicate rows, from a job that is minutes long with a
//     person and a browser at the other end.
//   • A CARELESS RESUME: a second door that flips the batch back to runnable,
//     or restarts from the top, or lets two callers continue at once. Each of
//     those is the duplicate-row bug the one-way claim exists to prevent,
//     arriving through the door built to fix it.
//
// Source-scan, in the register of its sibling: the run loop needs a live team
// database and a reachable gated door, so what can be locked here is the SHAPE
// — and the shape is where every one of the failures above would show.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const src = readFileSync(join(__dirname, "..", "src", "lib", "import-batch.ts"), "utf8")
const routes = readFileSync(join(__dirname, "..", "src", "routes", "import.ts"), "utf8")
const confirmBody = (() => {
  const start = src.indexOf("export async function confirmBatch")
  const next = src.indexOf("\nexport ", start + 1)
  return src.slice(start, next === -1 ? undefined : next)
})()

describe("a resumed import has exactly one winner", () => {
  it("claims on the updated_at it just read, so two Continues cannot both proceed", () => {
    // The `planned` claim protects a first run because only one caller can move
    // a row out of `planned`. A resume starts from `running`, which every
    // concurrent caller also sees — so the claim needs a value that CHANGES on
    // each leg. `updated_at` is that value, and the cursor writer moves it.
    expect(/overall_status = 'running'[\s\S]{0,200}AND updated_at IS/.test(confirmBody)).toBe(true)
    const claimAt = confirmBody.indexOf("AND updated_at IS")
    const writeAt = confirmBody.indexOf("writeRow(")
    expect(claimAt, "the resume claim must exist").toBeGreaterThan(-1)
    expect(writeAt, "and must come before any row is written").toBeGreaterThan(claimAt)
  })

  it("only resumes a run that actually reached a checkpoint", () => {
    // No cursor means no honest place to carry on from, and "carry on from the
    // top" is the duplicate-row bug wearing the resume's clothes.
    // `\s*` at every gap. Written with its single spaces, this law asserted the
    // LAYOUT of a boolean expression: Prettier breaks a long `&&` chain onto
    // its own line as a matter of course, and a third condition added to it
    // guarantees the break — at which point a law about not resuming from the
    // top of the file would go red over a wrap. The two conditions, in order,
    // are the assertion; drop `cursor !== null` and it still goes red.
    expect(
      /const\s+resuming\s*=\s*b\.overall_status\s*===\s*"running"\s*&&\s*cursor\s*!==\s*null/.test(
        confirmBody
      )
    ).toBe(true)
    expect(/nothing_to_continue/.test(routes)).toBe(true)
  })

  it("never flips a batch back to a runnable status", () => {
    // The one-way claim is the whole protection. A resume that reset the status
    // to 'planned' would make the first-run claim winnable twice.
    // ASSIGNMENT, not the WHERE. The first-run claim legitimately READS
    // `overall_status = 'planned'` in its condition; what must never appear is
    // a SET that writes it back.
    expect(/SET\s+overall_status = 'planned'/.test(confirmBody)).toBe(false)
    expect(/overall_status = 'planned'\s*,\s*updated_at/.test(confirmBody)).toBe(false)
  })
})

describe("the checkpoint is written where a resume can trust it", () => {
  it("advances after the wave has SETTLED, not inside the row callback", () => {
    // A cursor written from twelve concurrent callbacks is a cursor nobody can
    // reason about — the same reason the tally is folded after the wave.
    const foldAt = confirmBody.indexOf("for (const r of results)")
    const cursorAt = confirmBody.indexOf("writeCursor(")
    expect(foldAt).toBeGreaterThan(-1)
    expect(cursorAt, "the checkpoint must come after the fold").toBeGreaterThan(foldAt)
    // …and INSIDE the row loop, so what a dead run loses is one wave and not one
    // whole table.
    const waveLoopAt = confirmBody.indexOf("for (let i = startAt;")
    // lastIndexOf: the finished-target SKIP near the top of the function reads
    // `idParents` too, and the anchor wanted here is the one that closes the
    // target loop — the later of the two.
    const targetLoopEnd = confirmBody.lastIndexOf("if (idParents.has(targetKey))")
    expect(waveLoopAt).toBeGreaterThan(-1)
    expect(cursorAt).toBeGreaterThan(waveLoopAt)
    expect(cursorAt, "per wave, not per target").toBeLessThan(targetLoopEnd)
  })

  it("skips targets the earlier leg finished, off the report it carried", () => {
    expect(/const finished = new Set\(report\.perTarget\.map/.test(confirmBody)).toBe(true)
    expect(/if \(finished\.has\(targetKey\)\)/.test(confirmBody)).toBe(true)
    // A finished target's id map is still needed by later targets, and it is
    // RE-READ rather than carried in the cursor — a stored map can go stale.
    expect(/finished\.has\(targetKey\)[\s\S]{0,300}buildResolvedMap/.test(confirmBody)).toBe(true)
  })

  it("starts the interrupted target at its checkpoint, not at zero", () => {
    expect(/cursor && cursor\.targetKey === targetKey \? cursor\.rowsDone : 0/.test(confirmBody)).toBe(true)
    expect(/for \(let i = startAt;/.test(confirmBody)).toBe(true)
  })

  it("says on the report where it resumed, because the boundary can cost rows", () => {
    // The cursor advances per settled wave, so a run that died mid-wave is
    // picked up at that wave's start and up to `wavefront - 1` rows can be
    // written twice. That is the honest ceiling and a person is told it.
    expect(/Resumed here\./.test(confirmBody)).toBe(true)
    expect(/may have been imported twice/.test(confirmBody)).toBe(true)
  })

  it("clears the cursor in the same statement that completes the batch", () => {
    // `complete` with a cursor still on the row is an invitation to run it again.
    expect(/cursor_json = NULL[^;]*overall_status = 'complete'/.test(confirmBody)).toBe(true)
  })
})

describe("the continue door is the confirm door's equal", () => {
  it("gates, refuses a client login, and publishes exactly as confirm does", () => {
    const body = (() => {
      const start = routes.indexOf("export async function postBatchContinue")
      const next = routes.indexOf("\nexport ", start + 1)
      return routes.slice(start, next === -1 ? undefined : next)
    })()
    expect(body, "the door must exist").toBeTruthy()
    expect(/refusePortalCaller/.test(body), "R21").toBe(true)
    expect(/requireText\(body\.batchId/.test(body), "R20").toBe(true)
    expect(/requireRight\(cfg, guard, m, "create"\)/.test(body), "R10, per module").toBe(true)
    expect(/publishChange\(env, guard\.teamId, m\)/.test(body), "R1").toBe(true)
  })
})
