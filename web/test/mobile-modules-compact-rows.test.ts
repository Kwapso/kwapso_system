import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, "..")

/* THE PHONE REAL-ESTATE LANE, 25 SEP 2026 — M8 ("on a phone, the list is the
 * page"). Five module-level fixes, each pinned here off the source rather
 * than by rendering a whole screen (the same technique
 * `default-tab-is-first.test.ts` and `accounts-dashboard-tab.test.ts` use):
 * the hard limit for this lane was "add no components, remove no features,
 * nothing changes at `sm` and above" — so every fix below is a responsive
 * class or a phone-only branch of an existing value, and what these checks
 * pin is that the DESKTOP path stays untouched while the phone path exists
 * at all.
 */

describe("phone real estate — module-level compaction", () => {
  it("Accounts opens on List, not Gallery, on a phone with nothing remembered", () => {
    const src = readFileSync(join(WEB, "components/accounts/accounts-screen.tsx"), "utf8")
    // Desktop's own first-load default ("gallery") is proved unchanged by
    // accounts-dashboard-tab.test.ts's sibling file; this only proves the
    // phone branch exists on the SAME `useState` call.
    expect(
      src,
      "the accounts gallery/list/map `useState` no longer branches on `isPhone`"
    ).toMatch(/React\.useState<"gallery" \| "list" \| "map">\(isPhone \? "list" : "gallery"\)/)
  })

  it("Apps hides the cover mark below `sm`, leaving the badge/title/subtitle", () => {
    const src = readFileSync(join(WEB, "components/apps/apps-screen.tsx"), "utf8")
    const cardAt = src.indexOf("function appGalleryCard(")
    expect(cardAt, "could not find `appGalleryCard`").toBeGreaterThan(-1)
    const card = src.slice(cardAt, cardAt + 2500)
    expect(
      card,
      "the app gallery card's cover mark is not wrapped in a `hidden sm:block` guard"
    ).toMatch(/className="hidden sm:block">\s*<AppMark app=\{app\} size="band" \/>/)
  })

  it("Members switches to PersonCard's horizontal orientation on a phone", () => {
    const src = readFileSync(join(WEB, "components/team/members-gallery.tsx"), "utf8")
    expect(src, "no `useIsPhone` import").toMatch(/from "@\/lib\/use-is-phone"/)
    expect(
      src,
      "PersonCard's `orientation` prop is not wired to `isPhone`"
    ).toMatch(/orientation=\{isPhone \? "horizontal" : "vertical"\}/)
  })

  it("Backlog/Stories reflows the phase+assignee lines onto one row below `sm`", () => {
    const src = readFileSync(join(WEB, "components/work/stories-screen.tsx"), "utf8")
    expect(
      src,
      "the board card's description block no longer carries the `max-sm:flex-row` reflow"
    ).toMatch(/flex flex-col gap-1 max-sm:flex-row max-sm:flex-wrap max-sm:items-center/)
  })

  it("Waves search keeps a 200px floor below `sm`, ahead of the filter/sort/view lane", () => {
    const src = readFileSync(join(WEB, "components/work/wave-finder.tsx"), "utf8")
    expect(
      src,
      "the search wrapper no longer carries a `max-sm:min-w-[200px]` floor"
    ).toMatch(/cn\(TOOLBAR_SEARCH_SLOT, "max-sm:min-w-\[200px\]"\)/)
  })

  it("the phone-default-tab helper is a single shared function, not three copies", () => {
    // Tickets, Logs and Accounts each call `phoneFirstTab` rather than
    // reimplementing "record tab on a phone, dashboard elsewhere" — the
    // planner's own ask ("one small shared helper... rather than three
    // copies"). This does not re-check each call site's own tab choice
    // (default-tab-is-first.test.ts and logs-dashboard.test.tsx already pin
    // those); it only pins that the helper exists once and is reused.
    const tabsView = readFileSync(join(WEB, "..", "shared/web/screen-engine/tabs-view.tsx"), "utf8")
    expect(tabsView, "no `phoneFirstTab` export in tabs-view.tsx").toMatch(
      /export function phoneFirstTab</
    )
    const callSites = [
      "components/tickets/tickets-collection.tsx",
      "components/work/time-screen.tsx",
      "components/accounts/accounts-screen.tsx",
    ]
    for (const path of callSites) {
      const src = readFileSync(join(WEB, path), "utf8")
      expect(src, `${path} does not call phoneFirstTab(`).toMatch(/phoneFirstTab\(/)
    }
  })
})
