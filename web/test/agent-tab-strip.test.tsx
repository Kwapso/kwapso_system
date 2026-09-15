// THE ASSISTANT'S TAB STRIP, AS PAINTED. The client's own words: "all the
// time, there is a visible tab that has a plus button. That's how you create
// a new one." This reads the actual DOM the strip draws — an icon-only "+"
// with an accessible name, never a × of its own, and a real conversation tab
// that DOES carry one once `onClose` is wired — rather than trusting the
// component's own comments.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AgentTabStrip } from "@/components/assistant/agent-tab-strip"
import type { AgentTab } from "@/lib/agent-conversation-tabs"

afterEach(cleanup)

const tabs: AgentTab[] = [
  { id: "a", threadId: "t-a", scope: "everything", label: "Conversation" },
  { id: "b", threadId: "t-b", scope: "record", label: "Beringer", recordLabel: "Beringer" },
]

describe("AgentTabStrip", () => {
  it("draws the \"+\" icon-only, named \"New conversation\", with no close button of its own", () => {
    render(<AgentTabStrip tabs={tabs} activeId="a" onSelect={vi.fn()} onClose={vi.fn()} onNew={vi.fn()} />)
    expect(screen.getByRole("link", { name: "New conversation" })).toBeTruthy()
    // "Never closable" — the kit's own × is a SIBLING button beside the tab
    // it belongs to (breadcrumb-folders.tsx), so proving there is exactly one
    // close control per REAL tab and none tied to "+" is the DOM-level version
    // of `closable: false`.
    expect(screen.getAllByRole("button", { name: /close tab/i })).toHaveLength(tabs.length)
  })

  it("pressing \"+\" calls onNew, never onSelect", () => {
    const onNew = vi.fn()
    const onSelect = vi.fn()
    render(<AgentTabStrip tabs={tabs} activeId="a" onSelect={onSelect} onClose={vi.fn()} onNew={onNew} />)
    fireEvent.click(screen.getByRole("link", { name: "New conversation" }))
    expect(onNew).toHaveBeenCalledTimes(1)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("clicking a background tab activates it by id, and never navigates the address bar", () => {
    const onSelect = vi.fn()
    render(<AgentTabStrip tabs={tabs} activeId="a" onSelect={onSelect} onClose={vi.fn()} onNew={vi.fn()} />)
    const before = window.location.href
    fireEvent.click(screen.getByRole("link", { name: "Beringer" }))
    expect(onSelect).toHaveBeenCalledWith("b")
    expect(window.location.href).toBe(before)
  })

  it("closing a real tab reports that tab's own id, never the \"+\"'s", () => {
    const onClose = vi.fn()
    render(<AgentTabStrip tabs={tabs} activeId="a" onSelect={vi.fn()} onClose={onClose} onNew={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "Close tab: Beringer" }))
    expect(onClose).toHaveBeenCalledWith("b")
  })

  it("a draft tab with an empty label shows the translated \"New\" placeholder", () => {
    const draft: AgentTab[] = [{ id: "d", scope: null, label: "" }]
    render(<AgentTabStrip tabs={draft} activeId="d" onSelect={vi.fn()} onClose={vi.fn()} onNew={vi.fn()} />)
    // The active/current crumb renders read-only (no link), so it is read by
    // text rather than by role — see breadcrumb-folders.tsx's own TEN STATES.
    expect(screen.getByText("New")).toBeTruthy()
  })
})
