// BUILD-6/mcp-write-replies-2 — "tasks.done" ticks a task off through the same
// door create_task/update_task now use (the touched-row reply), and the ROW
// LEAVES the "open" list it used to be primed wholesale from. `mergePage`
// cannot express that — merging the touched row back in is exactly wrong the
// moment it stopped belonging — so the cache is spliced directly with
// `removeFromPage` and MUST NOT need a refetch to reflect it. This is the red-
// first regression test the fix was built for: before it, `primeCache` REPLACED
// the whole open-list cache with what the door now answers as a single row,
// which would have shown the tasks screen exactly one task.
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { primeCache, useCached } from "@shared/web/store"

const setTaskDone = vi.fn()

vi.mock("@/lib/api", async () => {
  const real = await vi.importActual<typeof import("@shared/web/api")>("@shared/web/api")
  return {
    ApiFailure: real.ApiFailure,
    content: { setTaskDone: (...args: unknown[]) => setTaskDone(...args) },
    tenancy: {},
  }
})
vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import { useScreenActions } from "@/lib/use-screen-actions"
import { tasksKey, totalKey } from "@/lib/live-resources"

const TEAM = "team-1"
const OPEN_KEY = tasksKey(TEAM, "open")

const TASKS = [
  { id: "task-a", title: "First" },
  { id: "task-b", title: "Second" },
  { id: "task-c", title: "Third" },
]

describe(`"tasks.done" leaves the open list without a refetch`, () => {
  const cleanupSubscribers: (() => void)[] = []

  beforeEach(() => {
    setTaskDone.mockReset()
    primeCache(OPEN_KEY, TASKS)
  })
  afterEach(() => {
    cleanupSubscribers.splice(0).forEach((fn) => fn())
  })

  it("ticking a task done removes it from the open cache in place", async () => {
    // A subscriber mounted BEFORE the action, exactly as the tasks screen
    // already showing the open list would be. `useCached` always revalidates
    // once on mount (stale-while-revalidate) even against a warm cache, so
    // that first call is let through and returns the same rows — then the spy
    // is cleared and made to THROW, so any call from here on (a refetch
    // `removeFromPage` should never trigger) fails the test loudly instead of
    // silently overwriting the spliced cache.
    const fetcher = vi.fn(async () => TASKS)
    const hook = renderHook(() => useCached(OPEN_KEY, fetcher))
    cleanupSubscribers.push(() => hook.unmount())
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    expect(hook.result.current.data).toEqual(TASKS)
    fetcher.mockReset()
    fetcher.mockImplementation(async () => {
      throw new Error("tasks.done must not trigger a refetch of the open list")
    })

    setTaskDone.mockResolvedValue({
      tasks: [{ id: "task-b", title: "Second", done: true }],
      openTotal: 2,
      allTotal: 3,
      id: "task-b",
    })

    const { result } = renderHook(() => useScreenActions(TEAM))
    await act(async () => {
      await result.current.runAction("tasks.done", { id: "task-b", done: "true" })
    })

    expect(setTaskDone).toHaveBeenCalledWith("task-b", true)
    await waitFor(() =>
      expect(hook.result.current.data).toEqual([
        { id: "task-a", title: "First" },
        { id: "task-c", title: "Third" },
      ])
    )
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("putting a task back rejoins the open cache by merge, not replace", async () => {
    // Start from the row already gone (as the previous test leaves it).
    primeCache(OPEN_KEY, [{ id: "task-a", title: "First" }, { id: "task-c", title: "Third" }])
    setTaskDone.mockResolvedValue({
      tasks: [{ id: "task-b", title: "Second", done: false }],
      openTotal: 3,
      allTotal: 3,
      id: "task-b",
    })

    const { result } = renderHook(() => useScreenActions(TEAM))
    await act(async () => {
      await result.current.runAction("tasks.done", { id: "task-b", done: "false" })
    })

    const { result: read } = renderHook(() => useCached(OPEN_KEY, async () => []))
    expect(read.current.data).toEqual([
      { id: "task-b", title: "Second", done: false },
      { id: "task-a", title: "First" },
      { id: "task-c", title: "Third" },
    ])
  })

  it("primes the open/all totals off the reply", async () => {
    setTaskDone.mockResolvedValue({ tasks: [{ id: "task-b" }], openTotal: 2, allTotal: 3, id: "task-b" })
    const { result } = renderHook(() => useScreenActions(TEAM))
    await act(async () => {
      await result.current.runAction("tasks.done", { id: "task-b", done: "true" })
    })
    const { result: openRead } = renderHook(() => useCached(totalKey("tasks", TEAM), async () => -1))
    const { result: allRead } = renderHook(() => useCached(totalKey("tasks-all", TEAM), async () => -1))
    expect(openRead.current.data).toBe(2)
    expect(allRead.current.data).toBe(3)
  })
})
