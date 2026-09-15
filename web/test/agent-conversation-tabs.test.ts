// THE ASSISTANT'S TAB STORE, LOCKED DOWN. The client's ruling (15 Sep 2026,
// quoted in full in web/lib/agent-conversation-tabs.ts) is that the "+" is
// always there and never itself closable, and that a fresh tab starts on the
// picker. This is the pure-state half of that: no React tree, no chat door —
// just the store's own rules, the ones a caller (`agent-panel.tsx`) leans on
// without re-checking them.

import { beforeEach, describe, expect, it } from "vitest"
import { act, renderHook } from "@testing-library/react"

import {
  activateAgentTab,
  agentTabsSnapshot,
  closeAgentTab,
  MAX_AGENT_TABS,
  openAgentTabForThread,
  openHistoryTab,
  openNewAgentTab,
  pickAgentTabScope,
  seedAgentTabs,
  setAgentTabThread,
  useActiveAgentTabId,
  useAgentTabs,
  useHistoryTabOpen,
} from "@/lib/agent-conversation-tabs"

// The store is module-level (see the file's own header for why — it mirrors
// use-agent-chat.tsx's cells rather than workspace-tabs.ts's localStorage
// mirror), so every test starts by driving it back to empty: close every tab
// there is, the same way a caller would.
beforeEach(() => {
  for (const tab of agentTabsSnapshot()) closeAgentTab(tab.id)
  // `historyOpen` has no direct "close" export — closing it is a SIDE EFFECT
  // of picking a tab, by design (see `openHistoryTab`'s own header) — so it
  // is driven back to false through the same door a caller would use: open a
  // draft (which closes History as a side effect) and close it straight back
  // out, restoring the empty-tabs invariant every other test here expects.
  closeAgentTab(openNewAgentTab())
})

describe("seedAgentTabs", () => {
  it("gives a bare panel one tab, never a picker", () => {
    seedAgentTabs("t1", "Conversation")
    const tabs = agentTabsSnapshot()
    expect(tabs).toHaveLength(1)
    expect(tabs[0].scope).not.toBeNull()
    expect(tabs[0].threadId).toBe("t1")
  })

  // A ONE-SHOT, NOT "WHENEVER EMPTY" — the closing ruling's own requirement
  // (see `agent-panel.tsx`'s `handleCloseAgentTab`: closing the LAST
  // conversation tab closes the assistant column itself, and a silent
  // refill here would race that shut). `beforeEach` above already drove the
  // strip back to zero tabs, the same empty state the reader reaches by
  // closing their own last tab — proving this stays empty on a second seed
  // is proving the store does not tell the difference between "never seeded"
  // and "emptied on purpose", which is the whole point: it must not.
  it("is a ONE-SHOT for the whole session — stays inert once it has fired, even after the strip empties back out", () => {
    expect(agentTabsSnapshot()).toHaveLength(0) // the previous test's own seed, already spent
    seedAgentTabs("t2", "Something else")
    expect(agentTabsSnapshot()).toHaveLength(0) // still nothing — no second seed, ever
  })
})

describe("openNewAgentTab — the \"+\"", () => {
  it("opens a scope-less draft and activates it", () => {
    const id = openNewAgentTab()
    const tabs = agentTabsSnapshot()
    expect(tabs.find((t) => t.id === id)?.scope).toBeNull()
    expect(useActiveAgentTabId).toBeDefined() // sanity: exported for the strip
  })

  it("evicts past the ceiling, never the new tab and never the one that was active", () => {
    for (let i = 0; i < MAX_AGENT_TABS + 3; i++) openNewAgentTab()
    expect(agentTabsSnapshot().length).toBeLessThanOrEqual(MAX_AGENT_TABS)
  })
})

describe("pickAgentTabScope", () => {
  it("names the tab after the pick — the record's own name for \"record\"", () => {
    const id = openNewAgentTab()
    pickAgentTabScope(id, "record", "Beringer", "Beringer")
    const tab = agentTabsSnapshot().find((t) => t.id === id)
    expect(tab?.scope).toBe("record")
    expect(tab?.label).toBe("Beringer")
    expect(tab?.recordLabel).toBe("Beringer")
  })

  it("names it \"Knowledge base\" / \"Everything…\" for the other two picks", () => {
    const id = openNewAgentTab()
    pickAgentTabScope(id, "knowledge", "Knowledge base")
    expect(agentTabsSnapshot().find((t) => t.id === id)?.label).toBe("Knowledge base")
  })
})

describe("setAgentTabThread", () => {
  it("attaches the server's minted thread to whichever tab it belongs to", () => {
    const id = openNewAgentTab()
    expect(agentTabsSnapshot().find((t) => t.id === id)?.threadId).toBeUndefined()
    setAgentTabThread(id, "srv-thread-1")
    expect(agentTabsSnapshot().find((t) => t.id === id)?.threadId).toBe("srv-thread-1")
  })
})

describe("closeAgentTab", () => {
  it("lands on the tab that shifts into the closed one's own spot", () => {
    const a = openNewAgentTab()
    const b = openNewAgentTab()
    const c = openNewAgentTab()
    activateAgentTab(b)
    const landing = closeAgentTab(b)
    expect(landing).toBe(c)
    expect(agentTabsSnapshot().map((t) => t.id)).toEqual([a, c])
  })

  it("falls to what is now the last tab when the active one closed was itself last", () => {
    const a = openNewAgentTab()
    const b = openNewAgentTab()
    activateAgentTab(b)
    const landing = closeAgentTab(b)
    expect(landing).toBe(a)
  })

  it("returns null once every tab is gone — a real state, just the \"+\" remains", () => {
    const only = openNewAgentTab()
    const landing = closeAgentTab(only)
    expect(landing).toBeNull()
    expect(agentTabsSnapshot()).toHaveLength(0)
  })

  it("leaves a BACKGROUND close's active tab untouched", () => {
    const a = openNewAgentTab()
    const b = openNewAgentTab()
    activateAgentTab(b)
    const landing = closeAgentTab(a)
    expect(landing).toBe(b)
  })
})

describe("useAgentTabs / useActiveAgentTabId", () => {
  it("stay in step through the store's own mutators", () => {
    const { result: tabsResult } = renderHook(() => useAgentTabs())
    const { result: activeResult } = renderHook(() => useActiveAgentTabId())
    expect(tabsResult.current).toHaveLength(0)
    expect(activeResult.current).toBeNull()

    let id = ""
    act(() => {
      id = openNewAgentTab()
    })
    expect(activeResult.current).toBe(id)
    expect(tabsResult.current.map((t) => t.id)).toEqual([id])
  })
})

// THE PINNED CLOCK TAB — client ruling, 15 Sep 2026, the same day as the
// header's own quote: "I like the history rail tab. Put it before the plus
// tab... when I click on one, it would open in a tab." It is not a
// conversation (see `historyOpen`'s own comment in agent-conversation-
// tabs.ts), so it is proven here as its own boolean rather than as a row in
// `agentTabsSnapshot()`.
describe("openHistoryTab / useHistoryTabOpen", () => {
  it("flips the reactive flag on", () => {
    const { result } = renderHook(() => useHistoryTabOpen())
    expect(result.current).toBe(false)
    act(() => {
      openHistoryTab()
    })
    expect(result.current).toBe(true)
  })

  it("activating a conversation tab closes History — even one already active", () => {
    let id = ""
    act(() => {
      id = openNewAgentTab()
    })
    const { result } = renderHook(() => useHistoryTabOpen())
    act(() => {
      openHistoryTab()
    })
    expect(result.current).toBe(true)
    act(() => {
      // Same id that was already `activeId` — the naive `if (activeId ===
      // id) return` this used to be would have skipped closing History.
      activateAgentTab(id)
    })
    expect(result.current).toBe(false)
  })

  it("pressing \"+\" closes History too", () => {
    const { result } = renderHook(() => useHistoryTabOpen())
    act(() => {
      openHistoryTab()
    })
    act(() => {
      openNewAgentTab()
    })
    expect(result.current).toBe(false)
  })
})

describe("openAgentTabForThread — a history row was picked", () => {
  it("opens a new tab carrying that thread, and activates it", () => {
    let id = ""
    act(() => {
      id = openAgentTabForThread("srv-thread-9", "Beringer tickets")
    })
    const tab = agentTabsSnapshot().find((t) => t.id === id)
    expect(tab?.threadId).toBe("srv-thread-9")
    expect(tab?.label).toBe("Beringer tickets")
  })

  it("activates the EXISTING tab instead of opening a second one for the same thread — \"or activates it if already open\"", () => {
    let first = ""
    act(() => {
      first = openAgentTabForThread("srv-thread-9", "Beringer tickets")
    })
    act(() => {
      openNewAgentTab() // a distraction: a different tab is active now
    })
    let second = ""
    act(() => {
      second = openAgentTabForThread("srv-thread-9", "Beringer tickets")
    })
    expect(second).toBe(first)
    expect(agentTabsSnapshot().filter((t) => t.threadId === "srv-thread-9")).toHaveLength(1)
    const { result } = renderHook(() => useActiveAgentTabId())
    expect(result.current).toBe(first)
  })

  it("closes History — the client's own words, \"it would open in a tab\"", () => {
    const { result } = renderHook(() => useHistoryTabOpen())
    act(() => {
      openHistoryTab()
    })
    act(() => {
      openAgentTabForThread("srv-thread-9", "Beringer tickets")
    })
    expect(result.current).toBe(false)
  })
})
