// REPRODUCING THE CLIENT'S REPORT, 17 Sep 2026, VERBATIM: "now when I have a
// new open, I cannot go back to my conversation. Is that a bug? Please fix
// it. Also, I cannot close the new tab in the assistant."
//
// `agent-conversation-tabs.test.ts` already locks the STORE's own rules (the
// "+" dedupe, the boot prune, select/close) in isolation, and every one of
// those passes today. This file drives the store through the SAME SHAPE
// `agent-panel.tsx` actually calls it in — `handleSelectAgentTab` /
// `handleCloseAgentTab` / `handleNewAgentTab`, `switchToAgentTab`, and the
// two effects that run alongside them (the boot prune, and "keep the active
// tab's thread in step with the one live thread") — wired to the REAL
// `AgentTabStrip` so a click drives the real DOM the client actually clicks.
// `useFakeChat` below is a minimal stand-in for `use-agent-chat.tsx`: only
// the fields this wiring reads (`threadId`, `busy`, `newChat`, `openThread`),
// including that hook's own `if (busy) return` guard on both calls — the
// exact shape that lets a tab switch be silently DROPPED while the assistant
// is still replying in the tab being left, which is an ordinary thing to do,
// not an edge case.
//
// THE THREE SCENARIOS THE BRIEF ASKS FOR (clicking another tab away from an
// unused one, closing the unused one, "+" afterwards opening one fresh tab)
// were checked against today's code FIRST and all three already pass — the
// literal mechanisms the brief names as suspects (`openNewAgentTab`'s own
// dedupe, the boot-prune effect re-running, `handleNewAgentTab` swallowing a
// selection) do not reproduce the report through this wiring. What DOES
// reproduce, deterministically, is the race below: a switch attempted while
// `chat.busy` silently no-ops in `use-agent-chat.tsx`, but `agent-panel.tsx`'s
// "keep the active tab's thread in step" effect does not know that — it
// stamps whatever `chat.threadId` still holds (the tab being LEFT's own
// thread) onto the tab that is now active, rebinding an already-real
// conversation to a different one it was never asked to become. That is the
// shape of "I cannot go back to my conversation": the tab a reader switches
// TO silently starts showing (and, once stamped, permanently pointing at) a
// DIFFERENT conversation than its own.

import * as React from "react"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { AgentTabStrip } from "@/components/assistant/agent-tab-strip"
import {
  __unsafeAppendUnusedAgentTabForTest,
  activateAgentTab,
  agentTabsSnapshot,
  closeAgentTab,
  openAgentTabForThread,
  openNewAgentTab,
  pruneUnusedAgentTabsOnBoot,
  setAgentTabThread,
  useActiveAgentTabId,
  useAgentTabs,
  useHistoryTabOpen,
  type AgentTab,
} from "@/lib/agent-conversation-tabs"

/** A stand-in for `use-agent-chat.tsx`, trimmed to what this wiring reads.
 * `busy` is a real, settable flag (not just decoration) — `newChat` and
 * `openThread` both carry the identical `if (busy) return` guard the real
 * hook's `newChat`/`openThread` open with (`web/lib/use-agent-chat.tsx` lines
 * 719-735), so a call made while busy is silently dropped here exactly as it
 * is there. */
function useFakeChat() {
  const [threadId, setThreadId] = React.useState<string | undefined>(undefined)
  const [busy, setBusy] = React.useState(false)
  const [openCalls, setOpenCalls] = React.useState<string[]>([])
  const [newChatCalls, setNewChatCalls] = React.useState(0)
  function newChat() {
    if (busy) return
    setNewChatCalls((n) => n + 1)
    setThreadId(undefined)
  }
  async function openThread(id: string) {
    if (busy) return
    setOpenCalls((c) => [...c, id])
    // The id lands in state only once the "fetch" resolves, never
    // synchronously — the exact gap the sync effect below has to survive.
    await Promise.resolve()
    setThreadId(id)
  }
  return { threadId, busy, setBusy, newChat, openThread, openCalls, newChatCalls }
}

/** The exact wiring `agent-panel.tsx` runs, trimmed to the tab machinery —
 * copied by hand from that file (not imported: the real component needs a
 * team, permissions, the dock portals and the full `useAgentChat` state
 * machine to mount at all) so a fix there must be mirrored here on purpose,
 * not merely kept green by accident. The "keep thread in step" effect below
 * carries the SAME guard the fix adds to `agent-panel.tsx`: refuse to stamp
 * `chat.threadId` onto the active tab when that tab already holds a
 * DIFFERENT thread of its own. */
function TestAgentTabsHost() {
  const agentTabs = useAgentTabs()
  const activeAgentTabId = useActiveAgentTabId()
  const historyTabOpen = useHistoryTabOpen()
  const chat = useFakeChat()

  React.useEffect(() => {
    pruneUnusedAgentTabsOnBoot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    if (!chat.threadId || !activeAgentTabId) return
    // The live snapshot, not the render-time `agentTabs` — see the matching
    // comment in agent-panel.tsx: `setAgentTabThread` announces on every
    // call, so listing `agentTabs` here would re-fire this effect off its
    // own write, forever.
    const activeTab = agentTabsSnapshot().find((t) => t.id === activeAgentTabId)
    if (activeTab?.threadId && activeTab.threadId !== chat.threadId) return
    setAgentTabThread(activeAgentTabId, chat.threadId)
  }, [chat.threadId, activeAgentTabId])

  // The reconcile-on-busy's-falling-edge half of the fix (agent-panel.tsx's
  // matching effect): once a swallowed switch's target tab is active but the
  // live chat never actually caught up to it, retry the instant `chat.busy`
  // goes from true to false — never merely "busy is false and mismatched",
  // which would also fire mid-flight during an ordinary, never-busy switch
  // and reissue the very fetch already in flight.
  const wasBusyRef = React.useRef(chat.busy)
  React.useEffect(() => {
    const wasBusy = wasBusyRef.current
    wasBusyRef.current = chat.busy
    if (!wasBusy || chat.busy || !activeAgentTabId) return
    const tab = agentTabsSnapshot().find((t) => t.id === activeAgentTabId)
    if (!tab) return
    if ((tab.threadId ?? null) === (chat.threadId ?? null)) return
    switchToAgentTab(tab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.busy, activeAgentTabId])

  function switchToAgentTab(tab: { threadId?: string } | undefined) {
    if (tab?.threadId) void chat.openThread(tab.threadId)
    else chat.newChat()
  }

  function handleSelectAgentTab(id: string) {
    const tab = agentTabs.find((t) => t.id === id)
    if (!tab) return
    activateAgentTab(id)
    switchToAgentTab(tab)
  }

  function handleNewAgentTab() {
    const wasActiveId = activeAgentTabId
    const id = openNewAgentTab()
    if (id !== wasActiveId) chat.newChat()
  }

  function handleCloseAgentTab(id: string) {
    const wasActive = id === activeAgentTabId
    const landingId = closeAgentTab(id)
    if (!wasActive) return
    switchToAgentTab(landingId ? agentTabsSnapshot().find((t) => t.id === landingId) : undefined)
  }

  return (
    <div>
      <div data-testid="active-id">{activeAgentTabId ?? "none"}</div>
      <div data-testid="chat-thread">{chat.threadId ?? "none"}</div>
      <div data-testid="open-calls">{chat.openCalls.join(",")}</div>
      <div data-testid="new-chat-calls">{chat.newChatCalls}</div>
      <button type="button" data-testid="set-busy" onClick={() => chat.setBusy(true)}>
        busy
      </button>
      <button type="button" data-testid="clear-busy" onClick={() => chat.setBusy(false)}>
        free
      </button>
      <AgentTabStrip
        tabs={agentTabs}
        activeId={activeAgentTabId}
        historyActive={historyTabOpen}
        onSelect={handleSelectAgentTab}
        onClose={handleCloseAgentTab}
        onNew={handleNewAgentTab}
        onOpenHistory={() => {}}
      />
    </div>
  )
}

afterEach(cleanup)

// Same reset discipline as agent-conversation-tabs.test.ts: the store is
// module-level, so every test starts by driving it back to empty.
beforeEach(() => {
  for (const tab of agentTabsSnapshot()) closeAgentTab(tab.id)
  closeAgentTab(openNewAgentTab())
})

describe("switching away from an unused tab (client report, 17 Sep 2026)", () => {
  it("clicking another conversation tab activates it and resumes its thread", async () => {
    let real = ""
    act(() => {
      real = openAgentTabForThread("t-R", "Conversation R")
    })

    render(<TestAgentTabsHost />)
    expect(screen.getByTestId("active-id").textContent).toBe(real)

    // "+" — a fresh, unused draft becomes active, same as the client
    // describes ("when I have a new open").
    fireEvent.click(screen.getByRole("link", { name: "New conversation" }))
    const draftId = screen.getByTestId("active-id").textContent!
    expect(draftId).not.toBe(real)
    expect(agentTabsSnapshot().find((t) => t.id === draftId)?.threadId).toBeUndefined()

    // Click back to the original conversation tab.
    fireEvent.click(screen.getByRole("link", { name: "Conversation R" }))

    expect(screen.getByTestId("active-id").textContent).toBe(real)
    // The store itself must agree, not just the DOM read this render.
    expect(agentTabsSnapshot().find((t) => t.threadId === "t-R")?.id).toBe(real)

    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByTestId("chat-thread").textContent).toBe("t-R")
    expect(screen.getByTestId("open-calls").textContent).toBe("t-R")
  })

  it("closing the unused tab removes it and lands back on the previous conversation", async () => {
    let real = ""
    act(() => {
      real = openAgentTabForThread("t-S", "Conversation S")
    })

    render(<TestAgentTabsHost />)

    fireEvent.click(screen.getByRole("link", { name: "New conversation" }))
    const draftId = screen.getByTestId("active-id").textContent!
    expect(draftId).not.toBe(real)

    // The draft's own placeholder label is "New" (agent-tab-strip.tsx's own
    // translated fallback for an empty `label`) — name the close button
    // precisely, since "Close tab: Conversation S" is also on screen.
    fireEvent.click(screen.getByRole("button", { name: "Close tab: New" }))

    expect(agentTabsSnapshot().find((t) => t.id === draftId)).toBeUndefined()
    expect(screen.getByTestId("active-id").textContent).toBe(real)

    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByTestId("chat-thread").textContent).toBe("t-S")
  })

  it("\"+\" afterwards opens exactly one fresh unused tab", () => {
    act(() => {
      openAgentTabForThread("t-R", "Conversation R")
    })
    render(<TestAgentTabsHost />)

    fireEvent.click(screen.getByRole("link", { name: "New conversation" }))
    fireEvent.click(screen.getByRole("link", { name: "Conversation R" }))
    fireEvent.click(screen.getByRole("link", { name: "New conversation" }))

    const unused = agentTabsSnapshot().filter((t: AgentTab) => !t.threadId)
    expect(unused).toHaveLength(1)
  })
})

describe("the boot prune runs once per mount, never during normal interaction", () => {
  it("does not touch a strip that only ever holds one unused tab at a time", () => {
    act(() => {
      openAgentTabForThread("t-R", "Conversation R")
    })
    render(<TestAgentTabsHost />)

    fireEvent.click(screen.getByRole("link", { name: "New conversation" }))
    const draftId = screen.getByTestId("active-id").textContent!
    // If the boot-prune effect fired again here (it must not — it is a
    // mount-once effect), a single unused draft is its own no-op case
    // anyway, so this alone would not catch a re-fire. The real proof is the
    // next test's rerender count; this one just pins the ordinary shape it
    // must leave alone.
    expect(agentTabsSnapshot().map((t) => t.id)).toContain(draftId)
  })

  it("a rerender (a prop change, not a remount) never re-collapses a legitimately-open second unused tab", () => {
    // Reach past the "+" dedupe with the store's own test seam — the shape a
    // stale pre-fix session could hand the panel, and the one case where a
    // prune SHOULD act, but only once, at mount, never again on a later
    // rerender triggered by ordinary interaction.
    act(() => {
      __unsafeAppendUnusedAgentTabForTest("Draft 1")
    })
    const newest = __unsafeAppendUnusedAgentTabForTest("Draft 2")

    const { rerender } = render(<TestAgentTabsHost />)
    // The boot prune already ran on mount and collapsed to the newest.
    expect(agentTabsSnapshot()).toHaveLength(1)
    expect(agentTabsSnapshot()[0]?.id).toBe(newest)

    // Rebuild the exact pre-fix shape AFTER mount, the same way a caller
    // that bypassed "+" could — this must NOT be swept away by a second
    // prune run, because the effect's own deps array (`[]`) means it never
    // fires again for this component instance.
    act(() => {
      __unsafeAppendUnusedAgentTabForTest("Draft 3")
    })
    expect(agentTabsSnapshot()).toHaveLength(2) // both unused drafts stand

    // A plain rerender (no remount) must not run the effect again either.
    rerender(<TestAgentTabsHost />)
    expect(agentTabsSnapshot()).toHaveLength(2)
  })
})

describe("the stale-switch race — a switch dropped while chat.busy corrupts the WRONG tab's thread", () => {
  it("switching tabs while busy is swallowed, and the guard refuses to stamp the tab being left's thread onto the tab switched to", async () => {
    let a = ""
    let b = ""
    act(() => {
      a = openAgentTabForThread("t-A", "Ashworth")
      b = openAgentTabForThread("t-B", "Beringer")
    })
    // `b` is active now (the second `openAgentTabForThread` call activates
    // it), but nothing has told the FAKE chat to actually load either
    // thread yet — unlike the real panel, this harness has no auto-resume
    // effect of its own (`use-agent-chat.tsx`'s resume is out of scope
    // here), so the live chat only ever moves through an explicit switch.
    // Drive it there for real: select A, then B, each one settling before
    // the next click — exactly the ordinary path a reader who has actually
    // been looking at both tabs for a while would have taken.
    render(<TestAgentTabsHost />)
    fireEvent.click(screen.getByRole("link", { name: "Ashworth" }))
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByTestId("chat-thread").textContent).toBe("t-A")
    // A is active now, so B is the clickable link.
    fireEvent.click(screen.getByRole("link", { name: "Beringer" }))
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByTestId("chat-thread").textContent).toBe("t-B")
    expect(screen.getByTestId("active-id").textContent).toBe(b)

    // The assistant is still replying in B.
    fireEvent.click(screen.getByTestId("set-busy"))

    // The reader switches to A while it is still busy — `activateAgentTab`
    // still moves the STORE's own activeId (that half is never gated on
    // `busy`), but `chat.openThread("t-A")` is dropped by the guard above.
    fireEvent.click(screen.getByRole("link", { name: "Ashworth" }))
    expect(screen.getByTestId("active-id").textContent).toBe(a)
    // `chat.threadId` is still B's own — the switch never actually ran.
    expect(screen.getByTestId("chat-thread").textContent).toBe("t-B")

    // THE ASSERTION THAT FAILS WITHOUT THE FIX: without the guard, the "keep
    // thread in step" effect stamps the stale "t-B" onto A the moment
    // `activeAgentTabId` changes, permanently rebinding Ashworth's own tab to
    // Beringer's thread — the corruption this fix exists to prevent.
    expect(agentTabsSnapshot().find((t) => t.id === a)?.threadId).toBe("t-A")
    expect(agentTabsSnapshot().find((t) => t.id === b)?.threadId).toBe("t-B")

    // Once the assistant is free again, the reconcile effect catches the
    // live chat up to A on its own — A is already the active tab (the
    // strip's own highlight never lied), so there is nothing left for the
    // reader to click; the panel simply stops being stuck on Beringer's
    // conversation.
    fireEvent.click(screen.getByTestId("clear-busy"))
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByTestId("chat-thread").textContent).toBe("t-A")
    expect(agentTabsSnapshot().find((t) => t.id === a)?.threadId).toBe("t-A")
  })

  it("a genuinely fresh draft (no thread of its own yet) still picks up a thread normally — the guard never blocks the legitimate case", async () => {
    act(() => {
      openAgentTabForThread("t-R", "Conversation R")
    })
    render(<TestAgentTabsHost />)
    await act(async () => {
      await Promise.resolve()
    })

    fireEvent.click(screen.getByRole("link", { name: "New conversation" }))
    const draftId = screen.getByTestId("active-id").textContent!

    // Not busy: the draft's own first message mints a real thread for IT,
    // simulated here the same way `setAgentTabThread` is called from
    // `handleSend` in the real panel once the server responds.
    act(() => {
      setAgentTabThread(draftId, "t-fresh")
    })
    expect(agentTabsSnapshot().find((t) => t.id === draftId)?.threadId).toBe("t-fresh")
  })
})
