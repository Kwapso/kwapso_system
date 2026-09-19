// THE TICKET'S STAGE RAIL RUNS ACROSS, AND EVERY RECORDED STAGE CARRIES ITS
// DATE.
//
// The client, 2026-09-09, on the rail she had just been shown: "now i see it!!
// but we chose an horizontal deesign (not this vertical) that also shoudl show
// the dates". Both halves of that sentence are a ruling, and both halves are
// invisible to review.
//
// THE ORIENTATION IS ONE PROP. `StatusStepper` defaults to `horizontal` and
// takes `vertical` for the wizard rail, so the difference between the drawing
// she chose and the drawing she rejected is one word in one attribute — and
// this file has already been on the wrong side of it once. Nothing about
// `orientation="vertical"` looks wrong in a diff.
//
// THE DATE IS THE FIELD IT COMES OFF. `TicketStageSpan.from` is the moment the
// ticket ENTERED that stage — a real `help_status_events` row (team migration
// 0066) — and it is the only honest answer to "when did it get here".
// `span.to` is when it left, and the ticket row's own `updatedAt` is when
// anything on it last changed; either one drawn under a stage name is a date
// that looks right and is a lie, which on a closed ticket is worse than no
// rail at all. So the check names the field, not merely "some date".
//
// AND THE SCROLL BELONGS TO THE RAIL. Six equal columns do not fit on a phone.
// The rail is allowed to overflow its own box; the RECORD is not allowed to
// grow (R29, one page width), so the wrapper that owns the horizontal scroll
// is checked too — without it the min-width below would widen the page itself.
//
// It reads the source rather than rendering, for the reason every positional
// law here does: the fact is lexical, and a render test for this component
// would need the language provider, the cache and the door behind it before it
// could look at one attribute.
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"

const ROOT = join(import.meta.dirname, "..", "..")
const RAIL = "web/components/tickets/ticket-stages.tsx"

describe("the ticket's stage rail", () => {
  const source = stripComments(readFileSync(join(ROOT, RAIL), "utf8"))

  it("stage-rail: is drawn horizontally, never as the vertical wizard rail", () => {
    expect(
      source,
      `${RAIL} must draw the kit's stepper with orientation="horizontal" — the client chose the ` +
        `horizontal design and said so twice (2026-09-09: "we chose an horizontal deesign (not this vertical)")`
    ).toContain('orientation="horizontal"')

    expect(
      source,
      `${RAIL} draws the vertical wizard rail. That is the drawing the client rejected by name on ` +
        `2026-09-09; the horizontal one is the same component with one word changed`
    ).not.toContain('orientation="vertical"')
  })

  it("stage-rail: dates come off the stage's OWN entry moment, through the shared seam", () => {
    // AMENDED 17 Sep 2026 — the same-day "make it smaller" ruling (this
    // file's own header, "AND THEN SMALLER") replaced the two-line
    // `formatDate(span.from, lang)` + separate working-day caption with
    // `formatStageMoment`, the one-line month/day/(year)/hour formatter
    // built for this exact rung (shared/web/format.ts, beside `daysSince`).
    // It still reads off `rung.span.from` — TicketStageSpan.from, the moment
    // the ticket ENTERED the stage — never `span.to` (when it left) or the
    // ticket's own `updatedAt` (when anything last changed): the field this
    // test polices did not change, only the formatter reading it did.
    expect(
      source,
      `${RAIL} must format the moment the ticket ENTERED each stage — TicketStageSpan.from, a real ` +
        `help_status_events row. Never span.to (when it left) and never the ticket's updatedAt (when ` +
        `anything last changed): a stage wearing a date it did not happen on is worse than a stage wearing none`
    ).toMatch(/formatStageMoment\(\s*rung\.span\.from\s*,/)

    expect(
      source,
      `${RAIL} must take its date formatter from @shared/web/format — the one seam, in the reader's ` +
        `own app language (dates-are-formatted)`
    ).toMatch(/import\s*\{[^}]*\bformatStageMoment\b[^}]*\}\s*from\s*"@shared\/web\/format"/)
  })

  it("stage-rail: the stage word is printed above the date on every rung, restored 19 Sep 2026", () => {
    // AMENDED 19 Sep 2026 — this test used to assert the OPPOSITE
    // (`stageLabel` must not exist), on the 17 Sep ruling "don't put the
    // [stage word] here. We can see the colors." That ruling is superseded
    // (ticket-stages.tsx's own header, "AND THEN BACK"), verbatim: "on the
    // stages in tickets, above the date i need te sateg name!" `stageLabel`
    // is back, reading the shared `HELP_STATUS` vocabulary rather than
    // repeating it, plus the one retired word that map cannot carry.
    expect(
      source,
      `${RAIL} must define a stageLabel helper again — the client asked for the stage name back, ` +
        `above the date, on every rung ("above the date i need te sateg name!", 19 Sep 2026)`
    ).toMatch(/function\s+stageLabel\s*\(/)

    expect(
      source,
      `${RAIL}'s label must actually render stageLabel(rung.status, t) — a helper that exists but is ` +
        `never called would print nothing, which is the same bug as not having it`
    ).toMatch(/stageLabel\(\s*rung\.status\s*,\s*t\s*\)/)
  })

  it("stage-rail: the rail scrolls sideways in its own box, and the record does not", () => {
    expect(
      source,
      `${RAIL} gives each stage a minimum width, so on a phone the rail is wider than the screen. ` +
        `That overflow must be owned by a wrapper here (min-w-0 + overflow-x-auto) or it widens the ` +
        `whole record instead — R29, one page width`
    ).toContain("overflow-x-auto")

    expect(
      source,
      `${RAIL}'s scroll wrapper must carry min-w-0: without it a flex ancestor sizes the box to its ` +
        `content and the clip never happens`
    ).toContain("min-w-0")
  })
})
