// SETTINGS › MODULES AND THE APP'S OWN MODULES TAB RENDER THE SAME CARD.
//
// Client's ruling, 17 Sep 2026, verbatim, about the app record's Modules tab:
// "I want it to look exactly like the settings modules, this kind of
// gallery with the icons." The brief behind this change is explicit that the
// two walls must share ONE component rather than two hand-copies of the same
// JSX — this suite proves both halves of that: the component itself (a real
// render), and that BOTH call sites actually import and use it (read off
// disk, the same technique web/test/knowledge-gallery-card.test.tsx already
// uses for a sibling wall).

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { GalleryCard } from "@/components/records/gallery-card"

vi.mock("@shared/web/language", () => ({ useT: () => (s: string) => s }))

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")
function read(rel: string): string {
  return readFileSync(join(ROOT, ...rel.split("/")), "utf8")
}

afterEach(cleanup)

describe("GalleryCard — the one component both walls render", () => {
  it("draws the icon, the title, and a real anchor when href is given", () => {
    render(<GalleryCard href="/settings/roles" icon="gear" title="Roles" />)
    expect(screen.getByText("Roles")).toBeTruthy()
    const link = screen.getByRole("link")
    expect(link.getAttribute("href")).toBe("/settings/roles")
  })

  it("draws no anchor at all when href is omitted — a record with no page of its own", () => {
    render(<GalleryCard icon="gear" title="Settings" />)
    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.getByText("Settings")).toBeTruthy()
  })

  it("draws topBadge and actions when given, neither of them wrapped in an anchor", () => {
    render(
      <GalleryCard
        icon="squares-four"
        title="Billing"
        topBadge={<span>3 open tickets</span>}
        actions={<button>Edit</button>}
      />
    )
    expect(screen.getByText("3 open tickets")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy()
  })
})

describe("both galleries call GalleryCard — never a second hand-copy of its JSX", () => {
  it("Settings › Modules imports GalleryCard and renders it for its wall, passing href and no actions", () => {
    const src = read("web/components/screens/settings-screen.tsx")
    expect(src).toMatch(/import\s*\{\s*GalleryCard\s*\}\s*from\s*"@\/components\/records\/gallery-card"/)
    const at = src.indexOf("<GalleryCard")
    expect(at, "Settings › Modules' own wall call site").toBeGreaterThan(-1)
    const tag = src.slice(at, src.indexOf("/>", at))
    expect(tag, "a pure destination card — it navigates").toMatch(/href=/)
    expect(tag, "nothing to edit or switch off from a nav card").not.toMatch(/actions=/)
    // NOT a second copy of the card's own JSX (no bare `<Card variant="raised">`
    // left standing beside the import) — the whole point of extracting it.
    expect(src).not.toMatch(/<Card\s+key=\{page\.segment\}/)
  })

  it("the app's Modules tab imports GalleryCard and renders it for its own wall, passing actions and no href", () => {
    const src = read("web/components/apps/modules-panel.tsx")
    expect(src).toMatch(/import\s*\{\s*GalleryCard\s*\}\s*from\s*"@\/components\/records\/gallery-card"/)
    const at = src.indexOf("<GalleryCard")
    const nextCall = src.indexOf("<InternalRecordDialog") // the next JSX sibling after the wall
    expect(at, "the app Modules tab's own wall call site").toBeGreaterThan(-1)
    expect(nextCall).toBeGreaterThan(at)
    // A generous window covering the whole (multi-line, multi-prop) call site
    // without needing to parse nested self-closing tags inside `actions`.
    const block = src.slice(at, nextCall)
    expect(block, "edit / switch off live in actions, not a page to open").toMatch(/actions=\{/)
    expect(block).not.toMatch(/\bhref=/)
    expect(block, "the open-ticket count rides topBadge, in the title's own wrapper span").toMatch(/topBadge=\{/)
  })
})
