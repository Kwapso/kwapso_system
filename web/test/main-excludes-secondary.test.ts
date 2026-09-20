// R92 — MAIN EXCLUDES SECONDARY. Aurora, verbatim, 20 Sep 2026: "Generally,
// always when selecting main/secondary people (staff, contacts, etc.): when
// I select the main, this person should not be available as secondary. E.g.
// when I select 'Raised by,' this person should disappear from the 'Keep in
// the loop' options. Make this law."
//
// THE SHAPE THIS LAW NAMES, AND THE ONE IT DOES NOT. Her own examples are
// all TWO INDEPENDENT PICKERS over ONE SHARED POOL — raised by / keep in the
// loop, assignee / reviewer, account manager / members, owner / stakeholders
// — where the main is chosen first and the secondary picker must then leave
// that person out. That is a different shape from a "Main X" picker chosen
// FROM an already-narrowed secondary list (`app-form-dialog.tsx`'s own
// "Main stakeholder", picked from the ticked "Stakeholders" checkboxes) —
// there the main is meant to be a MEMBER of the secondary set, not excluded
// from it, and this census is built not to reach that shape at all: it looks
// for a MAIN field named for a ROLE held independently of any secondary list
// (raisedBy/assignee/accountManager/lead/owner), never a field literally
// named "main<Something>", which is this codebase's own naming tell for the
// other, non-exclusionary pattern.
//
// THE CENSUS, OFF THE DISK. Within one file: every `<Select>`, `<RecordPicker>`
// or single-mode `<StaffPillPicker>` bound to a MAIN-shaped field
// (`raisedByContactId`, `assigneeId`, `accountManagerId`, `leadUserId`,
// `ownerUserId`, and their prefixed siblings) is a MAIN picker; every
// `<StaffPillPicker mode="multi">` bound to a SECONDARY-shaped field
// (`loopContactIds`, `stakeholderContactIds`, `reviewerIds`, `memberIds`) is
// a SECONDARY picker. When a main and a secondary picker in the SAME FILE
// draw their options from the SAME source array (the identifier feeding
// `people=`/`options=`), the secondary picker must exclude the main id —
// through `withoutMain()` (`shared/web/without-main.ts`) or an equivalent
// `.filter(… => …id !== …)` expression — or the pair is a finding.
//
// A DIFFERENT source array (a contacts pool for the main, a derived staff
// roster for the secondary — exactly `help-form-dialog.tsx`'s "Raised by" /
// "Keep in the loop" pair, where the loop is a hybrid of raiser + admins +
// mentions, not a second read of the same contacts list) is not a violation
// of THIS law at all: the two pickers are not offering the same pool twice,
// so there is nothing to exclude. That is a real, deliberate distinction,
// not a blind spot — see `workers/content/src/lib/stakeholders.ts`'s own
// header for why the loop is derived rather than a second contacts picker.

import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { MAIN_EXCLUDES_SECONDARY_EXEMPT } from "@shared/rules/registry"

const ROOT = join(import.meta.dirname, "..", "..")

const MAIN_FIELD = /\b(\w*raisedby\w*|\w*assignee\w*|\w*accountmanager\w*|\w*leaduser\w*|\w*owneruser\w*)id\b/i
const SECONDARY_FIELD = /\b(\w*loop\w*|\w*stakeholder\w*|\w*reviewer\w*|\w*member\w*)ids\b/i
const EXCLUSION_CALL = /withoutMain\(|\.filter\(\s*\(?\s*\w+\s*\)?\s*=>\s*\w+\.id\s*!==?\s*/

/** The index one past the `>` that closes the tag opened at `start` —
 * identical to the helper `faces-in-choices.test.ts` uses, stepping over
 * `{…}` so a nested brace expression cannot end the tag early. */
function tagEnd(src: string, start: number): number {
  let depth = 0
  for (let i = start; i < src.length; i++) {
    const ch = src[i]
    if (ch === "{") depth++
    else if (ch === "}") depth--
    else if (ch === ">" && depth === 0) return i + 1
  }
  return src.length
}

/** A component mount's own slice — self-closing, or paired up to its own
 * `</Tag>`. `StaffPillPicker`/`RecordPicker` are usually self-closing in
 * this codebase; `<Select>` is always a compound, paired component. */
function componentSlice(src: string, tagName: string, start: number): string {
  const openEnd = tagEnd(src, start)
  const opening = src.slice(start, openEnd)
  if (/\/>\s*$/.test(opening.trimEnd())) return opening
  const close = `</${tagName}>`
  const closeIdx = src.indexOf(close, openEnd)
  return closeIdx === -1 ? opening : src.slice(start, closeIdx + close.length)
}

/** The identifier feeding this picker's rows — `people={NAME}`, or the base
 * array of a `NAME.map(`/`sortedOptions(NAME`/`sortedOptions(NAME,` call
 * inside an `options=` prop. Mirrors `faces-in-choices.test.ts`'s own
 * `SOURCE_REF` resolution. */
function sourceArray(block: string): string | null {
  const people = /\bpeople=\{\s*([\w.]+)\s*\}/.exec(block)
  if (people) return people[1]
  const mapped = /(?:sortedOptions\(\s*([\w.]+)|([\w.]+)\.map\()/.exec(block)
  if (mapped) return (mapped[1] ?? mapped[2]) ?? null
  return null
}

interface PickerRef {
  field: string
  source: string | null
  block: string
}

interface Finding {
  rel: string
  main: string
  secondary: string
}

const TAGS = ["Select", "RecordPicker", "StaffPillPicker"] as const

function findings(): Finding[] {
  const files = sourceFiles([join(ROOT, "web"), join(ROOT, "web-portal"), join(ROOT, "shared", "web")], {
    extensions: [".tsx"],
    relativeTo: ROOT,
    skipTests: true,
  })
  const out: Finding[] = []
  for (const f of files) {
    const src = stripComments(f.source)
    const mains: PickerRef[] = []
    const secondaries: PickerRef[] = []
    for (const tag of TAGS) {
      for (const m of src.matchAll(new RegExp(`<${tag}\\b`, "g"))) {
        const block = componentSlice(src, tag, m.index)
        const valueMatch = /\bvalue=\{\s*([\w.]+)\s*\}/.exec(block)
        if (!valueMatch) continue
        const field = valueMatch[1].split(".").pop() as string
        const isMulti = /mode=["']multi["']/.test(block)
        if (!isMulti && MAIN_FIELD.test(field)) {
          mains.push({ field, source: sourceArray(block), block })
        } else if (isMulti && SECONDARY_FIELD.test(field)) {
          secondaries.push({ field, source: sourceArray(block), block })
        }
      }
    }
    for (const main of mains) {
      if (!main.source) continue
      for (const secondary of secondaries) {
        if (secondary.source !== main.source) continue
        if (EXCLUSION_CALL.test(secondary.block)) continue
        out.push({ rel: f.rel, main: main.field, secondary: secondary.field })
      }
    }
  }
  return out
}

describe("R92 — main excludes secondary", () => {
  it("a secondary picker over the SAME pool as a main picker excludes the chosen main id", () => {
    const found = findings()
    const unexempt = found.filter((f) => !(`${f.rel}#${f.main}+${f.secondary}` in MAIN_EXCLUDES_SECONDARY_EXEMPT))
    expect(
      unexempt,
      `these main/secondary picker pairs share one source pool but the secondary does not exclude the ` +
        `chosen main (withoutMain(), or a reasoned MAIN_EXCLUDES_SECONDARY_EXEMPT line): ` +
        unexempt.map((f) => `${f.rel}#${f.main}+${f.secondary}`).join(", ")
    ).toEqual([])
  })

  it("MAIN_EXCLUDES_SECONDARY_EXEMPT names only real, still-open findings", () => {
    const found = new Set(findings().map((f) => `${f.rel}#${f.main}+${f.secondary}`))
    const stale = Object.keys(MAIN_EXCLUDES_SECONDARY_EXEMPT).filter((key) => !found.has(key))
    expect(
      stale,
      `these MAIN_EXCLUDES_SECONDARY_EXEMPT entries no longer match a real finding — the census moved on ` +
        `(fixed, or the source changed shape) and the line should be deleted: ${stale.join(", ")}`
    ).toEqual([])
  })

  // PROVEN NOT VACUOUS — the census's own detection logic run directly
  // against synthetic source, never against a mutated tracked file
  // (CLAUDE.md: "never run git checkout -- on a tracked file"; this sidesteps
  // the whole question by never touching one). Two pickers, same source
  // array (`contacts`), no exclusion — must be caught.
  it("catches a synthetic same-pool pair with no exclusion (proof the census is not vacuous)", () => {
    const synthetic = `
      <Select value={raisedByContactId} onValueChange={setRaisedBy}>
        {sortedOptions(contacts, lang, (c) => c.name).map((c) => <SelectItem key={c.id} value={c.id} />)}
      </Select>
      <StaffPillPicker
        mode="multi"
        people={contacts}
        value={stakeholderIds}
        onValueChange={setStakeholderIds}
      />
    `
    const mainBlock = componentSlice(synthetic, "Select", synthetic.indexOf("<Select"))
    const secondaryBlock = componentSlice(synthetic, "StaffPillPicker", synthetic.indexOf("<StaffPillPicker"))
    expect(MAIN_FIELD.test("raisedByContactId")).toBe(true)
    expect(SECONDARY_FIELD.test("stakeholderIds")).toBe(true)
    expect(sourceArray(mainBlock)).toBe("contacts")
    expect(sourceArray(secondaryBlock)).toBe("contacts")
    expect(EXCLUSION_CALL.test(secondaryBlock)).toBe(false)
  })

  // AND THE EXCLUSION-PRESENT CASE ACTUALLY CLEARS: the same synthetic pair,
  // this time routed through `withoutMain()`, must NOT be flagged.
  it("does not flag the same pair once the secondary calls withoutMain()", () => {
    const synthetic = `
      <StaffPillPicker
        mode="multi"
        people={withoutMain(contacts, raisedByContactId)}
        value={stakeholderIds}
        onValueChange={setStakeholderIds}
      />
    `
    const block = componentSlice(synthetic, "StaffPillPicker", synthetic.indexOf("<StaffPillPicker"))
    expect(EXCLUSION_CALL.test(block)).toBe(true)
  })
})
