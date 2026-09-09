// A TRANSCRIPT TRY THAT THROWS IS NOT A TRANSCRIPT THAT ISN'T THERE YET.
//
// The autopilot retries every un-captured meeting inside the horizon each tick.
// That is the right behaviour for "Google quietly has nothing yet" — the retry
// is free. It was also the behaviour for "Google refuses this meeting on every
// try", which is not free: twelve stuck meetings wrote ~550 identical
// google_refused rows into the error log in twelve hours, every fifteen
// minutes, with nothing that would ever stop them (round-one error_log review,
// 26 Aug 2026 — 199 of the 200 open error rows were this one storm).
//
// The mechanism is a per-meeting counter of THROWN tries only, and the sweep's
// own WHERE stops selecting a meeting past the cap. These assertions read the
// sweep's source because the selection predicate IS the invariant — the same
// style as the publish/gating seams.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  TRANSCRIPT_ATTEMPT_CAP,
  TRANSCRIPT_HORIZON_DAYS,
  TRANSCRIPT_SETTLE_HOURS,
} from "@shared/workers/limits"
import { TEAM_MIGRATIONS } from "../../tenancy/src/team-schema"

const SRC = readFileSync(join(__dirname, "..", "src", "lib", "google-autopilot.ts"), "utf8")

describe("a stuck transcript stops being retried", () => {
  it("the sweep's own SELECT refuses a meeting past the attempt cap", () => {
    const select = SRC.slice(SRC.indexOf("SELECT id FROM meetings"))
    expect(select).toContain("transcript_attempts < ${TRANSCRIPT_ATTEMPT_CAP}")
    // Beside, not instead of, the horizon — the two bounds answer different
    // questions ("too old to matter" vs "refused too often to keep asking").
    expect(select.slice(0, select.indexOf("LIMIT"))).toContain("starts_at >= ?")
  })

  it("only a THROWN try counts — the increment lives in the catch", () => {
    const at = SRC.indexOf("transcript_attempts = transcript_attempts + 1")
    expect(at, "the counter write is gone — the storm can come back").toBeGreaterThan(-1)
    // The increment sits inside the per-meeting catch (after the errors.push),
    // so a quiet not-captured result never spends an attempt.
    const before = SRC.slice(0, at)
    const lastCatch = before.lastIndexOf("catch (e)")
    const lastPush = before.lastIndexOf("errors.push({ userId, where: `transcript")
    expect(lastCatch, "the increment must live in the transcript catch").toBeGreaterThan(-1)
    expect(lastPush, "…after the failure is recorded (R12)").toBeGreaterThan(lastCatch)
  })

  // ── AND THE OTHER HALF OF THE SAME PREDICATE ─────────────────────────────
  //
  // `transcript_captured_at IS NULL` used to be the whole of "does this meeting
  // still want looking at", which made the FIRST read final. Google writes a
  // notes document while the call is running, so a meeting read two minutes in
  // was frozen at two minutes and dropped from the queue forever (measured on
  // the owner's own 2026-09-07 `⏩ Week planning`: 1,179 characters stored
  // against 73,138 in the finished document). The selection predicate is where
  // that was decided, so it is where it is asserted.
  it("a captured meeting is offered again while its document may still be growing", () => {
    const select = SRC.slice(SRC.indexOf("SELECT id FROM meetings"))
    const where = select.slice(0, select.indexOf("LIMIT"))
    expect(
      where,
      "a captured meeting inside the settle window must still be selected"
    ).toContain("transcript_captured_at IS NULL OR starts_at >= ?")
    // The window hangs off the MEETING'S OWN START, not off the capture: it is
    // the call that decides when its document stops changing, and a window
    // measured from the capture would slide forward every time we looked.
    expect(SRC, "the window is a named bound, not a number typed here").toContain(
      "TRANSCRIPT_SETTLE_HOURS * 3_600_000"
    )
    // Both bounds still stand beside it — they answer different questions, and a
    // re-read that escaped the attempt cap would never stop asking.
    expect(where).toContain("transcript_attempts < ${TRANSCRIPT_ATTEMPT_CAP}")
    expect(where).toContain("starts_at <= ?")
  })

  it("the settle window is long enough for a meeting and short enough to drain", () => {
    // Past the longest call this app has seen (one hour) plus the minutes Google
    // takes to finish writing; well short of the horizon, so last week's
    // meetings are never selected twice.
    expect(TRANSCRIPT_SETTLE_HOURS).toBeGreaterThanOrEqual(2)
    expect(TRANSCRIPT_SETTLE_HOURS).toBeLessThan(TRANSCRIPT_HORIZON_DAYS * 24)
  })

  it("the column ships as a migration and the cap is a real bound", () => {
    const m = TEAM_MIGRATIONS.find((x) => x.version === "0055_transcript_gives_up")
    expect(m, "migration 0055_transcript_gives_up is missing").toBeTruthy()
    expect(m!.sql).toContain("ALTER TABLE meetings ADD COLUMN transcript_attempts")
    // Eight is two hours of fifteen-minute refusals; zero or a huge value would
    // each quietly disable one half of the design.
    expect(TRANSCRIPT_ATTEMPT_CAP).toBeGreaterThanOrEqual(2)
    expect(TRANSCRIPT_ATTEMPT_CAP).toBeLessThanOrEqual(96)
  })
})
