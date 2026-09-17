// THE NEW-TAB SCREEN — the search page, not the placeholder sentence.
//
// The client's second ruling, 17 Sep 2026, verbatim: "For the new tab page,
// implement 02 in your proposal. However, do not ask the assistant, just
// search anything, and instead of search, put an icon there that means
// search." This tests the things that ruling actually asks for: every
// module door is asked with the reader's own `q`, Enter opens the first hit
// IN this tab, cmd/ctrl-Enter opens it BESIDE (the same door the content
// strip's own "+" uses), and "Recently opened" is read off the workspace
// tab trails already stored — never a fabricated list.
//
// THE SCOPE-CHIP ROW IS GONE — her third ruling, the same day, verbatim:
// "remove the quick access to tickets, accounts, stories, and so on. It's
// not needed. Just put the recently opened because, with the quick access,
// I already have them in the navigation bar." Search now always fans out
// across every door; there is no chip to narrow it, so the old "a scope
// chip narrows which doors are asked" test is gone with the row it tested.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import * as React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const helpCalls: { q?: string }[] = []
const accountsCalls: { q?: string; type?: string }[] = []

vi.mock("@/lib/api", () => ({
  content: {
    help: async (opts: { q?: string }) => {
      helpCalls.push(opts)
      return opts.q
        ? {
            tickets: [
              {
                id: "tk1",
                titleEn: "Login fails on Safari",
                titleDe: null,
                ref: "T0412",
                description: "d",
              },
            ],
          }
        : { tickets: [] }
    },
    stories: async () => ({ stories: [] }),
    knowledge: async () => ({ sources: [] }),
  },
  tenancy: {
    accounts: async (opts: { q?: string; type?: string }) => {
      accountsCalls.push(opts)
      return { accounts: [] }
    },
    apps: async () => ({ apps: [] }),
  },
}))

const softNavigate = vi.fn()
vi.mock("@/lib/nav", () => ({ softNavigate: (path: string) => softNavigate(path) }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/new",
  useSearchParams: () => new URLSearchParams(),
}))

import { NewTabScreen } from "@/components/shell/new-tab-screen"
import { forgetOpenTabs, openBeside, openTabsSnapshot, setWorkspaceScope, visitTrail } from "@/lib/workspace-tabs"

afterEach(cleanup)

beforeEach(() => {
  helpCalls.length = 0
  accountsCalls.length = 0
  softNavigate.mockClear()
  forgetOpenTabs()
})

describe("the search wiring — every door asked with the reader's own q", () => {
  it("types a query and asks the tickets and accounts doors with it, capped, no new endpoint", async () => {
    setWorkspaceScope("new-tab-search-user:team1")
    render(<NewTabScreen />)
    fireEvent.change(screen.getByLabelText("Where to?"), { target: { value: "safari" } })
    await waitFor(() => expect(helpCalls.length).toBeGreaterThan(0))
    expect(helpCalls.at(-1)).toEqual({ q: "safari" })
    expect(accountsCalls.some((c) => c.q === "safari" && c.type === "entity")).toBe(true)
    expect(accountsCalls.some((c) => c.q === "safari" && c.type === "individual")).toBe(true)
    // AND THE RESULT ITSELF RENDERS, grouped under its own module.
    await waitFor(() => expect(screen.queryByText("Login fails on Safari")).not.toBeNull())
  })

  it("draws no scope-chip row at all — quick access moved to the navigation bar", async () => {
    setWorkspaceScope("new-tab-search-user:team2")
    render(<NewTabScreen />)
    expect(screen.queryByRole("button", { name: "Accounts" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Tickets" })).toBeNull()
  })
})

describe("Enter opens the first result in this tab; cmd/ctrl-Enter opens it beside", () => {
  it("Enter navigates THIS tab to the first hit — no new workspace tab", async () => {
    setWorkspaceScope("new-tab-enter-user:team1")
    render(<NewTabScreen />)
    const box = screen.getByLabelText("Where to?")
    fireEvent.change(box, { target: { value: "safari" } })
    await waitFor(() => expect(screen.queryByText("Login fails on Safari")).not.toBeNull())
    const before = openTabsSnapshot().length
    fireEvent.keyDown(box, { key: "Enter" })
    expect(softNavigate).toHaveBeenCalledWith("/tickets/tk1")
    expect(openTabsSnapshot().length).toBe(before) // no tab minted — this one just navigated
  })

  it("cmd-Enter opens the first hit BESIDE this tab — the same door the strip's own \"+\" uses", async () => {
    setWorkspaceScope("new-tab-cmdenter-user:team1")
    render(<NewTabScreen />)
    const box = screen.getByLabelText("Where to?")
    fireEvent.change(box, { target: { value: "safari" } })
    await waitFor(() => expect(screen.queryByText("Login fails on Safari")).not.toBeNull())
    fireEvent.keyDown(box, { key: "Enter", metaKey: true })
    expect(softNavigate).toHaveBeenCalledWith("/tickets/tk1")
    expect(openTabsSnapshot().some((t) => t.steps[t.cursor]?.path === "/tickets/tk1")).toBe(true)
  })
})

describe("recently opened — read off the trails already stored, never fabricated", () => {
  it("lists the other open tabs' current records, newest tab first, never this screen's own /new step", () => {
    setWorkspaceScope("new-tab-recent-user:team1")
    // Two ordinary tabs, opened in order — the SECOND is the one
    // `recentSteps` should surface first (see its own doc on the ordering
    // this store can honestly offer with no timestamp).
    visitTrail([{ path: "/accounts/BERG", label: "Bergman S.A." }])
    openBeside("/tickets/T0412", "T0412 · Login fails on Safari")
    // She then opens a fresh, still-blank /new tab beside those two — the
    // one this screen itself renders inside, and it must not recommend
    // itself.
    openBeside("/new", "New tab")
    render(<NewTabScreen />)
    expect(screen.getByText("Recently opened")).not.toBeNull()
    const order = [...document.querySelectorAll("a")].map((a) => a.textContent)
    const ticketIdx = order.findIndex((t) => t?.includes("T0412"))
    const accountIdx = order.findIndex((t) => t?.includes("Bergman S.A."))
    expect(ticketIdx).toBeGreaterThanOrEqual(0)
    expect(accountIdx).toBeGreaterThanOrEqual(0)
    expect(ticketIdx).toBeLessThan(accountIdx) // the more-recently-opened tab lists first
    expect(screen.queryByText("New tab")).toBeNull()
  })
})
