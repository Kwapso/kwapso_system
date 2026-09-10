// THE UNION GENERATOR — builds .plans/KB-EXAM-UNION.md from the two source
// drafts the hub ruled must both survive, unmodified:
//
//   .plans/KB-EXAM.md              ("A") — 87 rows, "84 calendar events"
//   .plans/KB-EXAM-TRANSCRIPTS.md  ("B") — 88 rows, "71 sources ≥15 pieces",
//                                          rescued from an untracked file
//
// Measured by reading every row's TEXT (never its id — RULING 1: "83 ids
// collide while only 29 are the same question... id is not a key here").
// 75 rows are the same question in both files; 12 exist only in A; 13 exist
// only in B. 100 distinct questions total. Every match below was read by a
// human-equivalent pass over the actual sentences, not accepted from a
// similarity score — the score picked candidates, a reading of both
// sentences decided. Two candidates the scorer raised were REJECTED for
// the same reason (RULING 4, hub-confirmed, no second read needed):
//
//   A.H13 "recruiter's maths, over the two sessions" vs
//   B.H11 "CV-upload work... over its two sessions"
//     — different topics; the only shared words are the structural phrase
//       "over its/the two sessions".
//   A.H8 "Padelbase... review across the week" has a weak echo in
//   B.M17 "Padelbase review conclude" (a coincidence: both are about a
//       Padelbase review) — A.H8's real match is B.H7 (same question,
//       clearly), and B.M17 is kept as B's own distinct question.
//
// ── RULING 1: KEY ON TEXT, NEVER ON ID — every union row is namespaced ──
//
// Every row keeps a stable id from its origin: `A-E6`, `B-G3`. A matched
// pair keeps its A-side id as primary (A drafted first, and every prior
// report/commit in this exam's history already cites A's ids) and records
// the B-side id in its `detail` column so the match survives being read
// off the page alone. Nothing is renumbered into a fresh sequence.
//
// ── RULING 3: B WINS THE GAP CONFLICT, DERIVED, NOT HAND-LISTED ──
//
// B's own footer names nine meetings its ≥15-piece staging check found had
// no transcript ("Left out on purpose"). That footer is the only
// staging-checked oracle either file has, so DERIVED_GAP_ROWS below is
// every A row whose own source description resolves to one of those nine
// — found by scoring every one of A's 87 rows against all nine entries
// (word-overlap on the source `detail` text, ignoring stopwords) and then
// reading each candidate above the noise floor. The scored candidates
// prove the closed list is complete without hand-listing which rows to
// check: two A rows (E6, E12) already merge with a B row that carries
// its own `gap` tag natively (B.G2, B.G1) — their disposition comes free
// from the tag union below and needs no entry here. The other five of
// the nine left-out meetings have no B row at all, and three A rows
// resolve to them: M6→HORST matching test run and M19→FluClinic task
// 3144 are both `gap` (their one MEETING source is fully absent — M19's
// "ticket record" mention is a different door, never a candidate for the
// ≥15-piece check, so it is not a competing source). H13→HOGO×Claude math
// pt 1 does NOT stay gap: it also cites pt 2 (26 Aug), which DOES have a
// transcript, so the corrected rule (RULING 3, corrected: a row is gap
// only if ALL its meeting sources are absent — the first pass wrongly
// gap'd this one, which would have failed a system that correctly
// answered from pt 2) files it `keyed` to pt 2 instead, with the pt 1 gap
// recorded in its detail column — the exam's one THIN-EVIDENCE row. The
// remaining four left-out
// meetings (Alaap/Alexander 27 Aug, HOGO syncs 3/7/9 Sep, FluClinic
// planning call 2 Sep, plus the already-covered ones) have NO row in
// either file — nothing to convert, nothing lost.
//
//   node scripts/kb-exam-merge.mjs             writes .plans/KB-EXAM-UNION.md
//   node scripts/kb-exam-merge.mjs --check     regenerates to a temp path and
//                                              diffs against the committed
//                                              file — fails if they differ,
//                                              so a hand-edit of the union
//                                              or an unregenerated source
//                                              change cannot go unnoticed.
//
// Cost: $0. A parse and a markdown render, nothing else.

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { parseExam } from "./kb-exam.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, "..")
const A_PATH = join(REPO, ".plans", "KB-EXAM.md")
const B_PATH = join(REPO, ".plans", "KB-EXAM-TRANSCRIPTS.md")
const UNION_PATH = join(REPO, ".plans", "KB-EXAM-UNION.md")

/** Every confirmed duplicate pair, [aId, bId, kind]. Read by a human pass
 * over both sentences — see the file header. `kind` documents HOW it was
 * found, for the next reader auditing this list rather than trusting it. */
const MATCHES = [
  // exact text, same id in both files (27)
  ...["O1", "O2", "O3", "O4", "O5", "O6", "O7", "O8", "E1", "E4", "E5", "M1", "M2", "M3", "M4", "M5", "M8", "H1", "H2", "H14", "X1", "X2", "X3", "X4", "X5", "X6", "D1"].map((id) => [id, id, "exact-same-id"]),
  // exact text, id drifted (a shift caused by an insertion/deletion upstream in the same section) (35)
  ...[["E7", "E6"], ["E8", "E7"], ["E10", "E8"], ["E11", "E9"], ["M15", "E14"], ["M7", "M6"], ["M10", "M9"], ["M12", "M10"], ["M13", "M11"], ["M14", "M12"], ["M18", "M14"], ["M20", "M15"], ["H5", "H4"], ["H6", "H5"], ["H7", "H6"], ["H11", "H10"], ["H15", "H12"], ["X8", "X7"], ["X10", "X8"], ["X11", "X9"], ["X12", "X10"], ["X13", "X11"], ["X14", "X12"], ["X15", "X13"], ["X17", "X14"], ["X18", "X15"], ["X19", "X16"], ["X20", "X17"], ["D3", "D2"], ["D4", "D3"], ["D5", "D4"], ["D6", "D5"], ["D7", "D6"], ["D8", "D7"], ["D9", "D8"]].map(([a, b]) => [a, b, "exact-shifted-id"]),
  // same question reworded, same id (2)
  ...["E2", "E3"].map((id) => [id, id, "reworded-same-id"]),
  // same question reworded, id drifted (11)
  ...[["M17", "E13"], ["E13", "E10"], ["E14", "E11"], ["M16", "M13"], ["H10", "H9"], ["E12", "G1"], ["H8", "H7"], ["M11", "E12"], ["E6", "G2"], ["H12", "H13"], ["H9", "H8"]].map(([a, b]) => [a, b, "reworded-shifted-id"]),
]

/** RULING 3, DERIVED AND CORRECTED: a row is `gap` only if ALL of its
 * MEETING sources are on B's nine "left out on purpose" entries — the
 * hub's fix to the first pass, which asked only whether a row "resolves
 * to" a left-out entry and wrongly gap'd A-H13 (pt 1 absent, pt 2 present
 * — grading that gap would have FAILED a system that correctly answered
 * from pt 2, penalising the right behaviour). "Meeting sources" is scoped
 * deliberately: the nine-entry list, and the ≥15-piece check behind it,
 * measure MEETING TRANSCRIPT coverage — a `ticket record` (A-M19's second
 * mention) is a different door entirely, never a candidate for that check,
 * so it does not count as a competing source the way A-H13's pt 2 does.
 * That reading is what keeps A-M19 a clean gap row (its one meeting source
 * is fully absent) while A-H13 moves to `keyed` (one of its two meeting
 * sources is present). Flagged rather than assumed, per the brief's own
 * rule: any row this changes besides A-H13 is reported as a finding, not
 * silently resolved — this file's header carries that finding for A-M19
 * (considered, not missed).
 *
 * E6 and E12 get `gap` free from the tag union with the natively
 * `gap`-tagged B.G2/B.G1 and need no entry here — both cite exactly one
 * meeting, fully absent, so the corrected rule changes nothing about them
 * either. */
const DERIVED_GAP_OVERRIDES = {
  M6: { leftOut: "HORST matching test run 25 Aug", score: 0.6, note: "same meeting as B.G3, different question (threshold vs. how it went) — not merged with G3, stays a distinct gap row" },
  M19: { leftOut: "FluClinic task 3144 meeting 25 Aug", score: 0.5, note: "no B row exists for this meeting at all; its one MEETING source is fully absent — the 'ticket record' mention is a different door (the tickets module), never a candidate for the ≥15-piece transcript check, so it is not a competing source under the corrected rule" },
}

/** A-H13 moved OUT of DERIVED_GAP_OVERRIDES: it cites two MEETING sources
 * (pt 1, 25 Aug, absent; pt 2, 26 Aug, 23 pieces, present — cited by both
 * B's O3 and M7) and the corrected rule only gaps a row whose sources are
 * ALL absent. Its true disposition is the exam's one THIN-EVIDENCE row —
 * answerable from what exists, with a named gap in what doesn't — so it
 * falls through to plain `keyed` (its tags are just `multi`, nothing
 * forces otherwise) and only needs its detail column corrected to say so;
 * no sixth disposition, per the hub's own instruction. */
const THIN_EVIDENCE_NOTES = {
  H13: 'THIN EVIDENCE, not gap: keyed to "HOGO x Claude math pt 2, 26 Aug (23 pieces)" — pt 1 (25 Aug) has no transcript. A complete answer draws from pt 2 AND names that pt 1 was never recorded; this is the exam\'s one row testing partial knowledge, not absence.',
}

// Disposition (keyed/refusal/gap/tool/struck) is NOT decided here — it is
// computed at load time by scripts/kb-exam.mjs's classify(), the same as
// for the two source files, off this file's tags plus kb-exam.mjs's own
// OVERRIDES table (updated separately to the union's namespaced ids: the
// six single-file overrides all turned out to be duplicate pairs, so they
// now live at A-X1, A-X2, A-X3, A-X8, A-X18, A-X20). This generator's only
// job is to get the right TEXT and TAGS onto the right namespaced id.

const SECTION_TITLE = {
  O: "The owner's eight (mandatory, verbatim)",
  E: "E · Easy",
  M: "M · Medium — the same facts without the words the documents use",
  H: "H · Hard — joins across time and projects",
  X: "X · Adversarial — the ones that used to break it",
  G: "G · Honest gaps — the meeting happened, no notes exist",
  DE: "DE · German",
}
const SECTION_ORDER = ["O", "E", "M", "H", "X", "G", "DE"]

function norm(s) {
  return s.toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"').trim()
}

function buildUnion() {
  const A = parseExam(readFileSync(A_PATH, "utf8"))
  const B = parseExam(readFileSync(B_PATH, "utf8"))
  const byIdA = new Map(A.map((r) => [r.id, r]))
  const byIdB = new Map(B.map((r) => [r.id, r]))

  const matchedA = new Set(), matchedB = new Set()
  const unionRows = []

  for (const [aId, bId, kind] of MATCHES) {
    const a = byIdA.get(aId), b = byIdB.get(bId)
    if (!a) throw new Error(`kb-exam-merge: MATCHES names A.${aId}, which no longer exists in KB-EXAM.md`)
    if (!b) throw new Error(`kb-exam-merge: MATCHES names B.${bId}, which no longer exists in KB-EXAM-TRANSCRIPTS.md`)
    if (matchedA.has(aId)) throw new Error(`kb-exam-merge: A.${aId} matched twice`)
    if (matchedB.has(bId)) throw new Error(`kb-exam-merge: B.${bId} matched twice`)
    matchedA.add(aId); matchedB.add(bId)
    const tags = [...new Set([...a.tags, ...b.tags])]
    const sameText = norm(a.question) === norm(b.question)
    const detailBits = [a.detail]
    if (!sameText) detailBits.push(`(B asked: "${b.question}")`)
    if (norm(a.detail) !== norm(b.detail) && b.detail) detailBits.push(`B source: ${b.detail}`)
    detailBits.push(`[also B-${bId}, ${kind}]`)
    unionRows.push({
      id: `A-${aId}`, section: a.section, level: a.level,
      question: a.question, tags, detail: detailBits.join(" — "),
    })
  }
  for (const a of A) {
    if (matchedA.has(a.id)) continue
    const tags = [...a.tags]
    const derived = DERIVED_GAP_OVERRIDES[a.id]
    if (derived && !tags.includes("gap")) tags.push("gap")
    let detail = derived ? `${a.detail} — [DERIVED gap: matches B's left-out "${derived.leftOut}" (score ${derived.score}); ${derived.note}]` : a.detail
    if (THIN_EVIDENCE_NOTES[a.id]) detail = `${detail} — [${THIN_EVIDENCE_NOTES[a.id]}]`
    unionRows.push({ id: `A-${a.id}`, section: a.section, level: a.level, question: a.question, tags, detail })
  }
  for (const b of B) {
    if (matchedB.has(b.id)) continue
    unionRows.push({ id: `B-${b.id}`, section: b.section, level: b.level, question: b.question, tags: [...b.tags], detail: b.detail })
  }

  const byLevel = new Map()
  for (const r of unionRows) {
    if (!byLevel.has(r.level)) byLevel.set(r.level, [])
    byLevel.get(r.level).push(r)
  }
  for (const rows of byLevel.values()) rows.sort((x, y) => x.id.localeCompare(y.id, undefined, { numeric: true }))

  return { unionRows, byLevel, aTotal: A.length, bTotal: B.length, matchedA: matchedA.size, matchedB: matchedB.size }
}

function render({ unionRows, byLevel, aTotal, bTotal, matchedA, matchedB }) {
  const lines = [
    "# The exam — union of the two source drafts",
    "",
    "Generated by `scripts/kb-exam-merge.mjs` from `.plans/KB-EXAM.md` (A, \"84 calendar",
    "events\") and `.plans/KB-EXAM-TRANSCRIPTS.md` (B, \"71 sources ≥15 pieces\"). Neither",
    "source file is edited by this generator — both stay as evidence of how their",
    "questions were derived. Every id is namespaced by origin (`A-E6`, `B-G3`); nothing",
    "is renumbered. Re-run `node scripts/kb-exam-merge.mjs` after either source changes,",
    "then `--check` to prove this file still matches it.",
    "",
    `**Counts:** A had ${aTotal} rows, B had ${bTotal} rows. ${matchedA} rows are the same`,
    `question in both (confirmed by reading the text, not the id — see the generator's`,
    `own header for why id could not be trusted). ${aTotal - matchedA} exist only in A,`,
    `${bTotal - matchedB} only in B. **${unionRows.length} distinct questions.**`,
    "",
    "Tags: `para` paraphrase · `exact` reference/number · `count` needs a tool · `latest`",
    "recency · `multi` two sources joined · `person` colleague/contact · `de` German ·",
    "`de-name` a German name spelled the way it's said · `fence` permission · `absent`",
    "must refuse · `gap` the meeting happened but no notes exist · `hijack` ordinary word",
    "that is also a name · `route` live record · `synth` many sources.",
    "",
    "Levels: **O** the owner's eight (mandatory) · **E** easy · **M** medium · **H** hard",
    "· **X** adversarial · **G** honest gaps · **DE** German.",
    "",
    "**Must score 100%:** every `absent` row, every `gap` row, and the non-owner half of",
    "X8 (`X8-notowner`, derived in scripts/kb-exam.mjs — asked as anyone but the owner,",
    "the pickleball question must refuse).",
    "",
    "---",
    "",
  ]
  for (const level of SECTION_ORDER) {
    const rows = byLevel.get(level)
    if (!rows || !rows.length) continue
    lines.push(`## ${SECTION_TITLE[level]}`, "", "| # | Question | Tags | Detail |", "|---|---|---|---|")
    for (const r of rows) lines.push(`| ${r.id} | ${r.question} | ${r.tags.join(", ")} | ${r.detail} |`)
    lines.push("")
  }
  return lines.join("\n")
}

function main() {
  const built = buildUnion()
  const rendered = render(built)
  if (process.argv.includes("--check")) {
    if (!existsSync(UNION_PATH)) {
      console.error(`kb-exam-merge: ${UNION_PATH} does not exist — run without --check first`)
      process.exit(1)
    }
    const committed = readFileSync(UNION_PATH, "utf8")
    if (committed !== rendered) {
      const dir = mkdtempSync(join(tmpdir(), "kb-exam-merge-"))
      const freshPath = join(dir, "KB-EXAM-UNION.md")
      writeFileSync(freshPath, rendered)
      console.error("kb-exam-merge: KB-EXAM-UNION.md is stale — the source files changed, or the file was hand-edited.")
      console.error(`  freshly generated copy: ${freshPath}`)
      console.error("  re-run without --check to regenerate, then commit the result.")
      process.exit(1)
    }
    console.log(`kb-exam-merge: KB-EXAM-UNION.md is current (${built.unionRows.length} rows).`)
    process.exit(0)
  }
  writeFileSync(UNION_PATH, rendered)
  console.log(`kb-exam-merge: wrote ${UNION_PATH} — ${built.unionRows.length} rows (${built.matchedA} shared, ${built.aTotal - built.matchedA} A-only, ${built.bTotal - built.matchedB} B-only)`)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
