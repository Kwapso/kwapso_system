// THE HARNESS'S OWN TESTS — fixtures only, no network, no other lane. Two
// jobs: prove the pure functions (`parseExam`, `classify`, `grade`,
// `validateExam`) behave correctly on small made-up input, and pin the
// exact classification call this lane made over the real 87-row exam so a
// silent change to KB-EXAM.md's tags or to this file's OVERRIDES turns the
// build red rather than drifting unnoticed. `node --test` — built into
// Node, no new dependency, matching "smallest shape".

import assert from "node:assert/strict"
import { test } from "node:test"
import {
  classify,
  findExamFile,
  grade,
  KNOWN_TAGS,
  loadExam,
  MANDATORY_CANARIES,
  OVERRIDES,
  parseExam,
  shortlistFromAnswer,
  summarize,
  validateExam,
} from "../kb-exam.mjs"

const FIXTURE = `
# The exam — fixture

## The owner's eight (mandatory, verbatim)

| # | Question | Tags | Should be answered by |
|---|---|---|---|
| O1 | Plain question | para | Some meeting |

## E · Easy — one source, asked plainly

| # | Question | Tags | Should be answered by |
|---|---|---|---|
| E1 | Another plain one | para | Some other meeting |

## X · Adversarial — the ones that used to break it

| # | Question | Tags | Expected behaviour |
|---|---|---|---|
| X4 | What is the capital of France? | absent | Refuse |
| X10 | How many open tickets? | count, route | Ticket tool |
`

test("parseExam keeps every tag and derives level from the section", () => {
  const rows = parseExam(FIXTURE)
  assert.equal(rows.length, 4)
  const o1 = rows.find((r) => r.id === "O1")
  assert.equal(o1.level, "O")
  assert.deepEqual(o1.tags, ["para"])
  const x10 = rows.find((r) => r.id === "X10")
  assert.equal(x10.level, "X")
  assert.deepEqual(x10.tags, ["count", "route"])
})

test("parseExam skips the header row and the separator row", () => {
  const rows = parseExam(FIXTURE)
  assert.ok(!rows.some((r) => r.id === "#"))
  assert.ok(!rows.some((r) => /^-+$/.test(r.id)))
})

test("classify: count is a tool row regardless of the other tags — never struck, since a hub-declared mandatory canary can carry it", () => {
  const row = classify({ id: "X10", tags: ["count", "route"], question: "" })
  assert.equal(row.disposition, "tool")
  assert.ok(row.reason.length > 0)
})

test("classify: absent is a refusal row", () => {
  const row = classify({ id: "X4", tags: ["absent"], question: "" })
  assert.equal(row.disposition, "refusal")
})

test("classify: an ordinary tag set is keyed, pending real ids", () => {
  const row = classify({ id: "E1", tags: ["para"], question: "" })
  assert.equal(row.disposition, "keyed")
  assert.equal(row.sourceIds, null)
  assert.equal(row.needsKeyingAfterReindex, true)
})

test("classify: overrides win over the tag-based default", () => {
  // A-X1 is tagged only "hijack" — the default would read that as keyed —
  // but the closed OVERRIDES list strikes it. If this ever fails, either
  // the union dropped A-X1's tags or someone edited OVERRIDES without
  // reading the reason attached to it.
  assert.ok(OVERRIDES["A-X1"])
  const row = classify({ id: "A-X1", tags: ["hijack"], question: "" })
  assert.equal(row.disposition, "struck")
})

test("classify: gap outranks every other tag — the meeting exists and has nothing, which is a different claim from a plain refusal", () => {
  const row = classify({ id: "B-G3", tags: ["gap"], question: "" })
  assert.equal(row.disposition, "gap")
  assert.equal(row.sourceIds, null)
  assert.equal(row.needsKeyingAfterReindex, true)
})

test("grade: struck rows are never scored", () => {
  const row = { id: "X1", disposition: "struck", reason: "x" }
  assert.deepEqual(grade(row, { found: true, shortlistIds: ["anything"] }), { row, scored: false })
})

test("grade: tool rows are never scored either — the full-loop exam grades them, not this harness", () => {
  const row = { id: "X10", disposition: "tool", reason: "x" }
  assert.deepEqual(grade(row, { found: true, shortlistIds: ["anything"] }), { row, scored: false })
})

test("grade: refusal rows pass only when retrieval found nothing", () => {
  const row = { id: "X4", disposition: "refusal" }
  assert.equal(grade(row, { found: false, shortlistIds: [] }).correct, true)
  assert.equal(grade(row, { found: true, shortlistIds: ["src_1"] }).correct, false)
})

test("grade: keyed rows pass only when a keyed id is in the shortlist, and found is true", () => {
  const row = { id: "E1", disposition: "keyed", sourceIds: ["src_1", "src_2"] }
  assert.equal(grade(row, { found: true, shortlistIds: ["src_9", "src_2"] }).correct, true)
  assert.equal(grade(row, { found: true, shortlistIds: ["src_9"] }).correct, false)
  // Found is part of the claim too — a shortlist that happens to contain
  // the right id after the retriever itself refused is not a pass.
  assert.equal(grade(row, { found: false, shortlistIds: ["src_1"] }).correct, false)
})

test("grade: a keyed row with no sourceIds throws rather than silently scoring", () => {
  const row = { id: "E1", disposition: "keyed", sourceIds: null }
  assert.throws(() => grade(row, { found: true, shortlistIds: [] }), /no sourceIds/)
})

test("grade: gap rows need BOTH a refusal and the meeting's own source in the shortlist — neither alone is a pass", () => {
  const row = { id: "B-G3", disposition: "gap", sourceIds: ["meeting_src_1"] }
  // found the meeting, said nothing was recorded: correct.
  assert.equal(grade(row, { found: false, shortlistIds: ["meeting_src_1"] }).correct, true)
  // refused, but never actually located the meeting: not the same claim.
  assert.equal(grade(row, { found: false, shortlistIds: [] }).correct, false)
  // located the meeting but then answered anyway: not honest, not a pass.
  assert.equal(grade(row, { found: true, shortlistIds: ["meeting_src_1"] }).correct, false)
})

test("grade: a gap row with no sourceIds throws, same as a keyed row", () => {
  const row = { id: "B-G3", disposition: "gap", sourceIds: null }
  assert.throws(() => grade(row, { found: false, shortlistIds: [] }), /no sourceIds/)
})

test("shortlistFromAnswer dedupes source ids off the passages", () => {
  const answer = { passages: [{ sourceId: "a" }, { sourceId: "b" }, { sourceId: "a" }, { sourceId: null }] }
  assert.deepEqual(shortlistFromAnswer(answer).sort(), ["a", "b"])
})

test("validateExam catches a duplicate id, an unknown tag, and a struck row with no reason", () => {
  const rows = [
    { id: "A1", level: "E", tags: ["para"], disposition: "keyed" },
    { id: "A1", level: "E", tags: ["para"], disposition: "keyed" },
    { id: "A2", level: "E", tags: ["not-a-real-tag"], disposition: "keyed" },
    { id: "A3", level: "E", tags: ["absent"], disposition: "struck", reason: "" },
  ]
  const problems = validateExam({ rows })
  assert.ok(problems.some((p) => p.includes("duplicate row id A1")))
  assert.ok(problems.some((p) => p.includes('unknown tag "not-a-real-tag"')))
  assert.ok(problems.some((p) => p.includes("A3: struck with no reason")))
})

test("validateExam is clean on a well-formed set (mandatory-canary check aside — that only applies to the real exam's own ids)", () => {
  const rows = [
    { id: "A1", level: "E", tags: ["para"], disposition: "keyed" },
    { id: "A2", level: "X", tags: ["absent"], disposition: "refusal" },
    { id: "A3", level: "X", tags: ["count"], disposition: "tool", reason: "needs a tool" },
  ]
  const problems = validateExam({ rows }).filter((p) => !p.startsWith("mandatory canary"))
  assert.deepEqual(problems, [])
})

/* ------------- pinned against the real, committed UNION exam file ------------- */
//
// RULING 1/2/3: the loader reads KB-EXAM-UNION.md (100 rows: 75 shared
// between the two source drafts + 12 A-only + 13 B-only), never renumbered,
// every id namespaced by origin. scripts/kb-exam-merge.mjs is the audit
// trail for how it was built; this pins the RESULT so a silent change to
// either source draft, the merge script, or this file's OVERRIDES turns
// the build red rather than drifting unnoticed.

test("the real KB-EXAM-UNION.md loads clean and every tag it uses is recognised", () => {
  const path = findExamFile()
  assert.match(path, /KB-EXAM-UNION\.md$/, "the union should exist and win over both source files")
  const { rows } = loadExam(path)
  const problems = validateExam({ rows })
  assert.deepEqual(problems, [])
  for (const row of rows) for (const t of row.tags) assert.ok(KNOWN_TAGS.has(t), `${row.id}: tag "${t}" is not in KNOWN_TAGS`)
})

test("the classification call over the union is pinned — 100 rows + 1 derived, 73 keyed / 8 refusal / 7 gap / 7 tool / 6 struck", () => {
  const { rows } = loadExam()
  const summary = summarize(rows)
  assert.equal(summary.total, 101, "100 union rows + the derived X8-notowner row")
  assert.equal(summary.byDisposition.keyed, 73, "72 + A-H13, corrected off gap after the hub's fix to RULING 3's predicate")
  assert.equal(summary.byDisposition.refusal, 8)
  assert.equal(summary.byDisposition.gap, 7, "4 derived from RULING 3, corrected (A-E6, A-E12, A-M6, A-M19) + B's own 3 (B-G3, B-G4, B-G5) — A-H13 moved to keyed, see below")
  assert.equal(summary.byDisposition.tool, 7)
  assert.equal(summary.byDisposition.struck, 6)
  // The union's own footer: "every absent row, every gap row, and the
  // non-owner half of X8" — 7 absent + 1 derived refusal + 7 gap = 15.
  assert.deepEqual(
    summary.mustScore100.sort(),
    ["A-X4", "A-X5", "A-X6", "A-X7", "A-X9", "A-D9", "A-D10", "X8-notowner", "A-E6", "A-E12", "A-M6", "A-M19", "B-G3", "B-G4", "B-G5"].sort()
  )
})

test("every struck or tool row names a reason a stranger could evaluate", () => {
  const { rows } = loadExam()
  const named = rows.filter((r) => r.disposition === "struck" || r.disposition === "tool")
  for (const row of named) assert.ok(row.reason && row.reason.length > 20, `${row.id} needs a real reason, not a stub`)
})

test("the ten mandatory canaries the hub named exist, and only A-O7/A-X10 are graded elsewhere (tool)", () => {
  const { rows } = loadExam()
  const problems = validateExam({ rows })
  assert.deepEqual(problems, [], "validateExam must fail loudly if a canary ever goes missing")
  assert.equal(MANDATORY_CANARIES.size, 10)
  const summary = summarize(rows)
  assert.deepEqual(
    summary.mandatory.map((m) => m.id),
    ["A-O1", "A-O2", "A-O3", "A-O4", "A-O5", "A-O6", "A-O7", "A-O8", "A-X10", "A-X6"]
  )
  const byDisposition = Object.fromEntries(summary.mandatory.map((m) => [m.id, m.disposition]))
  for (const id of ["A-O1", "A-O2", "A-O3", "A-O4", "A-O5", "A-O6", "A-O8"]) assert.equal(byDisposition[id], "keyed", id)
  assert.equal(byDisposition["A-X6"], "refusal")
  assert.equal(byDisposition["A-O7"], "tool")
  assert.equal(byDisposition["A-X10"], "tool")
})

test("the four RULING-3-derived gap rows are exactly the ones left after the hub's correction", () => {
  const { rows } = loadExam()
  const byId = new Map(rows.map((r) => [r.id, r]))
  for (const id of ["A-E6", "A-E12", "A-M6", "A-M19"]) assert.equal(byId.get(id)?.disposition, "gap", id)
})

test("A-H13 is keyed, not gap — corrected predicate: gap only if ALL meeting sources are absent, and pt 2 is present", () => {
  const { rows } = loadExam()
  const h13 = rows.find((r) => r.id === "A-H13")
  assert.equal(h13.disposition, "keyed")
  assert.ok(!h13.tags.includes("gap"), "the gap tag must not survive the correction, or classifyByTags would re-gap it")
  assert.match(h13.detail, /THIN EVIDENCE/, "the pt 1 gap must stay visible in the detail column even though the row itself is keyed")
})

test("fence coverage is enumerable by tag — exactly the five rows the hub named, and tagging changed no disposition", () => {
  const { rows } = loadExam()
  const fenced = rows.filter((r) => r.tags.includes("fence")).map((r) => r.id)
  // Six entries: the five union rows plus X8-notowner, which inherits the
  // tag from its parent A-X8 rather than naming a sixth source row.
  assert.deepEqual(fenced.sort(), ["A-H12", "A-H3", "A-X8", "A-X9", "B-G4", "X8-notowner"].sort())
  // Additive only: A-H3 and A-H12 keep every tag they had before, and
  // neither picked up a new disposition — `fence` has no classifyByTags
  // rule, so `count` (already present on both) still decides them.
  const byId = new Map(rows.map((r) => [r.id, r]))
  assert.deepEqual(byId.get("A-H3").tags.sort(), ["count", "fence", "person", "synth"].sort())
  assert.equal(byId.get("A-H3").disposition, "tool")
  assert.deepEqual(byId.get("A-H12").tags.sort(), ["count", "fence", "multi", "person", "route"].sort())
  assert.equal(byId.get("A-H12").disposition, "tool")
  // A-X8's persona split is untouched — still struck, still carrying its
  // own reason, not silently reinterpreted now that other rows are tagged.
  assert.equal(byId.get("A-X8").disposition, "struck")
})
