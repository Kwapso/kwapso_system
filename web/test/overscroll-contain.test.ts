// T3656/B0293 — "THE TICKETS PAGE SOMETIMES RELOADS BY ITSELF WITH A YELLOW
// ANIMATION." Neither `html`/`body` nor the kit's own `TabsList` said anything
// about `overscroll-behavior`, so the browser's own fallback for "nothing
// left to scroll" ran free: pull-to-refresh on a phone (a real vertical
// overscroll past the top of the tickets queue, the longest-scrolled screen
// on this team), and Chrome's two-finger swipe back/forward on a Mac
// trackpad (a horizontal overscroll past the end of a status strip —
// Dashboard/Triage/Ready/Open/Waiting/Closed/All — T3824 records Ishita
// "falling back to Chrome's swipe-back gesture to get around" this same
// call). Both end in a real document reload, which replays the mango
// `MarkLoader` boot mark — "reloads by itself with a yellow animation".
//
// A `page.goBack()` proof (the same navigation the completed gesture
// performs) showed this app's own `popstate` handling is soft and not the
// bug: `history.back()` inside an in-app session never reloads. So the fix is
// the overscroll half alone — contain it at the document AND at the kit's own
// horizontally-scrolling `TabsList`, so an end-of-scroll drag never reaches
// the document's own edge to chain from in the first place.
//
// SABOTAGE: delete either `overscroll-behavior: contain` rule from
// web/app/globals.css →
//   × [whichever assertion below] fails.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = join(import.meta.dirname, "..", "..")
const read = (p: string) => readFileSync(join(ROOT, p), "utf8")

describe("overscroll-behavior: contain, both axes (R37's own class of bug, the gesture half)", () => {
  it("html and body both refuse to chain an overscroll past the document's own edge", () => {
    const css = read("web/app/globals.css")
    // Positional, not "the word appears somewhere": the rule has to actually
    // apply to html/body, not merely be typed into a comment nearby.
    const rule = /html\s*,\s*body\s*\{[^}]*overscroll-behavior:\s*contain[^}]*\}/
    expect(rule.test(css), "web/app/globals.css must set overscroll-behavior: contain on html, body together").toBe(
      true
    )
  })

  it("the kit's own horizontally-scrolling TabsList refuses to chain too", () => {
    const css = read("web/app/globals.css")
    const rule = /\[data-slot="tabs-list"\]\s*\{[^}]*overscroll-behavior:\s*contain[^}]*\}/
    expect(
      rule.test(css),
      'web/app/globals.css must set overscroll-behavior: contain on [data-slot="tabs-list"] — the kit\'s own attribute for every TabsList in the app (shared/ui/components/tabs/tabs.tsx)'
    ).toBe(true)
  })

  it("never `none` — the page's own bounce/rubber-band still works, only the chain past it stops", () => {
    const css = read("web/app/globals.css")
    expect(/overscroll-behavior:\s*none/.test(css), "overscroll-behavior: none is the wrong value — contain, not none").toBe(
      false
    )
  })
})
