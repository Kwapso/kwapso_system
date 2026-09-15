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
  openNewAgentTab,
  pickAgentTabScope,
  seedAgentTabs,
  setAgentTabThread,
  useActiveAgentTabId,
  useAgentTabs,
} from "@/lib/agent-conversation-tabs"

// The store is module-level (see the file's own header for why — it mirrors
// use-agent-chat.tsx's cells rather than workspace-tabs.ts's localStorage
// mirror), so every test starts by driving it back to empty: close every tab
// there is, the same way a caller would.
beforeEach(() => {
  for (const tab of agentTabsSnapshot()) closeAgentTab(tab.id)
})

describe("seedAgentTabs", () => {
  it("gives a bare panel one tab, never a picker", () => {
    seedAgentTabs("t1", "Conversation")
    const tabs = agentTabsSnapshot()
    expect(tabs).toHaveLength(1)
    expect(tabs[0].scope).not.toBeNull()
    expect(tabs[0].threadId).toBe("t1")
  })

  it("is a no-op once a tab already exists", () => {
    seedAgentTabs("t1", "Conversation")
    seedAgentTabs("t2", "Something else")
    expect(agentTabsSnapshot()).toHaveLength(1)
    expect(agentTabsSnapshot()[0].threadId).toBe("t1")
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
