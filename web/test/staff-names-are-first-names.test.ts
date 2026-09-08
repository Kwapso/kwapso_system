// R54 — THE AGENCY'S OWN PEOPLE ARE NAMED BY THEIR FIRST NAME, AND NOBODY ELSE IS.
//
// THE RULING, 7 Sep 2026, in the client's own words: "upwise, when it's staff who
// records activity, only use the first name, so not Audora Alasa, only Audora. Do
// this across all the app. We only record name and surname for the contacts and
// the customers."
//
// The seam that answers it is `shared/staff-name.ts`, and its header carries the
// argument — the two populations, the three measured reasons the trim happens at
// the RENDER seam and never in a worker, and every awkward input's decision. This
// file does not restate that. It is the other half: the thing that stops the
// ruling from being a find-and-replace somebody did once.
//
// WHY A CENSUS AND NOT A LIST OF SCREENS. "Do this across all the app" is a
// sentence about a POPULATION of fields, and a population a person typed out is a
// population that was correct on the day it was typed. The activity feed is the
// surface she was pointing at; it is not the only one. A staff name reaches a
// screen through `creator_name`, `editor_name`, `user_name`, `actor_name` and four
// more columns, under eleven different names once it is on the wire, and the next
// module adds a twelfth without anybody deciding to. So nothing here is
// hand-listed. The subject is DERIVED TWICE, from two independent places, and the
// two derivations are checked for blindness so that "we found nothing" can never
// read as "there is nothing".
//
// ── DERIVATION ONE: THE COLUMNS, OFF THE WORKERS' OWN WRITES ─────────────────
//
// `toActor` (shared/workers/gating.ts) is the ONLY constructor of an actor in the
// estate, and it builds `name` as `[firstName, lastName].join(" ")`. So every
// stored staff-name snapshot in the product is, without exception, some column
// that `actor.name` was written into. That is a fact about the SOURCE, and it can
// be read rather than remembered: find every write of `actor.name` and ask which
// column it landed in. Four shapes do it, and all four are in the tree today —
// a scan that knew only the first would have missed `actor_name` and `user_name`,
// which are two of the four columns the seam's own header names:
//
//   1 · a PROPERTY on a row object — `creator_name: actor.name`
//   2 · an interpolated `sqlString` in a SET clause — `editor_name = ${sqlString(actor.name)}`
//   3 · POSITIONALLY, out of an `INSERT … VALUES` list, aligned to the column list
//   4 · POSITIONALLY, out of a `.bind(…)` aligned to a `VALUES (?, ?, …)` row
//
// ── DERIVATION TWO: THE FIELDS, OFF THE MAPPINGS AND OFF THE TYPES ───────────
//
// A column is not what a screen reads. The wire name is, and it is renamed on the
// way out — `creator_name` alone leaves the workers as `creatorName`,
// `createdByName`, `authorName`, `addedByName`, `actorName` and `byName`. So the
// second derivation reads the MAPPINGS: every `field: row.<column>` and every
// `<column> AS <alias>` for a column derivation one found.
//
// And a SECOND, INDEPENDENT SOURCE beside it, because a mapping can be missed and
// a type cannot: any `*Name` field in `shared/types.ts` that declares a `*IsClient`
// sibling. A field that has to say WHICH POPULATION it is holding is, by
// construction, a field that holds a person — those flags exist for exactly this
// law, and `raiserName` and `completedByName` reach the census through this door
// and no other.
//
// ── THE JUDGEMENT IS POSITIONAL, THE WAY R20 JUDGES A CHECKED BODY FIELD ─────
//
// "This file reads a staff name" is not yet an offence. Reading one and PUTTING IT
// ON A SCREEN is. Two positions are emphatically not that, and both matter:
//
//   • A pure FORWARD. `createdByName: account.createdByName` moves the value from
//     one census field into another and renders nothing; the screen that finally
//     draws it (`record-chrome.tsx`, `audit-overview.ts`) is where the law asks
//     its question, and asking it here as well would make eight detail screens
//     import a seam they have no use for.
//   • A MATCH position — `.toLowerCase()`, `.localeCompare(`. This is the point of
//     trimming LATE rather than in a worker, and the seam's header spends a
//     numbered paragraph on it: `work_logs.user_name` is a LIKE search term, a
//     sort expression AND a keyset cursor key. A search or a sort that ran on the
//     trimmed word would change which rows are found and where a page breaks.
//
// Everything else is a rendering, and a file with a rendering must resolve it
// through the seam at least once.
//
// ── AND THE RESIDUE IS NAMED RATHER THAN HIDDEN ──────────────────────────────
//
// `STAFF_NAME_RAW` (shared/rules/registry.ts) is the list of screens that read a
// census field, render it, and do NOT resolve it — one line each, with the reason.
// It is rot-checked in both directions: an entry the census would no longer catch
// is a permission nobody needs, and a stale permission is how the next one passes.
// It can only shrink. Empty is the goal.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { STAFF_NAME_RAW } from "@shared/rules/registry"

const ROOT = join(__dirname, "..", "..")

/** Where a staff name is WRITTEN. `shared/workers/` is in scope beside the three
 * workers because `agent_usage_log` — the only `actor_name` column in the product
 * — is written there, by the credits ledger every worker shares. */
const WRITE_ROOTS = [join(ROOT, "workers"), join(ROOT, "shared", "workers")]

/** Where a staff name is READ on a screen. The agency app only: the portal has its
 * own law for this (`web-portal/test/rules.test.ts` checks that a client NEVER
 * meets a staff name at all, which is a stricter question than this one). */
const READ_ROOTS = [join(ROOT, "web", "components"), join(ROOT, "web", "lib"), join(ROOT, "web", "app")]

/** The seam, and nothing else. `personName` (web/lib/identity.ts) is on this list
 * because it is a DELEGATION to `staffName` — the last case in this file holds it
 * to that, so a call to it is a call to the seam. */
const SEAM_CALL = /\b(staffName|staffNameFromSnapshot|describeWithStaffName|personName)\s*\(/

/** A MATCH position: the value is being compared, not shown. See the header. */
const MATCH_POSITION = /\.toLowerCase\s*\(|\.localeCompare\s*\(/

/** `someName: expr.otherName` — a forward from one census field into another. */
const FORWARD = /\b(\w+Name)\s*:\s*[A-Za-z_][\w.?![\]]*\.(\w+Name)\b/

/** Comments stripped, every newline kept, so a `path:line` still means what it
 * says and a census field NAMED in a comment is not counted as a read. */
const code = (source: string): string => stripComments(source)

/* ------------------------------------------------------------------------- */
/* DERIVATION ONE — the columns `actor.name` is stamped into                   */
/* ------------------------------------------------------------------------- */

/** Split on top-level commas only, so `sqlString(a, b)` counts as one item. */
function splitTopLevel(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ""
  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") depth++
    else if (ch === ")" || ch === "]" || ch === "}") depth--
    if (ch === "," && depth === 0) {
      out.push(cur)
      cur = ""
    } else cur += ch
  }
  out.push(cur)
  return out
}

/** The text inside a `(` that has already been consumed, plus the index just past
 * its matching `)`. */
function balanced(text: string, start: number): { body: string; end: number } {
  let depth = 1
  let i = start
  while (i < text.length && depth > 0) {
    if (text[i] === "(") depth++
    else if (text[i] === ")") depth--
    i++
  }
  return { body: text.slice(start, i - 1), end: i }
}

/** Every column an actor's NAME is written into, and which of the four shapes put
 * it there. Only `*_name` columns count: `actor.id` and `actor.email` ride the
 * same INSERTs and are not names. */
function actorNameColumns(): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>()
  const note = (column: string, shape: string) => {
    if (!column.endsWith("_name")) return
    const at = found.get(column) ?? new Set<string>()
    at.add(shape)
    found.set(column, at)
  }

  for (const file of sourceFiles(WRITE_ROOTS, { extensions: [".ts"], skipTests: true })) {
    const src = code(file.source)

    // 1 · a property on a row object
    for (const m of src.matchAll(/([a-z_][a-z0-9_]*)\s*:\s*actor\.name\b/g)) note(m[1] as string, "property")

    // 2 · an interpolated sqlString in a SET clause
    for (const m of src.matchAll(/([a-z_][a-z0-9_]*)\s*=\s*\$\{sqlString\(actor\.name\)\}/g))
      note(m[1] as string, "set")

    // 3 and 4 · positionally, against the INSERT's own column list
    for (const m of src.matchAll(/INSERT\s+INTO\s+\w+\s*\(([^)]*)\)\s*VALUES\s*\(/gi)) {
      const columns = (m[1] as string).replace(/\s+/g, " ").split(",").map((c) => c.trim())
      const values = balanced(src, m.index + m[0].length)
      const items = splitTopLevel(values.body)
      const allPlaceholders = items.length > 1 && items.every((v) => v.trim() === "?")

      if (allPlaceholders) {
        // 4 · the row is `?`s, so the values are in the `.bind(…)` that follows it
        const bindAt = src.indexOf(".bind(", values.end)
        if (bindAt === -1 || bindAt - values.end > 200) continue
        const bound = splitTopLevel(balanced(src, bindAt + ".bind(".length).body)
        bound.forEach((v, i) => {
          if (/\bactor\.name\b/.test(v) && columns[i]) note(columns[i] as string, "bind")
        })
      } else {
        // 3 · the values are interpolated straight into the VALUES list
        items.forEach((v, i) => {
          if (/\bactor\.name\b/.test(v) && columns[i]) note(columns[i] as string, "values")
        })
      }
    }
  }
  return found
}

/* ------------------------------------------------------------------------- */
/* DERIVATION TWO — the fields those columns become on the wire                */
/* ------------------------------------------------------------------------- */

/** Every wire field a staff-name COLUMN is mapped onto, off the workers' own read
 * seams: `field: row.<column>` and `<column> AS <alias>`. */
function payloadFieldsFromMappings(columns: Iterable<string>): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>()
  const files = sourceFiles(WRITE_ROOTS, { extensions: [".ts"], skipTests: true })
  for (const column of columns) {
    // `(?<![?:]\s*)` is not enough on its own — `cond ? null : r.creator_name`
    // matches the property shape with "null" as the field — so reserved words are
    // rejected outright below.
    const mapped = new RegExp(`([A-Za-z_][A-Za-z0-9_]*)\\s*:\\s*[A-Za-z_][\\w.?![\\]]*\\.${column}\\b`, "g")
    const aliased = new RegExp(`${column}\\s+AS\\s+([A-Za-z_][A-Za-z0-9_]*)`, "gi")
    for (const file of files) {
      const src = code(file.source)
      for (const re of [mapped, aliased]) {
        for (const m of src.matchAll(re)) {
          const field = m[1] as string
          if (field === "null" || field === "undefined" || field === "default") continue
          const at = found.get(field) ?? new Set<string>()
          at.add(column)
          found.set(field, at)
        }
      }
    }
  }
  return found
}

/** Every `*Name` field in `shared/types.ts` that declares a `*IsClient` sibling in
 * the SAME type. The second, independent source: a field that has to say which
 * population it is holding is a field that holds a person. */
function fieldsDeclaringAClientSibling(): Map<string, Set<string>> {
  const types = code(readFileSync(join(ROOT, "shared", "types.ts"), "utf8"))
  const found = new Map<string, Set<string>>()
  for (const block of types.matchAll(/export (?:type|interface) (\w+)[^{]*\{([\s\S]*?)\n\}/g)) {
    const [typeName, body] = [block[1] as string, block[2] as string]
    const clients = new Set(
      [...body.matchAll(/^\s*(\w+)IsClient\s*\??\s*:/gm)].map((m) => (m[1] as string).toLowerCase())
    )
    if (!clients.size) continue
    for (const m of body.matchAll(/^\s*(\w+Name)\s*\??\s*:/gm)) {
      const field = m[1] as string
      if (!clients.has(field.slice(0, -"Name".length).toLowerCase())) continue
      const at = found.get(field) ?? new Set<string>()
      at.add(typeName)
      found.set(field, at)
    }
  }
  return found
}

/** THE HONEST BOUNDARY OF THE FIELD CENSUS, and the one place this law is narrower
 * than its two derivations are.
 *
 * The reader scan matches a field by NAME, as `.field`, so the census can only
 * hold names specific enough to mean one thing. Eleven of the twelve mappings
 * derivation two finds are `*Name` and are safe; ONE is not, and `\.by\b` matches
 * `sort.by` in fourteen screens that have never held a person. Dropping it
 * silently is how a law starts lying, so it is dropped LOUDLY: named here, with
 * the file that renders it, and that file is held to the same requirement the
 * census holds everybody else to (the last clause of the reader case below).
 *
 * Rot-checked: a non-`*Name` mapping that appears tomorrow and is not on this list
 * turns the build red rather than vanishing out of the subject. */
const NON_NAME_PAYLOAD: Record<string, string> = {
  by:
    "THE IMPORT BATCH'S SUMMARY LINE. `by: b.creator_name ?? \"Someone\"` " +
    "(workers/data-ops/src/lib/import-batch.ts) is a staff name under a name too " +
    "generic to match on: `.by` is how every sort state in the app spells its own " +
    "column. Its ONE render is web/components/screens/import-screen.tsx, which resolves it " +
    "through the seam — checked below by name, since the census cannot reach it.",
}

/** The file that renders each `NON_NAME_PAYLOAD` field, so the exclusion costs
 * nothing. Keyed by the same field name, so the two cannot drift apart. */
const NON_NAME_RENDERED_IN: Record<string, string> = {
  by: "web/components/screens/import-screen.tsx",
}

/* ------------------------------------------------------------------------- */

describe("R54 — the census is derived, twice, and cannot go blind", () => {
  it("TRIPWIRE ONE: the write scan still finds the columns a staff name is stored in", () => {
    // A set difference against an empty set is empty, and every case below is a
    // set difference. If the four shapes stop matching — a refactor to a query
    // builder, a rename of `toActor`'s `name` — this law would report a clean
    // pass over nothing at all. So the derivation is asserted before it is used.
    const columns = actorNameColumns()
    expect(
      [...columns.keys()].sort(),
      "the write scan found no `*_name` column that `actor.name` is stored in. Either the workers " +
        "stopped writing actor snapshots (in which case delete this law) or the four write shapes in " +
        "this file's header no longer describe how they do it — which means the census below is empty " +
        "and every screen would pass"
    ).not.toEqual([])
    expect(
      columns.size,
      `the write scan found only ${columns.size} staff-name column(s). It found eight the day this ` +
        "law was written (actor_name, archiver_name, creator_name, deactivator_name, editor_name, " +
        "inviter_full_name, resolver_name, user_name), so a sharp drop is a blind scan, not a tidier estate"
    ).toBeGreaterThan(5)

    // ALL FOUR SHAPES ARE LOAD-BEARING. Three of the four each carry a column no
    // other shape finds, so a scan that quietly lost one would lose real columns
    // and still look healthy. Asserting the shapes are all still in use is what
    // makes "we found eight" mean something.
    const shapes = new Set([...columns.values()].flatMap((s) => [...s]))
    for (const shape of ["property", "set", "values", "bind"]) {
      expect(
        shapes.has(shape),
        `no staff-name column is written by the '${shape}' shape any more. If the workers genuinely ` +
          "stopped using it, delete the clause; if they did not, the clause has gone blind and is " +
          "silently dropping columns out of the census"
      ).toBe(true)
    }
  })

  it("TRIPWIRE TWO: both field derivations still answer, and neither carries the census alone", () => {
    const columns = actorNameColumns()
    const mapped = payloadFieldsFromMappings(columns.keys())
    const typed = fieldsDeclaringAClientSibling()

    expect(
      mapped.size,
      "no worker maps a staff-name column onto a wire field. The read seams are how a name reaches a " +
        "screen at all, so finding none means the mapping scan is blind, not that the app stopped " +
        "showing people's names"
    ).toBeGreaterThan(6)
    expect(
      typed.size,
      "no `*Name` field in shared/types.ts declares a `*IsClient` sibling. Those flags are what let a " +
        "screen tell our people from the client's — the second half of the ruling — so an empty answer " +
        "here means either the flags were removed (the law is broken) or the scan is (the law is asleep)"
    ).toBeGreaterThan(3)

    // THE SECOND SOURCE IS NOT DECORATION. It exists because a mapping can be
    // missed and a type cannot, and it pays for itself: `raiserName` and
    // `completedByName` are read by screens and reach the census through the
    // types alone. If this ever became empty the second derivation would be
    // costing a scan and buying nothing, and somebody should be told.
    const onlyTyped = [...typed.keys()].filter((f) => !mapped.has(f))
    expect(
      onlyTyped,
      "the shared/types.ts derivation no longer contributes a single field the mapping scan misses. " +
        "That is either a real simplification (say so here and simplify this law with it) or the sign " +
        "that one of the two derivations has quietly become a copy of the other"
    ).not.toEqual([])
  })

  it("every non-`*Name` staff-name mapping is named, and the ones named are real", () => {
    const mapped = payloadFieldsFromMappings(actorNameColumns().keys())
    const generic = [...mapped.keys()].filter((f) => !f.endsWith("Name")).sort()

    const unnamed = generic.filter((f) => !(f in NON_NAME_PAYLOAD))
    expect(
      unnamed,
      "these wire fields carry a staff-name column but are not named `*Name`, so the reader census " +
        "below cannot match them by name and they would leave the law's subject silently. Rename the " +
        "field, or add it to NON_NAME_PAYLOAD with the file that renders it: " + unnamed.join(", ")
    ).toEqual([])

    // ROT, the other way. An entry for a mapping that no longer exists is a hole
    // kept open for nothing.
    const stale = Object.keys(NON_NAME_PAYLOAD).filter((f) => !generic.includes(f))
    expect(
      stale,
      `NON_NAME_PAYLOAD names fields no worker maps a staff-name column onto any more: ${stale.join(", ")}`
    ).toEqual([])

    // AND THE EXCLUSION COSTS NOTHING. Each one still has to be resolved where it
    // is drawn — checked by file, since the census cannot reach it by name.
    for (const field of Object.keys(NON_NAME_PAYLOAD)) {
      const rel = NON_NAME_RENDERED_IN[field]
      expect(rel, `NON_NAME_PAYLOAD names \`${field}\` but nothing says where it is rendered`).toBeTruthy()
      const src = code(readFileSync(join(ROOT, rel as string), "utf8"))
      expect(
        SEAM_CALL.test(src),
        `${rel} renders \`${field}\`, a staff name the census cannot see, and never calls shared/staff-name.ts`
      ).toBe(true)
    }
  })
})

describe("R54 — every screen that shows a staff name resolves it through the seam", () => {
  /** The census: both derivations, `*Name` only (see NON_NAME_PAYLOAD). */
  const census = (): string[] => {
    const mapped = payloadFieldsFromMappings(actorNameColumns().keys())
    const typed = fieldsDeclaringAClientSibling()
    return [...new Set([...mapped.keys(), ...typed.keys()])].filter((f) => f.endsWith("Name")).sort()
  }

  /** Every RENDERING of a census field in one file, with the two positions that
   * are not renderings taken out. Returns `path::field` keys, matching the shape
   * `STAFF_NAME_RAW` is written in. */
  const renderings = (source: string, fields: string[]): { line: number; field: string; text: string }[] => {
    const out: { line: number; field: string; text: string }[] = []
    code(source)
      .split("\n")
      .forEach((line, i) => {
        const hit = fields.filter((f) => new RegExp(`\\.${f}\\b`).test(line))
        if (!hit.length) return
        if (MATCH_POSITION.test(line)) return
        const forward = FORWARD.exec(line)
        if (forward && fields.includes(forward[1] as string) && fields.includes(forward[2] as string)) {
          // A forward is only a forward if the line does nothing ELSE with a
          // census field — `author: r.authorIsClient ? r.authorName : trim(...)`
          // has a forward's shape inside it and is a rendering.
          if (!fields.some((f) => new RegExp(`\\.${f}\\b`).test(line.replace(FORWARD, "")))) return
        }
        out.push({ line: i + 1, field: hit[0] as string, text: line.trim() })
      })
    return out
  }

  it("no screen puts a staff name on the page without asking shared/staff-name.ts", () => {
    const fields = census()
    expect(
      fields.length,
      "the census is empty — the two derivations above are asserted separately, so if they are green " +
        "and this is not, the `*Name` filter is what broke"
    ).toBeGreaterThan(8)

    const files = sourceFiles(READ_ROOTS, { extensions: [".ts", ".tsx"], skipTests: true, relativeTo: ROOT })
    expect(files.length, "the read walk found nothing — it has gone blind").toBeGreaterThan(80)

    const offenders: string[] = []
    const used = new Set<string>()
    let readers = 0

    for (const file of files) {
      const drawn = renderings(file.source, fields)
      if (drawn.length) readers++
      if (!drawn.length || SEAM_CALL.test(code(file.source))) continue
      for (const { line, field, text } of drawn) {
        const key = `${file.rel}::${field}`
        if (STAFF_NAME_RAW[key]) {
          used.add(key)
          continue
        }
        offenders.push(`${file.rel}:${line} (${field}) — ${text}`)
      }
    }

    // A THIRD BLINDNESS GUARD, on the half the two tripwires cannot see: the
    // census can be perfect and the reader walk still match nothing (a rename of
    // the fields, a move of the screens). FOURTEEN files under web/ draw a census
    // field the day this was written — the activity feed and its deep-link twin,
    // the record header's audit line, the work-log panels, the ticket and story
    // attachment lists, the process comments, the triage banners and the agent
    // usage dialog. Eight more only FORWARD one and are correctly not counted.
    expect(
      readers,
      `only ${readers} file(s) under web/ RENDER a staff-name field. The app draws people's names on ` +
        "record headers, activity feeds, work logs, attachment lists and triage banners — fourteen " +
        "files did the day this law was written — so a number this low means the reader scan stopped " +
        "matching, not that the screens stopped asking"
    ).toBeGreaterThan(10)

    expect(
      offenders,
      "these screens put a staff person's name in front of a reader without resolving it through " +
        "shared/staff-name.ts — `staffName` where the first/last pair is in hand, " +
        "`staffNameFromSnapshot` for a stored \"First Last\", `describeWithStaffName` for an activity " +
        "sentence. If the field can hold a CONTACT here, ask the row's own `*IsClient` flag first and " +
        "leave theirs whole. If neither is right, add a reasoned STAFF_NAME_RAW entry:\n  " +
        offenders.join("\n  ")
    ).toEqual([])

    // ROT CHECK. An exemption the census would no longer catch is a line nobody
    // can justify and nobody can safely delete — and stale permissions are how
    // the next offender walks through. The list can only shrink.
    const stale = Object.keys(STAFF_NAME_RAW).filter((k) => !used.has(k))
    expect(
      stale,
      "STAFF_NAME_RAW names screens the census no longer catches — the field moved, the screen was " +
        `fixed, or the file is gone. Delete each of these lines: ${stale.join(", ")}`
    ).toEqual([])
  })

  it("the two non-rendering positions are real judgements, not an empty branch", () => {
    // Both exclusions exist to answer a specific objection, and both would be
    // indistinguishable from a bug if they matched nothing: a FORWARD clause that
    // never fires means eight detail screens are importing a seam for no reason,
    // and a MATCH clause that never fires means the seam's whole argument for
    // trimming LATE (a search term, a sort expression, a cursor key) is no longer
    // describing this codebase.
    const fields = census()
    const files = sourceFiles(READ_ROOTS, { extensions: [".ts", ".tsx"], skipTests: true, relativeTo: ROOT })

    let forwards = 0
    let matches = 0
    for (const file of files) {
      for (const line of code(file.source).split("\n")) {
        if (!fields.some((f) => new RegExp(`\\.${f}\\b`).test(line))) continue
        if (MATCH_POSITION.test(line)) matches++
        else if (FORWARD.test(line)) forwards++
      }
    }
    expect(
      forwards,
      "no line in web/ forwards one census field into another. The forward exclusion is answering " +
        "nothing, so either the audit props were restructured (delete the clause and the reasoning " +
        "with it) or it has stopped matching and is hiding real renderings"
    ).toBeGreaterThan(4)
    expect(
      matches + forwards,
      "neither non-rendering position matches anything in web/ — the classifier is not classifying"
    ).toBeGreaterThan(4)
  })
})

describe("R54 — the seam stays the only answer", () => {
  it("nothing in web/ rolls its own first-name trim", () => {
    // THE FAILURE MODE THIS LAW IS ACTUALLY FOR. A screen that needs a first name
    // and does not know the seam exists will write `name.split(" ")[0]`, which is
    // right until it meets an email address (`audora@kwapso.com` → `audora@kwapso.com`
    // through the seam, and a mangled fragment through the split) or a leading
    // space. The seam has a decision written down for both; a hand-roll has
    // whatever `split` happens to do.
    const offenders: string[] = []
    for (const file of sourceFiles(READ_ROOTS, {
      extensions: [".ts", ".tsx"],
      skipTests: true,
      relativeTo: ROOT,
    })) {
      code(file.source)
        .split("\n")
        .forEach((line, i) => {
          if (!/\.split\(\s*(?:" "|\/\\s\+\/)\s*\)\s*\[\s*0\s*\]/.test(line)) return
          offenders.push(`${file.rel}:${i + 1} — ${line.trim()}`)
        })
    }
    expect(
      offenders,
      "these take the first word of a string by hand. If it is a person's name, call " +
        "`staffNameFromSnapshot` (shared/staff-name.ts) — it answers for an email address, a leading " +
        "space and a blank, and this does not:\n  " + offenders.join("\n  ")
    ).toEqual([])
  })

  it("`personName` is still a delegation and not a second answer", () => {
    // It is on SEAM_CALL's list, so a screen calling it counts as resolved. That
    // is only true while it forwards to the seam — the day it grows a rule of its
    // own there are two places the ruling is written down, and they will disagree.
    const identity = code(readFileSync(join(ROOT, "web", "lib", "identity.ts"), "utf8"))
    expect(
      /export function personName\([^)]*\)\s*:\s*string\s*\{\s*return staffName\(p\)\s*\}/.test(identity),
      "web/lib/identity.ts's `personName` must stay a one-line delegation to `staffName` " +
        "(shared/staff-name.ts). It is treated as a seam call by this law's reader census, so a rule " +
        "of its own here would be a second, unchecked answer to the ruling"
    ).toBe(true)
  })

  it("the seam itself never leaves the render side", () => {
    // The trim is at the RENDER seam for three measured reasons, and the seam's
    // header names them: a stored `user_name` is a LIKE term, a sort expression
    // and a keyset cursor key, and ONE column carries both populations. A worker
    // that trimmed on the way out of the database would break all three.
    //
    // "RENDER SEAM" IS NOT "web/", THOUGH, and the exemption below is the honest
    // edge of that: an EMAIL is a render surface that happens to be composed in a
    // worker. A person reads it, nothing is stored, and no query is built from
    // it, so the three arguments above have nothing to say about it — which is
    // exactly the test a new entry here has to pass.
    const RENDERS_IN_A_WORKER: Record<string, string> = {
      "tenancy/src/lib/notify.ts":
        "THE TWO ROLE/REMOVAL EMAILS — \"{name} changed your role in {team}\" and \"{name} removed " +
        "you from {team}\". A worker composes them because that is where the send happens, but the " +
        "seam call is in the SENTENCE a person reads, not on the way out of the database: nothing is " +
        "stored from it and no query is built on it. The fallback beside it (`|| \"An admin\"`) is " +
        "the same shape every screen in web/ uses.",
    }

    const importers = sourceFiles(WRITE_ROOTS, { extensions: [".ts"], skipTests: true, relativeTo: ROOT })
      .filter((f) => /from ["']@shared\/staff-name["']/.test(code(f.source)))
      .map((f) => f.rel.replace(/^workers\//, ""))

    const offenders = importers.filter((rel) => !(rel in RENDERS_IN_A_WORKER))
    expect(
      offenders,
      "a worker imports shared/staff-name.ts. The trim belongs at the render seam: the stored string " +
        "is a search term, a sort expression and a keyset cursor key, and ONE column carries both " +
        "staff and contacts, so a worker-side trim would truncate a contact's name — the half of the " +
        "ruling that says do not. If this is a SENTENCE a person reads rather than a value on its way " +
        `to or from the database, add it to RENDERS_IN_A_WORKER with that reason: ${offenders.join(", ")}`
    ).toEqual([])

    // ROT: an exemption for a worker that no longer imports the seam.
    const stale = Object.keys(RENDERS_IN_A_WORKER).filter((rel) => !importers.includes(rel))
    expect(
      stale,
      `RENDERS_IN_A_WORKER names workers that no longer import the seam at all: ${stale.join(", ")}`
    ).toEqual([])
  })
})
