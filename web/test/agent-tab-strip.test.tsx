// THE ASSISTANT'S TAB STRIP, AS PAINTED. The client's own words: "all the
// time, there is a visible tab that has a plus button. That's how you create
// a new one." — and later the same day, "I like the history rail tab. Put it
// before the plus tab." CORRECTED 16 Sep 2026, over a screenshot of History
// pinned ahead of every conversation tab: "I want the history tab to be on
// the left of the plus, not the very far left. Put it to the left of the
// plus." This reads the actual DOM the strip draws — every open conversation
// tab FIRST, a pinned clock tab named "History" immediately after them (no
// close button of its own), an icon-only "+" LAST (same), and a real
// conversation tab that DOES carry a close button once `onClose` is wired —
// rather than trusting the component's own comments.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createPortal } from "react-dom"

import { ScreenShell } from "@shared/ui/compositions/templates/screen-shell"

import { AgentTabStrip } from "@/components/assistant/agent-tab-strip"
import { AgentDockTabsSlot, useAgentDockTabs } from "@/lib/agent-dock"
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

  describe("the pinned History tab — client ruling, 15 Sep 2026, corrected 16 Sep 2026", () => {
    it("draws immediately before \"+\", never at the very front, named \"History\", never closable", () => {
      render(<AgentTabStrip {...baseProps()} />)
      const links = screen.getAllByRole("link")
      const historyIndex = links.indexOf(screen.getByRole("link", { name: "History" }))
      const newIndex = links.indexOf(screen.getByRole("link", { name: "New conversation" }))
      // NOT THE VERY FAR LEFT — the client's own 16 Sep 2026 correction over
      // a screenshot of exactly that regression.
      expect(historyIndex, "History must not be the strip's first tab").toBeGreaterThan(0)
      // AND DIRECTLY LEFT OF "+" — "Put it to the left of the plus."
      expect(historyIndex, "History must sit immediately before \"+\"").toBe(newIndex - 1)
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

// MOUNTED THROUGH THE KIT'S OWN SLOT — the client's ruling, 15 Sep 2026, over
// a screenshot of this strip nested one level below the kit's single, fixed
// "Assistant" tab, verbatim: "The tabs need to be at the same level as the
// assistant tab, so it will have no assistant name... it's only one tab
// level." Kit v1.2.88's `ScreenShell` gained `asideTabs` for exactly this —
// drawn IN PLACE of the kit's own fixed tab, not beside or under it — and
// this is the proof that the app's own call site (`app-shell.tsx`'s
// `asideTabs={<AgentDockTabsSlot />}`, portalled from `agent-panel.tsx`)
// actually lands there: render the real kit composition with this app's real
// strip as its `asideTabs` and read the aside's own DOM, rather than trusting
// either file's comments.
describe("AgentTabStrip mounted as ScreenShell's asideTabs", () => {
  it("the aside draws exactly one tab strip — the app's own, never the kit's fixed one nested beside it", () => {
    const { container } = render(
      <ScreenShell asideOpen aside={<div>panel body</div>} asideTabs={<AgentTabStrip {...baseProps()} />}>
        <div>content</div>
      </ScreenShell>
    )
    // Scoped to the aside itself (`screen-shell-aside`), not the whole
    // document — the RAIL draws its own `<nav>` too (`Rail`, R45), and this
    // proof is about the ASIDE's tab level specifically, not a document-wide
    // count that a change to the rail could move for an unrelated reason.
    const aside = container.querySelector('[data-slot="screen-shell-aside"]')
    expect(aside, "ScreenShell must draw the aside at all when asideOpen + asideTabs are given").toBeTruthy()
    const navs = aside!.querySelectorAll("nav")
    expect(navs, "one tab level — the app's AgentTabStrip, not a second one nested under the kit's own").toHaveLength(1)
  })

  it("no tab is named \"Assistant\" — that word is the landmark's own name now, never a tab", () => {
    render(
      <ScreenShell asideOpen aside={<div>panel body</div>} asideTabs={<AgentTabStrip {...baseProps()} />}>
        <div>content</div>
      </ScreenShell>
    )
    // The landmark itself still carries the word (`asideLabel`'s default,
    // unchanged) — this is `role="complementary"`'s OWN accessible name, read
    // off the region rather than off any tab inside it.
    expect(screen.getByRole("complementary", { name: "Assistant" })).toBeTruthy()
    // But nothing INSIDE it is a tab called "Assistant" any more — every link
    // the strip actually draws is History, a real conversation, or "+".
    expect(screen.queryByRole("link", { name: "Assistant" })).toBeNull()
  })
})

// THROUGH THE REAL PORTAL, NOT A DIRECT `asideTabs` HAND-OFF. Both describes
// above pass `<AgentTabStrip>` straight to `asideTabs`, which proves the kit
// slot draws this app's strip but never exercises the actual production
// wiring: `agent-panel.tsx` builds the strip at the ROOT and portals it
// (`createPortal`) into the node `AgentDockTabsSlot` publishes
// (`web/lib/agent-dock.tsx`'s `useAgentDockTabs`), several React levels away
// from the routed `ScreenShell`. A regression in that portal specifically —
// the client's report, 16 Sep 2026, that "when I click on the tab, it
// doesn't close" — could pass every test above and still fail in the
// browser, because none of them route a click through the portal boundary.
// This does, reproducing `agent-panel.tsx`'s own shape: a sibling component
// reads `useAgentDockTabs()` and portals `<AgentTabStrip>` into it, exactly
// as the root-mounted `AgentPanel` does.
function PortalledAgentTabStrip(props: ReturnType<typeof baseProps>) {
  const dockTabs = useAgentDockTabs()
  if (!dockTabs) return null
  return createPortal(<AgentTabStrip {...props} />, dockTabs)
}

describe("AgentTabStrip through the real AgentDockTabsSlot portal (agent-panel.tsx's own wiring)", () => {
  it("lands in the aside's tab slot as exactly one tab strip", () => {
    render(
      <>
        <ScreenShell asideOpen aside={<div>panel body</div>} asideTabs={<AgentDockTabsSlot />}>
          <div>content</div>
        </ScreenShell>
        <PortalledAgentTabStrip {...baseProps()} />
      </>
    )
    const aside = document.querySelector('[data-slot="screen-shell-aside"]')
    expect(aside, "ScreenShell must draw the aside").toBeTruthy()
    expect(aside!.querySelectorAll("nav"), "one tab level, reached through the portal").toHaveLength(1)
  })

  it("closing a real conversation tab through the portal still reports that tab's own id", () => {
    const props = baseProps()
    render(
      <>
        <ScreenShell asideOpen aside={<div>panel body</div>} asideTabs={<AgentDockTabsSlot />}>
          <div>content</div>
        </ScreenShell>
        <PortalledAgentTabStrip {...props} />
      </>
    )
    fireEvent.click(screen.getByRole("button", { name: "Close tab: Beringer" }))
    expect(props.onClose).toHaveBeenCalledWith("b")
  })
})
