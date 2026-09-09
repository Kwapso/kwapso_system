// THE FOUR SLOTS THE TYPE MARK STILL CANNOT SIT IN — flagged, and now READ.
//
// ══════════════════════════════════════════════════════════════════════════════
// WHAT THIS IS FOR
//
// UI-CONVENTIONS §5 (amended 17 Aug 2026) defines a TYPE MARK: one glyph, set as
// DATA on the team's own dropdown value, sitting in the slot a kit icon would
// take and never inside a sentence. CHECKLIST 11.8 asks for one on every
// collection and 21.6 asks for glyphs on the main screens. Both shipped PART
// DONE, and both stop at the same wall in four places: the slot does not exist
// in the component library. That wall was a SEPARATE repo this one never edited;
// since 2026-08-22 the library is vendored into `shared/ui/` and the wall is
// ours, which changes what these four entries are asking for — not another
// repo's roadmap, but four slots this codebase can add whenever it decides to.
//
// UI-GAPS.md has carried those four as prose since. Prose is where a flag goes
// to rot in two directions at once:
//
//   • THE LIBRARY SHIPS THE SLOT and nobody here notices. The gap entry stays,
//     the screens stay bare, and the fix that arrived is a fix nobody applied.
//     This is the likelier of the two — the library is somebody else's release
//     note, and nothing in this repo reads it.
//   • THE ENTRY DESCRIBES A COMPONENT THAT HAS MOVED ON. A "one-line fix" that
//     names a function which no longer exists is a promise nobody can keep, and
//     it reads exactly like one that can.
//
// So each of the four is asserted against the INSTALLED library source, in both
// directions: the slot is still missing, AND the thing the entry says is already
// there really is there — because "the fix is one line" is the load-bearing half
// of every one of those entries, and it is the half that goes quietly false.
//
// A FAILURE HERE IS GOOD NEWS. It means the library shipped the slot, and the
// message says what to do: use it, and delete the UI-GAPS line in the same
// commit. This list can only shrink.
//
// IT READS THE LIBRARY SOURCE, DELIBERATELY — and since 2026-08-22 that source
// is `shared/ui/`, in this repo, rather than `node_modules/@kwapso/ui`. The
// reason is unchanged and is now simply more true: what is on disk is what this
// app is built against, and asking a published changelog what version we run
// would be asking a different question from the one that matters.
//
// One thing about these four entries DID change with the move, and it is worth
// saying plainly. "The fix is one line" used to mean "one line, in a repo we do
// not own, on their release schedule". It now means one line, here, today. So a
// failure below is no longer news about somebody else's library — it is a slot
// this repo added and has not yet used.
// ══════════════════════════════════════════════════════════════════════════════

import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
// The four slots are ENGINE behaviour now: the old library's config-driven
// pieces live in shared/web (screen-engine, list-compat), drawn by the design
// kit underneath. Same four checks, at the code's current address.
const UI = join(ROOT, "shared", "web")

function library(...parts: string[]): string {
  const path = join(UI, ...parts)
  // A missing file is not a passing check: it is this suite reading nothing.
  expect(existsSync(path), `the library file ${parts.join("/")} is gone — UI-GAPS needs re-reading`).toBe(true)
  return readFileSync(path, "utf8")
}

/** The `renderList` function's body, which is the whole of gap #16. Sliced out
 * so a `leading` anywhere ELSE in that 900-line file (the detail header has
 * one) cannot be mistaken for the row slot having arrived. */
function renderListBody(): string {
  const src = library("screen-engine", "screen-renderer.tsx")
  const from = src.indexOf("function renderList(")
  expect(from, "screen-renderer no longer has a `renderList` — UI-GAPS #16 needs re-reading").toBeGreaterThan(-1)
  const to = src.indexOf("\nfunction renderDetail(", from)
  expect(to, "renderList is no longer followed by renderDetail — the slice is wrong").toBeGreaterThan(from)
  return src.slice(from, to)
}

describe("the type mark's four missing slots (UI-GAPS 16, 18, 19, 20)", () => {
  // ── #16 · A RECIPE-DRIVEN ROW ────────────────────────────────────────────
  // Every ticket, story, account and knowledge list in the app is drawn by
  // `ScreenRenderer`, which maps a row to `{ id, title, subtitle }`. The mark
  // has nowhere to go, and the workaround — writing the glyph into the title —
  // is the ONE shape §5 refuses. Widened 19 Aug 2026: the same missing slot
  // costs a PICTURE too, on four lists whose rows arrive carrying one.
  it("#16 · SHIPPED — renderList fills the leading slot, and the host feeds it", () => {
    const list = library("list-compat.tsx")
    expect(list, "ListItem must still declare `leading` — the slot the row is drawn in").toMatch(
      /leading\?:\s*React\.ReactNode/
    )
    // THE LIBRARY HALF, shipped in v0.11.0: the renderer reads a column off the
    // row and hands it to the slot.
    const body = renderListBody()
    expect(body, "renderList must still render the library List").toContain("<List")
    expect(
      /leading:\s*leadingOf\(row\)/.test(body),
      "renderList no longer passes a leading node to List — the row marks have gone dark"
    ).toBe(true)

    // AND THE HOST HALF, which is the part that actually puts a picture on a
    // screen. A recipe naming no `leading` column draws nothing, so the library
    // shipping the slot is worth exactly as much as the recipes that use it.
    const recipes = readFileSync(join(ROOT, "web", "lib", "screens.ts"), "utf8")
    const fed = [...recipes.matchAll(/leading:\s*"(\w+)"/g)].map((m) => m[1])
    expect(
      fed.length,
      "no list recipe names a `leading` column — the slot is open and every row is text again"
    ).toBeGreaterThan(0)

    // …and the column it names is a NODE the shaper builds, not a URL. Pointing
    // it at `logoUrl` renders the path as text in the slot, which is the one
    // failure mode the library's own note warns about.
    const shape = readFileSync(join(ROOT, "web", "components", "deep-link", "shape.tsx"), "utf8")
    for (const column of new Set(fed))
      expect(
        new RegExp(`${column}:\\s*<`).test(shape),
        `recipes name \`${column}\` as the leading column, but shape.tsx does not build a NODE for it — ` +
          "a bare string there renders as text in the slot rather than as a mark"
      ).toBe(true)
  })

  // ── #18 · A TAB ──────────────────────────────────────────────────────────
  // The gap as it was written: a record strip has a tab per TYPE, and a type is
  // exactly the thing §5 gives a mark to. `TabsView` resolved `icon` as a kit
  // glyph NAME, so a pictograph in that slot rendered nothing at all. The
  // library closed it in v0.11.0 (a tab takes a NODE), and the check has
  // followed the glyph across three redraws of the tickets screen since.
  // ITS SUBJECT IS NO LONGER TICKETS — the client retired their marks on
  // 2026-09-07 — so the positive half is asserted on a kind that still wears
  // one, and the retirement is asserted as a ratchet beside it. The long note
  // inside carries the history.
  it("#18 · SHIPPED — a tab takes a node, and the kinds that still HAVE marks carry them", () => {
    const tabs = library("screen-engine", "tabs-view.tsx")
    expect(
      /icon\??:\s*(React\.)?ReactNode/.test(tabs),
      "TabItem no longer takes a node — the type marks on the record strips have gone dark"
    ).toBe(true)

    // The host half: a screen reads the glyph out of the TEAM'S vocabulary
    // rather than a map in the component, which is what makes an emoji edited on
    // the Dropdown values screen arrive without a deploy.
    //
    // ── THE ASSERTION HAS MOVED THREE TIMES, AND THE THIRD IS A RETIREMENT ──
    //
    // The SEAM is "the team's own glyph reaches a record row without a deploy",
    // and for two years what drew a TICKET row kept changing under it:
    //
    //   1 · It asserted `icon: ticketMarks.get(` — the per-type TABS — until the
    //       client's 2026-09-06 ordering retired them (triage is where a type is
    //       decided, so a strip of type tabs beside it offered the same
    //       categorisation twice).
    //   2 · It then asserted `shapeHelpList(rows, ticketMarks)`, the recipe-drawn
    //       list those tabs sat above. Later the same day the client ruled that
    //       every ticket tab draws the triage list's own TABLE ("do the list view
    //       exactly the same as we have it in the Triage list"), so the recipe
    //       renderer left this screen and `shapeHelpList` with it.
    //   3 · It then asserted `shapeHelpList(rows, ticketMarks)`'s successor,
    //       `marks={ticketMarks}` reaching `TicketRowsTable`.
    //
    // ON 2026-09-07 THE MARKS WERE RETIRED FOR TICKETS. Client, over a
    // screenshot of the ticket list's Type column: *"for type, kill the emojis.
    // this is legacy. in current system we use colors"*. That is a RULING, not a
    // regression, and the difference is the whole reason this comment is long:
    // the first two moves happened because a glyph nearly went dark by accident
    // and the assertion had to follow it; this one happened because somebody
    // decided the glyph should not be there. So the ticket clause is not
    // "temporarily failing" and it is not quietly deleted — it is inverted, and
    // the inversion is the coverage.
    //
    // NOTHING WAS DROPPED. The seam is unchanged and still has real subjects:
    // stories and sprints draw their marks through the same `markMap`, on four
    // screens. So this check now proves the same sentence about the kinds that
    // still have marks, plus the negative the ruling asked for. The stored
    // glyphs on `Ticket type` rows were NOT touched — see web/lib/type-marks.ts,
    // which carries the ruling and what it left alone.
    const marksSeam = readFileSync(join(ROOT, "web", "lib", "type-marks.ts"), "utf8")

    // THE POSITIVE HALF — a record kind that still wears a glyph, drawn on a
    // real screen, read through the one seam.
    expect(
      /story:\s*"Story type"/.test(marksSeam),
      "MARK_GROUP no longer names the story vocabulary — this check has no subject left"
    ).toBe(true)
    const stories = readFileSync(join(ROOT, "web", "components", "work", "stories-screen.tsx"), "utf8")
    // `.` DOES NOT MATCH A NEWLINE. `markMap\(.*MARK_GROUP\.story\)` needed the
    // whole call typed on one physical line, so the ordinary wrap Prettier
    // applies the moment that argument list grows would have reddened a law
    // about which seam the screen reads. `[^)]*` crosses lines and still stops
    // at the call's own closing paren, so it cannot drift into a later call
    // either.
    expect(
      /markMap\(\s*[^)]*MARK_GROUP\.story\s*\)/.test(stories),
      "the stories screen no longer reads the team's own glyphs through the type-mark seam"
    ).toBe(true)
    // The row parameter's NAME is the screen's business, not this law's: `s`
    // here is a `.map((s) => …)` callback and renaming it to `story` changes
    // nothing. What must hold is that the mark drawn is looked up from `marks`
    // by that row's own storyType.
    expect(
      /marks\?\.get\(\s*\w+\.storyType/.test(stories),
      "the stories screen no longer draws the team's own glyph for a row's kind"
    ).toBe(true)

    // THE NEGATIVE HALF — the ruling, held as a ratchet. `MARK_GROUP` is a
    // closed union, so removing the key is what makes this structural: a screen
    // that tries to look a ticket's glyph up fails `tsc`. Asserting on the seam
    // rather than on each of the four screens that used to draw one is the
    // honest shape — those screens can be rewritten, and there is exactly one
    // door back to the emoji.
    expect(
      /ticket:\s*"Ticket type"/.test(marksSeam),
      "MARK_GROUP.ticket is back. The client retired the ticket type emoji on 2026-09-07 " +
        '("for type, kill the emojis … we use colors") and the colour is the mark now ' +
        "(Swatch + ticketTypeColour). Restoring the group needs a ruling, not a commit."
    ).toBe(false)
    const strip = readFileSync(join(ROOT, "web", "components", "tickets", "tickets-collection.tsx"), "utf8")
    expect(
      /markMap\(/.test(strip),
      "the tickets screen reads type marks again — see the ruling above"
    ).toBe(false)
    // …and what replaced it is on screen, so this is a SWAP rather than a loss:
    // the kind is still drawn, by its colour.
    expect(
      /<Swatch colour=\{ticketTypeColour\(w\.helpType\)\} \/>/.test(strip),
      "the ticket table's Type cell draws neither a glyph nor a colour — the kind has gone dark"
    ).toBe(true)
  })

  it("#19 · SHIPPED — an empty state carries its concept glyph, and every recipe feeds one", () => {
    // The library half: the config declares the slot and the frame renders it.
    const config = library("screen-engine", "config.ts")
    expect(config, "CollectionConfig must still declare emptyText").toMatch(/emptyText:\s*string/)
    expect(
      /emptyIcon/.test(config),
      "CollectionConfig no longer takes an `emptyIcon` — every recipe's empty state is a bare grey sentence again"
    ).toBe(true)
    const frame = library("screen-engine", "collection-frame.tsx")
    expect(
      /config\.emptyIcon/.test(frame),
      "the collection frame no longer reads `emptyIcon`, so the slot is declared and drawn by nobody"
    ).toBe(true)

    // AND THE HOST HALF, which is the part that puts a glyph on a screen. A
    // recipe that names none renders exactly what it rendered before, so the
    // library shipping the slot is worth precisely the recipes that use it.
    const recipes = readFileSync(join(ROOT, "web", "lib", "screens.ts"), "utf8")
    expect(
      /emptyIcon:\s*opts\.icon\s*\?\s*CONCEPT_ICON\[/.test(recipes),
      "listCollection no longer resolves its icon through CONCEPT_ICON — the empty state and the nav rail can now drift"
    ).toBe(true)

    // EVERY list recipe, not most of them. A brand-new team sees the empty state
    // of every screen in the app on its first day, and one bare sentence among
    // fourteen glyphs reads as the broken one.
    const calls = [...recipes.matchAll(/listCollection\([\s\S]*?\n\s*\)|listCollection\([^\n]*\)/g)]
      .map((m) => m[0])
      .filter((c) => !c.includes("emptyText: string") && !c.includes("…"))
    const bare = calls.filter((c) => !c.includes("icon:"))
    expect(
      bare.length,
      `${bare.length} list recipe(s) still have no concept glyph on their empty state:\n  ` +
        bare.map((c) => c.split("\n")[0].slice(0, 80)).join("\n  ")
    ).toBe(0)
  })

  // ── #20 · A BIG NUMBER ───────────────────────────────────────────────────
  it("#20 · SHIPPED — a stat card takes a glyph, and the numbers band carries one", () => {
    const grid = readFileSync(join(ROOT, "shared", "ui", "components", "stat-grid", "stat-grid.tsx"), "utf8")
    expect(grid, "StatItem must still be the shape this check reads").toContain(
      "export interface StatItem"
    )
    const from = grid.indexOf("export interface StatItem")
    const item = grid.slice(from, grid.indexOf("}", from))
    // The kit's glyph slot is `support` (a node beside the value); `chart` is
    // the second. Either carries a mark, so the slot exists.
    expect(/support\?:|chart\?:/.test(item), "StatItem no longer has a glyph slot (support/chart)").toBe(true)

    const panel = readFileSync(join(ROOT, "web", "components", "work", "work-logs-panel.tsx"), "utf8")
    expect(
      (panel.match(/icon:\s*<Icon name=\{CONCEPT_ICON\./g) ?? []).length,
      "the numbers band's cards no longer carry their concept icons"
    ).toBeGreaterThanOrEqual(3)
  })

  // …and the flag list itself cannot drift away from the four checks above. An
  // entry silently deleted here would leave the check standing over nothing;
  // an entry marked shipped would leave the check contradicting the document.
  it("UI-GAPS.md agrees with the four checks above — all four slots are closed", () => {
    const gaps = readFileSync(join(ROOT, "documents", "UI-GAPS.md"), "utf8")
    // ALL FOUR ARE NOW SHIPPED — #16, #18 and #20 in library v0.11.0 and #19 in
    // v0.12.0 (19 Aug 2026) — and each is asserted above as WIRED rather than as
    // missing. So this list is the other direction of the same bookkeeping: a
    // row still flagged for the library would be a flag pointing at nothing,
    // and a row deleted outright would leave its check standing over a gap
    // nobody records. Both are the rot this file exists to prevent.
    for (const n of [16, 18, 19, 20]) {
      const row = gaps.split("\n").find((line) => line.startsWith(`| ${n} |`))
      expect(row, `UI-GAPS.md has no row ${n} — this suite is checking a gap nobody records`).toBeTruthy()
      expect(
        (row as string).includes("flag for the library"),
        `UI-GAPS #${n} is still flagged for the library, but the check above asserts the slot is shipped AND fed`
      ).toBe(false)
      expect(
        /SHIPPED in the library/.test(row as string),
        `UI-GAPS #${n} does not record which library version closed it`
      ).toBe(true)
    }
  })
})
