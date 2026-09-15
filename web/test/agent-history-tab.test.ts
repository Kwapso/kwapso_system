// THE HISTORY TAB'S GROUPING, LOCKED DOWN. V2 from the artifact
// (agent-history-tab.tsx's own header carries the client's ruling in full):
// four day-buckets — Today / Yesterday / Last week / Earlier — newest
// last-used first within each, never re-sorted by this pass. Pure functions,
// no React tree and no door: the same "prove the store's own rules" shape
// `agent-conversation-tabs.test.ts` already takes with its sibling
// (`historyOpen`, `openAgentTabForThread`).

import { describe, expect, it } from "vitest"

import { groupThreadsByLastUsed, historyDayBucket } from "@/components/assistant/agent-history-tab"
import type { AgentThread } from "@shared/types"

const NOW = new Date("2026-09-15T12:00:00.000Z")

function daysAgoISO(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString()
}

function thread(id: string, lastUsedDaysAgo: number, createdDaysAgo = lastUsedDaysAgo): AgentThread {
  return { id, title: id, lastMessageAt: daysAgoISO(lastUsedDaysAgo), createdAt: daysAgoISO(createdDaysAgo) }
}

describe("historyDayBucket", () => {
  it("today", () => {
    expect(historyDayBucket(daysAgoISO(0), NOW)).toBe("today")
  })

  it("yesterday", () => {
    expect(historyDayBucket(daysAgoISO(1), NOW)).toBe("yesterday")
  })

  it("4 days ago lands in last week", () => {
    expect(historyDayBucket(daysAgoISO(4), NOW)).toBe("week")
  })

  it("30 days ago lands in earlier", () => {
    expect(historyDayBucket(daysAgoISO(30), NOW)).toBe("earlier")
  })

  it("a moment in the future reads as today, the conservative side to be wrong on", () => {
    expect(historyDayBucket(new Date(NOW.getTime() + 3_600_000).toISOString(), NOW)).toBe("today")
  })
})

describe("groupThreadsByLastUsed", () => {
  it("lands a row from today, yesterday, 4 days ago and 30 days ago in the four groups", () => {
    const threads = [thread("t-today", 0), thread("t-yesterday", 1), thread("t-week", 4), thread("t-earlier", 30)]
    const groups = groupThreadsByLastUsed(threads, NOW)
    expect(groups.map((g) => g.bucket)).toEqual(["today", "yesterday", "week", "earlier"])
    expect(groups.map((g) => g.rows.map((r) => r.id))).toEqual([
      ["t-today"],
      ["t-yesterday"],
      ["t-week"],
      ["t-earlier"],
    ])
  })

  it("keeps the caller's own order within one group — newest last-used first, never re-sorted", () => {
    // Two threads in the SAME bucket ("today"), handed in an order that
    // would come out differently under alphabetical or id order — proving
    // this is a stable PARTITION of the input, not a second sort.
    const threads = [thread("z-newer", 0), thread("a-older-same-day", 0)]
    const groups = groupThreadsByLastUsed(threads, NOW)
    expect(groups).toHaveLength(1)
    expect(groups[0].bucket).toBe("today")
    expect(groups[0].rows.map((r) => r.id)).toEqual(["z-newer", "a-older-same-day"])
  })

  it("falls back to createdAt when a thread has never been messaged", () => {
    const threads: AgentThread[] = [{ id: "fresh", title: "Fresh", lastMessageAt: null, createdAt: daysAgoISO(1) }]
    const groups = groupThreadsByLastUsed(threads, NOW)
    expect(groups).toEqual([{ bucket: "yesterday", rows: threads }])
  })

  it("an empty list groups to nothing", () => {
    expect(groupThreadsByLastUsed([], NOW)).toEqual([])
  })
})
