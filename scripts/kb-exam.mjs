// THE EXAM — 87 questions the owner drafted from four weeks of calendar,
// keyed to real source ids and graded deterministically: is the keyed
// source in the shortlist retrieval actually returned. No model ever
// judges an answer (BUILD-5-knowledge-rebuild.md §9, KB-AUDIT.md §A1: an
// LLM judge flips its own verdict on 13.6% of identical repeats).
//
// ── WHAT THIS FILE OWNS, AND WHAT IT DOESN'T (YET) ──────────────────────
//
// Loading, tagging, classifying and grading are all here and all runnable
// today, offline, against nothing but the exam markdown — no re-index, no
// Vectorize, no other lane. What is NOT here yet is the actual KEYING (the
// real source id(s) behind each row) and the actual RETRIEVAL RUN, because
// both need Lane A/C's re-index to exist first (KB-EXAM.md's own opening
// note: "Not yet done, and Lane E must do it after the re-index"). Until
// then every `keyed` row below carries `sourceIds: null` on purpose —
// grading one throws rather than silently skipping it, because a keyed
// row nobody can score is a gap, not a pass.
//
// ── THE CLASSIFICATION CALL, MADE NOW, WRITTEN DOWN ─────────────────────
//
// A row that cannot be keyed to a real source is not a failing row, it is
// a WRONG row — grading "id in shortlist" against a row with no true id
// measures nothing. So every row gets exactly one disposition before any
// score exists: `keyed` (graded by id-in-shortlist once the ids are
// filled in), `refusal` (graded by `found === false`), or `struck`
// (excluded from the score, always with a written reason). The default
// read comes off the row's own tags — `classifyByTags` below — and the
// eleven rows the tags get wrong are the CLOSED, reasoned list in
// `OVERRIDES`. Both are decided here, before a single retrieval call has
// run against this exam, per the brief: "you make that call before you
// have seen a single score, then write down which rows moved and why." If
// the keying pass later finds a `keyed` row's named meeting has no
// transcript on staging, the same rule applies retroactively: it becomes
// `refusal` (the correct behaviour — naming nothing — is what an absent
// row already demands), never quietly re-scored after the fact.
//
// ── HOW TO RUN IT ────────────────────────────────────────────────────────
//
//   node scripts/kb-exam.mjs             structural gate (what `npm run check` calls)
//   node scripts/kb-exam.mjs --report    the same, plus the full breakdown
//   node scripts/kb-exam.mjs --update-baseline   rewrite kb-exam-baseline.json
//
// There is deliberately no `--run` here yet: that needs a real `retrieve`
// wired in from workers/content (Lane D territory) and real ids in
// `sourceIds` (Lane E's post-reindex keying pass). `grade()` and
// `shortlistFromAnswer()` below are the seam that run will call — built
// now, exercised by fixtures in scripts/test/kb-exam.test.mjs, so the day
// retrieval exists this file does not change shape, only gains a caller.
//
// ── WHAT THIS COSTS ─────────────────────────────────────────────────────
//
// Nothing. Every mode above is a local markdown parse and a JSON diff —
// no network call, no AI Gateway spend. The retrieval-only run this
// harness is built for (once wired) costs bge-m3 embeddings only, cents
// per full pass (BUILD-5 §3); it is not this file's job to spend more.

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, "..")
const BASELINE_PATH = join(HERE, "kb-exam-baseline.json")

/** THE UNION WINS. KB-EXAM.md ("84 calendar events") and
 * KB-EXAM-TRANSCRIPTS.md (the grounded rewrite, "71 sources ≥15 pieces" —
 * rescued from an untracked file that was one `rm` from gone, see
 * scripts/kb-exam-merge.mjs) turned out to share 75 of their ~87 rows once
 * read as text rather than by id; KB-EXAM-UNION.md is the hub-ruled merge
 * of both (100 distinct questions, every id namespaced by origin — RULING
 * 1: key on text, never on id). The two source files are kept as fallbacks
 * only for a worktree that predates the merge; once the union exists it is
 * canon and the sources are read-only history. */
const EXAM_CANDIDATES = [
  join(REPO, ".plans", "KB-EXAM-UNION.md"),
  join(REPO, ".plans", "KB-EXAM.md"),
  join(REPO, ".plans", "kb-exam-draft.md"),
]

export function findExamFile() {
  for (const p of EXAM_CANDIDATES) if (existsSync(p)) return p
  throw new Error(`kb-exam: no exam file found — looked for ${EXAM_CANDIDATES.join(", ")}`)
}

/* ------------------------------ vocabulary --------------------------- */

export const KNOWN_TAGS = new Set([
  "para",
  "exact",
  "count",
  "latest",
  "multi",
  "person",
  "de",
  "fence",
  "absent",
  "hijack",
  "route",
  "synth",
  // KB-EXAM-TRANSCRIPTS.md's own tag, carried into the union: "the meeting
  // happened but no notes exist". Grades as its own disposition (`gap`,
  // below) — a name-the-meeting-and-say-nothing-was-recorded claim, which
  // is a different pass condition from a plain refusal.
  "gap",
  // KB-EXAM.md's printed "Tags:" legend does not list this one, but it
  // appears on O2 and X16 and is unambiguous in context — a German
  // client name given the way a person would actually say it
  // ("Asekurans" for Assecuranz). Recognised here rather than treated as
  // a typo; flagged to the hub so the legend line gets the fourteenth
  // word it is missing.
  "de-name",
])

// "G" (honest gaps) is KB-EXAM-TRANSCRIPTS.md's own level, carried into
// the union — three of its rows (the ones with no A-side counterpart at
// all) live under it; the other two gap-tagged B rows merged into A rows
// and kept A's E-level.
export const KNOWN_LEVELS = new Set(["O", "E", "M", "H", "X", "G", "DE"])

/* -------------------------------- parsing ------------------------------ */

function levelForSection(title) {
  const t = title.trim()
  if (/^the owner's eight/i.test(t)) return "O"
  const m = /^([A-Za-z]+)\s*·/.exec(t)
  if (!m) throw new Error(`kb-exam: section heading carries no level marker: "${title}"`)
  return m[1]
}

/** Turns the exam markdown into flat rows, keeping every tag and every
 * level exactly as written. Deliberately dumb: it does not interpret the
 * fourth column (its meaning changes by section — a named source for most,
 * "expected behaviour" for X) — that interpretation is `classify`'s job,
 * kept separate so a parsing bug and a classification call are never the
 * same diff. */
export function parseExam(markdown) {
  const rows = []
  let section = null
  let level = null
  for (const line of markdown.split("\n")) {
    const heading = /^##\s+(.*)$/.exec(line)
    if (heading) {
      section = heading[1].trim()
      level = levelForSection(section)
      continue
    }
    if (!line.startsWith("|")) continue
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim())
    if (cells.length < 3) continue
    const [id, question, tagsCell, ...rest] = cells
    // Bare ids ("O1") for the two source drafts; "A-O1" / "B-G3" for the merged
    // union file (RULING 1: namespaced by origin, never renumbered).
    if (!/^([AB]-)?[A-Za-z]+\d+$/.test(id)) continue // header row ("#") or the "---" separator
    if (!section) throw new Error(`kb-exam: row ${id} appears before any section heading`)
    rows.push({
      id,
      section,
      level,
      question,
      tags: tagsCell
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      detail: rest.join(" | ").trim(),
    })
  }
  return rows
}

/* ----------------------------- classification --------------------------- */

/** THE DEFAULT READ, off tags alone.
 *
 * `tool` is its own disposition, deliberately separate from `struck`. The
 * hub named two count-tagged rows (O7, X10) "unstrikeable" — part of the
 * ten canaries that must always pass — and a bucket called "struck" cannot
 * also be called unstrikeable, whatever the reasoning under it. `tool` says
 * plainly what is true of every count-tagged row: id-in-shortlist does not
 * apply to it (there is no passage to shortlist — it is answered by a door
 * call), it is never scored by THIS harness, and it is never dropped —
 * the full-loop exam grades it against the tool call instead. */
function classifyByTags(tags) {
  // A `gap` row is its own claim — "name the meeting, say nothing was
  // recorded" — checked first because it is the more specific fact about
  // the row; `absent`/`fence` never co-occur with it in practice, but if
  // they ever did, "the meeting exists and has nothing" outranks "refuse
  // outright" as the truer description of what a gap row asks for.
  if (tags.includes("gap")) return { disposition: "gap", sourceIds: null, needsKeyingAfterReindex: true }
  // The exam's own legend: "count needs a tool". KB-AUDIT.md §4.7 measured
  // exactly this failure mode live — counting and "which client has
  // most" questions answered confidently from two or three unrelated
  // passages.
  if (tags.includes("count"))
    return {
      disposition: "tool",
      reason:
        'tagged `count` — the exam\'s legend defines count as "needs a tool"; resolved by an app/ticket/meeting-count/contact door, never a passage (KB-AUDIT §4.7: counting and aggregation are not retrieval problems). Graded by the full-loop exam against the tool call, not by id-in-shortlist — never dropped.',
    }
  if (tags.includes("absent")) return { disposition: "refusal" }
  return { disposition: "keyed", sourceIds: null, needsKeyingAfterReindex: true }
}

/** THE TEN ROWS THE HUB NAMED UNSTRIKEABLE, verbatim: the owner's eight,
 * plus the refusal canary (a question with an obviously nonexistent
 * source) and the counting canary (KB-AUDIT §4.7's "failing invisibly"
 * class). Two of the ten — A-O7 and A-X10 — are `tool` rows: mandatory,
 * but graded by the full-loop exam rather than this harness, which is
 * exactly why they need their own flag rather than living only inside
 * `struck`'s reasons where "excluded" and "must always pass" would read
 * as the same thing. `validateExam` fails if any of these ten ever stops
 * existing. Ids are the UNION's namespaced ones (RULING 1) — every one of
 * the ten turned out to be a duplicate present in both source files, so
 * each keeps its A-side id (scripts/kb-exam-merge.mjs's MATCHES table is
 * the audit trail for exactly which B-side row it merged with). */
export const MANDATORY_CANARIES = new Set(["A-O1", "A-O2", "A-O3", "A-O4", "A-O5", "A-O6", "A-O7", "A-O8", "A-X6", "A-X10"])

/** THE CLOSED LIST OF EXCEPTIONS the tags alone get wrong — decided now,
 * before any retrieval has run against this exam, each with the reason a
 * later reader needs to judge whether it still holds. Nothing here may be
 * added or changed after seeing a row fail; that is a stop-and-report,
 * not an edit to this file. Ids are the union's namespaced ones; every one
 * of these six turned out to be a duplicate present in both source files
 * (scripts/kb-exam-merge.mjs's MATCHES table has the B-side partner), so
 * each keeps its A-side id under RULING 1. Two more rows (A-M6, A-M19)
 * are pushed to `gap` by scripts/kb-exam-merge.mjs itself (RULING 3's
 * derivation) rather than listed here — see the comment below. A-H13 was
 * briefly a third until the hub corrected the derivation's predicate: it
 * cites two meeting sources and only one is absent, so it is `keyed`
 * (plain, no override) with a thin-evidence note in its detail column
 * instead. */
export const OVERRIDES = {
  "A-X1": {
    disposition: "struck",
    reason:
      "hijack row with a purely negative expectation (\"must NOT narrow to 'VU Solutions'\") — no positive source id exists to key, and id-in-shortlist cannot express a negative constraint.",
  },
  "A-X2": {
    disposition: "struck",
    reason: "same shape as A-X1 (\"must NOT narrow to 're-green'\") — no positive id to key.",
  },
  "A-X3": {
    disposition: "struck",
    reason:
      "disjunctive expectation — \"resolves Markus as a person OR refuses\" — two disjoint correct behaviours have no single id-in-shortlist/refusal expression.",
  },
  "A-X8": {
    disposition: "struck",
    reason:
      "two different correct behaviours by asker identity under one row id (owner may answer from his private calendar; Aurora must refuse). This harness has no persona-aware grading yet — retrieve() would need the caller's guard threaded through, which is Lane D territory. See the derived X8-notowner row below for the half gradeable today.",
  },
  "A-X18": {
    disposition: "struck",
    reason:
      "the question names no specific week recap and four exist (14, 21, 28 Aug, 4 Sep) — no single keyable id without the owner picking one during the keying pass.",
  },
  "A-X20": {
    disposition: "struck",
    reason:
      'aggregation across all clients — KB-AUDIT §4.7 names exactly this class ("recurring complaints across our clients") as not a retrieval problem, and the expected behaviour is disjunctive ("answers OR says it cannot generalise — never a bare refusal"), which id-in-shortlist/refusal cannot express.',
  },
  // RULING 3's corrected derivation (over KB-EXAM-TRANSCRIPTS.md's "left
  // out on purpose" footer — the only staging-checked oracle either file
  // has, and the predicate: gap only if ALL of a row's meeting sources are
  // on that list) converts four A rows to `gap`. Two (A-E6, A-E12) get it
  // for free because they merged with a B row carrying the tag natively
  // (B-G2, B-G1); the other two (A-M6, A-M19) did not merge with anything,
  // so scripts/kb-exam-merge.mjs writes `gap` straight into their tags —
  // no override needed here either. `classifyByTags`'s tag rule is the
  // ONE mechanism for all four; see each row's `detail` column in
  // KB-EXAM-UNION.md for the derivation's reasoning (score, which
  // left-out entry it resolved to, and — for A-M19 — why its "ticket
  // record" mention does not count as a competing source). A-H13 was
  // the derivation's one false positive under the ORIGINAL predicate
  // ("resolves to" rather than "entirely resolves to") — it cites pt 1
  // (absent) AND pt 2 (present, 23 pieces), so gapping it would have
  // failed a system for correctly answering from pt 2. It is `keyed`
  // instead, to pt 2, with the pt 1 gap named in its detail column — the
  // exam's one row testing partial knowledge rather than absence.
}

/** X8's non-owner half is a real, gradeable claim the union's own footer
 * requires to pass 100% of the time: "every absent row, every gap row,
 * and the non-owner half of X8". Striking A-X8 outright would lose that
 * claim entirely, so this derives the one half of it this harness CAN
 * check without a persona model: asked as anyone but the owner, the
 * pickleball question must refuse. A-X8 itself is kept, unmodified,
 * alongside it — the brief says keep every row, this only adds one. */
const DERIVED_ROWS = [
  {
    id: "X8-notowner",
    derivedFrom: "A-X8",
    section: "X · Adversarial — the ones that used to break it",
    level: "X",
    question: "When is pickleball this week?",
    tags: ["fence"],
    detail: "Aurora asking: refuse (private-shelf event)",
    disposition: "refusal",
  },
]

export function classify(row) {
  const decided = OVERRIDES[row.id] ?? classifyByTags(row.tags)
  return { ...row, ...decided, mandatory: MANDATORY_CANARIES.has(row.id) }
}

/** THE KEYING MECHANISM. `.plans/KB-EXAM.md`'s own words: "key every row to
 * the source id(s) that answer it... [until then] a row is graded by
 * hand." Real ids cannot exist before Lane A/C's re-index runs, so this
 * file starts EMPTY — `{}` — and is edited only during the post-reindex
 * keying pass, one row id to one array of real source ids. It is
 * DELIBERATELY SEPARATE from KB-EXAM-UNION.md: the union is the questions
 * and their editorial classification (tags → disposition), which the hub
 * rules on; the keys are a fact about the re-indexed database, which
 * nobody can state until it exists. Keeping them apart means a keying
 * pass is a diff to ONE small JSON file, never a hand-edit of the
 * generated union markdown that scripts/kb-exam-merge.mjs would then
 * flag as drifted. */
const KEYS_PATH = join(HERE, "kb-exam-keys.json")

export function loadKeys(path = KEYS_PATH) {
  if (!existsSync(path)) return {}
  return JSON.parse(readFileSync(path, "utf8"))
}

/** A row with NO entry in `keys` is untouched — its `sourceIds` stays
 * whatever `classify()` set it to (null for `keyed`/`gap`), which is
 * exactly today's behaviour: ungraded, reported only in the structural
 * summary, "by hand" until the keying pass reaches it. A row WITH an
 * entry gets `sourceIds` set from the file, so `grade()` can score it the
 * moment a real (or, for the mutation proof, a fabricated) retrieval
 * result exists. Applying this to every disposition uniformly is
 * harmless — `grade()` only ever reads `sourceIds` for `keyed`/`gap`. */
export function applyKeys(rows, keys) {
  return rows.map((row) => (row.id in keys ? { ...row, sourceIds: keys[row.id] } : row))
}

export function loadExam(path = findExamFile(), keysPath = KEYS_PATH) {
  const markdown = readFileSync(path, "utf8")
  const rows = parseExam(markdown).map(classify)
  const all = [...rows, ...DERIVED_ROWS.map((r) => ({ ...r }))]
  return { path, rows: applyKeys(all, loadKeys(keysPath)) }
}

/* ------------------------------- validation ------------------------------ */

/** Structural invariants only — no retrieval involved. This is what makes
 * the exam file itself part of the gate: a typo'd tag, a row that lost its
 * disposition, or a struck row whose reason got deleted turns the build
 * red here, long before it could turn a score red. */
export function validateExam({ rows }) {
  const problems = []
  const seen = new Set()
  for (const row of rows) {
    if (seen.has(row.id)) problems.push(`duplicate row id ${row.id}`)
    seen.add(row.id)
    if (!KNOWN_LEVELS.has(row.level)) problems.push(`${row.id}: unknown level "${row.level}"`)
    if (!row.tags.length) problems.push(`${row.id}: no tags`)
    for (const t of row.tags) if (!KNOWN_TAGS.has(t)) problems.push(`${row.id}: unknown tag "${t}"`)
    if (!["keyed", "refusal", "gap", "tool", "struck"].includes(row.disposition)) problems.push(`${row.id}: no disposition`)
    if ((row.disposition === "struck" || row.disposition === "tool") && !row.reason)
      problems.push(`${row.id}: ${row.disposition} with no reason`)
  }
  for (const id of MANDATORY_CANARIES) if (!seen.has(id)) problems.push(`mandatory canary ${id} is missing from the exam`)
  return problems
}

/** Catches a stale or typo'd key BEFORE it silently grades nothing (a key
 * naming a row that no longer exists) or grades something it can't (a key
 * on a `refusal`/`tool`/`struck` row, none of which read `sourceIds`). Run
 * against the raw `keys` object, separately from `validateExam`, because
 * a keys-file problem is a fact about the keying pass, not about the
 * exam's own editorial structure. */
export function validateKeys(rows, keys) {
  const problems = []
  const byId = new Map(rows.map((r) => [r.id, r]))
  for (const [id, sourceIds] of Object.entries(keys)) {
    const row = byId.get(id)
    if (!row) {
      problems.push(`kb-exam-keys.json: ${id} does not exist in the loaded exam`)
      continue
    }
    if (row.disposition !== "keyed" && row.disposition !== "gap")
      problems.push(`kb-exam-keys.json: ${id} is disposition "${row.disposition}", which never reads sourceIds`)
    if (!Array.isArray(sourceIds) || sourceIds.length === 0) problems.push(`kb-exam-keys.json: ${id} must key to a non-empty array of source ids`)
  }
  return problems
}

/* --------------------------------- grading -------------------------------- */

/** THE ONE DETERMINISTIC RULE. `result` is whatever the real retrieval
 * call eventually returns, reduced to the two facts a grader needs — no
 * model, no scoring rubric, nothing else. A `keyed` row with no
 * `sourceIds` throws rather than silently passing/failing: it means the
 * post-reindex keying pass has not reached this row yet, and a harness
 * that graded it anyway would report a number about a row nobody has
 * actually keyed. */
export function grade(row, result) {
  // Neither is scored HERE — `tool` because id-in-shortlist cannot judge a
  // door call, `struck` because the row's own expectation is negative or
  // disjunctive. Only `tool` is on the mandatory-canary list; `grade`
  // itself does not special-case that, because "must always pass" is a
  // fact about the full-loop exam's obligations, not about this function.
  if (row.disposition === "struck" || row.disposition === "tool") return { row, scored: false }
  if (row.disposition === "refusal") return { row, scored: true, correct: result.found === false }
  // `gap` grades like a refusal WITH A NAME ATTACHED — the hub's own
  // words, and a different pass condition from a plain refusal on
  // purpose. A bare refusal only needs `found === false`; a gap row must
  // also show retrieval correctly located the meeting's own (contentless)
  // source, or a system that never looked at all would pass identically to
  // one that looked, found the placeholder, and honestly said so. So it
  // needs `sourceIds` exactly as `keyed` does — the meeting's own record,
  // not a transcript — and both conditions must hold.
  if (row.disposition === "gap") {
    if (!row.sourceIds || row.sourceIds.length === 0)
      throw new Error(`${row.id} is disposition "gap" but has no sourceIds — run the keying pass before grading it`)
    return {
      row,
      scored: true,
      correct: result.found === false && row.sourceIds.some((id) => result.shortlistIds.includes(id)),
    }
  }
  if (!row.sourceIds || row.sourceIds.length === 0)
    throw new Error(`${row.id} is disposition "keyed" but has no sourceIds — run the keying pass before grading it`)
  return {
    row,
    scored: true,
    correct: result.found === true && row.sourceIds.some((id) => result.shortlistIds.includes(id)),
  }
}

/** The shortlist a grader checks against: every distinct source id
 * retrieval actually surfaced, before composition ever runs. Same shape
 * `retrieve()` in workers/content/src/lib/knowledge.ts already returns
 * (`passages[].sourceId`) — this file does not redefine that contract,
 * only reduces it to what `grade` needs. */
export function shortlistFromAnswer(answer) {
  return [...new Set((answer.passages ?? []).map((p) => p.sourceId).filter(Boolean))]
}

/* ---------------------------------- scoring --------------------------------- */

/** THE ACTUAL GRADING RUN, over whatever retrieval results exist —
 * fabricated (the mutation proof below, and every unit test), or real
 * (Half Two's prepared retrieval-only pass, once the hub authorises it).
 * `resultsByRowId` may be partial: a row with no result yet is skipped,
 * never scored as a failure, so this can run against an in-progress pass
 * without reporting phantom zeros. `tracker item e-refusals` requires
 * every refusal-disposition row to score 100% — `refusalCeilingMet` is
 * that assertion made checkable, not just a number a person has to eyeball
 * in a percentage column. */
export function scoreExam(rows, resultsByRowId) {
  const graded = []
  for (const row of rows) {
    const result = resultsByRowId[row.id]
    if (!result) continue
    graded.push(grade(row, result))
  }
  const scored = graded.filter((g) => g.scored)
  const byTag = {}
  for (const g of scored) {
    for (const t of g.row.tags) {
      byTag[t] ??= { pass: 0, total: 0 }
      byTag[t].total++
      if (g.correct) byTag[t].pass++
    }
  }
  const refusalGraded = scored.filter((g) => g.row.disposition === "refusal")
  const refusalFailures = refusalGraded.filter((g) => !g.correct).map((g) => g.row.id)
  return {
    attempted: graded.length,
    scored: scored.length,
    passed: scored.filter((g) => g.correct).length,
    byTag,
    refusalGraded: refusalGraded.length,
    refusalFailures,
    // The gate tracker item e-refusals actually cares about: true only
    // when every graded refusal row passed. Vacuously true (and reported
    // as such) if none were graded yet — a partial run must not read as
    // "the ceiling holds" when it never checked.
    refusalCeilingMet: refusalFailures.length === 0,
  }
}

/** THE BUILD-FAILING FORM of the assertion above. Exits nonzero and names
 * every failing refusal row the moment one exists — this is what turns
 * "the refusal tag scores 100%" from a number in a report into something
 * that can actually fail a run. Called by Half Two's prepared script once
 * real results exist; exercised now, with fabricated results, by the
 * mutation proof in scripts/test/kb-exam.test.mjs. */
export function enforceRefusalCeiling(score) {
  if (score.refusalCeilingMet) return
  throw new Error(
    `refusal ceiling breached: ${score.refusalFailures.length}/${score.refusalGraded} refusal row(s) failed — ${score.refusalFailures.join(", ")}`
  )
}

/* ---------------------------------- report --------------------------------- */

function countBy(rows, fn) {
  return rows.reduce((acc, r) => {
    const k = fn(r)
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
}

export function summarize(rows) {
  return {
    total: rows.length,
    byDisposition: countBy(rows, (r) => r.disposition),
    byLevel: countBy(rows, (r) => r.level),
    byTag: rows.reduce((acc, r) => {
      for (const t of r.tags) acc[t] = (acc[t] ?? 0) + 1
      return acc
    }, {}),
    // The union's own footer: "Must score 100%: every absent row, every
    // gap row, and the non-owner half of X8." `refusal` covers absent +
    // the derived non-owner row; `gap` is its own disposition and just as
    // mandatory, so both are in the ceiling.
    mustScore100: rows.filter((r) => r.disposition === "refusal" || r.disposition === "gap").map((r) => r.id),
    tool: rows.filter((r) => r.disposition === "tool").map((r) => ({ id: r.id, reason: r.reason })),
    struck: rows.filter((r) => r.disposition === "struck").map((r) => ({ id: r.id, reason: r.reason })),
    mandatory: rows
      .filter((r) => r.mandatory)
      .map((r) => ({ id: r.id, disposition: r.disposition }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  }
}

function fmtCounts(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${k}:${v}`)
    .join("  ")
}

export function formatReport(summary, examPath) {
  const lines = [
    `kb-exam — ${summary.total} rows loaded from ${examPath}`,
    `  disposition   ${fmtCounts(summary.byDisposition)}`,
    `  level         ${fmtCounts(summary.byLevel)}`,
    `  tag           ${fmtCounts(summary.byTag)}`,
    `  must score 100% (${summary.mustScore100.length}): ${summary.mustScore100.join(", ")}`,
    `  the ten mandatory canaries (${summary.mandatory.length}):`,
  ]
  for (const m of summary.mandatory)
    lines.push(`    ${m.id} — ${m.disposition}${m.disposition === "tool" ? "  (full-loop exam only — not scored here, never dropped)" : ""}`)
  lines.push(`  tool, graded by the full-loop exam's tool call, not scored here (${summary.tool.length}):`)
  for (const t of summary.tool) lines.push(`    ${t.id} — ${t.reason}`)
  lines.push(`  struck, excluded from the score (${summary.struck.length}):`)
  for (const s of summary.struck) lines.push(`    ${s.id} — ${s.reason}`)
  return lines.join("\n")
}

/* --------------------------------- baseline --------------------------------- */

/** No re-index has run yet, so there is no retrieval SCORE to pin (BUILD-5
 * §9: "the first full run sets the baseline" — that is the hub's job,
 * after Lanes A/C/D land). What CAN be pinned now, and is, is the exam's
 * own STRUCTURE: row counts by disposition/level/tag, and which rows are
 * struck and why. `retrieval: null` is the documented placeholder the hub
 * fills in once a real run exists; this file's gate does not wait on it. */
export function structuralBaseline(summary, examPath) {
  return {
    examFile: examPath.split("/").slice(-2).join("/"),
    total: summary.total,
    byDisposition: summary.byDisposition,
    byLevel: summary.byLevel,
    byTag: summary.byTag,
    mustScore100: summary.mustScore100,
    mandatory: summary.mandatory,
    retrieval: null,
  }
}

export function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return null
  return JSON.parse(readFileSync(BASELINE_PATH, "utf8"))
}

export function writeBaseline(baseline) {
  writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`)
}

/* ------------------------------------ CLI ------------------------------------ */

function statusLine(s) {
  return `${s.byDisposition.keyed ?? 0} keyed pending re-index, ${s.byDisposition.refusal ?? 0} refusal, ${s.byDisposition.gap ?? 0} gap, ${s.byDisposition.tool ?? 0} tool, ${s.byDisposition.struck ?? 0} struck`
}

function main() {
  const args = process.argv.slice(2)
  const { path, rows } = loadExam()
  const problems = [...validateExam({ rows }), ...validateKeys(rows, loadKeys())]
  if (problems.length) {
    console.error(`kb-exam: ${problems.length} structural problem(s):`)
    for (const p of problems) console.error(`  ${p}`)
    process.exit(1)
  }

  const summary = summarize(rows)
  if (args.includes("--report") || args.includes("--verbose")) console.log(formatReport(summary, path))

  const fresh = structuralBaseline(summary, path)
  if (args.includes("--update-baseline")) {
    writeBaseline(fresh)
    console.log(`kb-exam: baseline written to ${BASELINE_PATH}`)
    process.exit(0)
  }

  const baseline = loadBaseline()
  if (!baseline) {
    console.error("kb-exam: no baseline on disk — run with --update-baseline once, then commit scripts/kb-exam-baseline.json")
    process.exit(1)
  }
  if (JSON.stringify(baseline) !== JSON.stringify(fresh)) {
    console.error("kb-exam: the exam's structure has drifted from the committed baseline.")
    console.error(`  baseline: ${JSON.stringify(baseline)}`)
    console.error(`  current:  ${JSON.stringify(fresh)}`)
    console.error("  if the drift is intentional (a row re-tagged, struck, added, or keyed), re-run with --update-baseline and commit the new file.")
    process.exit(1)
  }
  console.log(`kb-exam: structure OK — ${summary.total} rows (${statusLine(summary)})`)
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
