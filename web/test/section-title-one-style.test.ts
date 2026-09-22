// R108, SECTION-TITLE-ONE-STYLE. Her ruling, 22 Sep 2026, over a screenshot of a
// ticket record: "look at screenshot. i want that we have 1 single deign for
// titles. make it like in tasks 'assignd to, details, deadline' so evetything in
// tickets/stories that are titles (assigned to, pahse and wave, effort,
// stakeholders, related tickets, related stories...) make the chnage here and
// everywhee else. what we are changing is the sytle of the title of a section.
// implement and write the rule." A record section's own TITLE — Assigned to,
// Category, Phase and wave, Effort, Stakeholders, Related tickets, Related
// stories and every sibling — now shares the ONE style the task sheet's own fact
// labels already carry (R105): `text-micro text-muted-foreground uppercase`,
// never the old `text-sm font-medium`. `TicketSidePanel` and `EmptyGatedPanel`
// (`web/components/tickets/ticket-detail-body.tsx`,
// `web/components/deep-link/screen-bits.tsx`) are the two shared hosts, and every
// hand-rolled sibling this census found (`web/components/meetings/
// meeting-detail.tsx`, `web/components/accounts/client-org-panel.tsx`,
// `web/components/apps/stakeholders-panel.tsx`) now carries it too. The heading
// stays a real heading element with its own `id` where it already had one
// (`TicketSidePanel`/`EmptyGatedPanel`'s `aria-labelledby` wiring is untouched);
// only the STYLE moved.
//
// THE DUPLICATE THE SCREENSHOT ALSO SHOWED. The Assigned to SECTION was titled
// "Assigned to" and then repeated "ASSIGNED TO" a second time as an inner eyebrow
// over the person chip — a label agreeing with its own heading, once the section
// title itself became the eyebrow. `AssignedToCard`
// (`web/components/tickets/help-stakeholders.tsx`) drops that inner chip for the
// ticket's own assignee now (the section title already says it); "From the app"
// first survived the inherited case on the reading that it said something the
// title did not, then Aurora overruled that reading the same day, verbatim:
// "under assigned to remove 'From the app'" — no chip at all now, own person or
// inherited. Every OTHER section with several facts under one title
// (Stakeholders' own "Raised by"/"On the loop", the merged Phase/Wave facts)
// keeps both, on purpose: the inner labels there say something the section
// title does not.
//
// THE CENSUS, OFF THE DISK, over every file in web/components and
// web-portal/components: every literal `<h2`/`<h3`/`<h4` whose OWN `className`
// carries both `text-sm` and `font-medium` (the shape every record section title
// used to draw, and the shape a new one could still be built in by hand) is a
// finding, unless the file+expression pair is named in `SECTION_TITLE_EXEMPT` —
// a heading in that same shape describing something OTHER than a single record's
// own section (a dashboard tile, a portal's own collection heading, a review
// dialog's own group heading), reasoned and rot-checked both ways.
// `TicketSidePanel`'s and `EmptyGatedPanel`'s own title lines are asserted
// against the canonical string directly, a tripwire so the census cannot pass by
// matching nothing at all.

import { join } from "node:path"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { SECTION_TITLE_EXEMPT } from "@shared/rules/registry"

const ROOT = join(import.meta.dirname, "..", "..")
const WEB_COMPONENTS = join(ROOT, "web", "components")
const PORTAL_COMPONENTS = join(ROOT, "web-portal", "components")

const CANONICAL = "text-micro text-muted-foreground uppercase"

type Finding = { rel: string; line: number; tag: string; expression: string }

function attrStringText(node: ts.JsxOpeningLikeElement, name: string): string | undefined {
  for (const p of node.attributes.properties) {
    if (!ts.isJsxAttribute(p) || p.name.getText() !== name || !p.initializer) continue
    if (ts.isStringLiteral(p.initializer)) return p.initializer.text
  }
  return undefined
}

/** Every `<h2>`/`<h3>`/`<h4>` under `web/components` and `web-portal/components`
 * whose own literal className carries both `text-sm` and `font-medium` — the old
 * record-section-title shape. */
function findOldShapeHeadings(): Finding[] {
  const out: Finding[] = []
  for (const f of sourceFiles([WEB_COMPONENTS, PORTAL_COMPONENTS], {
    extensions: [".tsx"],
    relativeTo: ROOT,
    skipTests: true,
  })) {
    const src = stripComments(f.source, { keepLength: true })
    const sf = ts.createSourceFile(f.path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const lineOf = (node: ts.Node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1

    const visit = (node: ts.Node): void => {
      const opening = ts.isJsxElement(node)
        ? node.openingElement
        : ts.isJsxSelfClosingElement(node)
          ? node
          : undefined
      if (opening) {
        const tag = opening.tagName.getText()
        if (/^h[234]$/.test(tag)) {
          const cls = attrStringText(opening, "className")
          if (cls && /\btext-sm\b/.test(cls) && /\bfont-medium\b/.test(cls)) {
            out.push({ rel: f.rel, line: lineOf(node), tag, expression: cls })
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return out
}

function excused(rel: string, expression: string) {
  return SECTION_TITLE_EXEMPT.find((e) => e.file === rel && expression.includes(e.expression))
}

describe("R108, section-title-one-style", () => {
  it("TicketSidePanel and EmptyGatedPanel draw the canonical eyebrow title (tripwire, the census must find something)", () => {
    const ticketBody = readFileSync(join(WEB_COMPONENTS, "tickets", "ticket-detail-body.tsx"), "utf8")
    const screenBits = readFileSync(join(WEB_COMPONENTS, "deep-link", "screen-bits.tsx"), "utf8")

    const countOf = (text: string, needle: string) => text.split(needle).length - 1

    // TicketSidePanel draws the title in both its "plain" and "boxed" branches.
    expect(
      countOf(ticketBody, CANONICAL),
      "ticket-detail-body.tsx's TicketSidePanel must carry the canonical eyebrow class in both branches"
    ).toBeGreaterThanOrEqual(2)

    // EmptyGatedPanel is TicketSidePanel's twin, same two branches.
    expect(
      countOf(screenBits, CANONICAL),
      "screen-bits.tsx's EmptyGatedPanel must carry the canonical eyebrow class in both branches"
    ).toBeGreaterThanOrEqual(2)

    // Neither host may still carry the old shape.
    expect(ticketBody.includes('text-sm font-medium"'), "ticket-detail-body.tsx must not still draw the old text-sm font-medium title").toBe(false)
    expect(screenBits.includes('text-sm font-medium"'), "screen-bits.tsx must not still draw the old text-sm font-medium title").toBe(false)
  })

  it("every record-section title in web/components and web-portal/components carries the canonical eyebrow, never the old text-sm font-medium shape", () => {
    const findings = findOldShapeHeadings()
    const wrong = findings.filter((f) => !excused(f.rel, f.expression))
    expect(
      wrong,
      "every record section title must carry text-micro text-muted-foreground uppercase. Fix the heading, or name " +
        "the finding in SECTION_TITLE_EXEMPT with the reason it is not a record section's own title:\n  " +
        wrong.map((f) => `${f.rel}:${f.line}  <${f.tag}> "${f.expression}"`).join("\n  ")
    ).toEqual([])
  })

  it("SECTION_TITLE_EXEMPT names only real, still-open findings", () => {
    const findings = findOldShapeHeadings()
    const stale = SECTION_TITLE_EXEMPT.filter(
      (e) => !findings.some((f) => f.rel === e.file && f.expression.includes(e.expression))
    )
    expect(
      stale,
      "these SECTION_TITLE_EXEMPT entries no longer match a real heading. Delete the entry:\n  " +
        stale.map((e) => `${e.file}  ${e.expression}`).join("\n  ")
    ).toEqual([])
  })
})
