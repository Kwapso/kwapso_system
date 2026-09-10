// THE ONE PROMISE THIS FEATURE MAKES, under test: a file is always kept, and
// its words are only ever claimed when they exist.
//
// Everything here is about the seam between those two halves. The interesting
// cases are not "does a PDF convert" (that is Cloudflare's job and it has its
// own service); they are the four ways this code could quietly LIE — by
// refusing a file it should have kept, by claiming words it never read, by
// trimming a document without saying so, or by turning a conversion failure
// into a 500 that loses the upload.

import { afterEach, describe, expect, it, vi } from "vitest"

import { DOCUMENT_LIMIT_BYTES } from "@shared/workers/validate"
import { GuardError } from "@shared/workers/gating"
import { indexableText } from "../src/lib/knowledge"
import {
  capToRow,
  extractFile,
  extractLink,
  readability,
  unreadableNote,
} from "../src/lib/knowledge-files"
import type { Env } from "../src/env"

/** A stand-in for the AI binding: only `toMarkdown` is ever reached here. */
function aiEnv(toMarkdown: (...args: unknown[]) => unknown): Env {
  return { AI: { toMarkdown } } as unknown as Env
}

const bytes = (text: string) => new TextEncoder().encode(text)

/** THE FOUR BYTES EVERY ZIP OPENS WITH - "PK" and two control bytes - which is
 * how a reader tells a .docx or an .xlsx from anything else.
 *
 * Spelled as ESCAPES, and named, rather than typed as raw bytes into a string
 * literal. Identical at runtime; the difference is on disk. Two raw control
 * bytes make `grep` classify the whole FILE as binary, and a binary file is
 * SKIPPED IN SILENCE - no output, exit 1, and nothing to tell it apart from an
 * honest zero matches. On 8 Sep 2026 that silence was read as "the feature has
 * been deleted" twice, in two different sessions, about two different files. */
const ZIP_MAGIC = "PK\u0003\u0004"

describe("readability: which files we can read, and how", () => {
  it("reads plain text itself, without a conversion round-trip", () => {
    expect(readability("text/plain", "notes.txt")).toBe("text")
    expect(readability("text/markdown", "README.md")).toBe("text")
    // A browser that declares nothing useful — the extension is then the only
    // thing that knows.
    expect(readability("application/octet-stream", "server.log")).toBe("text")
  })

  it("converts the formats Cloudflare's toMarkdown supports", () => {
    expect(readability("application/pdf", "contract.pdf")).toBe("convert")
    expect(
      readability(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "brief.docx"
      )
    ).toBe("convert")
    expect(readability("text/csv", "rates.csv")).toBe("convert")
    expect(readability("image/png", "whiteboard.png")).toBe("convert")
    // …including by extension alone, which is the ONLY thing that knows for the
    // formats no browser has a mime for.
    expect(readability("application/octet-stream", "budget.numbers")).toBe("convert")
    expect(readability("application/octet-stream", "old.xls")).toBe("convert")
  })

  // The case the owner will meet first, and the one that must never be a
  // refusal: toMarkdown does not read PowerPoint.
  // A DECK IS READ NOW, and it is the first thing the reader table bought.
  //
  // It used to be unreadable HERE and readable through the Drive lane, because
  // the converter does not list PowerPoint while `file-text.ts` unzips one
  // correctly, in slide order — and each door kept its own list of what it could
  // manage. Neither door was wrong about its own reader; the arrangement was
  // wrong. Asking one table means the upload door gained `.pptx` without a line
  // of reading code being written for it.
  it("reads a deck with the unzip reader, and still refuses an archive or a design file", () => {
    expect(
      readability(
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "pitch.pptx"
      )
    ).toBe("convert")
    expect(readability("application/zip", "assets.zip")).toBe("unreadable")
    expect(readability("application/octet-stream", "logo.sketch")).toBe("unreadable")
  })

  it("says something a person can act on for the kinds it knows", () => {
    expect(unreadableNote("pitch.pptx")).toContain("PDF")
    expect(unreadableNote("assets.zip")).toContain("archive")
    // And something true for the ones it does not.
    expect(unreadableNote("logo.sketch")).toContain("kept here")
  })
})

describe("capToRow: a document longer than one row can hold", () => {
  it("leaves an ordinary document alone and says nothing", () => {
    expect(capToRow("a short contract")).toEqual({ text: "a short contract", note: null })
  })

  it("cuts to the row's ceiling and SAYS it cut — never silently", () => {
    const out = capToRow("x".repeat(DOCUMENT_LIMIT_BYTES + 5_000))
    expect(new TextEncoder().encode(out.text as string).length).toBeLessThanOrEqual(
      DOCUMENT_LIMIT_BYTES
    )
    expect(out.note).toBeTruthy()
    expect(out.note).toContain("searchable")
  })

  it("never cuts mid-character — a broken word would end up in a quoted answer", () => {
    // Every character is three bytes, so a naive byte slice lands mid-codepoint.
    const out = capToRow("漢".repeat(DOCUMENT_LIMIT_BYTES))
    const kept = out.text as string
    expect(kept.length).toBeGreaterThan(0)
    expect(kept).not.toContain("�")
    // Round-tripping through the encoder must reproduce it exactly.
    expect(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(new TextEncoder().encode(kept))).toBe(kept)
    expect(new TextEncoder().encode(kept).length).toBeLessThanOrEqual(DOCUMENT_LIMIT_BYTES)
  })
})

describe("extractFile: the file is kept, the words are only claimed when they exist", () => {
  it("decodes plain text without touching the conversion service at all", async () => {
    const toMarkdown = vi.fn()
    const out = await extractFile(aiEnv(toMarkdown), {
      bytes: bytes("the dispatch runbook"),
      contentType: "text/plain",
      fileName: "runbook.txt",
    })
    expect(out).toEqual({ text: "the dispatch runbook", note: null })
    expect(toMarkdown).not.toHaveBeenCalled()
  })

  it("converts a document and hands back its words", async () => {
    const toMarkdown = vi.fn().mockResolvedValue({
      format: "markdown",
      data: "# Contract\n\nThe dispatch window is four hours.",
    })
    const out = await extractFile(aiEnv(toMarkdown), {
      bytes: bytes("%PDF-1.4 …"),
      contentType: "application/pdf",
      fileName: "contract.pdf",
    })
    expect(out.text).toContain("four hours")
    expect(out.note).toBeNull()
    expect(toMarkdown).toHaveBeenCalledOnce()
  })

  // THE HEART OF IT. Three different ways a file can end up with no words, and
  // every one of them must produce the SAME shape: no text, and a sentence.
  it("gives an unreadable kind no words and a reason", async () => {
    const toMarkdown = vi.fn()
    const out = await extractFile(aiEnv(toMarkdown), {
      bytes: bytes(ZIP_MAGIC),
      contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      fileName: "pitch.pptx",
    })
    expect(out.text).toBeNull()
    expect(out.note).toBeTruthy()
    // Not even attempted — a conversion we know will fail is a wasted call.
    expect(toMarkdown).not.toHaveBeenCalled()
  })

  it("gives a conversion ERROR no words and a reason — never a throw", async () => {
    const out = await extractFile(
      aiEnv(vi.fn().mockResolvedValue({ format: "error", error: "corrupt document" })),
      { bytes: bytes("%PDF-broken"), contentType: "application/pdf", fileName: "broken.pdf" }
    )
    expect(out.text).toBeNull()
    expect(out.note).toContain("corrupt document")
  })

  it("gives a conversion CRASH no words and a reason — never a throw", async () => {
    const out = await extractFile(
      aiEnv(vi.fn().mockRejectedValue(new Error("upstream down"))),
      { bytes: bytes("%PDF-1.4"), contentType: "application/pdf", fileName: "contract.pdf" }
    )
    expect(out.text).toBeNull()
    expect(out.note).toBeTruthy()
  })

  it("gives an EMPTY conversion no words and a reason (a scan with nothing on it)", async () => {
    const out = await extractFile(
      aiEnv(vi.fn().mockResolvedValue({ format: "markdown", data: "   \n  " })),
      { bytes: bytes("PNG"), contentType: "image/png", fileName: "blank.png" }
    )
    expect(out.text).toBeNull()
    expect(out.note).toContain("no text")
  })

  it("caps an enormous conversion to what one row holds, and says so", async () => {
    const out = await extractFile(
      aiEnv(vi.fn().mockResolvedValue({ format: "markdown", data: "y".repeat(DOCUMENT_LIMIT_BYTES * 2) })),
      { bytes: bytes("%PDF-1.4"), contentType: "application/pdf", fileName: "book.pdf" }
    )
    expect(new TextEncoder().encode(out.text as string).length).toBeLessThanOrEqual(
      DOCUMENT_LIMIT_BYTES
    )
    expect(out.note).toBeTruthy()
  })

  // The ONE thing that is genuinely the caller's fault, and therefore the one
  // thing that is a 400 rather than an outcome: a source with no file and no
  // words behind it is not a source.
  it("refuses an empty file, in words, as a clean 400", async () => {
    await expect(
      extractFile(aiEnv(vi.fn()), {
        bytes: new Uint8Array(),
        contentType: "application/pdf",
        fileName: "nothing.pdf",
      })
    ).rejects.toBeInstanceOf(GuardError)
  })
})

// A CRASHED READER TELLS THE PERSON HONESTLY AND TELLS US WHICH READER, ON WHICH
// FILE. The note above is the right thing to SAY — the file is kept, try again —
// and it was the whole of what anybody knew: a `console.error` and a sentence
// with no reader in it, no format, no file name. R42 exists because a reader
// failure is precisely the fact somebody must be able to act on, and "every PDF
// in the base scores zero" is what it looks like when nobody could.
describe("a conversion crash: honest to the person, named in the store", () => {
  /** The core database, for real, with the real error_logs migrations. */
  async function coreDb() {
    const { readFileSync } = await import("node:fs")
    const { join } = await import("node:path")
    const { DatabaseSync } = await import("node:sqlite")
    const CORE = join(__dirname, "..", "..", "..", "db", "core")
    const db = new DatabaseSync(":memory:")
    for (const m of ["0012_error_logs.sql", "0019_error_log_bound.sql", "0020_error_request_id.sql"])
      db.exec(readFileSync(join(CORE, m), "utf8"))
    const binding = {
      prepare(sql: string) {
        const stmt = db.prepare(sql)
        let args: unknown[] = []
        const api = {
          bind(...a: unknown[]) {
            args = a
            return api
          },
          async run() {
            return { meta: { changes: Number(stmt.run(...(args as never[])).changes) } }
          },
        }
        return api
      },
    }
    const rows = () =>
      db.prepare("SELECT source, place, message FROM error_logs ORDER BY rowid").all() as {
        source: string
        place: string
        message: string
      }[]
    return { binding, rows }
  }

  it("names the reader, the file and the format — and still keeps the file", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const core = await coreDb()
    const env = {
      AI: {
        toMarkdown: () => {
          throw new Error("AI binding: markdown conversion is unavailable")
        },
      },
      DB: core.binding,
    } as unknown as Env

    const out = await extractFile(env, {
      bytes: bytes("%PDF-1.7 a real-looking document"),
      contentType: "application/pdf",
      fileName: "board-pack.pdf",
    })

    // THE PERSON'S SIDE IS UNCHANGED: no words claimed, an honest note, no throw.
    expect(out.text).toBeNull()
    expect(out.note).toMatch(/couldn't read this file just now/)

    // AND THE OPERATOR'S SIDE EXISTS.
    const written = core.rows()
    expect(written, "a reader crashed and nothing in the store said which one").toHaveLength(1)
    expect(written[0].source).toBe("content")
    expect(written[0].place, "the READER is in the place, so one query groups every file it broke on").toBe(
      "knowledge/extract:markdown"
    )
    expect(written[0].message).toMatch(/board-pack\.pdf/)
    expect(written[0].message).toMatch(/application\/pdf/)
    expect(written[0].message).toMatch(/markdown conversion is unavailable/)
    spy.mockRestore()
  })

  it("an outcome is not a crash — a reader that answers 'I could not' writes no row", async () => {
    // The difference this suite is built on: `runReader` returning an `error` is
    // a declared outcome with a sentence for the person, and belongs in the note
    // rather than the error store. Only a THROW is unexpected.
    const core = await coreDb()
    const env = { AI: { toMarkdown: async () => ({ data: "" }) }, DB: core.binding } as unknown as Env
    const out = await extractFile(env, {
      bytes: bytes("%PDF-1.7 a real-looking document"),
      contentType: "application/pdf",
      fileName: "blank.pdf",
    })
    expect(out.text).toBeNull()
    expect(core.rows(), "a file with no words in it is not an incident").toHaveLength(0)
  })
})

// AN UNREADABLE FILE INDEXES TO NOTHING — the clause the first real upload
// earned. A .pptx came back "stored, not searchable" in words and `chunkCount:
// 1` in the same row, because the indexer falls back to the TITLE when there is
// no body. One searchable piece containing nothing but the file's own name is
// the exact state this feature promises never to reach: the screen derives
// "stored, not searchable" from that count, and the assistant could have cited a
// deck it had not read a word of.
describe("indexableText: a title is not material", () => {
  it("indexes a typed note on its title even with no body — unchanged", () => {
    expect(indexableText({ title: "Dispatch rollout", body: null })).toBe("Dispatch rollout")
  })

  it("indexes a FILE we could not read to nothing at all", () => {
    expect(indexableText({ title: "Quarterly deck", body: null, file_url: "/media/internal/x/y" })).toBe("")
  })

  it("indexes a file we COULD read on its title and its words, like anything else", () => {
    expect(
      indexableText({ title: "Runbook", body: "the window is four hours", file_url: "/media/internal/x/y" })
    ).toContain("four hours")
  })
})

// THE THIRD READER, completing the story: a file's bytes go through
// `extractFile` above, and a video LINK — the one thing this app accepts with
// no bytes at all — goes through `extractLink`. Same two promises either way:
// the source is kept regardless, and the words are only ever claimed when
// `readLink` (source-readers.ts) actually found some.
describe("extractLink: a video link, kept either way", () => {
  const realFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it("reads YouTube captions when there is a track", async () => {
    globalThis.fetch = vi.fn(async (input: unknown) => {
      const url = String(input)
      if (url.includes("type=list"))
        return new Response('<transcript_list><track lang_code="en" name=""/></transcript_list>', { status: 200 })
      return new Response('<transcript><text start="0" dur="1">Hello there</text></transcript>', { status: 200 })
    }) as unknown as typeof fetch

    expect(await extractLink("https://www.youtube.com/watch?v=abc123")).toEqual({
      text: "Hello there",
      note: null,
    })
  })

  it("says so honestly when a YouTube video has no caption track", async () => {
    globalThis.fetch = vi.fn(async () => new Response("<transcript_list></transcript_list>", { status: 200 })) as unknown as typeof fetch
    const out = await extractLink("https://www.youtube.com/watch?v=nocaps")
    expect(out.text).toBeNull()
    expect(out.note).toContain("kept here")
  })

  it("reads a Loom title as best-effort words, and says the video is still kept when there are none", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ title: "Q3 planning walkthrough" }), { status: 200 })
    ) as unknown as typeof fetch
    expect(await extractLink("https://www.loom.com/share/abc123")).toEqual({
      text: "Q3 planning walkthrough",
      note: null,
    })
  })

  it("names something a person can act on for a link nothing here reads at all", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("must not be called — vimeo has no declared reader")
    }) as unknown as typeof fetch
    const out = await extractLink("https://vimeo.com/12345")
    expect(out.text).toBeNull()
    expect(out.note).toContain("kept here")
  })
})
