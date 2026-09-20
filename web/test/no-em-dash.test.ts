// @vitest-environment node
//
// A pure source scan: it reads files off disk and never touches a DOM
// (no-default-subtitles.test.ts's own reason for the same directive).
//
// ─────────────────────────────────────────────────────────────────────────────
// R95 — NO EM DASH, ANYWHERE A PERSON READS.
// ─────────────────────────────────────────────────────────────────────────────
//
// Aurora, verbatim, 20 Sep 2026: "no em dahses - ABOSLUTLEY NOWHERE. In the ui,
// in the e-mai,s, in the glossary. They are strictly forbidden. make it law."
//
// THREE SURFACES, THREE ORACLES. "The UI" is the translation catalogue plus
// every JSX text node, `t(...)` argument and rendered string literal in the two
// front doors and their shared components — the same set R28 (`catalogued-
// strings`) already derives as "what a person reads": `appFiles()`
// (`scripts/lib/i18n-source.mjs`), the front doors' own import closure, walked
// here again rather than trusted from memory, plus `shared/web/` read directly
// as its own census so a file `appFiles()` has not reached (R28's own
// UNWALKED_OK gap) still cannot hide a dash from THIS law. "The e-mails" is
// `shared/workers/email-template.ts` (the one HTML+text builder every send
// renders through) plus every SEND SITE — derived, not hand-listed: any
// `workers/*/src` file that calls `sendBrandedEmail(`/`brandedEmail(`, so a
// module that starts sending mail tomorrow is covered the day it does, with no
// edit to this file. "The glossary" is `shared/glossary.ts`'s own `def` and
// `term` fields.
//
// U+2013 (en dash) IS TREATED THE SAME AS U+2014 (em dash) IN PROSE, per her
// own instruction ("no em dahses") read alongside the law's registry entry,
// which says so explicitly — a sentence that swapped one glyph for the other
// would still be exactly the thing she ruled out.
//
// NO EXEMPTIONS TABLE. She said "ABSOLUTELY NOWHERE," and a deny-list is a
// place to hide from that word. Every failure this census finds is fixed at
// the source, not named into a registry that quietly grows.
//
// CODE COMMENTS ARE OUT, ON PURPOSE. She named three surfaces and none of them
// is a comment; `documents/*.md` prose and test names carry the same exemption
// (CLAUDE.md's own working agreement). Every non-JSON source file here is
// stripped with `stripComments` (`shared/rules/strip-comments.mjs`) — the one
// tokeniser every law in this repo trusts, not a regex that a `//` inside a
// string could fool — before the dash regex ever runs. An em dash cannot
// survive comment-stripping and land outside a string or JSX text anyway: it
// is not a legal character in a TypeScript identifier, so once comments are
// gone, everywhere left it could be is somewhere a person reads it.
//
// THE WORKERS PASS. Written the same day the deploy that was running against
// this working tree finished (20 Sep 2026), so the send-site half of this
// census was live from the first commit — there was never a `pendingWorkers-
// Pass` switch to flip. (An earlier draft of this law carried one, documented
// with that day's date, for the hour between the census running and the
// deploy clearing; it never shipped, because the deploy cleared first.)

import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
// The SAME derivation R28 stands on — "what a person reads" is not re-decided
// here, it is asked of the one function that already answers it. `visitStrings`
// is R28's own extractor, called the same way `i18n-extract.mjs` calls it: it
// walks the seven positions a person actually reads (JSX text, a JSX child
// expression, a `label:`-shaped property, `field(...)`'s label, `toast.*(...)`,
// `t(...)`) rather than every string literal appFiles()-reached source happens
// to contain — a file like `shared/workers/limits.ts` sits in that closure too
// (a type it exports is used on screen) and is full of internal scale-registry
// prose (`iterates:`, `resume:`) that is not a VISIBLE_PROPERTY and is not
// meant for a screen; a blind whole-file text scan would have flagged it and
// have no ground to refuse the flag on.
import { appFiles, parseFile, visitStrings } from "../../scripts/lib/i18n-source.mjs"
import ts from "typescript"

const HERE = dirname(fileURLToPath(import.meta.url)) // web/test
const WEB = join(HERE, "..") // web/
const ROOT = join(WEB, "..") // repo root

const read = (p: string) => readFileSync(p, "utf8")

/** U+2014 (em dash) and U+2013 (en dash), her ruling holding both to the same
 * standard in prose. Neither is a legal character in a TS/JS identifier, so a
 * hit outside a comment is always inside a string literal, a template literal
 * or JSX text — never a stray one this census would be wrong to catch. */
const DASH = /[—–]/

type Hit = { file: string; line: number; text: string }

/** `stripComments` returns the ORIGINAL text with comment bodies blanked
 * (newlines preserved), so line numbers still line up with the source a
 * failure message points a reader back to. */
function scanNonComment(rel: string, source: string): Hit[] {
  const stripped = stripComments(source)
  const hits: Hit[] = []
  stripped.split("\n").forEach((line, i) => {
    if (DASH.test(line)) hits.push({ file: rel, line: i + 1, text: line.trim().slice(0, 200) })
  })
  return hits
}

describe("R95 — no em dash (U+2014) or en dash (U+2013) anywhere a person reads", () => {
  // ── THE UI: THE CATALOGUE ────────────────────────────────────────────────
  it("shared/i18n-strings.json carries no dash, in any entry", () => {
    const strings: string[] = JSON.parse(read(join(ROOT, "shared/i18n-strings.json")))
    const hits = strings.filter((s) => DASH.test(s))
    expect(hits, `${hits.length} catalogue string(s) carry a dash:\n${hits.map((s) => `  "${s}"`).join("\n")}`).toEqual(
      []
    )
  })

  // ── THE UI: THE HAND-WRITTEN SEED, EVERY LANGUAGE ───────────────────────
  it("shared/i18n-seed.ts carries no dash outside a comment, in any language", () => {
    const path = join(ROOT, "shared/i18n-seed.ts")
    const hits = scanNonComment("shared/i18n-seed.ts", read(path))
    expect(hits, `${hits.length} dash(es) in shared/i18n-seed.ts:\n${hits.map((h) => `  :${h.line}: ${h.text}`).join("\n")}`).toEqual(
      []
    )
  })

  /** Every position `visitStrings` reports, for one already-parsed tree, as a
   * `Hit` — the line read straight off the AST node so a failure points a
   * reader at the exact position `t(...)`/i18n-extract.mjs itself would. */
  function scanPositions(rel: string, tree: ts.SourceFile): Hit[] {
    const hits: Hit[] = []
    visitStrings(tree, ({ text, node }: { text: string; node: ts.Node }) => {
      if (!DASH.test(text)) return
      const { line } = tree.getLineAndCharacterOfPosition(node.getStart(tree))
      hits.push({ file: rel, line: line + 1, text: text.slice(0, 200) })
    })
    return hits
  }

  // ── THE UI: EVERY JSX TEXT NODE, t() ARGUMENT AND STRING LITERAL ────────
  it("web/ and web-portal/ (the front doors' own import closure) carry no dash at a position a person reads", () => {
    const files = appFiles() // {path, tree}[] — R28's own derivation of "what a person reads"
    // Tripwire: a walk that found nothing (or next to nothing) would pass
    // everything below for the wrong reason. 398 as of 20 Sep 2026; read this
    // file's own count fresh rather than trust this comment for today's.
    expect(files.length, "appFiles() found next to nothing — has the walk gone blind?").toBeGreaterThan(300)
    const hits: Hit[] = []
    for (const { path, tree } of files) {
      const rel = path.startsWith(ROOT) ? path.slice(ROOT.length + 1) : path
      hits.push(...scanPositions(rel, tree))
    }
    expect(
      hits,
      `${hits.length} dash(es) across the front doors' own import closure:\n${hits
        .map((h) => `  ${h.file}:${h.line}: ${h.text}`)
        .join("\n")}`
    ).toEqual([])
  })

  // ── THE UI: shared/web/, CENSUSED DIRECTLY TOO ──────────────────────────
  //
  // Belt and suspenders beside the walk above: `appFiles()` reaches
  // `shared/web/` only through an import, so a file the front doors have
  // stopped importing (R28's own UNWALKED_OK gap) would silently drop out of
  // the census just above. A direct read of the whole folder cannot miss one.
  it("shared/web/ carries no dash at a position a person reads, read directly off disk", () => {
    const files = sourceFiles(join(ROOT, "shared/web"), { extensions: [".ts", ".tsx"], skipTests: true })
    expect(files.length, "shared/web/ scan found nothing — has the walk gone blind?").toBeGreaterThan(50)
    const hits: Hit[] = []
    for (const f of files) hits.push(...scanPositions(join("shared/web", f.rel), parseFile(f.path)))
    expect(
      hits,
      `${hits.length} dash(es) in shared/web/:\n${hits.map((h) => `  ${h.file}:${h.line}: ${h.text}`).join("\n")}`
    ).toEqual([])
  })

  // ── THE E-MAILS: THE ONE TEMPLATE ────────────────────────────────────────
  it("shared/workers/email-template.ts carries no dash outside a comment", () => {
    const path = join(ROOT, "shared/workers/email-template.ts")
    const hits = scanNonComment("shared/workers/email-template.ts", read(path))
    expect(
      hits,
      `${hits.length} dash(es) in shared/workers/email-template.ts:\n${hits.map((h) => `  :${h.line}: ${h.text}`).join("\n")}`
    ).toEqual([])
  })

  // ── THE E-MAILS: EVERY SEND SITE, DERIVED ────────────────────────────────
  //
  // A "send site" is not hand-listed: it is any workers/*/src file that
  // actually calls the one branded-send seam (`sendBrandedEmail`, the seam
  // `shared/rules/email-sites.ts`'s own R30 census already keys on) or
  // `brandedEmail` (auth's lower-level builder, beneath `sendEmail`). A module
  // that starts sending mail tomorrow is covered the day it does.
  it("every workers/*/src email send site carries no dash outside a comment", () => {
    const files = sourceFiles(join(ROOT, "workers"), { extensions: [".ts"], skipTests: true, recursive: true })
    const sendSites = files.filter((f) => /\bsendBrandedEmail\(|\bbrandedEmail\(/.test(f.source))
    // Tripwire: at least the send sites this census was written against —
    // auth's own two-step build plus tenancy's four branded callers.
    expect(
      sendSites.length,
      "no workers/*/src file calls sendBrandedEmail(/brandedEmail( — has the send-site derivation broken?"
    ).toBeGreaterThanOrEqual(5)
    const hits: Hit[] = []
    for (const f of sendSites) hits.push(...scanNonComment(join("workers", f.rel), f.source))
    expect(
      hits,
      `${hits.length} dash(es) across the email send sites:\n${hits.map((h) => `  ${h.file}:${h.line}: ${h.text}`).join("\n")}`
    ).toEqual([])
  })

  // ── THE GLOSSARY ──────────────────────────────────────────────────────────
  it("shared/glossary.ts carries no dash outside a comment", () => {
    const path = join(ROOT, "shared/glossary.ts")
    expect(existsSync(path), "shared/glossary.ts is missing").toBe(true)
    const hits = scanNonComment("shared/glossary.ts", read(path))
    expect(
      hits,
      `${hits.length} dash(es) in shared/glossary.ts:\n${hits.map((h) => `  :${h.line}: ${h.text}`).join("\n")}`
    ).toEqual([])
  })
})
