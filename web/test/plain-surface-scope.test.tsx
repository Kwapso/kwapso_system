// PAPER ON PURPOSE — THE CENSUS THIS FILE BECAME WHEN L43 WENT APP WIDE.
//
// THE RULING, rulebook L43, Aurora, 21 Sep 2026, on the Minimal Kit page,
// verbatim: "board A / space 6 / go an implement this appwide, also implement
// the to the bottom edge for main content and assistant like in your previous
// artifact / also, make footer not inside a container, but the full row side
// to side (within the main content) / do think a lot about each component,
// what this minimalising means so that it still works". And the goal she set
// for the whole pass, in her own words: "the goal: make a more minimal clean
// app".
//
// WHAT THIS FILE USED TO BE, AND WHY IT HAD TO TURN ROUND. Until today it was
// a SCOPE GUARD: `surface="plain"` and `variant="plain"` were a tickets-module
// experiment and this census made sure neither string spread outside
// `web/components/tickets/` before she shipped it app wide. She shipped it app
// wide. A guard against the spread of the default is a check that measures
// nothing — worse, it would now fail on every file the ruling touched — so it
// is replaced rather than relaxed, by the census that is actually interesting
// on the other side of the ruling: WHICH SURFACES STILL PAINT PAPER, AND WHY.
//
// THE SUBJECT: every `<Card>` under `web/` or `web-portal/` that paints the
// kit's soft paper — `variant="default"`, or NO variant at all, which is the
// same thing through the kit's own `defaultVariants` — and every
// `surface="boxed"` a call site spells. Each such FILE must be named in
// `PAPER_ON_PURPOSE` (`shared/rules/registry.ts`) with a reason in her words
// or the validated page's. `variant="well"`, `"raised"`, `"inverse"` and
// `"brand"` are outside it: none of them is the grouping surface this ruling
// took the box off, and each already says what it is in its own name.
//
// ROT-CHECKED BOTH WAYS, so the table can only be true: a paper-painting card
// in a file that is not named fails the build, and a named file that has
// stopped painting one fails it too.
//
// `.tsx`, NOT `.ts` — the render half below needs real JSX (oxlint's own
// `react/no-children-prop` refuses a `React.createElement(…, { children })`
// call, which is the only way a plain `.ts` file could have rendered these).
// The census half needs no JSX at all and does not care which extension
// hosts it; `web/vitest.config.ts`'s own `include` already reads
// `test/**/*.test.ts` and `test/**/*.test.tsx` alike, so nothing wires this
// file in specially.

import { join } from "node:path"
import type * as React from "react"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { PAPER_ON_PURPOSE } from "@shared/rules/registry"
import { PINNED_TOOLBAR } from "@shared/web/pinned-chrome"
import { CollectionCard, EmptyGatedPanel } from "@/components/deep-link/screen-bits"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import { TicketSidePanel } from "@/components/tickets/ticket-detail-body"
import { Panel } from "@/components/tickets/tickets-dashboard"
import { PagedFind, type FindQuery } from "@/components/records/paged-find"

// THE TRIAGE FACET'S OWN EMPTY BRANCH (below, the last describe block) needs
// its door mocked before `TriageQueue` is imported — the same shape
// `web/test/triage-list-view-no-buttons.test.tsx` already uses, so this is
// not a second, invented way to stand the queue up.
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    content: {
      ...actual.content,
      triage: async () => ({
        onDuty: { userId: "u-1", userName: "Aurora", weekStart: "2026-09-14" },
        yours: true,
        waiting: [],
        total: 0,
      }),
      helpAttachments: async () => ({ attachments: [], total: 0 }),
    },
    tenancy: {
      ...actual.tenancy,
      members: async () => ({ members: [] }),
      apps: async () => ({ apps: [], total: 0 }),
    },
  }
})

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: () => {}, error: () => {}, info: () => {} },
  Toaster: () => null,
}))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

import { TriageQueue } from "@/components/tickets/triage-queue"

afterEach(cleanup)

const REPO_ROOT = join(__dirname, "..", "..")

const ROOTS = [join(REPO_ROOT, "web"), join(REPO_ROOT, "web-portal")]

/** THE END OF A JSX OPENING TAG, found by SCANNING rather than by taking the
 * first `>` — a `className={cn(a > b)}` or a `style={{ }}` would end the tag
 * early for a naive search, and reading the variant off half a tag is how a
 * census quietly starts agreeing with itself. Tracks quote state and brace
 * depth, exactly as far as it needs to. */
function tagEnd(src: string, from: number): number {
  let depth = 0
  let quote: string | null = null
  for (let i = from; i < src.length; i++) {
    const c = src[i]
    if (quote) {
      if (c === quote) quote = null
      continue
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c
      continue
    }
    if (c === "{") depth++
    else if (c === "}") depth--
    else if (c === ">" && depth === 0) return i
  }
  return src.length
}

/** Every `<Card …>` opening tag in a source, as its own text. `<CardContent`,
 * `<CardGrid`, `<CardTitle` and the rest are excluded by requiring a
 * non-identifier character straight after the name. */
function cardTags(src: string): string[] {
  const out: string[] = []
  const re = /<Card(?![A-Za-z0-9_])/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    out.push(src.slice(m.index, tagEnd(src, m.index) + 1))
  }
  return out
}

/** Does this tag paint the kit's soft paper? `variant="default"` says so
 * outright; NO `variant` at all says the same thing through the kit's own
 * `defaultVariants`. A non-literal variant (`variant={x}`) is counted as
 * paper too — this census under-reaches nowhere, and there is no such site
 * in either front door today. */
function paintsPaper(tag: string): boolean {
  const variant = /\bvariant=(?:"([a-z]+)"|\{)/.exec(tag)
  if (!variant) return true
  if (variant[1] === undefined) return true
  return variant[1] === "default"
}

function paperFiles(): string[] {
  const out: string[] = []
  for (const f of sourceFiles(ROOTS, {
    extensions: [".ts", ".tsx"],
    relativeTo: REPO_ROOT,
    skipTests: true,
  })) {
    const src = stripComments(f.source)
    const paper = cardTags(src).some(paintsPaper) || src.includes(`surface="boxed"`)
    if (paper) out.push(f.rel)
  }
  return out
}

describe("paper on purpose (rulebook L43, app wide)", () => {
  it("every file that still paints a grouping card's paper is named in PAPER_ON_PURPOSE, with a reason", () => {
    const unexplained = paperFiles().filter((rel) => !(rel in PAPER_ON_PURPOSE))
    expect(
      unexplained,
      "plain is the default app wide (rulebook L43). A `<Card>` that still paints soft paper is a decision, not a leftover: " +
        "either drop it (the shells' own defaults already do), or name the file in PAPER_ON_PURPOSE " +
        "(shared/rules/registry.ts) with the reason in her words — a conversation card, a tile, a well, " +
        "an empty or error state, a per-record card in a grid, or a not-a-section:\n  " +
        unexplained.join("\n  ")
    ).toEqual([])
  })

  it("rot-checked: a PAPER_ON_PURPOSE entry whose file no longer paints one is deleted, not left", () => {
    const painting = new Set(paperFiles())
    const stale = Object.keys(PAPER_ON_PURPOSE).filter(
      (rel) => (rel.startsWith("web/") || rel.startsWith("web-portal/")) && !painting.has(rel)
    )
    expect(
      stale,
      "these PAPER_ON_PURPOSE entries match nothing any more — the card is plain now, so delete the entry:"
    ).toEqual([])
  })

  it("the census measures something — it finds the conversation card and the gallery card by name", () => {
    const painting = new Set(paperFiles())
    expect(
      painting.has("web/components/tickets/ticket-detail-body.tsx"),
      "the conversation card must be found — if this walk stops seeing it, it is blind, not clean"
    ).toBe(true)
    expect(painting.has("web/components/records/gallery-card.tsx")).toBe(true)
    expect(painting.size, "a census that finds nothing at all is a census that parsed nothing").toBeGreaterThan(5)
  })

  it("a synthetic paper card in an unnamed file is caught, and a plain one is not", () => {
    expect(paintsPaper('<Card variant="default">')).toBe(true)
    expect(paintsPaper("<Card>")).toBe(true)
    expect(paintsPaper('<Card className="x">')).toBe(true)
    expect(paintsPaper('<Card variant="plain" data-surface="plain">')).toBe(false)
    expect(paintsPaper('<Card variant="raised">')).toBe(false)
    expect(paintsPaper('<Card variant="well" className="p-3">')).toBe(false)
    // And the tag scanner does not stop at a `>` inside an expression.
    expect(cardTags('<Card className={cn(a > b && "x")} variant="raised">x</Card>')).toEqual([
      '<Card className={cn(a > b && "x")} variant="raised">',
    ])
    // `<CardContent`/`<CardGrid` are not this census's subject.
    expect(cardTags('<CardContent className="p-4">')).toEqual([])
  })

  it("every reason is real prose, not a placeholder", () => {
    for (const [rel, why] of Object.entries(PAPER_ON_PURPOSE)) {
      expect(why.length, `${rel} needs a real reason`).toBeGreaterThan(80)
    }
  })
})

/** A stand-in for the row `<ToolbarRow>`/`PagedFind` actually draw — the same
 * `data-slot="toolbar-row-pin"` + `PINNED_TOOLBAR` pair
 * `toolbar-lead-gap-card.test.tsx`'s own fixture wears. */
function ToolbarStandIn() {
  return (
    <div data-slot="toolbar-row-pin" className={PINNED_TOOLBAR}>
      <div data-slot="toolbar-row-column">the toolbar</div>
    </div>
  )
}

describe("CollectionCard's default is plain (rulebook L43, app wide)", () => {
  it('the DEFAULT — no prop at all — renders variant="plain" data-surface="plain", carries no p-4/px-4/pb-4 padding class of its own, and still hosts the toolbar-row-pin child as CardContent\'s first child', () => {
    render(
      <CollectionCard>
        <ToolbarStandIn />
      </CollectionCard>
    )
    const card = document.querySelector('[data-slot="card"]')
    expect(card, "CollectionCard must render the kit's Card").toBeTruthy()
    expect(card!.getAttribute("data-variant"), "plain is the DEFAULT now — no call site spells it").toBe("plain")
    expect(card!.getAttribute("data-surface"), "the L43 census reads this mark").toBe("plain")
    const content = card!.querySelector(':scope > [data-slot="card-content"]')
    expect(content, "CollectionCard must still wrap its children in CardContent").toBeTruthy()
    expect(content!.className, "no p-4 on the plain frame's content").not.toMatch(/(^|\s)p-4(\s|$)/)
    expect(content!.className, "no px-4 either — the toolbar and the table line up with the pane edge").not.toMatch(
      /(^|\s)px-4(\s|$)/
    )
    expect(content!.className, "no pb-4 either").not.toMatch(/(^|\s)pb-4(\s|$)/)
    expect(
      content!.firstElementChild?.getAttribute("data-slot"),
      "the pinned toolbar must still be CardContent's first child"
    ).toBe("toolbar-row-pin")
  })

  it('surface="boxed" — the opposite decision, still reachable — renders the kit\'s default Card variant and keeps the app\'s own px-4/pb-4', () => {
    render(
      <CollectionCard surface="boxed">
        <ToolbarStandIn />
      </CollectionCard>
    )
    const card = document.querySelector('[data-slot="card"]')
    expect(card!.getAttribute("data-variant"), "boxed is the kit's own default variant").toBe("default")
    expect(card!.getAttribute("data-surface"), "boxed carries no data-surface mark").toBeNull()
    const content = card!.querySelector(':scope > [data-slot="card-content"]')
    expect(content!.className, "the boxed frame keeps its own px-4").toMatch(/(^|\s)px-4(\s|$)/)
    expect(content!.className, "the boxed frame keeps its own pb-4").toMatch(/(^|\s)pb-4(\s|$)/)
  })
})

describe("the two record-page shells default to plain (rulebook L43, app wide)", () => {
  it("TicketSidePanel with no surface prop draws no box, and still draws its title and count", () => {
    render(
      <TicketSidePanel title="Stakeholders" count="4">
        content
      </TicketSidePanel>
    )
    const card = document.querySelector('[data-slot="card"]')
    expect(card!.getAttribute("data-variant")).toBe("plain")
    expect(card!.getAttribute("data-surface")).toBe("plain")
    expect(screen.getByText("Stakeholders")).toBeTruthy()
    expect(screen.getByText("4")).toBeTruthy()
  })

  it("EmptyGatedPanel with no surface prop draws no box, and R88's header drop still applies when empty", () => {
    render(
      <EmptyGatedPanel title="Related stories" empty={false}>
        rows
      </EmptyGatedPanel>
    )
    expect(document.querySelector('[data-slot="card"]')!.getAttribute("data-variant")).toBe("plain")
    expect(screen.getByText("Related stories")).toBeTruthy()
    cleanup()

    render(
      <EmptyGatedPanel title="Related stories" empty>
        the empty state
      </EmptyGatedPanel>
    )
    expect(document.querySelector('[data-slot="card"]')!.getAttribute("data-variant")).toBe("plain")
    expect(
      screen.queryByText("Related stories"),
      "R88 — an empty section's own header drops, title, count and action together"
    ).toBeNull()
  })
})

// `CollectionEmptyBody` IS RETIRED, 22 SEP 2026 (rulebook L43, her ruling
// over the Accounts Inactive-tab screenshot: "the empty collection now. We
// need to get rid of the card background"). It used to give a plain
// `CollectionCard`'s empty state real soft paper, through context published
// by `CollectionCard`; `CollectionEmptyState` no longer papers itself in any
// ground, so the wrap has nothing left to do and its three tests are
// replaced by the describe block below, which proves the OPPOSITE now holds.

// `CollectionEmptyState` (shared/web/screen-engine/collection-frame.tsx) — the
// R62 register itself — PAPERS NOTHING NOW, 22 Sep 2026, superseding the 21
// Sep self-paper this same describe block used to prove. Her ruling, over the
// Accounts Inactive tab: "the empty collection now. We need to get rid of the
// card background." No ground papers it any more — not a plain
// `CollectionCard`, not a boxed one, not a bare render with no provider above
// it at all (`/waves` and the brand library's own shape) — because the one
// context that used to carry that decision (`CollectionCardSurfaceContext`)
// is retired along with `CollectionEmptyBody`, its other reader.
describe("CollectionEmptyState papers nothing, in any ground (rulebook L43, R62)", () => {
  it('a bare CollectionEmptyState inside a plain CollectionCard renders with no default-variant Card around it', () => {
    render(
      <CollectionCard>
        <CollectionEmptyState title="Nothing here yet." />
      </CollectionCard>
    )
    const emptyBody = document.querySelector('[data-slot="collection-empty-body"]')
    expect(emptyBody, "the register itself must still render").toBeTruthy()
    expect(
      emptyBody!.closest('[data-slot="card"][data-variant="default"]'),
      "the register must not sit inside a paper card any more"
    ).toBeNull()
    expect(
      document.querySelectorAll('[data-slot="card"][data-variant="default"]').length,
      "no paper card anywhere in the tree"
    ).toBe(0)
    const outer = document.querySelector('[data-surface="plain"]')
    expect(outer, "the frame itself is still the plain, transparent Card").toBeTruthy()
    expect(outer!.getAttribute("data-variant")).toBe("plain")
  })

  it('a CollectionEmptyState inside a surface="boxed" CollectionCard still renders with no SECOND, nested paper card', () => {
    render(
      <CollectionCard surface="boxed">
        <CollectionEmptyState title="Nothing here yet." />
      </CollectionCard>
    )
    const emptyBody = document.querySelector('[data-slot="collection-empty-body"]')
    expect(emptyBody, "the register still renders").toBeTruthy()
    expect(
      document.querySelectorAll('[data-slot="card"][data-variant="default"]').length,
      "exactly the boxed frame's own one Card, never a second one nested around the register"
    ).toBe(1)
  })

  it('a CollectionEmptyState rendered outside any CollectionCard/CollectionFrame — no provider at all, /waves and the brand library\'s own shape — still renders with no paper card', () => {
    render(<CollectionEmptyState title="Nothing here yet." />)
    const emptyBody = document.querySelector('[data-slot="collection-empty-body"]')
    expect(emptyBody, "the register still renders").toBeTruthy()
    expect(
      emptyBody!.closest('[data-slot="card"][data-variant="default"]'),
      "no provider above it, and no self-paper either — the register stands bare"
    ).toBeNull()
  })

  // AMENDED 22 SEP 2026. Aurora, reading the "no top inset" fix back on a
  // real screen: "ok, but need a bit more spacing over it (like it was with
  // the card)." Supersedes the "top inset is gone" shape this test used to
  // prove: the register now carries `--space-6` (24px, the card's own inset
  // token) above AND below its text, never `--space-7` (32px), which is what
  // the register carried before either ruling.
  it("the register carries the air a card used to give, space-6 (24px) above and below its text, flush left, no fill (Aurora, 22 Sep 2026)", () => {
    render(<CollectionEmptyState title="Nothing here yet." />)
    const emptyBody = document.querySelector('[data-slot="collection-empty-body"]') as HTMLElement
    expect(emptyBody.className, "space-6 above its text").toMatch(/(^|\s)pt-\[var\(--space-6\)\](\s|$)/)
    expect(emptyBody.className, "space-6 below its text").toMatch(/(^|\s)pb-\[var\(--space-6\)\](\s|$)/)
    expect(emptyBody.className, "never the old, larger space-7").not.toMatch(/space-7/)
    expect(emptyBody.className, "left edge stays flush, items-start, no inset of its own").toMatch(
      /(^|\s)items-start(\s|$)/
    )
    expect(emptyBody.className, "still no fill of its own").not.toMatch(/(^|\s)bg-(?!clip|none)[\w-]+/)
  })
})

describe("tickets-dashboard Panel renders plain (rulebook L43)", () => {
  it('Panel renders variant="plain" data-surface="plain", carries no p-4 on its content, and keeps the title and the chip', () => {
    render(
      <Panel title="Which app" chip={<span data-testid="chip">5</span>}>
        <div data-testid="panel-body">the chart</div>
      </Panel>
    )
    const card = document.querySelector('[data-slot="card"]')
    expect(card!.getAttribute("data-variant"), "Panel is unconditionally plain").toBe("plain")
    expect(card!.getAttribute("data-surface")).toBe("plain")
    const content = card!.querySelector(':scope > [data-slot="card-content"]')
    expect(content!.className, "no p-4 on Panel's plain content").not.toMatch(/(^|\s)p-4(\s|$)/)
    expect(document.querySelector("h3")?.textContent, "the title survives").toBe("Which app")
    expect(document.querySelector('[data-testid="chip"]'), "the chip survives").toBeTruthy()
    expect(document.querySelector('[data-testid="panel-body"]'), "the body survives").toBeTruthy()
  })
})

describe("TriageQueue's own empty branch, on the plain Triage frame (rulebook L43)", () => {
  const PROPS = {
    teamId: "team-1",
    canTriage: true,
    canEdit: true,
    helpTypeOptions: ["Bug", "Question", "Issue", "Request"],
    canCreateTicket: false,
    onCreate: () => {},
    onOpen: () => {},
  }

  it('a zero-waiting queue renders "Nothing waiting." with no paper card, on the plain data-variant="plain" frame (22 Sep 2026, no CollectionEmptyBody wrap left)', async () => {
    render(
      <CollectionCard>
        <TriageQueue {...PROPS} />
      </CollectionCard>
    )
    await screen.findByText("Nothing waiting.")
    const emptyBody = document.querySelector('[data-slot="collection-empty-body"]')
    expect(emptyBody, "the empty body itself must render").toBeTruthy()
    expect(
      emptyBody!.closest('[data-slot="card"][data-variant="default"]'),
      "no default-variant paper card wraps the empty body any more"
    ).toBeNull()
    const plainFrame = document.querySelector('[data-slot="card"][data-surface="plain"][data-variant="plain"]')
    expect(plainFrame, "the outer CollectionCard stays the plain, transparent frame").toBeTruthy()
    expect(plainFrame!.contains(emptyBody), "the empty body is nested inside the plain frame").toBe(true)
  })
})

// THE TOOLBAR'S PAINTED PILL IS RETIRED — kit v1.2.149's own ruling, made
// independently the same day: `CollectionFrame`'s `toolbarGround` defaults to
// `"bare"`, over the Minimal Kit page's own written recommendation to give the
// row its paper back, because Aurora overruled that recommendation on the
// product ("on tickets, reduce space above and under toolbar to 10px"). The
// app agrees by DRAWING the same thing. `ToolbarColumn` (paged-find.tsx) used
// to branch on the frame it stood in; there is one kind of frame now, so it
// paints nothing at all and there is no branch left to get wrong.
describe("PagedFind's toolbar column (R83 ruling 7 / rulebook L43) — never painted", () => {
  type Row = { id: string; name: string }

  const fetchPage = async (_query: FindQuery, _cursor: string | null) => ({
    rows: [{ id: "a", name: "x" }] as Row[],
    nextCursor: null,
    total: 1,
  })

  function renderFind(wrap?: (inner: React.ReactNode) => React.ReactNode) {
    return render(
      <PagedFind<Row>
        listKey={`test:${Math.random()}`}
        placeholder="Search…"
        matches={{ none: "No matches", one: "1 match", many: "{count} matches" }}
        restingEmpty={false}
        fetchPage={fetchPage}
        wrap={wrap}
      >
        {() => <div data-testid="rows" />}
      </PagedFind>
    )
  }

  function assertUnpainted() {
    const column = document.querySelector('[data-slot="toolbar-row-column"]') as HTMLElement
    const track = document.querySelector('[data-slot="toolbar-row-track"]') as HTMLElement
    expect(column, "the toolbar's merged container must still render, unpainted").toBeTruthy()
    expect(track, "the toolbar's own track must still render, unpainted").toBeTruthy()
    expect(column.className, "no fill").not.toContain("bg-surface-raised")
    expect(column.className, "no pill radius").not.toMatch(/(^|\s)rounded-pill(\s|$)/)
    expect(column.className, "and no box radius — an unpainted register has no shape of its own").not.toMatch(
      /rounded-\[var\(--radius\)\]/
    )
    expect(track.className, "no vertical pill padding").not.toMatch(/(^|\s)py-1\.5(\s|$)/)
    expect(track.className, "no trailing pill padding").not.toMatch(/(^|\s)pe-1\.5(\s|$)/)
    expect(track.className, "no leading pill inset — the plain frame's CardContent carries zero padding").not.toMatch(
      /(^|\s)ps-4(\s|$)/
    )
    expect(track.className, "the gap between controls is layout, not paint — it stays").toMatch(/(^|\s)gap-2(\s|$)/)
  }

  it("no wrap at all is unpainted", () => {
    renderFind()
    assertUnpainted()
  })

  it("inside a CollectionCard it is unpainted too", () => {
    renderFind((inner) => <CollectionCard>{inner}</CollectionCard>)
    assertUnpainted()
  })

  it("the pinned mechanics are untouched — PINNED_TOOLBAR and the R63 trailing gap still ride the outer pin wrapper", () => {
    renderFind((inner) => <CollectionCard>{inner}</CollectionCard>)
    const pin = document.querySelector('[data-slot="toolbar-row-pin"]') as HTMLElement
    expect(pin, "the pinned wrapper must still render").toBeTruthy()
    for (const cls of PINNED_TOOLBAR.split(" ")) {
      expect(pin.className.includes(cls), `the pin wrapper must still carry ${cls}`).toBe(true)
    }
    expect(
      pin.className,
      "the pin wrapper must still pay the R63 trailing gap token, untouched by the painted-register change"
    ).toMatch(/(^|\s)pb-\[var\(--toolbar-content-gap\)\](\s|$)/)
  })
})
