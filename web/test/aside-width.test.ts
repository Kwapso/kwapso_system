// THE ASSISTANT COLUMN'S WIDTH — variation A "drag the seam", client ruling
// 16 Sep 2026, pinned. `web/lib/aside-width.ts` is `ScreenShell`'s
// `asideWidth`/`onAsideWidthChange` other half: a module store that clamps
// every value to [320, 520] and persists it PER PERSON in `localStorage` —
// see the file's own header for why the scoping departs from
// `web/lib/agent-open.ts`'s per-device flag. One store, re-scoped between
// tests exactly as `workspace-tabs.test.ts` re-scopes its own.

import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import {
  ASIDE_WIDTH_DEFAULT,
  ASIDE_WIDTH_MIN,
  ASIDE_WIDTH_MAX,
  setAsideWidth,
  setAsideWidthScope,
  useAsideWidth,
} from "@/lib/aside-width"

const ME = "user1"
const THEM = "user2"

beforeEach(() => {
  localStorage.clear()
  setAsideWidthScope(null)
})

describe("no scope — the uncontrolled default, nothing persisted", () => {
  it("reads ASIDE_WIDTH_DEFAULT (400) with no scope set", () => {
    const { result } = renderHook(() => useAsideWidth())
    expect(result.current).toBe(ASIDE_WIDTH_DEFAULT)
  })

  it("setAsideWidth still updates the live value even with no scope, but writes nothing to storage", () => {
    const { result } = renderHook(() => useAsideWidth())
    act(() => setAsideWidth(500))
    expect(result.current).toBe(500)
    expect(localStorage.length).toBe(0)
  })
})

describe("a scoped person — read, write, and the key it lands under", () => {
  it("setAsideWidthScope seeds the default the first time a person is seen", () => {
    const { result } = renderHook(() => useAsideWidth())
    act(() => setAsideWidthScope(ME))
    expect(result.current).toBe(ASIDE_WIDTH_DEFAULT)
  })

  it("setAsideWidth persists under a key naming the scoped person, not a flat key", () => {
    setAsideWidthScope(ME)
    act(() => setAsideWidth(320))
    expect(localStorage.getItem(`ss-aside-width:${ME}`)).toBe("320")
  })

  it("a width set for one person is not read back for another", () => {
    setAsideWidthScope(ME)
    act(() => setAsideWidth(520))
    setAsideWidthScope(THEM)
    const { result } = renderHook(() => useAsideWidth())
    expect(result.current).toBe(ASIDE_WIDTH_DEFAULT)
  })

  it("switching back to a person who already set one restores it — the whole point of per-person storage on a shared device", () => {
    setAsideWidthScope(ME)
    act(() => setAsideWidth(320))
    setAsideWidthScope(THEM)
    act(() => setAsideWidth(520))
    setAsideWidthScope(ME)
    const { result } = renderHook(() => useAsideWidth())
    expect(result.current).toBe(320)
  })

  it("setAsideWidthScope on the SAME id twice is a no-op — an effect re-running mid-drag must not throw away a live value", () => {
    setAsideWidthScope(ME)
    act(() => setAsideWidth(450))
    setAsideWidthScope(ME)
    const { result } = renderHook(() => useAsideWidth())
    expect(result.current).toBe(450)
  })
})

describe("clamping — every write and every read is bounded to [320, 520]", () => {
  it("setAsideWidth clamps a value under the floor", () => {
    setAsideWidthScope(ME)
    act(() => setAsideWidth(10))
    expect(localStorage.getItem(`ss-aside-width:${ME}`)).toBe(String(ASIDE_WIDTH_MIN))
  })

  it("setAsideWidth clamps a value over the ceiling", () => {
    setAsideWidthScope(ME)
    act(() => setAsideWidth(9999))
    expect(localStorage.getItem(`ss-aside-width:${ME}`)).toBe(String(ASIDE_WIDTH_MAX))
  })

  it("a hand-edited or corrupted stored value is read back clamped, never thrown", () => {
    localStorage.setItem(`ss-aside-width:${ME}`, "not-a-number")
    setAsideWidthScope(ME)
    const { result } = renderHook(() => useAsideWidth())
    expect(result.current).toBe(ASIDE_WIDTH_DEFAULT)
  })

  it("a stored value past the ceiling (an older, wider build) reads back clamped to today's max", () => {
    localStorage.setItem(`ss-aside-width:${ME}`, "900")
    setAsideWidthScope(ME)
    const { result } = renderHook(() => useAsideWidth())
    expect(result.current).toBe(ASIDE_WIDTH_MAX)
  })
})
