import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, "..")

/* A PAGE WITH NOTHING REMEMBERED OPENS THE TAB ON THE LEFT.
 *
 * The client's own rule, 2026-09-06: "by default, each time I load the page, if
 * there's no selected tab in memory, the tab that is loaded is the one to the
 * left. I'm saying this because now every time I refresh the ticket, I go to
 * All, but actually I should go to Triage."
 *
 * It broke the ordinary way: `useRemembered("ticket-facet", ALL)` was written
 * when All WAS the leading tab, Triage moved to the front hours earlier, and
 * the default stayed where it was. Nothing failed — a refresh simply landed two
 * tabs away from the one she had just asked to lead, which is invisible to
 * every other check here because both values are valid tabs.
 *
 * So the two are compared off the disk. This is not a Law of the Base: it
 * governs one screen's default rather than a shape every module must take, and
 * inventing a law for it would put a registry entry, a RULES.md row and a
 * golden-path line behind a two-line regression. It is a plain regression test,
 * which is the right weight for "these two lines must agree".
 */
describe("the ticket strip's default tab", () => {
  it("is the tab drawn first, not a tab that used to be first", () => {
    const src = readFileSync(join(WEB, "components/tickets/tickets-collection.tsx"), "utf8")

    // The GENERIC ARGUMENT is optional here. Pinned as `useRemembered<HelpFacet>`,
    // this broke on any purely local retype — widening the union, aliasing it, or
    // letting TypeScript infer it from the default and dropping the argument
    // altogether — none of which changes which tab the strip opens on. The key
    // and the default constant are what the law compares.
    // Desktop's default is now wrapped in `phoneFirstTab(recordTab, dashboardTab,
    // isPhone)` (M8: on a phone the record tab leads instead) — the DESKTOP
    // branch is `dashboardTab`, the second argument, and it must still agree
    // with the strip's own leading tab exactly as it did before that wrapper
    // existed.
    const remembered = src.match(
      /useRemembered\s*(?:<[^>()]*>)?\(\s*"ticket-facet"\s*,\s*phoneFirstTab\(\s*[A-Z_]+\s*,\s*([A-Z_]+)\s*,\s*isPhone\s*\)\s*\)/
    )
    expect(
      remembered,
      "could not find the remembered ticket facet's phone-aware default — if `useRemembered(\"ticket-facet\", phoneFirstTab(…))` was renamed or reshaped, teach this test the new spelling rather than deleting it"
    ).not.toBeNull()

    // The first `{ value: X, label: …` inside the strip's own `tabs:` array.
    const arrayAt = src.indexOf("tabs: [")
    expect(arrayAt, "could not find the tab strip's `tabs: [` array").toBeGreaterThan(-1)
    const firstTab = src.slice(arrayAt).match(/\{\s*value:\s*([A-Z_]+)\s*,/)
    expect(firstTab, "the tabs array's first entry does not name a constant").not.toBeNull()

    expect(
      remembered?.[1],
      `the strip opens on ${firstTab?.[1]} but a page with nothing remembered, on a desktop, defaults to ${remembered?.[1]}. ` +
        "The client's rule is that the leading tab is the default: move the tab, move the default."
    ).toBe(firstTab?.[1])
  })

  it("on a phone, opens on Triage instead — M8, the list is the page", () => {
    // Alaap's 25 Sep 2026 ruling: Dashboard costs a phone the very screen real
    // estate it doesn't have, so the record tab (Triage) leads there instead.
    // Desktop keeps Dashboard first (the test above) — this only pins the
    // phone branch of the same expression.
    const src = readFileSync(join(WEB, "components/tickets/tickets-collection.tsx"), "utf8")
    const remembered = src.match(
      /useRemembered\s*(?:<[^>()]*>)?\(\s*"ticket-facet"\s*,\s*phoneFirstTab\(\s*([A-Z_]+)\s*,\s*[A-Z_]+\s*,\s*isPhone\s*\)\s*\)/
    )
    expect(
      remembered,
      "could not find the remembered ticket facet's phone-aware default"
    ).not.toBeNull()
    expect(
      remembered?.[1],
      "on a phone with nothing remembered, the ticket strip should open on TRIAGE, not the desktop's Dashboard default"
    ).toBe("TRIAGE")
  })
})
