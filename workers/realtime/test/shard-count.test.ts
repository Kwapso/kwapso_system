// THE SHARD COUNT IS AN ARITHMETIC, AND THIS IS THE ARITHMETIC BEING CHECKED.
//
// `REALTIME_SHARDS` was `4` beside a comment that said four "clears the
// yardstick's 25,000 only once combined with subscription scoping" — which is a
// sentence admitting the number did not clear it on its own, leaning on a saving
// nobody had measured on a real tenant. Two hand-written numbers a paragraph
// apart cannot disagree loudly: neither is anything a build can read.
//
// So the count is now `ceil(peak ÷ watch line)`, and what this suite locks is
// the PROPERTY that division exists to guarantee: a team at the yardstick's peak
// concurrency fits under the watch line on every shard, with the headroom stated
// as a number rather than as a range in prose. Move the peak up, or the watch
// line down, and the count follows; pin the count by hand again and this goes
// red.
//
// It deliberately does NOT assert `=== 9`. That would re-introduce exactly the
// hand-picked constant the derivation replaced, one file over.

import { describe, expect, it } from "vitest"

import {
  REALTIME_PEAK_LISTENERS_PER_TEAM,
  REALTIME_SHARD_WATCH_SOCKETS,
  REALTIME_SHARDS,
  shardFor,
  teamShardName,
} from "@shared/workers/realtime"

describe("one team at the yardstick's peak fits under the watch line", () => {
  it("has enough shards that nobody is even warned at peak", () => {
    const watched = REALTIME_SHARDS * REALTIME_SHARD_WATCH_SOCKETS
    expect(
      watched,
      `${REALTIME_SHARDS} shards × ${REALTIME_SHARD_WATCH_SOCKETS} sockets = ${watched}, which is under the ` +
        `${REALTIME_PEAK_LISTENERS_PER_TEAM} this app is built for. A team at peak would cross the watch line ` +
        "on every shard at once, which is an alarm with nowhere to go rather than a measurement."
    ).toBeGreaterThanOrEqual(REALTIME_PEAK_LISTENERS_PER_TEAM)
  })

  it("is the SMALLEST count that does, so the publish fan-out is not paid for nothing", () => {
    // The other half of the trade: every extra shard is an extra object call on
    // every publish the interest registry cannot route away. One shard fewer
    // must fail the test above.
    const oneFewer = (REALTIME_SHARDS - 1) * REALTIME_SHARD_WATCH_SOCKETS
    expect(oneFewer).toBeLessThan(REALTIME_PEAK_LISTENERS_PER_TEAM)
  })

  it("records the headroom, so the number is not merely 'enough'", () => {
    const headroom = REALTIME_SHARDS * REALTIME_SHARD_WATCH_SOCKETS - REALTIME_PEAK_LISTENERS_PER_TEAM
    // 27,000 watched sockets against a 25,000 peak: 2,000 spare BEFORE the first
    // shard says a word, and the watch line is itself the LOW end of one
    // object's own range — so the real ceiling is well above this.
    expect(headroom).toBe(2_000)
  })

  it("the canary: the constants are real numbers and not zero", () => {
    // Without this, a peak of 0 or an undefined watch line would make every
    // assertion above vacuously true.
    expect(REALTIME_PEAK_LISTENERS_PER_TEAM).toBeGreaterThan(1_000)
    expect(REALTIME_SHARD_WATCH_SOCKETS).toBeGreaterThan(100)
    expect(Number.isInteger(REALTIME_SHARDS) && REALTIME_SHARDS > 1).toBe(true)
  })
})

describe("a wider fan-out is still a fan-out the rest of the app agrees about", () => {
  it("every listener lands on a real shard, and the same one every time", () => {
    const seen = new Set<number>()
    for (let i = 0; i < 5_000; i++) {
      const at = shardFor(`user-${i}`)
      expect(Number.isInteger(at) && at >= 0 && at < REALTIME_SHARDS).toBe(true)
      expect(shardFor(`user-${i}`), "a reconnect must return to the same object").toBe(at)
      seen.add(at)
    }
    // And it actually spreads: a hash that answered one shard would pass every
    // assertion above and undo the whole point of the split.
    expect(seen.size).toBe(REALTIME_SHARDS)
  })

  it("names the shards distinctly, so a wider count cannot collide", () => {
    const names = Array.from({ length: REALTIME_SHARDS }, (_, i) => teamShardName("01TEAM", i))
    expect(new Set(names).size).toBe(REALTIME_SHARDS)
    for (const n of names) expect(n.startsWith("team:01TEAM#")).toBe(true)
  })
})
