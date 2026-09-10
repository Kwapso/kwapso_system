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
import { queryText } from "@shared/workers/validate"

import { looksLikeProse, officeText, readsLikeWords } from "./file-text"
import { contextLinePrompt } from "./knowledge-text"

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
  /** YouTube's unauthenticated captions endpoint. First-class per BUILD-5 —
   * see the essay above `LINK_TYPES`. */
  | "youtube-captions"
  /** Loom's public oEmbed title. Best-effort: there is no public transcript
   * endpoint, so this is a name, not the recording's content. */
  | "loom-best-effort"
  /** Tella's public oEmbed title. Same shape and the same honesty as Loom. */
  | "tella-best-effort"

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
    readers: ["markdown", "plain"],
    // Its own entry rather than plain text, because the door has always
    // converted it and the converter turns a sheet into a table a reader can
    // follow. `plain` behind it is the free fallback the old door had no room
    // for: a CSV whose conversion fails is still perfectly readable as itself.
    why: "the converter makes a table; the bytes are a true fallback when it cannot",
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

/** A KIND OF LINK, resolved by host rather than by mime/extension. */
export type LinkType = {
  /** What a person calls it. */
  label: string
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
    hosts: ["youtube.com", "youtu.be"],
    readers: ["youtube-captions"],
    why: "YouTube's timedtext endpoint answers for any video that has a caption track, manual or auto-generated, with no auth — first-class per BUILD-5",
  },
  {
    label: "Loom recording",
    hosts: ["loom.com"],
    readers: ["loom-best-effort"],
    why: "no public transcript endpoint exists; the oEmbed title is the only words available without auth, so this is best-effort rather than a real transcript",
  },
  {
    label: "Tella recording",
    hosts: ["tella.tv", "tella.video"],
    readers: ["tella-best-effort"],
    why: "same shape as Loom — the oEmbed title only, no public transcript access exists",
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

/** THE ONLY WORDS EITHER PLATFORM PUBLISHES WITHOUT AUTH — a title, through
 * the oEmbed endpoint every embeddable video service is expected to answer.
 * Not a transcript; see the essay above `LINK_TYPES` for why this is still
 * "best-effort" rather than nothing. */
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

async function runLinkReader(reader: ReaderName, url: string): Promise<string> {
  if (reader === "youtube-captions") {
    const id = youtubeVideoId(url)
    return id ? await readYouTubeCaptions(id) : ""
  }
  if (reader === "loom-best-effort") return readOEmbedTitle("https://www.loom.com/v1/oembed", url)
  if (reader === "tella-best-effort") return readOEmbedTitle("https://www.tella.tv/oembed", url)
  return ""
}

/** ONE LINK'S WORDS, by the same table shape as `readSource`. A reader that
 * yields nothing or throws is the next one's turn, exactly as above; empty at
 * the end is the honest "there are no words we could read here". */
export async function readLink(url: string): Promise<string> {
  for (const reader of readersForLink(url)) {
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
