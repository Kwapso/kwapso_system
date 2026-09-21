// PLAIN-SURFACE SCOPE — THE RULING, RULEBOOK L43 (Aurora, 21 Sep 2026):
// an experiment scoped to the TICKETS MODULE ONLY. The grouping cards around
// titled sections (Assigned to, Related stories, Effort, Stakeholders) lose
// their box and sit directly on the white main content. Chips, tabs,
// buttons, tables and their frames, toolbars, wells, the conversation card,
// the per-person tiles, the "On the loop" tile, the Effort metric tiles
// (Card variant="raised"), the dark RecordFooterBand, error and empty state
// cards stay boxed. Stories, tasks and every other module must not change
// at all.
//
// EXTENDED THE SAME DAY TO TICKETS MAIN — Aurora, verbatim: "can yo do it
// also on tickets main?" `CollectionCard` (web/components/deep-link/
// screen-bits.tsx) — the frame around a toolbar plus a table, board, split
// or list — and `Panel` (web/components/tickets/tickets-dashboard.tsx) —
// the Overview tab's six chart frames — join the same experiment.
// `CollectionCard` keeps its `"boxed"` default (every OTHER module's call
// site is untouched) behind the identical `surface?: "boxed" | "plain"`
// prop the two shells below already carry; `Panel` has exactly one caller
// (the dashboard, tickets-only already) so it renders plain unconditionally,
// no prop to get wrong. The board's own raised cards, the rows' hover/
// selected washes, the triage well and every error/empty state still keep
// their paper.
//
// FOUR SHELLS CARRY THE EXPERIMENT NOW — `TicketSidePanel`
// (web/components/tickets/ticket-detail-body.tsx), `EmptyGatedPanel`
// (web/components/deep-link/screen-bits.tsx), `CollectionCard` (same file)
// and `Panel` (web/components/tickets/tickets-dashboard.tsx). The first
// three each carry a `surface?: "boxed" | "plain"` prop, defaulting to
// `"boxed"` (today's markup, byte for byte). `EffortCard`
// (web/components/work/effort-card.tsx) and `AssignedToCard`
// (web/components/tickets/help-stakeholders.tsx) forward their own
// `surface` prop into one of the two record-page shells. Only tickets' own
// call sites (help-detail.tsx for the record page; tickets-collection.tsx
// for every CollectionCard on the main page) pass `surface="plain"` — this
// census makes sure the string never spreads anywhere else before Aurora
// ships it app wide.
//
// TWO STRINGS CENSUSED: `surface="plain"` (the prop a call site passes) and
// `variant="plain"` (the kit `Card` variant every shell above passes down to
// it — a stray `variant="plain"` outside their own plumbing would be a
// second, undeclared door into the same experiment). Every file that
// mentions either string must be under `web/components/tickets/`, or be one
// of the shells' own prop-plumbing files.
//
// `.tsx`, NOT `.ts` — the render half below needs real JSX (oxlint's own
// `react/no-children-prop` refuses a `React.createElement(…, { children })`
// call, which is the only way a plain `.ts` file could have rendered these).
// The census half needs no JSX at all and does not care which extension
// hosts it; `web/vitest.config.ts`'s own `include` already reads
// `test/**/*.test.ts` and `test/**/*.test.tsx` alike, so nothing wires this
// file in specially. Every comment elsewhere in this repo naming this file
// by path was moved to the new extension in the same change (R58).

import { join } from "node:path"
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { PINNED_TOOLBAR } from "@shared/web/pinned-chrome"
import { CollectionCard, CollectionEmptyBody } from "@/components/deep-link/screen-bits"
import { Panel } from "@/components/tickets/tickets-dashboard"

afterEach(cleanup)

const REPO_ROOT = join(__dirname, "..", "..")

const ROOTS = [
  join(REPO_ROOT, "web"),
  join(REPO_ROOT, "web-portal"),
  join(REPO_ROOT, "shared", "web"),
]

/** THE ONLY FILES OUTSIDE `web/components/tickets/` PERMITTED TO MENTION
 * EITHER STRING — the two shells' own prop plumbing. `ticket-detail-body.tsx`
 * and `help-stakeholders.tsx` already live under `web/components/tickets/`,
 * so they need no entry here; only `screen-bits.tsx` (`EmptyGatedPanel`) and
 * `effort-card.tsx` (`EffortCard`, which forwards its own `surface` prop
 * into `EmptyGatedPanel`) sit outside it. */
const PLUMBING_FILES_OUTSIDE_TICKETS = new Set([
  "web/components/deep-link/screen-bits.tsx",
  "web/components/work/effort-card.tsx",
])

const NEEDLES = [`surface="plain"`, `variant="plain"`]

function allowed(rel: string): boolean {
  if (rel.startsWith("web/components/tickets/")) return true
  return PLUMBING_FILES_OUTSIDE_TICKETS.has(rel)
}

function findings(): string[] {
  const files = sourceFiles(ROOTS, {
    extensions: [".ts", ".tsx"],
    relativeTo: REPO_ROOT,
    skipTests: true,
  })
  const out: string[] = []
  for (const f of files) {
    // shared/ui is vendored and excluded by construction — none of the three
    // roots above reaches into it, but a future root added here should not
    // silently start walking it either.
    if (f.rel.startsWith("shared/ui/")) continue
    const src = stripComments(f.source)
    if (NEEDLES.some((needle) => src.includes(needle)) && !allowed(f.rel)) out.push(f.rel)
  }
  return out
}

describe("plain surface scope (rulebook L43)", () => {
  it("surface=\"plain\" / variant=\"plain\" appear only under web/components/tickets/ or the two shells' own plumbing", () => {
    const offenders = findings()
    expect(
      offenders,
      "plain sections are a tickets module experiment (rulebook L43); do not spread them before Aurora ships it app wide:\n  " +
        offenders.join("\n  ")
    ).toEqual([])
  })

  // PROVEN NOT VACUOUS — a synthetic offender outside the allow-list is
  // actually caught by the same matching this test's own census uses.
  it("catches a synthetic offender outside the allow-list", () => {
    const rel = "web/components/work/story-detail.tsx"
    const src = 'return <Card variant="plain">{children}</Card>'
    expect(!allowed(rel) && src.includes(`variant="plain"`)).toBe(true)
  })

  it("does not flag the two shells' own plumbing files", () => {
    expect(allowed("web/components/deep-link/screen-bits.tsx")).toBe(true)
    expect(allowed("web/components/work/effort-card.tsx")).toBe(true)
    expect(allowed("web/components/tickets/ticket-detail-body.tsx")).toBe(true)
    expect(allowed("web/components/tickets/help-stakeholders.tsx")).toBe(true)
  })

  // THE TICKETS-MAIN EXTENSION'S OWN TWO CALL-SITE FILES — already legitimate
  // homes under `web/components/tickets/`, and this is what makes that true
  // rather than assumed: both pass `surface="plain"` (tickets-collection.tsx)
  // or `variant="plain"` (tickets-dashboard.tsx's own `Panel`) today, and the
  // whole-repo census above must still come back empty with them doing so.
  it("tickets-collection.tsx and tickets-dashboard.tsx are legitimate homes for both strings, and the whole census still passes with them in it", () => {
    expect(allowed("web/components/tickets/tickets-collection.tsx")).toBe(true)
    expect(allowed("web/components/tickets/tickets-dashboard.tsx")).toBe(true)
    expect(findings()).toEqual([])
  })
})

/** A stand-in for the row `<ToolbarRow>`/`PagedFind` actually draw — the same
 * `data-slot="toolbar-row-pin"` + `PINNED_TOOLBAR` pair
 * `toolbar-lead-gap-card.test.tsx`'s own fixture wears, so this file is not a
 * second, invented shape. */
function ToolbarStandIn() {
  return (
    <div data-slot="toolbar-row-pin" className={PINNED_TOOLBAR}>
      <div data-slot="toolbar-row-column">the toolbar</div>
    </div>
  )
}

describe("CollectionCard surface (rulebook L43, extended to tickets main)", () => {
  it("boxed (the default) renders the kit's default Card variant, keeps the app's own px-4/pb-4 padding, and still hosts the toolbar-row-pin child as CardContent's first child", () => {
    render(
      <CollectionCard>
        <ToolbarStandIn />
      </CollectionCard>
    )
    const card = document.querySelector('[data-slot="card"]')
    expect(card, "CollectionCard must render the kit's Card").toBeTruthy()
    expect(card!.getAttribute("data-variant"), "boxed is the kit's own default variant").toBe("default")
    expect(card!.getAttribute("data-surface"), "boxed carries no data-surface mark").toBeNull()
    const content = card!.querySelector(':scope > [data-slot="card-content"]')
    expect(content, "CollectionCard must wrap its children in the kit's CardContent").toBeTruthy()
    expect(content!.className, "the boxed frame keeps its own px-4").toMatch(/(^|\s)px-4(\s|$)/)
    expect(content!.className, "the boxed frame keeps its own pb-4").toMatch(/(^|\s)pb-4(\s|$)/)
    expect(
      content!.firstElementChild?.getAttribute("data-slot"),
      "the pinned toolbar must still be CardContent's first child"
    ).toBe("toolbar-row-pin")
  })

  it('plain renders variant="plain" data-surface="plain", carries no p-4/px-4/pb-4 padding class of its own, and still hosts the toolbar-row-pin child as CardContent\'s first child', () => {
    render(
      <CollectionCard surface="plain">
        <ToolbarStandIn />
      </CollectionCard>
    )
    const card = document.querySelector('[data-slot="card"]')
    expect(card, "CollectionCard must render the kit's Card").toBeTruthy()
    expect(card!.getAttribute("data-variant"), "plain is the kit's own plain variant").toBe("plain")
    expect(card!.getAttribute("data-surface"), "the L43 census reads this mark").toBe("plain")
    const content = card!.querySelector(':scope > [data-slot="card-content"]')
    expect(content, "CollectionCard must still wrap its children in CardContent when plain").toBeTruthy()
    expect(content!.className, "no p-4 on the plain frame's content").not.toMatch(/(^|\s)p-4(\s|$)/)
    expect(content!.className, "no px-4 either — the toolbar and the table line up with the page edge").not.toMatch(
      /(^|\s)px-4(\s|$)/
    )
    expect(content!.className, "no pb-4 either").not.toMatch(/(^|\s)pb-4(\s|$)/)
    expect(
      content!.firstElementChild?.getAttribute("data-slot"),
      "the pinned toolbar is still CardContent's first child on the plain frame too"
    ).toBe("toolbar-row-pin")
  })
})

// THE EMPTY BODY'S OWN PAPER, ON A PLAIN FRAME. A plain `CollectionCard`
// (`surface="plain"`) drops its own Card down to a transparent
// `variant="plain"`, no inner padding, so the toolbar and the table line up
// with the page edge — but a facet with zero rows has no table, only the
// empty body (`CollectionEmptyState`, `data-slot="collection-empty-body"`),
// which then landed bare on the white page with nothing under it (measured
// live: fill `rgba(0, 0, 0, 0)`). `CollectionEmptyBody` (screen-bits.tsx)
// gives it back the SAME soft paper a boxed frame's own Card already is,
// through context published by `CollectionCard` rather than a DOM lookup —
// so it works this far from the frame's own JSX, past whatever a caller nests
// in between (a render-prop callback, on the real tickets-collection.tsx call
// site). A stand-in rows body proves the OTHER half: a facet that has rows
// gets no extra card at all, on either frame.
function EmptyBodyStandIn() {
  return <div data-slot="collection-empty-body">nothing here yet</div>
}

function RowsStandIn() {
  return <div data-slot="rows-stand-in">a row</div>
}

describe("CollectionEmptyBody (rulebook L43, the empty body's own paper on a plain frame)", () => {
  it("a plain CollectionCard whose body is the empty state renders the empty body inside a data-variant=\"default\" card", () => {
    render(
      <CollectionCard surface="plain">
        <CollectionEmptyBody>
          <EmptyBodyStandIn />
        </CollectionEmptyBody>
      </CollectionCard>
    )
    const emptyBody = document.querySelector('[data-slot="collection-empty-body"]')
    expect(emptyBody, "the empty body itself must still render").toBeTruthy()
    const paper = emptyBody!.closest('[data-slot="card"][data-variant="default"]')
    expect(paper, "the empty body must sit inside its own default-variant Card").toBeTruthy()
    // And it is the frame's usual inner padding, the same token the boxed
    // frame's own CardContent reads — never a second, hand-typed number.
    const paperContent = paper!.querySelector(':scope > [data-slot="card-content"]')
    expect(paperContent!.className, "the paper card keeps the frame's own px-4").toMatch(/(^|\s)px-4(\s|$)/)
    expect(paperContent!.className, "the paper card keeps the frame's own pb-4").toMatch(/(^|\s)pb-4(\s|$)/)
    // The CollectionCard's OWN card stays plain — the paper belongs to the
    // empty body alone, never spreads back out to the toolbar/frame.
    const outer = document.querySelector('[data-surface="plain"]')
    expect(outer, "the frame itself is still the plain, transparent Card").toBeTruthy()
    expect(outer!.getAttribute("data-variant")).toBe("plain")
  })

  it("a plain CollectionCard with rows renders no default card", () => {
    render(
      <CollectionCard surface="plain">
        <RowsStandIn />
      </CollectionCard>
    )
    expect(document.querySelector('[data-slot="rows-stand-in"]'), "the rows still render").toBeTruthy()
    expect(
      document.querySelector('[data-slot="card"][data-variant="default"]'),
      "no default-variant paper card appears around ordinary rows"
    ).toBeNull()
  })

  it("on a BOXED CollectionCard, CollectionEmptyBody renders its children untouched (the boxed frame is already the paper)", () => {
    render(
      <CollectionCard>
        <CollectionEmptyBody>
          <EmptyBodyStandIn />
        </CollectionEmptyBody>
      </CollectionCard>
    )
    const emptyBody = document.querySelector('[data-slot="collection-empty-body"]')
    expect(emptyBody, "the empty body still renders").toBeTruthy()
    // Only ONE Card in the tree — CollectionCard's own boxed one. A second,
    // nested default-variant Card here would be the card-inside-a-card
    // CLAUDE.md's `useKitPanel` note already forbids.
    expect(document.querySelectorAll('[data-slot="card"]').length, "no second, nested Card").toBe(1)
  })
})

describe("tickets-dashboard Panel renders plain (rulebook L43, extended to tickets main)", () => {
  it('Panel renders variant="plain" data-surface="plain", carries no p-4 on its content, and keeps the title and the chip', () => {
    render(
      <Panel title="Which app" chip={<span data-testid="chip">5</span>}>
        <div data-testid="panel-body">the chart</div>
      </Panel>
    )
    const card = document.querySelector('[data-slot="card"]')
    expect(card, "Panel must render the kit's Card").toBeTruthy()
    expect(card!.getAttribute("data-variant"), "Panel is unconditionally plain").toBe("plain")
    expect(card!.getAttribute("data-surface"), "the L43 census reads this mark").toBe("plain")
    const content = card!.querySelector(':scope > [data-slot="card-content"]')
    expect(content, "Panel must wrap its children in the kit's CardContent").toBeTruthy()
    expect(content!.className, "no p-4 on Panel's plain content").not.toMatch(/(^|\s)p-4(\s|$)/)
    expect(document.querySelector("h3")?.textContent, "the title survives").toBe("Which app")
    expect(document.querySelector('[data-testid="chip"]'), "the chip survives").toBeTruthy()
    expect(document.querySelector('[data-testid="panel-body"]'), "the body survives").toBeTruthy()
  })
})
