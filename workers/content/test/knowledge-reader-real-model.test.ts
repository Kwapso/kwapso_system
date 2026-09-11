// THE EXPENSIVE HALF OF THE READER TOKEN-BUDGET GUARD — kb-reader-token-budget,
// 11 Sep 2026. knowledge-reader.test.ts's READER_MAX_TOKENS describe is the
// cheap half: it can only catch someone tightening the ceiling back down
// below a pinned, already-measured floor. It cannot see whether that floor
// is STILL correct, because it never calls a real model.
//
// "A test that mocks the model proves nothing here" is the hub's own words on
// this bug, and they are earned: READER_MAX_TOKENS=200 shipped and stayed
// green for as long as it did because nothing in this repo ever called the
// real @cf/moonshotai/kimi-k2.6 with the real reader prompt at a real
// shortlist width. knowledge-reader.test.ts fully mocks env.AI.run
// (fakeAi()); the "reader recovers a paraphrase" describe in
// knowledge.test.ts injects a hand-written `read` callback straight into
// retrieve(), bypassing readShortlist and cheapAnswer entirely. Both proved
// something real; neither could have caught this, because the bug lives in
// exactly the seam each one replaced with a stand-in.
//
// THIS FILE CALLS THE REAL MODEL. Gated behind RUN_REAL_READER_TEST=1 and
// skipped otherwise (see the skip note this file prints under an ordinary
// `npm run check`) — every run makes one real, billed Cloudflare Workers AI
// call, roughly $0.003-0.005 at this model's published per-token price
// (shared/workers/pricing.ts; see documents/COSTS.md's `read=1` section for
// the full measurement this test's own fixture pool is drawn from). Run it
// deliberately, not on every save:
//
//   RUN_REAL_READER_TEST=1 npm test --workspace=kwapso-content -- knowledge-reader-real-model
//
// It reads this machine's own Cloudflare credentials from
// scripts/lib/cf-credentials.mjs (Keychain, via ~/.config/cloudflare/accounts.json
// — the same source every other real-account script in this repo uses) and
// throws a clear error if this folder is not registered there, rather than
// silently skipping or guessing an account.

import { describe, expect, it } from "vitest"
import { noteSkip } from "@shared/rules/loud-skip"
import { cloudflareCredentials } from "../../../scripts/lib/cf-credentials.mjs"
import { passageId, readShortlist } from "../src/lib/knowledge-reader"
import type { KnowledgePassage } from "@shared/types"
import type { Env } from "../src/env"

const RUN = process.env.RUN_REAL_READER_TEST === "1"

if (!RUN)
  noteSkip({
    suite: "readShortlist against the real model (1 real, billed call)",
    missing: 'RUN_REAL_READER_TEST=1 — not set by `npm run check`, on purpose: this call costs real money',
    proves:
      "that READER_MAX_TOKENS is actually enough for the real model, the real prompt, and a real full shortlist — the one thing no mocked test in this repo can see, and the reason the 200-token ceiling shipped and stayed green",
    get: "RUN_REAL_READER_TEST=1 npm test --workspace=kwapso-content -- knowledge-reader-real-model (~$0.003-0.005 per run, real Cloudflare spend, see this file's own header)",
    byDesign: true,
  })

function passage(
  sourceId: string,
  seq: number,
  title: string,
  text: string,
  recordDate: string | null
): KnowledgePassage {
  return {
    sourceId,
    title,
    kind: "note",
    url: null,
    recordPath: null,
    compartment: "agency",
    seq,
    text,
    score: 0.5,
    recordDate,
  }
}

/** The Workers AI BINDING shape (`env.AI.run`) is the unwrapped `result` —
 * `shared/workers/model-text.ts`'s own comment on why `modelWords` reads
 * `response`/`choices` directly rather than a `{result: ...}` envelope. The
 * REST API this test must use instead (there is no binding outside a real
 * Worker) returns that envelope, so this shim unwraps it to match. */
function realEnv(accountId: string, token: string): Env {
  return {
    DB: {} as never, // logError's own contract: it never throws on a bad db (shared/workers/error-log.ts)
    AI: {
      run: async (model: string, body: unknown) => {
        const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const json = (await res.json()) as { success: boolean; result?: unknown; errors?: unknown }
        if (!json.success) throw new Error(`Workers AI call failed: ${JSON.stringify(json.errors).slice(0, 300)}`)
        return json.result
      },
    },
  } as unknown as Env
}

// The exact same twelve-passage fixture pool used for the 11 Sep 2026
// measurement written into documents/COSTS.md, so a future re-run of this
// test is directly comparable to the numbers recorded there.
const POOL: [string, string, string | null][] = [
  [
    "Bergman S.A. — March invoice run",
    "Marta reported that the March invoice run for Bergman S.A. was not visible in the client portal. The dispatch team confirmed the export job had failed silently on the 4th due to a timeout against the accounting API. A fix was deployed the same afternoon and the invoices were regenerated. Marta confirmed on the 6th that the portal now shows the full March run.",
    "2026-02-05",
  ],
  [
    "Weekly team assembly notes",
    "The monthly team assembly happens on the first Friday. Aurora organises it and rotates who leads it next time. Last month's assembly covered the Q3 roadmap and the client onboarding checklist revision.",
    "2026-01-10",
  ],
  [
    "Dispatch screen logout bug",
    "Several drivers reported being logged out of the dispatch screen mid-shift. Root cause was a session token refresh race condition under load. Patched in the 1.4.2 release.",
    "2026-03-01",
  ],
  [
    "Padelbase onboarding checklist",
    "Padelbase's onboarding included a walkthrough of the booking calendar, payment integration setup, and staff role assignment. Completed over two sessions in February.",
    "2026-02-20",
  ],
  [
    "Comunitapp sprint retrospective",
    "The sprint retrospective for Comunitapp's v2 release noted slower-than-expected QA turnaround. Action item: add a staging smoke-test suite before the next release.",
    "2026-01-25",
  ],
  [
    "Bergman S.A. — contact update",
    "Bergman S.A. added a second billing contact, Peter Jordan, who should be CC'd on all invoice-related correspondence going forward.",
    "2026-02-10",
  ],
  [
    "Client portal outage postmortem",
    "A 40-minute portal outage on the 12th was traced to a database connection pool exhaustion under an unusually large CSV import. The pool size was increased and an alert threshold added.",
    "2026-01-14",
  ],
  [
    "Deliverable kind vocabulary change",
    "The 'Deliverable kind' dropdown gained two new options this quarter: 'API integration' and 'Data migration', requested by three separate clients.",
    "2026-02-01",
  ],
  [
    "Story: Action table filters",
    "Ticket for adding filters to the action table view — status, assignee, and due date. Marked in progress, no update since last sprint.",
    "2026-02-18",
  ],
  [
    "Sprint type reference",
    "Sprint types in this system: Implementation, Refinement, Validation. Each maps to a different reporting cadence in the client dashboard.",
    "2026-01-05",
  ],
  [
    "HOGO Retainer — WhatsApp opt-in",
    "HOGO's retainer scope was extended to include a WhatsApp opt-in flow for their delivery notifications, requested after a client call on the 9th.",
    "2026-03-05",
  ],
  [
    "Task: Case studies collection",
    "Collecting three client case studies for the new marketing site — Bergman S.A., Padelbase, and one still to be confirmed.",
    "2026-02-22",
  ],
]

describe.skipIf(!RUN)("readShortlist — against the real @cf/moonshotai/kimi-k2.6 (REAL SPEND)", () => {
  it(
    "returns a real verdict inside READER_MAX_TOKENS, not a truncation, for the full 12-passage shortlist",
    async () => {
      const { account, token } = cloudflareCredentials()
      const env = realEnv(account, token)
      const shortlist = POOL.map(([title, text, recordDate], seq) =>
        passage("SRC_REALTEST", seq, title, text, recordDate)
      )
      const question = "What happened with Bergman S.A.'s March invoices and who else should be looped in on billing now?"

      const verdict = await readShortlist(env, question, shortlist)

      // THE ASSERTION THAT ACTUALLY MATTERS. A truncated reply (finish_reason
      // "length") fails parseIds and readShortlist returns null — exactly
      // what READER_MAX_TOKENS=200 did to every real call the exam made. A
      // ceiling too low for this model's real reasoning length reproduces
      // that failure here, on the one path a mocked test cannot exercise.
      expect(
        verdict,
        "readShortlist returned null against the real model — either the call failed outright, or READER_MAX_TOKENS truncated the reply mid-reasoning (finish_reason:\"length\"), which is the exact bug this test exists to catch"
      ).not.toBeNull()

      // The question names two things a real reading of this pool should
      // keep: the invoice failure itself (seq 0) and the new billing contact
      // (seq 5) — both should survive; the other ten are noise by design.
      expect(verdict!.relevant.length, "the model kept zero passages from a shortlist that plainly contains the answer").toBeGreaterThan(0)
      expect(verdict!.relevant).toContain(passageId(shortlist[0]))
    },
    30_000
  )
})
