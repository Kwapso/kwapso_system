// THE WORKSPACE TAB STRIP IS DRAWN, AND THE SPINE STILL FEEDS IT.
//
// ── WHY THIS FILE EXISTS, WHICH IS NOT THE OBVIOUS REASON ────────────────────
//
// `web/test/workspace-tabs.test.ts` is a good test of the STORE — open, close,
// re-order, the per-workspace scope, the cap. It passes with the store wired to
// nothing at all, and that is exactly what it did on 8 Sep 2026: a merge was
// reviewed, a session grepped `web/` for the store's seven exported call sites,
// found ZERO, and reported the whole tab strip as deleted. The gate was green
// and it was right to be: the store was fine and the caller was fine and no test
// crossed between them.
//
// The report was wrong for a second reason worth writing down, because it is the
// reason a person cannot trust a grep in this repository. `deep-link-screen.tsx`
// carried a raw NUL and a raw SOH in a memo key, which made `file(1)` call the
// whole file `data`, so plain `grep` SKIPPED IT IN SILENCE rather than reporting
// a match. Node reads it fine, so every seam test in the repo kept reading it
// and kept passing. The bytes are escapes now (see that file's own note) and
// this suite reads through Node either way.
//
// So the invariant here is the JOIN, in both directions:
//   i   · the shell really draws a strip from tab-shaped crumbs, and the LIVE
//         tab is the one without a link;
//   ii  · the deep-link spine really hands it one;
//   iii · and the spine picks the live tab by WHICH TAB IS ACTIVE, never by
//         position — the defect the owner reported as "I cannot click the last
//         tab".

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import * as React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { stripComments } from "@shared/rules/source-scan"
import {
  activateTab,
  activeTabIdSnapshot,
  activeTabPathSnapshot,
  forgetOpenTabs,
  MAX_OPEN_TABS,
  NEW_TAB_PATH,
  openBeside,
  openTabsSnapshot,
  setWorkspaceScope,
  tabStripState,
} from "@/lib/workspace-tabs"

// The shell mounts the profile menu, which asks Next for a router. Mocked so
// this suite is about the strip; nothing below reads the router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/t/t1/beta",
  useSearchParams: () => new URLSearchParams(),
}))

import { AppShell } from "@/components/shell/app-shell"

const HERE = dirname(fileURLToPath(import.meta.url))
const SPINE = join(HERE, "..", "components", "deep-link", "deep-link-screen.tsx")
const spine = () => readFileSync(SPINE, "utf8")

afterEach(cleanup)

describe("the workspace tab strip", () => {
  // ── i · IT DRAWS ──────────────────────────────────────────────────────────
  //
  // THREE TABS, AND THE LIVE ONE IN THE MIDDLE. That arrangement is the whole
  // point of the fixture and it was got wrong once while this file was being
  // written: with two tabs and the live one LAST, "the active tab is live" and
  // "the last tab is live" give the identical DOM, so the test passed with the
  // shell no longer forwarding `activeIndex` at all — the kit falls back to its
  // own last-item default and the owner's bug comes back through a second door.
  // A fixture that cannot tell two rules apart is not testing either of them.
  it("draws one tab per open tab, and the LIVE one — not the last — carries no link", () => {
    render(
      <AppShell
        active={{ teamId: "t1", teamName: "Kwapso", rights: {}, role: "Owner" } as never}
        breadcrumbs={[
          { label: "Alpha", href: "/t/t1/alpha", closeKey: "/t/t1/alpha" },
          { label: "Beta", closeKey: "/t/t1/beta" },
          { label: "Gamma", href: "/t/t1/gamma", closeKey: "/t/t1/gamma" },
        ]}
        onCloseCrumb={() => {}}
        activeCrumbIndex={1}
      >
        <div>body</div>
      </AppShell>
    )

    for (const label of ["Alpha", "Beta", "Gamma"]) {
      expect(screen.queryByText(label), `${label} must be drawn`).not.toBeNull()
    }

    // THE COUNT, said as a count: one close button per
    // three tabs. A strip
    // tab is drawn, fails here.
    const closers = [...document.querySelectorAll("button[aria-label]")].filter((b) =>
      /close/i.test(b.getAttribute("aria-label") ?? "")
    )
    expect(closers.length, "one close button per open tab").toBe(3)

    // AND THE LINK RULE, which is what discriminates. The live tab is the page
    // in front of you and has nowhere to go; BOTH the others are real links,
    // Gamma included. If `activeIndex` stops reaching the kit, Gamma loses its
    // href instead of Beta and this list comes back as ["/t/t1/alpha", "/t/t1/beta"].
    // Filtered to REAL in-app hrefs (`/…`) — since 17 Sep 2026 the strip also
    // draws a trailing pinned "+" (its own describe block, below), a real
    // anchor too but carrying a fragment href, never a path; this fixture is
    // about which CRUMB carries a link, not about that pinned item at all.
    const hrefs = [...document.querySelectorAll("a")]
      .map((a) => a.getAttribute("href"))
      .filter((href): href is string => !!href && href.startsWith("/"))
    expect(hrefs).toEqual(["/t/t1/alpha", "/t/t1/gamma"])
  })

  // ── ii · THE SPINE FEEDS IT ───────────────────────────────────────────────
  it("the deep-link spine asks the store and forwards all three props to the shell", () => {
    const src = stripComments(spine())

    // THE CANARY FIRST. Every assertion below is a substring search, and a
    // substring search over an empty string reports the same all-clear as one
    // over a file that is fine. This file has been unreadable to one common
    // tool already; it will not be silently unreadable to this suite. The
    // landmark is deliberately NOT part of the tab feature — a file that had
    // lost the strip entirely would still be rendering the engine.
    expect(spine().length, "the deep-link spine was not read off disk").toBeGreaterThan(30_000)
    expect(src, "the spine must still render the module content").toContain("ModuleContent")
    expect(src, "the spine must still render the shell").toContain("<AppShell")

    expect(src, "the strip state must come from the one store seam").toContain("tabStripState(")

    // Every shell the spine renders gets the full set. Two today (the error
    // shell and the ordinary one); counted rather than assumed, so a third that
    // forgets is caught rather than averaged away.
    const shells = src.split("<AppShell").length - 1
    expect(shells, "expected the spine to render at least one AppShell").toBeGreaterThan(0)
    for (const prop of ["breadcrumbs={", "onCloseCrumb={", "activeCrumbIndex={"]) {
      expect(
        src.split(prop).length - 1,
        `every <AppShell> in the spine must pass ${prop} — ${shells} shells, ` +
          `${src.split(prop).length - 1} carrying this prop`
      ).toBe(shells)
    }
  })

  // ── iii · BY ACTIVE, NOT BY POSITION ──────────────────────────────────────
  it("the live tab is chosen by which tab is active, never by its position", () => {
    const src = stripComments(spine())
    expect(spine().length, "the deep-link spine was not read off disk").toBeGreaterThan(30_000)
    expect(src, "the spine must still build the tab crumbs").toContain("stripCrumbs")

    expect(
      src,
      "the tab that carries no href must be the ACTIVE one. `index === openTabs.length - 1` " +
        "asks which tab is LAST, which stopped meaning the same thing the day the store " +
        "stopped re-ordering: on any tab but the last it strips the link off the wrong tab, " +
        "and the owner cannot click it."
    ).not.toContain("openTabs.length - 1")
    expect(src, "the href must be gated on the active index").toContain("index === activeTabIndex")
  })

  // ── THE STRIP'S OWN PINNED "+", AND CMD/CTRL-T ────────────────────────────
  //
  // The client's ruling, 17 Sep 2026, on the content strip growing the
  // assistant strip's own "+": "also add the plus tab, like in the
  // assistant... the same rules as there." Both doors call the store's own
  // `openNewTab`, so these render the REAL store (`setWorkspaceScope` /
  // `forgetOpenTabs`, imported above) rather than a mock — `openNewTab` and
  // `NEW_TAB_PATH` are read by `app-shell.tsx` straight off the module, not
  // through a prop this file could substitute.
  describe("the strip's own \"+\", and cmd/ctrl-T", () => {
    it('the pinned "+" opens a fresh tab on /new, labelled "New tab", beside the active one', () => {
      forgetOpenTabs()
      setWorkspaceScope("wired-test-user:new-tab-plus")
      const onNavigate = vi.fn()
      render(
        <AppShell
          active={{ teamId: "t1", teamName: "Kwapso", rights: {}, role: "Owner" } as never}
          breadcrumbs={[{ label: "Alpha", href: "/t/t1/alpha", closeKey: "tab-alpha" }]}
          onCloseCrumb={() => {}}
          activeCrumbIndex={0}
          onNavigate={onNavigate}
        >
          <div>body</div>
        </AppShell>
      )
      fireEvent.click(screen.getByRole("link", { name: "New tab" }))
      expect(onNavigate).toHaveBeenCalledWith(NEW_TAB_PATH)
      expect(activeTabPathSnapshot()).toBe(NEW_TAB_PATH)
      const opened = openTabsSnapshot().find((t) => t.steps[t.cursor]?.path === NEW_TAB_PATH)
      expect(opened?.steps[opened.cursor]?.label).toBe("New tab")
    })

    it("cmd/ctrl-T opens the same /new tab when nothing editable has focus", () => {
      forgetOpenTabs()
      setWorkspaceScope("wired-test-user:new-tab-cmdt")
      const onNavigate = vi.fn()
      render(
        <AppShell
          active={{ teamId: "t1", teamName: "Kwapso", rights: {}, role: "Owner" } as never}
          breadcrumbs={[{ label: "Alpha", href: "/t/t1/alpha", closeKey: "tab-alpha" }]}
          onCloseCrumb={() => {}}
          activeCrumbIndex={0}
          onNavigate={onNavigate}
        >
          <div>body</div>
        </AppShell>
      )
      fireEvent.keyDown(document, { key: "t", metaKey: true })
      expect(onNavigate).toHaveBeenCalledWith(NEW_TAB_PATH)
      expect(activeTabPathSnapshot()).toBe(NEW_TAB_PATH)
    })

    it("cmd/ctrl-T does nothing while focus is sitting in a text field — the letter belongs to the field", () => {
      forgetOpenTabs()
      setWorkspaceScope("wired-test-user:new-tab-cmdt-input")
      const onNavigate = vi.fn()
      render(
        <>
          <input aria-label="typing" />
          <AppShell
            active={{ teamId: "t1", teamName: "Kwapso", rights: {}, role: "Owner" } as never}
            breadcrumbs={[{ label: "Alpha", href: "/t/t1/alpha", closeKey: "tab-alpha" }]}
            onCloseCrumb={() => {}}
            activeCrumbIndex={0}
            onNavigate={onNavigate}
          >
            <div>body</div>
          </AppShell>
        </>
      )
      screen.getByLabelText("typing").focus()
      fireEvent.keyDown(document, { key: "t", metaKey: true })
      expect(onNavigate).not.toHaveBeenCalled()
      expect(openTabsSnapshot()).toHaveLength(0)
    })
  })

  // ── THE CLIENT'S RULING, 17 SEP 2026, VERBATIM ──────────────────────────
  //
  //   "When I open a new tab from an existing tab, every time, it needs to
  //    be to the immediate right of the tab that is active."
  //
  // The store's own suite (`workspace-tabs.test.ts`) proves `openNewTab`
  // against this exhaustively; this block's own job is the WIRING half —
  // that pressing "+" or cmd/ctrl-T through the REAL, rendered shell reaches
  // that same door with the real store underneath, in every position a
  // person might have left the active tab, and survives eviction when the
  // strip is already full. `openBeside` (imported above) seeds the fixture
  // the same way a person accumulates tabs by cmd-clicking, before the "+"
  // press each test is actually about.
  describe("pressing \"+\" or cmd/ctrl-T lands the new tab at activeIndex + 1", () => {
    function renderShellWith(onNavigate: (path: string) => void) {
      render(
        <AppShell
          active={{ teamId: "t1", teamName: "Kwapso", rights: {}, role: "Owner" } as never}
          breadcrumbs={[{ label: "Alpha", href: "/t/t1/alpha", closeKey: "tab-alpha" }]}
          onCloseCrumb={() => {}}
          activeCrumbIndex={0}
          onNavigate={onNavigate}
        >
          <div>body</div>
        </AppShell>
      )
    }

    it('"+" lands at activeIndex + 1 with the active tab FIRST', () => {
      forgetOpenTabs()
      setWorkspaceScope("wired-test-user:plus-pos-first")
      openBeside("/a", "A")
      openBeside("/b", "B")
      openBeside("/c", "C")
      const ids = openTabsSnapshot().map((t) => t.id)
      activateTab(ids[0] ?? "")
      const prevActiveIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
      renderShellWith(vi.fn())
      fireEvent.click(screen.getByRole("link", { name: "New tab" }))
      const newIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
      expect(newIndex).toBe(prevActiveIndex + 1)
    })

    it('"+" lands at activeIndex + 1 with the active tab in the MIDDLE', () => {
      forgetOpenTabs()
      setWorkspaceScope("wired-test-user:plus-pos-middle")
      openBeside("/a", "A")
      openBeside("/b", "B")
      openBeside("/c", "C")
      const ids = openTabsSnapshot().map((t) => t.id)
      activateTab(ids[1] ?? "")
      const prevActiveIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
      renderShellWith(vi.fn())
      fireEvent.click(screen.getByRole("link", { name: "New tab" }))
      const newIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
      expect(newIndex).toBe(prevActiveIndex + 1)
    })

    it('"+" lands at activeIndex + 1 with the active tab LAST', () => {
      forgetOpenTabs()
      setWorkspaceScope("wired-test-user:plus-pos-last")
      openBeside("/a", "A")
      openBeside("/b", "B")
      openBeside("/c", "C")
      const ids = openTabsSnapshot().map((t) => t.id)
      activateTab(ids[2] ?? "") // already last/active
      const prevActiveIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
      renderShellWith(vi.fn())
      fireEvent.click(screen.getByRole("link", { name: "New tab" }))
      const newIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
      expect(newIndex).toBe(prevActiveIndex + 1)
    })

    it("cmd/ctrl-T lands at activeIndex + 1 too, not just the pinned \"+\"", () => {
      forgetOpenTabs()
      setWorkspaceScope("wired-test-user:cmdt-pos-middle")
      openBeside("/a", "A")
      openBeside("/b", "B")
      openBeside("/c", "C")
      const ids = openTabsSnapshot().map((t) => t.id)
      activateTab(ids[1] ?? "")
      const prevActiveIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
      renderShellWith(vi.fn())
      fireEvent.keyDown(document, { key: "t", metaKey: true })
      const newIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
      expect(newIndex).toBe(prevActiveIndex + 1)
    })

    it('with the strip already at MAX_OPEN_TABS, "+" eviction still leaves the new tab immediately right of the active one', () => {
      forgetOpenTabs()
      setWorkspaceScope("wired-test-user:plus-pos-full")
      for (let i = 0; i < MAX_OPEN_TABS; i++) openBeside(`/s${String(i)}`, `S${String(i)}`)
      const ids = openTabsSnapshot().map((t) => t.id)
      expect(ids).toHaveLength(MAX_OPEN_TABS)
      const anchor = ids[3] ?? ""
      activateTab(anchor)
      renderShellWith(vi.fn())
      fireEvent.click(screen.getByRole("link", { name: "New tab" }))
      expect(openTabsSnapshot()).toHaveLength(MAX_OPEN_TABS) // the ceiling held
      const anchorIndex = openTabsSnapshot().findIndex((t) => t.id === anchor)
      expect(anchorIndex, "the tab she opened FROM must survive its own eviction pass").toBeGreaterThanOrEqual(0)
      const newIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
      expect(newIndex).toBe(anchorIndex + 1)
    })
  })

  // ── AND THE STORE'S OWN ANSWER, so the two halves cannot drift apart ──────
  it("tabStripState names the active tab, and stands the set down when it is absent", () => {
    // ONE STEP EACH — a tab's own trail shape since 17 Sep 2026
    // (`workspace-tabs.ts`'s `OpenTab.steps`/`cursor`); `tabStripState` reads
    // a tab's CURRENT step, never a flat `.path`/`.label` a tab no longer has.
    const tabs = [
      { id: "a", steps: [{ path: "/t/t1/alpha", label: "Alpha" }], cursor: 0 },
      { id: "b", steps: [{ path: "/t/t1/beta", label: "Beta" }], cursor: 0 },
      { id: "c", steps: [{ path: "/t/t1/gamma", label: "Gamma" }], cursor: 0 },
    ]
    // Standing on the MIDDLE tab: active is 1, and "last" would have been 2.
    expect(tabStripState(tabs, "/t/t1/beta", true)).toEqual({ showTabSet: true, activeIndex: 1 })
    // An address that is not in the set is the ordinary trail, not an error.
    expect(tabStripState(tabs, "/welcome", true).showTabSet).toBe(false)
    // A phone never gets the set, whatever the address.
    expect(tabStripState(tabs, "/t/t1/beta", false).showTabSet).toBe(false)
  })
})
