// R62 — THE TWO ZEROS ARE ONE REGISTER, AND THE ADD BUTTON IS THE ONLY
// DIFFERENCE.
//
// The client, 2026-09-09, verbatim: "the empty because of filters hosul look
// the same as empty collection but the add button."
//
// A collection has two empty states and they are different FACTS. RESTING: it
// holds no rows at all, this is first run, and the screen exists to be filled.
// FILTERED: it holds rows a search, a tab or a facet has narrowed to none —
// nothing is wrong, and offering "Add the first" invites a duplicate of a
// record a filter is hiding. Each front door draws BOTH through ONE component
// with `filtered` as the switch.
//
// WHY THIS FILE IS PART SOURCE SCAN AND PART DOM.
// Clause (i) is a source read because it is about SHAPE: the subtraction has to
// live in the component, so a call site has nothing left to forget. Clause (ii)
// is a real render because this repo's own record on this file says a source
// read is not enough — `collection-frame-empty.test.tsx`'s header names three
// instruments that all walked somewhere the violation could not be, four
// recurrences deep, and says so in as many words: "it asks it of the DOM rather
// than of the source, because every previous attempt to settle this by reading
// the file reached a confident wrong answer, including two this week." A prop
// that is declared and then ignored reads perfectly and draws the wrong button.
//
// EVERY ABSENCE ASSERTION HERE IS CANARIED. An absence passes against a tree
// that rendered nothing at all, so each `filtered` render must first prove it
// reached its own register, and the same register is drawn again WITHOUT
// `filtered` to prove the button appears when it should. A test that cannot
// fail is not evidence.

import { cleanup, render, screen } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { SECOND_ZERO_REGISTER_OK } from "@shared/rules/registry"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import { PortalEmpty } from "../../web-portal/components/portal-empty"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")
const WEB = join(ROOT, "web")
const PORTAL = join(ROOT, "web-portal")
const SHARED_WEB = join(ROOT, "shared", "web")

/** The agency door's register and the portal's, each with the identifier its
 * `filtered` branch has to funnel the caller's action through. Two doors, one
 * law — and named here rather than hand-described in prose so clause (i) reads
 * the same sentence off both. */
const REGISTERS = [
  {
    what: "CollectionEmptyState (the agency door)",
    file: join(ROOT, "shared/web/screen-engine/collection-frame.tsx"),
    declaration: "export function CollectionEmptyState(",
    /* The props a caller hands over, and the names the component may actually
       render — one per withdrawn prop. */
    subtractions: [
      { prop: "onCreate", withdrawn: "create" },
      { prop: "onImport", withdrawn: "importer" },
    ],
  },
  {
    what: "PortalEmpty (the client portal)",
    file: join(ROOT, "web-portal/components/portal-empty.tsx"),
    declaration: "export function PortalEmpty(",
    subtractions: [{ prop: "action", withdrawn: "act" }],
  },
]

/** ONE function's source — its declaration to its closing brace, and no
 * further. Bounded by BRACE DEPTH rather than by the next `export`, because
 * `CollectionEmptyState` is followed in the same file by `CollectionFrame`,
 * which legitimately writes `onCreate={createAction?.onCreate}` — a slice that
 * ran to the end of the file would read the engine's own correct call site as
 * the register rendering a raw prop, which is a false positive that would have
 * to be silenced and would take the real check down with it. */
function bodyOf(file: string, declaration: string): string {
  const src = stripComments(readFileSync(file, "utf8"))
  const at = src.indexOf(declaration)
  expect(at, `R62 — ${declaration} is gone from ${file}`).toBeGreaterThan(-1)
  // The first closing brace in COLUMN ZERO after the declaration. Brace depth
  // is the obvious way and it is wrong here: both registers destructure their
  // props, so the parameter list opens and closes a brace of its own and a
  // depth counter returns to zero before the body has even started.
  const end = src.indexOf("\n}\n", at)
  expect(end, `R62 — ${declaration} in ${file} never closes; the scan cannot bound it`).toBeGreaterThan(at)
  return src.slice(at, end + 2)
}

afterEach(cleanup)

describe("R62 · the two zeros are one register, and the add button is the only difference", () => {
  /* ── (i) THE SUBTRACTION IS IN THE COMPONENT ──────────────────────────────
     Not "the call site gates its own action" — that is precisely the shape R50
     was written to end one component along, and precisely what forty-three
     bespoke zero states in this app got wrong twelve identical times. The
     component takes the action unconditionally and drops it itself. */
  it.each(REGISTERS)("$what withdraws its create action on `filtered`, in its own body", (reg) => {
    const body = bodyOf(reg.file, reg.declaration)

    expect(body, `R62 — ${reg.what} must declare a \`filtered\` prop`).toMatch(
      /\bfiltered\s*=\s*false\s*,/
    )

    for (const { prop, withdrawn } of reg.subtractions) {
      // The subtraction itself, positionally: the caller's prop reaches the
      // screen only through a name `filtered` has already passed through.
      expect(
        body,
        `R62 — ${reg.what} must compute \`${withdrawn}\` as \`filtered ? undefined : ${prop}\`, so the caller cannot forget to gate it`
      ).toMatch(new RegExp(`const\\s+${withdrawn}\\s*=\\s*filtered\\s*\\?\\s*undefined\\s*:\\s*${prop}\\b`))

      // …and the RAW prop may not survive into the JSX below it. A component
      // that computes the withdrawal and then renders the original anyway is
      // the exact bug a source scan is here to catch: it type-checks, it reads
      // correctly, and it draws the button over a filtered collection.
      const jsx = body.slice(body.indexOf("return ("))
      expect(
        jsx,
        `R62 — ${reg.what} renders \`${prop}\` directly below its own subtraction; the JSX must use \`${withdrawn}\` and nothing else`
      ).not.toMatch(new RegExp(`\\b${prop}\\b`))
    }
  })

  /* ── (ii) AND IT IS PROVED BY RENDERING ──────────────────────────────────
     The half a source read cannot reach. */
  it("CollectionEmptyState: filtered draws no create button; resting draws both", () => {
    const noop = () => {}

    const filtered = render(
      <CollectionEmptyState
        filtered
        title="No accounts yet."
        onCreate={noop}
        onImport={noop}
        onClearFilters={noop}
      />
    )
    // POSITIVE FIRST — it really is the register we are looking at, so the two
    // absences below cannot pass against an empty tree.
    expect(
      filtered.container.querySelector('[data-slot="collection-empty-body"]'),
      "R62 — the filtered render did not reach the register at all; every absence below would pass vacuously"
    ).not.toBeNull()
    // The collection's own claim about itself is NOT said mid-search.
    expect(screen.queryByText("No accounts yet.")).toBeNull()
    expect(screen.queryByText("Add the first")).toBeNull()
    expect(screen.queryByText("Import a list")).toBeNull()
    // The one way out is allowed: clearing a filter is a retreat, not a create.
    expect(screen.getByText("Clear filters")).toBeTruthy()

    cleanup()

    const resting = render(
      <CollectionEmptyState title="No accounts yet." onCreate={noop} onImport={noop} />
    )
    expect(
      resting.container.querySelector('[data-slot="collection-empty-body"]'),
      "R62 — the resting render did not reach the register"
    ).not.toBeNull()
    // THE CANARY: the same call, minus `filtered`, must draw what the filtered
    // one refused. Without this the three `queryByText(...)` nulls above would
    // hold just as well against a component that never draws a button at all.
    expect(screen.getByText("No accounts yet.")).toBeTruthy()
    expect(screen.getByText("Add the first")).toBeTruthy()
    expect(screen.getByText("Import a list")).toBeTruthy()
  })

  it("PortalEmpty: filtered draws no act; resting draws it", () => {
    const act = { label: "Ask us something", onClick: () => {} }

    const filtered = render(<PortalEmpty filtered title="Nothing here yet." action={act} />)
    expect(
      filtered.container.querySelector('[data-slot="portal-empty"]'),
      "R62 — the filtered render did not reach the portal register"
    ).not.toBeNull()
    expect(screen.queryByText("Nothing here yet.")).toBeNull()
    expect(screen.queryByText("Ask us something")).toBeNull()

    cleanup()

    const resting = render(<PortalEmpty title="Nothing here yet." action={act} />)
    expect(
      resting.container.querySelector('[data-slot="portal-empty"]'),
      "R62 — the resting render did not reach the portal register"
    ).not.toBeNull()
    expect(screen.getByText("Nothing here yet.")).toBeTruthy()
    expect(screen.getByText("Ask us something")).toBeTruthy()
  })

  /* ── (iii) ONE FILTERED REGISTER, NOT TWO ────────────────────────────────
     `ShapeStateBody` is still the app's LOADING and ERROR body and stays; this
     is only about its `filtered` register, which is the second look the client
     was pointing at. */
  it("nothing draws the kit's second filtered register", () => {
    const offenders: string[] = []
    const exemptUsed = new Set<string>()
    let scanned = 0

    for (const f of sourceFiles([WEB, PORTAL, SHARED_WEB], {
      extensions: [".tsx"],
      relativeTo: ROOT,
      skipTests: true,
    })) {
      scanned++
      const src = stripComments(f.source)
      let from = 0
      for (;;) {
        const at = src.indexOf("<ShapeStateBody", from)
        if (at === -1) break
        from = at + 1
        const close = src.indexOf(">", at)
        const tag = src.slice(at, close === -1 ? src.length : close + 1)
        // A bare `filtered` or `filtered={…}` on the tag — the no-results
        // register. `state="loading"` / `state="error"` carry no such prop and
        // are untouched by this clause.
        if (!/\bfiltered\b/.test(tag)) continue
        if (f.rel in SECOND_ZERO_REGISTER_OK) exemptUsed.add(f.rel)
        else
          offenders.push(
            `${f.rel} — draws <ShapeStateBody … filtered>. R62: a collection's filtered zero is CollectionEmptyState (agency) or PortalEmpty (portal) with \`filtered\`, so it is the same body as the resting one minus the add button.`
          )
      }
    }

    // BLINDNESS TRIPWIRE — a walk that stopped finding files would report
    // perfect compliance.
    expect(
      scanned,
      "R62 — the source walk found almost no .tsx files; clause (iii) is measuring nothing"
    ).toBeGreaterThan(100)

    expect(offenders, offenders.join("\n  ")).toEqual([])

    // ROT CHECK — an exemption whose file no longer draws one is stale, and a
    // stale line is how the next real offence hides behind an old reason.
    for (const rel of Object.keys(SECOND_ZERO_REGISTER_OK))
      expect(
        exemptUsed.has(rel),
        `R62 — SECOND_ZERO_REGISTER_OK names ${rel}, which no longer draws a <ShapeStateBody … filtered>; delete the line`
      ).toBe(true)
  })

  /* ── (iv) THE ENGINE ASKS THE QUESTION HONESTLY ──────────────────────────
     A GROWING collection's search lives in `<PagedFind>` at the door, so the
     frame's own query is always empty. Without `narrowedOutside` every
     door-searched zero — accounts, contacts, stories, processes, knowledge
     sources, every nested work panel — read as a RESTING one, and drew "Add
     the first" over a list a search term was hiding. */
  it("CollectionFrame's `narrowed` includes the narrowing above it, and is what it passes as `filtered`", () => {
    const frame = stripComments(
      readFileSync(join(ROOT, "shared/web/screen-engine/collection-frame.tsx"), "utf8")
    )

    expect(
      frame,
      "R62 — CollectionFrame must OR `narrowedOutside` into its own `narrowed` predicate, or a door-searched zero reads as a resting one"
    ).toMatch(/const narrowed =[\s\S]{0,220}?\|\|\s*narrowedOutside/)

    // Both header paths (`useKitPanel` and the app-drawn one) must hand the
    // predicate to the register. Two, because this file has had two header
    // implementations since v1.2.28 and R50 was live on one of them and absent
    // from the other for three days.
    const passed = frame.match(/filtered=\{narrowed\}/g) ?? []
    expect(
      passed.length,
      "R62 — both of CollectionFrame's render paths must pass `filtered={narrowed}` to CollectionEmptyState"
    ).toBe(2)

    // And the create action is handed over unconditionally on both — the whole
    // point of putting the subtraction in the component. A path that re-gated
    // it here would be a second answer to one question.
    expect(
      frame,
      "R62 — CollectionFrame must hand `createAction?.onCreate` over unconditionally and let the register withdraw it"
    ).toMatch(/onCreate=\{createAction\?\.onCreate\}/)
  })
})
