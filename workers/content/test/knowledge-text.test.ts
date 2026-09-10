// The pure half of the knowledge base: chunking, the inverted index's own
// tokeniser, the change hash, and the quantised vector codec.
//
// These are unit tests on purpose. Everything the retrieval quality depends on
// is deterministic and lives in one file with no database and no model in it, so
// "does a question find the right passage?" can be MEASURED (the backfill script
// does exactly that against the agency's own history) rather than guessed at.

import { describe, expect, it } from "vitest"

import {
  CHUNK_TARGET_CHARS,
  chunkChat,
  chunkMail,
  chunkSheetTab,
  chunkText,
  contentHash,
  contextLinePrompt,
  decodeEmbedding,
  encodeEmbedding,
  freshnessOf,
  plainText,
  questionTerms,
  relevancyDate,
  similarity,
  tokenise,
} from "../src/lib/knowledge-text"
import { MAX_CHUNKS_PER_SOURCE } from "../src/lib/knowledge"

describe("chunkText", () => {
  it("returns nothing for empty text (never one empty chunk)", () => {
    expect(chunkText("")).toEqual([])
    expect(chunkText("   \n\n  ")).toEqual([])
  })

  it("keeps a short source as one readable piece", () => {
    expect(chunkText("The dispatch screen logs people out after ten minutes.")).toEqual([
      "The dispatch screen logs people out after ten minutes.",
    ])
  })

  it("cuts long text into pieces around the target size, keeping every word", () => {
    const sentence = "Bergman reported the dispatch outage again this morning. "
    const chunks = chunkText(sentence.repeat(120))
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(CHUNK_TARGET_CHARS + 200)
    // Nothing is dropped on the floor: every chunk is non-empty and the whole
    // set still carries the words. (A chunker that silently loses its tail is
    // the failure you only find when an answer is missing its evidence.)
    expect(chunks.join(" ")).toContain("dispatch outage")
    expect(chunks.every((c) => c.trim().length > 0)).toBe(true)
  })

  it("still splits text with no sentence boundaries at all (a pasted table)", () => {
    const chunks = chunkText("x".repeat(CHUNK_TARGET_CHARS * 3))
    expect(chunks.length).toBe(3)
  })

  it("chunks a whole book rather than stopping at a ceiling", () => {
    // IT USED TO STOP AT 200 — about eight pages — and say nothing. A 300-page
    // contract went in as its first eight pages, and "the whole document is in
    // there" was indistinguishable from "the beginning of it is". The refusal
    // now lives at the door, in bytes, before anything is saved; this function
    // reports what the text really is.
    const book = "Sentence number one here. ".repeat(20_000)
    const chunks = chunkText(book)
    expect(chunks.length).toBeGreaterThan(500)
    // Nothing is lost between the pieces: every sentence of the book is in one.
    expect(chunks.join(" ").length).toBeGreaterThan(book.length * 0.99)
    // The backstop is still a number, and it is DERIVED from the door's ceiling
    // rather than chosen beside it — 1.5 MB of text cannot make more than this.
    // It lives in knowledge.ts, beside the validator it comes from: this file
    // deliberately imports NOTHING, so that the benchmark can load it into plain
    // Node and measure the shipped chunker rather than a copy of it.
    expect(MAX_CHUNKS_PER_SOURCE).toBeGreaterThan(1_500)
  })

  it("strips a NUL byte, which SQLite refuses and no request boundary can catch here", () => {
    // The validation seam strips NULs from a REQUEST. A mirrored source's words
    // come from a row written long ago — by an import, a migration, an older
    // door — and one NUL in it would fail the sweep every fifteen minutes,
    // forever, on a row nobody is looking at.
    const withNul = `dispatch${String.fromCharCode(0)} outage`
    expect(plainText(withNul)).toBe("dispatch outage")
    expect(chunkText(withNul)[0]).not.toContain(String.fromCharCode(0))
    expect([...tokenise(withNul).keys()]).toEqual(["dispatch", "outage"])
  })

  it("reads the words out of rich text, not the markup", () => {
    expect(plainText("<p>Marta asked about <b>invoices</b>.</p><script>alert(1)</script>")).toBe(
      "Marta asked about invoices."
    )
  })
})

describe("tokenise", () => {
  it("drops stopwords and anything too short to narrow a search", () => {
    const terms = [...tokenise("The invoice is in the app").keys()]
    expect(terms).toContain("invoice")
    expect(terms).toContain("app")
    expect(terms).not.toContain("the")
    expect(terms).not.toContain("is")
  })

  it("splits on anything that is not a letter or a digit", () => {
    const terms = [...tokenise("marta@bergman.example raised BERG-T0412").keys()]
    expect(terms).toEqual(expect.arrayContaining(["marta", "bergman", "example", "berg", "t0412"]))
  })

  it("caps how much one repeated word can weigh", () => {
    expect(tokenise("invoice ".repeat(50)).get("invoice")).toBe(8)
  })

  it("puts the narrowing words of a question first", () => {
    // A reference number and the long words beat the short generic ones, so a
    // capped term list keeps what actually finds the record.
    const terms = questionTerms("what did they say about invoice BERG-T0412 delivery", 4)
    expect(terms[0]).toBe("t0412")
    expect(terms).toContain("delivery")
  })
})

describe("contentHash", () => {
  it("is stable for the same text and moves for a one-character change", () => {
    const a = contentHash("Bergman dispatch rollout")
    expect(contentHash("Bergman dispatch rollout")).toBe(a)
    expect(contentHash("Bergman dispatch rollouts")).not.toBe(a)
    // The skip that pays for the sweep hangs off this: a hash that collided on a
    // small edit would leave the assistant quoting text nobody wrote any more.
    expect(contentHash("Bergman dispatch rollout ")).not.toBe(a)
  })
})

describe("the vector codec", () => {
  it("round-trips a vector and scores itself at 1", () => {
    const v = [0.2, -0.5, 0.9, 0.1]
    const encoded = encodeEmbedding(v) as string
    expect(encoded).toBeTruthy()
    const decoded = decodeEmbedding(encoded)
    expect(decoded).not.toBeNull()
    // Not exactly 1, and it should not be: each component is rounded to a byte,
    // so a vector's similarity to ITSELF carries the quantisation error. It is
    // biggest on a tiny vector like this one (four dimensions) and vanishes at
    // the 384 the real model returns. Ranking is unaffected — every score pays
    // the same rounding — which is the property that actually matters.
    expect(similarity(decoded, decoded)).toBeGreaterThan(0.98)
  })

  it("scores an unrelated direction near zero and an opposite one below it", () => {
    const a = decodeEmbedding(encodeEmbedding([1, 0, 0, 0]))
    const b = decodeEmbedding(encodeEmbedding([0, 1, 0, 0]))
    const c = decodeEmbedding(encodeEmbedding([-1, 0, 0, 0]))
    expect(similarity(a, b)).toBeCloseTo(0, 2)
    expect(similarity(a, c)).toBeLessThan(-0.9)
  })

  it("refuses a vector it cannot store, rather than storing zeroes", () => {
    // A model having a bad minute answers with nulls or an error object; a
    // vector of zeroes would sit at cosine 0 to every question, forever, and
    // look exactly like a real embedding.
    expect(encodeEmbedding([])).toBeNull()
    expect(encodeEmbedding([0, 0, 0])).toBeNull()
    expect(encodeEmbedding([1, Number.NaN])).toBeNull()
    expect(encodeEmbedding(["x" as never])).toBeNull()
  })

  it("reads an unreadable stored value as no evidence, never as a crash", () => {
    expect(decodeEmbedding(null)).toBeNull()
    expect(decodeEmbedding("")).toBeNull()
    expect(similarity(null, decodeEmbedding(encodeEmbedding([1, 0])))).toBe(0)
    // Two different models under one index: not comparable, so no evidence
    // either way — the lexical half decides instead of a wrong number.
    expect(similarity(decodeEmbedding(encodeEmbedding([1, 0])), decodeEmbedding(encodeEmbedding([1, 0, 0])))).toBe(0)
  })
})

// ── GRAIN — BUILD-5 §2 ("Split into pieces") ────────────────────────────────
//
// Three source shapes, three grain rules, none of them the generic paragraph
// cutter above: a chat piece is a RUN of a few messages carrying speaker and
// time; a mail thread is the source and each message is its own piece; a
// spreadsheet tab is a source with its header line prepended to every piece.
//
// Pure, like the rest of this file: a message list or a table of rows in,
// text (and the metadata a piece carries beside it) out. No database, no
// model, no import.

describe("chunkChat — a piece is a run of messages, with who and when", () => {
  const at = (m: number) => `2026-09-10T10:${String(m).padStart(2, "0")}:00Z`

  it("keeps a short conversation as one piece and carries its speakers and span", () => {
    const pieces = chunkChat([
      { speaker: "Jane Doe", at: at(2), text: "Hey everyone, let's get started." },
      { speaker: "John Smith", at: at(3), text: "Sounds good." },
    ])
    expect(pieces).toHaveLength(1)
    expect(pieces[0].text).toContain("Jane Doe")
    expect(pieces[0].text).toContain("Hey everyone, let's get started.")
    expect(pieces[0].text).toContain("John Smith")
    expect(pieces[0].speakers).toEqual(["Jane Doe", "John Smith"])
    expect(pieces[0].startAt).toBe(at(2))
    expect(pieces[0].endAt).toBe(at(3))
  })

  it("starts a new piece once a run has had its few messages", () => {
    const messages = Array.from({ length: 14 }, (_, i) => ({
      speaker: i % 2 === 0 ? "Jane Doe" : "John Smith",
      at: at(i),
      text: `message number ${i}`,
    }))
    const pieces = chunkChat(messages)
    expect(pieces.length).toBeGreaterThan(1)
    // Nothing is dropped: every message's text is in some piece.
    const joined = pieces.map((p) => p.text).join(" ")
    for (let i = 0; i < 14; i++) expect(joined).toContain(`message number ${i}`)
    // Each piece is genuinely a RUN — its span is its own messages' times, not
    // the whole conversation's.
    expect(pieces[0].endAt).not.toBe(pieces.at(-1)?.endAt)
  })

  it("also flushes a run once its text alone would blow the chunk target", () => {
    const long = "word ".repeat(200)
    const pieces = chunkChat([
      { speaker: "Jane Doe", at: at(1), text: long },
      { speaker: "John Smith", at: at(2), text: long },
      { speaker: "Jane Doe", at: at(3), text: long },
    ])
    expect(pieces.length).toBeGreaterThan(1)
    for (const p of pieces) expect(p.text.length).toBeLessThanOrEqual(CHUNK_TARGET_CHARS + 400)
  })

  it("returns nothing for no messages, never one empty piece", () => {
    expect(chunkChat([])).toEqual([])
  })

  it("drops a message with no words, but keeps its neighbours", () => {
    const pieces = chunkChat([
      { speaker: "Jane Doe", at: at(1), text: "   " },
      { speaker: "John Smith", at: at(2), text: "Still here." },
    ])
    expect(pieces).toHaveLength(1)
    expect(pieces[0].text).toContain("Still here.")
    expect(pieces[0].text).not.toContain("Jane Doe")
  })
})

describe("chunkMail — the thread is the source, each message is its own piece", () => {
  it("makes one piece per message, in order, carrying who and when", () => {
    const pieces = chunkMail([
      { from: "marta@agency.example", at: "2026-09-01T09:00:00Z", text: "Can we renew at the same rate?" },
      { from: "client@example.com", at: "2026-09-01T10:00:00Z", text: "Yes, that works for us." },
    ])
    expect(pieces).toEqual([
      { text: "Can we renew at the same rate?", from: "marta@agency.example", at: "2026-09-01T09:00:00Z" },
      { text: "Yes, that works for us.", from: "client@example.com", at: "2026-09-01T10:00:00Z" },
    ])
  })

  it("never merges two messages into one piece, however short they are", () => {
    const pieces = chunkMail([
      { from: "a@example.com", at: "2026-09-01T09:00:00Z", text: "Hi" },
      { from: "b@example.com", at: "2026-09-01T09:01:00Z", text: "Hi back" },
    ])
    expect(pieces).toHaveLength(2)
  })

  it("strips markup from an HTML message body, same as any other prose", () => {
    const pieces = chunkMail([
      { from: "a@example.com", at: "2026-09-01T09:00:00Z", text: "<p>Renewing at <b>$500 per month</b>.</p>" },
    ])
    expect(pieces[0].text).toBe("Renewing at $500 per month.")
  })

  it("drops a message with no words rather than filing an empty piece", () => {
    const pieces = chunkMail([
      { from: "a@example.com", at: "2026-09-01T09:00:00Z", text: "   " },
      { from: "b@example.com", at: "2026-09-01T09:01:00Z", text: "Real content here." },
    ])
    expect(pieces).toHaveLength(1)
    expect(pieces[0].from).toBe("b@example.com")
  })

  it("returns nothing for no messages", () => {
    expect(chunkMail([])).toEqual([])
  })
})

describe("chunkSheetTab — the tab is the source, the header rides every piece", () => {
  it("prepends the header line to the one piece a short tab makes", () => {
    const pieces = chunkSheetTab(
      ["Client", "Plan", "Renews"],
      [
        ["Acme", "Pro", "2026-11-01"],
        ["Bergman", "Starter", "2026-12-01"],
      ]
    )
    expect(pieces).toHaveLength(1)
    expect(pieces[0]).toContain("Client | Plan | Renews")
    expect(pieces[0]).toContain("Acme | Pro | 2026-11-01")
    expect(pieces[0]).toContain("Bergman | Starter | 2026-12-01")
  })

  it("carries the header onto EVERY piece once the tab needs more than one", () => {
    const header = ["Client", "Plan", "Renews", "Notes"]
    const rows = Array.from({ length: 60 }, (_, i) => [
      `Client ${i}`,
      "Pro",
      "2026-11-01",
      "some notes about the account and its renewal history and open items",
    ])
    const pieces = chunkSheetTab(header, rows)
    expect(pieces.length).toBeGreaterThan(1)
    for (const p of pieces) expect(p.startsWith("Client | Plan | Renews | Notes")).toBe(true)
    // Nothing is dropped: every row is in some piece.
    for (let i = 0; i < 60; i++) expect(pieces.some((p) => p.includes(`Client ${i} | Pro`))).toBe(true)
  })

  it("keeps an oversized single row as its own piece rather than dropping it", () => {
    const header = ["Client", "Notes"]
    const hugeNote = "x ".repeat(CHUNK_TARGET_CHARS)
    const pieces = chunkSheetTab(header, [["Acme", hugeNote]])
    expect(pieces).toHaveLength(1)
    expect(pieces[0]).toContain("Acme")
  })

  it("returns nothing for a tab with no rows", () => {
    expect(chunkSheetTab(["Client"], [])).toEqual([])
  })
})

describe("contextLinePrompt — the pure half of the context-line call", () => {
  it("carries the source title and the piece's own words", () => {
    const prompt = contextLinePrompt({
      sourceTitle: "Renewal email thread",
      piece: "We agreed to renew at the same rate through March.",
    })
    expect(prompt).toContain("Renewal email thread")
    expect(prompt).toContain("We agreed to renew at the same rate through March.")
  })

  it("bounds how much of a long piece it shows the model — the $1.70 budget depends on a short prompt", () => {
    const prompt = contextLinePrompt({ sourceTitle: "x", piece: "word ".repeat(2000) })
    expect(prompt.length).toBeLessThan(2000)
  })
})

// ── RELEVANCY DATE — BUILD-5 §2's third grain rule: "happened-at for frozen
// things, last-change for living things." Lane A's migration (fix/kb-model,
// 0073) gives `knowledge_sources.relevancy_date` somewhere to live and says
// in its own words which half is whose: "which of a source's several dates
// this resolves to is an ingest decision" — the CLASSIFICATION (frozen vs
// living, a property of what the kind IS) is this file's job; writing the
// column is the ingest sweep's, once it exists.

describe("freshnessOf — a property of what the kind IS, not how it is read", () => {
  it("classifies a one-time event as frozen: it happened, and does not change afterwards", () => {
    expect(freshnessOf("calendar")).toBe("frozen")
    expect(freshnessOf("gmail")).toBe("frozen")
    expect(freshnessOf("meeting")).toBe("frozen")
  })

  it("classifies something that keeps changing as living", () => {
    expect(freshnessOf("chat")).toBe("living")
    expect(freshnessOf("drive")).toBe("living")
    expect(freshnessOf("ticket")).toBe("living")
    expect(freshnessOf("story")).toBe("living")
  })

  it("is unclassified rather than guessed for a kind nobody has decided about yet", () => {
    expect(freshnessOf("some_future_kind")).toBeNull()
  })
})

describe("relevancyDate — the one decision, once the kind is known", () => {
  it("picks happened-at for a frozen thing, even when a later last-change date exists", () => {
    expect(relevancyDate("frozen", "2026-09-07T10:00:00Z", "2026-09-09T00:00:00Z")).toBe(
      "2026-09-07T10:00:00Z"
    )
  })

  it("picks last-change for a living thing, even when it is older than when it was first created", () => {
    expect(relevancyDate("living", "2026-01-01T00:00:00Z", "2026-09-07T10:00:00Z")).toBe(
      "2026-09-07T10:00:00Z"
    )
  })

  it("is null rather than a wrong guess when the date this freshness needs is missing", () => {
    expect(relevancyDate("frozen", null, "2026-09-09T00:00:00Z")).toBeNull()
    expect(relevancyDate("living", "2026-01-01T00:00:00Z", null)).toBeNull()
  })
})
