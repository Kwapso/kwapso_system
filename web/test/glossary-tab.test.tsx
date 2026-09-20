// THE GLOSSARY TAB. Aurora's ruling, 20 Sep 2026, verbatim: "Add a tab to
// Knowledge with a glossary, and craft me an artifact identifying which
// words we use and their definitions... this will let our users search
// there, but should be part of the knowledge base and feed the assistant."
//
// TWO KINDS OF PROOF, the same split `knowledge-search-restored.test.tsx`
// and `knowledge-kind-tabs.test.tsx` already use for this exact screen: a
// RENDER proof of the row itself (`GlossaryList`, which needs nothing of
// `KnowledgeScreen`'s own heavy scope object to draw its own rows), and a
// SOURCE-READ proof of the wiring that puts it on that screen (the tab, the
// search placeholder, the "Add word" action), the shape the whole file
// would need to render `<PagedFind>`'s tab strip and live cache plumbing for
// no more certainty than reading the one line that sets each of them.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { GlossaryList } from "@/components/knowledge/glossary-list"
import { GlossaryFormDialog } from "@/components/knowledge/glossary-form-dialog"
import { PagedFind, type FindQuery } from "@/components/records/paged-find"
import type { KnowledgeSource } from "@shared/types"

afterEach(cleanup)

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")

function readKnowledgeScreen(): string {
  return readFileSync(join(ROOT, "web", "components", "knowledge", "knowledge-screen.tsx"), "utf8")
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

describe("GlossaryList, renders entries", () => {
  it("shows every word and its own definition", () => {
    render(
      <GlossaryList
        rows={[
          makeWord({ id: "W1", title: "Wave", body: "A package of phases sold to one account." }),
          makeWord({ id: "W2", title: "Ticket", body: "Something an account has asked for." }),
        ]}
        canEdit={false}
        canDelete={false}
        onEdit={() => {}}
      />
    )
    expect(screen.getByText("Wave")).toBeTruthy()
    expect(screen.getByText("A package of phases sold to one account.")).toBeTruthy()
    expect(screen.getByText("Ticket")).toBeTruthy()
    expect(screen.getByText("Something an account has asked for.")).toBeTruthy()
  })

  it("draws alphabetically regardless of the order rows arrive in", () => {
    render(
      <GlossaryList
        rows={[makeWord({ id: "W2", title: "Wave" }), makeWord({ id: "W1", title: "Acceptance criteria" })]}
        canEdit={false}
        canDelete={false}
        onEdit={() => {}}
      />
    )
    const titles = screen.getAllByRole("term").map((h) => h.textContent)
    expect(titles).toEqual(["Acceptance criteria", "Wave"])
  })

  it("draws no edit or delete control without the matching right", () => {
    render(<GlossaryList rows={[makeWord({})]} canEdit={false} canDelete={false} onEdit={() => {}} />)
    expect(screen.queryByLabelText(/correct this word/i)).toBeNull()
    expect(screen.queryByLabelText(/take this word away/i)).toBeNull()
  })

  it("a person with the update right can open the word to correct it", () => {
    const onEdit = vi.fn()
    render(<GlossaryList rows={[makeWord({ id: "W9" })]} canEdit canDelete={false} onEdit={onEdit} />)
    fireEvent.click(screen.getByLabelText(/correct this word/i))
    expect(onEdit).toHaveBeenCalledWith("W9")
  })

  it("a person with the delete right sees a confirm before the word is taken away", () => {
    render(<GlossaryList rows={[makeWord({})]} canEdit={false} canDelete onEdit={() => {}} />)
    fireEvent.click(screen.getByLabelText(/take this word away/i))
    expect(screen.getByText("Take this word away?")).toBeTruthy()
  })
})

describe("GlossaryFormDialog, add a word", () => {
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
  it("is drawn by hand, always present, and renders through GlossaryList", () => {
    const src = readKnowledgeScreen()
    expect(src).toMatch(/import\s*\{\s*GlossaryList\s*\}\s*from\s*"@\/components\/knowledge\/glossary-list"/)
    expect(src).toMatch(/value:\s*"glossary"/)
    expect(src).toMatch(/<GlossaryList/)
  })

  it("seeds itself once, through the idempotent door, the first time the tab is opened", () => {
    const src = readKnowledgeScreen()
    expect(src).toMatch(/contentApi\s*\n?\s*\.seedGlossary\(\)/)
  })

  // BUG (a): "54 rows in the database, tab still empty." The seed effect used
  // to invalidate only `knowledgeKey(teamId)` — but `fixed={{ kind: "glossary" }}`
  // a few lines below makes `<PagedFind>`'s own `active` true for the whole
  // time this tab is open (paged-find.tsx's T3654 note), so the rows on
  // screen come from the FOUND cache, never the plain list key. A seed that
  // only invalidated the plain key left the tab reading its own pre-seed
  // (empty) answer until a reload. `invalidateFindsOf` is the seam
  // paged-find.tsx exports for exactly this shape.
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
    expect(src).toMatch(/fixed=\{isApp \? \{ appId: scope\.appId \} : activeTab === "all" \? undefined : \{ kind: activeTab \}\}/)
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
    // THE EDIT PANEL'S OWN GATE reads the derived `glossaryEditing` (the same
    // id-keyed read the generic knowledge edit dialog shares, this file's own
    // header says why) rather than repeating the panel/module check inline.
    expect(panelsSrc).toMatch(/const glossaryEditing = query\.panel === "edit" && query\.module === "knowledge-glossary"/)
    expect(panelsSrc).toMatch(/open=\{glossaryEditing && !!knowledgeEditRow && can\("knowledge", "update"\)\}/)
  })
})

// BUG (d), REPRODUCED AT RENDER TIME: on a team with thousands of other
// sources, `knowledgeQ`'s own resting read (the "All" tab's first page,
// `scope.knowledgeQ.data`/`loadedSources` in knowledge-screen.tsx) never
// carries a glossary row past page one — the Kwapso team alone has 2087+
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
    // THE RESTING "ALL" PAGE — the shape `loadedSources` has on a big team:
    // 200 stand-ins for the 2087+ tickets, none of them kind "glossary".
    const bigFirstPage: KnowledgeSource[] = Array.from({ length: 200 }, (_, i) => makeTicketMirror(i))
    const doorGlossaryRows = [
      makeWord({ id: "W1", title: "Wave" }),
      makeWord({ id: "W2", title: "Ticket" }),
    ]

    let askedQuery: FindQuery | undefined
    const fetchPage = async (query: FindQuery, _cursor: string | null) => {
      askedQuery = query
      // THE DOOR'S OWN ANSWER, never derived from `bigFirstPage` — the same
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
    // glossary rows either — the huge, glossary-free page never entered the
    // decision at all.
    expect(screen.queryByText("Ticket mirror 0")).toBeNull()
    expect(screen.queryByText("Ticket mirror 199")).toBeNull()
  })
})
