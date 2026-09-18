// THE ACCOUNT FACET WEARS ITS OWN FACE — client ruling, 18 Sep 2026, verbatim:
// "on filter account i want to see the icons, not only initials." Every
// toolbar filter that narrows a collection by WHICH ACCOUNT already draws a
// `<RecordMark>` beside the word (Tickets, Waves, Apps, Inputs, Meetings) —
// this locks the one seam every one of those now shares, `accountFacetOption`
// (web/lib/collection-filters.ts), and the one gap it closed: Knowledge's own
// "Filed under" compartment facet, whose account options carried a bare word
// and no mark at all until this change.

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { accountFacetOption } from "@/lib/collection-filters"

afterEach(cleanup)

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")

describe("accountFacetOption — the one seam that turns an account into a facet's mark", () => {
  it("carries the door's own value and label straight through", () => {
    const option = accountFacetOption({ id: "acc_1", name: "Bergman S.A.", logoUrl: null })
    expect(option.value).toBe("acc_1")
    expect(option.label).toBe("Bergman S.A.")
  })

  it("draws the account's own picture when it has one", () => {
    const option = accountFacetOption({
      id: "acc_1",
      name: "Bergman S.A.",
      logoUrl: "https://cdn.example.com/bergman-logo.png",
    })
    expect(option.mark, "a mark was drawn at all").toBeTruthy()
    const { container } = render(<>{option.mark}</>)
    const img = container.querySelector("img")
    expect(img, "the picture, not the fallback letter").toBeTruthy()
    expect(img?.getAttribute("src")).toBe("https://cdn.example.com/bergman-logo.png")
    // aria-hidden — R35/record-mark.tsx: the mark carries no meaning the
    // record's own name (rendered beside it by the facet row) does not
    // already say.
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy()
  })

  it("falls through to the account's own initial where it has no picture — never an empty box", () => {
    const option = accountFacetOption({ id: "acc_2", name: "Kwapso", logoUrl: null })
    const { container } = render(<>{option.mark}</>)
    expect(container.querySelector("img"), "no picture to draw").toBeNull()
    expect(container.textContent).toBe("K")
  })

  it("falls through the same way when logoUrl is simply absent from the row", () => {
    const option = accountFacetOption({ id: "acc_3", name: "amble" })
    const { container } = render(<>{option.mark}</>)
    expect(container.querySelector("img")).toBeNull()
    expect(container.textContent).toBe("A")
  })
})

describe("the knowledge screen's own \"Filed under\" facet routes every account option through it", () => {
  it("imports the shared seam rather than drawing its own <RecordMark>", () => {
    const src = readFileSync(join(ROOT, "web", "components", "knowledge", "knowledge-screen.tsx"), "utf8")
    expect(src).toMatch(/import\s*\{\s*accountFacetOption,\s*translatedFacets\s*\}\s*from\s*"@\/lib\/collection-filters"/)
    // "The agency" is not a record and wears no mark — only the ACCOUNT
    // options beside it route through the seam.
    const at = src.indexOf("compartment: [")
    expect(at, "the compartment facet's own option list").toBeGreaterThan(-1)
    const block = src.slice(at, at + 400)
    expect(block).toMatch(/value:\s*"agency"/)
    expect(block, "every account option shares the same builder, not a hand-drawn mark").toMatch(
      /\.\.\.accountFacetOption\(a\)/
    )
    expect(block, "no second, hand-rolled <RecordMark> in this facet").not.toMatch(/<RecordMark/)
  })

  it("passes the whole account row — logoUrl included, never dropped by a narrower prop type", () => {
    const src = readFileSync(join(ROOT, "web", "components", "knowledge", "knowledge-screen.tsx"), "utf8")
    // The bug this locks against: `companiesQ`'s own door (`tenancy.accounts`)
    // always returned `logoUrl`, but this screen's own prop type used to
    // narrow it to `{ id: string; name: string }[]` before the compartment
    // facet ever saw it — the picture was thrown away one file up from the
    // real fix, not missing from the door.
    expect(src).toMatch(/companiesQ:\s*\{\s*data:\s*Account\[\]\s*\|\s*undefined\s*\}/)
    expect(src).not.toMatch(/companiesQ:\s*\{\s*data:\s*\{\s*id:\s*string;\s*name:\s*string\s*\}\[\]/)
  })
})
