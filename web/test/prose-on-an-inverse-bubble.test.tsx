// PROSE THAT LANDS ON THE CHARCOAL FILL, AND THE MERGE THAT DECIDES ITS INK.
//
// The client, 7 September 2026, on a ticket's Conversation tab: "the text color
// here is wrong." Her own reply, in the bubble the kit paints
// `bg-surface-inverse text-ink-on-inverse`, was rendering at #4A4946 on
// #1A1918 — 1.95:1, under the 4.5:1 body floor by a factor of two. Bold and
// links in the same bubble were worse: #1A1918 on #1A1918, 1.00:1.
//
// The cause is that `ArticleBody` PAINTS ITS OWN INK rather than inheriting
// one: `text-ink-secondary` on the root, `--foreground` on links, bold and
// headings. All correct on paper; none of them true on the inverse fill. The
// app answers with one class list at the one call site that changed ground
// (`ON_INVERSE_UNTIL_THE_KIT_RULES`), and the kit gap is logged upstream —
// rich-text-view.tsx carries the argument in full.
//
// WHAT THIS TEST IS ACTUALLY FOR, AND WHY IT IS NOT A SCREENSHOT. That class
// list only works if it WINS a tailwind-merge fight against the component's
// own. This repo has been bitten twice in one week by a class that lost one
// silently — an arbitrary ground cancelling a named one, and a `shadow-none`
// filed under a different group from the shadow it meant to beat — and the
// symptom every time is not an error but a screen that looks slightly wrong to
// somebody who is not measuring. So the assertion is on the class list the
// merge PRODUCED, read off a real render, and it is written as whole class
// names rather than substrings: `[&_code]:text-ink-secondary` is a legitimate
// survivor (a code chip carries its own light fill), and a substring test would
// have called that a failure and taught the next person to loosen the check.

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ON_INVERSE_UNTIL_THE_KIT_RULES, RichText } from "@shared/web/rich-text-view"

/** The class names on the prose root, as whole words. */
function proseClasses(className?: string): string[] {
  const view = render(<RichText html="<p>Happy to — which address?</p>" className={className} />)
  const root = view.container.querySelector("[data-slot='article-body']")
  return (root?.getAttribute("class") ?? "").split(/\s+/).filter(Boolean)
}

describe("a reply drawn on the inverse fill", () => {
  afterEach(cleanup)

  it("keeps the kit's paper ink where the kit put it", () => {
    // The control, and it is load-bearing: without it, a green run above could
    // mean the kit had stopped painting an ink at all, and the class list this
    // app ships would be doing nothing while the test still passed.
    const classes = proseClasses()
    expect(classes, "ArticleBody's own body ink is the paper default").toContain("text-ink-secondary")
    expect(classes).toContain("[&_a]:text-foreground")
  })

  it("takes the on-inverse ink instead, on the root and on every register that names an absolute one", () => {
    const classes = proseClasses(ON_INVERSE_UNTIL_THE_KIT_RULES)

    // The root. Both survive the merge and the wrong one wins by emission order
    // if this ever stops being true.
    expect(classes).toContain("text-ink-on-inverse")
    expect(classes, "the paper ink must be MERGED AWAY, not merely followed").not.toContain(
      "text-ink-secondary"
    )

    // The registers that would otherwise be charcoal on charcoal — 1.00:1, an
    // invisible link rather than a dim one.
    for (const gone of [
      "[&_a]:text-foreground",
      "[&_:is(strong,b)]:text-foreground",
      "[&_:is(h2,h3,h4)]:text-foreground",
      "[&_blockquote]:text-muted-foreground",
    ]) {
      expect(classes, `${gone} is still in the list and still wins on the dark fill`).not.toContain(
        gone
      )
    }
    for (const kept of [
      "[&_a]:text-ink-on-inverse",
      "[&_:is(strong,b)]:text-ink-on-inverse",
      "[&_:is(h2,h3,h4)]:text-ink-on-inverse",
      "[&_blockquote]:text-ink-on-inverse-secondary",
    ]) {
      expect(classes).toContain(kept)
    }

    // A code chip brings its own light fill, so its dark ink is right wherever
    // it lands and must NOT be flipped — this is the class the substring
    // version of this test would have got wrong.
    expect(classes).toContain("[&_code]:text-ink-secondary")
  })
})
