// THE READER, IN ISOLATION — BUILD-5-knowledge-rebuild.md §5-6.
//
// knowledge.test.ts's "the reader recovers a paraphrase…" describes proves
// `retrieve()` USES a reader correctly (widened floor, fail-closed on a null
// verdict). This proves `readShortlist` ITSELF: the prompt it builds, the
// model it calls, and — the part most likely to be wrong in a way nothing
// else catches — how defensively it reads back whatever the model said.

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

describe("readShortlist — the prompt and the model it calls", () => {
  it("calls the READER's model, not the cheap writer's default", async () => {
    const { calls } = await callWith(`["S1:0"]`)
    expect(calls[0].model, "the reader must not silently fall back to CHEAP_TEXT_MODEL").toBe(READER_TEXT_MODEL)
  })

  it("fences every candidate and labels it with a stable id the reply can name back", async () => {
    const { env } = fakeAi(`[]`)
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
            return { response: "[]" }
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

  it("asks for JSON only — no prose, no markdown fence", async () => {
    const { env, calls } = fakeAi(`[]`)
    await readShortlist(env, "q", [passage("S1", "T", "x")])
    const system = calls[0].body.messages[0].content
    expect(system).toMatch(/ONLY.*JSON array/is)
  })

  async function callWith(reply: string) {
    const { env, calls } = fakeAi(reply)
    await readShortlist(env, "who organises the assembly?", [passage("S1", "Team Assembly", "Aurora organises it.")])
    return { calls }
  }
})

describe("readShortlist — the decision, and what it may not do", () => {
  const shortlist = [
    passage("S1", "Team Assembly", "The monthly assembly happens on Fridays. Aurora organises it."),
    passage("S2", "Delaval rollout", "Their operations lead signs it off."),
  ]

  it("keeps exactly the ids the model named, in the order it named them", async () => {
    const { env } = fakeAi(`["S1:0"]`)
    const out = await readShortlist(env, "who organises the assembly?", shortlist)
    expect(out).toEqual({ relevant: ["S1:0"] })
  })

  it("an empty array is a real, complete verdict — not a failure", async () => {
    const { env } = fakeAi(`[]`)
    const out = await readShortlist(env, "who organises the assembly?", shortlist)
    expect(out).toEqual({ relevant: [] })
  })

  it("never returns more than it was asked to judge — an empty shortlist is answered without a model call", async () => {
    const { env, calls } = fakeAi(`["S9:0"]`)
    const out = await readShortlist(env, "anything", [])
    expect(out).toEqual({ relevant: [] })
    expect(calls, "nothing to read is nothing to spend on").toHaveLength(0)
  })

  // THE SEAM THAT STOPS A MODEL SMUGGLING A PASSAGE INTO THE ANSWER THAT
  // NOTHING HERE EVER RETRIEVED. Whether by inventing an id or by echoing one
  // from material it has no business remembering, a reply naming an id
  // outside the shortlist it was actually shown must not survive.
  it("drops an id the shortlist never held, rather than trusting the reply at face value", async () => {
    const { env } = fakeAi(`["S1:0","S404:0","S1:0"]`)
    const out = await readShortlist(env, "who organises the assembly?", shortlist)
    expect(out?.relevant).toEqual(["S1:0", "S1:0"])
  })

  it("keeps only a genuine subset when the model drops a candidate — 'best evidence' is allowed to be fewer than all of it", async () => {
    const { env } = fakeAi(`["S1:0"]`)
    const out = await readShortlist(env, "who organises the assembly?", shortlist)
    expect(out?.relevant).toEqual(["S1:0"])
    expect(out?.relevant).not.toContain("S2:0")
  })

  it("tolerates a markdown fence around the array, despite being told not to use one", async () => {
    const { env } = fakeAi('```json\n["S1:0"]\n```')
    const out = await readShortlist(env, "who organises the assembly?", shortlist)
    expect(out).toEqual({ relevant: ["S1:0"] })
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

  it("a reply that is JSON but not an array of strings returns null", async () => {
    const { env } = fakeAi(`{"relevant": ["S1:0"]}`)
    expect(await readShortlist(env, "q", shortlist)).toBeNull()
  })

  it("a reply mixing real ids with non-string entries returns null rather than a partly-trusted list", async () => {
    const { env } = fakeAi(`["S1:0", 3, null]`)
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
// four-digit READER_MAX_TOKENS next to a short JSON-array answer and
// "optimising" it back down without re-measuring. That is exactly how it
// broke last time: READER_MAX_TOKENS=200 was picked without measurement, cut
// every real call off mid-reasoning (finish_reason:"length", empty content),
// and collapsed the exam's `para` category 81%->0% in production, silently,
// under a green build — because nothing here asserted a floor.
describe("READER_MAX_TOKENS — a floor derived from a real measurement, not a guess", () => {
  // MEASURED 11 Sep 2026 against the real @cf/moonshotai/kimi-k2.6, the real
  // shipped readerSystemPrompt/readerUserPrompt, and a real, full 12-passage
  // shortlist (see documents/COSTS.md's `read=1` section for the full
  // writeup). Five real calls this session: completion_tokens 465, 521, 530,
  // 670, 729 (all finish_reason:"stop"); an earlier same-day informal probe
  // at widths 1/6/12 saw completion_tokens as high as 880. Observed max: 880.
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
