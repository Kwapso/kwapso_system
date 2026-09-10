// THE PURE HALF OF THE KNOWLEDGE BASE — turning a piece of material into the
// things retrieval actually scores: chunks, terms, and a vector. No database, no
// network, no env — AND NO IMPORTS AT ALL, which is a property worth keeping
// rather than an accident: `scripts/knowledge-retrieval-bench.mjs` imports this
// file straight into plain Node so that the "before" arm of every measurement is
// really the shipped code. One `@shared/…` import here and that stops working,
// which is exactly how it was found. The one constant that wanted to live here
// and could not — the derived chunk ceiling — is in knowledge.ts beside the
// validator it is derived from.
//
// Two sections, in the order the pipeline uses them:
//   1. TEXT   — hash (has this changed?), chunk (what does a citation point at?),
//               tokenise (what does stage one of retrieval match on?).
//   2. VECTOR — the quantised embedding codec and its similarity, so stage two
//               can re-rank a bounded candidate set with no float array in D1.

/* ---------------------------------- text ---------------------------------- */

/** How big one chunk gets. Small enough that a citation points at something a
 * person can read in the answer; big enough that a paragraph's meaning survives
 * being cut out of its source. */
export const CHUNK_TARGET_CHARS = 900


/** Distinct terms one chunk contributes to the inverted index. The tail of a
 * long chunk is mostly names and numbers that match nothing; the head is what
 * carries it. Bounded so one pathological chunk cannot write thousands of rows. */
const MAX_TERMS_PER_CHUNK = 120

/** The most common English words carry no signal and match everything, so a
 * question containing them would drag the whole compartment into stage one.
 * Deliberately short — a stopword list that grows starts deleting meaning (the
 * classic: "to be or not to be" tokenises to nothing). */
const STOPWORDS = new Set(
  ("the a an and or but if then than that this these those there here of to in on at by for with from as is are was were be been being do does did done have has had it its it's we our you your they their he she his her not no so such about into over under after before between out up down what which who whom when where why how all any both each few more most other some only own same too very can will just should now".split(
    " "
  ))
)

/** A STABLE content hash — "has this source changed since we indexed it?" and
 * nothing else. Two 32-bit FNV-1a passes with different offsets, printed as 16
 * hex characters: a missed change would leave the assistant quoting a ticket
 * nobody wrote any more, so 32 bits of it was not enough on its own. Not a
 * security primitive and never used as one. */
export function contentHash(text: string): string {
  let a = 0x811c9dc5
  let b = 0x01000193
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    a = Math.imul(a ^ c, 0x01000193) >>> 0
    b = Math.imul(b ^ (c + i), 0x811c9dc5) >>> 0
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0")
}

/** Strip the HTML a rich-text body carries down to the words inside it. The
 * article editor stores markup; a chunk is what a person READS, and a citation
 * that quoted `<p class="x">` back at them would be a bug you can see. */
export function plainText(input: string): string {
  return input
    // A NUL byte is a 500 on the way into SQLite, and the boundary seam that
    // strips them (shared/workers/validate.ts) only ever sees a REQUEST — a
    // mirrored source's words come from a row that was written long ago, by an
    // import or a migration or an older version of a door. One that carried a
    // NUL would fail the sweep, get recorded, and fail again every fifteen
    // minutes forever. Cheapest possible insurance, at the one place every piece
    // of indexable text passes through.
    .split(String.fromCharCode(0)).join("")
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t ]+/g, " ")
    // A tag becomes a space, so "<b>invoices</b>." would read "invoices ." — a
    // citation shows these words to a person, and a stray space is nothing to
    // the tokeniser but a typo we introduced to a reader.
    .replace(/ +([,.;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Cut a source's text into chunks on the boundaries a person would: paragraphs
 * first, then sentences, then — only for text that has neither, like a pasted
 * table — a hard cut, so one unbroken 50,000-character line still gets indexed
 * instead of becoming one chunk nothing can cite precisely.
 *
 * IT NO LONGER TRUNCATES. It returns every piece the text really has, and the
 * caller decides what to do about a text that is too big — because a function
 * that quietly returned the first two hundred pieces made "the whole document
 * went in" impossible to tell from "the first eight pages went in", at the one
 * place nobody was looking. Returns [] for empty text, never [""]. */
export function chunkText(input: string): string[] {
  const text = plainText(input)
  if (!text) return []
  const chunks: string[] = []
  let current = ""

  const flush = () => {
    const t = current.trim()
    if (t) chunks.push(t)
    current = ""
  }

  // Paragraph → sentence → hard cut, in that order of preference.
  for (const paragraph of text.split(/\n{2,}/)) {
    for (const sentence of paragraph.split(/(?<=[.!?])\s+/)) {
      for (const piece of hardCut(sentence)) {
        if (current && current.length + piece.length + 1 > CHUNK_TARGET_CHARS) flush()
        current = current ? `${current} ${piece}` : piece
      }
    }
    // A paragraph break is the strongest boundary there is — end the chunk here
    // when it is already worth ending, rather than gluing two topics together.
    if (current.length >= CHUNK_TARGET_CHARS * 0.6) flush()
  }
  flush()
  return chunks
}

/** A run of text with no sentence boundary in it, cut into target-sized pieces. */
function hardCut(sentence: string): string[] {
  if (sentence.length <= CHUNK_TARGET_CHARS) return [sentence]
  const out: string[] = []
  for (let i = 0; i < sentence.length; i += CHUNK_TARGET_CHARS)
    out.push(sentence.slice(i, i + CHUNK_TARGET_CHARS))
  return out
}

/* ---------------------------------- grain ---------------------------------- */
// BUILD-5 §2 ("Split into pieces") — three source shapes, three grain rules,
// none of them the paragraph cutter above:
//
//   • a CHAT piece is a RUN of a few messages, carrying who spoke and when;
//   • a MAIL thread is the source and each message is its own piece — no
//     size-based merging, because the thread's natural boundary already is
//     a message;
//   • a SPREADSHEET TAB is a source whose header line rides every piece,
//     because a citation into the middle of a tab means nothing without the
//     columns it belongs to.
//
// Pure, like everything above: a message list or a table of rows in, text
// (and the metadata a piece carries beside it) out.

export type ChatMessage = { speaker: string; at: string; text: string }
export type ChatPiece = { text: string; speakers: string[]; startAt: string; endAt: string }

/** How many messages one run may carry before it stops being "a few" and
 * starts being the whole conversation glued together. A run also ends early
 * on `CHUNK_TARGET_CHARS`, same as the paragraph cutter, so a chat piece and
 * a document piece read as roughly the same mouthful to someone skimming a
 * result. */
const MAX_MESSAGES_PER_CHAT_PIECE = 6

/** ONE PIECE PER RUN. A message with no words (an empty edit, a reaction with
 * no text this reader can see) is dropped rather than filed as a blank
 * turn — its neighbours still carry the run.
 *
 * THE TEXT CARRIES "WHO", NEVER "WHEN" — `${speaker}: ${text}`, the same line
 * shape this app has always attributed a chat message with. The time is real
 * metadata (`startAt`/`endAt`), kept OFF the indexed prose on purpose: a raw
 * ISO instant on every line is the PDF-metadata mistake again (source-readers.ts's
 * `runReader` comment) — every message would share the same dozen timestamp
 * characters and resemble every other message more than it resembles a
 * question, for a fact a citation can already show from the piece's own
 * columns once they exist. */
export function chunkChat(messages: ChatMessage[]): ChatPiece[] {
  const pieces: ChatPiece[] = []
  let run: { speaker: string; at: string; text: string }[] = []
  let length = 0

  const flush = () => {
    if (!run.length) return
    pieces.push({
      text: run.map((m) => `${m.speaker}: ${m.text}`).join("\n"),
      speakers: [...new Set(run.map((m) => m.speaker))],
      startAt: run[0].at,
      endAt: run[run.length - 1].at,
    })
    run = []
    length = 0
  }

  for (const raw of messages) {
    const text = plainText(raw.text).trim()
    if (!text) continue
    if (run.length >= MAX_MESSAGES_PER_CHAT_PIECE || (run.length > 0 && length + text.length > CHUNK_TARGET_CHARS))
      flush()
    run.push({ speaker: raw.speaker, at: raw.at, text })
    length += text.length
  }
  flush()
  return pieces
}

export type MailMessage = { from: string; at: string; text: string }
export type MailPiece = { text: string; from: string; at: string }

/** EVERY MESSAGE IS ITS OWN PIECE. A three-word reply stays a piece of its
 * own rather than folding into its neighbour — the thread already gave every
 * message a boundary, so this function's only job is to drop the ones with
 * nothing in them. */
export function chunkMail(messages: MailMessage[]): MailPiece[] {
  const pieces: MailPiece[] = []
  for (const raw of messages) {
    const text = plainText(raw.text).trim()
    if (!text) continue
    pieces.push({ text, from: raw.from, at: raw.at })
  }
  return pieces
}

const sheetLine = (cells: string[]): string => cells.map((c) => plainText(c).trim()).join(" | ")

/** THE TAB, CUT INTO PIECES THAT ALL CARRY THE HEADER. Rows are grouped up to
 * the same character target `chunkText` uses; the header is counted against
 * that budget too, so a wide tab still keeps its pieces close to the size
 * every other piece in the base is. A single row too big to share a piece
 * with the header (a huge free-text cell) still gets its own piece rather
 * than being dropped — the same "never lose the tail" rule `hardCut` follows
 * above. */
export function chunkSheetTab(header: string[], rows: string[][]): string[] {
  if (!rows.length) return []
  const headerLine = sheetLine(header)
  const pieces: string[] = []
  let current: string[] = []
  let length = headerLine.length

  const flush = () => {
    if (!current.length) return
    pieces.push([headerLine, ...current].join("\n"))
    current = []
    length = headerLine.length
  }

  for (const row of rows) {
    const line = sheetLine(row)
    if (!line) continue
    if (current.length > 0 && length + line.length + 1 > CHUNK_TARGET_CHARS) flush()
    current.push(line)
    length += line.length + 1
  }
  flush()
  return pieces
}

/** How much of a piece the context-line prompt shows the model. Kept small on
 * purpose: BUILD-5's own budget is $1.70 across roughly ten thousand pieces,
 * so the prompt has to stay tiny for one model's per-token price to add up to
 * cents rather than dollars. */
const CONTEXT_LINE_PIECE_CHARS = 600

/** THE PURE HALF OF THE CONTEXT-LINE CALL — what to ask, never how. The
 * calling half (`contextLineFor` in `source-readers.ts`, which already owns
 * this app's one AI-calling shape for a document reader) sends this string to
 * the model and reads back one sentence. Kept here, alongside the chunker,
 * because what the model is SHOWN is a property of the text, not of the
 * worker calling it — and because this file's no-imports rule is what lets
 * the retrieval bench load it straight into plain Node. */
export function contextLinePrompt(input: { sourceTitle: string; piece: string }): string {
  const piece = plainText(input.piece).slice(0, CONTEXT_LINE_PIECE_CHARS)
  return `Source: ${input.sourceTitle}\nPassage: ${piece}\n\nIn one short sentence, say what this passage is about — for someone skimming a search result who has not read the source. Reply with only that sentence.`
}

/** RELEVANCY DATE — BUILD-5 §2's third grain rule, and the reason
 * `knowledge_sources.relevancy_date` exists (Lane A's migration, 0073): "which
 * of a source's several dates this resolves to is an ingest decision" — that
 * migration's own words for the boundary this file sits on. The CLASSIFICATION
 * below is a property of what a kind IS (this file's half of the B1/B2 seam);
 * writing the column, for a kind whose SQL this file has no business reading,
 * is the sweep's.
 *
 * FROZEN — something that happened once and does not change afterwards: a
 * calendar event, a sent email, a meeting. Its relevancy is WHEN IT HAPPENED,
 * however long ago that was, because a later edit does not exist to prefer.
 *
 * LIVING — something that keeps being touched: a chat thread gaining replies,
 * a Drive document being edited, a ticket or a story moving through its own
 * lifecycle. Its relevancy is its LAST CHANGE, because KB-AUDIT.md §4.5 is
 * exactly the cost of getting this backwards: "a question whose newest
 * material is NOT RETRIEVED AT ALL" when a living thing is dated by when it
 * was first created rather than when it was last true. */
export type Freshness = "frozen" | "living"

/** ONE KIND, ONE ANSWER. Google's four kinds are this file's own — google-read.ts
 * already picks the right raw field for each (`event.start`, the thread's
 * last message for both chat and gmail now that both are grouped by
 * conversation, `file.modifiedTime`), and this table is what makes that a
 * stated decision rather than four separate ones nobody wrote down. The rest
 * are the ingest sweep's app-record kinds (knowledge-ingest.ts), most of
 * which currently stamp `record_date` from `created_at` alone — CORRECT for
 * a kind that only ever happens once, and a live bug for one that doesn't,
 * per KB-AUDIT.md §4.5's own measurement. Wiring `updated_at` (or whatever a
 * kind's own last-change column is) is the sweep's, not this file's; the
 * classification is the fact this table states so that wiring has an answer
 * to consult rather than a guess to make per kind. A kind not listed is
 * unclassified rather than defaulted — `null`, not a guess dressed as one. */
const FRESHNESS_BY_KIND: Readonly<Record<string, Freshness>> = {
  // Google kinds — google-read.ts's own four.
  calendar: "frozen",
  // STILL FROZEN HERE — a single Gmail message never changes once sent. This
  // moves to "living" in the same commit as google-read.ts's `mailThreads`
  // (BUILD-5 §2's mail regroup, currently held on kb_B1's identity call for
  // what a thread's `externalId` becomes): once the SOURCE is the thread
  // rather than the message, it keeps gaining replies exactly the way a
  // chat conversation does, same reasoning as chat's own frozen→living call
  // when IT was folded into one source per conversation.
  gmail: "frozen",
  chat: "living",
  drive: "living",
  // App-record kinds (knowledge-ingest.ts). A ONE-TIME EVENT stays frozen
  // even though its row can technically be edited (a meeting's start time
  // corrected after the fact is still describing when the meeting WAS, not a
  // second event) — matching what the sweep already does for these two.
  meeting: "frozen",
  sprint: "frozen",
  // Everything that is worked on, replied to, or moves through a status over
  // its life. A ticket answered yesterday is more relevant to "what's
  // happening with HOGO" than one opened a year ago and touched since —
  // exactly what `created_at` alone cannot say.
  ticket: "living",
  account: "living",
  contact: "living",
  app: "living",
  process: "living",
  story: "living",
  todo: "living",
  task: "living",
  person: "living",
  // PORTAL_LOGIN, CORRECTED FROM AN EARLIER DRAFT OF THIS TABLE THAT HAD IT
  // FROZEN. A login grant is edited after it is made — deactivated,
  // reactivated, its `app_restriction` changed — so "when was this granted"
  // is the wrong question once any of that has happened. Caught by reading
  // knowledge-ingest.ts's own SELECT rather than trusting the first
  // classification: it computes `COALESCE(pu.updated_at, pu.created_at) AS
  // sort_at` exactly like every other living kind below, which a one-time
  // event's query never bothers to.
  portal_login: "living",
}

/** THE CENSUS THE HUB ASKED FOR (read-only — knowledge-ingest.ts is not mine
 * to edit): for every kind classified "living" above whose `recordDate:` I
 * could find in knowledge-ingest.ts, whether that kind's own SELECT already
 * carries a last-change value or would need a real schema/query change.
 *
 * THE ANSWER IS THE SAME FOR ALL TEN, AND IT MAKES THE FIX SMALLER THAN THE
 * FINDING SUGGESTED. Every one of them ALREADY selects
 * `COALESCE(x.updated_at, x.created_at) AS sort_at` — grep `AS sort_at` in
 * that file and count 13, one per kind including the frozen ones — and
 * already returns it as `sortAt: r.sort_at` on the very same row for cursor
 * ordering. `recordDate:` just reads `.created_at` off that SAME row instead
 * of `.sort_at` a few lines below it. So this is not "nine kinds need a new
 * column read"; it is "nine (in fact ten) lines read the wrong field the
 * query already computed."
 *
 * kind          | line (recordDate:)      | sort_at already selected?
 * ------------- | ------------------------ | --------------------------------
 * ticket        | 435 (`r.created_at`)     | yes — line 385, TICKET_SORT
 * account       | 621 (`r.created_at`)     | yes — line 525
 * contact       | 698 (`r.created_at`)     | yes — line 665
 * app           | 789 (`r.created_at`)     | yes — line 746
 * process       | 896 (`r.created_at`)     | yes — line 841
 * story         | 1085 (`r.created_at`)    | yes — line 1034
 * todo          | 1371 (`r.created_at`)    | yes — line 1328
 * task          | 1458 (`r.created_at`)    | yes — line 1415
 * portal_login  | 1843 (`r.created_at`)    | yes — line 1802
 * person        | 1685 (`m.created_at`)    | yes — line 1514
 *
 * PERSON IS THE TENTH, AND IT IS WHY A GREP FOR ONE SPELLING UNDERCOUNTS.
 * The hub's own census (`grep "recordDate: r.created_at"`) found nine — it
 * is exact for that literal string, and person's `read` closure maps over
 * `members.map((m) => …)`, so its identical bug reads `m.created_at`. Same
 * fault, same fix, different receiver variable — worth restating the lesson
 * this whole exchange has been about: a zero (or a nine) from a grep is a
 * fact about the string, not yet a fact about the code.
 *
 * meeting/sprint/calendar/gmail/chat/drive are absent from this table on
 * purpose — they are frozen (or, for gmail/chat, already read their OWN
 * living value through a different field entirely: the folded thread's
 * newest message), so `created_at`-alone or their own start-time field is
 * already the right answer for them and there is nothing to fix. */

/** Which half of `FRESHNESS_BY_KIND` a kind falls in, or `null` for one this
 * table has not decided about — the honest state a new kind starts in, never
 * a silent default in either direction. */
export function freshnessOf(kind: string): Freshness | null {
  return FRESHNESS_BY_KIND[kind] ?? null
}

/** THE ONE DECISION, once the kind is known: happened-at for frozen, last-change
 * for living. Null when the date THAT freshness needs is missing — never the
 * other date instead, which would be answering a different question than the
 * one asked ("when did this happen" is not "when was this last touched",
 * however tempting either is as a fallback for the other). */
export function relevancyDate(
  freshness: Freshness,
  happenedAt: string | null,
  lastChangeAt: string | null
): string | null {
  return (freshness === "frozen" ? happenedAt : lastChangeAt) ?? null
}

/** The words a piece of text contributes to the inverted index, with how often
 * each appears (capped, so a template repeating "invoice" forty times does not
 * outrank a source that is actually about invoices).
 *
 * The SAME function reads a question, which is the point: the index and the
 * query have to agree about what a word is, or stage one silently matches
 * nothing. Anything that isn't a letter or a digit is a separator, so an email
 * address, a reference code and a hyphenated name all break into their parts. */
export function tokenise(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const raw of plainText(text).toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 3 || raw.length > 24) continue
    if (STOPWORDS.has(raw)) continue
    counts.set(raw, Math.min((counts.get(raw) ?? 0) + 1, 8))
    if (counts.size >= MAX_TERMS_PER_CHUNK) break
  }
  return counts
}

/** A question's terms, in order of how much they narrow the search: rarer-looking
 * words (longer ones, and anything with a digit in it — a reference, a date, an
 * invoice number) first, so a capped term list keeps the ones that matter. */
export function questionTerms(question: string, max: number): string[] {
  return [...tokenise(question).keys()]
    .sort((a, b) => score(b) - score(a))
    .slice(0, max)
  function score(t: string): number {
    return t.length + (/\d/.test(t) ? 10 : 0)
  }
}

/* --------------------------------- vector --------------------------------- */

/** An embedding, stored. Unit-normalised, then each component quantised to a
 * signed byte and base64'd — 384 dimensions become 512 characters instead of
 * ~4,600 of JSON, and the dot product of two of them is the cosine of the two
 * vectors to within a rounding error that never changed a ranking in testing.
 *
 * Returns null for anything that isn't a finite, non-zero vector, so a model
 * that answers with nulls (or with an error object) stores NOTHING rather than a
 * vector of zeroes that would sit at cosine 0 to every question forever. */
export function encodeEmbedding(vector: number[]): string | null {
  if (!Array.isArray(vector) || vector.length === 0) return null
  let norm = 0
  for (const v of vector) {
    if (typeof v !== "number" || !Number.isFinite(v)) return null
    norm += v * v
  }
  norm = Math.sqrt(norm)
  if (norm === 0) return null
  let binary = ""
  for (const v of vector) {
    const q = Math.max(-127, Math.min(127, Math.round((v / norm) * 127)))
    binary += String.fromCharCode(q < 0 ? q + 256 : q)
  }
  return btoa(binary)
}

/** The stored form, back as signed bytes. Null for anything unreadable — a row
 * written by an older encoding, or a truncated string — so a bad vector degrades
 * that chunk to its lexical score instead of throwing inside a search. */
export function decodeEmbedding(encoded: string | null | undefined): Int8Array | null {
  if (!encoded) return null
  try {
    const binary = atob(encoded)
    const out = new Int8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      const b = binary.charCodeAt(i)
      out[i] = b > 127 ? b - 256 : b
    }
    return out.length ? out : null
  } catch {
    return null
  }
}

/** Cosine similarity of two stored embeddings, in −1…1. Two vectors of different
 * lengths are not comparable (a model was changed under the index), and answering
 * 0 for them is the honest reading: no evidence either way, decided by the
 * lexical half instead. */
export function similarity(a: Int8Array | null, b: Int8Array | null): number {
  if (!a || !b || a.length !== b.length) return 0
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum / (127 * 127)
}
