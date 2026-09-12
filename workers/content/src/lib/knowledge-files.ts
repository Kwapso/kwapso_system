// TURNING A FILE INTO WORDS — the whole of the third way into the knowledge
// base, in one file, because it is one decision made three times over.
//
// ════════════════════════════════════════════════════════════════════════════
// THE DECISION: WE ACCEPT EVERYTHING AND WE LIE ABOUT NOTHING.
//
// The owner's sentence was "any type of file that is sitting locally on my
// desktop". A converter that reads a dozen formats cannot honour that on its
// own, so the feature is built as two promises that are kept separately:
//
//   1. THE FILE IS ALWAYS KEPT. Whatever it is — a deck, a zip, a Sketch file,
//      a font — it is stored, it becomes a source, it appears in the list, and
//      it can be opened again. Refusing half of what a person has on their
//      desktop is not "any type of file".
//   2. THE WORDS ARE ONLY EVER CLAIMED WHEN THEY EXIST. A file we could not
//      read has NO body, is indexed into NO searchable pieces, and carries a
//      sentence saying so that every screen showing it repeats. A knowledge
//      base that quietly holds a document it never read is worse than one that
//      refused it, because the refusal is visible and the silence is not.
//
// Those two together are what "stored, not searchable" means on the screen, and
// nothing here may ever produce a third state where a source LOOKS indexed and
// is not.
//
// ════════════════════════════════════════════════════════════════════════════
// THE EXTRACTOR IS `env.AI.toMarkdown()`, AND NOTHING ELSE.
//
// No parsing dependency. Cloudflare's Markdown Conversion is a method on the AI
// binding this worker already holds for its embeddings, so a PDF, a Word
// document, a spreadsheet, an image or a saved web page becomes markdown with
// no new package, no new secret and no new socket. What it supports is written
// down below, from Cloudflare's own published table, because a list nobody can
// find is a list the next person re-derives by trial and error.
//
// Two things it does NOT support are worth saying out loud, since both are
// things a person will absolutely drop on this screen:
//   • POWERPOINT (.pptx / .ppt). A deck stores and lists; its words do not.
//   • ANYTHING ARCHIVED (.zip, .tar) and any proprietary design format.
// Neither is refused. Both say so.
//
// PLAIN TEXT DOES NOT GO THROUGH IT AT ALL. A .txt, a .md or a .log IS already
// its own words: decoding the bytes is exact, instant, free, and cannot fail in
// a way a converter can. Sending it to a conversion service would be a network
// round-trip to be told what we already have.

import { causeOf, recordWorkerError } from "@shared/workers/error-log"
import { GuardError } from "@shared/workers/gating"
import { readLink, readersFor, resolveLinkType, runReader, type ReaderName } from "./source-readers"
import { DOCUMENT_LIMIT_BYTES } from "@shared/workers/validate"
import type { Env } from "../env"

/* THE FORMAT LISTS THAT USED TO LIVE HERE ARE GONE, and their absence is the
 * point of R42. This door kept its own idea of what could be read and the Drive
 * lane kept a different one, so the same PDF was searchable through one door and
 * page geometry through the other. Both now ask `source-readers.ts`, which is the
 * only file that decides. Deleting these three lists is what the registry bought;
 * nothing was added to replace them here. */


/** WHAT WE CAN SAY ABOUT A FILE WE COULD NOT READ, by the family it belongs to.
 * A person who is told "we can't read this" wants to know whether that is a
 * mistake they can fix, and for two of these it is (export the deck as a PDF,
 * unzip the archive) — so the sentence says so. Everything unlisted falls
 * through to the general one, which is still true and still says the two things
 * that matter: it is kept, and it is not searchable. */
const UNREADABLE_REASON: Record<string, string> = {
  pptx: "We keep presentations but can't read their words yet. Export it as a PDF and add that too if you want it searchable.",
  ppt: "We keep presentations but can't read their words yet. Export it as a PDF and add that too if you want it searchable.",
  key: "We keep presentations but can't read their words yet. Export it as a PDF and add that too if you want it searchable.",
  zip: "This is an archive, so there is nothing to read until it is unpacked, the file is kept, and the assistant can't answer from it.",
  doc: "This is the old Word format, which we can't read. Save it as .docx or a PDF and add that too if you want it searchable.",
}

/** What one file became. `text` null means we could not read it, and then `note`
 * always says why: the two travel together so that no caller can store one
 * without the other, which is the only way "never pretend a file was indexed"
 * survives a future edit. */
export type ExtractedFile = {
  text: string | null
  /** why there are no words, or why there are fewer than the file holds — in
   * plain sentences a person reads on the screen. Null when the whole file was
   * read. */
  note: string | null
}

/* The conversion ceiling moved to source-readers.ts with the conversion itself.
 * It was twenty seconds because that is a large scanned PDF's real conversion
 * time with room to spare and well inside the request a person is waiting on —
 * and the sweep, which was never given it, wants it for the same reason. */

/** The file's extension, lowercased, or "". */
function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".")
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : ""
}

/** Is this something we can read at all, and how? Exported because the DOOR
 * says so to the person before anything is stored, and a screen that promises
 * one thing while the extractor does another is the disagreement this prevents. */
export function readability(
  contentType: string,
  fileName: string
): "text" | "convert" | "unreadable" {
  // R42: DERIVED FROM THE TABLE, not from lists this door keeps. It kept its own
  // until 27 Aug 2026, and the Drive lane kept different ones, which is how the
  // same PDF was searchable through one door and page geometry through the other.
  // The three words this returns are the DOOR's vocabulary — what it says to the
  // person before anything is stored — and they are now a reading of the one
  // table rather than a second opinion about it.
  const readers = readersFor(fileName, contentType)
  if (!readers.length) return "unreadable"
  return readers[0] === "plain" ? "text" : "convert"
}

/** The sentence for a file whose words we cannot get at. */
export function unreadableNote(fileName: string): string {
  return (
    UNREADABLE_REASON[extensionOf(fileName)] ??
    "We couldn't read this kind of file, so it is kept here but the assistant can't answer from it. Anything you type into the note below IS searchable."
  )
}

/** CUT TO WHAT ONE ROW CAN HOLD, and say that it was cut.
 *
 * A 600-page PDF converts to more text than a D1 row may carry
 * (`DOCUMENT_LIMIT_BYTES`). The typed-note door REFUSES at that ceiling and
 * saves nothing, which is right there — a person pasting text can split it. It
 * would be wrong here: the FILE is already accepted and already kept, and
 * throwing away the first million characters we successfully read because there
 * were more is a worse answer than an incomplete one. So it is cut, and the cut
 * is stated on the row in both numbers, exactly as `indexSource` states its own
 * overflow — the rule is "never silently trimmed", not "never trimmed".
 *
 * Cut by BYTES, walking back to a whole character: a slice that lands mid-
 * codepoint is a broken word in an answer somebody quotes. */
export function capToRow(text: string): ExtractedFile {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(text).length
  if (bytes <= DOCUMENT_LIMIT_BYTES) return { text, note: null }
  // Bytes-per-character is at least 1, so the byte budget is a safe upper bound
  // on the characters to keep; step back until the encoding fits.
  let end = Math.min(text.length, DOCUMENT_LIMIT_BYTES)
  while (end > 0 && encoder.encode(text.slice(0, end)).length > DOCUMENT_LIMIT_BYTES) {
    // Overshoot is at most 3 bytes per character, so this converges in a few
    // passes from the ratio rather than one character at a time.
    end = Math.floor(end * (DOCUMENT_LIMIT_BYTES / encoder.encode(text.slice(0, end)).length))
  }
  return {
    text: text.slice(0, end),
    note: `This file holds ${mb(bytes)} of text and one source can hold ${mb(DOCUMENT_LIMIT_BYTES)}, the first ${mb(DOCUMENT_LIMIT_BYTES)} is searchable and the whole file is kept. Add the rest as a second source if you need it.`,
  }
}

const mb = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`

/** READ A FILE. The one entry point, and the only place that decides whether a
 * source has words.
 *
 * Never throws for a file it could not read — that is an OUTCOME, not an error,
 * and the caller's job is to store the file either way. It throws only for the
 * one thing that is genuinely the caller's fault (an empty file), because a
 * source with nothing in it and nothing to open is not a source. */
export async function extractFile(
  env: Env,
  file: { bytes: Uint8Array; contentType: string; fileName: string }
): Promise<ExtractedFile> {
  if (!file.bytes.length) throw new GuardError(400, "invalid_input", "That file is empty.")

  // R42: WHICH READERS, AND IN WHAT ORDER, IS THE TABLE'S ANSWER. This door still
  // owns what it SAYS about each ending — it has a person waiting and the sweep
  // does not — but it no longer owns the choosing.
  const readers = readersFor(file.fileName, file.contentType)
  if (!readers.length) return { text: null, note: unreadableNote(file.fileName) }

  if (readers[0] === "plain") {
    // `fatal: false` on purpose: a log file with one bad byte in it is still a
    // log file, and the replacement character is a truer answer than refusing.
    const decoded = new TextDecoder("utf-8", { fatal: false, ignoreBOM: false }).decode(file.bytes).trim()
    return decoded
      ? capToRow(decoded)
      : { text: null, note: "This file has no text in it, so there is nothing for the assistant to read." }
  }

  // WHICH READER WAS IN ITS HANDS when the whole thing fell over. Declared out
  // here so the catch below can name it: the loop tries the declared readers in
  // order, so "the conversion crashed" without this is a fact nobody can act on
  // in a table (R42) whose entire purpose is that a reader failure is traceable
  // to one reader and one format.
  let attempted: ReaderName = readers[0]
  try {
    // EACH DECLARED READER IN ORDER — which is what buys `.docx` and `.xlsx` a
    // free fallback when the converter is unavailable, and what will buy the next
    // format one without editing this door.
    let text = ""
    let why = ""
    for (const reader of readers) {
      attempted = reader
      const out = await runReader(reader, env, {
        bytes: file.bytes,
        name: file.fileName,
        mime: file.contentType,
      })
      why = out.error ?? why
      text = out.text
      if (text) break
    }
    if (!text && why)
      return {
        text: null,
        note: `We couldn't read this file (${why}). It is kept here, but the assistant can't answer from it.`,
      }
    return text
      ? capToRow(text)
      : {
          text: null,
          note: "We read this file and found no text in it, an image with nothing written on it, or a scan we couldn't make out. It is kept here either way.",
        }
  } catch (e) {
    // Loud in the log, honest on the row. ERROR-HANDLING.md's rule is never to
    // swallow: the console line is what an operator finds, and the note is what
    // the person who uploaded it reads.
    console.error("knowledge file conversion failed:", attempted, file.fileName, e)
    // AND THE CAUSE OUTLIVES THE TAIL. The note above is the right thing to say
    // to the person — their file is kept, they can try again — and it is the
    // wrong place to keep the diagnosis: it tells them it failed and tells us
    // nothing about WHICH reader crashed on WHICH file, which is the only fact
    // anyone can act on. R42 exists because the two doors used to disagree about
    // readers silently; a crash that names neither the reader nor the format is
    // the same silence one layer down. Recording cannot throw, so an honest note
    // is still returned whatever happens here.
    await recordWorkerError(
      env.DB,
      "content",
      `knowledge/extract:${attempted}`,
      new Error(
        `the ${attempted} reader crashed on "${file.fileName}" (${file.contentType || "no content type"}, ${mb(file.bytes.length)}) — the file is stored and has no words, and every file of this kind will do the same until the reader is fixed: ${causeOf(e)}`
      )
    )
    return {
      text: null,
      note: "We couldn't read this file just now, it is kept here, and you can add it again later to try once more.",
    }
  }
}

/* `CONVERT_TIMEOUT_MS` and `withTimeout` moved to source-readers.ts with the
 * conversion itself: the ceiling belongs to the reader, so the sweep gets it too
 * rather than only the door that happened to be written first. */

/**
 * READ A LINK — the third way words come into this door, and the newest
 * (BUILD-5 §1: YouTube captions first-class, Loom/Tella best-effort, no
 * Whisper). There are no bytes to keep here; the source is the link itself,
 * and the two promises this file makes are unchanged: it is kept whatever
 * happens, and the words are only ever claimed when `readLink`
 * (source-readers.ts, R42's table applied to a URL instead of a mime/
 * extension) actually found some.
 *
 * NEVER THROWS. Unlike `extractFile`'s empty-bytes case, there is no "you
 * gave me nothing" version of a link — a link nothing here can read, or one
 * whose video has no caption track, is a true and useful answer, the same way
 * an unreadable file is. */
export async function extractLink(url: string): Promise<ExtractedFile> {
  // HOST-BASED FIRST, DISCOVERED SECOND (`resolveLinkType`, source-readers.ts)
  // — a custom domain (the owner's own `content.kwapso.com`, a real Tella
  // recording no host list can ever see) is resolved by reading its OWN
  // oEmbed discovery tag rather than refused for not matching a name. The
  // resolved type is handed straight into `readLink` below so the page is
  // never fetched twice to ask the same question.
  const kind = await resolveLinkType(url)
  if (!kind)
    return {
      text: null,
      note: "We can't read this link, so it is kept here but the assistant can't answer from it. Anything you type into the note below IS searchable.",
    }
  const text = await readLink(url, kind)
  return text
    ? capToRow(text)
    : {
        text: null,
        // "CAPTION TRACK" WAS ACCURATE FOR YOUTUBE AND WRONG FOR LOOM/TELLA —
        // neither has a caption track at all, so the honest, general reason is
        // "no public transcript". Leads with what a person can DO about it
        // (add the transcript below) rather than only the diagnosis — this
        // note is rendered raw on the record's screen (R28's own structural
        // gap for a worker-only file: appFiles() only walks what a front
        // door imports, so this string cannot enter the i18n catalogue
        // however it is written — flagged to the hub 11 Sep 2026, ruled a
        // real but structurally unfixable debt from here, matching the
        // existing UNREADABLE_REASON sentences beside it).
        note: `We couldn't read the words in this ${kind.label} — it may not have a public transcript, or we couldn't reach it just now. It's kept here as a source either way; add the transcript yourself in the note below if you want the assistant to read it.`,
      }
}

