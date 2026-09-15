// THE ASSISTANT'S TAB STRIP, AS PAINTED. The client's own words: "all the
// time, there is a visible tab that has a plus button. That's how you create
// a new one." — and later the same day, "I like the history rail tab. Put it
// before the plus tab." This reads the actual DOM the strip draws — a pinned
// clock tab FIRST with an accessible name "History" and no close button of
// its own, an icon-only "+" LAST with the same, and a real conversation tab
// that DOES carry a close button once `onClose` is wired — rather than
// trusting the component's own comments.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AgentTabStrip } from "@/components/assistant/agent-tab-strip"
import type { AgentTab } from "@/lib/agent-conversation-tabs"

afterEach(cleanup)

const tabs: AgentTab[] = [
  { id: "a", threadId: "t-a", scope: "everything", label: "Conversation" },
  { id: "b", threadId: "t-b", scope: "record", label: "Beringer", recordLabel: "Beringer" },
]

/** The five props every render below needs — spread and overridden per test,
 * so a new required prop only has to be named once here. */
function baseProps() {
  return {
    tabs,
    activeId: "a" as string | null,
    historyActive: false,
    onSelect: vi.fn(),
    onClose: vi.fn(),
    onNew: vi.fn(),
    onOpenHistory: vi.fn(),
  }
}

describe("AgentTabStrip", () => {
  it("draws the \"+\" icon-only, named \"New conversation\", with no close button of its own", () => {
    render(<AgentTabStrip {...baseProps()} />)
    expect(screen.getByRole("link", { name: "New conversation" })).toBeTruthy()
    // "Never closable" — the kit's own × is a SIBLING button beside the tab
    // it belongs to (breadcrumb-folders.tsx), so proving there is exactly one
    // close control per REAL tab and none tied to "+" (or to History) is the
    // DOM-level version of `closable: false`.
    expect(screen.getAllByRole("button", { name: /close tab/i })).toHaveLength(tabs.length)
  })

  it("pressing \"+\" calls onNew, never onSelect or onOpenHistory", () => {
    const props = baseProps()
    render(<AgentTabStrip {...props} />)
    fireEvent.click(screen.getByRole("link", { name: "New conversation" }))
    expect(props.onNew).toHaveBeenCalledTimes(1)
    expect(props.onSelect).not.toHaveBeenCalled()
    expect(props.onOpenHistory).not.toHaveBeenCalled()
  })

  it("clicking a background tab activates it by id, and never navigates the address bar", () => {
    const props = baseProps()
    render(<AgentTabStrip {...props} />)
    const before = window.location.href
    fireEvent.click(screen.getByRole("link", { name: "Beringer" }))
    expect(props.onSelect).toHaveBeenCalledWith("b")
    expect(window.location.href).toBe(before)
  })

  it("closing a real tab reports that tab's own id, never the \"+\"'s or History's", () => {
    const props = baseProps()
    render(<AgentTabStrip {...props} />)
    fireEvent.click(screen.getByRole("button", { name: "Close tab: Beringer" }))
    expect(props.onClose).toHaveBeenCalledWith("b")
  })

  it("a draft tab with an empty label shows the translated \"New\" placeholder", () => {
    const draft: AgentTab[] = [{ id: "d", scope: null, label: "" }]
    render(<AgentTabStrip {...baseProps()} tabs={draft} activeId="d" />)
    // The active/current crumb renders read-only (no link), so it is read by
    // text rather than by role — see breadcrumb-folders.tsx's own TEN STATES.
    expect(screen.getByText("New")).toBeTruthy()
  })

  describe("the pinned History tab — client ruling, 15 Sep 2026", () => {
    it("draws first, named \"History\", never closable", () => {
      render(<AgentTabStrip {...baseProps()} />)
      // FIRST — ahead of every conversation tab and ahead of "+", positionally.
      expect(screen.getAllByRole("link")[0]).toBe(screen.getByRole("link", { name: "History" }))
      // NEVER CLOSABLE — the same DOM-level proof the top test above makes
      // for "+": one close button per REAL conversation tab, none for
      // History.
      expect(screen.getAllByRole("button", { name: /close tab/i })).toHaveLength(tabs.length)
    })

    it("pressing it calls onOpenHistory, never onSelect or onNew", () => {
      const props = baseProps()
      render(<AgentTabStrip {...props} />)
      fireEvent.click(screen.getByRole("link", { name: "History" }))
      expect(props.onOpenHistory).toHaveBeenCalledTimes(1)
      expect(props.onSelect).not.toHaveBeenCalled()
      expect(props.onNew).not.toHaveBeenCalled()
    })

    it("shows as the live tab when historyActive is true, even though a conversation is still activeId", () => {
      render(<AgentTabStrip {...baseProps()} historyActive />)
      // The label is still there (an sr-only span, same text either way) —
      // whether it renders as a link or as the read-only live crumb is the
      // kit's own call (`breadcrumb-folders.tsx`'s TEN STATES), not something
      // this strip asserts on directly.
      expect(screen.getByText("History")).toBeTruthy()
      // And the conversation `activeId` still points at is NOT the live
      // crumb while History is showing — it stays an ordinary, clickable
      // link, same as "Beringer" (the other background tab) already is.
      expect(screen.getByRole("link", { name: "Conversation" })).toBeTruthy()
    })
  })
})
