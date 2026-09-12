// WHICH READER TURNS THIS THING INTO WORDS — one declared table, asked by every
// door, chosen by none of them.
//
// ── WHY THIS EXISTS, AND IT IS A REPAIR RATHER THAN A PRECAUTION ────────────
//
// Until 27 Aug 2026 this app had TWO readers and no table, and which one a file
// got was decided by the door it walked through:
//
//   the UPLOAD door  -> `extractFile`, which converts with `env.AI.toMarkdown`
//                       and reads PDFs, images, html, Office and OpenDocument
//   the DRIVE lane   -> `extractFileText`, hand-rolled, which reads .pptx that
//                       the converter cannot — and reads a PDF as glyph indices
//                       and an image not at all
//
// So a PDF somebody uploaded was searchable and the SAME PDF sitting in a Drive
// folder was 46 chunks of page geometry. Nobody decided that. It is what happens
// when the reader is picked at the call site instead of declared, and it had
// already happened twice before anybody looked.
//
// The two are COMPLEMENTARY, which is the whole argument for a table rather than
// a winner: the right answer for `.pptx` is the unzip reader and the right answer
// for a PDF is the converter, so what a door needs is a PREFERENCE PER TYPE with
// somewhere to fall back to — not one reader per door.
//
// ── WHY IT IS SAFE TO CHANGE WHAT A READER RETURNS ─────────────────────────
//
// Because the sweep repairs what it already stored, and that is tested rather
// than assumed (`google-ingest.test.ts`, "a Drive file that stops being readable
// repairs itself"). Every walk re-hydrates each file and hydration REPLACES the
// body, so a better reader means a different body, a different content hash, a
// hash-skip that declines to skip, and a source re-chunked from the new text —
// keeping its id, its compartment, its fence and its history.
//
// That is what makes a new reader repair the documents already in the base
// without anybody re-uploading anything, and it is why this table can be edited
// with confidence rather than only appended to.
//
// ── THE ONE RULE (R42) ─────────────────────────────────────────────────────
//
// Every accepted type resolves to a declared reader ON EVERY DOOR, or to an
// honest refusal — and no door chooses its own. The last clause is the
// load-bearing one: a door that reaches past this table is the defect this file
// was written to end, and `source-readers.test.ts` reads both doors off the disk
// to say so.

import type { Ai } from "@cloudflare/workers-types"

import { NO_TOKENS, type TokenUsage } from "@shared/workers/credits"
import { parseCsv } from "@shared/workers/csv"
import { queryText } from "@shared/workers/validate"
import { hasVideoPathSegment } from "@shared/media-links"

import { looksLikeProse, officeText, readsLikeWords } from "./file-text"
import { chunkSheetTab, contextLinePrompt } from "./knowledge-text"

/** Everything a reader needs from the worker. Narrow on purpose: a reader has no
 * business with a database, a guard or a token. */
export type ReaderEnv = { AI: Ai }

/** THE READERS THEMSELVES. Three, and the names are what the table below and the
 * law refer to — a name here that nothing declares is as much a defect as a type
 * that resolves to nothing. */
export type ReaderName =
  /** Cloudflare's own document conversion. Reads a PDF properly (it is the one
   * that handles subsetted fonts, which is what defeats a hand-rolled parser),
   * and describes an image. Costs a model call. */
  | "markdown"
  /** OOXML unzipped in-process. The only reader that handles `.pptx`, and a free
   * fallback for `.docx`/`.xlsx` when the converter is unavailable. */
  | "office-zip"
  /** The bytes ARE the words. No call, no cost. */
  | "plain"
  /** BUILD-5 §2: "sheet tab = a source with the header line prepended to
   * every piece." Parses the CSV itself (`chunkSheetTab`, knowledge-text.ts)
   * rather than handing it to the converter or the bytes as-is — the only
   * reader here that pre-chunks, because a header is a per-PIECE fact the
   * generic paragraph cutter downstream has no way to know. No call, no
   * cost: deterministic and free, same as `plain`. */
  | "csv-grain"
  /** YouTube's unauthenticated captions endpoint. First-class per BUILD-5 —
   * see the essay above `LINK_TYPES`. */
  | "youtube-captions"
  /** Loom's public oEmbed title. Best-effort: there is no public transcript
   * endpoint, so this is a name, not the recording's content. NOT the same
   * shape as Tella below any more — see that reader's own comment for why a
   * title alone stopped being an acceptable "read" for a real recording. */
  | "loom-best-effort"
  /** Tella's OWN PAGE embeds the real, word-level transcript it captions the
   * player with — `transcriptionWords`, found by fetching a real Tella
   * recording (BUILD-5, 12 Sep 2026, the owner's own recording) rather than
   * by reading Tella's public API docs, which say nothing about it. Retired
   * `tella-best-effort` (the oEmbed title) as a SUCCESS outcome for exactly
   * this reason: a 4-word title reported as "read" is worse than an honest
   * refusal, because it tells the person their video was read when nothing
   * of substance was. */
  | "tella-transcript"

/** A KIND OF THING SOMEBODY BRINGS, and the readers to try for it in order. */
export type SourceType = {
  /** What a person calls it — used in the sentence shown for a refusal. */
  label: string
  mimes: readonly string[]
  extensions: readonly string[]
  /** IN ORDER. The first that yields usable text wins; a reader that yields
   * nothing is not a failure, it is the next one's turn. */
  readers: readonly ReaderName[]
  /** Why THIS order for THIS type. Read by a person, and rot-checked by the law:
   * an entry with no reason is an entry nobody thought about. */
  why: string
  /** Hold the result to the word-shape test as well as the readable-character
   * one. Only where a reader can plausibly return readable NON-words — a PDF
   * whose page geometry is printable to the last byte. */
  mustReadLikeWords?: true
}

/** THE TABLE. Order within a type matters; order between types does not. */
export const SOURCE_TYPES: readonly SourceType[] = [
  {
    label: "PDF",
    mimes: ["application/pdf"],
    extensions: ["pdf"],
    readers: ["markdown"],
    // The hand-rolled reader is deliberately NOT a fallback here. It returns
    // glyph indices for any document using a subsetted font, which is most of
    // them, and a fallback that returns confident rubbish is worse than none —
    // every PDF in the agency's base scored 0.000 on letter-shaped tokens.
    why: "only the converter handles subsetted fonts; the hand-rolled reader returns glyph indices",
    mustReadLikeWords: true,
  },
  {
    label: "Image",
    mimes: ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif", "image/bmp"],
    extensions: ["jpeg", "jpg", "png", "webp", "svg", "gif", "bmp"],
    readers: ["markdown"],
    why: "the converter describes what is in the picture; nothing else here can read an image at all",
  },
  {
    label: "PowerPoint",
    mimes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    extensions: ["pptx"],
    readers: ["office-zip"],
    // The one type where the hand-rolled reader is AHEAD: the converter does not
    // list PowerPoint, and a deck is one of the likeliest things to be dropped.
    why: "the converter does not read decks; the unzip reader does, in slide order",
  },
  {
    label: "Word document",
    mimes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    extensions: ["docx"],
    readers: ["markdown", "office-zip"],
    why: "the converter keeps structure; the unzip reader is a free fallback when it is unavailable",
  },
  {
    label: "Spreadsheet",
    mimes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel.sheet.macroenabled.12",
      "application/vnd.ms-excel.sheet.binary.macroenabled.12",
      "application/vnd.ms-excel",
      "application/vnd.oasis.opendocument.spreadsheet",
      "application/vnd.apple.numbers",
    ],
    extensions: ["xlsx", "xlsm", "xlsb", "xls", "et", "ods", "numbers"],
    readers: ["markdown", "office-zip"],
    why: "same as Word — the converter first, the unzip reader as a free fallback",
  },
  {
    label: "Open Document text",
    mimes: ["application/vnd.oasis.opendocument.text"],
    extensions: ["odt"],
    readers: ["markdown"],
    why: "the converter reads it; the unzip reader is OOXML and would not",
  },
  {
    label: "Web page",
    mimes: ["text/html", "application/xml"],
    extensions: ["html", "htm", "xml"],
    readers: ["markdown", "plain"],
    why: "the converter strips the furniture; plain text is the honest fallback",
  },
  {
    label: "Plain text",
    mimes: ["text/plain", "text/markdown"],
    extensions: [
      "txt", "md", "markdown", "log", "json", "yaml", "yml", "rtf", "tsv",
      "sql", "ts", "js", "py", "css",
    ],
    readers: ["plain"],
    why: "the bytes are the words; a model call here would cost something and add nothing",
  },
  {
    label: "Comma-separated values",
    mimes: ["text/csv"],
    extensions: ["csv"],
    // csv-grain FIRST, not the converter — BUILD-5 §2's own grain rule for a
    // sheet is a property of how it is CUT, not of what turns its bytes into
    // prose, and only a reader that knows the file is a table of rows can
    // give every piece its header. `markdown`/`plain` stay as the fallback
    // for a CSV `parseCsv` cannot make sense of (e.g. it is not really
    // comma-separated at all) — the free fallback the old door always had.
    readers: ["csv-grain", "markdown", "plain"],
    why: "the sheet's own grain (a header on every piece) comes first; the converter and the bytes are fallbacks for a file that turns out not to parse as rows",
  },
]

/** THINGS WITH NO WORDS IN THEM — declared, so that "we cannot read this" is a
 * decision somebody wrote down rather than the absence of one.
 *
 * Video and audio sit here TODAY and are the next entries to move up, not
 * permanent members: transcription is a reader this table has room for and the
 * app does not yet have. Saying so here is what stops the next person reading
 * this list as a judgement about what is possible. */
export const UNREADABLE_TYPES: readonly { label: string; mimes: readonly string[]; extensions: readonly string[]; why: string }[] = [
  {
    label: "Artwork",
    mimes: ["application/postscript"],
    extensions: ["eps", "ai", "psd", "sketch", "fig", "svgz"],
    why: "vector artwork has no prose in it; its page description is printable and meaningless",
  },
  {
    label: "Archive",
    mimes: ["application/zip", "application/x-tar", "application/gzip"],
    extensions: ["zip", "gz", "tar", "rar", "7z", "dmg", "exe"],
    why: "an archive is other files; reading it means unpacking it, which is a different feature",
  },
  {
    label: "Font",
    mimes: ["font/ttf", "font/otf", "font/woff", "font/woff2"],
    extensions: ["ttf", "otf", "woff", "woff2"],
    why: "a font is shapes for letters, not letters",
  },
  {
    label: "Mail template",
    mimes: [],
    extensions: ["oft", "msg"],
    why: "an Outlook template is an OLE container; there is no reader here for one",
  },
  {
    label: "Video",
    mimes: ["video/mp4", "video/quicktime", "video/webm"],
    extensions: ["mp4", "mov", "avi", "mkv", "webm"],
    why: "NOT permanent — transcription is a reader this table has room for and the app has not built",
  },
  {
    label: "Audio",
    mimes: ["audio/mpeg", "audio/wav", "audio/mp4"],
    extensions: ["mp3", "wav", "m4a", "aac"],
    why: "NOT permanent — the same transcription reader as video",
  },
]

function extensionOf(name: string): string {
  const dot = (name || "").lastIndexOf(".")
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ""
}

const matches = (t: { mimes: readonly string[]; extensions: readonly string[] }, name: string, mime: string) =>
  t.mimes.includes((mime || "").toLowerCase().split(";")[0].trim()) || t.extensions.includes(extensionOf(name))

/** WHAT KIND OF THING IS THIS, out of the two declared lists.
 *
 * `null` means neither list names it — which is NOT the same as unreadable. An
 * unknown extension with no mime is READ as plain text, the behaviour this app
 * has always had, because a file somebody's desktop calls `.notes` is usually
 * words. What stops that being garbage is the prose guard, not this function. */
export function classify(name: string, mime: string): SourceType | null {
  return SOURCE_TYPES.find((t) => matches(t, name, mime)) ?? null
}

/** Is this a thing we have decided we cannot read? */
export function declaredUnreadable(name: string, mime: string): { label: string; why: string } | null {
  return UNREADABLE_TYPES.find((t) => matches(t, name, mime)) ?? null
}

/** THE READERS TO TRY, IN ORDER. Empty means an honest refusal — R42's other
 * half. Every door asks this and no door decides for itself. */
export function readersFor(name: string, mime: string): readonly ReaderName[] {
  if (declaredUnreadable(name, mime)) return []
  const type = classify(name, mime)
  if (type) return type.readers
  // Unknown, and read as plain text on purpose — see `classify`.
  return ["plain"]
}

/** THE R11-SHAPED CEILING on a binding call with no AbortSignal of its own. The
 * conversion keeps running in the background if it is slow; what this bounds is
 * how long the caller waits — a person at the upload door, or a sweep with forty
 * more files behind this one. */
const CONVERT_TIMEOUT_MS = 20_000

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`conversion timed out after ${ms}ms`)), ms)
    ),
  ])
}

/** THE SHEET'S OWN GRAIN — BUILD-5 §2, "sheet tab = a source with the header
 * line prepended to every piece." Cut with `chunkSheetTab` (knowledge-text.ts)
 * and joined on a blank line, for the same reason chat's runs and mail's
 * pieces are: `chunkText` downstream prefers that boundary over any other, so
 * its own cuts land BETWEEN the pieces this reader already made rather than
 * splitting one apart and losing the header it carried.
 *
 * Empty for anything `parseCsv` cannot turn into at least a header and one
 * row — a "CSV" that is not really comma-separated falls through to the next
 * declared reader (the converter, then the bytes as-is) rather than this one
 * filing an empty table with confidence. */
function csvGrainText(bytes: Uint8Array): string {
  const text = new TextDecoder("utf-8", { fatal: false, ignoreBOM: false }).decode(bytes)
  const { headers, rows } = parseCsv(text)
  if (!headers.length || !rows.length) return ""
  return chunkSheetTab(headers, rows).join("\n\n")
}

/** Run one named reader. Nothing here decides WHETHER to run; that is the
 * table's job and this is the doing.
 *
 * Exported because the UPLOAD door runs the chain itself: it has a person
 * standing in front of it and says a different sentence for each way a read can
 * end, which the sweep has no use for. It asks this table which readers, in
 * which order — that is R42 — and keeps its own words about the answer. */
export async function runReader(
  reader: ReaderName,
  env: ReaderEnv,
  file: { bytes: Uint8Array; name: string; mime: string }
): Promise<{ text: string; error?: string }> {
  if (reader === "plain")
    return { text: new TextDecoder("utf-8", { fatal: false, ignoreBOM: false }).decode(file.bytes).trim() }
  if (reader === "office-zip") return { text: await officeText(file.bytes) }
  if (reader === "csv-grain") return { text: csvGrainText(file.bytes) }
  const out = await withTimeout(
    env.AI.toMarkdown(
      { name: file.name, blob: new Blob([file.bytes as unknown as ArrayBuffer], { type: file.mime }) },
      // NO PDF METADATA, and it is a MEASURED decision rather than a preference —
      // moved here from the upload door so BOTH doors get it. The converter's
      // default prepends the producer, creation date, PDF version and half a
      // dozen `IsSomethingPresent=false` lines. On the first real document put
      // through that door — a one-page runbook — the preamble was 80% of the 834
      // bytes extracted and it was what came back as the PASSAGE. It also poisons
      // the embedding: every PDF then shares four hundred identical characters
      // and resembles every other PDF more than it resembles any question.
      { conversionOptions: { pdf: { metadata: false } } }
    ),
    CONVERT_TIMEOUT_MS
  )
  const said = out as { format?: string; error?: string; data?: unknown }
  // THE REASON TRAVELS WITH THE FAILURE. The upload door says it to the person —
  // "we couldn't read this file (corrupt document)" is a sentence they can act
  // on and "we found no text" is not — so a shared reader that swallowed it
  // would have taken something real away from the door it was meant to serve.
  if (said?.format === "error") return { text: "", error: said.error || "conversion failed" }
  return { text: typeof said?.data === "string" ? (said.data ?? "").trim() : "" }
}

/** ONE FILE'S WORDS, by the table.
 *
 * Tries each declared reader in order and keeps the first result that survives
 * the guards. A reader that yields nothing is not an error — it is the next
 * one's turn — and a reader that THROWS is the same, because one unreadable file
 * must never take a whole folder's sweep down with it (`driveFileText`'s own 403
 * note records the day that happened).
 *
 * Empty means "there are no words in this", which is a true and useful answer
 * and the one the door turns into "stored, not searchable". */
export async function readSource(
  env: ReaderEnv,
  file: { bytes: Uint8Array; name: string; mime: string }
): Promise<string> {
  const type = classify(file.name, file.mime)
  for (const reader of readersFor(file.name, file.mime)) {
    let text = ""
    try {
      text = (await runReader(reader, env, file)).text
    } catch {
      continue
    }
    if (!text || !looksLikeProse(text)) continue
    if (type?.mustReadLikeWords && !readsLikeWords(text)) continue
    return text
  }
  return ""
}

// ══════════════════════════════════════════════════════════════════════════
// VIDEO LINKS — BUILD-5 §1 ("Collect"): YouTube captions first-class, Loom
// and Tella best-effort, no Whisper.
//
// A video link is not bytes: there is nothing for `SOURCE_TYPES` above to
// classify, because there is no upload and no Drive file to open. `LINK_TYPES`
// is the same R42 shape — a type resolves to a declared, ordered list of
// readers, or to none at all — applied to a URL instead of a mime/extension
// pair, so "which reader reads this link" has the same one answer.
//
// WHY THIS IS SAFE AGAINST THE 27 AUG RULING IT NARROWS. `shared/media-links.ts`
// records the owner's earlier decision to refuse EVERY video link outright,
// specifically because "no auth" is not "supported" and a silent break in an
// undocumented endpoint would leave a source looking filed while answering
// nothing forever. BUILD-5 (10 Sep 2026) is the SAME owner narrowing that
// ruling for exactly one endpoint he now wants relied on — YouTube's public,
// long-standing `timedtext` captions endpoint — while leaving the refusal in
// place for everything without a caption or transcript surface. This table
// does not touch that ruling: it is additive, and the gate that decides
// whether a video link is accepted at all is the ingest door's to wire, not
// this file's — this table only says what happens once something DOES ask it
// to read one.
//
// AN EMPTY READ HERE IS THE HONEST ANSWER, same as everywhere else in this
// file: no caption track, an endpoint that has changed shape, or a network
// failure all end the same way, "", never a thrown error — because a lookup
// that took the sweep down with it is worse than one link staying unread.
//
// LOOM AND TELLA HAVE NO PUBLIC TRANSCRIPT SURFACE AT ALL. Their oEmbed
// endpoints are the one thing either publishes without authentication, and an
// oEmbed reply carries a title, not the recording's words — so "best-effort"
// here means exactly that title, honestly labelled as weak signal rather than
// a transcript this table does not have. NOT VERIFIED AGAINST A LIVE ACCOUNT:
// flagged in the lane report so a real Loom/Tella link is smoke-tested before
// this ships, the same way a real PDF was what found the subsetted-font gap
// in the reader above it.

/** WHAT KIND OF WORDS A LINK READER ACTUALLY PRODUCES — the honest half of the
 * `read` object the create-source door hands back (BUILD-5, hub's own spec,
 * 12 Sep 2026): "captions" for a real caption/subtitle track, "description"
 * for an oEmbed title (a name for the recording, not its words), "transcript"
 * reserved for a reader this table does not have yet (real audio
 * transcription) so the door's contract does not need to change the day one
 * is added. */
export type ReadKind = "captions" | "transcript" | "description"

/** A KIND OF LINK, resolved by host rather than by mime/extension. */
export type LinkType = {
  /** What a person calls it, used in a sentence ("this YouTube video"). */
  label: string
  /** The service's own name, for the `read.provider` field the door reports —
   * distinct from `label`, which carries "video"/"recording" for a sentence
   * this is never dropped into. */
  provider: string
  /** What KIND of words this type's reader(s) actually produce — see `ReadKind`. */
  kind: ReadKind
  /** Matched on the registrable host, same rule as `isVideoLink` — `www.` and
   * any subdomain are covered without a wildcard that would also catch an
   * unrelated domain sharing the suffix. */
  hosts: readonly string[]
  readers: readonly ReaderName[]
  why: string
}

export const LINK_TYPES: readonly LinkType[] = [
  {
    label: "YouTube video",
    provider: "YouTube",
    kind: "captions",
    hosts: ["youtube.com", "youtu.be"],
    readers: ["youtube-captions"],
    why: "YouTube's timedtext endpoint answers for any video that has a caption track, manual or auto-generated, with no auth — first-class per BUILD-5",
  },
  {
    label: "Loom recording",
    provider: "Loom",
    kind: "description",
    hosts: ["loom.com"],
    readers: ["loom-best-effort"],
    why: "no public transcript endpoint exists; the oEmbed title is the only words available without auth, so this is best-effort rather than a real transcript",
  },
  {
    label: "Tella recording",
    provider: "Tella",
    kind: "transcript",
    hosts: ["tella.tv", "tella.video"],
    readers: ["tella-transcript"],
    why: "NOT the same shape as Loom (12 Sep 2026 correction) — Tella's own page embeds the real, word-level transcript (`transcriptionWords`) it captions the player with, found by fetching a real recording rather than by reading Tella's docs, which say nothing about it",
  },
]

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "")
  } catch {
    return null
  }
}

/** WHICH KIND OF LINK IS THIS, out of the declared list. `null` for anything
 * not named here — which, unlike a file's `classify`, is NOT read as plain
 * text: an arbitrary URL has no bytes for this table to fall back to, so
 * `readersForLink` answers `[]` and the caller's own fetch (if it has one) is
 * a different feature from this table. */
export function classifyLink(url: string): LinkType | null {
  const host = hostOf(url)
  if (!host) return null
  return LINK_TYPES.find((t) => t.hosts.some((h) => host === h || host.endsWith(`.${h}`))) ?? null
}

/** THE READERS TO TRY, IN ORDER, for a link. Empty means an honest refusal —
 * the same R42 answer as `readersFor`, and no door may choose one of its own
 * for a link either. */
export function readersForLink(url: string): readonly ReaderName[] {
  return classifyLink(url)?.readers ?? []
}

/** Every video id shape YouTube hands a link out in: the long `?v=` form, the
 * `youtu.be/` short form, and the `/embed/` and `/shorts/` paths. Exported
 * because the caption endpoints below need the bare id, not the URL. */
export function youtubeVideoId(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "")
  if (host === "youtu.be") return parsed.pathname.slice(1).split("/")[0] || null
  if (host === "youtube.com" || host.endsWith(".youtube.com")) {
    // R20's query-boundary census holds THIS `.get(` to the same positional
    // rule as a request's own query string: the value came from a link
    // somebody typed into a form, same as any other stored text, so it gets
    // the same hygiene (type-checked, NUL-stripped, capped) rather than an
    // exemption for "it isn't really a request".
    const v = queryText(parsed.searchParams.get("v"), "v", 32)
    if (v) return v
    const embed = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)
    if (embed) return embed[1]
  }
  return null
}

/** THE R11-SHAPED CEILING on a link fetch, same reasoning as `CONVERT_TIMEOUT_MS`
 * above: nothing here has its own AbortSignal, so this bounds how long a caller
 * waits rather than how long the request may run. */
const LINK_FETCH_TIMEOUT_MS = 10_000

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/** ONE `<text>` PER CAPTION LINE, in YouTube's `timedtext` XML. The times are
 * dropped on purpose — retrieval chunks this like any other prose, and a
 * caption's timing is not a fact a citation needs. */
function captionsFromTimedText(xml: string): string {
  const lines: string[] = []
  const re = /<text[^>]*>([\s\S]*?)<\/text>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) {
    const line = decodeXmlEntities(m[1].replace(/<[^>]+>/g, " ")).trim()
    if (line) lines.push(line)
  }
  return lines.join(" ")
}

/** A link fetch that yields text, or null for anything that did not — a
 * non-2xx, a thrown network error, or a redirect this reader has no business
 * following into somewhere else. */
async function fetchLinkText(url: string): Promise<string | null> {
  try {
    const res = await withTimeout(fetch(url), LINK_FETCH_TIMEOUT_MS)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

/** THE TRACK, THEN THE CAPTIONS — two calls, because auto-generated captions
 * rarely sit at a predictable language code, and guessing `lang=en` misses
 * most of them. The `list` call is YouTube's own directory of what a video
 * actually has; the first track named is read, whatever language it is in,
 * because a video's own auto-captions are the material this reader exists
 * for, not a language preference. */
async function readYouTubeCaptions(videoId: string): Promise<string> {
  const listXml = await fetchLinkText(
    `https://www.youtube.com/api/timedtext?type=list&v=${encodeURIComponent(videoId)}`
  )
  if (!listXml) return ""
  const track = listXml.match(/lang_code="([^"]+)"/)
  if (!track) return ""
  const captionXml = await fetchLinkText(
    `https://www.youtube.com/api/timedtext?lang=${encodeURIComponent(track[1])}&v=${encodeURIComponent(videoId)}`
  )
  return captionXml ? captionsFromTimedText(captionXml) : ""
}

/** THE ONLY WORDS LOOM PUBLISHES WITHOUT AUTH — a title, through the oEmbed
 * endpoint every embeddable video service is expected to answer. Not a
 * transcript; see `LINK_TYPES`'s own entry for why this is still
 * "best-effort" rather than nothing. Tella USED to share this reader too,
 * until its own page turned out to embed the real thing — see
 * `readTellaTranscript` below for why that changed and this did not: nobody
 * has yet found an equivalent payload on a real Loom page, so "best-effort"
 * stays the honest word for Loom specifically until somebody does. */
async function readOEmbedTitle(oembedUrl: string, videoUrl: string): Promise<string> {
  const json = await fetchLinkText(`${oembedUrl}?url=${encodeURIComponent(videoUrl)}`)
  if (!json) return ""
  try {
    const parsed = JSON.parse(json) as { title?: unknown }
    return typeof parsed.title === "string" ? parsed.title.trim() : ""
  } catch {
    return ""
  }
}

/** ONE WORD OF A TELLA TRANSCRIPT, exactly the shape Tella's own page embeds
 * it in — punctuation already attached to the word it follows. */
type TellaTranscriptWord = { text: string; hidden?: boolean }

/** THE ANCHOR — the one thing that makes this safe to parse. A "text" key is
 * not unique to this array in a page this size (a few hundred KB of a real
 * app's own React payload); scanning the whole document for `"text":"..."`
 * would also match unrelated keys elsewhere and either miss the transcript or
 * mangle it. This is the literal bytes Tella's own markup uses for the key —
 * escaped, because the array is itself embedded as a STRING inside the page's
 * own serialized props (see `parseTellaTranscriptPayload`'s own comment for
 * what that means for parsing it). */
const TELLA_TRANSCRIPT_MARKER = '\\"transcriptionWords\\":['

/** TELLA'S OWN PAGE embeds the real, word-level transcript it captions the
 * player with — an array of `{text, start, end_, hidden, index}` objects
 * under `transcriptionWords` — found by fetching a real Tella recording
 * (BUILD-5, 12 Sep 2026, the owner's own video,
 * `content.kwapso.com/video/hogo-cv-upload-optimised-5snm`: 1,884 words,
 * opening "Alright, let's have a quick look at the complete re engineering of
 * the candidate CV upload...") rather than by reading Tella's public API
 * docs, which say nothing about this at all. This is why `tella-best-effort`
 * (the oEmbed title, four words for that same video) was retired rather than
 * kept as a fallback: a title reported as a successful "read" is worse than
 * an honest refusal, because it tells the person their video WAS read when
 * nothing of substance was — R42's own reader table can name that outcome
 * "transcript" or refuse, and it may not lie by calling four words either.
 *
 * PARSED DELIBERATELY, never a hand-rolled backslash replace — this table was
 * bitten once already this week by a "should be equivalent" hand
 * transformation of something a real parser already exists for
 * (`discoverLinkTypeByOEmbed`'s own attribute-order regex history). The array
 * text between the anchor's brackets is the JSON `transcriptionWords` value
 * AS IT WAS ORIGINALLY SERIALIZED, then escaped a second time to become a
 * string inside the page's own outer payload — so wrapping that exact
 * substring in a fresh pair of real quotes turns it back into a valid JSON
 * STRING literal, and asking `JSON.parse` to read that literal does the
 * un-escaping correctly (backslashes, unicode, all of it) rather than a regex
 * guessing at which characters were escaped. The result of THAT parse is
 * plain JSON text, parsed a second time into the actual array.
 *
 * `hidden: true` WORDS ARE DROPPED. Tella lets a person redact part of a
 * recording's transcript before sharing the link — a hidden word is a door
 * that person closed on purpose, and filing it anyway would be reading past
 * that choice rather than respecting it.
 *
 * THE CANARY IS THE WHOLE POINT: the marker missing, the brackets never
 * closing, either `JSON.parse` throwing, or an empty result all end in the
 * same "" this whole file already treats as "no reader found anything" —
 * which sends the caller to the ordinary honest-refusal sentence rather than
 * ever inventing a partial scrape and calling it a transcript.
 *
 * NO SEPARATE LENGTH CAP HERE, ON PURPOSE: whatever this returns is bounded
 * the same way an uploaded file's text already is, by `capToRow`
 * (`DOCUMENT_LIMIT_BYTES`, knowledge-files.ts) once `extractLink` receives
 * it — a second ceiling here would be the same rule enforced twice in two
 * places for no reason, which is exactly what R42 exists to prevent about
 * READERS and is just as true of a byte limit. */
function parseTellaTranscriptPayload(html: string): string {
  const at = html.indexOf(TELLA_TRANSCRIPT_MARKER)
  if (at === -1) return ""
  const start = at + TELLA_TRANSCRIPT_MARKER.indexOf("[")
  let depth = 0
  let end = -1
  // `[`/`]` ARE NEVER ESCAPED BY JSON — only quotes, backslashes and control
  // characters are — so counting them literally, byte by byte, finds the
  // array's real close even though everything INSIDE it is escaped text.
  for (let i = start; i < html.length; i++) {
    if (html[i] === "[") depth++
    else if (html[i] === "]") {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  if (end === -1) return ""
  try {
    const unescaped = JSON.parse(`"${html.slice(start, end + 1)}"`) as string
    const words = JSON.parse(unescaped) as TellaTranscriptWord[]
    if (!Array.isArray(words) || !words.length) return ""
    // A NON-EMPTY STRING, not just a string — measured against the owner's
    // own recording: 11 of its 1,884 words carry `text: ""` (likely a pause
    // Tella's own timing model marks with no word), and joining an empty one
    // in with the rest is a silent double space in the middle of a sentence
    // for no reason at all.
    return words
      .filter((w) => !w.hidden && typeof w.text === "string" && w.text.length > 0)
      .map((w) => w.text)
      .join(" ")
  } catch {
    return ""
  }
}

async function readTellaTranscript(url: string): Promise<string> {
  const html = await fetchLinkText(url)
  return html ? parseTellaTranscriptPayload(html) : ""
}

async function runLinkReader(reader: ReaderName, url: string): Promise<string> {
  if (reader === "youtube-captions") {
    const id = youtubeVideoId(url)
    return id ? await readYouTubeCaptions(id) : ""
  }
  if (reader === "loom-best-effort") return readOEmbedTitle("https://www.loom.com/v1/oembed", url)
  if (reader === "tella-transcript") return readTellaTranscript(url)
  return ""
}

/** A KNOWN PROVIDER'S OWN OEMBED DISCOVERY TAG, read off a page whose HOST
 * `classifyLink` does not recognise — the standard oEmbed mechanism, not a
 * scrape: a provider a customer can put behind their OWN domain (Tella's own
 * custom-domain feature, which is exactly what exposed this gap — the
 * owner's `content.kwapso.com` is a real Tella recording, confirmed live)
 * advertises its real API host in `<link type="application/json+oembed"
 * href="...">`, and THAT href's host is what tells us which reader applies —
 * never the domain the link was shared from, which by definition can be
 * anything a customer points a CNAME at.
 *
 * BOUNDED BY `hasVideoPathSegment` (shared/media-links.ts) so this never
 * fetches an ORDINARY link on the chance it might be a video — the same
 * measured signal (891 real links, one match, zero false positives)
 * `isVideoLink` uses for its own loosest check, asked directly here rather
 * than through it: `isVideoLink` would also fire for a plain `vimeo.com`
 * link this table has no reader for at all, which is not this question. */
async function discoverLinkTypeByOEmbed(url: string): Promise<LinkType | null> {
  if (!hasVideoPathSegment(url)) return null
  const html = await fetchLinkText(url)
  if (!html) return null
  // EVERY `<link>` TAG, THEN FILTERED BY ATTRIBUTE — never one regex assuming
  // an order. Measured against the real page: Tella's own markup writes
  // `href` BEFORE `type` (`<link rel="alternate" href="…" title="…"
  // type="application/json+oembed"/>`), and HTML attribute order is never a
  // contract in the first place.
  const tag = (html.match(/<link\b[^>]*>/gi) ?? []).find((t) =>
    /type=["']application\/json\+oembed["']/i.test(t)
  )
  const href = tag?.match(/href=["']([^"']+)["']/i)?.[1]
  if (!href) return null
  const host = hostOf(decodeXmlEntities(href))
  if (!host) return null
  return LINK_TYPES.find((t) => t.hosts.some((h) => host === h || host.endsWith(`.${h}`))) ?? null
}

/** THE LINK'S TYPE, host-based first and discovered second — computed ONCE so
 * a caller that needs to know WHY a link could not be read (`extractLink`'s
 * honest refusal) is never guessing at something `readLink` already worked
 * out, and never re-fetching the same page to ask the same question twice. */
export async function resolveLinkType(url: string): Promise<LinkType | null> {
  return classifyLink(url) ?? (await discoverLinkTypeByOEmbed(url))
}

/** ONE LINK'S WORDS, by the same table shape as `readSource`. A reader that
 * yields nothing or throws is the next one's turn, exactly as above; empty at
 * the end is the honest "there are no words we could read here".
 *
 * `knownType` LETS A CALLER THAT ALREADY RESOLVED THE TYPE (`extractLink`,
 * which needs it anyway for the refusal sentence) HAND IT STRAIGHT IN —
 * `undefined` (the default, and every existing caller's shape) means resolve
 * it here exactly as before. Passing `null` explicitly still means "no type,
 * no readers, honest empty" and is never confused with "not supplied". */
export async function readLink(url: string, knownType?: LinkType | null): Promise<string> {
  const type = knownType !== undefined ? knownType : await resolveLinkType(url)
  for (const reader of type?.readers ?? []) {
    let text = ""
    try {
      text = await runLinkReader(reader, url)
    } catch {
      continue
    }
    if (text && looksLikeProse(text)) return text
  }
  return ""
}

// ══════════════════════════════════════════════════════════════════════════
// THE CONTEXT LINE — BUILD-5 §2 ("Split into pieces"): one short sentence per
// piece, generated by the cheapest capable model, so a passage found by
// search carries enough context to make sense out of order.
//
// `contextLinePrompt` (in `knowledge-text.ts`, pure, no imports) builds the
// prompt; this is the one place that spends a model call on it, matching the
// AI-calling shape `runReader` already uses above for the document converter.

/** What this needs from the worker to ask the model. Narrower than `ReaderEnv`
 * would need to be if the two were merged: a context line has no business
 * with anything else `Ai` can do. */
export type ContextLineEnv = { AI: Ai }

/** THE DECLARED MODEL. Named once, so the law and the cost line in BUILD-5 §3
 * ($1.70 across ~10k pieces) both point at the same string. */
const CONTEXT_LINE_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct"

const CONTEXT_LINE_TIMEOUT_MS = 10_000

/** A RUNAWAY COMPLETION IS STILL ONE SENTENCE, capped so a model that ignores
 * the prompt's instruction cannot turn a one-line context sentence into
 * another chunk's worth of prose stored beside the one it was meant to
 * summarise. */
const CONTEXT_LINE_MAX_CHARS = 240

/** WHAT ONE CALL SPENT, reported back to the caller — not written down here.
 * This function has no team and no actor, only `{AI}`, so it cannot be the
 * one that calls `logUsage` (`shared/workers/credits.ts`); that seam is the
 * caller's, once ingestion has both. Returning the SAME `TokenUsage` shape
 * that seam already logs agent turns in is the point: the hub's 10 Sep 2026
 * ruling ("ingestion is recorded nowhere") asked for one shape across every
 * lane that spends AI during this rebuild, not three that nearly match. */
type ContextLineResult = { line: string; usage: TokenUsage }

/** The tiny half of `readUsage` (workers/data-ops/src/lib/model.ts) this file
 * needs, kept local rather than imported: a worker's own `src/lib` is not
 * shared, so the choice is duplicate three lines of arithmetic or promote them
 * to `shared/`, and three lines is not a shared module yet. Same reasoning:
 * cached prompt tokens are billed at a fraction of the rest, so they are
 * split out rather than folded into `input`. */
function tokenUsage(raw: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } } | undefined): TokenUsage {
  if (!raw) return NO_TOKENS
  const cached = raw.prompt_tokens_details?.cached_tokens ?? 0
  return {
    input: Math.max(0, (raw.prompt_tokens ?? 0) - cached),
    output: raw.completion_tokens ?? 0,
    cacheWrite: 0,
    cacheRead: cached,
  }
}

/** ONE SENTENCE OF CONTEXT for one piece. A model failure — a timeout, a
 * malformed reply, the binding erroring — is an honest empty line rather than
 * a thrown error: the piece still indexes and searches on its own words, it
 * just carries no context sentence, which is a true and recoverable state
 * (the next sweep can try again) rather than a lost source.
 *
 * IDEMPOTENCY IS THE CALLER'S JOB, and it has to be: this function has no
 * store of its own to check against. Key the call on the piece's own
 * `contentHash` (knowledge-text.ts) and skip it entirely when the piece's
 * hash has not changed since the last context line was generated for it —
 * the same discipline this base already applies to re-embedding
 * (`a-textversion-bump-does-not-re-embed`), and the difference between
 * spending BUILD-5's $1.70 once and spending it on every rebuild. */
export async function contextLineFor(
  env: ContextLineEnv,
  input: { sourceTitle: string; piece: string }
): Promise<ContextLineResult> {
  try {
    const out = (await withTimeout(
      env.AI.run(
        CONTEXT_LINE_MODEL as never,
        { messages: [{ role: "user", content: contextLinePrompt(input) }] } as never
      ),
      CONTEXT_LINE_TIMEOUT_MS
    )) as { choices?: { message?: { content?: unknown } }[]; usage?: Parameters<typeof tokenUsage>[0] }
    const said = out?.choices?.[0]?.message?.content
    return {
      line: typeof said === "string" ? said.trim().slice(0, CONTEXT_LINE_MAX_CHARS) : "",
      usage: tokenUsage(out?.usage),
    }
  } catch {
    return { line: "", usage: NO_TOKENS }
  }
}
