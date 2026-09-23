// R83 — THE MANDATORY SPACE BETWEEN A TAB STRIP AND WHAT IT LABELS, FOR A TAB
// WHOSE BODY IS NOT A CARD.
//
// Aurora, 23 Sep 2026, verbatim: "on accounts dashbard, the mandatory space
// between tabs and content is missing".
//
// WHY IT WAS MISSING, AND WHY IT WAS MISSING EVERYWHERE. Since 21 Sep the
// strip pays NOTHING (`renderFolderTabs` merges `pb-0` over
// `--tab-content-gap` for every host it draws), so the whole distance is paid
// by what sits under it — and the only payer `web/app/globals.css` had written
// was `[data-slot="card"]`. A tab that is a collection is a `<CollectionCard>`
// and collects it. A tab that is a DASHBOARD is bare panels, and collected
// zero. Accounts showed the fault twice in one screen: the Dashboard tab's
// error and empty registers ARE plain `<Card>`s and picked the lead up, while
// the state with real figures in it sat flush against the tabs.
//
// ── WHY THIS SUITE HANDS EVERY SELECTOR TO A PARSER ─────────────────────────
//
// The first version of this file was four string searches over the text of
// `globals.css`, and every one of them passed against a fix that did nothing.
// The rule it was pinning wrote both exclusions into ONE condition,
// `:has(+ *:not([data-slot="card"]):not(:has(> …)))`, which is not a selector:
// the grammar forbids `:has()` inside `:has()`, so the prelude is unparsable
// and the browser throws the whole rule away. Nothing about that is visible —
// the stylesheet still loads, no warning is logged, and the computed
// `padding-bottom` is 0px in every case, exactly as it was before the "fix".
// Each sub-part parses perfectly on its own, so only asking a parser finds it.
//
// So this suite now asks one, TWICE OVER, because neither oracle is sufficient
// alone:
//
//   · `document.querySelector`, against real markup. It raises on a prelude no
//     browser would accept — but only once there is an element to evaluate
//     against, which is measured below and is why the case builds a fixture.
//   · A STRUCTURAL CENSUS of the file: no `:has()` argument may contain
//     another `:has()`. That is the spec's own words (Selectors 4: the
//     argument to `:has()` must not contain `:has()`), it needs no markup and
//     no engine, and it reaches EVERY rule in `globals.css` rather than the
//     four this law names — so the next person to write one is caught in a
//     file this lane does not own a line of.
//
// AND lightningcss, THE COMPILER THIS STYLESHEET ACTUALLY GOES THROUGH, IS NOT
// AN ORACLE HERE. It was asked directly: it parses the nested form happily and
// emits it into the built CSS. The rule therefore reaches the browser intact
// and is discarded there, which is why nothing in the build ever complained.
//
// WHAT THIS SUITE STILL PINS BY TEXT. Not "the accounts dashboard has a
// margin" — that is the per-screen hard-code the 2026-09-03 ruling refuses
// ("don't hard-code page by page, but rather you change the rule and you apply
// it everywhere"). It pins that the LAW pays it, from the same token the card
// rule reads; that the rule cannot double-pay a card or the wrapper around
// one; that the pinned-toolbar offset moves under the same conditions; and
// that the Accounts dashboard grows no lead of its own.
//
// A STYLESHEET STILL CANNOT BE MEASURED HERE — jsdom applies no cascade over a
// Tailwind build — so the last word on the four shapes is a browser against
// the deployed bundle. What a check can hold is that the rules are written,
// that a parser accepts them, and that they say one number.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, "..")

const GLOBALS = join(WEB, "app/globals.css")
const DASHBOARD = join(WEB, "components/accounts/accounts-dashboard.tsx")
const SCREEN = join(WEB, "components/accounts/accounts-screen.tsx")

/** THE FOUR RULES THIS LAW IS MADE OF, as two pairs.
 *
 * Each property is settled by a rule that PAYS and a rule that TAKES IT BACK
 * for the one shape the card rules above already reach — `paged-find.tsx`'s
 * own unconditional flow `<div>` around a `<CollectionCard>`. Two possible
 * selectors rather than one impossible one; see this file's own header, and
 * the block's own comment in `globals.css`, for what the impossible one cost.
 *
 * The cancelling half is strictly MORE SPECIFIC than the paying half
 * (`[data-slot="card"]:first-child` inside the `:has()` against a single
 * `:not([data-slot="card"])`), so the outcome cannot depend on source order. */
const RULES = [
  {
    what: "the strip pays the lead when its body is not a card",
    selector: '.pinned-strip:has(+ *:not([data-slot="card"]))',
    declaration: /padding-bottom:\s*var\(--toolbar-lead-gap\)/,
  },
  {
    what: "and takes it back for the wrapper whose first child IS a card",
    selector: '.pinned-strip:has(+ * > [data-slot="card"]:first-child)',
    declaration: /padding-bottom:\s*0/,
  },
  {
    what: "the pinned-toolbar offset grows with the strip",
    selector: '*:has(> .pinned-strip.pinned-strip-tight + *:not([data-slot="card"]))',
    declaration: /--pinned-chrome-h:\s*calc\(var\(--tab-strip-h\)\s*\+\s*var\(--toolbar-lead-gap\)\)/,
  },
  {
    what: "and is put back for that same wrapper",
    selector: '*:has(> .pinned-strip.pinned-strip-tight + * > [data-slot="card"]:first-child)',
    declaration: /--pinned-chrome-h:\s*var\(--tab-strip-h\)/,
  },
] as const

/** Strip comments before looking for a rule — every block in `globals.css`
 * carries a long prose header, and a selector QUOTED in one (this block's own
 * amendments quote several) is not a selector the browser ever sees.
 *
 * THE ONE TOKENISER, not a pair of regexes re-typed here: `shared/rules/
 * strip-comments.mjs`'s own header is the whole argument, and
 * `web/test/source-scan.test.ts` enforces that there is only ever one. A
 * block comment is spelled the same in CSS as in JavaScript, which is all this
 * file needs from it. */
function cssCode(source: string): string {
  return stripComments(source)
}

/** The declarations of the first rule whose selector list contains `selector`,
 * or `null`. Deliberately not a CSS parser: one balanced `{…}` after the
 * selector is the whole of what this file needs to read. */
function ruleBody(code: string, selector: string): string | null {
  const at = code.indexOf(selector)
  if (at === -1) return null
  const open = code.indexOf("{", at)
  const close = code.indexOf("}", open)
  return open === -1 || close === -1 ? null : code.slice(open + 1, close)
}

/** Every `:has(…)` argument in the file, with its balanced parentheses — the
 * one shape a text search cannot get right with a regex, because the argument
 * itself contains brackets. */
function hasArguments(code: string): string[] {
  const out: string[] = []
  for (let i = code.indexOf(":has("); i !== -1; i = code.indexOf(":has(", i + 1)) {
    let depth = 0
    for (let j = i + 4; j < code.length; j++) {
      if (code[j] === "(") depth += 1
      else if (code[j] === ")") {
        depth -= 1
        if (depth === 0) {
          out.push(code.slice(i + 5, j))
          break
        }
      }
    }
  }
  return out
}

describe("R83 — a tab whose body is not a card still gets the lead", () => {
  const code = cssCode(readFileSync(GLOBALS, "utf8"))

  it("writes selectors a real parser accepts", () => {
    // THE CASE THE FIRST VERSION OF THIS SUITE WAS MISSING. A prelude the
    // grammar refuses is discarded whole, silently, and the rule that is not
    // there looks exactly like the rule that is.
    //
    // THE FIXTURE IS LOAD-BEARING, and that is measured rather than tidiness.
    // jsdom's selector engine compiles LAZILY: against an EMPTY document it
    // accepts the very selector it rejects once there is an element to
    // evaluate. Both were run here — the same unparsable string came back "no
    // throw" on the runner's own blank document and `SyntaxError: Invalid
    // selector` the moment this markup existed, repeatably. So a case written
    // as `expect(() => document.querySelector(sel)).not.toThrow()` with no
    // markup is a case that cannot fail, which is the same shape of mistake as
    // the string searches it replaces. The markup below is the two shapes the
    // law is about: a strip, and a wrapper whose first child is a card.
    document.body.innerHTML =
      '<div class="pinned-strip pinned-strip-tight"></div><div><div data-slot="card"></div></div>'
    for (const { what, selector } of RULES)
      expect(
        () => document.querySelector(selector),
        `${what}: this selector is not one a browser will accept, so the rule is thrown away at parse time — ${selector}`
      ).not.toThrow()
  })

  it("matches the four real shapes, and only the right ones", () => {
    // THE HALF THE FIRST VERSION OF THIS SUITE HAD NO ANSWER FOR: not "is the
    // rule written" but "does it reach what it is about". Four shapes, built
    // as the app really builds them, each a strip followed by one of the four
    // bodies a tab can have:
    //
    //   A  a bare column           the dashboards (`AccountsDashboard`)
    //   B  a bare <section>        a state register, `TeamPanel`
    //   C  a card, next sibling    every `<CollectionCard>` collection
    //   D  a wrapper > card        `paged-find.tsx`'s own unconditional div
    //
    // A and B must be PAID by the strip; C must not (the card pays itself, on
    // its own `card-content`); D must be paid and then CANCELLED, because the
    // card inside it is already paying. jsdom evaluates `:has()` for real, so
    // this is a statement about what the selectors do rather than what they
    // say. What it cannot do is cascade a Tailwind build, so the last word on
    // the pixels is still a browser against the deployed bundle.
    const shape = (body: string) =>
      `<div class="col"><div class="pinned-strip pinned-strip-tight"></div>${body}</div>`
    document.body.innerHTML = [
      shape('<div class="body-a"></div>'),
      shape('<section class="body-b"></section>'),
      shape('<div class="body-c" data-slot="card"><div data-slot="card-content"></div></div>'),
      shape('<div class="body-d"><div data-slot="card"><div data-slot="card-content"></div></div></div>'),
    ].join("")

    const stripIn = (bodyClass: string) =>
      document.querySelector(`.col:has(> .${bodyClass}) > .pinned-strip`) as Element
    const pays = (bodyClass: string) => stripIn(bodyClass).matches(RULES[0].selector)
    const cancelled = (bodyClass: string) => stripIn(bodyClass).matches(RULES[1].selector)

    expect(pays("body-a"), "a bare dashboard column is not paid — this is exactly what she reported").toBe(true)
    expect(cancelled("body-a"), "the bare column's lead is cancelled again").toBe(false)
    expect(pays("body-b"), "a bare <section> body is not paid").toBe(true)
    expect(cancelled("body-b"), "the <section>'s lead is cancelled again").toBe(false)
    expect(pays("body-c"), "a card sibling is paid by the strip AS WELL as by its own card-content").toBe(false)
    expect(cancelled("body-c"), "a card sibling is matched by the cancelling rule, which is not its job").toBe(false)
    expect(pays("body-d"), "the paged-find wrapper is not reached at all").toBe(true)
    expect(
      cancelled("body-d"),
      "the paged-find wrapper is paid and never cancelled — every paged collection would pay 20px where the law says 10"
    ).toBe(true)

    // AND THE OFFSET PAIR ASKS THE SAME QUESTION OF THE CONTAINER. Same four
    // shapes, read one level up, so a pinned toolbar's `top` can never
    // disagree with the height the strip actually paints.
    const colOf = (bodyClass: string) => document.querySelector(`.col:has(> .${bodyClass})`) as Element
    expect(colOf("body-a").matches(RULES[2].selector)).toBe(true)
    expect(colOf("body-a").matches(RULES[3].selector)).toBe(false)
    expect(colOf("body-c").matches(RULES[2].selector)).toBe(false)
    expect(colOf("body-c").matches(RULES[3].selector)).toBe(false)
    expect(colOf("body-d").matches(RULES[2].selector)).toBe(true)
    expect(colOf("body-d").matches(RULES[3].selector)).toBe(true)
  })

  it("never nests :has() inside :has(), anywhere in globals.css", () => {
    // THE GENERAL FORM OF THE SAME FAULT, over the whole file rather than over
    // this law's four rules — the next person to write one is caught too, and
    // in a file this law does not own a line of. `:has()` may not contain
    // another `:has()` at any depth, including through a `:not()`, which is
    // exactly how the first version of this block hid it.
    const offenders = hasArguments(code).filter((arg) => arg.includes(":has("))
    expect(
      offenders,
      "these `:has()` arguments contain another `:has()` — the grammar forbids it and the whole rule is discarded: " +
        offenders.join(" | ")
    ).toEqual([])
  })

  it("pays the lead, from the same token the card rule reads", () => {
    const paying = RULES[0]
    const body = ruleBody(code, paying.selector)
    expect(
      body,
      "web/app/globals.css has no rule paying the tab-to-content lead for a body that is not a card — " +
        "a dashboard tab sits flush against its own tab strip, which is what she reported"
    ).not.toBeNull()
    expect(
      body,
      "the lead is paid, but not from `--toolbar-lead-gap` — a second number for one distance is what R83 exists to forbid"
    ).toMatch(paying.declaration)
    // A MARGIN WOULD BE THE BUG ONE ELEMENT LOWER. A margin between two
    // siblings is never painted, so the moment the strip pins, the body
    // carries the reserved space away with it and arrives flush against the
    // tabs — "maintain the space between tabs and content on all screens, even
    // when I scroll down", her own second sentence on 2026-09-03.
    expect(body, "the lead is a margin, which is not painted once the strip pins").not.toMatch(
      /margin-bottom:/
    )
  })

  it("never double-pays a card, nor the wrapper around one", () => {
    // THE TWO SHAPES THE CARD RULES ABOVE ALREADY REACH. A card that is the
    // strip's own next sibling never matches the paying rule at all
    // (`:not([data-slot="card"])`); a wrapper whose first child is a card
    // does, and is cancelled. Without the second, every collection in the app
    // would pay 20px where the law says 10.
    expect(code).toContain('.pinned-strip + [data-slot="card"] > [data-slot="card-content"]')
    const cancel = RULES[1]
    const body = ruleBody(code, cancel.selector)
    expect(
      body,
      "nothing cancels the lead for `paged-find.tsx`'s own flow wrapper, so every paged collection pays it twice"
    ).not.toBeNull()
    expect(body).toMatch(cancel.declaration)
    // AND THE CANCELLING HALF MUST BE ABLE TO WIN. It is written to be the
    // more specific of the two so order cannot decide it; if it is ever
    // rewritten to sit BEFORE the paying rule at equal specificity, this is
    // the line that should have caught it.
    expect(
      code.indexOf(cancel.selector),
      "the cancelling rule no longer follows the paying one — at equal specificity the wrapper would pay twice"
    ).toBeGreaterThan(code.indexOf(RULES[0].selector))
  })

  it("moves the pinned-toolbar offset under the same conditions", () => {
    // `--pinned-chrome-h` is what a pinned toolbar reads as its own `top`, and
    // the ordinary rule sets it to `var(--tab-strip-h)` — a CONSTANT derived
    // from the trigger's geometry, which does not learn about padding by
    // itself. A strip 10px taller with a stale offset lets a pinned toolbar
    // land 10px inside it. It is a real call site, not a hypothetical:
    // Settings › Team draws its toolbar inside `TeamPanel`, a bare `<div>`.
    for (const { what, selector, declaration } of RULES.slice(2)) {
      const body = ruleBody(code, selector)
      expect(body, `${what}: no such rule in globals.css`).not.toBeNull()
      expect(body, `${what}: the rule does not say what it must`).toMatch(declaration)
    }
    // THE PAIRS ASK THE SAME QUESTION. The offset's two conditions are the
    // lead's two conditions with the strip reached through its container, so
    // the two properties can never disagree about which shape is which.
    expect(RULES[2].selector).toContain(':not([data-slot="card"])')
    expect(RULES[3].selector).toContain('[data-slot="card"]:first-child')
  })

  it("leaves the Accounts dashboard nothing of its own to pay", () => {
    // THE SCREEN COULD NOT HAVE FIXED THIS, and must not try. R83's own census
    // fails any `renderFolderTabs(` call whose immediate JSX parent carries a
    // `gap-*`/`space-y-*`, precisely so a caller cannot grow a second opinion
    // about this number — so the wrapper stays gapless and the dashboard body
    // carries no lead utility of its own.
    const screen = readFileSync(SCREEN, "utf8")
    const at = screen.indexOf("{renderFolderTabs({")
    expect(at, "could not find the Accounts strip's own `renderFolderTabs(` call").toBeGreaterThan(-1)
    // The immediate wrapper, read backwards from the call to its opening tag.
    const before = screen.slice(0, at)
    const openAt = before.lastIndexOf("<div")
    const wrapper = screen.slice(openAt, at)
    expect(
      wrapper,
      "the Accounts strip's own wrapper grew a gap — R83 forbids a caller paying this number a second time"
    ).not.toMatch(/\b(gap-|space-y-)/)

    const dashboard = readFileSync(DASHBOARD, "utf8")
    // The component's own outermost returned element. A `pt-*`/`mt-*` on it
    // would be the per-screen hard-code, invisible to the census above because
    // it lives in another file.
    const rootAt = dashboard.indexOf('<div className="flex min-w-0 flex-col gap-6">')
    expect(rootAt, "could not find the accounts dashboard's own root element").toBeGreaterThan(-1)
    const root = dashboard.slice(rootAt, dashboard.indexOf(">", rootAt))
    expect(
      root,
      "the accounts dashboard pays its own lead above the tab strip — that is the per-screen hard-code R83 refuses"
    ).not.toMatch(/\b(pt-|mt-)/)
  })
})
