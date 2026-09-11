// R42 — EVERY ACCEPTED TYPE RESOLVES TO A DECLARED READER ON EVERY DOOR, OR TO
// AN HONEST REFUSAL — AND NO DOOR CHOOSES ITS OWN.
//
// The last clause is the load-bearing one. Until 27 Aug 2026 this app had two
// readers and no table, and which one a file got was decided by the door it came
// through: an uploaded PDF was converted properly and the SAME PDF in a Drive
// folder was read by a hand-rolled parser and came out as glyph indices. Nobody
// decided that. It is what happens when a reader is picked at the call site.
//
// So this suite asks two questions the table cannot answer about itself:
//   • is every declared type actually resolvable, and every reader real?
//   • does either DOOR reach past the table for a reader of its own?
// The second is a census off the disk, because it is the only way to ask "was
// this table consulted?" — and because a predicate nobody calls is not a guard.

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { stripComments } from "@shared/rules/source-scan"
import { NO_TOKENS } from "@shared/workers/credits"

import { chunkText } from "../src/lib/knowledge-text"
import {
  LINK_TYPES,
  SOURCE_TYPES,
  UNREADABLE_TYPES,
  classify,
  classifyLink,
  contextLineFor,
  declaredUnreadable,
  readLink,
  readSource,
  readersFor,
  readersForLink,
  youtubeVideoId,
  type ReaderName,
} from "../src/lib/source-readers"

const SRC = join(__dirname, "..", "src", "lib")
const READERS: ReaderName[] = ["markdown", "office-zip", "plain", "csv-grain"]

describe("R42 — the table is complete and every reader in it is real", () => {
  it("every declared type names at least one reader, and only real ones", () => {
    expect(SOURCE_TYPES.length).toBeGreaterThan(5)
    for (const t of SOURCE_TYPES) {
      expect(t.readers.length, `${t.label} declares no reader`).toBeGreaterThan(0)
      for (const r of t.readers)
        expect(READERS, `${t.label} names a reader that does not exist: ${r}`).toContain(r)
    }
  })

  // ROT CHECK. A reason nobody wrote is an entry nobody thought about, and the
  // order within a type is exactly the thing a later reader will want explained.
  it("and every entry says WHY it is in that order", () => {
    for (const t of [...SOURCE_TYPES, ...UNREADABLE_TYPES])
      expect(t.why.length, `${t.label} has no reason`).toBeGreaterThan(20)
  })

  it("nothing is both readable and declared unreadable", () => {
    for (const t of SOURCE_TYPES)
      for (const ext of t.extensions)
        expect(
          declaredUnreadable(`x.${ext}`, ""),
          `.${ext} is in ${t.label} AND in the unreadable list`
        ).toBeNull()
  })

  // THE TWO ANSWERS, EACH ON THE RIGHT SIDE. These are the exact pairing the
  // registry exists for: the converter cannot read a deck and the unzip reader
  // cannot read a PDF, so a single winner per door is wrong either way round.
  it("a deck goes to the unzip reader and a PDF goes to the converter", () => {
    expect(readersFor("pitch.pptx", "")).toEqual(["office-zip"])
    expect(readersFor("contract.pdf", "application/pdf")).toEqual(["markdown"])
    expect(readersFor("whiteboard.png", "image/png")).toEqual(["markdown"])
  })

  it("and a Word document falls back to the unzip reader when the converter cannot", () => {
    expect(readersFor("brief.docx", "")).toEqual(["markdown", "office-zip"])
  })

  it("artwork resolves to no reader at all — an honest refusal, not a guess", () => {
    for (const name of ["HOGO_LOGO.eps", "brand.ai", "list.oft", "clip.mp4", "call.mp3"])
      expect(readersFor(name, ""), name).toEqual([])
  })

  it("and a PDF is held to the word test, because page geometry is readable", () => {
    expect(classify("contract.pdf", "application/pdf")?.mustReadLikeWords).toBe(true)
  })
})

// ── AND THE CLAUSE A TABLE CANNOT ENFORCE ABOUT ITSELF ─────────────────────
//
// Censused off the disk with comments stripped — because a census that reads
// comments passes on the words explaining why the call is there, which is a
// mistake this repo made and fixed on the same day this file was written.
describe("R42 — no door chooses its own reader", () => {
  const doors = {
    "knowledge-files.ts (the upload door)": stripComments(readFileSync(join(SRC, "knowledge-files.ts"), "utf8")),
    "google-api.ts (the Drive lane)": stripComments(readFileSync(join(SRC, "google-api.ts"), "utf8")),
  }

  it("both doors ASK the table", () => {
    for (const [door, src] of Object.entries(doors))
      expect(src, `${door} must resolve its reader through source-readers`).toMatch(
        /readersFor\(|readSource\(/
      )
  })

  // THE MUTATION THIS EXISTS FOR: point a door at a reader the table did not
  // name for that type. Before the table, that was not a mutation — it was the
  // architecture.
  it("and neither reaches past it for a reader of its own", () => {
    for (const [door, src] of Object.entries(doors)) {
      expect(src, `${door} calls the converter directly instead of through the table`).not.toMatch(
        /\benv\.AI\.toMarkdown\b/
      )
      expect(src, `${door} calls the unzip reader directly instead of through the table`).not.toMatch(
        /\bofficeText\(/
      )
      expect(src, `${door} still classifies with fileShape instead of the table`).not.toMatch(
        /\bfileShape\(/
      )
    }
  })

  // AND THE READERS THEMSELVES STAY WHERE THEY ARE. `source-readers.ts` is the
  // only file allowed to name them, so "which reader" has one answer and one
  // place to change it.
  it("the readers are named in exactly one file", () => {
    const table = stripComments(readFileSync(join(SRC, "source-readers.ts"), "utf8"))
    expect(table).toMatch(/\benv\.AI\.toMarkdown\b/)
    expect(table).toMatch(/\bofficeText\(/)
  })
})

// ── VIDEO LINKS — BUILD-5 §1: YOUTUBE CAPTIONS FIRST-CLASS, LOOM/TELLA
// BEST-EFFORT, NO WHISPER ──────────────────────────────────────────────────
//
// A video link is not bytes; there is no upload and nothing for the file table
// above to classify. `LINK_TYPES` is the same idea (a type resolves to a
// declared order of readers, or to no reader at all) applied to a URL instead
// of a mime/extension pair.

describe("youtubeVideoId — every shape YouTube hands out a video in", () => {
  it("reads the v= param off a watch URL", () => {
    expect(youtubeVideoId("https://www.youtube.com/watch?v=abc123XYZ_-")).toBe("abc123XYZ_-")
  })

  it("reads the short youtu.be form", () => {
    expect(youtubeVideoId("https://youtu.be/abc123XYZ_-")).toBe("abc123XYZ_-")
    expect(youtubeVideoId("https://youtu.be/abc123XYZ_-?t=30")).toBe("abc123XYZ_-")
  })

  it("reads /embed/ and /shorts/ paths", () => {
    expect(youtubeVideoId("https://www.youtube.com/embed/abc123XYZ_-")).toBe("abc123XYZ_-")
    expect(youtubeVideoId("https://www.youtube.com/shorts/abc123XYZ_-")).toBe("abc123XYZ_-")
  })

  it("is null for a non-YouTube URL and for garbage", () => {
    expect(youtubeVideoId("https://vimeo.com/12345")).toBeNull()
    expect(youtubeVideoId("not a url")).toBeNull()
    expect(youtubeVideoId("https://www.youtube.com/")).toBeNull()
  })
})

describe("classifyLink / readersForLink", () => {
  it("names YouTube, Loom and Tella, each with their own reader", () => {
    expect(readersForLink("https://www.youtube.com/watch?v=x")).toEqual(["youtube-captions"])
    expect(readersForLink("https://loom.com/share/abc")).toEqual(["loom-best-effort"])
    expect(readersForLink("https://www.tella.tv/video/abc")).toEqual(["tella-best-effort"])
  })

  it("matches a subdomain, not just the bare host", () => {
    expect(classifyLink("https://share.loom.com/x")?.label).toBe("Loom recording")
  })

  it("names no reader at all for a host none of this names — an honest refusal", () => {
    expect(readersForLink("https://vimeo.com/12345")).toEqual([])
    expect(classifyLink("https://example.com/x")).toBeNull()
  })

  it("every LINK_TYPES entry says why, same rot check as the file table", () => {
    for (const t of LINK_TYPES) expect(t.why.length, `${t.label} has no reason`).toBeGreaterThan(20)
  })
})

describe("readLink", () => {
  const realFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it("reads YouTube captions: discovers the track, then reads it", async () => {
    const calls: string[] = []
    globalThis.fetch = vi.fn(async (input: unknown) => {
      const url = String(input)
      calls.push(url)
      if (url.includes("type=list")) {
        return new Response('<transcript_list><track lang_code="en" name=""/></transcript_list>', {
          status: 200,
        })
      }
      return new Response(
        '<transcript><text start="0" dur="1.5">Hello &amp; welcome</text>' +
          '<text start="1.5" dur="2">to the walkthrough</text></transcript>',
        { status: 200 }
      )
    }) as unknown as typeof fetch

    const text = await readLink("https://www.youtube.com/watch?v=abc123")
    expect(text).toBe("Hello & welcome to the walkthrough")
    expect(calls[0]).toContain("type=list")
    expect(calls[1]).toContain("lang=en")
  })

  it("a video with no caption track at all is an honest empty, not a throw", async () => {
    globalThis.fetch = vi.fn(async () => new Response("<transcript_list></transcript_list>", { status: 200 })) as unknown as typeof fetch
    expect(await readLink("https://www.youtube.com/watch?v=nocaps")).toBe("")
  })

  it("a YouTube fetch that fails outright is the same honest empty", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down")
    }) as unknown as typeof fetch
    expect(await readLink("https://www.youtube.com/watch?v=x")).toBe("")
  })

  it("Loom best-effort reads the oEmbed title — there is no public transcript to read", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ title: "Q3 planning walkthrough" }), { status: 200 })
    ) as unknown as typeof fetch
    expect(await readLink("https://www.loom.com/share/abc123")).toBe("Q3 planning walkthrough")
  })

  it("Tella best-effort, same shape as Loom", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ title: "Onboarding demo" }), { status: 200 })
    ) as unknown as typeof fetch
    expect(await readLink("https://www.tella.tv/video/xyz")).toBe("Onboarding demo")
  })

  it("a Loom/Tella oEmbed that 404s is an honest empty, never a throw", async () => {
    globalThis.fetch = vi.fn(async () => new Response("not found", { status: 404 })) as unknown as typeof fetch
    expect(await readLink("https://loom.com/share/gone")).toBe("")
  })

  it("a link nothing here names resolves to no reader and an empty read", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("must not be called")
    }) as unknown as typeof fetch
    expect(await readLink("https://vimeo.com/1")).toBe("")
  })
})

// ── THE CONTEXT LINE — BUILD-5 §2: ONE SENTENCE PER PIECE, CHEAPEST CAPABLE
// MODEL ──────────────────────────────────────────────────────────────────

describe("contextLineFor", () => {
  let env: { AI: { run: ReturnType<typeof vi.fn> } }
  beforeEach(() => {
    env = { AI: { run: vi.fn() } }
  })

  it("asks the declared model and returns its one sentence, trimmed", async () => {
    env.AI.run.mockResolvedValue({ choices: [{ message: { content: "  This covers the Q3 renewal terms.  " } }] })
    const { line } = await contextLineFor(env as never, {
      sourceTitle: "Renewal email thread",
      piece: "We agreed to renew at the same rate through March.",
    })
    expect(line).toBe("This covers the Q3 renewal terms.")
    expect(env.AI.run.mock.calls[0][0]).toBe("@cf/meta/llama-4-scout-17b-16e-instruct")
  })

  it("a model failure is an honest empty line and NO_TOKENS, never a thrown error", async () => {
    env.AI.run.mockRejectedValue(new Error("model unavailable"))
    const result = await contextLineFor(env as never, { sourceTitle: "x", piece: "y" })
    expect(result).toEqual({ line: "", usage: NO_TOKENS })
  })

  it("a non-string reply is the same honest empty", async () => {
    env.AI.run.mockResolvedValue({ choices: [{ message: {} }] })
    expect((await contextLineFor(env as never, { sourceTitle: "x", piece: "y" })).line).toBe("")
  })

  // BUDGET, per the hub's 10 Sep 2026 ruling: the cost line is now 34% of the
  // whole build's cap, and "ingestion is recorded nowhere" — so the call
  // reports what it actually spent, in the SAME shape agent turns already log
  // (`TokenUsage`, `shared/workers/credits.ts`), rather than a fourth shape
  // nearly like the other three. This function does not WRITE the usage row
  // itself — it has no team or actor, only `{AI}` — the caller does, once it
  // has both.
  it("reports the tokens the model actually spent, in the shared TokenUsage shape", async () => {
    env.AI.run.mockResolvedValue({
      choices: [{ message: { content: "About the renewal." } }],
      usage: { prompt_tokens: 140, completion_tokens: 12, prompt_tokens_details: { cached_tokens: 40 } },
    })
    const { usage } = await contextLineFor(env as never, { sourceTitle: "x", piece: "y" })
    // Cached tokens are billed at a fraction of the rest, so they are split out
    // rather than folded into `input` — same reasoning as `readUsage` in
    // workers/data-ops (the one other place this app reads a Workers AI usage
    // block), the split just kept local rather than imported across workers.
    expect(usage).toEqual({ input: 100, output: 12, cacheWrite: 0, cacheRead: 40 })
  })

  it("a reply with no usage block at all reports NO_TOKENS, not zeroes that look measured", async () => {
    env.AI.run.mockResolvedValue({ choices: [{ message: { content: "About the renewal." } }] })
    expect((await contextLineFor(env as never, { sourceTitle: "x", piece: "y" })).usage).toEqual(NO_TOKENS)
  })
})

// ── SHEET GRAIN — BUILD-5 §2: "sheet tab = a source with the header line
// prepended to every piece". `chunkSheetTab` (knowledge-text.ts) already does
// the cutting; nothing has ever called it — the CSV/Spreadsheet readers
// convert to one flat blob of prose and hand it to the generic paragraph
// cutter, which has no idea a header line exists at all. A row somewhere in
// the middle of a long sheet loses its columns the moment it lands in a piece
// that does not happen to include row 1.
//
// PROVEN END TO END, the way the hub's exact scenario reads: a real reader
// output run through the SAME downstream chunker (`chunkText`,
// knowledge-text.ts) production uses, checking the chunk that actually holds
// a row from deep in the sheet — not `chunkSheetTab` in isolation, which
// already had its own unit tests and was never the part that was missing.
describe("readSource — a CSV's header rides every piece, even deep in the sheet", () => {
  /** A synthetic sheet: a header row and `n` data rows, RFC-4180 text — the
   * exact shape `readSource` receives as file bytes. */
  const syntheticCsv = (n: number) => {
    const header = "Client,Plan,Renews\n"
    const rows = Array.from({ length: n }, (_, i) => `Client ${i},Pro,2026-11-0${i % 9}`).join("\n")
    return header + rows + "\n"
  }

  it("a chunk from deep in a 300-row sheet still carries the header", async () => {
    const csv = syntheticCsv(300)
    const text = await readSource(
      { AI: {} as never },
      { bytes: new TextEncoder().encode(csv), name: "clients.csv", mime: "text/csv" }
    )
    const chunks = chunkText(text)
    const chunkWithRow200 = chunks.find((c) => c.includes("Client 200"))
    expect(chunkWithRow200, "row 200 must land in some chunk").toBeTruthy()
    expect(chunkWithRow200).toContain("Client | Plan | Renews")
  })
})
