// PRUNE THE CATALOGUE AND THE SEED DOWN TO WHAT THE APP ACTUALLY SAYS AND SPEAKS.
//
//   node scripts/i18n-prune.mjs          rewrite both files
//   node scripts/i18n-prune.mjs --check  report only, exit 1 if anything is stale
//
// ── why this exists ──────────────────────────────────────────────────────────
//
// Two different things can go stale in `shared/i18n-catalogue.ts` and
// `shared/i18n-seed.ts`, and this script closes both.
//
// ROWS. `shared/i18n.ts` holds ONE array of languages and everything is derived
// from it — except these two files, which are the accumulated output of every
// previous run. `i18n-extract.mjs` rewrites `shared/i18n-strings.json` WHOLE, so
// that file can never hold a row nothing says any more — but neither CATALOGUE
// nor SEED is ever rewritten whole, so a string a deleted screen used to say
// stays in both forever, translated on every build, an ORPHAN by R28's own
// definition. This is the half of R28 that used to be enforced for one file out
// of three and is now enforced for all three: the source of truth for "does the
// app still say this" is the same shared walk the extractor and the census
// stand on (`scripts/lib/i18n-source.mjs`'s `appFiles()` + `visitStrings()` +
// `isUserVisible()`), never a second definition of "user-visible" invented here.
//
// LANGUAGES. Drop a language from the array and its translations stay on disk:
// dead weight in every bundle, a diff nobody reads on every catalogue run, and
// a quiet lie in the file header about how many languages this app speaks.
//
// So this closes both loops. `i18n-extract` makes the catalogue match the
// code's STRINGS going IN; this makes CATALOGUE and SEED match the code's
// strings AND languages going OUT. Together they mean `shared/i18n.ts` is the
// only place a language is decided and `appFiles()` is the only place a string
// is decided, for every one of the three files.
//
// IT NEVER CALLS A MODEL and never needs a key. It only ever REMOVES — a
// language that is in the array but missing from the catalogue, or a string
// the app says with no seed/catalogue entry at all, is somebody else's job
// (i18n-translate.mjs, i18n-extract.mjs) and costs money or requires a person.
//
// The catalogue is regenerated whole (it is a generated file). The seed is
// hand-written and full of comments explaining where the agency's German came
// from, so it is edited SURGICALLY: the exact source span of each unwanted
// `xx: "…"` pair, or each unwanted whole ROW, is cut and everything else
// survives byte for byte — comments included, see `pruneRowsBySpan` for how a
// comment is told apart from a GROUP header it may not touch.

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

import { appFiles, collapse, isUserVisible, visitStrings } from "./lib/i18n-source.mjs"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const ENGINE = join(ROOT, "shared", "i18n.ts")
const SEED_FILE = join(ROOT, "shared", "i18n-seed.ts")
const CATALOGUE_FILE = join(ROOT, "shared", "i18n-catalogue.ts")
const CHECK = process.argv.includes("--check")

function source(path) {
  return ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true)
}
function exportedValue(file, name) {
  let found = null
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name)
      found = node.initializer ?? null
    if (!found) ts.forEachChild(node, visit)
  }
  visit(file)
  // `[…] as const` / `{…} satisfies X` wrap the literal we actually want.
  while (found && (ts.isAsExpression(found) || ts.isSatisfiesExpression(found))) found = found.expression
  return found
}
const propertyName = (p) =>
  ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : null
const literal = (n) => (n && ts.isStringLiteral(n) ? n.text : null)

/** The languages the app says it speaks, English excluded — English is the key. */
function spokenLanguages() {
  const node = exportedValue(source(ENGINE), "LANGUAGES")
  if (!node || !ts.isArrayLiteralExpression(node)) throw new Error("LANGUAGES is not an array literal")
  return node.elements.flatMap((el) => {
    if (!ts.isObjectLiteralExpression(el)) return []
    const code = el.properties.map((p) => (propertyName(p) === "code" ? literal(p.initializer) : null)).find(Boolean)
    return code && code !== "en" ? [code] : []
  })
}

/** A literal first argument to a call named `translate` — `t(...)`'s sibling
 * for the one shape `visitStrings`'s "toast" position cannot see.
 * `shared/web/language-section.tsx` / `language-menu.tsx` compose the switch
 * confirmation in the language just LEFT rather than the one bound to the
 * render, so the call reads `toast.success(translate("Language changed.",
 * next))` — a CallExpression sits where the "toast" position expects a
 * literal, `literalTexts` does not descend into it, and the sentence is
 * ORPHANED-LOOKING to a row prune that stops at the same walk R28's other two
 * laws stand on. `web/test/language-switcher.test.tsx` pins it straight
 * against `shared/i18n-seed.ts` for exactly this reason — it has no other
 * call site to be extracted from.
 *
 * Never a second definition of "user-visible": `collapse`/`isUserVisible` are
 * the exact predicate `visitStrings` already applies to a "toast" or "t-call"
 * literal, just extended to one more CALLEE name. Used ONLY here — a row this
 * finds and `stringsInSource()`'s plain walk (web/test/catalogued-strings.test.ts,
 * the i18n-strings.json census) does not is exactly R33's known, accepted gap:
 * a position with nothing extracting it, not a string to prune. */
function translateCallLiterals(files) {
  const found = new Set()
  for (const { tree } of files) {
    const visit = (node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "translate" &&
        node.arguments.length > 0 &&
        (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))
      ) {
        const text = collapse(node.arguments[0].text)
        if (isUserVisible(text)) found.add(text)
      }
      ts.forEachChild(node, visit)
    }
    visit(tree)
  }
  return found
}

/** Every English string the app still says, for the purpose of deciding
 * whether a CATALOGUE/SEED row is an orphan. The plain walk R28's own
 * extractor and census stand on, UNIONED with `translateCallLiterals` above —
 * read here rather than off `shared/i18n-strings.json` on disk, so a prune run
 * before an extract run still prunes against the truth rather than a stale
 * extraction. */
function stringsInApp() {
  const files = appFiles()
  const found = new Set()
  for (const { tree } of files) visitStrings(tree, ({ text }) => found.add(text))
  for (const text of translateCallLiterals(files)) found.add(text)
  return found
}

/** Every language code that appears anywhere in one of the two data files. */
function codesIn(file, name) {
  const node = exportedValue(file, name)
  const found = new Set()
  if (!node || !ts.isObjectLiteralExpression(node)) return found
  for (const entry of node.properties) {
    if (!ts.isPropertyAssignment(entry) || !ts.isObjectLiteralExpression(entry.initializer)) continue
    for (const prop of entry.initializer.properties) {
      const code = ts.isPropertyAssignment(prop) ? propertyName(prop) : null
      if (code) found.add(code)
    }
  }
  return found
}

/** Cut every unwanted `xx: "…"` pair out of a HAND-WRITTEN file by source span,
 * so the comments around them survive exactly as written.
 *
 * THE RANGES ARE MERGED BEFORE THEY ARE APPLIED, and that is the whole of the
 * correctness here. A pair's cut runs from its own start to the start of the
 * next pair; the LAST pair's cut reaches BACKWARDS over the comma before it, so
 * nothing is left dangling. When the last pair and the one before it are both
 * being cut, those two ranges OVERLAP — and applying them one after another
 * removes more than either described, which the first version of this script
 * did: it ate the closing brace of every row and produced 1,027 lines of
 * unparseable TypeScript. Overlapping edits are not composable; merged ones
 * are. */
function pruneBySpan(path, name, keep) {
  const file = source(path)
  const node = exportedValue(file, name)
  if (!node || !ts.isObjectLiteralExpression(node)) throw new Error(`${name} is not an object literal`)
  const text = file.getFullText()
  const cuts = []
  let removed = 0
  for (const entry of node.properties) {
    if (!ts.isPropertyAssignment(entry) || !ts.isObjectLiteralExpression(entry.initializer)) continue
    const props = entry.initializer.properties
    for (const prop of props) {
      if (!ts.isPropertyAssignment(prop)) continue
      const code = propertyName(prop)
      if (!code || keep.has(code)) continue
      removed += 1
      let start = prop.getStart(file)
      let end = prop.getEnd()
      if (text[end] === ",") end += 1
      while (/[ \t]/.test(text[end])) end += 1
      cuts.push([start, end])
    }
  }
  if (!cuts.length) return { changed: false, removed: 0 }

  cuts.sort((a, b) => a[0] - b[0])
  const merged = [cuts[0]]
  for (const [start, end] of cuts.slice(1)) {
    const last = merged[merged.length - 1]
    if (start <= last[1]) last[1] = Math.max(last[1], end)
    else merged.push([start, end])
  }
  // A range that now runs up to the row's closing brace has left the comma
  // before it with nothing to separate. Reach back and take it.
  for (const range of merged) {
    let after = range[1]
    while (/\s/.test(text[after])) after += 1
    if (text[after] !== "}") continue
    let start = range[0]
    while (start > 0 && /[ \t]/.test(text[start - 1])) start -= 1
    if (text[start - 1] === ",") range[0] = start - 1
  }

  let out = text
  for (const [start, end] of merged.slice().reverse()) out = out.slice(0, start) + out.slice(end)
  // Cheap proof before anything is written: it still parses, and it still holds
  // every row it held before.
  const reparsed = ts.createSourceFile(path, out, ts.ScriptTarget.Latest, true)
  const check = exportedValue(reparsed, name)
  if (!check || !ts.isObjectLiteralExpression(check) || check.properties.length !== node.properties.length)
    throw new Error(`${name}: the prune did not round-trip — nothing written`)
  if (!CHECK) writeFileSync(path, out)
  return { changed: true, removed }
}

/** Cut every ORPHANED whole ROW — a top-level `"English": { … }` entry whose
 * key matches no string `inApp` — out of a HAND-WRITTEN file by source span.
 * `pruneBySpan`'s sibling, one level up: that one drops a LANGUAGE out of a
 * row, this drops the row itself.
 *
 * A leading comment is cut WITH its row only when the row is ALL the comment
 * is for. That can't be read off the comment's own wording — "THE RAIL'S TWO
 * NEW SECTION HEADINGS" precedes two rows, "In portal" precedes one, and
 * nothing about either sentence says so structurally — so the test is
 * positional instead, the same way R20 reads a validated field: only the
 * FIRST row after a comment is ever syntactically "attached" to it (every
 * other row in a group has no comment of its own to lose), so a comment is
 * taken only when NOTHING else could still be relying on it — no blank line
 * between the comment and its row (so the comment is really addressed to this
 * row and not left floating above it), and a blank line, or the object's own
 * closing brace, right after the row (the same shape this file already uses
 * everywhere to end one explanation and start the next, i.e. proof that no
 * following row is part of the same paragraph). Where that can't be shown,
 * the row goes and the comment is left exactly where it was: a comment with
 * nothing left under it to explain costs far less than one silently deleted
 * out from under a row that is still here. */
function pruneRowsBySpan(path, name, inApp) {
  const file = source(path)
  const node = exportedValue(file, name)
  if (!node || !ts.isObjectLiteralExpression(node)) throw new Error(`${name} is not an object literal`)
  const text = file.getFullText()
  const props = node.properties.filter((p) => ts.isPropertyAssignment(p))
  const cuts = []
  const removedKeys = []

  // A row's cut always swallows its OWN leading indentation and the newline
  // that starts its own line, so removing it leaves no blank line behind —
  // the previous line's own newline now runs straight into whatever survives.
  const rowStart = (pos) => {
    let s = pos
    while (s > 0 && /[ \t]/.test(text[s - 1])) s -= 1
    if (s > 0 && text[s - 1] === "\n") s -= 1
    return s
  }

  for (const prop of props) {
    const key = propertyName(prop)
    if (key === null || inApp.has(key)) continue
    removedKeys.push(key)

    let end = prop.getEnd()
    if (text[end] === ",") end += 1
    while (/[ \t]/.test(text[end])) end += 1

    let probe = end
    let newlines = 0
    while (/\s/.test(text[probe])) {
      if (text[probe] === "\n") newlines += 1
      probe += 1
    }
    const clearAfter = newlines >= 2 || text[probe] === "}"

    let start = prop.getStart(file)
    const comments = ts.getLeadingCommentRanges(text, prop.getFullStart()) ?? []
    if (clearAfter && comments.length > 0) {
      const last = comments[comments.length - 1]
      const between = text.slice(last.end, prop.getStart(file))
      // Nothing (no blank line) stands between the comment and this row —
      // proof the comment was written FOR this row and not left floating.
      if (!/\n\s*\n/.test(between)) start = comments[0].pos
    }
    cuts.push([rowStart(start), end])
  }
  if (!cuts.length) return { changed: false, removed: 0, removedKeys: [] }

  cuts.sort((a, b) => a[0] - b[0])
  const merged = [cuts[0]]
  for (const [start, end] of cuts.slice(1)) {
    const last = merged[merged.length - 1]
    if (start <= last[1]) last[1] = Math.max(last[1], end)
    else merged.push([start, end])
  }
  for (const range of merged) {
    let after = range[1]
    while (/\s/.test(text[after])) after += 1
    if (text[after] !== "}") continue
    let start = range[0]
    while (start > 0 && /[ \t\n]/.test(text[start - 1])) start -= 1
    if (text[start - 1] === ",") range[0] = start - 1
  }

  let out = text
  for (const [start, end] of merged.slice().reverse()) out = out.slice(0, start) + out.slice(end)

  const reparsed = ts.createSourceFile(path, out, ts.ScriptTarget.Latest, true)
  const check = exportedValue(reparsed, name)
  if (!check || !ts.isObjectLiteralExpression(check) || check.properties.length !== props.length - removedKeys.length)
    throw new Error(`${name}: the row prune did not round-trip — nothing written`)
  if (!CHECK) writeFileSync(path, out)
  return { changed: true, removed: removedKeys.length, removedKeys }
}

/** The GENERATED catalogue is rewritten whole rather than edited, because its
 * header states how many strings and languages it holds — surgery would leave
 * that sentence describing a file that no longer exists. Same shape the
 * translator emits, minus any row not in `rows` (the caller's job to filter
 * orphans out before calling this) and any language not in `codes`. */
function renderCatalogue(rows, codes, seedCount) {
  const keys = Object.keys(rows).sort()
  const head = readFileSync(CATALOGUE_FILE, "utf8").split("\n")
  const lines = []
  for (const line of head) {
    if (line.startsWith("export const CATALOGUE")) break
    if (/^\/\/ \d+ strings ·/.test(line))
      lines.push(`// ${keys.length} strings · ${codes.length} languages · ${seedCount} of the entries below are hand-written seed.`)
    else lines.push(line)
  }
  lines.push("export const CATALOGUE: Catalogue = {")
  for (const key of keys) {
    const row = rows[key]
    const pairs = codes
      .filter((c) => typeof row[c] === "string" && row[c] !== "")
      .map((c) => `${c}: ${JSON.stringify(row[c])}`)
    lines.push(`  ${JSON.stringify(key)}: {${pairs.length ? ` ${pairs.join(", ")} ` : ""}},`)
  }
  lines.push("}", "")
  return lines.join("\n")
}

/** A `Catalogue`-shaped object literal → `{ english: { lang: text } }`. */
function readCatalogue(path, name) {
  const node = exportedValue(source(path), name)
  const out = {}
  if (!node || !ts.isObjectLiteralExpression(node)) return out
  for (const entry of node.properties) {
    if (!ts.isPropertyAssignment(entry) || !ts.isObjectLiteralExpression(entry.initializer)) continue
    const english = propertyName(entry)
    if (!english) continue
    const row = {}
    for (const prop of entry.initializer.properties) {
      if (!ts.isPropertyAssignment(prop)) continue
      const code = propertyName(prop)
      const value = literal(prop.initializer)
      if (code && value) row[code] = value
    }
    out[english] = row
  }
  return out
}

const preview = (keys) =>
  keys.slice(0, 5).map((k) => JSON.stringify(k)).join(", ") + (keys.length > 5 ? ", …" : "")

const codes = spokenLanguages()
const keepLangs = new Set(codes)
console.log(`languages in shared/i18n.ts: en + ${codes.join(", ")}`)

const inApp = stringsInApp()
console.log(`strings currently in the app: ${inApp.size}`)

let stale = false

// ── SEED first: it is hand-written and edited by span, and the catalogue's own
// header below counts its rows, so the count has to be CURRENT when it reads it. ──
{
  const path = SEED_FILE
  const name = "SEED"
  const label = "shared/i18n-seed.ts"
  const rows = readCatalogue(path, name)
  const orphanKeys = Object.keys(rows).filter((k) => !inApp.has(k)).sort()
  const present = codesIn(source(path), name)
  const extraLangs = [...present].filter((c) => !keepLangs.has(c)).sort()
  const missingLangs = codes.filter((c) => !present.has(c)).sort()
  if (missingLangs.length)
    console.log(`  ${label}: nothing at all for ${missingLangs.join(", ")} — run i18n-translate to fill them in`)

  if (orphanKeys.length === 0 && extraLangs.length === 0) {
    console.log(`  ${label}: ${Object.keys(rows).length} rows, ${present.size} language(s), nothing to prune`)
  } else {
    stale = true
    if (CHECK) {
      if (orphanKeys.length)
        console.log(
          `  ${label}: STALE — ${orphanKeys.length} row(s) match no string in the app (${preview(orphanKeys)})`
        )
      if (extraLangs.length)
        console.log(
          `  ${label}: STALE — carries ${extraLangs.length} language${extraLangs.length === 1 ? "" : "s"} ` +
            `the app no longer speaks (${extraLangs.join(", ")})`
        )
    } else {
      const before = readFileSync(path).length
      let rowsRemoved = 0
      if (orphanKeys.length) {
        const result = pruneRowsBySpan(path, name, inApp)
        rowsRemoved = result.removed
        console.log(`  ${label}: removed ${rowsRemoved} orphaned row(s) (${preview(result.removedKeys)})`)
      }
      let colsRemoved = 0
      if (extraLangs.length) {
        const result = pruneBySpan(path, name, keepLangs)
        colsRemoved = result.removed
      }
      const after = readFileSync(path).length
      console.log(
        `  ${label}: ${rowsRemoved} row(s), ${colsRemoved} translation(s) removed ` +
          `(${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB)`
      )
    }
  }
}

// ── CATALOGUE: generated, so rows and languages are pruned together by a
// wholesale rewrite rather than by span. ──
{
  const path = CATALOGUE_FILE
  const name = "CATALOGUE"
  const label = "shared/i18n-catalogue.ts"
  const rows = readCatalogue(path, name)
  const orphanKeys = Object.keys(rows).filter((k) => !inApp.has(k)).sort()
  const present = codesIn(source(path), name)
  const extraLangs = [...present].filter((c) => !keepLangs.has(c)).sort()
  const missingLangs = codes.filter((c) => !present.has(c)).sort()
  if (missingLangs.length)
    console.log(`  ${label}: nothing at all for ${missingLangs.join(", ")} — run i18n-translate to fill them in`)

  if (orphanKeys.length === 0 && extraLangs.length === 0) {
    console.log(`  ${label}: ${Object.keys(rows).length} rows, ${present.size} language(s), nothing to prune`)
  } else {
    stale = true
    if (CHECK) {
      if (orphanKeys.length)
        console.log(
          `  ${label}: STALE — ${orphanKeys.length} row(s) match no string in the app (${preview(orphanKeys)})`
        )
      if (extraLangs.length)
        console.log(
          `  ${label}: STALE — carries ${extraLangs.length} language${extraLangs.length === 1 ? "" : "s"} ` +
            `the app no longer speaks (${extraLangs.join(", ")})`
        )
    } else {
      const before = readFileSync(path).length
      const filtered = Object.fromEntries(Object.entries(rows).filter(([k]) => inApp.has(k)))
      // SEED is pruned above this in the same run, so its count here is current.
      const seedCount = Object.keys(readCatalogue(SEED_FILE, "SEED")).length
      writeFileSync(path, renderCatalogue(filtered, codes, seedCount))
      const after = readFileSync(path).length
      console.log(
        `  ${label}: removed ${orphanKeys.length} orphaned row(s), ` +
          `${extraLangs.length} language${extraLangs.length === 1 ? "" : "s"} ` +
          `(${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB)`
      )
    }
  }
}

if (CHECK && stale) {
  console.error("\nRun `node scripts/i18n-prune.mjs` and commit the result.")
  process.exit(1)
}
