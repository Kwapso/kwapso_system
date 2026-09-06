// WHAT IS FIXED AT BIRTH, AND WHY — the four user-visible columns this base
// writes once and never updates, each with the reason it is right that way.
//
// WHY A TEST RATHER THAN A COMMENT. An outside review on 5 Sep 2026 listed five
// user-facing columns that appear in an INSERT and in no UPDATE, and asked of
// each whether it was a design decision or a dead end. Four carried their answer
// already — `knowledge_terms.term` is half a PRIMARY KEY, `client_tool_prices`
// has a paragraph in the schema saying why a price is history and not a field,
// `google_connections.service` and `google_sources.service` name which Google
// service a row is for. The fifth, `agent_messages.content`, was correct and
// said nothing, so the reviewer had to derive it and the NEXT reviewer would
// have had to derive it again.
//
// The note belongs in a check rather than in the migration, for a reason the
// migrations file states at length: a migration is APPLIED TEXT and it is
// append-only. Migration 0004 created `agent_messages` and every live team ran
// it long ago, so a `--` comment added to it today would reach new teams only
// and would break the one rule that makes the ledger safe to read. A test is
// where a decision can be written down without rewriting history.
//
// It fails if somebody adds an UPDATE — which is the point. An assistant turn
// that can be edited after the fact is not a record of what was said, and the
// citation trail (R23) and the usage ledger both rest on it being one.

import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

const WORKERS = join(__dirname, "..", "..")

/** Every production .ts across the three workers that can reach a team database.
 * Tests are excluded — a fixture may build whatever rows it likes. */
function productionSource(): { rel: string; source: string }[] {
  return ["tenancy", "content", "data-ops"]
    .flatMap((w) => sourceFiles(join(WORKERS, w, "src"), { extensions: [".ts"] }))
    .filter((f) => !/(^|\/)tests?\//.test(f.rel))
    .map((f) => ({ rel: f.rel, source: stripComments(f.source) }))
}

describe("a conversation turn is a record, not a field", () => {
  const files = productionSource()

  it("the census can see an UPDATE where there definitely is one", () => {
    // THE CANARY. This whole suite is a search for something absent, and an
    // empty result is the dangerous one: a walker that reads nothing passes
    // every assertion below. `agent_threads` IS updated (last_message_at moves
    // every turn), so if this stops being found, nothing here means anything.
    const updatesThreads = files.some((f) => /UPDATE\s+agent_threads\s+SET/i.test(f.source))
    expect(updatesThreads, "the walker must be finding real UPDATE statements").toBe(true)
    expect(files.length, "and it must be reading the whole surface, not one file").toBeGreaterThan(40)
  })

  // THE CLAIM IS ABOUT ONE COLUMN, NOT THE ROW — and the first draft of this
  // test got that wrong, which is worth recording. Written as "nothing UPDATEs
  // agent_messages" it went red immediately on data-ops/src/lib/threads.ts, and
  // that write is entirely correct: it is a compare-and-set on `tool_calls_json`
  // (`… SET tool_calls_json = ? WHERE id = ? AND tool_calls_json = ?`), the
  // idempotent shape R17 asks for, moving a turn's TOOL RECORD forward as the
  // assistant works. What was said is `content`, and that is what never moves.
  it("nothing ever rewrites what was SAID", () => {
    const offenders = files
      .filter((f) => /UPDATE\s+agent_messages\s+SET[^;`]*\bcontent\s*=/i.test(f.source))
      .map((f) => f.rel)
    expect(
      offenders,
      "agent_messages.content is written once, at the moment the turn happens, and is never " +
        "edited afterwards. An assistant turn that can be rewritten is not a record of what was " +
        "said, and both the citation trail (R23) and the usage ledger read it as one. If this " +
        "genuinely needs to change, that is a decision to write down here first: " +
        offenders.join(", ")
    ).toEqual([])
  })

  // The narrowing above is only safe while the pattern can still SEE an
  // assignment to content. Proved on a string rather than on the tree, because
  // there is (correctly) no such statement in the tree to point at.
  it("the narrowed pattern would still catch a rewrite of content", () => {
    const RE = /UPDATE\s+agent_messages\s+SET[^;`]*\bcontent\s*=/i
    expect(RE.test("UPDATE agent_messages SET content = ${sqlString(x)} WHERE id = ?")).toBe(true)
    expect(RE.test("UPDATE agent_messages SET tool_calls_json = ? WHERE id = ?")).toBe(false)
  })

  it("…and no door deletes one either — a thread is retired whole or not at all", () => {
    const offenders = files
      .filter((f) => /DELETE\s+FROM\s+agent_messages\b/i.test(f.source))
      .map((f) => f.rel)
    expect(
      offenders,
      "deactivate, never delete (CONVENTIONS.md). A single turn vanishing out of the middle of a " +
        "conversation leaves the rest of it lying about what happened: " + offenders.join(", ")
    ).toEqual([])
  })
})
