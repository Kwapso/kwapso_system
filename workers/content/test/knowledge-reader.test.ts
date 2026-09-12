// THE READER, IN ISOLATION — BUILD-5-knowledge-rebuild.md §5-6.
//
// knowledge.test.ts's "the reader recovers a paraphrase…" describes proves
// `retrieve()` USES a reader correctly (widened floor, fail-closed on a null
// verdict). This proves `readShortlist` ITSELF: the prompt it builds, the
// model it calls, and — the part most likely to be wrong in a way nothing
// else catches — how defensively it reads back whatever the model said.
//
// CITE OR DROP (A-X9, 12 Sep 2026). The reader's claim of relevance is no
// longer trusted on its own: every kept id must carry a quote that is
// actually, verbatim, in the passage it claims — checked in code, not
// assumed. See knowledge-reader.ts's own header comment on `groundedRelevant`
// for why (a rescue-pass shortlist is noise by construction, and a cheap
// model asked "which of these are relevant?" almost never answers empty).

import { describe, expect, it } from "vitest"

import { READER_TEXT_MODEL, TOOL_RESULT_TAG } from "@shared/workers/model-text"
import type { KnowledgePassage } from "@shared/types"
import type { Env } from "../src/env"
import { passageId, readShortlist, READER_SHORTLIST_CAP, READER_MAX_TOKENS } from "../src/lib/knowledge-reader"

const passage = (sourceId: string, title: string, text: string, seq = 0): KnowledgePassage => ({
  sourceId,
  title,
  kind: "note",
  url: null,
  recordPath: null,
  compartment: "agency",
  seq,
  text,
  score: 0.5,
  recordDate: null,
})

/** A stand-in for the Workers AI binding, in the exact shape
 * knowledge-answer.test.ts already trusts (`{ response: reply }`, which is
 * `modelWords`'s FIRST read path). Records what it was asked, including the
 * MODEL NAME — the one thing that distinguishes a reader call from a writer
 * call at the transport, since both go through `cheapAnswer`. */
function fakeAi(reply: string | Error) {
  const calls: { model: string; body: { messages: { role: string; content: string }[]; max_tokens?: number } }[] = []
  const env = {
    DB: {} as never, // logError's own contract: never throws on a bad db
    AI: {
      run: async (model: string, body: unknown) => {
        calls.push({ model, body: body as (typeof calls)[number]["body"] })
        if (reply instanceof Error) throw reply
        return { response: reply }
      },
    },
  } as unknown as Env
  return { env, calls }
}

/** Build a `{"relevant": [...]}` reply naming one entry per (id, quote) pair
 * — the shape the reader is asked for now. `quote` should be lifted verbatim
 * from the passage it claims to prove a real test isn't accidentally testing
 * its own broken fixture. */
function reply(entries: { id: string; quote: string }[]): string {
  return JSON.stringify({ relevant: entries })
}

const ASSEMBLY_TEXT = "The monthly assembly happens on Fridays. Aurora organises it."
const ROLLOUT_TEXT = "Their operations lead signs it off."

describe("readShortlist — the prompt and the model it calls", () => {
  it("calls the READER's model, not the cheap writer's default", async () => {
    const { calls } = await callWith(reply([{ id: "S1:0", quote: "monthly assembly happens on Fridays. Aurora organises it" }]))
    expect(calls[0].model, "the reader must not silently fall back to CHEAP_TEXT_MODEL").toBe(READER_TEXT_MODEL)
  })

  it("fences every candidate and labels it with a stable id the reply can name back", async () => {
    const { env } = fakeAi(reply([]))
    const shortlist = [
      passage("S1", "Team Assembly", "The monthly assembly happens on Fridays."),
      passage("S2", "Delaval rollout", "Their operations lead signs it off.", 3),
    ]
    let seenPrompt = ""
    await readShortlist(
      {
        ...env,
        AI: {
          run: async (_model: string, body: unknown) => {
            seenPrompt = (body as { messages: { content: string }[] }).messages[1].content
            return { response: reply([]) }
          },
        },
      } as unknown as Env,
      "who organises the assembly?",
      shortlist
    )
    expect(seenPrompt).toContain(`(id "${passageId(shortlist[0])}")`)
    expect(seenPrompt).toContain(`(id "${passageId(shortlist[1])}")`)
    expect(seenPrompt).toContain(`<${TOOL_RESULT_TAG} from=`)
    expect(seenPrompt).toContain(`</${TOOL_RESULT_TAG}>`)
    expect(seenPrompt).toContain("who organises the assembly?")
  })

  it("asks for JSON only, in the {relevant, quote} shape — no prose, no markdown fence", async () => {
    const { env, calls } = fakeAi(reply([]))
    await readShortlist(env, "q", [passage("S1", "T", "x")])
    const system = calls[0].body.messages[0].content
    expect(system).toMatch(/ONLY JSON/i)
    expect(system).toContain("quote")
  })

  async function callWith(text: string) {
    const { env, calls } = fakeAi(text)
    await readShortlist(env, "who organises the assembly?", [passage("S1", "Team Assembly", ASSEMBLY_TEXT)])
    return { calls }
  }
})

describe("readShortlist — cite or drop: the claim is checked, not trusted", () => {
  const shortlist = [passage("S1", "Team Assembly", ASSEMBLY_TEXT), passage("S2", "Delaval rollout", ROLLOUT_TEXT)]

  it("keeps an id whose quote is genuinely, verbatim, in its own passage", async () => {
    const { env } = fakeAi(reply([{ id: "S1:0", quote: "monthly assembly happens on Fridays. Aurora organises it" }]))
    const out = await readShortlist(env, "who organises the assembly?", shortlist)
    expect(out).toEqual({ relevant: ["S1:0"] })
  })

  it("an empty list is a real, complete verdict — not a failure", async () => {
    const { env } = fakeAi(reply([]))
    const out = await readShortlist(env, "who organises the assembly?", shortlist)
    expect(out).toEqual({ relevant: [] })
  })

  it("never returns more than it was asked to judge — an empty shortlist is answered without a model call", async () => {
    const { env, calls } = fakeAi(reply([{ id: "S9:0", quote: "irrelevant" }]))
    const out = await readShortlist(env, "anything", [])
    expect(out).toEqual({ relevant: [] })
    expect(calls, "nothing to read is nothing to spend on").toHaveLength(0)
  })

  // THE SEAM THAT STOPS A MODEL SMUGGLING A PASSAGE INTO THE ANSWER THAT
  // NOTHING HERE EVER RETRIEVED. An id outside the shortlist it was actually
  // shown must not survive, quote or no quote.
  it("drops an id the shortlist never held, even with a well-formed quote attached", async () => {
    const { env } = fakeAi(
      reply([
        { id: "S1:0", quote: "monthly assembly happens on Fridays. Aurora organises it" },
        { id: "S404:0", quote: "something that sounds plausible enough" },
      ])
    )
    const out = await readShortlist(env, "who organises the assembly?", shortlist)
    expect(out?.relevant).toEqual(["S1:0"])
  })

  it("keeps only a genuine subset when the model drops a candidate — 'best evidence' is allowed to be fewer than all of it", async () => {
    const { env } = fakeAi(reply([{ id: "S1:0", quote: "monthly assembly happens on Fridays. Aurora organises it" }]))
    const out = await readShortlist(env, "who organises the assembly?", shortlist)
    expect(out?.relevant).toEqual(["S1:0"])
    expect(out?.relevant).not.toContain("S2:0")
  })

  it("tolerates a markdown fence around the reply, despite being told not to use one", async () => {
    const { env } = fakeAi("```json\n" + reply([{ id: "S1:0", quote: "monthly assembly happens on Fridays. Aurora organises it" }]) + "\n```")
    const out = await readShortlist(env, "who organises the assembly?", shortlist)
    expect(out).toEqual({ relevant: ["S1:0"] })
  })

  it("still accepts the OLD bare-string-array shape as PARSEABLE — but every entry is dropped for carrying no quote", async () => {
    const { env } = fakeAi(`["S1:0"]`)
    const out = await readShortlist(env, "who organises the assembly?", shortlist)
    // Parseable, so this is a real "found nothing" verdict, never null.
    expect(out).toEqual({ relevant: [] })
  })

  it("a reply mixing a genuine quoted entry with garbage entries keeps the genuine one and drops the rest — not null", async () => {
    const { env } = fakeAi(`{"relevant": [{"id":"S1:0","quote":"monthly assembly happens on Fridays. Aurora organises it"}, 3, null, "S2:0"]}`)
    const out = await readShortlist(env, "who organises the assembly?", shortlist)
    expect(out).toEqual({ relevant: ["S1:0"] })
  })

  // THE CHECK WITH TEETH — THE PART THAT ACTUALLY ANSWERS A-X9. Four tests,
  // each one MUTATION-PROVED against `groundedRelevant`/`normaliseForQuoteCheck`
  // in knowledge-reader.ts: comment out the mechanism named in each test's own
  // title and confirm THIS test goes red, then restore it.

  it("MUTATION-PROVED (delete the substring check): a quote absent from its own passage is dropped", async () => {
    const { env } = fakeAi(reply([{ id: "S1:0", quote: "this sentence never appears anywhere in that passage" }]))
    const out = await readShortlist(env, "who organises the assembly?", shortlist)
    expect(out).toEqual({ relevant: [] })
  })

  it("MUTATION-PROVED (check against the whole shortlist instead of the entry's own id): a quote lifted from a DIFFERENT shortlist entry is dropped", async () => {
    // "Their operations lead signs it off." is real text — but it belongs to
    // S2, and this entry claims it under S1's id. Real words, wrong passage.
    const { env } = fakeAi(reply([{ id: "S1:0", quote: "Their operations lead signs it off" }]))
    const out = await readShortlist(env, "who organises the assembly?", shortlist)
    expect(out).toEqual({ relevant: [] })
  })

  // THE FALSE-DROP CANARY. Without this, a normalisation bug (comparing raw
  // strings instead of normalised ones) would pass every test above by
  // dropping everything, including real quotes — and nothing would notice.
  it("MUTATION-PROVED (compare raw strings instead of normalised ones): a real quote survives different whitespace and curly punctuation", async () => {
    const curlyPassage = [passage("S3", "Curly quote source", 'She said "keep going," and   left   quickly.')]
    const { env } = fakeAi(reply([{ id: "S3:0", quote: "she said “keep going,” and left quickly" }]))
    const out = await readShortlist(env, "what did she say?", curlyPassage)
    expect(out, "a genuine quote must not be false-dropped by normalisation").toEqual({ relevant: ["S3:0"] })
  })

  it("MUTATION-PROVED (a quote under the minimum length): a real but too-short fragment is dropped", async () => {
    const { env } = fakeAi(reply([{ id: "S1:0", quote: "Fridays" }]))
    const out = await readShortlist(env, "who organises the assembly?", shortlist)
    expect(out).toEqual({ relevant: [] })
  })

  // NON-VACUITY CANARY. Every test above passing because `groundedRelevant`
  // always returns `[]` unconditionally is the one failure mode none of them
  // can see on their own — this is the test that would catch it.
  it("non-vacuity: a genuinely valid entry survives the whole filter", async () => {
    const { env } = fakeAi(reply([{ id: "S1:0", quote: "the monthly assembly happens on Fridays" }]))
    const out = await readShortlist(env, "who organises the assembly?", shortlist)
    expect(out?.relevant.length, "the filter must let SOMETHING through when the evidence is genuinely real").toBeGreaterThan(0)
  })
})

describe("readShortlist — null on any failure it cannot recover from", () => {
  const shortlist = [passage("S1", "Team Assembly", "Aurora organises it.")]

  it("a model error returns null, not an empty verdict", async () => {
    const { env } = fakeAi(new Error("model_error: Workers AI is having a moment"))
    expect(await readShortlist(env, "q", shortlist)).toBeNull()
  })

  it("a reply that is not JSON at all returns null", async () => {
    const { env } = fakeAi("Sure! I'll keep the Team Assembly passage.")
    expect(await readShortlist(env, "q", shortlist)).toBeNull()
  })

  it("a JSON object with no relevant array at all returns null", async () => {
    const { env } = fakeAi(`{"kept": ["S1:0"]}`)
    expect(await readShortlist(env, "q", shortlist)).toBeNull()
  })

  it("a bare JSON object (not an array, no relevant key) returns null", async () => {
    const { env } = fakeAi(`{"id": "S1:0", "quote": "monthly assembly happens on Fridays. Aurora organises it"}`)
    expect(await readShortlist(env, "q", shortlist)).toBeNull()
  })
})

describe("READER_SHORTLIST_CAP", () => {
  it("matches BUILD-5's own fan-out number (12) rather than a second one invented here", () => {
    expect(READER_SHORTLIST_CAP).toBe(12)
  })
})

// MIGRATION kb-reader-token-budget, 11 Sep 2026. THE CHEAP HALF OF A TWO-PART
// GUARD — see knowledge-reader-real-model.test.ts for the expensive half that
// can actually SEE a truncation. This half cannot: it
// never calls a real model, so it cannot catch a ceiling that is too low for
// the real prompt. What it CAN catch, for free, on every `npm run check`, is
// the regression most likely to actually happen — somebody looking at a
// four-digit READER_MAX_TOKENS next to a short JSON answer and "optimising"
// it back down without re-measuring. That is exactly how it broke last time:
// READER_MAX_TOKENS=200 was picked without measurement, cut every real call
// off mid-reasoning (finish_reason:"length", empty content), and collapsed
// the exam's `para` category 81%->0% in production, silently, under a green
// build — because nothing here asserted a floor.
describe("READER_MAX_TOKENS — a floor derived from a real measurement, not a guess", () => {
  // MEASURED 11 Sep 2026 against the real @cf/moonshotai/kimi-k2.6 (the
  // reader's model at the time): completion_tokens up to 880 on a real
  // twelve-passage shortlist, id-list-only (no quotes yet). RE-MEASURED
  // 12 Sep 2026 after two changes since: the reader's model is now
  // @cf/meta/llama-4-scout-17b-16e-instruct (CITE OR DROP's own commit,
  // reader-model change from the same day), and every kept entry now also
  // carries a verbatim quote, which lengthens the reply. See
  // knowledge-reader-real-model.test.ts's own real-model run for the
  // current finish_reason check — this floor is kept at the kimi-era
  // number because it is the higher of the two measurements on record and
  // 1500 clears it with room either way; lower it only against a fresh
  // measurement, never on the assumption that a smaller/faster model needs less.
  const MEASURED_MAX_COMPLETION_TOKENS = 880

  it("stays above the measured worst case, with real headroom — never tighten this without a fresh real-model measurement", () => {
    expect(
      READER_MAX_TOKENS,
      `READER_MAX_TOKENS (${READER_MAX_TOKENS}) must stay comfortably above the highest completion_tokens ` +
        `actually observed against the real model (${MEASURED_MAX_COMPLETION_TOKENS}, see this file and COSTS.md) — ` +
        `a ceiling that clips at or near the measured max reproduces the exact silent-truncation bug this test exists to catch. ` +
        `max_tokens is a ceiling, not a purchase (Workers AI bills per token generated), so there is no cost reason to shave it.`
    ).toBeGreaterThanOrEqual(MEASURED_MAX_COMPLETION_TOKENS * 1.1)
  })
})
