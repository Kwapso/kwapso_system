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
  // X1 is tagged only "hijack" — the default would read that as keyed —
  // but the closed OVERRIDES list strikes it. If this ever fails, either
  // KB-EXAM.md dropped X1's tags or someone edited OVERRIDES without
  // reading the reason attached to it.
  assert.ok(OVERRIDES.X1)
  const row = classify({ id: "X1", tags: ["hijack"], question: "" })
  assert.equal(row.disposition, "struck")
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

/* ---------------- pinned against the real, committed exam file ---------------- */

test("the real KB-EXAM.md loads clean and every tag it uses is recognised", () => {
  const path = findExamFile()
  assert.match(path, /KB-EXAM\.md$/, "the canonical file should exist and win over the fallback name")
  const { rows } = loadExam(path)
  const problems = validateExam({ rows })
  assert.deepEqual(problems, [])
  for (const row of rows) for (const t of row.tags) assert.ok(KNOWN_TAGS.has(t), `${row.id}: tag "${t}" is not in KNOWN_TAGS`)
})

test("the classification call over the real exam is pinned — 87 rows + 1 derived, 67 keyed / 8 refusal / 7 tool / 6 struck", () => {
  const { rows } = loadExam()
  const summary = summarize(rows)
  assert.equal(summary.total, 88, "87 drafted rows + the derived X8-notowner row")
  assert.equal(summary.byDisposition.keyed, 67)
  assert.equal(summary.byDisposition.refusal, 8)
  assert.equal(summary.byDisposition.tool, 7)
  assert.equal(summary.byDisposition.struck, 6)
  // The eight rows the exam's own footer says must score 100%: the seven
  // absent-tagged rows plus the derived non-owner half of X8.
  assert.deepEqual(
    summary.mustScore100.sort(),
    ["D10", "D9", "X4", "X5", "X6", "X7", "X8-notowner", "X9"].sort()
  )
})

test("every struck or tool row names a reason a stranger could evaluate", () => {
  const { rows } = loadExam()
  const named = rows.filter((r) => r.disposition === "struck" || r.disposition === "tool")
  for (const row of named) assert.ok(row.reason && row.reason.length > 20, `${row.id} needs a real reason, not a stub`)
})

test("the ten mandatory canaries the hub named exist, and only O7/X10 are graded elsewhere (tool)", () => {
  const { rows } = loadExam()
  const problems = validateExam({ rows })
  assert.deepEqual(problems, [], "validateExam must fail loudly if a canary ever goes missing")
  assert.equal(MANDATORY_CANARIES.size, 10)
  const summary = summarize(rows)
  assert.deepEqual(
    summary.mandatory.map((m) => m.id),
    ["O1", "O2", "O3", "O4", "O5", "O6", "O7", "O8", "X10", "X6"]
  )
  const byDisposition = Object.fromEntries(summary.mandatory.map((m) => [m.id, m.disposition]))
  for (const id of ["O1", "O2", "O3", "O4", "O5", "O6", "O8"]) assert.equal(byDisposition[id], "keyed", id)
  assert.equal(byDisposition.X6, "refusal")
  assert.equal(byDisposition.O7, "tool")
  assert.equal(byDisposition.X10, "tool")
})
