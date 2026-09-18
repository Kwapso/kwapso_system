// CHAT ATTACHMENTS — a picked file read for THIS conversation only, never
// stored. Client decision, "assistant a1", 18 Sep 2026, verbatim: "a picked
// file shows as a small tile above the pill; the file is read by the
// assistant for THIS conversation only (not stored anywhere else)." It
// reverses the 13 Sep 2026 removal ("the file upload feature is pretty
// useless, so let's get rid of that completely at the moment") — see the
// header on postAgentChat (routes/agent.ts) for what was cut and why putting
// it back is a revert rather than a rebuild.
//
// R40 DOES NOT APPLY. R40 asks whether a STORED file reaches a person; an
// attachment here is never written to a bucket, never gets a knowledge-source
// row, and never gets a STORED_FILES entry — there is nothing to reach,
// because nothing survives past the one model call this turn makes. What
// DOES survive is a plain note on the saved user message ("Attached:
// x.png") — the same shape runChat already gives the chat-import CSVs
// (`opts.files`) below, so a transcript stays honest about what was in the
// room without keeping the room's contents.
//
// A SEPARATE READER FROM workers/content'S R42 TABLE, ON PURPOSE. That table
// (workers/content/src/lib/source-readers.ts) governs what becomes a
// searchable KNOWLEDGE SOURCE — a stored, chunked, embedded row a LATER
// question can retrieve. An attachment here is never any of those things, so
// routing it through content's gated knowledge-upload door (which stores
// every byte, R40's whole job) would be the wrong shape, and would gate the
// wrong right (`knowledge:create` rather than `agent:create`). This calls the
// SAME underlying primitive content's own "markdown" reader calls —
// `env.AI.toMarkdown`, the Workers AI binding both workers hold — directly,
// with the same options, so a PDF reads exactly as well here as it does
// through the knowledge base. One call, no extra worker hop, nothing kept.

import type { Env } from "../env"

/** Mirrors source-readers.ts's own ceiling for the same call — a large scanned
 * PDF's real conversion time, with room to spare inside the request a person
 * is waiting on. Kept as its own constant rather than imported: importing
 * across a worker boundary is exactly the shape R42's "no door chooses its
 * own reader" warns about for a STORED source, and this is deliberately not
 * one (see the file header) — a coincidence in the number is not a dependency. */
const CONVERT_TIMEOUT_MS = 20_000

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timed out")), ms)),
  ])
}

export type ChatAttachment = { name: string; mime: string; bytes: Uint8Array }

/** One attachment's words, or an honest note about why it has none. Never
 * throws — a conversion failure is a fact about this one file, not the turn;
 * the caller says so in the block it builds rather than losing the turn over
 * a scan nobody could read. */
export async function extractAttachmentText(
  env: Pick<Env, "AI">,
  file: ChatAttachment
): Promise<{ text: string | null; note: string | null }> {
  // Plain text needs no model call — the bytes ARE the words, same as
  // source-readers.ts's "plain" reader.
  if (file.mime.startsWith("text/")) {
    const decoded = new TextDecoder("utf-8", { fatal: false, ignoreBOM: false }).decode(file.bytes).trim()
    return decoded ? { text: decoded, note: null } : { text: null, note: "this file has no text in it" }
  }
  try {
    const out = (await withTimeout(
      env.AI.toMarkdown(
        { name: file.name, blob: new Blob([file.bytes as unknown as ArrayBuffer], { type: file.mime }) },
        // Same call, same option, as source-readers.ts's "markdown" reader —
        // no PDF preamble metadata eating the first passage.
        { conversionOptions: { pdf: { metadata: false } } }
      ),
      CONVERT_TIMEOUT_MS
    )) as { format?: string; error?: string; data?: unknown }
    if (out?.format === "error") return { text: null, note: out.error || "conversion failed" }
    const text = typeof out?.data === "string" ? out.data.trim() : ""
    return text
      ? { text, note: null }
      : { text: null, note: "we read this file and found no text in it, an image with nothing written on it, or a scan we couldn't make out" }
  } catch (e) {
    return { text: null, note: e instanceof Error ? e.message : "we couldn't read this file just now" }
  }
}
