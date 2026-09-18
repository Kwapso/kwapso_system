// THE ASSISTANT'S TAB STORE, LOCKED DOWN. The client's ruling (15 Sep 2026,
// quoted in full in web/lib/agent-conversation-tabs.ts) is that the "+" is
// always there and never itself closable, and that a fresh tab starts on the
// picker. This is the pure-state half of that: no React tree, no chat door —
// just the store's own rules, the ones a caller (`agent-panel.tsx`) leans on
// without re-checking them.

import { beforeEach, describe, expect, it } from "vitest"
import { act, renderHook } from "@testing-library/react"

import {
  __unsafeAppendUnusedAgentTabForTest,
  activateAgentTab,
  agentTabsSnapshot,
  closeAgentTab,
  isUnusedAgentTab,
  MAX_AGENT_TABS,
  openAgentTabForThread,
  openHistoryTab,
  openNewAgentTab,
  pickAgentTabScope,
  pruneUnusedAgentTabsOnBoot,
  renameAgentTab,
  reorderAgentTab,
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
    // `openAgentTabForThread` is the eviction proof now, not a bare "+" loop:
    // each call here carries its OWN `threadId`, so every tab is immediately
    // USED (never a zero-turn draft) and the 17 Sep 2026 "unused" ruling
    // below — "+" reusing an already-open draft instead of minting a new one
    // — cannot fold the loop down to one tab before the ceiling is even
    // reached. `pushTab` is the one function both callers share, so this
    // still proves the eviction rule itself.
    for (let i = 0; i < MAX_AGENT_TABS + 3; i++) openAgentTabForThread(`t-evict-${i}`, `Thread ${i}`)
    expect(agentTabsSnapshot().length).toBeLessThanOrEqual(MAX_AGENT_TABS)
  })
})

// THE "UNUSED" RULING, 17 Sep 2026, verbatim in agent-conversation-tabs.ts's
// own header: "when I have a new chat open and I create another new one, if
// this new one is still unused, just open the already existing one. What I
// want to avoid is having 10 new unused sessions." ZERO TURNS is the
// definition this store uses (`isUnusedAgentTab`): no `threadId`, because the
// server only mints one once a message is actually sent — so this is true for
// a bare picker draft, a scoped-but-unsent draft, and (implicitly, since this
// store never sees composer text at all) a typed-but-unsent draft too.
describe("isUnusedAgentTab — zero turns, read off the thread model", () => {
  it("a bare \"+\" draft (no scope picked) is unused", () => {
    const id = openNewAgentTab()
    const tab = agentTabsSnapshot().find((t) => t.id === id)!
    expect(isUnusedAgentTab(tab)).toBe(true)
  })

  it("a draft with a scope picked but nothing sent is STILL unused", () => {
    const id = openNewAgentTab()
    pickAgentTabScope(id, "everything")
    const tab = agentTabsSnapshot().find((t) => t.id === id)!
    expect(tab.scope).not.toBeNull() // sanity: the pick did land
    expect(isUnusedAgentTab(tab)).toBe(true)
  })

  it("a tab is used the instant the server mints a thread for it", () => {
    const id = openNewAgentTab()
    setAgentTabThread(id, "srv-thread-used")
    const tab = agentTabsSnapshot().find((t) => t.id === id)!
    expect(isUnusedAgentTab(tab)).toBe(false)
  })

  it("a history-resumed tab always arrives used — it already has a real thread", () => {
    const id = openAgentTabForThread("srv-thread-history", "Past chat")
    const tab = agentTabsSnapshot().find((t) => t.id === id)!
    expect(isUnusedAgentTab(tab)).toBe(false)
  })
})

describe("openNewAgentTab reuses an existing unused tab instead of doubling it", () => {
  it("\"+\" twice in a row yields exactly one tab", () => {
    const first = openNewAgentTab()
    const second = openNewAgentTab()
    expect(second).toBe(first)
    expect(agentTabsSnapshot()).toHaveLength(1)
  })

  it("\"+\" after sending a message (the tab now has a thread) opens a real second tab", () => {
    const first = openNewAgentTab()
    setAgentTabThread(first, "srv-thread-sent")
    const second = openNewAgentTab()
    expect(second).not.toBe(first)
    expect(agentTabsSnapshot().map((t) => t.id)).toEqual([first, second])
  })

  it("reuses the NEWEST unused tab, even if it isn't the one currently active", () => {
    const first = openNewAgentTab()
    setAgentTabThread(first, "srv-thread-used-1") // used — no longer a candidate
    const second = openNewAgentTab() // the newest unused tab
    activateAgentTab(first) // look away from it without touching it
    const third = openNewAgentTab()
    expect(third).toBe(second)
    expect(agentTabsSnapshot().map((t) => t.id)).toEqual([first, second])
  })

  it("a draft with a scope already picked still counts as unused and is reused, not replaced", () => {
    const id = openNewAgentTab()
    pickAgentTabScope(id, "knowledge")
    const reused = openNewAgentTab()
    expect(reused).toBe(id)
    expect(agentTabsSnapshot().find((t) => t.id === id)?.scope).toBe("knowledge") // untouched
  })
})

describe("pruneUnusedAgentTabsOnBoot", () => {
  // "+" itself can no longer build the multi-unused shape this guards
  // against (the describe block above proves that), so these reach past it
  // with `__unsafeAppendUnusedAgentTabForTest` — the store's own test-only
  // seam — to reconstruct exactly the pre-fix shape: several zero-turn tabs
  // open at once, the thing a stale session could still hand this panel.
  it("boot with three unused tabs keeps exactly one — the newest", () => {
    __unsafeAppendUnusedAgentTabForTest("Draft 1")
    __unsafeAppendUnusedAgentTabForTest("Draft 2")
    const newest = __unsafeAppendUnusedAgentTabForTest("Draft 3")
    expect(agentTabsSnapshot()).toHaveLength(3)

    pruneUnusedAgentTabsOnBoot()

    expect(agentTabsSnapshot()).toHaveLength(1)
    expect(agentTabsSnapshot()[0]?.id).toBe(newest)
  })

  it("never drops a USED tab, only the extra unused ones around it", () => {
    const used = openNewAgentTab()
    setAgentTabThread(used, "srv-used")
    __unsafeAppendUnusedAgentTabForTest("Draft 1")
    const newestDraft = __unsafeAppendUnusedAgentTabForTest("Draft 2")

    pruneUnusedAgentTabsOnBoot()

    expect(agentTabsSnapshot().map((t) => t.id).sort()).toEqual([used, newestDraft].sort())
  })

  it("re-lands the active tab on the kept draft when its own tab was dropped", () => {
    const oldest = __unsafeAppendUnusedAgentTabForTest("Draft 1")
    const newest = __unsafeAppendUnusedAgentTabForTest("Draft 2")
    activateAgentTab(oldest) // looking at the one the prune is about to drop

    pruneUnusedAgentTabsOnBoot()

    const { result } = renderHook(() => useActiveAgentTabId())
    expect(result.current).toBe(newest)
  })

  it("is a no-op with zero or one unused tab open — the ordinary case", () => {
    const id = openNewAgentTab()
    pruneUnusedAgentTabsOnBoot()
    expect(agentTabsSnapshot().map((t) => t.id)).toEqual([id])
  })
})

// REVERSED, 18 SEP 2026, HER THIRD REPORT ON THE ASSISTANT TABS — see
// `pickAgentTabScope`'s own header (web/lib/agent-conversation-tabs.ts) for
// the full argument: a picked SCOPE is a category, not a conversation's
// title, and writing it into `label` is what let two tabs sit stuck reading
// "Everything" forever. `renameAgentTab`, below, is what titles a tab now.
describe("pickAgentTabScope — never writes the tab's visible label", () => {
  it("sets scope, recordLabel and scopeId — and leaves label untouched", () => {
    const id = openNewAgentTab()
    pickAgentTabScope(id, "record", "Beringer")
    const tab = agentTabsSnapshot().find((t) => t.id === id)
    expect(tab?.scope).toBe("record")
    expect(tab?.recordLabel).toBe("Beringer")
    expect(tab?.label).toBe("") // still the empty draft label — never "Beringer"
  })

  it("a picked-but-unsent tab reads no scope name at all — \"Knowledge\", \"Everything\" included", () => {
    const id = openNewAgentTab()
    pickAgentTabScope(id, "knowledge")
    expect(agentTabsSnapshot().find((t) => t.id === id)?.label).toBe("")
  })
})

// THE TAB'S REAL TITLE — the conversation's own first message, given once,
// the instant it is actually sent (`agent-panel.tsx`'s `handleSend`). This
// is the pure-state half; that file's own wiring of "which text, which
// moment" is proven where the send lives.
describe("renameAgentTab", () => {
  it("gives an untitled tab its first real label", () => {
    const id = openNewAgentTab()
    renameAgentTab(id, "What's the status on Halloway?")
    expect(agentTabsSnapshot().find((t) => t.id === id)?.label).toBe("What's the status on Halloway?")
  })

  it("never overwrites a tab that already has a title — a history-resumed tab's topic stays put", () => {
    const id = openAgentTabForThread("srv-thread-rename", "Beringer tickets")
    renameAgentTab(id, "a different message, should never land")
    expect(agentTabsSnapshot().find((t) => t.id === id)?.label).toBe("Beringer tickets")
  })

  it("replaces a picked-but-unsent scope's empty label — never the scope's own name first", () => {
    const id = openNewAgentTab()
    pickAgentTabScope(id, "everything")
    expect(agentTabsSnapshot().find((t) => t.id === id)?.label).toBe("")
    renameAgentTab(id, "how many tickets are open right now")
    expect(agentTabsSnapshot().find((t) => t.id === id)?.label).toBe("how many tickets are open right now")
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
  // THREE (or two) DISTINCT open conversations, each carrying its own thread
  // — `openAgentTabForThread` rather than a bare "+" loop, because these
  // tests are about closing behaviour among several already-open tabs, not
  // about the "+" dedupe (covered above), and a threadId-less loop would now
  // collapse to one tab before ever reaching it.
  it("lands on the tab that shifts into the closed one's own spot", () => {
    const a = openAgentTabForThread("srv-close-a", "A")
    const b = openAgentTabForThread("srv-close-b", "B")
    const c = openAgentTabForThread("srv-close-c", "C")
    activateAgentTab(b)
    const landing = closeAgentTab(b)
    expect(landing).toBe(c)
    expect(agentTabsSnapshot().map((t) => t.id)).toEqual([a, c])
  })

  it("falls to what is now the last tab when the active one closed was itself last", () => {
    const a = openAgentTabForThread("srv-close-d", "A")
    const b = openAgentTabForThread("srv-close-e", "B")
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
    const a = openAgentTabForThread("srv-close-f", "A")
    const b = openAgentTabForThread("srv-close-g", "B")
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

// DRAG-TO-REORDER, THE STORE'S OWN HALF — client ruling, 16 Sep 2026: "go
// with the drag order." `agent-tab-strip.test.tsx` proves the kit's pointer
// gesture actually reaches this function and that History/"+" never carry
// the drag handle at all (they hold no row here to begin with — see this
// file's own header on why neither is a `tabs` entry); this is the data-only
// half, the same shape `workspace-tabs.ts`'s own `reorderTab` is never given
// a position outside its array either.
describe("reorderAgentTab — client ruling, 16 Sep 2026 (\"go with the drag order\")", () => {
  /** Three real conversation tabs, in order — never History or "+", which
   * this store does not carry a row for at all. */
  // Each a DISTINCT, already-sent conversation (`openAgentTabForThread`, not
  // a bare "+" loop) — a picked-but-unsent draft is still UNUSED (the 17 Sep
  // 2026 ruling above), so three of those in a row would now collapse to one
  // tab before there was anything left to drag.
  function threeTabs(): string[] {
    let a = ""
    let b = ""
    let c = ""
    act(() => {
      a = openAgentTabForThread("srv-reorder-a", "Ashworth")
      b = openAgentTabForThread("srv-reorder-b", "Beringer")
      c = openAgentTabForThread("srv-reorder-c", "Chalmers")
    })
    return [a, b, c]
  }

  it("moves the dragged tab to its new slot and keeps every other tab in order", () => {
    const [a, b, c] = threeTabs()
    act(() => {
      reorderAgentTab(0, 2) // drag Ashworth past Beringer and Chalmers
    })
    expect(agentTabsSnapshot().map((t) => t.id)).toEqual([b, c, a])
  })

  it("a reorder among conversations sticks — activeId names the tab, never its position", () => {
    const [a, , c] = threeTabs()
    act(() => {
      activateAgentTab(a)
    })
    act(() => {
      reorderAgentTab(0, 2) // Ashworth (active) moves to the far end
    })
    const { result } = renderHook(() => useActiveAgentTabId())
    // Still Ashworth's own id, wherever it now sits in the strip.
    expect(result.current).toBe(a)
    expect(agentTabsSnapshot().at(-1)?.id).toBe(a)
    expect(agentTabsSnapshot()[0]?.id).not.toBe(c) // sanity: c did move up
  })

  it("is a no-op for an index this store does not hold — the strip's pinned History/\"+\" positions included", () => {
    const [a, b, c] = threeTabs()
    act(() => {
      reorderAgentTab(-1, 1) // an out-of-range source, same guard `fromIndex` gets everywhere else
    })
    expect(agentTabsSnapshot().map((t) => t.id)).toEqual([a, b, c])
    act(() => {
      // `tabs.length` and past it are exactly the slots History and "+" draw
      // in `agent-tab-strip.tsx` — this store clamps rather than reading
      // past its own array, so a stray index that size can never land here.
      reorderAgentTab(0, 99)
    })
    expect(agentTabsSnapshot().map((t) => t.id)).toEqual([b, c, a])
  })
})
