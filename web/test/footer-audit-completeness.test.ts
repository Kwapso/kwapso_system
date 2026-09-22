// A RECORD PAGE THAT HAS AUDIT DATA IN HAND MAY NOT QUIETLY DROP IT FROM THE
// FOOTER. Found 22 Sep 2026, against `web/components/knowledge/knowledge-detail.tsx`:
// its `<RecordFooterBand>` call carried no `audit` prop at all, next to a
// comment claiming "a knowledge source has no creator/editor" — false. The
// SAME file already reads `item.creatorName` / `item.createdAt` /
// `item.editorName` / `item.updatedAt` a few hundred lines above, in its own
// Overview tab (`auditItems(...)`, `web/lib/audit-overview.ts`), and
// `workers/content/src/lib/knowledge.ts`'s `DETAIL_COLS` (derived from
// `LIST_COLS`) rides `creator_name`/`editor_name`/`updated_at` on the wire for
// every knowledge-source kind, list and detail alike: a typed note, an
// uploaded file and a glossary word stamp the actor who wrote them
// (`createSource`/`createFileSource`/`createGlossaryEntry`); a MIRRORED
// source (a ticket, an account, a task, a Drive file, and the rest of the 13
// ingested kinds) stamps the brand's own name on `creator_name` at ingest
// instead of a person's (`knowledge-ingest.ts`'s upsert,
// `${sqlString(brand.name)}`) — because nobody typed it, the sweep did — and
// `editor_name` stays null there until somebody actually edits the source's
// filing (`updateSource`'s mirrored branch), at which point it is a real
// person. Every case is honest data, not a blank: the fix was wiring it
// through, matching the shape `story-detail.tsx`, `help-detail.tsx` and
// `task-sheet.tsx` already build for their own `<RecordFooterBand>` calls.
//
// THE CENSUS: every direct `<RecordFooterBand` call site in `web/components`
// (recursive, off disk) must carry an `audit=` prop, or be named in this
// file's own `FOOTER_AUDIT_EXEMPT`, keyed by `{file, contains}` — the call's
// own text, never a line number, so the pin cannot rot on an unrelated edit
// above it. The escape hatch is for a record type that genuinely has no
// creator/editor to show (none exists today; every direct caller passes
// `audit=`) — the caller must say why, in writing, rather than the footer
// silently rendering without one. This does not chase the INDIRECT path
// (`audit=` handed to the generic `<RecordChrome>`, which forwards it to its
// own internal `RecordFooterBand>` call in record-chrome.tsx) — that engine
// forwards unconditionally, so the risk this census guards against (a
// call site typed by hand, with a stale comment excusing a missing prop) is
// specific to a DIRECT caller.

import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

const REPO_ROOT = join(__dirname, "..", "..")
const ROOT = join(REPO_ROOT, "web", "components")

interface Finding {
  rel: string
  tag: string
}

/** The first `>` outside a `{…}` expression — mirrors `button-sizes.test.ts`'s
 * own `tagEnd`, walked forward from the opening `<RecordFooterBand` so an
 * inline arrow (`onAddNote={() => ...}`) never closes the tag early. */
function tagEnd(src: string, start: number): number {
  let depth = 0
  for (let i = start; i < src.length; i++) {
    const c = src[i]
    if (c === "{") depth++
    else if (c === "}") depth--
    else if (c === ">" && depth <= 0) return i
  }
  return -1
}

const OPEN_TAG = /<RecordFooterBand\b/g

function findings(): Finding[] {
  const files = sourceFiles([ROOT], { extensions: [".tsx"], relativeTo: REPO_ROOT, recursive: true, skipTests: true })
  const out: Finding[] = []
  for (const f of files) {
    const src = stripComments(f.source)
    OPEN_TAG.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = OPEN_TAG.exec(src))) {
      const start = m.index
      const end = tagEnd(src, start)
      if (end === -1) continue
      const tag = src.slice(start, end + 1)
      if (!/\baudit=\{/.test(tag)) out.push({ rel: f.rel, tag })
    }
  }
  return out
}

/** Empty today — every direct `<RecordFooterBand>` call site passes `audit=`.
 * A future record type with genuinely no creator/editor to show goes here,
 * with the reason, rather than the footer silently rendering without one. */
export const FOOTER_AUDIT_EXEMPT: { file: string; contains: string; why: string }[] = []

function excused(rel: string, tag: string) {
  return FOOTER_AUDIT_EXEMPT.find((e) => e.file === rel && tag.includes(e.contains))
}

function stillOpen(all: Finding[], rel: string, contains: string): boolean {
  return all.some((f) => f.rel === rel && f.tag.includes(contains))
}

describe("a record page's <RecordFooterBand> carries its audit data, or says why not", () => {
  it("every direct <RecordFooterBand> call site passes an audit prop, unnamed exceptions fail", () => {
    const found = findings()
    const unexempt = found.filter((f) => !excused(f.rel, f.tag))
    expect(
      unexempt,
      `these <RecordFooterBand> calls carry no audit= prop. If the record's creator/editor is available ` +
        `(read the door's own detail columns, not just what this file already fetches elsewhere), thread it ` +
        `through — match how story-detail.tsx/help-detail.tsx/task-sheet.tsx build theirs. Otherwise name it in ` +
        `FOOTER_AUDIT_EXEMPT with the reason:\n  ` +
        unexempt.map((f) => `${f.rel}  ${f.tag.split("\n")[0].slice(0, 100)}`).join("\n  ")
    ).toEqual([])
  })

  it("FOOTER_AUDIT_EXEMPT names only real, still-open findings", () => {
    const all = findings()
    const stale = FOOTER_AUDIT_EXEMPT.filter((e) => !stillOpen(all, e.file, e.contains))
    expect(
      stale,
      `these FOOTER_AUDIT_EXEMPT entries no longer match a real finding. Fixed, or the source moved on, delete ` +
        `the entry:\n  ` + stale.map((e) => `${e.file}  ${e.contains}`).join("\n  ")
    ).toEqual([])
  })

  it("an exemption's contains matches only one current finding in its file", () => {
    const all = findings()
    const ambiguous: string[] = []
    for (const e of FOOTER_AUDIT_EXEMPT) {
      const hits = all.filter((f) => f.rel === e.file && f.tag.includes(e.contains))
      if (hits.length > 1) ambiguous.push(`${e.file}  "${e.contains}" matches ${hits.length} findings`)
    }
    expect(
      ambiguous,
      `a FOOTER_AUDIT_EXEMPT entry excuses more than one site, make it specific:\n  ` + ambiguous.join("\n  ")
    ).toEqual([])
  })

  // PROVEN NOT VACUOUS, against synthetic source only — the census must catch
  // exactly the shape the knowledge-detail.tsx regression was (a call with no
  // audit= at all) and must not flag a well-formed one.
  it("catches a synthetic RecordFooterBand call with no audit prop", () => {
    const synthetic = [
      "function X() {",
      "  return (",
      "    <RecordFooterBand",
      "      activity={activity}",
      "      onAddNote={can('x', 'create') ? activity.addNote : undefined}",
      '      notePlaceholder={t("Add a note")}',
      "    />",
      "  )",
      "}",
      "",
    ].join("\n")
    OPEN_TAG.lastIndex = 0
    const m = OPEN_TAG.exec(synthetic)
    expect(m).not.toBeNull()
    const end = tagEnd(synthetic, m!.index)
    expect(end).toBeGreaterThan(-1)
    const tag = synthetic.slice(m!.index, end + 1)
    expect(/\baudit=\{/.test(tag)).toBe(false)
  })

  it("does not flag a synthetic RecordFooterBand call that does pass audit", () => {
    const synthetic = [
      "<RecordFooterBand",
      "  audit={{ createdByName: item.creatorName, createdAt: item.createdAt }}",
      "  activity={activity}",
      "/>",
    ].join("\n")
    OPEN_TAG.lastIndex = 0
    const m = OPEN_TAG.exec(synthetic)!
    const end = tagEnd(synthetic, m.index)
    const tag = synthetic.slice(m.index, end + 1)
    expect(/\baudit=\{/.test(tag)).toBe(true)
  })

  it("does not truncate the tag early on an inline arrow's own '=>' inside an attribute", () => {
    const synthetic = [
      "<RecordFooterBand",
      "  onAddNote={() => addNote(1)}",
      "  audit={{ createdByName: item.creatorName }}",
      "/>",
    ].join("\n")
    OPEN_TAG.lastIndex = 0
    const m = OPEN_TAG.exec(synthetic)!
    const end = tagEnd(synthetic, m.index)
    const tag = synthetic.slice(m.index, end + 1)
    expect(/\baudit=\{/.test(tag)).toBe(true)
  })
})
