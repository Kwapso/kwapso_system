// THE CARD, NOT THE GENERIC ENGINE'S — locking the four facts left on it
// after the client's 17 Sep 2026 (morning) ruling ("I want the cards
// smaller, so I want to see at least four in one row. Also, the edit button
// is deleted from the card. It should just be on the detail page."): mark,
// title, kind, one meta line. Compartment, app, sharing, pieces and
// sightings — and the inline "Edit filing" pencil that used to write them —
// moved off the card entirely; `web/test/knowledge-gallery-card.test.tsx`
// proves the pencil is gone and that the detail page still offers edit.
//
// A FIFTH FACT LANDED THE SAME DAY, LATER — R86 (`status-owns-the-chip`):
// "knowledge source in use green dot." The KIND badge stays the plain,
// uncoloured pill it always was; a STATUS badge beside it now carries the
// one colour this card draws, green while in use and grey once not — the
// last test in this file locks the dot.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { KnowledgeSourceCard } from "@/components/knowledge/knowledge-source-card"
import type { KnowledgeSource } from "@shared/types"

afterEach(cleanup)

function makeSource(over: Partial<KnowledgeSource>): KnowledgeSource {
  return {
    id: "SRC",
    kind: "note",
    originTable: null,
    originRowId: null,
    compartment: "team",
    accountId: null,
    appId: null,
    ticketId: null,
    sprintId: null,
    recordDate: null,
    title: "How we handle a Bergman outage",
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
    createdAt: "2026-09-01T00:00:00.000Z",
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

const noop = () => {}

describe("KnowledgeSourceCard — four facts, mark/title/kind/one meta line", () => {
  it("shows the title", () => {
    render(<KnowledgeSourceCard source={makeSource({ title: "Press me" })} onOpen={noop} />)
    expect(screen.getByText("Press me")).toBeTruthy()
  })

  it("a deactivated source still shows and says it is not in use", () => {
    render(<KnowledgeSourceCard source={makeSource({ active: false, title: "Old contract" })} onOpen={noop} />)
    expect(screen.getByText("Old contract (not in use)")).toBeTruthy()
  })

  it("shows the kind in the app's own words, not the schema's raw value", () => {
    render(<KnowledgeSourceCard source={makeSource({ kind: "file" })} onOpen={noop} />)
    expect(screen.getByText("Uploads")).toBeTruthy()
    expect(screen.queryByText("file")).toBeNull()
  })

  it("shows the last-edited meta line when there is a date to show", () => {
    render(
      <KnowledgeSourceCard
        source={makeSource({ updatedAt: "2026-09-10T00:00:00.000Z", createdAt: "2026-09-01T00:00:00.000Z" })}
        onOpen={noop}
      />
    )
    expect(screen.getByText(/Last edited/)).toBeTruthy()
  })

  it("draws no meta line at all when there is neither an update nor a create date", () => {
    render(<KnowledgeSourceCard source={makeSource({ updatedAt: null, createdAt: "" as unknown as string })} onOpen={noop} />)
    expect(screen.queryByText(/Last edited/)).toBeNull()
  })

  // THE SIX FACTS THE OLD CARD DREW ARE GONE FROM IT — they are still real,
  // on the record's own Overview tab, but this card no longer says them.
  it("draws none of the retired facts — compartment, app or sharing", () => {
    render(
      <KnowledgeSourceCard
        source={makeSource({ accounts: ["ACC-1"], apps: ["APP-1"], visibility: "private" })}
        onOpen={noop}
      />
    )
    expect(screen.queryByText(/account/i)).toBeNull()
    expect(screen.queryByText(/app/i)).toBeNull()
    expect(screen.queryByText("Only me")).toBeNull()
  })

  it("draws no pieces or sightings line", () => {
    render(<KnowledgeSourceCard source={makeSource({ chunkCount: 12, sightingsCount: 3 })} onOpen={noop} />)
    expect(screen.queryByText(/piece/i)).toBeNull()
    expect(screen.queryByText(/reached us/i)).toBeNull()
  })

  it("the card itself opens the record — the whole cell is the one press target", () => {
    const onOpen = vi.fn()
    render(<KnowledgeSourceCard source={makeSource({ title: "Press me" })} onOpen={onOpen} />)
    fireEvent.click(screen.getByText("Press me"))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it("Enter/Space on the card also opens the record (the same keyboard path every card in the app offers)", () => {
    const onOpen = vi.fn()
    render(<KnowledgeSourceCard source={makeSource({})} onOpen={onOpen} />)
    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" })
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  // THE CLIENT'S SECOND SENTENCE, PROVED DIRECTLY ON THE COMPONENT: no pencil,
  // no "Edit filing" control, nothing with an edit affordance anywhere in the
  // rendered card — regardless of what the caller passes, because the props
  // that used to drive it (`onEditFiling`, `canEdit`) no longer exist on this
  // component at all.
  it('carries no "Edit filing" control, or any edit control, anywhere in the card', () => {
    render(<KnowledgeSourceCard source={makeSource({})} onOpen={noop} />)
    expect(screen.queryByLabelText("Edit filing")).toBeNull()
    expect(screen.queryByLabelText(/^edit/i)).toBeNull()
    // THE ONE `role="button"` ON THE CELL IS THE CARD ITSELF (its own
    // onOpen/onKeyDown handlers, above) — a second one would be a nested
    // control the card's own click could no longer reach cleanly.
    expect(screen.queryAllByRole("button")).toHaveLength(1)
  })

  // R86 / D17, client ruling 17 Sep 2026: "knowledge source in use green
  // dot." Green (`shipped`) while in use, grey (`archived`) once not — the
  // kit stamps `data-dot` on the badge only when a dot is really drawn, so
  // its presence and value are the proof, not just the words beside it.
  it("draws the status dot — green while in use, grey once not", () => {
    const { rerender } = render(<KnowledgeSourceCard source={makeSource({ active: true })} onOpen={noop} />)
    expect(screen.getByText("In use")).toBeTruthy()
    expect(document.querySelector('[data-slot="badge"][data-dot="shipped"]')).toBeTruthy()

    rerender(<KnowledgeSourceCard source={makeSource({ active: false })} onOpen={noop} />)
    expect(document.querySelector('[data-slot="badge"][data-dot="archived"]')).toBeTruthy()
  })
})
