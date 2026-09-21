// K62, 22 Sep 2026 (documents/UI-RULEBOOK.md): Aurora picked "Compact pill,
// bottom centre" for the "not live" hint over a full width bar. This proves
// three things the design page and the build brief both name: the pill
// itself renders fixed, bottom centred, carrying the sentence, Refresh and
// dismiss; a dismiss is scoped to ONE disconnection, not every future one;
// and neither shell mounts `<LiveStatus />` back inside its own scrolling
// content column, the inline strip layout this build retired.
//
// The pill's own close mark is named "Dismiss", not "Close": a workspace
// tab's own close button carries "Close" (`BreadcrumbFolders`, the kit), and
// this pill is not a tab. `web/test/workspace-tabs-are-wired.test.tsx`'s own
// census of the tab strip's close buttons would otherwise count this one too.

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const { liveState } = vi.hoisted(() => ({ liveState: { live: false } }))

vi.mock("@shared/web/language", () => ({ useT: () => (s: string) => s }))
vi.mock("@shared/web/realtime", () => ({ useTeamLive: () => liveState.live }))
vi.mock("@shared/web/store", () => ({ invalidatePrefix: vi.fn() }))

import { LiveStatus } from "@shared/web/live-status"

afterEach(() => {
  liveState.live = false
  cleanup()
})

describe("LiveStatus, the compact bottom centred pill", () => {
  it("renders nothing while the team socket is up", () => {
    liveState.live = true
    render(<LiveStatus />)
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("renders fixed, bottom centred, with the sentence, Refresh and dismiss", () => {
    liveState.live = false
    render(<LiveStatus />)
    const status = screen.getByRole("status")
    // Fixed to the viewport and centred, not a strip in the content flow.
    expect(status.className).toMatch(/\bfixed\b/)
    expect(status.className).toMatch(/\binset-x-0\b/)
    expect(status.className).toMatch(/\bjustify-center\b/)
    expect(status.className).toMatch(/\bbottom-\[/)
    // jest-dom is deliberately not set up in this workspace (test/wave-detail.test.tsx):
    // `getBy*` already throws when nothing matches, so finding the node IS the assertion.
    expect(screen.getByText("Not updating live right now.")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Refresh" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeTruthy()
  })

  it("close hides the pill until the socket disconnects again", () => {
    liveState.live = false
    const { rerender } = render(<LiveStatus />)
    expect(screen.getByRole("status")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }))
    expect(screen.queryByRole("status")).toBeNull()

    // Still the SAME disconnection: re-rendering alone must not undo a
    // dismissal nobody asked to undo.
    rerender(<LiveStatus />)
    expect(screen.queryByRole("status")).toBeNull()

    // The link comes back...
    liveState.live = true
    rerender(<LiveStatus />)
    expect(screen.queryByRole("status")).toBeNull()

    // ...and drops again: a fresh disconnection, so the hint is owed again.
    liveState.live = false
    rerender(<LiveStatus />)
    expect(screen.getByRole("status")).toBeTruthy()
  })
})

describe("no shell mounts LiveStatus inline in its own content column", () => {
  const REPO_ROOT = join(__dirname, "..", "..")

  it("web/components/shell/app-shell.tsx mounts it as a sibling of ScreenShell, not inside its content column", () => {
    const src = readFileSync(join(REPO_ROOT, "web", "components", "shell", "app-shell.tsx"), "utf8")
    const contentColumnClose = src.indexOf("mx-auto flex w-full max-w-none")
    const screenShellClose = src.indexOf("</ScreenShell>")
    const mount = src.indexOf("<LiveStatus")
    expect(contentColumnClose).toBeGreaterThan(-1)
    expect(screenShellClose).toBeGreaterThan(-1)
    expect(mount).toBeGreaterThan(-1)
    // The mount sits after the content column's own closing div AND after
    // ScreenShell itself closes, so it is a sibling of the routed screen
    // rather than a child of the page width column that used to push it
    // down.
    expect(mount).toBeGreaterThan(contentColumnClose)
    expect(mount).toBeGreaterThan(screenShellClose)
  })

  it("web-portal/components/portal-shell.tsx mounts it as a sibling of <main>, not inside it", () => {
    const src = readFileSync(join(REPO_ROOT, "web-portal", "components", "portal-shell.tsx"), "utf8")
    // Two <main>/</main> pairs live in this file (a signed-out failure frame,
    // and the real signed-in one this test cares about), so the close tag is
    // searched for starting FROM the matched open tag rather than from 0.
    const mainOpen = src.indexOf('<main className="mx-auto w-full max-w-3xl')
    const mainClose = src.indexOf("</main>", mainOpen)
    const mount = src.indexOf("<LiveStatus")
    expect(mainOpen).toBeGreaterThan(-1)
    expect(mainClose).toBeGreaterThan(mainOpen)
    expect(mount).toBeGreaterThan(-1)
    expect(mount).toBeGreaterThan(mainClose)
  })

  it("each shell imports LiveStatus exactly once and mounts it exactly once", () => {
    for (const rel of ["web/components/shell/app-shell.tsx", "web-portal/components/portal-shell.tsx"]) {
      const src = readFileSync(join(REPO_ROOT, rel), "utf8")
      const mounts = src.match(/<LiveStatus\s*\/>/g) ?? []
      expect(mounts, rel).toHaveLength(1)
    }
  })
})
