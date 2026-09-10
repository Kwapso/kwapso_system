// THE CARD, NOT THE GENERIC ENGINE'S — locking the six facts the hub's brief
// asked for (compartment · app · sharing · pieces · sightings · last modified)
// and the one thing most likely to look broken: a `generatedOnly` source with
// zero pieces is a CARD, on purpose, and must never read as an error or an
// empty state.
//
// THE EMPTY CASES ARE WHAT THIS TESTS, not the populated one — every column
// this card reads (`accounts`, `apps`, `sharedWith`, `sightingsCount`) is
// empty/zero on every row in the base today (DATA-MODEL.md: nothing writes
// them yet), so a card that only renders correctly with rich data would pass
// every manual check on staging and be broken on every real row.

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

describe("KnowledgeSourceCard — the row the hub's brief asked for", () => {
  // THE ONE THING MOST LIKELY TO LOOK BROKEN, per the brief itself: zero
  // pieces on a `generatedOnly` source is a CARD, findable but never quoted —
  // not an error, not an empty state, not "Not indexed yet".
  it("a generated-only source with zero pieces reads as a card, not an error", () => {
    render(
      <KnowledgeSourceCard
        source={makeSource({ chunkCount: 0, generatedOnly: true })}
        accountNames={new Map()}
        onOpen={noop}
        onEditFiling={noop}
        canEdit={false}
      />
    )
    expect(screen.getByText(/findable, but the assistant won't quote it/)).toBeTruthy()
    expect(screen.queryByText("Not indexed yet")).toBeNull()
  })

  // THE SIBLING CASE this test suite would otherwise miss if it only tested
  // the generated-only branch: a genuinely unindexed, ordinary source (zero
  // pieces, NOT generated-only) must say something different — "not yet",
  // never the card sentence, and never a bare "0 pieces" that reads as a bug.
  it("a genuinely unindexed source (not generated-only) says so, not the card sentence", () => {
    render(
      <KnowledgeSourceCard
        source={makeSource({ chunkCount: 0, generatedOnly: false })}
        accountNames={new Map()}
        onOpen={noop}
        onEditFiling={noop}
        canEdit={false}
      />
    )
    expect(screen.getByText("Not indexed yet")).toBeTruthy()
    expect(screen.queryByText(/won't quote it/)).toBeNull()
  })

  it("a source with real pieces shows the count", () => {
    render(
      <KnowledgeSourceCard
        source={makeSource({ chunkCount: 12, generatedOnly: false })}
        accountNames={new Map()}
        onOpen={noop}
        onEditFiling={noop}
        canEdit={false}
      />
    )
    expect(screen.getByText("12 pieces")).toBeTruthy()
  })

  // `accounts` is the new 0073 array; every row on today's base has it empty
  // (nothing writes it yet), so the card MUST fall back to the singular
  // `accountId`/`compartment` the door has always written — otherwise every
  // card in the base would read "filed nowhere" the moment this ships.
  it("compartment falls back to the singular accountId when accounts[] is empty", () => {
    render(
      <KnowledgeSourceCard
        source={makeSource({ accounts: [], accountId: "ACC-1" })}
        accountNames={new Map([["ACC-1", "Bergman S.A."]])}
        onOpen={noop}
        onEditFiling={noop}
        canEdit={false}
      />
    )
    expect(screen.getByText("Bergman S.A.")).toBeTruthy()
  })

  it("compartment reads the new array once it carries more than one account", () => {
    render(
      <KnowledgeSourceCard
        source={makeSource({ accounts: ["ACC-1", "ACC-2"], accountId: "ACC-1" })}
        accountNames={new Map([["ACC-1", "Bergman S.A."], ["ACC-2", "Confia"]])}
        onOpen={noop}
        onEditFiling={noop}
        canEdit={false}
      />
    )
    expect(screen.getByText("2 accounts")).toBeTruthy()
  })

  it("a source filed under nothing reads as the agency's own", () => {
    render(
      <KnowledgeSourceCard
        source={makeSource({ accounts: [], accountId: null })}
        accountNames={new Map()}
        onOpen={noop}
        onEditFiling={noop}
        canEdit={false}
      />
    )
    expect(screen.getByText("The agency")).toBeTruthy()
  })

  // `apps` has no singular column to fall back to (unlike accounts/compartment)
  // — an empty array is exactly what today's data is, and it must say so
  // plainly rather than as a blank or a dash that reads as missing data.
  it("app reads plainly when nothing has filed it under one", () => {
    render(
      <KnowledgeSourceCard
        source={makeSource({ apps: [] })}
        accountNames={new Map()}
        onOpen={noop}
        onEditFiling={noop}
        canEdit={false}
      />
    )
    expect(screen.getByText("Not filed under an app")).toBeTruthy()
  })

  it("sightings renders the true count, including zero — every team holds zero today", () => {
    render(
      <KnowledgeSourceCard
        source={makeSource({ sightingsCount: 0 })}
        accountNames={new Map()}
        onOpen={noop}
        onEditFiling={noop}
        canEdit={false}
      />
    )
    expect(screen.getByText("0 sightings")).toBeTruthy()
  })

  it.each([
    ["private", "Only me"],
    ["app", "Only the members on one app"],
    ["team", "Anyone who can read the knowledge base"],
  ] as const)("sharing says the same sentence the edit dialog offers for %s", (visibility, expected) => {
    render(
      <KnowledgeSourceCard
        source={makeSource({ visibility })}
        accountNames={new Map()}
        onOpen={noop}
        onEditFiling={noop}
        canEdit={false}
      />
    )
    expect(screen.getByText(expected)).toBeTruthy()
  })

  it("a deactivated source still shows and says it is not in use", () => {
    render(
      <KnowledgeSourceCard
        source={makeSource({ active: false, title: "Old contract" })}
        accountNames={new Map()}
        onOpen={noop}
        onEditFiling={noop}
        canEdit={false}
      />
    )
    expect(screen.getByText("Old contract (not in use)")).toBeTruthy()
  })

  // THE FIRST THREE ARE EDITABLE — the pencil calls the edit callback and
  // never the card's own open callback, because the two press targets sit one
  // inside the other and a click on the smaller one must not also fire the
  // bigger one underneath it.
  it("the edit pencil opens filing, not the record, and only when the caller may edit", () => {
    const onOpen = vi.fn()
    const onEditFiling = vi.fn()
    render(
      <KnowledgeSourceCard
        source={makeSource({})}
        accountNames={new Map()}
        onOpen={onOpen}
        onEditFiling={onEditFiling}
        canEdit={true}
      />
    )
    fireEvent.click(screen.getByLabelText("Edit filing"))
    expect(onEditFiling).toHaveBeenCalledTimes(1)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it("without the edit right, no pencil renders at all", () => {
    render(
      <KnowledgeSourceCard
        source={makeSource({})}
        accountNames={new Map()}
        onOpen={noop}
        onEditFiling={noop}
        canEdit={false}
      />
    )
    expect(screen.queryByLabelText("Edit filing")).toBeNull()
  })

  it("the card itself opens the record", () => {
    const onOpen = vi.fn()
    render(
      <KnowledgeSourceCard
        source={makeSource({ title: "Press me" })}
        accountNames={new Map()}
        onOpen={onOpen}
        onEditFiling={noop}
        canEdit={false}
      />
    )
    fireEvent.click(screen.getByText("Press me"))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
