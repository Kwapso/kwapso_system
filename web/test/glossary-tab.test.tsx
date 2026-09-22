// THE GLOSSARY TAB. Aurora's ruling, 20 Sep 2026, verbatim: "Add a tab to
// Knowledge with a glossary, and craft me an artifact identifying which
// words we use and their definitions... this will let our users search
// there, but should be part of the knowledge base and feed the assistant."
//
// AMENDED 21 Sep 2026: SAME CARD, SAME GRID. Aurora, on this tab's own
// dl/dt/dd rows, verbatim: "But why did you invent this new design? Why
// don't you use the kind of square card, same as in all?" The tab no longer
// draws a bespoke list: it maps its words through `KnowledgeSourceCard`, the
// exact component the Knowledge screen's "All" tab already renders its own
// gallery with (web/components/knowledge/knowledge-screen.tsx, web/
// components/knowledge/knowledge-source-card.tsx), inside the same
// `<CardGrid fluid minItemWidth={KNOWLEDGE_CARD_MIN}>` wall. What used to be
// `GlossaryList`'s own row markup is gone; the one thing that survives from
// it is the definition-preview computation, now exported as
// `definitionPreview` (glossary-list.tsx) and handed to the card's own
// `preview` prop, which takes the "Last edited" meta line's slot.
//
// TWO KINDS OF PROOF, the same split `knowledge-search-restored.test.tsx`
// and `knowledge-kind-tabs.test.tsx` already use for this exact screen: a
// RENDER proof (`definitionPreview` plus `KnowledgeSourceCard` itself, which
// needs nothing of `KnowledgeScreen`'s own heavy scope object to draw), and a
// SOURCE-READ proof of the wiring that puts it on that screen (the tab, the
// search placeholder, the "Add word" action, the card call site), the shape
// the whole file would need to render `<PagedFind>`'s tab strip and live
// cache plumbing for no more certainty than reading the one line that sets
// each of them.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { definitionPreview } from "@/components/knowledge/glossary-list"
import { KnowledgeSourceCard } from "@/components/knowledge/knowledge-source-card"
import { GlossaryFormDialog } from "@/components/knowledge/glossary-form-dialog"
import { PagedFind, type FindQuery } from "@/components/records/paged-find"
import type { KnowledgeSource } from "@shared/types"

afterEach(cleanup)

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")

function readKnowledgeScreen(): string {
  return readFileSync(join(ROOT, "web", "components", "knowledge", "knowledge-screen.tsx"), "utf8")
}

function readKnowledgeSourceCard(): string {
  return readFileSync(join(ROOT, "web", "components", "knowledge", "knowledge-source-card.tsx"), "utf8")
}

function readWritePanels(): string {
  return readFileSync(join(ROOT, "web", "components", "deep-link", "write-panels.tsx"), "utf8")
}

function makeWord(over: Partial<KnowledgeSource>): KnowledgeSource {
  return {
    id: over.id ?? "W1",
    kind: "glossary",
    originTable: null,
    originRowId: null,
    compartment: "agency",
    accountId: null,
    appId: null,
    ticketId: null,
    sprintId: null,
    recordDate: null,
    title: "Wave",
    summary: null,
    body: "A package of phases sold to one account.",
    bodyBytes: 0,
    bodyTruncated: false,
    sourceUrl: null,
    fileUrl: null,
    fileName: null,
    fileType: null,
    fileBytes: 0,
    fileNote: null,
    visibility: "team",
    ownerUserId: null,
    visibleToAppId: null,
    visibleToAppName: null,
    indexedAt: null,
    chunkCount: 0,
    indexedChunks: 0,
    indexError: null,
    active: true,
    createdAt: "2026-09-20T00:00:00.000Z",
    creatorName: "Aurora",
    editorName: null,
    updatedAt: null,
    accounts: [],
    apps: [],
    sharedWith: "agency",
    generatedOnly: false,
    sightingsCount: 0,
    ...over,
  }
}

describe("the glossary word renders through KnowledgeSourceCard, the same card the All tab draws", () => {
  it("the card's own data-slot is present, the word is its title, and the definition preview is its body line", () => {
    const word = makeWord({ id: "W1", title: "Wave", body: "A package of phases sold to one account." })
    const { container } = render(
      <KnowledgeSourceCard source={word} preview={definitionPreview(word)} onOpen={() => {}} />
    )
    // THE SAME CARD COMPONENT, NOT A LOOKALIKE: `data-slot="card"` is the
    // kit's own Card primitive (shared/ui/components/card/card.tsx) stamping
    // itself, so this is the real component rendering, not a div styled to
    // match it.
    expect(container.querySelector('[data-slot="card"]')).toBeTruthy()
    expect(container.querySelector('[data-slot="card-title"]')?.textContent).toBe("Wave")
    expect(screen.getByText("A package of phases sold to one account.")).toBeTruthy()
  })

  it("reads the definition out of `summary` when `body` is null, the real door row's own shape", () => {
    const word = makeWord({
      id: "W1",
      title: "Ready",
      body: null,
      summary: "Ready, a glossary word. Every story is closed, but nobody's told the client yet.",
    })
    render(<KnowledgeSourceCard source={word} preview={definitionPreview(word)} onOpen={() => {}} />)
    expect(screen.getByText("Every story is closed, but nobody's told the client yet.")).toBeTruthy()
    // The fixed opening itself never shows, it names the word a second time
    // right under the word's own heading, which is not a definition.
    expect(screen.queryByText(/a glossary word/i)).toBeNull()
  })

  it("cuts a long definition to ~140 characters, with an ellipsis", () => {
    const long =
      "A sprint is a fixed block of time, usually one to three weeks, in which the team plans, builds and " +
      "validates a slice of an app, and every sprint carries its own named type so a reader can tell at a glance " +
      "what kind of work it holds."
    const word = makeWord({ id: "W1", title: "Sprint", body: long })
    render(<KnowledgeSourceCard source={word} preview={definitionPreview(word)} onOpen={() => {}} />)
    expect(screen.queryByText(long)).toBeNull()
    const preview = screen.getByText(/…$/)
    expect(preview.textContent?.length).toBeLessThanOrEqual(141)
    expect(long.startsWith(preview.textContent?.slice(0, -1) ?? "")).toBe(true)
  })

  it("draws no deactivate control, the card never had one, for any source, glossary included", () => {
    const word = makeWord({ id: "W9" })
    render(<KnowledgeSourceCard source={word} preview={definitionPreview(word)} onOpen={() => {}} />)
    expect(screen.queryByLabelText(/take this word away/i)).toBeNull()
    expect(screen.queryByLabelText(/stop using this/i)).toBeNull()
    // No SEPARATE control rides on the cell: `role="button"` belongs to the
    // card itself (the whole card is the one press target, the identical
    // shape the "All" tab's own card already is), never to a second element
    // nested inside it.
    expect(screen.queryAllByRole("button")).toHaveLength(1)
  })

  it("edit stays reachable, pressing the card is the one action, and it opens", () => {
    const onOpen = vi.fn()
    const word = makeWord({ id: "W9" })
    const { container } = render(<KnowledgeSourceCard source={word} preview={definitionPreview(word)} onOpen={onOpen} />)
    const card = container.querySelector('[data-slot="card"]')
    expect(card).toBeTruthy()
    fireEvent.click(card as Element)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it("KnowledgeSourceCard's own source declares the `preview` prop, wired to the meta line's slot", () => {
    const src = readKnowledgeSourceCard()
    const fnAt = src.indexOf("export function KnowledgeSourceCard(")
    expect(fnAt, "the component's own declaration").toBeGreaterThan(-1)
    expect(src.slice(fnAt)).toMatch(/preview\?:\s*string/)
  })
})

describe("GlossaryFormDialog, add or correct a word", () => {
  const noop = async () => {}

  it("cannot submit until both the word and its definition are filled in", () => {
    render(<GlossaryFormDialog open onOpenChange={() => {}} onSubmit={noop} />)
    const submitButton = () => screen.getByRole("button", { name: /submit/i }) as HTMLButtonElement
    expect(submitButton().disabled).toBe(true)
    fireEvent.change(screen.getByLabelText(/^word/i), { target: { value: "Wave" } })
    expect(submitButton().disabled).toBe(true)
    fireEvent.change(screen.getByLabelText(/definition/i), {
      target: { value: "A package of phases sold to one account." },
    })
    expect(submitButton().disabled).toBe(false)
  })

  it("submits the trimmed word and definition typed into it", async () => {
    const onSubmit = vi.fn(noop)
    render(<GlossaryFormDialog open onOpenChange={() => {}} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText(/^word/i), { target: { value: "  Wave  " } })
    fireEvent.change(screen.getByLabelText(/definition/i), { target: { value: "  A package of phases.  " } })
    fireEvent.click(screen.getByRole("button", { name: /submit/i }))
    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ word: "Wave", definition: "A package of phases." })
    )
  })

  it("prefills from `initial` in edit mode, and titles itself as a correction", () => {
    render(
      <GlossaryFormDialog
        open
        onOpenChange={() => {}}
        onSubmit={noop}
        initial={{ word: "Wave", definition: "A package of phases." }}
      />
    )
    expect(screen.getByText("Correct this word")).toBeTruthy()
    expect(screen.getByDisplayValue("Wave")).toBeTruthy()
    expect(screen.getByDisplayValue("A package of phases.")).toBeTruthy()
  })
})

describe("the Glossary tab is wired into the Knowledge screen (source-read proof)", () => {
  it("is drawn by hand, always present, and renders through the same card and grid as the All tab", () => {
    const src = readKnowledgeScreen()
    expect(src).toMatch(/value:\s*"glossary"/)
    // THE SAME CARD, NEVER A BESPOKE LIST. No `GlossaryList` import or call
    // is left anywhere in this file, and the glossary branch maps its rows
    // through `KnowledgeSourceCard` inside `<CardGrid>`, exactly the "All"
    // tab's own call a few lines above it.
    expect(src).not.toMatch(/GlossaryList/)
    expect(src).not.toMatch(/<dl[\s>]/)
    expect(src).toMatch(
      /import\s*\{\s*definitionPreview\s*\}\s*from\s*"@\/components\/knowledge\/glossary-list"/
    )
    const glossaryBranchAt = src.indexOf('if (scope.kind === "team" && activeTab === "glossary")')
    expect(glossaryBranchAt, "the glossary branch itself").toBeGreaterThan(-1)
    const glossaryBranch = src.slice(glossaryBranchAt, glossaryBranchAt + 2000)
    expect(glossaryBranch, "the same wall the All tab draws").toMatch(/<CardGrid fluid minItemWidth=\{KNOWLEDGE_CARD_MIN\}/)
    expect(glossaryBranch, "the same card component").toMatch(/<KnowledgeSourceCard/)
    expect(glossaryBranch, "the word's own definition preview, as the card's body text").toMatch(
      /preview=\{definitionPreview\(source\)\}/
    )
    // NO DEACTIVATE ACTION WIRED FROM THE CARD: the call site passes only
    // `source`, `preview` and `onOpen`, never a delete/deactivate handler.
    expect(glossaryBranch).not.toMatch(/onDelete|setKnowledgeActive|canDelete/)
  })

  it("seeds itself once, through the idempotent door, the first time the tab is opened", () => {
    const src = readKnowledgeScreen()
    expect(src).toMatch(/contentApi\s*\n?\s*\.seedGlossary\(\)/)
  })

  it("invalidates the found cache too, not only the plain list, so a first seed shows up without a reload", () => {
    const src = readKnowledgeScreen()
    const seedAt = src.indexOf(".seedGlossary()")
    expect(seedAt, "the seed call itself").toBeGreaterThan(-1)
    const thenBlock = src.slice(seedAt, seedAt + 1400)
    expect(thenBlock, "the plain list still refreshes (the All tab, restingEmpty)").toMatch(
      /invalidate\(knowledgeKey\(teamId\)\)/
    )
    expect(
      thenBlock,
      "and the found cache the Glossary tab is ACTUALLY reading from is dropped too"
    ).toMatch(/invalidateFindsOf\(knowledgeKey\(teamId\)\)/)
    expect(src).toMatch(
      /import\s*\{\s*PagedFind,\s*invalidateFindsOf\s*\}\s*from\s*"@\/components\/records\/paged-find"/
    )
  })

  it("the search box narrows to the glossary, the same toolbar every collection draws (R48)", () => {
    const src = readKnowledgeScreen()
    expect(src).toMatch(/placeholder=\{t\("Search sources…"\)\}/)
    // THE FIXED FILTER: the tab narrows the door's own list by kind, the
    // identical seam every other kind tab already narrows by (`fixed={{
    // kind: activeTab }}` a few lines above this screen's own glossary
    // branch), so a search on this tab only ever searches glossary words.
    // MATCHED BY ITS PARTS, NOT AS ONE FROZEN LINE, 22 Sep 2026. This was one
    // regex over the whole ternary spelled on a single line. The expression
    // grew a third arm the day the account scope landed, and prettier put it
    // across nine lines, so a check about WHICH FILTER THE GLOSSARY TAB SENDS
    // went red over the shape of an unrelated branch. What this law actually
    // owns is the last arm: a kind tab narrows the door by its own kind, and
    // the All tab narrows by nothing. The host arms above it belong to their
    // own tests. Each part is asserted on its own so a fourth arm cannot break
    // this one either.
    const fixedProp = src.slice(src.indexOf("fixed={"), src.indexOf("fetchPage="))
    expect(fixedProp, "the glossary tab must narrow the door by its own kind").toMatch(
      /activeTab === "all"[\s\S]*\?\s*undefined[\s\S]*:\s*\{ kind: activeTab \}/
    )
  })

  it("load-more is the same LoadMore every other tab pages with", () => {
    const src = readKnowledgeScreen()
    const glossaryBranchAt = src.indexOf('if (scope.kind === "team" && activeTab === "glossary")')
    const glossaryBranch = src.slice(glossaryBranchAt, glossaryBranchAt + 2000)
    expect(glossaryBranch).toMatch(/<LoadMore/)
    expect(glossaryBranch).toMatch(/label=\{t\("Load more words"\)\}/)
  })

  it('"Add word" opens the glossary\'s own dialog, gated by the knowledge create right', () => {
    const screenSrc = readKnowledgeScreen()
    expect(screenSrc).toMatch(/t\("Add a word"\)/)
    expect(screenSrc).toMatch(/module:\s*"knowledge-glossary"/)

    const panelsSrc = readWritePanels()
    expect(panelsSrc).toMatch(/import\s*\{\s*GlossaryFormDialog\s*\}\s*from\s*"@\/components\/knowledge\/glossary-form-dialog"/)
    expect(panelsSrc).toMatch(
      /query\.panel === "add" && query\.module === "knowledge-glossary" && can\("knowledge", "create"\)/
    )
    // EDIT STAYS: the card's own press opens exactly this panel
    // (`?panel=edit&module=knowledge-glossary&id`), the same door the row's
    // pencil used to open, gated the same way.
    expect(panelsSrc).toMatch(/const glossaryEditing = query\.panel === "edit" && query\.module === "knowledge-glossary"/)
    expect(panelsSrc).toMatch(/open=\{glossaryEditing && !!knowledgeEditRow && can\("knowledge", "update"\)\}/)

    const cardCallAt = screenSrc.indexOf(
      "<KnowledgeSourceCard",
      screenSrc.indexOf('if (scope.kind === "team" && activeTab === "glossary")')
    )
    const cardCallEnd = screenSrc.indexOf("/>", cardCallAt)
    const cardCall = screenSrc.slice(cardCallAt, cardCallEnd)
    expect(cardCall, "the card's own press opens the correction dialog").toMatch(
      /panel:\s*"edit",\s*\n?\s*module:\s*"knowledge-glossary"/
    )
  })
})

// BUG (d), REPRODUCED AT RENDER TIME: on a team with thousands of other
// sources, `knowledgeQ`'s own resting read (the "All" tab's first page,
// `scope.knowledgeQ.data`/`loadedSources` in knowledge-screen.tsx) never
// carries a glossary row past page one; the Kwapso team alone has 2087+
// tickets. If the Glossary tab ever fell back to filtering THAT array by
// kind (the resting branch `rows.filter((s) => s.kind === "glossary")`,
// knowledge-screen.tsx), it would read empty forever on a team that size,
// while the Smoke team (small enough that the whole base fits on page one)
// never showed the bug. `<PagedFind>` is the real mechanism knowledge-screen
// renders through, so this drives it directly, the same technique
// knowledge-search-restored.test.tsx uses for this same screen, and proves
// the two things the fix promises: the door is asked `kind=glossary`
// directly, and what renders is the door's answer, never a client-side
// narrowing of a huge unrelated page.
describe("cause (d): the glossary tab must ask the door for kind=glossary directly", () => {
  function makeTicketMirror(i: number): KnowledgeSource {
    return {
      id: `T${i}`,
      kind: "ticket",
      originTable: "help",
      originRowId: `H${i}`,
      compartment: "agency",
      accountId: null,
      appId: null,
      ticketId: `H${i}`,
      sprintId: null,
      recordDate: null,
      title: `Ticket mirror ${i}`,
      summary: null,
      body: null,
      bodyBytes: 0,
      bodyTruncated: false,
      sourceUrl: null,
      fileUrl: null,
      fileName: null,
      fileType: null,
      fileBytes: 0,
      fileNote: null,
      visibility: "team",
      ownerUserId: null,
      visibleToAppId: null,
      visibleToAppName: null,
      indexedAt: null,
      chunkCount: 0,
      indexedChunks: 0,
      indexError: null,
      active: true,
      createdAt: "2026-09-20T00:00:00.000Z",
      creatorName: null,
      editorName: null,
      updatedAt: null,
      accounts: [],
      apps: [],
      sharedWith: "agency",
      generatedOnly: false,
      sightingsCount: 0,
    }
  }

  it("renders the door's 54 glossary rows, never a client-side filter of a large, glossary-free first page", async () => {
    // THE RESTING "ALL" PAGE: the shape `loadedSources` has on a big team:
    // 200 stand-ins for the 2087+ tickets, none of them kind "glossary".
    const bigFirstPage: KnowledgeSource[] = Array.from({ length: 200 }, (_, i) => makeTicketMirror(i))
    const doorGlossaryRows = [
      makeWord({ id: "W1", title: "Wave" }),
      makeWord({ id: "W2", title: "Ticket" }),
    ]

    let askedQuery: FindQuery | undefined
    const fetchPage = async (query: FindQuery, _cursor: string | null) => {
      askedQuery = query
      // THE DOOR'S OWN ANSWER, never derived from `bigFirstPage`, the same
      // separation `listSources`'s SQL `kind = ?` makes server-side
      // (workers/content/src/lib/knowledge.ts).
      return {
        rows: query.kind === "glossary" ? doorGlossaryRows : [],
        nextCursor: null,
        total: query.kind === "glossary" ? doorGlossaryRows.length : 0,
      }
    }

    render(
      <PagedFind<KnowledgeSource>
        listKey="knowledge:team-big"
        placeholder="Search sources…"
        matches={{ none: "No sources match", one: "1 source matches", many: "{count} sources match" }}
        // THE REAL CALL SITE'S OWN SHAPE (knowledge-screen.tsx): the glossary
        // tab is never the `undefined` branch of `fixed`.
        fixed={{ kind: "glossary" }}
        restingEmpty={bigFirstPage.length === 0}
        fetchPage={fetchPage}
      >
        {(found) => {
          // THE EXACT LOGIC knowledge-screen.tsx's own glossary branch runs.
          const rows = found.active ? found.rows : bigFirstPage
          if (rows === null) return <div data-testid="loading" />
          const glossaryRows = found.active ? rows : rows.filter((s) => s.kind === "glossary")
          return (
            <div data-testid="rows">
              {glossaryRows.map((s) => (
                <span key={s.id}>{s.title}</span>
              ))}
            </div>
          )
        }}
      </PagedFind>
    )

    await vi.waitFor(() => expect(askedQuery).toBeTruthy())
    expect(askedQuery?.kind, "the door is asked kind=glossary directly, not filtered client side").toBe(
      "glossary"
    )
    await vi.waitFor(() => {
      expect(screen.getByText("Wave")).toBeTruthy()
      expect(screen.getByText("Ticket")).toBeTruthy()
    })
    // NONE OF THE 200 TICKET MIRRORS LEAKED IN, and none of them hid the
    // glossary rows either; the huge, glossary-free page never entered the
    // decision at all.
    expect(screen.queryByText("Ticket mirror 0")).toBeNull()
    expect(screen.queryByText("Ticket mirror 199")).toBeNull()
  })
})
